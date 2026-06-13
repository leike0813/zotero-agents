import { getStringOrFallback } from "../utils/locale";
import { buildAssistantPanelLabels } from "./assistantPanelLabels";
import type {
  AcpConversationSnapshot,
  AcpFrontendSnapshot,
  AcpSidebarTarget,
} from "./acpTypes";

const localize = getStringOrFallback;

function resolveStatusLabel(status: string) {
  switch (String(status || "").trim()) {
    case "checking-command":
      return localize(
        "task-dashboard-acp-status-checking-command" as any,
        "Checking command",
      );
    case "spawning":
      return localize("task-dashboard-acp-status-spawning" as any, "Spawning");
    case "initializing":
      return localize(
        "task-dashboard-acp-status-initializing" as any,
        "Initializing",
      );
    case "connected":
      return localize(
        "task-dashboard-acp-status-connected" as any,
        "Connected",
      );
    case "prompting":
      return localize("task-dashboard-acp-status-prompting" as any, "Running");
    case "auth-required":
      return localize(
        "task-dashboard-acp-status-auth-required" as any,
        "Authentication required",
      );
    case "permission-required":
      return localize(
        "task-dashboard-acp-status-permission-required" as any,
        "Permission required",
      );
    case "error":
      return localize("task-dashboard-acp-status-error" as any, "Error");
    default:
      return localize("task-dashboard-acp-status-idle" as any, "Idle");
  }
}

function summarizeHostContext(
  snapshot: AcpConversationSnapshot,
  target: AcpSidebarTarget,
) {
  const context = snapshot.lastHostContext;
  if (!context) {
    return "";
  }
  const parts = [
    context.target === "reader"
      ? localize("task-dashboard-acp-target-reader" as any, "Reader")
      : localize("task-dashboard-acp-target-library" as any, "Library"),
  ];
  if (context.libraryId) {
    parts.push(
      `${localize("task-dashboard-acp-library-id" as any, "Library ID")}: ${context.libraryId}`,
    );
  }
  parts.push(
    context.selectionEmpty
      ? localize("task-dashboard-acp-selection-empty" as any, "No selection")
      : localize(
          "task-dashboard-acp-selection-present" as any,
          "Selection available",
        ),
  );
  if (context.currentItem?.title || context.currentItem?.key) {
    parts.push(
      `${localize("task-dashboard-acp-current-item" as any, "Current item")}: ${
        context.currentItem?.title || context.currentItem?.key
      }`,
    );
  }
  if (target !== context.target) {
    parts.push(
      `${localize("task-dashboard-acp-target-prefix" as any, "Opened from")}: ${target}`,
    );
  }
  return parts.join(" • ");
}

export function buildAcpSidebarViewSnapshot(args: {
  target: AcpSidebarTarget;
  snapshot: AcpConversationSnapshot;
  frontendSnapshot?: AcpFrontendSnapshot;
}) {
  const backendLabel =
    String(args.snapshot.backend?.displayName || "").trim() ||
    String(
      (args.frontendSnapshot?.backends || []).find(
        (entry) => entry.backendId === args.frontendSnapshot?.activeBackendId,
      )?.displayName || "",
    ).trim() ||
    String(args.snapshot.backendId || "").trim() ||
    "ACP";
  const lastError =
    String(args.snapshot.prerequisiteError || "").trim() ||
    String(args.snapshot.lastError || "").trim();
  return {
    hostMode: "sidebar" as const,
    target: args.target,
    title: localize("task-dashboard-home-acp-title" as any, "ACP Chat"),
    backendLabel,
    activeBackendId: String(
      args.frontendSnapshot?.activeBackendId || args.snapshot.backendId || "",
    ).trim(),
    backendOptions: (args.frontendSnapshot?.backends || []).map((entry) => ({
      ...entry,
    })),
    connectedCount: Number(args.frontendSnapshot?.connectedCount || 0),
    errorCount: Number(args.frontendSnapshot?.errorCount || 0),
    totalMessageCount: Number(
      args.frontendSnapshot?.totalMessageCount ||
        args.snapshot.items.length ||
        0,
    ),
    conversationId: String(args.snapshot.conversationId || "").trim(),
    conversationTitle: String(args.snapshot.conversationTitle || "").trim(),
    activeConversationId: String(
      args.frontendSnapshot?.activeConversationId ||
        args.snapshot.conversationId ||
        "",
    ).trim(),
    chatSessions: (args.frontendSnapshot?.chatSessions || []).map((entry) => ({
      ...entry,
    })),
    backendChatSessions: (args.frontendSnapshot?.backendChatSessions || []).map(
      (group) => ({
        backendId: group.backendId,
        displayName: group.displayName,
        sessions: group.sessions.map((entry) => ({ ...entry })),
      }),
    ),
    sessionId: String(args.snapshot.sessionId || "").trim(),
    remoteSessionId: String(args.snapshot.remoteSessionId || "").trim(),
    canLoadRemoteSession: args.snapshot.canLoadRemoteSession === true,
    canResumeRemoteSession: args.snapshot.canResumeRemoteSession === true,
    remoteSessionRestoreStatus: String(
      args.snapshot.remoteSessionRestoreStatus || "none",
    ).trim(),
    remoteSessionRestoreMessage: String(
      args.snapshot.remoteSessionRestoreMessage || "",
    ).trim(),
    updatedAt: String(args.snapshot.updatedAt || "").trim(),
    busy: args.snapshot.busy === true,
    status: args.snapshot.status,
    statusLabel: resolveStatusLabel(args.snapshot.status),
    statusExpanded: args.snapshot.statusExpanded === true,
    chatDisplayMode:
      args.snapshot.chatDisplayMode === "bubble" ? "bubble" : "plain",
    lastError,
    commandLabel: String(args.snapshot.commandLabel || "").trim(),
    commandLine: String(args.snapshot.commandLine || "").trim(),
    agentLabel: String(args.snapshot.agentLabel || "").trim(),
    agentVersion: String(args.snapshot.agentVersion || "").trim(),
    sessionTitle: String(args.snapshot.sessionTitle || "").trim(),
    sessionUpdatedAt: String(args.snapshot.sessionUpdatedAt || "").trim(),
    agentWorkspaceDir: String(
      args.snapshot.agentWorkspaceDir || args.snapshot.sessionCwd || "",
    ).trim(),
    conversationStorageDir: String(
      args.snapshot.conversationStorageDir || "",
    ).trim(),
    sessionCwd: String(args.snapshot.sessionCwd || "").trim(),
    workspaceDir: String(args.snapshot.workspaceDir || "").trim(),
    runtimeDir: String(args.snapshot.runtimeDir || "").trim(),
    stderrTail: String(args.snapshot.stderrTail || "").trim(),
    lastLifecycleEvent: String(args.snapshot.lastLifecycleEvent || "").trim(),
    mcpServer: args.snapshot.mcpServer
      ? JSON.parse(JSON.stringify(args.snapshot.mcpServer))
      : undefined,
    mcpHealth: args.snapshot.mcpHealth
      ? JSON.parse(JSON.stringify(args.snapshot.mcpHealth))
      : undefined,
    hostBridge: args.snapshot.hostBridge
      ? JSON.parse(JSON.stringify(args.snapshot.hostBridge))
      : undefined,
    showDiagnostics: args.snapshot.showDiagnostics === true,
    lastStopReason: String(args.snapshot.lastStopReason || "").trim(),
    usage: args.snapshot.usage ? { ...args.snapshot.usage } : null,
    authMethods: args.snapshot.authMethods.map((entry) => ({ ...entry })),
    modeOptions: args.snapshot.modeOptions.map((entry) => ({ ...entry })),
    currentMode: args.snapshot.currentMode
      ? { ...args.snapshot.currentMode }
      : null,
    modelOptions: args.snapshot.modelOptions.map((entry) => ({ ...entry })),
    currentModel: args.snapshot.currentModel
      ? { ...args.snapshot.currentModel }
      : null,
    displayModelOptions: args.snapshot.displayModelOptions.map((entry) => ({
      ...entry,
    })),
    currentDisplayModel: args.snapshot.currentDisplayModel
      ? { ...args.snapshot.currentDisplayModel }
      : null,
    reasoningEffortOptions: args.snapshot.reasoningEffortOptions.map(
      (entry) => ({
        ...entry,
      }),
    ),
    currentReasoningEffort: args.snapshot.currentReasoningEffort
      ? { ...args.snapshot.currentReasoningEffort }
      : null,
    availableCommands: args.snapshot.availableCommands.map((entry) => ({
      ...entry,
    })),
    pendingPermissionRequest: args.snapshot.pendingPermissionRequest
      ? {
          ...args.snapshot.pendingPermissionRequest,
          options: args.snapshot.pendingPermissionRequest.options.map(
            (entry) => ({
              ...entry,
            }),
          ),
        }
      : null,
    diagnostics: args.snapshot.diagnostics.map((entry) => ({ ...entry })),
    items: args.snapshot.items.map((entry) => ({
      ...entry,
      ...(entry.kind === "plan"
        ? { entries: entry.entries.map((planEntry) => ({ ...planEntry })) }
        : {}),
    })),
    hostContextSummary: summarizeHostContext(args.snapshot, args.target),
    labels: {
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
      targetReader: localize(
        "task-dashboard-acp-target-reader" as any,
        "Reader",
      ),
      subtitle: localize(
        "task-dashboard-acp-subtitle" as any,
        "Persistent ACP chat for your Zotero workspace.",
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
      disconnect: localize(
        "task-dashboard-acp-disconnect" as any,
        "Disconnect",
      ),
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
      statusPrefix: localize(
        "task-dashboard-acp-status-prefix" as any,
        "Status",
      ),
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
      workspace: localize(
        "task-dashboard-acp-session-cwd" as any,
        "Session cwd",
      ),
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
    },
  };
}
