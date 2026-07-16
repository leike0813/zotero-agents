import {
  getAssistantExecutionDisplayMode,
  type AssistantExecutionDisplayMode,
} from "./assistantExecutionDisplayPolicy";
import {
  getAcpChatExecutionProgress,
  getAcpChatWorkspaceOwnerNavigation,
  getAcpConversationUiSnapshot,
  getActiveAcpChatOwner,
  readAcpConversationTranscriptMirrorPage,
  readAcpConversationTranscriptPage,
  type AcpChatPanelSnapshotChange,
  type AcpChatPanelSnapshotChangeKind,
} from "./acpSessionManager";
import type { AcpSidebarTarget } from "./acpTypes";
import {
  ACP_CHAT_WORKSPACE_DOMAIN_MAPPING,
  createAcpChatWorkspaceOwner,
  createFailedTranscriptRegion,
  createIdleTranscriptRegion,
  createLoadingTranscriptRegion,
  createReadyTranscriptRegion,
  type AssistantWorkspacePublicationKind,
  type AssistantWorkspacePublicationPayload,
} from "./assistantWorkspacePublication";
import {
  createAssistantWorkspaceTranscriptPage,
  type AssistantWorkspaceTranscriptRegion,
} from "./assistantWorkspaceTranscriptPublication";
import {
  defineAssistantWorkspaceAcpSurfaceAdapter,
  type AssistantWorkspaceAcpSurfaceAdapter,
  type AssistantWorkspaceAcpSurfacePayloadByKind,
} from "./assistantWorkspaceAcpSurface";

export type AcpChatTranscriptPageRequest = {
  backendId?: string;
  conversationId?: string;
  requestId?: string;
  cursor?: number;
  limit?: number;
};

export type AcpChatSnapshotRefreshState = {
  activeTab: "skillrunner" | "acp-chat" | "acp-skills";
  hasActiveTarget: boolean;
  transcriptPaginationVirtualizationEnabled: boolean;
  executionDisplayMode: AssistantExecutionDisplayMode;
};

export type AcpChatWorkspaceSurfaceContext = AcpChatSnapshotRefreshState & {
  target: AcpSidebarTarget;
};

export function acpChatTranscriptPageKey(
  backendId: string,
  conversationId: string,
) {
  return `${String(backendId || "").trim()}\n${String(
    conversationId || "",
  ).trim()}`;
}

export const ACP_CHAT_CHANGE_PUBLICATION_MAPPING = {
  "active-scope": "owner-navigation",
  status: "baseline-status",
  permission: "permission",
  "session-list": "owner-navigation",
  "transcript-boundary": "transcript",
  "transcript-append": "transcript",
  "transcript-progress": "transcript",
  "message-counts": "message-counts",
  plan: "plan",
  "reply-hint": "reply-hint",
  "context-details": "context-details",
  "runtime-options": "reply-hint",
  backend: "owner-navigation",
  global: "owner-navigation",
} as const satisfies Record<
  AcpChatPanelSnapshotChangeKind,
  AssistantWorkspacePublicationKind
>;

function normalizedChangeKinds(change: AcpChatPanelSnapshotChange) {
  return (change.kinds || []).filter(Boolean);
}

function hasAnyChangeKind(
  change: AcpChatPanelSnapshotChange,
  kinds: readonly AcpChatPanelSnapshotChangeKind[],
) {
  const changed = new Set(normalizedChangeKinds(change));
  return kinds.some((kind) => changed.has(kind));
}

export function isPureAcpChatBackgroundChange(
  change: AcpChatPanelSnapshotChange,
) {
  if (change.global || change.active === true) return false;
  const kinds = normalizedChangeKinds(change);
  return (
    kinds.length > 0 &&
    kinds.every(
      (kind) => kind === "transcript-append" || kind === "transcript-boundary",
    )
  );
}

export function shouldPublishAcpChatWorkspaceChange(
  state: AcpChatSnapshotRefreshState,
  change: AcpChatPanelSnapshotChange,
) {
  if (!state.hasActiveTarget || state.activeTab !== "acp-chat") return false;
  if (change.global === true) return true;
  if (change.active !== true) return false;
  if (
    hasAnyChangeKind(change, [
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
  return (
    hasAnyChangeKind(change, ["transcript-append"]) &&
    state.executionDisplayMode === "live"
  );
}

export function resolveAcpChatWorkspacePublicationKinds(
  state: AcpChatSnapshotRefreshState,
  change: AcpChatPanelSnapshotChange,
): AssistantWorkspacePublicationKind[] {
  if (!shouldPublishAcpChatWorkspaceChange(state, change)) return [];
  return mapAcpChatWorkspaceChangeKinds(state, change);
}

export function mapAcpChatWorkspaceChangeKinds(
  state: Pick<AcpChatSnapshotRefreshState, "executionDisplayMode">,
  change: AcpChatPanelSnapshotChange,
): AssistantWorkspacePublicationKind[] {
  return Array.from(
    new Set(
      normalizedChangeKinds(change)
        .filter(
          (kind) =>
            kind !== "transcript-append" ||
            state.executionDisplayMode === "live",
        )
        .map((kind) => ACP_CHAT_CHANGE_PUBLICATION_MAPPING[kind]),
    ),
  );
}

function optionGroup(optionsRaw: unknown, selectedRaw: unknown) {
  const selected =
    selectedRaw && typeof selectedRaw === "object"
      ? (selectedRaw as Record<string, unknown>)
      : null;
  return {
    selectedOptionId: selected ? String(selected.id || "") || null : null,
    options: (Array.isArray(optionsRaw) ? optionsRaw : []).map((option) => {
      const value = option as Record<string, unknown>;
      return {
        optionId: String(value.id || ""),
        label: String(value.label || value.id || ""),
        description: value.description ? String(value.description) : null,
      };
    }),
  };
}

function finitePageNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

async function readAcpChatTranscriptRegion(args: {
  owner: Extract<
    ReturnType<typeof createAcpChatWorkspaceOwner>,
    { source: "acp-chat" }
  >;
  transcriptReadMode?: "loading-first" | "page-first";
  transcriptPage?: AcpChatTranscriptPageRequest;
}): Promise<AssistantWorkspaceTranscriptRegion> {
  if (args.transcriptReadMode === "loading-first") {
    return createLoadingTranscriptRegion(args.owner);
  }
  const requestId = String(args.transcriptPage?.requestId || "").trim();
  if (requestId && requestId !== args.owner.ownerKey) {
    return createFailedTranscriptRegion(args.owner, {
      code: "transcript-page-owner-mismatch",
      message:
        "Transcript page owner does not match the selected conversation.",
    });
  }
  try {
    const readArgs = {
      backendId: args.owner.backendId,
      conversationId: args.owner.conversationId,
      cursor: finitePageNumber(args.transcriptPage?.cursor),
      limit: finitePageNumber(args.transcriptPage?.limit),
    };
    const page =
      readAcpConversationTranscriptMirrorPage({
        ...readArgs,
        executionDisplayMode: getAssistantExecutionDisplayMode(),
      }) || (await readAcpConversationTranscriptPage(readArgs));
    return createReadyTranscriptRegion(
      args.owner,
      createAssistantWorkspaceTranscriptPage({
        owner: args.owner,
        anchor: args.transcriptPage?.cursor === undefined ? "tail" : "cursor",
        cursor: page.cursor,
        limit: page.limit,
        totalVisibleItemCount: page.total,
        previousCursor: page.prevCursor,
        nextCursor: page.nextCursor,
        sourceEventSeq: page.eventSeq,
        items: page.items as Array<Record<string, unknown>>,
      }),
      0,
    );
  } catch (error) {
    return createFailedTranscriptRegion(args.owner, {
      code: "transcript-page-read-failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function readAcpChatWorkspacePublication(args: {
  owner: ReturnType<typeof createAcpChatWorkspaceOwner>;
  publicationKind: AssistantWorkspacePublicationKind;
  transcriptReadMode?: "loading-first" | "page-first";
  transcriptPage?: AcpChatTranscriptPageRequest;
}): Promise<AssistantWorkspacePublicationPayload | null> {
  if (args.publicationKind === "owner-navigation") {
    return getAcpChatWorkspaceOwnerNavigation();
  }
  if (args.publicationKind === "transcript") {
    return readAcpChatTranscriptRegion(args);
  }
  if (args.publicationKind === "message-counts") {
    const progress = getAcpChatExecutionProgress(
      args.owner.backendId,
      args.owner.conversationId,
    );
    return {
      counts: progress
        ? {
            scopeKey: progress.scopeKey,
            executionKey: progress.executionKey,
            active: progress.active,
            current: { ...progress.current },
            cumulative: { ...progress.cumulative },
            revision: progress.revision,
            completeness: progress.completeness,
          }
        : null,
    };
  }
  const snapshot = getAcpConversationUiSnapshot(
    args.owner.backendId,
    args.owner.conversationId,
    { itemMode: "structural" },
  );
  if (args.publicationKind === "plan") {
    return {
      items: snapshot.items
        .filter((item) => item.kind === "plan")
        .flatMap((item) =>
          item.entries.map((entry, index) => ({
            itemId: `${item.id}:${index}`,
            content: String(entry.content || ""),
            priority: entry.priority ? String(entry.priority) : null,
            status: entry.status ? String(entry.status) : null,
          })),
        ),
    };
  }
  if (args.publicationKind === "permission") {
    const pending = snapshot.pendingPermissionRequest;
    return {
      request: pending
        ? {
            requestId: pending.requestId,
            title: pending.toolTitle,
            summary: pending.summary || "",
            options: (pending.options || []).map((option) => ({
              optionId: option.optionId,
              label: option.name,
              description: option.description || null,
            })),
          }
        : null,
    };
  }
  if (args.publicationKind === "reply-hint") {
    return {
      reply: {
        status: snapshot.busy ? "busy" : "enabled",
        hint: null,
      },
      runtimeOptions: {
        mode: optionGroup(snapshot.modeOptions, snapshot.currentMode),
        model: optionGroup(
          snapshot.displayModelOptions.length
            ? snapshot.displayModelOptions
            : snapshot.modelOptions,
          snapshot.currentDisplayModel || snapshot.currentModel,
        ),
        reasoningEffort: optionGroup(
          snapshot.reasoningEffortOptions,
          snapshot.currentReasoningEffort,
        ),
      },
    };
  }
  if (args.publicationKind === "context-details") {
    return {
      context: [
        {
          itemId: "session-title",
          label: "Session",
          value: String(
            snapshot.sessionTitle || snapshot.conversationTitle || "",
          ),
        },
      ].filter((entry) => entry.value),
      details: [
        {
          itemId: "updated-at",
          label: "Updated",
          value: String(snapshot.sessionUpdatedAt || ""),
        },
        {
          itemId: "workspace",
          label: "Workspace",
          value: String(
            snapshot.agentWorkspaceDir || snapshot.sessionCwd || "",
          ),
        },
      ].filter((entry) => entry.value),
    };
  }
  return {
    status: String(snapshot.status || "idle"),
    busy: snapshot.busy === true,
    message: snapshot.lastError || null,
    connection: {
      status: String(snapshot.status || "idle"),
      sessionAvailable: Boolean(snapshot.sessionId || snapshot.remoteSessionId),
      connected:
        Boolean(snapshot.sessionId || snapshot.remoteSessionId) ||
        [
          "connected",
          "prompting",
          "permission-required",
          "auth-required",
        ].includes(String(snapshot.status || "")),
      canConnect:
        !snapshot.busy && !snapshot.sessionId && !snapshot.remoteSessionId,
      canDisconnect:
        Boolean(snapshot.sessionId || snapshot.remoteSessionId) &&
        !snapshot.busy,
    },
    execution: {
      canCancel: snapshot.busy === true,
      canInterrupt: false,
    },
  };
}

export const ACP_CHAT_WORKSPACE_SURFACE_ADAPTER =
  defineAssistantWorkspaceAcpSurfaceAdapter({
    source: "acp-chat",
    domainMapping: ACP_CHAT_WORKSPACE_DOMAIN_MAPPING,
    getActiveOwner() {
      const active = getActiveAcpChatOwner();
      return active.backendId && active.conversationId
        ? createAcpChatWorkspaceOwner(active.backendId, active.conversationId)
        : null;
    },
    async readOwnerNavigation() {
      return getAcpChatWorkspaceOwnerNavigation();
    },
    mapChange(
      change: AcpChatPanelSnapshotChange,
      context: AcpChatWorkspaceSurfaceContext,
    ) {
      const backendId = String(change.backendId || "").trim();
      const conversationId = String(change.conversationId || "").trim();
      return {
        owner:
          backendId && conversationId
            ? createAcpChatWorkspaceOwner(backendId, conversationId)
            : null,
        targetsActiveOwner: change.global === true || change.active === true,
        publicationKinds: mapAcpChatWorkspaceChangeKinds(context, change),
        transcript: {
          events: change.transcriptEvents || [],
          sourceEventSeq: change.transcriptEventSeq || 0,
          visibility: context.executionDisplayMode,
        },
      };
    },
    async readPublication(args) {
      return readAcpChatWorkspacePublication({
        owner: args.owner,
        publicationKind: args.publicationKind,
        transcriptReadMode: args.options?.transcriptReadMode,
        transcriptPage: args.options?.transcriptPage,
      }) as Promise<
        | AssistantWorkspaceAcpSurfacePayloadByKind[typeof args.publicationKind]
        | null
      >;
    },
  } satisfies AssistantWorkspaceAcpSurfaceAdapter<
    "acp-chat",
    AcpChatPanelSnapshotChange,
    AcpChatWorkspaceSurfaceContext,
    AcpChatTranscriptPageRequest
  >);
