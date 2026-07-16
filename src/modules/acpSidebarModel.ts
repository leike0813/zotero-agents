import { getStringOrFallback } from "../utils/locale";
import { buildAssistantWorkspaceAcpSurfaceLabels } from "./assistantWorkspaceAcpSurfaceLabels";
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
        args.snapshot.transcriptItemCount ||
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
    autoApproveAcpPermissions: args.snapshot.autoApproveAcpPermissions === true,
    chatDisplayMode:
      args.snapshot.chatDisplayMode === "bubble" ? "bubble" : "plain",
    transcriptRevision: Number(args.snapshot.transcriptRevision || 0),
    transcriptItemCount: Number(args.snapshot.transcriptItemCount || 0),
    transcriptPreview: String(args.snapshot.transcriptPreview || "").trim(),
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
    labels: buildAssistantWorkspaceAcpSurfaceLabels("acp-chat"),
  };
}
