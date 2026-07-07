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
    transcriptPageSignature: "",
    transcriptLoadingSignature: "",
    transcriptBackendId: "",
    transcriptConversationId: "",
    markdownParser: undefined,
    toolActivityExpandedIds: new Set(),
    toolActivityExpandedSignature: "",
    permissionRequestDetails: null,
    permissionRequestDrawerOpen: false,
    pendingRenderSnapshot: null,
    renderScheduled: false,
    panelRenderKey: "",
    drawerGroupCollapsed: new Map(),
    pendingTranscriptOwnerKey: "",
    pendingTranscriptBackendId: "",
    pendingTranscriptPreviousOwnerKey: "",
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

  function drawerGroupCollapseKey(sectionId, groupKey) {
    const section = safeText(sectionId);
    const group = safeText(groupKey);
    return section && group ? section + "\n" + group : "";
  }

  function compactDrawerGroupCollapseKey() {
    return Array.from(state.drawerGroupCollapsed.entries())
      .map(function (entry) {
        return entry[0] + ":" + (entry[1] === true ? "1" : "0");
      })
      .sort()
      .join("|");
  }

  function resolveDrawerGroupKey(group) {
    return safeText(
      group &&
        (group.groupKey ||
          group.backendId ||
          group.backendDisplayName ||
          group.title),
    );
  }

  function applyDrawerGroupCollapseState(panelSnapshot) {
    if (!panelSnapshot || !panelSnapshot.drawers) return panelSnapshot;
    const sections = Array.isArray(panelSnapshot.drawers.sections)
      ? panelSnapshot.drawers.sections
      : [];
    panelSnapshot.drawers.sections = sections.map(function (section) {
      const sectionId = safeText(section && section.id);
      const groups = Array.isArray(section && section.groups)
        ? section.groups
        : [];
      return Object.assign({}, section, {
        groups: groups.map(function (group) {
          const key = drawerGroupCollapseKey(
            sectionId,
            resolveDrawerGroupKey(group),
          );
          const collapsed =
            key && state.drawerGroupCollapsed.has(key)
              ? state.drawerGroupCollapsed.get(key) === true
              : group && group.collapsed === true;
          return Object.assign({}, group, { collapsed });
        }),
      });
    });
    return panelSnapshot;
  }

  function toggleDrawerGroup(data) {
    const key = drawerGroupCollapseKey(
      data && data.sectionId,
      data && (data.groupKey || data.backendId),
    );
    if (!key) return false;
    state.drawerGroupCollapsed.set(key, data && data.collapsed !== true);
    return true;
  }

  function trace(stage, details) {
    const target = window.wrappedJSObject || window;
    const key = "__zsAcpChatTrace";
    const entries = Array.isArray(target[key]) ? target[key] : [];
    entries.push(
      Object.assign(
        {
          ts: new Date().toISOString(),
          stage: stage || "unknown",
        },
        details || {},
      ),
    );
    if (entries.length > 120) entries.splice(0, entries.length - 120);
    window[key] = entries.slice();
    if (window.wrappedJSObject) window.wrappedJSObject[key] = entries.slice();
  }

  function snapshotSummary(snapshot) {
    const source = snapshot && typeof snapshot === "object" ? snapshot : {};
    const page =
      source.selectedTranscriptPage &&
      typeof source.selectedTranscriptPage === "object"
        ? source.selectedTranscriptPage
        : null;
    return {
      backendAvailability: safeText(source.backendAvailability),
      conversationAvailability: safeText(source.conversationAvailability),
      activeBackendId: safeText(source.activeBackendId || source.backendId),
      activeConversationId: safeText(
        source.activeConversationId || source.conversationId,
      ),
      status: safeText(source.status),
      backendOptions: Array.isArray(source.backendOptions)
        ? source.backendOptions.length
        : 0,
      chatSessions: Array.isArray(source.chatSessions)
        ? source.chatSessions.length
        : 0,
      selectedTranscriptPage: page
        ? {
            requestId: safeText(page.requestId),
            cursor: Number(page.cursor || 0),
            total: Number(page.total || 0),
            items: Array.isArray(page.items) ? page.items.length : 0,
          }
        : null,
    };
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
        trace("send-action-direct", { action, payloadKeys: Object.keys(data) });
        bridge.sendAction(action, data);
        return;
      }
    } catch {
      // Fall back to postMessage below.
    }
    const message = { type: "acp:action", action, payload: data };
    trace("send-action-fallback", { action, payloadKeys: Object.keys(data) });
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

  function resetTranscriptRenderState() {
    state.transcriptNodeMap.clear();
    state.transcriptOrderKey = "";
    state.transcriptMode = "";
    state.transcriptRevision = null;
    state.transcriptRenderedMode = "";
    state.transcriptPageSignature = "";
    state.transcriptLoadingSignature = "";
    state.toolActivityExpandedSignature = "";
    state.toolActivityExpandedIds.clear();
  }

  function toolActivityExpandedSignature() {
    return Array.from(state.toolActivityExpandedIds).sort().join("\n");
  }

  function isStaleTranscriptRevision(revision) {
    return (
      typeof state.transcriptRevision === "number" &&
      revision < state.transcriptRevision
    );
  }

  function transcriptRevisionNumber(value) {
    return Math.max(0, Math.floor(Number(value || 0) || 0));
  }

  function transcriptPageKey(backendId, conversationId) {
    return safeText(backendId) && safeText(conversationId)
      ? safeText(backendId) + "\n" + safeText(conversationId)
      : "";
  }

  function snapshotBackendId(snapshot) {
    return safeText(
      snapshot && (snapshot.activeBackendId || snapshot.backendId),
    );
  }

  function snapshotConversationId(snapshot) {
    return safeText(
      snapshot && (snapshot.activeConversationId || snapshot.conversationId),
    );
  }

  function snapshotTranscriptOwnerKey(snapshot) {
    return transcriptPageKey(
      snapshotBackendId(snapshot),
      snapshotConversationId(snapshot),
    );
  }

  function clearPendingTranscriptOwner() {
    state.pendingTranscriptOwnerKey = "";
    state.pendingTranscriptBackendId = "";
    state.pendingTranscriptPreviousOwnerKey = "";
  }

  function shouldAcceptSnapshot(snapshot) {
    const backendId = snapshotBackendId(snapshot || {});
    const ownerKey = snapshotTranscriptOwnerKey(snapshot || {});
    if (state.pendingTranscriptOwnerKey) {
      if (ownerKey !== state.pendingTranscriptOwnerKey) {
        trace("snapshot-reject-pending-owner", {
          expectedOwnerKey: state.pendingTranscriptOwnerKey,
          ownerKey,
          summary: snapshotSummary(snapshot || {}),
        });
        return false;
      }
      clearPendingTranscriptOwner();
      return true;
    }
    if (state.pendingTranscriptPreviousOwnerKey) {
      if (ownerKey && ownerKey === state.pendingTranscriptPreviousOwnerKey) {
        trace("snapshot-reject-previous-owner", {
          previousOwnerKey: state.pendingTranscriptPreviousOwnerKey,
          ownerKey,
          summary: snapshotSummary(snapshot || {}),
        });
        return false;
      }
      if (
        state.pendingTranscriptBackendId &&
        backendId !== state.pendingTranscriptBackendId
      ) {
        trace("snapshot-reject-pending-backend", {
          expectedBackendId: state.pendingTranscriptBackendId,
          backendId,
          summary: snapshotSummary(snapshot || {}),
        });
        return false;
      }
      clearPendingTranscriptOwner();
      return true;
    }
    if (state.pendingTranscriptBackendId) {
      if (backendId !== state.pendingTranscriptBackendId) {
        trace("snapshot-reject-pending-backend", {
          expectedBackendId: state.pendingTranscriptBackendId,
          backendId,
          summary: snapshotSummary(snapshot || {}),
        });
        return false;
      }
      clearPendingTranscriptOwner();
    }
    return true;
  }

  function selectedTranscriptPage(snapshot) {
    const page =
      snapshot &&
      snapshot.selectedTranscriptPage &&
      typeof snapshot.selectedTranscriptPage === "object"
        ? snapshot.selectedTranscriptPage
        : null;
    return page && Array.isArray(page.items) ? page : null;
  }

  function selectedTranscriptPageForConversation(
    snapshot,
    backendId,
    conversationId,
  ) {
    const page = selectedTranscriptPage(snapshot);
    const pageKey = transcriptPageKey(backendId, conversationId);
    if (!page || !pageKey || safeText(page.requestId) !== pageKey) {
      return null;
    }
    if (safeText(page.backendId) && safeText(page.backendId) !== backendId) {
      return null;
    }
    if (
      safeText(page.conversationId) &&
      safeText(page.conversationId) !== conversationId
    ) {
      return null;
    }
    return page;
  }

  function selectedTranscriptPageSignature(page) {
    if (!page) return "";
    return [
      safeText(page.requestId),
      String(transcriptRevisionNumber(page.cursor)),
      String(transcriptRevisionNumber(page.prevCursor)),
      String(transcriptRevisionNumber(page.nextCursor)),
      String(transcriptRevisionNumber(page.total)),
      String(transcriptRevisionNumber(page.transcriptRevision)),
      (Array.isArray(page.items) ? page.items : [])
        .map(function (item) {
          return safeText(item && item.id);
        })
        .join(","),
    ].join("|");
  }

  function snapshotTranscriptPaginationVirtualizationEnabled(snapshot) {
    return (
      !!snapshot && snapshot.transcriptPaginationVirtualizationEnabled === true
    );
  }

  function snapshotBackendAvailable(snapshot, backendId) {
    const availability = safeText(snapshot && snapshot.backendAvailability);
    if (availability) {
      return availability === "selected" && Boolean(safeText(backendId));
    }
    return Boolean(safeText(backendId));
  }

  function snapshotConversationAvailable(snapshot, conversationId) {
    const availability = safeText(
      snapshot && snapshot.conversationAvailability,
    );
    if (availability) {
      return availability === "selected" && Boolean(safeText(conversationId));
    }
    return Boolean(safeText(conversationId));
  }

  function resetTranscriptVirtualState(pageKey) {
    const renderer = assistantTranscriptRenderer();
    if (
      renderer &&
      typeof renderer.resetAssistantTranscriptVirtualState === "function"
    ) {
      renderer.resetAssistantTranscriptVirtualState(transcriptEl, pageKey);
    }
  }

  function transcriptLoadingSignature(kind, backendId, conversationId) {
    const owner = transcriptPageKey(backendId, conversationId);
    return owner ? [owner, safeText(kind) || "loading"].join("|") : "";
  }

  function renderTranscriptLoading(kind, backendId, conversationId) {
    const signature = transcriptLoadingSignature(
      kind,
      backendId,
      conversationId,
    );
    const existing = transcriptEl.querySelector(".acp-chat-transcript-loading");
    if (
      signature &&
      state.transcriptLoadingSignature === signature &&
      existing
    ) {
      return;
    }
    clear(transcriptEl);
    transcriptEl.appendChild(el("div", "acp-chat-transcript-loading"));
    state.transcriptLoadingSignature = signature;
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
      return helper.projectAcpChatConversationView(snapshot || {});
    }
    return {
      items: Array.isArray(snapshot && snapshot.items) ? snapshot.items : [],
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

  function compactConversationKey(entry) {
    return [
      safeText(entry && (entry.conversationId || entry.id)),
      safeText(entry && entry.status),
      safeText(entry && (entry.title || entry.sessionTitle)),
    ].join(":");
  }

  function compactOptionKey(entry) {
    return [
      safeText(entry && (entry.backendId || entry.id || entry.value)),
      safeText(entry && (entry.displayName || entry.label || entry.name)),
      safeText(entry && entry.status),
    ].join(":");
  }

  function compactPanelRenderKey(snapshot) {
    const snap = snapshot && typeof snapshot === "object" ? snapshot : {};
    const pendingPermission = snap.pendingPermissionRequest || null;
    const backendOptions = Array.isArray(snap.backendOptions)
      ? snap.backendOptions
      : [];
    const chatSessions = Array.isArray(snap.chatSessions)
      ? snap.chatSessions
      : [];
    const backendSessions = Array.isArray(snap.backendChatSessions)
      ? snap.backendChatSessions
      : [];
    const authMethods = Array.isArray(snap.authMethods) ? snap.authMethods : [];
    const modeOptions = Array.isArray(snap.modeOptions) ? snap.modeOptions : [];
    const modelOptions = Array.isArray(snap.displayModelOptions)
      ? snap.displayModelOptions
      : Array.isArray(snap.modelOptions)
        ? snap.modelOptions
        : [];
    const reasoningOptions = Array.isArray(snap.reasoningEffortOptions)
      ? snap.reasoningEffortOptions
      : [];
    return JSON.stringify({
      backendAvailability: safeText(snap.backendAvailability),
      conversationAvailability: safeText(snap.conversationAvailability),
      backendId: safeText(snap.activeBackendId || snap.backendId),
      conversationId: safeText(
        snap.activeConversationId || snap.conversationId,
      ),
      status: safeText(snap.status),
      statusLabel: safeText(snap.statusLabel),
      lastError: safeText(snap.lastError || snap.prerequisiteError),
      busy: snap.busy === true,
      sessionId: safeText(snap.sessionId || snap.remoteSessionId),
      title: safeText(snap.title || snap.conversationTitle),
      chatDisplayMode: safeText(snap.chatDisplayMode),
      streamingRenderEnabled: snap.streamingRenderEnabled !== false,
      transcriptPaginationVirtualizationEnabled:
        snap.transcriptPaginationVirtualizationEnabled === true,
      selectedMode: safeText(snap.currentMode && snap.currentMode.id),
      selectedModel: safeText(snap.currentModel && snap.currentModel.id),
      selectedEffort: safeText(
        snap.currentReasoningEffort && snap.currentReasoningEffort.id,
      ),
      backendOptions: backendOptions.map(compactOptionKey),
      chatSessions: chatSessions.map(compactConversationKey),
      authMethods: authMethods.map(function (entry) {
        return compactOptionKey(entry);
      }),
      modeOptions: modeOptions.map(compactOptionKey),
      modelOptions: modelOptions.map(compactOptionKey),
      reasoningOptions: reasoningOptions.map(compactOptionKey),
      autoApproveAcpPermissions: snap.autoApproveAcpPermissions === true,
      sessionDrawerOpen: state.sessionDrawerOpen,
      detailsDrawerOpen: state.detailsDrawerOpen,
      permissionDrawerOpen: state.permissionRequestDrawerOpen,
      permissionRequestId: safeText(
        pendingPermission && pendingPermission.requestId,
      ),
      drawerGroupCollapsed: compactDrawerGroupCollapseKey(),
      sessions: backendSessions.map(function (entry) {
        return {
          backendId: safeText(entry && entry.backendId),
          sessions: (Array.isArray(entry && entry.sessions)
            ? entry.sessions
            : []
          ).map(compactConversationKey),
        };
      }),
    });
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
    if (action === "toggle-drawer-group") {
      if (toggleDrawerGroup(data)) {
        render(snapshot);
      }
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
      const backendId = safeText(data.backendId || data.value);
      if (!backendId) return;
      state.pendingTranscriptOwnerKey = "";
      state.pendingTranscriptPreviousOwnerKey = "";
      state.pendingTranscriptBackendId = backendId;
      sendAction("set-active-backend", {
        backendId,
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
      state.sessionDrawerOpen = false;
      const backendId = safeText(
        data.backendId ||
          option.backendId ||
          snapshot.activeBackendId ||
          snapshot.backendId,
      );
      const conversationId = safeText(data.conversationId || data.value);
      if (!backendId || !conversationId) return;
      state.pendingTranscriptOwnerKey = transcriptPageKey(
        backendId,
        conversationId,
      );
      state.pendingTranscriptBackendId = backendId;
      state.pendingTranscriptPreviousOwnerKey = "";
      sendAction("set-active-conversation", {
        conversationId,
        backendId,
      });
      return;
    }
    if (action === "new-conversation") {
      const backendId = safeText(
        data.backendId || snapshot.activeBackendId || snapshot.backendId,
      );
      if (!backendId) return;
      state.pendingTranscriptOwnerKey = "";
      state.pendingTranscriptBackendId = backendId;
      state.pendingTranscriptPreviousOwnerKey =
        snapshotTranscriptOwnerKey(snapshot);
      sendAction("new-conversation", {
        backendId,
      });
      return;
    }
    if (action === "connect") {
      const backendId = safeText(
        data.backendId || snapshot.activeBackendId || snapshot.backendId,
      );
      if (!backendId) return;
      sendAction("connect", {
        backendId,
        conversationId: safeText(
          data.conversationId ||
            snapshot.activeConversationId ||
            snapshot.conversationId,
        ),
      });
      return;
    }
    if (action === "disconnect") {
      const backendId = safeText(
        data.backendId || snapshot.activeBackendId || snapshot.backendId,
      );
      const conversationId = safeText(
        data.conversationId ||
          snapshot.activeConversationId ||
          snapshot.conversationId,
      );
      if (!backendId || !conversationId) return;
      sendAction("disconnect", {
        backendId,
        conversationId,
      });
      return;
    }
    if (action === "authenticate") {
      const backendId = safeText(
        data.backendId || snapshot.activeBackendId || snapshot.backendId,
      );
      const conversationId = safeText(
        data.conversationId ||
          snapshot.activeConversationId ||
          snapshot.conversationId,
      );
      if (!backendId || !conversationId) return;
      sendAction("authenticate", {
        backendId,
        conversationId,
        methodId: safeText(data.methodId),
      });
      return;
    }
    if (action === "set-auto-approve-permissions") {
      const enabled = data.enabled === true;
      const backendId = safeText(
        data.backendId || snapshot.activeBackendId || snapshot.backendId,
      );
      const conversationId = safeText(
        data.conversationId ||
          snapshot.activeConversationId ||
          snapshot.conversationId,
      );
      if (!backendId || !conversationId) return;
      sendAction("set-auto-approve-permissions", {
        enabled,
        backendId,
        conversationId,
      });
      return;
    }
    if (action === "set-mode") {
      const backendId = safeText(
        snapshot.activeBackendId || snapshot.backendId,
      );
      const conversationId = safeText(
        snapshot.activeConversationId || snapshot.conversationId,
      );
      if (!backendId || !conversationId) return;
      sendAction("set-mode", {
        modeId: safeText(data.modeId || data.value),
        backendId,
        conversationId,
      });
      return;
    }
    if (action === "set-model") {
      const backendId = safeText(
        snapshot.activeBackendId || snapshot.backendId,
      );
      const conversationId = safeText(
        snapshot.activeConversationId || snapshot.conversationId,
      );
      if (!backendId || !conversationId) return;
      sendAction("set-model", {
        modelId: safeText(data.modelId || data.value),
        backendId,
        conversationId,
      });
      return;
    }
    if (action === "set-reasoning-effort") {
      const backendId = safeText(
        snapshot.activeBackendId || snapshot.backendId,
      );
      const conversationId = safeText(
        snapshot.activeConversationId || snapshot.conversationId,
      );
      if (!backendId || !conversationId) return;
      sendAction("set-reasoning-effort", {
        effortId: safeText(data.effortId || data.value),
        backendId,
        conversationId,
      });
      return;
    }
    if (action === "send-prompt") {
      const message = safeText(data.message);
      const backendId = safeText(
        snapshot.activeBackendId || snapshot.backendId,
      );
      const conversationId = safeText(
        snapshot.activeConversationId || snapshot.conversationId,
      );
      if (!backendId || !conversationId) return;
      if (message)
        sendAction("send-prompt", {
          message,
          backendId,
          conversationId,
        });
      return;
    }
    if (action === "cancel") {
      const backendId = safeText(
        snapshot.activeBackendId || snapshot.backendId,
      );
      const conversationId = safeText(
        snapshot.activeConversationId || snapshot.conversationId,
      );
      if (!backendId || !conversationId) return;
      sendAction("cancel", {
        backendId,
        conversationId,
      });
      return;
    }
    if (action === "set-chat-display-mode") {
      const backendId = safeText(
        snapshot.activeBackendId || snapshot.backendId,
      );
      const conversationId = safeText(
        snapshot.activeConversationId || snapshot.conversationId,
      );
      if (!backendId || !conversationId) return;
      state.chatDisplayMode = data.mode === "bubble" ? "bubble" : "plain";
      sendAction("set-chat-display-mode", {
        mode: state.chatDisplayMode,
        backendId,
        conversationId,
      });
      render(snapshot);
      return;
    }
    sendAction(action, data);
  }

  function renderPanel(snapshot) {
    const renderKey = compactPanelRenderKey(snapshot || {});
    if (state.panelRenderKey === renderKey) {
      trace("render-panel-skip", { summary: snapshotSummary(snapshot || {}) });
      syncDrawerVisibility();
      return;
    }
    const renderer = assistantPanelRenderer();
    if (
      !renderer ||
      typeof renderer.renderAssistantPanelSnapshot !== "function"
    )
      return;
    state.panelRenderKey = renderKey;
    trace("render-panel", { summary: snapshotSummary(snapshot || {}) });
    const panelSnapshot = applyDrawerGroupCollapseState(
      projectPanelSnapshot(snapshot || {}),
    );
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
    syncDrawerVisibility();
  }

  function syncDrawerVisibility() {
    document
      .getElementById("acp-chat-drawer")
      ?.classList.toggle("hidden", !state.sessionDrawerOpen);
    document
      .getElementById("acp-chat-details")
      ?.classList.toggle("hidden", !state.detailsDrawerOpen);
  }

  function renderTranscript(snapshot) {
    const backendId = safeText(
      snapshot && (snapshot.activeBackendId || snapshot.backendId),
    );
    const conversationId = safeText(
      snapshot && (snapshot.activeConversationId || snapshot.conversationId),
    );
    const hasBackend = snapshotBackendAvailable(snapshot, backendId);
    const hasConversation =
      hasBackend && snapshotConversationAvailable(snapshot, conversationId);
    const pageKey = transcriptPageKey(backendId, conversationId);
    if (
      backendId !== state.transcriptBackendId ||
      conversationId !== state.transcriptConversationId
    ) {
      state.transcriptBackendId = backendId;
      state.transcriptConversationId = conversationId;
      resetTranscriptRenderState();
      resetTranscriptVirtualState(pageKey);
      state.transcriptBackendId = backendId;
      state.transcriptConversationId = conversationId;
    }
    const virtualized =
      hasConversation &&
      snapshotTranscriptPaginationVirtualizationEnabled(snapshot);
    const page = virtualized
      ? selectedTranscriptPageForConversation(
          snapshot || {},
          backendId,
          conversationId,
        )
      : null;
    const pageSignature = page ? selectedTranscriptPageSignature(page) : "";
    const transcriptState =
      snapshot && snapshot.transcriptState ? snapshot.transcriptState : null;
    if (
      hasConversation &&
      transcriptState &&
      safeText(transcriptState.backendId) === backendId &&
      safeText(transcriptState.conversationId) === conversationId &&
      transcriptState.state === "loading"
    ) {
      renderTranscriptLoading("transcript-state", backendId, conversationId);
      return;
    }
    if (
      hasConversation &&
      transcriptState &&
      safeText(transcriptState.backendId) === backendId &&
      safeText(transcriptState.conversationId) === conversationId &&
      transcriptState.state === "failed"
    ) {
      state.transcriptLoadingSignature = "";
      clear(transcriptEl);
      transcriptEl.appendChild(
        el(
          "div",
          "acp-chat-transcript-error asst-empty-state compact",
          safeText(transcriptState.error) || "Transcript failed to load.",
        ),
      );
      return;
    }
    if (virtualized && pageKey && !page) {
      renderTranscriptLoading("page-missing", backendId, conversationId);
      return;
    }
    state.transcriptLoadingSignature = "";
    const renderer = assistantTranscriptRenderer();
    const mode = state.chatDisplayMode === "bubble" ? "bubble" : "plain";
    const revision = page
      ? transcriptRevisionNumber(page.transcriptRevision)
      : Number(snapshot && snapshot.transcriptRevision) || 0;
    if (isStaleTranscriptRevision(revision)) {
      return;
    }
    const view = page
      ? { items: page.items || [] }
      : projectConversationView(snapshot || {});
    const expandedSignature = toolActivityExpandedSignature();
    if (
      state.transcriptRevision === revision &&
      state.transcriptRenderedMode === mode &&
      state.toolActivityExpandedSignature === expandedSignature &&
      state.transcriptPageSignature === pageSignature
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
      virtualized: !!page,
      pageKey: page ? pageKey : undefined,
      page: page || undefined,
      transcriptRevision: revision,
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
      onRequestPage: function (request) {
        if (!page) {
          return;
        }
        const requestPageKey = safeText(request && request.pageKey);
        const cursor = Number(request && request.cursor);
        if (
          !pageKey ||
          requestPageKey !== pageKey ||
          !Number.isFinite(cursor)
        ) {
          return;
        }
        sendAction("load-transcript-page", {
          backendId,
          conversationId,
          requestId: pageKey,
          cursor: Math.max(0, Math.floor(cursor)),
          limit: Math.max(1, Math.floor(Number(request.limit || 80) || 80)),
        });
      },
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
        state.toolActivityExpandedSignature = expandedSignature;
        state.transcriptPageSignature = pageSignature;
      },
    });
  }

  function render(snapshot) {
    state.snapshot = snapshot && typeof snapshot === "object" ? snapshot : {};
    trace("render", { summary: snapshotSummary(state.snapshot) });
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
    trace("queue-render", {
      summary: snapshotSummary(state.pendingRenderSnapshot),
    });
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
    if (!data || (data.type !== "acp:init" && data.type !== "acp:snapshot"))
      return;
    trace("message-received", {
      type: data.type,
      summary: snapshotSummary(payload),
    });
    if (!shouldAcceptSnapshot(payload)) {
      return;
    }
    queueRender(payload);
  });

  trace("ready-send", {});
  sendAction("ready", {});
})();
