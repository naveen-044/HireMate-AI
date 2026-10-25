
import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is missing from backend/.env")

database_url = make_url(DATABASE_URL)

if database_url.drivername in {"postgres", "postgresql"}:
    database_url = database_url.set(drivername="postgresql+psycopg")
elif database_url.drivername not in {
    "postgresql+psycopg",
    "sqlite",
    "sqlite+pysqlite",
}:
    raise RuntimeError("DATABASE_URL must use PostgreSQL or SQLite")

engine = create_engine(
    database_url,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()
