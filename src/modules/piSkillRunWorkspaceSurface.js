import { getPiSkillRunCoordinator } from "./piSkillRun";
import { createFailedTranscriptRegion, createReadyTranscriptRegion, } from "./assistant/publication/assistantWorkspacePublication";
import { createAssistantWorkspaceTranscriptPage } from "./assistant/publication/assistantWorkspaceTranscriptPublication";
import { createWorkspaceOwnerControl, defineAssistantWorkspaceSurfaceAdapter, mapWorkspaceChangeKindsToPublicationKinds, readWorkspaceOwnerRegions, skillRunSecondaryLabel, } from "./assistant/workspace/assistantWorkspaceSurfaceSkeleton";
import { createAssistantMessageCounts } from "./assistant/publication/assistantMessageCounts";
import { getAssistantExecutionDisplayMode } from "./assistant/publication/assistantExecutionDisplayPolicy";
import { loadPiProviderConfigurationState } from "./piProviderConfiguration";
export const createPiSkillRunsWorkspaceOwner = (requestId) => ({
    source: "pi-skill-runs",
    ownerKey: requestId,
    requestId,
});
const ALL_KINDS = [
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
];
export const PI_SKILL_RUN_CHANGE_PUBLICATION_MAPPING = {
    navigation: ["owner-navigation"],
    control: ["owner-control", "composer"],
    resources: ["composer"],
    presentation: ["owner-presentation"],
    details: ["owner-details"],
    counts: ["message-counts"],
    permission: ["permission", "composer", "owner-control"],
    transcript: ["transcript"],
};
const TERMINAL_STATUSES = ["succeeded", "failed", "canceled"];
// Local user-action errors (for example a diagnostic export that could not be
// written) are surface state, not run outcome. They are held here so the
// coordinator and the run's own terminal state are never touched; the run's
// failure stays reported through the details view's run-error field.
const ACTION_NOTICES = new Map();
export function setPiSkillRunActionNotice(requestId, code) {
    const key = String(requestId || "").trim();
    if (!key)
        return;
    if (code)
        ACTION_NOTICES.set(key, code);
    else
        ACTION_NOTICES.delete(key);
}
export function readPiSkillRunActionNotice(requestId) {
    return ACTION_NOTICES.get(String(requestId || "").trim()) || null;
}
export function resetPiSkillRunActionNoticesForTests() {
    ACTION_NOTICES.clear();
}
export function createPiSkillRunsWorkspaceSurfaceAdapter(coordinator = getPiSkillRunCoordinator()) {
    return defineAssistantWorkspaceSurfaceAdapter({
        source: "pi-skill-runs",
        supportedKinds: ALL_KINDS,
        selectedOwner: () => coordinator.selectedId
            ? createPiSkillRunsWorkspaceOwner(coordinator.selectedId)
            : null,
        async readOwnerNavigation() {
            const owners = await coordinator.list();
            return {
                selectedOwner: coordinator.selectedId
                    ? createPiSkillRunsWorkspaceOwner(coordinator.selectedId)
                    : null,
                selectedGroupId: "pi-skill-runs",
                groups: [
                    {
                        groupId: "pi-skill-runs",
                        label: "Zotero Agent",
                        status: "ready",
                        disabledReason: null,
                    },
                ],
                entries: owners.map((owner) => {
                    // Q196 attention: a pending question/permission always lights up; a
                    // recovery only does while it still has an actionable step. A
                    // suspended run is user-initiated, so it never lights up.
                    const recoveryActions = owner.recoveryActions;
                    const attention = owner.status === "waiting_user" ||
                        owner.status === "waiting_permission" ||
                        (owner.status === "recovery_required" &&
                            Array.isArray(recoveryActions) &&
                            recoveryActions.length > 0);
                    return {
                        owner: createPiSkillRunsWorkspaceOwner(owner.requestId),
                        groupId: "pi-skill-runs",
                        label: String(owner.taskName || owner.requestId),
                        subtitle: skillRunSecondaryLabel({
                            requestId: owner.requestId,
                            skillId: owner.skillId,
                        }),
                        description: null,
                        groupLabel: "Zotero Agent",
                        status: owner.status,
                        backendStatus: null,
                        applyState: null,
                        attention: attention ? "attention" : null,
                        updatedAt: owner.updatedAt || null,
                        messageCount: owner.messageCount,
                        canArchive: owner.canArchive,
                        submission: null,
                        resumptionPending: false,
                    };
                }),
                queuedEntries: [],
                canCreateOwner: false,
                notice: null,
            };
        },
        mapChange(change) {
            return {
                owner: change.requestId
                    ? createPiSkillRunsWorkspaceOwner(change.requestId)
                    : null,
                targetsActiveOwner: change.requestId === coordinator.selectedId ||
                    change.kinds.includes("navigation"),
                publicationKinds: mapWorkspaceChangeKindsToPublicationKinds(PI_SKILL_RUN_CHANGE_PUBLICATION_MAPPING, change.kinds),
                transcript: {
                    events: change.transcriptEvents || [],
                    sourceEventSeq: change.sourceEventSeq || 0,
                    visibility: getAssistantExecutionDisplayMode(),
                },
            };
        },
        async readOwnerRegions({ owner, kinds, }) {
            const model = await coordinator.readModel(owner.requestId);
            const terminal = TERMINAL_STATUSES.includes(model.status);
            const busy = model.status === "running";
            // Text continuation is the suspended-run affordance; a waiting run is
            // answered through the interaction batch instead.
            const replyable = model.status === "suspended";
            // The owner accepts a model/reasoning change only while it is not
            // executing: waiting or suspended. Execution mode stays immutable.
            const selectionEditable = !busy &&
                ["waiting_user", "waiting_permission", "suspended"].includes(model.status);
            const optionGroup = (options, currentId) => ({
                enabled: selectionEditable && options.length > 0,
                selectedOptionId: currentId || null,
                options: options.map((option) => ({
                    optionId: option.id,
                    label: option.name,
                    description: null,
                })),
            });
            const pending = model.pending[0];
            return readWorkspaceOwnerRegions({
                kinds,
                readers: {
                    "owner-control": () => createWorkspaceOwnerControl({
                        status: model.status,
                        busy,
                        hint: {
                            kind: terminal
                                ? model.status === "succeeded"
                                    ? "completed"
                                    : model.status === "canceled"
                                        ? "canceled"
                                        : "error"
                                : model.status === "failed"
                                    ? "error"
                                    : model.status === "recovery_required"
                                        ? "error"
                                        : model.status === "waiting_user" ||
                                            model.status === "waiting_permission"
                                            ? "waiting_user"
                                            : busy
                                                ? "running"
                                                : "hidden",
                            message: model.failure || null,
                        },
                        // The versioned batch is the only interaction presenter: the
                        // singular legacy DTO is never derived, so the Reply region and
                        // the owner-control region cannot both show the same questions.
                        interaction: null,
                        connection: {
                            status: "local",
                            sessionAvailable: true,
                            connected: false,
                            canConnect: false,
                            canDisconnect: false,
                        },
                        execution: { canCancel: !terminal, canInterrupt: busy },
                        authentication: {
                            required: false,
                            canAuthenticate: false,
                            methodId: null,
                        },
                        permissionPolicy: {
                            autoApprove: false,
                            canSetAutoApprove: false,
                        },
                        badges: null,
                    }),
                    "message-counts": () => {
                        const counts = createAssistantMessageCounts(owner.ownerKey);
                        counts.active = busy;
                        counts.executionKey = model.turnId;
                        counts.cumulative = {
                            assistant: model.counts?.assistant || 0,
                            thought: model.counts?.thought || 0,
                            tool: model.counts?.tool || 0,
                        };
                        counts.current = { ...counts.cumulative };
                        counts.revision = model.revision;
                        return { counts };
                    },
                    plan: () => ({ items: [] }),
                    permission: () => ({
                        request: pending
                            ? {
                                requestId: pending.call.callId,
                                approvalKind: "pi-tool",
                                title: pending.call.name,
                                summary: pending.call.name,
                                tool: {
                                    title: pending.call.name,
                                    callId: pending.call.callId,
                                },
                                review: {
                                    requestedAt: null,
                                    command: null,
                                    preview: pending.admissionFacts !== undefined
                                        ? JSON.stringify(pending.admissionFacts)
                                        : JSON.stringify(pending.call.arguments).slice(0, 12000),
                                },
                                options: [
                                    { optionId: "approve", label: "Allow", description: null },
                                    { optionId: "deny", label: "Deny", description: null },
                                ],
                            }
                            : null,
                    }),
                    composer: () => ({
                        reply: {
                            status: busy ? "busy" : replyable ? "enabled" : "disabled",
                        },
                        runtimeOptions: {
                            mode: optionGroup([], undefined),
                            model: optionGroup(loadPiProviderConfigurationState()
                                .configurations.filter((item) => item.enabled)
                                .map((item) => ({
                                id: item.id,
                                name: item.label || item.modelId,
                            })), model.model?.configurationId),
                            reasoningEffort: optionGroup(["off", "minimal", "low", "medium", "high", "xhigh", "max"].map((id) => ({ id, name: id })), model.model?.reasoning),
                        },
                        interactionBatch: model.interactionBatch || null,
                    }),
                    "owner-presentation": () => ({
                        title: model.taskName || owner.requestId,
                        subtitle: skillRunSecondaryLabel({
                            requestId: owner.requestId,
                            skillId: model.skillId,
                        }),
                        description: null,
                        // The run's own failure wins; a local action error is only shown
                        // when the run has no failure of its own to report.
                        notice: model.failure
                            ? { tone: "danger", text: model.failure }
                            : readPiSkillRunActionNotice(owner.requestId)
                                ? {
                                    tone: "warning",
                                    text: readPiSkillRunActionNotice(owner.requestId),
                                }
                                : null,
                        metadata: [
                            { fieldId: "skill", value: model.skillId },
                            { fieldId: "status", value: model.status },
                            ...(model.model
                                ? [
                                    { fieldId: "model", value: model.model.modelId },
                                    {
                                        fieldId: "reasoning",
                                        value: model.model.reasoning,
                                    },
                                ]
                                : []),
                        ],
                        usage: null,
                    }),
                    "owner-details": () => {
                        const item = (fieldId, value) => ({
                            fieldId,
                            value: String(value ?? "").trim(),
                            format: "text",
                        });
                        return {
                            status: "ready",
                            title: model.taskName || owner.requestId,
                            subtitle: owner.requestId,
                            sections: [
                                {
                                    sectionId: "run",
                                    collapsed: false,
                                    items: [
                                        item("status", model.status),
                                        item("mode", model.mode),
                                        item("skill", model.skillId),
                                        item("runtime", model.turnId),
                                        item("model", model.model?.modelId),
                                        item("run-error", model.failure),
                                    ].filter((entry) => entry.value),
                                },
                                {
                                    sectionId: "validation",
                                    collapsed: true,
                                    items: [
                                        item("apply-result", model.applyReceipt?.status),
                                        item("applied-at", model.applyReceipt?.applyKey),
                                        item("stop-reason", model.applyReceipt?.code),
                                        item("terminal", model.terminalAck),
                                        item("validation-status", model.outcome?.status),
                                    ].filter((entry) => entry.value),
                                },
                            ].filter((section) => section.items.length > 0),
                            actions: [
                                "copy-id",
                                "export-diagnostics",
                                ...(model.status === "recovery_required"
                                    ? ["check-owner-recovery"]
                                    : []),
                                ...(model.canContinueRecovery
                                    ? ["continue-owner-recovery"]
                                    : []),
                            ],
                            error: null,
                        };
                    },
                },
            });
        },
        async readTranscriptPage({ owner, request, }) {
            try {
                const page = await coordinator.readPage(owner.requestId, request);
                return createReadyTranscriptRegion(owner, createAssistantWorkspaceTranscriptPage({
                    owner,
                    anchor: request?.cursor == null ? "tail" : "cursor",
                    cursor: page.cursor,
                    limit: page.limit,
                    totalVisibleItemCount: page.total,
                    previousCursor: page.previousCursor,
                    nextCursor: page.nextCursor,
                    sourceEventSeq: page.sourceEventSeq,
                    items: page.items,
                }), 0);
            }
            catch {
                return createFailedTranscriptRegion(owner, {
                    code: "transcript-page-read-failed",
                    message: "Transcript unavailable",
                });
            }
        },
    });
}
export const PI_SKILL_RUNS_WORKSPACE_ADAPTER = createPiSkillRunsWorkspaceSurfaceAdapter();
