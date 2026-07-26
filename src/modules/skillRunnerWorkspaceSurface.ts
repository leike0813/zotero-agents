import {
  getSkillRunnerWorkspaceReadModel,
  getSkillRunnerWorkspaceSelectedOwner,
  listSkillRunnerWorkspaceTaskGroups,
  readSkillRunnerTranscriptRegion,
  type SkillRunnerWorkspaceChange,
  type SkillRunnerWorkspaceChangeKind,
  type SkillRunnerWorkspaceReadModel,
} from "./skillRunnerRunDialog";
import { getSkillRunnerRunRecord } from "./skillRunnerRunStore";
import type {
  AssistantWorkspaceDetailsFieldId,
  AssistantWorkspaceOwnerNavigation,
  AssistantWorkspacePublicationKind,
} from "./assistantWorkspacePublication";
import {
  createSkillRunnerWorkspaceOwner,
  projectAssistantWorkspacePermissionRequest,
} from "./assistantWorkspacePublication";
import {
  defineAssistantWorkspacePublicationAdapter,
  type AssistantWorkspacePublicationAdapter,
  type AssistantWorkspacePublicationRuntimePayloadByKind,
} from "./assistantWorkspacePublicationRuntime";
import type { AssistantWorkspaceTranscriptRegion } from "./assistantWorkspaceTranscriptPublication";
import { workflowSubmissionQueue } from "../jobQueue/workflowSubmissionQueue";

/**
 * SkillRunner surface adapter for the Assistant Workspace publication plane
 * (phase 3 Stage 2 of
 * openspec/changes/2026-07-21-assistant-workspace-skillrunner-convergence).
 *
 * Lands dark: the legacy SkillRunner tab path still serves the user while
 * this adapter mirrors the same store changes into publications.
 *
 * Transcript connection (design Decision 2): SkillRunner has no incremental
 * transcript channel, so `mapChange` lists "transcript" among the queued
 * publication kinds but never fills the runtime's mutation slot. The runtime
 * treats a transcript kind without mutations as a snapshot request and
 * re-reads the page through `readTranscriptPage`, publishing a steady-state
 * transcript snapshot. The publication clock (transcriptRevision /
 * skillRunnerTranscriptSignature, mode-aware qualification via
 * resolveRunWorkspaceTranscriptMessages and
 * isSkillRunnerDisabledLivePublishBoundary) lives in the read model, so
 * snapshots are only requested when the published signature actually
 * advanced (design Decision 8).
 *
 * `plan` and `service-status` are intentionally unsupported (design
 * Decision 3): SkillRunner has no plan surface and reports backend health
 * through the banner/navigation groups instead.
 */

export type SkillRunnerTranscriptPageRequest = {
  cursor?: number | null;
  limit?: number;
};

export const SKILLRUNNER_WORKSPACE_CHANGE_PUBLICATION_MAPPING = {
  run: [
    "owner-control",
    "owner-navigation",
    "message-counts",
    "permission",
    "composer",
    "owner-presentation",
  ],
  transcript: ["transcript"],
  selection: ["owner-navigation"],
  navigation: ["owner-navigation"],
  global: ["owner-navigation"],
} as const satisfies Record<
  SkillRunnerWorkspaceChangeKind,
  readonly AssistantWorkspacePublicationKind[]
>;

export function mapSkillRunnerChangeToPublicationKinds(
  kinds: readonly SkillRunnerWorkspaceChangeKind[],
) {
  return Array.from(
    new Set(
      kinds.flatMap(
        (kind) => SKILLRUNNER_WORKSPACE_CHANGE_PUBLICATION_MAPPING[kind],
      ),
    ),
  );
}

type SkillRunnerWorkspaceModel = NonNullable<SkillRunnerWorkspaceReadModel>;

function skillRunnerWorkspaceHint(model: SkillRunnerWorkspaceModel) {
  if (model.status === "failed" || (model.error && model.terminal)) {
    return { kind: "error" as const, message: model.error };
  }
  if (model.authRequired) {
    return { kind: "auth" as const, message: null };
  }
  if (
    model.status === "waiting_user" ||
    (model.waiting && model.pendingInteraction)
  ) {
    return { kind: "waiting_user" as const, message: null };
  }
  if (model.status === "succeeded") {
    return { kind: "completed" as const, message: null };
  }
  if (model.status === "canceled") {
    return { kind: "canceled" as const, message: null };
  }
  if (model.error) {
    return { kind: "error" as const, message: model.error };
  }
  if (!model.terminal && !model.waiting) {
    return { kind: "running" as const, message: null };
  }
  return { kind: "hidden" as const, message: null };
}

function skillRunnerDetailsItem(
  fieldId: AssistantWorkspaceDetailsFieldId,
  value: unknown,
  format: "text" | "path" | "code" | "json" = "text",
) {
  return { fieldId, value: String(value || "").trim(), format };
}

export async function readSkillRunnerWorkspaceRegions(args: {
  kinds: readonly Exclude<
    AssistantWorkspacePublicationKind,
    "owner-navigation" | "service-status" | "transcript"
  >[];
}): Promise<Partial<AssistantWorkspacePublicationRuntimePayloadByKind>> {
  const model = getSkillRunnerWorkspaceReadModel();
  if (!model) return {};
  const requested = new Set(args.kinds);
  const regions: Partial<AssistantWorkspacePublicationRuntimePayloadByKind> =
    {};
  if (requested.has("message-counts")) {
    regions["message-counts"] = { counts: model.messageCounts };
  }
  if (requested.has("composer")) {
    regions.composer = {
      reply: {
        // Auth chat input is governed by the pending auth payload
        // (acceptsChatInput, projected into the interaction DTO), not by the
        // task-level canReply flag, which only covers backend run replies.
        status:
          !model.terminal &&
          model.waiting &&
          (model.canReply || (model.authRequired && !!model.pendingInteraction))
            ? "enabled"
            : "disabled",
      },
      runtimeOptions: {
        mode: { selectedOptionId: null, options: [], enabled: false },
        model: { selectedOptionId: null, options: [], enabled: false },
        reasoningEffort: {
          selectedOptionId: null,
          options: [],
          enabled: false,
        },
      },
    };
  }
  if (requested.has("permission")) {
    regions.permission = {
      request: projectAssistantWorkspacePermissionRequest(
        model.pendingPermission,
      ),
    };
  }
  if (requested.has("owner-presentation")) {
    regions["owner-presentation"] = {
      title: model.title,
      subtitle:
        model.requestId && model.requestId !== model.title
          ? model.requestId
          : null,
      description: null,
      notice: model.submitError
        ? { tone: "danger" as const, text: model.submitError }
        : model.error && !model.terminal
          ? { tone: "warning" as const, text: model.error }
          : null,
      metadata: [
        {
          fieldId: "backend" as const,
          value: model.backendDisplayName || model.backendId,
        },
        { fieldId: "status" as const, value: model.status },
      ].filter((entry) => entry.value),
      usage: null,
    };
  }
  if (requested.has("owner-details")) {
    const runnerItems = [
      skillRunnerDetailsItem("backend", model.backendDisplayName),
      skillRunnerDetailsItem("skill", model.title),
      skillRunnerDetailsItem("model", model.model),
      skillRunnerDetailsItem("session", model.requestId),
    ].filter((entry) => entry.value);
    const validationItems = [
      skillRunnerDetailsItem("validation-status", model.status),
      skillRunnerDetailsItem("apply-result", model.applyState),
      skillRunnerDetailsItem("applied-at", model.applyUpdatedAt),
      skillRunnerDetailsItem("run-error", model.error || model.submitError),
    ].filter((entry) => entry.value);
    regions["owner-details"] = {
      status: "ready",
      title: model.title,
      subtitle: model.requestId || null,
      sections: [
        { sectionId: "runner" as const, collapsed: false, items: runnerItems },
        {
          sectionId: "validation" as const,
          collapsed: false,
          items: validationItems,
        },
      ].filter((entry) => entry.items.length > 0),
      actions: ["copy-id", "copy-diagnostics"],
      error: null,
    };
  }
  if (requested.has("owner-control")) {
    regions["owner-control"] = {
      status: model.status,
      busy: !model.terminal && !model.waiting && model.status !== "queued",
      hint: skillRunnerWorkspaceHint(model),
      interaction: model.waiting ? model.pendingInteraction : null,
      connection: {
        status: "idle",
        sessionAvailable: false,
        connected: false,
        canConnect: false,
        canDisconnect: false,
      },
      execution: {
        canCancel: model.canCancel && !model.terminal,
        canInterrupt: false,
      },
      authentication: {
        required: model.authRequired,
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

function skillRunnerNavigationEntryAttention(task: {
  status: string;
  attention?: "" | "warning";
  requestId?: string;
}) {
  const status = String(task.status || "")
    .trim()
    .toLowerCase();
  if (status === "waiting_user" || status === "waiting_auth") {
    return status;
  }
  return task.attention === "warning" ? "warning" : null;
}

function prepareSkillRunnerOwnerNavigation(): AssistantWorkspaceOwnerNavigation {
  const { selectedTaskKey, groups } = listSkillRunnerWorkspaceTaskGroups();
  const selected = getSkillRunnerWorkspaceSelectedOwner();
  const selectedOwner = selected
    ? createSkillRunnerWorkspaceOwner({
        requestId: selected.requestId || undefined,
        runKey: selected.runKey,
      })
    : null;
  const navigationGroups = new Map<
    string,
    { groupId: string; label: string; status: string }
  >();
  const entries: AssistantWorkspaceOwnerNavigation["entries"] = [];
  let selectedGroupId: string | null = null;
  for (const group of groups) {
    const groupId = String(group.backendId || "").trim();
    if (!groupId) continue;
    if (!navigationGroups.has(groupId)) {
      navigationGroups.set(groupId, {
        groupId,
        label: String(group.backendDisplayName || "").trim() || groupId,
        status: group.disabled ? "unavailable" : "idle",
      });
    }
    if (group.disabled) continue;
    for (const task of [...group.activeTasks, ...group.finishedTasks]) {
      if (!task.selectable) continue;
      if (task.key === selectedTaskKey) {
        selectedGroupId = groupId;
      }
      const messageCounts = getSkillRunnerRunRecord(task.key)?.messageCounts
        ?.current;
      entries.push({
        owner: createSkillRunnerWorkspaceOwner({
          requestId: task.requestId || undefined,
          runKey: task.key,
        }),
        groupId,
        label: String(task.title || "").trim() || task.key,
        subtitle:
          String(
            task.skillName || task.skillLabel || task.workflowLabel || "",
          ).trim() || null,
        description:
          String(task.submitError || task.applyError || "").trim() || null,
        groupLabel: String(group.backendDisplayName || "").trim() || null,
        status: String(task.status || "queued"),
        backendStatus: String(task.backendStatus || "").trim() || null,
        applyState: String(task.applyState || "").trim() || null,
        attention: skillRunnerNavigationEntryAttention(task),
        updatedAt: String(task.updatedAt || "").trim() || null,
        messageCount: Math.max(
          0,
          (messageCounts?.assistant || 0) +
            (messageCounts?.thought || 0) +
            (messageCounts?.tool || 0),
        ),
      });
    }
  }
  const queuedEntries = workflowSubmissionQueue
    .listQueued()
    .filter((entry) => entry.backendType === "skillrunner")
    .map((entry) => {
      const groupId = String(entry.backendId || "").trim();
      if (!navigationGroups.has(groupId)) {
        navigationGroups.set(groupId, {
          groupId,
          label: groupId,
          status: "queued",
        });
      }
      return {
        queueId: entry.queueId,
        groupId,
        label: entry.taskName || entry.workflowLabel || entry.workflowId,
        subtitle: entry.workflowLabel || null,
        groupLabel:
          navigationGroups.get(groupId)?.label || entry.backendId || null,
        updatedAt: entry.createdAt || null,
        canCancel: entry.canCancel,
      };
    });
  return {
    selectedOwner,
    selectedGroupId,
    groups: [...navigationGroups.values()],
    entries,
    queuedEntries,
    canCreateOwner: false,
  };
}

export const SKILLRUNNER_WORKSPACE_ADAPTER =
  defineAssistantWorkspacePublicationAdapter({
    source: "skillrunner",
    supportedKinds: [
      "owner-navigation",
      "owner-control",
      "message-counts",
      "transcript",
      "permission",
      "composer",
      "owner-presentation",
      "owner-details",
    ],
    selectedOwner() {
      const selected = getSkillRunnerWorkspaceSelectedOwner();
      return selected
        ? createSkillRunnerWorkspaceOwner({
            requestId: selected.requestId || undefined,
            runKey: selected.runKey,
          })
        : null;
    },
    async readOwnerNavigation() {
      return prepareSkillRunnerOwnerNavigation();
    },
    mapChange(change: SkillRunnerWorkspaceChange, _context: undefined) {
      const selected = getSkillRunnerWorkspaceSelectedOwner();
      const runKey = String(change.runKey || "").trim();
      const requestId = String(change.requestId || "").trim() || null;
      const publicationKinds = mapSkillRunnerChangeToPublicationKinds(
        change.kinds || [],
      );
      // SkillRunner has no incremental transcript channel: the transcript
      // kind is queued without mutations so the runtime re-reads a full
      // snapshot via readTranscriptPage (see the file header).
      return {
        owner: runKey
          ? createSkillRunnerWorkspaceOwner({ requestId, runKey })
          : null,
        targetsActiveOwner:
          !!runKey && !!selected && runKey === selected.runKey,
        publicationKinds,
      };
    },
    async readOwnerRegions(args) {
      const selected = getSkillRunnerWorkspaceSelectedOwner();
      if (!selected || selected.runKey !== args.owner.runKey) {
        return {};
      }
      return readSkillRunnerWorkspaceRegions({ kinds: args.kinds });
    },
    async readTranscriptPage(
      args,
    ): Promise<AssistantWorkspaceTranscriptRegion> {
      return readSkillRunnerTranscriptRegion({
        owner: args.owner,
        request: args.request,
      });
    },
  } satisfies AssistantWorkspacePublicationAdapter<
    "skillrunner",
    SkillRunnerWorkspaceChange,
    undefined,
    SkillRunnerTranscriptPageRequest
  >);
