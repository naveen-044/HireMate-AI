from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database.connection import Base, engine
from .routers import auth, career, job, mock_interview, progress as progress_router
from .routers import resume, roadmap
from .services.groq_config import get_groq_model, is_groq_configured

app = FastAPI()
Base.metadata.create_all(bind=engine)


app.add_middleware(

    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"]

)


@app.get("/")
def root():
    return {"message": "Welcome to HireMate AI"}


@app.get("/health")
def health():
    return {
        "status": "ok",
        "ai": {
            "provider": "Groq",
            "configured": is_groq_configured(),
            "model": get_groq_model(),
        },
    }


app.include_router(resume.router)
app.include_router(job.router)
app.include_router(career.router)
app.include_router(mock_interview.router)
app.include_router(roadmap.router)
app.include_router(auth.router)
app.include_router(progress_router.router)