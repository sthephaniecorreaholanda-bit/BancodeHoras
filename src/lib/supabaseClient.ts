import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://aexrustxvswbmawlvjam.supabase.co";
const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_kEV27Zw8RMS3noFhgt8EDw_67YJZmNI";

export const supabase = createClient(supabaseUrl, supabaseKey);
