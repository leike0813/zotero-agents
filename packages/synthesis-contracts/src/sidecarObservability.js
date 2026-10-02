import { SynthesisClientError, toSynthesisJsonObject } from "./common.js";
export const SYNTHESIS_SIDECAR_OBSERVATION_SCHEMA = "synthesis-sidecar-observation.v2";
export const SYNTHESIS_SIDECAR_OBSERVATION_SOURCES = [
    "host",
    "rust-sidecar",
    "child-worker",
];
export const SYNTHESIS_SIDECAR_OBSERVATION_BOUNDARIES = [
    "supervisor",
    "process",
    "host-rpc",
    "reverse-host",
    "child-worker",
    "transfer",
    "operation",
];
export const SYNTHESIS_SIDECAR_OBSERVATION_OUTCOMES = [
    "started",
    "succeeded",
    "failed",
    "canceled",
    "timed-out",
];
export const SYNTHESIS_SIDECAR_OBSERVATION_IDENTITY_KEYS = [
    "capability",
    "operation",
    "reason",
    "trigger",
];
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
];
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
];
const STABLE_VALUE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const TRACE_ID = /^[a-f0-9]{32}$/;
const SPAN_ID = /^[a-f0-9]{16}$/;
const HASH = /^sha256:[a-f0-9]{64}$/;
export function safeSynthesisSidecarObservationReason(value) {
    return typeof value === "string" && STABLE_VALUE.test(value)
        ? value
        : undefined;
}
function invalid(location) {
    throw new SynthesisClientError("invalid_request", "Synthesis sidecar observation is invalid", { location });
}
function exactKeys(value, required, optional, location) {
    const allowed = new Set([...required, ...optional]);
    if (required.some((key) => !(key in value)) ||
        Object.keys(value).some((key) => !allowed.has(key))) {
        invalid(location);
    }
}
function stableString(value, location) {
    const stable = safeSynthesisSidecarObservationReason(value);
    if (!stable) {
        invalid(location);
    }
    return stable;
}
function integer(value, location) {
    if (!Number.isSafeInteger(value) || Number(value) < 0) {
        invalid(location);
    }
    return Number(value);
}
function optionalRecord(value, keys, location) {
    const record = toSynthesisJsonObject(value, location);
    exactKeys(record, [], keys, location);
    return record;
}
export function rebuildSynthesisSidecarTraceContext(value) {
    const json = toSynthesisJsonObject(value, "sidecarTraceContext");
    exactKeys(json, ["schema", "traceId", "spanId", "attempt"], ["parentSpanId"], "sidecarTraceContext");
    if (json.schema !== SYNTHESIS_SIDECAR_OBSERVATION_SCHEMA ||
        typeof json.traceId !== "string" ||
        !TRACE_ID.test(json.traceId) ||
        typeof json.spanId !== "string" ||
        !SPAN_ID.test(json.spanId) ||
        (json.parentSpanId !== undefined &&
            (typeof json.parentSpanId !== "string" ||
                !SPAN_ID.test(json.parentSpanId)))) {
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
export function rebuildSynthesisSidecarObservationEvent(value) {
    const json = toSynthesisJsonObject(value, "sidecarObservationEvent");
    exactKeys(json, [
        "schema",
        "traceId",
        "spanId",
        "attempt",
        "source",
        "boundary",
        "phase",
        "outcome",
        "occurredAtMs",
    ], ["parentSpanId", "code", "identities", "metrics", "facts"], "sidecarObservationEvent");
    const context = rebuildSynthesisSidecarTraceContext({
        schema: json.schema,
        traceId: json.traceId,
        spanId: json.spanId,
        ...(json.parentSpanId === undefined
            ? {}
            : { parentSpanId: json.parentSpanId }),
        attempt: json.attempt,
    });
    if (!SYNTHESIS_SIDECAR_OBSERVATION_SOURCES.includes(json.source) ||
        !SYNTHESIS_SIDECAR_OBSERVATION_BOUNDARIES.includes(json.boundary) ||
        !SYNTHESIS_SIDECAR_OBSERVATION_OUTCOMES.includes(json.outcome)) {
        invalid("sidecarObservationEvent");
    }
    const identities = json.identities === undefined
        ? undefined
        : optionalRecord(json.identities, SYNTHESIS_SIDECAR_OBSERVATION_IDENTITY_KEYS, "sidecarObservationEvent.identities");
    const normalizedIdentities = identities
        ? Object.fromEntries(Object.entries(identities).map(([key, entry]) => [
            key,
            stableString(entry, `sidecarObservationEvent.identities.${key}`),
        ]))
        : undefined;
    const metrics = json.metrics === undefined
        ? undefined
        : optionalRecord(json.metrics, SYNTHESIS_SIDECAR_OBSERVATION_METRIC_KEYS, "sidecarObservationEvent.metrics");
    const normalizedMetrics = metrics
        ? Object.fromEntries(Object.entries(metrics).map(([key, entry]) => [
            key,
            integer(entry, `sidecarObservationEvent.metrics.${key}`),
        ]))
        : undefined;
    const facts = json.facts === undefined
        ? undefined
        : optionalRecord(json.facts, SYNTHESIS_SIDECAR_OBSERVATION_FACT_KEYS, "sidecarObservationEvent.facts");
    const normalizedFacts = facts
        ? Object.fromEntries(Object.entries(facts).map(([key, entry]) => {
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
        }))
        : undefined;
    return {
        ...context,
        source: json.source,
        boundary: json.boundary,
        phase: stableString(json.phase, "sidecarObservationEvent.phase"),
        outcome: json.outcome,
        ...(json.code === undefined
            ? {}
            : { code: stableString(json.code, "sidecarObservationEvent.code") }),
        occurredAtMs: integer(json.occurredAtMs, "sidecarObservationEvent.occurredAtMs"),
        ...(normalizedIdentities
            ? {
                identities: normalizedIdentities,
            }
            : {}),
        ...(normalizedMetrics
            ? { metrics: normalizedMetrics }
            : {}),
        ...(normalizedFacts
            ? { facts: normalizedFacts }
            : {}),
    };
}
