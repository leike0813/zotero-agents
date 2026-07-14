import { joinPath } from "../utils/path";
import { sha256Hex } from "../utils/sha256";
import type { SessionNotification } from "./acpProtocol";
import {
  acquireAcpRuntimeDiagnosticsMode,
  releaseAcpRuntimeDiagnosticsMode,
} from "./acpRuntimeDiagnosticsMode";
import { isAcpRuntimeSemanticTraceRecorderAvailable } from "./debugMode";
import {
  ACP_RUNTIME_SEMANTIC_TRACE_DEFAULT_LIMITS,
  ACP_RUNTIME_SEMANTIC_TRACE_SCHEMA,
  acpRuntimeSemanticTraceByteLength,
  createAcpRuntimeMonotonicClock,
  encodeAcpRuntimeSemanticTraceLine,
  encodeAcpRuntimeSemanticTraceText,
  parseAcpRuntimeSemanticTraceNdjson,
  type AcpRuntimeSemanticTraceEvent,
  type AcpRuntimeSemanticTraceEventInput,
  type AcpRuntimeSemanticTraceFooter,
  type AcpRuntimeSemanticTraceHeader,
  type AcpRuntimeSemanticTraceLimits,
  type AcpRuntimeSemanticTraceWarning,
  type AcpRuntimeTraceOwner,
  type AcpRuntimeTraceSourceKind,
} from "./acpRuntimeSemanticTrace";
import {
  appendRuntimeTextFile,
  ensureRuntimeDirectory,
  getRuntimePersistencePaths,
  moveRuntimePath,
  readRuntimeTextFile,
  removeRuntimePath,
  setRuntimeExecutablePermissions,
  writeRuntimeTextFile,
} from "./runtimePersistence";

export type AcpRuntimeSemanticTraceRecorderState =
  | "idle"
  | "armed"
  | "recording"
  | "frozen"
  | "saved";

export type AcpRuntimeSemanticTraceRecorderView = {
  state: AcpRuntimeSemanticTraceRecorderState;
  sourceKind?: AcpRuntimeTraceSourceKind;
  rootId?: string;
  eventCount: number;
  contentBytes: number;
  completion?: "complete" | "incomplete";
  warnings: readonly AcpRuntimeSemanticTraceWarning[];
  partialPath?: string;
  savedPath?: string;
  folder?: string;
  limits: AcpRuntimeSemanticTraceLimits;
};

type ArmOptions = {
  sourceKind: AcpRuntimeTraceSourceKind;
  root?: string;
  limits?: Partial<AcpRuntimeSemanticTraceLimits>;
  nowMs?: number;
  monotonicNow?: () => number;
};

function normalizeLimits(
  value: Partial<AcpRuntimeSemanticTraceLimits> | undefined,
) {
  const defaults = ACP_RUNTIME_SEMANTIC_TRACE_DEFAULT_LIMITS;
  const lower = (candidate: unknown, maximum: number) => {
    const number = Number(candidate);
    return Number.isFinite(number) && number > 0
      ? Math.min(Math.floor(number), maximum)
      : maximum;
  };
  return {
    maxBytes: lower(value?.maxBytes, defaults.maxBytes),
    maxEvents: lower(value?.maxEvents, defaults.maxEvents),
    maxEventBytes: lower(value?.maxEventBytes, defaults.maxEventBytes),
  };
}

function safeTimestamp(nowMs: number) {
  return new Date(Number.isFinite(nowMs) ? nowMs : Date.now())
    .toISOString()
    .replace(/[:.]/g, "-");
}

let state: AcpRuntimeSemanticTraceRecorderState = "idle";
let sourceKind: AcpRuntimeTraceSourceKind | undefined;
let boundRootId: string | undefined;
let partialPath: string | undefined;
let savedPath: string | undefined;
let folder: string | undefined;
let limits: AcpRuntimeSemanticTraceLimits = {
  ...ACP_RUNTIME_SEMANTIC_TRACE_DEFAULT_LIMITS,
};
let eventCount = 0;
let contentBytes = 0;
let warnings: AcpRuntimeSemanticTraceWarning[] = [];
let completion: "complete" | "incomplete" | undefined;
let startedMonotonicMs = 0;
let monotonicNow = createAcpRuntimeMonotonicClock();
let activeTurns = new Set<string>();
let activeRequests = new Set<string>();
let writeChain: Promise<void> = Promise.resolve();
let footerWritten = false;
let recorderNonce = 0;

function recorderView(): AcpRuntimeSemanticTraceRecorderView {
  return {
    state,
    ...(sourceKind ? { sourceKind } : {}),
    ...(boundRootId ? { rootId: boundRootId } : {}),
    eventCount,
    contentBytes,
    ...(completion ? { completion } : {}),
    warnings: [...warnings],
    ...(partialPath ? { partialPath } : {}),
    ...(savedPath ? { savedPath } : {}),
    ...(folder ? { folder } : {}),
    limits: { ...limits },
  };
}

export function getAcpRuntimeSemanticTraceRecorderView() {
  return recorderView();
}

function freezeIncomplete(warning: AcpRuntimeSemanticTraceWarning) {
  if (!warnings.some((entry) => entry.code === warning.code)) {
    warnings.push(warning);
  }
  completion = "incomplete";
  state = "frozen";
  releaseAcpRuntimeDiagnosticsMode("recording");
}

export async function armAcpRuntimeSemanticTraceRecorder(options: ArmOptions) {
  if (!isAcpRuntimeSemanticTraceRecorderAvailable()) {
    throw new Error("ACP semantic trace recorder is unavailable");
  }
  if (state !== "idle") {
    throw new Error("ACP semantic trace recorder is not idle");
  }
  if (!acquireAcpRuntimeDiagnosticsMode("recording")) {
    throw new Error("Another ACP runtime diagnostic mode is active");
  }
  try {
    sourceKind = options.sourceKind;
    limits = normalizeLimits(options.limits);
    eventCount = 0;
    contentBytes = 0;
    warnings = [];
    completion = undefined;
    boundRootId = undefined;
    partialPath = undefined;
    savedPath = undefined;
    activeTurns = new Set();
    activeRequests = new Set();
    writeChain = Promise.resolve();
    footerWritten = false;
    monotonicNow = options.monotonicNow || createAcpRuntimeMonotonicClock();
    startedMonotonicMs = monotonicNow();
    const paths = getRuntimePersistencePaths(options.root);
    folder = joinPath(paths.runtimeRoot, "profiles", "acp-traces");
    await ensureRuntimeDirectory(folder);
    recorderNonce += 1;
    const stem = `acp-trace-${safeTimestamp(options.nowMs ?? Date.now())}-${recorderNonce}`;
    partialPath = joinPath(folder, `${stem}.ndjson.partial`);
    const header: AcpRuntimeSemanticTraceHeader = {
      record: "header",
      schema: ACP_RUNTIME_SEMANTIC_TRACE_SCHEMA,
      sourceKind,
      createdAt: new Date(options.nowMs ?? Date.now()).toISOString(),
    };
    const headerLine = encodeAcpRuntimeSemanticTraceLine(header);
    await writeRuntimeTextFile(partialPath, headerLine);
    await setRuntimeExecutablePermissions(partialPath, 0o600);
    contentBytes = acpRuntimeSemanticTraceByteLength(headerLine);
    state = "armed";
    return recorderView();
  } catch (error) {
    freezeIncomplete({
      code: "write-failed",
      detail: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

function ownerActivityKey(owner: AcpRuntimeTraceOwner) {
  return owner.turnId || owner.requestId || owner.sessionId || owner.rootId;
}

export async function recordAcpRuntimeSemanticTraceEvent(
  input: AcpRuntimeSemanticTraceEventInput,
) {
  if (state !== "armed" && state !== "recording") return false;
  if (!sourceKind || input.sourceKind !== sourceKind) return false;
  if (!input.owner?.rootId) {
    freezeIncomplete({ code: "unowned-event" });
    return false;
  }
  if (!boundRootId) {
    if (input.kind !== "root-start") {
      freezeIncomplete({ code: "mid-turn-start" });
      return false;
    }
    boundRootId = input.owner.rootId;
    state = "recording";
  }
  if (input.owner.rootId !== boundRootId) return false;
  const event: AcpRuntimeSemanticTraceEvent = {
    record: "event",
    seq: eventCount + 1,
    monotonicOffsetMs: Math.max(0, monotonicNow() - startedMonotonicMs),
    ...input,
  };
  const eventLine = encodeAcpRuntimeSemanticTraceLine(event);
  const eventBytes = acpRuntimeSemanticTraceByteLength(eventLine);
  if (eventBytes > limits.maxEventBytes) {
    freezeIncomplete({ code: "single-event-limit" });
    return false;
  }
  if (eventCount + 1 > limits.maxEvents) {
    freezeIncomplete({ code: "event-limit" });
    return false;
  }
  if (contentBytes + eventBytes > limits.maxBytes) {
    freezeIncomplete({ code: "byte-limit" });
    return false;
  }
  eventCount += 1;
  contentBytes += eventBytes;
  const activityKey = ownerActivityKey(input.owner);
  if (input.kind === "turn-start") activeTurns.add(activityKey);
  if (input.kind === "turn-end") activeTurns.delete(activityKey);
  if (input.kind === "request-start") activeRequests.add(activityKey);
  if (input.kind === "request-end" || input.kind === "terminal") {
    activeRequests.delete(activityKey);
  }
  writeChain = writeChain
    .then(async () => {
      if (partialPath) await appendRuntimeTextFile(partialPath, eventLine);
    })
    .catch((error) => {
      freezeIncomplete({
        code: "write-failed",
        detail: error instanceof Error ? error.message : String(error),
      });
    });
  await writeChain;
  return state === "recording";
}

export function recordAcpSessionNotificationForTrace(args: {
  sourceKind: AcpRuntimeTraceSourceKind;
  owner: AcpRuntimeTraceOwner;
  notification: SessionNotification;
}) {
  return recordAcpRuntimeSemanticTraceEvent({
    kind: "session-notification",
    sourceKind: args.sourceKind,
    owner: args.owner,
    payload: args.notification,
  });
}

async function finalizeAcpRuntimeSemanticTracePartial() {
  if (!partialPath || footerWritten) return;
  try {
    const content = await readRuntimeTextFile(partialPath);
    const digest = await sha256Hex(encodeAcpRuntimeSemanticTraceText(content));
    if (!digest) throw new Error("SHA-256 is unavailable");
    const footer: AcpRuntimeSemanticTraceFooter = {
      record: "footer",
      eventCount,
      contentBytes: acpRuntimeSemanticTraceByteLength(content),
      sha256: digest,
      completion: completion || "incomplete",
      warnings: [...warnings],
    };
    await appendRuntimeTextFile(
      partialPath,
      encodeAcpRuntimeSemanticTraceLine(footer),
    );
    footerWritten = true;
    await parseAcpRuntimeSemanticTraceNdjson(
      await readRuntimeTextFile(partialPath),
    );
  } catch (error) {
    freezeIncomplete({
      code: "integrity-failed",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function stopAcpRuntimeSemanticTraceRecorder() {
  if (state !== "armed" && state !== "recording") return recorderView();
  await writeChain;
  if (state === "armed" || activeTurns.size > 0 || activeRequests.size > 0) {
    freezeIncomplete({ code: "active-owner" });
  } else {
    completion = warnings.length > 0 ? "incomplete" : "complete";
    state = "frozen";
    releaseAcpRuntimeDiagnosticsMode("recording");
  }
  await finalizeAcpRuntimeSemanticTracePartial();
  return recorderView();
}

export async function cancelAcpRuntimeSemanticTraceRecorder() {
  if (state !== "armed" && state !== "recording") return recorderView();
  await writeChain;
  freezeIncomplete({ code: "user-canceled" });
  await finalizeAcpRuntimeSemanticTracePartial();
  return recorderView();
}

export async function saveFrozenAcpRuntimeSemanticTrace() {
  if (
    state !== "frozen" ||
    completion !== "complete" ||
    !partialPath ||
    !folder
  ) {
    throw new Error("ACP semantic trace is not a complete frozen trace");
  }
  const targetPath = partialPath.replace(/\.partial$/, "");
  await moveRuntimePath({
    sourcePath: partialPath,
    targetPath,
    overwrite: false,
  });
  await setRuntimeExecutablePermissions(targetPath, 0o600);
  savedPath = targetPath;
  partialPath = undefined;
  state = "saved";
  return { path: targetPath, folder };
}

export async function resetAcpRuntimeSemanticTraceRecorder() {
  if (state === "armed" || state === "recording") {
    throw new Error(
      "Active ACP semantic trace recording must be canceled first",
    );
  }
  if (state !== "frozen" && state !== "saved") {
    throw new Error(
      "ACP semantic trace recorder has no terminal round to reset",
    );
  }
  if (state === "frozen") {
    await writeChain;
    await finalizeAcpRuntimeSemanticTracePartial();
  }
  releaseAcpRuntimeDiagnosticsMode("recording");
  state = "idle";
  sourceKind = undefined;
  boundRootId = undefined;
  partialPath = undefined;
  savedPath = undefined;
  folder = undefined;
  limits = { ...ACP_RUNTIME_SEMANTIC_TRACE_DEFAULT_LIMITS };
  eventCount = 0;
  contentBytes = 0;
  warnings = [];
  completion = undefined;
  activeTurns.clear();
  activeRequests.clear();
  writeChain = Promise.resolve();
  footerWritten = false;
  return recorderView();
}

export async function shutdownAcpRuntimeSemanticTraceRecorder() {
  await writeChain;
  releaseAcpRuntimeDiagnosticsMode("recording");
  state = "idle";
  sourceKind = undefined;
  boundRootId = undefined;
  partialPath = undefined;
  savedPath = undefined;
  folder = undefined;
  limits = { ...ACP_RUNTIME_SEMANTIC_TRACE_DEFAULT_LIMITS };
  eventCount = 0;
  contentBytes = 0;
  warnings = [];
  completion = undefined;
  activeTurns.clear();
  activeRequests.clear();
  writeChain = Promise.resolve();
  footerWritten = false;
}

export async function discardAcpRuntimeSemanticTracePartialForTests() {
  const path = partialPath;
  await shutdownAcpRuntimeSemanticTraceRecorder();
  if (path) await removeRuntimePath(path);
  recorderNonce = 0;
}
