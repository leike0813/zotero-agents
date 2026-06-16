import { getHostBridgeToken } from "./hostBridgeAuth";
import { getHostBridgeServerStatus } from "./hostBridgeServer";
import type { HostBridgeStatusSnapshot } from "./hostBridgeProtocol";
import {
  detectHostBridgeAdvertisedHostForBackend,
  type HostBridgeAdvertisedHostDetectionResult,
} from "./hostBridgeAdvertisedHostDetection";

export type SkillRunnerHostBridgeEnv = Record<string, string> & {
  ZOTERO_BRIDGE_ENDPOINT: string;
  ZOTERO_BRIDGE_TOKEN: string;
  ZOTERO_BRIDGE_CONNECTION_MODE: "local" | "remote";
  ZOTERO_BRIDGE_SCOPE?: string;
};

export type SkillRunnerBackendLocality = "local" | "remote";

export type SkillRunnerHostBridgeEnvResult =
  | {
      ok: true;
      env: SkillRunnerHostBridgeEnv;
      endpoint: string;
      connectionMode: SkillRunnerBackendLocality;
      details?: Record<string, unknown>;
    }
  | {
      ok: false;
      code: string;
      message: string;
      details?: Record<string, unknown>;
    };

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function normalizeHost(value: unknown) {
  return normalizeString(value).toLowerCase();
}

function isLoopbackOrWildcardHost(host: string) {
  const normalized = normalizeHost(host).replace(/^\[|\]$/g, "");
  return (
    normalized === "localhost" ||
    normalized === "0.0.0.0" ||
    normalized === "::" ||
    normalized === "::1" ||
    normalized === "127.0.0.1" ||
    normalized.startsWith("127.")
  );
}

function buildEndpoint(host: string, port: number) {
  return `http://${host}:${port}/bridge/v1`;
}

export function buildSkillRunnerHostBridgeScopeEnv(requestIdRaw: unknown) {
  const requestId = normalizeString(requestIdRaw);
  if (!requestId) {
    return "";
  }
  return JSON.stringify({
    kind: "skillrunner-run",
    requestId,
    runId: requestId,
  });
}

function extractBackendHost(backendUrl: unknown) {
  const raw = normalizeString(backendUrl);
  if (!raw) {
    throw new Error("SkillRunner backend URL is required for Host Bridge env injection");
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("SkillRunner backend URL is invalid for Host Bridge env injection");
  }
  return parsed.hostname.replace(/^\[|\]$/g, "");
}

export function classifySkillRunnerBackendLocality(
  backendUrl: unknown,
): SkillRunnerBackendLocality {
  const hostname = normalizeHost(extractBackendHost(backendUrl));
  if (
    hostname === "localhost" ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("127.")
  ) {
    return "local";
  }
  return "remote";
}

function buildLocalSkillRunnerHostBridgeRuntimeEnv(args: {
  status: HostBridgeStatusSnapshot;
  token: string;
}): SkillRunnerHostBridgeEnvResult {
  const endpoint = normalizeString(args.status.endpoint);
  if (!endpoint || !endpoint.includes("/bridge/v1")) {
    return {
      ok: false,
      code: "host_bridge_local_endpoint_unavailable",
      message:
        "Host Bridge local endpoint is unavailable for SkillRunner env injection.",
      details: {
        endpoint,
      },
    };
  }
  return {
    ok: true,
    endpoint,
    connectionMode: "local",
    details: {
      locality: "local",
      endpoint,
      advertisedHostSource: args.status.advertisedHostSource || "placeholder",
    },
    env: {
      ZOTERO_BRIDGE_ENDPOINT: endpoint,
      ZOTERO_BRIDGE_TOKEN: args.token,
      ZOTERO_BRIDGE_CONNECTION_MODE: "local",
    },
  };
}

async function buildRemoteSkillRunnerHostBridgeRuntimeEnv(args: {
  status: HostBridgeStatusSnapshot;
  token: string;
  backendUrl?: string;
  detectAdvertisedHost?: typeof detectHostBridgeAdvertisedHostForBackend;
}): Promise<SkillRunnerHostBridgeEnvResult> {
  const status = args.status;
  const advertisedHost = normalizeString(status.advertisedHost);
  const backendUrl = normalizeString(args.backendUrl);
  const backendHost = backendUrl ? extractBackendHost(backendUrl) : "";
  const baseDetails = {
    locality: "remote",
    backendUrl,
    backendHost,
    bindMode: status.bindMode,
    lanEnabled: status.lanEnabled,
    pinPortEnabled: status.pinPortEnabled,
    pinnedPort: status.pinnedPort,
    advertisedHost,
    advertisedHostSource: status.advertisedHostSource || "placeholder",
    remoteEndpoint: normalizeString(status.remoteEndpoint),
    remoteEndpointUsesPlaceholder: status.remoteEndpointUsesPlaceholder,
  };

  if (status.lanEnabled !== true || status.bindMode !== "lan") {
    return {
      ok: false,
      code: "host_bridge_remote_lan_disabled",
      message:
        "Host Bridge LAN access must be enabled before submitting Zotero host access to a remote SkillRunner backend.",
      details: {
        ...baseDetails,
      },
    };
  }
  if (status.pinPortEnabled !== true || !status.pinnedPort) {
    return {
      ok: false,
      code: "host_bridge_remote_pinned_port_required",
      message:
        "Host Bridge remote SkillRunner access requires a fixed pinned port.",
      details: {
        ...baseDetails,
      },
    };
  }

  let resolvedAdvertisedHost = advertisedHost;
  let advertisedHostSource: "manual" | "auto" = "manual";
  let detection: HostBridgeAdvertisedHostDetectionResult | undefined;
  if (
    !resolvedAdvertisedHost ||
    status.remoteEndpointUsesPlaceholder === true ||
    resolvedAdvertisedHost === "<zotero-host-ip>"
  ) {
    const detect =
      args.detectAdvertisedHost || detectHostBridgeAdvertisedHostForBackend;
    detection = await detect({ backendUrl });
    if (!detection.ok) {
      return {
        ok: false,
        code: detection.code || "host_bridge_remote_advertised_host_missing",
        message:
          detection.message ||
          "Host Bridge remote SkillRunner access requires a concrete advertised host.",
        details: {
          ...baseDetails,
          advertisedHostSource: "auto",
          detection: detection.diagnostics,
        },
      };
    }
    resolvedAdvertisedHost = detection.host;
    advertisedHostSource = "auto";
  }

  if (isLoopbackOrWildcardHost(resolvedAdvertisedHost)) {
    return {
      ok: false,
      code: "host_bridge_remote_advertised_host_unreachable",
      message:
        "Host Bridge advertised host for remote SkillRunner access must not be loopback or wildcard.",
      details: {
        ...baseDetails,
        advertisedHost: resolvedAdvertisedHost,
        advertisedHostSource,
        detection: detection?.diagnostics,
      },
    };
  }
  const endpoint = buildEndpoint(resolvedAdvertisedHost, Number(status.pinnedPort));
  if (!endpoint || !endpoint.includes("/bridge/v1")) {
    return {
      ok: false,
      code: "host_bridge_remote_endpoint_unavailable",
      message:
        "Host Bridge remote endpoint is unavailable for SkillRunner env injection.",
      details: {
        ...baseDetails,
        endpoint,
        advertisedHost: resolvedAdvertisedHost,
        advertisedHostSource,
        detection: detection?.diagnostics,
      },
    };
  }

  return {
    ok: true,
    endpoint,
    connectionMode: "remote",
    details: {
      ...baseDetails,
      endpoint,
      advertisedHost: resolvedAdvertisedHost,
      advertisedHostSource,
      detection: detection?.diagnostics,
    },
    env: {
      ZOTERO_BRIDGE_ENDPOINT: endpoint,
      ZOTERO_BRIDGE_TOKEN: args.token,
      ZOTERO_BRIDGE_CONNECTION_MODE: "remote",
    },
  };
}

export async function buildSkillRunnerHostBridgeRuntimeEnv(args?: {
  status?: HostBridgeStatusSnapshot;
  token?: string;
  backendUrl?: string;
  detectAdvertisedHost?: typeof detectHostBridgeAdvertisedHostForBackend;
}): Promise<SkillRunnerHostBridgeEnvResult> {
  const status = args?.status || getHostBridgeServerStatus();
  const token = normalizeString(args?.token ?? getHostBridgeToken());
  if (!token) {
    return {
      ok: false,
      code: "host_bridge_token_unavailable",
      message: "Host Bridge token is unavailable for SkillRunner env injection.",
    };
  }

  let locality: SkillRunnerBackendLocality;
  try {
    locality = classifySkillRunnerBackendLocality(args?.backendUrl);
  } catch (error) {
    return {
      ok: false,
      code: "skillrunner_backend_url_invalid",
      message: error instanceof Error ? error.message : String(error),
      details: {
        backendUrl: normalizeString(args?.backendUrl),
      },
    };
  }

  return locality === "local"
    ? buildLocalSkillRunnerHostBridgeRuntimeEnv({ status, token })
    : buildRemoteSkillRunnerHostBridgeRuntimeEnv({
        status,
        token,
        backendUrl: args?.backendUrl,
        detectAdvertisedHost: args?.detectAdvertisedHost,
      });
}
