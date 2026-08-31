import { SynthesisClientError, toSynthesisJsonObject } from "./common.js";

export const SYNTHESIS_SIDECAR_OBSERVATION_SCHEMA =
  "synthesis-sidecar-observation.v2" as const;

export const SYNTHESIS_SIDECAR_OBSERVATION_SOURCES = [
  "host",
  "rust-sidecar",
  "child-worker",
] as const;

export const SYNTHESIS_SIDECAR_OBSERVATION_BOUNDARIES = [
  "supervisor",
  "process",
  "host-rpc",
  "reverse-host",
  "child-worker",
  "transfer",
  "operation",
] as const;

export const SYNTHESIS_SIDECAR_OBSERVATION_OUTCOMES = [
  "started",
  "succeeded",
  "failed",
  "canceled",
  "timed-out",
] as const;

export const SYNTHESIS_SIDECAR_OBSERVATION_IDENTITY_KEYS = [
  "capability",
  "operation",
  "trigger",
] as const;

export const SYNTHESIS_SIDECAR_OBSERVATION_METRIC_KEYS = [
  "durationMs",
  "queueWaitMs",
  "requestBytes",
  "responseBytes",
  "sqlQueryCount",
  "sqlWriteCount",
  "budgetBytes",
  "returnedCount",
  "totalCount",
  "batchOrdinal",
] as const;

export const SYNTHESIS_SIDECAR_OBSERVATION_FACT_KEYS = [
  "semanticStatus",
  "algorithm",
  "graphHash",
  "matchingHash",
  "proposalCount",
  "factCount",
  "warningCount",
  "nodeCount",
  "edgeCount",
] as const;

export type SynthesisSidecarObservationSource =
  (typeof SYNTHESIS_SIDECAR_OBSERVATION_SOURCES)[number];
export type SynthesisSidecarObservationBoundary =
  (typeof SYNTHESIS_SIDECAR_OBSERVATION_BOUNDARIES)[number];
export type SynthesisSidecarObservationOutcome =
  (typeof SYNTHESIS_SIDECAR_OBSERVATION_OUTCOMES)[number];

export type SynthesisSidecarTraceContext = {
  schema: typeof SYNTHESIS_SIDECAR_OBSERVATION_SCHEMA;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  attempt: number;
};

export type SynthesisSidecarObservationIdentities = Partial<
  Record<(typeof SYNTHESIS_SIDECAR_OBSERVATION_IDENTITY_KEYS)[number], string>
>;
export type SynthesisSidecarObservationMetrics = Partial<
  Record<(typeof SYNTHESIS_SIDECAR_OBSERVATION_METRIC_KEYS)[number], number>
>;
export type SynthesisSidecarObservationFacts = Partial<
  Record<
    (typeof SYNTHESIS_SIDECAR_OBSERVATION_FACT_KEYS)[number],
    string | number
  >
>;

export type SynthesisSidecarObservationEvent = SynthesisSidecarTraceContext & {
  source: SynthesisSidecarObservationSource;
  boundary: SynthesisSidecarObservationBoundary;
  phase: string;
  outcome: SynthesisSidecarObservationOutcome;
  code?: string;
  occurredAtMs: number;
  identities?: SynthesisSidecarObservationIdentities;
  metrics?: SynthesisSidecarObservationMetrics;
  facts?: SynthesisSidecarObservationFacts;
};

const STABLE_VALUE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const TRACE_ID = /^[a-f0-9]{32}$/;
const SPAN_ID = /^[a-f0-9]{16}$/;
const HASH = /^sha256:[a-f0-9]{64}$/;

function invalid(location: string): never {
  throw new SynthesisClientError(
    "invalid_request",
    "Synthesis sidecar observation is invalid",
    { location },
  );
}

function exactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
  location: string,
) {
  const allowed = new Set([...required, ...optional]);
  if (
    required.some((key) => !(key in value)) ||
    Object.keys(value).some((key) => !allowed.has(key))
  ) {
    invalid(location);
  }
}

function stableString(value: unknown, location: string) {
  if (typeof value !== "string" || !STABLE_VALUE.test(value)) {
    invalid(location);
  }
  return value;
}

function integer(value: unknown, location: string) {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    invalid(location);
  }
  return Number(value);
}

function optionalRecord(
  value: unknown,
  keys: readonly string[],
  location: string,
) {
  const record = toSynthesisJsonObject(value, location);
  exactKeys(record, [], keys, location);
  return record;
}

export function rebuildSynthesisSidecarTraceContext(
  value: unknown,
): SynthesisSidecarTraceContext {
  const json = toSynthesisJsonObject(value, "sidecarTraceContext");
  exactKeys(
    json,
    ["schema", "traceId", "spanId", "attempt"],
    ["parentSpanId"],
    "sidecarTraceContext",
  );
  if (
    json.schema !== SYNTHESIS_SIDECAR_OBSERVATION_SCHEMA ||
    typeof json.traceId !== "string" ||
    !TRACE_ID.test(json.traceId) ||
    typeof json.spanId !== "string" ||
    !SPAN_ID.test(json.spanId) ||
    (json.parentSpanId !== undefined &&
      (typeof json.parentSpanId !== "string" ||
        !SPAN_ID.test(json.parentSpanId)))
  ) {
    invalid("sidecarTraceContext");
  }
  return {
    schema: SYNTHESIS_SIDECAR_OBSERVATION_SCHEMA,
    traceId: json.traceId,
    spanId: json.spanId,
    ...(typeof json.parentSpanId === "string"
      ? { parentSpanId: json.parentSpanId }
      : {}),
    attempt: integer(json.attempt, "sidecarTraceContext.attempt"),
  };
}

export function rebuildSynthesisSidecarObservationEvent(
  value: unknown,
): SynthesisSidecarObservationEvent {
  const json = toSynthesisJsonObject(value, "sidecarObservationEvent");
  exactKeys(
    json,
    [
      "schema",
      "traceId",
      "spanId",
      "attempt",
      "source",
      "boundary",
      "phase",
      "outcome",
      "occurredAtMs",
    ],
    ["parentSpanId", "code", "identities", "metrics", "facts"],
    "sidecarObservationEvent",
  );
  const context = rebuildSynthesisSidecarTraceContext({
    schema: json.schema,
    traceId: json.traceId,
    spanId: json.spanId,
    ...(json.parentSpanId === undefined
      ? {}
      : { parentSpanId: json.parentSpanId }),
    attempt: json.attempt,
  });
  if (
    !SYNTHESIS_SIDECAR_OBSERVATION_SOURCES.includes(json.source as never) ||
    !SYNTHESIS_SIDECAR_OBSERVATION_BOUNDARIES.includes(
      json.boundary as never,
    ) ||
    !SYNTHESIS_SIDECAR_OBSERVATION_OUTCOMES.includes(json.outcome as never)
  ) {
    invalid("sidecarObservationEvent");
  }
  const identities =
    json.identities === undefined
      ? undefined
      : optionalRecord(
          json.identities,
          SYNTHESIS_SIDECAR_OBSERVATION_IDENTITY_KEYS,
          "sidecarObservationEvent.identities",
        );
  const normalizedIdentities = identities
    ? Object.fromEntries(
        Object.entries(identities).map(([key, entry]) => [
          key,
          stableString(entry, `sidecarObservationEvent.identities.${key}`),
        ]),
      )
    : undefined;
  const metrics =
    json.metrics === undefined
      ? undefined
      : optionalRecord(
          json.metrics,
          SYNTHESIS_SIDECAR_OBSERVATION_METRIC_KEYS,
          "sidecarObservationEvent.metrics",
        );
  const normalizedMetrics = metrics
    ? Object.fromEntries(
        Object.entries(metrics).map(([key, entry]) => [
          key,
          integer(entry, `sidecarObservationEvent.metrics.${key}`),
        ]),
      )
    : undefined;
  const facts =
    json.facts === undefined
      ? undefined
      : optionalRecord(
          json.facts,
          SYNTHESIS_SIDECAR_OBSERVATION_FACT_KEYS,
          "sidecarObservationEvent.facts",
        );
  const normalizedFacts = facts
    ? Object.fromEntries(
        Object.entries(facts).map(([key, entry]) => {
          if (["graphHash", "matchingHash"].includes(key)) {
            if (typeof entry !== "string" || !HASH.test(entry)) {
              invalid(`sidecarObservationEvent.facts.${key}`);
            }
            return [key, entry];
          }
          if (typeof entry === "number") {
            return [
              key,
              integer(entry, `sidecarObservationEvent.facts.${key}`),
            ];
          }
          return [
            key,
            stableString(entry, `sidecarObservationEvent.facts.${key}`),
          ];
        }),
      )
    : undefined;
  return {
    ...context,
    source: json.source as SynthesisSidecarObservationSource,
    boundary: json.boundary as SynthesisSidecarObservationBoundary,
    phase: stableString(json.phase, "sidecarObservationEvent.phase"),
    outcome: json.outcome as SynthesisSidecarObservationOutcome,
    ...(json.code === undefined
      ? {}
      : { code: stableString(json.code, "sidecarObservationEvent.code") }),
    occurredAtMs: integer(
      json.occurredAtMs,
      "sidecarObservationEvent.occurredAtMs",
    ),
    ...(normalizedIdentities
      ? {
          identities:
            normalizedIdentities as SynthesisSidecarObservationIdentities,
        }
      : {}),
    ...(normalizedMetrics
      ? { metrics: normalizedMetrics as SynthesisSidecarObservationMetrics }
      : {}),
    ...(normalizedFacts
      ? { facts: normalizedFacts as SynthesisSidecarObservationFacts }
      : {}),
  };
}
