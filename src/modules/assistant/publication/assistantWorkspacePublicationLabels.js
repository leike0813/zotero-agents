import { getStringOrFallback } from "../../../utils/locale";
import { buildAssistantPanelLabels } from "../workspace/assistantPanelLabels";
import { ASSISTANT_WORKSPACE_LANE_ORDER, ASSISTANT_WORKSPACE_LANE_REGISTRY, ASSISTANT_WORKSPACE_SOURCE_REGISTRY, } from "../../../shared/assistantWorkspaceSourceRegistry";
const localize = getStringOrFallback;
export function buildAssistantWorkspacePublicationLabels(source) {
    if (source === "skillrunner") {
        return {
            assistantPanel: buildAssistantPanelLabels(),
            title: localize("task-dashboard-home-skillrunner-title", "SkillRunner"),
            runningTasksTitle: localize("task-dashboard-run-running-tasks-title", "Running"),
            completedTasksTitle: localize("task-dashboard-run-completed-tasks-title", "Completed Tasks"),
            emptySelection: localize("task-dashboard-run-workspace-empty", "No SkillRunner tasks."),
            view: localize("task-dashboard-acp-view", "View"),
            plain: localize("task-dashboard-acp-view-plain", "Plain"),
            bubble: localize("task-dashboard-acp-view-bubble", "Bubble"),
            panelRendererUnavailable: localize("task-dashboard-acp-skill-run-panel-renderer-unavailable", "SkillRunner panel renderer unavailable."),
            panelRendererFailed: localize("task-dashboard-acp-skill-run-panel-renderer-failed", "SkillRunner panel renderer failed"),
            transcriptRendererUnavailable: localize("task-dashboard-acp-transcript-renderer-unavailable", "Transcript renderer unavailable."),
        };
    }
    if (source === "acp-skills") {
        return {
            assistantPanel: buildAssistantPanelLabels(),
            title: localize("task-dashboard-home-acp-skill-runs-title", "ACP Skill Runs"),
            runningTasksTitle: localize("task-dashboard-run-running-tasks-title", "Running"),
            completedTasksTitle: localize("task-dashboard-run-completed-tasks-title", "Completed Tasks"),
            emptySelection: localize("task-dashboard-acp-select-skill-run", "Select an ACP skill run to inspect its transcript."),
            view: localize("task-dashboard-acp-view", "View"),
            plain: localize("task-dashboard-acp-view-plain", "Plain"),
            bubble: localize("task-dashboard-acp-view-bubble", "Bubble"),
            panelRendererUnavailable: localize("task-dashboard-acp-skill-run-panel-renderer-unavailable", "ACP Skills panel renderer unavailable."),
            panelRendererFailed: localize("task-dashboard-acp-skill-run-panel-renderer-failed", "ACP Skills panel renderer failed"),
            transcriptRendererUnavailable: localize("task-dashboard-acp-transcript-renderer-unavailable", "Transcript renderer unavailable."),
        };
    }
    if (source === "pi-conversations") {
        return {
            ...buildAssistantWorkspacePublicationLabels("acp-chat"),
            title: localize("task-dashboard-pi-conversations-title", "Zotero Agent"),
            composerPlaceholder: localize("task-dashboard-pi-conversations-composer-placeholder", "Ask the built-in agent about the current library or item..."),
            emptySelection: localize("task-dashboard-pi-select-conversation", "Select a conversation to inspect its transcript."),
        };
    }
    if (source === "pi-skill-runs") {
        return {
            ...buildAssistantWorkspacePublicationLabels("acp-skills"),
            title: localize("task-dashboard-pi-skill-runs-title", "Zotero Agent"),
        };
    }
    return {
        assistantPanel: buildAssistantPanelLabels(),
        title: localize("task-dashboard-home-acp-title", "ACP Chat"),
        transcriptRendererUnavailable: localize("task-dashboard-acp-transcript-renderer-unavailable", "Transcript renderer unavailable."),
        targetLibrary: localize("task-dashboard-acp-target-library", "Library"),
        targetReader: localize("task-dashboard-acp-target-reader", "Reader"),
        subtitle: localize("task-dashboard-acp-subtitle", "Chat with your Zotero library."),
        backend: localize("task-dashboard-acp-backend", "Backend"),
        conversation: localize("task-dashboard-acp-conversation", "Conversation"),
        sessionManager: localize("task-dashboard-acp-session-manager", "Sessions"),
        manageBackends: localize("task-dashboard-acp-manage-backends", "Manage Backends"),
        details: localize("task-dashboard-acp-details", "Details"),
        newConversation: localize("task-dashboard-acp-new-conversation", "New Conversation"),
        renameConversation: localize("task-dashboard-acp-rename-conversation", "Rename Conversation"),
        archiveConversation: localize("task-dashboard-acp-archive-conversation", "Archive"),
        archiveConversationConfirm: localize("task-dashboard-acp-archive-conversation-confirm", "Archive this conversation? It will be hidden from the list."),
        sessionBusy: localize("task-dashboard-acp-session-busy", "Session changes are disabled while a prompt or permission request is active."),
        sessionEmpty: localize("task-dashboard-acp-session-empty", "No conversations yet."),
        sessionShowMore: localize("task-dashboard-acp-session-show-more", "Show more..."),
        connect: localize("task-dashboard-acp-connect", "Connect"),
        disconnect: localize("task-dashboard-acp-disconnect", "Disconnect"),
        reconnect: localize("task-dashboard-acp-reconnect", "Reconnect"),
        cancel: localize("task-dashboard-acp-cancel", "Cancel"),
        close: localize("task-dashboard-acp-close", "Close"),
        authenticate: localize("task-dashboard-acp-authenticate", "Authenticate"),
        allow: localize("task-dashboard-acp-allow", "Allow"),
        deny: localize("task-dashboard-acp-deny", "Deny"),
        diagnosticsShow: localize("task-dashboard-acp-diagnostics-show", "Show Diagnostics"),
        diagnosticsHide: localize("task-dashboard-acp-diagnostics-hide", "Hide Diagnostics"),
        diagnosticsCopy: localize("task-dashboard-acp-diagnostics-copy", "Copy Diagnostics"),
        diagnosticsCopyRequested: localize("task-dashboard-acp-diagnostics-copy-requested", "Diagnostics copied."),
        detailsShow: localize("task-dashboard-acp-details-show", "Show Details"),
        detailsHide: localize("task-dashboard-acp-details-hide", "Hide Details"),
        view: localize("task-dashboard-acp-view", "View"),
        plain: localize("task-dashboard-acp-view-plain", "Plain"),
        bubble: localize("task-dashboard-acp-view-bubble", "Bubble"),
        composerPlaceholder: localize("task-dashboard-acp-composer-placeholder", "Ask the active ACP backend about the current library or item..."),
        send: localize("task-dashboard-acp-send", "Send"),
        empty: localize("task-dashboard-acp-empty", "No messages yet. Start a new conversation."),
        emptySelection: localize("task-dashboard-acp-select-conversation", "Select a conversation to inspect its transcript."),
        errorPrefix: localize("task-dashboard-acp-error-prefix", "Error"),
        authPrefix: localize("task-dashboard-acp-auth-prefix", "Authentication methods"),
        statusPrefix: localize("task-dashboard-acp-status-prefix", "Status"),
        mode: localize("task-dashboard-acp-mode", "Mode"),
        model: localize("task-dashboard-acp-model", "Model"),
        reasoning: localize("task-dashboard-acp-reasoning", "Reasoning"),
        session: localize("task-dashboard-acp-session", "Session"),
        remoteSession: localize("task-dashboard-acp-remote-session", "Remote session"),
        remoteRestore: localize("task-dashboard-acp-remote-restore", "Remote restore"),
        workspace: localize("task-dashboard-acp-session-cwd", "Session cwd"),
        runtime: localize("task-dashboard-acp-runtime", "Runtime"),
        hostContext: localize("task-dashboard-acp-host-context", "Host context"),
        commandLine: localize("task-dashboard-acp-command-line", "Command line"),
        stderrTail: localize("task-dashboard-acp-stderr-tail", "stderr"),
        lastLifecycleEvent: localize("task-dashboard-acp-last-lifecycle-event", "Last lifecycle event"),
        diagnostics: localize("task-dashboard-acp-diagnostics-title", "Diagnostics"),
        diagnosticsEmpty: localize("task-dashboard-acp-diagnostics-empty", "No diagnostics yet."),
        stopReason: localize("task-dashboard-acp-stop-reason", "Stop reason"),
        usage: localize("task-dashboard-acp-usage", "Usage"),
        permission: localize("task-dashboard-acp-permission-title", "Permission request"),
    };
}
/**
 * Localized lane/source navigation labels for the Workspace shell. Keys come
 * from the shared source registry (SSOT); the locale supplies the value and
 * the registry label is the English fallback.
 */
export function buildAssistantWorkspaceNavigationLabels() {
    const lanes = {};
    for (const laneId of ASSISTANT_WORKSPACE_LANE_ORDER) {
        const lane = ASSISTANT_WORKSPACE_LANE_REGISTRY[laneId];
        lanes[laneId] = localize(lane.labelKey, lane.label);
    }
    const sources = {};
    for (const descriptor of Object.values(ASSISTANT_WORKSPACE_SOURCE_REGISTRY)) {
        sources[descriptor.id] = localize(descriptor.labelKey, descriptor.label);
    }
    return {
        lanes,
        sources,
        attention: localize("synthesis-action-needs-attention", "Needs attention"),
    };
}
