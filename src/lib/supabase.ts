import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Browser client — uses anon key (safe to expose)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[VelvetDesk] Supabase env vars not set. Running in offline/mock mode.');
}

export const supabase = createClient<Database>(
  supabaseUrl || 'http://localhost:54321',
  supabaseAnonKey || 'anon-key-placeholder'
);
