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

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias. " +
    "Crie um arquivo .env na raiz do projeto com essas variáveis."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
