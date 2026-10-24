import os
from pathlib import Path

from dotenv import load_dotenv


DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b"
load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def get_groq_model():
    return os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL).strip() or DEFAULT_GROQ_MODEL


def is_groq_configured():
    return bool(os.getenv("GROQ_API_KEY"))
