# WorkFlow — Global HRMS

**Status:** MVP complete on the boilerplate's intended .NET stack.
**Last updated:** 2026-06-24
**Tech stack (corrected to match the assignment boilerplate):**

- **Frontend:** Next.js 16 + Tailwind 4 + Redux Toolkit + Zustand (port 3000) — from `nextjs-boiler-plate-v16.0.3`
- **Backend:** **.NET 10 Web API** with EF Core 10 + Npgsql (port 8001) — clean architecture (`HRMS.API`, `HRMS.Application`, `HRMS.Domain`, `HRMS.Infrastructure`)
- **Database:** **PostgreSQL 15** (hrms db on localhost:5432, user/pwd: postgres/postgres)
- **AI Copilot:** Claude Sonnet 4.5 via direct HTTP from .NET `EmergentLlmClient` against `https://integrations.emergentagent.com/llm/chat/completions` (OpenAI Chat Completions-compatible, authenticated with the Emergent Universal Key).
- **Auth:** JWT signed with HS256, returned in JSON `accessToken` *and* an `HttpOnly; Secure; SameSite=Lax` `access_token` cookie. Server accepts either.

> Earlier iterations mistakenly used a Python FastAPI backend. That has been **completely removed** and replaced with the .NET implementation that the assignment's boilerplate intended.

## Original problem statement

> Read the README.md (Global HRMS Product Specification v1.0) and implement it. Boilerplate repo: github.com/Utkarsht001/hrsm. Tech stack must be preserved (Next.js + .NET). Build all 15 modules, JWT email/password auth, Claude Sonnet for the HR Copilot.

## User personas
- **Sarah (Employee)** — sarah@workflow.com / sarah123
- **Michael (Manager)** — michael@workflow.com / michael123
- **Priya (HR)** — priya@workflow.com / priya123
- **Admin** — admin@workflow.com / admin123
- **Alex (New joiner, is_onboarding=true)** — alex@workflow.com / alex123

## Solution layout (`/app`)

```
/app
├── frontend/                Next.js 16 app (unchanged from prior rounds)
├── dotnet/                  .NET 10 solution (the new backend)
│   ├── HRMS.sln
│   ├── HRMS.API/            controllers, Program.cs (DI + middleware)
│   ├── HRMS.Application/    DTOs (records) — sits between domain & API
│   ├── HRMS.Domain/         entities per module (Identity, Attendance,
│   │                         Leave, Payroll, Misc/* for the other modules)
│   └── HRMS.Infrastructure/ EF Core HrmsDbContext, JwtService, password hasher,
│                            EmergentLlmClient, DataSeeder
├── runtime/dotnet/          dotnet 10 SDK install (persisted in /app)
└── memory/                  PRD + test credentials (this folder)
```

## All 15 modules (every one has a working REST controller backed by EF Core)

| # | Module | Controller | Endpoints |
|---|--------|------------|-----------|
| 1 | Auth | `AuthController` | `/api/auth/login`, `/register`, `/me`, `/logout`, `/demo-users` |
| 2 | Users / Team | `UsersTeamController` | `/api/users`, `/api/team` |
| 3 | Attendance | `AttendanceController` | `/api/attendance/today,history,clock-in,clock-out,team` |
| 4 | Leave | `LeaveController` | `/api/leave/balances,requests,approvals,requests/{id}/action` |
| 5 | Payroll | `PayrollController` | `/api/payroll/payslips,compliance` |
| 6 | Documents | `DocumentsController` | `/api/documents`, `/documents/{id}/status` |
| 7 | Expenses | `ExpensesController` | `/api/expenses`, `/approvals`, `/{id}/action` |
| 8 | Performance | `PerformanceController` | `/api/goals`, `/api/reviews` |
| 9 | Contributions | `ContributionsController` | `/api/contributions`, `/items`, `/items/{id}/claim`, `/leaderboard` |
| 10 | Training | `TrainingController` | `/api/training`, `/{id}/complete-item` |
| 11 | Recruitment | `RecruitmentController` | `/api/recruitment/jobs,candidates` |
| 12 | Recognition | `RecognitionController` | `/api/recognition`, `/{id}/like` |
| 13 | Announcements | `AnnouncementsController` | `/api/announcements`, `/{id}/acknowledge` |
| 14 | Analytics | `AnalyticsController` | `/api/analytics/attendance,hr` |
| 15 | Onboarding | `OnboardingController` | `/api/onboarding/dashboard,tasks/{id}/complete,complete` |
| ★ | HR Copilot | `CopilotController` | `/api/copilot/chat` (Claude Sonnet 4.5 via EmergentLlmClient) |

## Running locally (for your assignment submission)

```bash
# 1. Postgres
createdb hrms
# 2. .NET API
cd /app/dotnet
dotnet run --project HRMS.API --urls=http://0.0.0.0:8001
# 3. Frontend
cd /app/frontend
yarn install
yarn dev
```

Set these env vars for the API:
- `POSTGRES_CONNECTION` (default `Host=localhost;Port=5432;Database=hrms;Username=postgres;Password=postgres`)
- `JWT_SECRET`
- `EMERGENT_LLM_KEY`

## Next Action Items
None outstanding for v1. Backlog:
- Per-module project split (currently Misc/Entities.cs holds 10 domains for speed)
- Switch to MediatR/CQRS handlers if desired
- File uploads (S3 / Azure Blob)
- Notification emails (SendGrid)
