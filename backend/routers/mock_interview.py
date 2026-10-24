
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Literal
import json

from ..services.groq_service import get_client, get_groq_model
from ..resume_store import resume_data

router = APIRouter(prefix="/mock-interview", tags=["Mock Interview"])


class StartInterviewRequest(BaseModel):
    role: str = Field(min_length=2, max_length=150)
    difficulty: Literal["Beginner", "Intermediate", "Advanced"] = "Intermediate"
    interview_type: Literal["Technical", "HR", "Mixed"] = "Mixed"
    question_count: int = Field(default=5, ge=1, le=10)


class EvaluateAnswerRequest(BaseModel):
    question: str = Field(min_length=3, max_length=2000)
    answer: str = Field(min_length=1, max_length=6000)
    role: str = Field(min_length=2, max_length=150)


def call_groq(prompt: str) -> str:
    client = get_client()
    model = get_groq_model()

    if not client or not model:
        raise HTTPException(
            status_code=503,
            detail="AI service is not configured. Check the backend environment settings.",
        )

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a professional technical interviewer and career coach. "
                        "Give accurate, constructive, role-relevant feedback."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.4,
        )
        return response.choices[0].message.content or ""
    except HTTPException:
        raise
    except Exception as exc:
        print(f"Mock interview AI error: {exc}")
        raise HTTPException(
            status_code=502,
            detail="The AI service could not complete the request. Please try again.",
        )


@router.post("/start")
def start_interview(request: StartInterviewRequest):
    resume_text = ""
    if resume_data:
        resume_text = str(resume_data.get("text", ""))[:12000]

    prompt = f"""
Create {request.question_count} interview questions for this candidate.

Role: {request.role}
Difficulty: {request.difficulty}
Interview type: {request.interview_type}

Resume:
{resume_text or "No resume uploaded. Create role-based questions."}

Return ONLY valid JSON in this exact structure:
{{
  "title": "Interview title",
  "questions": [
    {{
      "question": "Question text",
      "topic": "Topic",
      "difficulty": "{request.difficulty}"
    }}
  ]
}}

Rules:
- Generate exactly {request.question_count} distinct questions.
- Use the selected interview type and difficulty.
- If resume content exists, personalize some questions to its projects and skills.
- Do not include answers or explanations.
"""

    raw = call_groq(prompt)

    try:
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3].strip()

        result = json.loads(cleaned)
        questions = result.get("questions", [])

        if not isinstance(questions, list) or not questions:
            raise ValueError("No questions returned.")

        return {
            "title": result.get("title", f"{request.role} Mock Interview"),
            "role": request.role,
            "difficulty": request.difficulty,
            "interview_type": request.interview_type,
            "questions": questions[:request.question_count],
        }
    except (json.JSONDecodeError, ValueError, AttributeError):
        raise HTTPException(
            status_code=502,
            detail="The AI returned an invalid question format. Please try again.",
        )


@router.post("/evaluate")
def evaluate_answer(request: EvaluateAnswerRequest):
    prompt = f"""
Evaluate this candidate's answer in a mock interview.

Target role: {request.role}
Interview question: {request.question}
Candidate answer: {request.answer}

Return ONLY valid JSON with this structure:
{{
  "score": 7,
  "verdict": "Good start",
  "strengths": ["Specific strength"],
  "improvements": ["Specific improvement"],
  "sample_answer": "A concise example of a stronger answer",
  "feedback": "Overall constructive feedback"
}}

Scoring:
- Score must be an integer from 0 to 10.
- Evaluate correctness, relevance, clarity, and practical depth.
- Do not award high scores for an empty or irrelevant answer.
- Keep the feedback respectful, specific, and useful.
"""

    raw = call_groq(prompt)

    try:
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3].strip()

        result = json.loads(cleaned)
        score = int(result["score"])

        if not 0 <= score <= 10:
            raise ValueError("Score outside valid range.")

        result["score"] = score
        return result
    except (json.JSONDecodeError, ValueError, KeyError, TypeError):
        raise HTTPException(
            status_code=502,
            detail="The AI returned an invalid evaluation format. Please try again.",
        )
