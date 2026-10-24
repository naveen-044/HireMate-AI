import re
from collections import Counter


SCORING_RULES_VERSION = "1.0.0"

SECTION_ALIASES = {
    "summary": ("summary", "professional summary", "profile", "objective"),
    "experience": (
        "experience",
        "work experience",
        "professional experience",
        "employment history",
        "work history",
    ),
    "education": ("education", "academic background"),
    "skills": ("skills", "technical skills", "core competencies"),
    "projects": ("projects", "academic projects", "personal projects"),
    "certifications": ("certifications", "certificates", "licenses"),
}

ACTION_VERBS = {
    "analyzed",
    "automated",
    "built",
    "collaborated",
    "created",
    "delivered",
    "designed",
    "developed",
    "directed",
    "implemented",
    "improved",
    "increased",
    "launched",
    "led",
    "maintained",
    "managed",
    "optimized",
    "organized",
    "reduced",
    "resolved",
    "streamlined",
    "supported",
    "trained",
    "transformed",
}

DATE_PATTERN = re.compile(
    r"\b(?:"
    r"(?:19|20)\d{2}"
    r"|(?:0?[1-9]|1[0-2])[/.-](?:19|20)?\d{2}"
    r"|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|"
    r"jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|"
    r"oct(?:ober)?|nov(?:ember)?|dec(?:ember)?"
    r")\b",
    re.IGNORECASE,
)

BULLET_PATTERN = re.compile(r"^\s*(?:[-*•▪◦]|\d+[.)])\s+\S")
EMAIL_PATTERN = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)
PHONE_PATTERN = re.compile(r"(?<!\w)(?:\+?\d[\d\s().-]{7,}\d)(?!\w)")


def _normalized_heading(line):
    heading = line.strip().strip(":").lower()
    return re.sub(r"[^a-z ]", "", heading).strip()


def detect_sections(resume_text):
    detected = {}
    aliases = {
        alias: section
        for section, names in SECTION_ALIASES.items()
        for alias in names
    }

    for line in resume_text.splitlines():
        heading = _normalized_heading(line)
        section = aliases.get(heading)
        if section and section not in detected:
            detected[section] = {
                "name": section.title(),
                "evidence": line.strip(),
            }

    return list(detected.values())


def _category(label, weight, score, evidence, recommendations):
    score = max(0, min(100, int(round(score))))
    points = round(score * weight / 100, 2)
    return {
        "label": label,
        "weight": weight,
        "score": score,
        "points": points,
        "evidence": evidence,
        "recommendations": recommendations,
    }


def _ats_readability(resume_text, format_data):
    if format_data.get("source") != "pdf":
        return {
            "score": None,
            "status": "insufficient_evidence",
            "message": (
                "A pasted resume has no PDF layout or extraction metadata. "
                "Upload the PDF to assess ATS-style document readability."
            ),
            "categories": {},
            "limitations": [
                "Text-only input cannot reveal columns, tables, image text, or reading order."
            ],
        }

    page_count = format_data.get("page_count")
    pages_with_text = format_data.get("pages_with_text")
    if (
        not isinstance(page_count, int)
        or page_count <= 0
        or not isinstance(pages_with_text, int)
    ):
        return {
            "score": None,
            "status": "insufficient_evidence",
            "message": "PDF page metadata is unavailable, so no ATS readability score was calculated.",
            "categories": {},
            "limitations": ["PDF page and extraction coverage were not available."],
        }

    coverage = min(1, max(0, pages_with_text / page_count))
    headings = detect_sections(resume_text)
    heading_count = len(headings)
    email_present = bool(EMAIL_PATTERN.search(resume_text))
    phone_present = bool(PHONE_PATTERN.search(resume_text))
    date_signals = len(DATE_PATTERN.findall(resume_text))
    text_chars_per_page = len(resume_text.strip()) / page_count

    categories = {
        "text_extraction": _category(
            "Text extraction coverage",
            30,
            coverage * 100,
            [f"{pages_with_text} of {page_count} pages contain extractable text."],
            [] if coverage == 1 else [
                "Check pages without extractable text; scanned pages may require OCR."
            ],
        ),
        "section_headings": _category(
            "Recognizable section headings",
            25,
            min(100, heading_count * 20),
            [f"{heading_count} recognized standard section headings found."],
            [] if heading_count >= 4 else [
                "Use clear, conventional headings for the sections that apply to your experience."
            ],
        ),
        "contact_readability": _category(
            "Contact information detectability",
            15,
            (50 if email_present else 0) + (50 if phone_present else 0),
            [
                f"Email detected: {'yes' if email_present else 'no'}.",
                f"Phone detected: {'yes' if phone_present else 'no'}.",
            ],
            [] if email_present and phone_present else [
                "Ensure your professional email and phone number appear as selectable text."
            ],
        ),
        "date_signals": _category(
            "Date signal detectability",
            15,
            min(100, date_signals * 25),
            [f"{date_signals} date-like values detected in extracted text."],
            [] if date_signals >= 2 else [
                "Add clearly formatted dates to relevant education and experience entries."
            ],
        ),
        "text_density": _category(
            "Extracted text density",
            15,
            min(100, round(text_chars_per_page / 12)),
            [f"Approximately {round(text_chars_per_page)} extracted characters per page."],
            [] if text_chars_per_page >= 600 else [
                "Review the PDF for sparse or image-based pages; this check cannot identify visual layout problems."
            ],
        ),
    }

    score = round(sum(category["points"] for category in categories.values()))
    return {
        "score": max(0, min(100, score)),
        "status": "scored",
        "message": (
            "A deterministic text-readability estimate, not a score from a specific ATS product."
        ),
        "categories": categories,
        "limitations": [
            "This text-based check cannot reliably assess visual columns, tables, image text, or reading order."
        ],
    }


def _resume_quality(resume_text):
    sections = detect_sections(resume_text)
    lines = [line.strip() for line in resume_text.splitlines() if line.strip()]
    bullets = [line for line in lines if BULLET_PATTERN.match(line)]
    normalized_bullets = [
        re.sub(r"\W+", " ", line.lower()).strip()
        for line in bullets
    ]
    duplicate_count = sum(count - 1 for count in Counter(normalized_bullets).values() if count > 1)
    quantified_bullets = sum(bool(re.search(r"\b\d+(?:[.,]\d+)?%?\b", line)) for line in bullets)
    action_bullets = sum(
        any(
            re.search(r"\b" + re.escape(verb) + r"\b", line, re.I)
            for verb in ACTION_VERBS
        )
        for line in bullets
    )

    section_score = min(100, len(sections) * 20)
    bullet_score = 0 if not bullets else min(
        100,
        35 + round(65 * quantified_bullets / len(bullets)),
    )
    action_score = 0 if not bullets else round(100 * action_bullets / len(bullets))
    clarity_score = 100 if 3 <= len(lines) <= 60 else (
        60 if 1 <= len(lines) <= 100 else 30
    )
    repetition_score = 100 if not bullets else max(
        0,
        round(100 * (1 - duplicate_count / len(bullets))),
    )

    categories = {
        "section_coverage": _category(
            "Section coverage",
            25,
            section_score,
            [f"{len(sections)} recognized standard section headings found."],
            [] if len(sections) >= 4 else [
                "Add relevant sections such as experience, education, skills, or projects where applicable."
            ],
        ),
        "bullet_specificity": _category(
            "Bullet specificity",
            25,
            bullet_score,
            [f"{quantified_bullets} of {len(bullets)} bullet lines contain a numeric detail."],
            [] if quantified_bullets else [
                "Where accurate, include concrete scope or outcomes; never invent metrics."
            ],
        ),
        "action_language": _category(
            "Action-oriented language",
            20,
            action_score,
            [f"{action_bullets} bullet lines use a detected action verb."],
            [] if action_bullets else [
                "Start accomplishment bullets with a precise action verb."
            ],
        ),
        "text_structure": _category(
            "Text structure",
            15,
            clarity_score,
            [f"{len(lines)} non-empty text lines detected."],
            [] if clarity_score == 100 else [
                "Review the text for unusually sparse or dense structure."
            ],
        ),
        "repetition": _category(
            "Bullet repetition",
            15,
            repetition_score,
            [f"{duplicate_count} repeated bullet line(s) detected."],
            [] if duplicate_count == 0 else [
                "Remove repeated bullet wording while preserving distinct evidence."
            ],
        ),
    }
    score = round(sum(category["points"] for category in categories.values()))
    return {
        "score": max(0, min(100, score)),
        "status": "scored",
        "message": (
            "A deterministic content-structure heuristic, not a measure of hiring outcomes."
        ),
        "categories": categories,
    }


def score_resume(resume_text, format_data=None):
    format_data = format_data or {}
    return {
        "scoring_rules_version": SCORING_RULES_VERSION,
        "ats_readability": _ats_readability(resume_text, format_data),
        "resume_quality": _resume_quality(resume_text),
    }
