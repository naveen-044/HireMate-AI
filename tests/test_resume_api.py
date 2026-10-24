import os
import unittest
from io import BytesIO
from unittest.mock import patch

from fastapi.testclient import TestClient
from pypdf import PdfWriter

from backend import resume_store
from backend.app import app


class ResumeApiTests(unittest.TestCase):
    def setUp(self):
        self.original_resume = resume_store.resume_data
        self.client = TestClient(app)

    def tearDown(self):
        resume_store.resume_data = self.original_resume
        self.client.close()

    def test_paste_then_analyze_returns_scores_without_groq(self):
        resume_text = (
            "Jordan Example\njordan@example.test | +1 555 555 0199\n\n"
            "SKILLS\nData analysis\n\n"
            "EXPERIENCE\n2024 - 2025\n"
            "- Built monthly reports for a team of 12."
        )
        with (
            patch.dict(os.environ, {"GROQ_API_KEY": ""}),
            patch("backend.routers.resume.extract_skills", return_value=[]),
            patch("backend.services.ats_service.get_client", return_value=None),
        ):
            health = self.client.get("/health")
            uploaded = self.client.post(
                "/resume/paste",
                json={"resume_text": resume_text},
            )
            analysis = self.client.post("/resume/analyze")

        self.assertFalse(health.json()["ai"]["configured"])
        self.assertEqual(uploaded.status_code, 200)
        self.assertEqual(uploaded.json()["text"], resume_text)
        self.assertEqual(analysis.status_code, 200)
        self.assertIsNone(analysis.json()["ats_score"])
        self.assertIsNotNone(analysis.json()["resume_quality"]["score"])
        self.assertEqual(analysis.json()["ai_status"], "not_configured")

    def test_upload_rejects_invalid_pdf_and_scanned_pdf(self):
        with patch("backend.routers.resume.MAX_PDF_BYTES", 8):
            oversized = self.client.post(
                "/resume/upload",
                files={
                    "file": (
                        "large.pdf",
                        b"%PDF-1234",
                        "application/pdf",
                    )
                },
            )
        self.assertEqual(oversized.status_code, 413)

        invalid = self.client.post(
            "/resume/upload",
            files={"file": ("resume.pdf", b"not a pdf", "application/pdf")},
        )
        self.assertEqual(invalid.status_code, 422)

        writer = PdfWriter()
        writer.add_blank_page(width=72, height=72)
        pdf_content = BytesIO()
        writer.write(pdf_content)
        scanned = self.client.post(
            "/resume/upload",
            files={
                "file": (
                    "scan.pdf",
                    pdf_content.getvalue(),
                    "application/pdf",
                )
            },
        )
        self.assertEqual(scanned.status_code, 422)
        self.assertIn("OCR", scanned.json()["detail"])

    def test_failed_skill_extraction_does_not_partially_save_reviewed_text(self):
        original_text = "A synthetic resume with enough text to process."
        with patch("backend.routers.resume.extract_skills", return_value=[]):
            self.client.post(
                "/resume/paste",
                json={"resume_text": original_text},
            )

        with patch(
            "backend.routers.resume.extract_skills",
            side_effect=RuntimeError("provider failure"),
        ):
            failed_update = self.client.put(
                "/resume/review",
                json={"resume_text": "A changed synthetic resume."},
            )

        self.assertEqual(failed_update.status_code, 502)
        self.assertEqual(resume_store.resume_data["text"], original_text)

    def test_job_match_validates_input_and_reports_missing_groq_setup(self):
        empty_description = self.client.post(
            "/job/match",
            json={"job_description": "   "},
        )
        self.assertEqual(empty_description.status_code, 422)

        resume_store.resume_data = {
            "text": "Synthetic resume",
            "skills": [],
            "format": {"source": "pasted_text"},
        }
        with patch.dict(os.environ, {"GROQ_API_KEY": ""}):
            missing_setup = self.client.post(
                "/job/match",
                json={"job_description": "A synthetic job description."},
            )

        self.assertEqual(missing_setup.status_code, 503)
        self.assertIn("GROQ_API_KEY", missing_setup.json()["detail"])


if __name__ == "__main__":
    unittest.main()
