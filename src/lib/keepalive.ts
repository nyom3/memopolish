export type KeepaliveBody = {
  ok: boolean;
};

export type KeepaliveResponse = {
  body: KeepaliveBody;
  status: number;
};

type BuildKeepaliveResponseParams = {
  hasConfig: boolean;
  hasQueryError?: boolean;
};

export function isKeepaliveAuthorized({
  authorizationHeader,
  token,
}: {
  authorizationHeader: string | null;
  token?: string;
}): boolean {
  if (!token) {
    return true;
  }

  return authorizationHeader === `Bearer ${token}`;
}

export function buildKeepaliveResponse({
  hasConfig,
  hasQueryError = false,
}: BuildKeepaliveResponseParams): KeepaliveResponse {
  if (!hasConfig) {
    return {
      body: { ok: false },
      status: 503,
    };
  }

  if (hasQueryError) {
    return {
      body: { ok: false },
      status: 500,
    };
  }

  return {
    body: { ok: true },
    status: 200,
  };
}
