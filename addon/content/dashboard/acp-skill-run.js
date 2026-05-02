(function () {
  "use strict";

  const state = {
    snapshot: null,
    runDrawerOpen: false,
    detailsOpen: false,
    markdown: null,
    pendingSelectedRequestId: "",
  };

  function bridge() {
    return [
      window.__zsAcpSkillRunSidebarBridge,
      window.wrappedJSObject && window.wrappedJSObject.__zsAcpSkillRunSidebarBridge,
    ].find((entry) => entry && typeof entry.sendAction === "function");
  }

  function sendAction(action, payload) {
    const direct = bridge();
    if (direct) {
      direct.sendAction(action, payload || {});
      return;
    }
    const message = { type: "acp-skill-run:action", action, payload: payload || {} };
    [window.parent, window.top, window.opener].forEach(function (target) {
      if (!target) return;
      try {
        target.postMessage(message, "*");
      } catch {
        // ignored
      }
    });
  }

  function $(id) {
    return document.getElementById(id);
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === "string") node.textContent = text;
    return node;
  }

  function safeText(value) {
    return String(value || "").trim();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function ensureMarkdownParser() {
    if (state.markdown) return state.markdown;
    if (!window.markdownit) return null;
    const parser = window.markdownit({
      html: false,
      breaks: true,
      linkify: false,
      highlight: null,
    });
    if (window.texmath && window.katex) {
      try {
        parser.use(window.texmath, {
          engine: window.katex,
          delimiters: "dollars",
          katexOptions: { throwOnError: false },
        });
      } catch {
        // markdown without math is still acceptable
      }
    }
    state.markdown = parser;
    return parser;
  }

  function renderMarkdown(value) {
    const text = String(value || "");
    const parser = ensureMarkdownParser();
    if (!parser) return escapeHtml(text).replace(/\n/g, "<br>");
    try {
      return parser.render(text);
    } catch {
      return escapeHtml(text).replace(/\n/g, "<br>");
    }
  }

  function formatTime(value) {
    const text = safeText(value);
    if (!text) return "-";
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? text : parsed.toLocaleString();
  }

  function shortId(value) {
    const text = safeText(value);
    return text.length > 14 ? text.slice(0, 7) + "..." + text.slice(-5) : text || "-";
  }

  function isTerminal(status) {
    const value = safeText(status);
    return value === "succeeded" || value === "failed" || value === "canceled";
  }

  function isConversationActive(run) {
    return safeText(run && run.conversationState) === "active";
  }

  function isConversationRecoverable(run) {
    const state = safeText(run && run.conversationRecoveryState);
    return state === "available" || state === "connected";
  }

  function normalizeStatusToken(status) {
    return safeText(status).toLowerCase().replace(/[-\s]+/g, "_");
  }

  function isTerminalPlanStatus(status) {
    return [
      "complete",
      "completed",
      "done",
      "succeeded",
      "success",
      "skipped",
      "cancelled",
      "canceled",
      "failed",
      "error",
    ].indexOf(normalizeStatusToken(status)) >= 0;
  }

  function planStatusToneClass(status) {
    switch (normalizeStatusToken(status)) {
      case "complete":
      case "completed":
      case "done":
      case "succeeded":
      case "success":
        return "is-completed";
      case "in_progress":
      case "running":
        return "is-running";
      case "failed":
      case "error":
        return "is-failed";
      case "cancelled":
      case "canceled":
        return "is-cancelled";
      case "skipped":
        return "is-skipped";
      case "pending":
      case "todo":
      default:
        return "is-pending";
    }
  }

  function planStatusIcon(status) {
    switch (planStatusToneClass(status)) {
      case "is-completed":
        return "✓";
      case "is-failed":
        return "×";
      case "is-cancelled":
        return "−";
      case "is-skipped":
        return "↷";
      default:
        return "";
    }
  }

  function statusTone(status) {
    const value = safeText(status);
    if (value === "succeeded" || value === "completed" || value === "connected") return "is-succeeded";
    if (value === "failed" || value === "error" || value === "unsupported") return "is-failed";
    if (value === "canceled" || value === "closed" || value === "unavailable") return "is-canceled";
    if (value === "running" || value === "repairing" || value === "in_progress") {
      return "is-running";
    }
    if (value === "connecting" || value === "available") return "is-running";
    return "is-pending";
  }

  function genericToolText(value) {
    const text = safeText(value);
    const normalized = text.toLowerCase();
    return (
      !text ||
      normalized === "tool" ||
      normalized === "tool call" ||
      normalized === "other" ||
      text === "[]" ||
      text === "{}" ||
      /^call[_-][a-z0-9_-]+$/i.test(text) ||
      /^toolu_[a-z0-9_-]+$/i.test(text)
    );
  }

  function compactToolSummary(tool) {
    const text = [
      tool.inputSummary,
      tool.title,
      tool.summary,
      tool.resultSummary,
    ].find((entry) => !genericToolText(entry));
    return safeText(text || "");
  }

  function normalizeUiHintOptions(uiHints) {
    const rawOptions = uiHints && Array.isArray(uiHints.options) ? uiHints.options : [];
    return rawOptions
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

  function renderPendingInteractionBanner(node, run) {
    clear(node);
    const uiHints =
      run && run.pendingInteraction && run.pendingInteraction.uiHints &&
      typeof run.pendingInteraction.uiHints === "object"
        ? run.pendingInteraction.uiHints
        : {};
    const prompt = safeText(uiHints.prompt) || "Agent is waiting for your reply.";
    const hint = safeText(uiHints.hint);
    const filesHint = safeText(uiHints.files);
    const copy = el("div", "pending-interaction-copy", "");
    copy.appendChild(el("strong", "", prompt));
    if (hint) copy.appendChild(el("span", "", hint));
    if (filesHint) copy.appendChild(el("span", "pending-files-hint", filesHint));
    node.appendChild(copy);
    const options = normalizeUiHintOptions(uiHints);
    if (options.length > 0) {
      const actions = el("div", "pending-interaction-actions", "");
      options.forEach(function (option) {
        const button = el("button", "btn", option.label);
        button.type = "button";
        button.addEventListener("click", function () {
          sendAction("reply-run", {
            requestId: run.requestId || "",
            message: option.value,
          });
        });
        actions.appendChild(button);
      });
      node.appendChild(actions);
    }
  }

  function applyPendingSelection(snapshot) {
    const source = snapshot || {};
    const pendingRequestId = safeText(state.pendingSelectedRequestId);
    if (!pendingRequestId) return source;
    const runs = Array.isArray(source.runs) ? source.runs : [];
    const selectedRun = runs.find(function (run) {
      return run && run.requestId === pendingRequestId;
    });
    if (!selectedRun) {
      state.pendingSelectedRequestId = "";
      return source;
    }
    if (source.selectedRequestId === pendingRequestId) {
      state.pendingSelectedRequestId = "";
    }
    return Object.assign({}, source, {
      selectedRequestId: pendingRequestId,
      selectedRun,
      logs: source.selectedRequestId === pendingRequestId ? source.logs : [],
    });
  }

  function appendDefinitionList(node, rows) {
    clear(node);
    rows.forEach(function (row) {
      node.appendChild(el("dt", "", row[0]));
      node.appendChild(el("dd", "", row[1] || "-"));
    });
  }

  function renderRuns(snapshot) {
    const list = $("acp-skill-run-list");
    clear(list);
    const runs = Array.isArray(snapshot.runs) ? snapshot.runs : [];
    if (runs.length === 0) {
      list.appendChild(el("div", "empty-state compact", "No ACP skill runs yet."));
      return;
    }
    runs.forEach(function (run) {
      const row = el("button", "run-row", "");
      row.type = "button";
      if (run.requestId === snapshot.selectedRequestId) row.classList.add("selected");
      row.appendChild(el("span", "run-led " + statusTone(run.status)));
      const body = el("span", "run-row-body");
      body.appendChild(
        el("span", "run-row-title", run.workflowLabel || run.taskName || run.skillId || "Run"),
      );
      body.appendChild(
        el("span", "run-row-meta", safeText(run.status) + " · " + shortId(run.requestId)),
      );
      row.appendChild(body);
      row.addEventListener("click", function () {
        state.pendingSelectedRequestId = safeText(run.requestId);
        state.runDrawerOpen = false;
        render(state.snapshot || {});
        sendAction("select-run", { requestId: run.requestId || "" });
      });
      list.appendChild(row);
    });
  }

  function renderActions(run) {
    const actions = $("acp-skill-run-actions");
    clear(actions);
    [
      ["copy-request-id", "Copy ID"],
      ["copy-diagnostics", "Copy Diagnostics"],
    ].forEach(function (entry) {
      const button = el("button", "btn", entry[1]);
      button.type = "button";
      button.addEventListener("click", function () {
        sendAction(entry[0], { requestId: run.requestId || "" });
      });
      actions.appendChild(button);
    });
    const openWorkspace = el("button", "btn", "Open Workspace");
    openWorkspace.type = "button";
    openWorkspace.disabled = !run.workspaceDir;
    openWorkspace.addEventListener("click", function () {
      sendAction("open-workspace", {
        requestId: run.requestId || "",
        workspaceDir: run.workspaceDir || "",
      });
    });
    actions.appendChild(openWorkspace);
    const cancel = el("button", "btn danger", "Cancel");
    cancel.type = "button";
    cancel.disabled = isTerminal(run.status);
    cancel.addEventListener("click", function () {
      sendAction("cancel-run", { requestId: run.requestId || "" });
    });
    actions.appendChild(cancel);
    const endSession = el("button", "btn", "End Session");
    endSession.type = "button";
    endSession.disabled = !isConversationActive(run);
    endSession.addEventListener("click", function () {
      sendAction("end-session", { requestId: run.requestId || "" });
    });
    actions.appendChild(endSession);
  }

  function appendTranscriptItem(container, item) {
    const row = el("article", "transcript-row kind-" + item.kind, "");
    if (item.kind === "message") {
      row.classList.add("role-" + (item.role || "assistant"));
      const meta = el("div", "transcript-meta", item.role === "user" ? "User" : "Agent");
      const body = el("div", "markdown-body");
      body.innerHTML = renderMarkdown(item.text || "");
      row.appendChild(meta);
      row.appendChild(body);
    } else if (item.kind === "thought") {
      row.classList.add("is-thought");
      row.appendChild(el("div", "transcript-meta", "Thought"));
      const body = el("div", "markdown-body thought-body");
      body.innerHTML = renderMarkdown(item.text || "");
      row.appendChild(body);
    } else if (item.kind === "tool_call") {
      row.classList.add("is-tool");
      const body = el("div", "tool-line");
      body.appendChild(el("span", "tool-led " + statusTone(item.state)));
      body.appendChild(el("span", "tool-badge", item.toolName || item.toolKind || "Tool"));
      body.appendChild(el("span", "tool-summary", compactToolSummary(item) || "Running tool"));
      row.appendChild(body);
    } else if (item.kind === "status") {
      row.classList.add("is-status", "level-" + (item.level || "info"));
      row.appendChild(el("div", "transcript-meta", item.label || "Status"));
      row.appendChild(el("div", "status-text", item.text || ""));
    }
    container.appendChild(row);
  }

  function isNearBottom(element) {
    if (!element) return true;
    return element.scrollHeight - element.scrollTop - element.clientHeight < 80;
  }

  function renderTranscript(run) {
    const transcript = $("acp-skill-run-transcript");
    const shouldStickToBottom = isNearBottom(transcript);
    clear(transcript);
    const items = Array.isArray(run.transcriptItems) ? run.transcriptItems : [];
    if (items.length === 0) {
      transcript.appendChild(el("div", "empty-state compact", "Waiting for agent transcript..."));
      return;
    }
    items.forEach(function (item) {
      appendTranscriptItem(transcript, item);
    });
    if (shouldStickToBottom) {
      transcript.scrollTop = transcript.scrollHeight;
    }
  }

  function renderPlan(run) {
    const panel = $("acp-skill-run-plan-panel");
    const list = $("acp-skill-run-plan-list");
    const summary = $("acp-skill-run-plan-summary");
    clear(list);
    const entries = Array.isArray(run.planEntries) ? run.planEntries : [];
    const activeEntries = entries.filter(function (entry) {
      return !isTerminalPlanStatus(entry && entry.status);
    });
    if (entries.length === 0 || activeEntries.length === 0) {
      panel.classList.add("hidden");
      summary.textContent = "";
      return;
    }
    panel.classList.remove("hidden");
    summary.textContent =
      String(entries.length - activeEntries.length) +
      "/" +
      String(entries.length) +
      " complete";
    entries.forEach(function (entry) {
      const statusTone = planStatusToneClass(entry.status);
      const terminal = isTerminalPlanStatus(entry.status);
      const row = el(
        "div",
        "plan-entry " + statusTone + (terminal ? " is-terminal" : " is-active"),
        "",
      );
      const statusNode = el("span", "plan-entry-status " + statusTone);
      const statusIcon = el(
        "span",
        "plan-status-icon " + statusTone,
        planStatusIcon(entry.status),
      );
      statusIcon.setAttribute("aria-hidden", "true");
      statusNode.appendChild(statusIcon);
      row.appendChild(statusNode);
      row.appendChild(el("span", "plan-text", entry.content || ""));
      list.appendChild(row);
    });
  }

  function renderStatusBar(run) {
    const statusbar = $("acp-skill-run-statusbar");
    clear(statusbar);
    if (!run) {
      statusbar.classList.add("hidden");
      return;
    }
    const recovery = safeText(run.conversationRecoveryState) || "unavailable";
    const connectionChip = el(
      "span",
      "statusbar-chip connection-chip " + statusTone(recovery),
      "Connection: " + recovery,
    );
    connectionChip.insertBefore(el("span", "tool-led " + statusTone(recovery)), connectionChip.firstChild);
    statusbar.appendChild(connectionChip);
    const actionState = safeText(run.connectionActionState);
    const connectBtn = el(
      "button",
      "btn statusbar-action",
      actionState === "connecting" ? "Connecting..." : "Connect",
    );
    connectBtn.type = "button";
    connectBtn.disabled =
      actionState === "connecting" ||
      recovery === "connected" ||
      recovery === "unsupported" ||
      !safeText(run.sessionId);
    connectBtn.addEventListener("click", function () {
      sendAction("connect-run", { requestId: run.requestId || "" });
    });
    statusbar.appendChild(connectBtn);
    const disconnectBtn = el(
      "button",
      "btn statusbar-action",
      actionState === "disconnecting" ? "Disconnecting..." : "Disconnect",
    );
    disconnectBtn.type = "button";
    disconnectBtn.disabled = actionState === "disconnecting" || recovery !== "connected";
    disconnectBtn.addEventListener("click", function () {
      sendAction("disconnect-run", { requestId: run.requestId || "" });
    });
    statusbar.appendChild(disconnectBtn);
    [
      ["Status", run.status],
      ["Conversation", run.conversationState],
      ["Backend", run.backendLabel || run.backendId],
      ["Mode", run.acpModeId],
      ["Model", run.acpModelId || run.acpRawModelId],
      ["Deps", run.runtimeDependencyStatus],
      ["Validation", run.validationStatus],
    ].forEach(function (entry) {
      const value = safeText(entry[1]);
      if (!value) return;
      statusbar.appendChild(el("span", "statusbar-chip", entry[0] + ": " + value));
    });
    statusbar.classList.toggle("hidden", !statusbar.firstChild);
  }

  function renderPermission(run) {
    const interaction = $("acp-skill-run-interaction");
    const permission = $("acp-skill-run-permission");
    const running = $("acp-skill-run-running");
    const final = $("acp-skill-run-final");
    const summary = $("acp-skill-run-permission-summary");
    const actions = $("acp-skill-run-permission-actions");
    clear(actions);
    permission.classList.add("hidden");
    running.classList.add("hidden");
    final.classList.add("hidden");
    interaction.classList.add("hidden");

    if (run.pendingPermission) {
      interaction.classList.remove("hidden");
      permission.classList.remove("hidden");
      summary.textContent =
        safeText(run.pendingPermission.toolTitle) || shortId(run.pendingPermission.requestId);
      (Array.isArray(run.pendingPermission.options) ? run.pendingPermission.options : []).forEach(
        function (option) {
          const button = el("button", "btn", option.name || option.optionId || "Select");
          button.type = "button";
          button.addEventListener("click", function () {
            sendAction("resolve-permission", {
              requestId: run.requestId || "",
              permissionRequestId: run.pendingPermission.requestId || "",
              outcome: "selected",
              optionId: option.optionId || "",
            });
          });
          actions.appendChild(button);
        },
      );
      const cancel = el("button", "btn danger", "Cancel");
      cancel.type = "button";
      cancel.addEventListener("click", function () {
        sendAction("resolve-permission", {
          requestId: run.requestId || "",
          permissionRequestId: run.pendingPermission.requestId || "",
          outcome: "cancelled",
        });
      });
      actions.appendChild(cancel);
      return;
    }
    if (isTerminal(run.status)) {
      interaction.classList.remove("hidden");
      final.classList.remove("hidden");
      final.className = "status-banner " + statusTone(run.status);
      final.textContent =
        run.status === "succeeded"
          ? "Run completed. Workflow result is ready."
          : run.error || "Run did not complete successfully.";
      return;
    }
    if (run.status === "waiting_user") {
      interaction.classList.remove("hidden");
      final.classList.remove("hidden");
      final.className = "status-banner info";
      renderPendingInteractionBanner(final, run);
      return;
    }
    if (run.status === "running" || run.status === "repairing" || run.status === "queued") {
      interaction.classList.remove("hidden");
      running.classList.remove("hidden");
      $("acp-skill-run-running-label").textContent =
        run.status === "repairing" ? "Agent is repairing output..." : "Agent is working...";
    }
  }

  function runAllowsReply(run) {
    return Boolean(
      run &&
        (isConversationActive(run) ||
          isConversationRecoverable(run) ||
          (safeText(run.status) === "waiting_user" && safeText(run.sessionId))) &&
        !run.pendingPermission,
    );
  }

  function submitReply() {
    const run = (state.snapshot || {}).selectedRun || null;
    const textarea = $("acp-skill-run-reply-text");
    const hint = $("acp-skill-run-reply-hint");
    if (!runAllowsReply(run)) {
      if (hint) hint.textContent = "Reply is not available for the selected run.";
      return;
    }
    const text = safeText(textarea && textarea.value);
    if (!text) {
      if (hint) hint.textContent = "Reply message is empty.";
      return;
    }
    sendAction("reply-run", {
      requestId: run.requestId || "",
      message: text,
    });
    if (textarea) textarea.value = "";
    if (hint) hint.textContent = "Reply submitted.";
  }

  function renderReplyComposer(run) {
    const form = $("acp-skill-run-reply-form");
    const textarea = $("acp-skill-run-reply-text");
    const submit = $("acp-skill-run-reply-submit");
    const hint = $("acp-skill-run-reply-hint");
    const enabled = runAllowsReply(run);
    form.classList.toggle("is-disabled", !enabled);
    textarea.disabled = !enabled;
    submit.disabled = !enabled;
    textarea.placeholder = enabled
      ? isConversationActive(run)
        ? "Reply to this ACP skill conversation..."
        : "Reply; the ACP session will be recovered first..."
      : "Interactive ACP skill replies are not available for this run.";
    hint.textContent = enabled
      ? isConversationActive(run)
        ? "Ctrl/⌘ + Enter to send."
        : safeText(run.status) === "waiting_user"
          ? "Ctrl/⌘ + Enter to send. The run is waiting for your reply."
          : "Ctrl/⌘ + Enter to send. The session will reconnect first."
      : "Reply is enabled while the ACP conversation is active.";
    if (safeText(run.replyState) === "submitted" || safeText(run.replyState) === "accepted") {
      submit.disabled = true;
      hint.textContent = safeText(run.replyState) === "submitted" ? "Sending reply..." : "Reply accepted...";
    } else if (safeText(run.replyState) === "rejected" && safeText(run.replyError)) {
      hint.textContent = "Reply failed: " + safeText(run.replyError);
    }
  }

  function renderDetails(snapshot, run) {
    renderActions(run);
    appendDefinitionList($("acp-skill-run-workspace"), [
      ["Workspace", run.workspaceDir],
      ["Runtime", run.runtimeDir],
      ["Input manifest", run.inputManifestPath],
      ["Result JSON", run.resultJsonPath],
    ]);
    appendDefinitionList($("acp-skill-run-runner"), [
      ["Backend", run.backendLabel || run.backendId],
      ["Agent family", run.agentFamily],
      ["ACP mode", run.acpModeId],
      ["ACP model", run.acpModelId],
      ["Reasoning", run.acpReasoningEffort],
      ["Raw model", run.acpRawModelId],
      ["Skill", run.skillId],
      ["Skill roots", Array.isArray(run.skillRoots) ? run.skillRoots.join("\n") : ""],
      ["Session", run.sessionId],
    ]);
    appendDefinitionList($("acp-skill-run-validation"), [
      ["Status", run.validationStatus],
      ["Repair rounds", String(run.repairRounds || 0)],
      ["Errors", Array.isArray(run.validationErrors) ? run.validationErrors.join("\n") : ""],
      ["Run error", run.error],
      ["Conversation", run.conversationState],
      ["Conversation error", run.conversationError],
      ["Last stop reason", run.lastPromptStopReason],
      ["Apply result", run.applyResultState],
      ["Applied at", run.appliedAt],
      [
        "Pending interaction",
        run.pendingInteraction ? run.pendingInteraction.message : "",
      ],
      ["Output convergence", run.outputConvergenceState],
    ]);
    appendDefinitionList($("acp-skill-run-deps"), [
      ["Status", run.runtimeDependencyStatus],
      [
        "Dependencies",
        Array.isArray(run.runtimeDependencies) ? run.runtimeDependencies.join("\n") : "",
      ],
      ["Error", run.runtimeDependencyError],
    ]);
    appendDefinitionList($("acp-skill-run-projection"), [
    ]);
    const logs = $("acp-skill-run-logs");
    clear(logs);
    (Array.isArray(snapshot.logs) ? snapshot.logs : []).forEach(function (log) {
      const row = el("div", "log-row", "");
      row.appendChild(el("div", "log-meta", formatTime(log.ts) + " · " + log.level + " · " + log.stage));
      row.appendChild(el("div", "log-message", log.message || ""));
      logs.appendChild(row);
    });
    if (!logs.firstChild) logs.appendChild(el("div", "empty-state compact", "No runtime logs."));
    $("acp-skill-run-result").textContent =
      typeof run.resultJson === "undefined" ? "" : JSON.stringify(run.resultJson, null, 2);
  }

  function renderSelectedRun(snapshot) {
    const run = snapshot.selectedRun || null;
    const empty = $("acp-skill-run-empty");
    const main = $("acp-skill-run-main");
    if (!run) {
      empty.classList.remove("hidden");
      main.classList.add("hidden");
      $("acp-skill-run-title").textContent = "ACP Skill Run";
      renderStatusBar(null);
      return;
    }
    empty.classList.add("hidden");
    main.classList.remove("hidden");
    $("acp-skill-run-title").textContent =
      run.workflowLabel || run.taskName || run.skillId || "ACP Skill Run";
    $("acp-skill-run-summary").textContent =
      safeText(run.status) + " · " + shortId(run.requestId) + " · updated " + formatTime(run.updatedAt);
    renderStatusBar(run);
    renderTranscript(run);
    renderPlan(run);
    renderPermission(run);
    renderReplyComposer(run);
    renderDetails(snapshot, run);
  }

  function render(snapshot) {
    state.snapshot = applyPendingSelection(snapshot || {});
    renderRuns(state.snapshot);
    renderSelectedRun(state.snapshot);
    $("acp-skill-run-drawer").classList.toggle("hidden", !state.runDrawerOpen);
    $("acp-skill-run-details").classList.toggle("hidden", !state.detailsOpen);
  }

  window.addEventListener("message", function (event) {
    const data = event.data || {};
    if (data.type === "acp-skill-run:init" || data.type === "acp-skill-run:snapshot") {
      render(data.payload || {});
    }
  });

  document.addEventListener("DOMContentLoaded", function () {
    $("acp-skill-run-close-btn").addEventListener("click", function () {
      sendAction("close-sidebar", {});
    });
    $("acp-skill-run-drawer-btn").addEventListener("click", function () {
      state.runDrawerOpen = true;
      render(state.snapshot || {});
    });
    $("acp-skill-run-drawer-close-btn").addEventListener("click", function () {
      state.runDrawerOpen = false;
      render(state.snapshot || {});
    });
    $("acp-skill-run-drawer").addEventListener("click", function (event) {
      if (event.target.closest("[data-run-drawer-close]")) {
        state.runDrawerOpen = false;
        render(state.snapshot || {});
      }
    });
    $("acp-skill-run-details-btn").addEventListener("click", function () {
      state.detailsOpen = true;
      render(state.snapshot || {});
    });
    $("acp-skill-run-details-close-btn").addEventListener("click", function () {
      state.detailsOpen = false;
      render(state.snapshot || {});
    });
    $("acp-skill-run-details").addEventListener("click", function (event) {
      if (event.target.closest("[data-details-drawer-close]")) {
        state.detailsOpen = false;
        render(state.snapshot || {});
      }
    });
    $("acp-skill-run-reply-form").addEventListener("submit", function (event) {
      event.preventDefault();
      submitReply();
    });
    $("acp-skill-run-reply-submit").addEventListener("click", function (event) {
      event.preventDefault();
      submitReply();
    });
    $("acp-skill-run-reply-text").addEventListener("keydown", function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        submitReply();
      }
    });
    sendAction("ready", {});
  });
})();
