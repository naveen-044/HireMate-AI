from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import resume_store

from services.groq_service import extract_job_skills

router = APIRouter(
    prefix="/job",
    tags=["Job Matching"]
)


class JobDescription(BaseModel):
    job_description: str


def normalize_skill(skill: str):

    skill = skill.lower().strip()

    aliases = {

        "reactjs": "react",
        "react.js": "react",
        "react js": "react",

        "angularjs": "angularjs",
        "angular.js": "angularjs",
        "angular js": "angularjs",

        "javascript": "javascript",
        "java script": "javascript",

        "typescript": "typescript",
        "type script": "typescript",

        "rest api": "rest api",
        "rest apis": "rest api",
        "restful api": "rest api",
        "restful apis": "rest api",
        "restful services": "rest api",

        "mysql database": "mysql",
        "postgresql database": "postgresql",
        "mongodb database": "mongodb",

        "github": "github",
        "git hub": "github",

        "github copilot": "github copilot",

        "claude code": "claude code",

        "generative artificial intelligence": "generative ai",
        "generative ai": "generative ai",

        "retrieval augmented generation": "rag",
        "retrieval-augmented generation": "rag",

        "test driven development": "tdd",
        "test-driven development": "tdd",

        "object oriented programming": "oop",
        "object-oriented programming": "oop",

        "software development lifecycle": "sdlc",
        "software development life cycle": "sdlc",

        "unit tests": "unit testing",
        "unit test": "unit testing",

        "automated test scripts": "automated testing",
        "automated testing": "automated testing",

        "machine learning": "machine learning",

        "natural language processing": "nlp",
        "nlp": "nlp",

        "artificial intelligence": "ai",
        "ai": "ai",

        "data analysis": "data analysis",
        "data analytics": "data analysis",

        "ms excel": "excel",
        "microsoft excel": "excel",

        "ms word": "word",
        "microsoft word": "word",

        "ms powerpoint": "powerpoint",
        "microsoft powerpoint": "powerpoint",

        "power bi": "power bi",
        "powerbi": "power bi",

        "google sheets": "google sheets",

        "google workspace": "google workspace",

        "digital marketing": "digital marketing",

        "social media marketing": "social media marketing",

        "search engine optimization": "seo",
        "search engine optimisation": "seo",
        "seo": "seo",

        "content writing": "content writing",

        "content marketing": "content marketing",

        "customer relationship management": "crm",
        "crm": "crm",

        "customer service": "customer service",

        "customer support": "customer support",

        "human resources": "hr",
        "human resource": "hr",
        "hr": "hr",

        "talent acquisition": "recruitment",
        "recruitment": "recruitment",

        "employee relations": "employee relations",

        "payroll processing": "payroll",
        "payroll": "payroll",

        "accounting": "accounting",

        "financial reporting": "financial reporting",

        "financial analysis": "financial analysis",

        "gst": "gst",

        "goods and services tax": "gst",

        "tally erp": "tally",
        "tally prime": "tally",
        "tally": "tally",

        "autocad": "autocad",

        "auto cad": "autocad",

        "solidworks": "solidworks",

        "solid works": "solidworks",

        "computer aided design": "cad",
        "computer-aided design": "cad",
        "cad": "cad",

        "quality control": "quality control",

        "quality assurance": "quality assurance",

        "project management": "project management",

        "teaching": "teaching",

        "lesson planning": "lesson planning",

        "classroom management": "classroom management",

        "communication skills": "communication",

        "verbal communication": "communication",

        "written communication": "communication",

        "data entry": "data entry",

        "data processing": "data processing",

        "data management": "data management",

        "documentation": "documentation",

        "record management": "record management",

        "inventory management": "inventory management",

        "supply chain management": "supply chain management",

        "inventory control": "inventory control",

        "sales": "sales",

        "lead generation": "lead generation",

        "negotiation skills": "negotiation",

        "negotiation": "negotiation",

        "medical coding": "medical coding",

        "clinical research": "clinical research",

        "patient care": "patient care",

        "graphic designing": "graphic design",
        "graphic design": "graphic design",

        "ui design": "ui design",

        "user interface design": "ui design",

        "video editing": "video editing",

        "adobe photoshop": "photoshop",
        "photoshop": "photoshop",

        "hotel operations": "hotel operations",

        "front office": "front office",

        "hospitality": "hospitality"

    }

    return aliases.get(
        skill,
        skill
    )


@router.post("/match")
def match_job(job: JobDescription):

    if not resume_store.resume_data:

        raise HTTPException(
            status_code=400,
            detail="Please upload or paste your resume first"
        )

    resume_skills = resume_store.resume_data.get(
        "skills",
        []
    )

    if not resume_skills:

        raise HTTPException(
            status_code=400,
            detail="No resume skills found. Please upload or paste your resume again"
        )

    job_skills = extract_job_skills(
        job.job_description
    )

    if not job_skills:

        raise HTTPException(
            status_code=400,
            detail="Could not extract skills from the job description"
        )

    normalized_resume_skills = {}

    for skill in resume_skills:

        normalized = normalize_skill(skill)

        normalized_resume_skills[normalized] = skill

    matched_skills = []
    missing_skills = []

    for job_skill in job_skills:

        normalized_job_skill = normalize_skill(
            job_skill
        )

        if normalized_job_skill in normalized_resume_skills:

            matched_skills.append(
                normalized_resume_skills[
                    normalized_job_skill
                ]
            )

        else:

            missing_skills.append(
                job_skill
            )

    matched_skills = list(
        dict.fromkeys(
            matched_skills
        )
    )

    missing_skills = list(
        dict.fromkeys(
            missing_skills
        )
    )

    job_skills = list(
        dict.fromkeys(
            job_skills
        )
    )

    total_job_skills = len(
        job_skills
    )

    matched_count = len(
        matched_skills
    )

    if total_job_skills > 0:

        match_percentage = round(
            (
                matched_count /
                total_job_skills
            ) * 100,
            2
        )

    else:

        match_percentage = 0

    recommendations = []

    for skill in missing_skills:

        recommendations.append(
            f"Consider learning {skill} to improve your job match."
        )

    return {

        "job_skills": job_skills,

        "resume_skills": resume_skills,

        "matched_skills": matched_skills,

        "missing_skills": missing_skills,

        "recommendations": recommendations,

        "match_percentage": match_percentage

    }