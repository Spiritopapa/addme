import { useEffect, useState } from 'react';
import { supabase, supabaseConfigured } from './supabase.js';

// ---------------------------------------------------------------------------
// Supabase Auth helpers
// ---------------------------------------------------------------------------

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) return { error };
  return { user: data.user, error: null };
}

export async function signUp({ email, password, fullName, regCode }) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        full_name: fullName.trim(),
        reg_code: (regCode ?? '').trim().toLowerCase(),
      },
    },
  });

  if (error) return { error };

  const user = data.user;
  if (!user) {
    return { error: { message: 'No user was returned. Please try again.' } };
  }

  // The profile row (with its role) is created by the on_auth_user_created
  // trigger, which validates the registration code server-side.
  return { user, error: null };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/** Fetch the caller's own profile row (RLS ensures only your own row). */
export async function fetchMyProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { profile: null, error: null };

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  return { profile: data, error };
}

export function userInitials(fullName) {
  if (!fullName) return '?';
  const parts = fullName.trim().split(/\s+/);
  const initials = parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
  return initials || '?';
}

export function firstName(fullName) {
  if (!fullName) return '';
  return fullName.trim().split(/\s+/)[0];
}

export function formatDate(value, options) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString(undefined, options ?? {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return value;
  }
}

// ---------------------------------------------------------------------------
// Session state hook (subscribe once, update on any auth change)
// ---------------------------------------------------------------------------
export function useSession() {
  const [session, setSession] = useState({ user: null, profile: null, loading: true, suspended: false });

  const refresh = async () => {
    if (!supabaseConfigured) {
      setSession({ user: null, profile: null, loading: false, suspended: false });
      return;
    }
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      const { profile } = await fetchMyProfile();
      const suspended = profile?.status === 'suspended';
      setSession({
        user: data.session.user,
        profile: profile ?? { id: data.session.user.id, email: data.session.user.email },
        loading: false,
        suspended,
      });
    } else {
      setSession({ user: null, profile: null, loading: false, suspended: false });
    }
  };

  useEffect(() => {
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      // SIGNED_IN / TOKEN_REFRESHED / SIGNED_OUT / USER_UPDATED
      void refresh();
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return session;
}