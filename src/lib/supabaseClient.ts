import { createClient, SupabaseClient } from "@supabase/supabase-js";

// クライアント側で使用するSupabase設定
const supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const hasSupabaseConfig: boolean =
  supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

export const supabaseClient: SupabaseClient | null = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
