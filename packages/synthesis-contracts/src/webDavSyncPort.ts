import {
  SynthesisClientError,
  assertSynthesisExactFields,
  toSynthesisJsonObject,
  type SynthesisJsonObject,
} from "./common.js";

export const SYNTHESIS_HOST_WEBDAV_SYNC_TEXT_BYTES_MAX = 4 * 1024 * 1024;
export const SYNTHESIS_HOST_WEBDAV_SYNC_DIAGNOSTICS_MAX = 20 as const;

const PATH_MAX = 1024;
const STRING_MAX = 4096;
const DIAGNOSTIC_MAX = 512;

export type SynthesisHostWebDavSyncConfigStatus =
  | "disabled"
  | "incomplete"
  | "configured"
  | "invalid";

export type SynthesisHostWebDavSyncDescription = {
  status: "available" | "disabled" | "unavailable";
  configStatus: SynthesisHostWebDavSyncConfigStatus;
  autoSyncEnabled: boolean;
  autoRetryEnabled: boolean;
  baseUrl: string;
  remotePath: string;
  username: string;
  credentialUpdatedAt?: string;
  connectionTest?: SynthesisHostWebDavSyncConnectionTest;
  diagnostics: string[];
};

export type SynthesisHostWebDavSyncConnectionTest = {
  ok: boolean;
  tested_at: string;
  config_status: SynthesisHostWebDavSyncConfigStatus;
  diagnostics: Array<{
    code: string;
    severity: "info" | "warning" | "error";
    message: string;
    details?: { status?: number; body?: string };
  }>;
};

export type SynthesisHostWebDavSyncReadRequest = { path: string };
export type SynthesisHostWebDavSyncReadResult =
  | { status: "available"; text: string; etag?: string; diagnostics: [] }
  | { status: "missing"; diagnostics: [] }
  | { status: "unavailable"; diagnostics: string[] };

export type SynthesisHostWebDavSyncWriteRequest = {
  path: string;
  text: string;
  ifMatch?: string;
};
export type SynthesisHostWebDavSyncWriteResult =
  | { status: "written"; etag?: string; diagnostics: [] }
  | { status: "conflict"; diagnostics: string[] }
  | { status: "unavailable"; diagnostics: string[] };

export type SynthesisHostWebDavSyncEnsureCollectionRequest = { path: string };
export type SynthesisHostWebDavSyncEnsureCollectionResult =
  | { status: "ready"; diagnostics: [] }
  | { status: "unavailable"; diagnostics: string[] };

export interface SynthesisHostWebDavSyncPort {
  describe(): Promise<SynthesisHostWebDavSyncDescription>;
  readText(
    request: SynthesisHostWebDavSyncReadRequest,
  ): Promise<SynthesisHostWebDavSyncReadResult>;
  writeText(
    request: SynthesisHostWebDavSyncWriteRequest,
  ): Promise<SynthesisHostWebDavSyncWriteResult>;
  ensureCollection(
    request: SynthesisHostWebDavSyncEnsureCollectionRequest,
  ): Promise<SynthesisHostWebDavSyncEnsureCollectionResult>;
}

function invalid(message: string): never {
  throw new SynthesisClientError("invalid_request", message);
}

function stringValue(
  value: unknown,
  location: string,
  options: { allowEmpty?: boolean; max?: number } = {},
) {
  if (typeof value !== "string") {
    return invalid(`${location} must be a string`);
  }
  const normalized = value.trim();
  const hasControlCharacter = Array.from(normalized).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 0x1f || code === 0x7f;
  });
  if (
    normalized !== value ||
    (!options.allowEmpty && !normalized) ||
    normalized.length > (options.max || STRING_MAX) ||
    hasControlCharacter
  ) {
    return invalid(`${location} is invalid`);
  }
  return normalized;
}

function optionalString(
  json: SynthesisJsonObject,
  field: string,
  max = STRING_MAX,
) {
  return json[field] === undefined
    ? undefined
    : stringValue(json[field], field, { max });
}

function diagnostics(value: unknown, allowEmpty: boolean) {
  if (
    !Array.isArray(value) ||
    value.length > SYNTHESIS_HOST_WEBDAV_SYNC_DIAGNOSTICS_MAX ||
    (!allowEmpty && value.length === 0)
  ) {
    return invalid("WebDAV Sync diagnostics are invalid");
  }
  return value.map((entry, index) =>
    stringValue(entry, `diagnostics[${index}]`, { max: DIAGNOSTIC_MAX }),
  );
}

function emptyDiagnostics(value: unknown): [] {
  if (diagnostics(value, true).length !== 0) {
    return invalid("WebDAV Sync success diagnostics must be empty");
  }
  return [];
}

function configStatus(value: unknown): SynthesisHostWebDavSyncConfigStatus {
  if (
    value === "disabled" ||
    value === "incomplete" ||
    value === "configured" ||
    value === "invalid"
  ) {
    return value;
  }
  return invalid("WebDAV Sync configStatus is invalid");
}

function booleanValue(value: unknown, location: string) {
  if (typeof value !== "boolean") {
    return invalid(`${location} must be a boolean`);
  }
  return value;
}

function rebuildConnectionTest(
  value: unknown,
): SynthesisHostWebDavSyncConnectionTest {
  const json = toSynthesisJsonObject(value, "connectionTest");
  assertSynthesisExactFields(
    json,
    ["ok", "tested_at", "config_status", "diagnostics"],
    [],
    "connectionTest",
  );
  if (!Array.isArray(json.diagnostics) || json.diagnostics.length > 20) {
    return invalid("connectionTest.diagnostics is invalid");
  }
  return {
    ok: booleanValue(json.ok, "connectionTest.ok"),
    tested_at: stringValue(json.tested_at, "connectionTest.tested_at", {
      max: 64,
    }),
    config_status: configStatus(json.config_status),
    diagnostics: json.diagnostics.map((entry, index) => {
      const location = `connectionTest.diagnostics[${index}]`;
      const diagnostic = toSynthesisJsonObject(entry, location);
      assertSynthesisExactFields(
        diagnostic,
        ["code", "severity", "message"],
        ["details"],
        location,
      );
      if (
        diagnostic.severity !== "info" &&
        diagnostic.severity !== "warning" &&
        diagnostic.severity !== "error"
      ) {
        return invalid(`${location}.severity is invalid`);
      }
      const details =
        diagnostic.details === undefined
          ? undefined
          : toSynthesisJsonObject(diagnostic.details, `${location}.details`);
      if (details) {
        assertSynthesisExactFields(
          details,
          [],
          ["status", "body"],
          `${location}.details`,
        );
        if (
          details.status !== undefined &&
          (!Number.isSafeInteger(details.status) || Number(details.status) < 0)
        ) {
          return invalid(`${location}.details.status is invalid`);
        }
      }
      return {
        code: stringValue(diagnostic.code, `${location}.code`, { max: 512 }),
        severity: diagnostic.severity,
        message: stringValue(diagnostic.message, `${location}.message`, {
          allowEmpty: true,
          max: 4096,
        }),
        ...(details
          ? {
              details: {
                ...(details.status === undefined
                  ? {}
                  : { status: Number(details.status) }),
                ...(details.body === undefined
                  ? {}
                  : {
                      body: stringValue(
                        details.body,
                        `${location}.details.body`,
                        {
                          allowEmpty: true,
                          max: 4096,
                        },
                      ),
                    }),
              },
            }
          : {}),
      };
    }),
  };
}

function managedPath(value: unknown, location: string) {
  const path = stringValue(value, location, { max: PATH_MAX });
  const segments = path.split("/");
  if (
    path.startsWith("/") ||
    path.includes("\\") ||
    /^[A-Za-z]:/.test(path) ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    return invalid(`${location} must be a managed relative path`);
  }
  return path;
}

function utf8Bytes(value: string) {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x7f) bytes += 1;
    else if (code <= 0x7ff) bytes += 2;
    else if (
      code >= 0xd800 &&
      code <= 0xdbff &&
      index + 1 < value.length &&
      value.charCodeAt(index + 1) >= 0xdc00 &&
      value.charCodeAt(index + 1) <= 0xdfff
    ) {
      bytes += 4;
      index += 1;
    } else bytes += 3;
  }
  return bytes;
}

function boundedText(value: unknown, location: string) {
  if (typeof value !== "string") {
    return invalid(`${location} must be a string`);
  }
  if (utf8Bytes(value) > SYNTHESIS_HOST_WEBDAV_SYNC_TEXT_BYTES_MAX) {
    return invalid(`${location} exceeds the WebDAV Sync byte limit`);
  }
  return value;
}

function safeBaseUrl(value: unknown, status: string) {
  const baseUrl = stringValue(value, "baseUrl", { allowEmpty: true });
  if (!baseUrl) {
    if (status === "available") {
      return invalid("Available WebDAV Sync description requires baseUrl");
    }
    return "";
  }
  const authority = /^https?:\/\/([^/?#\s]+)/i.exec(baseUrl)?.[1] || "";
  if (
    !authority ||
    authority.includes("@") ||
    /[?&](?:token|password|secret|access_token|api_key)=/i.test(baseUrl)
  ) {
    return invalid("WebDAV Sync baseUrl is unsafe");
  }
  return baseUrl;
}

export function rebuildSynthesisHostWebDavSyncDescription(
  value: unknown,
): SynthesisHostWebDavSyncDescription {
  const json = toSynthesisJsonObject(value, "webDavSyncDescription");
  assertSynthesisExactFields(
    json,
    [
      "status",
      "configStatus",
      "autoSyncEnabled",
      "autoRetryEnabled",
      "baseUrl",
      "remotePath",
      "username",
      "diagnostics",
    ],
    ["credentialUpdatedAt", "connectionTest"],
    "webDavSyncDescription",
  );
  if (
    json.status !== "available" &&
    json.status !== "disabled" &&
    json.status !== "unavailable"
  ) {
    return invalid("WebDAV Sync description status is invalid");
  }
  const status = json.status;
  const rebuiltDiagnostics = diagnostics(
    json.diagnostics,
    status === "available",
  );
  if (status === "available" && rebuiltDiagnostics.length !== 0) {
    return invalid("Available WebDAV Sync description cannot have diagnostics");
  }
  const rebuiltStatus = configStatus(json.configStatus);
  if (status === "available" && rebuiltStatus !== "configured") {
    return invalid("Available WebDAV Sync description must be configured");
  }
  const credentialUpdatedAt = optionalString(json, "credentialUpdatedAt", 64);
  const connectionTest =
    json.connectionTest === undefined
      ? undefined
      : rebuildConnectionTest(json.connectionTest);
  return {
    status,
    configStatus: rebuiltStatus,
    autoSyncEnabled: booleanValue(json.autoSyncEnabled, "autoSyncEnabled"),
    autoRetryEnabled: booleanValue(json.autoRetryEnabled, "autoRetryEnabled"),
    baseUrl: safeBaseUrl(json.baseUrl, status),
    remotePath: stringValue(json.remotePath, "remotePath", {
      allowEmpty: status !== "available",
      max: PATH_MAX,
    }),
    username: stringValue(json.username, "username", { allowEmpty: true }),
    ...(credentialUpdatedAt ? { credentialUpdatedAt } : {}),
    ...(connectionTest ? { connectionTest } : {}),
    diagnostics: rebuiltDiagnostics,
  };
}

export function rebuildSynthesisHostWebDavSyncReadRequest(
  value: unknown,
): SynthesisHostWebDavSyncReadRequest {
  const json = toSynthesisJsonObject(value, "webDavSyncReadRequest");
  assertSynthesisExactFields(json, ["path"], [], "webDavSyncReadRequest");
  return { path: managedPath(json.path, "path") };
}

export function rebuildSynthesisHostWebDavSyncReadResult(
  value: unknown,
): SynthesisHostWebDavSyncReadResult {
  const json = toSynthesisJsonObject(value, "webDavSyncReadResult");
  if (json.status === "available") {
    assertSynthesisExactFields(
      json,
      ["status", "text", "diagnostics"],
      ["etag"],
      "webDavSyncReadResult",
    );
    const etag = optionalString(json, "etag", 1024);
    return {
      status: "available",
      text: boundedText(json.text, "text"),
      ...(etag ? { etag } : {}),
      diagnostics: emptyDiagnostics(json.diagnostics),
    };
  }
  if (json.status === "missing") {
    assertSynthesisExactFields(
      json,
      ["status", "diagnostics"],
      [],
      "webDavSyncReadResult",
    );
    return {
      status: "missing",
      diagnostics: emptyDiagnostics(json.diagnostics),
    };
  }
  if (json.status === "unavailable") {
    assertSynthesisExactFields(
      json,
      ["status", "diagnostics"],
      [],
      "webDavSyncReadResult",
    );
    return {
      status: "unavailable",
      diagnostics: diagnostics(json.diagnostics, false),
    };
  }
  return invalid("WebDAV Sync read status is invalid");
}

export function rebuildSynthesisHostWebDavSyncWriteRequest(
  value: unknown,
): SynthesisHostWebDavSyncWriteRequest {
  const json = toSynthesisJsonObject(value, "webDavSyncWriteRequest");
  assertSynthesisExactFields(
    json,
    ["path", "text"],
    ["ifMatch"],
    "webDavSyncWriteRequest",
  );
  const ifMatch = optionalString(json, "ifMatch", 1024);
  return {
    path: managedPath(json.path, "path"),
    text: boundedText(json.text, "text"),
    ...(ifMatch ? { ifMatch } : {}),
  };
}

export function rebuildSynthesisHostWebDavSyncWriteResult(
  value: unknown,
): SynthesisHostWebDavSyncWriteResult {
  const json = toSynthesisJsonObject(value, "webDavSyncWriteResult");
  if (json.status === "written") {
    assertSynthesisExactFields(
      json,
      ["status", "diagnostics"],
      ["etag"],
      "webDavSyncWriteResult",
    );
    const etag = optionalString(json, "etag", 1024);
    return {
      status: "written",
      ...(etag ? { etag } : {}),
      diagnostics: emptyDiagnostics(json.diagnostics),
    };
  }
  if (json.status === "conflict" || json.status === "unavailable") {
    assertSynthesisExactFields(
      json,
      ["status", "diagnostics"],
      [],
      "webDavSyncWriteResult",
    );
    return {
      status: json.status,
      diagnostics: diagnostics(json.diagnostics, false),
    };
  }
  return invalid("WebDAV Sync write status is invalid");
}

export function rebuildSynthesisHostWebDavSyncEnsureCollectionRequest(
  value: unknown,
): SynthesisHostWebDavSyncEnsureCollectionRequest {
  const json = toSynthesisJsonObject(value, "webDavSyncCollectionRequest");
  assertSynthesisExactFields(json, ["path"], [], "webDavSyncCollectionRequest");
  return { path: managedPath(json.path, "path") };
}

export function rebuildSynthesisHostWebDavSyncEnsureCollectionResult(
  value: unknown,
): SynthesisHostWebDavSyncEnsureCollectionResult {
  const json = toSynthesisJsonObject(value, "webDavSyncCollectionResult");
  if (json.status === "ready") {
    assertSynthesisExactFields(
      json,
      ["status", "diagnostics"],
      [],
      "webDavSyncCollectionResult",
    );
    return { status: "ready", diagnostics: emptyDiagnostics(json.diagnostics) };
  }
  if (json.status === "unavailable") {
    assertSynthesisExactFields(
      json,
      ["status", "diagnostics"],
      [],
      "webDavSyncCollectionResult",
    );
    return {
      status: "unavailable",
      diagnostics: diagnostics(json.diagnostics, false),
    };
  }
  return invalid("WebDAV Sync collection status is invalid");
}
