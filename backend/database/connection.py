
import os
import tempfile
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
connect_args = {}

if database_url.drivername in {"postgres", "postgresql"}:
    database_url = database_url.set(drivername="postgresql+psycopg")
elif database_url.drivername == "mysql+pymysql":
    backend_dir = Path(__file__).resolve().parents[1]
    ca_pem = os.getenv("MYSQL_SSL_CA_PEM", "").strip()
    configured_ca_path = os.getenv("MYSQL_SSL_CA", "").strip()
    if ca_pem:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            suffix=".pem",
            prefix="hiremate-aiven-ca-",
            delete=False,
        ) as ca_file:
            ca_file.write(ca_pem)
            ca_cert_path = Path(ca_file.name)
    else:
        ca_cert_path = (
            Path(configured_ca_path).expanduser()
            if configured_ca_path
            else backend_dir / "ca.pem"
        )
        if not ca_cert_path.is_absolute():
            ca_cert_path = backend_dir / ca_cert_path
        ca_cert_path = ca_cert_path.resolve()
    if not ca_cert_path.is_file():
        raise FileNotFoundError("Configured MySQL CA certificate was not found")
    connect_args["ssl"] = {"ca": str(ca_cert_path)}

engine = create_engine(
    database_url,
    pool_pre_ping=True,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()
