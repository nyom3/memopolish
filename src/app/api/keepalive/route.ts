import { NextResponse } from "next/server";

import { buildKeepaliveResponse } from "@/lib/keepalive";
import { hasSupabaseConfig, supabaseClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export async function GET() {
  const configResponse = buildKeepaliveResponse({ hasConfig: hasSupabaseConfig });

  if (!hasSupabaseConfig || !supabaseClient) {
    return NextResponse.json(configResponse.body, { status: configResponse.status });
  }

  const { error } = await supabaseClient.from("phrases").select("id").limit(1);
  const response = buildKeepaliveResponse({
    hasConfig: true,
    hasQueryError: Boolean(error),
  });

  if (error) {
    console.error("Failed to keep Supabase alive:", error);
  }

  return NextResponse.json(response.body, { status: response.status });
}
