import { buildAcpSidebarViewSnapshot } from "./acpSidebarModel";
import { isAssistantStreamingRenderEnabled } from "./assistantStreamingRenderPreference";
import { isAssistantTranscriptPaginationVirtualizationEnabled } from "./assistantTranscriptRenderingPreference";
import {
  getAcpConversationUiSnapshot,
  getAcpFrontendSnapshot,
  readAcpConversationTranscriptPage,
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
  args: Parameters<typeof readAcpConversationTranscriptPage>[0],
) => Promise<AcpConversationTranscriptPage>;

export type AcpChatPanelSnapshotArgs = {
  target: AcpSidebarTarget;
  transcriptPage?: AcpChatTranscriptPageRequest;
  readTranscriptPage?: AcpChatPanelSnapshotReadTranscriptPage;
};

export type AcpChatSnapshotRefreshState = {
  activeTab: "skillrunner" | "acp-chat" | "acp-skills";
  hasActiveTarget: boolean;
  transcriptPaginationVirtualizationEnabled: boolean;
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
  readTranscriptPage: AcpChatPanelSnapshotReadTranscriptPage;
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
  return args.readTranscriptPage({
    backendId,
    conversationId,
    cursor: finitePageNumber(args.request?.cursor),
    limit: finitePageNumber(args.request?.limit),
  });
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

export async function prepareAcpChatPanelSnapshot(
  args: AcpChatPanelSnapshotArgs,
) {
  const transcriptPaginationVirtualizationEnabled =
    isAssistantTranscriptPaginationVirtualizationEnabled();
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
    streamingRenderEnabled: isAssistantStreamingRenderEnabled(),
    transcriptPaginationVirtualizationEnabled:
      transcriptPaginationVirtualizationEnabled,
  };
  const availability = applyAcpChatPanelAvailabilityState(payload);
  if (!transcriptPaginationVirtualizationEnabled) {
    return payload;
  }
  if (
    availability.backendAvailability !== "selected" ||
    availability.conversationAvailability !== "selected"
  ) {
    return payload;
  }
  try {
    const page = await readSelectedAcpChatTranscriptPage({
      activeBackendId: availability.activeBackendId,
      activeConversationId: availability.activeConversationId,
      request: args.transcriptPage,
      readTranscriptPage:
        args.readTranscriptPage || readAcpConversationTranscriptPage,
    });
    if (selectedAcpChatTranscriptPageMatchesSnapshot(payload, page)) {
      payload.selectedTranscriptPage = page;
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
    ])
  ) {
    return true;
  }
  if (hasAnyAcpChatPanelChangeKind(change, ["transcript-append"])) {
    return !state.transcriptPaginationVirtualizationEnabled;
  }
  return false;
}
