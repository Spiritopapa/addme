-- ============================================================================
-- Student Admission App — Supabase Schema
-- ----------------------------------------------------------------------------
-- How to run:
--   Option A (recommended): Supabase Dashboard → SQL Editor → paste & Run
--   Option B (CLI):          supabase db push   (after `supabase init`)
-- ----------------------------------------------------------------------------
-- ⚠️ The RLS policies below allow anyone (with the public anon key) to submit
--    and VIEW applications. That is intentional for this simple demo portal.
--    For production, remove "anon can read applications" and require auth.
-- ============================================================================

-- Optional: drop and start fresh (uncomment when you want a clean slate)
-- drop table if exists public.students cascade;

-- ----------------------------------------------------------------------------
-- 1. Students table
-- ----------------------------------------------------------------------------
create table if not exists public.students (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,
  email         text not null,
  phone         text,
  date_of_birth date,
  gender        text check (gender in ('female', 'male', 'other')),
  address       text,
  program       text not null,
  previous_gpa  numeric(3, 2) check (previous_gpa between 0.00 and 4.00),
  status        text not null default 'pending'
                check (status in ('pending', 'approved', 'rejected')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- A student should not be able to apply twice with the same email
  constraint students_email_unique unique (email)
);

-- Helpful index for the list view (sorted by newest first)
create index if not exists students_created_at_idx
  on public.students (created_at desc);

-- ----------------------------------------------------------------------------
-- 2. Trigger: keep "updated_at" fresh on every row change
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists students_set_updated_at on public.students;

create trigger students_set_updated_at
  before update on public.students
  for each row
  execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. Row Level Security
-- ----------------------------------------------------------------------------
alter table public.students enable row level security;

-- Anyone with the anon key may submit an admission application
create policy "anon can insert applications"
  on public.students
  for insert
  to anon, authenticated
  with check (true);

-- (DEMO ONLY) Anyone with the anon key may read submitted applications.
-- For production: delete this policy, or scope to authenticated users.
create policy "anon can read applications"
  on public.students
  for select
  to anon, authenticated
  using (true);

-- Authenticated users (dashboard/back-office) may update the admission status
create policy "authenticated can update application status"
  on public.students
  for update
  to authenticated
  with check (true);