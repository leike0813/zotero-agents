import { ASSISTANT_WORKSPACE_SOURCE_REGISTRY, } from "../../../shared/assistantWorkspaceSourceRegistry";
// Wire identity and field lists are single-sourced in the shared wire
// contract (imported by both this module and the sidebar page bundles);
// re-exported here to keep existing import sites compatible.
export { ASSISTANT_WORKSPACE_FORBIDDEN_WIRE_FIELDS, ASSISTANT_WORKSPACE_OPTIONAL_PUBLICATION_PAYLOAD_KEYS, ASSISTANT_WORKSPACE_PERMISSION_REQUEST_KEYS, ASSISTANT_WORKSPACE_PUBLICATION_ENVELOPE_KEYS, ASSISTANT_WORKSPACE_PUBLICATION_PAYLOAD_KEYS, ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA, ASSISTANT_WORKSPACE_TRANSCRIPT_DELTA_KEYS, ASSISTANT_WORKSPACE_TRANSCRIPT_SNAPSHOT_KEYS, } from "../../../shared/assistantWireContract";
import { parseAssistantPendingInteraction, } from "../../../shared/assistantInteractionContract";
import { parseUserInteractionBatchV1, } from "../../../shared/userInteractionContract";
import { ASSISTANT_WORKSPACE_FORBIDDEN_WIRE_FIELDS, ASSISTANT_WORKSPACE_OPTIONAL_PUBLICATION_PAYLOAD_KEYS, ASSISTANT_WORKSPACE_PERMISSION_REQUEST_KEYS, ASSISTANT_WORKSPACE_PUBLICATION_ENVELOPE_KEYS, ASSISTANT_WORKSPACE_PUBLICATION_PAYLOAD_KEYS, ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA, ASSISTANT_WORKSPACE_TRANSCRIPT_DELTA_KEYS, ASSISTANT_WORKSPACE_TRANSCRIPT_SNAPSHOT_KEYS, } from "../../../shared/assistantWireContract";
export const ASSISTANT_WORKSPACE_PRESENTATION_FIELD_REGISTRY = {
    backend: { labelPath: "fields.backend" },
    workflow: { labelPath: "fields.workflow" },
    skill: { labelPath: "fields.skill" },
    status: { labelPath: "fields.status" },
    "backend-status": { labelPath: "status.backend" },
    "apply-state": { labelPath: "status.apply" },
    "updated-at": { labelPath: "fields.updated" },
    conversation: { labelPath: "fields.conversation" },
    session: { labelPath: "fields.session" },
    recovery: { labelPath: "fields.remoteRestore" },
    workspace: { labelPath: "fields.workspace" },
    runtime: { labelPath: "fields.runtime" },
    model: { labelPath: "fields.model" },
    reasoning: { labelPath: "fields.reasoning" },
    "agent-version": { labelPath: "fields.agentVersion" },
};
const ASSISTANT_WORKSPACE_ACTION_DEFINITIONS = {
    "open-context-drawer": {
        scope: "local",
        payloadKeys: [],
    },
    "close-context-drawer": {
        scope: "local",
        payloadKeys: [],
    },
    "open-details-drawer": {
        scope: "local",
        payloadKeys: [],
    },
    "close-details-drawer": {
        scope: "local",
        payloadKeys: [],
    },
    "request-owner-details": {
        scope: "selected-owner",
        payloadKeys: [],
    },
    "open-permission-request": {
        scope: "local",
        payloadKeys: [],
    },
    "close-permission-request": {
        scope: "local",
        payloadKeys: [],
    },
    "toggle-drawer-section": {
        scope: "local",
        payloadKeys: ["sectionId"],
    },
    "toggle-drawer-group": {
        scope: "local",
        payloadKeys: ["groupKey"],
    },
    "set-chat-display-mode": {
        scope: "local",
        payloadKeys: ["mode"],
    },
    "set-active-conversation": {
        scope: "target-owner",
        payloadKeys: [],
    },
    "archive-conversation": {
        scope: "target-owner",
        payloadKeys: [],
    },
    "restore-conversation": {
        scope: "target-owner",
        payloadKeys: [],
    },
    "delete-conversation": {
        scope: "target-owner",
        payloadKeys: [],
    },
    "rename-conversation": {
        scope: "selected-owner",
        payloadKeys: ["title"],
    },
    "compact-conversation": {
        scope: "selected-owner",
        payloadKeys: [],
    },
    "add-resource": {
        scope: "selected-owner",
        payloadKeys: ["kind"],
    },
    "remove-resource": {
        scope: "selected-owner",
        payloadKeys: ["resourceId"],
    },
    "select-run": {
        scope: "target-owner",
        payloadKeys: [],
    },
    "select-task": {
        scope: "target-owner",
        payloadKeys: [],
    },
    "archive-run": {
        scope: "target-owner",
        payloadKeys: [],
    },
    "cancel-queued-workflow-unit": {
        scope: "global",
        payloadKeys: ["queueId"],
    },
    "set-active-backend": {
        scope: "navigation-group",
        payloadKeys: ["groupId"],
    },
    "new-conversation": {
        scope: "navigation-group",
        payloadKeys: ["groupId"],
    },
    "open-backend-manager": {
        scope: "global",
        payloadKeys: [],
    },
    "open-auth-url": {
        scope: "global",
        payloadKeys: ["url"],
    },
    "close-sidebar": {
        scope: "global",
        payloadKeys: [],
    },
    "set-execution-display-mode": {
        scope: "global",
        payloadKeys: ["mode"],
    },
    "load-transcript-page": {
        scope: "selected-owner",
        payloadKeys: ["request"],
    },
    connect: {
        scope: "navigation-group",
        payloadKeys: ["groupId"],
    },
    disconnect: {
        scope: "selected-owner",
        payloadKeys: [],
    },
    cancel: {
        scope: "selected-owner",
        payloadKeys: [],
    },
    authenticate: {
        scope: "selected-owner",
        payloadKeys: ["methodId"],
    },
    "set-auto-approve-permissions": {
        scope: "selected-owner",
        payloadKeys: ["enabled"],
    },
    "send-prompt": {
        scope: "selected-owner",
        payloadKeys: ["message"],
    },
    "connect-run": {
        scope: "selected-owner",
        payloadKeys: [],
    },
    "disconnect-run": {
        scope: "selected-owner",
        payloadKeys: [],
    },
    "interrupt-run-turn": {
        scope: "selected-owner",
        payloadKeys: [],
    },
    "cancel-run": {
        scope: "selected-owner",
        payloadKeys: [],
    },
    "reply-run": {
        scope: "selected-owner",
        payloadKeys: ["message"],
    },
    "select-interaction-option": {
        scope: "selected-owner",
        payloadKeys: ["responseValue", "responseLabel"],
    },
    "submit-interaction-files": {
        scope: "selected-owner",
        payloadKeys: [
            "batchId",
            "questionId",
            "slotId",
            "baseRevision",
            "mutationId",
        ],
    },
    "auth-import-run": {
        scope: "selected-owner",
        payloadKeys: ["providerId", "files", "error"],
    },
    "resolve-permission": {
        scope: "selected-owner",
        payloadKeys: ["permissionRequestId", "outcome", "optionId"],
    },
    "set-mode": {
        scope: "selected-owner",
        payloadKeys: ["modeId"],
    },
    "set-model": {
        scope: "selected-owner",
        payloadKeys: ["modelId"],
    },
    "set-reasoning-effort": {
        scope: "selected-owner",
        payloadKeys: ["effortId"],
    },
    draft: {
        scope: "selected-owner",
        payloadKeys: [
            "batchId",
            "questionId",
            "baseRevision",
            "mutationId",
            "answer",
        ],
    },
    submit: {
        scope: "selected-owner",
        payloadKeys: ["batchId", "baseRevision", "mutationId", "answers"],
    },
    decline: {
        scope: "selected-owner",
        payloadKeys: ["batchId", "baseRevision", "mutationId"],
    },
    "copy-request-id": {
        scope: "selected-owner",
        payloadKeys: [],
    },
    "copy-diagnostics": {
        scope: "selected-owner",
        payloadKeys: [],
    },
    "export-diagnostics": {
        scope: "selected-owner",
        payloadKeys: [],
    },
    "check-owner-recovery": {
        scope: "selected-owner",
        payloadKeys: [],
    },
    "continue-owner-recovery": {
        scope: "selected-owner",
        payloadKeys: [],
    },
    "open-workspace": {
        scope: "selected-owner",
        payloadKeys: [],
    },
};
// Source support is owned by the browser-safe registry; this table adds only
// action scope and payload contracts for the existing host/child protocol.
export const ASSISTANT_WORKSPACE_ACTION_REGISTRY = Object.fromEntries(Object.entries(ASSISTANT_WORKSPACE_ACTION_DEFINITIONS).map(([action, definition]) => [
    action,
    {
        ...definition,
        sources: Object.values(ASSISTANT_WORKSPACE_SOURCE_REGISTRY)
            .filter((source) => source.actions.includes(action))
            .map((source) => source.id),
    },
]));
function boundedPermissionText(value, limit) {
    const normalized = String(value || "").trim();
    return normalized ? normalized.slice(0, limit) : null;
}
export function projectAssistantWorkspacePermissionRequest(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return null;
    const source = value;
    const requestId = boundedPermissionText(source.requestId, 512);
    if (!requestId)
        return null;
    const sourceId = String(source.source || "").trim();
    const approvalKind = source.approvalKind === "zotero-write" ||
        (typeof source.approvalKind === "undefined" &&
            ["zotero-mcp-write", "host-bridge-cli", "host-bridge"].includes(sourceId))
        ? "zotero-write"
        : "acp-tool";
    let command = null;
    let preview = null;
    const detail = boundedPermissionText(source.detail, 12_000);
    if (detail) {
        try {
            const parsed = JSON.parse(detail);
            command = boundedPermissionText(typeof parsed.command === "string"
                ? parsed.command
                : Array.isArray(parsed.command)
                    ? parsed.command.join(" ")
                    : null, 4_000);
            preview = boundedPermissionText(parsed.preview || parsed.diff || parsed.summary, 12_000);
        }
        catch {
            preview = detail;
        }
    }
    return {
        requestId,
        approvalKind,
        title: boundedPermissionText(source.toolTitle, 512) ||
            boundedPermissionText(source.summary, 512) ||
            requestId,
        summary: boundedPermissionText(source.summary, 1_000) || "",
        tool: {
            title: boundedPermissionText(source.toolTitle, 512) ||
                boundedPermissionText(source.summary, 512) ||
                requestId,
            callId: boundedPermissionText(source.toolCallId, 512),
        },
        review: {
            requestedAt: boundedPermissionText(source.requestedAt, 128),
            command,
            preview,
        },
        options: (Array.isArray(source.options) ? source.options : []).map((option) => {
            const entry = option;
            return {
                optionId: String(entry.optionId || ""),
                label: String(entry.name || entry.label || entry.optionId || ""),
                description: boundedPermissionText(entry.description, 1_000),
            };
        }),
    };
}
export function projectAssistantWorkspaceOptionGroup(options, selectedOptionId, enabled) {
    return {
        selectedOptionId: selectedOptionId || null,
        options: (options || []).map((option) => ({
            optionId: option.id,
            label: option.label,
            description: option.description || null,
        })),
        enabled,
    };
}
/**
 * Canonical owner-details action vocabulary. The details drawer renders one
 * button per listed action; the runtime allowlist and the type share this
 * array so a source cannot publish an action the host will not route.
 */
export const ASSISTANT_WORKSPACE_DETAILS_ACTIONS = [
    "copy-id",
    "copy-diagnostics",
    "export-diagnostics",
    "open-workspace",
    "compact-conversation",
    "rename-conversation",
    "archive-conversation",
    "restore-conversation",
    "delete-conversation",
    "check-owner-recovery",
    "continue-owner-recovery",
];
export const ASSISTANT_WORKSPACE_DETAILS_SECTION_REGISTRY = {
    session: { labelPath: "details.session" },
    paths: { labelPath: "details.paths" },
    diagnostics: { labelPath: "details.diagnostics" },
    "run-paths": { labelPath: "details.runPaths" },
    runner: { labelPath: "details.runner" },
    validation: { labelPath: "details.validation" },
    "runtime-dependencies": { labelPath: "details.runtimeDependencies" },
    "output-revisions": { labelPath: "details.outputRevisions" },
    "runtime-logs": { labelPath: "details.runtimeLogs" },
    "result-json": { labelPath: "details.resultJson" },
    run: { labelPath: "details.run" },
    "deferred-apply": { labelPath: "fields.deferredApply" },
    pending: { labelPath: "details.pending" },
    "conversation-summary": { labelPath: "details.conversationSummary" },
    "revision-summary": { labelPath: "details.revisionSummary" },
    usage: { labelPath: "details.usage" },
};
export const ASSISTANT_WORKSPACE_DETAILS_FIELD_REGISTRY = {
    target: { labelPath: "fields.target" },
    agent: { labelPath: "fields.agent" },
    "agent-version": { labelPath: "fields.agentVersion" },
    session: { labelPath: "fields.session" },
    "remote-session": { labelPath: "fields.remoteSession" },
    "remote-restore": { labelPath: "fields.remoteRestore" },
    "stop-reason": { labelPath: "fields.stopReason" },
    workspace: { labelPath: "fields.workspace" },
    "host-context": { labelPath: "fields.hostContext" },
    diagnostics: { labelPath: "details.recentDiagnostics" },
    command: { labelPath: "fields.command" },
    stderr: { labelPath: "fields.stderr" },
    "last-error": { labelPath: "fields.lastError" },
    "prerequisite-error": { labelPath: "fields.prerequisiteError" },
    runtime: { labelPath: "fields.runtime" },
    "input-manifest": { labelPath: "fields.inputManifest" },
    "result-artifact": { labelPath: "fields.resultArtifact" },
    backend: { labelPath: "fields.backend" },
    "agent-family": { labelPath: "fields.agentFamily" },
    mode: { labelPath: "fields.mode" },
    model: { labelPath: "fields.model" },
    reasoning: { labelPath: "fields.reasoning" },
    "raw-model": { labelPath: "fields.rawModel" },
    skill: { labelPath: "fields.skill" },
    "skill-roots": { labelPath: "fields.skillRoots" },
    "validation-status": { labelPath: "fields.validationStatus" },
    "repair-rounds": { labelPath: "fields.repairRounds" },
    "validation-errors": { labelPath: "fields.validationErrors" },
    "run-error": { labelPath: "fields.runError" },
    "conversation-error": { labelPath: "fields.conversationError" },
    "conversation-state": { labelPath: "fields.conversationState" },
    "apply-result": { labelPath: "fields.applyResult" },
    "applied-at": { labelPath: "fields.appliedAt" },
    "dependency-status": { labelPath: "fields.dependencyStatus" },
    dependencies: { labelPath: "fields.dependencies" },
    "dependency-error": { labelPath: "fields.dependencyError" },
    "revision-count": { labelPath: "fields.revisionCount" },
    "repair-round": { labelPath: "fields.repairRound" },
    "replacement-reason": { labelPath: "fields.replacementReason" },
    "candidate-preview": { labelPath: "fields.candidatePreview" },
    logs: { labelPath: "fields.logs" },
    "result-json": { labelPath: "details.resultJson" },
    title: { labelPath: "fields.title" },
    "request-id": { labelPath: "fields.requestId" },
    "usage-main": { labelPath: "fields.usageMain" },
    "usage-title": { labelPath: "fields.usageTitle" },
    "task-key": { labelPath: "fields.taskKey" },
    status: { labelPath: "fields.status" },
    terminal: { labelPath: "fields.terminal" },
    waiting: { labelPath: "fields.waiting" },
    engine: { labelPath: "fields.engine" },
    updated: { labelPath: "fields.updated" },
    loading: { labelPath: "fields.loading" },
    error: { labelPath: "fields.error" },
    "apply-attempt": { labelPath: "fields.applyAttempt" },
    "apply-max-attempt": { labelPath: "fields.applyMaxAttempt" },
    "apply-next-retry": { labelPath: "fields.applyNextRetry" },
    messages: { labelPath: "fields.messages" },
    "latest-timestamp": { labelPath: "fields.latestTimestamp" },
    "latest-kind": { labelPath: "fields.latestKind" },
    count: { labelPath: "fields.count" },
    latest: { labelPath: "fields.latest" },
    "pending-interaction": { labelPath: "fields.pendingInteraction" },
    "pending-kind": { labelPath: "fields.pendingKind" },
    "pending-prompt": { labelPath: "fields.pendingPrompt" },
    "pending-options": { labelPath: "fields.pendingOptions" },
    "pending-required-fields": { labelPath: "fields.pendingRequiredFields" },
    "auth-session": { labelPath: "fields.authSession" },
    "auth-provider": { labelPath: "fields.authProvider" },
    "auth-phase": { labelPath: "fields.authPhase" },
    "auth-engine": { labelPath: "fields.authEngine" },
    "auth-methods": { labelPath: "fields.authMethods" },
    "auth-challenge": { labelPath: "fields.authChallenge" },
    "auth-error": { labelPath: "fields.authError" },
};
export const ASSISTANT_WORKSPACE_REGION_REGISTRY = {
    "owner-navigation": {
        scope: "source",
        form: "region",
        browserStateKey: "navigation",
        managedRegions: ["navigation", "banner", "context-drawer"],
        sources: [
            "pi-conversations",
            "acp-chat",
            "pi-skill-runs",
            "acp-skills",
            "skillrunner",
        ],
    },
    "service-status": {
        scope: "source",
        form: "region",
        browserStateKey: "services",
        managedRegions: ["services", "banner"],
        sources: ["pi-conversations", "acp-chat", "pi-skill-runs", "acp-skills"],
    },
    "owner-control": {
        scope: "owner",
        form: "region",
        browserStateKey: "control",
        managedRegions: ["toolbar", "banner", "hint", "composer"],
        sources: [
            "pi-conversations",
            "acp-chat",
            "pi-skill-runs",
            "acp-skills",
            "skillrunner",
        ],
    },
    "message-counts": {
        scope: "owner",
        form: "region",
        browserStateKey: "messageCounts",
        managedRegions: ["message-counts"],
        sources: [
            "pi-conversations",
            "acp-chat",
            "pi-skill-runs",
            "acp-skills",
            "skillrunner",
        ],
    },
    transcript: {
        scope: "owner",
        form: "transcript",
        browserStateKey: "transcript",
        managedRegions: ["transcript"],
        sources: [
            "pi-conversations",
            "acp-chat",
            "pi-skill-runs",
            "acp-skills",
            "skillrunner",
        ],
    },
    plan: {
        scope: "owner",
        form: "region",
        browserStateKey: "plan",
        managedRegions: ["plan"],
        sources: ["pi-conversations", "acp-chat", "pi-skill-runs", "acp-skills"],
    },
    permission: {
        scope: "owner",
        form: "region",
        browserStateKey: "permission",
        managedRegions: ["hint", "permission", "composer"],
        sources: [
            "pi-conversations",
            "acp-chat",
            "pi-skill-runs",
            "acp-skills",
            "skillrunner",
        ],
    },
    composer: {
        scope: "owner",
        form: "region",
        browserStateKey: "composer",
        managedRegions: ["composer"],
        sources: [
            "pi-conversations",
            "acp-chat",
            "pi-skill-runs",
            "acp-skills",
            "skillrunner",
        ],
    },
    "owner-presentation": {
        scope: "owner",
        form: "region",
        browserStateKey: "presentation",
        managedRegions: ["banner"],
        sources: [
            "pi-conversations",
            "acp-chat",
            "pi-skill-runs",
            "acp-skills",
            "skillrunner",
        ],
    },
    "owner-details": {
        scope: "owner",
        form: "region",
        browserStateKey: "details",
        managedRegions: ["details-drawer"],
        sources: [
            "pi-conversations",
            "acp-chat",
            "pi-skill-runs",
            "acp-skills",
            "skillrunner",
        ],
    },
};
export const ASSISTANT_WORKSPACE_PUBLICATION_KINDS = Object.freeze(Object.keys(ASSISTANT_WORKSPACE_REGION_REGISTRY));
export const ACP_CHAT_WORKSPACE_DOMAIN_MAPPING = {
    "owner-navigation": "owner-navigation",
    "service-status": "service-status",
    "owner-control": "owner-control",
    "message-counts": "message-counts",
    transcript: "transcript",
    plan: "plan",
    permission: "permission",
    composer: "composer",
    "owner-presentation": "owner-presentation",
    "owner-details": "owner-details",
};
export const ACP_SKILLS_WORKSPACE_DOMAIN_MAPPING = {
    "owner-navigation": "owner-navigation",
    "service-status": "service-status",
    "owner-control": "owner-control",
    "message-counts": "message-counts",
    transcript: "transcript",
    plan: "plan",
    permission: "permission",
    composer: "composer",
    "owner-presentation": "owner-presentation",
    "owner-details": "owner-details",
};
// SkillRunner has no plan surface and reports backend health through the
// banner rather than service-status (design Decision 3 of
// openspec/changes/2026-07-21-assistant-workspace-skillrunner-convergence).
export const SKILLRUNNER_WORKSPACE_DOMAIN_MAPPING = {
    "owner-navigation": "owner-navigation",
    "service-status": "not-applicable",
    "owner-control": "owner-control",
    "message-counts": "message-counts",
    transcript: "transcript",
    plan: "not-applicable",
    permission: "permission",
    composer: "composer",
    "owner-presentation": "owner-presentation",
    "owner-details": "owner-details",
};
export function createAcpChatWorkspaceOwner(backendIdRaw, conversationIdRaw) {
    const backendId = String(backendIdRaw || "").trim();
    const conversationId = String(conversationIdRaw || "").trim();
    if (!backendId || !conversationId) {
        throw new Error("assistant-workspace-chat-owner-required");
    }
    return {
        source: "acp-chat",
        ownerKey: `${backendId}\n${conversationId}`,
        backendId,
        conversationId,
    };
}
export function createAcpSkillsWorkspaceOwner(requestIdRaw) {
    const requestId = String(requestIdRaw || "").trim();
    if (!requestId) {
        throw new Error("assistant-workspace-skills-owner-required");
    }
    return { source: "acp-skills", ownerKey: requestId, requestId };
}
/**
 * SkillRunner owner identity is request-scoped (design Decision 1 of
 * openspec/changes/2026-07-21-assistant-workspace-skillrunner-convergence):
 * the owner key is the assigned request id and falls back to the run key for
 * unassigned local runs. A late request-id assignment therefore surfaces as
 * an owner switch. The run key is always known locally and is required.
 */
export function createSkillRunnerWorkspaceOwner(args) {
    const requestId = String(args.requestId || "").trim() || null;
    const runKey = String(args.runKey || "").trim();
    if (!runKey) {
        throw new Error("assistant-workspace-skillrunner-owner-required");
    }
    return {
        source: "skillrunner",
        ownerKey: requestId || runKey,
        requestId,
        runKey,
    };
}
export function createAssistantWorkspaceUnownedScope(source) {
    return { source, ownerKey: null };
}
export function createIdleTranscriptRegion() {
    return {
        owner: null,
        status: "idle",
        error: null,
        page: null,
        transcriptRevision: 0,
    };
}
export function createLoadingTranscriptRegion(owner, transcriptRevision = 0) {
    return {
        owner,
        status: "loading",
        error: null,
        page: null,
        transcriptRevision,
    };
}
export function createReadyTranscriptRegion(owner, page, transcriptRevision) {
    return { owner, status: "ready", error: null, page, transcriptRevision };
}
export function createFailedTranscriptRegion(owner, error, transcriptRevision = 0) {
    return {
        owner,
        status: "failed",
        error,
        page: null,
        transcriptRevision,
    };
}
export function assertAssistantWorkspacePublication(value) {
    assertWireValue(value, "publication");
    const publication = value;
    assertExactObjectKeys(publication, ASSISTANT_WORKSPACE_PUBLICATION_ENVELOPE_KEYS, "assistant-workspace-publication-envelope");
    if (publication.schema !== ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA) {
        throw new Error("assistant-workspace-publication-schema");
    }
    if (!String(publication.publicationId || "").trim()) {
        throw new Error("assistant-workspace-publication-id");
    }
    if (!publication.owner) {
        throw new Error("assistant-workspace-publication-owner");
    }
    const owner = publication.owner;
    if (owner.source !== "pi-conversations" &&
        owner.source !== "acp-chat" &&
        owner.source !== "pi-skill-runs" &&
        owner.source !== "acp-skills" &&
        owner.source !== "skillrunner") {
        throw new Error("assistant-workspace-publication-owner-source");
    }
    const unowned = owner.ownerKey === null;
    if (unowned) {
        assertExactObjectKeys(owner, ["source", "ownerKey"], "assistant-workspace-publication-owner-invariant");
    }
    else if (owner.source === "acp-chat") {
        if (!("backendId" in owner) ||
            !owner.backendId ||
            !owner.conversationId ||
            owner.ownerKey !== `${owner.backendId}\n${owner.conversationId}`) {
            throw new Error("assistant-workspace-publication-owner-invariant");
        }
    }
    else if (owner.source === "acp-skills") {
        if (!("requestId" in owner) ||
            !owner.requestId ||
            owner.ownerKey !== owner.requestId) {
            throw new Error("assistant-workspace-publication-owner-invariant");
        }
    }
    else if (owner.source === "pi-conversations") {
        assertExactObjectKeys(owner, ["source", "ownerKey", "conversationId"], "assistant-workspace-publication-owner-invariant");
        if (!owner.conversationId || owner.ownerKey !== owner.conversationId) {
            throw new Error("assistant-workspace-publication-owner-invariant");
        }
    }
    else if (owner.source === "pi-skill-runs") {
        assertExactObjectKeys(owner, ["source", "ownerKey", "requestId"], "assistant-workspace-publication-owner-invariant");
        if (!owner.requestId || owner.ownerKey !== owner.requestId) {
            throw new Error("assistant-workspace-publication-owner-invariant");
        }
    }
    else {
        assertExactObjectKeys(owner, ["source", "ownerKey", "requestId", "runKey"], "assistant-workspace-publication-owner-invariant");
        if (!owner.runKey ||
            (owner.requestId !== null && !owner.requestId) ||
            owner.ownerKey !== (owner.requestId || owner.runKey)) {
            throw new Error("assistant-workspace-publication-owner-invariant");
        }
    }
    if (!publication.publicationKind ||
        !Object.prototype.hasOwnProperty.call(ASSISTANT_WORKSPACE_REGION_REGISTRY, publication.publicationKind)) {
        throw new Error("assistant-workspace-publication-kind");
    }
    if (!ASSISTANT_WORKSPACE_REGION_REGISTRY[publication.publicationKind]
        .sources.includes(owner.source)) {
        throw new Error("assistant-workspace-publication-kind-not-applicable");
    }
    if (!publication.publicationForm ||
        !["region", "snapshot", "delta"].includes(publication.publicationForm)) {
        throw new Error("assistant-workspace-publication-form");
    }
    if (publication.publicationKind !== "transcript" &&
        publication.publicationForm !== "region") {
        throw new Error("assistant-workspace-publication-form-kind");
    }
    if (!publication.publicationCause ||
        ![
            "initialization",
            "activation",
            "owner-switch",
            "page-request",
            "steady-state",
            "rebase",
            "diagnostic",
        ].includes(publication.publicationCause)) {
        throw new Error("assistant-workspace-publication-cause");
    }
    if (!Number.isInteger(publication.regionRevision) ||
        Number(publication.regionRevision) <= 0 ||
        !Number.isInteger(publication.deliverySequence) ||
        Number(publication.deliverySequence) <= 0) {
        throw new Error("assistant-workspace-publication-revision");
    }
    const validUnownedTranscript = publication.publicationKind === "transcript" &&
        publication.publicationForm === "snapshot" &&
        publication.payload &&
        "status" in publication.payload &&
        publication.payload.status === "idle";
    const validUnownedNavigation = publication.publicationKind === "owner-navigation" &&
        publication.publicationForm === "region";
    const validUnownedService = publication.publicationKind === "service-status" &&
        publication.publicationForm === "region";
    if (unowned &&
        !validUnownedTranscript &&
        !validUnownedNavigation &&
        !validUnownedService) {
        throw new Error("assistant-workspace-publication-unowned-scope");
    }
    assertPublicationPayloadInvariant(publication.publicationKind, publication.publicationForm, publication.payload);
}
function assertPublicationPayloadInvariant(kind, form, payload) {
    if (kind === "transcript") {
        if (form === "snapshot") {
            assertExactObjectKeys(payload, ASSISTANT_WORKSPACE_TRANSCRIPT_SNAPSHOT_KEYS, "assistant-workspace-transcript-region");
            assertTranscriptRegionInvariant(payload);
            return;
        }
        if (form === "delta") {
            assertExactObjectKeys(payload, ASSISTANT_WORKSPACE_TRANSCRIPT_DELTA_KEYS, "assistant-workspace-transcript-delta");
            if (!Array.isArray(payload.mutations)) {
                throw new Error("assistant-workspace-transcript-delta-mutations");
            }
            return;
        }
        throw new Error("assistant-workspace-transcript-form");
    }
    assertExactObjectKeys(payload, ASSISTANT_WORKSPACE_PUBLICATION_PAYLOAD_KEYS[kind], `assistant-workspace-${kind}-payload`, ASSISTANT_WORKSPACE_OPTIONAL_PUBLICATION_PAYLOAD_KEYS[kind]);
    if (kind === "owner-control") {
        const baseline = payload;
        assertExactObjectKeys(baseline.hint, ["kind", "message"], "assistant-workspace-owner-control-hint");
        if (baseline.interaction !== null &&
            !parseAssistantPendingInteraction(baseline.interaction)) {
            throw new Error("assistant-workspace-owner-control-interaction");
        }
        if (![
            "hidden",
            "auth",
            "running",
            "repairing",
            "waiting_user",
            "completed",
            "canceled",
            "disconnected",
            "error",
            "notice",
        ].includes(baseline.hint.kind)) {
            throw new Error("assistant-workspace-owner-control-hint-kind");
        }
        assertExactObjectKeys(baseline.connection, [
            "status",
            "sessionAvailable",
            "connected",
            "canConnect",
            "canDisconnect",
        ], "assistant-workspace-owner-control-connection");
        assertExactObjectKeys(baseline.execution, ["canCancel", "canInterrupt"], "assistant-workspace-owner-control-execution");
        assertExactObjectKeys(baseline.authentication, ["required", "canAuthenticate", "methodId"], "assistant-workspace-owner-control-authentication");
        assertExactObjectKeys(baseline.permissionPolicy, ["autoApprove", "canSetAutoApprove"], "assistant-workspace-owner-control-permission-policy");
        if (baseline.badges !== null) {
            assertExactObjectKeys(baseline.badges, ["control", "autoReply"], "assistant-workspace-owner-control-badges");
            if (baseline.badges.control !== null) {
                assertExactObjectKeys(baseline.badges.control, ["state", "tone", "title"], "assistant-workspace-owner-control-badge-control");
            }
            if (baseline.badges.autoReply !== null) {
                assertExactObjectKeys(baseline.badges.autoReply, ["active", "remainingSeconds", "progressPercent"], "assistant-workspace-owner-control-badge-auto-reply");
            }
        }
    }
    if (kind === "owner-navigation") {
        const navigation = payload;
        for (const group of navigation.groups) {
            assertExactObjectKeys(group, ["groupId", "label", "status", "disabledReason"], "assistant-workspace-owner-navigation-group");
        }
        for (const entry of navigation.entries) {
            assertExactObjectKeys(entry, [
                "owner",
                "groupId",
                "label",
                "subtitle",
                "description",
                "groupLabel",
                "status",
                "backendStatus",
                "applyState",
                "attention",
                "updatedAt",
                "messageCount",
                "canArchive",
                "submission",
                "resumptionPending",
            ], "assistant-workspace-owner-navigation-entry");
        }
    }
    if (kind === "service-status") {
        for (const item of payload.items) {
            assertExactObjectKeys(item, ["serviceId", "label", "status", "available", "message"], "assistant-workspace-service-status-item");
            if (!["acp-connection", "host-bridge"].includes(item.serviceId)) {
                throw new Error("assistant-workspace-service-status-id");
            }
        }
    }
    if (kind === "plan") {
        for (const item of payload.items) {
            assertExactObjectKeys(item, ["itemId", "content", "priority", "status"], "assistant-workspace-plan-item");
        }
    }
    if (kind === "permission") {
        const request = payload.request;
        if (request) {
            assertExactObjectKeys(request, ASSISTANT_WORKSPACE_PERMISSION_REQUEST_KEYS, "assistant-workspace-permission-request");
            if (!["acp-tool", "zotero-write", "pi-tool"].includes(request.approvalKind)) {
                throw new Error("assistant-workspace-permission-kind");
            }
            assertExactObjectKeys(request.tool, ["title", "callId"], "assistant-workspace-permission-tool");
            assertExactObjectKeys(request.review, ["requestedAt", "command", "preview"], "assistant-workspace-permission-review");
            for (const option of request.options) {
                assertExactObjectKeys(option, ["optionId", "label", "description"], "assistant-workspace-permission-option");
            }
        }
    }
    if (kind === "composer") {
        const composer = payload;
        assertExactObjectKeys(composer.reply, ["status"], "assistant-workspace-composer-reply");
        if (!["enabled", "disabled", "busy", "cancelling"].includes(composer.reply.status)) {
            throw new Error("assistant-workspace-composer-reply-status");
        }
        const admissionRevision = composer.sendAdmissionRevision;
        if (admissionRevision !== undefined &&
            admissionRevision !== null &&
            (typeof admissionRevision !== "number" ||
                !Number.isInteger(admissionRevision) ||
                admissionRevision < 0)) {
            throw new Error("assistant-workspace-composer-admission-revision");
        }
        const interactionBatch = composer.interactionBatch;
        if (interactionBatch !== undefined &&
            interactionBatch !== null &&
            !parseUserInteractionBatchV1(interactionBatch)) {
            throw new Error("assistant-workspace-composer-interaction-batch");
        }
        if (composer.runtimeOptions !== null) {
            assertExactObjectKeys(composer.runtimeOptions, ["mode", "model", "reasoningEffort"], "assistant-workspace-composer-options");
            for (const group of [
                composer.runtimeOptions.mode,
                composer.runtimeOptions.model,
                composer.runtimeOptions.reasoningEffort,
            ]) {
                assertExactObjectKeys(group, ["selectedOptionId", "options", "enabled"], "assistant-workspace-option-group");
                for (const option of group.options) {
                    assertExactObjectKeys(option, ["optionId", "label", "description"], "assistant-workspace-option");
                }
            }
        }
    }
    if (kind === "owner-presentation") {
        const presentation = payload;
        if (presentation.notice) {
            assertExactObjectKeys(presentation.notice, ["tone", "text"], "assistant-workspace-owner-presentation-notice");
            if (!["info", "warning", "danger"].includes(presentation.notice.tone) ||
                !String(presentation.notice.text || "").trim()) {
                throw new Error("assistant-workspace-owner-presentation-notice");
            }
        }
        if (presentation.usage) {
            assertExactObjectKeys(presentation.usage, ["used", "limit", "costText"], "assistant-workspace-owner-presentation-usage");
        }
        for (const item of presentation.metadata) {
            assertExactObjectKeys(item, ["fieldId", "value"], "assistant-workspace-owner-presentation-item");
            assertAssistantWorkspacePresentationField(item.fieldId);
        }
    }
    if (kind === "owner-details") {
        const details = payload;
        if (!["ready", "failed"].includes(details.status)) {
            throw new Error("assistant-workspace-owner-details-status");
        }
        if (details.error) {
            assertExactObjectKeys(details.error, ["code", "message"], "assistant-workspace-owner-details-error");
        }
        for (const section of details.sections) {
            assertExactObjectKeys(section, ["sectionId", "collapsed", "items"], "assistant-workspace-owner-details-section");
            if (!(section.sectionId in ASSISTANT_WORKSPACE_DETAILS_SECTION_REGISTRY)) {
                throw new Error("assistant-workspace-owner-details-section");
            }
            for (const item of section.items) {
                assertExactObjectKeys(item, ["fieldId", "value", "format"], "assistant-workspace-owner-details-item");
                if (!(item.fieldId in ASSISTANT_WORKSPACE_DETAILS_FIELD_REGISTRY)) {
                    throw new Error("assistant-workspace-owner-details-field");
                }
                if (!["text", "path", "code", "json"].includes(item.format)) {
                    throw new Error("assistant-workspace-owner-details-format");
                }
            }
        }
        for (const action of details.actions) {
            if (!ASSISTANT_WORKSPACE_DETAILS_ACTIONS.includes(action)) {
                throw new Error("assistant-workspace-owner-details-action");
            }
        }
    }
}
function assertAssistantWorkspacePresentationField(value) {
    if (!String(value || "").trim() ||
        !(String(value) in ASSISTANT_WORKSPACE_PRESENTATION_FIELD_REGISTRY)) {
        throw new Error("assistant-workspace-owner-presentation-field");
    }
}
function assertExactObjectKeys(value, expectedKeys, errorCode, optionalKeys = []) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(errorCode);
    }
    const actual = Object.keys(value).sort();
    const expected = [...expectedKeys].sort();
    const allowed = [...expectedKeys, ...optionalKeys];
    const allExpectedPresent = expected.every((key) => actual.includes(key));
    const allActualAllowed = actual.every((key) => allowed.includes(key));
    if (actual.length !== new Set(actual).size ||
        !allExpectedPresent ||
        !allActualAllowed) {
        throw new Error(errorCode);
    }
}
export function assertAssistantWorkspacePublicationAck(value) {
    assertWireValue(value, "ack");
    const ack = value;
    assertExactObjectKeys(ack, ["publicationId", "stage", "outcome", "reason", "failure"], "assistant-workspace-publication-ack-envelope");
    if (!String(ack.publicationId || "").trim()) {
        throw new Error("assistant-workspace-publication-ack-id");
    }
    if (!ack.stage ||
        ![
            "shell-receive",
            "shell-forward",
            "child-apply",
            "render-complete",
        ].includes(ack.stage)) {
        throw new Error("assistant-workspace-publication-ack-stage");
    }
    if (ack.outcome !== "accepted" && ack.outcome !== "rejected") {
        throw new Error("assistant-workspace-publication-ack-outcome");
    }
    if (ack.reason !== null &&
        ![
            "old-owner",
            "stale",
            "gap",
            "superseded",
            "invalid",
            "render-failed",
        ].includes(String(ack.reason))) {
        throw new Error("assistant-workspace-publication-ack-reason");
    }
    if (ack.failure !== null) {
        assertExactObjectKeys(ack.failure, ["stage", "code"], "assistant-workspace-publication-ack-failure");
        if (![
            "projection",
            "toolbar",
            "banner",
            "message-counts",
            "transcript",
            "plan",
            "permission",
            "composer",
            "context-drawer",
            "details-drawer",
        ].includes(String(ack.failure?.stage)) ||
            ![
                "module-missing",
                "bridge-missing",
                "projection-failed",
                "render-failed",
                "effect-invalid",
                "container-missing",
                "node-map-missing",
                "page-items-missing",
                "page-invalid",
                "virtual-reconcile-failed",
                "row-reconcile-failed",
                "dom-commit-failed",
            ].includes(String(ack.failure?.code))) {
            throw new Error("assistant-workspace-publication-ack-failure");
        }
    }
}
function assertWireValue(value, path) {
    if (value === undefined)
        throw new Error(`undefined-wire-value:${path}`);
    if (value === null || typeof value !== "object")
        return;
    if (Array.isArray(value)) {
        value.forEach((entry, index) => assertWireValue(entry, `${path}[${index}]`));
        return;
    }
    for (const [key, entry] of Object.entries(value)) {
        if (ASSISTANT_WORKSPACE_FORBIDDEN_WIRE_FIELDS.has(key)) {
            throw new Error(`forbidden-wire-field:${key}`);
        }
        assertWireValue(entry, `${path}.${key}`);
    }
}
function assertTranscriptRegionInvariant(payload) {
    if (!payload || !("status" in payload) || !("transcriptRevision" in payload))
        return;
    const region = payload;
    const valid = (region.status === "idle" &&
        region.owner === null &&
        region.page === null &&
        region.error === null) ||
        (region.status === "loading" &&
            region.owner !== null &&
            region.page === null &&
            region.error === null) ||
        (region.status === "ready" &&
            region.owner !== null &&
            region.page !== null &&
            region.error === null) ||
        (region.status === "failed" &&
            region.owner !== null &&
            region.page === null &&
            region.error !== null);
    if (!valid)
        throw new Error("assistant-workspace-transcript-region-invariant");
}
