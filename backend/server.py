"""WorkFlow HRMS - FastAPI Backend
Single-file backend implementing all 15 HRMS modules with JWT auth, MongoDB persistence,
and Claude Sonnet AI HR Copilot.
"""
from dotenv import load_dotenv
load_dotenv()

import os
import uuid
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Any, Dict
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60 * 24 * 7  # 1 week for demo convenience
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

mongo_client: Optional[AsyncIOMotorClient] = None
db = None

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def gen_id() -> str:
    return str(uuid.uuid4())

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def serialize(doc: Optional[Dict]) -> Optional[Dict]:
    if doc is None:
        return None
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc

# ---------------------------------------------------------------------------
# Auth dependency
# ---------------------------------------------------------------------------
async def get_current_user(request: Request) -> Dict:
    token = None
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return serialize(user)

def require_roles(*roles):
    async def _dep(user: Dict = Depends(get_current_user)) -> Dict:
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return _dep

# ---------------------------------------------------------------------------
# Lifespan / startup
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    global mongo_client, db
    mongo_client = AsyncIOMotorClient(MONGO_URL)
    db = mongo_client[DB_NAME]
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await seed_data()
    yield
    mongo_client.close()

app = FastAPI(title="WorkFlow HRMS API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Seed data
# ---------------------------------------------------------------------------
DEMO_USERS = [
    {"email": "admin@workflow.com",   "password": "admin123",    "name": "Admin User",     "role": "admin",    "designation": "System Administrator", "department": "IT", "country": "US"},
    {"email": "sarah@workflow.com",   "password": "sarah123",    "name": "Sarah Mitchell", "role": "employee", "designation": "Software Engineer",     "department": "Engineering", "country": "US"},
    {"email": "michael@workflow.com", "password": "michael123",  "name": "Michael Chen",   "role": "manager",  "designation": "Engineering Manager",   "department": "Engineering", "country": "US"},
    {"email": "priya@workflow.com",   "password": "priya123",    "name": "Priya Sharma",   "role": "hr",       "designation": "HR Business Partner",   "department": "People",      "country": "IN"},
    {"email": "alex@workflow.com",    "password": "alex123",     "name": "Alex Rivera",    "role": "employee", "designation": "Junior Developer",      "department": "Engineering", "country": "US", "is_onboarding": True},
]

async def seed_data():
    # Users
    for u in DEMO_USERS:
        existing = await db.users.find_one({"email": u["email"]})
        if existing is None:
            doc = {
                "id": gen_id(),
                "email": u["email"],
                "password_hash": hash_password(u["password"]),
                "name": u["name"],
                "role": u["role"],
                "designation": u["designation"],
                "department": u["department"],
                "country": u.get("country", "US"),
                "is_onboarding": u.get("is_onboarding", False),
                "manager_id": None,
                "joining_date": "2024-01-15" if not u.get("is_onboarding") else "2026-02-01",
                "avatar_color": "#14b8a6",
                "created_at": now_iso(),
            }
            await db.users.insert_one(doc)
        else:
            # ensure password matches env-changed admin
            if u["email"] == os.environ.get("ADMIN_EMAIL") and not verify_password(u["password"], existing.get("password_hash", "")):
                await db.users.update_one({"email": u["email"]}, {"$set": {"password_hash": hash_password(u["password"])}})

    # Link sarah/alex to michael
    michael = await db.users.find_one({"email": "michael@workflow.com"})
    if michael:
        await db.users.update_many({"email": {"$in": ["sarah@workflow.com", "alex@workflow.com"]}}, {"$set": {"manager_id": michael["id"]}})

    # Seed module collections (idempotent: check count first)
    sarah = await db.users.find_one({"email": "sarah@workflow.com"})
    alex = await db.users.find_one({"email": "alex@workflow.com"})

    # Leave balances
    if await db.leave_balances.count_documents({}) == 0 and sarah:
        for u in await db.users.find({"role": {"$in": ["employee", "manager", "hr"]}}).to_list(100):
            for ltype, total in [("casual", 12), ("sick", 10), ("personal", 5), ("comp-off", 3)]:
                await db.leave_balances.insert_one({
                    "id": gen_id(), "user_id": u["id"], "type": ltype,
                    "total": total, "used": 0, "pending": 0, "available": total,
                    "carried_forward": 0, "encashed": 0, "year": 2026,
                })

    # Sample leave requests
    if await db.leave_requests.count_documents({}) == 0 and sarah:
        await db.leave_requests.insert_one({
            "id": gen_id(), "user_id": sarah["id"], "user_name": sarah["name"],
            "type": "casual", "start_date": "2026-01-20", "end_date": "2026-01-21",
            "total_days": 2, "reason": "Family event", "status": "pending",
            "approval_level": "manager", "approver_id": michael["id"] if michael else None,
            "approver_comments": "", "created_at": now_iso(),
        })

    # Attendance sample
    if await db.attendance.count_documents({}) == 0 and sarah:
        await db.attendance.insert_one({
            "id": gen_id(), "user_id": sarah["id"],
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "clock_in": None, "clock_out": None, "status": "absent",
            "method": None, "location_verified": False, "ip_validated": False,
            "total_hours": 0, "productive_hours": 0, "break_hours": 0, "overtime_hours": 0,
        })

    # Payroll sample
    if await db.payroll.count_documents({}) == 0 and sarah:
        for u in [sarah, michael]:
            if not u:
                continue
            await db.payroll.insert_one({
                "id": gen_id(), "user_id": u["id"], "user_name": u["name"],
                "country": u.get("country", "US"), "currency": "USD" if u.get("country") == "US" else "INR",
                "pay_period": "January 2026", "pay_date": "2026-01-31",
                "earnings": {"basic": 5000, "hra": 1500, "special_allowance": 800, "bonus": 0, "overtime": 0, "reimbursements": 200},
                "deductions": {"income_tax": 850, "professional_tax": 50, "pf": 500, "esi": 80, "health_insurance": 120, "lwf": 0},
                "employer_contributions": {"pf": 500, "esi": 200, "gratuity": 100},
                "gross": 7500, "total_deductions": 1600, "net": 5900,
                "status": "paid",
            })

    # Documents
    if await db.documents.count_documents({}) == 0 and sarah:
        for d in [
            {"category": "identity", "name": "Passport", "status": "verified", "expiry": "2030-05-12"},
            {"category": "employment", "name": "Offer Letter", "status": "verified"},
            {"category": "work-auth", "name": "H1-B Visa", "status": "uploaded", "expiry": "2027-03-01"},
            {"category": "tax", "name": "W-2 Form 2025", "status": "verified"},
            {"category": "education", "name": "Degree Certificate", "status": "missing"},
        ]:
            await db.documents.insert_one({"id": gen_id(), "user_id": sarah["id"], "uploaded_at": now_iso(), **d})

    # Expenses
    if await db.expenses.count_documents({}) == 0 and sarah:
        await db.expenses.insert_one({
            "id": gen_id(), "user_id": sarah["id"], "user_name": sarah["name"],
            "category": "travel", "amount": 245.50, "currency": "USD",
            "description": "Client meeting - San Francisco", "date": "2026-01-15",
            "receipts": ["receipt-1.pdf"], "mileage": {"distance_km": 0, "from": "", "to": "", "vehicle": "", "rate": 0},
            "policy_validation": {"within_limit": True, "receipt_required": True, "message": "Within policy"},
            "taxable": False, "status": "pending-approval", "submitted_at": now_iso(),
            "approver_id": michael["id"] if michael else None, "approver_comments": "",
        })

    # Goals
    if await db.goals.count_documents({}) == 0 and sarah:
        await db.goals.insert_one({
            "id": gen_id(), "user_id": sarah["id"], "title": "Ship Q1 Auth Refactor",
            "description": "Migrate legacy auth to JWT", "category": "individual", "type": "quarterly",
            "weight": 40, "due_date": "2026-03-31", "status": "in-progress", "progress": 65,
            "key_results": [
                {"title": "Backend JWT endpoints", "target": 5, "current": 4, "completed": False},
                {"title": "Frontend integration", "target": 3, "current": 2, "completed": False},
            ],
            "created_at": now_iso(),
        })

    # Performance reviews
    if await db.reviews.count_documents({}) == 0 and sarah:
        await db.reviews.insert_one({
            "id": gen_id(), "user_id": sarah["id"], "user_name": sarah["name"],
            "period": "Q4 2025", "type": "quarterly",
            "overall_rating": 4.3,
            "category_ratings": {"technical": 4.5, "communication": 4.0, "leadership": 4.2, "collaboration": 4.5},
            "strengths": ["Strong technical depth", "Excellent code reviews", "Mentors juniors"],
            "improvements": ["Public speaking", "Cross-team alignment"],
            "recommendations": "Promote to Senior Engineer in next cycle",
            "goals_achieved": 3, "goals_total": 4,
            "employee_comments": "",
            "reviewer_id": michael["id"] if michael else None,
            "created_at": now_iso(),
        })

    # Contributions
    if await db.contributions.count_documents({}) == 0 and sarah:
        await db.contributions.insert_one({
            "id": gen_id(), "user_id": sarah["id"], "user_name": sarah["name"],
            "title": "Auto-deploy pipeline", "description": "Set up GitHub Actions CI/CD",
            "type": "self-initiated", "category": "process-improvement",
            "points": 150, "suggested_points": 100, "impact": "high",
            "status": "completed", "evidence": [], "tags": ["devops", "automation"],
            "approver_id": michael["id"] if michael else None, "approval_status": "approved",
            "approval_date": now_iso(), "approval_comments": "Saved 4 hours/week per dev",
            "created_at": now_iso(),
        })
    if await db.contribution_items.count_documents({}) == 0:
        for item in [
            {"title": "Wiki page for onboarding", "category": "knowledge-sharing", "suggested_points": 50, "status": "available"},
            {"title": "Bug bash session lead", "category": "quality", "suggested_points": 80, "status": "available"},
            {"title": "Mentor a junior engineer", "category": "team-building", "suggested_points": 120, "status": "available"},
        ]:
            await db.contribution_items.insert_one({"id": gen_id(), "created_at": now_iso(), **item})

    # Training modules
    if await db.training_modules.count_documents({}) == 0:
        for m in [
            {"title": "Security & Compliance 2026", "category": "compliance", "duration_min": 45, "due_date": "2026-02-28", "mandatory": True, "certificate": True,
             "content": [{"type": "video", "title": "Intro", "duration_min": 15, "completed": False},
                         {"type": "quiz", "title": "Knowledge check", "duration_min": 10, "completed": False}]},
            {"title": "TypeScript Deep Dive", "category": "technical", "duration_min": 180, "due_date": "2026-03-31", "mandatory": False, "certificate": True,
             "content": [{"type": "video", "title": "Advanced types", "duration_min": 60, "completed": False}]},
            {"title": "Effective Communication", "category": "soft-skills", "duration_min": 90, "due_date": "2026-04-15", "mandatory": False, "certificate": False,
             "content": [{"type": "document", "title": "Reading", "duration_min": 30, "completed": False}]},
        ]:
            await db.training_modules.insert_one({"id": gen_id(), "created_at": now_iso(), **m})

    # Job postings + candidates
    if await db.jobs.count_documents({}) == 0:
        for j in [
            {"title": "Senior Backend Engineer", "department": "Engineering", "location": "Remote (US)", "employment_type": "Full-time",
             "experience": "5+ years", "salary_min": 130000, "salary_max": 180000, "currency": "USD", "status": "open",
             "requirements": ["Python", "PostgreSQL", "AWS"], "responsibilities": ["Design APIs", "Mentor engineers"],
             "applicants": 24, "shortlisted": 6, "interviewing": 3},
            {"title": "Product Designer", "department": "Product", "location": "Bangalore, IN", "employment_type": "Full-time",
             "experience": "3+ years", "salary_min": 1800000, "salary_max": 2800000, "currency": "INR", "status": "open",
             "requirements": ["Figma", "Design Systems"], "responsibilities": ["Own product flows"],
             "applicants": 41, "shortlisted": 8, "interviewing": 4},
        ]:
            await db.jobs.insert_one({"id": gen_id(), "created_at": now_iso(), **j})

    if await db.candidates.count_documents({}) == 0:
        jobs = await db.jobs.find().to_list(10)
        if jobs:
            for c in [
                {"name": "Jordan Lee", "applied_role": jobs[0]["title"], "job_id": jobs[0]["id"], "status": "interview-scheduled",
                 "rating": 4.2, "skills": ["Python", "FastAPI"], "experience_years": 6, "expected_salary": 165000,
                 "currency": "USD", "notice_period_days": 45, "notes": "Strong systems background"},
                {"name": "Aisha Patel", "applied_role": jobs[1]["title"], "job_id": jobs[1]["id"], "status": "shortlisted",
                 "rating": 4.5, "skills": ["Figma", "User Research"], "experience_years": 4, "expected_salary": 2400000,
                 "currency": "INR", "notice_period_days": 60, "notes": "Excellent portfolio"},
                {"name": "Tom Becker", "applied_role": jobs[0]["title"], "job_id": jobs[0]["id"], "status": "new",
                 "rating": 3.8, "skills": ["Go", "Kubernetes"], "experience_years": 5, "expected_salary": 150000,
                 "currency": "USD", "notice_period_days": 30, "notes": ""},
            ]:
                await db.candidates.insert_one({"id": gen_id(), "applied_at": now_iso(), **c})

    # Recognition
    if await db.recognition.count_documents({}) == 0 and sarah and michael:
        await db.recognition.insert_one({
            "id": gen_id(), "sender_id": michael["id"], "sender_name": michael["name"],
            "recipient_id": sarah["id"], "recipient_name": sarah["name"],
            "category": "excellence", "message": "Outstanding work on the auth refactor — saved the team a week.",
            "visibility": "public", "likes": 12, "comments_count": 3, "created_at": now_iso(),
        })

    # Announcements
    if await db.announcements.count_documents({}) == 0:
        priya = await db.users.find_one({"email": "priya@workflow.com"})
        for a in [
            {"title": "New Health Insurance Provider — Effective March 1",
             "content": "We are switching to BlueShield. Please review the new plan documents and complete the enrollment by Feb 20.",
             "category": "hr-update", "priority": "high", "visibility": "global", "target": [],
             "views": 124, "likes": 18, "acknowledgments": 87, "comments_count": 6, "expiry": "2026-03-15"},
            {"title": "Quarterly All-Hands — Friday 3pm",
             "content": "Join us for the Q1 all-hands. CEO will share roadmap. Coffee & cookies in the lounge.",
             "category": "event", "priority": "medium", "visibility": "global", "target": [],
             "views": 87, "likes": 22, "acknowledgments": 0, "comments_count": 11, "expiry": "2026-01-31"},
        ]:
            await db.announcements.insert_one({
                "id": gen_id(), "author_id": priya["id"] if priya else None,
                "author_name": priya["name"] if priya else "HR Team",
                "created_at": now_iso(), **a
            })

    # Onboarding tasks for Alex
    if await db.onboarding_tasks.count_documents({}) == 0 and alex:
        for t in [
            {"phase": "pre-joining", "title": "Submit tax forms (W-4)", "description": "Complete and submit W-4", "priority": "high", "due_date": "2026-01-28", "assignee": "employee", "status": "pending"},
            {"phase": "pre-joining", "title": "Provide bank details", "description": "Direct deposit setup", "priority": "high", "due_date": "2026-01-28", "assignee": "employee", "status": "pending"},
            {"phase": "pre-joining", "title": "Sign offer letter", "description": "Digital signature", "priority": "high", "due_date": "2026-01-25", "assignee": "employee", "status": "completed", "completed_at": now_iso()},
            {"phase": "day-1", "title": "Office tour & ID card", "description": "Meet IT and Facilities", "priority": "medium", "due_date": "2026-02-01", "assignee": "hr", "status": "pending"},
            {"phase": "week-1", "title": "Complete security training", "description": "Mandatory module", "priority": "high", "due_date": "2026-02-08", "assignee": "employee", "status": "pending"},
            {"phase": "month-1", "title": "First 1:1 with manager", "description": "Manager check-in", "priority": "medium", "due_date": "2026-02-15", "assignee": "manager", "status": "pending"},
        ]:
            await db.onboarding_tasks.insert_one({"id": gen_id(), "user_id": alex["id"], **t})

    if await db.welcome_messages.count_documents({}) == 0 and alex:
        for m in [
            {"sender_name": "Lara Wells", "sender_role": "CEO", "message": "Welcome to WorkFlow, Alex! We're thrilled to have you.", "has_video": True},
            {"sender_name": "Michael Chen", "sender_role": "Manager", "message": "Looking forward to building great things together!", "has_video": False},
            {"sender_name": "Sarah Mitchell", "sender_role": "Buddy", "message": "I'll be your onboarding buddy — text me anytime.", "has_video": False},
        ]:
            await db.welcome_messages.insert_one({"id": gen_id(), "user_id": alex["id"], "created_at": now_iso(), **m})

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class LoginIn(BaseModel):
    email: EmailStr
    password: str

class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "employee"

# ---------------------------------------------------------------------------
# Routes — Auth
# ---------------------------------------------------------------------------
@app.get("/api/health")
async def health():
    return {"status": "ok", "time": now_iso()}

@app.post("/api/auth/login")
async def login(body: LoginIn):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user["id"], user["email"], user["role"])
    return {"accessToken": token, "user": serialize(dict(user))}

@app.post("/api/auth/register")
async def register(body: RegisterIn):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already exists")
    doc = {
        "id": gen_id(), "email": email, "name": body.name, "role": body.role,
        "password_hash": hash_password(body.password),
        "designation": "Employee", "department": "General", "country": "US",
        "is_onboarding": False, "manager_id": None,
        "joining_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "avatar_color": "#14b8a6", "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    token = create_token(doc["id"], doc["email"], doc["role"])
    return {"accessToken": token, "user": serialize(dict(doc))}

@app.get("/api/auth/me")
async def me(user: Dict = Depends(get_current_user)):
    return user

@app.post("/api/auth/logout")
async def logout():
    return {"ok": True}

@app.get("/api/auth/demo-users")
async def demo_users():
    return [{"email": u["email"], "password": u["password"], "name": u["name"], "role": u["role"]} for u in DEMO_USERS]

# ---------------------------------------------------------------------------
# Routes — Users / Team
# ---------------------------------------------------------------------------
@app.get("/api/users")
async def list_users(user: Dict = Depends(get_current_user)):
    docs = await db.users.find().to_list(500)
    return [serialize(d) for d in docs]

@app.get("/api/team")
async def my_team(user: Dict = Depends(get_current_user)):
    if user["role"] == "manager":
        docs = await db.users.find({"manager_id": user["id"]}).to_list(200)
    elif user["role"] in ("hr", "admin"):
        docs = await db.users.find().to_list(500)
    else:
        docs = []
    return [serialize(d) for d in docs]

# ---------------------------------------------------------------------------
# Routes — Attendance
# ---------------------------------------------------------------------------
class ClockInBody(BaseModel):
    method: str = "selfie"

@app.get("/api/attendance/today")
async def attendance_today(user: Dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    doc = await db.attendance.find_one({"user_id": user["id"], "date": today})
    return serialize(doc) if doc else None

@app.get("/api/attendance/history")
async def attendance_history(user: Dict = Depends(get_current_user)):
    docs = await db.attendance.find({"user_id": user["id"]}).sort("date", -1).to_list(60)
    return [serialize(d) for d in docs]

@app.post("/api/attendance/clock-in")
async def clock_in(body: ClockInBody, user: Dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    existing = await db.attendance.find_one({"user_id": user["id"], "date": today})
    now = now_iso()
    payload = {
        "clock_in": now, "method": body.method, "status": "present",
        "location_verified": True, "ip_validated": True,
    }
    if existing:
        await db.attendance.update_one({"id": existing["id"]}, {"$set": payload})
        existing.update(payload)
        return serialize(existing)
    new_doc = {
        "id": gen_id(), "user_id": user["id"], "date": today,
        "clock_in": now, "clock_out": None, "method": body.method,
        "status": "present", "location_verified": True, "ip_validated": True,
        "total_hours": 0, "productive_hours": 0, "break_hours": 0, "overtime_hours": 0,
    }
    await db.attendance.insert_one(new_doc)
    return serialize(new_doc)

@app.post("/api/attendance/clock-out")
async def clock_out(user: Dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    doc = await db.attendance.find_one({"user_id": user["id"], "date": today})
    if not doc or not doc.get("clock_in"):
        raise HTTPException(status_code=400, detail="Not clocked in")
    now = datetime.now(timezone.utc)
    clock_in_dt = datetime.fromisoformat(doc["clock_in"])
    delta_hours = (now - clock_in_dt).total_seconds() / 3600
    total = round(delta_hours, 2)
    overtime = max(0, total - 8)
    productive = max(0, total - 0.5)
    update = {
        "clock_out": now_iso(), "total_hours": total,
        "productive_hours": round(productive, 2), "break_hours": 0.5,
        "overtime_hours": round(overtime, 2),
    }
    await db.attendance.update_one({"id": doc["id"]}, {"$set": update})
    doc.update(update)
    return serialize(doc)

@app.get("/api/attendance/team")
async def team_attendance(user: Dict = Depends(require_roles("manager", "hr", "admin"))):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    docs = await db.attendance.find({"date": today}).to_list(500)
    users = {u["id"]: u for u in await db.users.find().to_list(500)}
    out = []
    for d in docs:
        d = serialize(d)
        u = users.get(d["user_id"])
        d["user_name"] = u["name"] if u else "Unknown"
        d["department"] = u["department"] if u else ""
        out.append(d)
    return out

# ---------------------------------------------------------------------------
# Routes — Leave
# ---------------------------------------------------------------------------
class LeaveIn(BaseModel):
    type: str
    start_date: str
    end_date: str
    reason: str

@app.get("/api/leave/balances")
async def leave_balances(user: Dict = Depends(get_current_user)):
    docs = await db.leave_balances.find({"user_id": user["id"]}).to_list(20)
    return [serialize(d) for d in docs]

@app.get("/api/leave/requests")
async def my_leave_requests(user: Dict = Depends(get_current_user)):
    docs = await db.leave_requests.find({"user_id": user["id"]}).sort("created_at", -1).to_list(50)
    return [serialize(d) for d in docs]

@app.post("/api/leave/requests")
async def submit_leave(body: LeaveIn, user: Dict = Depends(get_current_user)):
    s = datetime.fromisoformat(body.start_date)
    e = datetime.fromisoformat(body.end_date)
    days = max(1, (e - s).days + 1)
    doc = {
        "id": gen_id(), "user_id": user["id"], "user_name": user["name"],
        "type": body.type, "start_date": body.start_date, "end_date": body.end_date,
        "total_days": days, "reason": body.reason, "status": "pending",
        "approval_level": "manager", "approver_id": user.get("manager_id"),
        "approver_comments": "", "created_at": now_iso(),
    }
    await db.leave_requests.insert_one(doc)
    bal = await db.leave_balances.find_one({"user_id": user["id"], "type": body.type})
    if bal:
        await db.leave_balances.update_one(
            {"id": bal["id"]},
            {"$set": {"pending": bal["pending"] + days, "available": bal["available"] - days}},
        )
    return serialize(doc)

@app.get("/api/leave/approvals")
async def leave_approvals(user: Dict = Depends(require_roles("manager", "hr", "admin"))):
    if user["role"] == "manager":
        team_ids = [u["id"] for u in await db.users.find({"manager_id": user["id"]}).to_list(200)]
        docs = await db.leave_requests.find({"user_id": {"$in": team_ids}, "status": "pending"}).to_list(100)
    else:
        docs = await db.leave_requests.find({"status": "pending"}).to_list(200)
    return [serialize(d) for d in docs]

class ApprovalAction(BaseModel):
    action: str  # approve | reject
    comments: str = ""

@app.post("/api/leave/requests/{req_id}/action")
async def action_leave(req_id: str, body: ApprovalAction, user: Dict = Depends(require_roles("manager", "hr", "admin"))):
    req = await db.leave_requests.find_one({"id": req_id})
    if not req:
        raise HTTPException(status_code=404, detail="Not found")
    status_val = "approved" if body.action == "approve" else "rejected"
    await db.leave_requests.update_one(
        {"id": req_id},
        {"$set": {"status": status_val, "approver_comments": body.comments, "approver_id": user["id"]}},
    )
    bal = await db.leave_balances.find_one({"user_id": req["user_id"], "type": req["type"]})
    if bal:
        if status_val == "approved":
            await db.leave_balances.update_one(
                {"id": bal["id"]},
                {"$set": {"pending": max(0, bal["pending"] - req["total_days"]),
                          "used": bal["used"] + req["total_days"]}},
            )
        else:
            await db.leave_balances.update_one(
                {"id": bal["id"]},
                {"$set": {"pending": max(0, bal["pending"] - req["total_days"]),
                          "available": bal["available"] + req["total_days"]}},
            )
    return {"ok": True}

# ---------------------------------------------------------------------------
# Routes — Payroll
# ---------------------------------------------------------------------------
@app.get("/api/payroll/payslips")
async def my_payslips(user: Dict = Depends(get_current_user)):
    docs = await db.payroll.find({"user_id": user["id"]}).sort("pay_date", -1).to_list(24)
    return [serialize(d) for d in docs]

@app.get("/api/payroll/compliance")
async def payroll_compliance(user: Dict = Depends(require_roles("hr", "admin"))):
    return {
        "items": [
            {"name": "PF Filing - January", "country": "IN", "status": "completed", "due_date": "2026-02-15"},
            {"name": "ESI Filing - January", "country": "IN", "status": "pending", "due_date": "2026-02-15"},
            {"name": "Form 941 - Q4", "country": "US", "status": "completed", "due_date": "2026-01-31"},
            {"name": "W-2 Distribution", "country": "US", "status": "in-progress", "due_date": "2026-01-31"},
        ]
    }

# ---------------------------------------------------------------------------
# Routes — Documents
# ---------------------------------------------------------------------------
class DocumentIn(BaseModel):
    category: str
    name: str
    expiry: Optional[str] = None

@app.get("/api/documents")
async def my_documents(user: Dict = Depends(get_current_user)):
    docs = await db.documents.find({"user_id": user["id"]}).to_list(50)
    return [serialize(d) for d in docs]

@app.post("/api/documents")
async def upload_document(body: DocumentIn, user: Dict = Depends(get_current_user)):
    doc = {
        "id": gen_id(), "user_id": user["id"],
        "category": body.category, "name": body.name, "expiry": body.expiry,
        "status": "uploaded", "uploaded_at": now_iso(),
    }
    await db.documents.insert_one(doc)
    return serialize(doc)

class DocStatusIn(BaseModel):
    action: str  # verify | reject
    reason: str = ""

@app.post("/api/documents/{doc_id}/status")
async def document_status(doc_id: str, body: DocStatusIn, user: Dict = Depends(require_roles("hr", "admin"))):
    new_status = "verified" if body.action == "verify" else "rejected"
    update: Dict[str, Any] = {"status": new_status}
    if new_status == "verified":
        update["verified_at"] = now_iso()
    else:
        update["rejection_reason"] = body.reason
    await db.documents.update_one({"id": doc_id}, {"$set": update})
    return {"ok": True}

# ---------------------------------------------------------------------------
# Routes — Expenses
# ---------------------------------------------------------------------------
class ExpenseIn(BaseModel):
    category: str
    amount: float
    currency: str = "USD"
    description: str
    date: str
    taxable: bool = False

@app.get("/api/expenses")
async def my_expenses(user: Dict = Depends(get_current_user)):
    docs = await db.expenses.find({"user_id": user["id"]}).sort("submitted_at", -1).to_list(100)
    return [serialize(d) for d in docs]

@app.post("/api/expenses")
async def submit_expense(body: ExpenseIn, user: Dict = Depends(get_current_user)):
    within = body.amount <= 1000
    doc = {
        "id": gen_id(), "user_id": user["id"], "user_name": user["name"],
        "category": body.category, "amount": body.amount, "currency": body.currency,
        "description": body.description, "date": body.date, "receipts": [],
        "mileage": {"distance_km": 0, "from": "", "to": "", "vehicle": "", "rate": 0},
        "policy_validation": {"within_limit": within, "receipt_required": body.amount > 50,
                              "message": "Within policy" if within else "Exceeds $1000 limit — requires HR approval"},
        "taxable": body.taxable, "status": "pending-approval", "submitted_at": now_iso(),
        "approver_id": user.get("manager_id"), "approver_comments": "",
    }
    await db.expenses.insert_one(doc)
    return serialize(doc)

@app.get("/api/expenses/approvals")
async def expense_approvals(user: Dict = Depends(require_roles("manager", "hr", "admin"))):
    if user["role"] == "manager":
        team_ids = [u["id"] for u in await db.users.find({"manager_id": user["id"]}).to_list(200)]
        docs = await db.expenses.find({"user_id": {"$in": team_ids}, "status": "pending-approval"}).to_list(100)
    else:
        docs = await db.expenses.find({"status": "pending-approval"}).to_list(200)
    return [serialize(d) for d in docs]

@app.post("/api/expenses/{exp_id}/action")
async def action_expense(exp_id: str, body: ApprovalAction, user: Dict = Depends(require_roles("manager", "hr", "admin"))):
    status_val = "approved" if body.action == "approve" else "rejected"
    await db.expenses.update_one({"id": exp_id}, {"$set": {"status": status_val, "approver_comments": body.comments, "approver_id": user["id"]}})
    return {"ok": True}

# ---------------------------------------------------------------------------
# Routes — Performance / Goals
# ---------------------------------------------------------------------------
class GoalIn(BaseModel):
    title: str
    description: str
    category: str = "individual"
    type: str = "quarterly"
    weight: int = 25
    due_date: str

@app.get("/api/goals")
async def my_goals(user: Dict = Depends(get_current_user)):
    docs = await db.goals.find({"user_id": user["id"]}).to_list(50)
    return [serialize(d) for d in docs]

@app.post("/api/goals")
async def create_goal(body: GoalIn, user: Dict = Depends(get_current_user)):
    doc = {
        "id": gen_id(), "user_id": user["id"],
        "title": body.title, "description": body.description,
        "category": body.category, "type": body.type,
        "weight": body.weight, "due_date": body.due_date,
        "status": "not-started", "progress": 0,
        "key_results": [], "created_at": now_iso(),
    }
    await db.goals.insert_one(doc)
    return serialize(doc)

class GoalProgressIn(BaseModel):
    progress: int
    status: Optional[str] = None

@app.patch("/api/goals/{goal_id}")
async def update_goal(goal_id: str, body: GoalProgressIn, user: Dict = Depends(get_current_user)):
    update: Dict[str, Any] = {"progress": max(0, min(100, body.progress))}
    if body.status:
        update["status"] = body.status
    elif body.progress >= 100:
        update["status"] = "completed"
    elif body.progress > 0:
        update["status"] = "in-progress"
    await db.goals.update_one({"id": goal_id, "user_id": user["id"]}, {"$set": update})
    return {"ok": True}

@app.get("/api/reviews")
async def my_reviews(user: Dict = Depends(get_current_user)):
    docs = await db.reviews.find({"user_id": user["id"]}).sort("created_at", -1).to_list(20)
    return [serialize(d) for d in docs]

# ---------------------------------------------------------------------------
# Routes — Contributions
# ---------------------------------------------------------------------------
class ContributionIn(BaseModel):
    title: str
    description: str
    category: str = "innovation"
    type: str = "self-initiated"
    suggested_points: int = 50
    impact: str = "medium"
    tags: List[str] = []

@app.get("/api/contributions")
async def list_contributions(user: Dict = Depends(get_current_user)):
    docs = await db.contributions.find().sort("created_at", -1).to_list(100)
    return [serialize(d) for d in docs]

@app.post("/api/contributions")
async def create_contribution(body: ContributionIn, user: Dict = Depends(get_current_user)):
    doc = {
        "id": gen_id(), "user_id": user["id"], "user_name": user["name"],
        "title": body.title, "description": body.description,
        "type": body.type, "category": body.category,
        "points": 0, "suggested_points": body.suggested_points,
        "impact": body.impact, "status": "proposal-pending",
        "evidence": [], "tags": body.tags,
        "approver_id": user.get("manager_id"), "approval_status": "pending",
        "approval_date": None, "approval_comments": "",
        "created_at": now_iso(),
    }
    await db.contributions.insert_one(doc)
    return serialize(doc)

class ContributionAction(BaseModel):
    action: str  # approve | reject
    final_points: Optional[int] = None
    comments: str = ""

@app.post("/api/contributions/{cid}/action")
async def action_contribution(cid: str, body: ContributionAction, user: Dict = Depends(require_roles("manager", "hr", "admin"))):
    if body.action == "approve":
        await db.contributions.update_one({"id": cid}, {"$set": {
            "status": "approved-to-start", "approval_status": "approved",
            "points": body.final_points or 0,
            "approval_date": now_iso(), "approval_comments": body.comments, "approver_id": user["id"],
        }})
    else:
        await db.contributions.update_one({"id": cid}, {"$set": {
            "status": "rejected", "approval_status": "rejected",
            "approval_date": now_iso(), "approval_comments": body.comments, "approver_id": user["id"],
        }})
    return {"ok": True}

@app.get("/api/contributions/items")
async def contribution_items(user: Dict = Depends(get_current_user)):
    docs = await db.contribution_items.find({"status": "available"}).to_list(100)
    return [serialize(d) for d in docs]

@app.post("/api/contributions/items/{iid}/claim")
async def claim_item(iid: str, user: Dict = Depends(get_current_user)):
    item = await db.contribution_items.find_one({"id": iid})
    if not item or item.get("status") != "available":
        raise HTTPException(status_code=400, detail="Item not available")
    await db.contribution_items.update_one({"id": iid}, {"$set": {"status": "claimed", "claimed_by": user["id"], "claimed_at": now_iso()}})
    # auto-create contribution
    doc = {
        "id": gen_id(), "user_id": user["id"], "user_name": user["name"],
        "title": item["title"], "description": f"Claimed contribution: {item['title']}",
        "type": "committed", "category": item.get("category", "other"),
        "points": 0, "suggested_points": item["suggested_points"],
        "impact": "medium", "status": "in-progress", "evidence": [], "tags": [],
        "approver_id": user.get("manager_id"), "approval_status": "pending",
        "approval_date": None, "approval_comments": "", "created_at": now_iso(),
    }
    await db.contributions.insert_one(doc)
    return serialize(doc)

@app.get("/api/contributions/leaderboard")
async def contribution_leaderboard(user: Dict = Depends(get_current_user)):
    pipeline = [
        {"$match": {"approval_status": "approved"}},
        {"$group": {"_id": "$user_id", "name": {"$first": "$user_name"}, "total_points": {"$sum": "$points"}, "count": {"$sum": 1}}},
        {"$sort": {"total_points": -1}},
        {"$limit": 20},
    ]
    rows = await db.contributions.aggregate(pipeline).to_list(20)
    out = []
    for i, r in enumerate(rows):
        out.append({
            "rank": i + 1, "user_id": r["_id"], "name": r.get("name", "—"),
            "total_points": r["total_points"], "contributions": r["count"],
            "badges": ["Champion"] if i == 0 else ["Rising Star"] if i < 3 else [],
            "average_rating": round(4.5 - i * 0.1, 1),
        })
    return out

# ---------------------------------------------------------------------------
# Routes — Training
# ---------------------------------------------------------------------------
@app.get("/api/training")
async def list_training(user: Dict = Depends(get_current_user)):
    modules = await db.training_modules.find().to_list(100)
    progress_docs = await db.training_progress.find({"user_id": user["id"]}).to_list(200)
    progress = {p["module_id"]: p for p in progress_docs}
    out = []
    for m in modules:
        m = serialize(m)
        p = progress.get(m["id"])
        if p:
            m["progress"] = p["progress"]
            m["status"] = p["status"]
            m["content"] = p.get("content", m["content"])
        else:
            m["progress"] = 0
            m["status"] = "not-started"
        out.append(m)
    return out

class TrainingProgressIn(BaseModel):
    content_index: int

@app.post("/api/training/{mid}/complete-item")
async def complete_training_item(mid: str, body: TrainingProgressIn, user: Dict = Depends(get_current_user)):
    module = await db.training_modules.find_one({"id": mid})
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    prog = await db.training_progress.find_one({"user_id": user["id"], "module_id": mid})
    if not prog:
        content = [dict(c) for c in module["content"]]
        prog = {"id": gen_id(), "user_id": user["id"], "module_id": mid,
                "content": content, "progress": 0, "status": "in-progress"}
        await db.training_progress.insert_one(prog)
    content = prog["content"]
    if 0 <= body.content_index < len(content):
        content[body.content_index]["completed"] = True
    completed = sum(1 for c in content if c.get("completed"))
    progress_pct = int(completed / len(content) * 100) if content else 0
    new_status = "completed" if progress_pct == 100 else "in-progress"
    await db.training_progress.update_one(
        {"id": prog["id"]},
        {"$set": {"content": content, "progress": progress_pct, "status": new_status}},
    )
    return {"progress": progress_pct, "status": new_status}

# ---------------------------------------------------------------------------
# Routes — Recruitment
# ---------------------------------------------------------------------------
@app.get("/api/recruitment/jobs")
async def list_jobs(user: Dict = Depends(get_current_user)):
    docs = await db.jobs.find().to_list(100)
    return [serialize(d) for d in docs]

@app.get("/api/recruitment/candidates")
async def list_candidates(user: Dict = Depends(require_roles("hr", "admin"))):
    docs = await db.candidates.find().to_list(200)
    return [serialize(d) for d in docs]

class CandidateUpdate(BaseModel):
    status: str

@app.patch("/api/recruitment/candidates/{cid}")
async def update_candidate(cid: str, body: CandidateUpdate, user: Dict = Depends(require_roles("hr", "admin"))):
    await db.candidates.update_one({"id": cid}, {"$set": {"status": body.status}})
    return {"ok": True}

# ---------------------------------------------------------------------------
# Routes — Recognition
# ---------------------------------------------------------------------------
class RecognitionIn(BaseModel):
    recipient_id: str
    category: str
    message: str
    visibility: str = "public"

@app.get("/api/recognition")
async def list_recognition(user: Dict = Depends(get_current_user)):
    docs = await db.recognition.find({"visibility": "public"}).sort("created_at", -1).to_list(100)
    return [serialize(d) for d in docs]

@app.post("/api/recognition")
async def send_recognition(body: RecognitionIn, user: Dict = Depends(get_current_user)):
    rec_user = await db.users.find_one({"id": body.recipient_id})
    if not rec_user:
        raise HTTPException(status_code=404, detail="Recipient not found")
    doc = {
        "id": gen_id(),
        "sender_id": user["id"], "sender_name": user["name"],
        "recipient_id": body.recipient_id, "recipient_name": rec_user["name"],
        "category": body.category, "message": body.message,
        "visibility": body.visibility, "likes": 0, "comments_count": 0,
        "created_at": now_iso(),
    }
    await db.recognition.insert_one(doc)
    return serialize(doc)

@app.post("/api/recognition/{rid}/like")
async def like_recognition(rid: str, user: Dict = Depends(get_current_user)):
    await db.recognition.update_one({"id": rid}, {"$inc": {"likes": 1}})
    return {"ok": True}

# ---------------------------------------------------------------------------
# Routes — Announcements
# ---------------------------------------------------------------------------
class AnnouncementIn(BaseModel):
    title: str
    content: str
    category: str = "general"
    priority: str = "medium"
    visibility: str = "global"
    target: List[str] = []
    expiry: Optional[str] = None

@app.get("/api/announcements")
async def list_announcements(user: Dict = Depends(get_current_user)):
    docs = await db.announcements.find().sort("created_at", -1).to_list(100)
    return [serialize(d) for d in docs]

@app.post("/api/announcements")
async def create_announcement(body: AnnouncementIn, user: Dict = Depends(require_roles("hr", "admin"))):
    doc = {
        "id": gen_id(), "author_id": user["id"], "author_name": user["name"],
        "title": body.title, "content": body.content,
        "category": body.category, "priority": body.priority,
        "visibility": body.visibility, "target": body.target,
        "views": 0, "likes": 0, "acknowledgments": 0, "comments_count": 0,
        "expiry": body.expiry, "created_at": now_iso(),
    }
    await db.announcements.insert_one(doc)
    return serialize(doc)

@app.post("/api/announcements/{aid}/acknowledge")
async def ack_announcement(aid: str, user: Dict = Depends(get_current_user)):
    await db.announcements.update_one({"id": aid}, {"$inc": {"acknowledgments": 1}})
    return {"ok": True}

# ---------------------------------------------------------------------------
# Routes — Analytics
# ---------------------------------------------------------------------------
@app.get("/api/analytics/attendance")
async def analytics_attendance(user: Dict = Depends(get_current_user)):
    docs = await db.attendance.find({"user_id": user["id"]}).sort("date", -1).to_list(30)
    present = sum(1 for d in docs if d.get("status") == "present")
    late = sum(1 for d in docs if d.get("status") == "late")
    absent = sum(1 for d in docs if d.get("status") == "absent")
    total_hours = sum(d.get("total_hours", 0) for d in docs)
    return {
        "days_total": len(docs),
        "present": present, "late": late, "absent": absent,
        "total_hours": round(total_hours, 1),
        "avg_hours": round(total_hours / max(present, 1), 1),
    }

@app.get("/api/analytics/hr")
async def analytics_hr(user: Dict = Depends(require_roles("manager", "hr", "admin"))):
    total = await db.users.count_documents({})
    active_jobs = await db.jobs.count_documents({"status": "open"})
    pending_leave = await db.leave_requests.count_documents({"status": "pending"})
    pending_exp = await db.expenses.count_documents({"status": "pending-approval"})
    new_joiners = await db.users.count_documents({"is_onboarding": True})
    return {
        "headcount": total,
        "new_joiners": new_joiners,
        "open_positions": active_jobs,
        "pending_leave_approvals": pending_leave,
        "pending_expense_approvals": pending_exp,
        "by_department": [
            {"name": "Engineering", "count": await db.users.count_documents({"department": "Engineering"})},
            {"name": "People", "count": await db.users.count_documents({"department": "People"})},
            {"name": "IT", "count": await db.users.count_documents({"department": "IT"})},
        ],
        "attendance_today": {
            "present": await db.attendance.count_documents({"date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "status": "present"}),
            "absent": await db.attendance.count_documents({"date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "status": "absent"}),
        }
    }

# ---------------------------------------------------------------------------
# Routes — Onboarding
# ---------------------------------------------------------------------------
@app.get("/api/onboarding/dashboard")
async def onboarding_dashboard(user: Dict = Depends(get_current_user)):
    if not user.get("is_onboarding"):
        return {"is_onboarding": False}
    tasks = await db.onboarding_tasks.find({"user_id": user["id"]}).to_list(50)
    welcomes = await db.welcome_messages.find({"user_id": user["id"]}).to_list(20)
    tasks = [serialize(t) for t in tasks]
    welcomes = [serialize(w) for w in welcomes]
    total = len(tasks)
    completed = sum(1 for t in tasks if t["status"] == "completed")
    progress = int(completed / total * 100) if total else 0
    manager = await db.users.find_one({"id": user.get("manager_id")})
    buddy = await db.users.find_one({"email": "sarah@workflow.com"})
    return {
        "is_onboarding": True,
        "progress": progress,
        "tasks": tasks,
        "welcome_messages": welcomes,
        "manager_name": manager["name"] if manager else "—",
        "buddy_name": buddy["name"] if buddy else "—",
        "relocation": {
            "status": "in-progress", "visa_status": "approved",
            "accommodation": "Booked - Hyatt House",
            "travel": "Flight UA-845 on 2026-01-31",
            "allowance_usd": 3500, "local_buddy": buddy["name"] if buddy else "—",
            "tickets": [{"id": "RT-001", "title": "Apartment search", "status": "open"}]
        },
        "team_intros": [
            {"name": "Michael Chen", "role": "Engineering Manager", "bio": "10 years in distributed systems.", "expertise": ["Python", "K8s"], "fun_fact": "Marathon runner"},
            {"name": "Sarah Mitchell", "role": "Software Engineer", "bio": "Frontend & DX enthusiast.", "expertise": ["React", "TypeScript"], "fun_fact": "Bakes sourdough"},
        ],
        "milestones": [
            {"title": "Day 1 - Welcome", "date": "2026-02-01", "status": "upcoming"},
            {"title": "Week 1 Check-in", "date": "2026-02-08", "status": "upcoming"},
            {"title": "30-day Review", "date": "2026-03-03", "status": "upcoming"},
            {"title": "90-day Celebration", "date": "2026-05-01", "status": "upcoming"},
        ],
    }

@app.post("/api/onboarding/tasks/{tid}/complete")
async def complete_task(tid: str, user: Dict = Depends(get_current_user)):
    await db.onboarding_tasks.update_one({"id": tid, "user_id": user["id"]}, {"$set": {"status": "completed", "completed_at": now_iso()}})
    return {"ok": True}

@app.post("/api/onboarding/complete")
async def complete_onboarding(user: Dict = Depends(get_current_user)):
    await db.users.update_one({"id": user["id"]}, {"$set": {"is_onboarding": False}})
    return {"ok": True}

# ---------------------------------------------------------------------------
# Routes — HR Copilot (Claude Sonnet)
# ---------------------------------------------------------------------------
class CopilotIn(BaseModel):
    message: str
    session_id: Optional[str] = None
    context: Dict[str, Any] = {}

@app.post("/api/copilot/chat")
async def copilot_chat(body: CopilotIn, user: Dict = Depends(get_current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    session_id = body.session_id or f"copilot-{user['id']}"
    ctx = body.context or {}
    role = user.get("role", "employee")
    current_view = ctx.get("currentView", "home")
    is_onboarding = ctx.get("isOnboarding", user.get("is_onboarding", False))
    sys_prompt = f"""You are the WorkFlow HR Copilot, an embedded AI assistant inside a Global HRMS app.
You help employees, managers, HR, and admins with HR questions and guide them through tasks.

CURRENT USER CONTEXT:
- Name: {user.get('name')}
- Role: {role}
- Department: {user.get('department')}
- Country: {user.get('country')}
- Designation: {user.get('designation')}
- Currently viewing: {current_view}
- Onboarding mode: {is_onboarding}

GUIDELINES:
- Be concise (3-6 sentences for most answers).
- Tailor advice to the user's role and current view.
- For policy questions, reference common HRMS concepts (PF/ESI for India, 401k/health for US).
- If onboarding, gently guide through next steps (documents, training, team intros).
- Never fabricate company-specific policy details — say "check with HR" if uncertain.
- Use friendly, professional tone."""

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=sys_prompt,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    response = await chat.send_message(UserMessage(text=body.message))
    return {"reply": response, "session_id": session_id}
