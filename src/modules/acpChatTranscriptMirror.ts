import type { AssistantWorkspacePublishReason } from "./assistantExecutionDisplayPolicy";
import { isAcpTranscriptHardBoundaryUpdate } from "./acpTranscriptBoundary";
import {
  enqueueAcpChatTranscriptEvent,
  flushAcpChatTranscriptWrites,
  readFullAcpChatTranscript,
  resolveAcpChatTranscriptPaths,
} from "./acpConversationTranscriptStore";
import { describeAcpError } from "./acpDiagnostics";
import {
  cloneAcpConversationItem,
  normalizeAcpStatus,
  type AcpConversationItem,
  type AcpConversationMessageItem,
  type AcpConversationPlanItem,
  type AcpConversationStatusItem,
  type AcpConversationToolCallItem,
  type AcpDiagnosticsEntry,
} from "./acpTypes";
import type {
  AcpChatSessionRuntime,
  AcpChatWorkspaceChangeKind,
} from "./acpSessionManager";
import {
  appendStreamingTranscriptMirrorText,
  completeActiveStreamingMirrorTextItems,
  createAssistantTranscriptMirrorLru,
  finalizeStreamingTranscriptMirrorItems,
  hydrateAssistantTranscriptMirror,
  patchTranscriptMirrorItem,
  releaseAllIdleBackgroundTranscriptMirrors,
  releaseIdleBackgroundTranscriptMirror,
  scheduleAssistantTranscriptMirrorHydrate,
  readAssistantTranscriptMirrorPage,
  upsertTranscriptMirrorItem,
  type AssistantTranscriptMirrorOwnerDescriptor,
} from "./assistantTranscriptMirrorStore";
import type { AssistantWorkspaceTranscriptBoundary } from "./assistantWorkspaceTranscriptPublication";

const ACP_CHAT_COLD_TRANSCRIPT_MIRROR_CACHE_LIMIT = 10;
const ACP_CHAT_TRANSCRIPT_PAGE_DEFAULT_LIMIT = 80;
const ACP_CHAT_TRANSCRIPT_PAGE_MAX_LIMIT = 200;

function nowIso() {
  return new Date().toISOString();
}

function nextOpaqueId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function compactError(error: unknown) {
  return describeAcpError(error, "unknown error").replace(/\s+/g, " ").trim();
}

type AcpChatTranscriptMirrorEmitOptions = {
  persist?: boolean;
  throttleUi?: boolean;
  throttlePersist?: boolean;
  touchUpdatedAt?: boolean;
  notifyUi?: boolean;
  uiReason?: AssistantWorkspacePublishReason;
  changeKinds?: AcpChatWorkspaceChangeKind[];
};

// Host services owned by acpSessionManager (session registry, foreground
// selection, snapshot emission, diagnostics). Injected once at module load
// so this driver never imports the workspace data-plane or session-manager
// runtime code.
export type AcpChatTranscriptMirrorHost = {
  ownerKey(sessionRuntime: AcpChatSessionRuntime): string;
  resolveSessionRuntime(ownerKey: string): AcpChatSessionRuntime | undefined;
  listSessionRuntimes(): Iterable<AcpChatSessionRuntime>;
  isForegroundSessionRuntime(sessionRuntime: AcpChatSessionRuntime): boolean;
  emitSessionRuntimeSnapshot(
    sessionRuntime: AcpChatSessionRuntime,
    options: AcpChatTranscriptMirrorEmitOptions,
  ): void;
  appendDiagnostic(
    sessionRuntime: AcpChatSessionRuntime,
    entry: AcpDiagnosticsEntry,
  ): void;
};

let host: AcpChatTranscriptMirrorHost;

export function configureAcpChatTranscriptMirrorHost(
  nextHost: AcpChatTranscriptMirrorHost,
) {
  host = nextHost;
}

export function isLiveAcpChatSessionRuntime(
  sessionRuntime: AcpChatSessionRuntime,
) {
  const status = normalizeAcpStatus(sessionRuntime.snapshot.status);
  return (
    !!sessionRuntime.adapter ||
    sessionRuntime.snapshot.busy === true ||
    status === "checking-command" ||
    status === "spawning" ||
    status === "initializing" ||
    status === "connected" ||
    status === "prompting" ||
    status === "permission-required" ||
    status === "auth-required"
  );
}

function truncateAcpChatPreview(value: unknown) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  return text.length > 8 * 1024
    ? `${text.slice(0, 8 * 1024)}...<truncated>`
    : text;
}

function acpChatPreviewFromItem(item: AcpConversationItem) {
  if (item.kind === "message" || item.kind === "thought") {
    return truncateAcpChatPreview(item.text);
  }
  if (item.kind === "status") {
    return truncateAcpChatPreview(item.text);
  }
  if (item.kind === "tool_call") {
    return truncateAcpChatPreview(
      item.summary || item.resultSummary || item.inputSummary || item.title,
    );
  }
  if (item.kind === "plan") {
    return truncateAcpChatPreview(
      item.entries
        .map((entry) => entry.content)
        .filter(Boolean)
        .join(" "),
    );
  }
  return "";
}

function isTerminalPlanStatus(status: string) {
  return [
    "complete",
    "completed",
    "done",
    "succeeded",
    "success",
    "skipped",
    "cancelled",
    "canceled",
    "failed",
    "error",
  ].includes(
    String(status || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_"),
  );
}

const acpChatTranscriptMirrorDescriptor: AssistantTranscriptMirrorOwnerDescriptor<
  AcpConversationItem,
  AcpChatSessionRuntime
> = {
  core: (state) => state,
  ownerKey: (state) => host.ownerKey(state),
  isLive: (state) => isLiveAcpChatSessionRuntime(state),
  isForeground: (state) => host.isForegroundSessionRuntime(state),
  resolveOwnerState: (ownerKey) => host.resolveSessionRuntime(ownerKey),
  listOwnerStates: () => host.listSessionRuntimes(),
  hasOwner: (state) => !!String(state.snapshot.conversationId || "").trim(),
  cloneItem: (item) => cloneAcpConversationItem(item),
  previewFromItem: (item) => acpChatPreviewFromItem(item),
  appendTextToItem: (item, text) => {
    if (item.kind !== "message" && item.kind !== "thought") {
      return undefined;
    }
    return {
      ...item,
      text: `${item.text || ""}${text}`,
      updatedAt: nowIso(),
    } as AcpConversationItem;
  },
  allocateItemId: (_state, prefix) => nextOpaqueId(prefix),
  streaming: {
    textItemIdPrefix: (channel) =>
      channel === "assistant" ? "acp-msg-assistant" : "acp-thought",
    getActiveTextItemId: (state, channel) =>
      channel === "assistant"
        ? state.activeAssistantItemId
        : state.activeThoughtItemId,
    getContinuationTextItemId: (state, channel) => {
      if (channel === "assistant") {
        const latest = state.transcriptItemsById.get(
          state.activeAssistantItemId,
        );
        return latest?.kind === "message" && latest.role === "assistant"
          ? latest.id
          : "";
      }
      const latest = state.transcriptItemsById.get(state.activeThoughtItemId);
      return latest?.kind === "thought" ? latest.id : "";
    },
    setActiveTextItemId: (state, channel, itemId) => {
      if (channel === "assistant") {
        state.activeAssistantItemId = itemId;
      } else {
        state.activeThoughtItemId = itemId;
      }
    },
    createStreamingTextItem: (
      _state,
      { channel, role, text, id, createdAt },
    ) =>
      channel === "assistant"
        ? ({
            id,
            kind: "message",
            role: (role as AcpConversationMessageItem["role"]) || "assistant",
            text,
            createdAt,
            updatedAt: createdAt,
            state: "streaming",
          } as AcpConversationItem)
        : ({
            id,
            kind: "thought",
            text,
            createdAt,
            updatedAt: createdAt,
            state: "streaming",
          } as AcpConversationItem),
  },
  plan: {
    mode: "transcript-item",
    getActivePlanItemId: (state) => state.activePlanItemId,
    setActivePlanItemId: (state, itemId) => {
      state.activePlanItemId = itemId;
    },
    finalizePlanItemPatch: (item, terminalStatus) => {
      if (item.kind !== "plan") {
        return {};
      }
      return {
        entries: item.entries.map((entry) =>
          isTerminalPlanStatus(entry.status)
            ? entry
            : { ...entry, status: terminalStatus },
        ),
        updatedAt: nowIso(),
      };
    },
  },
  continuity: {
    rememberLoadedItem: (state, item) => {
      if (item.kind === "tool_call" && item.toolCallId) {
        state.transcriptToolItemIds.set(item.toolCallId, item.id);
      }
    },
    rememberItem: (state, item) => {
      if (item.kind === "tool_call" && item.toolCallId) {
        state.transcriptToolItemIds.set(item.toolCallId, item.id);
      }
    },
    forgetItem: (state, item) => {
      if (item.kind === "tool_call" && item.toolCallId) {
        state.transcriptToolItemIds.delete(item.toolCallId);
      }
    },
    resetMirrorState: (state) => {
      state.transcriptToolItemIds.clear();
      state.activeAssistantItemId = "";
      state.activeThoughtItemId = "";
      state.activePlanItemId = "";
    },
  },
  resolveLoadedCounters: (state, { itemCount, eventSeq }) => ({
    itemCount,
    eventSeq: Math.max(
      Number(eventSeq) || 0,
      Number(state.snapshot.transcriptEventSeq) || 0,
    ),
  }),
  syncEventMetadata: (state, { item, text }) => {
    const paths = resolveAcpChatTranscriptPaths(
      state.snapshot.conversationStorageDir,
    );
    state.snapshot.transcriptPath = paths.transcriptPath;
    state.snapshot.transcriptIndexPath = paths.transcriptIndexPath;
    state.snapshot.transcriptRevision = state.transcriptEventSeq;
    state.snapshot.transcriptEventSeq = state.transcriptEventSeq;
    state.snapshot.transcriptItemCount = state.transcriptItemCount;
    const preview = text
      ? truncateAcpChatPreview(text)
      : item
        ? acpChatPreviewFromItem(item)
        : "";
    if (preview) {
      state.transcriptPreview = preview;
      state.snapshot.transcriptPreview = preview;
    }
  },
  syncLoadedMetadata: (state, { preview }) => {
    state.transcriptPreview = preview || "";
    state.snapshot.transcriptItemCount = state.transcriptItemCount;
    state.snapshot.transcriptEventSeq = state.transcriptEventSeq;
    state.snapshot.transcriptRevision = state.transcriptEventSeq;
    state.snapshot.transcriptPreview = state.transcriptPreview || undefined;
  },
  onMirrorForceReleased: (state) => {
    state.transcriptMirrorLoaded = false;
    state.transcriptHydrateState = undefined;
    state.transcriptHydrateError = undefined;
    state.transcriptHydratePromise = undefined;
  },
  persistEvent: (state, args) => {
    enqueueAcpChatTranscriptEvent({
      conversationStorageDir: state.snapshot.conversationStorageDir,
      op: args.op,
      itemId: args.itemId,
      item: args.item,
      text: args.text,
      patch: args.patch,
      createdAt: args.createdAt,
    });
  },
  flushWrites: (state) =>
    flushAcpChatTranscriptWrites(state.snapshot.conversationStorageDir),
  readFullTranscript: async (state) => {
    const transcript = await readFullAcpChatTranscript({
      conversationStorageDir: state.snapshot.conversationStorageDir,
    });
    return {
      items: transcript.items.map((item) => cloneAcpConversationItem(item)),
      eventSeq: transcript.eventSeq,
    };
  },
  onHydrateWaitingForWrites: (state, pendingCount) => {
    host.appendDiagnostic(state, {
      id: nextOpaqueId("acp-diag"),
      ts: nowIso(),
      kind: "transcript_hydrate_waiting_for_writes",
      level: "warn",
      message:
        "ACP Chat transcript hydrate is waiting for pending writes for this session.",
      detail: `pending=${pendingCount}`,
    });
  },
  onHydrateSettled: (state) => {
    host.emitSessionRuntimeSnapshot(state, {
      persist: false,
      touchUpdatedAt: false,
      uiReason: "critical",
    });
  },
  errorText: (error) => compactError(error),
};

const acpChatTranscriptMirrorLru = createAssistantTranscriptMirrorLru(
  acpChatTranscriptMirrorDescriptor,
  { limit: ACP_CHAT_COLD_TRANSCRIPT_MIRROR_CACHE_LIMIT },
);

export function getAcpChatTranscriptMirrorCacheDiagnostics(ownerKey: string) {
  return {
    cached: acpChatTranscriptMirrorLru.has(ownerKey),
    size: acpChatTranscriptMirrorLru.size(),
  };
}

export function clearAcpChatTranscriptMirrorLru() {
  acpChatTranscriptMirrorLru.clear();
}

export function pushAcpChatTranscriptItem(
  sessionRuntime: AcpChatSessionRuntime,
  item: AcpConversationItem,
  boundary?: AssistantWorkspaceTranscriptBoundary,
) {
  upsertTranscriptMirrorItem(
    sessionRuntime,
    acpChatTranscriptMirrorDescriptor,
    item,
    boundary,
  );
}

export function upsertAcpChatStatusItem(
  sessionRuntime: AcpChatSessionRuntime,
  args: {
    level: "info" | "warn" | "error";
    label: string;
    text: string;
  },
) {
  const item: AcpConversationStatusItem = {
    id: nextOpaqueId("acp-status"),
    kind: "status",
    level: args.level,
    label: args.label,
    text: args.text,
    createdAt: nowIso(),
  };
  pushAcpChatTranscriptItem(sessionRuntime, item);
}

export function finalizeAcpChatStreamingItems(
  sessionRuntime: AcpChatSessionRuntime,
  finalState: "complete" | "error",
  planTerminalStatus: "cancelled" | "skipped" = "skipped",
) {
  finalizeStreamingTranscriptMirrorItems(
    sessionRuntime,
    acpChatTranscriptMirrorDescriptor,
    finalState,
    planTerminalStatus,
  );
}

export function completeAcpChatActiveStreamingTextItems(
  sessionRuntime: AcpChatSessionRuntime,
  args?: { except?: string },
) {
  completeActiveStreamingMirrorTextItems(
    sessionRuntime,
    acpChatTranscriptMirrorDescriptor,
    args,
  );
}

export function hydrateAcpChatTranscriptMirror(
  sessionRuntime: AcpChatSessionRuntime,
) {
  return hydrateAssistantTranscriptMirror(
    sessionRuntime,
    acpChatTranscriptMirrorDescriptor,
    acpChatTranscriptMirrorLru,
  );
}

export function scheduleAcpChatTranscriptHydrate(
  sessionRuntime: AcpChatSessionRuntime,
) {
  scheduleAssistantTranscriptMirrorHydrate(
    sessionRuntime,
    acpChatTranscriptMirrorDescriptor,
    acpChatTranscriptMirrorLru,
  );
}

export function releaseIdleAcpChatBackgroundTranscriptMirror(
  sessionRuntime: AcpChatSessionRuntime,
) {
  releaseIdleBackgroundTranscriptMirror(
    sessionRuntime,
    acpChatTranscriptMirrorDescriptor,
    acpChatTranscriptMirrorLru,
  );
}

export function pruneIdleAcpChatBackgroundTranscriptMirrors() {
  releaseAllIdleBackgroundTranscriptMirrors(
    acpChatTranscriptMirrorDescriptor,
    acpChatTranscriptMirrorLru,
  );
}

export function normalizeAcpChatTranscriptPageLimit(value: unknown) {
  return Math.max(
    1,
    Math.min(
      ACP_CHAT_TRANSCRIPT_PAGE_MAX_LIMIT,
      Math.floor(Number(value || ACP_CHAT_TRANSCRIPT_PAGE_DEFAULT_LIMIT)),
    ),
  );
}

export function readAcpChatTranscriptMirrorPage(
  sessionRuntime: AcpChatSessionRuntime,
  args: {
    cursor?: number;
    limit?: number;
    executionDisplayMode: "live" | "boundary" | "silent";
  },
) {
  return readAssistantTranscriptMirrorPage(
    sessionRuntime,
    acpChatTranscriptMirrorDescriptor,
    acpChatTranscriptMirrorLru,
    {
      cursor: args.cursor,
      limit: args.limit,
      executionDisplayMode: args.executionDisplayMode,
      defaultLimit: ACP_CHAT_TRANSCRIPT_PAGE_DEFAULT_LIMIT,
      maxLimit: ACP_CHAT_TRANSCRIPT_PAGE_MAX_LIMIT,
    },
  );
}

function normalizeToolCallState(
  status: unknown,
): AcpConversationToolCallItem["state"] {
  const value = String(status || "")
    .trim()
    .toLowerCase();
  if (value === "pending" || value === "queued") {
    return "pending";
  }
  if (value === "failed" || value === "error" || value === "cancelled") {
    return "failed";
  }
  if (value === "in_progress" || value === "running") {
    return "in_progress";
  }
  return "completed";
}

function toolCallStateRank(state: AcpConversationToolCallItem["state"]) {
  switch (state) {
    case "failed":
      return 4;
    case "completed":
      return 3;
    case "in_progress":
      return 2;
    case "pending":
    default:
      return 1;
  }
}

function isGenericToolDisplayText(value: unknown) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ");
  return (
    !normalized ||
    normalized === "tool" ||
    normalized === "tool call" ||
    normalized === "other" ||
    normalized === "[]" ||
    normalized === "{}" ||
    /^call [a-z0-9]+$/i.test(normalized) ||
    /^call_[a-z0-9_-]+$/i.test(String(value || "").trim()) ||
    /^toolu_[a-z0-9_-]+$/i.test(String(value || "").trim())
  );
}

function readRecordValue(value: unknown, key: string) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

function isEmptyStructuredToolValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value as Record<string, unknown>).length === 0
  );
}

function stringifyToolCallDetail(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }
  if (isEmptyStructuredToolValue(value)) {
    return "";
  }
  if (typeof value === "string") {
    return value.trim();
  }
  if (Array.isArray(value)) {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value || "").trim();
    }
  }
  if (typeof value === "object") {
    const preferredKeys = [
      "description",
      "title",
      "command",
      "query",
      "path",
      "filePath",
      "file_path",
      "name",
      "text",
    ];
    for (const key of preferredKeys) {
      const nested: string = stringifyToolCallDetail(
        (value as Record<string, unknown>)[key],
      );
      if (nested && !isGenericToolDisplayText(nested)) {
        return nested;
      }
    }
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value || "").trim();
  }
}

function shortenToolCallSummary(value: string) {
  const normalized = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.length > 180
    ? `${normalized.slice(0, 177)}...`
    : normalized;
}

function firstNonGenericToolText(values: unknown[]) {
  for (const value of values) {
    const text = shortenToolCallSummary(stringifyToolCallDetail(value));
    if (text && !isGenericToolDisplayText(text)) {
      return text;
    }
  }
  return "";
}

function extractToolName(
  update: Record<string, unknown>,
  fallbackTitle: string,
  fallbackKind?: string,
) {
  return (
    firstNonGenericToolText([
      update.name,
      update.tool,
      update.functionName,
      update.function_name,
      update.toolName,
      fallbackKind,
      update.summary,
      fallbackTitle,
    ]) || "Tool"
  );
}

function extractToolInputSummary(
  update: Record<string, unknown>,
  fallbackTitle: string,
) {
  const metadata = update.metadata;
  return firstNonGenericToolText([
    update.rawInput,
    update.input,
    update.arguments,
    update.args,
    update.parameters,
    update.params,
    readRecordValue(metadata, "description"),
    readRecordValue(metadata, "title"),
    update.description,
    fallbackTitle,
  ]);
}

function extractToolResultSummary(update: Record<string, unknown>) {
  return firstNonGenericToolText([
    update.rawOutput,
    update.output,
    update.result,
    update.content,
    update.message,
    update.detail,
    update.summary,
  ]);
}

function upsertToolCallItem(
  sessionRuntime: AcpChatSessionRuntime,
  update: Record<string, unknown>,
  boundary: AssistantWorkspaceTranscriptBoundary,
) {
  const toolCallId = String(update.toolCallId || "").trim();
  const nextState = normalizeToolCallState(update.status);
  const title = String(update.title || "Tool Call").trim() || "Tool Call";
  const toolKind = String(update.kind || "").trim() || undefined;
  const toolName = extractToolName(update, title, toolKind);
  const inputSummary = extractToolInputSummary(update, title);
  const resultSummary = extractToolResultSummary(update);
  const now = nowIso();
  const targetId = toolCallId
    ? sessionRuntime.transcriptToolItemIds.get(toolCallId)
    : "";
  const target = targetId
    ? (sessionRuntime.transcriptItemsById.get(targetId) as
        | AcpConversationToolCallItem
        | undefined)
    : undefined;
  if (!target) {
    const frozenInputSummary = inputSummary || undefined;
    pushAcpChatTranscriptItem(
      sessionRuntime,
      {
        id: nextOpaqueId("acp-tool"),
        kind: "tool_call",
        toolCallId,
        title,
        toolKind,
        toolName,
        inputSummary: frozenInputSummary,
        resultSummary: resultSummary || undefined,
        state: nextState,
        createdAt: now,
        summary: frozenInputSummary || resultSummary || undefined,
      },
      boundary,
    );
    return;
  }
  const patch: Partial<AcpConversationToolCallItem> = {};
  if (
    !isGenericToolDisplayText(title) ||
    isGenericToolDisplayText(target.title)
  ) {
    patch.title = title || target.title;
  }
  if (toolKind) {
    patch.toolKind = toolKind;
  }
  if (
    !isGenericToolDisplayText(toolName) ||
    isGenericToolDisplayText(target.toolName)
  ) {
    patch.toolName = toolName || target.toolName;
  }
  if (inputSummary && !target.inputSummary) {
    patch.inputSummary = inputSummary;
  }
  if (resultSummary) {
    patch.resultSummary = resultSummary;
  }
  const nextInputSummary = patch.inputSummary || target.inputSummary;
  if (nextInputSummary) {
    patch.summary = nextInputSummary;
  } else if (resultSummary && !target.summary) {
    patch.summary = resultSummary;
  }
  if (toolCallStateRank(nextState) >= toolCallStateRank(target.state)) {
    patch.state = nextState;
  }
  patch.updatedAt = now;
  patchTranscriptMirrorItem(
    sessionRuntime,
    acpChatTranscriptMirrorDescriptor,
    target.id,
    patch as Partial<AcpConversationItem>,
    boundary,
  );
}

// Transcript-producing session updates (message/thought chunks, tool calls,
// plan). Returns true when the update kind was handled. Boundary
// classification is protocol-level via acpTranscriptBoundary; no backend- or
// product-specific branching here.
export function handleAcpChatTranscriptSessionUpdate(
  sessionRuntime: AcpChatSessionRuntime,
  update: { sessionUpdate: string; [key: string]: unknown },
  args: {
    transcriptBoundary: AssistantWorkspaceTranscriptBoundary;
    progressCountChanged: boolean;
  },
): boolean {
  switch (String(update.sessionUpdate || "").trim()) {
    case "agent_message_chunk": {
      sessionRuntime.snapshot.lastLifecycleEvent = "agent_message_chunk";
      const content = update.content as
        | { type?: string; text?: string }
        | undefined;
      if (String(content?.type || "").trim() !== "text") {
        return true;
      }
      const chunk = String(content?.text || "");
      if (!chunk) {
        return true;
      }
      appendStreamingTranscriptMirrorText(
        sessionRuntime,
        acpChatTranscriptMirrorDescriptor,
        {
          channel: "assistant",
          role: "assistant",
          text: chunk,
        },
      );
      host.emitSessionRuntimeSnapshot(sessionRuntime, {
        throttlePersist: true,
        touchUpdatedAt: false,
        uiReason: "live",
        changeKinds: args.progressCountChanged
          ? ["message-counts", "transcript-append"]
          : ["transcript-append"],
      });
      return true;
    }
    case "agent_thought_chunk": {
      sessionRuntime.snapshot.lastLifecycleEvent = "agent_thought_chunk";
      const content = update.content as
        | { type?: string; text?: string }
        | undefined;
      if (String(content?.type || "").trim() !== "text") {
        return true;
      }
      const chunk = String(content?.text || "");
      if (!chunk) {
        return true;
      }
      appendStreamingTranscriptMirrorText(
        sessionRuntime,
        acpChatTranscriptMirrorDescriptor,
        {
          channel: "thought",
          text: chunk,
        },
      );
      host.emitSessionRuntimeSnapshot(sessionRuntime, {
        throttlePersist: true,
        touchUpdatedAt: false,
        uiReason: "live",
        changeKinds: args.progressCountChanged
          ? ["message-counts", "transcript-append"]
          : ["transcript-append"],
      });
      return true;
    }
    case "tool_call": {
      sessionRuntime.snapshot.lastLifecycleEvent = "tool_call";
      if (isAcpTranscriptHardBoundaryUpdate(update.sessionUpdate)) {
        completeAcpChatActiveStreamingTextItems(sessionRuntime);
      }
      upsertToolCallItem(sessionRuntime, update, "hard-boundary");
      host.emitSessionRuntimeSnapshot(sessionRuntime, {
        uiReason: "boundary",
        changeKinds: args.progressCountChanged
          ? ["message-counts", "transcript-boundary"]
          : ["transcript-boundary"],
      });
      return true;
    }
    case "tool_call_update": {
      sessionRuntime.snapshot.lastLifecycleEvent = "tool_call_update";
      upsertToolCallItem(sessionRuntime, update, args.transcriptBoundary);
      host.emitSessionRuntimeSnapshot(sessionRuntime, {
        throttlePersist: args.transcriptBoundary === "soft-side-channel",
        uiReason:
          args.transcriptBoundary === "soft-side-channel" ? "live" : "boundary",
        changeKinds: [
          args.transcriptBoundary === "soft-side-channel"
            ? "transcript-progress"
            : "transcript-boundary",
        ],
      });
      return true;
    }
    case "plan": {
      sessionRuntime.snapshot.lastLifecycleEvent = "plan";
      completeAcpChatActiveStreamingTextItems(sessionRuntime);
      const entries = Array.isArray(update.entries)
        ? update.entries.map((entry) => ({
            content: String(entry?.content || ""),
            priority: String(entry?.priority || ""),
            status: String(entry?.status || ""),
          }))
        : [];
      let target = sessionRuntime.transcriptItemsById.get(
        sessionRuntime.activePlanItemId,
      ) as AcpConversationPlanItem | undefined;
      if (!target) {
        target = {
          id: nextOpaqueId("acp-plan"),
          kind: "plan",
          entries,
          createdAt: nowIso(),
        };
        sessionRuntime.activePlanItemId = target.id;
        pushAcpChatTranscriptItem(sessionRuntime, target);
      } else {
        patchTranscriptMirrorItem(
          sessionRuntime,
          acpChatTranscriptMirrorDescriptor,
          target.id,
          {
            entries,
            updatedAt: nowIso(),
          } as Partial<AcpConversationItem>,
        );
      }
      host.emitSessionRuntimeSnapshot(sessionRuntime, {
        uiReason: "boundary",
        changeKinds: ["plan", "transcript-boundary"],
      });
      return true;
    }
    default:
      return false;
  }
}
