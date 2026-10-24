# HireMate AI

HireMate AI is a React/Vite frontend backed by a FastAPI service. The currently implemented workflow accepts PDF or pasted resume text, lets the user review extracted text, calculates deterministic resume scores, and optionally uses Groq for resume interpretation and skill extraction.

## Local development

### Backend

1. Create and activate a Python virtual environment.
2. Install backend requirements:

   ```powershell
   python -m pip install -r backend\requirements.txt
   ```

3. Copy `backend\.env.example` to `backend\.env`. Add a Groq key to enable AI-assisted analysis. `GROQ_MODEL` can select another model available to the Groq API.
4. Start the API from the repository root:

   ```powershell
   python -m uvicorn backend.app:app --reload
   ```

   The service is available at `http://127.0.0.1:8000`; `/health` reports whether Groq is configured without exposing the key.

### Frontend

1. Install dependencies:

   ```powershell
   Set-Location frontend
   npm install
   ```

2. Optionally copy `.env.example` to `.env` and set `VITE_API_BASE_URL`.
3. Start Vite:

   ```powershell
   npm run dev
   ```

## Scoring and resume handling

- Scoring rules are deterministic and versioned (`1.0.0`). The ATS-style readability estimate is shown only for PDF uploads with page metadata. Pasted text does not receive a PDF readability score.
- Resume content quality is a separate text-based heuristic. Both reports show category weights, category results, evidence, and recommendations.
- These heuristics are not scores from a specific ATS and do not predict hiring outcomes.
- PDFs are processed in memory, limited to 10 MB, and must contain selectable text. Image-only/scanned PDFs receive OCR guidance rather than a fabricated analysis.
- Extracted text is capped at 100,000 characters and can be reviewed before analysis.
- Groq is optional for deterministic scoring. Without `GROQ_API_KEY`, AI skill extraction and AI-generated narrative findings are unavailable and the UI reports that setup requirement.

## Tests and checks

From the repository root:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests
```

For the frontend:

```powershell
Set-Location frontend
npm run lint
npm run build
```

## Manual acceptance checklist for the implemented workflow

- Start the API and frontend, then confirm the sidebar reports the real backend/Groq configuration state.
- Paste a synthetic resume, review and edit the extracted text, save it, and run the analysis.
- Run the same analysis twice and confirm both deterministic scores and their rule version remain unchanged.
- Confirm pasted text shows a resume quality score but does not claim a PDF ATS-readability score.
- Upload a selectable-text PDF and confirm page-based readability categories are shown.
- Upload a malformed or image-only PDF and confirm the API provides an actionable error/OCR message.
- Remove `GROQ_API_KEY` and confirm deterministic scoring remains available while the UI explains that AI features need setup.

## Current limitations

This repository is not yet the production-ready multi-user product described in the full product specification. In particular, the current backend keeps the active resume in process memory and does not implement Supabase authentication, user-scoped persistence/RLS, account deletion, or durable analysis history. Career Assistant, Mock Interview, Learning Roadmap, Application Tracker, and Resume Improvement are not implemented as functional workflows yet. Do not deploy this version with real user data or expose the API as a multi-user service.
