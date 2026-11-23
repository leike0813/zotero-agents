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
} from "../../../../packages/synthesis-contracts/src/sidecarObservability";
import type {
  DashboardSynthesisSidecarTrace,
  DashboardSynthesisSidecarTraceSnapshot,
} from "../../../shared/dashboardWireContract";
import {
  classifySynthesisSidecarTrace,
  isSynthesisSidecarFailureOutcome,
  type SynthesisSidecarTraceEventFact,
  type SynthesisSidecarTraceTier,
} from "../../../shared/synthesisSidecarTracePolicy";
import { isSynthesisSidecarDiagnosticsAvailable } from "../../debugMode";

export const SYNTHESIS_SIDECAR_TRACE_EVENT_LIMIT = 1_000;
export const SYNTHESIS_SIDECAR_TRACE_PER_TRACE_LIMIT = 128;
export const SYNTHESIS_SIDECAR_TRACE_PATCH_INTERVAL_MS = 200;
export const SYNTHESIS_SIDECAR_STALE_ACTIVE_MS = 60_000;

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
  rootActive: boolean;
  activeMaintenanceOperationIds: Set<string>;
  // The first failure and the outer terminal are never overwritten by later
  // events: they are the two facts a reader must not lose.
  firstFailureEvent?: SynthesisSidecarObservationEvent;
  terminalEvent?: SynthesisSidecarObservationEvent;
  // Bumped whenever the event list changes; the eviction tier is cached
  // against it (and the effective active flag).
  revision: number;
  tierCache?: {
    revision: number;
    active: boolean;
    tier: SynthesisSidecarTraceTier;
  };
};

const traces = new Map<string, MutableTrace>();
const maintenanceOperationOrigins = new Map<string, string>();
const subscribers = new Set<Subscriber>();
let sequence = 0;
const pendingAdded = new Set<string>();
const pendingUpdated = new Set<string>();
const pendingEvicted = new Set<string>();
let publishTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
let traceClock: () => number = Date.now;

function isTraceEffectivelyActive(trace: MutableTrace, nowMs: number) {
  return (
    trace.active &&
    nowMs - trace.updatedAtMs <= SYNTHESIS_SIDECAR_STALE_ACTIVE_MS
  );
}

function cloneTrace(trace: MutableTrace, nowMs: number): SynthesisSidecarTrace {
  return {
    traceId: trace.traceId,
    events: trace.events.map((event) => ({
      ...event,
      ...(event.identities ? { identities: { ...event.identities } } : {}),
      ...(event.metrics ? { metrics: { ...event.metrics } } : {}),
      ...(event.facts ? { facts: { ...event.facts } } : {}),
    })),
    droppedCount: trace.droppedCount,
    active: isTraceEffectivelyActive(trace, nowMs),
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
  const nowMs = traceClock();
  const patch: SynthesisSidecarTracePatch = {
    schema: "synthesis-sidecar-trace-patch.v2",
    added: [...pendingAdded]
      .map((id) => traces.get(id))
      .filter((value): value is MutableTrace => Boolean(value))
      .map((trace) => cloneTrace(trace, nowMs)),
    updated: [...pendingUpdated]
      .filter((id) => !pendingAdded.has(id))
      .map((id) => traces.get(id))
      .filter((value): value is MutableTrace => Boolean(value))
      .map((trace) => cloneTrace(trace, nowMs)),
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

function traceEventFact(
  event: SynthesisSidecarObservationEvent,
): SynthesisSidecarTraceEventFact {
  return {
    parentSpanId: event.parentSpanId ?? "",
    phase: event.phase,
    boundary: event.boundary,
    outcome: event.outcome,
    operation: event.identities?.operation ?? "",
    capability: event.identities?.capability ?? "",
  };
}

function traceTier(
  trace: MutableTrace,
  nowMs: number,
): SynthesisSidecarTraceTier {
  const active = isTraceEffectivelyActive(trace, nowMs);
  const cached = trace.tierCache;
  if (
    cached &&
    cached.revision === trace.revision &&
    cached.active === active
  ) {
    return cached.tier;
  }
  const tier = classifySynthesisSidecarTrace(
    trace.events.map(traceEventFact),
    active,
  ).tier;
  trace.tierCache = { revision: trace.revision, active, tier };
  return tier;
}

const EVICTION_TIER_ORDER: Record<SynthesisSidecarTraceTier, number> = {
  routine: 0,
  key: 1,
  failure: 2,
};

function evictCompletedTraces(nowMs: number) {
  let excess = totalEvents() - SYNTHESIS_SIDECAR_TRACE_EVENT_LIMIT;
  if (excess <= 0) return;
  // Evict routine successes first, then key successes, then failures: a
  // routine read must never push a retained failure out of the budget.
  // Classify each trace once per pass, weakest and oldest first.
  const candidates = [...traces.values()]
    .filter((trace) => !isTraceEffectivelyActive(trace, nowMs))
    .map((trace) => ({ trace, tier: traceTier(trace, nowMs) }))
    .sort(
      (left, right) =>
        EVICTION_TIER_ORDER[left.tier] - EVICTION_TIER_ORDER[right.tier] ||
        left.trace.updatedAtMs - right.trace.updatedAtMs,
    );
  for (const { trace } of candidates) {
    if (excess <= 0) return;
    traces.delete(trace.traceId);
    pendingAdded.delete(trace.traceId);
    pendingUpdated.delete(trace.traceId);
    pendingEvicted.add(trace.traceId);
    excess -= trace.events.length;
  }
}

function isPriorityEvent(event: SynthesisSidecarObservationEvent) {
  return (
    isSynthesisSidecarFailureOutcome(event.outcome) ||
    (event.parentSpanId === undefined && event.outcome !== "started") ||
    (event.phase === "maintenance-terminal" && event.outcome !== "started")
  );
}

function isProtectedEvent(trace: MutableTrace, index: number): boolean {
  const event = trace.events[index];
  if (!event) return false;
  return (
    index === 0 ||
    event === trace.firstFailureEvent ||
    event === trace.terminalEvent
  );
}

// Slot that may be overwritten: never the outer start, never a protected
// event. Routine occupants go first, then older failures.
function replaceableIndex(
  trace: MutableTrace,
  options: { exclude?: number; preferLatest?: boolean } = {},
): number | undefined {
  const events = trace.events;
  const candidates = events
    .map((_candidate, index) => index)
    .filter(
      (index) =>
        index > 0 &&
        index !== options.exclude &&
        !isProtectedEvent(trace, index),
    );
  const routine = candidates.filter(
    (index) => !isPriorityEvent(events[index]!),
  );
  if (options.preferLatest) routine.reverse();
  if (routine.length > 0) return routine[0]!;
  if (options.preferLatest) candidates.reverse();
  return candidates[0];
}

function retainPriorityEvent(
  trace: MutableTrace,
  event: SynthesisSidecarObservationEvent,
  rootTerminal: boolean,
  maintenanceTerminal: boolean,
): boolean {
  const events = trace.events;
  const lastIndex = events.length - 1;
  if (rootTerminal) {
    // The outer terminal owns the last slot; a displaced event moves to
    // another slot so neither the terminal nor an earlier failure is lost.
    const displaced = events[lastIndex];
    if (displaced && isPriorityEvent(displaced)) {
      const slot = replaceableIndex(trace, { exclude: lastIndex });
      if (slot !== undefined) events[slot] = displaced;
    }
    events[lastIndex] = event;
    trace.terminalEvent = event;
    return true;
  }
  const slot = replaceableIndex(trace, { preferLatest: maintenanceTerminal });
  if (slot === undefined) return false;
  events[slot] = event;
  if (
    isSynthesisSidecarFailureOutcome(event.outcome) &&
    !trace.firstFailureEvent
  ) {
    trace.firstFailureEvent = event;
  }
  return true;
}

function retainEvent(event: SynthesisSidecarObservationEvent) {
  let trace = traces.get(event.traceId);
  if (!trace) {
    trace = {
      traceId: event.traceId,
      events: [],
      droppedCount: 0,
      active: true,
      rootActive: true,
      activeMaintenanceOperationIds: new Set(),
      revision: 0,
      startedAtMs: event.occurredAtMs,
      updatedAtMs: event.occurredAtMs,
    };
    traces.set(event.traceId, trace);
    pendingAdded.add(event.traceId);
  } else {
    pendingUpdated.add(event.traceId);
  }
  const isFailure = isSynthesisSidecarFailureOutcome(event.outcome);
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
    if (isFailure && !trace.firstFailureEvent) {
      trace.firstFailureEvent = event;
    }
    if (isRootTerminal) trace.terminalEvent = event;
    trace.revision += 1;
  } else {
    trace.droppedCount += 1;
    if (
      isPriorityEvent(event) &&
      retainPriorityEvent(trace, event, isRootTerminal, isMaintenanceTerminal)
    ) {
      trace.revision += 1;
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
  evictCompletedTraces(traceClock());
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
  const nowMs = traceClock();
  const values = [...traces.values()]
    .sort((left, right) => left.startedAtMs - right.startedAtMs)
    .map((trace) => cloneTrace(trace, nowMs));
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

export function setSynthesisSidecarTraceClockForTests(clock?: () => number) {
  traceClock = clock ?? Date.now;
}

export function resetSynthesisSidecarTraceForTests() {
  if (publishTimer !== undefined) globalThis.clearTimeout(publishTimer);
  publishTimer = undefined;
  traceClock = Date.now;
  traces.clear();
  maintenanceOperationOrigins.clear();
  subscribers.clear();
  pendingAdded.clear();
  pendingUpdated.clear();
  pendingEvicted.clear();
  sequence = 0;
}
