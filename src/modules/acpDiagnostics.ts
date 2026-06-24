import type { AcpDiagnosticsEntry } from "./acpTypes";

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function safeJson(value: unknown) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return normalizeString(value);
  }
}

function readProperty(value: unknown, key: string) {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  try {
    return (value as Record<string, unknown>)[key];
  } catch {
    return undefined;
  }
}

function stringifyDiagnosticValue(value: unknown) {
  if (value === undefined || value === null) {
    return "";
  }
  const normalized = normalizeString(value);
  if (normalized && normalized !== "[object Object]") {
    return normalized;
  }
  const json = safeJson(value);
  if (typeof json === "string") {
    return normalizeString(json);
  }
  try {
    return normalizeString(JSON.stringify(json));
  } catch {
    return normalized;
  }
}

export function describeAcpError(
  error: unknown,
  fallback = "unknown error",
): string {
  if (error instanceof Error) {
    const message = normalizeString(error.message);
    if (message && message !== "[object Object]") {
      return message;
    }
    const cause = readProperty(error, "cause");
    const causeMessage: string = describeAcpError(cause, "");
    if (causeMessage) {
      return causeMessage;
    }
    return normalizeString(error.name) || fallback;
  }
  const message = stringifyDiagnosticValue(readProperty(error, "message"));
  if (message) {
    return message;
  }
  const reason = stringifyDiagnosticValue(readProperty(error, "reason"));
  if (reason) {
    return reason;
  }
  const code = stringifyDiagnosticValue(readProperty(error, "code"));
  const serialized = stringifyDiagnosticValue(error);
  if (serialized) {
    return code && !serialized.includes(code)
      ? `${serialized} (${code})`
      : serialized;
  }
  return code || fallback;
}

export function serializeAcpError(error: unknown, stage?: string) {
  const cause = readProperty(error, "cause");
  const message =
    describeAcpError(error, "") ||
    (cause === undefined ? "" : describeAcpError(cause, "")) ||
    "unknown error";
  const errorName =
    error instanceof Error
      ? normalizeString(error.name) || "Error"
      : normalizeString(readProperty(error, "name")) || undefined;
  const stack =
    error instanceof Error
      ? normalizeString(error.stack)
      : normalizeString(readProperty(error, "stack"));
  const code = readProperty(error, "code");
  const data = readProperty(error, "data");
  return {
    stage: normalizeString(stage) || undefined,
    message,
    detail: [
      message,
      stack ? `\n${stack}` : "",
      cause ? `\nCause: ${stringifyDiagnosticValue(cause)}` : "",
    ]
      .filter(Boolean)
      .join(""),
    errorName,
    stack: stack || undefined,
    cause: cause === undefined ? undefined : safeJson(cause),
    code:
      typeof code === "number" || typeof code === "string" ? code : undefined,
    data: data === undefined ? undefined : safeJson(data),
    raw: safeJson(error),
  };
}

export function buildAcpErrorDiagnostic(args: {
  id: string;
  ts: string;
  kind: string;
  level?: "info" | "warn" | "error";
  message: string;
  error: unknown;
  stage?: string;
}): AcpDiagnosticsEntry {
  const serialized = serializeAcpError(args.error, args.stage);
  return {
    id: args.id,
    ts: args.ts,
    kind: args.kind,
    level: args.level || "error",
    message: args.message || serialized.message,
    detail: serialized.detail,
    stage: serialized.stage,
    errorName: serialized.errorName,
    stack: serialized.stack,
    cause:
      serialized.cause === undefined
        ? undefined
        : typeof serialized.cause === "string"
          ? serialized.cause
          : JSON.stringify(serialized.cause),
    code: serialized.code,
    data: serialized.data,
    raw: serialized.raw,
  };
}
