import { NextResponse } from "next/server";

import { hasSupabaseAdminConfig, supabaseAdmin } from "@/lib/supabaseAdmin";

type CleanupPayload = {
  bucketId?: string;
  writeKeyHash?: string;
  maxPhraseCount?: number;
};

// 受け取れなかった場合の上限
const fallbackMaxPhraseCount = 200;

const isValidBucketId = (value: string): boolean => value.length >= 22;
const isSha256Hex = (value: string): boolean => /^[0-9a-f]{64}$/i.test(value);

export async function POST(request: Request) {
  if (!hasSupabaseAdminConfig || !supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabaseのサーバ設定が不足しています（環境変数を確認してください）。" },
      { status: 500 }
    );
  }

  let payload: CleanupPayload;
  try {
    payload = (await request.json()) as CleanupPayload;
  } catch {
    return NextResponse.json({ error: "リクエスト形式が不正です。" }, { status: 400 });
  }

  const { bucketId, writeKeyHash } = payload;
  const maxCount =
    typeof payload.maxPhraseCount === "number" && payload.maxPhraseCount > 0
      ? payload.maxPhraseCount
      : fallbackMaxPhraseCount;

  if (!bucketId || !writeKeyHash) {
    return NextResponse.json(
      { error: "整理に必要な情報が不足しています。" },
      { status: 400 }
    );
  }

  if (!isValidBucketId(bucketId) || !isSha256Hex(writeKeyHash)) {
    return NextResponse.json({ error: "入力値の形式が不正です。" }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  const { error: expiredError } = await supabaseAdmin
    .from("phrases")
    .delete()
    .eq("bucket_id", bucketId)
    .eq("write_key_hash", writeKeyHash)
    .lt("expires_at", nowIso);

  if (expiredError) {
    console.error("Failed to delete expired phrases:", expiredError);
    return NextResponse.json(
      { error: "期限切れフレーズの削除に失敗しました。" },
      { status: 500 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("phrases")
    .select("id")
    .eq("bucket_id", bucketId)
    .eq("write_key_hash", writeKeyHash)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch phrases for cleanup:", error);
    return NextResponse.json(
      { error: "古いフレーズの整理に失敗しました。" },
      { status: 500 }
    );
  }

  const ids = (data ?? []).map((item) => item.id);
  if (ids.length <= maxCount) {
    return NextResponse.json({ success: true });
  }

  const idsToDelete = ids.slice(maxCount);
  const { error: deleteError } = await supabaseAdmin
    .from("phrases")
    .delete()
    .in("id", idsToDelete)
    .eq("bucket_id", bucketId)
    .eq("write_key_hash", writeKeyHash);

  if (deleteError) {
    console.error("Failed to delete overflow phrases:", deleteError);
    return NextResponse.json(
      { error: "古いフレーズの削除に失敗しました。" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
