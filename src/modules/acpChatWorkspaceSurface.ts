import {
  getAssistantExecutionDisplayMode,
  type AssistantExecutionDisplayMode,
} from "./assistantExecutionDisplayPolicy";
import {
  getAcpChatExecutionProgress,
  getAcpChatWorkspaceOwnerNavigation,
  getAcpChatWorkspaceReadModel,
  getActiveAcpChatOwner,
  readAcpConversationTranscriptMirrorPage,
  readAcpConversationTranscriptPage,
  type AcpChatWorkspaceChange,
  type AcpChatWorkspaceChangeKind,
} from "./acpSessionManager";
import type { AcpSidebarTarget } from "./acpTypes";
import {
  createAcpChatWorkspaceOwner,
  createFailedTranscriptRegion,
  createIdleTranscriptRegion,
  createLoadingTranscriptRegion,
  createReadyTranscriptRegion,
  type AssistantWorkspacePublicationKind,
  type AssistantWorkspacePublicationPayloadByKind,
} from "./assistantWorkspacePublication";
import {
  createAssistantWorkspaceTranscriptPage,
  type AssistantWorkspaceTranscriptRegion,
} from "./assistantWorkspaceTranscriptPublication";
import {
  defineAssistantWorkspacePublicationAdapter,
  type AssistantWorkspacePublicationAdapter,
  type AssistantWorkspacePublicationRuntimePayloadByKind,
} from "./assistantWorkspacePublicationRuntime";

export type AcpChatTranscriptPageRequest = {
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
  status: "owner-control",
  permission: "permission",
  "session-list": "owner-navigation",
  "transcript-boundary": "transcript",
  "transcript-append": "transcript",
  "transcript-progress": "transcript",
  "message-counts": "message-counts",
  plan: "plan",
  composer: "composer",
  "owner-presentation": "owner-presentation",
  "runtime-options": "composer",
  backend: "owner-navigation",
  global: "owner-navigation",
} as const satisfies Record<
  AcpChatWorkspaceChangeKind,
  AssistantWorkspacePublicationKind
>;

function normalizedChangeKinds(change: AcpChatWorkspaceChange) {
  return (change.kinds || []).filter(Boolean);
}

function hasAnyChangeKind(
  change: AcpChatWorkspaceChange,
  kinds: readonly AcpChatWorkspaceChangeKind[],
) {
  const changed = new Set(normalizedChangeKinds(change));
  return kinds.some((kind) => changed.has(kind));
}

export function isPureAcpChatBackgroundChange(change: AcpChatWorkspaceChange) {
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
  change: AcpChatWorkspaceChange,
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
      "composer",
      "owner-presentation",
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
  change: AcpChatWorkspaceChange,
): AssistantWorkspacePublicationKind[] {
  if (!shouldPublishAcpChatWorkspaceChange(state, change)) return [];
  return mapAcpChatWorkspaceChangeKinds(state, change);
}

export function mapAcpChatWorkspaceChangeKinds(
  state: Pick<AcpChatSnapshotRefreshState, "executionDisplayMode">,
  change: AcpChatWorkspaceChange,
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
  transcriptPage?: AcpChatTranscriptPageRequest;
}): Promise<AssistantWorkspaceTranscriptRegion> {
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

export async function readAcpChatWorkspaceRegions(args: {
  owner: ReturnType<typeof createAcpChatWorkspaceOwner>;
  kinds: readonly Exclude<
    AssistantWorkspacePublicationKind,
    "owner-navigation" | "service-status" | "transcript"
  >[];
}): Promise<Partial<AssistantWorkspacePublicationRuntimePayloadByKind>> {
  const requested = new Set(args.kinds);
  const snapshot = getAcpChatWorkspaceReadModel(
    args.owner.backendId,
    args.owner.conversationId,
  );
  const regions: Partial<AssistantWorkspacePublicationRuntimePayloadByKind> =
    {};
  if (requested.has("message-counts")) {
    const progress = getAcpChatExecutionProgress(
      args.owner.backendId,
      args.owner.conversationId,
    );
    regions["message-counts"] = {
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
  if (requested.has("plan")) {
    regions.plan = {
      items: snapshot.planEntries.map((entry, index) => ({
        itemId: `plan:${index}`,
        content: String(entry.content || ""),
        priority: entry.priority ? String(entry.priority) : null,
        status: entry.status ? String(entry.status) : null,
      })),
    };
  }
  if (requested.has("permission")) {
    const pending = snapshot.pendingPermissionRequest;
    regions.permission = {
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
  if (requested.has("composer")) {
    regions.composer = {
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
  if (requested.has("owner-presentation")) {
    const workspace =
      snapshot.agentWorkspaceDir ||
      snapshot.sessionCwd ||
      snapshot.workspaceDir ||
      snapshot.runtimeDir;
    regions["owner-presentation"] = {
      title:
        String(snapshot.sessionTitle || snapshot.conversationTitle).trim() ||
        args.owner.conversationId,
      subtitle:
        String(snapshot.agentLabel || "").trim() ||
        String(args.owner.backendId || "").trim() ||
        null,
      description: String(snapshot.lastError || "").trim() || null,
      metadata: [
        {
          itemId: "backend",
          label: "Backend",
          value: args.owner.backendId,
        },
        {
          itemId: "conversation",
          label: "Conversation",
          value: args.owner.conversationId,
        },
        {
          itemId: "updated-at",
          label: "Updated",
          value: snapshot.sessionUpdatedAt || snapshot.updatedAt,
        },
      ].filter((entry) => entry.value),
      banner: {
        status: snapshot.status,
        message: String(snapshot.lastError || "").trim() || null,
        usage: snapshot.usage
          ? [
              {
                itemId: "usage",
                label: "Usage",
                value: `${snapshot.usage.used}/${snapshot.usage.size}`,
              },
              ...(snapshot.usage.costText
                ? [
                    {
                      itemId: "cost",
                      label: "Cost",
                      value: snapshot.usage.costText,
                    },
                  ]
                : []),
            ]
          : [],
        connection: [
          {
            itemId: "session",
            label: "Session",
            value: snapshot.sessionId || snapshot.remoteSessionId,
          },
        ].filter((entry) => entry.value),
        recovery: [
          {
            itemId: "remote-session",
            label: "Recovery",
            value: snapshot.remoteSessionRestoreMessage,
          },
        ].filter((entry) => entry.value),
        workspace: workspace
          ? [{ itemId: "workspace", label: "Workspace", value: workspace }]
          : [],
        details: snapshot.agentVersion
          ? [
              {
                itemId: "agent-version",
                label: "Agent version",
                value: snapshot.agentVersion,
              },
            ]
          : [],
        diagnostics: [
          { action: "copy-diagnostics", label: "Copy diagnostics" },
        ],
      },
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
          value: String(snapshot.sessionUpdatedAt || snapshot.updatedAt || ""),
        },
        {
          itemId: "workspace",
          label: "Workspace",
          value: String(workspace || ""),
        },
      ].filter((entry) => entry.value),
      tasks: [],
    };
  }
  if (requested.has("owner-control")) {
    regions["owner-control"] = {
      status: String(snapshot.status || "idle"),
      busy: snapshot.busy === true,
      message: snapshot.lastError || null,
      connection: {
        status: String(snapshot.status || "idle"),
        sessionAvailable: Boolean(
          snapshot.sessionId || snapshot.remoteSessionId,
        ),
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
  return regions;
}

export const ACP_CHAT_WORKSPACE_ADAPTER =
  defineAssistantWorkspacePublicationAdapter({
    source: "acp-chat",
    supportedKinds: [
      "owner-navigation",
      "service-status",
      "owner-control",
      "message-counts",
      "transcript",
      "plan",
      "permission",
      "composer",
      "owner-presentation",
    ],
    selectedOwner() {
      const active = getActiveAcpChatOwner();
      return active.backendId && active.conversationId
        ? createAcpChatWorkspaceOwner(active.backendId, active.conversationId)
        : null;
    },
    async readOwnerNavigation() {
      return getAcpChatWorkspaceOwnerNavigation();
    },
    mapChange(
      change: AcpChatWorkspaceChange,
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
    async readOwnerRegions(args) {
      return readAcpChatWorkspaceRegions(args);
    },
    async readTranscriptPage(args) {
      return readAcpChatTranscriptRegion({
        owner: args.owner,
        transcriptPage: args.request,
      });
    },
  } satisfies AssistantWorkspacePublicationAdapter<
    "acp-chat",
    AcpChatWorkspaceChange,
    AcpChatWorkspaceSurfaceContext,
    AcpChatTranscriptPageRequest
  >);
