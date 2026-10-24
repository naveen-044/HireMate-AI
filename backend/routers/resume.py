import logging

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel, Field
from .. import resume_store
from ..services.ats_service import analyze_resume
from ..services.resume_parser import extract_pdf_content, sanitize_filename
from ..services.skill_extractor import extract_skills


router = APIRouter(prefix="/resume", tags=["Resume"])
MAX_PDF_BYTES = 10 * 1024 * 1024
MAX_RESUME_CHARACTERS = 100_000
logger = logging.getLogger(__name__)


class ResumeTextRequest(BaseModel):
    resume_text: str = Field(min_length=1, max_length=MAX_RESUME_CHARACTERS)


def _resume_response(message):
    current = resume_store.resume_data
    return {
        "filename": current["filename"],
        "message": message,
        "text": current["text"],
        "skills": current["skills"],
        "format": current["format"],
    }


def _extract_skills_or_502(resume_text):
    try:
        return extract_skills(resume_text)
    except RuntimeError as error:
        raise HTTPException(
            status_code=502,
            detail="Groq skill extraction failed. Check the backend logs and retry.",
        ) from error


@router.post("/upload")
async def upload_resume(file: UploadFile = File(...)):
    filename = sanitize_filename(file.filename)
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=415, detail="Only PDF files are allowed.")

    file_content = await file.read(MAX_PDF_BYTES + 1)
    await file.close()
    if len(file_content) > MAX_PDF_BYTES:
        raise HTTPException(
            status_code=413,
            detail="The PDF exceeds the 10 MB upload limit.",
        )

    try:
        document = extract_pdf_content(file_content)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    resume_text = document["text"]
    if len(resume_text) > MAX_RESUME_CHARACTERS:
        raise HTTPException(
            status_code=413,
            detail="Extracted resume text exceeds the 100,000-character limit.",
        )

    resume_store.resume_data = {
        "filename": filename,
        "text": resume_text,
        "skills": _extract_skills_or_502(resume_text),
        "format": {
            "page_count": document["page_count"],
            "pages_with_text": document["pages_with_text"],
            "source": "pdf",
            "text_extractable": True,
        },
    }
    return _resume_response("Resume uploaded and processed.")


@router.post("/paste")
def paste_resume(request: ResumeTextRequest):
    resume_text = request.resume_text.strip()
    if not resume_text:
        raise HTTPException(status_code=422, detail="Resume text cannot be empty.")

    resume_store.resume_data = {
        "filename": "Pasted Resume",
        "text": resume_text,
        "skills": _extract_skills_or_502(resume_text),
        "format": {
            "page_count": 0,
            "pages_with_text": 0,
            "source": "pasted_text",
            "text_extractable": True,
        },
    }
    return _resume_response("Resume text processed.")


@router.put("/review")
def review_resume(request: ResumeTextRequest):
    if not resume_store.resume_data:
        raise HTTPException(
            status_code=404,
            detail="Upload or paste a resume before reviewing its text.",
        )

    resume_text = request.resume_text.strip()
    if not resume_text:
        raise HTTPException(status_code=422, detail="Resume text cannot be empty.")

    skills = _extract_skills_or_502(resume_text)
    resume_store.resume_data["text"] = resume_text
    resume_store.resume_data["skills"] = skills
    return _resume_response("Reviewed resume text saved.")


@router.post("/analyze")
def analyze_uploaded_resume():
    if not resume_store.resume_data:
        raise HTTPException(
            status_code=400,
            detail="Please upload or paste your resume first.",
        )

    current = resume_store.resume_data
    try:
        analysis = analyze_resume(
            current["text"],
            current["skills"],
            current["format"],
        )
    except Exception:
        logger.exception("Resume analysis failed.")
        raise HTTPException(
            status_code=502,
            detail="Resume analysis failed. Check the backend logs and AI configuration.",
        )

    if not analysis:
        raise HTTPException(
            status_code=422,
            detail="Resume analysis could not be produced from the supplied text.",
        )

    return analysis
