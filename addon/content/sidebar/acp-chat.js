(function () {
  "use strict";

  const state = {
    snapshot: {},
    chatDisplayMode: "plain",
    sessionDrawerOpen: false,
    detailsDrawerOpen: false,
    transcriptNodeMap: new Map(),
    transcriptOrderKey: "",
    transcriptMode: "",
    transcriptRevision: null,
    transcriptRenderedMode: "",
    transcriptBackendId: "",
    transcriptConversationId: "",
    transcriptItems: [],
    transcriptStartCursor: null,
    transcriptPrevCursor: null,
    transcriptNextCursor: null,
    transcriptTotal: 0,
    transcriptLoadingKey: "",
    transcriptLoadedRevision: null,
    markdownParser: undefined,
    toolActivityExpandedIds: new Set(),
    permissionRequestDetails: null,
    permissionRequestDrawerOpen: false,
    pendingRenderSnapshot: null,
    renderScheduled: false,
  };

  const SIDEBAR_ACTION_BRIDGE_KEY = "__zsAcpSidebarBridge";
  const SHOW_MORE_VALUE = "__show_more__";

  const rootEl = document.querySelector(".acp-chat-shell");
  const transcriptEl = document.getElementById("acp-transcript");
  const plainModeEl = document.getElementById("acp-chat-mode-plain");
  const bubbleModeEl = document.getElementById("acp-chat-mode-bubble");

  function safeText(value) {
    return String(value == null ? "" : value).trim();
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

  function resolveSidebarActionBridge() {
    const wrappedWindow =
      window.wrappedJSObject && typeof window.wrappedJSObject === "object"
        ? window.wrappedJSObject
        : null;
    const bridge =
      (wrappedWindow && wrappedWindow[SIDEBAR_ACTION_BRIDGE_KEY]) ||
      window[SIDEBAR_ACTION_BRIDGE_KEY];
    return bridge && typeof bridge.sendAction === "function" ? bridge : null;
  }

  function sendAction(action, payload) {
    const data = payload && typeof payload === "object" ? payload : {};
    try {
      const bridge = resolveSidebarActionBridge();
      if (bridge) {
        bridge.sendAction(action, data);
        return;
      }
    } catch {
      // Fall back to postMessage below.
    }
    const message = { type: "acp:action", action, payload: data };
    const targets = [window.parent, window.top, window.opener];
    const seen = new Set();
    targets.forEach(function (target) {
      if (!target || seen.has(target)) return;
      seen.add(target);
      try {
        target.postMessage(message, "*");
      } catch {
        // Ignore cross-window messaging failures.
      }
    });
  }

  function resetTranscriptCache() {
    state.transcriptNodeMap.clear();
    state.transcriptOrderKey = "";
    state.transcriptMode = "";
    state.transcriptRevision = null;
    state.transcriptRenderedMode = "";
    state.transcriptItems = [];
    state.transcriptStartCursor = null;
    state.transcriptPrevCursor = null;
    state.transcriptNextCursor = null;
    state.transcriptTotal = 0;
    state.transcriptLoadingKey = "";
    state.transcriptLoadedRevision = null;
  }

  function requestTranscriptPage(snapshot, cursor) {
    const backendId = safeText(snapshot && snapshot.backendId);
    const conversationId = safeText(snapshot && snapshot.conversationId);
    if (!conversationId) return;
    const key =
      backendId +
      ":" +
      conversationId +
      ":" +
      (cursor == null ? "tail" : cursor);
    if (state.transcriptLoadingKey === key) return;
    state.transcriptLoadingKey = key;
    sendAction("load-chat-transcript-page", {
      backendId,
      conversationId,
      cursor: typeof cursor === "number" ? cursor : undefined,
      limit: 80,
    });
  }

  function isTranscriptTailPage() {
    return state.transcriptNextCursor === null;
  }

  function requestTranscriptResync(snapshot, backendId, conversationId) {
    const tailPage = isTranscriptTailPage();
    const cursor = tailPage ? undefined : state.transcriptStartCursor;
    resetTranscriptCache();
    state.transcriptBackendId = backendId;
    state.transcriptConversationId = conversationId;
    requestTranscriptPage(
      snapshot,
      typeof cursor === "number" ? cursor : undefined,
    );
  }

  function handleTranscriptPage(payload) {
    const backendId = safeText(payload && payload.backendId);
    const conversationId = safeText(payload && payload.conversationId);
    if (
      backendId !== state.transcriptBackendId ||
      conversationId !== state.transcriptConversationId
    )
      return;
    const page =
      payload &&
      payload.transcriptPage &&
      typeof payload.transcriptPage === "object"
        ? payload.transcriptPage
        : null;
    if (!page) return;
    const items = Array.isArray(page.items) ? page.items : [];
    const cursor = Number(page.cursor) || 0;
    const prepend =
      state.transcriptStartCursor !== null &&
      cursor < state.transcriptStartCursor;
    if (prepend) {
      const existingIds = new Set(
        state.transcriptItems.map(function (item) {
          return safeText(item && item.id);
        }),
      );
      state.transcriptItems = items
        .filter(function (item) {
          return !existingIds.has(safeText(item && item.id));
        })
        .concat(state.transcriptItems);
    } else {
      state.transcriptItems = items;
    }
    state.transcriptStartCursor = cursor;
    state.transcriptPrevCursor =
      typeof page.prevCursor === "number" ? page.prevCursor : null;
    state.transcriptNextCursor =
      typeof page.nextCursor === "number" ? page.nextCursor : null;
    state.transcriptTotal = Number(page.total) || state.transcriptItems.length;
    state.transcriptLoadedRevision =
      Number(page.transcriptRevision || page.eventSeq) || 0;
    state.transcriptLoadingKey = "";
    state.transcriptRevision = null;
    render(state.snapshot || {});
  }

  function handleTranscriptDeltas(payload) {
    const backendId = safeText(payload && payload.backendId);
    const conversationId = safeText(payload && payload.conversationId);
    if (
      backendId !== state.transcriptBackendId ||
      conversationId !== state.transcriptConversationId
    )
      return;
    const deltas = Array.isArray(payload && payload.transcriptDeltas)
      ? payload.transcriptDeltas
      : [];
    if (!deltas.length) return;
    const tailPage = isTranscriptTailPage();
    for (let index = 0; index < deltas.length; index += 1) {
      const delta = deltas[index] || {};
      const nextSeq = Number(delta.eventSeq) || 0;
      if (
        delta.resyncRequired ||
        (state.transcriptLoadedRevision &&
          nextSeq &&
          nextSeq !== state.transcriptLoadedRevision + 1)
      ) {
        requestTranscriptResync(
          state.snapshot || {},
          backendId,
          conversationId,
        );
        return;
      }
      const itemId = safeText(delta.itemId);
      if (delta.op === "upsert_item" && delta.item) {
        const existingIndex = state.transcriptItems.findIndex(function (item) {
          return safeText(item && item.id) === itemId;
        });
        if (existingIndex >= 0) {
          state.transcriptItems[existingIndex] = delta.item;
        } else if (tailPage) {
          state.transcriptItems.push(delta.item);
        }
      } else if (delta.op === "append_text") {
        const target = state.transcriptItems.find(function (item) {
          return safeText(item && item.id) === itemId;
        });
        if (!target || typeof target.text !== "string") {
          state.transcriptLoadedRevision =
            nextSeq || state.transcriptLoadedRevision;
          if (tailPage) {
            requestTranscriptPage(state.snapshot || {}, undefined);
            return;
          }
          continue;
        }
        target.text += String(delta.text || "");
        target.updatedAt = delta.createdAt || target.updatedAt;
      } else if (delta.op === "patch_item" && delta.patch) {
        const patchTarget = state.transcriptItems.find(function (item) {
          return safeText(item && item.id) === itemId;
        });
        if (!patchTarget) {
          state.transcriptLoadedRevision =
            nextSeq || state.transcriptLoadedRevision;
          if (tailPage) {
            requestTranscriptPage(state.snapshot || {}, undefined);
            return;
          }
          continue;
        }
        Object.assign(patchTarget, delta.patch, {
          id: patchTarget.id,
          kind: patchTarget.kind,
        });
      } else if (delta.op === "delete_item") {
        state.transcriptItems = state.transcriptItems.filter(function (item) {
          return safeText(item && item.id) !== itemId;
        });
      }
      state.transcriptLoadedRevision =
        nextSeq || state.transcriptLoadedRevision;
    }
    state.transcriptRevision = null;
    render(state.snapshot || {});
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

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
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
      breaks: true,
      linkify: false,
      typographer: false,
      highlight: null,
    });
    if (window.texmath && window.katex) {
      try {
        parser.use(window.texmath, {
          engine: window.katex,
          delimiters: "dollars",
          katexOptions: { throwOnError: false, output: "htmlAndMathML" },
        });
      } catch {
        // Markdown without math is still usable.
      }
    }
    state.markdownParser = parser;
    return parser;
  }

  function renderMarkdown(text) {
    const parser = ensureMarkdownParser();
    if (!parser) return escapeHtml(text);
    try {
      return parser.render(String(text || "")).trimEnd();
    } catch {
      return escapeHtml(text);
    }
  }

  function formatTime(value) {
    const text = safeText(value);
    if (!text) return "";
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? text : parsed.toLocaleString();
  }

  function projectConversationView(snapshot) {
    const helper = assistantConversationView();
    if (helper && typeof helper.projectAcpChatConversationView === "function") {
      return helper.projectAcpChatConversationView({
        ...(snapshot || {}),
        items: state.transcriptItems,
      });
    }
    return {
      items: state.transcriptItems,
      plan: { entries: [], activeEntries: [], active: false },
      interaction: { kind: "hidden" },
      usage: snapshot && snapshot.usage ? snapshot.usage : null,
    };
  }

  function projectPanelSnapshot(snapshot) {
    const helper = assistantPanelModel();
    const panel =
      helper && typeof helper.projectAcpChatPanelSnapshot === "function"
        ? helper.projectAcpChatPanelSnapshot(snapshot || {})
        : {
            kind: "acp-chat",
            context: {
              id: safeText(snapshot && snapshot.sessionId),
              title:
                safeText(snapshot && snapshot.title) ||
                safeText(snapshot && snapshot.labels && snapshot.labels.title),
              status: safeText(snapshot && snapshot.status) || "idle",
            },
            conversation: projectConversationView(snapshot || {}),
          };
    return panel;
  }

  function handlePanelAction(action, payload) {
    const data = payload && typeof payload === "object" ? payload : {};
    const snapshot = state.snapshot || {};
    if (action === "open-context-drawer") {
      state.sessionDrawerOpen = true;
      render(snapshot);
      return;
    }
    if (action === "close-context-drawer") {
      state.sessionDrawerOpen = false;
      render(snapshot);
      return;
    }
    if (action === "openDetails") {
      state.detailsDrawerOpen = true;
      render(snapshot);
      return;
    }
    if (action === "open-permission-request") {
      state.permissionRequestDetails = data.permissionRequest || null;
      state.permissionRequestDrawerOpen = true;
      render(snapshot);
      return;
    }
    if (action === "close-permission-request") {
      state.permissionRequestDrawerOpen = false;
      render(snapshot);
      return;
    }
    if (action === "close-details-drawer") {
      state.detailsDrawerOpen = false;
      render(snapshot);
      return;
    }
    if (action === "set-active-backend") {
      sendAction("set-active-backend", {
        backendId: safeText(data.backendId || data.value),
      });
      return;
    }
    if (action === "set-active-conversation") {
      const option = data.option || {};
      if (option.sentinel === "show-more" || data.value === SHOW_MORE_VALUE) {
        state.sessionDrawerOpen = true;
        render(snapshot);
        return;
      }
      sendAction("set-active-conversation", {
        conversationId: safeText(data.conversationId || data.value),
        backendId: safeText(
          data.backendId ||
            option.backendId ||
            snapshot.activeBackendId ||
            snapshot.backendId,
        ),
      });
      return;
    }
    if (action === "new-conversation") {
      sendAction("new-conversation", {
        backendId: safeText(
          data.backendId || snapshot.activeBackendId || snapshot.backendId,
        ),
      });
      return;
    }
    if (action === "connect") {
      sendAction("connect", {
        backendId: safeText(
          data.backendId || snapshot.activeBackendId || snapshot.backendId,
        ),
      });
      return;
    }
    if (action === "disconnect") {
      sendAction("disconnect", {
        backendId: safeText(
          data.backendId || snapshot.activeBackendId || snapshot.backendId,
        ),
      });
      return;
    }
    if (action === "authenticate") {
      sendAction("authenticate", {
        backendId: safeText(
          data.backendId || snapshot.activeBackendId || snapshot.backendId,
        ),
        methodId: safeText(data.methodId),
      });
      return;
    }
    if (action === "set-mode") {
      sendAction("set-mode", { modeId: safeText(data.modeId || data.value) });
      return;
    }
    if (action === "set-model") {
      sendAction("set-model", {
        modelId: safeText(data.modelId || data.value),
      });
      return;
    }
    if (action === "set-reasoning-effort") {
      sendAction("set-reasoning-effort", {
        effortId: safeText(data.effortId || data.value),
      });
      return;
    }
    if (action === "send-prompt") {
      const message = safeText(data.message);
      if (message) sendAction("send-prompt", { message });
      return;
    }
    if (action === "cancel") {
      sendAction("cancel", {});
      return;
    }
    if (action === "set-chat-display-mode") {
      state.chatDisplayMode = data.mode === "bubble" ? "bubble" : "plain";
      sendAction("set-chat-display-mode", { mode: state.chatDisplayMode });
      render(snapshot);
      return;
    }
    sendAction(action, data);
  }

  function renderPanel(snapshot) {
    const renderer = assistantPanelRenderer();
    if (
      !renderer ||
      typeof renderer.renderAssistantPanelSnapshot !== "function"
    )
      return;
    const panelSnapshot = projectPanelSnapshot(snapshot || {});
    if (!snapshot || !snapshot.pendingPermissionRequest) {
      state.permissionRequestDetails = null;
      state.permissionRequestDrawerOpen = false;
    }
    panelSnapshot.drawers = panelSnapshot.drawers || {};
    panelSnapshot.drawers.permissionRequest = state.permissionRequestDetails;
    panelSnapshot.drawers.permissionRequestOpen =
      state.permissionRequestDrawerOpen;
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
      onAction: handlePanelAction,
      root: rootEl,
      regions: {
        toolbar: document.getElementById("acp-chat-toolbar"),
        banner: document.getElementById("acp-chat-banner"),
        conversation: document.getElementById("acp-chat-conversation-window"),
        plan: document.getElementById("acp-chat-plan-panel"),
        hint: document.getElementById("acp-chat-interaction"),
        reply: document.getElementById("acp-chat-reply"),
        drawer: document.getElementById("acp-chat-drawer"),
        details: document.getElementById("acp-chat-details"),
      },
    });
    document
      .getElementById("acp-chat-drawer")
      ?.classList.toggle("hidden", !state.sessionDrawerOpen);
    document
      .getElementById("acp-chat-details")
      ?.classList.toggle("hidden", !state.detailsDrawerOpen);
  }

  function renderTranscript(snapshot) {
    const backendId = safeText(snapshot && snapshot.backendId);
    const conversationId = safeText(snapshot && snapshot.conversationId);
    if (
      backendId !== state.transcriptBackendId ||
      conversationId !== state.transcriptConversationId
    ) {
      state.transcriptBackendId = backendId;
      state.transcriptConversationId = conversationId;
      resetTranscriptCache();
      state.transcriptBackendId = backendId;
      state.transcriptConversationId = conversationId;
    }
    const view = projectConversationView(snapshot || {});
    const renderer = assistantTranscriptRenderer();
    const mode = state.chatDisplayMode === "bubble" ? "bubble" : "plain";
    const revision = Math.max(
      Number(snapshot && snapshot.transcriptRevision) || 0,
      Number(state.transcriptLoadedRevision) || 0,
    );
    const shouldRequestTail =
      conversationId &&
      (state.transcriptLoadedRevision === null ||
        state.transcriptNextCursor === null);
    if (
      shouldRequestTail &&
      state.transcriptLoadedRevision !==
        (Number(snapshot && snapshot.transcriptRevision) || 0) &&
      !state.transcriptLoadingKey
    ) {
      requestTranscriptPage(snapshot, undefined);
    }
    if (
      state.transcriptRevision === revision &&
      state.transcriptRenderedMode === mode
    ) {
      return;
    }
    transcriptEl.classList.toggle("plain-mode", mode === "plain");
    transcriptEl.classList.toggle("bubble-mode", mode === "bubble");
    if (plainModeEl)
      plainModeEl.setAttribute(
        "aria-pressed",
        mode === "plain" ? "true" : "false",
      );
    if (bubbleModeEl)
      bubbleModeEl.setAttribute(
        "aria-pressed",
        mode === "bubble" ? "true" : "false",
      );
    if (!renderer || typeof renderer.renderAssistantTranscript !== "function") {
      clear(transcriptEl);
      transcriptEl.appendChild(
        el(
          "div",
          "acp-empty-state",
          safeText(
            snapshot.labels && snapshot.labels.transcriptRendererUnavailable,
          ),
        ),
      );
      return;
    }
    renderer.renderAssistantTranscript({
      container: transcriptEl,
      items: Array.isArray(view.items) ? view.items : [],
      mode,
      variant: "acp-chat",
      nodeMap: state.transcriptNodeMap,
      orderKey: state.transcriptOrderKey,
      modeKey: state.transcriptMode,
      expandedIds: state.toolActivityExpandedIds,
      renderMarkdown,
      formatTime,
      labels:
        snapshot.labels?.assistantPanel?.transcript ||
        snapshot.labels?.transcript ||
        {},
      emptyText:
        snapshot.labels?.assistantPanel?.transcript?.empty ||
        snapshot.labels?.transcript?.empty ||
        snapshot.labels?.empty ||
        "No messages yet.",
      onToggleExpanded: function (id) {
        if (state.toolActivityExpandedIds.has(id)) {
          state.toolActivityExpandedIds.delete(id);
        } else {
          state.toolActivityExpandedIds.add(id);
        }
        renderTranscript(state.snapshot || {});
      },
      onRendered: function (result) {
        state.transcriptOrderKey = result.orderKey;
        state.transcriptMode = result.modeKey;
        state.transcriptRevision = revision;
        state.transcriptRenderedMode = mode;
      },
    });
    if (state.transcriptPrevCursor !== null) {
      const button = el(
        "button",
        "asst-button assistant-transcript-load-earlier",
        "Load earlier",
      );
      button.type = "button";
      button.addEventListener("click", function () {
        requestTranscriptPage(snapshot, state.transcriptPrevCursor);
      });
      transcriptEl.insertBefore(button, transcriptEl.firstChild);
    }
  }

  function render(snapshot) {
    state.snapshot = snapshot && typeof snapshot === "object" ? snapshot : {};
    document.title =
      safeText(state.snapshot.title) ||
      safeText(state.snapshot.labels && state.snapshot.labels.title);
    if (
      state.snapshot.chatDisplayMode === "bubble" ||
      state.snapshot.chatDisplayMode === "plain"
    ) {
      state.chatDisplayMode = state.snapshot.chatDisplayMode;
    }
    renderPanel(state.snapshot);
    renderTranscript(state.snapshot);
  }

  function queueRender(snapshot) {
    state.pendingRenderSnapshot =
      snapshot && typeof snapshot === "object" ? snapshot : {};
    if (state.renderScheduled) return;
    state.renderScheduled = true;
    const schedule =
      typeof window.requestAnimationFrame === "function"
        ? window.requestAnimationFrame.bind(window)
        : function (callback) {
            return setTimeout(callback, 0);
          };
    schedule(function () {
      state.renderScheduled = false;
      const nextSnapshot = state.pendingRenderSnapshot || {};
      state.pendingRenderSnapshot = null;
      render(nextSnapshot);
    });
  }

  function closeAllDrawers() {
    state.sessionDrawerOpen = false;
    state.detailsDrawerOpen = false;
    state.permissionRequestDrawerOpen = false;
    state.permissionRequestDetails = null;
    render(state.snapshot || {});
  }

  if (plainModeEl) {
    plainModeEl.addEventListener("click", function () {
      handlePanelAction("set-chat-display-mode", { mode: "plain" });
    });
  }
  if (bubbleModeEl) {
    bubbleModeEl.addEventListener("click", function () {
      handlePanelAction("set-chat-display-mode", { mode: "bubble" });
    });
  }

  window.addEventListener("message", function (event) {
    const data = event.data;
    if (data && data.type === "assistant-panel:close-drawers") {
      closeAllDrawers();
      return;
    }
    if (!data) return;
    const payload =
      data.payload && typeof data.payload === "object" ? data.payload : {};
    if (data && data.type === "acp:transcript-page") {
      handleTranscriptPage(payload);
      return;
    }
    if (data && data.type === "acp:transcript-delta") {
      handleTranscriptDeltas(payload);
      return;
    }
    if (!data || (data.type !== "acp:init" && data.type !== "acp:snapshot"))
      return;
    queueRender(payload);
  });

  sendAction("ready", {});
})();
