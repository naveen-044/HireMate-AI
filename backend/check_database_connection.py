from __future__ import annotations

from sqlalchemy.exc import SQLAlchemyError


def _error_category(error: Exception) -> str:
    original = getattr(error, "orig", None)
    sqlstate = getattr(original, "sqlstate", None) or getattr(
        original, "pgcode", None
    )
    if sqlstate and sqlstate.startswith("28"):
        return "authentication_rejected"
    if sqlstate and sqlstate.startswith("3D"):
        return "database_not_found"
    if sqlstate and sqlstate.startswith("08"):
        return "network_or_dns_failure"
    if isinstance(error, (RuntimeError, ValueError)):
        return "configuration_error"
    if isinstance(error, ImportError):
        return "dependency_missing"
    return "database_connection_failed"


def main() -> int:
    try:
        from backend.database.connection import engine

        with engine.connect() as connection:
            connection.exec_driver_sql("SELECT 1")
    except (ImportError, OSError, RuntimeError, SQLAlchemyError, ValueError) as error:
        print(f"Database connection failed: {_error_category(error)}")
        return 1

    print("Database connection successful.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
