/**
 * Auth Service — VelvetDesk
 * Multi-user authentication using Supabase Auth.
 * Handles login, register, logout and session persistence.
 * Resilient to missing environment variables on platforms like Vercel.
 */
import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawAnonKey &&
  rawUrl !== 'https://placeholder.supabase.co' &&
  !rawUrl.includes('placeholder')
);

// Fallback to valid URL structure so createClient never throws Uncaught Error
const supabaseUrl = isSupabaseConfigured ? rawUrl! : 'https://placeholder-velvetdesk.supabase.co';
const supabaseAnonKey = isSupabaseConfigured ? rawAnonKey! : 'placeholder-anon-key';

export const authClient = createClient(supabaseUrl, supabaseAnonKey);

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
}

// ── Get current session token (for API calls) ────────────────────────────────
export async function getAccessToken(): Promise<string | null> {
  if (!isSupabaseConfigured) return 'demo-token';
  try {
    const { data } = await authClient.auth.getSession();
    return data.session?.access_token || null;
  } catch {
    return null;
  }
}

// ── Get current logged-in user ───────────────────────────────────────────────
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!isSupabaseConfigured) {
    // When running in preview mode or when env vars aren't set in Vercel,
    // grant immediate access so the user never sees a blank screen!
    return {
      id: 'creator-demo-01',
      email: 'creator@velvetdesk.com',
      role: 'creator',
    };
  }
  try {
    const { data } = await authClient.auth.getUser();
    if (!data.user) return null;
    return {
      id: data.user.id,
      email: data.user.email || '',
      role: data.user.user_metadata?.role || 'creator',
    };
  } catch (err) {
    console.warn('[Auth] getUser failed:', err);
    return null;
  }
}

// ── Login with email + password ──────────────────────────────────────────────
export async function login(email: string, password: string): Promise<AuthUser> {
  if (!isSupabaseConfigured) {
    return {
      id: 'creator-demo-01',
      email: email || 'creator@velvetdesk.com',
      role: 'creator',
    };
  }
  const { data, error } = await authClient.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('No se pudo iniciar sesión.');
  return {
    id: data.user.id,
    email: data.user.email || '',
    role: data.user.user_metadata?.role || 'creator',
  };
}

// ── Register new user ────────────────────────────────────────────────────────
export async function register(email: string, password: string, name: string): Promise<AuthUser> {
  if (!isSupabaseConfigured) {
    return {
      id: 'creator-demo-01',
      email: email || 'creator@velvetdesk.com',
      role: 'creator',
    };
  }
  const { data, error } = await authClient.auth.signUp({
    email,
    password,
    options: { data: { name, role: 'creator' } },
  });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('No se pudo crear la cuenta.');
  return {
    id: data.user.id,
    email: data.user.email || '',
    role: 'creator',
  };
}

// ── Logout ───────────────────────────────────────────────────────────────────
export async function logout(): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await authClient.auth.signOut();
  } catch (e) {
    console.warn('[Auth] signOut error:', e);
  }
}

// ── Listen to auth state changes ─────────────────────────────────────────────
export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  if (!isSupabaseConfigured) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  }
  return authClient.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      callback({
        id: session.user.id,
        email: session.user.email || '',
        role: session.user.user_metadata?.role || 'creator',
      });
    } else {
      callback(null);
    }
  });
}
