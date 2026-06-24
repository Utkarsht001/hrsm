"""
Cookie auth regression tests for WorkFlow HRMS.
Verifies that /api/auth/login sets an httpOnly cookie, /api/auth/me works
with cookie-only and bearer-only, and /api/auth/logout clears the cookie.
"""
import os
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://hr-system-build-3.preview.emergentagent.com",
).rstrip("/")

CREDS = {"email": "admin@workflow.com", "password": "admin123"}


def test_login_returns_access_token_and_sets_cookie():
    r = requests.post(f"{BASE_URL}/api/auth/login", json=CREDS, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    # JSON body keeps accessToken + user
    assert "accessToken" in data and isinstance(data["accessToken"], str) and len(data["accessToken"]) > 20
    assert "user" in data and data["user"]["email"] == CREDS["email"]

    # Set-Cookie header present with access_token + HttpOnly
    set_cookie = r.headers.get("set-cookie", "") or r.headers.get("Set-Cookie", "")
    assert "access_token=" in set_cookie, f"missing access_token cookie: {set_cookie}"
    lc = set_cookie.lower()
    assert "httponly" in lc, f"cookie missing HttpOnly flag: {set_cookie}"
    # SameSite=lax expected
    assert "samesite=lax" in lc, f"cookie missing SameSite=lax: {set_cookie}"
    # Secure flag expected (preview is https)
    assert "secure" in lc, f"cookie missing Secure flag: {set_cookie}"


def test_me_with_cookie_only_no_bearer():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=CREDS, timeout=20)
    assert r.status_code == 200
    assert "access_token" in s.cookies, f"cookie not stored in session: {s.cookies}"

    # Call /me with ONLY the cookie (no Authorization header)
    r2 = s.get(f"{BASE_URL}/api/auth/me", timeout=20)
    assert r2.status_code == 200, f"/me with cookie failed: {r2.status_code} {r2.text}"
    assert r2.json()["email"] == CREDS["email"]


def test_me_with_bearer_only_backwards_compat():
    r = requests.post(f"{BASE_URL}/api/auth/login", json=CREDS, timeout=20)
    token = r.json()["accessToken"]
    # Fresh session (no cookies), bearer header only
    r2 = requests.get(
        f"{BASE_URL}/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
        timeout=20,
    )
    assert r2.status_code == 200, r2.text
    assert r2.json()["email"] == CREDS["email"]


def test_logout_clears_cookie():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=CREDS, timeout=20)
    assert r.status_code == 200
    assert "access_token" in s.cookies

    rl = s.post(f"{BASE_URL}/api/auth/logout", timeout=20)
    assert rl.status_code in (200, 204), rl.text

    set_cookie = rl.headers.get("set-cookie", "") or rl.headers.get("Set-Cookie", "")
    # Server should send a Set-Cookie that clears access_token
    assert "access_token=" in set_cookie, f"logout did not Set-Cookie: {set_cookie}"
    lc = set_cookie.lower()
    # Cookie cleared: max-age=0 or expires in the past
    cleared = ("max-age=0" in lc) or ("max-age=\"0\"" in lc) or ("expires=" in lc and "1970" in lc) or ("access_token=;" in lc) or ('access_token="";' in lc)
    assert cleared, f"logout cookie not invalidated: {set_cookie}"
