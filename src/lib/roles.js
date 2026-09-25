// ---------------------------------------------------------------------------
// Role metadata & helpers
// Every user belongs to exactly one role. RLS on the database is the source of
// truth; these helpers only drive the UI (nav, labels, colors, gating).
// ---------------------------------------------------------------------------

export const ROLE_DEVELOPER = 'developer';
export const ROLE_ADMIN = 'school_admin';
export const ROLE_STAFF = 'staff';
export const ROLE_STUDENT = 'student';
export const ROLE_PARENT = 'parent';

export const ALL_ROLES = [
  ROLE_DEVELOPER,
  ROLE_ADMIN,
  ROLE_STAFF,
  ROLE_STUDENT,
  ROLE_PARENT,
];

export const ROLES = {
  [ROLE_DEVELOPER]: {
    label: 'Developer',
    short: 'Dev',
    color: '#7c3aed',
    soft: 'rgba(124, 58, 237, 0.14)',
    blurb: 'System-wide access, user directory & platform health.',
  },
  [ROLE_ADMIN]: {
    label: 'School Admin',
    short: 'Admin',
    color: '#2563eb',
    soft: 'rgba(37, 99, 235, 0.14)',
    blurb: 'Run the school: students, staff, classes & applications.',
  },
  [ROLE_STAFF]: {
    label: 'Staff',
    short: 'Staff',
    color: '#0ea5e9',
    soft: 'rgba(14, 165, 233, 0.14)',
    blurb: 'Teach & manage: classes, grades and attendance.',
  },
  [ROLE_STUDENT]: {
    label: 'Student',
    short: 'Student',
    color: '#10b981',
    soft: 'rgba(16, 185, 129, 0.14)',
    blurb: 'Your learning hub: grades, attendance, timetable & fees.',
  },
  [ROLE_PARENT]: {
    label: 'Parent',
    short: 'Parent',
    color: '#f59e0b',
    soft: 'rgba(245, 158, 11, 0.14)',
    blurb: 'Follow your child’s progress at a glance.',
  },
};

export function roleInfo(role) {
  return ROLES[role] ?? {
    label: role ?? '—',
    short: role ?? '—',
    color: '#64748b',
    soft: 'rgba(100, 116, 139, 0.14)',
    blurb: '',
  };
}

export function hasRole(user, ...roles) {
  return !!user && roles.includes(user.role);
}

/** The higher the rank, the more system access the role has (for UI ordering). */
export const ROLE_RANK = {
  [ROLE_DEVELOPER]: 5,
  [ROLE_ADMIN]: 4,
  [ROLE_STAFF]: 3,
  [ROLE_PARENT]: 2,
  [ROLE_STUDENT]: 1,
};

export function canManageApplications(user) {
  return hasRole(user, ROLE_DEVELOPER, ROLE_ADMIN, ROLE_STAFF);
}

// ── Level 2 permissions ───────────────────────────────────────────────────

/** Write/deletes school records (classes, staff, students, links). */
export function canManage(user) {
  return hasRole(user, ROLE_DEVELOPER, ROLE_ADMIN);
}

/** May open the Students roster / Classes pages. */
export function canSeeStudents(user) {
  return hasRole(user, ROLE_DEVELOPER, ROLE_ADMIN, ROLE_STAFF);
}

/** May open the Staff directory page. */
export function canSeeStaff(user) {
  return canManage(user);
}

/** May open the Classes page. */
export function canSeeClasses(user) {
  return canSeeStudents(user);
}

// ── Level 3 permissions ───────────────────────────────────────────────────

/** May open the Grades / Attendance / Timetable pages. */
export function canSeeAcademics(user) {
  return hasRole(user, ROLE_DEVELOPER, ROLE_ADMIN, ROLE_STAFF);
}

/** May manage subjects. */
export function canSeeSubjects(user) {
  return canManage(user);
}

// ── Level 4 permissions ───────────────────────────────────────────────────

/** May open the Fees & payments page. */
export function canSeeFees(user) {
  return canManage(user);
}

/** May open the Announcements authoring page. */
export function canSeeAnnouncements(user) {
  return canSeeAcademics(user);
}

// ── Level 5 ───────────────────────────────────────────────────────────────

/** May open the Developer Portal hub. */
export function canSeeDeveloper(user) {
  return hasRole(user, ROLE_DEVELOPER);
}

/** May open the Users & codes management page. */
export function canSeeUsersAdmin(user) {
  return canManage(user);
}

/** Roles the current manager may assign (developer exempt — owner only). */
export function assignableRoles(user) {
  if (hasRole(user, ROLE_DEVELOPER)) {
    return [ROLE_ADMIN, ROLE_STAFF, ROLE_STUDENT, ROLE_PARENT];
  }
  if (hasRole(user, ROLE_ADMIN)) {
    return [ROLE_STAFF, ROLE_STUDENT, ROLE_PARENT];
  }
  return [];
}

/** Roles the current manager may create directly via provision_account.
 *  The developer creates school admins; school admins create the rest. */
export function provisionableRoles(user) {
  if (hasRole(user, ROLE_DEVELOPER)) {
    return [ROLE_ADMIN, ROLE_STAFF, ROLE_STUDENT, ROLE_PARENT];
  }
  if (hasRole(user, ROLE_ADMIN)) {
    return [ROLE_STAFF, ROLE_STUDENT, ROLE_PARENT];
  }
  return [];
}

/** Roles the current manager may issue one-time registration codes for.
 *  School admins are never code-created — only provisioned by the developer. */
export function codeRoles(user) {
  return provisionableRoles(user).filter((r) => r !== ROLE_ADMIN);
}