# 🎓 Student Admission App

A simple student admission application built with:

| Layer      | Technology                                     |
| ---------- | ---------------------------------------------- |
| Frontend   | React 18 + Vite                                |
| Database   | Supabase (PostgreSQL + Row Level Security)     |
| Deployment | Vercel                                         |
| Versioning | GitHub                                         |

---

## ✨️ Features

- Admission form (full name, email, phone, date of birth, gender, program, GPA, address)
- Applications list with status badges (Pending / Approved / Rejected)
- Duplicate-email protection (DB unique constraint + friendly error message)
- Row Level Security policies in Supabase
- Responsive UI, no build-time secrets committed

---

## 🚀 Getting started

### 1. Prerequisites

- Node.js 18+ and npm
- A [Supabase](https://supabase.com) account (free tier is fine)
- A [GitHub](https://github.com) account
- A [Vercel](https://vercel.com) account

### 2. Create the database schema in Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com) → **New project**.
2. Open **SQL Editor** → **New query**.
3. Paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and press **Run**.
4. You should see `students` in **Table Editor** with RLS enabled.

### 3. Run the app locally

```bash
# Install dependencies
npm install

# Configure Supabase credentials
cp .env.example .env
# → Edit .env and paste your values from:
#   Supabase Dashboard → Project Settings → API
#   - VITE_SUPABASE_URL      (e.g. https://xxxx.supabase.co)
#   - VITE_SUPABASE_ANON_KEY (the public anon key)

# Start the dev server (http://localhost:3000)
npm run dev
```

> The anon key is safe to expose because Row Level Security is enabled.

### 4. Production build

```bash
npm run build     # outputs to dist/
npm run preview   # preview the production build locally
```

---

## 🌿 Supabase schema overview

The schema creates a single `students` table:

| Column         | Type         | Notes                       |
| -------------- | ------------ | --------------------------- |
| `id`           | uuid (pk)    | Auto-generated             |
| `full_name`    | text         | Required                   |
| `email`        | text         | Required, unique           |
| `phone`        | text         | Optional                   |
| `date_of_birth`| date         | Optional                   |
| `gender`       | text         | CHECK constraint           |
| `address`      | text         | Optional                   |
| `program`      | text         | Required                   |
| `previous_gpa` | numeric(3,2) | CHECK 0.00 – 4.00          |
| `status`       | text         | pending / approved / rejected |
| `created_at`   | timestamptz  | Auto                        |
| `updated_at`   | timestamptz  | Auto (trigger)              |

Row Level Security is **enabled**. Policies:

- ✅ **INSERT** — anon can submit applications
- ✅ **SELECT** — anon can view applications *(demo only — remove for production)*
- ✅ **UPDATE** — authenticated users can change status

---

## ▲ Deploy to Vercel

### Option A — via GitHub (recommended)

1. Create a repository on GitHub and push this project:

```bash
git init
git add .
git commit -m "Initial commit: student admission app"
git branch -M main
git remote add origin https://github.com/<your-username>/student-admission-app.git
git push -u origin main
```

2. Go to [Vercel Dashboard](https://vercel.com) → **Add New Project**.

3. Import your GitHub repository (Vercel auto-detects Vite).

4. Add the environment variables (**Settings → Environment Variables**):

   | Name                  | Value                        |
   | --------------------- | ---------------------------- |
   | `VITE_SUPABASE_URL`   | `https://xxxx.supabase.co`   |
   | `VITE_SUPABASE_ANON_KEY` | your anon key             |

5. Click **Deploy**. Done! 🎉

### Option B — Vercel CLI (no GitHub needed)

```bash
npm i -g vercel
vercel            # login + deploy (add the two VITE_ env vars when prompted)
vercel --prod     # promote to production
```

---

## 🗂 Project structure

```
student admission app/
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
├── .env.example
├── supabase/
│   └── schema.sql          # DB schema + RLS policies
└── src/
    ├── main.jsx            # entry point
    ├── App.jsx             # layout & state
    ├── index.css
    ├── lib/
    │   └── supabase.js     # Supabase client
    └── components/
        ├── AdmissionForm.jsx
        └── StudentList.jsx
```

---

## 🔒 Security notes

- Keys used in the browser must be **published keys** (`anon`), never `service_role`.
- The SELECT policy is wide open for demo simplicity. To lock it down:
  1. Delete the `anon can read applications` policy in Supabase.
  2. Create a `verified` application first (or swap to Supabase Auth), then scope policies to `authenticated`.

---

## 🛠 Useful commands

| Command            | What it does                 |
| ------------------ | ---------------------------- |
| `npm run dev`      | Start dev server on :3000    |
| `npm run build`    | Production build to `dist/`  |
| `npm run preview`  | Preview the production build |