import {
  SynthesisClientError,
  toSynthesisJsonObject,
  type SynthesisJsonObject,
} from "./common.js";

export const SYNTHESIS_SIDECAR_PROTOCOL = "synthesis-sidecar.v1" as const;
export const SYNTHESIS_SIDECAR_HEALTH_PATH = "/synthesis/v1/health" as const;
export const SYNTHESIS_SIDECAR_CALL_PATH = "/synthesis/v1/call" as const;

export const SYNTHESIS_SIDECAR_SYSTEM_CAPABILITIES = [
  "system.handshake",
  "system.shutdown",
] as const;
export const SYNTHESIS_SIDECAR_COMPUTE_CAPABILITIES = [
  "compute.citation_graph_layout",
  "compute.citation_graph_metrics",
  "compute.citation_graph_build",
] as const;
export const SYNTHESIS_SIDECAR_CAPABILITIES = [
  ...SYNTHESIS_SIDECAR_SYSTEM_CAPABILITIES,
  ...SYNTHESIS_SIDECAR_COMPUTE_CAPABILITIES,
] as const;

export const SYNTHESIS_SIDECAR_LIMITS = {
  requestBodyBytes: 1024 * 1024,
  computeRequestBodyBytes: 8 * 1024 * 1024,
  computeResponseBodyBytes: 8 * 1024 * 1024,
  jsonDepth: 32,
  jsonNodes: 50_000,
  computeRequestJsonNodes: 250_000,
  computeResponseJsonNodes: 50_000,
  stringLength: 64 * 1024,
  requestIdLength: 512,
  profileIdLength: 512,
  capabilityLength: 128,
} as const;

export type SynthesisSidecarSystemCapability =
  (typeof SYNTHESIS_SIDECAR_SYSTEM_CAPABILITIES)[number];
export type SynthesisSidecarComputeCapability =
  (typeof SYNTHESIS_SIDECAR_COMPUTE_CAPABILITIES)[number];
export type SynthesisSidecarCapability =
  (typeof SYNTHESIS_SIDECAR_CAPABILITIES)[number];

export type SynthesisSidecarLifecycleState = "starting" | "ready" | "stopping";
export type SynthesisSidecarComputePoolState =
  | "idle"
  | "busy"
  | "degraded"
  | "stopping";

export type SynthesisSidecarComputePoolSnapshot = {
  state: SynthesisSidecarComputePoolState;
  active: 0 | 1;
  queued: number;
  restartCount: number;
  failureCount: number;
};

export type SynthesisSidecarCallRequest = {
  protocol: string;
  requestId: string;
  profileId: string;
  capability: string;
  payload: SynthesisJsonObject;
};

export type SynthesisSidecarHealth = {
  status: "ok";
  protocol: typeof SYNTHESIS_SIDECAR_PROTOCOL;
  serviceVersion: string;
  serviceInstanceId: string;
  supervisorInstanceId: string;
  bundleId: string;
  lifecycleState: SynthesisSidecarLifecycleState;
  computePool: SynthesisSidecarComputePoolSnapshot;
};

export type SynthesisSidecarHandshakePayload = {
  schemaVersion: string;
  bundleId: string;
  supervisorInstanceId: string;
};

export type SynthesisSidecarHandshakeResult = {
  protocol: typeof SYNTHESIS_SIDECAR_PROTOCOL;
  serviceVersion: string;
  serviceInstanceId: string;
  supervisorInstanceId: string;
  bundleId: string;
  nodeVersion: string;
  profileId: string;
  schemaVersion: string;
  runtimeRootId: string;
  dataRootId: string;
  capabilities: SynthesisSidecarCapability[];
  mutationEnabled: false;
  lifecycleState: "ready";
  computePool: SynthesisSidecarComputePoolSnapshot;
};

export type SynthesisSidecarShutdownResult = {
  accepted: true;
  lifecycleState: "stopping";
};

export const SYNTHESIS_SIDECAR_ERROR_CODES = [
  "invalid_request",
  "malformed_json",
  "request_body_too_large",
  "response_body_too_large",
  "request_json_too_deep",
  "request_json_too_large",
  "request_string_too_long",
  "request_timeout",
  "method_not_allowed",
  "not_found",
  "unauthorized",
  "lifecycle_forbidden",
  "protocol_mismatch",
  "profile_mismatch",
  "schema_mismatch",
  "runtime_mismatch",
  "capability_not_found",
  "service_not_ready",
  "worker_busy",
  "worker_timeout",
  "worker_canceled",
  "worker_crashed",
  "worker_result_invalid",
  "worker_unavailable",
  "internal_error",
] as const;

export type SynthesisSidecarErrorCode =
  (typeof SYNTHESIS_SIDECAR_ERROR_CODES)[number];

export type SynthesisSidecarError = {
  code: SynthesisSidecarErrorCode;
  message: string;
  retryable: boolean;
  details: SynthesisJsonObject;
};

export type SynthesisSidecarSuccess = {
  ok: true;
  requestId: string;
  serviceInstanceId: string;
  data: SynthesisJsonObject;
  diagnostics: SynthesisJsonObject[];
};

export type SynthesisSidecarFailure = {
  ok: false;
  requestId: string;
  serviceInstanceId: string;
  error: SynthesisSidecarError;
};

export type SynthesisSidecarResponse =
  | SynthesisSidecarSuccess
  | SynthesisSidecarFailure;

function requireBoundedString(
  value: unknown,
  location: string,
  maxLength: number,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maxLength
  ) {
    throw new SynthesisClientError(
      "invalid_request",
      `${location} must be a non-empty string of at most ${maxLength} characters`,
      { location, maxLength },
    );
  }
  return value;
}

export function rebuildSynthesisSidecarCallRequest(
  value: unknown,
): SynthesisSidecarCallRequest {
  const json = toSynthesisJsonObject(value, "sidecarCallRequest");
  return {
    protocol: requireBoundedString(json.protocol, "protocol", 64),
    requestId: requireBoundedString(
      json.requestId,
      "requestId",
      SYNTHESIS_SIDECAR_LIMITS.requestIdLength,
    ),
    profileId: requireBoundedString(
      json.profileId,
      "profileId",
      SYNTHESIS_SIDECAR_LIMITS.profileIdLength,
    ),
    capability: requireBoundedString(
      json.capability,
      "capability",
      SYNTHESIS_SIDECAR_LIMITS.capabilityLength,
    ),
    payload: toSynthesisJsonObject(json.payload, "payload"),
  };
}

export function isSynthesisSidecarSystemCapability(
  value: string,
): value is SynthesisSidecarSystemCapability {
  return (SYNTHESIS_SIDECAR_SYSTEM_CAPABILITIES as readonly string[]).includes(
    value,
  );
}

export function isSynthesisSidecarComputeCapability(
  value: string,
): value is SynthesisSidecarComputeCapability {
  return (SYNTHESIS_SIDECAR_COMPUTE_CAPABILITIES as readonly string[]).includes(
    value,
  );
}

export function isSynthesisSidecarCapability(
  value: string,
): value is SynthesisSidecarCapability {
  return (SYNTHESIS_SIDECAR_CAPABILITIES as readonly string[]).includes(value);
}

export function isSynthesisSidecarErrorCode(
  value: unknown,
): value is SynthesisSidecarErrorCode {
  return (
    typeof value === "string" &&
    (SYNTHESIS_SIDECAR_ERROR_CODES as readonly string[]).includes(value)
  );
}

export function rebuildSynthesisSidecarComputePoolSnapshot(
  value: unknown,
): SynthesisSidecarComputePoolSnapshot {
  const json = toSynthesisJsonObject(value, "sidecarComputePoolSnapshot");
  const expected = [
    "state",
    "active",
    "queued",
    "restartCount",
    "failureCount",
  ];
  const keys = Object.keys(json).sort();
  if (
    keys.length !== expected.length ||
    keys.some((key, index) => key !== [...expected].sort()[index])
  ) {
    throw new SynthesisClientError(
      "invalid_request",
      "sidecarComputePoolSnapshot fields are invalid",
      { location: "sidecarComputePoolSnapshot" },
    );
  }
  if (
    json.state !== "idle" &&
    json.state !== "busy" &&
    json.state !== "degraded" &&
    json.state !== "stopping"
  ) {
    throw new SynthesisClientError(
      "invalid_request",
      "sidecarComputePoolSnapshot.state is invalid",
      { location: "sidecarComputePoolSnapshot.state" },
    );
  }
  const integer = (entry: unknown, location: string, max?: number) => {
    if (
      typeof entry !== "number" ||
      !Number.isSafeInteger(entry) ||
      entry < 0 ||
      (max !== undefined && entry > max)
    ) {
      throw new SynthesisClientError(
        "invalid_request",
        `${location} is invalid`,
        { location },
      );
    }
    return entry;
  };
  const active = integer(json.active, "sidecarComputePoolSnapshot.active", 1);
  return {
    state: json.state,
    active: active as 0 | 1,
    queued: integer(json.queued, "sidecarComputePoolSnapshot.queued", 2),
    restartCount: integer(
      json.restartCount,
      "sidecarComputePoolSnapshot.restartCount",
    ),
    failureCount: integer(
      json.failureCount,
      "sidecarComputePoolSnapshot.failureCount",
    ),
  };
}
