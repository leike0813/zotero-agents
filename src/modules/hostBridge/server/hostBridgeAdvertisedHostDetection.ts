type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type HostBridgeAdvertisedHostDetectionDiagnostics = {
  backendUrl: string;
  backendHost: string;
  reflectionEndpoint?: string;
  status?: number;
  reason?: string;
  body?: string;
};

export type HostBridgeAdvertisedHostDetectionResult =
  | {
      ok: true;
      host: string;
      source: "auto";
      diagnostics: HostBridgeAdvertisedHostDetectionDiagnostics;
    }
  | {
      ok: false;
      code: string;
      message: string;
      diagnostics: HostBridgeAdvertisedHostDetectionDiagnostics;
    };

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function summarizeBody(body: string) {
  const text = normalizeString(body)
    .replace(/\s+/g, " ")
    .replace(/(bearer\s+)[^\s",}]+/gi, "$1[redacted]")
    .replace(
      /("(?:[^"]*token[^"]*)"|(?:\b\w*token\w*\b))\s*:\s*"[^"]*"/gi,
      '$1:"[redacted]"',
    )
    .replace(
      /("(?:[^"]*authorization[^"]*)"|(?:\b\w*authorization\w*\b))\s*:\s*"[^"]*"/gi,
      '$1:"[redacted]"',
    );
  return text.length > 500 ? `${text.slice(0, 500)}...` : text;
}

function buildReflectionEndpoint(backendUrl: string) {
  return `${backendUrl.replace(/\/+$/, "")}/v1/runtime/network/client-address`;
}

function parseBackendUrl(backendUrl: unknown) {
  const raw = normalizeString(backendUrl);
  if (!raw) {
    throw new Error("SkillRunner backend URL is required");
  }
  const parsed = new URL(raw);
  return {
    backendUrl: raw.replace(/\/+$/, ""),
    backendHost: parsed.hostname.replace(/^\[|\]$/g, ""),
  };
}

export function isIPv4Literal(value: unknown) {
  const text = normalizeString(value);
  const parts = text.split(".");
  if (parts.length !== 4) {
    return false;
  }
  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) {
      return false;
    }
    const value = Number(part);
    return Number.isInteger(value) && value >= 0 && value <= 255;
  });
}

export function isUsableAdvertisedIPv4(value: unknown) {
  const host = normalizeString(value);
  if (!isIPv4Literal(host)) {
    return false;
  }
  return !(
    host === "0.0.0.0" ||
    host === "255.255.255.255" ||
    host === "127.0.0.1" ||
    host.startsWith("127.")
  );
}

function failure(args: {
  code: string;
  message: string;
  diagnostics: HostBridgeAdvertisedHostDetectionDiagnostics;
}): HostBridgeAdvertisedHostDetectionResult {
  return {
    ok: false,
    code: args.code,
    message: args.message,
    diagnostics: args.diagnostics,
  };
}

export async function detectHostBridgeAdvertisedHostForBackend(args: {
  backendUrl: string;
  fetchImpl?: FetchLike;
}): Promise<HostBridgeAdvertisedHostDetectionResult> {
  let parsed: { backendUrl: string; backendHost: string };
  try {
    parsed = parseBackendUrl(args.backendUrl);
  } catch (error) {
    return failure({
      code: "host_bridge_advertised_host_reflection_unavailable",
      message:
        "Host Bridge advertised host reflection requires a valid SkillRunner backend URL.",
      diagnostics: {
        backendUrl: normalizeString(args.backendUrl),
        backendHost: "",
        reason: error instanceof Error ? error.message : String(error),
      },
    });
  }

  const reflectionEndpoint = buildReflectionEndpoint(parsed.backendUrl);
  const diagnosticsBase = {
    backendUrl: parsed.backendUrl,
    backendHost: parsed.backendHost,
    reflectionEndpoint,
  };

  const runtimeFetch = (globalThis as { fetch?: FetchLike }).fetch;
  const fetchImpl = args.fetchImpl || runtimeFetch?.bind(globalThis);
  if (typeof fetchImpl !== "function") {
    return failure({
      code: "host_bridge_advertised_host_reflection_unavailable",
      message:
        "Host Bridge advertised host reflection requires fetch() in the current runtime.",
      diagnostics: {
        ...diagnosticsBase,
        reason: "fetch_unavailable",
      },
    });
  }

  let response: Response;
  try {
    response = await fetchImpl(reflectionEndpoint, {
      method: "GET",
      headers: {
        accept: "application/json",
      },
    });
  } catch (error) {
    return failure({
      code: "host_bridge_advertised_host_reflection_unavailable",
      message:
        "Host Bridge could not request the SkillRunner client-address reflection endpoint.",
      diagnostics: {
        ...diagnosticsBase,
        reason: error instanceof Error ? error.message : String(error),
      },
    });
  }

  let bodyText = "";
  try {
    bodyText = await response.text();
  } catch (error) {
    return failure({
      code: "host_bridge_advertised_host_reflection_unavailable",
      message:
        "Host Bridge could not read the SkillRunner client-address reflection response.",
      diagnostics: {
        ...diagnosticsBase,
        status: response.status,
        reason: error instanceof Error ? error.message : String(error),
      },
    });
  }

  const diagnostics = {
    ...diagnosticsBase,
    status: response.status,
    body: summarizeBody(bodyText),
  };
  if (!response.ok) {
    return failure({
      code: "host_bridge_advertised_host_reflection_unavailable",
      message:
        "SkillRunner client-address reflection endpoint returned an unsuccessful response.",
      diagnostics,
    });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(bodyText);
  } catch (error) {
    return failure({
      code: "host_bridge_advertised_host_reflection_invalid",
      message:
        "SkillRunner client-address reflection endpoint returned invalid JSON.",
      diagnostics: {
        ...diagnostics,
        reason: error instanceof Error ? error.message : String(error),
      },
    });
  }

  const clientIp = normalizeString(
    payload && typeof payload === "object"
      ? (payload as { client_ip?: unknown }).client_ip
      : "",
  );
  if (!isUsableAdvertisedIPv4(clientIp)) {
    return failure({
      code: "host_bridge_advertised_host_reflection_invalid",
      message:
        "SkillRunner client-address reflection endpoint did not return a usable LAN IPv4 address.",
      diagnostics: {
        ...diagnostics,
        reason: clientIp ? "client_ip_unusable" : "client_ip_missing",
      },
    });
  }

  return {
    ok: true,
    host: clientIp,
    source: "auto",
    diagnostics,
  };
}
