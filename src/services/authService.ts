/**
 * Auth Service — VelvetDesk
 * Multi-user authentication using Supabase Auth.
 * Handles login, register, logout and session persistence.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const authClient = createClient(supabaseUrl, supabaseAnonKey);

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
}

// ── Get current session token (for API calls) ────────────────────────────────
export async function getAccessToken(): Promise<string | null> {
  const { data } = await authClient.auth.getSession();
  return data.session?.access_token || null;
}

// ── Get current logged-in user ───────────────────────────────────────────────
export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data } = await authClient.auth.getUser();
  if (!data.user) return null;
  return {
    id: data.user.id,
    email: data.user.email || '',
    role: data.user.user_metadata?.role || 'creator',
  };
}

// ── Login with email + password ──────────────────────────────────────────────
export async function login(email: string, password: string): Promise<AuthUser> {
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
  await authClient.auth.signOut();
}

// ── Listen to auth state changes ─────────────────────────────────────────────
export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
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
