export type ShareParams = {
  title?: string;
  text?: string;
  url?: string;
  sharedText: string;
};

const titleParamName = "title";
const textParamName = "text";
const urlParamName = "url";

const normalizeParam = (value: string | null): string | undefined => {
  const trimmed = value?.trim() ?? "";

  return trimmed ? trimmed : undefined;
};

export function formatSharedText({
  title,
  text,
  url,
}: {
  title?: string;
  text?: string;
  url?: string;
}): string {
  const parts: string[] = [];

  if (title) {
    parts.push(title);
  }

  if (text && text !== title) {
    parts.push(text);
  }

  if (url && !parts.some((part) => part === url)) {
    parts.push(url);
  }

  return parts.join("\n\n");
}

export function parseShareParams(search: string): ShareParams {
  const params = new URLSearchParams(search);
  const title = normalizeParam(params.get(titleParamName));
  const text = normalizeParam(params.get(textParamName));
  const url = normalizeParam(params.get(urlParamName));

  return {
    title,
    text,
    url,
    sharedText: formatSharedText({ title, text, url }),
  };
}
