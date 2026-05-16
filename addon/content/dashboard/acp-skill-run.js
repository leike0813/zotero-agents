(function () {
  "use strict";

  const state = {
    snapshot: null,
    runDrawerOpen: false,
    detailsOpen: false,
    chatDisplayMode: "plain",
    markdown: null,
    pendingSelectedRequestId: "",
    transcriptNodeMap: new Map(),
    transcriptOrderKey: "",
    transcriptMode: "",
    transcriptRunId: "",
    toolActivityExpandedIds: new Set(),
    drawerCompletedCollapsed: true,
    replyDrafts: new Map(),
    replyFocusedRequestId: "",
    permissionRequestDetails: null,
    permissionRequestDrawerOpen: false,
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
        // Standalone fallback should never break rendering.
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

  function formatTime(value) {
    const text = safeText(value);
    if (!text) return "";
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? text : parsed.toLocaleString();
  }

  function assistantConversationView() {
    return window.AssistantConversationView &&
      typeof window.AssistantConversationView === "object"
      ? window.AssistantConversationView
      : null;
  }

  function assistantTranscriptRenderer() {
    return window.AssistantTranscriptRenderer &&
      typeof window.AssistantTranscriptRenderer === "object"
      ? window.AssistantTranscriptRenderer
      : null;
  }

  function assistantPanelModel() {
    return window.AssistantPanelModel && typeof window.AssistantPanelModel === "object"
      ? window.AssistantPanelModel
      : null;
  }

  function assistantPanelRenderer() {
    return window.AssistantPanelRenderer &&
      typeof window.AssistantPanelRenderer === "object"
      ? window.AssistantPanelRenderer
      : null;
  }

  function projectAcpSkillRunView(run) {
    const helper = assistantConversationView();
    if (helper && typeof helper.projectAcpSkillRunConversationView === "function") {
      return helper.projectAcpSkillRunConversationView(run || {});
    }
    const items = (Array.isArray(run && run.transcriptItems) ? run.transcriptItems : []).map(
      function (item) {
        if (item && item.kind === "thought") {
          return Object.assign({}, item, { kind: "process", label: "Thinking" });
        }
        if (item && item.kind === "tool_call") {
          return Object.assign({}, item, { kind: "tool" });
        }
        return item;
      },
    );
    return {
      items,
      plan: { entries: [], activeEntries: [], active: false },
      interaction: { kind: "hidden" },
      usage: run && run.usage ? run.usage : null,
    };
  }

  function projectAssistantPanelSnapshot(snapshot) {
    const helper = assistantPanelModel();
    if (helper && typeof helper.projectAcpSkillRunPanelSnapshot === "function") {
      return helper.projectAcpSkillRunPanelSnapshot(snapshot || {});
    }
    const run = (snapshot && snapshot.selectedRun) || {};
    return {
      kind: "acp-skills",
      context: {
        id: safeText(run.requestId || (snapshot && snapshot.selectedRequestId)),
        title: safeText(run.workflowLabel || run.taskName || run.skillId) || "ACP Skill Run",
        status: safeText(run.status) || "idle",
      },
      lifecycle: {
        executionState: safeText(run.status) || "idle",
        connectionState: safeText(run.conversationState || run.conversationRecoveryState),
      },
      conversation: projectAcpSkillRunView(run),
      plan: projectAcpSkillRunView(run).plan,
      interaction: projectAcpSkillRunView(run).interaction,
      actions: {
        toolbar: [
          { action: "open-context-drawer", label: "Runs" },
          { action: "openDetails", label: "Details" },
        ],
      },
      drawers: { contextTitle: "Runs", detailsTitle: "Run Details", contexts: [], details: [] },
      reply: { enabled: false, action: "reply-run" },
      raw: snapshot || {},
    };
  }

  function selectedRunFromSnapshot() {
    return (state.snapshot && state.snapshot.selectedRun) || null;
  }

  function captureReplyDraft() {
    const run = selectedRunFromSnapshot();
    const requestId = safeText(run && run.requestId);
    const input = document.querySelector(".assistant-panel-reply-input");
    if (!requestId || !input || typeof input.value !== "string") return;
    state.replyDrafts.set(requestId, input.value);
    if (document.activeElement === input) {
      state.replyFocusedRequestId = requestId;
    }
  }

  function restoreReplyFocus() {
    const run = selectedRunFromSnapshot();
    const requestId = safeText(run && run.requestId);
    if (!requestId || state.replyFocusedRequestId !== requestId) return;
    const input = document.querySelector(".assistant-panel-reply-input");
    if (!input || input.disabled) return;
    input.focus();
  }

  function renderChatDisplayMode() {
    const plain = $("acp-skill-chat-mode-plain");
    const bubble = $("acp-skill-chat-mode-bubble");
    const mode = state.chatDisplayMode === "bubble" ? "bubble" : "plain";
    if (plain) plain.setAttribute("aria-pressed", mode === "plain" ? "true" : "false");
    if (bubble) bubble.setAttribute("aria-pressed", mode === "bubble" ? "true" : "false");
  }

  function resetTranscriptRenderState() {
    state.transcriptNodeMap.clear();
    state.transcriptOrderKey = "";
    state.transcriptMode = "";
    state.toolActivityExpandedIds.clear();
  }

  function handleAssistantPanelAction(action, payload) {
    const data = payload && typeof payload === "object" ? payload : {};
    const run = selectedRunFromSnapshot();
    const requestId = safeText(data.requestId || (run && run.requestId));
    if (action !== "reply" && action !== "reply-run" && action !== "interrupt-run-turn") {
      captureReplyDraft();
    }
    if (action === "open-context-drawer") {
      state.runDrawerOpen = true;
      render(state.snapshot || {});
      return;
    }
    if (action === "close-context-drawer") {
      state.runDrawerOpen = false;
      render(state.snapshot || {});
      return;
    }
    if (action === "toggle-drawer-section") {
      if (safeText(data.sectionId) === "completed") {
        state.drawerCompletedCollapsed = !state.drawerCompletedCollapsed;
        render(state.snapshot || {});
      }
      return;
    }
    if (action === "openDetails") {
      state.detailsOpen = true;
      render(state.snapshot || {});
      return;
    }
    if (action === "open-permission-request") {
      state.permissionRequestDetails = data.permissionRequest || null;
      state.permissionRequestDrawerOpen = true;
      render(state.snapshot || {});
      return;
    }
    if (action === "close-permission-request") {
      state.permissionRequestDrawerOpen = false;
      render(state.snapshot || {});
      return;
    }
    if (action === "close-details-drawer") {
      state.detailsOpen = false;
      render(state.snapshot || {});
      return;
    }
    if (action === "select-run") {
      state.pendingSelectedRequestId = requestId;
      state.runDrawerOpen = false;
      render(state.snapshot || {});
      sendAction("select-run", { requestId: requestId });
      return;
    }
    if (action === "reply" || action === "reply-run") {
      const message = safeText(data.message);
      if (!message || !requestId) return;
      state.replyDrafts.set(requestId, "");
      sendAction("reply-run", { requestId: requestId, message: message });
      return;
    }
    if (action === "interrupt-run-turn") {
      sendAction("interrupt-run-turn", { requestId: requestId });
      return;
    }
    if (action === "set-chat-display-mode") {
      state.chatDisplayMode = data.mode === "bubble" ? "bubble" : "plain";
      render(state.snapshot || {});
      return;
    }
    if (action === "open-backend-manager") {
      sendAction("open-backend-manager", {});
      return;
    }
    if (
      action === "connect-run" ||
      action === "disconnect-run" ||
      action === "interrupt-run-turn" ||
      action === "cancel-run" ||
      action === "archive-run"
    ) {
      sendAction(action, { requestId: requestId });
      return;
    }
    sendAction(action, Object.assign({}, data, requestId ? { requestId: requestId } : {}));
  }

  function renderAssistantPanelRuntime(snapshot) {
    const renderer = assistantPanelRenderer();
    if (!renderer || typeof renderer.renderAssistantPanelSnapshot !== "function") {
      renderPanelRuntimeFailure("ACP Skills panel renderer unavailable.");
      return;
    }
    try {
      const panelSnapshot = projectAssistantPanelSnapshot(snapshot || {});
      const rawSelectedRun = snapshot && snapshot.selectedRun;
      if (!rawSelectedRun || !rawSelectedRun.pendingPermission) {
        state.permissionRequestDetails = null;
        state.permissionRequestDrawerOpen = false;
      }
      panelSnapshot.drawers = panelSnapshot.drawers || {};
      panelSnapshot.drawers.permissionRequest = state.permissionRequestDetails;
      panelSnapshot.drawers.permissionRequestOpen = state.permissionRequestDrawerOpen;
      const selectedRun = panelSnapshot && panelSnapshot.raw && panelSnapshot.raw.selectedRun;
      const requestId = safeText(selectedRun && selectedRun.requestId);
      if (panelSnapshot && panelSnapshot.reply && requestId) {
        panelSnapshot.reply.value = state.replyDrafts.get(requestId) || "";
      }
      if (
        panelSnapshot &&
        panelSnapshot.drawers &&
        Array.isArray(panelSnapshot.drawers.sections)
      ) {
        panelSnapshot.drawers.sections = panelSnapshot.drawers.sections.map(function (section) {
          if (safeText(section && section.id) !== "completed") return section;
          return Object.assign({}, section, { collapsed: state.drawerCompletedCollapsed });
        });
      }
      renderer.renderAssistantPanelSnapshot(panelSnapshot, {
        managed: true,
        managedRegions: {
          toolbar: true,
          banner: true,
          plan: true,
          hint: true,
          reply: true,
          drawer: true,
          details: true,
          permission: true,
        },
        onAction: handleAssistantPanelAction,
        root: document.querySelector(".acp-skill-run-shell"),
        regions: {
          toolbar: $("acp-skill-run-toolbar"),
          banner: $("acp-skill-run-banner"),
          conversation: $("acp-skill-conversation-window"),
          plan: $("acp-skill-run-plan-panel"),
          hint: $("acp-skill-run-interaction"),
          reply: $("acp-skill-run-reply-form"),
          drawer: $("acp-skill-run-drawer"),
          details: $("acp-skill-run-details"),
        },
      });
      restoreReplyFocus();
    } catch (error) {
      renderPanelRuntimeFailure(
        "ACP Skills panel renderer failed: " + (error && error.message ? error.message : String(error)),
      );
    }
  }

  function renderPanelRuntimeFailure(message) {
    const hint = $("acp-skill-run-interaction");
    if (!hint) return;
    hint.classList.remove("hidden");
    hint.setAttribute("data-assistant-interaction", "error");
    clear(hint);
    const row = el("div", "assistant-panel-hint-row");
    row.appendChild(el("span", "asst-led is-error"));
    row.appendChild(el("span", "", safeText(message) || "ACP Skills panel renderer failed."));
    hint.appendChild(row);
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
        // Markdown without math is still acceptable.
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
      return parser.render(text).trimEnd();
    } catch {
      return escapeHtml(text).replace(/\n/g, "<br>");
    }
  }

  function applyPendingSelection(snapshot) {
    const source = snapshot || {};
    const pendingRequestId = safeText(state.pendingSelectedRequestId);
    if (!pendingRequestId) return source;
    if (source.selectedRequestId === pendingRequestId) {
      state.pendingSelectedRequestId = "";
      return source;
    }
    return Object.assign({}, source, {
      selectedRequestId: pendingRequestId,
    });
  }

  function renderTranscript(run) {
    const transcript = $("acp-skill-run-transcript");
    const view = projectAcpSkillRunView(run);
    const renderer = assistantTranscriptRenderer();
    if (!renderer || typeof renderer.renderAssistantTranscript !== "function") {
      clear(transcript);
      transcript.appendChild(el("div", "empty-state compact", "Transcript renderer unavailable."));
      return;
    }
    const requestId = safeText(run && run.requestId);
    if (requestId !== state.transcriptRunId) {
      state.transcriptRunId = requestId;
      resetTranscriptRenderState();
    }
    renderer.renderAssistantTranscript({
      container: transcript,
      items: Array.isArray(view.items) ? view.items : [],
      mode: state.chatDisplayMode,
      variant: "acp-skill-run",
      nodeMap: state.transcriptNodeMap,
      orderKey: state.transcriptOrderKey,
      modeKey: state.transcriptMode,
      expandedIds: state.toolActivityExpandedIds,
      renderMarkdown,
      formatTime,
      labels: state.panelSnapshot?.labels?.assistantPanel?.transcript || state.panelSnapshot?.labels?.transcript || {},
      emptyText:
        state.panelSnapshot?.labels?.assistantPanel?.transcript?.empty ||
        state.panelSnapshot?.labels?.transcript?.empty ||
        "Waiting for agent transcript...",
      onToggleExpanded: function (id) {
        if (state.toolActivityExpandedIds.has(id)) {
          state.toolActivityExpandedIds.delete(id);
        } else {
          state.toolActivityExpandedIds.add(id);
        }
        renderTranscript(selectedRunFromSnapshot() || {});
      },
      onRendered: function (result) {
        state.transcriptOrderKey = result.orderKey;
        state.transcriptMode = result.modeKey;
      },
    });
    renderChatDisplayMode();
  }

  function renderSelectedRun(snapshot) {
    const run = snapshot.selectedRun || null;
    const empty = $("acp-skill-run-empty");
    const main = $("acp-skill-run-main");
    if (!run) {
      empty.classList.remove("hidden");
      main.classList.add("hidden");
      return;
    }
    empty.classList.add("hidden");
    main.classList.remove("hidden");
    try {
      renderTranscript(run);
    } catch (error) {
      renderPanelRuntimeFailure(
        "ACP Skills transcript renderer failed: " +
          (error && error.message ? error.message : String(error)),
      );
    }
  }

  function render(snapshot) {
    captureReplyDraft();
    state.snapshot = applyPendingSelection(snapshot || {});
    renderAssistantPanelRuntime(state.snapshot);
    $("acp-skill-run-drawer").classList.toggle("hidden", !state.runDrawerOpen);
    $("acp-skill-run-details").classList.toggle("hidden", !state.detailsOpen);
    renderSelectedRun(state.snapshot);
    $("acp-skill-run-drawer").classList.toggle("hidden", !state.runDrawerOpen);
    $("acp-skill-run-details").classList.toggle("hidden", !state.detailsOpen);
  }

  function closeAllDrawers() {
    captureReplyDraft();
    state.runDrawerOpen = false;
    state.detailsOpen = false;
    state.permissionRequestDrawerOpen = false;
    state.permissionRequestDetails = null;
    render(state.snapshot || {});
  }

  window.addEventListener("message", function (event) {
    const data = event.data || {};
    if (data.type === "assistant-panel:close-drawers") {
      closeAllDrawers();
      return;
    }
    if (data.type === "acp-skill-run:init" || data.type === "acp-skill-run:snapshot") {
      render(data.payload || {});
    }
  });

  document.getElementById("acp-skill-chat-mode-plain")?.addEventListener("click", function () {
    handleAssistantPanelAction("set-chat-display-mode", { mode: "plain" });
  });

  document.getElementById("acp-skill-chat-mode-bubble")?.addEventListener("click", function () {
    handleAssistantPanelAction("set-chat-display-mode", { mode: "bubble" });
  });

  document.addEventListener("DOMContentLoaded", function () {
    sendAction("ready", {});
  });
})();
