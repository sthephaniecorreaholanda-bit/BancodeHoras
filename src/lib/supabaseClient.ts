import { createClient } from '@supabase/supabase-js';

function normalizeSupabaseUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const t = raw.trim();

  // If user accidentally provided the dashboard URL like
  // https://supabase.com/dashboard/project/<PROJECT_ID>
  const dash = t.match(/supabase\.(?:com|io)\/dashboard\/project\/(.+)$/i);
  if (dash && dash[1]) {
    const id = dash[1].split(/[/?#]/)[0];
    return `https://${id}.supabase.co`;
  }

  // If they pasted just the project id (aexrustxvswbmawlvjam)
  if (/^[a-z0-9_-]{10,}$/i.test(t) && !t.includes('.')) {
    return `https://${t}.supabase.co`;
  }

  // If already a full url, ensure it has a protocol
  if (/^https?:\/\//i.test(t)) return t;
  if (/^[^\s]+\.[^\s]+$/.test(t)) return `https://${t}`;
  return null;
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = normalizeSupabaseUrl(rawUrl) || "https://aexrustxvswbmawlvjam.supabase.co";
const supabaseKey = rawKey || "sb_publishable_kEV27Zw8RMS3noFhgt8EDw_67YJZmNI";

// Create client only when we have a valid URL; otherwise fall back to local-only mode.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _supabaseClient: any = null;
if (!supabaseUrl || !/^https?:\/\//.test(supabaseUrl)) {
  console.error(`Invalid supabaseUrl, falling back to local-only mode: ${supabaseUrl}`);
  _supabaseClient = null;
} else {
  _supabaseClient = createClient(supabaseUrl, supabaseKey);
}

export const supabase = _supabaseClient;
