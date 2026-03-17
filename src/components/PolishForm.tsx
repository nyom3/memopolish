"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { hasSupabaseConfig, supabaseClient } from "@/lib/supabaseClient";

type Phrase = {
  id: string;
  text: string;
  created_at: string;
  expires_at: string | null;
};

type PolishResponse = {
  output?: string;
  error?: string;
};

type PolishMode = "polish" | "keigo" | "keypoints";

type ApiResponse = {
  success?: boolean;
  error?: string;
};

type Props = Record<string, never>;

type ToastVariant = "success" | "error";

type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
};

// localStorage に保存するキー名
const bucketStorageKey = "phrasebridge_bucket_id";
const writeKeyStorageKey = "phrasebridge_write_key";
const minBucketLength = 22;
const writeKeyLength = 32;
const maxTextLength = 2000;
const maxPhraseCount = 200;
const expirationDays = 7;
const toastDurationMs = 2400;
const urlPattern = /https?:\/\/[^\s]+/g;

// 共有ID/編集キー用の簡易URLセーフ変換
const toBase64Url = (bytes: Uint8Array): string => {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

// 推測されにくいランダムIDを生成
const generateRandomId = (minLength: number): string => {
  let value = "";

  while (value.length < minLength) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    value += toBase64Url(bytes);
  }

  return value.slice(0, minLength);
};

// write_key をサーバへ送る前にハッシュ化
const hashSha256 = async (value: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const isExpired = (expiresAt: string | null): boolean => {
  if (!expiresAt) {
    return false;
  }

  return new Date(expiresAt).getTime() < Date.now();
};

const isValidBucketId = (value: string): boolean => value.length >= minBucketLength;

const formatDateTime = (value: string): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ja-JP", { hour12: false });
};

const splitTrailingPunctuation = (value: string): { url: string; trailing: string } => {
  const match = value.match(/^(.*?)([.,!?)]*)$/);

  if (!match) {
    return { url: value, trailing: "" };
  }

  return {
    url: match[1] || value,
    trailing: match[2] || "",
  };
};

const renderTextWithLinks = (value: string): ReactNode => {
  const matches = Array.from(value.matchAll(urlPattern));

  if (matches.length === 0) {
    return value;
  }

  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  matches.forEach((match, index) => {
    const rawUrl = match[0];
    const matchIndex = match.index ?? 0;

    if (lastIndex < matchIndex) {
      nodes.push(value.slice(lastIndex, matchIndex));
    }

    const { url, trailing } = splitTrailingPunctuation(rawUrl);

    nodes.push(
      <a
        key={`${url}-${matchIndex}-${index}`}
        href={url}
        target="_blank"
        rel="noreferrer"
        className="break-all text-sky-700 underline underline-offset-2 hover:text-sky-800"
      >
        {url}
      </a>,
    );

    if (trailing) {
      nodes.push(trailing);
    }

    lastIndex = matchIndex + rawUrl.length;
  });

  if (lastIndex < value.length) {
    nodes.push(value.slice(lastIndex));
  }

  return nodes;
};

const PolishForm: React.FC<Props> = () => {
  const [text, setText] = useState<string>("");
  const [lastSavedText, setLastSavedText] = useState<string>("");
  const [bucketId, setBucketId] = useState<string>("");
  const [bucketInput, setBucketInput] = useState<string>("");
  const [writeKey, setWriteKey] = useState<string>("");
  const [writeKeyInput, setWriteKeyInput] = useState<string>("");
  const [writeKeyHash, setWriteKeyHash] = useState<string>("");
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [polishedText, setPolishedText] = useState<string>("");
  const [aiMode, setAiMode] = useState<PolishMode>("polish");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isPolishing, setIsPolishing] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [infoMessage, setInfoMessage] = useState<string>("");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [showBucket, setShowBucket] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const toastTimeouts = useRef<Map<string, number>>(new Map());
  const phraseInputRef = useRef<HTMLTextAreaElement | null>(null);

  const isFormBusy = isSaving || isPolishing;
  const isReadOnly = writeKeyHash.length === 0;

  const remainingChars = useMemo<number>(() => maxTextLength - text.length, [text]);
  const isDirty = useMemo<boolean>(() => {
    const trimmed = text.trim();
    if (!trimmed) {
      return false;
    }
    return trimmed !== lastSavedText.trim();
  }, [lastSavedText, text]);

  // 初回のみ共有ルームID / 編集キーを生成して保存
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedBucketId = localStorage.getItem(bucketStorageKey);
    const nextBucketId =
      storedBucketId && isValidBucketId(storedBucketId)
        ? storedBucketId
        : generateRandomId(minBucketLength);

    if (!storedBucketId || storedBucketId !== nextBucketId) {
      localStorage.setItem(bucketStorageKey, nextBucketId);
    }

    const storedWriteKey = localStorage.getItem(writeKeyStorageKey);
    const nextWriteKey =
      storedWriteKey && storedWriteKey.length >= writeKeyLength
        ? storedWriteKey
        : generateRandomId(writeKeyLength);

    if (!storedWriteKey || storedWriteKey !== nextWriteKey) {
      localStorage.setItem(writeKeyStorageKey, nextWriteKey);
    }

    queueMicrotask(() => {
      setBucketId(nextBucketId);
      setBucketInput(nextBucketId);
      setWriteKey(nextWriteKey);
      setWriteKeyInput(nextWriteKey);
    });
  }, []);

  // 編集キーが変わったらハッシュを更新
  useEffect(() => {
    if (!writeKey) {
      queueMicrotask(() => {
        setWriteKeyHash("");
      });
      return;
    }

    void (async () => {
      try {
        const hashed = await hashSha256(writeKey);
        setWriteKeyHash(hashed);
      } catch (error) {
        console.error("Failed to hash write_key", error);
        setErrorMessage("編集キーの生成に失敗しました。");
      }
    })();
  }, [writeKey]);

  useEffect(() => {
    const activeTimeouts = toastTimeouts.current;

    return () => {
      activeTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
      activeTimeouts.clear();
    };
  }, []);

  useEffect(() => {
    phraseInputRef.current?.focus();
  }, []);

  const resetMessages = (): void => {
    setErrorMessage("");
    setInfoMessage("");
  };

  const pushToast = (message: string, variant: ToastVariant): void => {
    const id = crypto.randomUUID();
    const item: ToastItem = { id, message, variant };
    setToasts((prev) => [...prev, item]);

    const timeoutId = window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
      toastTimeouts.current.delete(id);
    }, toastDurationMs);
    toastTimeouts.current.set(id, timeoutId);
  };

  const getApiErrorMessage = (status: number, fallback: string): string => {
    if (status === 403) {
      return "編集キーが一致しないため操作できません。";
    }
    if (status === 404) {
      return "対象のフレーズが見つかりません。";
    }
    if (status >= 500) {
      return "サーバでエラーが発生しました。時間をおいて再試行してください。";
    }
    return fallback;
  };

  // 共有ルームIDごとに最新順で取得
  async function fetchPhrases(activeBucketId: string): Promise<boolean> {
    if (!supabaseClient || !hasSupabaseConfig) {
      setErrorMessage("Supabaseの設定が見つかりません。");
      return false;
    }

    setIsFetching(true);
    resetMessages();

    const { data, error } = await supabaseClient
      .from("phrases")
      .select("id, text, created_at, expires_at")
      .eq("bucket_id", activeBucketId)
      .order("created_at", { ascending: false })
      .limit(maxPhraseCount);

    if (error) {
      console.error("Failed to fetch phrases:", error);
      setErrorMessage("フレーズの取得に失敗しました。");
      pushToast("フレーズの取得に失敗しました。", "error");
      setIsFetching(false);
      return false;
    }

    const filtered = (data ?? []).filter((phrase) => !isExpired(phrase.expires_at));
    setPhrases(filtered);
    setIsFetching(false);
    return true;
  }

  useEffect(() => {
    if (!bucketId || !hasSupabaseConfig || !supabaseClient) {
      return;
    }

    queueMicrotask(() => {
      void fetchPhrases(bucketId);
    });
  }, [bucketId]);

  // サーバ側で期限切れ/件数超過の整理を実施
  const cleanupOverflow = async (activeBucketId: string): Promise<boolean> => {
    if (!writeKeyHash) {
      setErrorMessage("編集キーが未設定のため整理できません。");
      pushToast("編集キーが未設定のため整理できません。", "error");
      return false;
    }

    try {
      const response = await fetch("/api/phrases/cleanup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bucketId: activeBucketId,
          writeKeyHash,
          maxPhraseCount,
        }),
      });

      const data = (await response.json()) as ApiResponse;
      if (!response.ok || !data.success) {
        const message = getApiErrorMessage(
          response.status,
          data.error ?? "古いフレーズの整理に失敗しました。"
        );
        setErrorMessage(message);
        pushToast(message, "error");
        return false;
      }

      return true;
    } catch (error) {
      console.error("Failed to cleanup phrases:", error);
      setErrorMessage("古いフレーズの整理に失敗しました。");
      pushToast("古いフレーズの整理に失敗しました。", "error");
      return false;
    }
  };

  const validateText = (value: string): string | null => {
    const trimmed = value.trim();

    if (!trimmed) {
      return "フレーズを入力してください。";
    }

    if (trimmed.length > maxTextLength) {
      return `フレーズは${maxTextLength}文字以内で入力してください。`;
    }

    return null;
  };

  // 保存 → cleanup → 再取得の順でUIを更新
  const savePhrase = async (
    value: string,
    options: { updateSavedText: boolean }
  ): Promise<boolean> => {
    if (!supabaseClient || !hasSupabaseConfig) {
      setErrorMessage("Supabaseの設定が見つかりません。");
      pushToast("Supabaseの設定が見つかりません。", "error");
      return false;
    }

    const validationError = validateText(value);
    if (validationError) {
      setErrorMessage(validationError);
      pushToast(validationError, "error");
      return false;
    }

    if (!bucketId) {
      setErrorMessage("共有ルームIDが未設定です。");
      pushToast("共有ルームIDが未設定です。", "error");
      return false;
    }

    if (!writeKeyHash) {
      setErrorMessage("編集キーが未設定のため保存できません。");
      pushToast("編集キーが未設定のため保存できません。", "error");
      return false;
    }

    setIsSaving(true);
    resetMessages();

    const expiresAt = new Date(
      Date.now() + expirationDays * 24 * 60 * 60 * 1000
    ).toISOString();

    const { error } = await supabaseClient.from("phrases").insert({
      bucket_id: bucketId,
      text: value.trim(),
      write_key_hash: writeKeyHash,
      expires_at: expiresAt,
    });

    if (error) {
      console.error("Failed to save phrase:", error);
      setErrorMessage("保存に失敗しました。");
      pushToast("保存に失敗しました。", "error");
      setIsSaving(false);
      return false;
    }

    const cleanupOk = await cleanupOverflow(bucketId);
    const fetchOk = await fetchPhrases(bucketId);

    setIsSaving(false);
    if (cleanupOk && fetchOk) {
      setInfoMessage("保存しました。");
      pushToast("保存しました。", "success");
      if (options.updateSavedText) {
        setLastSavedText(value.trim());
      }
      return true;
    }

    return false;
  };

  const handleSave = async (): Promise<void> => {
    const success = await savePhrase(text, { updateSavedText: true });
    if (success) {
      setText("");
      setLastSavedText("");
    }
  };

  const handleCopyText = async (value: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      setInfoMessage("コピーしました。");
      pushToast("コピーしました。", "success");
    } catch (error) {
      console.error("Failed to copy:", error);
      setErrorMessage("コピーに失敗しました。");
      pushToast("コピーに失敗しました。", "error");
    }
  };

  // AI加工（polish / keigo / keypoints）
  const requestPolish = async (value: string): Promise<string | null> => {
    const validationError = validateText(value);
    if (validationError) {
      setErrorMessage(validationError);
      pushToast(validationError, "error");
      return null;
    }

    setIsPolishing(true);
    resetMessages();

    try {
      const response = await fetch("/api/polish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: value.trim(),
          mode: aiMode,
          extraInstruction: "",
        }),
      });

      const data = (await response.json()) as PolishResponse;

      if (!response.ok) {
        const message = data.error ?? "AI加工に失敗しました。";
        setErrorMessage(message);
        pushToast(message, "error");
        setIsPolishing(false);
        return null;
      }

      setIsPolishing(false);
      return data.output ?? "";
    } catch (error) {
      console.error("Failed to polish:", error);
      setErrorMessage("AI加工に失敗しました。");
      pushToast("AI加工に失敗しました。", "error");
      setIsPolishing(false);
      return null;
    }
  };

  const handlePolishAndCopy = async (): Promise<void> => {
    const result = await requestPolish(text);
    if (!result) {
      return;
    }

    setPolishedText(result);
    await handleCopyText(result);
  };

  const handlePolishAndSave = async (): Promise<void> => {
    const result = await requestPolish(text);
    if (!result) {
      return;
    }

    setPolishedText(result);
    const saved = await savePhrase(result, { updateSavedText: false });
    if (saved) {
      pushToast("AI加工して保存しました。", "success");
    }
  };

  const handlePolishPhrase = async (phrase: Phrase): Promise<void> => {
    const result = await requestPolish(phrase.text);
    if (!result) {
      return;
    }

    setPolishedText(result);
  };

  // サーバAPIで削除権限を検証して削除
  const handleDeletePhrase = async (phraseId: string): Promise<boolean> => {
    if (!writeKeyHash) {
      setErrorMessage("編集キーが未設定のため削除できません。");
      pushToast("編集キーが未設定のため削除できません。", "error");
      return false;
    }

    if (deletingIds.has(phraseId)) {
      return false;
    }

    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.add(phraseId);
      return next;
    });
    resetMessages();

    try {
      const response = await fetch("/api/phrases/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: phraseId,
          bucketId,
          writeKeyHash,
        }),
      });

      const data = (await response.json()) as ApiResponse;
      if (!response.ok || !data.success) {
        const message = getApiErrorMessage(
          response.status,
          data.error ?? "削除に失敗しました。"
        );
        setErrorMessage(message);
        pushToast(message, "error");
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(phraseId);
          return next;
        });
        return false;
      }

      setPhrases((prev) => prev.filter((phrase) => phrase.id !== phraseId));
      pushToast("削除しました。", "success");
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(phraseId);
        return next;
      });
      return true;
    } catch (error) {
      console.error("Failed to delete phrase:", error);
      setErrorMessage("削除に失敗しました。");
      pushToast("削除に失敗しました。", "error");
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(phraseId);
        return next;
      });
      return false;
    }
  };

  const handleApplyBucket = async (): Promise<void> => {
    const trimmed = bucketInput.trim();
    if (!isValidBucketId(trimmed)) {
      setErrorMessage(`共有ルームIDは${minBucketLength}文字以上で入力してください。`);
      pushToast(`共有ルームIDは${minBucketLength}文字以上で入力してください。`, "error");
      return;
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(bucketStorageKey, trimmed);
    }

    setBucketId(trimmed);
    setInfoMessage("共有ルームIDを切り替えました。");
    pushToast("共有ルームIDを切り替えました。", "success");
  };

  const handleApplyWriteKey = async (): Promise<void> => {
    const trimmed = writeKeyInput.trim();
    if (trimmed.length === 0) {
      setErrorMessage("編集キーを入力してください。");
      pushToast("編集キーを入力してください。", "error");
      return;
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(writeKeyStorageKey, trimmed);
    }

    setWriteKey(trimmed);
    setInfoMessage("編集キーを切り替えました。");
    pushToast("編集キーを切り替えました。", "success");
  };

  if (!hasSupabaseConfig) {
    return (
      <div className="w-full max-w-2xl rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        <h2 className="text-lg font-bold">Supabase設定が必要です</h2>
        <p className="mt-2 text-sm">
          環境変数にNEXT_PUBLIC_SUPABASE_URLとNEXT_PUBLIC_SUPABASE_ANON_KEYを設定してください。
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl space-y-4 sm:space-y-5 md:space-y-6">
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 md:p-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="phrase-input" className="text-sm font-bold text-slate-700">
            フレーズ入力
          </label>
          <textarea
            ref={phraseInputRef}
            id="phrase-input"
            rows={6}
            className="min-h-36 w-full rounded-lg border border-slate-200 p-3.5 text-[15px] text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none sm:text-sm"
            placeholder="例：明日の打ち合わせ、15時からに変更できますか？"
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={isFormBusy}
          />
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>残り{remainingChars}文字</span>
            <span>最大{maxTextLength}文字</span>
          </div>
          <p
            className={`text-xs ${
              isDirty ? "text-slate-400" : "text-emerald-600"
            }`}
          >
            {isDirty ? "未保存" : "保存済み"}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <button
            type="button"
            onClick={handleSave}
            className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
            disabled={isSaving || isPolishing || isReadOnly}
          >
            {isSaving ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                保存中
              </>
            ) : (
              "保存"
            )}
          </button>
          <button
            type="button"
            onClick={handlePolishAndCopy}
            className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:border-slate-400 disabled:opacity-60"
            disabled={isPolishing}
          >
            {isPolishing ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-slate-700" />
                加工中
              </>
            ) : (
              "AI加工してコピー"
            )}
          </button>
          <button
            type="button"
            onClick={handlePolishAndSave}
            className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:border-slate-400 disabled:opacity-60"
            disabled={isPolishing || isReadOnly}
          >
            {isPolishing ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-slate-700" />
                加工中
              </>
            ) : (
              "AI加工して保存"
            )}
          </button>
        </div>

        <div className="flex flex-col gap-2 text-xs text-slate-600 md:flex-row md:items-center">
          <label htmlFor="ai-mode" className="font-bold text-slate-700">
            AI加工モード
          </label>
          <select
            id="ai-mode"
            value={aiMode}
            onChange={(event) => setAiMode(event.target.value as PolishMode)}
            className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 md:w-60"
            disabled={isPolishing}
          >
            <option value="polish">推敲（読みやすく整える）</option>
            <option value="keigo">敬語化（丁寧で簡潔）</option>
            <option value="keypoints">要点抽出（箇条書き最大5点）</option>
          </select>
          <span>入力にない事実は追加しません。</span>
        </div>

        {isReadOnly && (
          <p className="text-xs text-amber-600">
            編集キーが未設定のため読み取り専用です（保存・削除はできません）。
          </p>
        )}

        {(errorMessage || infoMessage) && (
          <div
            className={`rounded-lg px-3 py-2 text-sm ${
              errorMessage
                ? "border border-red-200 bg-red-50 text-red-700"
                : "border border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {errorMessage || infoMessage}
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 md:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700">共有ルームID</h2>
          <button
            type="button"
            onClick={() => setShowBucket((current) => !current)}
            className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:border-slate-400 sm:text-xs"
          >
            {showBucket ? "閉じる" : "表示"}
          </button>
        </div>
        {showBucket && (
          <div className="space-y-2">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <input
                type="text"
                value={bucketId}
                readOnly
                className="min-h-11 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
              />
              <button
                type="button"
                onClick={() => handleCopyText(bucketId)}
            className="min-h-11 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-slate-400 disabled:opacity-60"
            disabled={!bucketId}
          >
            コピー
          </button>
            </div>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <input
                type="text"
                value={bucketInput}
                onChange={(event) => setBucketInput(event.target.value)}
                placeholder="別端末の共有ルームIDを入力"
                className="min-h-11 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                disabled={isFormBusy}
              />
              <button
                type="button"
                onClick={handleApplyBucket}
                className="min-h-11 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                disabled={isFormBusy}
              >
                適用
              </button>
            </div>
            <p className="text-xs text-slate-500">
              共有ルームID：同じIDの端末同士で一覧が共有されます
            </p>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 md:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700">編集キー（詳細）</h2>
          <button
            type="button"
            onClick={() => setShowAdvanced((current) => !current)}
            className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:border-slate-400 sm:text-xs"
          >
            {showAdvanced ? "閉じる" : "表示"}
          </button>
        </div>
        {showAdvanced && (
          <div className="space-y-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <input
                type="text"
                value={writeKey}
                readOnly
                className="min-h-11 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
              />
              <button
                type="button"
                onClick={() => handleCopyText(writeKey)}
            className="min-h-11 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-slate-400 disabled:opacity-60"
            disabled={!writeKey}
          >
            コピー
          </button>
            </div>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <input
                type="text"
                value={writeKeyInput}
                onChange={(event) => setWriteKeyInput(event.target.value)}
                placeholder="共有する編集キーを入力"
                className="min-h-11 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                disabled={isFormBusy}
              />
              <button
                type="button"
                onClick={handleApplyWriteKey}
                className="min-h-11 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                disabled={isFormBusy}
              >
                適用
              </button>
            </div>
            <p className="text-xs text-slate-500">
              編集キー：保存・削除するためのキーです（共有すると編集できます）
            </p>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 md:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700">AI加工結果</h2>
          <button
            type="button"
            onClick={() => handleCopyText(polishedText)}
            className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:border-slate-400 disabled:opacity-60 sm:text-xs"
            disabled={!polishedText}
          >
            コピー
          </button>
        </div>
        <div className="min-h-28 w-full rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-[15px] text-slate-900 sm:text-sm">
          {polishedText ? (
            <p className="whitespace-pre-wrap break-words select-text">
              {renderTextWithLinks(polishedText)}
            </p>
          ) : (
            <p className="whitespace-pre-wrap break-words text-slate-400">
              AI加工結果がここに表示されます
            </p>
          )}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 md:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700">フレーズ一覧</h2>
          <button
            type="button"
            onClick={() => void fetchPhrases(bucketId)}
            className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:border-slate-400 disabled:opacity-60 sm:text-xs"
            disabled={!bucketId || isFetching}
          >
            {isFetching ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-slate-700" />
                更新中
              </>
            ) : (
              "更新"
            )}
          </button>
        </div>
        {phrases.length === 0 ? (
          <p className="text-sm text-slate-500">まだフレーズがありません。</p>
        ) : (
          <ul className="space-y-3">
            {phrases.map((phrase) => (
              <li
                key={phrase.id}
                className={`rounded-xl border border-slate-200 p-4 shadow-sm transition-all sm:p-4 ${
                  deletingIds.has(phrase.id)
                    ? "opacity-0 blur-sm"
                    : "opacity-100"
                }`}
              >
                <div className="space-y-2">
                  <p className="whitespace-pre-wrap break-words text-sm text-slate-800">
                    {renderTextWithLinks(phrase.text)}
                  </p>
                  <p className="text-xs text-slate-400">
                    作成: {formatDateTime(phrase.created_at)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyText(phrase.text)}
                      className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:border-slate-400 sm:min-h-8 sm:px-3 sm:py-1 sm:text-xs"
                    >
                      コピー
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePolishPhrase(phrase)}
                      className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:border-slate-400 sm:min-h-8 sm:px-3 sm:py-1 sm:text-xs"
                    >
                      AI加工
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeletePhrase(phrase.id)}
                      className="flex min-h-10 items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-600 hover:border-red-400 disabled:opacity-60 sm:min-h-8 sm:px-3 sm:py-1 sm:text-xs"
                      disabled={isReadOnly || deletingIds.has(phrase.id)}
                    >
                      {deletingIds.has(phrase.id) ? (
                        <>
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-red-300 border-t-red-600" />
                          削除中
                        </>
                      ) : (
                        "削除"
                      )}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {toasts.length > 0 && (
        <div className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 flex w-[min(320px,90vw)] flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`rounded-lg px-3 py-2 text-sm shadow-lg ${
                toast.variant === "error"
                  ? "border border-red-200 bg-red-50 text-red-700"
                  : "border border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PolishForm;
