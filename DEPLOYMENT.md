# Karigar — Deployment & Setup Guide

A mentor–student platform. **Frontend**: Vite + React + TypeScript (shadcn/ui).
**Backend**: Express + TypeScript + MongoDB (Mongoose), JWT auth, bcrypt, Nodemailer.

The frontend and backend are deployed as **two separate Vercel projects** from this one repo.

```
karigar-mentor-path-main/        ← frontend (Vite)   → Vercel project #1
├── src/                         ← React app (pages, lib/api.ts, lib/services.ts, contexts)
├── vercel.json                  ← SPA rewrites
└── backend/                     ← backend (Express)  → Vercel project #2
    ├── api/index.ts             ← Vercel serverless entry (exports the Express app)
    ├── vercel.json              ← routes everything to api/index.ts
    └── src/                     ← models, controllers, routes, middlewares, utils
```

---

## 1. Local development

```sh
# from the project root (this folder)
npm install
cd backend && npm install && cd ..

# configure env (see sections below), then run both together:
npm run dev:all          # frontend on :8080, backend on :5000
```

- Frontend env: copy `.env.example` → `.env` (defaults to `VITE_API_URL=http://localhost:5000/api`).
- Backend env: copy `backend/.env.example` → `backend/.env` and fill in values.

### Seed the database (admin + initial mentors)

```sh
cd backend
npm run seed
```

Creates:
- **Admin** — `admin@karigar.com` / `Admin@12345` (change after first login)
- **13 approved mentors** — login password `Mentor@12345`

(Override seed creds via `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_MENTOR_PASSWORD`.)

---

## 2. Account & approval flow

- **Students** register via `/signup` and are **active immediately** (no approval) —
  they're logged straight in. They choose a **preferred mentor type**
  (academic/industry/both) and **preferred fields**; the mentor browser is
  filtered to those by default.
- **Mentors** register via `/signup` but are created **`pending`** — they **cannot
  log in** until an admin approves them (mentor quality is vetted to protect the
  platform's reputation). The admin is emailed on each new application.
- The admin approves/rejects mentors from **Admin Dashboard → Approvals tab**.
  On approval the mentor is activated and emailed.
- **Admin** signs in at the dedicated **`/admin-login`** route (separate from the
  student/mentor login at `/login`).

### Booking / payment / session lifecycle
1. Student books → `PENDING_PAYMENT`.
2. Student pays → `PENDING_ADMIN_CONFIRMATION` (admin emailed to verify payment).
3. Admin confirms payment → `PENDING_MENTOR_APPROVAL` (mentor emailed).
4. Mentor accepts → `APPROVED` (meeting link generated) — or declines with a
   **mandatory reason** (emailed to student) → `REJECTED`.
5. Mentor may **reschedule** an approved session with a **mandatory reason** +
   new date/time → `RESCHEDULE_REQUESTED`; the student is emailed and can
   **accept** (session moves to the new time) or **decline** (keeps original).
6. Admin can edit any mentor/student's details from the dashboard.

---

## 3. Activate email sending (Gmail)

Emails are wired through Nodemailer and will send automatically once SMTP is set.
Until then they are skipped and logged to the console.

1. Use a Gmail account as the sender.
2. Enable **2-Step Verification** on that Google account.
3. Create an **App Password**: Google Account → Security → App passwords.
4. In `backend/.env` (and Vercel env vars) set:
   ```
   SMTP_USER=your-sender@gmail.com
   SMTP_PASS=the-16-char-app-password   # no spaces
   ADMIN_EMAIL=karigarcareers@gmail.com  # receives account + payment notifications
   ```

---

## 3b. Enable Google Sign-In (optional)

1. Google Cloud Console → create project → **OAuth consent screen** (External) → add yourself as a test user.
2. **Credentials → Create OAuth client ID → Web application**.
   - Authorized JavaScript origins: `http://localhost:8080` and your deployed frontend URL.
3. Copy the **Client ID** and set it in **both** places (same value):
   - `backend/.env` → `GOOGLE_CLIENT_ID=...`
   - frontend `.env` → `VITE_GOOGLE_CLIENT_ID=...`
4. Restart both apps. The "Continue with Google" button appears automatically once the
   client ID is set (it's hidden otherwise). Google sign-in creates/logs in **student**
   accounts; mentors must still apply via the form for admin vetting.

## 4. Deploy the BACKEND to Vercel

1. New Vercel project → import this repo → set **Root Directory = `backend`**.
2. Framework preset: **Other** (the included `backend/vercel.json` handles routing).
3. Add Environment Variables (from `backend/.env.example`):
   - `MONGODB_URI`
   - `JWT_SECRET`, `JWT_EXPIRES_IN`
   - `CLIENT_URL` = your frontend URL (comma-separate multiple, e.g.
     `https://karigar.vercel.app,http://localhost:8080`)
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`
   - `ADMIN_EMAIL=karigarcareers@gmail.com`
4. Deploy. Your API base will be `https://<backend>.vercel.app/api`.
   - In MongoDB Atlas → Network Access, allow Vercel (add `0.0.0.0/0` or Vercel IPs).

## 5. Deploy the FRONTEND to Vercel

1. New Vercel project → import this repo → **Root Directory = `karigar-mentor-path-main`**
   (this folder — the one containing `vite.config.ts`).
2. Framework preset: **Vite** (build `npm run build`, output `dist`).
3. Add Environment Variable:
   - `VITE_API_URL = https://<backend>.vercel.app/api`
4. Deploy. The included `vercel.json` rewrites all routes to `index.html` (SPA).

> After the frontend URL is known, set it as `CLIENT_URL` on the backend project
> (for CORS) and redeploy the backend.

---

## 6. Security notes

- Passwords are hashed with **bcrypt (12 rounds)** and never returned in API responses.
- Auth uses **JWT** (Bearer token) stored in `localStorage`; `GET /api/auth/me`
  rehydrates the session and validates the token on load.
- Change `JWT_SECRET` and the seeded admin password before going live.
