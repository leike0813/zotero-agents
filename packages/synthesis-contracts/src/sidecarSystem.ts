import {
  SynthesisClientError,
  toSynthesisJsonObject,
  type SynthesisJsonObject,
} from "./common.js";

export const SYNTHESIS_SIDECAR_PROTOCOL = "synthesis-sidecar.v1" as const;
export const SYNTHESIS_SIDECAR_HEALTH_PATH = "/synthesis/v1/health" as const;
export const SYNTHESIS_SIDECAR_CALL_PATH = "/synthesis/v1/call" as const;

export const SYNTHESIS_SIDECAR_CAPABILITIES = [
  "system.handshake",
  "system.shutdown",
] as const;

export const SYNTHESIS_SIDECAR_LIMITS = {
  requestBodyBytes: 1024 * 1024,
  jsonDepth: 32,
  jsonNodes: 50_000,
  stringLength: 64 * 1024,
  requestIdLength: 512,
  profileIdLength: 512,
  capabilityLength: 128,
} as const;

export type SynthesisSidecarSystemCapability =
  (typeof SYNTHESIS_SIDECAR_CAPABILITIES)[number];

export type SynthesisSidecarLifecycleState = "starting" | "ready" | "stopping";

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
  lifecycleState: SynthesisSidecarLifecycleState;
};

export type SynthesisSidecarHandshakePayload = {
  schemaVersion: string;
};

export type SynthesisSidecarHandshakeResult = {
  protocol: typeof SYNTHESIS_SIDECAR_PROTOCOL;
  serviceVersion: string;
  serviceInstanceId: string;
  profileId: string;
  schemaVersion: string;
  runtimeRootId: string;
  dataRootId: string;
  capabilities: SynthesisSidecarSystemCapability[];
  mutationEnabled: false;
  lifecycleState: "ready";
};

export type SynthesisSidecarShutdownResult = {
  accepted: true;
  lifecycleState: "stopping";
};

export type SynthesisSidecarErrorCode =
  | "invalid_request"
  | "malformed_json"
  | "request_body_too_large"
  | "request_json_too_deep"
  | "request_json_too_large"
  | "request_string_too_long"
  | "request_timeout"
  | "method_not_allowed"
  | "not_found"
  | "unauthorized"
  | "lifecycle_forbidden"
  | "protocol_mismatch"
  | "profile_mismatch"
  | "schema_mismatch"
  | "capability_not_found"
  | "service_not_ready"
  | "internal_error";

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
  return (SYNTHESIS_SIDECAR_CAPABILITIES as readonly string[]).includes(value);
}
