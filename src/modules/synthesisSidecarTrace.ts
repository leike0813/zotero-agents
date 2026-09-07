import {
  SYNTHESIS_SIDECAR_OBSERVATION_SCHEMA,
  rebuildSynthesisSidecarObservationEvent,
  type SynthesisSidecarObservationBoundary,
  type SynthesisSidecarObservationEvent,
  type SynthesisSidecarObservationFacts,
  type SynthesisSidecarObservationIdentities,
  type SynthesisSidecarObservationMetrics,
  type SynthesisSidecarObservationOutcome,
  type SynthesisSidecarObservationSource,
  type SynthesisSidecarTraceContext,
} from "../../packages/synthesis-contracts/src/sidecarObservability";
import type {
  DashboardSynthesisSidecarTrace,
  DashboardSynthesisSidecarTraceSnapshot,
} from "../shared/dashboardWireContract";
import { isSynthesisSidecarDiagnosticsAvailable } from "./debugMode";

export const SYNTHESIS_SIDECAR_TRACE_EVENT_LIMIT = 1_000;
export const SYNTHESIS_SIDECAR_TRACE_PER_TRACE_LIMIT = 128;
export const SYNTHESIS_SIDECAR_TRACE_PATCH_INTERVAL_MS = 200;

export type SynthesisSidecarTrace = DashboardSynthesisSidecarTrace;
export type SynthesisSidecarTraceSnapshot =
  DashboardSynthesisSidecarTraceSnapshot;

export type SynthesisSidecarTracePatch = {
  schema: "synthesis-sidecar-trace-patch.v2";
  added: SynthesisSidecarTrace[];
  updated: SynthesisSidecarTrace[];
  evicted: string[];
};

type Subscriber = (patch: SynthesisSidecarTracePatch) => void;
type MutableTrace = SynthesisSidecarTrace & {
  firstFailureRetained: boolean;
  rootActive: boolean;
  activeMaintenanceOperationIds: Set<string>;
};

const traces = new Map<string, MutableTrace>();
const maintenanceOperationOrigins = new Map<string, string>();
const subscribers = new Set<Subscriber>();
let sequence = 0;
const pendingAdded = new Set<string>();
const pendingUpdated = new Set<string>();
const pendingEvicted = new Set<string>();
let publishTimer: ReturnType<typeof globalThis.setTimeout> | undefined;

function cloneTrace(trace: MutableTrace): SynthesisSidecarTrace {
  return {
    traceId: trace.traceId,
    events: trace.events.map((event) => ({
      ...event,
      ...(event.identities ? { identities: { ...event.identities } } : {}),
      ...(event.metrics ? { metrics: { ...event.metrics } } : {}),
      ...(event.facts ? { facts: { ...event.facts } } : {}),
    })),
    droppedCount: trace.droppedCount,
    active: trace.active,
    startedAtMs: trace.startedAtMs,
    updatedAtMs: trace.updatedAtMs,
  };
}

function randomHex(length: number) {
  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(length / 2);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
      "",
    );
  }
  sequence = (sequence + 1) % Number.MAX_SAFE_INTEGER;
  return sequence.toString(16).padStart(length, "0").slice(-length);
}

function flush() {
  publishTimer = undefined;
  if (subscribers.size === 0) {
    pendingAdded.clear();
    pendingUpdated.clear();
    pendingEvicted.clear();
    return;
  }
  const patch: SynthesisSidecarTracePatch = {
    schema: "synthesis-sidecar-trace-patch.v2",
    added: [...pendingAdded]
      .map((id) => traces.get(id))
      .filter((value): value is MutableTrace => Boolean(value))
      .map(cloneTrace),
    updated: [...pendingUpdated]
      .filter((id) => !pendingAdded.has(id))
      .map((id) => traces.get(id))
      .filter((value): value is MutableTrace => Boolean(value))
      .map(cloneTrace),
    evicted: [...pendingEvicted],
  };
  pendingAdded.clear();
  pendingUpdated.clear();
  pendingEvicted.clear();
  for (const subscriber of subscribers) subscriber(patch);
}

function schedulePublish() {
  if (publishTimer !== undefined || subscribers.size === 0) return;
  publishTimer = globalThis.setTimeout(
    flush,
    SYNTHESIS_SIDECAR_TRACE_PATCH_INTERVAL_MS,
  );
}

function totalEvents() {
  let total = 0;
  for (const trace of traces.values()) total += trace.events.length;
  return total;
}

function evictCompletedTraces() {
  while (totalEvents() > SYNTHESIS_SIDECAR_TRACE_EVENT_LIMIT) {
    const candidate = [...traces.values()]
      .filter((trace) => !trace.active)
      .sort((left, right) => left.updatedAtMs - right.updatedAtMs)[0];
    if (!candidate) return;
    traces.delete(candidate.traceId);
    pendingAdded.delete(candidate.traceId);
    pendingUpdated.delete(candidate.traceId);
    pendingEvicted.add(candidate.traceId);
  }
}

function retainEvent(event: SynthesisSidecarObservationEvent) {
  let trace = traces.get(event.traceId);
  if (!trace) {
    trace = {
      traceId: event.traceId,
      events: [],
      droppedCount: 0,
      active: true,
      firstFailureRetained: false,
      rootActive: true,
      activeMaintenanceOperationIds: new Set(),
      startedAtMs: event.occurredAtMs,
      updatedAtMs: event.occurredAtMs,
    };
    traces.set(event.traceId, trace);
    pendingAdded.add(event.traceId);
  } else {
    pendingUpdated.add(event.traceId);
  }
  const isFailure = ["failed", "canceled", "timed-out"].includes(event.outcome);
  const maintenanceOperationId = event.identities?.operation;
  const isMaintenanceStarted =
    event.phase === "maintenance-started" &&
    event.outcome === "started" &&
    Boolean(maintenanceOperationId);
  const isMaintenanceTerminal =
    event.phase === "maintenance-terminal" &&
    event.outcome !== "started" &&
    Boolean(maintenanceOperationId);
  const isRootTerminal =
    event.parentSpanId === undefined && event.outcome !== "started";
  if (trace.events.length < SYNTHESIS_SIDECAR_TRACE_PER_TRACE_LIMIT) {
    trace.events.push(event);
    if (isFailure) trace.firstFailureRetained = true;
  } else {
    trace.droppedCount += 1;
    if (isFailure && !trace.firstFailureRetained) {
      trace.events[Math.min(1, trace.events.length - 1)] = event;
      trace.firstFailureRetained = true;
    } else if (isRootTerminal || isMaintenanceTerminal) {
      trace.events[trace.events.length - 1] = event;
    }
  }
  trace.updatedAtMs = event.occurredAtMs;
  if (isMaintenanceStarted) {
    const operationId = maintenanceOperationId!;
    if (!maintenanceOperationOrigins.has(operationId)) {
      maintenanceOperationOrigins.set(operationId, trace.traceId);
      trace.activeMaintenanceOperationIds.add(operationId);
    }
  }
  if (isMaintenanceTerminal) {
    const operationId = maintenanceOperationId!;
    const originTraceId = maintenanceOperationOrigins.get(operationId);
    const originTrace = originTraceId ? traces.get(originTraceId) : undefined;
    if (originTrace) {
      originTrace.activeMaintenanceOperationIds.delete(operationId);
      originTrace.active =
        originTrace.rootActive ||
        originTrace.activeMaintenanceOperationIds.size > 0;
      if (originTrace !== trace) {
        originTrace.updatedAtMs = Math.max(
          originTrace.updatedAtMs,
          event.occurredAtMs,
        );
        pendingUpdated.add(originTrace.traceId);
      }
    }
    maintenanceOperationOrigins.delete(operationId);
  }
  if (isRootTerminal) trace.rootActive = false;
  trace.active =
    trace.rootActive || trace.activeMaintenanceOperationIds.size > 0;
  evictCompletedTraces();
  schedulePublish();
  return event;
}

export function createSynthesisSidecarTraceContext(args?: {
  parent?: SynthesisSidecarTraceContext;
  attempt?: number;
}): SynthesisSidecarTraceContext | undefined {
  if (!isSynthesisSidecarDiagnosticsAvailable()) return undefined;
  return {
    schema: SYNTHESIS_SIDECAR_OBSERVATION_SCHEMA,
    traceId: args?.parent?.traceId ?? randomHex(32),
    spanId: randomHex(16),
    ...(args?.parent ? { parentSpanId: args.parent.spanId } : {}),
    attempt: args?.attempt ?? 0,
  };
}

export function recordSynthesisSidecarTraceEvent(args: {
  context: SynthesisSidecarTraceContext | undefined;
  source: SynthesisSidecarObservationSource;
  boundary: SynthesisSidecarObservationBoundary;
  phase: string;
  outcome: SynthesisSidecarObservationOutcome;
  code?: string;
  occurredAtMs?: number;
  identities?: SynthesisSidecarObservationIdentities;
  metrics?: SynthesisSidecarObservationMetrics;
  facts?: SynthesisSidecarObservationFacts;
}) {
  if (!args.context || !isSynthesisSidecarDiagnosticsAvailable()) {
    return undefined;
  }
  return retainEvent(
    rebuildSynthesisSidecarObservationEvent({
      ...args.context,
      source: args.source,
      boundary: args.boundary,
      phase: args.phase,
      outcome: args.outcome,
      ...(args.code ? { code: args.code } : {}),
      occurredAtMs: args.occurredAtMs ?? Date.now(),
      ...(args.identities ? { identities: args.identities } : {}),
      ...(args.metrics ? { metrics: args.metrics } : {}),
      ...(args.facts ? { facts: args.facts } : {}),
    }),
  );
}

export function retainSynthesisSidecarNativeTraceEvent(value: unknown) {
  if (!isSynthesisSidecarDiagnosticsAvailable()) return undefined;
  return retainEvent(rebuildSynthesisSidecarObservationEvent(value));
}

export function readSynthesisSidecarTraceSnapshot(): SynthesisSidecarTraceSnapshot {
  if (!isSynthesisSidecarDiagnosticsAvailable()) {
    return {
      schema: "synthesis-sidecar-trace-snapshot.v2",
      traces: [],
      eventCount: 0,
    };
  }
  const values = [...traces.values()]
    .sort((left, right) => left.startedAtMs - right.startedAtMs)
    .map(cloneTrace);
  return {
    schema: "synthesis-sidecar-trace-snapshot.v2",
    traces: values,
    eventCount: values.reduce((sum, trace) => sum + trace.events.length, 0),
  };
}

export function subscribeSynthesisSidecarTracePatches(subscriber: Subscriber) {
  if (!isSynthesisSidecarDiagnosticsAvailable()) return () => undefined;
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}

export function flushSynthesisSidecarTracePatchesForTests() {
  if (publishTimer !== undefined) globalThis.clearTimeout(publishTimer);
  flush();
}

export function resetSynthesisSidecarTraceForTests() {
  if (publishTimer !== undefined) globalThis.clearTimeout(publishTimer);
  publishTimer = undefined;
  traces.clear();
  maintenanceOperationOrigins.clear();
  subscribers.clear();
  pendingAdded.clear();
  pendingUpdated.clear();
  pendingEvicted.clear();
  sequence = 0;
}
