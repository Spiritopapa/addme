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

-- ════════════════════════════════════════════════════════════════════════
-- 7. LEVEL 2 — Classes, staff records, student records, guardian links
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.classes (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  code              text not null unique,
  description       text,
  class_teacher_id  uuid references public.profiles (id),
  class_teacher_name text,   -- denormalized so students/parents can read it under RLS
  academic_year     text not null default '2026/2027',
  capacity          integer not null default 30 check (capacity > 0 and capacity <= 200),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.staff_records (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid references public.profiles (id) unique,
  full_name   text not null,
  email       text,
  employee_no text not null unique,
  department  text not null default 'Teaching',
  position    text not null default 'Teacher',
  phone       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.student_records (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid references public.profiles (id),
  admission_no    text not null unique,
  full_name       text not null,
  email           text,
  class_id        uuid references public.classes (id),
  date_of_birth   date,
  gender          text check (gender in ('female', 'male', 'other')),
  guardian_name   text,
  guardian_phone  text,
  address         text,
  enrollment_date date not null default current_date,
  status          text not null default 'active'
                  check (status in ('active', 'graduated', 'withdrawn')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.guardian_links (
  id                    uuid primary key default gen_random_uuid(),
  guardian_profile_id   uuid not null references public.profiles (id) on delete cascade,
  student_record_id     uuid not null references public.student_records (id) on delete cascade,
  relation              text not null default 'Parent',
  created_at            timestamptz not null default now(),
  constraint guardian_links_pair_unique unique (guardian_profile_id, student_record_id)
);

-- updated_at triggers
drop trigger if exists classes_set_updated_at on public.classes;
create trigger classes_set_updated_at before update on public.classes
  for each row execute function public.set_updated_at();

drop trigger if exists staff_records_set_updated_at on public.staff_records;
create trigger staff_records_set_updated_at before update on public.staff_records
  for each row execute function public.set_updated_at();

drop trigger if exists student_records_set_updated_at on public.student_records;
create trigger student_records_set_updated_at before update on public.student_records
  for each row execute function public.set_updated_at();

-- helpful indexes
create index if not exists student_records_class_idx on public.student_records (class_id);
create index if not exists student_records_profile_idx on public.student_records (profile_id);
create index if not exists guardian_links_parent_idx on public.guardian_links (guardian_profile_id);
create index if not exists classes_teacher_idx on public.classes (class_teacher_id);

-- ── 8. admin_set_role — SECURITY DEFINER RPC ─────────────────────────────
--    Lets school admins & developers provision accounts (used by the UI).
--    Refuses to remove the last developer account.
create or replace function public.admin_set_role(p_user_id uuid, p_role public.app_role)
returns void
language plpgsql
security definer
as $$
begin
  if public.get_user_role() not in ('school_admin', 'developer') then
    raise exception 'Only school admins and developers can change roles';
  end if;

  if p_role <> 'developer'
     and (select role from public.profiles where id = p_user_id) = 'developer'
     and (select count(*) from public.profiles where role = 'developer') <= 1 then
    raise exception 'Cannot remove the last developer account';
  end if;

  update public.profiles set role = p_role, updated_at = now() where id = p_user_id;
end;
$$;

-- ── 9. classes RLS ────────────────────────────────────────────────────────
--    Any authenticated user may read class names; only admins/devs write.
alter table public.classes enable row level security;

drop policy if exists "classes read authenticated" on public.classes;
create policy "classes read authenticated"
  on public.classes for select to authenticated using (true);

drop policy if exists "classes write staff" on public.classes;
create policy "classes write staff"
  on public.classes
  for all
  to authenticated
  using (public.get_user_role() in ('school_admin', 'developer'));

-- ── 10. staff_records RLS ────────────────────────────────────────────────
--    Read: yourself, admins, developers, other staff (directory).
--    Write: admins & developers only.
alter table public.staff_records enable row level security;

drop policy if exists "staff_records read" on public.staff_records;
create policy "staff_records read"
  on public.staff_records
  for select
  to authenticated
  using (
    auth.uid() = profile_id
    or public.get_user_role() in ('school_admin', 'developer', 'staff')
  );

drop policy if exists "staff_records write" on public.staff_records;
create policy "staff_records write"
  on public.staff_records
  for all
  to authenticated
  using (public.get_user_role() in ('school_admin', 'developer'));

-- ── 11. student_records RLS ──────────────────────────────────────────────
--    Read:  admins/devs · staff (only their own classes) · the student ·
--           parents linked to that student.
--    Write: admins & developers only.
alter table public.student_records enable row level security;

drop policy if exists "student_records read" on public.student_records;
create policy "student_records read"
  on public.student_records
  for select
  to authenticated
  using (
    auth.uid() = profile_id
    or public.get_user_role() in ('school_admin', 'developer')
    or (
      public.get_user_role() = 'staff'
      and class_id in (
        select c.id from public.classes c where c.class_teacher_id = auth.uid()
      )
    )
    or id in (
      select gl.student_record_id
      from public.guardian_links gl
      where gl.guardian_profile_id = auth.uid()
    )
  );

drop policy if exists "student_records write" on public.student_records;
create policy "student_records write"
  on public.student_records
  for all
  to authenticated
  using (public.get_user_role() in ('school_admin', 'developer'));

-- ── 12. guardian_links RLS ───────────────────────────────────────────────
--    Read: the parent themselves, admins & developers.
--    Write: admins & developers only.
alter table public.guardian_links enable row level security;

drop policy if exists "guardian_links read" on public.guardian_links;
create policy "guardian_links read"
  on public.guardian_links
  for select
  to authenticated
  using (
    guardian_profile_id = auth.uid()
    or public.get_user_role() in ('school_admin', 'developer')
  );

drop policy if exists "guardian_links write" on public.guardian_links;
create policy "guardian_links write"
  on public.guardian_links
  for all
  to authenticated
  using (public.get_user_role() in ('school_admin', 'developer'));

-- ════════════════════════════════════════════════════════════════════════
-- 13. LEVEL 3 — Subjects, grades, attendance & timetable
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.subjects (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  code                text not null unique,
  class_id            uuid references public.classes (id) on delete set null,
  teacher_profile_id  uuid references public.profiles (id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.grades (
  id                uuid primary key default gen_random_uuid(),
  student_record_id uuid not null references public.student_records (id) on delete cascade,
  subject_id        uuid not null references public.subjects (id) on delete cascade,
  term              text not null,
  score             numeric(5, 2) check (score between 0 and 100),
  grade_letter      text check (grade_letter in ('A', 'B', 'C', 'D', 'F')),
  remarks           text,
  recorded_by       uuid references public.profiles (id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint grades_pair_unique unique (student_record_id, subject_id, term)
);

create table if not exists public.attendance (
  id                uuid primary key default gen_random_uuid(),
  student_record_id uuid not null references public.student_records (id) on delete cascade,
  date              date not null default current_date,
  status            text not null default 'present'
                    check (status in ('present', 'absent', 'late', 'excused')),
  marked_by         uuid references public.profiles (id),
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint attendance_day_unique unique (student_record_id, date)
);

create table if not exists public.timetable (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes (id) on delete cascade,
  day        text not null check (day in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')),
  period     integer not null check (period between 1 and 12),
  subject_id uuid references public.subjects (id) on delete set null,
  start_time time,
  end_time   time,
  created_at timestamptz not null default now(),
  constraint timetable_slot_unique unique (class_id, day, period)
);

-- updated_at triggers
drop trigger if exists subjects_set_updated_at on public.subjects;
create trigger subjects_set_updated_at before update on public.subjects
  for each row execute function public.set_updated_at();

drop trigger if exists grades_set_updated_at on public.grades;
create trigger grades_set_updated_at before update on public.grades
  for each row execute function public.set_updated_at();

drop trigger if exists attendance_set_updated_at on public.attendance;
create trigger attendance_set_updated_at before update on public.attendance
  for each row execute function public.set_updated_at();

-- indexes
create index if not exists subjects_class_idx on public.subjects (class_id);
create index if not exists grades_student_idx on public.grades (student_record_id);
create index if not exists grades_subject_idx on public.grades (subject_id);
create index if not exists attendance_student_day_idx on public.attendance (student_record_id, date);
create index if not exists timetable_class_idx on public.timetable (class_id);

-- ── 14. is_class_teacher_of() — helper for grades/attendance policies ─────
create or replace function public.is_class_teacher_of(p_student_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1
    from public.student_records sr
    join public.classes c on c.id = sr.class_id
    where sr.id = p_student_id
      and c.class_teacher_id = auth.uid()
  )
$$;

-- ── 15. subjects RLS ─────────────────────────────────────────────────────
--    Read: any authenticated user (names are part of the shared timetable).
--    Write: admins & developers.
alter table public.subjects enable row level security;

drop policy if exists "subjects read authenticated" on public.subjects;
create policy "subjects read authenticated"
  on public.subjects for select to authenticated using (true);

drop policy if exists "subjects write staff" on public.subjects;
create policy "subjects write staff"
  on public.subjects
  for all
  to authenticated
  using (public.get_user_role() in ('school_admin', 'developer'));

-- ── 16. grades RLS ───────────────────────────────────────────────────────
--    Read:  the student · their linked parents · their class teacher ·
--            admins & developers.
--    Write: admins & developers, and the staff member who teaches that class.
alter table public.grades enable row level security;

drop policy if exists "grades read scoped" on public.grades;
create policy "grades read scoped"
  on public.grades
  for select
  to authenticated
  using (
    public.get_user_role() in ('school_admin', 'developer')
    or (
      public.get_user_role() = 'staff'
      and public.is_class_teacher_of(student_record_id)
    )
    or student_record_id in (
      select sr.id from public.student_records sr where sr.profile_id = auth.uid()
    )
    or student_record_id in (
      select gl.student_record_id
      from public.guardian_links gl
      where gl.guardian_profile_id = auth.uid()
    )
  );

drop policy if exists "grades write staff" on public.grades;
create policy "grades write staff"
  on public.grades
  for all
  to authenticated
  using (
    public.get_user_role() in ('school_admin', 'developer')
    or (
      public.get_user_role() = 'staff'
      and public.is_class_teacher_of(student_record_id)
    )
  );

-- ── 17. attendance RLS ───────────────────────────────────────────────────
--    Same visibility & write rules as grades.
alter table public.attendance enable row level security;

drop policy if exists "attendance read scoped" on public.attendance;
create policy "attendance read scoped"
  on public.attendance
  for select
  to authenticated
  using (
    public.get_user_role() in ('school_admin', 'developer')
    or (
      public.get_user_role() = 'staff'
      and public.is_class_teacher_of(student_record_id)
    )
    or student_record_id in (
      select sr.id from public.student_records sr where sr.profile_id = auth.uid()
    )
    or student_record_id in (
      select gl.student_record_id
      from public.guardian_links gl
      where gl.guardian_profile_id = auth.uid()
    )
  );

drop policy if exists "attendance write staff" on public.attendance;
create policy "attendance write staff"
  on public.attendance
  for all
  to authenticated
  using (
    public.get_user_role() in ('school_admin', 'developer')
    or (
      public.get_user_role() = 'staff'
      and public.is_class_teacher_of(student_record_id)
    )
  );

-- ── 18. timetable RLS ────────────────────────────────────────────────────
--    Read: any authenticated user. Write: admins & developers.
alter table public.timetable enable row level security;

drop policy if exists "timetable read authenticated" on public.timetable;
create policy "timetable read authenticated"
  on public.timetable for select to authenticated using (true);

drop policy if exists "timetable write staff" on public.timetable;
create policy "timetable write staff"
  on public.timetable
  for all
  to authenticated
  using (public.get_user_role() in ('school_admin', 'developer'));