import { getAssistantExecutionDisplayMode } from "./assistantExecutionDisplayPolicy";
import { snapshotAcpMessageCounts } from "./acpExecutionProgress";
import {
  getAcpSkillRunWorkspaceReadModel,
  getSelectedAcpSkillRunRequestId,
  listAcpSkillRunSummaries,
  readAcpSkillRunTranscriptRegion,
  type AcpSkillRunWorkspaceChange,
  type AcpSkillRunWorkspaceChangeKind,
  type AcpSkillRunTranscriptPageRequest,
} from "./acpSkillRunStore";
import type {
  AssistantWorkspaceOwnerNavigation,
  AssistantWorkspacePublicationKind,
} from "./assistantWorkspacePublication";
import { createAcpSkillsWorkspaceOwner } from "./assistantWorkspacePublication";
import { resolveAcpSkillRunWorkflowTaskState } from "./acpSkillRunTaskProjection";
import {
  defineAssistantWorkspacePublicationAdapter,
  type AssistantWorkspacePublicationAdapter,
  type AssistantWorkspacePublicationRuntimePayloadByKind,
} from "./assistantWorkspacePublicationRuntime";

export const ACP_SKILL_RUN_CHANGE_PUBLICATION_MAPPING = {
  run: [
    "owner-control",
    "owner-navigation",
    "permission",
    "composer",
    "owner-presentation",
  ],
  transcript: ["transcript"],
  progress: ["message-counts"],
  "runtime-options": ["composer"],
  selection: ["owner-navigation"],
  archive: ["owner-navigation"],
  global: ["owner-navigation"],
} as const satisfies Record<
  AcpSkillRunWorkspaceChangeKind,
  readonly AssistantWorkspacePublicationKind[]
>;

export function mapAcpSkillRunChangeToPublicationKinds(
  kinds: readonly AcpSkillRunWorkspaceChangeKind[],
) {
  return Array.from(
    new Set(
      kinds.flatMap((kind) => ACP_SKILL_RUN_CHANGE_PUBLICATION_MAPPING[kind]),
    ),
  );
}

export async function readAcpSkillRunWorkspaceRegions(args: {
  requestId: string;
  kinds: readonly Exclude<
    AssistantWorkspacePublicationKind,
    "owner-navigation" | "service-status" | "transcript"
  >[];
}): Promise<Partial<AssistantWorkspacePublicationRuntimePayloadByKind>> {
  const record = getAcpSkillRunWorkspaceReadModel(args.requestId);
  if (!record) return {};
  const requested = new Set(args.kinds);
  const regions: Partial<AssistantWorkspacePublicationRuntimePayloadByKind> =
    {};
  if (requested.has("message-counts")) {
    regions["message-counts"] = {
      counts: snapshotAcpMessageCounts(record.requestId) || null,
    };
  }
  if (requested.has("composer")) {
    const options = record.runtimeOptions;
    regions.composer = {
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
  if (requested.has("permission")) {
    const pending = record.pendingPermission;
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
  if (requested.has("owner-presentation")) {
    const title =
      String(
        record.taskName ||
          record.workflowLabel ||
          record.skillId ||
          record.requestId,
      ).trim() || record.requestId;
    const sequencePrefix = record.sequenceStepId
      ? `Step ${Math.max(1, Number(record.sequenceStepIndex) + 1)} · `
      : "";
    const subtitleValue =
      String(record.skillName || record.skillId || record.requestId).trim() ||
      record.requestId;
    regions["owner-presentation"] = {
      title,
      subtitle: `${sequencePrefix}${subtitleValue}`,
      description: String(record.error || "").trim() || null,
      notice: String(
        record.error ||
          record.conversationError ||
          record.pendingInteraction?.message ||
          "",
      ).trim()
        ? {
            tone:
              record.error || record.conversationError
                ? ("danger" as const)
                : ("warning" as const),
            text: String(
              record.error ||
                record.conversationError ||
                record.pendingInteraction?.message ||
                "",
            ).trim(),
          }
        : null,
      metadata: [
        {
          fieldId: "backend" as const,
          value: String(record.backendLabel || record.backendId || ""),
        },
        {
          fieldId: "workflow" as const,
          value: String(record.workflowLabel || record.workflowId || ""),
        },
        {
          fieldId: "status" as const,
          value: String(record.status || ""),
        },
        {
          fieldId: "backend-status" as const,
          value: String(record.backendStatus || ""),
        },
        {
          fieldId: "apply-state" as const,
          value: String(record.applyResultState || ""),
        },
        {
          fieldId: "updated-at" as const,
          value: String(record.updatedAt || ""),
        },
      ].filter((entry) => entry.value),
      usage: record.usage
        ? {
            used: Math.max(0, Number(record.usage.used) || 0),
            limit: Math.max(0, Number(record.usage.size) || 0),
            costText: null,
          }
        : null,
      sections: [
        {
          sectionId: "context" as const,
          items: [
            {
              fieldId: "workflow" as const,
              value: String(record.workflowLabel || record.workflowId || ""),
            },
            {
              fieldId: "skill" as const,
              value: String(record.skillName || record.skillId || ""),
            },
            {
              fieldId: "backend" as const,
              value: String(record.backendLabel || record.backendId || ""),
            },
          ].filter((entry) => entry.value),
        },
        {
          sectionId: "connection" as const,
          items: [
            {
              fieldId: "conversation" as const,
              value: String(record.conversationState || ""),
            },
          ].filter((entry) => entry.value),
        },
        {
          sectionId: "recovery" as const,
          items: [
            {
              fieldId: "recovery" as const,
              value: String(record.conversationRecoveryState || ""),
            },
          ].filter((entry) => entry.value),
        },
        {
          sectionId: "workspace" as const,
          items: [
            {
              fieldId: "workspace" as const,
              value: String(record.workspaceDir || ""),
            },
            {
              fieldId: "runtime" as const,
              value: String(record.runtimeDir || ""),
            },
          ].filter((entry) => entry.value),
        },
        {
          sectionId: "session" as const,
          items: [
            {
              fieldId: "session" as const,
              value: String(record.sessionId || ""),
            },
            {
              fieldId: "model" as const,
              value: String(record.acpModelId || record.acpRawModelId || ""),
            },
            {
              fieldId: "reasoning" as const,
              value: String(record.acpReasoningEffort || ""),
            },
          ].filter((entry) => entry.value),
        },
      ].filter((section) => section.items.length > 0),
    };
  }
  if (requested.has("owner-control")) {
    const connected =
      record.conversationState === "active" ||
      record.conversationRecoveryState === "connected";
    const connectionChanging =
      record.connectionActionState === "connecting" ||
      record.connectionActionState === "disconnecting";
    regions["owner-control"] = {
      status: String(record.status || "idle"),
      busy:
        record.status === "running" ||
        record.status === "repairing" ||
        record.activePrompt,
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
          record.activePrompt,
        canInterrupt: record.activePrompt,
      },
    };
  }
  return regions;
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
          summary.taskName ||
            summary.workflowLabel ||
            summary.skillId ||
            summary.requestId,
        ).trim() || summary.requestId,
      subtitle:
        `${
          summary.sequenceStepId
            ? `Step ${Math.max(
                1,
                Number(summary.sequenceStepIndex || 0) + 1,
              )} · `
            : ""
        }${String(
          summary.skillName ||
            summary.skillId ||
            summary.workflowLabel ||
            summary.requestId,
        ).trim()}` || null,
      description: String(summary.error || "").trim() || null,
      groupLabel:
        String(summary.backendLabel || summary.backendId || "").trim() || null,
      status: String(resolveAcpSkillRunWorkflowTaskState(summary)),
      backendStatus: String(summary.backendStatus || "").trim() || null,
      applyState: String(summary.applyResultState || "").trim() || null,
      attention:
        String(summary.error || "").trim() ||
        (summary.pendingPermission ? "permission-required" : null),
      updatedAt: String(summary.updatedAt || "").trim() || null,
      messageCount: Math.max(0, Number(summary.transcriptItemCount) || 0),
    })),
    canCreateOwner: false,
  };
}

export const ACP_SKILLS_WORKSPACE_ADAPTER =
  defineAssistantWorkspacePublicationAdapter({
    source: "acp-skills",
    supportedKinds: [
      "owner-navigation",
      "service-status",
      "owner-control",
      "message-counts",
      "transcript",
      "permission",
      "composer",
      "owner-presentation",
    ],
    selectedOwner() {
      const requestId = getSelectedAcpSkillRunRequestId();
      return requestId ? createAcpSkillsWorkspaceOwner(requestId) : null;
    },
    async readOwnerNavigation() {
      return prepareAcpSkillsOwnerNavigation();
    },
    mapChange(change: AcpSkillRunWorkspaceChange, _context: undefined) {
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
    async readOwnerRegions(args) {
      return readAcpSkillRunWorkspaceRegions({
        requestId: args.owner.requestId,
        kinds: args.kinds,
      });
    },
    async readTranscriptPage(args) {
      return readAcpSkillRunTranscriptRegion({
        requestId: args.owner.requestId,
        transcriptReadMode: "page-first",
        transcriptPage: args.request,
      });
    },
  } satisfies AssistantWorkspacePublicationAdapter<
    "acp-skills",
    AcpSkillRunWorkspaceChange,
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
