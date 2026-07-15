export type SynthesisJsonPrimitive = string | number | boolean | null;

export type SynthesisJsonValue =
  | SynthesisJsonPrimitive
  | SynthesisJsonObject
  | SynthesisJsonValue[];

export type SynthesisJsonObject = {
  [key: string]: SynthesisJsonValue;
};

export const SYNTHESIS_PROTOCOL_VERSION = "1" as const;

export type SynthesisRequestScope = {
  protocolVersion: typeof SYNTHESIS_PROTOCOL_VERSION;
  profileId: string;
  libraryId: number;
  requestId: string;
};

export type SynthesisPageRequest = {
  cursor?: string;
  limit?: number;
};

export type SynthesisPageInfo = {
  cursor: string;
  nextCursor: string;
  hasMore: boolean;
  returned: number;
  total: number;
  limit: number;
};

export type SynthesisClientErrorCode =
  | "invalid_request"
  | "unavailable"
  | "timeout"
  | "conflict"
  | "not_found"
  | "storage_busy"
  | "internal";

export class SynthesisClientError extends Error {
  readonly code: SynthesisClientErrorCode;
  readonly details?: SynthesisJsonObject;

  constructor(
    code: SynthesisClientErrorCode,
    message: string,
    details?: SynthesisJsonObject,
  ) {
    super(message);
    this.name = "SynthesisClientError";
    this.code = code;
    this.details = details;
  }
}

export function toSynthesisJsonValue(
  value: unknown,
  location = "$",
  seen = new Set<object>(),
): SynthesisJsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "object") {
    throw new SynthesisClientError(
      "invalid_request",
      `Synthesis JSON value is invalid at ${location}`,
      { location, valueType: typeof value },
    );
  }
  if (seen.has(value)) {
    throw new SynthesisClientError(
      "invalid_request",
      `Synthesis JSON value is cyclic at ${location}`,
      { location },
    );
  }
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((entry, index) =>
        toSynthesisJsonValue(entry, `${location}[${index}]`, seen),
      );
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new SynthesisClientError(
        "invalid_request",
        `Synthesis JSON object is invalid at ${location}`,
        { location, valueType: prototype?.constructor?.name || "object" },
      );
    }
    const result: SynthesisJsonObject = {};
    for (const [key, entry] of Object.entries(value)) {
      result[key] = toSynthesisJsonValue(entry, `${location}.${key}`, seen);
    }
    return result;
  } finally {
    seen.delete(value);
  }
}

export function toSynthesisJsonObject(
  value: unknown,
  location = "$",
): SynthesisJsonObject {
  const normalized = toSynthesisJsonValue(value, location);
  if (
    normalized === null ||
    Array.isArray(normalized) ||
    typeof normalized !== "object"
  ) {
    throw new SynthesisClientError(
      "invalid_request",
      `Synthesis JSON object is required at ${location}`,
      { location },
    );
  }
  return normalized;
}
