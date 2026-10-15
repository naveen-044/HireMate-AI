from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from pypdf import PdfReader
import fitz
import resume_store

from services.skill_extractor import extract_skills
from services.ats_service import analyze_resume

router = APIRouter(
    prefix="/resume",
    tags=["Resume"]
)


class ResumePasteRequest(BaseModel):
    resume_text: str


@router.post("/upload")
async def upload_resume(file: UploadFile = File(...)):

    if not file.filename.lower().endswith(".pdf"):

        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed"
        )

    try:

        file_content = await file.read()

        with open("temp_resume.pdf", "wb") as resume_file:

            resume_file.write(file_content)

        reader = PdfReader("temp_resume.pdf")

        resume_text = ""

        for page in reader.pages:

            text = page.extract_text()

            if text:

                resume_text += text + "\n"

        if not resume_text.strip():

            raise HTTPException(
                status_code=400,
                detail="Could not extract text from resume"
            )

        skills = extract_skills(resume_text)

        pdf_document = fitz.open("temp_resume.pdf")

        page_count = len(pdf_document)

        pages_with_text = 0
        text_blocks = 0
        images = 0

        for page in pdf_document:

            page_text = page.get_text("text")

            if page_text.strip():

                pages_with_text += 1

            text_blocks += len(
                page.get_text("blocks")
            )

            images += len(
                page.get_images(full=True)
            )

        pdf_document.close()

        format_data = {
            "page_count": page_count,
            "pages_with_text": pages_with_text,
            "text_blocks": text_blocks,
            "images": images,
            "text_extractable": True,
            "source": "pdf"
        }

        resume_store.resume_data = {
            "filename": file.filename,
            "text": resume_text,
            "skills": skills,
            "format": format_data
        }

        return {
            "filename": file.filename,
            "message": "Resume uploaded and processed successfully",
            "skills": skills,
            "format": format_data
        }

    except HTTPException:

        raise

    except Exception as error:

        print(
            f"Resume upload error: {error}"
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to process resume"
        )


@router.post("/paste")
def paste_resume(request: ResumePasteRequest):

    resume_text = request.resume_text.strip()

    if not resume_text:

        raise HTTPException(
            status_code=400,
            detail="Resume text cannot be empty"
        )

    try:

        skills = extract_skills(resume_text)

        format_data = {
            "page_count": 0,
            "pages_with_text": 0,
            "text_blocks": 0,
            "images": 0,
            "text_extractable": True,
            "source": "pasted_text"
        }

        resume_store.resume_data = {
            "filename": "Pasted Resume",
            "text": resume_text,
            "skills": skills,
            "format": format_data
        }

        return {
            "filename": "Pasted Resume",
            "message": "Resume pasted and processed successfully",
            "skills": skills,
            "format": format_data
        }

    except Exception as error:

        print(
            f"Resume paste error: {error}"
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to process pasted resume"
        )


@router.post("/analyze")
def analyze_uploaded_resume():

    if not resume_store.resume_data:

        raise HTTPException(
            status_code=400,
            detail="Please upload or paste your resume first"
        )

    resume_text = resume_store.resume_data.get(
        "text",
        ""
    )

    resume_skills = resume_store.resume_data.get(
        "skills",
        []
    )

    format_data = resume_store.resume_data.get(
        "format",
        {}
    )

    if not resume_text:

        raise HTTPException(
            status_code=400,
            detail="Please upload or paste your resume first"
        )

    analysis = analyze_resume(
        resume_text,
        resume_skills,
        format_data
    )

    if not analysis:

        raise HTTPException(
            status_code=500,
            detail="Could not analyze the resume"
        )

    return analysis