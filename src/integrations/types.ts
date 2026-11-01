/**
 * Shared types for server-side integrations.
 * Uses SupabaseClient<any> to avoid strict Database generic typing
 * that causes 'never' errors in integration files.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DB = SupabaseClient<any>;
