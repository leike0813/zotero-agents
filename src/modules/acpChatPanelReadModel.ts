import { buildAcpSidebarViewSnapshot } from "./acpSidebarModel";
import {
  getAssistantExecutionDisplayMode,
  type AssistantExecutionDisplayMode,
} from "./assistantExecutionDisplayPolicy";
import { isAssistantTranscriptPaginationVirtualizationEnabled } from "./assistantTranscriptRenderingPreference";
import {
  getAcpConversationUiSnapshot,
  getAcpChatExecutionProgress,
  getAcpFrontendSnapshot,
  readAcpConversationTranscriptPage,
  readAcpConversationTranscriptMirrorPage,
  scheduleAcpChatTranscriptHydrateForOwner,
  type AcpChatPanelSnapshotChange,
  type AcpChatPanelSnapshotChangeKind,
  type AcpConversationTranscriptPage,
} from "./acpSessionManager";
import type { AcpSidebarTarget } from "./acpTypes";
import { appendRuntimeLog } from "./runtimeLogManager";

export type AcpChatTranscriptPageRequest = {
  backendId?: string;
  conversationId?: string;
  requestId?: string;
  cursor?: number;
  limit?: number;
};

export type AcpChatPanelSnapshotReadTranscriptPage = (
  args: Parameters<typeof readAcpConversationTranscriptMirrorPage>[0],
) =>
  | AcpConversationTranscriptPage
  | undefined
  | Promise<AcpConversationTranscriptPage | undefined>;

export type AcpChatTranscriptReadMode = "loading-first" | "page-first";

export type AcpChatPanelSnapshotArgs = {
  target: AcpSidebarTarget;
  transcriptReadMode?: AcpChatTranscriptReadMode;
  transcriptPage?: AcpChatTranscriptPageRequest;
  readTranscriptPage?: AcpChatPanelSnapshotReadTranscriptPage;
};

export type AcpChatSnapshotRefreshState = {
  activeTab: "skillrunner" | "acp-chat" | "acp-skills";
  hasActiveTarget: boolean;
  transcriptPaginationVirtualizationEnabled: boolean;
  executionDisplayMode: AssistantExecutionDisplayMode;
};

export function acpChatTranscriptPageKey(
  backendId: string,
  conversationId: string,
) {
  return `${String(backendId || "").trim()}\n${String(conversationId || "").trim()}`;
}

function finitePageNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function selectedAcpChatTranscriptPageMatchesSnapshot(
  snapshot: Record<string, unknown>,
  page: AcpConversationTranscriptPage | undefined,
) {
  if (!page) {
    return false;
  }
  const backendId = String(
    snapshot.activeBackendId || snapshot.backendId || "",
  ).trim();
  const conversationId = String(
    snapshot.activeConversationId || snapshot.conversationId || "",
  ).trim();
  return (
    !!backendId &&
    !!conversationId &&
    page.backendId === backendId &&
    page.conversationId === conversationId &&
    page.requestId === acpChatTranscriptPageKey(backendId, conversationId)
  );
}

export function resolveActiveAcpChatTranscriptPageRequest(
  payload: Record<string, unknown>,
): AcpChatTranscriptPageRequest | undefined {
  const frontendSnapshot = getAcpFrontendSnapshot({
    itemMode: "structural",
  });
  const backendId = String(frontendSnapshot.activeBackendId || "").trim();
  const conversationId = String(
    frontendSnapshot.activeConversationId || "",
  ).trim();
  const requestId = String(payload.requestId || "").trim();
  if (
    !backendId ||
    !conversationId ||
    requestId !== acpChatTranscriptPageKey(backendId, conversationId) ||
    String(payload.backendId || "").trim() !== backendId ||
    String(payload.conversationId || "").trim() !== conversationId
  ) {
    return undefined;
  }
  return {
    backendId,
    conversationId,
    requestId,
    cursor: finitePageNumber(payload.cursor),
    limit: finitePageNumber(payload.limit),
  };
}

async function readSelectedAcpChatTranscriptPage(args: {
  activeBackendId: string;
  activeConversationId: string;
  request?: AcpChatTranscriptPageRequest;
  readTranscriptPage?: AcpChatPanelSnapshotReadTranscriptPage;
  executionDisplayMode: AssistantExecutionDisplayMode;
}) {
  const backendId = String(
    args.request?.backendId || args.activeBackendId || "",
  ).trim();
  const conversationId = String(
    args.request?.conversationId || args.activeConversationId || "",
  ).trim();
  if (!backendId || !conversationId) {
    return undefined;
  }
  const requestId = String(args.request?.requestId || "").trim();
  const expectedRequestId = acpChatTranscriptPageKey(backendId, conversationId);
  if (requestId && requestId !== expectedRequestId) {
    return undefined;
  }
  const requestArgs = {
    backendId,
    conversationId,
    cursor: finitePageNumber(args.request?.cursor),
    limit: finitePageNumber(args.request?.limit),
    executionDisplayMode: args.executionDisplayMode,
  };
  if (args.readTranscriptPage) {
    return args.readTranscriptPage(requestArgs);
  }
  return (
    readAcpConversationTranscriptMirrorPage(requestArgs) ||
    readAcpConversationTranscriptPage(requestArgs)
  );
}

function normalizeBackendOptionId(entry: unknown) {
  const option =
    entry && typeof entry === "object" && !Array.isArray(entry)
      ? (entry as Record<string, unknown>)
      : {};
  return String(option.backendId || option.id || option.value || "").trim();
}

function applyAcpChatPanelAvailabilityState(payload: Record<string, unknown>) {
  const backendOptions = Array.isArray(payload.backendOptions)
    ? payload.backendOptions
    : [];
  const selectedBackendId = String(
    payload.activeBackendId || payload.backendId || "",
  ).trim();
  const backendIds = backendOptions.map(normalizeBackendOptionId);
  const activeBackendId =
    (selectedBackendId && backendIds.includes(selectedBackendId)
      ? selectedBackendId
      : "") ||
    backendIds.find(Boolean) ||
    "";
  if (!activeBackendId) {
    payload.backendAvailability = "none";
    payload.conversationAvailability = "none";
    payload.activeBackendId = "";
    payload.backendId = "";
    payload.backendLabel = "";
    payload.activeConversationId = "";
    payload.conversationId = "";
    payload.conversationTitle = "";
    payload.chatSessions = [];
    payload.backendChatSessions = [];
    payload.selectedTranscriptPage = undefined;
    payload.transcriptState = undefined;
    payload.transcriptRevision = 0;
    payload.transcriptItemCount = 0;
    payload.transcriptPreview = "";
    payload.items = [];
    payload.busy = false;
    payload.status = "idle";
    return {
      backendAvailability: "none" as const,
      conversationAvailability: "none" as const,
      activeBackendId: "",
      activeConversationId: "",
    };
  }
  payload.backendAvailability = "selected";
  payload.activeBackendId = activeBackendId;
  payload.backendId = activeBackendId;
  const activeConversationId = String(
    payload.activeConversationId || payload.conversationId || "",
  ).trim();
  if (!activeConversationId) {
    payload.conversationAvailability = "none";
    payload.activeConversationId = "";
    payload.conversationId = "";
    payload.conversationTitle = "";
    payload.selectedTranscriptPage = undefined;
    payload.transcriptState = undefined;
    payload.transcriptRevision = 0;
    payload.transcriptItemCount = 0;
    payload.transcriptPreview = "";
    payload.items = [];
    return {
      backendAvailability: "selected" as const,
      conversationAvailability: "none" as const,
      activeBackendId,
      activeConversationId: "",
    };
  }
  payload.conversationAvailability = "selected";
  payload.activeConversationId = activeConversationId;
  payload.conversationId = activeConversationId;
  return {
    backendAvailability: "selected" as const,
    conversationAvailability: "selected" as const,
    activeBackendId,
    activeConversationId,
  };
}

function selectedAcpChatTranscriptPageReadable(
  payload: Record<string, unknown>,
  availability: ReturnType<typeof applyAcpChatPanelAvailabilityState>,
) {
  const state =
    payload.transcriptState &&
    typeof payload.transcriptState === "object" &&
    !Array.isArray(payload.transcriptState)
      ? (payload.transcriptState as Record<string, unknown>)
      : null;
  if (
    !state ||
    String(state.backendId || "").trim() !== availability.activeBackendId ||
    String(state.conversationId || "").trim() !==
      availability.activeConversationId
  ) {
    return false;
  }
  if (state.state === "ready") {
    return true;
  }
  const durableTranscript = Math.max(
    0,
    Number(payload.transcriptRevision) || 0,
    Number(payload.transcriptEventSeq) || 0,
    Number(payload.transcriptItemCount) || 0,
  );
  return state.state === "loading" && durableTranscript > 0;
}

function durableAcpChatTranscriptCount(payload: Record<string, unknown>) {
  return Math.max(
    0,
    Number(payload.transcriptRevision) || 0,
    Number(payload.transcriptEventSeq) || 0,
    Number(payload.transcriptItemCount) || 0,
  );
}

function emptyAcpChatTranscriptPage(
  availability: ReturnType<typeof applyAcpChatPanelAvailabilityState>,
  limit?: number,
): AcpConversationTranscriptPage {
  return {
    backendId: availability.activeBackendId,
    conversationId: availability.activeConversationId,
    requestId: acpChatTranscriptPageKey(
      availability.activeBackendId,
      availability.activeConversationId,
    ),
    items: [],
    cursor: 0,
    total: 0,
    eventSeq: 0,
    transcriptRevision: 0,
    limit: Math.max(1, Math.floor(Number(limit || 80) || 80)),
  };
}

export async function prepareAcpChatPanelSnapshot(
  args: AcpChatPanelSnapshotArgs,
) {
  const transcriptPaginationVirtualizationEnabled =
    isAssistantTranscriptPaginationVirtualizationEnabled();
  const executionDisplayMode = getAssistantExecutionDisplayMode();
  const readOptions = transcriptPaginationVirtualizationEnabled
    ? { itemMode: "structural" as const }
    : undefined;
  const snapshot = getAcpConversationUiSnapshot(
    undefined,
    undefined,
    readOptions,
  );
  const frontendSnapshot = getAcpFrontendSnapshot(readOptions);
  const payload: Record<string, unknown> = {
    ...(buildAcpSidebarViewSnapshot({
      target: args.target,
      snapshot,
      frontendSnapshot,
    }) as unknown as Record<string, unknown>),
    executionDisplayMode,
    transcriptPaginationVirtualizationEnabled:
      transcriptPaginationVirtualizationEnabled,
  };
  const availability = applyAcpChatPanelAvailabilityState(payload);
  const progress = getAcpChatExecutionProgress(
    availability.activeBackendId,
    availability.activeConversationId,
  );
  if (progress) {
    payload.messageCounts = {
      scopeKey: progress.scopeKey,
      executionKey: progress.executionKey,
      active: progress.active,
      current: { ...progress.current },
      cumulative: { ...progress.cumulative },
      revision: progress.revision,
      completeness: progress.completeness,
    };
  }
  if (!transcriptPaginationVirtualizationEnabled) {
    return payload;
  }
  if (
    availability.backendAvailability !== "selected" ||
    availability.conversationAvailability !== "selected"
  ) {
    return payload;
  }
  if (!selectedAcpChatTranscriptPageReadable(payload, availability)) {
    if (durableAcpChatTranscriptCount(payload) <= 0) {
      const emptyPage = emptyAcpChatTranscriptPage(
        availability,
        args.transcriptPage?.limit,
      );
      payload.selectedTranscriptPage = emptyPage;
      payload.transcriptState = {
        backendId: emptyPage.backendId,
        conversationId: emptyPage.conversationId,
        state: "ready",
      };
    }
    return payload;
  }
  if (args.transcriptReadMode === "loading-first") {
    payload.selectedTranscriptPage = undefined;
    payload.transcriptState = {
      backendId: availability.activeBackendId,
      conversationId: availability.activeConversationId,
      state: "loading",
    };
    return payload;
  }
  try {
    const page = await readSelectedAcpChatTranscriptPage({
      activeBackendId: availability.activeBackendId,
      activeConversationId: availability.activeConversationId,
      request: args.transcriptPage,
      readTranscriptPage: args.readTranscriptPage,
      executionDisplayMode,
    });
    if (page && selectedAcpChatTranscriptPageMatchesSnapshot(payload, page)) {
      payload.selectedTranscriptPage = page;
      payload.transcriptState = {
        backendId: page.backendId,
        conversationId: page.conversationId,
        state: "ready",
      };
      payload.transcriptRevision = Math.max(
        Number(payload.transcriptRevision) || 0,
        Number(page.transcriptRevision) || 0,
      );
      payload.transcriptEventSeq = Math.max(
        Number(payload.transcriptEventSeq) || 0,
        Number(page.eventSeq) || 0,
      );
      payload.transcriptItemCount = Math.max(
        Number(payload.transcriptItemCount) || 0,
        Number(page.total) || 0,
      );
      scheduleAcpChatTranscriptHydrateForOwner({
        backendId: page.backendId,
        conversationId: page.conversationId,
      });
    }
  } catch (error) {
    appendRuntimeLog({
      level: "warn",
      scope: "system",
      component: "acp-chat-panel",
      operation: "prepare-snapshot",
      phase: "error",
      stage: "transcript-page",
      message: "ACP Chat selected transcript page could not be read.",
      error,
    });
  }
  return payload;
}

function normalizedAcpChatPanelChangeKinds(change: AcpChatPanelSnapshotChange) {
  return (change.kinds || []).filter(Boolean);
}

function hasAnyAcpChatPanelChangeKind(
  change: AcpChatPanelSnapshotChange,
  kinds: AcpChatPanelSnapshotChangeKind[],
) {
  const set = new Set(normalizedAcpChatPanelChangeKinds(change));
  return kinds.some((kind) => set.has(kind));
}

export function isPureAcpChatBackgroundChange(
  change: AcpChatPanelSnapshotChange,
) {
  if (change.global || change.active === true) {
    return false;
  }
  const kinds = normalizedAcpChatPanelChangeKinds(change);
  return (
    kinds.length > 0 &&
    kinds.every(
      (kind) => kind === "transcript-append" || kind === "transcript-boundary",
    )
  );
}

export function shouldRefreshAcpChatSnapshotForChange(
  state: AcpChatSnapshotRefreshState,
  change: AcpChatPanelSnapshotChange,
) {
  if (!state.hasActiveTarget || state.activeTab !== "acp-chat") {
    return false;
  }
  if (change.global === true) {
    return true;
  }
  if (change.active !== true) {
    return false;
  }
  if (
    hasAnyAcpChatPanelChangeKind(change, [
      "active-scope",
      "backend",
      "global",
      "permission",
      "runtime-options",
      "session-list",
      "status",
      "transcript-boundary",
      "transcript-progress",
    ])
  ) {
    return true;
  }
  if (hasAnyAcpChatPanelChangeKind(change, ["transcript-append"])) {
    return state.executionDisplayMode === "live";
  }
  return false;
}
