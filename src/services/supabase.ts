import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

/**
 * AI DJ Studio Supabase Client
 * Safely reads Vite environment variables (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY).
 * Never exposes or uses the Supabase service-role secret.
 * Falls back gracefully to local storage mock mode when credentials are not configured yet.
 */

const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;

// Fallback to locally stored custom configuration if set via UI settings
const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('aidj_custom_supabase_url') || '' : '';
const storedKey = typeof window !== 'undefined' ? localStorage.getItem('aidj_custom_supabase_anon_key') || '' : '';

export const SUPABASE_URL = (envUrl || storedUrl || '').trim();
export const SUPABASE_ANON_KEY = (envKey || storedKey || '').trim();

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    SUPABASE_URL.startsWith('http') &&
    SUPABASE_ANON_KEY.length > 20 &&
    !SUPABASE_URL.includes('your-project.supabase.co')
  );
};

// Create typed Supabase client with persistent session handling
let clientInstance: SupabaseClient<Database> | null = null;

export const getSupabaseClient = (): SupabaseClient<Database> | null => {
  if (clientInstance) return clientInstance;

  if (isSupabaseConfigured()) {
    try {
      clientInstance = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        },
      });
      return clientInstance;
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
    }
  }

  return null;
};

export const supabase = getSupabaseClient();

