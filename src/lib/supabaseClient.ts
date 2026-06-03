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

if (!supabaseUrl || !/^https?:\/\/.+/.test(supabaseUrl)) {
  // provide a clearer message but avoid crashing the whole app during build/runtime
  // The original supabase client throws if URL is invalid; keep explicit check
  throw new Error(`Invalid supabaseUrl: ${supabaseUrl}`);
}

export const supabase = createClient(supabaseUrl, supabaseKey);
