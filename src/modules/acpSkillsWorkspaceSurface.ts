import { getAssistantExecutionDisplayMode } from "./assistantExecutionDisplayPolicy";
import {
  ASSISTANT_INTERACTION_FILE_MAX_BYTES,
  ASSISTANT_INTERACTION_TOTAL_MAX_BYTES,
  ASSISTANT_PENDING_INTERACTION_FILE_LIMIT,
  projectAssistantPendingInteractionFromHints,
} from "../shared/assistantInteractionContract";
import { snapshotAcpMessageCounts } from "./acpExecutionProgress";
import {
  canEditAcpSkillRunModelConfiguration,
  ensureAcpSkillRunWorkspaceSelection,
  getAcpSkillRunWorkspaceReadModel,
  getAcpSkillRunWorkspaceDetailsReadModel,
  getSelectedAcpSkillRunRequestId,
  listAcpSkillRunSummaries,
  readAcpSkillRunTranscriptRegion,
  type AcpSkillRunWorkspaceChange,
  type AcpSkillRunWorkspaceChangeKind,
  type AcpSkillRunTranscriptPageRequest,
} from "./acpSkillRunStore";
import type {
  AssistantWorkspaceDetailsFieldId,
  AssistantWorkspaceOwnerNavigation,
  AssistantWorkspacePublicationKind,
} from "./assistantWorkspacePublication";
import {
  createAcpSkillsWorkspaceOwner,
  projectAssistantWorkspaceOptionGroup,
  projectAssistantWorkspacePermissionRequest,
} from "./assistantWorkspacePublication";
import {
  defineAssistantWorkspacePublicationAdapter,
  type AssistantWorkspacePublicationAdapter,
  type AssistantWorkspacePublicationRuntimePayloadByKind,
} from "./assistantWorkspacePublicationRuntime";
import { workflowSubmissionQueue } from "../jobQueue/workflowSubmissionQueue";
import { listBackendInstancesSync } from "../backends/registry";
import { resolveBackendDisplayName } from "../backends/displayName";

export const ACP_SKILL_RUN_CHANGE_PUBLICATION_MAPPING = {
  run: [
    "owner-control",
    "owner-navigation",
    "permission",
    "composer",
    "owner-presentation",
  ],
  transcript: ["transcript"],
  plan: ["plan"],
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

type AcpSkillRunWorkspaceRecord = NonNullable<
  ReturnType<typeof getAcpSkillRunWorkspaceReadModel>
>;

function isAcpSkillRunConnected(record: AcpSkillRunWorkspaceRecord) {
  return (
    record.conversationState === "active" ||
    record.conversationRecoveryState === "connected"
  );
}

function acpSkillRunInteractionState(
  record: AcpSkillRunWorkspaceRecord,
  connected: boolean,
) {
  const status = String(record.status || "").trim();
  const activeContinuation =
    record.replyState === "submitted" || record.replyState === "accepted";
  const interruptedTurn =
    record.promptInterruptState === "confirmed" ||
    record.promptInterruptState === "forced";
  const connectedIdleRun =
    connected &&
    !["succeeded", "failed", "canceled"].includes(status) &&
    !record.activePrompt &&
    !activeContinuation &&
    record.replyState === "idle" &&
    !record.pendingPermission &&
    interruptedTurn;
  const waitingForUser =
    status === "waiting_user" ||
    (Boolean(record.pendingInteraction) &&
      !record.activePrompt &&
      !activeContinuation) ||
    connectedIdleRun;
  return { activeContinuation, waitingForUser };
}

function acpSkillRunHint(
  record: AcpSkillRunWorkspaceRecord,
  connected: boolean,
  interactionState: ReturnType<typeof acpSkillRunInteractionState>,
) {
  const error = String(record.error || record.conversationError || "").trim();
  if (error) return { kind: "error" as const, message: error };
  const status = String(record.status || "").trim();
  if (interactionState.waitingForUser) {
    return {
      kind: "waiting_user" as const,
      message: null,
    };
  }
  const recoverableDisconnected =
    Boolean(record.sessionId) &&
    !connected &&
    record.conversationRecoveryState === "available";
  if (recoverableDisconnected) {
    return { kind: "disconnected" as const, message: null };
  }
  if (status === "repairing") {
    return { kind: "repairing" as const, message: null };
  }
  if (
    status === "queued" ||
    status === "running" ||
    record.activePrompt ||
    interactionState.activeContinuation
  ) {
    return { kind: "running" as const, message: null };
  }
  if (status === "succeeded") {
    return { kind: "completed" as const, message: null };
  }
  if (status === "canceled") {
    return { kind: "canceled" as const, message: null };
  }
  if (status === "failed" || status === "failed_retriable") {
    return { kind: "error" as const, message: null };
  }
  return { kind: "hidden" as const, message: null };
}

function projectAcpSkillRunPendingInteraction(
  record: AcpSkillRunWorkspaceRecord,
) {
  const pending = record.pendingInteraction;
  if (!pending) return null;
  return projectAssistantPendingInteractionFromHints({
    pendingKind: pending.uiHints.kind,
    uiHints: pending.uiHints,
    fileReply: {
      supported: String(pending.uiHints.kind || "").trim() === "upload_files",
      maxFiles: ASSISTANT_PENDING_INTERACTION_FILE_LIMIT,
      maxFileBytes: ASSISTANT_INTERACTION_FILE_MAX_BYTES,
      maxTotalBytes: ASSISTANT_INTERACTION_TOTAL_MAX_BYTES,
    },
  });
}

function acpSkillRunSecondaryLabel(value: {
  requestId: string;
  skillName?: string;
  skillId?: string;
  workflowLabel?: string;
  workflowId?: string;
  sequenceStepId?: string;
  sequenceStepIndex?: number;
}) {
  const skillLabel =
    String(value.skillName || value.skillId || value.requestId).trim() ||
    value.requestId;
  const sequenceStepIndex = Number(value.sequenceStepIndex);
  const hasSequenceStepIndex =
    typeof value.sequenceStepIndex === "number" &&
    Number.isFinite(sequenceStepIndex) &&
    sequenceStepIndex >= 0;
  if (!value.sequenceStepId && !hasSequenceStepIndex) return skillLabel;
  const sequenceNumber = hasSequenceStepIndex
    ? Math.floor(sequenceStepIndex) + 1
    : null;
  const sequenceLabel = sequenceNumber
    ? ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"][
        sequenceNumber - 1
      ] || `#${sequenceNumber}`
    : "";
  const workflowLabel = String(
    value.workflowLabel || value.workflowId || "",
  ).trim();
  const taskLabel = workflowLabel
    ? `${skillLabel}/${workflowLabel}`
    : skillLabel;
  return [sequenceLabel, taskLabel].filter(Boolean).join(" ");
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
  const connected = isAcpSkillRunConnected(record);
  const interactionState = acpSkillRunInteractionState(record, connected);
  if (requested.has("message-counts")) {
    regions["message-counts"] = {
      counts: snapshotAcpMessageCounts(record.requestId) || null,
    };
  }
  if (requested.has("composer")) {
    const options = record.runtimeOptions;
    const modelConfigurationEditable =
      canEditAcpSkillRunModelConfiguration(record);
    const selectedModeId = record.acpModeId || "";
    const selectedModelId = record.acpModelId || record.acpRawModelId || "";
    const selectedReasoningEffort = record.acpReasoningEffort || "";
    const modelOptions = options?.displayModelOptions?.length
      ? options.displayModelOptions
      : options?.modelOptions;
    const replyAllowed =
      connected &&
      (interactionState.waitingForUser || record.status === "failed_retriable");
    regions.composer = {
      reply: {
        status:
          record.promptInterruptState === "requested"
            ? "cancelling"
            : record.activePrompt || interactionState.activeContinuation
              ? "busy"
              : replyAllowed && !record.pendingPermission
                ? "enabled"
                : "disabled",
      },
      runtimeOptions: {
        mode: projectAssistantWorkspaceOptionGroup(
          connected ? options?.modeOptions || [] : [],
          selectedModeId,
          connected && Boolean(options?.modeOptions.length),
        ),
        model: projectAssistantWorkspaceOptionGroup(
          connected ? modelOptions || [] : [],
          selectedModelId,
          connected &&
            modelConfigurationEditable &&
            Boolean(modelOptions?.length),
        ),
        reasoningEffort: projectAssistantWorkspaceOptionGroup(
          connected ? options?.reasoningEffortOptions || [] : [],
          selectedReasoningEffort,
          connected &&
            modelConfigurationEditable &&
            Boolean(options?.reasoningEffortOptions.length),
        ),
      },
    };
  }
  if (requested.has("permission")) {
    regions.permission = {
      request: projectAssistantWorkspacePermissionRequest(
        record.pendingPermission,
      ),
    };
  }
  if (requested.has("plan")) {
    regions.plan = {
      items: record.planEntries.map((entry, index) => ({
        itemId: `plan:${index}`,
        content: String(entry.content || ""),
        priority: entry.priority ? String(entry.priority) : null,
        status: entry.status ? String(entry.status) : null,
      })),
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
    regions["owner-presentation"] = {
      title,
      subtitle: acpSkillRunSecondaryLabel(record),
      description: null,
      notice: null,
      metadata: [
        {
          fieldId: "backend" as const,
          value: String(record.backendLabel || record.backendId || ""),
        },
        {
          fieldId: "workspace" as const,
          value: String(record.workspaceDir || ""),
        },
      ].filter((entry) => entry.value),
      usage: record.usage
        ? {
            used: Math.max(0, Number(record.usage.used) || 0),
            limit: Math.max(0, Number(record.usage.size) || 0),
            costText: null,
          }
        : null,
    };
  }
  if (requested.has("owner-details")) {
    const details = await getAcpSkillRunWorkspaceDetailsReadModel(
      args.requestId,
    );
    if (details) {
      const item = (
        fieldId: AssistantWorkspaceDetailsFieldId,
        value: unknown,
        format: "text" | "path" | "code" | "json" = "text",
      ) => ({ fieldId, value: String(value || "").trim(), format });
      const section = <
        T extends
          | "run-paths"
          | "runner"
          | "validation"
          | "runtime-dependencies"
          | "output-revisions"
          | "runtime-logs"
          | "result-json",
      >(
        sectionId: T,
        collapsed: boolean,
        items: ReturnType<typeof item>[],
      ) => ({
        sectionId,
        collapsed,
        items: items.filter((entry) => entry.value),
      });
      regions["owner-details"] = {
        status: "ready",
        title: record.taskName || record.workflowLabel || record.requestId,
        subtitle: record.requestId,
        sections: [
          section("run-paths", false, [
            item("workspace", details.workspaceDir, "path"),
            item("runtime", details.runtimeDir, "path"),
            item("input-manifest", details.inputManifestPath, "path"),
            item("result-artifact", details.resultJsonPath, "path"),
          ]),
          section("runner", false, [
            item("backend", details.backend),
            item("agent-family", details.agentFamily),
            item("mode", details.acpModeId),
            item("model", details.acpModelId),
            item("reasoning", details.acpReasoningEffort),
            item("raw-model", details.acpRawModelId),
            item("skill", details.skillId),
            item("skill-roots", details.skillRoots.join("\n"), "path"),
            item("session", details.sessionId),
          ]),
          section("validation", false, [
            item("validation-status", details.validationStatus),
            item("repair-rounds", details.repairRounds),
            item("validation-errors", details.validationErrors.join("\n")),
            item("run-error", details.error),
            item("conversation-error", details.conversationError),
            item("conversation-state", details.conversationState),
            item("apply-result", details.applyResultState),
            item("applied-at", details.appliedAt),
          ]),
          section("runtime-dependencies", false, [
            item("dependency-status", details.runtimeDependencyStatus),
            item("dependencies", details.runtimeDependencies.join("\n")),
            item("dependency-error", details.runtimeDependencyError),
          ]),
          section("output-revisions", true, [
            item("revision-count", details.outputRevisions.length),
            item(
              "candidate-preview",
              JSON.stringify(details.outputRevisions, null, 2),
              "json",
            ),
          ]),
          section("runtime-logs", true, [
            item("logs", JSON.stringify(details.runtimeLogs, null, 2), "json"),
          ]),
          section("result-json", true, [
            item("result-json", details.resultJsonText, "json"),
          ]),
        ].filter((entry) => entry.items.length > 0),
        actions: ["copy-id", "copy-diagnostics", "open-workspace"],
        error: null,
      };
    }
  }
  if (requested.has("owner-control")) {
    const connectionChanging =
      record.connectionActionState === "connecting" ||
      record.connectionActionState === "disconnecting";
    regions["owner-control"] = {
      status: String(record.status || "idle"),
      busy:
        record.status === "running" ||
        record.status === "repairing" ||
        record.activePrompt ||
        record.replyState === "submitted" ||
        record.replyState === "accepted",
      hint: acpSkillRunHint(record, connected, interactionState),
      interaction: interactionState.waitingForUser
        ? projectAcpSkillRunPendingInteraction(record)
        : null,
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
        canCancel: !["succeeded", "failed", "canceled"].includes(record.status),
        canInterrupt: record.activePrompt,
      },
      authentication: {
        required: false,
        canAuthenticate: false,
        methodId: null,
      },
      permissionPolicy: {
        autoApprove: false,
        canSetAutoApprove: false,
      },
    };
  }
  return regions;
}

function prepareAcpSkillsOwnerNavigation(): AssistantWorkspaceOwnerNavigation {
  const selectedRequestId = ensureAcpSkillRunWorkspaceSelection();
  const summaries = listAcpSkillRunSummaries({ includeArchived: false });
  const selectedOwner = selectedRequestId
    ? createAcpSkillsWorkspaceOwner(selectedRequestId)
    : null;
  const groups = new Map<
    string,
    { groupId: string; label: string; status: string }
  >();
  const backendById = new Map(
    listBackendInstancesSync().map((backend) => [backend.id, backend]),
  );
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
  const queuedEntries = workflowSubmissionQueue
    .listQueued()
    .filter((entry) => entry.backendType === "acp")
    .map((entry) => {
      const backend = backendById.get(entry.backendId);
      const groupLabel =
        resolveBackendDisplayName(entry.backendId, backend?.displayName) ||
        entry.backendId;
      if (!groups.has(entry.backendId)) {
        groups.set(entry.backendId, {
          groupId: entry.backendId,
          label: groupLabel,
          status: "queued",
        });
      }
      return {
        queueId: entry.queueId,
        groupId: entry.backendId,
        label: entry.taskName || entry.workflowLabel || entry.workflowId,
        subtitle: entry.workflowLabel || null,
        groupLabel,
        updatedAt: entry.createdAt || null,
        canCancel: entry.canCancel,
        submission: entry.submission,
        resumptionPending: false,
      };
    });
  const selectedSummary = summaries.find(
    (summary) => summary.requestId === selectedRequestId,
  );
  return {
    selectedOwner,
    selectedGroupId: String(selectedSummary?.backendId || "").trim() || null,
    groups: [...groups.values()],
    entries: summaries.map((summary) => {
      const terminal = ["succeeded", "failed", "canceled"].includes(
        String(summary.status || ""),
      );
      const submission =
        !terminal && summary.submissionId
          ? workflowSubmissionQueue.getSubmissionDisplayIdentity(
              summary.submissionId,
            )
          : null;
      const slot = summary.submissionUnitId
        ? workflowSubmissionQueue.getSlotSnapshot(summary.submissionUnitId)
        : null;
      return {
        owner: createAcpSkillsWorkspaceOwner(summary.requestId),
        groupId: String(summary.backendId || "").trim() || "default",
        label:
          String(
            summary.taskName ||
              summary.workflowLabel ||
              summary.skillId ||
              summary.requestId,
          ).trim() || summary.requestId,
        subtitle: acpSkillRunSecondaryLabel(summary),
        description: String(summary.error || "").trim() || null,
        groupLabel:
          String(summary.backendLabel || summary.backendId || "").trim() ||
          null,
        status: String(summary.status || "queued"),
        backendStatus: String(summary.backendStatus || "").trim() || null,
        applyState: String(summary.applyResultState || "").trim() || null,
        attention:
          String(summary.error || "").trim() ||
          (summary.pendingPermission ? "permission-required" : null),
        updatedAt: String(summary.updatedAt || "").trim() || null,
        messageCount: Math.max(0, Number(summary.transcriptItemCount) || 0),
        submission,
        resumptionPending: slot?.state === "resumption-pending",
      };
    }),
    queuedEntries,
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
      "plan",
      "permission",
      "composer",
      "owner-presentation",
      "owner-details",
    ],
    selectedOwner() {
      const requestId = ensureAcpSkillRunWorkspaceSelection();
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
      const changedRequestIds = change.requestIds || [];
      const requestId =
        change.global !== true && changedRequestIds.length === 1
          ? changedRequestIds[0]
          : "";
      return {
        owner: requestId ? createAcpSkillsWorkspaceOwner(requestId) : null,
        targetsActiveOwner:
          !!requestId && !!selectedRequestId && requestId === selectedRequestId,
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
