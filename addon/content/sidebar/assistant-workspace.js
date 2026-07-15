/* global window, document */
(function () {
  "use strict";

  const tabs = ["acp-chat", "acp-skills", "skillrunner"];
  const state = {
    activeTab: "acp-chat",
    initializedFrames: new Set(),
    loadedFrames: new Set(),
    latestChildPayloads: new Map(),
    latestChildRevisions: new Map(),
    childPayloadGeneration: 0,
    deliveredChildPayloads: new Map(),
    pendingReplayTabs: new Set(),
    scopeKey: "",
    actionSeq: 0,
    actionTrace: [],
    hostReadyAcked: false,
    hostReadyInFlight: false,
    hostReadyTimer: null,
    hostReadyAttempts: 0,
    childReplayTimer: null,
    childReplayAttempts: 0,
  };

  const hostReadyRetryDelayMs = 250;
  const childReplayDelayMs = 100;

  function $(id) {
    return document.getElementById(id);
  }

  function frameForTab(tab) {
    return $("assistant-frame-" + tab);
  }

  function loadingOverlay() {
    return $("assistant-workspace-loading");
  }

  function updateLoadingState() {
    const overlay = loadingOverlay();
    if (!overlay) return;
    const isLoading = !state.loadedFrames.has(state.activeTab);
    overlay.classList.toggle("hidden", !isLoading);
    overlay.setAttribute("aria-hidden", isLoading ? "false" : "true");
  }

  function bridgeKeyForTab(tab) {
    if (tab === "skillrunner") return "__zsSkillRunnerSidebarBridge";
    if (tab === "acp-skills") return "__zsAcpSkillRunSidebarBridge";
    return "__zsAcpSidebarBridge";
  }

  function messageTypeForTab(tab, phase) {
    if (tab === "skillrunner") return "skillrunner-sidebar:" + phase;
    if (tab === "acp-skills") return "acp-skill-run:" + phase;
    return "acp:" + phase;
  }

  function hostBridge() {
    return [
      window.__zsAssistantWorkspaceBridge,
      window.wrappedJSObject &&
        window.wrappedJSObject.__zsAssistantWorkspaceBridge,
    ].find((entry) => entry && typeof entry.postMessage === "function");
  }

  function nextActionId(tab, action) {
    state.actionSeq += 1;
    return (
      "assistant-action-" +
      String(state.actionSeq) +
      "-" +
      String(tab || "shell") +
      "-" +
      String(action || "unknown")
    );
  }

  function safeError(error) {
    if (!error) return "";
    return error && error.message ? String(error.message) : String(error);
  }

  function traceAction(stage, details) {
    const entry = Object.assign(
      {
        ts: new Date().toISOString(),
        stage: stage || "unknown",
      },
      details || {},
    );
    state.actionTrace.push(entry);
    if (state.actionTrace.length > 80) {
      state.actionTrace.splice(0, state.actionTrace.length - 80);
    }
    window.__zsAssistantWorkspaceActionTrace = state.actionTrace.slice();
    if (window.wrappedJSObject) {
      window.wrappedJSObject.__zsAssistantWorkspaceActionTrace =
        state.actionTrace.slice();
    }
    return entry;
  }

  function payloadSummary(payload) {
    const source = payload && typeof payload === "object" ? payload : {};
    const sidebar =
      source.sidebar && typeof source.sidebar === "object"
        ? source.sidebar
        : {};
    const panes =
      sidebar.panes && typeof sidebar.panes === "object" ? sidebar.panes : {};
    return {
      activeBackendId: String(source.activeBackendId || source.backendId || ""),
      activeConversationId: String(
        source.activeConversationId || source.conversationId || "",
      ),
      backendAvailability: String(source.backendAvailability || ""),
      conversationAvailability: String(source.conversationAvailability || ""),
      selectedRequestId: String(source.selectedRequestId || ""),
      hostMode: String(source.hostMode || ""),
      sidebarActiveTab: String(sidebar.activeTab || ""),
      acpChatRevision:
        panes["acp-chat"] && typeof panes["acp-chat"] === "object"
          ? Number(panes["acp-chat"].revision || 0)
          : 0,
      acpSkillsRevision:
        panes["acp-skills"] && typeof panes["acp-skills"] === "object"
          ? Number(panes["acp-skills"].revision || 0)
          : 0,
      skillrunnerRevision:
        panes.skillrunner && typeof panes.skillrunner === "object"
          ? Number(panes.skillrunner.revision || 0)
          : 0,
    };
  }

  function postToHost(type, payload) {
    const direct = hostBridge();
    if (direct) {
      traceAction("post-to-host-direct", {
        type,
        action: payload && payload.action,
        tab: payload && payload.tab,
        actionId: payload && payload.actionId,
      });
      return Promise.resolve(direct.postMessage(type, payload || {})).then(
        function (result) {
          traceAction("post-to-host-direct-result", {
            type,
            action: payload && payload.action,
            tab: payload && payload.tab,
            actionId: payload && payload.actionId,
            ok: result && result.ok !== false,
            fallback: result && result.fallback === true,
            error: result && result.error ? String(result.error) : "",
          });
          return result;
        },
        function (error) {
          traceAction("post-to-host-direct-result", {
            type,
            action: payload && payload.action,
            tab: payload && payload.tab,
            actionId: payload && payload.actionId,
            ok: false,
            error: safeError(error),
          });
          throw error;
        },
      );
    }
    const message = { type, payload: payload || {} };
    traceAction("post-to-host-fallback", {
      type,
      action: payload && payload.action,
      tab: payload && payload.tab,
      actionId: payload && payload.actionId,
    });
    [window.parent, window.top, window.opener].forEach(function (target) {
      if (!target || target === window) return;
      try {
        target.postMessage(message, "*");
      } catch {
        // ignored
      }
    });
    return Promise.resolve({ ok: true, fallback: true });
  }

  function clearHostReadyRetry(reason) {
    if (state.hostReadyTimer) {
      clearTimeout(state.hostReadyTimer);
      state.hostReadyTimer = null;
    }
    traceAction("host-ready-retry-clear", {
      reason,
      attempts: state.hostReadyAttempts,
      acked: state.hostReadyAcked,
    });
  }

  function scheduleHostReadyRetry(reason) {
    if (state.hostReadyAcked) {
      traceAction("host-ready-retry-drop-acked", { reason });
      return;
    }
    if (state.hostReadyTimer) {
      traceAction("host-ready-retry-coalesced", {
        reason,
        attempts: state.hostReadyAttempts,
      });
      return;
    }
    traceAction("host-ready-retry-scheduled", {
      reason,
      attempts: state.hostReadyAttempts,
    });
    state.hostReadyTimer = setTimeout(function () {
      state.hostReadyTimer = null;
      ensureHostReady(reason);
    }, hostReadyRetryDelayMs);
  }

  function ensureHostReady(reason) {
    if (state.hostReadyAcked) {
      traceAction("host-ready-drop-acked", { reason });
      return;
    }
    if (state.hostReadyInFlight) {
      traceAction("host-ready-coalesced", {
        reason,
        attempts: state.hostReadyAttempts,
      });
      return;
    }
    state.hostReadyAttempts += 1;
    state.hostReadyInFlight = true;
    traceAction("host-ready-post", {
      reason,
      attempts: state.hostReadyAttempts,
    });
    postToHost("assistant-workspace:action", { action: "ready" })
      .then(function (result) {
        const acked =
          !!result && result.ok !== false && result.fallback !== true;
        state.hostReadyInFlight = false;
        traceAction("host-ready-result", {
          reason,
          attempts: state.hostReadyAttempts,
          acked,
          ok: result && result.ok !== false,
          fallback: result && result.fallback === true,
          error: result && result.error ? String(result.error) : "",
        });
        if (acked) {
          state.hostReadyAcked = true;
          clearHostReadyRetry("acked");
          return;
        }
        scheduleHostReadyRetry("unacked-result");
      })
      .catch(function (error) {
        state.hostReadyInFlight = false;
        traceAction("host-ready-result", {
          reason,
          attempts: state.hostReadyAttempts,
          acked: false,
          ok: false,
          error: safeError(error),
        });
        scheduleHostReadyRetry("error");
      });
  }

  function sendChildAction(tab, action, payload) {
    const actionId = nextActionId(tab, action);
    const envelope = {
      tab,
      action,
      payload: payload || {},
      actionId: actionId,
      ts: new Date().toISOString(),
    };
    traceAction("child-action-received", {
      tab,
      action,
      actionId,
    });
    postToHost("assistant-workspace:child-action", envelope)
      .then(function (result) {
        traceAction(
          result && result.ok === false
            ? "host-action-failed"
            : "host-action-acked",
          {
            tab,
            action,
            actionId,
            error: result && result.error ? String(result.error) : "",
          },
        );
      })
      .catch(function (error) {
        traceAction("host-action-failed", {
          tab,
          action,
          actionId,
          error: safeError(error),
        });
      });
  }

  function installChildBridge(tab) {
    const frame = frameForTab(tab);
    const frameWindow = frame && frame.contentWindow;
    if (!frameWindow) return;
    const bridge = {
      sendAction: function (action, payload) {
        sendChildAction(tab, action, payload || {});
      },
    };
    const direct = frameWindow;
    const wrapped =
      direct.wrappedJSObject && typeof direct.wrappedJSObject === "object"
        ? direct.wrappedJSObject
        : null;
    direct[bridgeKeyForTab(tab)] = bridge;
    if (wrapped) wrapped[bridgeKeyForTab(tab)] = bridge;
  }

  function requestChildReady(tab, reason) {
    const frame = frameForTab(tab);
    const frameWindow = frame && frame.contentWindow;
    if (!frameWindow) {
      traceAction("child-ready-request-drop-no-frame", { tab, reason });
      return false;
    }
    installChildBridge(tab);
    traceAction("child-ready-request", { tab, reason });
    frameWindow.postMessage(
      { type: "assistant-workspace:child-ready-request" },
      "*",
    );
    return true;
  }

  function requestAllChildrenReady(reason) {
    tabs.forEach(function (tab) {
      requestChildReady(tab, reason);
    });
  }

  function childDeliveryKey(tab, phase, generation) {
    return [tab, phase, String(generation || 0)].join(":");
  }

  function hasDeliveredChildPayload(tab, phase, generation, frameWindow) {
    if (!generation || !frameWindow) return false;
    const delivered = state.deliveredChildPayloads.get(
      childDeliveryKey(tab, phase, generation),
    );
    return !!delivered && delivered.has(frameWindow);
  }

  function markDeliveredChildPayload(tab, phase, generation, frameWindow) {
    if (!generation || !frameWindow) return;
    const key = childDeliveryKey(tab, phase, generation);
    let delivered = state.deliveredChildPayloads.get(key);
    if (!delivered) {
      delivered = new WeakSet();
      state.deliveredChildPayloads.set(key, delivered);
    }
    delivered.add(frameWindow);
  }

  function rejectCachedPublication(cached) {
    if (!cached || !cached.generation || !cached.payload) return;
    const publication =
      cached.payload.workspacePublication &&
      typeof cached.payload.workspacePublication === "object"
        ? cached.payload.workspacePublication
        : null;
    if (!publication) return;
    void publicationAck(publication, "shell-forward", "rejected", "superseded");
  }

  function postToChild(tab, phase, payload, generation) {
    const frame = frameForTab(tab);
    const frameWindow = frame && frame.contentWindow;
    if (!frameWindow) {
      traceAction("post-to-child-drop-no-frame", { tab, phase, generation });
      return false;
    }
    if (hasDeliveredChildPayload(tab, phase, generation, frameWindow)) {
      traceAction("post-to-child-skip-delivered", {
        tab,
        phase,
        generation,
      });
      state.loadedFrames.add(tab);
      updateLoadingState();
      return true;
    }
    const normalizedPayload =
      tab === "skillrunner"
        ? normalizeSkillRunnerSidebarPayload(payload)
        : payload || {};
    installChildBridge(tab);
    traceAction("post-to-child", {
      tab,
      phase,
      generation,
      summary: payloadSummary(normalizedPayload),
    });
    frameWindow.postMessage(
      {
        type: messageTypeForTab(tab, phase),
        payload: normalizedPayload,
      },
      "*",
    );
    const snapshotPublication =
      normalizedPayload.workspacePublication &&
      typeof normalizedPayload.workspacePublication === "object"
        ? normalizedPayload.workspacePublication
        : null;
    if (snapshotPublication) {
      void publicationAck(
        snapshotPublication,
        "shell-forward",
        "accepted",
        null,
      );
    }
    markDeliveredChildPayload(tab, phase, generation, frameWindow);
    state.loadedFrames.add(tab);
    updateLoadingState();
    return true;
  }

  function publicationAck(publication, stage, outcome, reason) {
    return postToHost("assistant-workspace:publication-ack", {
      publicationId: String((publication && publication.publicationId) || ""),
      stage,
      outcome,
      reason: reason || null,
    });
  }

  function postPublicationToChild(tab, publication) {
    const frame = frameForTab(tab);
    const frameWindow = frame && frame.contentWindow;
    void publicationAck(
      publication,
      "shell-receive",
      frameWindow ? "accepted" : "rejected",
      frameWindow ? null : "invalid",
    );
    if (!frameWindow) return false;
    installChildBridge(tab);
    frameWindow.postMessage(
      {
        type:
          tab === "acp-skills"
            ? "acp-skill-run:publication"
            : "acp:publication",
        payload: publication || {},
      },
      "*",
    );
    void publicationAck(publication, "shell-forward", "accepted", null);
    state.loadedFrames.add(tab);
    updateLoadingState();
    return true;
  }

  function closeDrawersForTab(tab) {
    const frame = frameForTab(tab);
    const frameWindow = frame && frame.contentWindow;
    if (!frameWindow) return;
    frameWindow.postMessage({ type: "assistant-panel:close-drawers" }, "*");
  }

  function closeInactiveChildDrawers(activeTab) {
    tabs.forEach(function (entry) {
      if (entry !== activeTab) closeDrawersForTab(entry);
    });
  }

  function cacheChildPayload(tab, phase, payload) {
    if (tabs.indexOf(tab) < 0) return;
    syncScopeKeyFromPayload(payload);
    const revision = childPayloadRevision(tab, payload);
    const latestRevision = state.latestChildRevisions.get(tab) || 0;
    if (revision > 0 && revision < latestRevision) {
      traceAction("cache-child-payload-drop-stale", {
        tab,
        phase,
        revision,
        latestRevision,
        summary: payloadSummary(payload),
      });
      return null;
    }
    if (revision > latestRevision) {
      state.latestChildRevisions.set(tab, revision);
    }
    state.childPayloadGeneration += 1;
    const generation = state.childPayloadGeneration;
    const current = state.latestChildPayloads.get(tab) || {};
    const phaseKey = phase || "snapshot";
    const nextPublicationId = String(
      (payload &&
        payload.workspacePublication &&
        payload.workspacePublication.publicationId) ||
        "",
    );
    Object.values(current).forEach(function (cached) {
      const cachedPublicationId = String(
        (cached &&
          cached.payload &&
          cached.payload.workspacePublication &&
          cached.payload.workspacePublication.publicationId) ||
          "",
      );
      if (!nextPublicationId || cachedPublicationId !== nextPublicationId) {
        rejectCachedPublication(cached);
      }
    });
    current[phaseKey] = {
      generation,
      payload:
        tab === "skillrunner"
          ? normalizeSkillRunnerSidebarPayload(payload)
          : payload || {},
    };
    state.latestChildPayloads.set(tab, current);
    traceAction("cache-child-payload", {
      tab,
      phase: phaseKey,
      generation,
      revision,
      latestRevision: state.latestChildRevisions.get(tab) || 0,
      summary: payloadSummary(current[phaseKey].payload),
    });
    return current[phaseKey];
  }

  function payloadScopeKey(payload) {
    const source = payload && typeof payload === "object" ? payload : {};
    const sidebar =
      source.sidebar && typeof source.sidebar === "object"
        ? source.sidebar
        : source;
    return String((sidebar && sidebar.scopeKey) || "").trim();
  }

  function syncScopeKeyFromPayload(payload) {
    const scopeKey = payloadScopeKey(payload);
    if (!scopeKey || scopeKey === state.scopeKey) return;
    state.scopeKey = scopeKey;
    clearChildPayloadState("scope-change");
  }

  function clearChildPayloadState(reason) {
    state.latestChildPayloads.forEach(function (cached) {
      if (cached.init) {
        rejectCachedPublication(cached.init);
      }
      if (cached.snapshot) {
        rejectCachedPublication(cached.snapshot);
      }
    });
    state.latestChildPayloads.clear();
    state.latestChildRevisions.clear();
    state.deliveredChildPayloads.clear();
    state.pendingReplayTabs.clear();
    if (state.childReplayTimer) {
      clearTimeout(state.childReplayTimer);
      state.childReplayTimer = null;
    }
    state.childReplayAttempts = 0;
    traceAction("child-payload-state-clear", { reason });
  }

  function childPayloadRevision(tab, payload) {
    const source = payload && typeof payload === "object" ? payload : {};
    const sidebar =
      source.sidebar && typeof source.sidebar === "object"
        ? source.sidebar
        : {};
    const panes =
      sidebar.panes && typeof sidebar.panes === "object" ? sidebar.panes : {};
    const pane = panes[tab] && typeof panes[tab] === "object" ? panes[tab] : {};
    const revision = Number(pane.revision || 0);
    return Number.isFinite(revision) ? Math.max(0, Math.floor(revision)) : 0;
  }

  function normalizeSkillRunnerSidebarPayload(payload) {
    const source = payload && typeof payload === "object" ? payload : {};
    return Object.assign({}, source, { hostMode: "sidebar" });
  }

  function replayCachedChildPayload(tab) {
    const cached = state.latestChildPayloads.get(tab);
    if (!cached) {
      traceAction("replay-cache-empty", { tab });
      return true;
    }
    traceAction("replay-cache", {
      tab,
      hasInit: !!cached.init,
      hasSnapshot: !!cached.snapshot,
    });
    let delivered = true;
    if (cached.init) {
      delivered =
        postToChild(tab, "init", cached.init.payload, cached.init.generation) &&
        delivered;
    }
    if (cached.snapshot) {
      delivered =
        postToChild(
          tab,
          "snapshot",
          cached.snapshot.payload,
          cached.snapshot.generation,
        ) && delivered;
    }
    if (delivered) {
      state.pendingReplayTabs.delete(tab);
    }
    traceAction("replay-cache-result", { tab, delivered });
    return delivered;
  }

  function replayPendingChildPayloads(reason) {
    let delivered = true;
    Array.from(state.pendingReplayTabs).forEach(function (tab) {
      if (!state.latestChildPayloads.has(tab)) {
        state.pendingReplayTabs.delete(tab);
        return;
      }
      if (replayCachedChildPayload(tab)) {
        state.pendingReplayTabs.delete(tab);
        return;
      }
      delivered = false;
    });
    traceAction("child-replay-pending-result", {
      reason,
      delivered,
      attempts: state.childReplayAttempts,
      pendingTabs: Array.from(state.pendingReplayTabs),
    });
    return delivered;
  }

  function queueChildReplay(tab, reason) {
    if (tabs.indexOf(tab) < 0) return;
    state.pendingReplayTabs.add(tab);
    traceAction("child-replay-queued", {
      tab,
      reason,
      pendingTabs: Array.from(state.pendingReplayTabs),
    });
    scheduleChildReplay(reason);
  }

  function scheduleChildReplay(reason) {
    if (state.childReplayTimer) {
      traceAction("child-replay-coalesced", {
        reason,
        attempts: state.childReplayAttempts,
        pendingTabs: Array.from(state.pendingReplayTabs),
      });
      return;
    }
    traceAction("child-replay-scheduled", {
      reason,
      attempts: state.childReplayAttempts,
      pendingTabs: Array.from(state.pendingReplayTabs),
    });
    state.childReplayTimer = setTimeout(function () {
      state.childReplayTimer = null;
      state.childReplayAttempts += 1;
      traceAction("child-replay-tick", {
        reason,
        attempts: state.childReplayAttempts,
        pendingTabs: Array.from(state.pendingReplayTabs),
      });
      if (!replayPendingChildPayloads(reason)) {
        scheduleChildReplay("retry");
        return;
      }
      state.childReplayAttempts = 0;
    }, childReplayDelayMs);
  }

  function acceptChildReady(tab, payload) {
    const normalizedTab = normalizeTab(tab, state.activeTab);
    const firstReady = !state.initializedFrames.has(normalizedTab);
    installChildBridge(normalizedTab);
    state.loadedFrames.add(normalizedTab);
    state.initializedFrames.add(normalizedTab);
    traceAction("child-ready", {
      tab: normalizedTab,
      firstReady,
      payload: payloadSummary(payload),
    });
    if (!replayCachedChildPayload(normalizedTab)) {
      queueChildReplay(normalizedTab, "child-ready:" + normalizedTab);
    }
    updateLoadingState();
    sendChildAction(normalizedTab, "ready", payload || {});
  }

  function normalizeTab(tab, fallback) {
    if (tabs.indexOf(tab) >= 0) return tab;
    if (tabs.indexOf(fallback) >= 0) return fallback;
    return "acp-chat";
  }

  function setActiveTab(tab, options) {
    const fallback =
      options && options.fallback ? options.fallback : state.activeTab;
    const nextTab = normalizeTab(tab, fallback);
    const previousTab = state.activeTab;
    state.activeTab = nextTab;
    if (nextTab !== previousTab) {
      closeInactiveChildDrawers(nextTab);
    }
    tabs.forEach(function (entry) {
      const frame = frameForTab(entry);
      const button = $("assistant-tab-" + entry);
      if (frame) frame.classList.toggle("hidden", entry !== nextTab);
      if (button) button.classList.toggle("is-active", entry === nextTab);
    });
    if (!options || options.notify !== false) {
      traceAction("set-active-tab-notify", { tab: nextTab });
      postToHost("assistant-workspace:action", {
        action: "set-tab",
        tab: nextTab,
      });
    }
    if (!replayCachedChildPayload(nextTab)) {
      queueChildReplay(nextTab, "tab-switch:" + nextTab);
    }
    if (nextTab === "skillrunner") {
      installChildBridge("skillrunner");
    }
    updateLoadingState();
  }

  function handleFrameLoad(tab) {
    const normalizedTab = normalizeTab(tab, state.activeTab);
    installChildBridge(normalizedTab);
    state.loadedFrames.add(normalizedTab);
    traceAction("frame-load", { tab: normalizedTab });
    requestChildReady(normalizedTab, "frame-load:" + normalizedTab);
    if (!replayCachedChildPayload(normalizedTab)) {
      queueChildReplay(normalizedTab, "frame-load:" + normalizedTab);
    }
    updateLoadingState();
  }

  function attachFrameLoadListeners() {
    tabs.forEach(function (tab) {
      const frame = frameForTab(tab);
      if (!frame) return;
      frame.addEventListener("load", function () {
        handleFrameLoad(tab);
      });
    });
  }

  window.addEventListener("message", function (event) {
    const data = event.data || {};
    if (data.type === "acp:action") {
      if (data.action === "ready") {
        acceptChildReady("acp-chat", data.payload || {});
        return;
      }
      sendChildAction("acp-chat", data.action || "", data.payload || {});
      return;
    }
    if (data.type === "acp-skill-run:action") {
      if (data.action === "ready") {
        acceptChildReady("acp-skills", data.payload || {});
        return;
      }
      sendChildAction("acp-skills", data.action || "", data.payload || {});
      return;
    }
    if (data.type === "skillrunner-sidebar:action") {
      if (data.action === "ready") {
        acceptChildReady("skillrunner", data.payload || {});
        return;
      }
      sendChildAction("skillrunner", data.action || "", data.payload || {});
      return;
    }
    if (data.type === "assistant-workspace:init") {
      ensureHostReady("host-init");
      traceAction("workspace-init-received", {
        activeTab: data.payload && data.payload.activeTab,
        summary: payloadSummary(data.payload || {}),
      });
      syncScopeKeyFromPayload(data.payload || {});
      setActiveTab(data.payload && data.payload.activeTab, {
        notify: false,
        fallback: state.activeTab,
      });
      requestAllChildrenReady("host-init");
      return;
    }
    if (data.type === "assistant-workspace:set-tab") {
      ensureHostReady("host-set-tab");
      traceAction("workspace-set-tab-received", {
        activeTab: data.payload && data.payload.activeTab,
      });
      setActiveTab(data.payload && data.payload.activeTab, {
        notify: false,
        fallback: state.activeTab,
      });
      return;
    }
    if (data.type === "assistant-workspace:child-snapshot") {
      ensureHostReady("host-child-snapshot");
      const payload = data.payload || {};
      const tab = normalizeTab(payload.tab, state.activeTab);
      const phase = payload.phase || "snapshot";
      const snapshot = payload.snapshot || {};
      const snapshotPublication =
        snapshot.workspacePublication &&
        typeof snapshot.workspacePublication === "object"
          ? snapshot.workspacePublication
          : null;
      if (snapshotPublication) {
        void publicationAck(
          snapshotPublication,
          "shell-receive",
          "accepted",
          null,
        );
      }
      traceAction("child-snapshot-received", {
        tab,
        phase,
        summary: payloadSummary(snapshot),
      });
      const normalizedSnapshot = cacheChildPayload(tab, phase, snapshot);
      if (normalizedSnapshot) {
        if (!replayCachedChildPayload(tab)) {
          queueChildReplay(tab, "child-snapshot:" + tab);
        }
      }
      return;
    }
    if (data.type === "assistant-workspace:child-publication") {
      ensureHostReady("host-child-publication");
      const payload = data.payload || {};
      const publication = payload.publication || {};
      const tab = normalizeTab(
        payload.tab ||
          (publication.owner && publication.owner.source === "acp-skills"
            ? "acp-skills"
            : "acp-chat"),
        state.activeTab,
      );
      traceAction("child-publication-received", {
        tab,
        kind: publication.publicationKind,
        publicationId: publication.publicationId,
      });
      postPublicationToChild(tab, publication);
      return;
    }
  });

  document.addEventListener("DOMContentLoaded", function () {
    tabs.forEach(function (tab) {
      const button = $("assistant-tab-" + tab);
      if (button) {
        button.addEventListener("click", function () {
          setActiveTab(tab);
        });
      }
    });
    $("assistant-workspace-close")?.addEventListener("click", function () {
      void postToHost("assistant-workspace:action", {
        action: "close-sidebar",
      });
    });
    setActiveTab("acp-chat", { notify: false, fallback: "acp-chat" });
    updateLoadingState();
    ensureHostReady("dom-content-loaded");
  });

  attachFrameLoadListeners();
  requestAllChildrenReady("script-start");
  ensureHostReady("script-start");
})();
