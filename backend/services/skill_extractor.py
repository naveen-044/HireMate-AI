import os
import json
import hashlib
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = None

CACHE_FILE = "skill_cache.json"


def get_client():
    global client

    if client is None:
        api_key = os.getenv("GROQ_API_KEY")

        if not api_key:
            print("GROQ_API_KEY not found")
            return None

        client = Groq(api_key=api_key)

    return client


def load_cache():
    if not os.path.exists(CACHE_FILE):
        return {}

    try:
        with open(CACHE_FILE, "r", encoding="utf-8") as file:
            return json.load(file)
    except Exception:
        return {}


def save_cache(cache):
    try:
        with open(CACHE_FILE, "w", encoding="utf-8") as file:
            json.dump(cache, file, indent=2)
    except Exception as error:
        print(f"Skill cache save error: {error}")


def get_resume_hash(resume_text):
    return hashlib.sha256(
        resume_text.strip().encode("utf-8")
    ).hexdigest()


def extract_skills(resume_text):

    resume_hash = get_resume_hash(resume_text)

    cache = load_cache()

    if resume_hash in cache:
        print("Using cached resume skills")

        cached_skills = cache[resume_hash]

        return sorted(
            list(dict.fromkeys(cached_skills)),
            key=lambda x: x.lower()
        )

    client_instance = get_client()

    if client_instance is None:
        return []

    try:

        response = client_instance.chat.completions.create(
            model="openai/gpt-oss-120b",
            temperature=0,
            messages=[
                {
                    "role": "system",
                    "content": """
You are an expert resume skill extraction system.

Extract ALL relevant skills, qualifications, tools,
technologies, domain knowledge, professional abilities,
and job-related competencies explicitly mentioned in
the resume.

This system supports ALL career backgrounds.

Examples:

IT:
Python, Java, React, SQL, AWS

Data:
Data Analysis, Excel, Statistics, Power BI

Finance:
Accounting, GST, Tally, Financial Reporting

Marketing:
SEO, Digital Marketing, Content Writing

Engineering:
AutoCAD, SolidWorks, CAD, Manufacturing

Healthcare:
Patient Care, Medical Coding, Clinical Research

Education:
Teaching, Lesson Planning, Classroom Management

HR:
Recruitment, Payroll, Employee Relations

Sales:
Lead Generation, Negotiation, Customer Relationship Management

Administration:
MS Office, Documentation, Data Entry, Record Management

Hospitality:
Customer Service, Hotel Operations, Front Office

Creative:
Graphic Design, UI Design, Video Editing, Adobe Photoshop

IMPORTANT RULES:

1. Extract only information explicitly present in the resume.
2. Never invent skills.
3. Never assume a skill from a degree or job title.
4. Include technical and non-technical job-related skills.
5. Include software, tools, technologies, professional skills,
domain skills, certifications, and relevant competencies.
6. Keep multi-word skills together.
7. Remove duplicate skills.
8. Do not include personal information.
9. Do not include names, phone numbers, email addresses,
addresses, dates of birth, or contact information.
10. Do not include generic words such as resume, student,
employee, company, job, person, candidate.
11. Do not use a predefined skill list.
12. Identify skills dynamically from the complete resume.
13. Return only skills separated by commas.
14. Do not return explanations.
15. Do not return JSON.
16. Do not return markdown.
"""
                },
                {
                    "role": "user",
                    "content": resume_text
                }
            ]
        )

        result = response.choices[0].message.content

        if not result:
            return []

        result = result.strip()

        if result.startswith("```"):
            result = result.replace("```text", "")
            result = result.replace("```", "")
            result = result.strip()

        skills = [
            skill.strip()
            for skill in result.split(",")
            if skill.strip()
        ]

        skills = list(dict.fromkeys(skills))

        skills = sorted(
            skills,
            key=lambda x: x.lower()
        )

        cache[resume_hash] = skills

        save_cache(cache)

        print("New resume skills:")
        print(", ".join(skills))

        return skills

    except Exception as error:

        print(f"Skill extraction error: {error}")

        return []