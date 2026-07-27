import {
  parseAssistantPendingInteraction,
  projectAssistantPendingInteractionFromHints,
} from "../shared/assistantInteractionContract.js";

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

function resolveSkillSecondaryLabel() {
  const sources = Array.prototype.slice.call(arguments);
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    const skillName = safeText(source.skillName || source.skill_name);
    if (skillName) return skillName;
  }
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    const skillId = safeText(source.skillId || source.skill_id);
    if (skillId) return skillId;
  }
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    const requestId = safeText(
      source.requestId || source.request_id || source.id,
    );
    if (requestId) return requestId;
  }
  return "";
}

function workflowSecondaryLabel() {
  const sources = Array.prototype.slice.call(arguments);
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    const workflowLabel = safeText(
      source.workflowLabel || source.workflow_label,
    );
    if (workflowLabel) return workflowLabel;
  }
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    const workflowId = safeText(source.workflowId || source.workflow_id);
    if (workflowId) return workflowId;
  }
  return "";
}

function sequenceStepIndex(source) {
  const data = source && typeof source === "object" ? source : {};
  const nested =
    data.sequence && typeof data.sequence === "object" ? data.sequence : null;
  const candidates = [
    data.sequenceStepIndex,
    data.sequence_step_index,
    data.stepIndex,
    data.step_index,
    nested && nested.stepIndex,
    nested && nested.step_index,
  ];
  for (const candidate of candidates) {
    if (
      candidate === null ||
      typeof candidate === "undefined" ||
      candidate === ""
    ) {
      continue;
    }
    const value = Number(candidate);
    if (Number.isFinite(value) && value >= 0) return value;
  }
  return null;
}

function isSequenceTask(source) {
  const data = source && typeof source === "object" ? source : {};
  if (safeText(data.role) === "sequence_step") return true;
  if (safeText(data.sequenceStepId || data.sequence_step_id)) return true;
  if (sequenceStepIndex(data) !== null) return true;
  return Boolean(data.sequence && typeof data.sequence === "object");
}

function sequenceStepEmoji(index) {
  const icons = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];
  if (typeof index !== "number" || !Number.isFinite(index) || index < 0) {
    return "";
  }
  return icons[index] || "#" + String(index + 1);
}

function buildSkillRunSecondaryLabel() {
  const sources = Array.prototype.slice.call(arguments);
  const sequenceSource = sources.find(function (source) {
    return isSequenceTask(source);
  });
  const skill = resolveSkillSecondaryLabel.apply(null, sources);
  if (!sequenceSource) return skill;
  const workflow = workflowSecondaryLabel.apply(null, sources);
  const prefix = sequenceStepEmoji(sequenceStepIndex(sequenceSource));
  const body = workflow ? [skill, workflow].filter(Boolean).join("/") : skill;
  return [prefix, body].filter(Boolean).join(" ");
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

function buildSkillRunnerControlIndicator(source, labelSource, statusRaw) {
  const data = source && typeof source === "object" ? source : {};
  const labels = labelSource || data;
  const status = normalizeStatusToken(statusRaw || data.status || data.state);
  const submitPhase = normalizeStatusToken(
    data.submitPhase || data.submit_phase,
  );
  const requestId = safeText(data.requestId || data.request_id || data.id);
  const requestAssigned =
    typeof data.requestAssigned === "boolean"
      ? data.requestAssigned
      : Boolean(requestId);
  const backendInteractive =
    typeof data.backendInteractive === "boolean"
      ? data.backendInteractive
      : requestAssigned;
  const canReply =
    typeof data.canReply === "boolean"
      ? data.canReply
      : backendInteractive &&
        (status === "waiting-user" || status === "waiting-auth");
  const pendingPermission =
    data.pendingPermission && typeof data.pendingPermission === "object"
      ? data.pendingPermission
      : null;
  const authPhase = safeText(data.authPhase || data.auth_phase);
  const label = labelFrom(labels, "fields.control", "Interaction");
  let value = "";
  let tone = "muted";
  let title = "";
  if (pendingPermission) {
    value = labelFrom(labels, "status.controlApproval", "Approval");
    tone = "warning";
    title =
      safeText(pendingPermission.summary || pendingPermission.toolTitle) ||
      value;
  } else if (authPhase || status === "waiting-auth") {
    value = labelFrom(labels, "status.controlAuth", "Auth");
    tone = "warning";
  } else if (canReply || status === "waiting-user") {
    value = labelFrom(labels, "status.controlInput", "Needs input");
    tone = "warning";
  } else if (!requestAssigned || !requestId) {
    value = labelFrom(labels, "status.controlPreparing", "Preparing");
    tone = "accent";
  } else if (!backendInteractive) {
    const uploading =
      submitPhase === "uploading" ||
      status === "uploading" ||
      status === "request-creating";
    value = uploading
      ? labelFrom(labels, "status.controlUploading", "Submitting")
      : labelFrom(labels, "status.controlPreparing", "Preparing");
    tone = "accent";
  } else if (isTerminalStatus(status)) {
    value = labelFrom(labels, "status.controlReadOnly", "Read-only");
    tone = "muted";
  } else if (backendInteractive) {
    value = labelFrom(labels, "status.controlLive", "Streaming");
    tone = "success";
  } else {
    value = labelFrom(labels, "status.controlUnavailable", "Unavailable");
    tone = "muted";
  }
  return indicator("skillrunner-control", label, value, tone, title || value);
}

function buildSkillRunnerAutoReplyIndicator(source, labelSource) {
  const data = source && typeof source === "object" ? source : {};
  if (data.autoReplyEnabled !== true) {
    return null;
  }
  const labels = labelSource || data;
  const active = data.autoReplyObserverActive === true;
  const showTimer = data.autoReplyObserverShowTimer === true;
  const remaining = Number(data.autoReplyObserverRemainingSeconds);
  let value = active
    ? labelFrom(labels, "status.autoReplyActive", "Active")
    : labelFrom(labels, "status.autoReplyInactive", "Inactive");
  let extraValue = "";
  let progressPercent;
  if (active && showTimer && Number.isFinite(remaining)) {
    extraValue = String(Math.max(0, Math.ceil(remaining))) + "s";
    const startedAt = Date.parse(safeText(data.autoReplyObserverStartedAt));
    const deadlineAt = Date.parse(safeText(data.autoReplyObserverDeadlineAt));
    if (
      Number.isFinite(startedAt) &&
      Number.isFinite(deadlineAt) &&
      deadlineAt > startedAt
    ) {
      const remainingRatio =
        (deadlineAt - Date.now()) / (deadlineAt - startedAt);
      progressPercent = Math.max(0, Math.min(100, remainingRatio * 100));
    }
  }
  return indicator(
    "skillrunner-auto-reply",
    labelFrom(labels, "fields.autoReply", "Auto reply"),
    value,
    active ? "success" : "muted",
    active
      ? labelFrom(
          labels,
          "indicatorTitles.skillRunnerAutoReplyActive",
          "Auto reply observer is active.",
        )
      : labelFrom(
          labels,
          "indicatorTitles.skillRunnerAutoReplyInactive",
          "Auto reply is enabled; observer is inactive.",
        ),
    {
      valueVisible: true,
      extraValue,
      progressPercent,
    },
  );
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

function buildExecutionDisplayModeAction(source) {
  const mode = ["live", "boundary", "silent"].includes(
    safeText(source && source.executionDisplayMode),
  )
    ? safeText(source.executionDisplayMode)
    : "live";
  return {
    kind: "display-mode",
    align: "end",
    action: "set-execution-display-mode",
    label: labelFrom(source, "actions.executionDisplayMode", "Display mode"),
    value: mode,
    options: [
      {
        value: "live",
        label: labelFrom(source, "actions.executionDisplayLive", "Live"),
      },
      {
        value: "boundary",
        label: labelFrom(
          source,
          "actions.executionDisplayBoundary",
          "By message",
        ),
      },
      {
        value: "silent",
        label: labelFrom(source, "actions.executionDisplaySilent", "Silent"),
      },
    ],
  };
}

function detailEntry(label, value, kind) {
  const text = safeText(value);
  if (!text) return null;
  return { label, value: text, kind: kind || "text" };
}

function detailSection(title, entries, options) {
  const rows = (Array.isArray(entries) ? entries : []).filter(Boolean);
  if (rows.length === 0) return null;
  const opts = options && typeof options === "object" ? options : {};
  return Object.assign({ title, entries: rows }, opts);
}

function truncateText(value, limit) {
  const text = safeText(value).replace(/\s+/g, " ");
  const max = Number(limit || 500);
  return text.length > max ? text.slice(0, max) + "..." : text;
}

function contextSelector(
  id,
  label,
  value,
  options,
  action,
  disabled,
  payloadKey,
  payload,
) {
  return {
    id,
    label,
    value: safeText(value),
    options: Array.isArray(options) ? options : [],
    action,
    disabled: disabled === true,
    payloadKey: safeText(payloadKey),
    payload: payload && typeof payload === "object" ? payload : {},
  };
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

function archiveItemAction(action, label, payload, enabled) {
  return {
    action,
    label: safeText(label) || "Archive",
    icon: "archive",
    payload: payload || {},
    enabled: enabled !== false,
    tone: "muted",
  };
}

function indicator(id, label, value, tone, title, extra) {
  const metadata = extra && typeof extra === "object" ? extra : {};
  const progressPercent = Number(metadata.progressPercent);
  return {
    id: safeText(id),
    label: safeText(label),
    value: safeText(value),
    tone: safeText(tone || "muted"),
    title: safeText(title || value || label),
    valueVisible: metadata.valueVisible === true,
    extraValue: safeText(metadata.extraValue),
    progressPercent: Number.isFinite(progressPercent)
      ? Math.max(0, Math.min(100, progressPercent))
      : undefined,
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

function normalizeSkillRunnerMessageRole(role) {
  const value = safeText(role).toLowerCase();
  return value === "assistant" || value === "user" || value === "system"
    ? value
    : "system";
}

function normalizeSkillRunnerMessageKind(kind) {
  const value = safeText(kind).toLowerCase();
  return [
    "assistant_process",
    "assistant_message",
    "assistant_final",
    "assistant_revision",
  ].indexOf(value) >= 0
    ? value
    : "unknown";
}

function skillRunnerMessageText(entry) {
  return safeText(
    entry &&
      (entry.displayText || entry.display_text || entry.text || entry.summary),
  );
}

function skillRunnerProcessType(entry) {
  const source = entry && typeof entry === "object" ? entry : {};
  const correlation =
    source.correlation && typeof source.correlation === "object"
      ? source.correlation
      : {};
  return safeText(
    source.processType ||
      source.process_type ||
      source.processKind ||
      correlation.process_type ||
      correlation.classification,
  )
    .trim()
    .toLowerCase();
}

function isSkillRunnerToolProcess(processType) {
  const value = safeText(processType).trim().toLowerCase();
  return value === "tool_call" || value === "command_execution";
}

function skillRunnerToolDetails(source) {
  const correlation =
    source && source.correlation && typeof source.correlation === "object"
      ? source.correlation
      : {};
  const details =
    correlation.details && typeof correlation.details === "object"
      ? correlation.details
      : source && source.details && typeof source.details === "object"
        ? source.details
        : {};
  return { correlation, details };
}

function compactSkillRunnerToolValue(value) {
  if (Array.isArray(value)) {
    return value.map(compactSkillRunnerToolValue).filter(Boolean).join(" ");
  }
  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return safeText(value);
}

function skillRunnerToolDisplay(source, processType) {
  const item = source && typeof source === "object" ? source : {};
  const tool = skillRunnerToolDetails(item);
  const toolName =
    safeText(tool.correlation.tool_name) ||
    safeText(tool.correlation.toolName) ||
    safeText(tool.correlation.name) ||
    safeText(tool.details.tool) ||
    safeText(tool.details.name) ||
    safeText(tool.details.command) ||
    safeText(tool.details.tool_id) ||
    safeText(item.toolName) ||
    safeText(item.name) ||
    (processType === "command_execution" ? "Command" : "Tool");
  const inputSummary =
    compactSkillRunnerToolValue(tool.correlation.summary) ||
    compactSkillRunnerToolValue(tool.details.path) ||
    compactSkillRunnerToolValue(tool.details.file) ||
    compactSkillRunnerToolValue(tool.details.pattern) ||
    compactSkillRunnerToolValue(tool.details.query) ||
    compactSkillRunnerToolValue(tool.details.command) ||
    compactSkillRunnerToolValue(tool.details.args);
  const fallbackSummary = skillRunnerMessageText(item);
  return {
    toolName,
    inputSummary: inputSummary || undefined,
    summary: inputSummary || fallbackSummary,
    text: fallbackSummary || inputSummary,
  };
}

function buildSkillRunnerToolItem(entry, id) {
  const source = entry && typeof entry === "object" ? entry : {};
  const tool = skillRunnerToolDetails(source);
  const processType = skillRunnerProcessType(source);
  const display = skillRunnerToolDisplay(source, processType);
  const state =
    safeText(
      source.state ||
        source.status ||
        tool.correlation.state ||
        tool.correlation.status,
    )
      .trim()
      .toLowerCase() || "completed";
  return {
    id,
    kind: "tool",
    state,
    toolName: display.toolName,
    inputSummary: display.inputSummary,
    summary: display.summary,
    text: display.text,
    createdAt: source.ts,
  };
}

function buildSkillRunnerProcessItem(entry, id) {
  return {
    id,
    kind: "process",
    label: "Thought",
    text: skillRunnerMessageText(entry),
    createdAt: entry && entry.ts,
  };
}

function skillRunnerMessageId(entry) {
  const correlation =
    entry && entry.correlation && typeof entry.correlation === "object"
      ? entry.correlation
      : {};
  return safeText(correlation.message_id || entry.messageId);
}

function buildSkillRunnerConversationView(session, source) {
  const messages = Array.isArray(session && session.messages)
    ? session.messages
    : [];
  const revisions = new Map();
  messages.forEach(function (entry) {
    if (
      normalizeSkillRunnerMessageKind(entry && entry.kind) !==
      "assistant_revision"
    )
      return;
    const id = skillRunnerMessageId(entry);
    if (id) revisions.set(id, entry);
  });
  const items = messages
    .map(function (entry, index) {
      const kind = normalizeSkillRunnerMessageKind(entry && entry.kind);
      if (kind === "assistant_revision") return null;
      const id =
        "skillrunner-" +
        String(entry && entry.seq != null ? entry.seq : index) +
        "-" +
        safeText(kind || "message");
      if (kind === "assistant_process") {
        const processType = skillRunnerProcessType(entry);
        return isSkillRunnerToolProcess(processType)
          ? buildSkillRunnerToolItem(entry, id)
          : buildSkillRunnerProcessItem(entry, id);
      }
      const role = normalizeSkillRunnerMessageRole(entry && entry.role);
      const messageId = skillRunnerMessageId(entry);
      const revision =
        messageId && revisions.has(messageId)
          ? {
              count: 1,
              latestStatus: "replaced",
              latestRepairRound: Number((entry && entry.attempt) || 1),
            }
          : null;
      return {
        id,
        kind: "message",
        role: role === "assistant" ? "assistant" : role,
        text: skillRunnerMessageText(entry),
        createdAt: entry && entry.ts,
        revision,
      };
    })
    .filter(Boolean);
  if (session && session.historyLoading === true) {
    items.push({
      id: "skillrunner-history-loading",
      kind: "status",
      label: labelFrom(
        source,
        "transcript.historyLoading",
        "Loading conversation",
      ),
      text: labelFrom(
        source,
        "transcript.historyLoadingDetail",
        "Loading conversation history...",
      ),
      state: "loading",
    });
  }
  return fallbackConversationView(items);
}

function normalizeSkillRunnerOptionList(raw) {
  return (Array.isArray(raw) ? raw : [])
    .map(function (option) {
      if (
        typeof option === "string" ||
        typeof option === "number" ||
        typeof option === "boolean"
      ) {
        const text = safeText(option);
        return text ? { label: text, value: option, description: null } : null;
      }
      if (!option || typeof option !== "object") return null;
      const label =
        safeText(option.label) ||
        safeText(option.name) ||
        safeText(option.title) ||
        safeText(option.value);
      const value = Object.prototype.hasOwnProperty.call(option, "value")
        ? option.value
        : Object.prototype.hasOwnProperty.call(option, "reply")
          ? option.reply
          : Object.prototype.hasOwnProperty.call(option, "message")
            ? option.message
            : label;
      return label
        ? {
            label,
            value,
            description: safeText(option.description) || null,
          }
        : null;
    })
    .filter(Boolean);
}

function buildSkillRunnerPendingInteraction(session, status, source) {
  const normalized = normalizeStatusToken(status);
  if (normalized === "waiting-user") {
    let projected = parseAssistantPendingInteraction(
      session.pendingInteraction,
    );
    if (!projected) {
      const askUser =
        session.pendingAskUser && typeof session.pendingAskUser === "object"
          ? session.pendingAskUser
          : null;
      const uiHints =
        session.pendingUiHints && typeof session.pendingUiHints === "object"
          ? session.pendingUiHints
          : askUser && askUser.ui_hints && typeof askUser.ui_hints === "object"
            ? askUser.ui_hints
            : {};
      projected = projectAssistantPendingInteractionFromHints({
        pendingKind: safeText(
          (askUser && askUser.kind) || session.pendingKind || "open_text",
        ),
        uiHints: Object.assign({}, uiHints, {
          prompt:
            safeText(uiHints.prompt) ||
            safeText((askUser && askUser.prompt) || session.pendingPrompt) ||
            labelFrom(
              source,
              "interaction.waitingReply",
              "The agent is waiting for your reply.",
            ),
        }),
        options:
          askUser && Array.isArray(askUser.options)
            ? askUser.options
            : session.pendingOptions,
        files: session.pendingRequiredFields,
        fileReply: {
          supported: false,
          maxFiles: 8,
          maxFileBytes: 32 * 1024 * 1024,
          maxTotalBytes: 64 * 1024 * 1024,
        },
      });
    }
    return {
      kind: "waiting_user",
      title: labelFrom(
        source,
        "interaction.userInputRequired",
        "User input required",
      ),
      pendingInteraction: projected
        ? Object.assign({}, projected, {
            options: projected.options.map(function (option) {
              return Object.assign({}, option, {
                action: "reply-run",
                responseValue: option.value,
                payload: {
                  responseValue: option.value,
                  responseLabel: option.label,
                  message: option.label,
                },
              });
            }),
            fileAction: projected.fileReply.supported
              ? {
                  action: "submit-interaction-files",
                  payload: {},
                }
              : null,
          })
        : null,
    };
  }
  if (normalized === "waiting-auth") {
    const authAsk =
      session && session.authAskUser && typeof session.authAskUser === "object"
        ? session.authAskUser
        : null;
    const authHints =
      session && session.authUiHints && typeof session.authUiHints === "object"
        ? session.authUiHints
        : authAsk && authAsk.ui_hints && typeof authAsk.ui_hints === "object"
          ? authAsk.ui_hints
          : {};
    const authAskHints =
      authAsk && authAsk.ui_hints && typeof authAsk.ui_hints === "object"
        ? authAsk.ui_hints
        : {};
    const authHint =
      safeText(authAsk && authAsk.hint) ||
      safeText(authAskHints.hint) ||
      safeText(authHints.hint);
    const askMethodOptions = normalizeSkillRunnerOptionList(
      authAsk && Array.isArray(authAsk.options) ? authAsk.options : [],
    );
    const availableMethodOptions = normalizeSkillRunnerOptionList(
      Array.isArray(session && session.authAvailableMethods)
        ? session.authAvailableMethods
        : [],
    );
    const methodOptions =
      askMethodOptions.length > 0 ? askMethodOptions : availableMethodOptions;
    const methodActions = methodOptions.map(function (method) {
      return contextAction(
        "reply-run",
        safeText(method.label || method.value) ||
          labelFrom(source, "actions.useMethod", "Use method"),
        {
          mode: "auth",
          selection: {
            kind: "auth_method",
            value: safeText(method.value || method.label),
          },
        },
        !session || session.authControlPending !== true,
      );
    });
    const authImportFiles =
      authAsk && Array.isArray(authAsk.files)
        ? authAsk.files
        : authHints && Array.isArray(authHints.files)
          ? authHints.files
          : session && Array.isArray(session.authImportFiles)
            ? session.authImportFiles
            : [];
    return {
      kind: "auth",
      title: labelFrom(
        source,
        "interaction.authenticationRequiredTitle",
        "Authentication required",
      ),
      message: safeText(
        (authAsk && authAsk.prompt) || authHints.prompt || session.authPrompt,
      ),
      actions: methodActions,
      auth: {
        phase: safeText(session && session.authPhase),
        challengeKind: safeText(session && session.authChallengeKind),
        hint: authHint,
        inputKind: safeText(session && session.authInputKind),
        acceptsChatInput: session && session.authAcceptsChatInput === true,
        authUrl: safeText(session && session.authUrl),
        userCode: safeText(session && session.authUserCode),
        lastError:
          safeText(session && session.authControlError) ||
          safeText(session && session.authLastError),
        actionPending: session && session.authControlPending === true,
        actionKind: safeText(session && session.authControlAction),
        uiHints: authHints,
        importFiles: authImportFiles,
        importRiskNoticeRequired:
          authAskHints.risk_notice_required === true ||
          authHints.risk_notice_required === true,
      },
    };
  }
  if (BUSY_STATES.has(normalized)) {
    return {
      kind: "running",
      title: labelFrom(
        source,
        "interaction.agentWorkingMessage",
        "Agent is working...",
      ),
      message: labelFrom(
        source,
        "interaction.agentWorkingMessage",
        "Agent is working...",
      ),
    };
  }
  if (isTerminalStatus(normalized)) {
    return {
      kind: "completed",
      title: labelFrom(
        source,
        "interaction.runCompletedTitle",
        "Run completed",
      ),
      message: normalized,
    };
  }
  return { kind: "hidden" };
}

function buildSkillRunnerContexts(envelope) {
  const drawer =
    envelope && envelope.drawer && typeof envelope.drawer === "object"
      ? envelope.drawer
      : null;
  const sections =
    drawer && Array.isArray(drawer.sections) ? drawer.sections : [];
  function makeTaskEntry(task, group, sectionTitle) {
    if (!task || typeof task !== "object") return;
    return {
      title:
        safeText(task.title) ||
        safeText(task.taskName) ||
        safeText(task.inputUnitLabel) ||
        "Task",
      subtitle:
        safeText(task.workflowLabel || task.stateLabel || task.status) ||
        safeText(group && (group.backendDisplayName || group.title)) ||
        sectionTitle,
      status: safeText(task.status || task.state),
      action: "select-task",
      payload: { taskKey: safeText(task.key || task.taskKey || task.id) },
      active: task.active === true || task.selected === true,
    };
  }
  function buildGroupEntry(group, sectionTitle) {
    if (!group || typeof group !== "object") return null;
    const children = [];
    (Array.isArray(group.activeTasks) ? group.activeTasks : []).forEach(
      function (task) {
        const entry = makeTaskEntry(task, group, sectionTitle);
        if (entry) children.push(entry);
      },
    );
    (Array.isArray(group.finishedTasks) ? group.finishedTasks : []).forEach(
      function (task) {
        const entry = makeTaskEntry(task, group, sectionTitle);
        if (entry) children.push(entry);
      },
    );
    const title = safeText(
      group.title || group.backendDisplayName || group.backendId,
    );
    if (!title && children.length === 0) return null;
    return {
      title: title || sectionTitle || "Tasks",
      subtitle: sectionTitle,
      disabled: true,
      kind: "group",
      children,
    };
  }
  const contexts = [];
  function appendUngroupedTasks(target, tasks, sectionTitle) {
    (Array.isArray(tasks) ? tasks : []).forEach(function (task) {
      const entry = makeTaskEntry(task, null, sectionTitle);
      if (entry) target.push(entry);
    });
  }
  sections.forEach(function (section) {
    if (!section || typeof section !== "object") return;
    const sectionTitle = safeText(section.title || section.id || "Tasks");
    const children = [];
    (Array.isArray(section.groups) ? section.groups : []).forEach(
      function (group) {
        const entry = buildGroupEntry(group, sectionTitle);
        if (entry) children.push(entry);
      },
    );
    appendUngroupedTasks(children, section.activeTasks, sectionTitle);
    appendUngroupedTasks(children, section.finishedTasks, sectionTitle);
    contexts.push({
      title: sectionTitle,
      disabled: true,
      kind: "group",
      children,
    });
  });
  if (contexts.length > 0) return contexts;
  const workspace =
    envelope && envelope.workspace && typeof envelope.workspace === "object"
      ? envelope.workspace
      : {};
  (Array.isArray(workspace.groups) ? workspace.groups : []).forEach(
    function (group) {
      const entry = buildGroupEntry(
        group,
        safeText(workspace.title || "Workspace"),
      );
      if (entry) contexts.push(entry);
    },
  );
  return contexts;
}

function appendSkillRunnerTasksFromGroups(groups, target) {
  (Array.isArray(groups) ? groups : []).forEach(function (group) {
    if (!group || typeof group !== "object") return;
    (Array.isArray(group.activeTasks) ? group.activeTasks : []).forEach(
      function (task) {
        if (task && typeof task === "object") target.push(task);
      },
    );
    (Array.isArray(group.finishedTasks) ? group.finishedTasks : []).forEach(
      function (task) {
        if (task && typeof task === "object") target.push(task);
      },
    );
  });
}

function findSkillRunnerPanelTask(envelope) {
  const workspace =
    envelope && envelope.workspace && typeof envelope.workspace === "object"
      ? envelope.workspace
      : {};
  const drawer =
    envelope && envelope.drawer && typeof envelope.drawer === "object"
      ? envelope.drawer
      : {};
  const selectedTaskKey = safeText(
    workspace.selectedTaskKey || envelope.selectedTaskKey,
  );
  const tasks = [];
  appendSkillRunnerTasksFromGroups(workspace.groups, tasks);
  (Array.isArray(drawer.sections) ? drawer.sections : []).forEach(
    function (section) {
      if (!section || typeof section !== "object") return;
      appendSkillRunnerTasksFromGroups(section.groups, tasks);
      (Array.isArray(section.activeTasks) ? section.activeTasks : []).forEach(
        function (task) {
          if (task && typeof task === "object") tasks.push(task);
        },
      );
      (Array.isArray(section.finishedTasks)
        ? section.finishedTasks
        : []
      ).forEach(function (task) {
        if (task && typeof task === "object") tasks.push(task);
      });
    },
  );
  if (selectedTaskKey) {
    const selected = tasks.find(function (task) {
      return safeText(task.key || task.taskKey || task.id) === selectedTaskKey;
    });
    if (selected) return selected;
  }
  return (
    tasks.find(function (task) {
      return task.active === true || task.selected === true;
    }) || null
  );
}

function decorateSkillRunnerWorkspaceTask(task, source) {
  if (!task || typeof task !== "object") return task;
  const taskKey = safeText(task.key || task.taskKey || task.id);
  const queueId = safeText(task.queueId);
  const canArchiveLocalRun = task.canArchiveLocalRun !== false;
  const terminal =
    task.terminal === true ||
    isTerminalStatus(task.status || task.state || task.stateLabel);
  const needsAttention = Boolean(task.attention);
  const applyState = normalizeApplyState(task);
  const applyLabel = applyStateLabel(source || task, applyState, task);
  const statusFields = taskStatusFields(task, source || task);
  return Object.assign({}, task, statusFields, {
    workflowLabel: buildSkillRunSecondaryLabel(task, source),
    attention: needsAttention ? "warning" : "",
    attentionLabel: needsAttention
      ? labelFrom(
          {},
          "interaction.needsUserInteraction",
          "Needs user interaction",
        )
      : "",
    applyState,
    applyStateLabel: applyLabel,
    applyTone: applyStateTone(applyState),
    itemActions: queueId
      ? [
          {
            action: "cancel-queued-workflow-unit",
            label: labelFrom(
              source,
              "actions.cancelQueuedWorkflowUnit",
              "Cancel queued workflow unit",
            ),
            icon: "cancel",
            enabled: true,
            payload: { queueId },
          },
        ]
      : terminal && canArchiveLocalRun
        ? [archiveItemAction("archive-run", "归档", { runKey: taskKey }, true)]
        : [],
  });
}

function decorateSkillRunnerWorkspaceSections(sections, source) {
  return (Array.isArray(sections) ? sections : []).map(function (section) {
    const next = Object.assign({}, section);
    if (Array.isArray(section && section.groups)) {
      next.groups = section.groups.map(function (group) {
        return Object.assign({}, group, {
          activeTasks: (Array.isArray(group && group.activeTasks)
            ? group.activeTasks
            : []
          ).map(function (task) {
            return decorateSkillRunnerWorkspaceTask(task, source);
          }),
          finishedTasks: (Array.isArray(group && group.finishedTasks)
            ? group.finishedTasks
            : []
          ).map(function (task) {
            return decorateSkillRunnerWorkspaceTask(task, source);
          }),
        });
      });
    }
    if (Array.isArray(section && section.activeTasks)) {
      next.activeTasks = section.activeTasks.map(function (task) {
        return decorateSkillRunnerWorkspaceTask(task, source);
      });
    }
    if (Array.isArray(section && section.finishedTasks)) {
      next.finishedTasks = section.finishedTasks.map(function (task) {
        return decorateSkillRunnerWorkspaceTask(task, source);
      });
    }
    return next;
  });
}

function buildSkillRunnerDetails(envelope, session) {
  const revisions = (
    Array.isArray(session && session.messages) ? session.messages : []
  ).filter(function (entry) {
    return (
      normalizeSkillRunnerMessageKind(entry && entry.kind) ===
      "assistant_revision"
    );
  });
  const latestRevision =
    revisions.length > 0 ? revisions[revisions.length - 1] : null;
  const applyState = normalizeApplyState(session);
  return [
    detailSection(labelFrom(envelope, "details.run", "Run"), [
      detailEntry("Title", session && session.title),
      detailEntry(
        labelFrom(envelope, "fields.requestId", "Request ID"),
        session && session.requestId,
      ),
      detailEntry(
        labelFrom(envelope, "fields.taskKey", "Task key"),
        envelope && envelope.workspace && envelope.workspace.selectedTaskKey,
      ),
      detailEntry(
        labelFrom(envelope, "fields.status", "Status"),
        session && session.status,
      ),
      detailEntry(
        labelFrom(envelope, "fields.terminal", "Terminal"),
        session && session.statusSemantics
          ? String(Boolean(session.statusSemantics.terminal))
          : "",
      ),
      detailEntry(
        labelFrom(envelope, "fields.waiting", "Waiting"),
        session && session.statusSemantics
          ? String(Boolean(session.statusSemantics.waiting))
          : "",
      ),
      detailEntry(
        labelFrom(envelope, "fields.backend", "Backend"),
        session && session.backendTitle,
      ),
      detailEntry(
        labelFrom(envelope, "fields.engine", "Engine"),
        session && session.engine,
      ),
      detailEntry(
        labelFrom(envelope, "fields.model", "Model"),
        session && session.model,
      ),
      detailEntry(
        labelFrom(envelope, "fields.updated", "Updated"),
        session && session.updatedAt,
      ),
      detailEntry(
        labelFrom(envelope, "fields.loading", "Loading"),
        session ? String(Boolean(session.loading)) : "",
      ),
      detailEntry(
        labelFrom(envelope, "fields.error", "Error"),
        session && session.error,
      ),
    ]),
    detailSection(
      labelFrom(envelope, "fields.deferredApply", "Deferred apply"),
      [
        detailEntry(
          labelFrom(envelope, "fields.status", "Status"),
          applyStateLabel(envelope, applyState, session) || applyState,
        ),
        detailEntry(
          labelFrom(envelope, "fields.applyAttempt", "Attempt"),
          session && session.applyAttempt ? String(session.applyAttempt) : "",
        ),
        detailEntry(
          labelFrom(envelope, "fields.applyMaxAttempt", "Max attempt"),
          session && session.applyMaxAttempt
            ? String(session.applyMaxAttempt)
            : "",
        ),
        detailEntry(
          labelFrom(envelope, "fields.applyNextRetry", "Next retry"),
          session && session.applyNextRetryAt,
        ),
        detailEntry(
          labelFrom(envelope, "fields.updated", "Updated"),
          session && session.applyUpdatedAt,
        ),
        detailEntry(
          labelFrom(envelope, "fields.error", "Error"),
          session && session.applyError,
        ),
      ],
    ),
    detailSection(labelFrom(envelope, "details.pending", "Pending"), [
      detailEntry("Interaction", session && session.pendingInteractionId),
      detailEntry("Kind", session && session.pendingKind),
      detailEntry("Prompt", session && session.pendingPrompt),
      detailEntry(
        "Options",
        Array.isArray(session && session.pendingOptions)
          ? String(session.pendingOptions.length)
          : "",
      ),
      detailEntry(
        "Required fields",
        Array.isArray(session && session.pendingRequiredFields)
          ? session.pendingRequiredFields.join(", ")
          : "",
      ),
      detailEntry("Auth session", session && session.authSessionId),
      detailEntry("Auth provider", session && session.authProviderId),
      detailEntry("Auth phase", session && session.authPhase),
      detailEntry("Auth engine", session && session.authEngine),
      detailEntry(
        "Auth methods",
        Array.isArray(session && session.authAvailableMethods)
          ? session.authAvailableMethods.join(", ")
          : "",
      ),
      detailEntry("Auth challenge", session && session.authChallengeKind),
      detailEntry("Auth error", session && session.authLastError),
    ]),
    detailSection(
      labelFrom(
        envelope,
        "details.conversationSummary",
        "Conversation Summary",
      ),
      [
        detailEntry(
          labelFrom(envelope, "fields.messages", "Messages"),
          Array.isArray(session && session.messages)
            ? String(session.messages.length)
            : "",
        ),
        detailEntry(
          labelFrom(envelope, "fields.latestTimestamp", "Latest timestamp"),
          Array.isArray(session && session.messages) &&
            session.messages.length > 0
            ? session.messages[session.messages.length - 1].ts
            : "",
        ),
        detailEntry(
          labelFrom(envelope, "fields.latestKind", "Latest kind"),
          Array.isArray(session && session.messages) &&
            session.messages.length > 0
            ? session.messages[session.messages.length - 1].kind
            : "",
        ),
      ],
    ),
    detailSection(
      labelFrom(envelope, "details.revisionSummary", "Revision Summary"),
      [
        detailEntry(
          labelFrom(envelope, "fields.count", "Count"),
          String(revisions.length),
        ),
        detailEntry(
          labelFrom(envelope, "fields.latest", "Latest"),
          latestRevision
            ? truncateText(
                skillRunnerMessageText(latestRevision) ||
                  JSON.stringify(latestRevision),
                500,
              )
            : "",
          latestRevision ? "code" : "text",
        ),
      ],
      {
        kind: "revisions",
        summary: labelFrom(
          envelope,
          "details.compactRevision",
          "Compact revision metadata",
        ),
        collapsible: true,
        defaultCollapsed: true,
      },
    ),
  ].filter(Boolean);
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

function projectSkillRunnerPanelSnapshot(snapshot) {
  const envelope = snapshot && typeof snapshot === "object" ? snapshot : {};
  const hasSessionField = Object.prototype.hasOwnProperty.call(
    envelope,
    "session",
  );
  const selectedSession = hasSessionField
    ? envelope.session && typeof envelope.session === "object"
      ? envelope.session
      : null
    : envelope;
  const hasSelection = selectedSession !== null;
  const session = selectedSession || {};
  const status = hasSelection
    ? normalizeStatusToken(session.status || "idle")
    : "unavailable";
  const conversation = buildSkillRunnerConversationView(session, envelope);
  let interaction = buildSkillRunnerPendingInteraction(
    session,
    status,
    envelope,
  );
  const pendingPermission =
    session.pendingPermission && typeof session.pendingPermission === "object"
      ? session.pendingPermission
      : null;
  if (pendingPermission) {
    interaction = {
      kind: "permission",
      title:
        safeText(pendingPermission.source) === "zotero-mcp-write"
          ? labelFrom(
              envelope,
              "permission.zoteroWriteApproval",
              "Zotero write approval",
            )
          : labelFrom(
              envelope,
              "permission.acpToolApproval",
              "ACP tool approval",
            ),
      message:
        safeText(pendingPermission.summary) ||
        safeText(pendingPermission.toolTitle || pendingPermission.requestId) ||
        labelFrom(
          envelope,
          "permission.skillRunnerApproval",
          "SkillRunner requests approval.",
        ),
      detail: safeText(pendingPermission.detail),
      source: safeText(pendingPermission.source),
      permission: pendingPermission,
      actions: (Array.isArray(pendingPermission.options)
        ? pendingPermission.options
        : []
      )
        .map(function (option) {
          return contextAction(
            "resolve-permission",
            safeText(option.name || option.label || option.optionId) ||
              labelFrom(envelope, "actions.approve", "Approve"),
            {
              requestId: safeText(session.requestId || session.id),
              permissionRequestId: safeText(pendingPermission.requestId),
              outcome: "selected",
              optionId: safeText(option.optionId || option.id),
            },
            true,
          );
        })
        .concat([
          contextAction(
            "resolve-permission",
            labelFrom(envelope, "actions.cancel", "Cancel"),
            {
              requestId: safeText(session.requestId || session.id),
              permissionRequestId: safeText(pendingPermission.requestId),
              outcome: "cancelled",
              optionId: "",
            },
            true,
            "danger",
          ),
        ]),
    };
  }
  const selectedTask = hasSelection ? findSkillRunnerPanelTask(envelope) : null;
  const requestAssigned =
    selectedTask && typeof selectedTask.requestAssigned === "boolean"
      ? selectedTask.requestAssigned
      : session && typeof session.requestAssigned === "boolean"
        ? session.requestAssigned
        : Boolean(safeText(session.requestId || session.id));
  const backendInteractive =
    selectedTask && typeof selectedTask.backendInteractive === "boolean"
      ? selectedTask.backendInteractive
      : session && typeof session.backendInteractive === "boolean"
        ? session.backendInteractive
        : requestAssigned;
  const canCancelBackendRun =
    selectedTask && typeof selectedTask.canCancelBackendRun === "boolean"
      ? selectedTask.canCancelBackendRun
      : session && typeof session.canCancelBackendRun === "boolean"
        ? session.canCancelBackendRun
        : backendInteractive && !isTerminalStatus(status);
  const canReply =
    selectedTask && typeof selectedTask.canReply === "boolean"
      ? selectedTask.canReply
      : session && typeof session.canReply === "boolean"
        ? session.canReply
        : backendInteractive &&
          (status === "waiting-user" || status === "waiting-auth");
  const skillRunnerBusy =
    backendInteractive && (status === "running" || status === "prompting");
  const skillRunnerAuthInputVisible =
    status === "waiting-auth" &&
    interaction &&
    interaction.auth &&
    interaction.auth.acceptsChatInput === true &&
    !!safeText(interaction.auth.inputKind) &&
    !["import_files", "custom_provider"].includes(
      safeText(interaction.auth.inputKind),
    ) &&
    safeText(interaction.auth.phase) !== "method_selection";
  const skillRunnerAuthActionPending =
    status === "waiting-auth" &&
    interaction &&
    interaction.auth &&
    interaction.auth.actionPending === true;
  const skillRunnerAuthInputEnabled =
    canReply && skillRunnerAuthInputVisible && !skillRunnerAuthActionPending;
  const skillRunnerAuthInputKind = safeText(
    interaction && interaction.auth && interaction.auth.inputKind,
  );
  const skillRunnerAuthHint = safeText(
    interaction && interaction.auth && interaction.auth.hint,
  );
  const skillRunnerAuthPlaceholder = skillRunnerAuthInputEnabled
    ? skillRunnerAuthHint ||
      (skillRunnerAuthInputKind === "api_key"
        ? labelFrom(envelope, "authPasteApiKey", "Paste API key")
        : labelFrom(envelope, "authPasteCode", "Paste authorization code"))
    : labelFrom(envelope, "authInProgress", "Awaiting auth state update...");
  const skillRunnerAuthSubmitLabel = skillRunnerAuthInputEnabled
    ? skillRunnerAuthInputKind === "api_key"
      ? labelFrom(envelope, "authSubmitApiKey", "Submit API Key")
      : labelFrom(envelope, "authSubmitCode", "Submit Code")
    : labelFrom(envelope, "authAwaiting", "Awaiting");
  const skillRunnerSecondaryLabel = buildSkillRunSecondaryLabel(
    selectedTask,
    session,
    envelope,
  );
  const controlIndicator = hasSelection
    ? buildSkillRunnerControlIndicator(
        Object.assign({}, session, selectedTask || {}, {
          status,
          requestAssigned,
          backendInteractive,
          canReply,
          pendingPermission,
        }),
        envelope,
        status,
      )
    : indicator(
        "skillrunner-control",
        labelFrom(envelope, "fields.control", "Interaction"),
        labelFrom(envelope, "status.controlUnavailable", "Unavailable"),
        "muted",
        labelFrom(envelope, "status.controlUnavailable", "Unavailable"),
      );
  const autoReplyIndicator = hasSelection
    ? buildSkillRunnerAutoReplyIndicator(
        Object.assign({}, session, selectedTask || {}),
        envelope,
      )
    : null;
  const skillRunnerMetadata = [
    {
      key: "backend",
      label: labelFrom(envelope, "fields.backend", "Backend"),
      value: safeText(session.backendTitle),
    },
    {
      key: "engine",
      label: labelFrom(envelope, "fields.engine", "Engine"),
      value: safeText(session.engine),
    },
    {
      key: "model",
      label: labelFrom(envelope, "fields.model", "Model"),
      value: safeText(session.model),
    },
    {
      key: "updatedAt",
      label: labelFrom(envelope, "fields.updated", "Updated"),
      value: safeText(session.updatedAt),
    },
  ];
  return normalizeAssistantPanelSnapshot({
    kind: "skillrunner",
    labels:
      envelope.labels && typeof envelope.labels === "object"
        ? envelope.labels
        : {},
    messageCounts: envelope.messageCounts,
    context: {
      id: safeText(session.requestId || session.id),
      title:
        safeText(session.title || envelope.title) || "SkillRunner Workspace",
      subtitle: hasSelection
        ? skillRunnerSecondaryLabel || safeText(session.requestId)
        : labelFrom(envelope, "emptyState.noTask", "No task"),
      status,
      statusLabel: statusLabel(envelope, status),
      backendId: safeText(session.backendId),
      backendLabel: safeText(session.backendTitle),
      metadata: hasSelection
        ? skillRunnerMetadata.filter(function (entry) {
            return Boolean(entry.value);
          })
        : skillRunnerMetadata,
      indicators: [controlIndicator, autoReplyIndicator].filter(Boolean),
      actions: [
        contextAction(
          "cancel-run",
          labelFrom(envelope, "actions.cancelRun", "Cancel Task"),
          { requestId: safeText(session.requestId) },
          canCancelBackendRun && !isTerminalStatus(status),
          "danger",
        ),
      ],
    },
    lifecycle: {
      connectionState: "managed-by-skillrunner",
      executionState: status,
      applyState: normalizeApplyState(selectedTask || session),
      terminal: isTerminalStatus(status),
    },
    conversation,
    plan: conversation.plan,
    interaction,
    reply: {
      enabled: pendingPermission
        ? false
        : status === "waiting-auth"
          ? skillRunnerAuthInputEnabled
          : canReply || skillRunnerBusy,
      inputEnabled: pendingPermission
        ? false
        : status === "waiting-auth"
          ? skillRunnerAuthInputEnabled
          : canReply && status === "waiting-user",
      placeholder:
        status === "waiting-auth"
          ? skillRunnerAuthPlaceholder
          : labelFrom(
              envelope,
              "reply.placeholderSkillRunner",
              "Reply to the pending SkillRunner interaction...",
            ),
      submitLabel:
        status === "waiting-auth"
          ? skillRunnerAuthSubmitLabel
          : skillRunnerBusy
            ? labelFrom(envelope, "actions.cancel", "Cancel")
            : labelFrom(envelope, "actions.send", "Send"),
      sending: skillRunnerAuthActionPending,
      action: skillRunnerBusy ? "cancel-run" : "reply-run",
      payload: {},
      tone: skillRunnerBusy ? "danger" : "primary",
      clearOnSend: !skillRunnerBusy,
      hint: labelFrom(
        envelope,
        "reply.shortcut",
        "Ctrl+Enter / Cmd+Enter to send",
      ),
    },
    drawers: {
      layout: "skillrunner-workspace",
      contextTitle: labelFrom(envelope, "actions.runs", "Runs"),
      detailsTitle: labelFrom(envelope, "details.title", "SkillRunner Details"),
      contexts: buildSkillRunnerContexts(envelope),
      skillrunnerSections: decorateSkillRunnerWorkspaceSections(
        envelope.drawer && Array.isArray(envelope.drawer.sections)
          ? envelope.drawer.sections
          : [],
        envelope,
      ),
      selectedTaskKey: safeText(
        envelope.workspace && envelope.workspace.selectedTaskKey,
      ),
      notice: safeText(envelope.drawer && envelope.drawer.notice),
      labels: assistantDrawerLabels(envelope),
      details: buildSkillRunnerDetails(envelope, session),
    },
    actions: {
      toolbar: [
        {
          action: "open-context-drawer",
          label: labelFrom(envelope, "actions.runs", "Runs"),
          enabled: true,
        },
        {
          action: "open-details-drawer",
          label: labelFrom(envelope, "actions.details", "Details"),
          enabled: hasSelection,
        },
        {
          action: "open-backend-manager",
          label: labelFrom(
            envelope,
            "actions.manageBackends",
            "Manage Backends",
          ),
          enabled: true,
        },
        Object.assign(buildExecutionDisplayModeAction(envelope), {
          enabled: true,
        }),
      ],
      context: [],
      details: [
        {
          action: "copy-request-id",
          label: labelFrom(envelope, "actions.copyId", "Copy ID"),
          payload: { requestId: safeText(session && session.requestId) },
          enabled: Boolean(session && session.requestId),
        },
        {
          action: "copy-diagnostics",
          label: labelFrom(
            envelope,
            "actions.copyDiagnostics",
            "Copy Diagnostics",
          ),
          payload: { requestId: safeText(session && session.requestId) },
        },
      ],
    },
    raw: envelope,
  });
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
  return {
    key,
    action:
      owner && owner.source === "acp-chat"
        ? "set-active-conversation"
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
    attention: safeText(entry && (entry.attention || entry.description))
      ? "warning"
      : "",
    attentionLabel: safeText(entry && (entry.attention || entry.description)),
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
  return sections;
}

function exactWorkspaceEmptyChrome(source, sourceLabels, labelSource) {
  const chat = source.source === "acp-chat";
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
  const hasAvailableAcpBackend =
    source.source === "acp-chat" &&
    Array.isArray(navigation.groups) &&
    navigation.groups.some(function (group) {
      return Boolean(safeText(group && group.groupId));
    });
  const emptyChrome =
    owner || hasAvailableAcpBackend
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
            (source.source === "acp-chat" ? "ACP Chat" : "ACP Skills"),
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
  if (owner && control.connection) {
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
    source.source === "acp-chat" && !hasAvailableAcpBackend
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
  const connectionStatus = safeText(
    control.connection && control.connection.status,
  );
  if (source.source === "acp-chat" && hasAvailableAcpBackend) {
    contextActions.push({
      action: "connect",
      label:
        connectionStatus === "connecting"
          ? labelFrom(labelSource, "actions.connecting", "Connecting...")
          : labelFrom(labelSource, "actions.connect", "Connect"),
      enabled: owner ? control.connection.canConnect === true : true,
      payload: { groupId: selectedGroupId },
    });
  }
  if (owner && control.connection) {
    if (source.source !== "acp-chat") {
      contextActions.push({
        action: "connect-run",
        label:
          connectionStatus === "connecting"
            ? labelFrom(labelSource, "actions.connecting", "Connecting...")
            : labelFrom(labelSource, "actions.connect", "Connect"),
        enabled: control.connection.canConnect === true,
        payload: {},
      });
    }
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
  if (source.source === "acp-skills" && owner && control.execution) {
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
    reply: {
      enabled: replyEnabled,
      inputEnabled: replyEnabled && !replyBusy,
      placeholder:
        source.source === "acp-chat"
          ? labelFrom(
              labelSource,
              "reply.placeholderAcpChat",
              "Ask the active ACP backend…",
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
          : labelFrom(labelSource, "actions.send", "Send"),
      sending: replyBusy,
      action: replyBusy
        ? source.source === "acp-chat"
          ? "cancel"
          : "interrupt-run-turn"
        : source.source === "acp-chat"
          ? "send-prompt"
          : "reply-run",
      payload: {},
      tone: replyBusy ? "danger" : "primary",
      controls: [
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
                label: labelFrom(labelSource, "options.default", "Default"),
                description: "",
              }
            : null,
        ),
      ],
      showUsageGauge: true,
      value: safeText(local.replyDraft),
    },
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

const AssistantPanelKind = PANEL_KINDS.slice();

export {
  AssistantPanelKind,
  normalizeAssistantPanelSnapshot,
  normalizeStatusToken,
  statusTone,
  isTerminalStatus,
  projectAssistantWorkspacePanel,
  projectSkillRunnerPanelSnapshot,
  contextSelector,
  contextAction,
};
