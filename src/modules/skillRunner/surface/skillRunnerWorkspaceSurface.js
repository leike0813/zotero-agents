import { getSkillRunnerWorkspaceReadModel, getSkillRunnerWorkspaceSelectedOwner, listSkillRunnerWorkspaceTaskGroups, readSkillRunnerTranscriptRegion, readSkillRunnerWorkspaceOwnerDetails, } from "./skillRunnerRunDialog";
import { getSkillRunnerRunRecord } from "../run/skillRunnerRunStore";
import { createSkillRunnerWorkspaceOwner, projectAssistantWorkspacePermissionRequest, } from "../../assistant/publication/assistantWorkspacePublication";
import { createWorkspaceOwnerControl, defineAssistantWorkspaceSurfaceAdapter, listQueuedWorkspaceNavigationEntries, mapWorkspaceChangeKindsToPublicationKinds, readWorkspaceOwnerRegions, skillRunSecondaryLabel, } from "../../assistant/workspace/assistantWorkspaceSurfaceSkeleton";
import { ASSISTANT_INTERACTION_FILE_MAX_BYTES, ASSISTANT_INTERACTION_TOTAL_MAX_BYTES, ASSISTANT_PENDING_INTERACTION_FILE_LIMIT, projectAssistantPendingInteraction, } from "../../../shared/assistantInteractionContract";
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
};
export function mapSkillRunnerChangeToPublicationKinds(kinds) {
    return mapWorkspaceChangeKindsToPublicationKinds(SKILLRUNNER_WORKSPACE_CHANGE_PUBLICATION_MAPPING, kinds);
}
function skillRunnerWorkspaceHint(model) {
    if (model.status === "failed" || (model.error && model.terminal)) {
        return { kind: "error", message: model.error };
    }
    if (model.authRequired) {
        return {
            kind: "auth",
            message: model.pendingAuth?.prompt || null,
        };
    }
    if (model.status === "waiting_user" ||
        (model.waiting && model.pendingInteraction)) {
        return { kind: "waiting_user", message: null };
    }
    if (model.status === "succeeded") {
        return { kind: "completed", message: null };
    }
    if (model.status === "canceled") {
        return { kind: "canceled", message: null };
    }
    if (model.error) {
        return { kind: "error", message: model.error };
    }
    if (!model.terminal && !model.waiting) {
        return { kind: "running", message: null };
    }
    return { kind: "hidden", message: null };
}
/**
 * Owner-control interaction projection. Waiting-auth runs always carry the
 * resolved auth suite on the shared DTO: when the challenge does not accept
 * chat input the read model has no base interaction, so a minimal disabled
 * open-text DTO is synthesized as the auth block's carrier.
 */
function skillRunnerWorkspaceInteraction(model) {
    if (!model.waiting)
        return null;
    if (model.authRequired) {
        if (!model.pendingAuth)
            return null;
        const base = model.pendingInteraction ||
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
function skillRunnerStatusToken(value) {
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
function skillRunnerControlBadge(model) {
    const status = skillRunnerStatusToken(model.status);
    const submitPhase = skillRunnerStatusToken(model.submitPhase);
    if (model.pendingPermission) {
        return {
            state: "approval",
            tone: "warning",
            title: String(model.pendingPermission.summary ||
                model.pendingPermission.toolTitle ||
                "").trim() || null,
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
        const uploading = submitPhase === "uploading" ||
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
function skillRunnerAutoReplyBadge(model) {
    if (model.autoReplyEnabled !== true) {
        return null;
    }
    const active = model.autoReplyObserverActive === true;
    const remaining = active &&
        model.autoReplyObserverShowTimer === true &&
        Number.isFinite(model.autoReplyObserverRemainingSeconds)
        ? Math.max(0, Math.ceil(Number(model.autoReplyObserverRemainingSeconds)))
        : null;
    let progressPercent = null;
    if (active && model.autoReplyObserverShowTimer === true) {
        const startedAt = Date.parse(model.autoReplyObserverStartedAt || "");
        const deadlineAt = Date.parse(model.autoReplyObserverDeadlineAt || "");
        if (Number.isFinite(startedAt) &&
            Number.isFinite(deadlineAt) &&
            deadlineAt > startedAt) {
            const remainingRatio = (deadlineAt - Date.now()) / (deadlineAt - startedAt);
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
function skillRunnerComposerStatus(model) {
    const status = skillRunnerStatusToken(model.status);
    if (model.backendInteractive &&
        (status === "running" || status === "prompting")) {
        return "busy";
    }
    if (model.terminal || !model.waiting) {
        return "disabled";
    }
    if (model.authRequired) {
        const auth = model.pendingAuth;
        const inputKind = skillRunnerStatusToken(auth?.inputKind);
        const acceptsChatInput = auth?.acceptsChatInput === true &&
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
export async function readSkillRunnerWorkspaceRegions(args) {
    const model = getSkillRunnerWorkspaceReadModel();
    if (!model)
        return {};
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
                request: projectAssistantWorkspacePermissionRequest(model.pendingPermission),
            }),
            "owner-presentation": () => ({
                title: model.title,
                // Skill-backed runs surface the shared skill/sequence label (parity
                // with the ACP Skills banner); skillName resolves to the task name
                // for skill-less runs, so it is only passed when a skill id exists.
                // The bare request id remains the fallback.
                subtitle: skillRunSecondaryLabel({
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
                    ? { tone: "danger", text: model.submitError }
                    : model.error && !model.terminal
                        ? { tone: "warning", text: model.error }
                        : null,
                metadata: [
                    {
                        fieldId: "backend",
                        value: model.backendDisplayName || model.backendId,
                    },
                    { fieldId: "status", value: model.status },
                ].filter((entry) => entry.value),
                usage: null,
            }),
            "owner-details": () => readSkillRunnerWorkspaceOwnerDetails() || undefined,
            "owner-control": () => createWorkspaceOwnerControl({
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
function skillRunnerNavigationEntryAttention(task) {
    const status = String(task.status || "")
        .trim()
        .toLowerCase();
    if (status === "waiting_user" || status === "waiting_auth") {
        return status;
    }
    return task.attention === "warning" ? "warning" : null;
}
function prepareSkillRunnerOwnerNavigation() {
    const { selectedTaskKey, groups, historyNotice } = listSkillRunnerWorkspaceTaskGroups();
    const selected = getSkillRunnerWorkspaceSelectedOwner();
    const selectedOwner = selected
        ? createSkillRunnerWorkspaceOwner({
            requestId: selected.requestId || undefined,
            runKey: selected.runKey,
        })
        : null;
    const navigationGroups = new Map();
    const entries = [];
    let selectedGroupId = null;
    for (const group of groups) {
        const groupId = String(group.backendId || "").trim();
        if (!groupId)
            continue;
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
        if (group.disabled)
            continue;
        for (const task of [...group.activeTasks, ...group.finishedTasks]) {
            if (!task.selectable)
                continue;
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
                subtitle: String(task.skillName || task.skillLabel || task.workflowLabel || "").trim() || null,
                description: String(task.submitError || task.applyError || "").trim() || null,
                groupLabel: String(group.backendDisplayName || "").trim() || null,
                status: String(task.status || "queued"),
                backendStatus: String(task.backendStatus || "").trim() || null,
                applyState: String(task.applyState || "").trim() || null,
                attention: skillRunnerNavigationEntryAttention(task),
                updatedAt: String(task.updatedAt || "").trim() || null,
                messageCount: Math.max(0, (messageCounts?.assistant || 0) +
                    (messageCounts?.thought || 0) +
                    (messageCounts?.tool || 0)),
                canArchive: ["succeeded", "failed", "canceled"].includes(String(task.status || "")) || String(task.applyState || "") === "failed",
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
        entryGroupLabel: (entry, groupId) => navigationGroups.get(groupId)?.label || entry.backendId || null,
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
export const SKILLRUNNER_WORKSPACE_ADAPTER = defineAssistantWorkspaceSurfaceAdapter({
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
    mapChange(change, _context) {
        const selected = getSkillRunnerWorkspaceSelectedOwner();
        const runKey = String(change.runKey || "").trim();
        const requestId = String(change.requestId || "").trim() || null;
        const publicationKinds = mapSkillRunnerChangeToPublicationKinds(change.kinds || []);
        // SkillRunner has no incremental transcript channel: the transcript
        // kind is queued without mutations so the runtime re-reads a full
        // snapshot via readTranscriptPage (see the file header).
        return {
            owner: runKey
                ? createSkillRunnerWorkspaceOwner({ requestId, runKey })
                : null,
            targetsActiveOwner: !!runKey && !!selected && runKey === selected.runKey,
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
    async readTranscriptPage(args) {
        return readSkillRunnerTranscriptRegion({
            owner: args.owner,
            request: args.request,
        });
    },
});
