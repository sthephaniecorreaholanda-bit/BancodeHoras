import { createClient } from '@supabase/supabase-js';

function normalizeSupabaseUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const t = raw.trim();
  const dash = t.match(/supabase\.(?:com|io)\/dashboard\/project\/(.+)$/i);
  if (dash && dash[1]) {
    const id = dash[1].split(/[/?#]/)[0];
    return `https://${id}.supabase.co`;
  }
  if (/^[a-z0-9_-]{10,}$/i.test(t) && !t.includes('.')) {
    return `https://${t}.supabase.co`;
  }
  if (/^https?:\/\//i.test(t)) return t;
  if (/^[^\s]+\.[^\s]+$/.test(t)) return `https://${t}`;
  return null;
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = normalizeSupabaseUrl(rawUrl);
const supabaseKey = rawKey?.trim() || null;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!)
  : (null as any);

/**
 * Returns the canonical site URL for auth redirects.
 * Priority:
 *  1. VITE_SITE_URL env var (set this in production builds)
 *  2. window.location.origin + Vite BASE_URL (works in dev and GitHub Pages builds)
 */
export function getSiteUrl(): string {
  const explicit = import.meta.env.VITE_SITE_URL as string | undefined;
  if (explicit) return explicit.replace(/\/$/, '');
  const base = import.meta.env.BASE_URL ?? '/';
  const origin = window.location.origin;
  const path = base.endsWith('/') ? base.slice(0, -1) : base;
  return origin + path;
}
