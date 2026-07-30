import { isDebugModeEnabled } from "./debugMode";
import { appendRuntimeLog } from "./runtimeLogManager";
import { retainSynthesisSidecarDiagnosticEvent } from "./synthesisSidecarDiagnostics";

export type SynthesisSidecarDiagnosticComponent =
  | "lifecycle"
  | "rpc"
  | "reverse-host"
  | "operation"
  | "process";

export type SynthesisSidecarDiagnosticEventStatus =
  | "started"
  | "succeeded"
  | "failed";

export type SynthesisSidecarDiagnosticEventInput = {
  component: SynthesisSidecarDiagnosticComponent;
  stage: string;
  status: SynthesisSidecarDiagnosticEventStatus;
  capability?: string;
  requestId?: string;
  operationId?: string;
  serviceInstanceId?: string;
  code?: string;
  durationMs?: number;
  requestBytes?: number;
  responseBytes?: number;
  httpStatus?: number;
  returned?: number;
  total?: number;
  page?: number;
};

export type SynthesisSidecarDiagnosticEvent =
  SynthesisSidecarDiagnosticEventInput & {
    schema: "synthesis-sidecar-diagnostic-event.v1";
    id: string;
    ts: string;
  };

const EVENT_TEXT_LIMIT = 256;
let eventSequence = 0;

export function synthesisSidecarDiagnosticCode(
  error: unknown,
  fallback = "synthesis_sidecar_startup_failed",
) {
  const value =
    error && typeof error === "object"
      ? (error as {
          code?: unknown;
          message?: unknown;
          details?: { reason?: unknown };
        })
      : undefined;
  for (const candidate of [
    value?.details?.reason,
    value?.code,
    value?.message,
  ]) {
    if (
      typeof candidate === "string" &&
      /^[a-z][a-z0-9_.:-]{0,127}$/.test(candidate)
    ) {
      return candidate;
    }
  }
  return fallback;
}

function boundedText(value: unknown, limit = EVENT_TEXT_LIMIT) {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized ? normalized.slice(0, limit) : undefined;
}

function boundedInteger(value: unknown) {
  const normalized = Number(value);
  return Number.isFinite(normalized) && normalized >= 0
    ? Math.floor(normalized)
    : undefined;
}

function normalizeDiagnosticEvent(
  input: SynthesisSidecarDiagnosticEventInput,
): SynthesisSidecarDiagnosticEvent {
  const normalized: SynthesisSidecarDiagnosticEvent = {
    schema: "synthesis-sidecar-diagnostic-event.v1",
    id: `synthesis-sidecar-event-${Date.now()}-${++eventSequence}`,
    ts: new Date().toISOString(),
    component: input.component,
    stage: boundedText(input.stage) || "unknown",
    status: input.status,
  };
  const textFields = [
    "capability",
    "requestId",
    "operationId",
    "serviceInstanceId",
    "code",
  ] as const;
  for (const field of textFields) {
    const value = boundedText(input[field]);
    if (value) normalized[field] = value;
  }
  const numberFields = [
    "durationMs",
    "requestBytes",
    "responseBytes",
    "httpStatus",
    "returned",
    "total",
    "page",
  ] as const;
  for (const field of numberFields) {
    const value = boundedInteger(input[field]);
    if (typeof value === "number") normalized[field] = value;
  }
  return normalized;
}

export function recordSynthesisSidecarDiagnosticEvent(
  input: SynthesisSidecarDiagnosticEventInput,
) {
  const debug = isDebugModeEnabled();
  if (!debug && input.status !== "failed") {
    return undefined;
  }
  const event = normalizeDiagnosticEvent(input);
  if (debug) {
    retainSynthesisSidecarDiagnosticEvent(event);
  }
  appendRuntimeLog({
    level: input.status === "failed" ? "error" : "info",
    scope: "system",
    component: "synthesis-sidecar",
    operation: event.component,
    requestId: event.requestId,
    phase: event.capability,
    stage: event.stage,
    message:
      event.code ||
      `Synthesis sidecar ${event.component} ${event.stage} ${event.status}`,
    transport:
      typeof event.httpStatus === "number" ||
      typeof event.durationMs === "number" ||
      typeof event.responseBytes === "number"
        ? {
            status: event.httpStatus,
            duration: event.durationMs,
            size: event.responseBytes,
          }
        : undefined,
    details: event,
  });
  return { ...event };
}
