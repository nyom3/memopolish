export const urlPattern = /https?:\/\/[^\s]+/g;

type TextSegment = {
  type: "text" | "link";
  value: string;
};

export const splitTrailingPunctuation = (value: string): { url: string; trailing: string } => {
  const validUrlMatch = value.match(/^https?:\/\/[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]*/);
  const url = validUrlMatch?.[0] ?? value;

  return {
    url,
    trailing: value.slice(url.length),
  };
};

export const splitTextWithUrls = (value: string): TextSegment[] => {
  const matches = Array.from(value.matchAll(urlPattern));

  if (matches.length === 0) {
    return [{ type: "text", value }];
  }

  const segments: TextSegment[] = [];
  let lastIndex = 0;

  matches.forEach((match) => {
    const rawUrl = match[0];
    const matchIndex = match.index ?? 0;

    if (lastIndex < matchIndex) {
      segments.push({ type: "text", value: value.slice(lastIndex, matchIndex) });
    }

    const { url, trailing } = splitTrailingPunctuation(rawUrl);
    segments.push({ type: "link", value: url });

    if (trailing) {
      segments.push({ type: "text", value: trailing });
    }

    lastIndex = matchIndex + rawUrl.length;
  });

  if (lastIndex < value.length) {
    segments.push({ type: "text", value: value.slice(lastIndex) });
  }

  return segments;
};
