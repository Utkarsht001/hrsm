# WorkFlow — Global HRMS

**Status:** MVP complete (all 15 modules functional)
**Last updated:** 2026-06-24
**Tech stack:** Next.js 16 + Tailwind 4 + Redux + Zustand frontend (port 3000) · FastAPI + Motor + MongoDB backend (port 8001) · Claude Sonnet 4.5 via `emergentintegrations` for HR Copilot

## Original problem statement
> Read the README.md (Global HRMS Product Specification v1.0) and implement it. Boilerplate repo: github.com/Utkarsht001/hrsm. Tech stack must be preserved (Next.js). Build all 15 modules, JWT email/password auth, Claude Sonnet for the HR Copilot.

## User personas (from spec)
- **Sarah (Employee)** — clock in/out, leave, payslips, expenses, goals, learning, recognition.
- **Michael (Manager)** — approve team leave/expenses, monitor attendance, manage performance.
- **HR Specialist (Priya)** — recruitment, onboarding, announcements, compliance, analytics.
- **Admin** — full system oversight + configuration.
- **Alex (New joiner)** — guided onboarding with phased tasks, welcome messages, relocation, team intros.

## Core requirements (static)
- Mobile-first, role-aware UI in a 480px max-width shell with bottom nav per role.
- 15 modules: Onboarding, Attendance, Leave, Payroll, Documents, Expenses, Performance, Contributions, Training, Recruitment, Recognition, Announcements, Team, Analytics, HR Copilot.
- RBAC across navigation, approvals, and module visibility.
- JWT auth with bcrypt password hashing.
- Multi-country payroll (US + India) with localized statutory components.

## Architecture
- **Frontend (Next.js 16 App Router):** `/app/(auth)/login`, `/app/<module>/page.tsx` per module, `/app/page.tsx` is the role-aware home (auto-switches to onboarding view if `user.is_onboarding`). Shared shell in `components/shell/AppShell.tsx` (top bar w/ role switcher + modules drawer, bottom nav, Copilot FAB). API client `lib/api.ts` with Bearer token from localStorage `wf_token`.
- **Backend (FastAPI):** Single `server.py` exposes `/api/*` REST. UUID-based document IDs. Idempotent seed on startup for 5 demo users + sample leave balances, payslip, documents, expense, goals, review, contributions, leaderboard, training modules, jobs, candidates, recognition, announcements, onboarding tasks.
- **AI:** `/api/copilot/chat` uses `LlmChat` with model `anthropic/claude-sonnet-4-5-20250929`. Context (currentView, userRole, isOnboarding) is injected via system prompt.

## What's been implemented (2026-06-24)
- All 15 modules with CRUD where applicable.
- JWT auth + role-based dependencies (`require_roles(...)`).
- Role switcher (demo) in avatar menu — hot-swap to any of 4 roles without re-typing creds.
- Onboarding flow with phased tasks, welcome messages, relocation, team intros, milestones, completion handoff.
- Approvals queues for managers (leave + expenses + contributions).
- HR Copilot with quick-suggestion chips, multi-turn conversation, role-aware system prompt.
- Modules drawer with quick navigation to all 14 secondary screens.
- Tested: 100% backend (29/29 pytest), ~95% frontend e2e via testing agent.

## Test credentials
See `/app/memory/test_credentials.md`.

## Backlog / next iterations
- **P0:** None outstanding — MVP fully functional.
- **P1:**
  - File-upload pipeline for real document/expense receipts (currently metadata-only).
  - Push/email notifications on approval events (`integration_playbook_expert_v2` → SendGrid or Twilio).
  - Real biometric/selfie capture for attendance clock-in.
  - Encash leave + carry-forward year-end automation.
  - PDF payslip & tax document generation (currently toast).
- **P2:**
  - Predictive analytics on attrition risk + workforce planning.
  - Calendar (Google/Outlook) integration for interviews + onboarding milestones.
  - Multi-country payroll expansion (UK/Singapore/Germany) with statutory deductions.
  - Recognition certificates with shareable image (Cloudinary).
  - Streaming copilot responses (server-sent events).

## Future / Enhancements
- **Conversion hook:** Make the Copilot a *taking-action* assistant (`"book me a leave next Friday"`) — convert it from Q&A to an agentic workflow using tool calls.
- **Engagement loop:** Add a weekly digest email summarizing the user's contributions points, kudos received, and learning progress — boosts retention on HR products.
