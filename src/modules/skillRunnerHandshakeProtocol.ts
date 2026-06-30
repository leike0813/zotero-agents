import { version as pluginVersion } from "../../package.json";
import {
  DEFAULT_REQUEST_KIND_BY_BACKEND_TYPE,
  DEFAULT_BACKEND_TYPE,
  SKILLRUNNER_SEQUENCE_REQUEST_KIND,
} from "../config/defaults";

export const SKILLRUNNER_HANDSHAKE_REQUEST_SCHEMA =
  "zotero-agents.skillrunner-handshake.request.v1";

export const SKILLRUNNER_HANDSHAKE_RESPONSE_SCHEMA =
  "zotero-agents.skillrunner-handshake.response.v1";

export const SKILLRUNNER_JOB_PROTOCOL =
  DEFAULT_REQUEST_KIND_BY_BACKEND_TYPE[DEFAULT_BACKEND_TYPE];

export const SKILLRUNNER_SEQUENCE_PROTOCOL = SKILLRUNNER_SEQUENCE_REQUEST_KIND;

export const SKILLRUNNER_HANDSHAKE_REQUESTED_PROTOCOLS = [
  SKILLRUNNER_JOB_PROTOCOL,
  SKILLRUNNER_SEQUENCE_PROTOCOL,
] as const;

export type SkillRunnerProtocolId =
  | (typeof SKILLRUNNER_HANDSHAKE_REQUESTED_PROTOCOLS)[number]
  | string;

export type SkillRunnerHandshakeRequest = {
  schema: typeof SKILLRUNNER_HANDSHAKE_REQUEST_SCHEMA;
  client: {
    name: "zotero-agents";
    version: string;
  };
  requested_protocols: string[];
};

export type SkillRunnerHandshakeProtocolSupport = {
  supported: boolean;
};

export type SkillRunnerHandshakeResponse = {
  schema: typeof SKILLRUNNER_HANDSHAKE_RESPONSE_SCHEMA;
  backend?: {
    name?: string;
    version?: string;
  };
  protocols: Record<string, SkillRunnerHandshakeProtocolSupport>;
};

export type SkillRunnerBackendCapabilities = {
  source: "remote" | "legacy-fallback";
  backend?: {
    name?: string;
    version?: string;
  };
  protocols: Record<string, SkillRunnerHandshakeProtocolSupport>;
};

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function buildSkillRunnerHandshakeRequest(args?: {
  pluginVersion?: string;
  requestedProtocols?: readonly string[];
}): SkillRunnerHandshakeRequest {
  const requestedProtocols =
    args?.requestedProtocols && args.requestedProtocols.length > 0
      ? args.requestedProtocols
      : SKILLRUNNER_HANDSHAKE_REQUESTED_PROTOCOLS;
  const normalizedProtocols = Array.from(
    new Set(
      requestedProtocols
        .map((entry) => normalizeString(entry))
        .filter((entry) => entry.length > 0),
    ),
  );
  return {
    schema: SKILLRUNNER_HANDSHAKE_REQUEST_SCHEMA,
    client: {
      name: "zotero-agents",
      version: normalizeString(args?.pluginVersion) || pluginVersion,
    },
    requested_protocols: normalizedProtocols,
  };
}

export function normalizeSkillRunnerHandshakeResponse(
  body: unknown,
): SkillRunnerBackendCapabilities {
  if (!isObject(body)) {
    throw new Error("skillrunner handshake response must be object");
  }
  const schema = normalizeString(body.schema);
  if (schema !== SKILLRUNNER_HANDSHAKE_RESPONSE_SCHEMA) {
    throw new Error("skillrunner handshake response schema is unsupported");
  }
  const backend = isObject(body.backend)
    ? {
        name: normalizeString(body.backend.name) || undefined,
        version: normalizeString(body.backend.version) || undefined,
      }
    : undefined;
  const rawProtocols = isObject(body.protocols) ? body.protocols : {};
  const protocols: Record<string, SkillRunnerHandshakeProtocolSupport> = {};
  for (const [protocolId, value] of Object.entries(rawProtocols)) {
    const normalizedProtocolId = normalizeString(protocolId);
    if (!normalizedProtocolId || !isObject(value)) {
      continue;
    }
    protocols[normalizedProtocolId] = {
      supported: value.supported === true,
    };
  }
  return {
    source: "remote",
    ...(backend?.name || backend?.version ? { backend } : {}),
    protocols,
  };
}

export function createLegacySkillRunnerCapabilities(): SkillRunnerBackendCapabilities {
  return {
    source: "legacy-fallback",
    backend: {
      name: "Skill-Runner",
    },
    protocols: {
      [SKILLRUNNER_JOB_PROTOCOL]: {
        supported: true,
      },
      [SKILLRUNNER_SEQUENCE_PROTOCOL]: {
        supported: false,
      },
    },
  };
}

export function listSupportedSkillRunnerProtocols(
  capabilities: SkillRunnerBackendCapabilities,
) {
  return Object.entries(capabilities.protocols)
    .filter(([, support]) => support.supported === true)
    .map(([protocolId]) => protocolId)
    .sort();
}

export function isSkillRunnerProtocolSupported(args: {
  capabilities: SkillRunnerBackendCapabilities;
  protocolId: string;
}) {
  const protocolId = normalizeString(args.protocolId);
  if (!protocolId) {
    return false;
  }
  return args.capabilities.protocols[protocolId]?.supported === true;
}
