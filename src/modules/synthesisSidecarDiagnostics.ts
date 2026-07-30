import { isSynthesisSidecarDiagnosticsAvailable } from "./debugMode";
import {
  appendRuntimeLog,
  registerRuntimeIssueDebugContextProvider,
} from "./runtimeLogManager";
import {
  registerSynthesisSidecarDebugEventSink,
  type SynthesisSidecarDiagnosticEvent,
} from "./synthesisSidecarDiagnosticEvents";

export type {
  SynthesisSidecarDiagnosticComponent,
  SynthesisSidecarDiagnosticEvent,
  SynthesisSidecarDiagnosticEventInput,
  SynthesisSidecarDiagnosticEventStatus,
} from "./synthesisSidecarDiagnosticEvents";

export type SynthesisSidecarStartupPhase =
  | "startup"
  | "runtime-install"
  | "supervisor-launch"
  | "discovery"
  | "reconcile"
  | "ready"
  | "shutdown";

export type SynthesisSidecarStartupStatus =
  | "started"
  | "running"
  | "succeeded"
  | "failed";

export type SynthesisSidecarDiagnosticEvidence = {
  sourceOwner?: "legacy-plugin" | "empty-profile";
  bundleId?: string;
  buildFingerprint?: string;
  currentBuildFingerprint?: string;
  targetBuildFingerprint?: string;
  generation?: number;
  status?: string;
  targetTriple?: string;
  runtimeRoot?: string;
  repositoryDbPath?: string;
  canonicalRoot?: string;
  supervisorInstanceId?: string;
  serviceInstanceId?: string;
  supervisorStatus?: string;
  recoveryState?: string;
  restartCount?: number;
  stdoutTail?: string;
  stderrTail?: string;
};

export type SynthesisSidecarDiagnosticSnapshot = {
  schema: "synthesis-sidecar-diagnostic-snapshot.v1";
  attemptId: string;
  phase: SynthesisSidecarStartupPhase;
  status: SynthesisSidecarStartupStatus;
  startedAt: string;
  updatedAt: string;
  code?: string;
  evidence: SynthesisSidecarDiagnosticEvidence;
};

type Subscriber = (
  snapshot: SynthesisSidecarDiagnosticSnapshot | undefined,
) => void;

let attemptSequence = 0;
let snapshot: SynthesisSidecarDiagnosticSnapshot | undefined;
let events: SynthesisSidecarDiagnosticEvent[] = [];
const subscribers = new Set<Subscriber>();
const PROCESS_TAIL_LIMIT = 8_192;
const EVENT_LIMIT = 500;

function sanitizeProcessTail(value: string | undefined) {
  if (typeof value !== "string") {
    return undefined;
  }
  const redacted = value
    .replace(
      /(clientToken|lifecycleToken|authorizationToken|token)\s*[:=]\s*["']?[^\s"',}]+/gi,
      "$1=<redacted>",
    )
    .replace(/\bBearer\s+[^\s"',}]+/gi, "Bearer <redacted>");
  return redacted.length <= PROCESS_TAIL_LIMIT
    ? redacted
    : redacted.slice(-PROCESS_TAIL_LIMIT);
}

function sanitizeEvidence(
  value: SynthesisSidecarDiagnosticEvidence | undefined,
) {
  if (!value) {
    return {};
  }
  const result = Object.fromEntries(
    Object.entries(value).filter(([, entry]) => typeof entry !== "undefined"),
  ) as SynthesisSidecarDiagnosticEvidence;
  if ("stdoutTail" in result) {
    result.stdoutTail = sanitizeProcessTail(result.stdoutTail);
  }
  if ("stderrTail" in result) {
    result.stderrTail = sanitizeProcessTail(result.stderrTail);
  }
  return result;
}

function cloneSnapshot(value: SynthesisSidecarDiagnosticSnapshot | undefined) {
  return value
    ? {
        ...value,
        evidence: { ...value.evidence },
      }
    : undefined;
}

function publish() {
  const value = cloneSnapshot(snapshot);
  for (const subscriber of subscribers) {
    subscriber(value);
  }
}

function appendLifecycleLog(args: {
  attemptId: string;
  phase: SynthesisSidecarStartupPhase;
  status: SynthesisSidecarStartupStatus;
  code?: string;
  evidence?: SynthesisSidecarDiagnosticEvidence;
  error?: unknown;
}) {
  appendRuntimeLog({
    level: args.status === "failed" ? "error" : "info",
    scope: "system",
    component: "synthesis-sidecar-lifecycle",
    operation: "production-startup",
    requestId: args.attemptId,
    phase: args.phase,
    stage: args.status,
    message: args.code || `Synthesis sidecar ${args.phase} ${args.status}`,
    details: args.evidence,
    error: args.error,
  });
}

function emitDiagnosticConsole(event: SynthesisSidecarDiagnosticEvent) {
  if (!isSynthesisSidecarDiagnosticsAvailable()) {
    return;
  }
  const label = "[synthesis-sidecar]";
  const runtime = globalThis as typeof globalThis & {
    Zotero?: { debug?: (message: string) => void };
  };
  const method =
    event.status === "failed"
      ? globalThis.console?.error
      : globalThis.console?.debug;
  try {
    method?.call(globalThis.console, label, event);
  } catch {
    // Diagnostics must never affect the observed operation.
  }
  try {
    runtime.Zotero?.debug?.(`${label} ${JSON.stringify(event)}`);
  } catch {
    // Diagnostics must never affect the observed operation.
  }
}

export function retainSynthesisSidecarDiagnosticEvent(
  event: SynthesisSidecarDiagnosticEvent,
) {
  events = [...events, { ...event }].slice(-EVENT_LIMIT);
  emitDiagnosticConsole(event);
  publish();
}

registerSynthesisSidecarDebugEventSink(retainSynthesisSidecarDiagnosticEvent);

export function listSynthesisSidecarDiagnosticEvents() {
  return isSynthesisSidecarDiagnosticsAvailable()
    ? events.map((event) => ({ ...event }))
    : [];
}

export function beginSynthesisSidecarStartupAttempt() {
  const attemptId = `synthesis-startup-${Date.now()}-${++attemptSequence}`;
  if (!isSynthesisSidecarDiagnosticsAvailable()) {
    return attemptId;
  }
  const now = new Date().toISOString();
  snapshot = {
    schema: "synthesis-sidecar-diagnostic-snapshot.v1",
    attemptId,
    phase: "startup",
    status: "started",
    startedAt: now,
    updatedAt: now,
    evidence: {},
  };
  publish();
  return attemptId;
}

export function recordSynthesisSidecarStartupPhase(args: {
  attemptId: string;
  phase: SynthesisSidecarStartupPhase;
  status: SynthesisSidecarStartupStatus;
  code?: string;
  evidence?: SynthesisSidecarDiagnosticEvidence;
  error?: unknown;
}) {
  if (!isSynthesisSidecarDiagnosticsAvailable()) {
    if (args.status === "failed") {
      appendLifecycleLog({
        ...args,
        evidence: sanitizeEvidence(args.evidence),
      });
    }
    return;
  }
  if (!snapshot || snapshot.attemptId !== args.attemptId) {
    return;
  }
  const evidence = sanitizeEvidence(args.evidence);
  snapshot = {
    ...snapshot,
    phase: args.phase,
    status: args.status,
    updatedAt: new Date().toISOString(),
    code: args.code,
    evidence: {
      ...snapshot.evidence,
      ...evidence,
    },
  };
  if (args.status === "failed") {
    appendLifecycleLog({
      ...args,
      evidence,
    });
  }
  publish();
}

export function getSynthesisSidecarDiagnosticSnapshot() {
  if (!isSynthesisSidecarDiagnosticsAvailable()) {
    return undefined;
  }
  return cloneSnapshot(snapshot);
}

export function subscribeSynthesisSidecarDiagnostics(subscriber: Subscriber) {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}

export function resetSynthesisSidecarDiagnosticsForTests() {
  snapshot = undefined;
  attemptSequence = 0;
  events = [];
  publish();
}

registerRuntimeIssueDebugContextProvider(
  "synthesisSidecar",
  getSynthesisSidecarDiagnosticSnapshot,
);
