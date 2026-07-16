import { getStringOrFallback } from "../utils/locale";
import { buildAssistantPanelLabels } from "./assistantPanelLabels";
import type { AssistantWorkspacePublicationSource } from "./assistantWorkspacePublication";

const localize = getStringOrFallback;

export function buildAssistantWorkspaceAcpSurfaceLabels(
  source: AssistantWorkspacePublicationSource,
) {
  if (source === "acp-skills") {
    return {
      assistantPanel: buildAssistantPanelLabels(),
      title: localize(
        "task-dashboard-home-acp-skill-runs-title" as any,
        "ACP Skill Runs",
      ),
      runningTasksTitle: localize(
        "task-dashboard-run-running-tasks-title" as any,
        "Running",
      ),
      completedTasksTitle: localize(
        "task-dashboard-run-completed-tasks-title" as any,
        "Completed Tasks",
      ),
      panelRendererUnavailable: localize(
        "task-dashboard-acp-skill-run-panel-renderer-unavailable" as any,
        "ACP Skills panel renderer unavailable.",
      ),
      panelRendererFailed: localize(
        "task-dashboard-acp-skill-run-panel-renderer-failed" as any,
        "ACP Skills panel renderer failed",
      ),
      transcriptRendererUnavailable: localize(
        "task-dashboard-acp-transcript-renderer-unavailable" as any,
        "Transcript renderer unavailable.",
      ),
    };
  }
  return {
    assistantPanel: buildAssistantPanelLabels(),
    title: localize("task-dashboard-home-acp-title" as any, "ACP Chat"),
    transcriptRendererUnavailable: localize(
      "task-dashboard-acp-transcript-renderer-unavailable" as any,
      "Transcript renderer unavailable.",
    ),
    targetLibrary: localize(
      "task-dashboard-acp-target-library" as any,
      "Library",
    ),
    targetReader: localize("task-dashboard-acp-target-reader" as any, "Reader"),
    subtitle: localize(
      "task-dashboard-acp-subtitle" as any,
      "Chat with your Zotero library.",
    ),
    backend: localize("task-dashboard-acp-backend" as any, "Backend"),
    conversation: localize(
      "task-dashboard-acp-conversation" as any,
      "Conversation",
    ),
    sessionManager: localize(
      "task-dashboard-acp-session-manager" as any,
      "Sessions",
    ),
    manageBackends: localize(
      "task-dashboard-acp-manage-backends" as any,
      "Manage Backends",
    ),
    details: localize("task-dashboard-acp-details" as any, "Details"),
    newConversation: localize(
      "task-dashboard-acp-new-conversation" as any,
      "New Conversation",
    ),
    renameConversation: localize(
      "task-dashboard-acp-rename-conversation" as any,
      "Rename Conversation",
    ),
    archiveConversation: localize(
      "task-dashboard-acp-archive-conversation" as any,
      "Archive",
    ),
    archiveConversationConfirm: localize(
      "task-dashboard-acp-archive-conversation-confirm" as any,
      "Archive this conversation? It will be hidden from the list.",
    ),
    sessionBusy: localize(
      "task-dashboard-acp-session-busy" as any,
      "Session changes are disabled while a prompt or permission request is active.",
    ),
    sessionEmpty: localize(
      "task-dashboard-acp-session-empty" as any,
      "No conversations yet.",
    ),
    sessionShowMore: localize(
      "task-dashboard-acp-session-show-more" as any,
      "Show more...",
    ),
    connect: localize("task-dashboard-acp-connect" as any, "Connect"),
    disconnect: localize("task-dashboard-acp-disconnect" as any, "Disconnect"),
    reconnect: localize("task-dashboard-acp-reconnect" as any, "Reconnect"),
    cancel: localize("task-dashboard-acp-cancel" as any, "Cancel"),
    close: localize("task-dashboard-acp-close" as any, "Close"),
    authenticate: localize(
      "task-dashboard-acp-authenticate" as any,
      "Authenticate",
    ),
    allow: localize("task-dashboard-acp-allow" as any, "Allow"),
    deny: localize("task-dashboard-acp-deny" as any, "Deny"),
    diagnosticsShow: localize(
      "task-dashboard-acp-diagnostics-show" as any,
      "Show Diagnostics",
    ),
    diagnosticsHide: localize(
      "task-dashboard-acp-diagnostics-hide" as any,
      "Hide Diagnostics",
    ),
    diagnosticsCopy: localize(
      "task-dashboard-acp-diagnostics-copy" as any,
      "Copy Diagnostics",
    ),
    diagnosticsCopyRequested: localize(
      "task-dashboard-acp-diagnostics-copy-requested" as any,
      "Diagnostics copied.",
    ),
    detailsShow: localize(
      "task-dashboard-acp-details-show" as any,
      "Show Details",
    ),
    detailsHide: localize(
      "task-dashboard-acp-details-hide" as any,
      "Hide Details",
    ),
    view: localize("task-dashboard-acp-view" as any, "View"),
    plain: localize("task-dashboard-acp-view-plain" as any, "Plain"),
    bubble: localize("task-dashboard-acp-view-bubble" as any, "Bubble"),
    composerPlaceholder: localize(
      "task-dashboard-acp-composer-placeholder" as any,
      "Ask the active ACP backend about the current library or item...",
    ),
    send: localize("task-dashboard-acp-send" as any, "Send"),
    empty: localize(
      "task-dashboard-acp-empty" as any,
      "No messages yet. Start a new conversation.",
    ),
    errorPrefix: localize("task-dashboard-acp-error-prefix" as any, "Error"),
    authPrefix: localize(
      "task-dashboard-acp-auth-prefix" as any,
      "Authentication methods",
    ),
    statusPrefix: localize("task-dashboard-acp-status-prefix" as any, "Status"),
    mode: localize("task-dashboard-acp-mode" as any, "Mode"),
    model: localize("task-dashboard-acp-model" as any, "Model"),
    reasoning: localize("task-dashboard-acp-reasoning" as any, "Reasoning"),
    session: localize("task-dashboard-acp-session" as any, "Session"),
    remoteSession: localize(
      "task-dashboard-acp-remote-session" as any,
      "Remote session",
    ),
    remoteRestore: localize(
      "task-dashboard-acp-remote-restore" as any,
      "Remote restore",
    ),
    workspace: localize("task-dashboard-acp-session-cwd" as any, "Session cwd"),
    runtime: localize("task-dashboard-acp-runtime" as any, "Runtime"),
    hostContext: localize(
      "task-dashboard-acp-host-context" as any,
      "Host context",
    ),
    commandLine: localize(
      "task-dashboard-acp-command-line" as any,
      "Command line",
    ),
    stderrTail: localize("task-dashboard-acp-stderr-tail" as any, "stderr"),
    lastLifecycleEvent: localize(
      "task-dashboard-acp-last-lifecycle-event" as any,
      "Last lifecycle event",
    ),
    diagnostics: localize(
      "task-dashboard-acp-diagnostics-title" as any,
      "Diagnostics",
    ),
    diagnosticsEmpty: localize(
      "task-dashboard-acp-diagnostics-empty" as any,
      "No diagnostics yet.",
    ),
    stopReason: localize(
      "task-dashboard-acp-stop-reason" as any,
      "Stop reason",
    ),
    usage: localize("task-dashboard-acp-usage" as any, "Usage"),
    permission: localize(
      "task-dashboard-acp-permission-title" as any,
      "Permission request",
    ),
  };
}
