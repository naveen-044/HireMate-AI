from io import BytesIO
from pathlib import Path

from pypdf import PdfReader
from pypdf.errors import PdfReadError


def extract_text_from_pdf(file_path):
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    return text


def extract_pdf_content(file_content):
    if not file_content.startswith(b"%PDF-"):
        raise ValueError("The uploaded file is not a valid PDF.")

    try:
        reader = PdfReader(BytesIO(file_content), strict=True)
        if reader.is_encrypted:
            raise ValueError("Password-protected PDFs are not supported.")

        page_text = [page.extract_text() or "" for page in reader.pages]
    except (PdfReadError, OSError) as error:
        raise ValueError("The PDF is malformed or unreadable.") from error

    text = "\n".join(text.strip() for text in page_text if text.strip()).strip()
    if not text:
        raise ValueError(
            "No selectable text was found. This may be a scanned PDF; use OCR "
            "before uploading or paste the resume text."
        )

    return {
        "text": text,
        "page_count": len(page_text),
        "pages_with_text": sum(bool(text.strip()) for text in page_text),
    }


def sanitize_filename(filename):
    name = Path((filename or "resume.pdf").replace("\\", "/")).name
    safe_name = "".join(
        character if character.isalnum() or character in " ._-" else "_"
        for character in name
    )
    return (safe_name[:120] or "resume.pdf")