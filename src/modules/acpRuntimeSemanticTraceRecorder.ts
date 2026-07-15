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
  | "stopping"
  | "frozen"
  | "saved";

export type AcpRuntimeSemanticTraceBinding =
  | {
      sourceKind: "acp-chat-conversation";
      backendId: string;
      conversationId: string;
      sessionId: string;
      attachKind: "new" | "resume" | "load";
    }
  | {
      sourceKind: "acp-workflow-execution";
      workflowRunId: string;
      workflowId?: string;
    };

export type AcpRuntimeSemanticTraceRecorderNotice = {
  code: "session-replaced";
  sessionId: string;
};

export type AcpRuntimeSemanticTraceClaimAttempt = Readonly<{
  sourceKind: AcpRuntimeTraceSourceKind;
  token: string;
}>;

export type AcpRuntimeSemanticTraceContext = Readonly<{
  sourceKind: AcpRuntimeTraceSourceKind;
  rootId: string;
  token: string;
}>;

export type AcpRuntimeSemanticTraceRecorderView = {
  state: AcpRuntimeSemanticTraceRecorderState;
  sourceKind?: AcpRuntimeTraceSourceKind;
  rootId?: string;
  binding?: AcpRuntimeSemanticTraceBinding;
  activeTurnCount: number;
  activeRequestCount: number;
  canFinish: boolean;
  claiming: boolean;
  notice?: AcpRuntimeSemanticTraceRecorderNotice;
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
let boundRootOwner: AcpRuntimeTraceOwner | undefined;
let binding: AcpRuntimeSemanticTraceBinding | undefined;
let notice: AcpRuntimeSemanticTraceRecorderNotice | undefined;
let roundToken: string | undefined;
let boundContext: AcpRuntimeSemanticTraceContext | undefined;
let claimAttempts = new Set<string>();
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
let registeredRequestActivities = new Map<
  string,
  {
    context: AcpRuntimeSemanticTraceContext;
    owner: AcpRuntimeTraceOwner;
  }
>();
let completedActivityCount = 0;
let pendingFinishPayload: unknown;
let finishWaiters: Array<(view: AcpRuntimeSemanticTraceRecorderView) => void> =
  [];
let writeChain: Promise<void> = Promise.resolve();
let footerWritten = false;
let recorderNonce = 0;
let tokenNonce = 0;

function recorderView(): AcpRuntimeSemanticTraceRecorderView {
  return {
    state,
    ...(sourceKind ? { sourceKind } : {}),
    ...(boundRootId ? { rootId: boundRootId } : {}),
    ...(binding ? { binding: { ...binding } } : {}),
    activeTurnCount: activeTurns.size,
    activeRequestCount: activeRequests.size,
    canFinish:
      (state === "recording" || state === "stopping") &&
      completedActivityCount > 0,
    claiming: state === "armed" && claimAttempts.size > 0,
    ...(notice ? { notice: { ...notice } } : {}),
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
  roundToken = undefined;
  boundContext = undefined;
  claimAttempts.clear();
  registeredRequestActivities.clear();
  releaseAcpRuntimeDiagnosticsMode("recording");
  const view = recorderView();
  for (const resolve of finishWaiters.splice(0)) resolve(view);
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
    boundRootOwner = undefined;
    binding = undefined;
    notice = undefined;
    tokenNonce += 1;
    roundToken = `round-${recorderNonce + 1}-${tokenNonce}`;
    boundContext = undefined;
    claimAttempts = new Set();
    partialPath = undefined;
    savedPath = undefined;
    activeTurns = new Set();
    activeRequests = new Set();
    registeredRequestActivities = new Map();
    completedActivityCount = 0;
    pendingFinishPayload = undefined;
    finishWaiters = [];
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
  return owner.turnId || owner.requestId;
}

function isLiveContext(
  context: AcpRuntimeSemanticTraceContext | undefined,
): context is AcpRuntimeSemanticTraceContext {
  return Boolean(
    context &&
    boundContext &&
    context.token === boundContext.token &&
    context.sourceKind === boundContext.sourceKind &&
    context.rootId === boundContext.rootId,
  );
}

function eventMatchesBinding(input: AcpRuntimeSemanticTraceEventInput) {
  if (!binding || input.sourceKind !== binding.sourceKind) return false;
  if (input.owner.rootId !== boundRootId) return false;
  if (
    binding.sourceKind === "acp-chat-conversation" &&
    input.owner.sessionId !== binding.sessionId
  ) {
    return false;
  }
  return true;
}

async function appendAcpRuntimeSemanticTraceEvent(
  input: AcpRuntimeSemanticTraceEventInput,
) {
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
  return state !== "frozen";
}

export function beginAcpRuntimeSemanticTraceClaimAttempt(
  attemptSourceKind: AcpRuntimeTraceSourceKind,
) {
  if (
    state !== "armed" ||
    !roundToken ||
    !sourceKind ||
    attemptSourceKind !== sourceKind
  ) {
    return undefined;
  }
  tokenNonce += 1;
  const token = `${roundToken}:claim-${tokenNonce}`;
  claimAttempts.add(token);
  return Object.freeze({ sourceKind: attemptSourceKind, token });
}

export function abandonAcpRuntimeSemanticTraceClaimAttempt(
  attempt: AcpRuntimeSemanticTraceClaimAttempt | undefined,
) {
  if (!attempt) return false;
  return claimAttempts.delete(attempt.token);
}

export async function claimAcpRuntimeSemanticTraceRoot(args: {
  attempt: AcpRuntimeSemanticTraceClaimAttempt;
  binding: AcpRuntimeSemanticTraceBinding;
  owner: AcpRuntimeTraceOwner;
  payload: unknown;
}) {
  if (
    state !== "armed" ||
    !roundToken ||
    boundContext ||
    !claimAttempts.has(args.attempt.token) ||
    args.attempt.sourceKind !== sourceKind ||
    args.binding.sourceKind !== sourceKind ||
    !args.owner.rootId
  ) {
    return undefined;
  }
  if (
    args.binding.sourceKind === "acp-chat-conversation" &&
    (args.owner.conversationId !== args.binding.conversationId ||
      args.owner.sessionId !== args.binding.sessionId)
  ) {
    return undefined;
  }
  if (
    args.binding.sourceKind === "acp-workflow-execution" &&
    args.owner.workflowRunId !== args.binding.workflowRunId
  ) {
    return undefined;
  }
  const context = Object.freeze({
    sourceKind: args.attempt.sourceKind,
    rootId: args.owner.rootId,
    token: `${roundToken}:root-${tokenNonce}`,
  });
  claimAttempts.clear();
  boundRootId = args.owner.rootId;
  boundRootOwner = { ...args.owner };
  binding = { ...args.binding } as AcpRuntimeSemanticTraceBinding;
  boundContext = context;
  state = "recording";
  const appended = await appendAcpRuntimeSemanticTraceEvent({
    kind: "root-start",
    sourceKind: context.sourceKind,
    owner: boundRootOwner,
    payload: args.payload,
  });
  return appended ? context : undefined;
}

export function noticeAcpRuntimeSemanticTraceSessionReplacement(args: {
  context: AcpRuntimeSemanticTraceContext;
  sessionId: string;
}) {
  if (
    !isLiveContext(args.context) ||
    binding?.sourceKind !== "acp-chat-conversation" ||
    args.sessionId === binding.sessionId
  ) {
    return false;
  }
  notice = { code: "session-replaced", sessionId: args.sessionId };
  return true;
}

async function completeAcpRuntimeSemanticTraceRoot(payload: unknown) {
  if (
    !boundContext ||
    !boundRootOwner ||
    completedActivityCount < 1 ||
    activeTurns.size > 0 ||
    activeRequests.size > 0 ||
    footerWritten
  ) {
    return recorderView();
  }
  const appended = await appendAcpRuntimeSemanticTraceEvent({
    kind: "root-end",
    sourceKind: boundContext.sourceKind,
    owner: boundRootOwner,
    payload,
  });
  if (!appended) return recorderView();
  completion = warnings.length > 0 ? "incomplete" : "complete";
  state = "frozen";
  roundToken = undefined;
  boundContext = undefined;
  claimAttempts.clear();
  registeredRequestActivities.clear();
  releaseAcpRuntimeDiagnosticsMode("recording");
  await finalizeAcpRuntimeSemanticTracePartial();
  const view = recorderView();
  for (const resolve of finishWaiters.splice(0)) resolve(view);
  return view;
}

export async function recordAcpRuntimeSemanticTraceEvent(
  context: AcpRuntimeSemanticTraceContext | undefined,
  input: AcpRuntimeSemanticTraceEventInput,
) {
  if (state !== "recording" && state !== "stopping") return false;
  if (!isLiveContext(context) || !eventMatchesBinding(input)) return false;
  if (input.kind === "root-start" || input.kind === "root-end") return false;
  const activityKey = ownerActivityKey(input.owner);
  if (input.kind === "turn-start") {
    if (state === "stopping" || !activityKey || activeTurns.has(activityKey)) {
      return false;
    }
    activeTurns.add(activityKey);
  } else if (input.kind === "request-start") {
    if (
      state === "stopping" ||
      !activityKey ||
      activeRequests.has(activityKey)
    ) {
      return false;
    }
    activeRequests.add(activityKey);
    registeredRequestActivities.set(activityKey, {
      context,
      owner: { ...input.owner },
    });
  } else if (input.kind === "turn-end") {
    if (!activityKey || !activeTurns.delete(activityKey)) return false;
    completedActivityCount += 1;
  } else if (input.kind === "request-end") {
    if (!activityKey || !activeRequests.delete(activityKey)) return false;
    registeredRequestActivities.delete(activityKey);
    completedActivityCount += 1;
  }
  const appended = await appendAcpRuntimeSemanticTraceEvent(input);
  if (
    appended &&
    state === "stopping" &&
    activeTurns.size === 0 &&
    activeRequests.size === 0
  ) {
    await completeAcpRuntimeSemanticTraceRoot(pendingFinishPayload);
  }
  return appended;
}

export async function recordAcpRuntimeSemanticTraceRequestTerminal(args: {
  requestId: string;
  payload: unknown;
}) {
  const registered = registeredRequestActivities.get(args.requestId);
  if (!registered) return false;
  if (
    !isLiveContext(registered.context) ||
    !eventMatchesBinding({
      kind: "terminal",
      sourceKind: "acp-workflow-execution",
      owner: registered.owner,
      payload: args.payload,
    })
  ) {
    return false;
  }
  const terminalRecorded = await appendAcpRuntimeSemanticTraceEvent({
    kind: "terminal",
    sourceKind: "acp-workflow-execution",
    owner: registered.owner,
    payload: args.payload,
  });
  if (!terminalRecorded) return false;
  const ended = await recordAcpRuntimeSemanticTraceEvent(registered.context, {
    kind: "request-end",
    sourceKind: "acp-workflow-execution",
    owner: registered.owner,
    payload: args.payload,
  });
  return ended;
}

export async function settleAcpRuntimeSemanticTraceOpenRequests(args: {
  context: AcpRuntimeSemanticTraceContext;
  payload: unknown;
}) {
  if (!isLiveContext(args.context)) return 0;
  const requestIds = [...registeredRequestActivities.entries()]
    .filter(([, entry]) => entry.context.token === args.context.token)
    .map(([requestId]) => requestId);
  let settled = 0;
  for (const requestId of requestIds) {
    if (
      await recordAcpRuntimeSemanticTraceRequestTerminal({
        requestId,
        payload: args.payload,
      })
    ) {
      settled += 1;
    }
  }
  return settled;
}

export function recordAcpSessionNotificationForTrace(args: {
  context?: AcpRuntimeSemanticTraceContext;
  sourceKind: AcpRuntimeTraceSourceKind;
  owner: AcpRuntimeTraceOwner;
  notification: SessionNotification;
}) {
  return recordAcpRuntimeSemanticTraceEvent(args.context, {
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

export async function finishAcpRuntimeSemanticTraceRoot(args?: {
  context?: AcpRuntimeSemanticTraceContext;
  payload?: unknown;
  waitForActivities?: boolean;
}) {
  if (state !== "recording" && state !== "stopping") {
    return recorderView();
  }
  if (args?.context && !isLiveContext(args.context)) return recorderView();
  await writeChain;
  if (completedActivityCount < 1) return recorderView();
  pendingFinishPayload = args?.payload ?? { outcome: "complete" };
  if (activeTurns.size > 0 || activeRequests.size > 0) {
    state = "stopping";
    if (args?.waitForActivities) {
      return new Promise<AcpRuntimeSemanticTraceRecorderView>((resolve) => {
        finishWaiters.push(resolve);
      });
    }
    return recorderView();
  }
  return completeAcpRuntimeSemanticTraceRoot(pendingFinishPayload);
}

export async function cancelAcpRuntimeSemanticTraceRecorder() {
  if (state !== "armed" && state !== "recording" && state !== "stopping") {
    return recorderView();
  }
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
  if (state === "armed" || state === "recording" || state === "stopping") {
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
  boundRootOwner = undefined;
  binding = undefined;
  notice = undefined;
  roundToken = undefined;
  boundContext = undefined;
  claimAttempts.clear();
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
  registeredRequestActivities.clear();
  completedActivityCount = 0;
  pendingFinishPayload = undefined;
  finishWaiters = [];
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
  boundRootOwner = undefined;
  binding = undefined;
  notice = undefined;
  roundToken = undefined;
  boundContext = undefined;
  claimAttempts.clear();
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
  registeredRequestActivities.clear();
  completedActivityCount = 0;
  pendingFinishPayload = undefined;
  finishWaiters = [];
  writeChain = Promise.resolve();
  footerWritten = false;
}

export async function discardAcpRuntimeSemanticTracePartialForTests() {
  const path = partialPath;
  await shutdownAcpRuntimeSemanticTraceRecorder();
  if (path) await removeRuntimePath(path);
  recorderNonce = 0;
}
