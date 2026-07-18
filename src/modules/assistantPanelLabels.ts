import { getStringOrFallback } from "../utils/locale";

const localize = getStringOrFallback;

export type AssistantPanelLabels = ReturnType<typeof buildAssistantPanelLabels>;

export function buildAssistantPanelLabels() {
  const l = (key: string, fallback: string) => localize(key as any, fallback);
  return {
    actions: {
      send: l("assistant-panel-action-send", "Send"),
      cancel: l("assistant-panel-action-cancel", "Cancel"),
      cancelling: l("assistant-panel-action-cancelling", "Cancelling..."),
      cancelRun: l("assistant-panel-action-cancel-run", "Cancel Task"),
      archive: l("assistant-panel-action-archive", "Archive"),
      close: l("assistant-panel-action-close", "Close"),
      details: l("assistant-panel-action-details", "Details"),
      runs: l("assistant-panel-action-runs", "Runs"),
      sessions: l("assistant-panel-action-sessions", "Sessions"),
      manageBackends: l(
        "assistant-panel-action-manage-backends",
        "Manage Backends",
      ),
      executionDisplayMode: l(
        "assistant-panel-action-execution-display-mode",
        "Display mode",
      ),
      executionDisplayLive: l(
        "assistant-panel-action-execution-display-live",
        "Live",
      ),
      executionDisplayBoundary: l(
        "assistant-panel-action-execution-display-boundary",
        "By message",
      ),
      executionDisplaySilent: l(
        "assistant-panel-action-execution-display-silent",
        "Silent",
      ),
      autoApproveAcpPermissions: l(
        "assistant-panel-action-auto-approve-acp-permissions",
        "Auto-approve",
      ),
      autoApproveAcpPermissionsOn: l(
        "assistant-panel-action-auto-approve-acp-permissions-on",
        "Auto-approve on",
      ),
      autoApproveAcpPermissionsOff: l(
        "assistant-panel-action-auto-approve-acp-permissions-off",
        "Auto-approve off",
      ),
      showMore: l("assistant-panel-action-show-more", "Show more..."),
      copyId: l("assistant-panel-action-copy-id", "Copy ID"),
      copyDiagnostics: l(
        "assistant-panel-action-copy-diagnostics",
        "Copy Diagnostics",
      ),
      openWorkspace: l(
        "assistant-panel-action-open-workspace",
        "Open Workspace",
      ),
      connect: l("assistant-panel-action-connect", "Connect"),
      disconnect: l("assistant-panel-action-disconnect", "Disconnect"),
      connecting: l("assistant-panel-action-connecting", "Connecting..."),
      disconnecting: l(
        "assistant-panel-action-disconnecting",
        "Disconnecting...",
      ),
      authenticate: l("assistant-panel-action-authenticate", "Authenticate"),
      approve: l("assistant-panel-action-approve", "Approve"),
      useMethod: l("assistant-panel-action-use-method", "Use method"),
    },
    fields: {
      target: l("assistant-panel-field-target", "Target"),
      agent: l("assistant-panel-field-agent", "Agent"),
      session: l("assistant-panel-field-session", "Session"),
      remoteSession: l(
        "assistant-panel-field-remote-session",
        "Remote session",
      ),
      remoteRestore: l(
        "assistant-panel-field-remote-restore",
        "Remote restore",
      ),
      stopReason: l("assistant-panel-field-stop-reason", "Stop reason"),
      workspace: l("assistant-panel-field-workspace", "Workspace"),
      hostContext: l("assistant-panel-field-host-context", "Host context"),
      backend: l("assistant-panel-field-backend", "Backend"),
      workflow: l("assistant-panel-field-workflow", "Workflow"),
      skill: l("assistant-panel-field-skill", "Skill"),
      connection: l("assistant-panel-field-connection", "Connection"),
      hostBridge: l("assistant-panel-field-host-bridge", "Host Bridge"),
      mcp: l("assistant-panel-field-mcp", "MCP"),
      autoReply: l("assistant-panel-field-auto-reply", "Auto reply"),
      mode: l("assistant-panel-field-mode", "Mode"),
      model: l("assistant-panel-field-model", "Model"),
      reasoning: l("assistant-panel-field-reasoning", "Reasoning"),
      runtime: l("assistant-panel-field-runtime", "Runtime"),
      agentVersion: l("assistant-panel-field-agent-version", "Agent version"),
      status: l("assistant-panel-field-status", "Status"),
      updated: l("assistant-panel-field-updated", "Updated"),
      engine: l("assistant-panel-field-engine", "Engine"),
      requestId: l("assistant-panel-field-request-id", "Request ID"),
      taskKey: l("assistant-panel-field-task-key", "Task key"),
      runtimeState: l("assistant-panel-field-runtime-state", "Runtime state"),
      auditArtifact: l(
        "assistant-panel-field-audit-artifact",
        "Audit artifact",
      ),
      resultArtifact: l(
        "assistant-panel-field-result-artifact",
        "Result artifact",
      ),
      validation: l("assistant-panel-field-validation", "Validation"),
      runtimeDependencies: l(
        "assistant-panel-field-runtime-dependencies",
        "Runtime Dependencies",
      ),
      repairRounds: l("assistant-panel-field-repair-rounds", "Repair rounds"),
      errors: l("assistant-panel-field-errors", "Errors"),
      conversation: l("assistant-panel-field-conversation", "Conversation"),
      applyResult: l("assistant-panel-field-apply-result", "Apply result"),
      control: l("assistant-panel-field-control", "Interaction"),
      deferredApply: l(
        "assistant-panel-field-deferred-apply",
        "Deferred apply",
      ),
      applyAttempt: l("assistant-panel-field-apply-attempt", "Attempt"),
      applyMaxAttempt: l(
        "assistant-panel-field-apply-max-attempt",
        "Max attempt",
      ),
      applyNextRetry: l("assistant-panel-field-apply-next-retry", "Next retry"),
      appliedAt: l("assistant-panel-field-applied-at", "Applied at"),
      loading: l("assistant-panel-field-loading", "Loading"),
      terminal: l("assistant-panel-field-terminal", "Terminal"),
      waiting: l("assistant-panel-field-waiting", "Waiting"),
      latest: l("assistant-panel-field-latest", "Latest"),
      count: l("assistant-panel-field-count", "Count"),
      messages: l("assistant-panel-field-messages", "Messages"),
      latestTimestamp: l(
        "assistant-panel-field-latest-timestamp",
        "Latest timestamp",
      ),
      latestKind: l("assistant-panel-field-latest-kind", "Latest kind"),
      commandLine: l("assistant-panel-field-command-line", "Command line"),
      command: l("assistant-panel-field-command", "Command"),
      stderr: l("assistant-panel-field-stderr", "stderr"),
      error: l("assistant-panel-field-error", "Error"),
      lastError: l("assistant-panel-field-last-error", "Last error"),
      prerequisiteError: l(
        "assistant-panel-field-prerequisite-error",
        "Prerequisite error",
      ),
      inputManifest: l(
        "assistant-panel-field-input-manifest",
        "Input manifest",
      ),
      agentFamily: l("assistant-panel-field-agent-family", "Agent family"),
      rawModel: l("assistant-panel-field-raw-model", "Raw model"),
      skillRoots: l("assistant-panel-field-skill-roots", "Skill roots"),
      validationStatus: l(
        "assistant-panel-field-validation-status",
        "Validation status",
      ),
      validationErrors: l(
        "assistant-panel-field-validation-errors",
        "Validation errors",
      ),
      runError: l("assistant-panel-field-run-error", "Run error"),
      conversationError: l(
        "assistant-panel-field-conversation-error",
        "Conversation error",
      ),
      conversationState: l(
        "assistant-panel-field-conversation-state",
        "Conversation state",
      ),
      dependencyStatus: l(
        "assistant-panel-field-dependency-status",
        "Dependency status",
      ),
      dependencies: l("assistant-panel-field-dependencies", "Dependencies"),
      dependencyError: l(
        "assistant-panel-field-dependency-error",
        "Dependency error",
      ),
      revisionCount: l("assistant-panel-field-revision-count", "Revisions"),
      repairRound: l("assistant-panel-field-repair-round", "Repair round"),
      replacementReason: l(
        "assistant-panel-field-replacement-reason",
        "Replacement reason",
      ),
      candidatePreview: l(
        "assistant-panel-field-candidate-preview",
        "Candidate preview",
      ),
      logs: l("assistant-panel-field-logs", "Logs"),
    },
    drawer: {
      running: l("assistant-panel-drawer-running", "Running"),
      completed: l("assistant-panel-drawer-completed", "Completed"),
      emptyTasks: l("assistant-panel-drawer-empty-tasks", "No runs."),
      emptyContexts: l("assistant-panel-drawer-empty-contexts", "No entries."),
    },
    details: {
      title: l("assistant-panel-details-title", "Details"),
      empty: l("assistant-panel-details-empty", "No details."),
      loading: l("assistant-panel-details-loading", "Loading details..."),
      noEntries: l("assistant-panel-details-no-entries", "No entries."),
      session: l("assistant-panel-details-section-session", "Session"),
      paths: l("assistant-panel-details-section-paths", "Paths"),
      runPaths: l("assistant-panel-details-section-run-paths", "Run paths"),
      runner: l("assistant-panel-details-section-runner", "Runner"),
      validation: l("assistant-panel-details-section-validation", "Validation"),
      runtimeDependencies: l(
        "assistant-panel-details-section-runtime-dependencies",
        "Runtime Dependencies",
      ),
      outputRevisions: l(
        "assistant-panel-details-section-output-revisions",
        "Output Revisions",
      ),
      runtimeLogs: l(
        "assistant-panel-details-section-runtime-logs",
        "Runtime Logs",
      ),
      resultJson: l(
        "assistant-panel-details-section-result-json",
        "Result JSON",
      ),
      run: l("assistant-panel-details-section-run", "Run"),
      pending: l("assistant-panel-details-section-pending", "Pending"),
      conversationSummary: l(
        "assistant-panel-details-section-conversation-summary",
        "Conversation Summary",
      ),
      revisionSummary: l(
        "assistant-panel-details-section-revision-summary",
        "Revision Summary",
      ),
      diagnostics: l(
        "assistant-panel-details-section-diagnostics",
        "Diagnostics",
      ),
      recentDiagnostics: l(
        "assistant-panel-details-summary-recent-diagnostics",
        "Recent runtime diagnostics",
      ),
      revisionCandidates: l(
        "assistant-panel-details-summary-revision-candidates",
        "revision candidates",
      ),
      recentLogs: l(
        "assistant-panel-details-summary-recent-logs",
        "Recent runtime log entries",
      ),
      validatedOutput: l(
        "assistant-panel-details-summary-validated-output",
        "Validated workflow output",
      ),
      compactRevision: l(
        "assistant-panel-details-summary-compact-revision",
        "Compact revision metadata",
      ),
    },
    reply: {
      placeholderAcpSkill: l(
        "assistant-panel-reply-placeholder-acp-skill",
        "Reply to this ACP skill conversation...",
      ),
      placeholderSkillRunner: l(
        "assistant-panel-reply-placeholder-skillrunner",
        "Reply to the pending SkillRunner interaction...",
      ),
      placeholderAcpChat: l(
        "assistant-panel-reply-placeholder-acp-chat",
        "Ask the active ACP backend about the current library or item...",
      ),
      shortcut: l(
        "assistant-panel-reply-shortcut",
        "Ctrl+Enter / Cmd+Enter to send",
      ),
    },
    plan: {
      title: l("assistant-panel-plan-title", "Plan"),
    },
    interaction: {
      userInputRequired: l(
        "assistant-panel-interaction-user-input-required",
        "User input required",
      ),
      waitingReply: l(
        "assistant-panel-interaction-waiting-reply",
        "The agent is waiting for your reply.",
      ),
      authenticationRequiredTitle: l(
        "assistant-panel-interaction-authentication-required-title",
        "Authentication required",
      ),
      authenticationRequiredMessage: l(
        "assistant-panel-interaction-authentication-required-message",
        "Authentication required.",
      ),
      agentRunningTitle: l(
        "assistant-panel-interaction-agent-running-title",
        "Agent is running",
      ),
      agentWorkingMessage: l(
        "assistant-panel-interaction-agent-working-message",
        "Agent is working...",
      ),
      agentRepairingMessage: l(
        "assistant-panel-interaction-agent-repairing-message",
        "Agent is repairing output...",
      ),
      runCompletedTitle: l(
        "assistant-panel-interaction-run-completed-title",
        "Run completed",
      ),
      runResultReady: l(
        "assistant-panel-interaction-run-result-ready",
        "Run completed. Workflow result is ready.",
      ),
      acpConnectionInterrupted: l(
        "assistant-panel-interaction-acp-connection-interrupted",
        "ACP connection interrupted.",
      ),
      disconnectedRecoverable: l(
        "assistant-panel-interaction-disconnected-recoverable",
        "Run is disconnected and recoverable. Connect to continue.",
      ),
      runCanceledContinue: l(
        "assistant-panel-interaction-run-canceled-continue",
        "Run canceled.",
      ),
      waitingRequestId: l(
        "assistant-panel-interaction-waiting-request-id",
        "Waiting for requestId",
      ),
      needsUserInteraction: l(
        "assistant-panel-interaction-needs-user-interaction",
        "Needs user interaction",
      ),
      backendUnavailable: l(
        "assistant-panel-interaction-backend-unavailable",
        "Backend unavailable",
      ),
    },
    permission: {
      title: l("assistant-panel-permission-title", "Permission request"),
      zoteroWriteApproval: l(
        "assistant-panel-permission-zotero-write-approval",
        "Zotero write approval",
      ),
      acpToolApproval: l(
        "assistant-panel-permission-acp-tool-approval",
        "ACP tool approval",
      ),
      acpBackendApproval: l(
        "assistant-panel-permission-acp-backend-approval",
        "ACP backend requests approval.",
      ),
      acpSkillApproval: l(
        "assistant-panel-permission-acp-skill-approval",
        "ACP skill run requests approval.",
      ),
      viewFullRequest: l(
        "assistant-panel-permission-view-full-request",
        "View details",
      ),
      waitingReply: l(
        "assistant-panel-permission-waiting-reply",
        "Agent is waiting for your reply.",
      ),
      reviewHint: l(
        "assistant-panel-permission-review-hint",
        "Review this request before choosing.",
      ),
      source: l("assistant-panel-permission-source", "Source"),
      sourceAcp: l("assistant-panel-permission-source-acp", "ACP backend"),
      sourceZotero: l("assistant-panel-permission-source-zotero", "Zotero"),
      requestedAt: l("assistant-panel-permission-requested-at", "Requested"),
      toolCallId: l("assistant-panel-permission-tool-call-id", "Tool call"),
    },
    emptyState: {
      noConversation: l(
        "assistant-panel-empty-state-no-conversation",
        "No conversation",
      ),
      noTask: l("assistant-panel-empty-state-no-task", "No task"),
    },
    transcript: {
      assistant: l("assistant-panel-transcript-assistant", "Assistant"),
      empty: l("assistant-panel-transcript-empty", "No messages yet."),
      historyLoading: l(
        "assistant-panel-transcript-history-loading",
        "Loading conversation",
      ),
      historyLoadingDetail: l(
        "assistant-panel-transcript-history-loading-detail",
        "Loading conversation history...",
      ),
      thinking: l("assistant-panel-transcript-thinking", "Thought"),
      status: l("assistant-panel-transcript-status", "Status"),
      tool: l("assistant-panel-transcript-tool", "Tool"),
      toolActivity: l(
        "assistant-panel-transcript-tool-activity",
        "Tool activity",
      ),
      permission: l("assistant-panel-transcript-permission", "Permission"),
      workspace: l("assistant-panel-transcript-workspace", "Workspace"),
      workspaceActivity: l(
        "assistant-panel-transcript-workspace-activity",
        "Workspace update",
      ),
      copy: l("assistant-panel-transcript-copy", "Copy"),
      copied: l("assistant-panel-transcript-copied", "Copied"),
      copyFailed: l("assistant-panel-transcript-copy-failed", "Copy failed"),
      copyCode: l("assistant-panel-transcript-copy-code", "Copy code"),
      copyCodeBlock: l(
        "assistant-panel-transcript-copy-code-block",
        "Copy code block",
      ),
      collapse: l("assistant-panel-transcript-collapse", "Collapse"),
      expand: l("assistant-panel-transcript-expand", "Expand"),
      tools: l("assistant-panel-transcript-tools", "tools"),
      failed: l("assistant-panel-transcript-failed", "failed"),
      running: l("assistant-panel-transcript-running", "running"),
      pending: l("assistant-panel-transcript-pending", "pending"),
      revised: l("assistant-panel-transcript-revised", "Revised"),
      latestRevision: l(
        "assistant-panel-transcript-latest-revision",
        "Latest output revision",
      ),
    },
    options: {
      default: l("assistant-panel-option-default", "Default"),
    },
    usage: {
      unavailable: l("assistant-panel-usage-unavailable", "N/A"),
      noData: l("assistant-panel-usage-no-data", "No usage data"),
      tokens: l("assistant-panel-usage-tokens", "tokens"),
    },
    status: {
      overall: l("assistant-panel-status-overall", "Overall"),
      backend: l("assistant-panel-status-backend", "Backend"),
      apply: l("assistant-panel-status-apply", "Apply"),
      running: l("assistant-panel-status-running", "Running"),
      ready: l("assistant-panel-status-ready", "Ready"),
      starting: l("assistant-panel-status-starting", "Starting"),
      fallback: l("assistant-panel-status-fallback", "Fallback"),
      recovering: l("assistant-panel-status-recovering", "Recovering"),
      completed: l("assistant-panel-status-completed", "Completed"),
      waiting: l("assistant-panel-status-waiting", "Waiting"),
      pending: l("assistant-panel-status-pending", "Pending"),
      succeeded: l("assistant-panel-status-succeeded", "Succeeded"),
      failed: l("assistant-panel-status-failed", "Failed"),
      failedRetriable: l(
        "assistant-panel-status-failed-retriable",
        "Recoverable failure",
      ),
      error: l("assistant-panel-status-error", "Error"),
      canceled: l("assistant-panel-status-canceled", "Canceled"),
      idle: l("assistant-panel-status-idle", "Idle"),
      connected: l("assistant-panel-status-connected", "Connected"),
      connecting: l("assistant-panel-status-connecting", "Connecting"),
      disconnecting: l("assistant-panel-status-disconnecting", "Disconnecting"),
      disconnected: l("assistant-panel-status-disconnected", "Disconnected"),
      authRequired: l("assistant-panel-status-auth-required", "Auth required"),
      permissionRequired: l(
        "assistant-panel-status-permission-required",
        "Permission required",
      ),
      unavailable: l("assistant-panel-status-unavailable", "Unavailable"),
      limited: l("assistant-panel-status-limited", "Limited"),
      backendUnavailable: l(
        "assistant-panel-status-backend-unavailable",
        "Backend unavailable",
      ),
      controlApproval: l("assistant-panel-status-control-approval", "Approval"),
      controlAuth: l("assistant-panel-status-control-auth", "Auth"),
      controlInput: l("assistant-panel-status-control-input", "Needs input"),
      controlPreparing: l(
        "assistant-panel-status-control-preparing",
        "Preparing",
      ),
      controlUploading: l(
        "assistant-panel-status-control-uploading",
        "Submitting",
      ),
      controlReadOnly: l(
        "assistant-panel-status-control-read-only",
        "Read-only",
      ),
      controlLive: l("assistant-panel-status-control-live", "Streaming"),
      controlUnavailable: l(
        "assistant-panel-status-control-unavailable",
        "Unavailable",
      ),
      applyNotRequired: l(
        "assistant-panel-status-apply-not-required",
        "Not required",
      ),
      applyPending: l("assistant-panel-status-apply-pending", "Pending apply"),
      applyRunning: l("assistant-panel-status-apply-running", "Applying"),
      applySucceeded: l("assistant-panel-status-apply-succeeded", "Applied"),
      applyFailed: l("assistant-panel-status-apply-failed", "Apply failed"),
      applyRetryScheduled: l(
        "assistant-panel-status-apply-retry-scheduled",
        "Retry scheduled",
      ),
      applySkipped: l("assistant-panel-status-apply-skipped", "Skipped"),
      autoReplyActive: l("assistant-panel-status-auto-reply-active", "Active"),
      autoReplyInactive: l(
        "assistant-panel-status-auto-reply-inactive",
        "Inactive",
      ),
      on: l("assistant-panel-status-on", "On"),
      off: l("assistant-panel-status-off", "Off"),
    },
    indicatorTitles: {
      acpConnectionActive: l(
        "assistant-panel-indicator-acp-connection-active",
        "ACP connection is active.",
      ),
      acpBackendConnecting: l(
        "assistant-panel-indicator-acp-backend-connecting",
        "ACP backend is connecting.",
      ),
      acpConnectionInactive: l(
        "assistant-panel-indicator-acp-connection-inactive",
        "ACP connection is not active.",
      ),
      hostBridgeFallback: l(
        "assistant-panel-indicator-host-bridge-fallback",
        "Host Bridge is running on a fallback random port.",
      ),
      hostBridgeReady: l(
        "assistant-panel-indicator-host-bridge-ready",
        "Host Bridge is ready.",
      ),
      hostBridgeStarting: l(
        "assistant-panel-indicator-host-bridge-starting",
        "Host Bridge is starting.",
      ),
      hostBridgeFailed: l(
        "assistant-panel-indicator-host-bridge-failed",
        "Host Bridge failed.",
      ),
      hostBridgeUnavailable: l(
        "assistant-panel-indicator-host-bridge-unavailable",
        "Host Bridge is not running.",
      ),
      zoteroMcpStatus: l(
        "assistant-panel-indicator-zotero-mcp-status",
        "Zotero MCP status",
      ),
      zoteroMcpDiagnostic: l(
        "assistant-panel-indicator-zotero-mcp-diagnostic",
        "Zotero MCP diagnostic",
      ),
      zoteroMcpPending: l(
        "assistant-panel-indicator-zotero-mcp-pending",
        "Zotero MCP status pending.",
      ),
      skillRunnerAutoReplyActive: l(
        "assistant-panel-indicator-skillrunner-auto-reply-active",
        "Auto reply observer is active.",
      ),
      skillRunnerAutoReplyInactive: l(
        "assistant-panel-indicator-skillrunner-auto-reply-inactive",
        "Auto reply is enabled; observer is inactive.",
      ),
    },
  };
}
