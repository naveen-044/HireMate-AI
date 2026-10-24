import os
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

os.environ["DATABASE_URL"] = "sqlite://"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app import app
from backend.database.connection import Base
from backend.models.email_verification import EmailVerification
from backend.models.password_reset import PasswordReset
from backend.models.user import User
from backend.routers import auth


TEST_ENGINE = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSession = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=TEST_ENGINE,
)


def override_get_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[auth.get_db] = override_get_db


class AuthApiTests(unittest.TestCase):
    def setUp(self):
        Base.metadata.drop_all(bind=TEST_ENGINE)
        Base.metadata.create_all(bind=TEST_ENGINE)
        self.client = TestClient(app)
        self.sent_codes = []
        self.email_patch = patch.object(
            auth,
            "send_otp_email",
            side_effect=lambda email, otp: self.sent_codes.append((email, otp)),
        )
        self.email_patch.start()
        self.sent_reset_codes = []
        self.reset_email_patch = patch.object(
            auth,
            "send_password_reset_email",
            side_effect=lambda email, otp: self.sent_reset_codes.append(
                (email, otp)
            ),
        )
        self.reset_email_patch.start()
        self.original_secret = auth.SECRET_KEY
        auth.SECRET_KEY = "test-only-signing-key-with-at-least-32-bytes"

    def tearDown(self):
        auth.SECRET_KEY = self.original_secret
        self.email_patch.stop()
        self.reset_email_patch.stop()
        self.client.close()

    def register(self, email="Candidate@Example.com"):
        with patch("backend.routers.auth.secrets.randbelow", return_value=0):
            response = self.client.post(
                "/auth/register",
                json={
                    "full_name": "Test Candidate",
                    "email": email,
                    "password": "safe-test-password",
                },
            )
        return response

    def get_pending(self, email="candidate@example.com"):
        with TestSession() as db:
            return (
                db.query(EmailVerification)
                .filter(EmailVerification.email == email)
                .first()
            )

    def test_registration_persists_hashed_credentials_and_one_minute_otp(self):
        response = self.register()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["email"], "candidate@example.com")
        self.assertNotIn("otp", response.json())
        self.assertEqual(self.sent_codes, [("candidate@example.com", "100000")])

        pending = self.get_pending("candidate@example.com")
        self.assertIsNotNone(pending)
        self.assertEqual(pending.email, "candidate@example.com")
        self.assertTrue(
            auth.password_hash.verify("safe-test-password", pending.hashed_password)
        )
        self.assertNotEqual(pending.hashed_password, "safe-test-password")
        self.assertEqual(pending.otp_hash, auth.hash_otp("100000"))
        self.assertNotEqual(pending.otp_hash, "100000")
        self.assertEqual(pending.attempts, 0)
        self.assertEqual(
            pending.expires_at,
            pending.created_at + timedelta(minutes=1),
        )

    def test_registration_updates_existing_pending_record_after_cooldown(self):
        self.assertEqual(self.register().status_code, 201)
        original_id = self.get_pending().id

        with TestSession() as db:
            pending = db.query(EmailVerification).one()
            pending.created_at = datetime.now(timezone.utc).replace(
                tzinfo=None
            ) - timedelta(seconds=61)
            pending.attempts = 1
            db.commit()

        with patch("backend.routers.auth.secrets.randbelow", return_value=1):
            response = self.client.post(
                "/auth/register",
                json={
                    "full_name": "Updated Candidate",
                    "email": "CANDIDATE@EXAMPLE.COM",
                    "password": "updated-test-password",
                },
            )

        self.assertEqual(response.status_code, 201)
        pending = self.get_pending()
        self.assertEqual(pending.id, original_id)
        self.assertEqual(pending.full_name, "Updated Candidate")
        self.assertEqual(pending.otp_hash, auth.hash_otp("100001"))
        self.assertTrue(
            auth.password_hash.verify(
                "updated-test-password",
                pending.hashed_password,
            )
        )
        self.assertEqual(pending.attempts, 0)
        self.assertEqual(
            pending.expires_at,
            pending.created_at + timedelta(minutes=1),
        )

    def test_successful_verification_creates_one_verified_user_and_login_works(self):
        self.assertEqual(self.register().status_code, 201)

        verified = self.client.post(
            "/auth/verify-email",
            json={"email": " CANDIDATE@EXAMPLE.COM ", "otp": "100000"},
        )
        self.assertEqual(verified.status_code, 200)

        repeated = self.client.post(
            "/auth/verify-email",
            json={"email": "candidate@example.com", "otp": "100000"},
        )
        self.assertEqual(repeated.status_code, 200)

        with TestSession() as db:
            users = (
                db.query(User)
                .filter(User.email == "candidate@example.com")
                .all()
            )
            pending = (
                db.query(EmailVerification)
                .filter(EmailVerification.email == "candidate@example.com")
                .first()
            )
            self.assertEqual(len(users), 1)
            self.assertTrue(users[0].is_verified)
            self.assertIsNone(pending)

        login = self.client.post(
            "/auth/login",
            json={
                "email": "CANDIDATE@EXAMPLE.COM",
                "password": "safe-test-password",
            },
        )
        self.assertEqual(login.status_code, 200)
        self.assertIn("access_token", login.json())

    def test_wrong_otp_is_counted_and_limit_is_enforced(self):
        self.assertEqual(self.register().status_code, 201)

        wrong = self.client.post(
            "/auth/verify-email",
            json={"email": "candidate@example.com", "otp": "999999"},
        )
        self.assertEqual(wrong.status_code, 400)
        self.assertEqual(self.get_pending("candidate@example.com").attempts, 1)

        over_limit = self.client.post(
            "/auth/verify-email",
            json={"email": "candidate@example.com", "otp": "100000"},
        )
        self.assertEqual(over_limit.status_code, 429)
        self.assertIsNone(
            self._get_user("candidate@example.com")
        )

    def test_expired_otp_is_rejected_and_pending_record_is_removed(self):
        self.assertEqual(self.register().status_code, 201)
        with TestSession() as db:
            pending = db.query(EmailVerification).one()
            pending.expires_at = datetime.now(timezone.utc).replace(
                tzinfo=None
            ) - timedelta(seconds=1)
            db.commit()

        response = self.client.post(
            "/auth/verify-email",
            json={"email": "candidate@example.com", "otp": "100000"},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("expired", response.json()["detail"].lower())
        self.assertIsNone(self.get_pending())

    def test_missing_pending_record_returns_clear_not_found_response(self):
        response = self.client.post(
            "/auth/verify-email",
            json={"email": "missing@example.com", "otp": "100000"},
        )
        resend = self.client.post(
            "/auth/resend-otp",
            json={"email": "missing@example.com"},
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.json()["detail"],
            "No pending registration found. Please register again.",
        )
        self.assertEqual(resend.status_code, 404)
        self.assertEqual(resend.json()["detail"], response.json()["detail"])

    def test_login_rejects_an_unverified_account(self):
        with TestSession() as db:
            db.add(
                User(
                    full_name="Unverified Candidate",
                    email="unverified@example.com",
                    hashed_password=auth.password_hash.hash(
                        "safe-test-password"
                    ),
                    is_verified=False,
                )
            )
            db.commit()

        response = self.client.post(
            "/auth/login",
            json={
                "email": "unverified@example.com",
                "password": "safe-test-password",
            },
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn("verify your email", response.json()["detail"].lower())

    def test_resend_requires_only_email_enforces_cooldown_and_resets_expiry(self):
        with patch("backend.routers.auth.secrets.randbelow", return_value=0):
            self.assertEqual(self.register().status_code, 201)

            too_soon = self.client.post(
                "/auth/resend-otp",
                json={"email": "candidate@example.com"},
            )
            self.assertEqual(too_soon.status_code, 429)

            extra_otp = self.client.post(
                "/auth/resend-otp",
                json={"email": "candidate@example.com", "otp": "123456"},
            )
            self.assertEqual(extra_otp.status_code, 422)

            with TestSession() as db:
                pending = db.query(EmailVerification).one()
                pending.created_at = datetime.now(timezone.utc).replace(
                    tzinfo=None
                ) - timedelta(seconds=61)
                pending.attempts = 1
                db.commit()

        with patch("backend.routers.auth.secrets.randbelow", return_value=1):
            resent = self.client.post(
                "/auth/resend-otp",
                json={"email": " CANDIDATE@EXAMPLE.COM "},
            )

        self.assertEqual(resent.status_code, 200)
        self.assertEqual(
            self.sent_codes,
            [
                ("candidate@example.com", "100000"),
                ("candidate@example.com", "100001"),
            ],
        )
        pending = self.get_pending("candidate@example.com")
        self.assertEqual(pending.otp_hash, auth.hash_otp("100001"))
        self.assertEqual(pending.attempts, 0)
        self.assertEqual(
            pending.expires_at,
            pending.created_at + timedelta(minutes=1),
        )

    def test_password_reset_request_is_generic_for_unknown_email(self):
        response = self.client.post(
            "/auth/password-reset/request",
            json={"email": "missing@example.com"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("If an eligible account exists", response.json()["message"])
        self.assertEqual(self.sent_reset_codes, [])

    def test_password_reset_changes_password_and_consumes_code(self):
        with TestSession() as db:
            db.add(
                User(
                    full_name="Test Candidate",
                    email="candidate@example.com",
                    hashed_password=auth.password_hash.hash(
                        "original-password"
                    ),
                    is_verified=True,
                )
            )
            db.commit()

        with patch("backend.routers.auth.secrets.randbelow", return_value=0):
            requested = self.client.post(
                "/auth/password-reset/request",
                json={"email": "CANDIDATE@EXAMPLE.COM"},
            )

        self.assertEqual(requested.status_code, 200)
        self.assertEqual(
            self.sent_reset_codes,
            [("candidate@example.com", "100000")],
        )

        reset = self.client.post(
            "/auth/password-reset/confirm",
            json={
                "email": "CANDIDATE@EXAMPLE.COM",
                "otp": "100000",
                "new_password": "new-safe-password",
            },
        )
        self.assertEqual(reset.status_code, 200)
        self.assertIsNone(
            self._get_password_reset("candidate@example.com")
        )

        old_password_login = self.client.post(
            "/auth/login",
            json={
                "email": "candidate@example.com",
                "password": "original-password",
            },
        )
        new_password_login = self.client.post(
            "/auth/login",
            json={
                "email": "candidate@example.com",
                "password": "new-safe-password",
            },
        )
        self.assertEqual(old_password_login.status_code, 401)
        self.assertEqual(new_password_login.status_code, 200)

    def test_password_reset_rejects_wrong_code_and_limits_attempts(self):
        with TestSession() as db:
            db.add(
                User(
                    full_name="Test Candidate",
                    email="candidate@example.com",
                    hashed_password=auth.password_hash.hash(
                        "original-password"
                    ),
                    is_verified=True,
                )
            )
            db.commit()

        with patch("backend.routers.auth.secrets.randbelow", return_value=0):
            self.client.post(
                "/auth/password-reset/request",
                json={"email": "candidate@example.com"},
            )

        for _ in range(auth.MAX_PASSWORD_RESET_ATTEMPTS):
            wrong_code = self.client.post(
                "/auth/password-reset/confirm",
                json={
                    "email": "candidate@example.com",
                    "otp": "999999",
                    "new_password": "new-safe-password",
                },
            )
            self.assertEqual(wrong_code.status_code, 400)

        over_limit = self.client.post(
            "/auth/password-reset/confirm",
            json={
                "email": "candidate@example.com",
                "otp": "100000",
                "new_password": "new-safe-password",
            },
        )
        self.assertEqual(over_limit.status_code, 429)

    def _get_password_reset(self, email):
        with TestSession() as db:
            return (
                db.query(PasswordReset)
                .filter(PasswordReset.email == email)
                .first()
            )

    def _get_user(self, email):
        with TestSession() as db:
            return db.query(User).filter(User.email == email).first()


if __name__ == "__main__":
    unittest.main()
