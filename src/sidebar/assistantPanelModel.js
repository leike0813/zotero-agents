const PANEL_KINDS = ["acp-chat", "acp-skills", "skillrunner"];
const TERMINAL_STATES = new Set([
  "succeeded",
  "failed",
  "canceled",
  "cancelled",
  "done",
]);
const BUSY_STATES = new Set([
  "running",
  "prompting",
  "repairing",
  "checking-command",
  "spawning",
  "initializing",
  "connecting",
]);

function safeText(value) {
  return String(value == null ? "" : value).trim();
}

function normalizeKind(kind) {
  return PANEL_KINDS.indexOf(kind) >= 0 ? kind : "acp-chat";
}
function normalizeStatusToken(value, fallback) {
  const token = safeText(value || fallback || "idle")
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
  return token || "idle";
}

function statusTone(status) {
  const token = normalizeStatusToken(status);
  if (
    ["failed", "error", "errored", "disconnected", "closed"].indexOf(token) >= 0
  ) {
    return "error";
  }
  if (token === "failed-retriable") {
    return "warning";
  }
  if (
    [
      "waiting-user",
      "waiting_user",
      "permission-required",
      "auth-required",
    ].indexOf(token) >= 0
  ) {
    return "warning";
  }
  if (
    [
      "succeeded",
      "success",
      "done",
      "completed",
      "connected",
      "active",
    ].indexOf(token) >= 0
  ) {
    return "success";
  }
  if (BUSY_STATES.has(token)) {
    return "accent";
  }
  return "muted";
}

function isTerminalStatus(status) {
  return TERMINAL_STATES.has(normalizeStatusToken(status));
}

function normalizeApplyState(source) {
  if (!source || typeof source !== "object") return "";
  const state = safeText(
    source.applyState ||
      source.apply_state ||
      (source.apply && typeof source.apply === "object"
        ? source.apply.state
        : ""),
  )
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
  return state;
}

function applyStateLabel(source, state, data) {
  const token = safeText(state || normalizeApplyState(source));
  if (token === "pending")
    return labelFrom(source, "status.applyPending", "Pending apply");
  if (token === "running")
    return labelFrom(source, "status.applyRunning", "Applying");
  if (token === "succeeded")
    return labelFrom(source, "status.applySucceeded", "Applied");
  if (token === "failed") {
    const retrySource = data && typeof data === "object" ? data : source;
    return safeText(
      retrySource &&
        (retrySource.applyNextRetryAt || retrySource.apply_next_retry_at),
    )
      ? labelFrom(source, "status.applyRetryScheduled", "Retry scheduled")
      : labelFrom(source, "status.applyFailed", "Apply failed");
  }
  if (token === "skipped")
    return labelFrom(source, "status.applySkipped", "Skipped");
  return "";
}

function applyStateTone(state) {
  const token = safeText(state);
  if (token === "succeeded" || token === "skipped") return "success";
  if (token === "failed") return "error";
  if (token === "pending" || token === "running") return "accent";
  return "muted";
}

function statusLabel(source, status) {
  const token = normalizeStatusToken(status);
  if (
    token === "succeeded" ||
    token === "success" ||
    token === "done" ||
    token === "completed"
  ) {
    return labelFrom(source, "status.succeeded", "Succeeded");
  }
  if (token === "failed-retriable") {
    return labelFrom(source, "status.failedRetriable", "Recoverable failure");
  }
  if (token === "failed") {
    return labelFrom(source, "status.failed", "Failed");
  }
  if (token === "error" || token === "errored" || token === "closed") {
    return labelFrom(source, "status.error", "Error");
  }
  if (token === "canceled" || token === "cancelled") {
    return labelFrom(source, "status.canceled", "Canceled");
  }
  if (token === "connected" || token === "active") {
    return labelFrom(source, "status.connected", "Connected");
  }
  if (token === "connecting") {
    return labelFrom(source, "status.connecting", "Connecting");
  }
  if (
    token === "checking-command" ||
    token === "spawning" ||
    token === "initializing"
  ) {
    return labelFrom(source, "status.starting", "Starting");
  }
  if (token === "disconnecting") {
    return labelFrom(source, "status.disconnecting", "Disconnecting");
  }
  if (token === "disconnected") {
    return labelFrom(source, "status.disconnected", "Disconnected");
  }
  if (token === "auth-required" || token === "waiting-auth") {
    return labelFrom(source, "status.authRequired", "Auth required");
  }
  if (token === "permission-required") {
    return labelFrom(
      source,
      "status.permissionRequired",
      "Permission required",
    );
  }
  if (token === "waiting-user" || token === "waiting_user") {
    return labelFrom(source, "status.waiting", "Waiting");
  }
  if (token === "ready") return labelFrom(source, "status.ready", "Ready");
  if (token === "starting")
    return labelFrom(source, "status.starting", "Starting");
  if (token === "recovering")
    return labelFrom(source, "status.recovering", "Recovering");
  if (token === "queued") {
    return labelFrom(source, "status.queued", "Queued");
  }
  if (token === "pending") {
    return labelFrom(source, "status.pending", "Pending");
  }
  if (token === "unavailable") {
    return labelFrom(source, "status.unavailable", "Unavailable");
  }
  if (token === "limited")
    return labelFrom(source, "status.limited", "Limited");
  if (token === "backend-unavailable") {
    return labelFrom(
      source,
      "status.backendUnavailable",
      "Backend unavailable",
    );
  }
  if (BUSY_STATES.has(token) || token === "queued") {
    return labelFrom(source, "status.running", "Running");
  }
  if (token === "idle") return labelFrom(source, "status.idle", "Idle");
  return safeText(status) || labelFrom(source, "status.idle", "Idle");
}

function normalizeTaskApplyStatus(source, mainStatus) {
  const state = normalizeApplyState(source);
  if (state && state !== "idle") return state;
  if (
    safeText(source && (source.applyResultState || source.apply_result_state))
  ) {
    return normalizeStatusToken(
      source.applyResultState || source.apply_result_state,
    );
  }
  const main = normalizeStatusToken(mainStatus);
  if (main === "succeeded" || main === "completed") return "not-required";
  return state || "idle";
}

function taskStatusFields(source, labelSource) {
  const data = source && typeof source === "object" ? source : {};
  const labels = labelSource || data;
  let mainStatus = normalizeStatusToken(
    data.mainStatus || data.main_status || data.status || data.state,
  );
  const backendStatus = normalizeStatusToken(
    data.backendStatus ||
      data.backend_status ||
      data.providerStatus ||
      data.provider_status ||
      data.status ||
      data.state,
  );
  const applyStatus = normalizeTaskApplyStatus(data, mainStatus);
  if (
    backendStatus === "failed" ||
    backendStatus === "error" ||
    applyStatus === "failed"
  ) {
    mainStatus = "failed";
  } else if (backendStatus === "canceled" || backendStatus === "cancelled") {
    mainStatus = "canceled";
  } else if (
    backendStatus === "succeeded" &&
    (applyStatus === "succeeded" ||
      applyStatus === "skipped" ||
      applyStatus === "not-required")
  ) {
    mainStatus = "succeeded";
  }
  const applyLabel =
    applyStatus === "not-required"
      ? labelFrom(labels, "status.applyNotRequired", "Not required")
      : applyStateLabel(labels, applyStatus, data) ||
        (applyStatus === "idle"
          ? labelFrom(labels, "status.idle", "Idle")
          : statusLabel(labels, applyStatus));
  return {
    mainStatus,
    mainStatusLabel: statusLabel(labels, mainStatus),
    mainStatusTone: statusTone(mainStatus),
    backendStatus,
    backendStatusLabel: statusLabel(labels, backendStatus),
    backendStatusTone: statusTone(backendStatus),
    applyStatus,
    applyStatusLabel: applyLabel,
    applyStatusTone:
      applyStatus === "not-required" ? "success" : applyStateTone(applyStatus),
  };
}

function fallbackConversationView(items) {
  return {
    items: Array.isArray(items) ? items : [],
    plan: { entries: [], activeEntries: [], active: false },
    interaction: { kind: "hidden" },
    usage: null,
  };
}
function panelLabelRoot(source) {
  const labels =
    source && source.labels && typeof source.labels === "object"
      ? source.labels
      : {};
  return labels.assistantPanel && typeof labels.assistantPanel === "object"
    ? labels.assistantPanel
    : labels;
}

function labelFrom(source, path, fallback) {
  const root = panelLabelRoot(source);
  const parts = safeText(path).split(".").filter(Boolean);
  let cursor = root;
  for (let index = 0; index < parts.length; index += 1) {
    if (!cursor || typeof cursor !== "object") return fallback;
    cursor = cursor[parts[index]];
  }
  return safeText(cursor) || fallback;
}

function contextAction(action, label, payload, enabled, tone) {
  return {
    action,
    label,
    payload: payload || {},
    enabled: enabled !== false,
    tone: tone || "",
  };
}

function assistantDrawerLabels(source) {
  const existing =
    source && source.labels && typeof source.labels === "object"
      ? source.labels
      : {};
  return Object.assign({}, existing, {
    waitingRequestId: labelFrom(
      source,
      "interaction.waitingRequestId",
      "Waiting for requestId",
    ),
    needsUserInteraction: labelFrom(
      source,
      "interaction.needsUserInteraction",
      "Needs user interaction",
    ),
    backendUnavailable: labelFrom(
      source,
      "interaction.backendUnavailable",
      "Backend unavailable",
    ),
    statusOverall: labelFrom(source, "status.overall", "Overall"),
    statusBackend: labelFrom(source, "status.backend", "Backend"),
    statusApply: labelFrom(source, "status.apply", "Apply"),
    emptyTasks: labelFrom(source, "drawer.emptyTasks", "No runs."),
  });
}

function normalizeAssistantPanelSnapshot(input) {
  const source = input && typeof input === "object" ? input : {};
  const kind = normalizeKind(source.kind);
  const context =
    source.context && typeof source.context === "object" ? source.context : {};
  const lifecycle =
    source.lifecycle && typeof source.lifecycle === "object"
      ? source.lifecycle
      : {};
  const conversation =
    source.conversation && typeof source.conversation === "object"
      ? source.conversation
      : fallbackConversationView([]);
  const interaction =
    source.interaction && typeof source.interaction === "object"
      ? source.interaction
      : conversation.interaction || { kind: "hidden" };
  const plan =
    source.plan && typeof source.plan === "object"
      ? source.plan
      : conversation.plan || {
          entries: [],
          activeEntries: [],
          active: false,
        };
  const reply =
    source.reply && typeof source.reply === "object" ? source.reply : {};
  const drawers =
    source.drawers && typeof source.drawers === "object" ? source.drawers : {};
  const actions =
    source.actions && typeof source.actions === "object" ? source.actions : {};
  const labels =
    source.labels && typeof source.labels === "object" ? source.labels : {};
  const messageCounts =
    source.messageCounts && typeof source.messageCounts === "object"
      ? source.messageCounts
      : null;
  return {
    kind,
    labels,
    messageCounts,
    context: Object.assign(
      {
        id: "",
        title: "",
        subtitle: "",
        status: "idle",
        statusTone: statusTone(context.status || lifecycle.executionState),
        metadata: [],
        indicators: [],
        selectors: [],
        actions: [],
      },
      context,
    ),
    lifecycle: Object.assign(
      {
        connectionState: "unknown",
        executionState: "idle",
        applyState: "",
        recoveryState: "",
        replyState: "",
        terminal: isTerminalStatus(context.status || lifecycle.executionState),
      },
      lifecycle,
    ),
    conversation,
    plan,
    interaction,
    usage: source.usage || conversation.usage || null,
    reply: Object.assign(
      {
        enabled: false,
        placeholder: "",
        hint: "",
        submitLabel: "Send",
        sending: false,
        showUsageGauge: false,
      },
      reply,
    ),
    drawers: Object.assign({ contexts: [], details: [] }, drawers),
    actions: Object.assign({ toolbar: [], context: [], details: [] }, actions),
    raw: source.raw || null,
  };
}
function exactWorkspaceOptionGroup(
  group,
  id,
  label,
  action,
  payloadKey,
  emptyOption,
) {
  const source = group && typeof group === "object" ? group : {};
  const options = (Array.isArray(source.options) ? source.options : []).map(
    function (option) {
      return {
        value: safeText(option && option.optionId),
        label: safeText(option && option.label),
        description: safeText(option && option.description),
      };
    },
  );
  if (options.length === 0 && emptyOption) options.push(emptyOption);
  return {
    id,
    label,
    value:
      safeText(source.selectedOptionId) ||
      safeText(emptyOption && emptyOption.value),
    options,
    action,
    payloadKey,
    disabled: source.enabled !== true,
  };
}

const workspacePresentationFieldLabels = {
  backend: ["fields.backend", "Backend"],
  workflow: ["fields.workflow", "Workflow"],
  skill: ["fields.skill", "Skill"],
  status: ["fields.status", "Status"],
  "backend-status": ["status.backend", "Backend"],
  "apply-state": ["status.apply", "Apply"],
  "updated-at": ["fields.updated", "Updated"],
  conversation: ["fields.conversation", "Conversation"],
  session: ["fields.session", "Session"],
  recovery: ["fields.remoteRestore", "Recovery"],
  workspace: ["fields.workspace", "Workspace"],
  runtime: ["fields.runtime", "Runtime"],
  model: ["fields.model", "Model"],
  reasoning: ["fields.reasoning", "Reasoning"],
  "agent-version": ["fields.agentVersion", "Agent version"],
};

const workspaceDetailsSectionLabels = {
  session: ["details.session", "Session"],
  paths: ["details.paths", "Paths"],
  diagnostics: ["details.diagnostics", "Diagnostics"],
  "run-paths": ["details.runPaths", "Run paths"],
  runner: ["details.runner", "Runner"],
  validation: ["details.validation", "Validation"],
  "runtime-dependencies": [
    "details.runtimeDependencies",
    "Runtime dependencies",
  ],
  "output-revisions": ["details.outputRevisions", "Output revisions"],
  "runtime-logs": ["details.runtimeLogs", "Runtime logs"],
  "result-json": ["details.resultJson", "Result JSON"],
  run: ["details.run", "Run"],
  "deferred-apply": ["fields.deferredApply", "Deferred apply"],
  pending: ["details.pending", "Pending"],
  "conversation-summary": [
    "details.conversationSummary",
    "Conversation Summary",
  ],
  "revision-summary": ["details.revisionSummary", "Revision Summary"],
};

const workspaceDetailsFieldLabels = {
  target: ["fields.target", "Target"],
  agent: ["fields.agent", "Agent"],
  "agent-version": ["fields.agentVersion", "Agent version"],
  session: ["fields.session", "Session"],
  "remote-session": ["fields.remoteSession", "Remote session"],
  "remote-restore": ["fields.remoteRestore", "Remote restore"],
  "stop-reason": ["fields.stopReason", "Stop reason"],
  workspace: ["fields.workspace", "Workspace"],
  "host-context": ["fields.hostContext", "Host context"],
  diagnostics: ["details.recentDiagnostics", "Recent diagnostics"],
  command: ["fields.command", "Command"],
  stderr: ["fields.stderr", "stderr"],
  "last-error": ["fields.lastError", "Last error"],
  "prerequisite-error": ["fields.prerequisiteError", "Prerequisite error"],
  runtime: ["fields.runtime", "Runtime"],
  "input-manifest": ["fields.inputManifest", "Input manifest"],
  "result-artifact": ["fields.resultArtifact", "Result artifact"],
  backend: ["fields.backend", "Backend"],
  "agent-family": ["fields.agentFamily", "Agent family"],
  mode: ["fields.mode", "Mode"],
  model: ["fields.model", "Model"],
  reasoning: ["fields.reasoning", "Reasoning"],
  "raw-model": ["fields.rawModel", "Raw model"],
  skill: ["fields.skill", "Skill"],
  "skill-roots": ["fields.skillRoots", "Skill roots"],
  "validation-status": ["fields.validationStatus", "Validation status"],
  "repair-rounds": ["fields.repairRounds", "Repair rounds"],
  "validation-errors": ["fields.validationErrors", "Validation errors"],
  "run-error": ["fields.runError", "Run error"],
  "conversation-error": ["fields.conversationError", "Conversation error"],
  "conversation-state": ["fields.conversationState", "Conversation state"],
  "apply-result": ["fields.applyResult", "Apply result"],
  "applied-at": ["fields.appliedAt", "Applied at"],
  "dependency-status": ["fields.dependencyStatus", "Status"],
  dependencies: ["fields.dependencies", "Dependencies"],
  "dependency-error": ["fields.dependencyError", "Error"],
  "revision-count": ["fields.revisionCount", "Revisions"],
  "repair-round": ["fields.repairRound", "Repair round"],
  "replacement-reason": ["fields.replacementReason", "Replacement reason"],
  "candidate-preview": ["fields.candidatePreview", "Candidate preview"],
  logs: ["fields.logs", "Logs"],
  "result-json": ["details.resultJson", "Result JSON"],
  title: ["fields.title", "Title"],
  "request-id": ["fields.requestId", "Request ID"],
  "task-key": ["fields.taskKey", "Task key"],
  status: ["fields.status", "Status"],
  terminal: ["fields.terminal", "Terminal"],
  waiting: ["fields.waiting", "Waiting"],
  engine: ["fields.engine", "Engine"],
  updated: ["fields.updated", "Updated"],
  loading: ["fields.loading", "Loading"],
  error: ["fields.error", "Error"],
  "apply-attempt": ["fields.applyAttempt", "Attempt"],
  "apply-max-attempt": ["fields.applyMaxAttempt", "Max attempt"],
  "apply-next-retry": ["fields.applyNextRetry", "Next retry"],
  messages: ["fields.messages", "Messages"],
  "latest-timestamp": ["fields.latestTimestamp", "Latest timestamp"],
  "latest-kind": ["fields.latestKind", "Latest kind"],
  count: ["fields.count", "Count"],
  latest: ["fields.latest", "Latest"],
  "pending-interaction": ["fields.pendingInteraction", "Interaction"],
  "pending-kind": ["fields.pendingKind", "Kind"],
  "pending-prompt": ["fields.pendingPrompt", "Prompt"],
  "pending-options": ["fields.pendingOptions", "Options"],
  "pending-required-fields": [
    "fields.pendingRequiredFields",
    "Required fields",
  ],
  "auth-session": ["fields.authSession", "Auth session"],
  "auth-provider": ["fields.authProvider", "Auth provider"],
  "auth-phase": ["fields.authPhase", "Auth phase"],
  "auth-engine": ["fields.authEngine", "Auth engine"],
  "auth-methods": ["fields.authMethods", "Auth methods"],
  "auth-challenge": ["fields.authChallenge", "Auth challenge"],
  "auth-error": ["fields.authError", "Auth error"],
};

function exactWorkspaceField(entry, labelSource) {
  const fieldId = safeText(entry && entry.fieldId);
  const definition = workspacePresentationFieldLabels[fieldId];
  return {
    itemId: fieldId,
    label: definition
      ? labelFrom(labelSource, definition[0], definition[1])
      : fieldId,
    value: safeText(entry && entry.value),
  };
}

function exactWorkspaceIndicator(entry, labelSource) {
  const source = entry && typeof entry === "object" ? entry : {};
  const status = safeText(source.status);
  const serviceId = safeText(source.serviceId);
  const serviceLabel =
    serviceId === "host-bridge"
      ? labelFrom(labelSource, "fields.hostBridge", "Host Bridge")
      : serviceId === "acp-connection"
        ? labelFrom(labelSource, "fields.connection", "Connection")
        : safeText(source.label || serviceId);
  return {
    id: serviceId,
    label: serviceLabel,
    value: safeText(source.value || status),
    title: safeText(source.message),
    tone:
      source.available === true ||
      status === "running" ||
      status === "connected" ||
      status === "ready"
        ? "success"
        : status === "failed" || status === "error"
          ? "error"
          : status === "starting" || status === "recovering"
            ? "warning"
            : "muted",
    valueVisible: false,
  };
}

const skillRunnerControlStateLabels = {
  approval: ["status.controlApproval", "Approval"],
  auth: ["status.controlAuth", "Auth"],
  input: ["status.controlInput", "Needs input"],
  preparing: ["status.controlPreparing", "Preparing"],
  submitting: ["status.controlUploading", "Submitting"],
  "read-only": ["status.controlReadOnly", "Read-only"],
  streaming: ["status.controlLive", "Streaming"],
  unavailable: ["status.controlUnavailable", "Unavailable"],
};

/**
 * SkillRunner read-only interaction badge (legacy
 * buildSkillRunnerControlIndicator): the host projects the eight-state token
 * and tone; the sidebar owns labels. The state text rides the tooltip, as in
 * the legacy badge (value hidden, valueVisible false).
 */
function skillRunnerControlBadgeIndicator(badge, labelSource) {
  const source = badge && typeof badge === "object" ? badge : {};
  const state = safeText(source.state) || "unavailable";
  const definition =
    skillRunnerControlStateLabels[state] ||
    skillRunnerControlStateLabels.unavailable;
  const value = labelFrom(labelSource, definition[0], definition[1]);
  return {
    id: "skillrunner-control",
    label: labelFrom(labelSource, "fields.control", "Interaction"),
    value,
    tone: safeText(source.tone) || "muted",
    title: safeText(source.title) || value,
    valueVisible: false,
    extraValue: "",
    progressPercent: undefined,
  };
}

/**
 * SkillRunner auto-reply badge (legacy buildSkillRunnerAutoReplyIndicator):
 * Active/Inactive with countdown seconds and a progress bar while the
 * observer timer runs.
 */
function skillRunnerAutoReplyBadgeIndicator(badge, labelSource) {
  const source = badge && typeof badge === "object" ? badge : {};
  const active = source.active === true;
  const remaining = Number(source.remainingSeconds);
  const progressPercent = Number(source.progressPercent);
  return {
    id: "skillrunner-auto-reply",
    label: labelFrom(labelSource, "fields.autoReply", "Auto reply"),
    value: active
      ? labelFrom(labelSource, "status.autoReplyActive", "Active")
      : labelFrom(labelSource, "status.autoReplyInactive", "Inactive"),
    tone: active ? "success" : "muted",
    title: active
      ? labelFrom(
          labelSource,
          "indicatorTitles.skillRunnerAutoReplyActive",
          "Auto reply observer is active.",
        )
      : labelFrom(
          labelSource,
          "indicatorTitles.skillRunnerAutoReplyInactive",
          "Auto reply is enabled; observer is inactive.",
        ),
    valueVisible: true,
    extraValue:
      active && Number.isFinite(remaining)
        ? String(Math.max(0, Math.ceil(remaining))) + "s"
        : "",
    progressPercent:
      active && Number.isFinite(progressPercent)
        ? Math.max(0, Math.min(100, progressPercent))
        : undefined,
  };
}

function exactWorkspaceDetails(section, labelSource) {
  const sectionId = safeText(section && section.sectionId);
  const definition = workspaceDetailsSectionLabels[sectionId];
  const rows = (section && Array.isArray(section.items) ? section.items : [])
    .filter(function (entry) {
      return safeText(entry && entry.value);
    })
    .map(function (entry) {
      const fieldId = safeText(entry && entry.fieldId);
      const fieldDefinition = workspaceDetailsFieldLabels[fieldId];
      return {
        label: fieldDefinition
          ? labelFrom(labelSource, fieldDefinition[0], fieldDefinition[1])
          : fieldId,
        value: safeText(entry.value),
        kind: safeText(entry.format) || "text",
      };
    });
  return rows.length
    ? {
        title: definition
          ? labelFrom(labelSource, definition[0], definition[1])
          : sectionId,
        entries: rows,
        collapsed: section && section.collapsed === true,
      }
    : null;
}

function exactWorkspacePlan(plan) {
  const entries = (plan && Array.isArray(plan.items) ? plan.items : []).map(
    function (entry) {
      const status = safeText(entry && entry.status) || "pending";
      return {
        id: safeText(entry && entry.itemId),
        content: safeText(entry && entry.content),
        title: safeText(entry && entry.content),
        status,
        terminal:
          status === "completed" ||
          status === "succeeded" ||
          status === "failed" ||
          status === "canceled",
        toneClass:
          status === "completed" || status === "succeeded"
            ? "is-completed"
            : status === "in_progress" || status === "running"
              ? "is-running"
              : status === "failed"
                ? "is-failed"
                : "is-pending",
      };
    },
  );
  return {
    entries,
    activeEntries: entries.filter(function (entry) {
      return !entry.terminal;
    }),
    active: entries.some(function (entry) {
      return !entry.terminal;
    }),
    totalCount: entries.length,
    completedCount: entries.filter(function (entry) {
      return entry.terminal;
    }).length,
  };
}

function exactWorkspaceTask(entry, selectedOwner, labelSource) {
  const owner =
    entry && entry.owner && typeof entry.owner === "object"
      ? entry.owner
      : null;
  const key = safeText(owner && owner.ownerKey);
  const statusFields = taskStatusFields(entry, labelSource);
  const status = statusFields.mainStatus;
  const terminal = isTerminalStatus(status);
  const archiveEligible =
    owner && owner.source === "acp-chat"
      ? status === "idle" || status === "disconnected"
      : terminal;
  const attentionToken = safeText(entry && entry.attention);
  const attentionLabel = attentionToken
    ? // SkillRunner waiting tokens are state identifiers, not display text;
      // map them back to the legacy localized tooltip.
      attentionToken === "waiting_user" || attentionToken === "waiting_auth"
      ? labelFrom(
          labelSource,
          "interaction.needsUserInteraction",
          "Needs user interaction",
        )
      : attentionToken
    : safeText(entry && entry.description);
  return {
    key,
    action:
      owner && owner.source === "acp-chat"
        ? "set-active-conversation"
        : owner && owner.source === "skillrunner"
          ? "select-task"
          : "select-run",
    payload: { owner },
    title: safeText(entry && entry.label) || key,
    workflowLabel:
      safeText(
        entry && (entry.subtitle || entry.groupLabel || entry.groupId),
      ) || "-",
    status,
    stateLabel: statusFields.mainStatusLabel,
    ...statusFields,
    showBackendStatusBadge: true,
    showApplyStatusBadge: !owner || owner.source !== "acp-chat",
    updatedAt: safeText(entry && entry.updatedAt),
    backendId: safeText(entry && entry.groupId),
    backendDisplayName: safeText(entry && (entry.groupLabel || entry.groupId)),
    selectable: Boolean(key),
    terminal,
    active: Boolean(selectedOwner && key === safeText(selectedOwner.ownerKey)),
    attention:
      attentionToken || safeText(entry && entry.description) ? "warning" : "",
    attentionLabel,
    itemActions:
      key && archiveEligible
        ? [
            {
              action:
                owner && owner.source === "acp-chat"
                  ? "archive-conversation"
                  : "archive-run",
              label: labelFrom(labelSource, "actions.archive", "Archive"),
              icon: "archive",
              enabled: true,
              payload: { owner },
            },
          ]
        : [],
  };
}

function exactWorkspaceQueuedTask(entry, labelSource) {
  const queueId = safeText(entry && entry.queueId);
  return {
    key: queueId ? "host-queue:" + queueId : "",
    action: "",
    payload: {},
    title: safeText(entry && entry.label) || queueId,
    workflowLabel:
      safeText(
        entry && (entry.subtitle || entry.groupLabel || entry.groupId),
      ) || "-",
    status: "queued",
    stateLabel: labelFrom(labelSource, "drawer.queued", "Queued"),
    mainStatus: "queued",
    mainStatusLabel: labelFrom(labelSource, "drawer.queued", "Queued"),
    mainStatusTone: "muted",
    showBackendStatusBadge: false,
    showApplyStatusBadge: false,
    updatedAt: safeText(entry && entry.updatedAt),
    backendId: safeText(entry && entry.groupId),
    backendDisplayName: safeText(entry && (entry.groupLabel || entry.groupId)),
    selectable: false,
    terminal: false,
    active: false,
    attention: "",
    attentionLabel: "",
    itemActions:
      queueId && entry && entry.canCancel !== false
        ? [
            {
              action: "cancel-queued-workflow-unit",
              label: labelFrom(
                labelSource,
                "actions.cancelQueuedWorkflowUnit",
                "Cancel queued workflow unit",
              ),
              icon: "cancel",
              enabled: true,
              payload: { queueId },
            },
          ]
        : [],
  };
}

function exactWorkspaceDrawerSections(
  navigation,
  selectedOwner,
  uiState,
  labelSource,
  source,
) {
  const catalog = new Map();
  (Array.isArray(navigation && navigation.groups)
    ? navigation.groups
    : []
  ).forEach(function (group) {
    catalog.set(safeText(group.groupId), {
      backendId: safeText(group.groupId),
      backendDisplayName: safeText(group.label),
    });
  });
  function createGroupBucket(sectionId, groupKey, entry) {
    const known = catalog.get(groupKey) || {};
    const collapseKey = safeText(sectionId) + "\n" + groupKey;
    return {
      groupKey,
      backendId: safeText(known.backendId) || groupKey,
      backendDisplayName:
        safeText(known.backendDisplayName) ||
        safeText(entry && entry.groupLabel) ||
        groupKey,
      disabled: false,
      collapsed:
        uiState &&
        uiState.drawerGroupCollapsed &&
        uiState.drawerGroupCollapsed.get(collapseKey) === true,
      activeTasks: [],
      finishedTasks: [],
    };
  }
  function appendTask(sectionId, buckets, entry, target, projectedTask) {
    const groupKey = safeText(entry && entry.groupId) || "default";
    if (!buckets.has(groupKey)) {
      buckets.set(groupKey, createGroupBucket(sectionId, groupKey, entry));
    }
    const group = buckets.get(groupKey);
    group[target].push(
      projectedTask || exactWorkspaceTask(entry, selectedOwner, labelSource),
    );
  }
  const entries = Array.isArray(navigation && navigation.entries)
    ? navigation.entries
    : [];
  if (source === "acp-chat") {
    const sessionGroups = new Map();
    entries.forEach(function (entry) {
      appendTask("sessions", sessionGroups, entry, "activeTasks");
    });
    return [
      {
        id: "sessions",
        title: labelFrom(labelSource, "actions.sessions", "Sessions"),
        hideTitle: true,
        collapsed: false,
        groups: Array.from(sessionGroups.values()),
      },
    ];
  }

  const activeGroups = new Map();
  const completedGroups = new Map();
  entries.forEach(function (entry) {
    const task = exactWorkspaceTask(entry, selectedOwner, labelSource);
    appendTask(
      task.terminal ? "completed" : "running",
      task.terminal ? completedGroups : activeGroups,
      entry,
      task.terminal ? "finishedTasks" : "activeTasks",
      task,
    );
  });
  const queuedGroups = new Map();
  (Array.isArray(navigation && navigation.queuedEntries)
    ? navigation.queuedEntries
    : []
  ).forEach(function (entry) {
    appendTask(
      "queued",
      queuedGroups,
      entry,
      "activeTasks",
      exactWorkspaceQueuedTask(entry, labelSource),
    );
  });
  const sections = [
    {
      id: "running",
      title: labelFrom(labelSource, "drawer.running", "Running"),
      collapsible: true,
      collapsed: uiState && uiState.runningCollapsed === true,
      groups: Array.from(activeGroups.values()),
    },
  ];
  if (queuedGroups.size > 0) {
    sections.push({
      id: "queued",
      title: labelFrom(labelSource, "drawer.queued", "Queued"),
      collapsible: true,
      collapsed: !uiState || uiState.queuedCollapsed !== false,
      groups: Array.from(queuedGroups.values()),
    });
  }
  sections.push({
    id: "completed",
    title: labelFrom(labelSource, "drawer.completed", "Completed"),
    collapsible: true,
    collapsed: !uiState || uiState.completedCollapsed !== false,
    groups: Array.from(completedGroups.values()),
  });
  // Backend-unreachable groups carry no task entries (the adapter withholds
  // them); re-attach them to the running section as disabled groups so the
  // drawer still shows the group with its localized reason (legacy drawer
  // parity).
  const runningSection = sections[0];
  (Array.isArray(navigation.groups) ? navigation.groups : []).forEach(
    function (group) {
      if (safeText(group && group.status) !== "unavailable") return;
      const groupKey = safeText(group && group.groupId);
      if (!groupKey) return;
      const exists = runningSection.groups.some(function (bucket) {
        return bucket.groupKey === groupKey;
      });
      if (exists) return;
      runningSection.groups.push({
        groupKey,
        backendId: groupKey,
        backendDisplayName: safeText(group && group.label) || groupKey,
        disabled: true,
        disabledReason: safeText(group && group.disabledReason),
        collapsed: true,
        activeTasks: [],
        finishedTasks: [],
      });
    },
  );
  return sections;
}

function exactWorkspaceEmptyChrome(source, sourceLabels, labelSource) {
  const chat = source.source === "acp-chat";
  const skillrunner = source.source === "skillrunner";
  const disabledAction = function (action, label, extra) {
    return Object.assign(
      {
        action,
        label,
        enabled: false,
        payload: {},
      },
      extra || {},
    );
  };
  const actions = chat
    ? [
        disabledAction(
          "new-conversation",
          safeText(sourceLabels.newConversation) ||
            labelFrom(labelSource, "actions.newConversation", "New"),
          { payload: { groupId: "" } },
        ),
        disabledAction(
          "connect",
          labelFrom(labelSource, "actions.connect", "Connect"),
        ),
        disabledAction(
          "disconnect",
          labelFrom(labelSource, "actions.disconnect", "Disconnect"),
        ),
        disabledAction(
          "authenticate",
          labelFrom(labelSource, "actions.authenticate", "Authenticate"),
          { payload: { methodId: "" } },
        ),
        disabledAction(
          "set-auto-approve-permissions",
          labelFrom(
            labelSource,
            "actions.autoApproveAcpPermissions",
            "Auto-approve",
          ),
          {
            kind: "switch",
            baseLabel: labelFrom(
              labelSource,
              "actions.autoApproveAcpPermissions",
              "Auto-approve",
            ),
            stateLabel: labelFrom(
              labelSource,
              "actions.autoApproveAcpPermissionsOff",
              "Auto-approve off",
            ),
            checked: false,
            payload: { enabled: false },
          },
        ),
      ]
    : skillrunner
      ? []
      : [
          disabledAction(
            "connect-run",
            labelFrom(labelSource, "actions.connect", "Connect"),
          ),
          disabledAction(
            "disconnect-run",
            labelFrom(labelSource, "actions.disconnect", "Disconnect"),
          ),
          disabledAction(
            "cancel-run",
            labelFrom(labelSource, "actions.cancelRun", "Cancel Task"),
            { tone: "danger" },
          ),
        ];
  return {
    subtitle: labelFrom(
      labelSource,
      chat ? "emptyState.noConversation" : "emptyState.noTask",
      chat ? "No conversation" : "No task",
    ),
    status: "unavailable",
    metadata: (chat
      ? ["backend", "conversation", "workspace"]
      : ["backend", "workspace"]
    ).map(function (fieldId) {
      return exactWorkspaceField({ fieldId, value: "" }, labelSource);
    }),
    connectionIndicator: exactWorkspaceIndicator(
      {
        serviceId: "acp-connection",
        status: "unavailable",
        available: false,
        message: labelFrom(labelSource, "status.unavailable", "Unavailable"),
      },
      labelSource,
    ),
    actions,
  };
}

function projectAssistantWorkspacePanel(state, uiState, labels) {
  const source = state && typeof state === "object" ? state : {};
  const local = uiState && typeof uiState === "object" ? uiState : {};
  const sourceLabels = labels && typeof labels === "object" ? labels : {};
  const panelLabels =
    sourceLabels.assistantPanel &&
    typeof sourceLabels.assistantPanel === "object"
      ? sourceLabels.assistantPanel
      : sourceLabels;
  const labelSource = { labels: panelLabels };
  const selection =
    source.selection && typeof source.selection === "object"
      ? source.selection
      : {};
  const navigation =
    source.navigation && typeof source.navigation === "object"
      ? source.navigation
      : {
          selectedOwner: null,
          selectedGroupId: null,
          groups: [],
          entries: [],
          canCreateOwner: false,
        };
  const owner =
    selection.owner && selection.owner.source === source.source
      ? selection.owner
      : null;
  const emptyChrome = owner
    ? null
    : exactWorkspaceEmptyChrome(source, sourceLabels, labelSource);
  const control =
    selection.control && typeof selection.control === "object"
      ? selection.control
      : {
          status: "idle",
          busy: false,
          hint: { kind: "hidden", message: null },
          connection: {
            status: "idle",
            sessionAvailable: false,
            connected: false,
            canConnect: false,
            canDisconnect: false,
          },
          execution: { canCancel: false, canInterrupt: false },
          authentication: {
            required: false,
            canAuthenticate: false,
            methodId: null,
          },
          permissionPolicy: {
            autoApprove: false,
            canSetAutoApprove: false,
          },
        };
  const presentation =
    selection.presentation && typeof selection.presentation === "object"
      ? selection.presentation
      : {
          title:
            safeText(sourceLabels.title) ||
            (source.source === "acp-chat"
              ? "ACP Chat"
              : source.source === "skillrunner"
                ? "SkillRunner"
                : "ACP Skills"),
          subtitle: null,
          description: null,
          notice: null,
          metadata: [],
          usage: null,
        };
  const composer =
    selection.composer && typeof selection.composer === "object"
      ? selection.composer
      : {
          reply: { status: "disabled" },
          runtimeOptions: {},
        };
  const permission =
    selection.permission && typeof selection.permission === "object"
      ? selection.permission
      : { request: null };
  const request = permission.request;
  const services =
    source.services && Array.isArray(source.services.items)
      ? source.services.items
      : [];
  const indicators = services.map(function (entry) {
    return exactWorkspaceIndicator(entry, labelSource);
  });
  if (owner && source.source === "skillrunner") {
    // SkillRunner has no connection LED; the banner carries the read-only
    // interaction badge and (when enabled) the auto-reply badge instead.
    const badges =
      control.badges && typeof control.badges === "object"
        ? control.badges
        : null;
    indicators.push(
      skillRunnerControlBadgeIndicator(
        badges && badges.control && typeof badges.control === "object"
          ? badges.control
          : { state: "unavailable", tone: "muted", title: null },
        labelSource,
      ),
    );
    if (badges && badges.autoReply && typeof badges.autoReply === "object") {
      indicators.push(
        skillRunnerAutoReplyBadgeIndicator(badges.autoReply, labelSource),
      );
    }
  } else if (owner && control.connection) {
    indicators.unshift(
      exactWorkspaceIndicator(
        {
          serviceId: "acp-connection",
          status: control.connection.status,
          available: control.connection.connected === true,
          message: control.hint && control.hint.message,
        },
        labelSource,
      ),
    );
  } else if (emptyChrome && source.source === "skillrunner") {
    indicators.push(
      skillRunnerControlBadgeIndicator(
        { state: "unavailable", tone: "muted", title: null },
        labelSource,
      ),
    );
  } else if (emptyChrome) {
    indicators.unshift(emptyChrome.connectionIndicator);
  }
  const selectedGroupId =
    safeText(navigation.selectedGroupId) ||
    safeText(owner && owner.backendId) ||
    safeText(
      Array.isArray(navigation.groups) &&
        navigation.groups[0] &&
        navigation.groups[0].groupId,
    );
  const groupOptions = (
    Array.isArray(navigation.groups) ? navigation.groups : []
  ).map(function (group) {
    const groupId = safeText(group.groupId);
    const targetEntry = (
      Array.isArray(navigation.entries) ? navigation.entries : []
    ).find(function (entry) {
      return safeText(entry && entry.groupId) === groupId;
    });
    return {
      value: groupId,
      label: safeText(group.label),
      owner: targetEntry ? targetEntry.owner : null,
    };
  });
  let ownerOptions = (
    Array.isArray(navigation.entries) ? navigation.entries : []
  )
    .filter(function (entry) {
      return (
        source.source !== "acp-chat" ||
        safeText(entry && entry.groupId) === selectedGroupId
      );
    })
    .map(function (entry) {
      return {
        value: safeText(entry && entry.owner && entry.owner.ownerKey),
        label: safeText(entry && entry.label),
        owner: entry.owner,
      };
    });
  if (source.source === "acp-chat" && ownerOptions.length > 8) {
    const selectedOwnerKey = safeText(owner && owner.ownerKey);
    const bounded = ownerOptions.slice(0, 8);
    const selected = ownerOptions.find(function (entry) {
      return entry.value === selectedOwnerKey;
    });
    if (
      selected &&
      !bounded.some(function (entry) {
        return entry.value === selectedOwnerKey;
      })
    ) {
      bounded.push(selected);
    }
    bounded.push({
      value: "__show-more__",
      label: labelFrom(labelSource, "actions.showMore", "Show more…"),
      owner: null,
      sentinel: "show-more",
    });
    ownerOptions = bounded;
  }
  const selectors =
    source.source === "acp-chat" && !owner
      ? [
          {
            id: "backend",
            label: labelFrom(labelSource, "fields.backend", "Backend"),
            value: "",
            options: [],
            action: "set-active-backend",
            disabled: true,
          },
          {
            id: "owner",
            label: labelFrom(labelSource, "fields.session", "Session"),
            value: "",
            options: [],
            action: "set-active-conversation",
            disabled: true,
          },
        ]
      : source.source === "acp-chat"
        ? [
            {
              id: "backend",
              label: labelFrom(labelSource, "fields.backend", "Backend"),
              value: selectedGroupId,
              options: groupOptions,
              action: "set-active-backend",
              disabled: groupOptions.length === 0,
            },
            {
              id: "owner",
              label: labelFrom(labelSource, "fields.session", "Session"),
              value: safeText(owner && owner.ownerKey),
              options: ownerOptions,
              action: "set-active-conversation",
              disabled: ownerOptions.length === 0,
            },
          ]
        : [];
  const contextActions = [];
  if (emptyChrome) {
    contextActions.push.apply(contextActions, emptyChrome.actions);
  } else if (
    source.source === "acp-chat" &&
    navigation.canCreateOwner === true
  ) {
    const changingConnection =
      control.connection &&
      ["connecting", "disconnecting"].includes(
        safeText(control.connection.status),
      );
    contextActions.push({
      action: "new-conversation",
      label:
        safeText(sourceLabels.newConversation) ||
        labelFrom(labelSource, "actions.newConversation", "New"),
      enabled: !changingConnection,
      payload: { groupId: selectedGroupId },
    });
  }
  if (owner && control.connection && source.source !== "skillrunner") {
    const connectionStatus = safeText(control.connection.status);
    contextActions.push({
      action: source.source === "acp-chat" ? "connect" : "connect-run",
      label:
        connectionStatus === "connecting"
          ? labelFrom(labelSource, "actions.connecting", "Connecting...")
          : labelFrom(labelSource, "actions.connect", "Connect"),
      enabled: control.connection.canConnect === true,
      payload: {},
    });
    contextActions.push({
      action: source.source === "acp-chat" ? "disconnect" : "disconnect-run",
      label:
        connectionStatus === "disconnecting"
          ? labelFrom(labelSource, "actions.disconnecting", "Disconnecting...")
          : labelFrom(labelSource, "actions.disconnect", "Disconnect"),
      enabled: control.connection.canDisconnect === true,
      payload: {},
    });
  }
  if (source.source === "acp-chat" && owner && control.authentication) {
    contextActions.push({
      action: "authenticate",
      label: labelFrom(labelSource, "actions.authenticate", "Authenticate"),
      enabled:
        control.authentication.canAuthenticate === true &&
        Boolean(safeText(control.authentication.methodId)),
      payload: { methodId: safeText(control.authentication.methodId) },
    });
  }
  if (source.source === "acp-chat" && owner && control.permissionPolicy) {
    const enabled = control.permissionPolicy.autoApprove === true;
    contextActions.push({
      kind: "switch",
      action: "set-auto-approve-permissions",
      label: labelFrom(
        labelSource,
        "actions.autoApproveAcpPermissions",
        "Auto-approve",
      ),
      baseLabel: labelFrom(
        labelSource,
        "actions.autoApproveAcpPermissions",
        "Auto-approve",
      ),
      stateLabel: enabled
        ? labelFrom(
            labelSource,
            "actions.autoApproveAcpPermissionsOn",
            "Auto-approve on",
          )
        : labelFrom(
            labelSource,
            "actions.autoApproveAcpPermissionsOff",
            "Auto-approve off",
          ),
      checked: enabled,
      enabled: control.permissionPolicy.canSetAutoApprove === true,
      payload: { enabled: !enabled },
    });
  }
  if (
    (source.source === "acp-skills" || source.source === "skillrunner") &&
    owner &&
    control.execution
  ) {
    contextActions.push({
      action: "cancel-run",
      label: labelFrom(labelSource, "actions.cancelRun", "Cancel Task"),
      enabled: control.execution.canCancel === true,
      payload: {},
      tone: "danger",
    });
  }
  const plan = exactWorkspacePlan(selection.plan);
  const permissionActions = request
    ? (Array.isArray(request.options) ? request.options : [])
        .map(function (option) {
          return {
            action: "resolve-permission",
            label: safeText(option.label),
            payload: {
              permissionRequestId: safeText(request.requestId),
              outcome: "selected",
              optionId: safeText(option.optionId),
            },
            enabled: true,
          };
        })
        .concat([
          {
            action: "resolve-permission",
            label: labelFrom(labelSource, "actions.cancel", "Cancel"),
            payload: {
              permissionRequestId: safeText(request.requestId),
              outcome: "cancelled",
              optionId: "",
            },
            enabled: true,
            tone: "danger",
          },
        ])
    : [];
  const interaction = (function () {
    if (request) {
      return {
        kind: "permission",
        message: safeText(request.summary),
        permission: {
          requestId: safeText(request.requestId),
          approvalKind: safeText(request.approvalKind),
          toolTitle:
            safeText(request.tool && request.tool.title) ||
            safeText(request.title),
          toolCallId: safeText(request.tool && request.tool.callId),
          summary: safeText(request.summary),
          review: request.review,
          actions: permissionActions,
        },
        actions: permissionActions,
      };
    }
    const hint =
      control.hint && typeof control.hint === "object"
        ? control.hint
        : { kind: "hidden", message: null };
    const kind = safeText(hint.kind) || "hidden";
    const sharedPending =
      control.interaction && typeof control.interaction === "object"
        ? control.interaction
        : null;
    let message = safeText(hint.message);
    if (!message) {
      if (kind === "auth") {
        message = labelFrom(
          labelSource,
          "interaction.authenticationRequiredMessage",
          "Authentication required.",
        );
      } else if (kind === "running") {
        message = labelFrom(
          labelSource,
          "interaction.agentWorkingMessage",
          "Agent is working...",
        );
      } else if (kind === "repairing") {
        message = labelFrom(
          labelSource,
          "interaction.agentRepairingMessage",
          "Agent is repairing output...",
        );
      } else if (kind === "waiting_user") {
        message = labelFrom(
          labelSource,
          "interaction.waitingReply",
          "Agent is waiting for your reply.",
        );
      } else if (kind === "completed") {
        message = labelFrom(
          labelSource,
          "interaction.runResultReady",
          "Run completed. Workflow result is ready.",
        );
      } else if (kind === "canceled") {
        message = labelFrom(
          labelSource,
          "interaction.runCanceledContinue",
          "Run canceled.",
        );
      } else if (kind === "disconnected") {
        message = labelFrom(
          labelSource,
          "interaction.disconnectedRecoverable",
          "Run is disconnected and recoverable. Connect to continue.",
        );
      } else if (kind === "error") {
        message = labelFrom(
          labelSource,
          "interaction.backendUnavailable",
          "Backend unavailable",
        );
      }
    }
    if (kind === "waiting_user" && sharedPending) {
      return {
        kind,
        message: "",
        pendingInteraction: Object.assign({}, sharedPending, {
          options: (Array.isArray(sharedPending.options)
            ? sharedPending.options
            : []
          ).map(function (option) {
            return Object.assign({}, option, {
              action: "select-interaction-option",
              responseValue: option.value,
              payload: {
                responseValue: option.value,
                responseLabel: safeText(option.label),
              },
            });
          }),
          fileAction:
            sharedPending.fileReply &&
            sharedPending.fileReply.supported === true
              ? {
                  action: "submit-interaction-files",
                  payload: {},
                }
              : null,
        }),
      };
    }
    // SkillRunner waiting_auth: the shared DTO carries the resolved auth
    // suite. The projection maps the DTO field for field so HintRegion
    // renders unchanged; method buttons reuse the reply-run auth payload
    // shape byte for byte (dispatchSkillRunnerWorkspaceAction maps it
    // natively).
    const sharedAuth =
      sharedPending &&
      sharedPending.auth &&
      typeof sharedPending.auth === "object"
        ? sharedPending.auth
        : null;
    if (kind === "auth" && sharedAuth) {
      const methodActions = (
        Array.isArray(sharedAuth.methods) ? sharedAuth.methods : []
      ).map(function (method) {
        return contextAction(
          "reply-run",
          safeText(method && (method.label || method.value)) ||
            labelFrom(labelSource, "actions.useMethod", "Use method"),
          {
            mode: "auth",
            selection: {
              kind: "auth_method",
              value: safeText(method && (method.value || method.label)),
            },
          },
          sharedAuth.actionPending !== true,
        );
      });
      return {
        kind,
        title: labelFrom(
          labelSource,
          "interaction.authenticationRequiredTitle",
          "Authentication required",
        ),
        message,
        actions: methodActions,
        auth: {
          phase: safeText(sharedAuth.phase),
          challengeKind: safeText(sharedAuth.challengeKind),
          hint: safeText(sharedAuth.hint),
          inputKind: safeText(sharedAuth.inputKind),
          acceptsChatInput: sharedAuth.acceptsChatInput === true,
          authUrl: safeText(sharedAuth.authUrl),
          userCode: safeText(sharedAuth.userCode),
          lastError: safeText(sharedAuth.lastError),
          actionPending: sharedAuth.actionPending === true,
          actionKind: safeText(sharedAuth.actionKind),
          importFiles: Array.isArray(sharedAuth.importFiles)
            ? sharedAuth.importFiles
            : [],
          importRiskNoticeRequired:
            sharedAuth.importRiskNoticeRequired === true,
        },
      };
    }
    return kind === "hidden" || (kind === "notice" && !message)
      ? { kind: "hidden" }
      : { kind, message };
  })();
  const runtimeOptions =
    composer.runtimeOptions && typeof composer.runtimeOptions === "object"
      ? composer.runtimeOptions
      : {};
  const replyStatus = safeText(composer.reply && composer.reply.status);
  const replyCancelling = replyStatus === "cancelling";
  const replyBusy = replyStatus === "busy" || replyCancelling;
  const replyEnabled =
    Boolean(owner) &&
    replyStatus !== "disabled" &&
    !replyCancelling &&
    !request;
  const detailsState =
    selection.details && typeof selection.details === "object"
      ? selection.details
      : null;
  const details = (
    detailsState && Array.isArray(detailsState.sections)
      ? detailsState.sections
      : []
  )
    .map(function (section) {
      return exactWorkspaceDetails(section, labelSource);
    })
    .filter(Boolean);
  const drawerSections = exactWorkspaceDrawerSections(
    navigation,
    owner,
    local,
    labelSource,
    source.source,
  );
  return {
    exact: true,
    kind: source.source,
    labels: panelLabels,
    messageCounts:
      selection.messageCounts && selection.messageCounts.counts
        ? selection.messageCounts.counts
        : null,
    context: {
      id: safeText(owner && owner.ownerKey),
      title:
        source.source === "acp-chat"
          ? safeText(sourceLabels.title) || "ACP Chat"
          : safeText(presentation.title),
      subtitle: emptyChrome
        ? emptyChrome.subtitle
        : source.source === "acp-chat"
          ? safeText(sourceLabels.subtitle)
          : safeText(presentation.subtitle),
      status: emptyChrome ? emptyChrome.status : safeText(control.status),
      statusLabel: statusLabel(
        labelSource,
        emptyChrome ? emptyChrome.status : control.status,
      ),
      statusTone: statusTone(emptyChrome ? emptyChrome.status : control.status),
      metadata: emptyChrome
        ? emptyChrome.metadata
        : Array.isArray(presentation.metadata)
          ? presentation.metadata.map(function (entry) {
              return exactWorkspaceField(entry, labelSource);
            })
          : [],
      indicators,
      selectors,
      actions: contextActions,
      notice:
        presentation.notice && typeof presentation.notice === "object"
          ? presentation.notice
          : null,
    },
    lifecycle: {
      connectionState: emptyChrome
        ? "unavailable"
        : control.connection && control.connection.connected === true
          ? "connected"
          : safeText(control.connection && control.connection.status) ||
            "disconnected",
      executionState: emptyChrome
        ? emptyChrome.status
        : safeText(control.status),
      applyState: "",
      recoveryState: "",
      replyState: replyBusy ? "sending" : "idle",
      terminal: isTerminalStatus(control.status),
    },
    conversation: {
      items: [],
      plan,
      interaction,
      usage: presentation.usage || null,
    },
    plan,
    interaction,
    usage: presentation.usage || null,
    reply: (function () {
      const isSkillRunner = source.source === "skillrunner";
      // SkillRunner waiting_auth: the auth suite rides the projected
      // interaction; the composer guidance (placeholder/submit label)
      // follows the legacy skillRunnerAuth* branch.
      const auth =
        isSkillRunner && interaction && interaction.kind === "auth"
          ? interaction.auth
          : null;
      const authInputKind = auth ? safeText(auth.inputKind) : "";
      const authInputVisible =
        Boolean(auth) &&
        auth.acceptsChatInput === true &&
        Boolean(authInputKind) &&
        ["import_files", "custom_provider"].indexOf(authInputKind) < 0 &&
        safeText(auth.phase) !== "method_selection";
      const authInputEnabled =
        authInputVisible && replyEnabled && auth.actionPending !== true;
      const authPlaceholder = authInputEnabled
        ? safeText(auth.hint) ||
          (authInputKind === "api_key"
            ? labelFrom(labelSource, "reply.authPasteApiKey", "Paste API key")
            : labelFrom(
                labelSource,
                "reply.authPasteCode",
                "Paste authorization code",
              ))
        : labelFrom(
            labelSource,
            "reply.authInProgress",
            "Awaiting auth state update...",
          );
      const authSubmitLabel = authInputEnabled
        ? authInputKind === "api_key"
          ? labelFrom(labelSource, "reply.authSubmitApiKey", "Submit API Key")
          : labelFrom(labelSource, "reply.authSubmitCode", "Submit Code")
        : labelFrom(labelSource, "reply.authAwaiting", "Awaiting");
      return {
        enabled: replyEnabled,
        inputEnabled: replyEnabled && !replyBusy,
        placeholder: auth
          ? authPlaceholder
          : source.source === "acp-chat"
            ? labelFrom(
                labelSource,
                "reply.placeholderAcpChat",
                "Ask the active ACP backend…",
              )
            : isSkillRunner
              ? labelFrom(
                  labelSource,
                  "reply.placeholderSkillRunner",
                  "Reply to the pending SkillRunner interaction...",
                )
              : labelFrom(
                  labelSource,
                  "reply.placeholderAcpSkill",
                  "Reply to the selected run…",
                ),
        hint: "",
        submitLabel: replyCancelling
          ? labelFrom(labelSource, "actions.cancelling", "Cancelling...")
          : replyBusy
            ? labelFrom(labelSource, "actions.cancel", "Cancel")
            : auth
              ? authSubmitLabel
              : labelFrom(labelSource, "actions.send", "Send"),
        sending: replyBusy || (auth && auth.actionPending === true),
        action: replyBusy
          ? source.source === "acp-chat"
            ? "cancel"
            : isSkillRunner
              ? "cancel-run"
              : "interrupt-run-turn"
          : source.source === "acp-chat"
            ? "send-prompt"
            : "reply-run",
        payload: {},
        tone: replyBusy ? "danger" : "primary",
        controls: isSkillRunner
          ? []
          : [
              exactWorkspaceOptionGroup(
                runtimeOptions.mode,
                "mode",
                labelFrom(labelSource, "fields.mode", "Mode"),
                "set-mode",
                "modeId",
              ),
              exactWorkspaceOptionGroup(
                runtimeOptions.model,
                "model",
                labelFrom(labelSource, "fields.model", "Model"),
                "set-model",
                "modelId",
              ),
              exactWorkspaceOptionGroup(
                runtimeOptions.reasoningEffort,
                "reasoning",
                labelFrom(labelSource, "fields.reasoning", "Reasoning"),
                "set-reasoning-effort",
                "effortId",
                owner && source.source === "acp-chat"
                  ? {
                      value: "default",
                      label: labelFrom(
                        labelSource,
                        "options.default",
                        "Default",
                      ),
                      description: "",
                    }
                  : null,
              ),
            ],
        showUsageGauge: !isSkillRunner,
        value: safeText(local.replyDraft),
      };
    })(),
    drawers: {
      layout: "workspace-task-drawer",
      contextTitle:
        source.source === "acp-chat"
          ? labelFrom(labelSource, "actions.sessions", "Sessions")
          : labelFrom(labelSource, "actions.runs", "Runs"),
      detailsTitle:
        safeText(detailsState && detailsState.title) ||
        labelFrom(labelSource, "details.title", "Details"),
      contexts: [],
      sections: drawerSections,
      selectedTaskKey: safeText(owner && owner.ownerKey),
      notice: safeText(navigation && navigation.notice),
      labels: assistantDrawerLabels(labelSource),
      details,
      detailsLoading: local.detailsDrawerOpen === true && !detailsState,
      permissionRequest: request
        ? {
            approvalKind: safeText(request.approvalKind),
            toolTitle:
              safeText(request.tool && request.tool.title) ||
              safeText(request.title),
            toolCallId: safeText(request.tool && request.tool.callId),
            summary: safeText(request.summary),
            review: request.review,
            actions: permissionActions,
          }
        : null,
      permissionRequestOpen: local.permissionRequestOpen === true && !!request,
    },
    actions: {
      toolbar: [
        {
          action: "open-context-drawer",
          label:
            source.source === "acp-chat"
              ? labelFrom(labelSource, "actions.sessions", "Sessions")
              : labelFrom(labelSource, "actions.runs", "Runs"),
          enabled: true,
        },
        {
          action: "open-details-drawer",
          label: labelFrom(labelSource, "actions.details", "Details"),
          enabled: Boolean(owner),
        },
        {
          action: "open-backend-manager",
          label: labelFrom(
            labelSource,
            "actions.manageBackends",
            "Manage Backends",
          ),
          enabled: true,
        },
        {
          kind: "display-mode",
          action: "set-execution-display-mode",
          label: labelFrom(
            labelSource,
            "actions.executionDisplayMode",
            "Display mode",
          ),
          value: safeText(local.executionDisplayMode) || "live",
          align: "end",
          options: [
            {
              value: "live",
              label: labelFrom(
                labelSource,
                "actions.executionDisplayLive",
                "Live",
              ),
            },
            {
              value: "boundary",
              label: labelFrom(
                labelSource,
                "actions.executionDisplayBoundary",
                "By message",
              ),
            },
            {
              value: "silent",
              label: labelFrom(
                labelSource,
                "actions.executionDisplaySilent",
                "Silent",
              ),
            },
          ],
          enabled: true,
        },
      ],
      context: [],
      details: (detailsState && Array.isArray(detailsState.actions)
        ? detailsState.actions
        : []
      ).map(function (actionId) {
        const action =
          actionId === "copy-id"
            ? "copy-request-id"
            : actionId === "open-workspace"
              ? "open-workspace"
              : "copy-diagnostics";
        const labelPath =
          actionId === "copy-id"
            ? "actions.copyId"
            : actionId === "open-workspace"
              ? "actions.openWorkspace"
              : "actions.copyDiagnostics";
        return {
          action,
          label: labelFrom(labelSource, labelPath, actionId),
          enabled: Boolean(owner),
          payload: {},
        };
      }),
    },
  };
}

export {
  normalizeAssistantPanelSnapshot,
  normalizeStatusToken,
  statusTone,
  isTerminalStatus,
  projectAssistantWorkspacePanel,
  contextAction,
};
