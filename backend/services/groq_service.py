import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = None


def get_client():

    global client

    if client is None:

        api_key = os.getenv("GROQ_API_KEY")

        if not api_key:

            print("GROQ_API_KEY not found")

            return None

        client = Groq(
            api_key=api_key
        )

    return client


def extract_job_skills(job_description):

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
You are an expert job description analysis system.

Extract ALL relevant skills, qualifications, tools, technologies,
domain knowledge, professional abilities, and job-related competencies
explicitly mentioned in the job description.

This system supports jobs from ALL backgrounds.

Examples include:

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
Graphic Design, UI Design, Video Editing

IMPORTANT RULES:

1. Extract only skills and competencies explicitly mentioned
in the job description.

2. Do not invent skills.

3. Do not include company names.

4. Do not include job location.

5. Do not include salary.

6. Do not include education degrees unless they are explicitly
required as a qualification.

7. Do not include years of experience as a skill.

8. Include technical and non-technical job-related skills.

9. Include software, tools, technologies, professional skills,
domain skills, certifications, and relevant competencies.

10. Keep multi-word skills together.

11. Remove duplicate skills.

12. Do not use a predefined skill list.

13. Identify skills dynamically from the complete job description.

14. Return ALL relevant skills from the entire job description.

15. Return only the skills separated by commas.

16. Do not return explanations.

17. Do not return JSON.

18. Do not return markdown.

19. Be conservative. If something is not explicitly mentioned,
do not add it.

Return the complete list of relevant skills found in the
job description.
"""
                },

                {
                    "role": "user",

                    "content": job_description
                }

            ]
        )


        result = response.choices[0].message.content


        if not result:

            return []


        result = result.strip()


        if result.startswith("```"):

            result = result.replace(
                "```text",
                ""
            )

            result = result.replace(
                "```",
                ""
            )

            result = result.strip()


        skills = [

            skill.strip()

            for skill in result.split(",")

            if skill.strip()

        ]


        print(
            "Groq job skills:"
        )

        print(
            ", ".join(skills)
        )


        return skills


    except Exception as error:

        print(
            f"Job skill extraction error: {error}"
        )

        return []  