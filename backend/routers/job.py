
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from .. import resume_store
from ..services.groq_config import is_groq_configured
from ..services.groq_service import extract_job_skills


router = APIRouter(
    prefix="/job",
    tags=["Job Matching"],
)


class JobDescription(BaseModel):
    job_description: str = Field(
        min_length=1,
        max_length=50_000,
    )

    @field_validator("job_description")
    @classmethod
    def validate_job_description(cls, value):
        if not value.strip():
            raise ValueError("Job description cannot be empty.")
        return value.strip()


def normalize_skill(skill: str) -> str:
    """Normalize common skill-name variations for comparison."""
    skill = " ".join(skill.lower().strip().split())

    aliases = {
        "reactjs": "react",
        "react.js": "react",
        "react js": "react",
        "java script": "javascript",
        "type script": "typescript",
        "rest apis": "rest api",
        "restful api": "rest api",
        "restful apis": "rest api",
        "restful services": "rest api",
        "mysql database": "mysql",
        "postgresql database": "postgresql",
        "mongodb database": "mongodb",
        "git hub": "github",
        "generative artificial intelligence": "generative ai",
        "retrieval augmented generation": "rag",
        "retrieval-augmented generation": "rag",
        "test driven development": "tdd",
        "test-driven development": "tdd",
        "object oriented programming": "oop",
        "object-oriented programming": "oop",
        "software development lifecycle": "sdlc",
        "software development life cycle": "sdlc",
        "unit test": "unit testing",
        "unit tests": "unit testing",
        "data analytics": "data analysis",
        "ms excel": "excel",
        "microsoft excel": "excel",
        "ms word": "word",
        "microsoft word": "word",
        "ms powerpoint": "powerpoint",
        "microsoft powerpoint": "powerpoint",
        "powerbi": "power bi",
        "search engine optimization": "seo",
        "search engine optimisation": "seo",
        "customer relationship management": "crm",
        "human resources": "hr",
        "human resource": "hr",
        "communication skills": "communication",
        "verbal communication": "communication",
        "written communication": "communication",
        "negotiation skills": "negotiation",
        "graphic designing": "graphic design",
        "user interface design": "ui design",
        "adobe photoshop": "photoshop",
        "auto cad": "autocad",
        "solid works": "solidworks",
        "computer aided design": "cad",
        "computer-aided design": "cad",
        "goods and services tax": "gst",
        "tally erp": "tally",
        "tally prime": "tally",
        "talent acquisition": "recruitment",
        "payroll processing": "payroll",
        "automated test scripts": "automated testing",
        "natural language processing": "nlp",
    }

    return aliases.get(skill, skill)


def unique_skills(skills):
    """Remove duplicates after normalizing skill names."""
    result = []
    seen = set()

    for skill in skills or []:
        if not isinstance(skill, str) or not skill.strip():
            continue

        display_name = skill.strip()
        normalized = normalize_skill(display_name)

        if normalized and normalized not in seen:
            seen.add(normalized)
            result.append(display_name)

    return result


@router.post("/match")
def match_job(job: JobDescription):
    if not resume_store.resume_data:
        raise HTTPException(
            status_code=400,
            detail="Please upload or paste your resume first.",
        )

    resume_skills = unique_skills(
        resume_store.resume_data.get("skills", [])
    )

    if not resume_skills:
        if not is_groq_configured():
            raise HTTPException(
                status_code=503,
                detail="Configure GROQ_API_KEY in the backend environment.",
            )

        raise HTTPException(
            status_code=422,
            detail="No supported skills were detected in the current resume.",
        )

    try:
        extracted_job_skills = extract_job_skills(
            job.job_description
        )
    except RuntimeError as error:
        raise HTTPException(
            status_code=502,
            detail="Job-skill extraction failed. Check backend logs and retry.",
        ) from error

    job_skills = unique_skills(extracted_job_skills)

    if not job_skills:
        raise HTTPException(
            status_code=422,
            detail="Could not extract skills from the job description.",
        )

    resume_skill_map = {
        normalize_skill(skill): skill
        for skill in resume_skills
    }

    matched_skills = []
    missing_skills = []

    for skill in job_skills:
        normalized = normalize_skill(skill)

        if normalized in resume_skill_map:
            matched_skills.append(
                resume_skill_map[normalized]
            )
        else:
            missing_skills.append(skill)

    total_job_skills = len(job_skills)
    matched_count = len(matched_skills)

    match_percentage = round(
        matched_count / total_job_skills * 100,
        2,
    )

    recommendations = []

    if missing_skills:
        recommendations.append(
            "Prioritize these missing skills: "
            + ", ".join(missing_skills[:5])
            + "."
        )
        recommendations.append(
            "Practise missing skills through relevant projects or exercises."
        )
        recommendations.append(
            "Include skills in your resume only when you can support them "
            "with genuine knowledge or experience."
        )
    else:
        recommendations.append(
            "All extracted job skills overlap with your detected resume "
            "skills. Review your projects and experience to ensure they "
            "provide evidence for the requirements."
        )

    return {
        "job_skills": job_skills,
        "resume_skills": resume_skills,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "recommendations": recommendations,
        "match_percentage": match_percentage,
        "matched_count": matched_count,
        "total_job_skills": total_job_skills,
        "missing_count": len(missing_skills),
        "score_type": "job_skill_overlap",
    }
