"""Cookie auth regression tests for WorkFlow HRMS.

Verifies that /api/auth/login sets an httpOnly cookie, /api/auth/me works with
cookie-only and bearer-only, and /api/auth/logout clears the cookie.

Credentials are sourced from environment variables (with conservative defaults
matching the documented demo seed) so that overriding them in CI is trivial.
"""
import os
import re
import pytest
import requests


BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://hr-system-build-3.preview.emergentagent.com",
).rstrip("/")

TEST_EMAIL = os.environ.get("HRMS_TEST_ADMIN_EMAIL", "admin@workflow.com")
TEST_PASSWORD = os.environ.get("HRMS_TEST_ADMIN_PASSWORD", "admin123")


@pytest.fixture
def creds() -> dict:
    return {"email": TEST_EMAIL, "password": TEST_PASSWORD}


@pytest.fixture
def login_response(creds):
    r = requests.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=20)
    assert r.status_code == 200, r.text
    return r


@pytest.fixture
def authed_session(creds) -> requests.Session:
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=20)
    assert r.status_code == 200
    return s


def _set_cookie_header(response) -> str:
    return response.headers.get("set-cookie", "") or response.headers.get("Set-Cookie", "")


# -- Login -------------------------------------------------------------------

def test_login_returns_access_token(login_response, creds):
    data = login_response.json()
    assert isinstance(data.get("accessToken"), str)
    assert len(data["accessToken"]) > 20
    assert data["user"]["email"] == creds["email"]


def test_login_sets_access_token_cookie(login_response):
    set_cookie = _set_cookie_header(login_response)
    assert "access_token=" in set_cookie, f"missing access_token cookie: {set_cookie}"


def test_login_cookie_has_security_flags(login_response):
    lc = _set_cookie_header(login_response).lower()
    assert "httponly" in lc
    assert "samesite=lax" in lc
    assert "secure" in lc


# -- /me ---------------------------------------------------------------------

def test_me_with_cookie_only(authed_session, creds):
    assert "access_token" in authed_session.cookies
    r = authed_session.get(f"{BASE_URL}/api/auth/me", timeout=20)
    assert r.status_code == 200
    assert r.json()["email"] == creds["email"]


def test_me_with_bearer_only_backwards_compat(login_response, creds):
    token = login_response.json()["accessToken"]
    r = requests.get(
        f"{BASE_URL}/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
        timeout=20,
    )
    assert r.status_code == 200
    assert r.json()["email"] == creds["email"]


# -- Logout ------------------------------------------------------------------

_CLEARED_PATTERN = re.compile(
    r"max-age=0|expires=[^;]*1970|access_token=(?:;|\"\";)",
    re.IGNORECASE,
)


def test_logout_returns_success(authed_session):
    r = authed_session.post(f"{BASE_URL}/api/auth/logout", timeout=20)
    assert r.status_code in (200, 204)


def test_logout_clears_cookie(authed_session):
    r = authed_session.post(f"{BASE_URL}/api/auth/logout", timeout=20)
    set_cookie = _set_cookie_header(r)
    assert "access_token=" in set_cookie, f"logout did not Set-Cookie: {set_cookie}"
    assert _CLEARED_PATTERN.search(set_cookie), f"logout cookie not invalidated: {set_cookie}"
