import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl: string = process.env.SUPABASE_URL ?? "";
const serviceRoleKey: string = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const hasSupabaseAdminConfig: boolean =
  supabaseUrl.length > 0 && serviceRoleKey.length > 0;

export const supabaseAdmin: SupabaseClient | null = hasSupabaseAdminConfig
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })
  : null;
