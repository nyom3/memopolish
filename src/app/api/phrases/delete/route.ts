import { NextResponse } from "next/server";

import { isSha256Hex, isValidBucketId } from "@/lib/phraseValidation";
import { hasSupabaseAdminConfig, supabaseAdmin } from "@/lib/supabaseAdmin";

type DeletePayload = {
  id?: string;
  bucketId?: string;
  writeKeyHash?: string;
};

// 基本バリデーション（API入力の早期チェック用）
const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

export async function POST(request: Request) {
  if (!hasSupabaseAdminConfig || !supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabaseのサーバ設定が不足しています（環境変数を確認してください）。" },
      { status: 500 }
    );
  }

  let payload: DeletePayload;
  try {
    payload = (await request.json()) as DeletePayload;
  } catch {
    return NextResponse.json({ error: "リクエスト形式が不正です。" }, { status: 400 });
  }

  const { id, bucketId, writeKeyHash } = payload;
  if (!id || !bucketId || !writeKeyHash) {
    return NextResponse.json(
      { error: "削除に必要な情報が不足しています。" },
      { status: 400 }
    );
  }

  if (!isUuid(id) || !isValidBucketId(bucketId) || !isSha256Hex(writeKeyHash)) {
    return NextResponse.json(
      { error: "入力値の形式が不正です。" },
      { status: 400 }
    );
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("phrases")
    .select("id")
    .eq("id", id)
    .eq("bucket_id", bucketId)
    .maybeSingle();

  if (existingError) {
    console.error("Failed to check phrase existence:", existingError);
    return NextResponse.json({ error: "削除に失敗しました。" }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "対象のフレーズが見つかりません。" }, { status: 404 });
  }

  const { data: authorized, error: authorizedError } = await supabaseAdmin
    .from("phrases")
    .select("id")
    .eq("id", id)
    .eq("bucket_id", bucketId)
    .eq("write_key_hash", writeKeyHash)
    .maybeSingle();

  if (authorizedError) {
    console.error("Failed to validate write_key_hash:", authorizedError);
    return NextResponse.json({ error: "削除に失敗しました。" }, { status: 500 });
  }

  if (!authorized) {
    return NextResponse.json(
      { error: "編集キーが一致しないため削除できません。" },
      { status: 403 }
    );
  }

  const { data: deleted, error } = await supabaseAdmin
    .from("phrases")
    .delete()
    .eq("id", id)
    .eq("bucket_id", bucketId)
    .eq("write_key_hash", writeKeyHash)
    .select("id");

  if (error) {
    console.error("Failed to delete phrase:", error);
    return NextResponse.json({ error: "削除に失敗しました。" }, { status: 500 });
  }

  if (!deleted || deleted.length === 0) {
    return NextResponse.json({ error: "削除対象が見つかりません。" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
