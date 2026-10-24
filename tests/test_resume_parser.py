import unittest
from io import BytesIO

from pypdf import PdfWriter

from backend.services.resume_parser import extract_pdf_content, sanitize_filename


class ResumeParserTests(unittest.TestCase):
    def test_rejects_non_pdf_content(self):
        with self.assertRaisesRegex(ValueError, "not a valid PDF"):
            extract_pdf_content(b"not a pdf")

    def test_reports_scanned_or_empty_pdf_without_claiming_text_extraction(self):
        writer = PdfWriter()
        writer.add_blank_page(width=72, height=72)
        pdf = BytesIO()
        writer.write(pdf)

        with self.assertRaisesRegex(ValueError, "No selectable text"):
            extract_pdf_content(pdf.getvalue())

    def test_sanitizes_filename_path_components(self):
        self.assertEqual(
            sanitize_filename(r"..\..\candidate resume.pdf"),
            "candidate resume.pdf",
        )


if __name__ == "__main__":
    unittest.main()
