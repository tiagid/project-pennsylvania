import { createClient } from "@supabase/supabase-js";

//keys come from frontend/.env, the publishable key is ok to have in the browser
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
