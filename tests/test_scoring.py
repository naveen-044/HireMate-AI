import unittest
from unittest.mock import patch

from backend.services import ats_service
from backend.services.scoring import SCORING_RULES_VERSION, score_resume


SYNTHETIC_RESUME = """Jordan Example
jordan@example.test | +1 555 555 0199

PROFESSIONAL SUMMARY
Entry-level analyst with experience building reliable reports.

SKILLS
Data analysis, spreadsheets

EXPERIENCE
2024 - 2025
- Built monthly reports for a team of 12.
- Improved report consistency.

EDUCATION
2020 - 2024
Bachelor of Science

PROJECTS
- Analyzed a synthetic public dataset.
"""


class ResumeScoringTests(unittest.TestCase):
    def test_repeated_analysis_is_deterministic_for_the_same_input(self):
        format_data = {
            "source": "pdf",
            "page_count": 1,
            "pages_with_text": 1,
        }

        first = score_resume(SYNTHETIC_RESUME, format_data)
        second = score_resume(SYNTHETIC_RESUME, format_data)

        self.assertEqual(first, second)
        self.assertEqual(first["scoring_rules_version"], SCORING_RULES_VERSION)

    def test_llm_analysis_variation_does_not_change_either_score(self):
        format_data = {
            "source": "pdf",
            "page_count": 1,
            "pages_with_text": 1,
        }
        empty_analysis = {
            "career_field": "",
            "experience_level": "",
            "sections": [],
            "experience": [],
            "education": [],
            "projects": [],
            "certifications": [],
            "achievements": [],
            "quantifiable_evidence": [],
        }

        with patch.object(ats_service, "understand_resume", return_value=None):
            without_ai = ats_service.analyze_resume(
                SYNTHETIC_RESUME,
                [],
                format_data,
            )

        with (
            patch.object(ats_service, "understand_resume", return_value={"random": "wording"}),
            patch.object(
                ats_service,
                "validate_structured_analysis",
                return_value=empty_analysis,
            ),
            patch.object(
                ats_service,
                "generate_explanation",
                return_value={
                    "strengths": [],
                    "weaknesses": [],
                    "recommendations": [],
                    "assessment": "",
                },
            ),
        ):
            with_ai = ats_service.analyze_resume(
                SYNTHETIC_RESUME,
                [],
                format_data,
            )

        self.assertEqual(without_ai["ats_score"], with_ai["ats_score"])
        self.assertEqual(
            without_ai["resume_quality"]["score"],
            with_ai["resume_quality"]["score"],
        )

    def test_scores_are_bounded_and_category_weights_are_explainable(self):
        result = score_resume(
            SYNTHETIC_RESUME,
            {"source": "pdf", "page_count": 1, "pages_with_text": 1},
        )

        for score_type in ("ats_readability", "resume_quality"):
            score = result[score_type]["score"]
            self.assertGreaterEqual(score, 0)
            self.assertLessEqual(score, 100)

            categories = result[score_type]["categories"]
            self.assertEqual(sum(category["weight"] for category in categories.values()), 100)
            self.assertAlmostEqual(
                sum(category["points"] for category in categories.values()),
                score,
                delta=1,
            )
            for category in categories.values():
                self.assertIn("evidence", category)
                self.assertIn("recommendations", category)

    def test_pasted_text_does_not_claim_pdf_readability(self):
        result = score_resume(SYNTHETIC_RESUME, {"source": "pasted_text"})

        self.assertIsNone(result["ats_readability"]["score"])
        self.assertEqual(
            result["ats_readability"]["status"],
            "insufficient_evidence",
        )
        self.assertIsNotNone(result["resume_quality"]["score"])

    def test_pdf_without_page_metadata_does_not_get_an_ats_score(self):
        result = score_resume(SYNTHETIC_RESUME, {"source": "pdf"})

        self.assertIsNone(result["ats_readability"]["score"])
        self.assertEqual(
            result["ats_readability"]["status"],
            "insufficient_evidence",
        )


if __name__ == "__main__":
    unittest.main()
