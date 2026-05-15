(function () {
  "use strict";

  const PANEL_KINDS = ["acp-chat", "acp-skills", "skillrunner"];
  const SESSION_PICKER_LIMIT = 8;
  const SESSION_PICKER_SHOW_MORE_VALUE = "__show_more__";
  const TERMINAL_STATES = new Set(["succeeded", "failed", "canceled", "cancelled", "done"]);
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
    if (["failed", "error", "errored", "disconnected", "closed"].indexOf(token) >= 0) {
      return "error";
    }
    if (["waiting-user", "waiting_user", "permission-required", "auth-required"].indexOf(token) >= 0) {
      return "warning";
    }
    if (["succeeded", "success", "done", "completed", "connected", "active"].indexOf(token) >= 0) {
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

  function conversationHelper() {
    return window.AssistantConversationView &&
      typeof window.AssistantConversationView === "object"
      ? window.AssistantConversationView
      : null;
  }

  function fallbackConversationView(items) {
    return {
      items: Array.isArray(items) ? items : [],
      plan: { entries: [], activeEntries: [], active: false },
      interaction: { kind: "hidden" },
      usage: null,
    };
  }

  function metadataItem(label, value, key) {
    const text = safeText(value);
    if (!text) return null;
    return { key: key || safeText(label).toLowerCase(), label: label, value: text };
  }

  function compactMetadata(items) {
    return items.filter(Boolean);
  }

  function panelLabelRoot(source) {
    const labels = source && source.labels && typeof source.labels === "object" ? source.labels : {};
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

  function normalizeOption(entry, idKeys, labelKeys) {
    const primitive = entry === null || entry === undefined ? "" : safeText(entry);
    const source = entry && typeof entry === "object" ? entry : { id: primitive, value: primitive, label: primitive };
    const id = idKeys
      .map(function (key) {
        return safeText(source[key]);
      })
      .find(Boolean);
    const label = labelKeys
      .map(function (key) {
        return safeText(source[key]);
      })
      .find(Boolean);
    return Object.assign({}, source, {
      value: id || label,
      label: label || id || "-",
    });
  }

  function normalizeSelectableOption(entry, kind) {
    const normalizedKind = safeText(kind);
    const idKeys =
      normalizedKind === "mode"
        ? ["id", "value", "modeId"]
        : normalizedKind === "model"
          ? ["id", "value", "modelId", "rawModelId"]
          : normalizedKind === "reasoning"
            ? ["id", "value", "effortId", "reasoningEffortId"]
            : ["id", "value"];
    return normalizeOption(entry, idKeys, [
      "label",
      "name",
      "title",
      "displayName",
      "id",
      "value",
    ]);
  }

  function selectableCurrentValue(current, kind) {
    if (current && typeof current === "object") {
      return normalizeSelectableOption(current, kind).value;
    }
    return safeText(current);
  }

  function contextSelector(id, label, value, options, action, disabled, payloadKey) {
    return {
      id,
      label,
      value: safeText(value),
      options: Array.isArray(options) ? options : [],
      action,
      disabled: disabled === true,
      payloadKey: safeText(payloadKey),
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

  function indicator(id, label, value, tone, title) {
    return {
      id: safeText(id),
      label: safeText(label),
      value: safeText(value),
      tone: safeText(tone || "muted"),
      title: safeText(title || value || label),
    };
  }

  function connectionIndicator(state, errorText) {
    const token = normalizeStatusToken(state || "idle");
    if (["connected", "active"].indexOf(token) >= 0) {
      return indicator("connection", "Connection", "Connected", "success", "ACP connection is active.");
    }
    if (["connecting", "initializing", "checking-command", "spawning"].indexOf(token) >= 0) {
      return indicator("connection", "Connection", "Connecting", "accent", "ACP backend is connecting.");
    }
    if (["failed", "error", "closed", "disconnected"].indexOf(token) >= 0) {
      return indicator(
        "connection",
        "Connection",
        token === "disconnected" ? "Disconnected" : "Error",
        token === "disconnected" ? "muted" : "error",
        safeText(errorText) || "ACP connection is not active.",
      );
    }
    return indicator("connection", "Connection", "Disconnected", "muted", "ACP connection is not active.");
  }

  function latestDiagnosticLike(entries, predicate) {
    const list = Array.isArray(entries) ? entries : [];
    for (let index = list.length - 1; index >= 0; index -= 1) {
      const entry = list[index] || {};
      if (predicate(entry)) return entry;
    }
    return null;
  }

  function indicatorToneFromSeverity(severity, fallback) {
    const token = safeText(severity).toLowerCase();
    if (["ok", "ready", "active", "success", "info"].indexOf(token) >= 0) return "success";
    if (["warning", "warn"].indexOf(token) >= 0) return "warning";
    if (["error", "failed", "failure"].indexOf(token) >= 0) return "error";
    return fallback || "muted";
  }

  function buildAcpMcpIndicator(source) {
    const snap = source && typeof source === "object" ? source : {};
    const health = snap.mcpHealth && typeof snap.mcpHealth === "object" ? snap.mcpHealth : null;
    if (health) {
      const state = normalizeStatusToken(health.state || "");
      const severity = safeText(health.severity || "");
      const readyStates = ["listening", "injected", "handshake-seen", "tools-seen"];
      const tone =
        readyStates.indexOf(state) >= 0
          ? "success"
          : state === "starting"
            ? "accent"
            : state === "unavailable"
              ? "warning"
              : indicatorToneFromSeverity(severity, "muted");
      const value =
        tone === "success"
          ? "Ready"
          : tone === "accent"
            ? "Starting"
            : tone === "warning"
              ? "Limited"
              : tone === "error"
                ? "Error"
                : "Pending";
      const tooltip = Array.isArray(health.tooltip)
        ? health.tooltip.join("\n")
        : safeText(health.summary || health.state || "Zotero MCP status");
      return indicator("mcp", "MCP", value, tone, tooltip);
    }
    const diagnostics = Array.isArray(snap.diagnostics) ? snap.diagnostics : [];
    const found = latestDiagnosticLike(diagnostics, function (entry) {
      const kind = safeText(entry.kind || entry.stage).toLowerCase();
      const message = safeText(entry.message).toLowerCase();
      return kind.indexOf("mcp") >= 0 || message.indexOf("mcp") >= 0;
    });
    if (found) {
      const level = safeText(found.level);
      return indicator(
        "mcp",
        "MCP",
        level === "error" ? "Error" : level === "warn" || level === "warning" ? "Limited" : "Ready",
        indicatorToneFromSeverity(level, "success"),
        safeText(found.message || found.detail) || "Zotero MCP diagnostic",
      );
    }
    return indicator("mcp", "MCP", "Pending", "muted", "Zotero MCP status pending.");
  }

  function buildAcpSkillMcpIndicator(panel, run) {
    const snap = panel && typeof panel === "object" ? panel : {};
    if (snap.mcpHealth && typeof snap.mcpHealth === "object") {
      return buildAcpMcpIndicator(snap);
    }
    const source = run && typeof run === "object" ? run : {};
    const entries = []
      .concat(Array.isArray(source.events) ? source.events : [])
      .concat(Array.isArray(source.transcriptItems) ? source.transcriptItems : []);
    const found = latestDiagnosticLike(entries, function (entry) {
      const stage = safeText(entry.stage || entry.kind || entry.label).toLowerCase();
      const message = safeText(entry.message || entry.text).toLowerCase();
      return stage.indexOf("mcp") >= 0 || message.indexOf("mcp") >= 0;
    });
    if (!found) return indicator("mcp", "MCP", "Pending", "muted", "Zotero MCP status pending.");
    const level = safeText(found.level);
    return indicator(
      "mcp",
      "MCP",
      level === "error" ? "Error" : level === "warn" || level === "warning" ? "Limited" : "Ready",
      indicatorToneFromSeverity(level, "success"),
      safeText(found.message || found.text) || "Zotero MCP diagnostic",
    );
  }

  function buildSessionPickerOptions(options, activeConversationId) {
    const allOptions = (Array.isArray(options) ? options : []).map(function (entry) {
      return normalizeOption(entry, ["conversationId", "id", "value"], ["title", "label"]);
    });
    if (allOptions.length <= SESSION_PICKER_LIMIT) {
      return { options: allOptions, hasMore: false };
    }
    let visibleOptions = allOptions.slice(0, SESSION_PICKER_LIMIT);
    const activeId = safeText(activeConversationId);
    const activeVisible = visibleOptions.some(function (entry) {
      return safeText(entry.conversationId || entry.value) === activeId;
    });
    if (activeId && !activeVisible) {
      const activeEntry = allOptions.find(function (entry) {
        return safeText(entry.conversationId || entry.value) === activeId;
      });
      if (activeEntry) {
        visibleOptions = visibleOptions.slice(0, Math.max(0, SESSION_PICKER_LIMIT - 1));
        visibleOptions.push(activeEntry);
      }
    }
    visibleOptions.push({
      value: SESSION_PICKER_SHOW_MORE_VALUE,
      label: "Show more...",
      sentinel: "show-more",
      action: "open-context-drawer",
    });
    return { options: visibleOptions, hasMore: true };
  }

  function selectorPayloadKey(id, action) {
    const normalizedId = safeText(id);
    const normalizedAction = safeText(action);
    if (normalizedAction === "set-mode" || normalizedId === "mode") return "modeId";
    if (normalizedAction === "set-model" || normalizedId === "model") return "modelId";
    if (normalizedAction === "set-reasoning-effort" || normalizedId === "reasoning") return "effortId";
    if (normalizedAction === "set-active-backend" || normalizedId === "backend") return "backendId";
    if (normalizedAction === "set-active-conversation" || normalizedId === "conversation") {
      return "conversationId";
    }
    return "";
  }

  function buildReplySelectControl(id, label, value, options, action, disabled) {
    return contextSelector(
      id,
      label,
      selectableCurrentValue(value, id),
      (Array.isArray(options) ? options : []).map(function (entry) {
        return normalizeSelectableOption(entry, id);
      }),
      action,
      disabled,
      selectorPayloadKey(id, action),
    );
  }

  function buildAcpPermissionInteraction(snap, baseInteraction) {
    const request = snap && snap.pendingPermissionRequest;
    if (!request) return baseInteraction;
    const options = Array.isArray(request.options) ? request.options : [];
    return {
      kind: "permission",
      title:
        safeText(request.source) === "zotero-mcp-write"
          ? labelFrom(snap, "permission.zoteroWriteApproval", "Zotero write approval")
          : (snap.labels && snap.labels.permission) ||
            labelFrom(snap, "permission.acpToolApproval", "ACP tool approval"),
      message:
        safeText(request.summary) ||
        safeText(request.title || request.toolTitle || request.command || request.commandLine) ||
        labelFrom(snap, "permission.acpBackendApproval", "ACP backend requests approval."),
      detail: safeText(request.detail),
      source: safeText(request.source),
      permission: request,
      actions: options.map(function (option) {
        return contextAction(
          "resolve-permission",
          safeText(option.name || option.label || option.optionId) ||
            labelFrom(snap, "actions.approve", "Approve"),
          {
            outcome: "selected",
            optionId: safeText(option.optionId || option.id),
          },
          true,
        );
      }).concat([
        contextAction(
          "resolve-permission",
          labelFrom(snap, "actions.cancel", "Cancel"),
          { outcome: "cancelled" },
          true,
          "danger",
        ),
      ]),
    };
  }

  function buildAcpChatDetails(snap) {
    const labels = snap.labels || {};
    const diagnostics = Array.isArray(snap.diagnostics) ? snap.diagnostics : [];
    return [
      detailSection(labelFrom(snap, "details.session", "Session"), [
        detailEntry(labelFrom(snap, "fields.target", labels.target || "Target"), snap.targetLabel),
        detailEntry(labelFrom(snap, "fields.agent", labels.agent || "Agent"), snap.agentLabel || snap.agentVersion),
        detailEntry(labelFrom(snap, "fields.session", labels.session || "Session"), snap.sessionId || snap.remoteSessionId),
        detailEntry(labelFrom(snap, "fields.remoteSession", labels.remoteSession || "Remote session"), snap.remoteSessionId),
        detailEntry(labelFrom(snap, "fields.remoteRestore", labels.remoteRestore || "Remote restore"), snap.remoteSessionRestoreStatus),
        detailEntry(labelFrom(snap, "fields.stopReason", labels.stopReason || "Stop reason"), snap.lastStopReason),
      ]),
      detailSection(labelFrom(snap, "details.paths", "Paths"), [
        detailEntry(labelFrom(snap, "fields.workspace", labels.workspace || "Workspace"), snap.agentWorkspaceDir || snap.sessionCwd),
        detailEntry(labelFrom(snap, "fields.hostContext", labels.hostContext || "Host Context"), snap.hostContextSummary),
      ]),
      detailSection(
        labelFrom(snap, "details.diagnostics", labels.diagnostics || "Diagnostics"),
        diagnostics.slice(-12).map(function (entry) {
          return detailEntry(
            safeText(entry.kind || entry.level || "diagnostic"),
            truncateText(entry.message || entry.detail || entry.error || JSON.stringify(entry), 600),
            entry.detail ? "code" : "text",
          );
        }).concat([
          detailEntry(labelFrom(snap, "fields.commandLine", labels.commandLine || "Command line"), snap.commandLine, "code"),
          detailEntry(labelFrom(snap, "fields.stderr", labels.stderrTail || "stderr"), snap.stderrTail, "code"),
          detailEntry(labelFrom(snap, "fields.error", labels.errorPrefix || "Error"), snap.lastError || snap.prerequisiteError),
        ]),
        {
          kind: "diagnostics",
          summary: labelFrom(snap, "details.recentDiagnostics", "Recent runtime diagnostics"),
          collapsible: true,
          defaultCollapsed: true,
        },
      ),
    ].filter(Boolean);
  }

  function buildAcpSkillDetails(run, logs, source) {
    if (!run) return [];
    const revisions = Array.isArray(run.outputRevisions) ? run.outputRevisions : [];
    return [
      detailSection(labelFrom(source, "details.runPaths", "Run paths"), [
        detailEntry(labelFrom(source, "fields.workspace", "Workspace"), run.workspaceDir),
        detailEntry(labelFrom(source, "fields.runtimeState", "Runtime state"), run.runtimeDir),
        detailEntry(labelFrom(source, "fields.auditArtifact", "Audit artifact"), run.inputManifestPath),
        detailEntry(labelFrom(source, "fields.resultArtifact", "Result artifact"), run.resultJsonPath),
      ]),
      detailSection(labelFrom(source, "details.runner", "Runner"), [
        detailEntry(labelFrom(source, "fields.backend", "Backend"), run.backendLabel || run.backendId),
        detailEntry("Agent family", run.agentFamily),
        detailEntry("ACP " + labelFrom(source, "fields.mode", "mode"), run.acpModeId),
        detailEntry("ACP " + labelFrom(source, "fields.model", "model"), run.acpModelId),
        detailEntry(labelFrom(source, "fields.reasoning", "Reasoning"), run.acpReasoningEffort),
        detailEntry("Raw model", run.acpRawModelId),
        detailEntry("Skill", run.skillId),
        detailEntry("Skill roots", Array.isArray(run.skillRoots) ? run.skillRoots.join("\n") : "", "code"),
        detailEntry(labelFrom(source, "fields.session", "Session"), run.sessionId),
      ]),
      detailSection(labelFrom(source, "details.validation", "Validation"), [
        detailEntry(labelFrom(source, "fields.status", "Status"), run.validationStatus),
        detailEntry(labelFrom(source, "fields.repairRounds", "Repair rounds"), String(run.repairRounds || 0)),
        detailEntry(labelFrom(source, "fields.errors", "Errors"), Array.isArray(run.validationErrors) ? run.validationErrors.join("\n") : "", "code"),
        detailEntry("Run error", run.error),
        detailEntry(labelFrom(source, "fields.conversation", "Conversation"), run.conversationState),
        detailEntry("Conversation error", run.conversationError),
        detailEntry(labelFrom(source, "fields.applyResult", "Apply result"), run.applyResultState),
        detailEntry(labelFrom(source, "fields.appliedAt", "Applied at"), run.appliedAt),
      ]),
      detailSection(labelFrom(source, "details.runtimeDependencies", "Runtime Dependencies"), [
        detailEntry(labelFrom(source, "fields.status", "Status"), run.runtimeDependencyStatus),
        detailEntry(
          labelFrom(source, "fields.runtimeDependencies", "Runtime Dependencies"),
          Array.isArray(run.runtimeDependencies) ? run.runtimeDependencies.join("\n") : "",
          "code",
        ),
        detailEntry(labelFrom(source, "fields.error", "Error"), run.runtimeDependencyError),
      ]),
      detailSection(
        labelFrom(source, "details.outputRevisions", "Output Revisions"),
        revisions.slice().reverse().map(function (revision) {
          return detailEntry(
            "round " + String(Number(revision.repairRound || 0)) + " · " + safeText(revision.status || "unknown"),
            [
              Array.isArray(revision.errors) && revision.errors.length > 0 ? revision.errors.join("\n") : "",
              revision.replacementReason || "",
              truncateText(revision.candidateText, 600),
            ].filter(Boolean).join("\n\n"),
            "code",
          );
        }),
        {
          kind: "revisions",
          summary: String(revisions.length) + " " + labelFrom(source, "details.revisionCandidates", "revision candidates"),
          collapsible: true,
          defaultCollapsed: true,
        },
      ),
      detailSection(
        labelFrom(source, "details.runtimeLogs", "Runtime Logs"),
        (Array.isArray(logs) ? logs : []).slice(-20).map(function (log) {
          return detailEntry(
            safeText(log.level || log.stage || "log"),
            truncateText(log.message || JSON.stringify(log), 600),
            "code",
          );
        }),
        {
          kind: "logs",
          summary: labelFrom(source, "details.recentLogs", "Recent runtime log entries"),
          collapsible: true,
          defaultCollapsed: true,
        },
      ),
      detailSection(labelFrom(source, "details.resultJson", "Result JSON"), [
        detailEntry("result", run.resultJson ? JSON.stringify(run.resultJson, null, 2) : "", "code"),
      ], {
        kind: "result",
        summary: labelFrom(source, "details.validatedOutput", "Validated workflow output"),
        collapsible: true,
        defaultCollapsed: true,
      }),
    ].filter(Boolean);
  }

  function normalizeSkillRunnerMessageRole(role) {
    const value = safeText(role).toLowerCase();
    return value === "assistant" || value === "user" || value === "system" ? value : "system";
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
    return safeText(entry && (entry.displayText || entry.display_text || entry.text || entry.summary));
  }

  function skillRunnerProcessType(entry) {
    const source = entry && typeof entry === "object" ? entry : {};
    const correlation = source.correlation && typeof source.correlation === "object"
      ? source.correlation
      : {};
    return safeText(
      source.processType ||
      source.process_type ||
      source.processKind ||
      correlation.process_type ||
      correlation.classification,
    ).trim().toLowerCase();
  }

  function isSkillRunnerToolProcess(processType) {
    const value = safeText(processType).trim().toLowerCase();
    return value === "tool_call" || value === "command_execution";
  }

  function skillRunnerToolDetails(source) {
    const correlation = source && source.correlation && typeof source.correlation === "object"
      ? source.correlation
      : {};
    const details = correlation.details && typeof correlation.details === "object"
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
    const state = safeText(source.state || source.status || tool.correlation.state || tool.correlation.status)
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
      label: "Thinking",
      text: skillRunnerMessageText(entry),
      createdAt: entry && entry.ts,
    };
  }

  function skillRunnerMessageId(entry) {
    const correlation = entry && entry.correlation && typeof entry.correlation === "object"
      ? entry.correlation
      : {};
    return safeText(correlation.message_id || entry.messageId);
  }

  function buildSkillRunnerConversationView(session) {
    const messages = Array.isArray(session && session.messages) ? session.messages : [];
    const revisions = new Map();
    messages.forEach(function (entry) {
      if (normalizeSkillRunnerMessageKind(entry && entry.kind) !== "assistant_revision") return;
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
        const revision = messageId && revisions.has(messageId)
          ? {
              count: 1,
              latestStatus: "replaced",
              latestRepairRound: Number(entry && entry.attempt || 1),
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
    return fallbackConversationView(items);
  }

  function normalizeSkillRunnerOptionList(raw) {
    return (Array.isArray(raw) ? raw : [])
      .map(function (option) {
        if (typeof option === "string" || typeof option === "number" || typeof option === "boolean") {
          const text = safeText(option);
          return text ? { label: text, value: text } : null;
        }
        if (!option || typeof option !== "object") return null;
        const label =
          safeText(option.label) ||
          safeText(option.name) ||
          safeText(option.title) ||
          safeText(option.value);
        const value =
          safeText(option.value) ||
          safeText(option.reply) ||
          safeText(option.message) ||
          label;
        return label && value ? { label, value } : null;
      })
      .filter(Boolean);
  }

  function buildSkillRunnerPendingInteraction(session, status) {
    const normalized = normalizeStatusToken(status);
    const askUser = session && session.pendingAskUser && typeof session.pendingAskUser === "object"
      ? session.pendingAskUser
      : null;
    const uiHints = session && session.pendingUiHints && typeof session.pendingUiHints === "object"
      ? session.pendingUiHints
      : askUser && askUser.ui_hints && typeof askUser.ui_hints === "object"
        ? askUser.ui_hints
        : {};
    if (normalized === "waiting-user") {
      return {
        kind: "waiting_user",
        title: "User input required",
        pendingInteraction: {
          interactionId: Number(session && session.pendingInteractionId || 0),
          kind: safeText((askUser && askUser.kind) || session.pendingKind || "open_text"),
          uiHints: Object.assign({}, uiHints, {
            prompt:
              safeText(uiHints.prompt) ||
              safeText((askUser && askUser.prompt) || session.pendingPrompt) ||
              "The agent is waiting for your reply.",
            hint: safeText(uiHints.hint || (askUser && askUser.hint)),
            options: normalizeSkillRunnerOptionList(
              askUser && Array.isArray(askUser.options) ? askUser.options : session.pendingOptions,
            ),
            files: uiHints.files || session.pendingRequiredFields || [],
          }),
        },
      };
    }
    if (normalized === "waiting-auth") {
      const authAsk = session && session.authAskUser && typeof session.authAskUser === "object"
        ? session.authAskUser
        : null;
      const authHints = session && session.authUiHints && typeof session.authUiHints === "object"
        ? session.authUiHints
        : authAsk && authAsk.ui_hints && typeof authAsk.ui_hints === "object"
          ? authAsk.ui_hints
          : {};
      const methods = Array.isArray(session && session.authAvailableMethods)
        ? session.authAvailableMethods
        : [];
      const methodActions = methods.map(function (method) {
        return contextAction(
          "reply-run",
          safeText(method.label || method.name || method.id) || "Use method",
          {
            mode: "auth",
            authSessionId: safeText(session && session.authSessionId),
            submission: {
              kind: "auth_method",
              responseValue: safeText(method.value || method.id || method.label),
            },
          },
          true,
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
        title: "Authentication required",
        message:
          safeText((authAsk && authAsk.prompt) || authHints.prompt || session.authPrompt) ||
          "Authentication required.",
        actions: methodActions,
        auth: {
          authSessionId: safeText(session && session.authSessionId),
          inputKind: safeText(session && session.authInputKind) || "auth_code_or_url",
          acceptsChatInput: session && session.authAcceptsChatInput === true,
          uiHints: authHints,
          importFiles: authImportFiles,
        },
      };
    }
    if (BUSY_STATES.has(normalized)) {
      return { kind: "running", title: "Agent is running", message: "Agent is working..." };
    }
    if (isTerminalStatus(normalized)) {
      return { kind: "completed", title: "Run completed", message: normalized };
    }
    return { kind: "hidden" };
  }

  function buildSkillRunnerContexts(envelope) {
    const drawer = envelope && envelope.drawer && typeof envelope.drawer === "object"
      ? envelope.drawer
      : null;
    const sections = drawer && Array.isArray(drawer.sections) ? drawer.sections : [];
    function makeTaskEntry(task, group, sectionTitle) {
      if (!task || typeof task !== "object") return;
      return {
        title: safeText(task.title) || safeText(task.taskName) || safeText(task.inputUnitLabel) || "Task",
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
      (Array.isArray(group.activeTasks) ? group.activeTasks : []).forEach(function (task) {
        const entry = makeTaskEntry(task, group, sectionTitle);
        if (entry) children.push(entry);
      });
      (Array.isArray(group.finishedTasks) ? group.finishedTasks : []).forEach(function (task) {
        const entry = makeTaskEntry(task, group, sectionTitle);
        if (entry) children.push(entry);
      });
      const title = safeText(group.title || group.backendDisplayName || group.backendId);
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
      (Array.isArray(section.groups) ? section.groups : []).forEach(function (group) {
        const entry = buildGroupEntry(group, sectionTitle);
        if (entry) children.push(entry);
      });
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
    const workspace = envelope && envelope.workspace && typeof envelope.workspace === "object"
      ? envelope.workspace
      : {};
    (Array.isArray(workspace.groups) ? workspace.groups : []).forEach(function (group) {
      const entry = buildGroupEntry(group, safeText(workspace.title || "Workspace"));
      if (entry) contexts.push(entry);
    });
    return contexts;
  }

  function decorateSkillRunnerWorkspaceTask(task) {
    if (!task || typeof task !== "object") return task;
    const requestId = safeText(task.requestId);
    const taskKey = safeText(task.key || task.taskKey || task.id);
    const terminal =
      task.terminal === true || isTerminalStatus(task.status || task.state || task.stateLabel);
    return Object.assign({}, task, {
      itemActions:
        terminal && requestId
          ? [
              archiveItemAction(
                "archive-run",
                "归档",
                { requestId, taskKey },
                true,
              ),
            ]
          : [],
    });
  }

  function decorateSkillRunnerWorkspaceSections(sections) {
    return (Array.isArray(sections) ? sections : []).map(function (section) {
      const next = Object.assign({}, section);
      if (Array.isArray(section && section.groups)) {
        next.groups = section.groups.map(function (group) {
          return Object.assign({}, group, {
            activeTasks: (Array.isArray(group && group.activeTasks) ? group.activeTasks : []).map(
              decorateSkillRunnerWorkspaceTask,
            ),
            finishedTasks: (Array.isArray(group && group.finishedTasks) ? group.finishedTasks : []).map(
              decorateSkillRunnerWorkspaceTask,
            ),
          });
        });
      }
      if (Array.isArray(section && section.activeTasks)) {
        next.activeTasks = section.activeTasks.map(decorateSkillRunnerWorkspaceTask);
      }
      if (Array.isArray(section && section.finishedTasks)) {
        next.finishedTasks = section.finishedTasks.map(decorateSkillRunnerWorkspaceTask);
      }
      return next;
    });
  }

  function buildSkillRunnerDetails(envelope, session) {
    const revisions = (Array.isArray(session && session.messages) ? session.messages : []).filter(function (entry) {
      return normalizeSkillRunnerMessageKind(entry && entry.kind) === "assistant_revision";
    });
    const latestRevision = revisions.length > 0 ? revisions[revisions.length - 1] : null;
    return [
      detailSection(labelFrom(envelope, "details.run", "Run"), [
        detailEntry("Title", session && session.title),
        detailEntry(labelFrom(envelope, "fields.requestId", "Request ID"), session && session.requestId),
        detailEntry(labelFrom(envelope, "fields.taskKey", "Task key"), envelope && envelope.workspace && envelope.workspace.selectedTaskKey),
        detailEntry(labelFrom(envelope, "fields.status", "Status"), session && session.status),
        detailEntry(labelFrom(envelope, "fields.terminal", "Terminal"), session && session.statusSemantics ? String(Boolean(session.statusSemantics.terminal)) : ""),
        detailEntry(labelFrom(envelope, "fields.waiting", "Waiting"), session && session.statusSemantics ? String(Boolean(session.statusSemantics.waiting)) : ""),
        detailEntry(labelFrom(envelope, "fields.backend", "Backend"), session && session.backendTitle),
        detailEntry(labelFrom(envelope, "fields.engine", "Engine"), session && session.engine),
        detailEntry(labelFrom(envelope, "fields.model", "Model"), session && session.model),
        detailEntry(labelFrom(envelope, "fields.updated", "Updated"), session && session.updatedAt),
        detailEntry(labelFrom(envelope, "fields.loading", "Loading"), session ? String(Boolean(session.loading)) : ""),
        detailEntry(labelFrom(envelope, "fields.error", "Error"), session && session.error),
      ]),
      detailSection(labelFrom(envelope, "details.pending", "Pending"), [
        detailEntry("Interaction", session && session.pendingInteractionId),
        detailEntry("Kind", session && session.pendingKind),
        detailEntry("Prompt", session && session.pendingPrompt),
        detailEntry(
          "Options",
          Array.isArray(session && session.pendingOptions) ? String(session.pendingOptions.length) : "",
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
      detailSection(labelFrom(envelope, "details.conversationSummary", "Conversation Summary"), [
        detailEntry(
          labelFrom(envelope, "fields.messages", "Messages"),
          Array.isArray(session && session.messages) ? String(session.messages.length) : "",
        ),
        detailEntry(
          labelFrom(envelope, "fields.latestTimestamp", "Latest timestamp"),
          Array.isArray(session && session.messages) && session.messages.length > 0
            ? session.messages[session.messages.length - 1].ts
            : "",
        ),
        detailEntry(
          labelFrom(envelope, "fields.latestKind", "Latest kind"),
          Array.isArray(session && session.messages) && session.messages.length > 0
            ? session.messages[session.messages.length - 1].kind
            : "",
        ),
      ]),
      detailSection(labelFrom(envelope, "details.revisionSummary", "Revision Summary"), [
        detailEntry(labelFrom(envelope, "fields.count", "Count"), String(revisions.length)),
        detailEntry(
          labelFrom(envelope, "fields.latest", "Latest"),
          latestRevision
            ? truncateText(skillRunnerMessageText(latestRevision) || JSON.stringify(latestRevision), 500)
            : "",
          latestRevision ? "code" : "text",
        ),
      ], {
        kind: "revisions",
        summary: labelFrom(envelope, "details.compactRevision", "Compact revision metadata"),
        collapsible: true,
        defaultCollapsed: true,
      }),
    ].filter(Boolean);
  }

  function normalizeAssistantPanelSnapshot(input) {
    const source = input && typeof input === "object" ? input : {};
    const kind = normalizeKind(source.kind);
    const context = source.context && typeof source.context === "object" ? source.context : {};
    const lifecycle =
      source.lifecycle && typeof source.lifecycle === "object" ? source.lifecycle : {};
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
        : conversation.plan || { entries: [], activeEntries: [], active: false };
    const reply = source.reply && typeof source.reply === "object" ? source.reply : {};
    const drawers = source.drawers && typeof source.drawers === "object" ? source.drawers : {};
    const actions = source.actions && typeof source.actions === "object" ? source.actions : {};
    const labels = source.labels && typeof source.labels === "object" ? source.labels : {};
    return {
      kind,
      labels,
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

  function projectAcpChatPanelSnapshot(snapshot) {
    const snap = snapshot && typeof snapshot === "object" ? snapshot : {};
    const helper = conversationHelper();
    const conversation =
      helper && typeof helper.projectAcpChatConversationView === "function"
        ? helper.projectAcpChatConversationView(snap)
        : fallbackConversationView(snap.items);
    const status = normalizeStatusToken(snap.status || "idle");
    const isConnecting =
      status === "checking-command" ||
      status === "spawning" ||
      status === "initializing" ||
      status === "connecting";
    const labels = snap.labels || {};
    const activeBackendId = safeText(snap.activeBackendId || snap.backendId);
    const activeConversationId = safeText(snap.activeConversationId || snap.conversationId);
    const activeBackendSummary = (Array.isArray(snap.backendOptions) ? snap.backendOptions : []).find(
      function (entry) {
        return safeText(entry && (entry.backendId || entry.id || entry.value)) === activeBackendId;
      },
    );
    const adapterConnected = activeBackendSummary && activeBackendSummary.connected === true;
    const connected =
      Boolean(safeText(snap.sessionId)) ||
      adapterConnected ||
      ["connected", "prompting", "permission-required", "auth-required"].indexOf(status) >= 0;
    const backendOptions = (Array.isArray(snap.backendOptions) ? snap.backendOptions : []).map(
      function (entry) {
        const normalized = normalizeOption(entry, ["backendId", "id", "value"], [
          "displayName",
          "label",
          "backendId",
        ]);
        normalized.label =
          normalized.label + (entry && entry.status ? " · " + safeText(entry.status) : "");
        return normalized;
      },
    );
    const sessionOptions = buildSessionPickerOptions(
      Array.isArray(snap.chatSessions) ? snap.chatSessions : [],
      activeConversationId,
    );
    const authMethods = Array.isArray(snap.authMethods) ? snap.authMethods : [];
    const hasAuth = authMethods.length > 0;
    const authRequired = status === "auth-required";
    const modeOptions = Array.isArray(snap.modeOptions) ? snap.modeOptions : [];
    const modelOptions = Array.isArray(snap.displayModelOptions)
      ? snap.displayModelOptions
      : Array.isArray(snap.modelOptions)
        ? snap.modelOptions
        : [];
    const reasoningOptions = Array.isArray(snap.reasoningEffortOptions)
      ? snap.reasoningEffortOptions
      : [];
    const effectiveReasoningOptions =
      reasoningOptions.length > 0 ? reasoningOptions : [{ id: "default", label: "Default" }];
    const effectiveReasoning = snap.currentReasoningEffort || effectiveReasoningOptions[0];
    const connectionOnlyStatus =
      ["checking-command", "spawning", "initializing", "connecting"].indexOf(status) >= 0;
    const connectionState = connected ? "connected" : isConnecting ? "connecting" : "disconnected";
    const interaction = buildAcpPermissionInteraction(
      snap,
      connectionOnlyStatus ? { kind: "hidden" } : conversation.interaction,
    );
    const backendLabelById = {};
    backendOptions.forEach(function (entry) {
      const id = safeText(entry && entry.value);
      if (id) backendLabelById[id] = safeText(entry && entry.label) || id;
    });
    function acpChatConversationTask(entry) {
      const conversationId = safeText(entry && (entry.conversationId || entry.id));
      const backendId = safeText(entry && entry.backendId) || activeBackendId;
      const backendLabel = safeText(entry && (entry.backendLabel || entry.backendDisplayName)) ||
        backendLabelById[backendId] ||
        backendId ||
        "Backend";
      const statusText = safeText(entry && entry.status) || "idle";
      return {
        key: conversationId,
        conversationId,
        action: "set-active-conversation",
        payload: { conversationId, backendId },
        title: safeText(entry && (entry.title || entry.sessionTitle)) || "Conversation",
        workflowLabel: backendLabel,
        status: statusText,
        stateLabel: statusText,
        updatedAt: safeText(entry && (entry.updatedAt || entry.lastUpdatedAt || entry.createdAt || conversationId)),
        backendId,
        backendDisplayName: backendLabel,
        selectable: Boolean(conversationId),
        terminal: false,
        active: Boolean(conversationId && conversationId === activeConversationId),
        itemActions: conversationId
          ? [
              archiveItemAction(
                "archive-conversation",
                labels.archiveConversation || "归档",
                { conversationId, backendId },
                true,
              ),
            ]
          : [],
      };
    }
    function acpChatDrawerSections() {
      const groups = {};
      (Array.isArray(snap.chatSessions) ? snap.chatSessions : []).forEach(function (entry) {
        const task = acpChatConversationTask(entry);
        const groupKey = safeText(task.backendId || task.backendDisplayName) || "default";
        if (!groups[groupKey]) {
          groups[groupKey] = {
            backendId: task.backendId,
            backendDisplayName: task.backendDisplayName,
            disabled: false,
            activeTasks: [],
            finishedTasks: [],
          };
        }
        groups[groupKey].activeTasks.push(task);
      });
      return [
        {
          id: "sessions",
          title: labels.sessionManager || "Sessions",
          hideTitle: true,
          collapsed: false,
          groups: Object.keys(groups).map(function (key) {
            return groups[key];
          }),
        },
      ];
    }
    return normalizeAssistantPanelSnapshot({
      kind: "acp-chat",
      labels: snap.labels || {},
      context: {
        id: safeText(snap.sessionId || snap.remoteSessionId || snap.activeConversationId),
        title: safeText(snap.title) || "ACP Chat",
        subtitle: safeText(snap.labels && snap.labels.subtitle),
        status,
        statusLabel: safeText(snap.statusLabel) || status,
        backendId: safeText(snap.activeBackendId || snap.backendId),
        backendLabel: safeText(snap.backendLabel || snap.agentLabel),
        sessionId: safeText(snap.sessionId || snap.remoteSessionId),
        metadata: compactMetadata([
          metadataItem(labelFrom(snap, "fields.backend", labels.backend || "Backend"), snap.backendLabel || snap.agentLabel, "backend"),
          metadataItem(labelFrom(snap, "fields.session", labels.session || "Session"), snap.sessionTitle || snap.sessionId, "session"),
          metadataItem(labelFrom(snap, "fields.workspace", labels.workspace || "Workspace"), snap.agentWorkspaceDir || snap.sessionCwd, "workspace"),
          metadataItem(labelFrom(snap, "fields.updated", labels.updated || "Updated"), snap.updatedAt, "updatedAt"),
        ]),
        indicators: [
          connectionIndicator(connectionState, snap.lastError || snap.prerequisiteError),
          buildAcpMcpIndicator(snap),
        ],
        selectors: [
          contextSelector(
            "backend",
            labelFrom(snap, "fields.backend", labels.backend || "Backend"),
            activeBackendId,
            backendOptions,
            "set-active-backend",
            backendOptions.length === 0,
            "backendId",
          ),
          contextSelector(
            "conversation",
            labelFrom(snap, "fields.conversation", labels.conversation || "Conversation"),
            activeConversationId,
            sessionOptions.options,
            "set-active-conversation",
            sessionOptions.options.length <= 1 && !sessionOptions.hasMore,
            "conversationId",
          ),
        ],
        actions: [
          contextAction("new-conversation", labels.newConversation || "New", {
            backendId: activeBackendId,
          }, snap.busy !== true),
          contextAction("connect", labels.connect || "Connect", {
            backendId: activeBackendId,
          }, !connected && !isConnecting),
          contextAction(
            "disconnect",
            labels.disconnect || "Disconnect",
            { backendId: activeBackendId },
            connected && !isConnecting,
          ),
          contextAction(
            "authenticate",
            labels.authenticate || "Authenticate",
            {
              backendId: activeBackendId,
              methodId: hasAuth && authMethods[0] ? safeText(authMethods[0].id) : "",
            },
            authRequired && hasAuth,
          ),
        ],
      },
      lifecycle: {
        connectionState,
        executionState: status,
        replyState: snap.busy === true ? "sending" : "idle",
        terminal: false,
      },
      conversation,
      plan: conversation.plan,
      interaction,
      usage: conversation.usage || snap.usage || null,
      reply: {
        enabled: !isConnecting,
        inputEnabled: !isConnecting && snap.busy !== true,
        placeholder:
          safeText(snap.labels && snap.labels.composerPlaceholder) ||
          "Ask the active ACP backend about the current library or item...",
        submitLabel:
          snap.busy === true
            ? labelFrom(snap, "actions.cancel", labels.cancel || "Cancel")
            : labelFrom(snap, "actions.send", labels.send || "Send"),
        sending: snap.busy === true,
        action: snap.busy === true ? "cancel" : "send-prompt",
        tone: snap.busy === true ? "danger" : "primary",
        showUsageGauge: true,
        controls: [
          buildReplySelectControl("mode", labels.mode || "Mode", snap.currentMode, modeOptions, "set-mode"),
          buildReplySelectControl(
            "model",
            labels.model || "Model",
            snap.currentDisplayModel || snap.currentModel,
            modelOptions,
            "set-model",
          ),
          buildReplySelectControl(
            "reasoning",
            labels.reasoning || "Reasoning",
            effectiveReasoning,
            effectiveReasoningOptions,
            "set-reasoning-effort",
            reasoningOptions.length <= 1,
          ),
        ],
      },
      actions: {
        toolbar: [
          { action: "open-context-drawer", label: labels.sessionManager || "Sessions" },
          { action: "openDetails", label: labels.details || labelFrom(snap, "actions.details", "Details") },
          { action: "open-backend-manager", label: labels.manageBackends || labelFrom(snap, "actions.manageBackends", "Manage") },
        ],
        context: [],
        details: [
          { action: "copy-diagnostics", label: labels.copyDiagnostics || labelFrom(snap, "actions.copyDiagnostics", "Copy Diagnostics") },
        ],
      },
      drawers: {
        layout: "workspace-task-drawer",
        contextTitle: labels.sessionManager || "Sessions",
        detailsTitle: labels.diagnostics || "Details",
        contexts: (Array.isArray(snap.chatSessions) ? snap.chatSessions : []).map(function (entry) {
          return {
            title: safeText(entry.title) || "Conversation",
            action: "set-active-conversation",
            payload: {
              conversationId: safeText(entry.conversationId),
              backendId: safeText(entry.backendId || activeBackendId),
            },
            conversationId: safeText(entry.conversationId),
            backendId: safeText(entry.backendId || activeBackendId),
            status: safeText(entry.status),
          };
        }),
        sections: acpChatDrawerSections(),
        selectedTaskKey: activeConversationId,
        details: buildAcpChatDetails(snap),
      },
      raw: snap,
    });
  }

  function projectAcpSkillRunPanelSnapshot(snapshot) {
    const panel = snapshot && typeof snapshot === "object" ? snapshot : {};
    const panelLabels = panel.labels && typeof panel.labels === "object" ? panel.labels : {};
    const run =
      panel.selectedRun && typeof panel.selectedRun === "object"
        ? panel.selectedRun
        : snapshot && snapshot.requestId
          ? snapshot
          : null;
    const helper = conversationHelper();
    const conversation =
      helper && typeof helper.projectAcpSkillRunConversationView === "function"
        ? helper.projectAcpSkillRunConversationView(run || {})
        : fallbackConversationView(run && run.transcriptItems);
    const status = normalizeStatusToken((run && run.status) || "idle");
    const conversationState = normalizeStatusToken((run && run.conversationState) || "unknown");
    const recoveryState = normalizeStatusToken((run && run.conversationRecoveryState) || "unknown");
    const connected = conversationState === "active" || recoveryState === "connected";
    const actionState = safeText(run && run.connectionActionState);
    const canConnect =
      Boolean(run && safeText(run.sessionId)) &&
      !connected &&
      actionState !== "connecting" &&
      actionState !== "disconnecting" &&
      conversationState !== "ended" &&
      recoveryState !== "connecting" &&
      recoveryState !== "unavailable" &&
      recoveryState !== "unsupported";
    const canDisconnect =
      connected && actionState !== "connecting" && actionState !== "disconnecting";
    const rawRuns = Array.isArray(panel.runs) ? panel.runs : [];
    const runContexts = rawRuns.map(function (entry) {
      const requestId = safeText(entry.requestId);
      return {
        title: safeText(entry.workflowLabel || entry.taskName || entry.skillId) || "Run",
        subtitle: safeText(entry.status) + " · " + requestId,
        status: safeText(entry.status),
        action: "select-run",
        payload: { requestId },
        requestId,
        active: Boolean(requestId && run && requestId === safeText(run.requestId)),
      };
    });
    function acpSkillRunTask(entry) {
      const requestId = safeText(entry && entry.requestId);
      const title = safeText(entry && (entry.workflowLabel || entry.taskName || entry.skillId)) || "Run";
      const backendLabel = safeText(entry && (entry.backendLabel || entry.backendId)) || "Backend";
      const workflowLabel = safeText(entry && entry.skillId) || backendLabel;
      const statusText = safeText(entry && entry.status) || "unknown";
      const needsAttention =
        statusText === "waiting_user" ||
        statusText === "waiting-user" ||
        statusText === "waiting_auth" ||
        statusText === "waiting-auth" ||
        Boolean(entry && entry.pendingPermission);
      const terminal = isTerminalStatus(normalizeStatusToken(statusText));
      return {
        key: requestId,
        requestId,
        action: "select-run",
        payload: { requestId },
        title,
        workflowLabel,
        status: statusText,
        stateLabel: statusText,
        attention: needsAttention ? "warning" : "",
        attentionLabel: needsAttention ? "Needs user interaction" : "",
        updatedAt: safeText(entry && entry.updatedAt),
        backendId: safeText(entry && entry.backendId) || backendLabel,
        backendDisplayName: backendLabel,
        selectable: Boolean(requestId),
        terminal,
        active: Boolean(requestId && run && requestId === safeText(run.requestId)),
        itemActions:
          terminal && requestId
            ? [
                archiveItemAction(
                  "archive-run",
                  "归档",
                  { requestId },
                  true,
                ),
              ]
            : [],
      };
    }
    function acpSkillRunDrawerSections() {
      const groupsBySection = {
        running: {},
        completed: {},
      };
      rawRuns.forEach(function (entry) {
        const task = acpSkillRunTask(entry);
        const sectionId = task.terminal ? "completed" : "running";
        const groupKey = safeText(task.backendId || task.backendDisplayName) || "default";
        if (!groupsBySection[sectionId][groupKey]) {
          groupsBySection[sectionId][groupKey] = {
            backendId: task.backendId,
            backendDisplayName: task.backendDisplayName,
            disabled: false,
            activeTasks: [],
            finishedTasks: [],
          };
        }
        if (sectionId === "completed") {
          groupsBySection[sectionId][groupKey].finishedTasks.push(task);
        } else {
          groupsBySection[sectionId][groupKey].activeTasks.push(task);
        }
      });
      return [
        {
          id: "running",
          title: "Running",
          collapsed: false,
          groups: Object.keys(groupsBySection.running).map(function (key) {
            return groupsBySection.running[key];
          }),
        },
        {
          id: "completed",
          title: "Completed",
          collapsed: true,
          groups: Object.keys(groupsBySection.completed).map(function (key) {
            return groupsBySection.completed[key];
          }),
        },
      ];
    }
    const interaction =
      run && run.pendingPermission
        ? {
            kind: "permission",
            title:
              safeText(run.pendingPermission.source) === "zotero-mcp-write"
                ? labelFrom(panel, "permission.zoteroWriteApproval", "Zotero write approval")
                : labelFrom(panel, "permission.acpToolApproval", "ACP tool approval"),
            message:
              safeText(run.pendingPermission.summary) ||
              safeText(run.pendingPermission.toolTitle || run.pendingPermission.requestId) ||
              labelFrom(panel, "permission.acpSkillApproval", "ACP skill run requests approval."),
            detail: safeText(run.pendingPermission.detail),
            source: safeText(run.pendingPermission.source),
            permission: run.pendingPermission,
            actions: (Array.isArray(run.pendingPermission.options) ? run.pendingPermission.options : []).map(
              function (option) {
                return contextAction(
                  "resolve-permission",
                  safeText(option.name || option.label || option.optionId) ||
                    labelFrom(panel, "actions.approve", "Approve"),
                  {
                    requestId: safeText(run.requestId),
                    permissionRequestId: safeText(run.pendingPermission.requestId),
                    outcome: "selected",
                    optionId: safeText(option.optionId || option.id),
                  },
                  true,
                );
              },
            ).concat([
              contextAction(
                "resolve-permission",
                labelFrom(panel, "actions.cancel", "Cancel"),
                {
                  requestId: safeText(run.requestId),
                  permissionRequestId: safeText(run.pendingPermission.requestId),
                  outcome: "cancelled",
                },
                true,
                "danger",
              ),
            ]),
          }
        : conversation.interaction;
    const busyRun = ["queued", "running", "repairing"].indexOf(status) >= 0;
    const canReply =
      Boolean(run) &&
      !run.pendingPermission &&
      ["active", "available", "connected"].indexOf(
        safeText(run && (run.conversationState || run.conversationRecoveryState)),
      ) >= 0;
    return normalizeAssistantPanelSnapshot({
      kind: "acp-skills",
      labels: panelLabels,
      context: {
        id: safeText(run && run.requestId),
        title:
          safeText(run && (run.workflowLabel || run.taskName || run.skillId)) ||
          "ACP Skill Run",
        subtitle: safeText(run && run.skillId),
        status,
        statusLabel: status,
        backendId: safeText(run && run.backendId),
        backendLabel: safeText(run && run.backendLabel),
        sessionId: safeText(run && run.sessionId),
        workspaceDir: safeText(run && run.workspaceDir),
        metadata: compactMetadata([
          metadataItem(labelFrom(panel, "fields.backend", "Backend"), run && run.backendLabel, "backend"),
          metadataItem(labelFrom(panel, "fields.mode", "Mode"), run && run.acpModeId, "mode"),
          metadataItem(labelFrom(panel, "fields.model", "Model"), run && (run.acpModelId || run.acpRawModelId), "model"),
          metadataItem(labelFrom(panel, "fields.workspace", "Workspace"), run && run.workspaceDir, "workspace"),
        ]),
        indicators: [
          connectionIndicator(
            connected ? "connected" : recoveryState === "connecting" ? "connecting" : conversationState,
            run && (run.conversationError || run.error),
          ),
          buildAcpSkillMcpIndicator(panel, run),
        ],
        selectors: [],
        actions: run
          ? [
              contextAction(
                "connect-run",
                actionState === "connecting" ? "Connecting..." : labelFrom(panel, "actions.connect", "Connect"),
                { requestId: safeText(run.requestId) },
                canConnect,
              ),
              contextAction(
                "disconnect-run",
                actionState === "disconnecting" ? "Disconnecting..." : labelFrom(panel, "actions.disconnect", "Disconnect"),
                { requestId: safeText(run.requestId) },
                canDisconnect,
              ),
              contextAction(
                "cancel-run",
                labelFrom(panel, "actions.cancelRun", "Cancel Run"),
                { requestId: safeText(run.requestId) },
                !isTerminalStatus(status),
                "danger",
              ),
            ]
          : [],
      },
      lifecycle: {
        connectionState: connected ? "connected" : conversationState,
        executionState: status,
        applyState: safeText(run && run.applyResultState),
        recoveryState: safeText(run && run.conversationRecoveryState),
        replyState: safeText(run && run.replyState),
        terminal: isTerminalStatus(status),
      },
      conversation,
      plan: conversation.plan,
      interaction,
      usage: conversation.usage || (run && run.usage) || null,
      reply: {
        enabled: busyRun || canReply,
        inputEnabled: canReply && !busyRun,
        placeholder: labelFrom(panel, "reply.placeholderAcpSkill", "Reply to this ACP skill conversation..."),
        submitLabel: busyRun
          ? labelFrom(panel, "actions.cancel", "Cancel")
          : labelFrom(panel, "actions.send", "Send"),
        sending: safeText(run && run.replyState) === "sending",
        action: busyRun ? "interrupt-run-turn" : "reply-run",
        tone: busyRun ? "danger" : "primary",
        clearOnSend: !busyRun,
        hint: labelFrom(panel, "reply.shortcut", "Ctrl+Enter / Cmd+Enter to send"),
        showUsageGauge: true,
        controls: [],
      },
      drawers: {
        layout: "workspace-task-drawer",
        contextTitle: labelFrom(panel, "actions.runs", "Runs"),
        detailsTitle: labelFrom(panel, "details.title", "Run Details"),
        contexts: runContexts,
        sections: acpSkillRunDrawerSections(),
        selectedTaskKey: safeText(run && run.requestId),
        details: buildAcpSkillDetails(run, panel.logs, panel),
      },
      actions: {
        toolbar: [
          { action: "open-context-drawer", label: labelFrom(panel, "actions.runs", "Runs") },
          { action: "openDetails", label: labelFrom(panel, "actions.details", "Details") },
          { action: "open-backend-manager", label: labelFrom(panel, "actions.manageBackends", "Manage Backends") },
        ],
        context: [],
        details: [
          {
            action: "copy-request-id",
            label: labelFrom(panel, "actions.copyId", "Copy ID"),
            enabled: Boolean(run && run.requestId),
          },
          {
            action: "copy-diagnostics",
            label: labelFrom(panel, "actions.copyDiagnostics", "Copy Diagnostics"),
            enabled: Boolean(run),
          },
          {
            action: "open-workspace",
            label: labelFrom(panel, "actions.openWorkspace", "Open Workspace"),
            payload: { workspaceDir: safeText(run && run.workspaceDir) },
            enabled: Boolean(run && run.workspaceDir),
          },
        ],
      },
      raw: panel,
    });
  }

  function projectSkillRunnerPanelSnapshot(snapshot) {
    const envelope = snapshot && typeof snapshot === "object" ? snapshot : {};
    const session =
      envelope.session && typeof envelope.session === "object" ? envelope.session : envelope;
    const status = normalizeStatusToken(session.status || "idle");
    const conversation = buildSkillRunnerConversationView(session);
    const interaction = buildSkillRunnerPendingInteraction(session, status);
    const skillRunnerBusy = status === "running" || status === "prompting";
    const skillRunnerWaiting = status === "waiting-user" || status === "waiting-auth";
    return normalizeAssistantPanelSnapshot({
      kind: "skillrunner",
      labels: envelope.labels && typeof envelope.labels === "object" ? envelope.labels : {},
      context: {
        id: safeText(session.requestId || session.id),
        title: safeText(session.title || envelope.title) || "SkillRunner Workspace",
        subtitle: safeText(session.requestId),
        status,
        statusLabel: status,
        backendId: safeText(session.backendId),
        backendLabel: safeText(session.backendTitle),
        metadata: compactMetadata([
          metadataItem(labelFrom(envelope, "fields.backend", "Backend"), session.backendTitle, "backend"),
          metadataItem(labelFrom(envelope, "fields.engine", "Engine"), session.engine, "engine"),
          metadataItem(labelFrom(envelope, "fields.model", "Model"), session.model, "model"),
          metadataItem(labelFrom(envelope, "fields.updated", "Updated"), session.updatedAt, "updatedAt"),
        ]),
        actions: [
          contextAction(
            "cancel-run",
            labelFrom(envelope, "actions.cancelRun", "Cancel Run"),
            { requestId: safeText(session.requestId) },
            !isTerminalStatus(status),
            "danger",
          ),
        ],
      },
      lifecycle: {
        connectionState: "managed-by-skillrunner",
        executionState: status,
        terminal: isTerminalStatus(status),
      },
      conversation,
      plan: conversation.plan,
      interaction,
      reply: {
        enabled: skillRunnerWaiting || skillRunnerBusy,
        inputEnabled: skillRunnerWaiting,
        placeholder: labelFrom(envelope, "reply.placeholderSkillRunner", "Reply to the pending SkillRunner interaction..."),
        submitLabel: skillRunnerBusy
          ? labelFrom(envelope, "actions.cancel", "Cancel")
          : labelFrom(envelope, "actions.send", "Send"),
        action: skillRunnerBusy ? "cancel-run" : "reply-run",
        tone: skillRunnerBusy ? "danger" : "primary",
        clearOnSend: !skillRunnerBusy,
        hint: labelFrom(envelope, "reply.shortcut", "Ctrl+Enter / Cmd+Enter to send"),
      },
      drawers: {
        layout: "skillrunner-workspace",
        contextTitle: labelFrom(envelope, "actions.runs", "Runs"),
        detailsTitle: labelFrom(envelope, "details.title", "SkillRunner Details"),
        contexts: buildSkillRunnerContexts(envelope),
        skillrunnerSections:
          envelope.drawer && Array.isArray(envelope.drawer.sections)
            ? decorateSkillRunnerWorkspaceSections(envelope.drawer.sections)
            : [],
        selectedTaskKey: safeText(
          envelope.workspace && envelope.workspace.selectedTaskKey,
        ),
        notice: safeText(envelope.drawer && envelope.drawer.notice),
        labels: envelope.labels && typeof envelope.labels === "object" ? envelope.labels : {},
        details: buildSkillRunnerDetails(envelope, session),
      },
      actions: {
        toolbar: [
          { action: "open-context-drawer", label: labelFrom(envelope, "actions.runs", "Runs") },
          { action: "openDetails", label: labelFrom(envelope, "actions.details", "Details") },
          { action: "open-backend-manager", label: labelFrom(envelope, "actions.manageBackends", "Manage Backends") },
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
            label: labelFrom(envelope, "actions.copyDiagnostics", "Copy Diagnostics"),
            payload: { requestId: safeText(session && session.requestId) },
          },
        ],
      },
      raw: envelope,
    });
  }

  function mapAssistantPanelAction(kind, action, payload) {
    return {
      panelKind: normalizeKind(kind),
      action: safeText(action),
      payload: payload && typeof payload === "object" ? payload : {},
    };
  }

  window.AssistantPanelModel = {
    AssistantPanelKind: PANEL_KINDS.slice(),
    normalizeAssistantPanelSnapshot,
    normalizeStatusToken,
    statusTone,
    isTerminalStatus,
    projectAcpChatPanelSnapshot,
    projectAcpSkillRunPanelSnapshot,
    projectSkillRunnerPanelSnapshot,
    mapAssistantPanelAction,
    contextSelector,
    contextAction,
    buildSessionPickerOptions,
    SESSION_PICKER_SHOW_MORE_VALUE,
  };
})();
