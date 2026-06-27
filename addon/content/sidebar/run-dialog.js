(function () {
  "use strict";

  const state = {
    snapshot: null,
    workspaceEnvelope: null,
    bridgePrefix: "run-dialog",
    hostMode: "dialog",
    drawerOpen: false,
    detailsOpen: false,
    chatDisplayMode: "plain",
    markdownParser: undefined,
    transcriptNodeMap: new Map(),
    transcriptOrderKey: "",
    transcriptModeKey: "",
    transcriptRevision: null,
    transcriptRenderedMode: "",
    transcriptRenderToken: 0,
    pendingTranscriptSnapshot: null,
    toolActivityExpandedIds: new Set(),
  };

  const SIDEBAR_ACTION_BRIDGE_KEY = "__zsSkillRunnerSidebarBridge";
  const runRootEl = document.getElementById("run-root");
  const mainEl = document.getElementById("skillrunner-main");
  const emptyEl = document.getElementById("skillrunner-empty");
  const transcriptEl = document.getElementById("chat-panel");
  const plainModeEl = document.getElementById("chat-mode-plain");
  const bubbleModeEl = document.getElementById("chat-mode-bubble");
  const hintEl = document.getElementById("skillrunner-hint");

  function safeText(value) {
    return typeof value === "string"
      ? value
      : value == null
        ? ""
        : String(value);
  }

  function normalizedStatus() {
    return safeText(state.snapshot && state.snapshot.status)
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
  }

  function wrappedWindow() {
    return window.wrappedJSObject && typeof window.wrappedJSObject === "object"
      ? window.wrappedJSObject
      : null;
  }

  function resolveSidebarActionBridge() {
    const wrapped = wrappedWindow();
    const bridge =
      (wrapped && wrapped[SIDEBAR_ACTION_BRIDGE_KEY]) ||
      window[SIDEBAR_ACTION_BRIDGE_KEY];
    return bridge && typeof bridge.sendAction === "function" ? bridge : null;
  }

  function sendAction(action, payload) {
    if (state.hostMode === "sidebar") {
      try {
        const sidebarBridge = resolveSidebarActionBridge();
        if (sidebarBridge) {
          sidebarBridge.sendAction(action, payload || {});
          return;
        }
      } catch {
        // Fallback to postMessage below.
      }
    }
    const prefixes =
      !state.snapshot && action === "ready"
        ? ["run-dialog", "skillrunner-sidebar"]
        : [state.bridgePrefix || "run-dialog"];
    const targets = [window.parent, window.top, window.opener];
    prefixes.forEach(function (prefix) {
      targets.forEach(function (target) {
        if (!target) return;
        try {
          target.postMessage(
            { type: prefix + ":action", action, payload: payload || {} },
            "*",
          );
        } catch {
          // ignored
        }
      });
    });
  }

  function withOptimisticSelectedTask(envelope, taskKey) {
    const key = safeText(taskKey);
    if (!key || !envelope || typeof envelope !== "object") return envelope;
    return Object.assign({}, envelope, {
      workspace: Object.assign({}, envelope.workspace || {}, {
        selectedTaskKey: key,
      }),
    });
  }

  function assistantPanelModel() {
    return window.AssistantPanelModel &&
      typeof window.AssistantPanelModel === "object"
      ? window.AssistantPanelModel
      : null;
  }

  function assistantPanelRenderer() {
    return window.AssistantPanelRenderer &&
      typeof window.AssistantPanelRenderer === "object"
      ? window.AssistantPanelRenderer
      : null;
  }

  function assistantTranscriptRenderer() {
    return window.AssistantTranscriptRenderer &&
      typeof window.AssistantTranscriptRenderer === "object"
      ? window.AssistantTranscriptRenderer
      : null;
  }

  function createCompatibleThinkingChatModel(initialMode) {
    const core = window.SkillRunnerThinkingChatCore;
    if (!core || typeof core.createThinkingChatModel !== "function")
      return null;
    const model = core.createThinkingChatModel(initialMode);
    if (model && typeof model.setDisplayMode === "function")
      model.setDisplayMode(initialMode);
    if (!model || typeof model.getEntries !== "function") return null;
    if (typeof model.getDisplayMode !== "function") {
      model.getDisplayMode = function () {
        return safeText(initialMode).trim().toLowerCase() === "bubble"
          ? "bubble"
          : "plain";
      };
    }
    if (typeof model.toggleRevision !== "function") {
      model.toggleRevision = function () {
        return false;
      };
    }
    return model;
  }

  function escapeHtml(value) {
    return safeText(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function ensureMarkdownParser() {
    if (state.markdownParser !== undefined) return state.markdownParser;
    if (!window.markdownit || typeof window.markdownit !== "function") {
      state.markdownParser = null;
      return null;
    }
    const parser = window.markdownit({
      html: false,
      xhtmlOut: false,
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
        // Markdown without math is acceptable.
      }
    }
    state.markdownParser = parser;
    return parser;
  }

  function renderMarkdown(value) {
    const parser = ensureMarkdownParser();
    if (!parser) return escapeHtml(value).replace(/\n/g, "<br>");
    try {
      return parser.render(safeText(value));
    } catch {
      return escapeHtml(value).replace(/\n/g, "<br>");
    }
  }

  function toChatEvent(raw) {
    if (!raw || typeof raw !== "object") return null;
    const role = safeText(raw.role).trim().toLowerCase();
    const normalizedRole =
      role === "assistant" || role === "user" || role === "system"
        ? role
        : "system";
    const displayText = safeText(raw.displayText || raw.display_text);
    const rawText = safeText(raw.text || raw.summary);
    const kind = safeText(raw.kind);
    if (
      !(displayText || rawText).trim() &&
      kind.trim().toLowerCase() !== "assistant_revision"
    ) {
      return null;
    }
    return {
      seq: Number(raw.seq || 0),
      ts: safeText(raw.ts),
      role: normalizedRole,
      kind,
      text: rawText,
      displayText: displayText || rawText,
      displayFormat: safeText(raw.displayFormat || raw.display_format),
      attempt: Number(raw.attempt || 1),
      correlation:
        raw.correlation && typeof raw.correlation === "object"
          ? raw.correlation
          : {},
    };
  }

  function chatRoleText(role) {
    if (role === "assistant") return "Agent";
    if (role === "user") return "User";
    return "System";
  }

  function skillRunnerProcessType(source) {
    const item = source && typeof source === "object" ? source : {};
    const correlation =
      item.correlation && typeof item.correlation === "object"
        ? item.correlation
        : {};
    return safeText(
      item.processType ||
        item.process_type ||
        item.processKind ||
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
    const item = source && typeof source === "object" ? source : {};
    const correlation =
      item.correlation && typeof item.correlation === "object"
        ? item.correlation
        : {};
    const details =
      correlation.details && typeof correlation.details === "object"
        ? correlation.details
        : item.details && typeof item.details === "object"
          ? item.details
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
    const fallbackSummary = safeText(
      item.summary || item.displayText || item.display_text || item.text,
    );
    return {
      toolName,
      inputSummary: inputSummary || undefined,
      summary: inputSummary || fallbackSummary,
      text: fallbackSummary || inputSummary,
    };
  }

  function skillRunnerToolState(source) {
    const item = source && typeof source === "object" ? source : {};
    const tool = skillRunnerToolDetails(item);
    const value = safeText(
      item.state ||
        item.status ||
        tool.correlation.state ||
        tool.correlation.status,
    )
      .trim()
      .toLowerCase();
    return value || "completed";
  }

  function buildSkillRunnerToolItem(source, id, createdAt) {
    const item = source && typeof source === "object" ? source : {};
    const processType = skillRunnerProcessType(item);
    const display = skillRunnerToolDisplay(item, processType);
    return {
      id,
      kind: "tool",
      state: skillRunnerToolState(item),
      toolName: display.toolName,
      inputSummary: display.inputSummary,
      summary: display.summary,
      text: display.text,
      createdAt,
    };
  }

  function buildSkillRunnerProcessItem(items, id) {
    const text = (Array.isArray(items) ? items : [])
      .map(function (item) {
        return safeText(
          item.displayText || item.display_text || item.text || item.summary,
        );
      })
      .filter(Boolean)
      .join("\n");
    return text
      ? {
          id,
          kind: "process",
          label: "Thinking",
          text,
        }
      : null;
  }

  function messageText(event) {
    return safeText(
      event &&
        (event.displayText ||
          event.display_text ||
          event.text ||
          event.summary),
    );
  }

  function skillRunnerConversationItems(session) {
    const messages = (
      Array.isArray(session && session.messages) ? session.messages : []
    )
      .map(toChatEvent)
      .filter(Boolean);
    const model = createCompatibleThinkingChatModel(state.chatDisplayMode);
    if (!model) {
      return messages.map(function (event, index) {
        const processType = skillRunnerProcessType(event);
        if (
          event.kind === "assistant_process" &&
          isSkillRunnerToolProcess(processType)
        ) {
          return buildSkillRunnerToolItem(
            event,
            "skillrunner-tool-" + String(event.seq || index),
            event.ts,
          );
        }
        return {
          id: "skillrunner-message-" + String(event.seq || index),
          kind: event.kind === "assistant_process" ? "process" : "message",
          role: event.role,
          label:
            event.kind === "assistant_process"
              ? "Thinking"
              : chatRoleText(event.role),
          text: messageText(event),
          createdAt: event.ts,
        };
      });
    }
    messages.forEach(function (event) {
      model.consume(event);
    });
    return model.getEntries().flatMap(function (entry, index) {
      if (entry.type === "thinking") {
        const items = Array.isArray(entry.items) ? entry.items : [];
        const projected = [];
        let processGroup = [];
        function flushProcessGroup(groupIndex) {
          const processItem = buildSkillRunnerProcessItem(
            processGroup,
            (entry.id || "skillrunner-process-" + String(index)) +
              "-process-" +
              String(groupIndex),
          );
          if (processItem) projected.push(processItem);
          processGroup = [];
        }
        items.forEach(function (item, itemIndex) {
          const processType = skillRunnerProcessType(item);
          if (isSkillRunnerToolProcess(processType)) {
            flushProcessGroup(itemIndex);
            projected.push(
              buildSkillRunnerToolItem(
                item,
                (entry.id || "skillrunner-process-" + String(index)) +
                  "-tool-" +
                  String(itemIndex),
                item.ts,
              ),
            );
            return;
          }
          processGroup.push(item);
        });
        flushProcessGroup(items.length);
        return projected;
      }
      if (entry.type === "revision") {
        const event = entry.originalEvent || entry.revisionEvent || {};
        return [
          {
            id: entry.id || "skillrunner-revision-" + String(index),
            kind: "message",
            role: "assistant",
            text: messageText(event) || "Rejected final reply",
            revision: {
              count: 1,
              latestStatus: "replaced",
              latestRepairRound: Number(event.attempt || 1),
            },
            createdAt: event.ts,
          },
        ];
      }
      const event = entry.event || {};
      return [
        {
          id: "skillrunner-message-" + String(event.seq || index),
          kind: "message",
          role: event.role || "assistant",
          text: messageText(event),
          createdAt: event.ts,
        },
      ];
    });
  }

  function projectAssistantPanelSnapshot(envelope) {
    const helper = assistantPanelModel();
    const source = envelope || state.workspaceEnvelope || {};
    const session =
      source.session && typeof source.session === "object"
        ? source.session
        : source;
    const base =
      helper && typeof helper.projectSkillRunnerPanelSnapshot === "function"
        ? helper.projectSkillRunnerPanelSnapshot(source)
        : {
            kind: "skillrunner",
            context: {
              title: safeText(
                panelSnapshot.labels && panelSnapshot.labels.title,
              ),
              status: "idle",
            },
            lifecycle: { executionState: "idle" },
            conversation: {
              items: [],
              plan: { entries: [] },
              interaction: { kind: "hidden" },
            },
          };
    const conversationItems = skillRunnerConversationItems(session);
    return Object.assign({}, base, {
      conversation: Object.assign({}, base.conversation || {}, {
        items: conversationItems,
      }),
    });
  }

  function currentRequestId() {
    return safeText(state.snapshot && state.snapshot.requestId);
  }

  function currentTaskKey() {
    const workspace =
      state.workspaceEnvelope &&
      state.workspaceEnvelope.workspace &&
      typeof state.workspaceEnvelope.workspace === "object"
        ? state.workspaceEnvelope.workspace
        : {};
    return safeText(workspace.selectedTaskKey);
  }

  function pendingOptions() {
    const ask =
      state.snapshot &&
      state.snapshot.pendingAskUser &&
      typeof state.snapshot.pendingAskUser === "object"
        ? state.snapshot.pendingAskUser
        : null;
    const raw =
      ask && Array.isArray(ask.options)
        ? ask.options
        : state.snapshot && state.snapshot.pendingOptions;
    return (Array.isArray(raw) ? raw : [])
      .map(function (option) {
        if (typeof option === "string") return { label: option, value: option };
        if (!option || typeof option !== "object") return null;
        const label = safeText(
          option.label || option.name || option.title || option.value,
        );
        const value = safeText(
          option.value || option.reply || option.message || label,
        );
        return label && value ? { label, value } : null;
      })
      .filter(Boolean);
  }

  function submitReply(message, payload) {
    if (!state.snapshot) return;
    const requestId = currentRequestId();
    if (!requestId) return;
    const textValue = safeText(message);
    const status = normalizedStatus();
    if (payload && payload.mode === "auth" && payload.submission) {
      sendAction("reply-run", Object.assign({ requestId }, payload));
      return;
    }
    if (status === "waiting_auth") {
      if (!textValue) return;
      sendAction("reply-run", {
        requestId,
        mode: "auth",
        authSessionId: safeText(state.snapshot.authSessionId),
        submission: {
          kind: safeText(state.snapshot.authInputKind) || "auth_code_or_url",
          value: textValue,
        },
      });
      return;
    }
    const interactionId = Number(state.snapshot.pendingInteractionId || 0);
    if (!interactionId || !textValue) return;
    const matchedOption = pendingOptions().find(function (option) {
      return option.value === textValue || option.label === textValue;
    });
    sendAction("reply-run", {
      requestId,
      mode: "interaction",
      interactionId,
      responseObject: { text: textValue },
      ...(matchedOption ? { responseValue: matchedOption.value } : {}),
    });
  }

  function readAuthImportFiles() {
    const inputs = hintEl
      ? hintEl.querySelectorAll("input[data-assistant-auth-import-file]")
      : [];
    const jobs = [];
    inputs.forEach(function (input) {
      if (!input.files || input.files.length === 0) return;
      const file = input.files[0];
      const name =
        input.getAttribute("data-assistant-auth-import-name") || file.name;
      jobs.push(
        new Promise(function (resolve, reject) {
          const reader = new FileReader();
          reader.onload = function () {
            const raw = safeText(reader.result);
            const mark = "base64,";
            const index = raw.indexOf(mark);
            if (index < 0) {
              reject(new Error("base64 conversion failed"));
              return;
            }
            resolve({ name, contentBase64: raw.slice(index + mark.length) });
          };
          reader.onerror = function () {
            reject(new Error("file read failed"));
          };
          reader.readAsDataURL(file);
        }),
      );
    });
    return Promise.all(jobs);
  }

  function handleAssistantPanelAction(action, payload) {
    const data = payload && typeof payload === "object" ? payload : {};
    if (action === "open-context-drawer") {
      state.drawerOpen = true;
      render(state.workspaceEnvelope || {});
      sendAction("toggle-drawer", {});
      return;
    }
    if (action === "close-context-drawer") {
      state.drawerOpen = false;
      render(state.workspaceEnvelope || {});
      sendAction("close-drawer", {});
      return;
    }
    if (action === "openDetails") {
      state.detailsOpen = true;
      render(state.workspaceEnvelope || {});
      return;
    }
    if (action === "close-details-drawer") {
      state.detailsOpen = false;
      render(state.workspaceEnvelope || {});
      return;
    }
    if (action === "select-task") {
      const taskKey = safeText(data.taskKey);
      state.drawerOpen = false;
      state.workspaceEnvelope = withOptimisticSelectedTask(
        state.workspaceEnvelope || {},
        taskKey,
      );
      render(state.workspaceEnvelope || {});
      sendAction("close-drawer", {});
      sendAction("select-task", { taskKey });
      return;
    }
    if (action === "cancel" || action === "cancel-run") {
      const requestId = currentRequestId();
      if (!requestId) return;
      sendAction("cancel-run", { requestId });
      return;
    }
    if (action === "archive-run") {
      const runKey = safeText(data.runKey || currentTaskKey());
      sendAction("archive-run", {
        runKey,
      });
      return;
    }
    if (action === "copy-request-id" || action === "copy-diagnostics") {
      sendAction(
        action,
        Object.assign({}, data, {
          requestId: safeText(data.requestId || currentRequestId()),
        }),
      );
      return;
    }
    if (action === "open-backend-manager") {
      sendAction("open-backend-manager", {});
      return;
    }
    if (action === "reply" || action === "reply-run") {
      submitReply(data.message || data.value || "", data);
      return;
    }
    if (action === "resolve-permission") {
      const requestId = safeText(data.requestId || currentRequestId());
      if (!requestId) return;
      sendAction(
        "resolve-permission",
        Object.assign({}, data, {
          requestId,
        }),
      );
      return;
    }
    if (action === "auth-import-run") {
      const requestId = currentRequestId();
      if (!requestId) return;
      readAuthImportFiles()
        .then(function (files) {
          if (!files.length) return;
          sendAction("auth-import-run", {
            requestId,
            providerId: safeText(
              state.snapshot && state.snapshot.authProviderId,
            ),
            files,
          });
        })
        .catch(function (error) {
          sendAction("auth-import-run", {
            requestId,
            providerId: safeText(
              state.snapshot && state.snapshot.authProviderId,
            ),
            error: safeText(error && error.message),
            files: [],
          });
        });
      return;
    }
    if (action === "set-chat-display-mode") {
      state.chatDisplayMode = data.mode === "bubble" ? "bubble" : "plain";
      render(state.workspaceEnvelope || {});
      return;
    }
    sendAction(action, data);
  }

  function renderTranscript(panelSnapshot) {
    const renderer = assistantTranscriptRenderer();
    if (!renderer || typeof renderer.renderAssistantTranscript !== "function")
      return;
    renderer.renderAssistantTranscript({
      container: transcriptEl,
      items:
        panelSnapshot.conversation &&
        Array.isArray(panelSnapshot.conversation.items)
          ? panelSnapshot.conversation.items
          : [],
      mode: state.chatDisplayMode,
      variant: "skillrunner",
      renderMarkdown,
      labels:
        panelSnapshot.labels?.assistantPanel?.transcript ||
        panelSnapshot.labels?.transcript ||
        {},
      emptyText:
        panelSnapshot.labels?.assistantPanel?.transcript?.empty ||
        panelSnapshot.labels?.transcript?.empty ||
        "No chat events yet.",
      nodeMap: state.transcriptNodeMap,
      orderKey: state.transcriptOrderKey,
      modeKey: state.transcriptModeKey,
      expandedIds: state.toolActivityExpandedIds,
      onToggleExpanded: function (id) {
        if (state.toolActivityExpandedIds.has(id)) {
          state.toolActivityExpandedIds.delete(id);
        } else {
          state.toolActivityExpandedIds.add(id);
        }
        renderTranscript(panelSnapshot);
      },
      onRendered: function (result) {
        state.transcriptOrderKey = result.orderKey;
        state.transcriptModeKey = result.modeKey;
      },
    });
  }

  function scheduleTranscriptRender(panelSnapshot) {
    const raw = panelSnapshot && panelSnapshot.raw ? panelSnapshot.raw : {};
    const revision = Number(raw && raw.transcriptRevision) || 0;
    if (
      state.transcriptRevision === revision &&
      state.transcriptRenderedMode === state.chatDisplayMode
    ) {
      return;
    }
    const token = state.transcriptRenderToken + 1;
    state.transcriptRenderToken = token;
    state.pendingTranscriptSnapshot = panelSnapshot || null;
    const run = function () {
      if (token !== state.transcriptRenderToken) return;
      const pending = state.pendingTranscriptSnapshot;
      state.pendingTranscriptSnapshot = null;
      renderTranscript(pending || {});
      state.transcriptRevision = revision;
      state.transcriptRenderedMode = state.chatDisplayMode;
    };
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(function () {
        setTimeout(run, 0);
      });
      return;
    }
    setTimeout(run, 0);
  }

  function render(envelope) {
    state.workspaceEnvelope =
      envelope && typeof envelope === "object" ? envelope : {};
    state.snapshot =
      state.workspaceEnvelope.session &&
      typeof state.workspaceEnvelope.session === "object"
        ? state.workspaceEnvelope.session
        : null;
    const panelSnapshot = projectAssistantPanelSnapshot(
      state.workspaceEnvelope,
    );
    document.title =
      panelSnapshot.context.title ||
      safeText(panelSnapshot.labels && panelSnapshot.labels.title);
    const hasSession = !!state.snapshot;
    emptyEl.classList.toggle("hidden", hasSession);
    mainEl.classList.toggle("hidden", !hasSession);
    if (plainModeEl)
      plainModeEl.setAttribute(
        "aria-pressed",
        state.chatDisplayMode === "plain" ? "true" : "false",
      );
    if (bubbleModeEl)
      bubbleModeEl.setAttribute(
        "aria-pressed",
        state.chatDisplayMode === "bubble" ? "true" : "false",
      );
    const renderer = assistantPanelRenderer();
    if (
      renderer &&
      typeof renderer.renderAssistantPanelSnapshot === "function"
    ) {
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
        },
        onAction: handleAssistantPanelAction,
        root: runRootEl,
        regions: {
          toolbar: document.getElementById("skillrunner-toolbar"),
          banner: document.getElementById("skillrunner-banner"),
          conversation: document.getElementById(
            "skillrunner-conversation-window",
          ),
          plan: document.getElementById("skillrunner-plan"),
          hint: document.getElementById("skillrunner-hint"),
          reply: document.getElementById("reply-form"),
          drawer: document.getElementById("skillrunner-drawer"),
          details: document.getElementById("skillrunner-details"),
        },
      });
    }
    document
      .getElementById("skillrunner-drawer")
      .classList.toggle("hidden", !state.drawerOpen);
    document
      .getElementById("skillrunner-details")
      .classList.toggle("hidden", !state.detailsOpen);
    scheduleTranscriptRender(panelSnapshot);
  }

  function closeAllDrawers() {
    state.drawerOpen = false;
    state.detailsOpen = false;
    render(state.workspaceEnvelope || {});
  }

  if (plainModeEl) {
    plainModeEl.addEventListener("click", function () {
      state.chatDisplayMode = "plain";
      render(state.workspaceEnvelope || {});
    });
  }
  if (bubbleModeEl) {
    bubbleModeEl.addEventListener("click", function () {
      state.chatDisplayMode = "bubble";
      render(state.workspaceEnvelope || {});
    });
  }

  window.addEventListener("message", function (event) {
    const data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.type === "assistant-panel:close-drawers") {
      closeAllDrawers();
      return;
    }
    if (
      data.type === "run-dialog:init" ||
      data.type === "run-dialog:snapshot" ||
      data.type === "skillrunner-sidebar:init" ||
      data.type === "skillrunner-sidebar:snapshot"
    ) {
      state.bridgePrefix =
        String(data.type).indexOf("skillrunner-sidebar:") === 0
          ? "skillrunner-sidebar"
          : "run-dialog";
      const payload = data.payload || null;
      state.hostMode =
        payload && payload.hostMode === "sidebar" ? "sidebar" : "dialog";
      const drawer =
        payload && payload.drawer && typeof payload.drawer === "object"
          ? payload.drawer
          : null;
      if (drawer && typeof drawer.open === "boolean")
        state.drawerOpen = drawer.open;
      render(payload || {});
    }
  });

  sendAction("ready", {});
})();
