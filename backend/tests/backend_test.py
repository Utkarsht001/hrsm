"""
Backend smoke tests for WorkFlow HRMS.
Hits the public preview URL using REACT_APP_BACKEND_URL.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://hr-system-build-3.preview.emergentagent.com").rstrip("/")

DEMO = {
    "admin":   ("admin@workflow.com",   "admin123"),
    "sarah":   ("sarah@workflow.com",   "sarah123"),
    "michael": ("michael@workflow.com", "michael123"),
    "priya":   ("priya@workflow.com",   "priya123"),
    "alex":    ("alex@workflow.com",    "alex123"),
}


def _login(email, password):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, f"login {email} failed: {r.status_code} {r.text}"
    data = r.json()
    assert "accessToken" in data and "user" in data
    return data["accessToken"], data["user"]


@pytest.fixture(scope="session")
def tokens():
    out = {}
    for k, (e, p) in DEMO.items():
        try:
            tok, u = _login(e, p)
            out[k] = {"token": tok, "user": u, "headers": {"Authorization": f"Bearer {tok}"}}
        except AssertionError as exc:
            pytest.fail(str(exc))
    return out


# ---------- Health ----------
def test_health():
    r = requests.get(f"{BASE_URL}/api/health", timeout=15)
    assert r.status_code == 200


# ---------- Auth ----------
def test_demo_users_public():
    r = requests.get(f"{BASE_URL}/api/auth/demo-users", timeout=15)
    assert r.status_code == 200
    data = r.json()
    emails = {u["email"] for u in data}
    assert {"admin@workflow.com", "sarah@workflow.com", "michael@workflow.com", "priya@workflow.com", "alex@workflow.com"} <= emails


def test_login_admin():
    tok, user = _login(*DEMO["admin"])
    assert user["role"] == "admin"
    assert isinstance(tok, str) and len(tok) > 20


def test_login_bad_credentials():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@workflow.com", "password": "wrong"}, timeout=15)
    assert r.status_code in (400, 401, 403)


def test_auth_me(tokens):
    r = requests.get(f"{BASE_URL}/api/auth/me", headers=tokens["sarah"]["headers"], timeout=15)
    assert r.status_code == 200
    assert r.json()["email"] == "sarah@workflow.com"


def test_auth_me_no_token():
    r = requests.get(f"{BASE_URL}/api/auth/me", timeout=15)
    assert r.status_code in (401, 403)


# ---------- Onboarding ----------
def test_alex_is_onboarding(tokens):
    assert tokens["alex"]["user"]["is_onboarding"] is True


def test_onboarding_dashboard_alex(tokens):
    r = requests.get(f"{BASE_URL}/api/onboarding/dashboard", headers=tokens["alex"]["headers"], timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "tasks" in data or "phases" in data or "progress" in data


# ---------- Attendance ----------
def test_attendance_today(tokens):
    r = requests.get(f"{BASE_URL}/api/attendance/today", headers=tokens["sarah"]["headers"], timeout=15)
    assert r.status_code == 200


def test_attendance_history(tokens):
    r = requests.get(f"{BASE_URL}/api/attendance/history", headers=tokens["sarah"]["headers"], timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---------- Leave ----------
def test_leave_balances(tokens):
    r = requests.get(f"{BASE_URL}/api/leave/balances", headers=tokens["sarah"]["headers"], timeout=15)
    assert r.status_code == 200


def test_leave_create_and_manager_approval_flow(tokens):
    payload = {
        "type": "sick",
        "start_date": "2026-02-10",
        "end_date": "2026-02-11",
        "reason": "TEST_pytest sick leave"
    }
    r = requests.post(f"{BASE_URL}/api/leave/requests", headers=tokens["sarah"]["headers"], json=payload, timeout=15)
    assert r.status_code in (200, 201), r.text
    req = r.json()
    assert req.get("type") == "sick"
    req_id = req.get("id")
    assert req_id

    # Manager sees approval
    ra = requests.get(f"{BASE_URL}/api/leave/approvals", headers=tokens["michael"]["headers"], timeout=15)
    assert ra.status_code == 200
    ids = [x.get("id") for x in ra.json()]
    assert req_id in ids

    # Approve
    rapprove = requests.post(
        f"{BASE_URL}/api/leave/requests/{req_id}/action",
        headers=tokens["michael"]["headers"],
        json={"action": "approve", "comment": "TEST ok"},
        timeout=15,
    )
    assert rapprove.status_code == 200, rapprove.text


# ---------- Payroll ----------
def test_payroll_payslips(tokens):
    r = requests.get(f"{BASE_URL}/api/payroll/payslips", headers=tokens["sarah"]["headers"], timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 1


# ---------- Documents ----------
def test_documents_list(tokens):
    r = requests.get(f"{BASE_URL}/api/documents", headers=tokens["sarah"]["headers"], timeout=15)
    assert r.status_code == 200


def test_documents_create(tokens):
    r = requests.post(
        f"{BASE_URL}/api/documents",
        headers=tokens["sarah"]["headers"],
        json={"name": "TEST_doc.pdf", "type": "policy", "category": "general"},
        timeout=15,
    )
    assert r.status_code in (200, 201), r.text


# ---------- Expenses ----------
def test_expenses_create_and_manager_sees(tokens):
    r = requests.post(
        f"{BASE_URL}/api/expenses",
        headers=tokens["sarah"]["headers"],
        json={"category": "travel", "amount": 42.5, "currency": "USD", "description": "TEST exp", "date": "2026-01-15"},
        timeout=15,
    )
    assert r.status_code in (200, 201), r.text
    exp_id = r.json().get("id")

    ra = requests.get(f"{BASE_URL}/api/expenses/approvals", headers=tokens["michael"]["headers"], timeout=15)
    assert ra.status_code == 200
    assert any(x.get("id") == exp_id for x in ra.json())


# ---------- Performance ----------
def test_goals_list(tokens):
    r = requests.get(f"{BASE_URL}/api/goals", headers=tokens["sarah"]["headers"], timeout=15)
    assert r.status_code == 200


def test_reviews(tokens):
    r = requests.get(f"{BASE_URL}/api/reviews", headers=tokens["sarah"]["headers"], timeout=15)
    assert r.status_code == 200


# ---------- Contributions ----------
def test_contributions(tokens):
    for path in ("/api/contributions", "/api/contributions/items", "/api/contributions/leaderboard"):
        r = requests.get(f"{BASE_URL}{path}", headers=tokens["sarah"]["headers"], timeout=15)
        assert r.status_code == 200, f"{path} failed"


# ---------- Training ----------
def test_training(tokens):
    r = requests.get(f"{BASE_URL}/api/training", headers=tokens["sarah"]["headers"], timeout=15)
    assert r.status_code == 200
    assert len(r.json()) >= 1


# ---------- Recruitment (HR only) ----------
def test_recruitment_hr(tokens):
    r = requests.get(f"{BASE_URL}/api/recruitment/candidates", headers=tokens["priya"]["headers"], timeout=15)
    assert r.status_code == 200


# ---------- Recognition ----------
def test_recognition_list_and_send(tokens):
    r = requests.get(f"{BASE_URL}/api/recognition", headers=tokens["sarah"]["headers"], timeout=15)
    assert r.status_code == 200
    # Send recognition to Michael
    michael_id = tokens["michael"]["user"]["id"]
    rp = requests.post(
        f"{BASE_URL}/api/recognition",
        headers=tokens["sarah"]["headers"],
        json={"recipient_id": michael_id, "category": "teamwork", "message": "TEST appreciation"},
        timeout=15,
    )
    assert rp.status_code in (200, 201), rp.text


# ---------- Announcements ----------
def test_announcements_list(tokens):
    r = requests.get(f"{BASE_URL}/api/announcements", headers=tokens["sarah"]["headers"], timeout=15)
    assert r.status_code == 200


def test_announcements_hr_create(tokens):
    r = requests.post(
        f"{BASE_URL}/api/announcements",
        headers=tokens["priya"]["headers"],
        json={"title": "TEST_ann", "content": "test body", "category": "policy"},
        timeout=15,
    )
    assert r.status_code in (200, 201), r.text


# ---------- Analytics ----------
def test_analytics_self(tokens):
    r = requests.get(f"{BASE_URL}/api/analytics/attendance", headers=tokens["sarah"]["headers"], timeout=15)
    assert r.status_code == 200


def test_analytics_hr(tokens):
    r = requests.get(f"{BASE_URL}/api/analytics/hr", headers=tokens["priya"]["headers"], timeout=15)
    assert r.status_code == 200


def test_analytics_hr_blocked_for_employee(tokens):
    r = requests.get(f"{BASE_URL}/api/analytics/hr", headers=tokens["sarah"]["headers"], timeout=15)
    assert r.status_code in (401, 403)


# ---------- Team ----------
def test_team_manager(tokens):
    r = requests.get(f"{BASE_URL}/api/team", headers=tokens["michael"]["headers"], timeout=15)
    assert r.status_code == 200


# ---------- Copilot (Claude) ----------
def test_copilot_chat(tokens):
    r = requests.post(
        f"{BASE_URL}/api/copilot/chat",
        headers=tokens["sarah"]["headers"],
        json={"message": "How many leave days do I have left?"},
        timeout=60,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    # Accept various reply field names
    reply = data.get("reply") or data.get("message") or data.get("response") or data.get("answer")
    assert reply and isinstance(reply, str) and len(reply) > 10, f"copilot reply too short: {data}"
