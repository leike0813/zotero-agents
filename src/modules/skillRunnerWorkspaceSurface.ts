import {
  getSkillRunnerWorkspaceReadModel,
  getSkillRunnerWorkspaceSelectedOwner,
  listSkillRunnerWorkspaceTaskGroups,
  readSkillRunnerTranscriptRegion,
  readSkillRunnerWorkspaceOwnerDetails,
  type SkillRunnerWorkspaceChange,
  type SkillRunnerWorkspaceChangeKind,
  type SkillRunnerWorkspaceReadModel,
} from "./skillRunnerRunDialog";
import { getSkillRunnerRunRecord } from "./skillRunnerRunStore";
import type {
  AssistantWorkspaceOwnerBadges,
  AssistantWorkspaceOwnerNavigation,
  AssistantWorkspacePublicationKind,
} from "./assistantWorkspacePublication";
import {
  createSkillRunnerWorkspaceOwner,
  projectAssistantWorkspacePermissionRequest,
} from "./assistantWorkspacePublication";
import type {
  AssistantWorkspacePublicationAdapter,
  AssistantWorkspacePublicationRuntimePayloadByKind,
} from "./assistantWorkspacePublicationRuntime";
import type { AssistantWorkspaceTranscriptRegion } from "./assistantWorkspaceTranscriptPublication";
import {
  createWorkspaceOwnerControl,
  defineAssistantWorkspaceSurfaceAdapter,
  listQueuedWorkspaceNavigationEntries,
  mapWorkspaceChangeKindsToPublicationKinds,
  readWorkspaceOwnerRegions,
  skillRunSecondaryLabel,
  type AssistantWorkspaceNavigationGroupAccumulator,
  type AssistantWorkspaceOwnerRegionKind,
} from "./assistantWorkspaceSurfaceSkeleton";
import {
  ASSISTANT_INTERACTION_FILE_MAX_BYTES,
  ASSISTANT_INTERACTION_TOTAL_MAX_BYTES,
  ASSISTANT_PENDING_INTERACTION_FILE_LIMIT,
  projectAssistantPendingInteraction,
  type AssistantPendingInteraction,
} from "../shared/assistantInteractionContract";

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
  return mapWorkspaceChangeKindsToPublicationKinds(
    SKILLRUNNER_WORKSPACE_CHANGE_PUBLICATION_MAPPING,
    kinds,
  );
}

type SkillRunnerWorkspaceModel = NonNullable<SkillRunnerWorkspaceReadModel>;

function skillRunnerWorkspaceHint(model: SkillRunnerWorkspaceModel) {
  if (model.status === "failed" || (model.error && model.terminal)) {
    return { kind: "error" as const, message: model.error };
  }
  if (model.authRequired) {
    return {
      kind: "auth" as const,
      message: model.pendingAuth?.prompt || null,
    };
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

/**
 * Owner-control interaction projection. Waiting-auth runs always carry the
 * resolved auth suite on the shared DTO: when the challenge does not accept
 * chat input the read model has no base interaction, so a minimal disabled
 * open-text DTO is synthesized as the auth block's carrier.
 */
function skillRunnerWorkspaceInteraction(
  model: SkillRunnerWorkspaceModel,
): AssistantPendingInteraction | null {
  if (!model.waiting) return null;
  if (model.authRequired) {
    if (!model.pendingAuth) return null;
    const base =
      model.pendingInteraction ||
      projectAssistantPendingInteraction({
        inputKind: "open_text",
        prompt: null,
        hint: null,
        options: [],
        files: [],
        fileReply: {
          supported: false,
          maxFiles: ASSISTANT_PENDING_INTERACTION_FILE_LIMIT,
          maxFileBytes: ASSISTANT_INTERACTION_FILE_MAX_BYTES,
          maxTotalBytes: ASSISTANT_INTERACTION_TOTAL_MAX_BYTES,
        },
      });
    return base ? { ...base, auth: model.pendingAuth } : null;
  }
  return model.pendingInteraction;
}

function skillRunnerStatusToken(value: unknown): string {
  return String(value == null ? "" : value)
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
}

/**
 * Eight-state read-only interaction badge, mirroring the legacy
 * buildSkillRunnerControlIndicator branch order exactly: permission approval
 * > auth > needs-input > preparing (no request id) > submitting/preparing
 * (non-interactive submit phase) > read-only (terminal) > streaming.
 * The sidebar localizes the state token into the badge value.
 */
function skillRunnerControlBadge(
  model: SkillRunnerWorkspaceModel,
): NonNullable<AssistantWorkspaceOwnerBadges["control"]> {
  const status = skillRunnerStatusToken(model.status);
  const submitPhase = skillRunnerStatusToken(model.submitPhase);
  if (model.pendingPermission) {
    return {
      state: "approval",
      tone: "warning",
      title:
        String(
          model.pendingPermission.summary ||
            model.pendingPermission.toolTitle ||
            "",
        ).trim() || null,
    };
  }
  if (model.pendingAuth?.phase || status === "waiting-auth") {
    return { state: "auth", tone: "warning", title: null };
  }
  if (model.canReply || status === "waiting-user") {
    return { state: "input", tone: "warning", title: null };
  }
  if (!model.requestAssigned || !model.requestId) {
    return { state: "preparing", tone: "accent", title: null };
  }
  if (!model.backendInteractive) {
    const uploading =
      submitPhase === "uploading" ||
      status === "uploading" ||
      status === "request-creating";
    return {
      state: uploading ? "submitting" : "preparing",
      tone: "accent",
      title: null,
    };
  }
  if (model.terminal) {
    return { state: "read-only", tone: "muted", title: null };
  }
  return { state: "streaming", tone: "success", title: null };
}

/**
 * Auto-reply observer badge (legacy buildSkillRunnerAutoReplyIndicator): only
 * present when auto reply is enabled for the run; the countdown seconds and
 * progress ride along when the observer shows a timer.
 */
function skillRunnerAutoReplyBadge(
  model: SkillRunnerWorkspaceModel,
): NonNullable<AssistantWorkspaceOwnerBadges["autoReply"]> | null {
  if (model.autoReplyEnabled !== true) {
    return null;
  }
  const active = model.autoReplyObserverActive === true;
  const remaining =
    active &&
    model.autoReplyObserverShowTimer === true &&
    Number.isFinite(model.autoReplyObserverRemainingSeconds)
      ? Math.max(0, Math.ceil(Number(model.autoReplyObserverRemainingSeconds)))
      : null;
  let progressPercent: number | null = null;
  if (active && model.autoReplyObserverShowTimer === true) {
    const startedAt = Date.parse(model.autoReplyObserverStartedAt || "");
    const deadlineAt = Date.parse(model.autoReplyObserverDeadlineAt || "");
    if (
      Number.isFinite(startedAt) &&
      Number.isFinite(deadlineAt) &&
      deadlineAt > startedAt
    ) {
      const remainingRatio =
        (deadlineAt - Date.now()) / (deadlineAt - startedAt);
      progressPercent = Math.max(0, Math.min(100, remainingRatio * 100));
    }
  }
  return { active, remainingSeconds: remaining, progressPercent };
}

/**
 * Composer status projection, legacy reply semantics: a busy backend run
 * (running/prompting) turns the primary button into Cancel (busy), waiting
 * runs enable the input only when a reply is actually accepted — waiting_auth
 * requires the challenge to accept chat input (legacy
 * skillRunnerAuthInputVisible gate) with no auth action in flight. Note the
 * legacy canReply conjunct is mechanically false for waiting_auth (the store
 * projection only grants canReply to waiting_user runs), so the auth branch
 * follows the visible-challenge gate the legacy placeholder/submit labels
 * actually keyed on.
 */
function skillRunnerComposerStatus(
  model: SkillRunnerWorkspaceModel,
): "enabled" | "disabled" | "busy" {
  const status = skillRunnerStatusToken(model.status);
  if (
    model.backendInteractive &&
    (status === "running" || status === "prompting")
  ) {
    return "busy";
  }
  if (model.terminal || !model.waiting) {
    return "disabled";
  }
  if (model.authRequired) {
    const auth = model.pendingAuth;
    const inputKind = skillRunnerStatusToken(auth?.inputKind);
    const acceptsChatInput =
      auth?.acceptsChatInput === true &&
      !!inputKind &&
      inputKind !== "import-files" &&
      inputKind !== "custom-provider" &&
      skillRunnerStatusToken(auth?.phase) !== "method-selection";
    return acceptsChatInput && auth?.actionPending !== true
      ? "enabled"
      : "disabled";
  }
  return model.canReply ? "enabled" : "disabled";
}

export async function readSkillRunnerWorkspaceRegions(args: {
  kinds: readonly AssistantWorkspaceOwnerRegionKind[];
}): Promise<Partial<AssistantWorkspacePublicationRuntimePayloadByKind>> {
  const model = getSkillRunnerWorkspaceReadModel();
  if (!model) return {};
  return readWorkspaceOwnerRegions({
    kinds: args.kinds,
    readers: {
      "message-counts": () => ({ counts: model.messageCounts }),
      composer: () => ({
        reply: {
          status: skillRunnerComposerStatus(model),
        },
        // SkillRunner has no mode/model/reasoning selectors; null keeps the
        // child from rendering disabled placeholder dropdowns (legacy
        // composer had no runtime option groups at all).
        runtimeOptions: null,
      }),
      permission: () => ({
        request: projectAssistantWorkspacePermissionRequest(
          model.pendingPermission,
        ),
      }),
      "owner-presentation": () => ({
        title: model.title,
        // Skill-backed runs surface the shared skill/sequence label (parity
        // with the ACP Skills banner); skillName resolves to the task name
        // for skill-less runs, so it is only passed when a skill id exists.
        // The bare request id remains the fallback.
        subtitle:
          skillRunSecondaryLabel({
            requestId: model.requestId,
            skillName: model.skillId
              ? model.skillName || model.skillLabel || undefined
              : undefined,
            skillId: model.skillId || undefined,
            workflowLabel: model.workflowLabel || undefined,
            sequenceStepId: model.sequenceStepId || undefined,
            sequenceStepIndex: model.sequenceStepIndex ?? undefined,
          }) ||
          (model.requestId && model.requestId !== model.title
            ? model.requestId
            : null),
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
      }),
      "owner-details": () =>
        readSkillRunnerWorkspaceOwnerDetails() || undefined,
      "owner-control": () =>
        createWorkspaceOwnerControl({
          status: model.status,
          busy: !model.terminal && !model.waiting && model.status !== "queued",
          hint: skillRunnerWorkspaceHint(model),
          interaction: skillRunnerWorkspaceInteraction(model),
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
          badges: {
            control: skillRunnerControlBadge(model),
            autoReply: skillRunnerAutoReplyBadge(model),
          },
        }),
    },
  });
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
  const { selectedTaskKey, groups, historyNotice } =
    listSkillRunnerWorkspaceTaskGroups();
  const selected = getSkillRunnerWorkspaceSelectedOwner();
  const selectedOwner = selected
    ? createSkillRunnerWorkspaceOwner({
        requestId: selected.requestId || undefined,
        runKey: selected.runKey,
      })
    : null;
  const navigationGroups: AssistantWorkspaceNavigationGroupAccumulator =
    new Map();
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
        // Unreachable backends keep their drawer group (disabled, with the
        // localized reason) even though their task rows are withheld.
        disabledReason: group.disabled
          ? String(group.disabledReason || "").trim() || null
          : null,
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
        submission: task.submission ?? null,
        resumptionPending: task.resumptionPending === true,
      });
    }
  }
  const queuedEntries = listQueuedWorkspaceNavigationEntries({
    backendType: "skillrunner",
    groups: navigationGroups,
    groupIdOf: (entry) => String(entry.backendId || "").trim(),
    missingGroupLabel: (_entry, groupId) => groupId,
    entryGroupLabel: (entry, groupId) =>
      navigationGroups.get(groupId)?.label || entry.backendId || null,
  });
  return {
    selectedOwner,
    selectedGroupId,
    groups: [...navigationGroups.values()],
    entries,
    queuedEntries,
    canCreateOwner: false,
    notice: historyNotice || null,
  };
}

export const SKILLRUNNER_WORKSPACE_ADAPTER =
  defineAssistantWorkspaceSurfaceAdapter({
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
