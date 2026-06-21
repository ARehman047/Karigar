# Karigar — Mentor ↔ Student Mentorship Platform

Karigar is a full-stack mentorship marketplace that connects Pakistani students with
verified industry & academic mentors. Students browse mentors by speciality, book paid
1-on-1 sessions, pay via bank transfer, join a video call, and leave reviews. Mentors
manage their profile, get paid out, and earn badges. An admin oversees approvals,
payments, payouts, and the whole session lifecycle.

> Built with React + Vite (frontend) and Node/Express + MongoDB (backend), deployable
> to Vercel + MongoDB Atlas entirely on free tiers.

---

## Table of contents

- [Roles](#roles)
- [Features](#features)
- [Tech stack](#tech-stack)
- [External services & subscriptions](#external-services--subscriptions)
- [Repository structure](#repository-structure)
- [Environment variables](#environment-variables)
- [Local development](#local-development)
- [Database & seeding](#database--seeding)
- [Deployment (Vercel)](#deployment-vercel)
- [Scheduled jobs (cron) on serverless](#scheduled-jobs-cron-on-serverless)
- [NPM scripts reference](#npm-scripts-reference)
- [Security notes](#security-notes)

---

## Roles

| Role | Logs in at | Capabilities |
|---|---|---|
| **Student** | `/login` → Student | Browse/filter mentors, view profiles & reviews, book & pay for sessions, join calls, leave reviews, manage profile, self-delete account. |
| **Mentor** | `/login` → Mentor | Onboard with specialities + certificates + bank accounts, approve/decline bookings, run sessions, accept payouts, see reviews, earn badges, self-delete account. |
| **Admin** | `/admin-login` (separate) | Approve mentors, confirm student payments, send mentor payouts, manage badges, cancel/**delete** sessions, manage mentors/students, view stats. |

---

## Features

### Authentication & accounts
- Email + password signup with **email OTP verification** (sent via Gmail SMTP).
- **JWT auth**: 1-hour access token + 30-day refresh token with rotation and silent
  refresh on `401` (`bcryptjs`, 12 rounds).
- **Google Sign-In** (OAuth 2.0).
- Self-service account deletion (student & mentor).

### Mentors
- Rich profile: title, bio, qualifications, city, field, **specialities** (the packages
  they offer), certificate file uploads (base64 PDFs).
- **Bank accounts** for receiving payouts (stored privately).
- Admin **approval workflow** before a mentor goes live.
- **Badges**: Silver (30 completed sessions) & Gold (50) — auto-detected for admin
  approval, or applied for via a paid request.

### Students
- Browse & **filter mentors** by speciality / field / mentor type (academic / industry).
- Mentor cards show speciality, rating, and completed-session count.
- View full mentor profile + **student reviews**.

### Booking, sessions & video
- Book a session by choosing a **package** on a mentor's profile.
- Session lifecycle:
  `PENDING_PAYMENT → PENDING_ADMIN_CONFIRMATION → PENDING_MENTOR_PAYOUT → PENDING_MENTOR_APPROVAL → APPROVED → COMPLETED`
  (plus `REJECTED`, `CANCELLED`, `RESCHEDULE_REQUESTED`).
- **Video calls** via Jitsi (JaaS / 8x8, with public `meet.jit.si` fallback).
- **Google Calendar** integration: connect a calendar to auto-add session events.
- **Reminders** (1 day / 1 hour / 15 min before) + **auto-complete** of ended sessions
  via scheduled jobs.
- **Reviews & ratings**: students rate sessions; mentors can view their reviews; mentor
  rating + completed-session count are recomputed automatically.

### Payments & payouts (manual bank transfer model)
- Per-package **pricing config** is the single source of truth for what the **student
  pays** and what the **mentor is paid** (`src/lib/pricing.ts` + `backend/src/config/pricing.ts`).
- Student pays by bank transfer and **uploads a receipt**.
- Admin **confirms** the student payment, then **sends the mentor payout** (uploads a
  payout receipt); the mentor **accepts** it.
- Admin dashboard shows **Payments** and **Payouts** (with a completed-payouts history),
  each labelled by service/package.

### Admin dashboard
- Tabs: Approvals · Payments · Payouts · Badges · Sessions · Mentors · Students.
- Live stats (students, mentors, sessions).
- Cancel **or permanently delete** a session (deletes its payment + review and
  recomputes the mentor's stats).
- In-app **notifications** + email notifications throughout.

---

## Tech stack

**Frontend**
- Vite, React 18, TypeScript
- shadcn/ui (Radix UI primitives), Tailwind CSS, `lucide-react` icons
- React Router v6, TanStack Query (server state)
- `react-hook-form` + `zod` (forms/validation), `recharts`, `@react-oauth/google`

**Backend**
- Node.js, Express, TypeScript
- MongoDB via Mongoose 8 (connection cached for serverless)
- JWT (`jsonwebtoken`), `bcryptjs`
- `nodemailer` (Gmail SMTP), `node-cron` (local scheduler)
- `google-auth-library` (Google Sign-In + Calendar), `uuid`
- Security/ops: `helmet`, `cors`, `morgan`, `express-rate-limit`

---

## External services & subscriptions

All of these have free tiers sufficient to run Karigar end-to-end.

| Service | Used for | Plan | Notes |
|---|---|---|---|
| **MongoDB Atlas** | Primary database | Free **M0** cluster | Connection string → `MONGODB_URI`. |
| **Vercel** | Hosting (frontend + serverless backend) | Free **Hobby** | Two projects (one per app). |
| **Gmail SMTP (Nodemailer)** | OTP verification + all notification emails | Free | Requires a Gmail **App Password** (2FA on). |
| **Google Cloud — OAuth 2.0** | Google Sign-In **and** Google Calendar API | Free | One OAuth web client; `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`. |
| **Jitsi / 8x8 JaaS** | Video calls | Free tier (optional) | Optional — falls back to public `meet.jit.si` if unset. |
| **External cron (e.g. cron-job.org)** | Pinging the serverless cron endpoint | Free | Needed only on serverless — see [Scheduled jobs](#scheduled-jobs-cron-on-serverless). |

> Payments are handled as **manual bank transfers** (student uploads a receipt, admin
> verifies). There is **no third-party payment-gateway subscription** (no Stripe/PayPal).

---

## Repository structure

```
.
├── src/                      # Frontend (React + Vite)
│   ├── pages/                # Route pages (AdminDashboard, Sessions, etc.)
│   ├── components/           # UI + feature components (shadcn/ui in components/ui)
│   ├── lib/                  # services.ts (API client), pricing.ts, utils
│   └── ...
├── public/                   # Static assets
├── index.html                # Vite entry
├── vercel.json               # Frontend: SPA rewrites (all routes → index.html)
├── vite.config.ts
│
├── backend/                  # Backend (Express + TypeScript)
│   ├── src/
│   │   ├── app.ts            # Express app (CORS, routes, lazy cached DB connect)
│   │   ├── index.ts          # Local server entry (listen + node-cron)
│   │   ├── config/           # database.ts, pricing.ts
│   │   ├── models/           # Mongoose models (User, Mentor, Student, Session, …)
│   │   ├── controllers/      # Route handlers
│   │   ├── routes/           # Express routers (auth, sessions, payments, cron, …)
│   │   ├── middlewares/      # auth, error handler, rate limiter
│   │   ├── jobs/             # reminder.job.ts (reminders + auto-complete)
│   │   └── utils/            # email, seed scripts (seed, seedSessions, addStudents, …)
│   ├── api/index.ts          # Vercel serverless entry (exports the Express app)
│   ├── vercel.json           # Backend: route everything → api/index.ts
│   └── .env.example          # All backend env vars (documented)
│
├── .env.example              # Frontend env vars
└── DEPLOYMENT.md             # Extra deployment notes
```

---

## Environment variables

### Frontend (root `.env`)
| Variable | Example | Purpose |
|---|---|---|
| `VITE_API_URL` | `https://<backend>.vercel.app/api` | Base URL of the backend API. |
| `VITE_APP_NAME` | `Karigar` | App display name (optional). |
| `VITE_GOOGLE_CLIENT_ID` | `xxx.apps.googleusercontent.com` | Google Sign-In client ID (same value as backend). |

### Backend (`backend/.env`)
| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string. |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | JWT signing secrets. |
| `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | Token lifetimes (`1h`, `30d`). |
| `CLIENT_URL` | Comma-separated allowed CORS origins (local + Vercel frontend). |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | Gmail SMTP for OTP + notifications. |
| `ADMIN_EMAIL` | Inbox that receives admin notifications. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Sign-In + Calendar OAuth. |
| `SERVER_URL` | Public base URL of the backend (builds the Calendar redirect URI). |
| `PAYMENT_ACCOUNT_*`, `PAYMENT_NOTE` | Bank accounts shown to students on the payment page. |
| `JAAS_APP_ID`, `JAAS_API_KEY_ID`, `JAAS_PRIVATE_KEY` / `JAAS_PRIVATE_KEY_PATH` | Jitsi JaaS video (optional). |
| `CRON_SECRET` | Protects `GET /api/cron` (see below). |
| `SEED_ADMIN_*`, `SEED_MENTOR_PASSWORD`, `SEED_STUDENT_PASSWORD` | Seed-script credentials. |

> Full, commented templates live in [`.env.example`](.env.example) and
> [`backend/.env.example`](backend/.env.example). **Never commit real `.env` files** —
> they are git-ignored.

---

## Local development

**Prerequisites:** Node.js 18+ and npm; a MongoDB Atlas connection string.

```sh
# 1. Frontend deps (run in repo root)
npm install

# 2. Backend deps
cd backend && npm install && cd ..

# 3. Configure env
cp .env.example .env                 # set VITE_API_URL=http://localhost:5000/api
cp backend/.env.example backend/.env # set MONGODB_URI, JWT secrets, SMTP, etc.

# 4. Run both together (frontend :8080, backend :5000)
npm run dev:all
```

Or run them separately: `npm run dev` (frontend) and `npm run backend:dev` (backend).
Backend health check: `http://localhost:5000/api/health`.

---

## Database & seeding

The database is **MongoDB Atlas**. After setting `MONGODB_URI`, seed data from `/backend`:

| Command | What it does |
|---|---|
| `npm run seed` | Creates the admin, all mentors, and the base students (idempotent — upserts by email). |
| `npm run add:students` | Appends additional student accounts (idempotent). |
| `npm run seed:sessions` | **Wipes** sessions/payments/reviews and recreates a realistic completed-session history (with payments, payouts, reviews, recomputed mentor stats + badges). |
| `npm run add:sessions` | Appends extra completed sessions without wiping (deduped). |
| `npm run clear:sessions` | Removes all sessions/payments/reviews and resets mentor stats. |

> Test login credentials for seeded accounts are kept in `TEST_CREDENTIALS.md`
> (git-ignored — it holds plaintext passwords for testing only).

---

## Deployment (Vercel)

Karigar deploys as **two Vercel projects from the same repo**: the frontend (repo root)
and the backend (`/backend`), plus a MongoDB Atlas database. A complete, click-by-click
walkthrough is in [`DEPLOYMENT.md`](DEPLOYMENT.md); the essentials:

1. **MongoDB Atlas** — create a free M0 cluster, add a database user, set Network Access
   to `0.0.0.0/0`, copy the connection string.
2. **Backend project** on Vercel — import the repo with **Root Directory = `backend`**.
   The included [`backend/vercel.json`](backend/vercel.json) routes all requests to the
   serverless Express app (`api/index.ts`). Add every backend env var. Note the deployed
   URL, e.g. `https://karigar-api.vercel.app`.
3. **Frontend project** on Vercel — import the **same repo** with Root Directory = repo
   root (framework: Vite, build `npm run build`, output `dist`). Set
   `VITE_API_URL=https://karigar-api.vercel.app/api` and `VITE_GOOGLE_CLIENT_ID`.
   The root [`vercel.json`](vercel.json) adds SPA rewrites so client routes don't 404.
4. **Wire them together** — set the backend's `CLIENT_URL` to the frontend URL (CORS),
   set `SERVER_URL` to the backend URL, and add both as authorized origins/redirect URIs
   in the Google OAuth client.
5. **Seed** the production DB by running the seed scripts locally with the production
   `MONGODB_URI`.

> Architecture note: the backend connects to MongoDB **lazily and caches the connection**
> across invocations (`backend/src/config/database.ts`), which is what makes the Express
> app work as a Vercel serverless function.

---

## Scheduled jobs (cron) on serverless

Locally, `node-cron` runs reminders and auto-complete inside the long-running server.
**Serverless functions don't stay alive**, so on Vercel those jobs are exposed as an
HTTP endpoint instead:

- `GET /api/cron` runs all scheduled tasks once (auto-complete ended sessions + send the
  1-day / 1-hour / 15-min reminders).
- It's protected by `CRON_SECRET`. Call it as
  `GET /api/cron?key=<CRON_SECRET>` (or `x-cron-key` / `Authorization: Bearer` header).
- Point a free external scheduler (e.g. **cron-job.org**) at that URL every ~10 minutes.
  (Vercel Cron on the Hobby plan is limited to daily runs; an external pinger or the Pro
  plan is needed for fine-grained reminders. Alternatively, host the backend on a
  persistent platform like Render/Railway, where `node-cron` runs natively.)

---

## NPM scripts reference

**Root (frontend):**
- `npm run dev` — Vite dev server (`:8080`)
- `npm run build` — production build → `dist/`
- `npm run dev:all` — run frontend + backend together
- `npm run backend:dev` / `npm run backend:start` — proxy to backend scripts

**`/backend`:**
- `npm run dev` — Express with hot reload (`ts-node-dev`)
- `npm run build` / `npm start` — compile to `dist/` and run
- `npm run seed`, `add:students`, `seed:sessions`, `add:sessions`, `clear:sessions` — data scripts

---

## Security notes

- `.env`, `backend/.env`, `TEST_CREDENTIALS.md`, and `*.pem` keys are **git-ignored** and
  must never be committed.
- Passwords are hashed with bcrypt; JWTs are short-lived with rotating refresh tokens.
- CORS is restricted via `CLIENT_URL`; auth routes are rate-limited; `helmet` is enabled.
- The `/api/cron` endpoint must be protected with a strong `CRON_SECRET` in production.
