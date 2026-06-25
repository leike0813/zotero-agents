import { getPref, setPref } from "../../utils/prefs";
import {
  createDefaultSynthesisWebDavHttpClient,
  sanitizeWebDavUrl,
  webDavCredentialForRequest,
  webDavRemoteUrl,
  type SynthesisWebDavHttpClient,
} from "./webDavSyncClient";
import { storeSynthesisWebDavSyncCredential } from "./webDavSyncCredentialPrefs";

export type SynthesisWebDavSyncConfigStatus =
  | "disabled"
  | "incomplete"
  | "configured"
  | "invalid";

export type SynthesisWebDavSyncDiagnostic = {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  details?: unknown;
};

export type SynthesisWebDavSyncPrefsStatus = {
  enabled: boolean;
  base_url: string;
  remote_path: string;
  username: string;
  auto_sync_enabled: boolean;
  auto_retry_enabled: boolean;
  credential_configured: boolean;
  credential_updated_at?: string;
  config_status: SynthesisWebDavSyncConfigStatus;
  diagnostics: SynthesisWebDavSyncDiagnostic[];
  connection_test?: SynthesisWebDavSyncConnectionTestResult;
};

export type SynthesisWebDavSyncPrefsSaveInput = {
  enabled?: boolean;
  baseUrl?: string;
  remotePath?: string;
  username?: string;
  autoSyncEnabled?: boolean;
  autoRetryEnabled?: boolean;
};

export type SynthesisWebDavSyncConnectionTestResult = {
  ok: boolean;
  tested_at: string;
  config_status: SynthesisWebDavSyncConfigStatus;
  diagnostics: SynthesisWebDavSyncDiagnostic[];
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function nowIso() {
  return new Date().toISOString();
}

function diagnostic(args: {
  code: string;
  severity?: "info" | "warning" | "error";
  message: unknown;
  details?: unknown;
}): SynthesisWebDavSyncDiagnostic {
  return {
    code: cleanString(args.code),
    severity: args.severity || "warning",
    message: sanitizeWebDavUrl(String(args.message || "")),
    details:
      args.details === undefined
        ? undefined
        : JSON.parse(
            JSON.stringify(args.details, (_key, value) =>
              typeof value === "string" ? sanitizeWebDavUrl(value) : value,
            ),
          ),
  };
}

function normalizeRemotePath(value: unknown) {
  return cleanString(value)
    .replace(/\\/g, "/")
    .replace(/^\/+/g, "")
    .replace(/\/+$/g, "");
}

function remotePathInvalid(path: string) {
  return (
    !path ||
    path
      .split("/")
      .some((segment) => !segment || segment === "." || segment === "..")
  );
}

function configStatus(config: {
  enabled: boolean;
  baseUrl: string;
  remotePath: string;
}): Pick<SynthesisWebDavSyncPrefsStatus, "config_status" | "diagnostics"> {
  if (!config.enabled) {
    return {
      config_status: "disabled",
      diagnostics: [
        diagnostic({
          code: "webdav_sync_disabled",
          severity: "info",
          message: "WebDAV Sync is disabled.",
        }),
      ],
    };
  }
  if (!config.baseUrl || !config.remotePath) {
    return {
      config_status: "incomplete",
      diagnostics: [
        diagnostic({
          code: "webdav_sync_not_configured",
          severity: "warning",
          message: "WebDAV Sync base URL and remote path are required.",
        }),
      ],
    };
  }
  if (!/^https?:\/\//i.test(config.baseUrl)) {
    return {
      config_status: "invalid",
      diagnostics: [
        diagnostic({
          code: "webdav_sync_base_url_invalid",
          severity: "error",
          message: "WebDAV Sync base URL must be HTTP or HTTPS.",
        }),
      ],
    };
  }
  if (remotePathInvalid(config.remotePath)) {
    return {
      config_status: "invalid",
      diagnostics: [
        diagnostic({
          code: "webdav_sync_remote_path_invalid",
          severity: "error",
          message: "WebDAV Sync remote path is invalid.",
        }),
      ],
    };
  }
  return { config_status: "configured", diagnostics: [] };
}

function readConnectionTestPref() {
  const raw = cleanString(getPref("synthesisWebDavSyncConnectionTestJson"));
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw) as SynthesisWebDavSyncConnectionTestResult;
    return parsed && typeof parsed === "object" ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function writeConnectionTestPref(
  result: SynthesisWebDavSyncConnectionTestResult,
) {
  setPref("synthesisWebDavSyncConnectionTestJson", JSON.stringify(result));
}

function clearConnectionTestPref() {
  setPref("synthesisWebDavSyncConnectionTestJson", "");
}

export function getSynthesisWebDavSyncPrefsConfig() {
  return {
    enabled: getPref("synthesisWebDavSyncEnabled") === true,
    baseUrl: cleanString(getPref("synthesisWebDavSyncBaseUrl")),
    remotePath:
      normalizeRemotePath(getPref("synthesisWebDavSyncRemotePath")) ||
      "zotero-agents",
    username: cleanString(getPref("synthesisWebDavSyncUsername")),
    autoSyncEnabled: getPref("synthesisWebDavSyncAutoSyncEnabled") === true,
    autoRetryEnabled: getPref("synthesisWebDavSyncAutoRetryEnabled") === true,
  };
}

export function getWebDavSyncPrefsStatus(): SynthesisWebDavSyncPrefsStatus {
  const config = getSynthesisWebDavSyncPrefsConfig();
  const status = configStatus(config);
  if (cleanString(getPref("synthesisWebDavSyncCredentialMasked"))) {
    setPref("synthesisWebDavSyncCredentialMasked", "");
  }
  const credentialUpdatedAt = cleanString(
    getPref("synthesisWebDavSyncCredentialUpdatedAt"),
  );
  return {
    enabled: config.enabled,
    base_url: sanitizeWebDavUrl(config.baseUrl),
    remote_path: config.remotePath,
    username: config.username,
    auto_sync_enabled: config.autoSyncEnabled,
    auto_retry_enabled: config.autoRetryEnabled,
    credential_configured: Boolean(
      cleanString(getPref("synthesisWebDavSyncCredentialEncryptedJson")),
    ),
    credential_updated_at: credentialUpdatedAt || undefined,
    config_status: status.config_status,
    diagnostics: status.diagnostics,
    connection_test: readConnectionTestPref(),
  };
}

export function saveWebDavSyncPrefs(input: SynthesisWebDavSyncPrefsSaveInput) {
  const existing = getSynthesisWebDavSyncPrefsConfig();
  const baseUrl = cleanString(input.baseUrl);
  const remotePath = normalizeRemotePath(input.remotePath);
  const candidate = {
    ...existing,
    enabled:
      input.enabled === undefined ? existing.enabled : input.enabled === true,
    baseUrl: input.baseUrl === undefined ? existing.baseUrl : baseUrl,
    remotePath:
      input.remotePath === undefined ? existing.remotePath : remotePath,
  };
  const status = configStatus(candidate);
  if (status.config_status === "invalid") {
    return {
      ok: false as const,
      status: getWebDavSyncPrefsStatus(),
      diagnostics: status.diagnostics,
    };
  }
  if (input.enabled !== undefined) {
    setPref("synthesisWebDavSyncEnabled", input.enabled === true);
  }
  if (input.baseUrl !== undefined) {
    setPref("synthesisWebDavSyncBaseUrl", baseUrl);
  }
  if (input.remotePath !== undefined) {
    setPref("synthesisWebDavSyncRemotePath", remotePath || "zotero-agents");
  }
  if (input.username !== undefined) {
    setPref("synthesisWebDavSyncUsername", cleanString(input.username));
  }
  if (input.autoSyncEnabled !== undefined) {
    setPref(
      "synthesisWebDavSyncAutoSyncEnabled",
      input.autoSyncEnabled === true,
    );
  }
  if (input.autoRetryEnabled !== undefined) {
    setPref(
      "synthesisWebDavSyncAutoRetryEnabled",
      input.autoRetryEnabled === true,
    );
  }
  clearConnectionTestPref();
  return {
    ok: true as const,
    status: getWebDavSyncPrefsStatus(),
    diagnostics: [] as SynthesisWebDavSyncDiagnostic[],
  };
}

export async function saveWebDavSyncCredential(credential: string) {
  const result = await storeSynthesisWebDavSyncCredential(credential);
  clearConnectionTestPref();
  return { ok: true as const, result, status: getWebDavSyncPrefsStatus() };
}

export async function clearWebDavSyncCredential() {
  const result = await storeSynthesisWebDavSyncCredential("");
  clearConnectionTestPref();
  return { ok: true as const, result, status: getWebDavSyncPrefsStatus() };
}

export async function testWebDavSyncConfiguration(
  args: {
    client?: SynthesisWebDavHttpClient;
  } = {},
): Promise<SynthesisWebDavSyncConnectionTestResult> {
  const config = getSynthesisWebDavSyncPrefsConfig();
  const status = configStatus(config);
  const diagnostics = [...status.diagnostics];
  if (status.config_status !== "configured") {
    const result = {
      ok: false,
      tested_at: nowIso(),
      config_status: status.config_status,
      diagnostics,
    };
    writeConnectionTestPref(result);
    return result;
  }
  const client = args.client || createDefaultSynthesisWebDavHttpClient();
  const credential = await webDavCredentialForRequest();
  try {
    const response = await client.request({
      method: "PROPFIND",
      url: webDavRemoteUrl({
        baseUrl: config.baseUrl,
        remotePath: config.remotePath,
      }),
      username: config.username,
      credential,
      headers: { Depth: "0" },
    });
    if (response.status === 401 || response.status === 403) {
      diagnostics.push(
        diagnostic({
          code: "webdav_sync_auth_failed",
          severity: "error",
          message: "WebDAV Sync authentication failed.",
          details: { status: response.status, body: response.text },
        }),
      );
    } else if (response.status >= 500 || response.status === 0) {
      diagnostics.push(
        diagnostic({
          code: "webdav_sync_remote_unreachable",
          severity: "error",
          message: "WebDAV Sync remote is unreachable.",
          details: { status: response.status, body: response.text },
        }),
      );
    }
  } catch (error) {
    diagnostics.push(
      diagnostic({
        code: "webdav_sync_remote_unreachable",
        severity: "error",
        message: error instanceof Error ? error.message : String(error),
      }),
    );
  }
  const result = {
    ok: !diagnostics.some((entry) => entry.severity === "error"),
    tested_at: nowIso(),
    config_status: status.config_status,
    diagnostics,
  };
  writeConnectionTestPref(result);
  return result;
}
