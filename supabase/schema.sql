-- ============================================================================
-- EduSphere — School Management System · Schema (Level 1)
-- ----------------------------------------------------------------------------
-- Run in: Supabase Dashboard → SQL Editor → paste & Run
-- Idempotent: safe to run multiple times.
--
-- Level 1 adds:
--   • auth → profiles (role-based accounts for every user)
--   • get_user_role() — SECURITY DEFINER helper used by all RLS policies
--   • handle_new_user() — auto-creates a profile when an auth user is created
--   • Row Level Security on profiles + students
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────
-- 0. Roles
--    developer · school_admin · staff · student · parent
-- ────────────────────────────────────────────────────────────────────────
create type if not exists public.app_role as enum (
  'developer', 'school_admin', 'staff', 'student', 'parent'
);

-- ────────────────────────────────────────────────────────────────────────
-- 1. Profiles (one row per auth user)
-- ────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  full_name  text not null default '',
  role       public.app_role not null default 'student',
  avatar_url text,
  status     text not null default 'active'
             check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- ────────────────────────────────────────────────────────────────────────
-- 2. shared updated_at trigger helper
-- ────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────────
-- 3. get_user_role() — SECURITY DEFINER (Postgres 15+)
--    Runs as the function owner, so it may call profiles without recursion.
--    Used inside RLS policies of every table.
-- ────────────────────────────────────────────────────────────────────────
create or replace function public.get_user_role()
returns public.app_role
language sql
stable
security definer
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Convenience predicates used by policies
create or replace function public.is_school_staff()
returns boolean
language sql
stable
security definer
as $$
  select public.get_user_role() in ('school_admin', 'staff', 'developer')
$$;

-- ────────────────────────────────────────────────────────────────────────
-- 4. Auto-create profile on auth sign-up
--    full_name / role come from the raw user metadata sent at sign-up.
-- ────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, full_name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'role'), 'student')::public.app_role,
    'active'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ────────────────────────────────────────────────────────────────────────
-- 5. profiles RLS
--    • insert: users create exactly their own row (auth.uid() = id)
--    • select: your own row, or school_admin/developer may list everyone
--    • update: your own row (name/avatar); role changes stay server-side
-- ────────────────────────────────────────────────────────────────────────
drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles select own or admin" on public.profiles;
create policy "profiles select own or admin"
  on public.profiles
  for select
  to authenticated
  using (
    auth.uid() = id
    or public.get_user_role() in ('school_admin', 'developer')
  );

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own"
  on public.profiles
  for update
  to authenticated
  with check (auth.uid() = id);

-- ────────────────────────────────────────────────────────────────────────
-- 6. Students (admission applications — carried over from v1)
-- ────────────────────────────────────────────────────────────────────────
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
  constraint students_email_unique unique (email)
);

create index if not exists students_created_at_idx
  on public.students (created_at desc);

drop trigger if exists students_set_updated_at on public.students;
create trigger students_set_updated_at
  before update on public.students
  for each row
  execute function public.set_updated_at();

alter table public.students enable row level security;

-- Anyone (public anon key) may submit an admission application
drop policy if exists "anon can insert applications" on public.students;
drop policy if exists "anon may insert applications" on public.students;
create policy "anon may insert applications"
  on public.students
  for insert
  to anon, authenticated
  with check (true);

-- Authenticated users may view applications (Level 1 scope; roles come in L2)
drop policy if exists "authenticated can read applications" on public.students;
create policy "authenticated can read applications"
  on public.students
  for select
  to authenticated
  using (true);

-- Staff / admin / developer decide applications
drop policy if exists "staff can update application status" on public.students;
create policy "staff can update application status"
  on public.students
  for update
  to authenticated
  using (public.is_school_staff());