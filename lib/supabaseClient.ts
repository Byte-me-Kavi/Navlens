import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) throw new Error('supabaseUrl is required');
if (!supabaseKey) throw new Error('supabaseKey is required');

export const supabase = createClient(supabaseUrl, supabaseKey);
