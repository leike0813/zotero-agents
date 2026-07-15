import { buildAcpSidebarViewSnapshot } from "./acpSidebarModel";
import {
  getAssistantExecutionDisplayMode,
  type AssistantExecutionDisplayMode,
} from "./assistantExecutionDisplayPolicy";
import { isAssistantTranscriptPaginationVirtualizationEnabled } from "./assistantTranscriptRenderingPreference";
import {
  getAcpConversationUiSnapshot,
  getAcpChatExecutionProgress,
  getActiveAcpChatOwner,
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
import {
  createAcpChatWorkspaceOwner,
  createFailedTranscriptRegion,
  createIdleTranscriptRegion,
  createLoadingTranscriptRegion,
  createReadyTranscriptRegion,
  type AssistantWorkspacePublicationKind,
} from "./assistantWorkspacePublication";
import { createAssistantWorkspaceTranscriptPage } from "./assistantWorkspaceTranscriptPublication";

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

export type AcpChatPanelPublicationArgs = AcpChatPanelSnapshotArgs & {
  kind: AssistantWorkspacePublicationKind;
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
    payload.transcriptRegion = createIdleTranscriptRegion();
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
    payload.transcriptRegion = createIdleTranscriptRegion();
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

function durableAcpChatTranscriptCount(payload: Record<string, unknown>) {
  return Math.max(
    0,
    Number(payload.transcriptRevision) || 0,
    Number(payload.transcriptEventSeq) || 0,
    Number(payload.transcriptItemCount) || 0,
  );
}

function emptyAcpChatTranscriptRegion(
  availability: ReturnType<typeof applyAcpChatPanelAvailabilityState>,
  limit?: number,
) {
  const owner = createAcpChatWorkspaceOwner(
    availability.activeBackendId,
    availability.activeConversationId,
  );
  return createReadyTranscriptRegion(
    owner,
    createAssistantWorkspaceTranscriptPage({
      owner,
      anchor: "tail",
      cursor: 0,
      limit: Math.max(1, Math.floor(Number(limit || 80) || 80)),
      totalItemCount: 0,
      eventSeq: 0,
      items: [],
    }),
    0,
  );
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
  if (
    availability.backendAvailability !== "selected" ||
    availability.conversationAvailability !== "selected"
  ) {
    return payload;
  }
  const owner = createAcpChatWorkspaceOwner(
    availability.activeBackendId,
    availability.activeConversationId,
  );
  if (!transcriptPaginationVirtualizationEnabled) {
    const items = Array.isArray(payload.items) ? payload.items : [];
    payload.transcriptRegion = createReadyTranscriptRegion(
      owner,
      createAssistantWorkspaceTranscriptPage({
        owner,
        anchor: "tail",
        cursor: 0,
        limit: Math.max(items.length, 1),
        totalItemCount: items.length,
        eventSeq: Number(payload.transcriptEventSeq) || 0,
        items: items as Array<Record<string, unknown>>,
      }),
      0,
    );
    return payload;
  }
  if (args.transcriptReadMode === "loading-first") {
    payload.transcriptRegion = createLoadingTranscriptRegion(owner);
    return payload;
  }
  if (durableAcpChatTranscriptCount(payload) <= 0) {
    payload.transcriptRegion = emptyAcpChatTranscriptRegion(
      availability,
      args.transcriptPage?.limit,
    );
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
      payload.transcriptRegion = createReadyTranscriptRegion(
        owner,
        createAssistantWorkspaceTranscriptPage({
          owner,
          anchor: args.transcriptPage?.cursor === undefined ? "tail" : "cursor",
          cursor: page.cursor,
          limit: page.limit,
          totalItemCount: page.total,
          previousCursor: page.prevCursor,
          nextCursor: page.nextCursor,
          eventSeq: page.eventSeq,
          items: page.items as Array<Record<string, unknown>>,
        }),
        0,
      );
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
    } else {
      payload.transcriptRegion = createLoadingTranscriptRegion(owner);
    }
  } catch (error) {
    payload.transcriptRegion = createFailedTranscriptRegion(owner, {
      code: "transcript-page-read-failed",
      message: error instanceof Error ? error.message : String(error),
    });
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

export async function prepareAcpChatPanelPublicationDto(
  args: AcpChatPanelPublicationArgs,
) {
  if (args.kind === "message-counts") {
    const { backendId, conversationId } = getActiveAcpChatOwner();
    const progress = getAcpChatExecutionProgress(backendId, conversationId);
    return {
      activeBackendId: backendId,
      backendId,
      activeConversationId: conversationId,
      conversationId,
      messageCounts: progress
        ? {
            scopeKey: progress.scopeKey,
            executionKey: progress.executionKey,
            active: progress.active,
            current: { ...progress.current },
            cumulative: { ...progress.cumulative },
            revision: progress.revision,
            completeness: progress.completeness,
          }
        : undefined,
    };
  }
  if (args.kind === "transcript") {
    const active = getActiveAcpChatOwner();
    const backendId = String(
      args.transcriptPage?.backendId || active.backendId,
    ).trim();
    const conversationId = String(
      args.transcriptPage?.conversationId || active.conversationId,
    ).trim();
    if (!backendId || !conversationId) {
      return { transcriptRegion: createIdleTranscriptRegion() };
    }
    const owner = createAcpChatWorkspaceOwner(backendId, conversationId);
    if (args.transcriptReadMode === "loading-first") {
      return { transcriptRegion: createLoadingTranscriptRegion(owner) };
    }
    try {
      const page = await readSelectedAcpChatTranscriptPage({
        activeBackendId: backendId,
        activeConversationId: conversationId,
        request: args.transcriptPage,
        readTranscriptPage: args.readTranscriptPage,
        executionDisplayMode: getAssistantExecutionDisplayMode(),
      });
      if (!page) {
        const snapshot = getAcpConversationUiSnapshot(
          backendId,
          conversationId,
          { itemMode: "structural" },
        );
        if (
          Math.max(
            Number(snapshot.transcriptRevision) || 0,
            Number(snapshot.transcriptEventSeq) || 0,
            Number(snapshot.transcriptItemCount) || 0,
          ) > 0
        ) {
          return { transcriptRegion: createLoadingTranscriptRegion(owner) };
        }
        return {
          transcriptRegion: createReadyTranscriptRegion(
            owner,
            createAssistantWorkspaceTranscriptPage({
              owner,
              anchor: "tail",
              cursor: 0,
              limit: Math.max(
                1,
                Math.floor(Number(args.transcriptPage?.limit || 80) || 80),
              ),
              totalItemCount: 0,
              eventSeq: 0,
              items: [],
            }),
            0,
          ),
        };
      }
      return {
        transcriptRegion: createReadyTranscriptRegion(
          owner,
          createAssistantWorkspaceTranscriptPage({
            owner,
            anchor:
              args.transcriptPage?.cursor === undefined ? "tail" : "cursor",
            cursor: page.cursor,
            limit: page.limit,
            totalItemCount: page.total,
            previousCursor: page.prevCursor,
            nextCursor: page.nextCursor,
            eventSeq: page.eventSeq,
            items: page.items as Array<Record<string, unknown>>,
          }),
          0,
        ),
      };
    } catch (error) {
      return {
        transcriptRegion: createFailedTranscriptRegion(owner, {
          code: "transcript-page-read-failed",
          message: error instanceof Error ? error.message : String(error),
        }),
      };
    }
  }

  const active = getActiveAcpChatOwner();
  const snapshot = getAcpConversationUiSnapshot(
    active.backendId,
    active.conversationId,
    { itemMode: "structural" },
  );
  const ownerFields = {
    activeBackendId: active.backendId,
    backendId: active.backendId,
    activeConversationId: active.conversationId,
    conversationId: active.conversationId,
  };
  if (args.kind === "plan") {
    return {
      ...ownerFields,
      status: snapshot.status,
      busy: snapshot.busy,
      items: snapshot.items.filter((item) => item.kind === "plan"),
    };
  }
  if (args.kind === "permission") {
    return {
      ...ownerFields,
      status: snapshot.status,
      busy: snapshot.busy,
      pendingPermissionRequest: snapshot.pendingPermissionRequest,
      lastError: snapshot.lastError,
    };
  }
  if (args.kind === "reply-hint") {
    return {
      ...ownerFields,
      status: snapshot.status,
      busy: snapshot.busy,
      currentMode: snapshot.currentMode,
      modeOptions: snapshot.modeOptions,
      currentModel: snapshot.currentModel,
      modelOptions: snapshot.modelOptions,
      currentDisplayModel: snapshot.currentDisplayModel,
      displayModelOptions: snapshot.displayModelOptions,
      currentReasoningEffort: snapshot.currentReasoningEffort,
      reasoningEffortOptions: snapshot.reasoningEffortOptions,
      availableCommands: snapshot.availableCommands,
      usage: snapshot.usage,
    };
  }
  if (args.kind === "context-details") {
    return {
      ...ownerFields,
      sessionTitle: snapshot.sessionTitle,
      sessionUpdatedAt: snapshot.sessionUpdatedAt,
    };
  }
  return {
    ...ownerFields,
    status: snapshot.status,
    busy: snapshot.busy,
    lastError: snapshot.lastError,
  };
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
      "message-counts",
      "plan",
      "reply-hint",
      "context-details",
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

export function resolveAcpChatPublicationKindsForChange(
  state: AcpChatSnapshotRefreshState,
  change: AcpChatPanelSnapshotChange,
): AssistantWorkspacePublicationKind[] {
  if (!shouldRefreshAcpChatSnapshotForChange(state, change)) {
    return [];
  }
  return Array.from(
    new Set(
      normalizedAcpChatPanelChangeKinds(change).map(
        (kind) => ACP_CHAT_CHANGE_PUBLICATION_MAPPING[kind],
      ),
    ),
  );
}

export const ACP_CHAT_CHANGE_PUBLICATION_MAPPING = {
  "active-scope": "baseline-status",
  status: "baseline-status",
  permission: "permission",
  "session-list": "baseline-status",
  "transcript-boundary": "transcript",
  "transcript-append": "transcript",
  "transcript-progress": "transcript",
  "message-counts": "message-counts",
  plan: "plan",
  "reply-hint": "reply-hint",
  "context-details": "context-details",
  "runtime-options": "reply-hint",
  backend: "baseline-status",
  global: "baseline-status",
} as const satisfies Record<
  AcpChatPanelSnapshotChangeKind,
  AssistantWorkspacePublicationKind
>;
