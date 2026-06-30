import type { BackendInstance } from "../backends/types";
import { DEFAULT_BACKEND_TYPE } from "../config/defaults";
import { getSkillRunnerHttpStatus } from "../providers/skillrunner/errors";
import type { SkillRunnerManagementClient } from "../providers/skillrunner/managementClient";
import {
  createLegacySkillRunnerCapabilities,
  isSkillRunnerProtocolSupported,
  listSupportedSkillRunnerProtocols,
  SKILLRUNNER_HANDSHAKE_REQUESTED_PROTOCOLS,
  SKILLRUNNER_JOB_PROTOCOL,
  SKILLRUNNER_SEQUENCE_PROTOCOL,
  type SkillRunnerBackendCapabilities,
} from "./skillRunnerHandshakeProtocol";

const capabilityCache = new Map<
  string,
  Promise<SkillRunnerBackendCapabilities>
>();

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function createCapabilityCacheKey(backend: BackendInstance) {
  return `${normalizeString(backend.id)}\n${normalizeString(backend.baseUrl)}`;
}

function isMissingHandshakeEndpoint(error: unknown) {
  const status = getSkillRunnerHttpStatus(error);
  return status === 404 || status === 405;
}

async function resolveCapabilitiesUncached(args: {
  backend: BackendInstance;
  client: SkillRunnerManagementClient;
}) {
  try {
    return await args.client.handshake({
      requestedProtocols: SKILLRUNNER_HANDSHAKE_REQUESTED_PROTOCOLS,
    });
  } catch (error) {
    if (!isMissingHandshakeEndpoint(error)) {
      throw error;
    }
    await args.client.probeReachability({
      allowGetFallback: true,
    });
    return createLegacySkillRunnerCapabilities();
  }
}

export async function resolveSkillRunnerBackendCapabilities(args: {
  backend: BackendInstance;
  client: SkillRunnerManagementClient;
}) {
  if (args.backend.type !== DEFAULT_BACKEND_TYPE) {
    throw new Error(
      `SkillRunner capabilities require skillrunner backend: backendType=${args.backend.type}`,
    );
  }
  const cacheKey = createCapabilityCacheKey(args.backend);
  const cached = capabilityCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const pending = resolveCapabilitiesUncached(args).catch((error) => {
    capabilityCache.delete(cacheKey);
    throw error;
  });
  capabilityCache.set(cacheKey, pending);
  return pending;
}

export function resetSkillRunnerHandshakeCacheForTests() {
  capabilityCache.clear();
}

export function resolveRequiredSkillRunnerProtocolForExecution(args: {
  requestKind: string;
}) {
  const requestKind = normalizeString(args.requestKind);
  if (requestKind === SKILLRUNNER_SEQUENCE_PROTOCOL) {
    return SKILLRUNNER_JOB_PROTOCOL;
  }
  return requestKind || SKILLRUNNER_JOB_PROTOCOL;
}

export function assertSkillRunnerBackendSupportsProtocol(args: {
  backend: BackendInstance;
  capabilities: SkillRunnerBackendCapabilities;
  protocolId: string;
}) {
  if (
    isSkillRunnerProtocolSupported({
      capabilities: args.capabilities,
      protocolId: args.protocolId,
    })
  ) {
    return;
  }
  const supported = listSupportedSkillRunnerProtocols(args.capabilities);
  throw new Error(
    [
      "当前 SkillRunner 后端不支持该执行协议，请升级后端或切换兼容后端。",
      `backend=${args.backend.id}`,
      `protocol=${args.protocolId}`,
      `supported=${supported.join(",") || "none"}`,
    ].join(" "),
  );
}
