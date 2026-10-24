from __future__ import annotations

from sqlalchemy.exc import SQLAlchemyError


def _error_category(error: Exception) -> str:
    original = getattr(error, "orig", None)
    if isinstance(original, FileNotFoundError):
        return "ca_certificate_unavailable"

    error_args = getattr(original, "args", ())
    code = error_args[0] if error_args and isinstance(error_args[0], int) else None

    if code == 1045:
        return "authentication_rejected"
    if code in (1044, 1049):
        return "database_or_privilege_rejected"
    if code in (1042, 2003, 2005):
        return "network_or_dns_failure"
    if code in (2026, 3159):
        return "tls_or_certificate_failure"
    if isinstance(error, FileNotFoundError):
        return "ca_certificate_unavailable"
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
