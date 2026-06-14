import { NextRequest, NextResponse } from "next/server";

import { buildKeepaliveResponse, isKeepaliveAuthorized } from "@/lib/keepalive";
import { hasSupabaseConfig, supabaseClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (
    !isKeepaliveAuthorized({
      authorizationHeader: request.headers.get("authorization"),
      token: process.env.KEEPALIVE_TOKEN,
    })
  ) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  if (!hasSupabaseConfig || !supabaseClient) {
    const response = buildKeepaliveResponse({ hasConfig: false });
    return NextResponse.json(response.body, { status: response.status });
  }

  const { data, error } = await supabaseClient.from("phrases").select("id").limit(1);
  const response = buildKeepaliveResponse({
    hasConfig: true,
    hasQueryError: Boolean(error) || data === null,
  });

  if (error) {
    console.error("Failed to keep Supabase alive:", error);
  }

  return NextResponse.json(response.body, { status: response.status });
}
