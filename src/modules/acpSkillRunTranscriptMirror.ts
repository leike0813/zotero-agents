import {
  applyAcpToolCallDisplayUpdate,
  selectAcpToolCallDisplay,
  type AcpToolCallDisplayState,
} from "../shared/acpToolCallDisplay";
import { getStringOrFallback } from "../utils/locale";
import { appendRuntimeLog } from "./runtimeLogManager";
import {
  canPublishAssistantWorkspaceLiveUpdates,
  getAssistantExecutionDisplayMode,
  isAssistantSilentExecutionMode,
} from "./assistantExecutionDisplayPolicy";
import {
  snapshotAcpMessageCounts,
  updateAcpExecutionProgress,
} from "./acpExecutionProgress";
import { readUiVisibleTranscriptPage } from "./assistantTranscriptPageProjection";
import { isAcpTranscriptHardBoundaryUpdate } from "./acpTranscriptBoundary";
import { getAcpSkillRunTranscriptMirrorHost } from "./acpSkillRunHosts";
import type { AcpToolCall, SessionNotification } from "./acpProtocol";
import type {
  AcpSkillRunRecord,
  AcpSkillRunTranscriptItem,
  AcpSkillRunWorkspaceChange,
  AcpSkillRunWorkspaceChangeKind,
} from "./acpSkillRunStore";
import {
  enqueueAcpSkillRunTranscriptEvents,
  flushAcpSkillRunTranscriptWrites,
  readAcpSkillRunTranscriptPage as readAcpSkillRunTranscriptPageFromStore,
  resolveAcpSkillRunTranscriptPaths,
  type AcpSkillRunTranscriptPage,
} from "./acpSkillRunTranscriptStore";
import {
  createAcpSkillsWorkspaceOwner,
  createFailedTranscriptRegion,
  createIdleTranscriptRegion,
  createLoadingTranscriptRegion,
  createReadyTranscriptRegion,
} from "./assistantWorkspacePublication";
import {
  createAssistantWorkspaceTranscriptPage,
  type AssistantWorkspaceTranscriptBoundary,
  type AssistantWorkspaceTranscriptMutationEvent,
  type AssistantWorkspaceTranscriptRegion,
} from "./assistantWorkspaceTranscriptPublication";
import {
  appendStreamingTranscriptMirrorText,
  completeActiveStreamingMirrorTextItems,
  createAssistantTranscriptMirrorLru,
  hydrateAssistantTranscriptMirror,
  queueAssistantTranscriptMirrorEvent,
  upsertTranscriptMirrorItem,
  type AssistantTranscriptMirrorOwnerDescriptor,
  type AssistantTranscriptMirrorQueueArgs,
} from "./assistantTranscriptMirrorStore";

const ACP_SKILL_RUN_PREVIEW_LIMIT = 8 * 1024;
const ACP_SKILL_RUN_TRANSCRIPT_PAGE_DEFAULT_LIMIT = 80;
const ACP_SKILL_RUN_TRANSCRIPT_PAGE_MAX_LIMIT = 200;
const ACP_SKILL_RUN_COLD_TRANSCRIPT_MIRROR_CACHE_LIMIT = 10;

function nowIso() {
  return new Date().toISOString();
}

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error || "unknown");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function truncateAcpSkillRunPreview(value: unknown) {
  const text = normalizeString(value);
  if (!text) {
    return undefined;
  }
  return text.length > ACP_SKILL_RUN_PREVIEW_LIMIT
    ? `${text.slice(0, ACP_SKILL_RUN_PREVIEW_LIMIT)}...<truncated>`
    : text;
}

function transcriptPreviewFromItem(item: AcpSkillRunTranscriptItem) {
  if (item.kind === "message" || item.kind === "thought") {
    return truncateAcpSkillRunPreview(item.text);
  }
  if (item.kind === "status") {
    return truncateAcpSkillRunPreview(item.text);
  }
  if (item.kind === "permission") {
    return truncateAcpSkillRunPreview(item.summary || item.title);
  }
  if (item.kind === "tool_call") {
    const selection = selectAcpToolCallDisplay({
      toolName: item.toolName,
      title: item.title,
      kind: item.toolKind as AcpToolCallDisplayState["kind"],
      inputSummary: item.inputSummary,
      resultSummary: item.resultSummary,
      summary: item.summary,
    });
    return truncateAcpSkillRunPreview(selection.secondary || selection.primary);
  }
  return undefined;
}

export function cloneAcpSkillRunTranscriptItem<
  T extends AcpSkillRunTranscriptItem,
>(item: T): T {
  if (item.kind === "status") {
    return {
      ...item,
      details: item.details ? { ...item.details } : undefined,
    } as T;
  }
  if (item.kind === "message") {
    return {
      ...item,
      revision: item.revision ? { ...item.revision } : undefined,
    } as T;
  }
  return { ...item };
}

function extractTranscriptItemOrdinal(itemId: string) {
  const match = /-(\d+)$/.exec(itemId);
  if (!match) {
    return 0;
  }
  return Math.max(0, Math.floor(Number(match[1]) || 0));
}

function normalizeTranscriptPageLimit(value: unknown) {
  return Math.max(
    1,
    Math.min(
      ACP_SKILL_RUN_TRANSCRIPT_PAGE_MAX_LIMIT,
      Math.floor(Number(value || ACP_SKILL_RUN_TRANSCRIPT_PAGE_DEFAULT_LIMIT)),
    ),
  );
}

// Skills mirror state lives in the store-owned transcriptLiveStates side
// table; field names follow the generic mirror core contract.
export type AcpSkillRunTranscriptLiveState = {
  requestId: string;
  transcriptItemCount: number;
  transcriptEventSeq: number;
  transcriptItemsById: Map<string, AcpSkillRunTranscriptItem>;
  transcriptItemIds: string[];
  transcriptMirrorLoaded: boolean;
  needsHydrate?: boolean;
  transcriptHydrateState?: "loading" | "failed";
  transcriptHydrateError?: string;
  transcriptHydratePromise?: Promise<void>;
  lastTextItem?: {
    id: string;
    kind: "message" | "thought";
    role: "assistant" | "user";
    state: "streaming" | "complete";
  };
  lastAssistantMessageId?: string;
  lastStatus?: {
    id: string;
    label: string;
    text: string;
  };
  permissionItemIds: Map<string, string>;
  toolItemIds: Map<string, string>;
  toolItems: Map<
    string,
    {
      id: string;
      title?: string;
      toolKind?: string;
      toolName?: string;
      inputSummary?: string;
      resultSummary?: string;
      summary?: string;
    }
  >;
  workspaceTranscriptEvents: AssistantWorkspaceTranscriptMutationEvent[];
};

// Mirror events flow with the caller's (possibly not-yet-persisted) run
// record clone, so metadata and persistence see the same record the caller
// will store; the mirror fields live on the shared live state.
export type AcpSkillRunTranscriptMirrorHandle = {
  record: AcpSkillRunRecord;
  live: AcpSkillRunTranscriptLiveState;
};

// The host slot lives in the acpSkillRunHosts leaf module so that importing
// this module before the store cannot hit a TDZ on the slot.
export type { AcpSkillRunTranscriptMirrorHost } from "./acpSkillRunHosts";

function handleForRecord(
  record: AcpSkillRunRecord,
): AcpSkillRunTranscriptMirrorHandle {
  return {
    record,
    live: getAcpSkillRunTranscriptMirrorHost().getTranscriptLiveState(record),
  };
}

function hasDurableAcpSkillRunTranscript(
  record: AcpSkillRunRecord,
  state = getAcpSkillRunTranscriptMirrorHost().peekTranscriptLiveState(
    record.requestId,
  ),
) {
  return (
    !!normalizeString(record.runtimeDir) &&
    Math.max(
      0,
      record.transcriptEventSeq || 0,
      record.transcriptRevision || 0,
      record.transcriptItemCount || 0,
      state?.transcriptEventSeq || 0,
      state?.transcriptItemCount || 0,
    ) > 0
  );
}

function shouldRetainAcpSkillRunTranscriptMirror(record: AcpSkillRunRecord) {
  return (
    record.requestId ===
      getAcpSkillRunTranscriptMirrorHost().getSelectedRequestId() ||
    getAcpSkillRunTranscriptMirrorHost().isLifecycleOpen(record) ||
    acpSkillRunTranscriptMirrorLru.has(record.requestId)
  );
}

function resetTranscriptContinuityState(state: AcpSkillRunTranscriptLiveState) {
  state.lastTextItem = undefined;
  state.lastAssistantMessageId = undefined;
  state.lastStatus = undefined;
  state.permissionItemIds.clear();
  state.toolItemIds.clear();
  state.toolItems.clear();
}

function rememberTranscriptItemContinuity(
  state: AcpSkillRunTranscriptLiveState,
  item: AcpSkillRunTranscriptItem,
) {
  if (item.kind === "message" || item.kind === "thought") {
    state.lastTextItem = {
      id: item.id,
      kind: item.kind,
      role: item.kind === "message" ? item.role : "assistant",
      state: item.state || "complete",
    };
    if (item.kind === "message" && item.role === "assistant") {
      state.lastAssistantMessageId = item.id;
    }
    return;
  }
  if (item.kind === "status") {
    state.lastStatus = {
      id: item.id,
      label: item.label,
      text: item.text,
    };
    return;
  }
  if (item.kind === "permission") {
    state.permissionItemIds.set(item.permissionRequestId, item.id);
    return;
  }
  if (item.kind === "tool_call") {
    state.toolItemIds.set(item.toolCallId, item.id);
    state.toolItems.set(item.toolCallId, {
      id: item.id,
      title: item.title,
      toolKind: item.toolKind,
      toolName: item.toolName,
      inputSummary: item.inputSummary,
      summary: item.summary,
    });
  }
}

function ensureTranscriptMirrorForEvent(state: AcpSkillRunTranscriptLiveState) {
  if (state.transcriptMirrorLoaded) {
    return;
  }
  state.transcriptItemsById.clear();
  state.transcriptItemIds = [];
  state.transcriptMirrorLoaded = true;
  state.needsHydrate = false;
  state.transcriptHydrateState = undefined;
  state.transcriptHydrateError = undefined;
}

function syncSkillsEventMetadata(
  handle: AcpSkillRunTranscriptMirrorHandle,
  args: { item?: AcpSkillRunTranscriptItem; textPreview?: string },
) {
  const { record, live } = handle;
  const paths = resolveAcpSkillRunTranscriptPaths(record.runtimeDir);
  record.transcriptPath = paths.transcriptPath || record.transcriptPath;
  record.transcriptIndexPath =
    paths.transcriptIndexPath || record.transcriptIndexPath;
  record.transcriptRevision = live.transcriptEventSeq;
  record.transcriptEventSeq = live.transcriptEventSeq;
  record.transcriptItemCount = live.transcriptItemCount;
  const preview =
    args.textPreview ||
    (args.item ? transcriptPreviewFromItem(args.item) : undefined);
  if (preview) {
    record.transcriptPreview = preview;
  }
}

const acpSkillRunTranscriptMirrorDescriptor: AssistantTranscriptMirrorOwnerDescriptor<
  AcpSkillRunTranscriptItem,
  AcpSkillRunTranscriptMirrorHandle
> = {
  core: (handle) => handle.live,
  ownerKey: (handle) => handle.record.requestId,
  isLive: (handle) =>
    getAcpSkillRunTranscriptMirrorHost().isLifecycleOpen(handle.record),
  isForeground: (handle) =>
    handle.record.requestId ===
    getAcpSkillRunTranscriptMirrorHost().getSelectedRequestId(),
  resolveOwnerState: (requestId) => {
    const record =
      getAcpSkillRunTranscriptMirrorHost().resolveRunRecord(requestId);
    const live =
      getAcpSkillRunTranscriptMirrorHost().peekTranscriptLiveState(requestId);
    return record && live ? { record, live } : undefined;
  },
  listOwnerStates: function* () {
    for (const [
      requestId,
      live,
    ] of getAcpSkillRunTranscriptMirrorHost().listTranscriptLiveStates()) {
      const record =
        getAcpSkillRunTranscriptMirrorHost().resolveRunRecord(requestId);
      if (record) {
        yield { record, live };
      }
    }
  },
  hasOwner: (handle) =>
    hasDurableAcpSkillRunTranscript(handle.record, handle.live),
  cloneItem: (item) => cloneAcpSkillRunTranscriptItem(item),
  previewFromItem: (item) => transcriptPreviewFromItem(item),
  appendTextToItem: (item, text, createdAt) => {
    if (item.kind !== "message" && item.kind !== "thought") {
      return undefined;
    }
    return {
      ...item,
      text: `${item.text || ""}${text}`,
      updatedAt: createdAt,
    } as AcpSkillRunTranscriptItem;
  },
  allocateItemId: (handle, prefix) =>
    `acp-skill-${prefix}-${handle.live.transcriptItemCount + 1}`,
  itemOrdinal: (itemId) => extractTranscriptItemOrdinal(itemId),
  streaming: {
    textItemIdPrefix: (channel) =>
      channel === "assistant" ? "message" : "thought",
    getActiveTextItemId: (handle, channel) => {
      const latest = handle.live.lastTextItem;
      if (!latest || latest.state !== "streaming") {
        return "";
      }
      const kind = channel === "assistant" ? "message" : "thought";
      return latest.kind === kind ? latest.id : "";
    },
    getContinuationTextItemId: (handle, channel, role) => {
      const latest = handle.live.lastTextItem;
      if (!latest || latest.state !== "streaming") {
        return "";
      }
      const kind = channel === "assistant" ? "message" : "thought";
      return latest.kind === kind && latest.role === (role || "assistant")
        ? latest.id
        : "";
    },
    setActiveTextItemId: (handle, channel, itemId, role) => {
      if (!itemId) {
        handle.live.lastTextItem = handle.live.lastTextItem
          ? { ...handle.live.lastTextItem, state: "complete" }
          : undefined;
        return;
      }
      handle.live.lastTextItem = {
        id: itemId,
        kind: channel === "assistant" ? "message" : "thought",
        role: role === "user" ? "user" : "assistant",
        state: "streaming",
      };
    },
    createStreamingTextItem: (
      handle,
      { channel, role, text, id, createdAt },
    ) => {
      const resolvedRole = role === "user" ? "user" : "assistant";
      if (channel === "assistant") {
        if (resolvedRole === "assistant") {
          handle.live.lastAssistantMessageId = id;
        }
        return {
          id,
          kind: "message",
          role: resolvedRole,
          text,
          state: "streaming",
          createdAt,
        };
      }
      return {
        id,
        kind: "thought",
        text,
        state: "streaming",
        createdAt,
      };
    },
  },
  plan: {
    mode: "external",
  },
  continuity: {
    rememberLoadedItem: (handle, item) =>
      rememberTranscriptItemContinuity(handle.live, item),
    resetMirrorState: (handle) => {
      resetTranscriptContinuityState(handle.live);
      handle.live.transcriptMirrorLoaded = false;
    },
  },
  queueEventWhileMirrorCold: (handle, args) => {
    const { record, live } = handle;
    const hadPersistedTranscript =
      hasDurableAcpSkillRunTranscript(record, live) ||
      live.transcriptEventSeq > 0 ||
      live.transcriptItemCount > 0 ||
      (record.transcriptEventSeq || 0) > 0 ||
      (record.transcriptItemCount || 0) > 0;
    live.transcriptEventSeq += 1;
    if (args.newItem) {
      live.transcriptItemCount += 1;
    }
    syncSkillsEventMetadata(handle, {
      item: args.item,
      textPreview: args.textPreview,
    });
    if (hadPersistedTranscript) {
      if (hasDurableAcpSkillRunTranscript(record, live)) {
        resetTranscriptContinuityState(live);
        live.needsHydrate = true;
        live.transcriptHydrateState = undefined;
        live.transcriptHydrateError = undefined;
        acpSkillRunTranscriptMirrorDescriptor.persistEvent(handle, args);
        return "handled";
      }
      appendRuntimeLog({
        level: "warn",
        scope: "system",
        component: "acp-skill-run-store",
        operation: "queue-transcript-event",
        stage: "transcript-mirror-not-hydrated",
        requestId: record.requestId,
        message:
          "ACP Skills transcript event was queued before an existing transcript mirror was hydrated.",
        details: {
          transcriptRevision: record.transcriptRevision || 0,
          transcriptEventSeq: record.transcriptEventSeq || 0,
        },
      });
    }
    return "continue";
  },
  prepareMirrorForEvent: (handle) =>
    ensureTranscriptMirrorForEvent(handle.live),
  resolveLoadedCounters: (handle, { itemCount, eventSeq, maxItemOrdinal }) => ({
    itemCount: Math.max(
      handle.live.transcriptItemCount,
      handle.record.transcriptItemCount || 0,
      itemCount,
      maxItemOrdinal,
    ),
    eventSeq: Math.max(
      handle.live.transcriptEventSeq,
      handle.record.transcriptEventSeq || 0,
      handle.record.transcriptRevision || 0,
      eventSeq,
    ),
  }),
  syncEventMetadata: (handle, args) => {
    syncSkillsEventMetadata(handle, args);
  },
  syncLoadedMetadata: (handle, { preview }) => {
    const { record, live } = handle;
    record.transcriptRevision = live.transcriptEventSeq;
    record.transcriptEventSeq = live.transcriptEventSeq;
    record.transcriptItemCount = live.transcriptItemCount;
    if (preview) {
      record.transcriptPreview = preview;
    }
    live.needsHydrate = false;
  },
  onMirrorForceReleased: (handle) => {
    handle.live.needsHydrate = hasDurableAcpSkillRunTranscript(
      handle.record,
      handle.live,
    );
    handle.live.transcriptHydrateState = undefined;
    handle.live.transcriptHydrateError = undefined;
  },
  shouldReleaseOnEvict: (handle) =>
    !getAcpSkillRunTranscriptMirrorHost().isLifecycleOpen(handle.record),
  persistEvent: (handle, args) => {
    const { record, live } = handle;
    const runtimeDir = normalizeString(record.runtimeDir);
    if (!runtimeDir) {
      return;
    }
    enqueueAcpSkillRunTranscriptEvents({
      runtimeDir,
      requestId: record.requestId,
      events: [
        {
          seq: record.transcriptEventSeq || live.transcriptEventSeq,
          op: args.op,
          itemId: args.itemId,
          item: args.item,
          text: args.text,
          patch: args.patch,
          createdAt: args.createdAt,
        },
      ],
    });
  },
  flushWrites: async (handle) => {
    await flushAcpSkillRunTranscriptWrites(
      normalizeString(handle.record.runtimeDir),
    );
  },
  shouldFlushWritesBeforeHydrate: (handle) =>
    !!normalizeString(handle.record.runtimeDir),
  readFullTranscript: async (handle) => {
    const items: AcpSkillRunTranscriptItem[] = [];
    let cursor: number | undefined = 0;
    let eventSeq = 0;
    do {
      const page = await readAcpSkillRunTranscriptPageFromStore({
        runtimeDir: handle.record.runtimeDir,
        cursor,
        limit: ACP_SKILL_RUN_TRANSCRIPT_PAGE_MAX_LIMIT,
      });
      eventSeq = Math.max(eventSeq, page.eventSeq || 0);
      items.push(...page.items);
      cursor = page.nextCursor;
    } while (typeof cursor === "number");
    return { items, eventSeq };
  },
  shouldSkipHydrate: () => false,
  onMirrorHydrated: (handle) => {
    getAcpSkillRunTranscriptMirrorHost().setAcpSkillRunRecord(handle.record);
  },
  onHydrateFailed: (handle, error) => {
    appendRuntimeLog({
      level: "warn",
      scope: "system",
      component: "acp-skill-run-store",
      operation: "hydrate-transcript-mirror",
      stage: "hydrate-failed",
      requestId: handle.record.requestId,
      message: handle.live.transcriptHydrateError || errorText(error),
    });
  },
  onHydrateCompleted: (handle) => {
    getAcpSkillRunTranscriptMirrorHost().emitWorkspaceChanged(
      getAcpSkillRunTranscriptMirrorHost().acpSkillRunWorkspaceChange(
        handle.record.requestId,
        ["transcript"],
      ),
    );
  },
  errorText: (error) => errorText(error),
};

const acpSkillRunTranscriptMirrorLru = createAssistantTranscriptMirrorLru(
  acpSkillRunTranscriptMirrorDescriptor,
  { limit: ACP_SKILL_RUN_COLD_TRANSCRIPT_MIRROR_CACHE_LIMIT },
);

export function getAcpSkillRunTranscriptMirrorCacheDiagnostics(
  requestId: string,
) {
  return {
    cached: acpSkillRunTranscriptMirrorLru.has(requestId),
    size: acpSkillRunTranscriptMirrorLru.size(),
  };
}

export function clearAcpSkillRunTranscriptMirrorLru() {
  acpSkillRunTranscriptMirrorLru.clear();
}

export function forgetColdAcpSkillRunTranscriptMirror(requestIdRaw: string) {
  const requestId = normalizeString(requestIdRaw);
  if (requestId) {
    acpSkillRunTranscriptMirrorLru.delete(requestId);
  }
}

export function pruneInactiveAcpSkillRunTranscriptMirrors() {
  for (const [
    requestId,
    live,
  ] of getAcpSkillRunTranscriptMirrorHost().listTranscriptLiveStates()) {
    const record =
      getAcpSkillRunTranscriptMirrorHost().resolveRunRecord(requestId);
    if (!record || shouldRetainAcpSkillRunTranscriptMirror(record)) {
      continue;
    }
    acpSkillRunTranscriptMirrorLru.forceRelease({ record, live });
  }
}

export function queueAcpSkillRunTranscriptEvent(
  record: AcpSkillRunRecord,
  args: AssistantTranscriptMirrorQueueArgs<AcpSkillRunTranscriptItem>,
) {
  queueAssistantTranscriptMirrorEvent(
    handleForRecord(record),
    acpSkillRunTranscriptMirrorDescriptor,
    args,
  );
}

export function nextAcpSkillRunTranscriptItemId(
  record: AcpSkillRunRecord,
  prefix: string,
  state = getAcpSkillRunTranscriptMirrorHost().getTranscriptLiveState(record),
) {
  return `acp-skill-${prefix}-${state.transcriptItemCount + 1}`;
}

export function completeAcpSkillRunOpenStreamingTextItems(
  record: AcpSkillRunRecord,
  now: string,
) {
  const handle = handleForRecord(record);
  const hasOpenItem = Boolean(
    acpSkillRunTranscriptMirrorDescriptor.streaming.getActiveTextItemId(
      handle,
      "assistant",
    ) ||
    acpSkillRunTranscriptMirrorDescriptor.streaming.getActiveTextItemId(
      handle,
      "thought",
    ),
  );
  if (!hasOpenItem) {
    return false;
  }
  completeActiveStreamingMirrorTextItems(
    handle,
    acpSkillRunTranscriptMirrorDescriptor,
    { now },
  );
  return true;
}

function appendTextChunk(args: {
  record: AcpSkillRunRecord;
  kind: "message" | "thought";
  role?: "assistant" | "user";
  text: string;
  now: string;
}) {
  const text = args.text;
  if (!text) {
    return;
  }
  appendStreamingTranscriptMirrorText(
    handleForRecord(args.record),
    acpSkillRunTranscriptMirrorDescriptor,
    {
      channel: args.kind === "message" ? "assistant" : "thought",
      role: args.role || "assistant",
      text,
      createdAt: args.now,
      textPreview: text,
    },
  );
}

function normalizeToolCallState(
  value: unknown,
): "pending" | "in_progress" | "completed" | "failed" {
  const normalized = normalizeString(value).toLowerCase();
  if (
    normalized === "completed" ||
    normalized === "complete" ||
    normalized === "succeeded" ||
    normalized === "success"
  ) {
    return "completed";
  }
  if (normalized === "failed" || normalized === "error") {
    return "failed";
  }
  if (
    normalized === "running" ||
    normalized === "in_progress" ||
    normalized === "started"
  ) {
    return "in_progress";
  }
  return "pending";
}

function hasToolResultPayload(update: AcpToolCall) {
  return Boolean(
    applyAcpToolCallDisplayUpdate(undefined, update).resultSummary,
  );
}

function inferToolCallState(update: AcpToolCall) {
  const explicitStatus = normalizeString(update.status);
  const explicitState = normalizeToolCallState(explicitStatus);
  if (
    !explicitStatus &&
    explicitState === "pending" &&
    hasToolResultPayload(update)
  ) {
    return "completed";
  }
  return explicitState;
}

function upsertTranscriptToolCall(
  record: AcpSkillRunRecord,
  update: AcpToolCall,
  now: string,
  boundary: AssistantWorkspaceTranscriptBoundary,
) {
  const liveState =
    getAcpSkillRunTranscriptMirrorHost().getTranscriptLiveState(record);
  const toolCallId =
    normalizeString(update.toolCallId) ||
    normalizeString(update.title) ||
    `tool-${liveState.transcriptItemCount + 1}`;
  const existingId = liveState.toolItemIds.get(toolCallId);
  const existing = liveState.toolItems.get(toolCallId);
  const nextState = inferToolCallState(update);
  const display = applyAcpToolCallDisplayUpdate(
    existing
      ? {
          toolName: existing.toolName,
          title: existing.title,
          kind: existing.toolKind as AcpToolCallDisplayState["kind"],
          inputSummary: existing.inputSummary,
          resultSummary: existing.resultSummary,
          summary: existing.summary,
        }
      : undefined,
    update,
  );
  const next: AcpSkillRunTranscriptItem = {
    id:
      existingId || nextAcpSkillRunTranscriptItemId(record, "tool", liveState),
    kind: "tool_call",
    toolCallId,
    title: display.title,
    state: nextState,
    toolKind: display.kind,
    toolName: display.toolName,
    inputSummary: display.inputSummary,
    resultSummary: display.resultSummary,
    summary: display.summary,
    createdAt: now,
    updatedAt: now,
  };
  liveState.toolItemIds.set(toolCallId, next.id);
  liveState.toolItems.set(toolCallId, {
    id: next.id,
    title: next.title,
    toolKind: next.toolKind,
    toolName: next.toolName,
    inputSummary: next.inputSummary,
    resultSummary: next.resultSummary,
    summary: next.summary,
  });
  queueAcpSkillRunTranscriptEvent(record, {
    op: "upsert_item",
    itemId: next.id,
    item: next,
    createdAt: now,
    newItem: !existingId,
    boundary,
  });
}

export function parsePlanEntries(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(isRecord)
    .map((entry) => ({
      content: normalizeString(entry.content),
      priority: normalizeString(entry.priority) || undefined,
      status: normalizeString(entry.status) || undefined,
    }))
    .filter((entry) => entry.content);
}

export function recordAcpSkillRunSessionUpdate(
  runRequestIdRaw: string,
  event: SessionNotification,
) {
  getAcpSkillRunTranscriptMirrorHost().ensureHydrated();
  const requestId = normalizeString(runRequestIdRaw);
  if (!requestId) {
    return;
  }
  const now = nowIso();
  const existing =
    getAcpSkillRunTranscriptMirrorHost().resolveRunRecord(requestId);
  if (!existing) {
    return;
  }
  const update = event.update || { sessionUpdate: "" };
  const kind = normalizeString(update.sessionUpdate);
  const progressChange = updateAcpExecutionProgress(requestId, update);
  const messageCounts = snapshotAcpMessageCounts(requestId);
  if (isAssistantSilentExecutionMode() && kind !== "user_message_chunk") {
    if (kind === "usage_update") {
      const used = Number((update as { used?: unknown }).used || 0);
      const size = Number((update as { size?: unknown }).size || 0);
      if (Number.isFinite(used) && Number.isFinite(size)) {
        getAcpSkillRunTranscriptMirrorHost().setAcpSkillRunRecord({
          ...existing,
          messageCounts,
          usage: {
            used: Math.max(0, Math.floor(used)),
            size: Math.max(0, Math.floor(size)),
          },
        });
      }
    }
    if (progressChange.countChanged) {
      const next = {
        ...(getAcpSkillRunTranscriptMirrorHost().resolveRunRecord(requestId) ||
          existing),
        messageCounts,
      };
      getAcpSkillRunTranscriptMirrorHost().setAcpSkillRunRecord(next);
      getAcpSkillRunTranscriptMirrorHost().scheduleSoftRunPersist(next);
      getAcpSkillRunTranscriptMirrorHost().emitWorkspaceChanged(
        getAcpSkillRunTranscriptMirrorHost().acpSkillRunWorkspaceChange(
          requestId,
          ["progress"],
        ),
      );
    }
    return;
  }
  const isTextChunkUpdate =
    kind === "agent_message_chunk" ||
    kind === "user_message_chunk" ||
    kind === "agent_thought_chunk";
  const next: AcpSkillRunRecord = {
    ...existing,
    messageCounts,
    updatedAt: isTextChunkUpdate ? existing.updatedAt : now,
    planEntries: existing.planEntries ? [...existing.planEntries] : undefined,
    usage: existing.usage ? { ...existing.usage } : undefined,
  };
  if (kind === "agent_message_chunk" || kind === "user_message_chunk") {
    const content = (
      update as { content?: { type?: string | null; text?: string | null } }
    ).content;
    if (normalizeString(content?.type) === "text") {
      appendTextChunk({
        record: next,
        kind: "message",
        role: kind === "user_message_chunk" ? "user" : "assistant",
        text: String(content?.text || ""),
        now,
      });
    }
  } else if (kind === "agent_thought_chunk") {
    const content = (
      update as { content?: { type?: string | null; text?: string | null } }
    ).content;
    if (normalizeString(content?.type) === "text") {
      appendTextChunk({
        record: next,
        kind: "thought",
        text: String(content?.text || ""),
        now,
      });
    }
  } else if (kind === "tool_call") {
    if (isAcpTranscriptHardBoundaryUpdate(kind)) {
      completeAcpSkillRunOpenStreamingTextItems(next, now);
    }
    upsertTranscriptToolCall(next, update as AcpToolCall, now, "hard-boundary");
  } else if (kind === "tool_call_update") {
    upsertTranscriptToolCall(
      next,
      update as AcpToolCall,
      now,
      "soft-side-channel",
    );
  } else if (kind === "plan") {
    if (isAcpTranscriptHardBoundaryUpdate(kind)) {
      completeAcpSkillRunOpenStreamingTextItems(next, now);
    }
    next.planEntries = parsePlanEntries(
      (update as { entries?: unknown }).entries,
    );
  } else if (kind === "usage_update") {
    const used = Number((update as { used?: unknown }).used || 0);
    const size = Number((update as { size?: unknown }).size || 0);
    if (Number.isFinite(used) && Number.isFinite(size)) {
      next.usage = {
        used: Math.max(0, Math.floor(used)),
        size: Math.max(0, Math.floor(size)),
      };
    }
  }
  getAcpSkillRunTranscriptMirrorHost().setAcpSkillRunRecord(next);
  const softToolUpdate =
    kind === "tool_call_update" &&
    inferToolCallState(update as AcpToolCall) === "pending";
  const softPersist =
    isTextChunkUpdate || kind === "usage_update" || softToolUpdate;
  if (isTextChunkUpdate) {
    if (!canPublishAssistantWorkspaceLiveUpdates()) {
      getAcpSkillRunTranscriptMirrorHost().scheduleSoftRunPersist(next);
      if (progressChange.countChanged) {
        getAcpSkillRunTranscriptMirrorHost().emitWorkspaceChanged(
          getAcpSkillRunTranscriptMirrorHost().acpSkillRunWorkspaceChange(
            requestId,
            ["progress"],
          ),
        );
      }
      return;
    }
    getAcpSkillRunTranscriptMirrorHost().scheduleSoftRunPersist(next);
    getAcpSkillRunTranscriptMirrorHost().emitWorkspaceChanged(
      getAcpSkillRunTranscriptMirrorHost().acpSkillRunWorkspaceChange(
        requestId,
        progressChange.countChanged
          ? ["transcript", "progress"]
          : ["transcript"],
      ),
    );
    return;
  }
  if (kind === "tool_call" || kind === "tool_call_update" || kind === "plan") {
    if (softPersist) {
      getAcpSkillRunTranscriptMirrorHost().scheduleSoftRunPersist(next);
    } else {
      getAcpSkillRunTranscriptMirrorHost().persistRun(next);
    }
    getAcpSkillRunTranscriptMirrorHost().emitWorkspaceChanged(
      getAcpSkillRunTranscriptMirrorHost().acpSkillRunWorkspaceChange(
        requestId,
        kind === "plan"
          ? progressChange.countChanged
            ? ["transcript", "plan", "progress"]
            : ["transcript", "plan"]
          : progressChange.countChanged
            ? ["transcript", "progress"]
            : ["transcript"],
      ),
    );
    return;
  }
  if (softPersist) {
    getAcpSkillRunTranscriptMirrorHost().scheduleSoftRunPersist(next);
  } else {
    getAcpSkillRunTranscriptMirrorHost().persistRun(next);
  }
  if (kind === "usage_update") {
    if (canPublishAssistantWorkspaceLiveUpdates()) {
      getAcpSkillRunTranscriptMirrorHost().scheduleWorkspaceChangedEmit(
        getAcpSkillRunTranscriptMirrorHost().acpSkillRunWorkspaceChange(
          requestId,
          ["runtime-options"],
        ),
      );
    }
    return;
  }
  getAcpSkillRunTranscriptMirrorHost().scheduleWorkspaceChangedEmit(
    getAcpSkillRunTranscriptMirrorHost().acpSkillRunWorkspaceChange(requestId, [
      "run",
    ]),
  );
}

export function completeAcpSkillRunTranscriptTurnBoundary(
  runRequestIdRaw: string,
) {
  getAcpSkillRunTranscriptMirrorHost().ensureHydrated();
  const requestId = normalizeString(runRequestIdRaw);
  if (!requestId) {
    return;
  }
  const existing =
    getAcpSkillRunTranscriptMirrorHost().resolveRunRecord(requestId);
  if (!existing) {
    return;
  }
  if (isAssistantSilentExecutionMode()) {
    return;
  }
  const now = nowIso();
  const next: AcpSkillRunRecord = {
    ...existing,
    updatedAt: now,
  };
  if (!completeAcpSkillRunOpenStreamingTextItems(next, now)) {
    return;
  }
  getAcpSkillRunTranscriptMirrorHost().setAcpSkillRunRecord(next);
  getAcpSkillRunTranscriptMirrorHost().persistRun(next);
  getAcpSkillRunTranscriptMirrorHost().emitWorkspaceChanged(
    getAcpSkillRunTranscriptMirrorHost().acpSkillRunWorkspaceChange(requestId, [
      "transcript",
    ]),
  );
}

export function appendAcpSkillRunHardTimeoutTranscriptNotice(args: {
  requestId: string;
  hardTimeoutSeconds: number;
  hardTimeoutSource?: string;
  recovered?: boolean;
}) {
  getAcpSkillRunTranscriptMirrorHost().ensureHydrated();
  const requestId = normalizeString(args.requestId);
  if (!requestId) {
    return;
  }
  const existing =
    getAcpSkillRunTranscriptMirrorHost().resolveRunRecord(requestId);
  if (!existing) {
    return;
  }
  const now = nowIso();
  const text = getStringOrFallback(
    "task-dashboard-acp-hard-timeout-disconnected" as any,
    `Local ACP connection disconnected because the Job Timeout (${args.hardTimeoutSeconds} sec) was reached. Reconnect to continue from the remote session.`,
    {
      args: {
        seconds: args.hardTimeoutSeconds,
      },
    },
  );
  const state =
    getAcpSkillRunTranscriptMirrorHost().getTranscriptLiveState(existing);
  const last = state.lastStatus;
  if (last && last.label === "hard-timeout-disconnect" && last.text === text) {
    return;
  }
  const item: AcpSkillRunTranscriptItem = {
    id: nextAcpSkillRunTranscriptItemId(existing, "status", state),
    kind: "status",
    level: "warn",
    label: "hard-timeout-disconnect",
    text,
    details: {
      hardTimeoutSeconds: args.hardTimeoutSeconds,
      hardTimeoutSource: normalizeString(args.hardTimeoutSource) || undefined,
      recovered: args.recovered === true,
    },
    createdAt: now,
  };
  const next: AcpSkillRunRecord = {
    ...existing,
    updatedAt: now,
  };
  state.lastStatus = {
    id: item.id,
    label: item.label,
    text: item.text,
  };
  queueAcpSkillRunTranscriptEvent(next, {
    op: "upsert_item",
    itemId: item.id,
    item,
    createdAt: now,
    newItem: true,
  });
  getAcpSkillRunTranscriptMirrorHost().setAcpSkillRunRecord(next);
  getAcpSkillRunTranscriptMirrorHost().persistRun(next);
  getAcpSkillRunTranscriptMirrorHost().emitWorkspaceChanged(
    getAcpSkillRunTranscriptMirrorHost().acpSkillRunWorkspaceChange(requestId, [
      "transcript",
    ]),
  );
}

function readTranscriptMirrorPage(args: {
  requestId: string;
  state: AcpSkillRunTranscriptLiveState;
  cursor?: number;
  limit?: number;
}): AcpSkillRunTranscriptPage & {
  requestId: string;
  transcriptRevision: number;
  limit: number;
} {
  const limit = normalizeTranscriptPageLimit(args.limit);
  const total = args.state.transcriptItemIds.length;
  const requestedCursor =
    typeof args.cursor === "number" && Number.isFinite(args.cursor)
      ? Math.max(0, Math.floor(args.cursor))
      : Math.max(0, total - limit);
  const cursor = Math.min(requestedCursor, total);
  const itemIds = args.state.transcriptItemIds.slice(cursor, cursor + limit);
  const items = itemIds
    .map((itemId) => args.state.transcriptItemsById.get(itemId))
    .filter((item): item is AcpSkillRunTranscriptItem => !!item)
    .map((item) => cloneAcpSkillRunTranscriptItem(item));
  const prevCursor = cursor > 0 ? Math.max(0, cursor - limit) : undefined;
  const nextCursor =
    cursor + itemIds.length < total ? cursor + itemIds.length : undefined;
  return {
    requestId: args.requestId,
    items,
    cursor,
    prevCursor,
    nextCursor,
    total,
    eventSeq: args.state.transcriptEventSeq,
    transcriptRevision: args.state.transcriptEventSeq,
    limit,
  };
}

function readUiVisibleTranscriptMirrorPage(args: {
  requestId: string;
  state: AcpSkillRunTranscriptLiveState;
  cursor?: number;
  limit?: number;
}): AcpSkillRunTranscriptPage & {
  requestId: string;
  transcriptRevision: number;
  limit: number;
} {
  const page = readUiVisibleTranscriptPage<AcpSkillRunTranscriptItem>({
    itemIds: args.state.transcriptItemIds,
    getItem: (itemId) => args.state.transcriptItemsById.get(itemId),
    cloneItem: cloneAcpSkillRunTranscriptItem,
    executionDisplayMode: getAssistantExecutionDisplayMode(),
    cursor: args.cursor,
    limit: args.limit,
    defaultLimit: ACP_SKILL_RUN_TRANSCRIPT_PAGE_DEFAULT_LIMIT,
    maxLimit: ACP_SKILL_RUN_TRANSCRIPT_PAGE_MAX_LIMIT,
  });
  return {
    requestId: args.requestId,
    items: page.items,
    cursor: page.cursor,
    prevCursor: page.prevCursor,
    nextCursor: page.nextCursor,
    total: page.total,
    eventSeq: args.state.transcriptEventSeq,
    transcriptRevision: args.state.transcriptEventSeq,
    limit: page.limit,
  };
}

export async function hydrateAcpSkillRunTranscriptMirror(requestIdRaw: string) {
  getAcpSkillRunTranscriptMirrorHost().ensureHydrated();
  const requestId = normalizeString(requestIdRaw);
  const record = requestId
    ? getAcpSkillRunTranscriptMirrorHost().resolveRunRecord(requestId)
    : undefined;
  if (!record) {
    return null;
  }
  const live =
    getAcpSkillRunTranscriptMirrorHost().getTranscriptLiveState(record);
  await hydrateAssistantTranscriptMirror(
    { record, live },
    acpSkillRunTranscriptMirrorDescriptor,
    acpSkillRunTranscriptMirrorLru,
  );
  return readTranscriptMirrorPage({
    requestId,
    state: live,
    cursor: 0,
    limit: ACP_SKILL_RUN_TRANSCRIPT_PAGE_MAX_LIMIT,
  });
}

function scheduleAcpSkillRunTranscriptHydrate(requestIdRaw: string) {
  const requestId = normalizeString(requestIdRaw);
  const record = requestId
    ? getAcpSkillRunTranscriptMirrorHost().resolveRunRecord(requestId)
    : undefined;
  if (!record) {
    return;
  }
  const state =
    getAcpSkillRunTranscriptMirrorHost().getTranscriptLiveState(record);
  if (
    state.transcriptMirrorLoaded ||
    state.transcriptHydratePromise ||
    !hasDurableAcpSkillRunTranscript(record, state)
  ) {
    return;
  }
  void hydrateAcpSkillRunTranscriptMirror(requestId).catch(() => undefined);
}

function transcriptLoadForRun(record: AcpSkillRunRecord | undefined) {
  if (!record) {
    return { status: "idle" as const, error: null };
  }
  const state =
    getAcpSkillRunTranscriptMirrorHost().getTranscriptLiveState(record);
  if (
    state.transcriptMirrorLoaded ||
    !hasDurableAcpSkillRunTranscript(record, state)
  ) {
    return { status: "ready" as const, error: null };
  }
  if (state.transcriptHydrateState === "failed") {
    return {
      status: "failed" as const,
      error: state.transcriptHydrateError || "Transcript failed to load.",
    };
  }
  return { status: "loading" as const, error: null };
}

async function readSelectedTranscriptPageFromStore(
  record: AcpSkillRunRecord,
  request?: AcpSkillRunTranscriptPageRequest,
) {
  if (!hasDurableAcpSkillRunTranscript(record)) {
    return undefined;
  }
  const executionDisplayMode = getAssistantExecutionDisplayMode();
  if (executionDisplayMode !== "live") {
    const { items, eventSeq } =
      await acpSkillRunTranscriptMirrorDescriptor.readFullTranscript({
        record,
        live: getAcpSkillRunTranscriptMirrorHost().getTranscriptLiveState(
          record,
        ),
      });
    const itemsById = new Map(
      items.map((item) => [String(item.id || ""), item]),
    );
    const page = readUiVisibleTranscriptPage<AcpSkillRunTranscriptItem>({
      itemIds: items.map((item) => String(item.id || "")),
      getItem: (itemId) => itemsById.get(itemId),
      cloneItem: cloneAcpSkillRunTranscriptItem,
      executionDisplayMode,
      cursor: request?.cursor,
      limit: request?.limit,
      defaultLimit: ACP_SKILL_RUN_TRANSCRIPT_PAGE_DEFAULT_LIMIT,
      maxLimit: ACP_SKILL_RUN_TRANSCRIPT_PAGE_MAX_LIMIT,
    });
    return {
      items: page.items,
      cursor: page.cursor,
      prevCursor: page.prevCursor,
      nextCursor: page.nextCursor,
      total: page.total,
      eventSeq,
      requestId: record.requestId,
      transcriptRevision: Math.max(
        Number(eventSeq) || 0,
        Number(record.transcriptRevision) || 0,
        Number(record.transcriptEventSeq) || 0,
      ),
      limit: normalizeTranscriptPageLimit(request?.limit),
    };
  }
  const page = await readAcpSkillRunTranscriptPageFromStore({
    runtimeDir: record.runtimeDir,
    cursor: request?.cursor,
    limit: request?.limit,
  });
  return {
    ...page,
    requestId: record.requestId,
    transcriptRevision: Math.max(
      Number(page.eventSeq) || 0,
      Number(record.transcriptRevision) || 0,
      Number(record.transcriptEventSeq) || 0,
    ),
    limit: normalizeTranscriptPageLimit(request?.limit),
  };
}

export type AcpSkillRunTranscriptPageRequest = {
  cursor?: number;
  limit?: number;
};
type AcpSkillRunTranscriptReadMode = "loading-first" | "page-first";

function transcriptPageForRun(
  record: AcpSkillRunRecord | undefined,
  request?: AcpSkillRunTranscriptPageRequest,
) {
  if (!record) {
    return undefined;
  }
  const load = transcriptLoadForRun(record);
  if (load.status !== "ready") {
    return undefined;
  }
  const page = readUiVisibleTranscriptMirrorPage({
    requestId: record.requestId,
    state: getAcpSkillRunTranscriptMirrorHost().getTranscriptLiveState(record),
    cursor: request?.cursor,
    limit: request?.limit,
  });
  acpSkillRunTranscriptMirrorLru.touch(handleForRecord(record));
  return page;
}

function buildAcpSkillsTranscriptRegion(
  record: AcpSkillRunRecord | undefined,
  page:
    | (AcpSkillRunTranscriptPage & {
        requestId?: string;
        transcriptRevision?: number;
        limit?: number;
      })
    | undefined,
  request?: AcpSkillRunTranscriptPageRequest,
): AssistantWorkspaceTranscriptRegion {
  if (!record) return createIdleTranscriptRegion();
  const owner = createAcpSkillsWorkspaceOwner(record.requestId);
  const load = transcriptLoadForRun(record);
  if (!page && load.status === "failed") {
    return createFailedTranscriptRegion(owner, {
      code: "transcript-page-read-failed",
      message: load.error,
    });
  }
  if (!page && load.status === "loading") {
    return createLoadingTranscriptRegion(owner);
  }
  const cursor = Math.max(0, Number(page?.cursor) || 0);
  const limit = normalizeTranscriptPageLimit(page?.limit || request?.limit);
  return createReadyTranscriptRegion(
    owner,
    createAssistantWorkspaceTranscriptPage({
      owner,
      anchor: request?.cursor === undefined ? "tail" : "cursor",
      cursor,
      limit,
      totalVisibleItemCount: Number(page?.total) || 0,
      previousCursor: page?.prevCursor,
      nextCursor: page?.nextCursor,
      sourceEventSeq: Math.max(
        Number(page?.eventSeq) || 0,
        Number(record.transcriptEventSeq) || 0,
      ),
      items: (page?.items || []) as Array<Record<string, unknown>>,
    }),
    0,
  );
}

export async function readAcpSkillRunTranscriptRegion(args: {
  requestId: string;
  transcriptPage?: AcpSkillRunTranscriptPageRequest;
  transcriptReadMode?: AcpSkillRunTranscriptReadMode;
}): Promise<AssistantWorkspaceTranscriptRegion> {
  getAcpSkillRunTranscriptMirrorHost().ensureHydrated();
  const requestId = normalizeString(args.requestId);
  const record = requestId
    ? getAcpSkillRunTranscriptMirrorHost().resolveRunRecord(requestId)
    : undefined;
  if (!record) return createIdleTranscriptRegion();
  const owner = createAcpSkillsWorkspaceOwner(requestId);
  if (args.transcriptReadMode === "loading-first") {
    return createLoadingTranscriptRegion(owner);
  }
  const state =
    getAcpSkillRunTranscriptMirrorHost().getTranscriptLiveState(record);
  try {
    const page =
      !state.transcriptMirrorLoaded &&
      hasDurableAcpSkillRunTranscript(record, state)
        ? await readSelectedTranscriptPageFromStore(record, args.transcriptPage)
        : transcriptPageForRun(record, args.transcriptPage);
    const region = buildAcpSkillsTranscriptRegion(
      record,
      page,
      args.transcriptPage,
    );
    if (page && !state.transcriptMirrorLoaded) {
      scheduleAcpSkillRunTranscriptHydrate(requestId);
    }
    return region;
  } catch (error) {
    return createFailedTranscriptRegion(owner, {
      code: "transcript-page-read-failed",
      message: errorText(error),
    });
  }
}

export function readAcpSkillRunTranscriptRegionFromMemoryForTests(args: {
  requestId: string;
  transcriptPage?: AcpSkillRunTranscriptPageRequest;
}): AssistantWorkspaceTranscriptRegion {
  getAcpSkillRunTranscriptMirrorHost().ensureHydrated();
  const requestId = normalizeString(args.requestId);
  const record = requestId
    ? getAcpSkillRunTranscriptMirrorHost().resolveRunRecord(requestId)
    : undefined;
  return buildAcpSkillsTranscriptRegion(
    record,
    transcriptPageForRun(record, args.transcriptPage),
    args.transcriptPage,
  );
}
