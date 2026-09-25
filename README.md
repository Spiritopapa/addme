# ✦️ EduSphere — School Management System

A comprehensive school management platform built **level by level**. Every role —
**developer, school admin, staff, student and parent** — gets its own portal,
locked down with Supabase **Row Level Security (RLS)**.

| Stack       | Technology                                    |
| ----------- | --------------------------------------------- |
| Frontend    | React 18 + Vite 5 + React Router 7            |
| Icons       | lucide-react                                  |
| Database    | Supabase (PostgreSQL + Auth + RLS)            |
| Deployment  | Vercel (auto-deploys from GitHub `main`)      |
| Versioning  | GitHub                                        |

---

## 🗺 Level roadmap

| Level | Delivered                                      | Status |
| ----- | ---------------------------------------------- | ------ |
| 1     | Modern UI, Auth, 5 role portals, RLS foundation | ✅ live |
| 2     | Students, staff & classes management            | ✅ live |
| 3     | Grades, attendance & timetable                  | ✅ live |
| 4     | Fees, payments & announcements                  | ✅ live |
| 5     | Developer portal, audit log & polish            | ✅ live |

---

## 🚀 Level 1 — what you can do today

- **Public landing page** with animated hero + responsive layout (mobile drawer nav).
- **Create an account** with a role: `developer`, `school_admin`, `staff`, `student`, `parent`.
- **Sign in / sign out** (Supabase Auth, email + password).
- **5 role portals**, each scoped by RLS:
  - *Developer* — user directory + platform overview.
  - *School admin / staff* — review & decide admission applications.
  - *Student* — track your own submissions.
  - *Parent* — family centre placeholder (children link in Level 2).
- **Public admission application** (kept from v1) at `/apply`.

---

## ⚙️ Setup

### 1. Database

Open **Supabase Dashboard → SQL Editor** and run
[`supabase/schema.sql`](supabase/schema.sql) — it is idempotent and can be
re-run safely.

This creates:

- `profiles` — one row per auth user (`role`, `full_name`, `status`, …)
- `students` — admission applications (from v1)
- `public.get_user_role()` — a `SECURITY DEFINER` helper (Postgres 15+)
  used by every RLS policy without recursion
- `public.handle_new_user()` — trigger that auto-creates a profile when an
  auth user signs up
- RLS policies:

| Table      | Policy                                                          |
| ---------- | --------------------------------------------------------------- |
| profiles   | own row (insert/select/update); admins/devs may list all         |
| students   | anon insert; any authenticated user may read; staff decide status |

### 2. App

```bash
npm install
cp .env.example .env      # fill VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev               # http://localhost:3000
```

> Tip: in Supabase → **Authentication → Providers → Email**, you can disable
> *Confirm email* to get instant sign-in during development.

---

## 🔐 Security model

- **RLS is the source of truth.** The UI hides nav items and buttons by role,
  but the database rejects anything a role isn't allowed to do.
- `get_user_role()` is defined `SECURITY DEFINER`, so policies that call it do
  not recurse.
- Roles are self-selected at sign-up **for the demo**; production deployment
  should provision accounts server-side (Level 5).

---

## ▲ Deploy (automatic)

This repository is connected to Vercel (`https://addme-gamma.vercel.app`).
Every push to `main` triggers a production deployment:

```bash
git add .
git commit -m "Level 1: auth + role portals + RLS"
git push origin main
```

---

## 🗂 Project structure

```
├── index.html                  # fonts, meta, SPA entry
├── vercel.json                 # static + SPA rewrite
├── supabase/schema.sql         # full schema + RLS (Level 1)
└── src/
    ├── App.jsx                 # routes + auth gate
    ├── lib/
    │   ├── supabase.js         # client
    │   ├── auth.js             # session + sign in/up helpers
    │   └── roles.js            # role metadata (UI)
    ├── layout/                 # AppShell, Sidebar, Topbar (responsive)
    ├── pages/                  # Landing, Auth, Apply, Settings
    ├── dashboards/             # Developer/Admin/Staff/Student/Parent + tools
    ├── components/             # shared UI kit
    └── index.css               # design system (animations + responsive)
```