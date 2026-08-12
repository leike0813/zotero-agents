import { hasUnpairedSynthesisSurrogate } from "./canonicalJson.js";

export type SynthesisJsonPrimitive = string | number | boolean | null;

export type SynthesisJsonValue =
  | SynthesisJsonPrimitive
  | SynthesisJsonObject
  | SynthesisJsonValue[];

export type SynthesisJsonObject = {
  [key: string]: SynthesisJsonValue;
};

export type SynthesisDeliveryContext = {
  mode: "local" | "remote";
};

export type SynthesisStructuredDiagnostic = {
  code: string;
  severity: "info" | "warning" | "error";
  message?: string;
  field?: string;
  reason?: string;
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
  if (value === null || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    if (hasUnpairedSynthesisSurrogate(value)) {
      throw new SynthesisClientError(
        "invalid_request",
        `Synthesis JSON string is invalid at ${location}`,
        { location },
      );
    }
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
      if (hasUnpairedSynthesisSurrogate(key)) {
        throw new SynthesisClientError(
          "invalid_request",
          `Synthesis JSON key is invalid at ${location}`,
          { location },
        );
      }
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

export function assertSynthesisExactFields(
  value: SynthesisJsonObject,
  required: readonly string[],
  optional: readonly string[] = [],
  location = "$",
) {
  const allowed = new Set([...required, ...optional]);
  const fields = Object.keys(value);
  if (
    required.some((field) => !Object.hasOwn(value, field)) ||
    fields.some((field) => !allowed.has(field))
  ) {
    throw new SynthesisClientError(
      "invalid_request",
      `Synthesis JSON object fields are invalid at ${location}`,
      { location },
    );
  }
}

export function rebuildSynthesisStructuredDiagnostic(
  value: unknown,
  location = "diagnostic",
): SynthesisStructuredDiagnostic {
  const record = toSynthesisJsonObject(value, location);
  assertSynthesisExactFields(
    record,
    ["code", "severity"],
    ["message", "field", "reason"],
    location,
  );
  const string = (field: string, maximum: number) => {
    const entry = record[field];
    if (
      typeof entry !== "string" ||
      entry.length === 0 ||
      entry.length > maximum
    ) {
      throw new SynthesisClientError(
        "invalid_request",
        `Synthesis diagnostic field is invalid at ${location}.${field}`,
        { location: `${location}.${field}` },
      );
    }
    return entry;
  };
  if (
    record.severity !== "info" &&
    record.severity !== "warning" &&
    record.severity !== "error"
  ) {
    throw new SynthesisClientError(
      "invalid_request",
      `Synthesis diagnostic severity is invalid at ${location}.severity`,
      { location: `${location}.severity` },
    );
  }
  const message =
    record.message === undefined ? undefined : string("message", 4096);
  const field = record.field === undefined ? undefined : string("field", 512);
  const reason =
    record.reason === undefined ? undefined : string("reason", 512);
  return {
    code: string("code", 512),
    severity: record.severity,
    ...(message === undefined ? {} : { message }),
    ...(field === undefined ? {} : { field }),
    ...(reason === undefined ? {} : { reason }),
  };
}
