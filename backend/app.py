from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import resume
from routers import job


app = FastAPI()


app.add_middleware(

    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176"
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"]

)


@app.get("/")
def root():
    return {"message": "Welcome to HireMate AI"}


app.include_router(
    resume.router
)


app.include_router(
    job.router
)