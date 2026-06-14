import { writeKeyLength } from "./phraseConstraints";
import { isValidBucketId } from "./phraseValidation";

const bucketParamName = "bucket";
const writeKeyParamName = "wk";

export function buildQrUrl({
  bucketId,
  writeKey,
  baseUrl,
}: {
  bucketId: string;
  writeKey: string;
  baseUrl: string;
}): string {
  const url = new URL("/", baseUrl);
  url.searchParams.set(bucketParamName, bucketId);
  url.searchParams.set(writeKeyParamName, writeKey);

  return url.toString();
}

export function parseQrParams(search: string): {
  bucketId?: string;
  writeKey?: string;
} {
  const params = new URLSearchParams(search);
  const bucketId = params.get(bucketParamName) ?? undefined;
  const writeKey = params.get(writeKeyParamName) ?? undefined;

  return {
    bucketId: bucketId && isValidBucketId(bucketId) ? bucketId : undefined,
    writeKey: writeKey && writeKey.length === writeKeyLength ? writeKey : undefined,
  };
}
