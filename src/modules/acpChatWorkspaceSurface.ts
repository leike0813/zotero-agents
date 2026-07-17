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
  projectAssistantWorkspacePermissionRequest,
  createReadyTranscriptRegion,
  type AssistantWorkspacePublicationKind,
  type AssistantWorkspaceDetailsFieldId,
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

function optionGroup(
  optionsRaw: unknown,
  selectedRaw: unknown,
  enabled: boolean,
) {
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
    enabled,
  };
}

function acpChatHint(snapshot: {
  status: string;
  busy: boolean;
  lastError: string;
  prerequisiteError: string;
  lastStopReason: string;
}) {
  const error = String(
    snapshot.prerequisiteError || snapshot.lastError || "",
  ).trim();
  if (error) return { kind: "error" as const, message: error };
  if (snapshot.status === "auth-required") {
    return { kind: "auth" as const, message: null };
  }
  if (snapshot.busy || snapshot.status === "prompting") {
    return { kind: "running" as const, message: null };
  }
  const stopReason = String(snapshot.lastStopReason || "").trim();
  if (stopReason) return { kind: "notice" as const, message: stopReason };
  return { kind: "hidden" as const, message: null };
}

function finitePageNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function boundedWorkspaceText(value: unknown, limit = 12_000) {
  const text = String(value || "").trim();
  return text ? text.slice(0, limit) : "";
}

function boundedWorkspaceJson(value: unknown, limit = 12_000) {
  if (value === null || value === undefined) return "";
  try {
    return JSON.stringify(value, null, 2).slice(0, limit);
  } catch {
    return boundedWorkspaceText(value, limit);
  }
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
    regions.permission = {
      request: projectAssistantWorkspacePermissionRequest(
        snapshot.pendingPermissionRequest,
      ),
    };
  }
  if (requested.has("composer")) {
    const connectionChanging = ["connecting", "disconnecting"].includes(
      String(snapshot.status || ""),
    );
    const sessionAvailable = Boolean(
      snapshot.sessionId || snapshot.remoteSessionId,
    );
    const pendingPermission = Boolean(snapshot.pendingPermissionRequest);
    const connected = snapshot.connected === true;
    const runtimeOptionsAvailable = connected && !snapshot.busy;
    regions.composer = {
      reply: {
        status:
          snapshot.promptInterruptState === "requested"
            ? "cancelling"
            : snapshot.busy
              ? "busy"
              : !connectionChanging && !pendingPermission
                ? "enabled"
                : "disabled",
      },
      runtimeOptions: {
        mode: optionGroup(
          runtimeOptionsAvailable ? snapshot.modeOptions : [],
          snapshot.currentMode,
          runtimeOptionsAvailable && snapshot.modeOptions.length > 0,
        ),
        model: optionGroup(
          runtimeOptionsAvailable
            ? snapshot.displayModelOptions.length
              ? snapshot.displayModelOptions
              : snapshot.modelOptions
            : [],
          snapshot.currentDisplayModel || snapshot.currentModel,
          runtimeOptionsAvailable &&
            (snapshot.displayModelOptions.length > 0 ||
              snapshot.modelOptions.length > 0),
        ),
        reasoningEffort: optionGroup(
          runtimeOptionsAvailable ? snapshot.reasoningEffortOptions : [],
          snapshot.currentReasoningEffort,
          runtimeOptionsAvailable && snapshot.reasoningEffortOptions.length > 0,
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
      title: "",
      subtitle: null,
      description: null,
      notice: null,
      metadata: [
        {
          fieldId: "backend" as const,
          value: snapshot.backendDisplayName || args.owner.backendId,
        },
        {
          fieldId: "conversation" as const,
          value: String(
            snapshot.sessionTitle ||
              (snapshot.connected ? snapshot.sessionId : ""),
          ).trim(),
        },
        {
          fieldId: "workspace" as const,
          value: String(workspace || ""),
        },
      ].filter((entry) => entry.value),
      usage: snapshot.usage
        ? {
            used: Math.max(0, Number(snapshot.usage.used) || 0),
            limit: Math.max(0, Number(snapshot.usage.size) || 0),
            costText: snapshot.usage.costText || null,
          }
        : null,
    };
  }
  if (requested.has("owner-details")) {
    const workspace =
      snapshot.agentWorkspaceDir ||
      snapshot.sessionCwd ||
      snapshot.workspaceDir ||
      snapshot.runtimeDir;
    const section = <T extends "session" | "paths" | "diagnostics">(
      sectionId: T,
      collapsed: boolean,
      items: Array<{
        fieldId: AssistantWorkspaceDetailsFieldId;
        value: string;
        format: "text" | "path" | "code" | "json";
      }>,
    ) => ({
      sectionId,
      collapsed,
      items: items.filter((item) => item.value),
    });
    regions["owner-details"] = {
      status: "ready",
      title:
        String(snapshot.sessionTitle || snapshot.conversationTitle).trim() ||
        args.owner.conversationId,
      subtitle: args.owner.conversationId,
      sections: [
        section("session", false, [
          {
            fieldId: "target",
            value: snapshot.backendDisplayName,
            format: "text",
          },
          { fieldId: "agent", value: snapshot.agentLabel, format: "text" },
          {
            fieldId: "agent-version",
            value: snapshot.agentVersion,
            format: "text",
          },
          {
            fieldId: "session",
            value: snapshot.sessionId,
            format: "text",
          },
          {
            fieldId: "remote-session",
            value: snapshot.remoteSessionId,
            format: "text",
          },
          {
            fieldId: "remote-restore",
            value: snapshot.remoteSessionRestoreMessage,
            format: "text",
          },
          {
            fieldId: "stop-reason",
            value: snapshot.lastStopReason,
            format: "text",
          },
        ]),
        section("paths", false, [
          { fieldId: "workspace", value: workspace, format: "path" },
          {
            fieldId: "host-context",
            value: boundedWorkspaceJson(snapshot.lastHostContext),
            format: "json",
          },
        ]),
        section("diagnostics", true, [
          {
            fieldId: "diagnostics",
            value: boundedWorkspaceJson(snapshot.diagnostics),
            format: "json",
          },
          {
            fieldId: "command",
            value: boundedWorkspaceText(snapshot.commandLine, 4_000),
            format: "code",
          },
          {
            fieldId: "stderr",
            value: boundedWorkspaceText(snapshot.stderrTail),
            format: "code",
          },
          {
            fieldId: "last-error",
            value: boundedWorkspaceText(snapshot.lastError),
            format: "text",
          },
          {
            fieldId: "prerequisite-error",
            value: boundedWorkspaceText(snapshot.prerequisiteError),
            format: "text",
          },
        ]),
      ].filter((entry) => entry.items.length > 0),
      actions: ["copy-diagnostics", "open-workspace"],
      error: null,
    };
  }
  if (requested.has("owner-control")) {
    const connected = snapshot.connected === true;
    const connectionChanging = ["connecting", "disconnecting"].includes(
      String(snapshot.status || ""),
    );
    regions["owner-control"] = {
      status: String(snapshot.status || "idle"),
      busy: snapshot.busy === true,
      hint: acpChatHint(snapshot),
      connection: {
        status: String(snapshot.status || "idle"),
        sessionAvailable: Boolean(
          snapshot.sessionId || snapshot.remoteSessionId,
        ),
        connected,
        canConnect: !snapshot.busy && !connected && !connectionChanging,
        canDisconnect: connected && !snapshot.busy && !connectionChanging,
      },
      execution: {
        canCancel: snapshot.busy === true,
        canInterrupt: false,
      },
      authentication: {
        required: snapshot.status === "auth-required",
        canAuthenticate:
          snapshot.status === "auth-required" &&
          snapshot.authMethods.length > 0,
        methodId: snapshot.authMethods[0]?.id || null,
      },
      permissionPolicy: {
        autoApprove: snapshot.autoApproveAcpPermissions,
        canSetAutoApprove: true,
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
      "owner-details",
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
