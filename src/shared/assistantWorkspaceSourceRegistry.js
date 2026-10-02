/**
 * Assistant Workspace lane/source registry — the browser-safe single source
 * of truth for Workspace navigation: two lanes (Conversations, Skill Runs)
 * and five sources, each with its lane, owner kind, user-facing label,
 * supported canonical actions, owner-count/attention semantics and
 * new-item support.
 *
 * Data and types only. It carries no adapters, callbacks, Zotero objects or
 * runtime state. Host modules bind concrete surface adapters by sourceId; the
 * sidebar shell consumes this same registry directly (it never imports from
 * src/modules/**). Lane/source selection stays window-local.
 */
export const ASSISTANT_WORKSPACE_SOURCE_REGISTRY = {
    "pi-conversations": {
        id: "pi-conversations",
        lane: "conversations",
        ownerKind: "pi-conversation",
        labelKey: "assistant-workspace-source-zotero-agent",
        label: "Zotero Agent",
        actions: [
            "open-context-drawer",
            "close-context-drawer",
            "open-details-drawer",
            "close-details-drawer",
            "request-owner-details",
            "open-permission-request",
            "close-permission-request",
            "toggle-drawer-section",
            "toggle-drawer-group",
            "open-backend-manager",
            "close-sidebar",
            "set-execution-display-mode",
            "load-transcript-page",
            "resolve-permission",
            "copy-diagnostics",
            "open-workspace",
            "set-active-conversation",
            "archive-conversation",
            "restore-conversation",
            "delete-conversation",
            "rename-conversation",
            "compact-conversation",
            "new-conversation",
            "send-prompt",
            "cancel",
            "add-resource",
            "remove-resource",
            "set-model",
            "set-reasoning-effort",
            "export-diagnostics",
            "check-owner-recovery",
        ],
        canCreateOwner: true,
        navigable: true,
    },
    "acp-chat": {
        id: "acp-chat",
        lane: "conversations",
        ownerKind: "acp-chat",
        labelKey: "assistant-workspace-source-external-agent",
        label: "External Agent",
        actions: [
            "open-context-drawer",
            "close-context-drawer",
            "open-details-drawer",
            "close-details-drawer",
            "request-owner-details",
            "open-permission-request",
            "close-permission-request",
            "toggle-drawer-section",
            "toggle-drawer-group",
            "set-chat-display-mode",
            "set-active-conversation",
            "archive-conversation",
            "set-active-backend",
            "new-conversation",
            "open-backend-manager",
            "close-sidebar",
            "set-execution-display-mode",
            "load-transcript-page",
            "resolve-permission",
            "connect",
            "disconnect",
            "cancel",
            "authenticate",
            "set-auto-approve-permissions",
            "send-prompt",
            "set-mode",
            "set-model",
            "set-reasoning-effort",
            "copy-diagnostics",
            "open-workspace",
        ],
        canCreateOwner: true,
        navigable: true,
    },
    "pi-skill-runs": {
        id: "pi-skill-runs",
        lane: "skill-runs",
        ownerKind: "pi-skill-run",
        labelKey: "assistant-workspace-source-zotero-agent",
        label: "Zotero Agent",
        actions: [
            "open-context-drawer",
            "close-context-drawer",
            "open-details-drawer",
            "close-details-drawer",
            "request-owner-details",
            "open-permission-request",
            "close-permission-request",
            "toggle-drawer-section",
            "toggle-drawer-group",
            "open-backend-manager",
            "close-sidebar",
            "set-execution-display-mode",
            "load-transcript-page",
            "resolve-permission",
            "copy-diagnostics",
            "open-workspace",
            "select-run",
            "archive-run",
            "cancel-queued-workflow-unit",
            "connect-run",
            "disconnect-run",
            "interrupt-run-turn",
            "cancel-run",
            "reply-run",
            "select-interaction-option",
            "submit-interaction-files",
            "draft",
            "submit",
            "decline",
            "copy-request-id",
            "set-model",
            "set-reasoning-effort",
            "export-diagnostics",
            "check-owner-recovery",
            "continue-owner-recovery",
        ],
        canCreateOwner: false,
        navigable: true,
    },
    "acp-skills": {
        id: "acp-skills",
        lane: "skill-runs",
        ownerKind: "acp-skills",
        labelKey: "assistant-workspace-source-external-agent",
        label: "External Agent",
        actions: [
            "open-context-drawer",
            "close-context-drawer",
            "open-details-drawer",
            "close-details-drawer",
            "request-owner-details",
            "open-permission-request",
            "close-permission-request",
            "toggle-drawer-section",
            "toggle-drawer-group",
            "open-backend-manager",
            "close-sidebar",
            "set-execution-display-mode",
            "load-transcript-page",
            "resolve-permission",
            "copy-diagnostics",
            "open-workspace",
            "select-run",
            "archive-run",
            "cancel-queued-workflow-unit",
            "connect-run",
            "disconnect-run",
            "interrupt-run-turn",
            "cancel-run",
            "reply-run",
            "select-interaction-option",
            "submit-interaction-files",
            "copy-request-id",
            "set-mode",
            "set-model",
            "set-reasoning-effort",
        ],
        canCreateOwner: false,
        navigable: true,
    },
    skillrunner: {
        id: "skillrunner",
        lane: "skill-runs",
        ownerKind: "skillrunner",
        labelKey: "assistant-workspace-source-skillrunner",
        label: "SkillRunner",
        actions: [
            "open-context-drawer",
            "close-context-drawer",
            "open-details-drawer",
            "close-details-drawer",
            "request-owner-details",
            "open-permission-request",
            "close-permission-request",
            "toggle-drawer-section",
            "toggle-drawer-group",
            "set-chat-display-mode",
            "set-execution-display-mode",
            "load-transcript-page",
            "archive-run",
            "cancel-run",
            "cancel-queued-workflow-unit",
            "reply-run",
            "select-interaction-option",
            "submit-interaction-files",
            "resolve-permission",
            "copy-request-id",
            "copy-diagnostics",
            "open-backend-manager",
            "open-workspace",
            "select-task",
            "auth-import-run",
            "open-auth-url",
        ],
        canCreateOwner: false,
        navigable: true,
    },
};
export const ASSISTANT_WORKSPACE_LANE_REGISTRY = {
    conversations: {
        id: "conversations",
        labelKey: "assistant-workspace-lane-conversations",
        label: "Conversations",
        defaultSourceId: "pi-conversations",
        sourceIds: ["pi-conversations", "acp-chat"],
    },
    "skill-runs": {
        id: "skill-runs",
        labelKey: "assistant-workspace-lane-skill-runs",
        label: "Skill Runs",
        defaultSourceId: "skillrunner",
        sourceIds: ["pi-skill-runs", "acp-skills", "skillrunner"],
    },
};
export const ASSISTANT_WORKSPACE_LANE_ORDER = ["conversations", "skill-runs"];
export const DEFAULT_ASSISTANT_WORKSPACE_LANE_ID = "conversations";
export const DEFAULT_ASSISTANT_WORKSPACE_SOURCE_ID = "pi-conversations";
export function isAssistantWorkspaceLaneId(value) {
    return (typeof value === "string" &&
        Object.prototype.hasOwnProperty.call(ASSISTANT_WORKSPACE_LANE_REGISTRY, value));
}
export function isAssistantWorkspaceSourceId(value) {
    return (typeof value === "string" &&
        Object.prototype.hasOwnProperty.call(ASSISTANT_WORKSPACE_SOURCE_REGISTRY, value));
}
/** Descriptor for a known source id; throws on an unknown id. */
export function assistantWorkspaceSourceDescriptor(sourceId) {
    const descriptor = ASSISTANT_WORKSPACE_SOURCE_REGISTRY[sourceId];
    if (!descriptor) {
        throw new Error(`unknown-assistant-workspace-source:${String(sourceId)}`);
    }
    return descriptor;
}
/** Lane a source belongs to; throws on an unknown id. */
export function assistantWorkspaceLaneForSource(sourceId) {
    return assistantWorkspaceSourceDescriptor(sourceId).lane;
}
/** Sources of a lane in registry order. */
export function listAssistantWorkspaceLaneSources(laneId) {
    const lane = ASSISTANT_WORKSPACE_LANE_REGISTRY[laneId];
    if (!lane) {
        throw new Error(`unknown-assistant-workspace-lane:${String(laneId)}`);
    }
    return lane.sourceIds;
}
/** Sources of a lane the shell may navigate to. */
export function listNavigableAssistantWorkspaceLaneSources(laneId) {
    return listAssistantWorkspaceLaneSources(laneId).filter((sourceId) => ASSISTANT_WORKSPACE_SOURCE_REGISTRY[sourceId].navigable);
}
