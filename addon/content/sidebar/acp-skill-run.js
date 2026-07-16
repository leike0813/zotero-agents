(function () {
  "use strict";

  const state = {
    snapshot: null,
    runDrawerOpen: false,
    detailsOpen: false,
    chatDisplayMode: "plain",
    markdown: null,
    transcriptNodeMap: new Map(),
    transcriptOrderKey: "",
    transcriptMode: "",
    transcriptRevision: null,
    transcriptRenderedMode: "",
    transcriptRunId: "",
    transcriptPageSignature: "",
    transcriptLoadingSignature: "",
    transcriptPaginationVirtualizationEnabled: true,
    toolActivityExpandedIds: new Set(),
    toolActivityExpandedSignature: "",
    drawerCompletedCollapsed: true,
    replyDrafts: new Map(),
    replyFocusedRequestId: "",
    permissionRequestDetails: null,
    permissionRequestDrawerOpen: false,
    panelRenderKey: "",
    drawerGroupCollapsed: new Map(),
    acpSurfaceController: null,
    surfaceConfiguration: {
      executionDisplayMode: "live",
      transcriptPaginationVirtualizationEnabled: true,
    },
    surfaceLabels: {},
  };
  const CHILD_DOCUMENT_GENERATION =
    "acp-skills-" +
    String(Date.now()) +
    "-" +
    Math.random().toString(36).slice(2);
  function bridge() {
    return [
      window.__zsAcpSkillRunSidebarBridge,
      window.wrappedJSObject &&
        window.wrappedJSObject.__zsAcpSkillRunSidebarBridge,
    ].find((entry) => entry && typeof entry.sendAction === "function");
  }

  function sendAction(action, payload) {
    const direct = bridge();
    if (direct) {
      trace("send-action-direct", {
        action,
        payloadKeys: Object.keys(payload || {}),
      });
      direct.sendAction(action, payload || {});
      return;
    }
    const message = {
      type: "acp-skill-run:action",
      action,
      payload: payload || {},
    };
    trace("send-action-fallback", {
      action,
      payloadKeys: Object.keys(payload || {}),
    });
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
    const key = "__zsAcpSkillRunTrace";
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
    const selectedRun =
      source.selectedRun && typeof source.selectedRun === "object"
        ? source.selectedRun
        : null;
    const region =
      source.transcriptRegion && typeof source.transcriptRegion === "object"
        ? source.transcriptRegion
        : null;
    const page = region && region.page ? region.page : null;
    return {
      selectedRequestId: safeText(source.selectedRequestId),
      selectedRunRequestId: safeText(selectedRun && selectedRun.requestId),
      selectedRunStatus: safeText(selectedRun && selectedRun.status),
      runs: Array.isArray(source.runs) ? source.runs.length : 0,
      transcriptRegion: region
        ? {
            status: safeText(region.status),
            pageKey: safeText(page && page.pageKey),
            cursor: Number((page && page.startCursor) || 0),
            total: Number((page && page.totalVisibleItemCount) || 0),
            items: page && Array.isArray(page.items) ? page.items.length : 0,
          }
        : null,
    };
  }

  function snapshotSelectedRequestId(snapshot) {
    const source = snapshot && typeof snapshot === "object" ? snapshot : {};
    const owner = source.owner;
    return owner && owner.source === "acp-skills"
      ? safeText(owner.requestId)
      : "";
  }

  function transcriptRegionForRun(run, snapshot) {
    const publication = assistantWorkspaceAcpSurface();
    return publication
      ? publication.readRegion(
          snapshot || state.snapshot || {},
          "acp-skills",
          safeText(run && run.requestId),
        )
      : null;
  }

  function transcriptRendererPageForRun(run, snapshot) {
    const publication = assistantWorkspaceAcpSurface();
    return publication
      ? publication.rendererPage(transcriptRegionForRun(run, snapshot))
      : null;
  }

  function transcriptItemsFromSnapshot(run) {
    const page = transcriptRendererPageForRun(run);
    return page ? page.items : [];
  }

  function transcriptRevisionNumber(value) {
    return Math.max(0, Math.floor(Number(value || 0) || 0));
  }

  function transcriptPageSignature(run, snapshot) {
    const page = transcriptRendererPageForRun(run, snapshot);
    if (!page) return "";
    return [
      safeText(page.ownerKey),
      safeText(page.pageKey),
      String(Math.max(0, Math.floor(Number(page.startCursor || 0) || 0))),
      String(Math.max(0, Math.floor(Number(page.previousCursor || 0) || 0))),
      String(Math.max(0, Math.floor(Number(page.nextCursor || 0) || 0))),
      String(
        Math.max(0, Math.floor(Number(page.totalVisibleItemCount || 0) || 0)),
      ),
      String(Math.max(0, Math.floor(Number(page.sourceEventSeq || 0) || 0))),
      String(transcriptRevisionNumber(page.transcriptRevision)),
      (Array.isArray(page.items) ? page.items : [])
        .map(function (item) {
          return safeText(item && item.itemId);
        })
        .join(","),
    ].join("|");
  }

  function snapshotTranscriptPaginationVirtualizationEnabled() {
    return (
      state.surfaceConfiguration.transcriptPaginationVirtualizationEnabled !==
      false
    );
  }

  function incomingTranscriptRevision(run, snapshot) {
    const region = transcriptRegionForRun(run, snapshot);
    if (region) return transcriptRevisionNumber(region.transcriptRevision);
    return transcriptRevisionNumber(run && run.transcriptRevision);
  }

  function isStaleTranscriptRevision(revision) {
    return (
      typeof state.transcriptRevision === "number" &&
      revision < state.transcriptRevision
    );
  }

  function isStaleLoadingTranscriptRevision(revision) {
    return (
      !!state.transcriptPageSignature &&
      typeof state.transcriptRevision === "number" &&
      revision <= state.transcriptRevision
    );
  }

  function compactRunKey(run) {
    if (!run || typeof run !== "object") return "";
    return [
      safeText(run.requestId),
      safeText(run.status),
      safeText(run.applyResultState),
      safeText(run.conversationState),
      safeText(run.conversationRecoveryState),
      safeText(run.replyState),
      safeText(run.connectionActionState),
      safeText(run.acpModeId),
      safeText(run.acpModelId),
      safeText(run.acpRawModelId),
      safeText(run.acpReasoningEffort),
      run.activePrompt === true ? "prompting" : "",
      run.pendingPermission ? "permission" : "",
      run.pendingInteraction ? "interaction" : "",
      safeText(run.taskName || run.workflowLabel || run.skillLabel),
    ].join(":");
  }

  function compactRuntimeOptionsKey(options) {
    const runtimeOptions =
      options && typeof options === "object" ? options : {};
    return [
      safeText(runtimeOptions.currentMode && runtimeOptions.currentMode.id),
      safeText(
        runtimeOptions.currentDisplayModel &&
          runtimeOptions.currentDisplayModel.id,
      ),
      safeText(runtimeOptions.currentModel && runtimeOptions.currentModel.id),
      safeText(
        runtimeOptions.currentReasoningEffort &&
          runtimeOptions.currentReasoningEffort.id,
      ),
    ].join(":");
  }

  function buildPanelRenderKey(snapshot) {
    const raw = snapshot && typeof snapshot === "object" ? snapshot : {};
    const runs = Array.isArray(raw.runs) ? raw.runs : [];
    return JSON.stringify({
      selected: compactRunKey(raw.selectedRun),
      selectedRequestId: safeText(raw.selectedRequestId),
      selectedRuntimeOptions: compactRuntimeOptionsKey(
        raw.selectedRuntimeOptions,
      ),
      executionDisplayMode: safeText(raw.executionDisplayMode) || "live",
      runs: runs.map(compactRunKey),
      runDrawerOpen: state.runDrawerOpen,
      detailsOpen: state.detailsOpen,
      drawerCompletedCollapsed: state.drawerCompletedCollapsed,
      drawerGroupCollapsed: compactDrawerGroupCollapseKey(),
      permissionRequestDrawerOpen: state.permissionRequestDrawerOpen,
      permissionRequestId: safeText(
        state.permissionRequestDetails &&
          state.permissionRequestDetails.permissionRequestId,
      ),
    });
  }

  function formatTime(value) {
    const text = safeText(value);
    if (!text) return "";
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? text : parsed.toLocaleString();
  }

  function assistantTranscriptRenderer() {
    return window.AssistantTranscriptRenderer &&
      typeof window.AssistantTranscriptRenderer === "object"
      ? window.AssistantTranscriptRenderer
      : null;
  }

  function assistantWorkspaceAcpSurface() {
    return window.AssistantWorkspaceAcpSurface &&
      typeof window.AssistantWorkspaceAcpSurface === "object"
      ? window.AssistantWorkspaceAcpSurface
      : null;
  }

  function workspacePanelPresentation(snapshot) {
    const shared = assistantWorkspaceAcpSurface();
    return shared && typeof shared.createPanelPresentation === "function"
      ? shared.createPanelPresentation(snapshot || {}, {
          source: "acp-skills",
          chatDisplayMode: state.chatDisplayMode,
          configuration: state.surfaceConfiguration,
          labels: state.surfaceLabels,
        })
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

  function projectAcpSkillRunView(run) {
    const sourceRun = run || {};
    const items = transcriptItemsFromSnapshot(sourceRun).map(function (item) {
      if (item && item.kind === "thought") {
        return Object.assign({}, item, { kind: "process", label: "Thought" });
      }
      if (item && item.kind === "tool_call") {
        return Object.assign({}, item, { kind: "tool" });
      }
      return item;
    });
    return {
      items,
      plan: { entries: [], activeEntries: [], active: false },
      interaction: { kind: "hidden" },
      usage: sourceRun && sourceRun.usage ? sourceRun.usage : null,
    };
  }

  function projectAssistantPanelSnapshot(snapshot) {
    const helper = assistantPanelModel();
    if (
      helper &&
      typeof helper.projectAcpSkillRunPanelSnapshot === "function"
    ) {
      return helper.projectAcpSkillRunPanelSnapshot(snapshot || {});
    }
    const run = (snapshot && snapshot.selectedRun) || {};
    const labels =
      snapshot && snapshot.labels && typeof snapshot.labels === "object"
        ? snapshot.labels
        : {};
    const panelLabels =
      labels.assistantPanel && typeof labels.assistantPanel === "object"
        ? labels.assistantPanel
        : {};
    const actionLabels = panelLabels.actions || {};
    const detailLabels = panelLabels.details || {};
    return {
      kind: "acp-skills",
      labels,
      context: {
        id: safeText(run.requestId || (snapshot && snapshot.selectedRequestId)),
        title:
          safeText(run.taskName || run.workflowLabel || run.skillId) ||
          safeText(labels.title),
        status: safeText(run.status) || "idle",
      },
      lifecycle: {
        executionState: safeText(run.status) || "idle",
        connectionState: safeText(
          run.conversationState || run.conversationRecoveryState,
        ),
      },
      conversation: projectAcpSkillRunView(run),
      plan: projectAcpSkillRunView(run).plan,
      interaction: projectAcpSkillRunView(run).interaction,
      actions: {
        toolbar: [
          { action: "open-context-drawer", label: safeText(actionLabels.runs) },
          { action: "openDetails", label: safeText(actionLabels.details) },
        ],
      },
      drawers: {
        contextTitle: safeText(actionLabels.runs),
        detailsTitle: safeText(detailLabels.title),
        contexts: [],
        details: [],
      },
      reply: { enabled: false, action: "reply-run" },
      raw: snapshot || {},
    };
  }

  function selectedRunFromSnapshot() {
    return (workspacePanelPresentation(state.snapshot || {}) || {}).selectedRun;
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
    if (plain)
      plain.setAttribute("aria-pressed", mode === "plain" ? "true" : "false");
    if (bubble)
      bubble.setAttribute("aria-pressed", mode === "bubble" ? "true" : "false");
  }

  function resetTranscriptRenderState() {
    state.transcriptNodeMap.clear();
    state.transcriptOrderKey = "";
    state.transcriptMode = "";
    state.transcriptRevision = null;
    state.transcriptRenderedMode = "";
    state.transcriptPageSignature = "";
    state.transcriptLoadingSignature = "";
    state.toolActivityExpandedIds.clear();
    state.toolActivityExpandedSignature = "";
  }

  function toolActivityExpandedSignature() {
    return Array.from(state.toolActivityExpandedIds).sort().join("\n");
  }

  function handleAssistantPanelAction(action, payload) {
    const data = payload && typeof payload === "object" ? payload : {};
    const run = selectedRunFromSnapshot();
    const requestId = safeText(data.requestId || (run && run.requestId));
    if (
      action !== "reply" &&
      action !== "reply-run" &&
      action !== "interrupt-run-turn"
    ) {
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
    if (action === "toggle-drawer-group") {
      if (toggleDrawerGroup(data)) {
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
      state.runDrawerOpen = false;
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
    sendAction(
      action,
      Object.assign({}, data, requestId ? { requestId: requestId } : {}),
    );
  }

  function renderAssistantPanelRuntime(snapshot) {
    const presentation = workspacePanelPresentation(snapshot || {}) || {};
    const rawSelectedRun = presentation.selectedRun;
    if (!rawSelectedRun || !rawSelectedRun.pendingPermission) {
      state.permissionRequestDetails = null;
      state.permissionRequestDrawerOpen = false;
    }
    const renderer = assistantPanelRenderer();
    if (
      !renderer ||
      typeof renderer.renderAssistantPanelSnapshot !== "function"
    ) {
      renderPanelRuntimeFailure(
        safeText(
          presentation.labels && presentation.labels.panelRendererUnavailable,
        ),
      );
      return;
    }
    try {
      const panelSnapshot = projectAssistantPanelSnapshot(presentation);
      renderer.renderAssistantPanelSnapshot(panelSnapshot, {
        managed: true,
        managedRegions: { messageCounter: true },
        root: document.querySelector(".acp-skill-run-shell"),
        regions: {
          messageCounter: $("acp-skill-run-message-counter"),
        },
      });
      const renderKey = buildPanelRenderKey(presentation);
      if (state.panelRenderKey === renderKey) {
        return;
      }
      state.panelRenderKey = renderKey;
      trace("render-panel", { summary: snapshotSummary(snapshot || {}) });
      panelSnapshot.drawers = panelSnapshot.drawers || {};
      panelSnapshot.drawers.permissionRequest = state.permissionRequestDetails;
      panelSnapshot.drawers.permissionRequestOpen =
        state.permissionRequestDrawerOpen;
      const selectedRun =
        panelSnapshot && panelSnapshot.raw && panelSnapshot.raw.selectedRun;
      const requestId = safeText(selectedRun && selectedRun.requestId);
      if (panelSnapshot && panelSnapshot.reply && requestId) {
        panelSnapshot.reply.value = state.replyDrafts.get(requestId) || "";
      }
      if (
        panelSnapshot &&
        panelSnapshot.drawers &&
        Array.isArray(panelSnapshot.drawers.sections)
      ) {
        panelSnapshot.drawers.sections = panelSnapshot.drawers.sections.map(
          function (section) {
            if (safeText(section && section.id) !== "completed") return section;
            return Object.assign({}, section, {
              collapsed: state.drawerCompletedCollapsed,
            });
          },
        );
        applyDrawerGroupCollapseState(panelSnapshot);
      }
      renderer.renderAssistantPanelSnapshot(panelSnapshot, {
        managed: true,
        managedRegions: {
          toolbar: true,
          banner: true,
          messageCounter: true,
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
          messageCounter: $("acp-skill-run-message-counter"),
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
        safeText(
          presentation.labels && presentation.labels.panelRendererFailed,
        ) +
          ": " +
          (error && error.message ? error.message : String(error)),
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
    row.appendChild(el("span", "", safeText(message)));
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
    const parser = ensureMarkdownParser();
    if (!parser) return escapeHtml(value).replace(/\n/g, "<br>");
    try {
      return parser.render(safeText(value));
    } catch {
      return escapeHtml(value).replace(/\n/g, "<br>");
    }
  }

  function resetTranscriptVirtualState(container, requestId) {
    const renderer = assistantTranscriptRenderer();
    if (
      container &&
      renderer &&
      typeof renderer.resetAssistantTranscriptVirtualState === "function"
    ) {
      renderer.resetAssistantTranscriptVirtualState(container, requestId);
    }
  }

  function syncTranscriptRun(run, transcript) {
    const requestId = safeText(run && run.requestId);
    if (requestId !== state.transcriptRunId) {
      state.transcriptRunId = requestId;
      state.transcriptPaginationVirtualizationEnabled =
        snapshotTranscriptPaginationVirtualizationEnabled();
      resetTranscriptRenderState();
      resetTranscriptVirtualState(transcript, requestId);
    }
    return requestId;
  }

  function transcriptLoadingSignature(requestId, stateName) {
    const owner = safeText(requestId);
    return owner ? [owner, safeText(stateName) || "loading"].join("|") : "";
  }

  function renderTranscriptLoading(transcript, requestId, stateName) {
    const signature = transcriptLoadingSignature(requestId, stateName);
    const existing =
      transcript && transcript.querySelector(".acp-skill-transcript-loading");
    if (
      signature &&
      state.transcriptLoadingSignature === signature &&
      existing
    ) {
      renderChatDisplayMode();
      return;
    }
    resetTranscriptVirtualState(transcript, requestId);
    clear(transcript);
    transcript.appendChild(el("div", "acp-skill-transcript-loading"));
    state.transcriptLoadingSignature = signature;
    renderChatDisplayMode();
  }

  function renderTranscript(run, snapshot) {
    const sourceSnapshot = snapshot || state.snapshot || {};
    const transcript = $("acp-skill-run-transcript");
    const requestId = syncTranscriptRun(run, transcript);
    let revision = incomingTranscriptRevision(run, sourceSnapshot);
    const region = transcriptRegionForRun(run, sourceSnapshot);
    const publication = assistantWorkspaceAcpSurface();
    if (region && region.status === "loading") {
      if (isStaleLoadingTranscriptRevision(revision)) {
        renderChatDisplayMode();
        return;
      }
      renderTranscriptLoading(transcript, requestId, region.status);
      return;
    }
    if (region && region.status === "failed") {
      state.transcriptLoadingSignature = "";
      clear(transcript);
      transcript.appendChild(
        el(
          "div",
          "acp-skill-transcript-error",
          publication.errorMessage(region) || "Transcript failed to load.",
        ),
      );
      renderChatDisplayMode();
      return;
    }
    if (isStaleTranscriptRevision(revision)) {
      renderChatDisplayMode();
      return;
    }
    state.transcriptLoadingSignature = "";
    const renderer = assistantTranscriptRenderer();
    if (!renderer || typeof renderer.renderAssistantTranscript !== "function") {
      clear(transcript);
      transcript.appendChild(
        el(
          "div",
          "empty-state compact",
          safeText(
            sourceSnapshot &&
              sourceSnapshot.labels &&
              sourceSnapshot.labels.transcriptRendererUnavailable,
          ),
        ),
      );
      return;
    }
    const page = transcriptRendererPageForRun(run, sourceSnapshot);
    const pageSignature = transcriptPageSignature(run, sourceSnapshot);
    const virtualized =
      !!page && state.transcriptPaginationVirtualizationEnabled !== false;
    const sourceRevision =
      revision ||
      Number(page && page.transcriptRevision) ||
      Number(run && run.transcriptRevision) ||
      0;
    revision = sourceRevision;
    const view = page
      ? { items: page.items || [] }
      : projectAcpSkillRunView(run);
    const expandedSignature = toolActivityExpandedSignature();
    if (
      state.transcriptRevision === revision &&
      state.transcriptRenderedMode === state.chatDisplayMode &&
      state.toolActivityExpandedSignature === expandedSignature &&
      state.transcriptPageSignature === pageSignature
    ) {
      renderChatDisplayMode();
      return;
    }
    renderer.renderAssistantTranscript({
      container: transcript,
      items: Array.isArray(view.items) ? view.items : [],
      virtualized,
      ownerKey: requestId,
      page,
      mode: state.chatDisplayMode,
      variant: "skillrunner",
      nodeMap: state.transcriptNodeMap,
      orderKey: state.transcriptOrderKey,
      modeKey: state.transcriptMode,
      expandedIds: state.toolActivityExpandedIds,
      renderMarkdown,
      formatTime,
      labels:
        sourceSnapshot?.labels?.assistantPanel?.transcript ||
        sourceSnapshot?.labels?.transcript ||
        {},
      emptyText:
        sourceSnapshot?.labels?.assistantPanel?.transcript?.empty ||
        sourceSnapshot?.labels?.transcript?.empty ||
        "Waiting for agent transcript...",
      onRequestPage: function (request) {
        if (!virtualized) {
          return;
        }
        const ownerKey = safeText(request && request.ownerKey);
        const cursor = Number(request && request.cursor);
        if (!requestId || ownerKey !== requestId || !Number.isFinite(cursor)) {
          return;
        }
        const pageRequest = publication.createPageRequest(
          region.owner,
          cursor,
          request.limit,
        );
        if (pageRequest) sendAction("load-transcript-page", pageRequest);
      },
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
        state.transcriptRevision = revision;
        state.transcriptRenderedMode = state.chatDisplayMode;
        state.toolActivityExpandedSignature = expandedSignature;
        state.transcriptPageSignature = pageSignature;
      },
    });
    renderChatDisplayMode();
  }

  function renderSelectedRun(snapshot) {
    const run = (workspacePanelPresentation(snapshot || {}) || {}).selectedRun;
    const empty = $("acp-skill-run-empty");
    const main = $("acp-skill-run-main");
    if (!run) {
      empty.classList.remove("hidden");
      main.classList.add("hidden");
      return true;
    }
    empty.classList.add("hidden");
    main.classList.remove("hidden");
    try {
      renderTranscript(run, snapshot);
      return true;
    } catch (error) {
      renderPanelRuntimeFailure(
        "ACP Skills transcript renderer failed: " +
          (error && error.message ? error.message : String(error)),
      );
      return false;
    }
  }

  function render(snapshot) {
    captureReplyDraft();
    state.snapshot = snapshot || {};
    trace("render", { summary: snapshotSummary(state.snapshot) });
    renderAssistantPanelRuntime(state.snapshot);
    $("acp-skill-run-drawer").classList.toggle("hidden", !state.runDrawerOpen);
    $("acp-skill-run-details").classList.toggle("hidden", !state.detailsOpen);
    renderSelectedRun(state.snapshot);
    $("acp-skill-run-drawer").classList.toggle("hidden", !state.runDrawerOpen);
    $("acp-skill-run-details").classList.toggle("hidden", !state.detailsOpen);
  }

  function publicationAck(publication, stage, outcome, reason) {
    sendAction("publication-ack", {
      publicationId: safeText(publication && publication.publicationId),
      documentGeneration: CHILD_DOCUMENT_GENERATION,
      stage,
      outcome,
      reason: reason || null,
    });
  }

  function renderPublicationResult(result, publication) {
    const nextSnapshot = (result && result.snapshot) || {};
    const shared = assistantWorkspaceAcpSurface();
    const run =
      (workspacePanelPresentation(nextSnapshot) || {}).selectedRun || {};
    const rendered = !!(
      shared &&
      typeof shared.renderResult === "function" &&
      shared.renderResult(result, {
        source: "acp-skills",
        getOwnerKey: snapshotSelectedRequestId,
        panelRenderer: assistantPanelRenderer(),
        messageCountContainer: $("acp-skill-run-message-counter"),
        transcriptRenderer: assistantTranscriptRenderer(),
        transcriptContainer: $("acp-skill-run-transcript"),
        rowNodesByKey: state.transcriptNodeMap,
        getMode: function () {
          return state.chatDisplayMode;
        },
        isVirtualized: function () {
          return state.transcriptPaginationVirtualizationEnabled !== false;
        },
        variant: "skillrunner",
        expandedRowKeys: state.toolActivityExpandedIds,
        renderMarkdown,
        formatTime,
        getLabels: function (snapshot) {
          return (
            snapshot?.labels?.assistantPanel?.transcript ||
            snapshot?.labels?.transcript ||
            {}
          );
        },
        renderRegion: function () {
          renderAssistantPanelRuntime(nextSnapshot);
          return true;
        },
        renderSnapshot: function () {
          renderSelectedRun(nextSnapshot);
          return true;
        },
        onEffectRendered: function (observation) {
          sendAction("publication-render-observation", {
            publicationId: safeText(publication && publication.publicationId),
            ...observation,
          });
        },
      })
    );
    if (rendered && result.publicationKind === "transcript") {
      const region = transcriptRegionForRun(run, nextSnapshot);
      state.transcriptRevision = transcriptRevisionNumber(
        region && region.transcriptRevision,
      );
      state.transcriptRenderedMode = state.chatDisplayMode;
      renderChatDisplayMode();
    }
    return rendered;
  }

  function surfaceController() {
    if (state.acpSurfaceController) return state.acpSurfaceController;
    const shared = assistantWorkspaceAcpSurface();
    state.acpSurfaceController =
      shared &&
      shared.createController({
        source: "acp-skills",
        getSnapshot: function () {
          return state.snapshot || {};
        },
        setSnapshot: function (snapshot) {
          state.snapshot = snapshot;
        },
        getOwnerKey: snapshotSelectedRequestId,
        ack: publicationAck,
        render: renderPublicationResult,
      });
    return state.acpSurfaceController;
  }

  function applyPublication(publication) {
    const controller = surfaceController();
    if (!controller) {
      publicationAck(publication || {}, "child-apply", "rejected", "invalid");
      return;
    }
    controller.applyPublication(publication);
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
    if (data.type === "assistant-workspace:child-ready-request") {
      sendAction("ready", { documentGeneration: CHILD_DOCUMENT_GENERATION });
      return;
    }
    if (data.type === "assistant-panel:close-drawers") {
      closeAllDrawers();
      return;
    }
    if (data.type === "assistant-workspace:surface-bootstrap") {
      const bootstrap =
        data.payload && typeof data.payload === "object" ? data.payload : {};
      const configuration =
        bootstrap.configuration && typeof bootstrap.configuration === "object"
          ? bootstrap.configuration
          : {};
      const mode = safeText(configuration.executionDisplayMode);
      state.surfaceConfiguration = {
        executionDisplayMode:
          mode === "boundary" || mode === "silent" ? mode : "live",
        transcriptPaginationVirtualizationEnabled:
          configuration.transcriptPaginationVirtualizationEnabled !== false,
      };
      state.surfaceLabels =
        bootstrap.labels && typeof bootstrap.labels === "object"
          ? bootstrap.labels
          : {};
      renderAssistantPanelRuntime(state.snapshot || {});
      return;
    }
    if (data.type === "acp-skill-run:publication") {
      applyPublication(data.payload || {});
      return;
    }
  });

  document
    .getElementById("acp-skill-chat-mode-plain")
    ?.addEventListener("click", function () {
      handleAssistantPanelAction("set-chat-display-mode", { mode: "plain" });
    });

  document
    .getElementById("acp-skill-chat-mode-bubble")
    ?.addEventListener("click", function () {
      handleAssistantPanelAction("set-chat-display-mode", { mode: "bubble" });
    });

  document.addEventListener("DOMContentLoaded", function () {
    trace("ready-send", {});
    sendAction("ready", { documentGeneration: CHILD_DOCUMENT_GENERATION });
  });
})();
