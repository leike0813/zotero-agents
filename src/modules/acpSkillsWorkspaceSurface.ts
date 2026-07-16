import { getAssistantExecutionDisplayMode } from "./assistantExecutionDisplayPolicy";
import { snapshotAcpMessageCounts } from "./acpExecutionProgress";
import {
  getAcpSkillRunRecord,
  getAcpSkillRunRuntimeOptions,
  getSelectedAcpSkillRunRequestId,
  listAcpSkillRunSummaries,
  readAcpSkillRunTranscriptRegion,
  type AcpSkillRunSnapshotChange,
  type AcpSkillRunSnapshotChangeKind,
  type AcpSkillRunTranscriptPageRequest,
} from "./acpSkillRunStore";
import type {
  AssistantWorkspaceOwnerNavigation,
  AssistantWorkspacePublicationKind,
  AssistantWorkspacePublicationPayload,
} from "./assistantWorkspacePublication";
import { createAcpSkillsWorkspaceOwner } from "./assistantWorkspacePublication";
import { ACP_SKILLS_WORKSPACE_DOMAIN_MAPPING } from "./assistantWorkspacePublication";
import {
  defineAssistantWorkspaceAcpSurfaceAdapter,
  type AssistantWorkspaceAcpSurfaceAdapter,
  type AssistantWorkspaceAcpSurfacePayloadByKind,
} from "./assistantWorkspaceAcpSurface";

export const ACP_SKILL_RUN_CHANGE_PUBLICATION_MAPPING = {
  run: [
    "baseline-status",
    "owner-navigation",
    "permission",
    "reply-hint",
    "context-details",
  ],
  transcript: ["transcript"],
  progress: ["message-counts"],
  "runtime-options": ["reply-hint"],
  selection: ["owner-navigation"],
  archive: ["owner-navigation"],
  global: ["owner-navigation"],
} as const satisfies Record<
  AcpSkillRunSnapshotChangeKind,
  readonly AssistantWorkspacePublicationKind[]
>;

export function mapAcpSkillRunChangeToPublicationKinds(
  kinds: readonly AcpSkillRunSnapshotChangeKind[],
) {
  return Array.from(
    new Set(
      kinds.flatMap((kind) => ACP_SKILL_RUN_CHANGE_PUBLICATION_MAPPING[kind]),
    ),
  );
}

export async function prepareAcpSkillRunPublication(args: {
  requestId?: string;
  publicationKind: AssistantWorkspacePublicationKind;
  transcriptReadMode?: "loading-first" | "page-first";
  transcriptPage?: AcpSkillRunTranscriptPageRequest;
}): Promise<AssistantWorkspacePublicationPayload | null> {
  if (args.publicationKind === "owner-navigation") {
    return prepareAcpSkillsOwnerNavigation();
  }
  const requestId = String(
    args.requestId || getSelectedAcpSkillRunRequestId() || "",
  ).trim();
  if (!requestId) return null;
  if (args.publicationKind === "transcript") {
    return readAcpSkillRunTranscriptRegion({
      requestId,
      transcriptReadMode: args.transcriptReadMode,
      transcriptPage: args.transcriptPage,
    });
  }
  if (args.publicationKind === "message-counts") {
    return { counts: snapshotAcpMessageCounts(requestId) || null };
  }
  const record = getAcpSkillRunRecord(requestId);
  if (!record) return null;
  if (args.publicationKind === "reply-hint") {
    const options = getAcpSkillRunRuntimeOptions(requestId);
    return {
      reply: {
        status: record.activePrompt ? "busy" : "enabled",
        hint: record.pendingInteraction?.message || null,
      },
      runtimeOptions: {
        mode: optionGroup(options?.modeOptions, options?.currentMode?.id),
        model: optionGroup(
          options?.displayModelOptions?.length
            ? options.displayModelOptions
            : options?.modelOptions,
          options?.currentDisplayModel?.id || options?.currentModel?.id,
        ),
        reasoningEffort: optionGroup(
          options?.reasoningEffortOptions,
          options?.currentReasoningEffort?.id,
        ),
      },
    };
  }
  if (args.publicationKind === "permission") {
    const pending = record.pendingPermission;
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
  if (args.publicationKind === "context-details") {
    return {
      context: [
        {
          itemId: "workflow",
          label: "Workflow",
          value: String(record.workflowLabel || record.workflowId || ""),
        },
        {
          itemId: "skill",
          label: "Skill",
          value: String(record.skillName || record.skillId || ""),
        },
        {
          itemId: "backend",
          label: "Backend",
          value: String(record.backendLabel || record.backendId || ""),
        },
      ].filter((entry) => entry.value),
      details: [
        {
          itemId: "workspace",
          label: "Workspace",
          value: String(record.workspaceDir || ""),
        },
        {
          itemId: "runtime",
          label: "Runtime",
          value: String(record.runtimeDir || ""),
        },
        {
          itemId: "session",
          label: "Session",
          value: String(record.sessionId || ""),
        },
        {
          itemId: "model",
          label: "Model",
          value: String(record.acpModelId || record.acpRawModelId || ""),
        },
        {
          itemId: "reasoning",
          label: "Reasoning",
          value: String(record.acpReasoningEffort || ""),
        },
      ].filter((entry) => entry.value),
    };
  }
  if (args.publicationKind === "plan") return null;
  const connected =
    record.conversationState === "active" ||
    record.conversationRecoveryState === "connected";
  const connectionChanging =
    record.connectionActionState === "connecting" ||
    record.connectionActionState === "disconnecting";
  return {
    status: String(record.status || "idle"),
    busy:
      record.status === "running" ||
      record.status === "repairing" ||
      record.activePrompt === true,
    message: record.error || null,
    connection: {
      status: String(
        record.connectionActionState ||
          record.conversationState ||
          record.conversationRecoveryState ||
          "idle",
      ),
      sessionAvailable: Boolean(record.sessionId),
      connected,
      canConnect:
        Boolean(record.sessionId) &&
        !connected &&
        !connectionChanging &&
        record.conversationState !== "ended" &&
        record.conversationRecoveryState !== "unavailable" &&
        record.conversationRecoveryState !== "unsupported",
      canDisconnect: connected && !connectionChanging,
    },
    execution: {
      canCancel:
        record.status === "running" ||
        record.status === "repairing" ||
        record.activePrompt === true,
      canInterrupt: record.activePrompt === true,
    },
  };
}

function prepareAcpSkillsOwnerNavigation(): AssistantWorkspaceOwnerNavigation {
  const selectedRequestId = getSelectedAcpSkillRunRequestId();
  const summaries = listAcpSkillRunSummaries({ includeArchived: false });
  const selectedOwner = selectedRequestId
    ? createAcpSkillsWorkspaceOwner(selectedRequestId)
    : null;
  const groups = new Map<
    string,
    { groupId: string; label: string; status: string }
  >();
  for (const summary of summaries) {
    const groupId = String(summary.backendId || "").trim() || "default";
    if (!groups.has(groupId)) {
      groups.set(groupId, {
        groupId,
        label: String(summary.backendLabel || groupId).trim() || groupId,
        status: String(summary.backendStatus || "idle"),
      });
    }
  }
  const selectedSummary = summaries.find(
    (summary) => summary.requestId === selectedRequestId,
  );
  return {
    selectedOwner,
    selectedGroupId: String(selectedSummary?.backendId || "").trim() || null,
    groups: [...groups.values()],
    entries: summaries.map((summary) => ({
      owner: createAcpSkillsWorkspaceOwner(summary.requestId),
      groupId: String(summary.backendId || "").trim() || "default",
      label:
        String(
          summary.workflowLabel ||
            summary.taskName ||
            summary.skillId ||
            summary.requestId,
        ).trim() || summary.requestId,
      description: String(summary.error || "").trim() || null,
      groupLabel: String(summary.backendId || "").trim() || null,
      status: String(summary.status || "idle"),
    })),
    canCreateOwner: false,
  };
}

export const ACP_SKILLS_WORKSPACE_SURFACE_ADAPTER =
  defineAssistantWorkspaceAcpSurfaceAdapter({
    source: "acp-skills",
    domainMapping: ACP_SKILLS_WORKSPACE_DOMAIN_MAPPING,
    getActiveOwner() {
      const requestId = getSelectedAcpSkillRunRequestId();
      return requestId ? createAcpSkillsWorkspaceOwner(requestId) : null;
    },
    async readOwnerNavigation() {
      return prepareAcpSkillsOwnerNavigation();
    },
    mapChange(change: AcpSkillRunSnapshotChange, _context: undefined) {
      const selectedRequestId = getSelectedAcpSkillRunRequestId();
      const publicationKinds = mapAcpSkillRunChangeToPublicationKinds(
        change.kinds || [],
      );
      const ownerNavigationChange =
        publicationKinds.includes("owner-navigation");
      const changedRequestIds = change.requestIds || [];
      const requestId =
        ownerNavigationChange || change.global === true
          ? selectedRequestId
          : selectedRequestId &&
              (changedRequestIds.length === 0 ||
                changedRequestIds.includes(selectedRequestId))
            ? selectedRequestId
            : changedRequestIds[0] || "";
      return {
        owner: requestId ? createAcpSkillsWorkspaceOwner(requestId) : null,
        targetsActiveOwner:
          !requestId || !selectedRequestId || requestId === selectedRequestId,
        publicationKinds,
        transcript: {
          events: change.transcriptEvents || [],
          sourceEventSeq: change.transcriptEventSeq || 0,
          visibility: getAssistantExecutionDisplayMode(),
        },
      };
    },
    async readPublication(args) {
      if (args.owner.source !== "acp-skills") return null;
      return prepareAcpSkillRunPublication({
        requestId: args.owner.requestId,
        publicationKind: args.publicationKind,
        transcriptReadMode: args.options?.transcriptReadMode,
        transcriptPage: args.options?.transcriptPage,
      }) as Promise<
        | AssistantWorkspaceAcpSurfacePayloadByKind[typeof args.publicationKind]
        | null
      >;
    },
  } satisfies AssistantWorkspaceAcpSurfaceAdapter<
    "acp-skills",
    AcpSkillRunSnapshotChange,
    undefined,
    AcpSkillRunTranscriptPageRequest
  >);

function optionGroup(
  options:
    | Array<{ id: string; label: string; description?: string }>
    | undefined,
  selectedOptionId: string | undefined,
) {
  return {
    selectedOptionId: selectedOptionId || null,
    options: (options || []).map((option) => ({
      optionId: option.id,
      label: option.label,
      description: option.description || null,
    })),
  };
}
