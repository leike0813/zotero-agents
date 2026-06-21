(function () {
  "use strict";

  const tabs = ["acp-chat", "acp-skills", "skillrunner"];
  const state = {
    activeTab: "acp-chat",
    initializedFrames: new Set(),
    loadedFrames: new Set(),
    latestChildPayloads: new Map(),
    actionSeq: 0,
    actionTrace: [],
  };

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

  function postToHost(type, payload) {
    const direct = hostBridge();
    if (direct) {
      return Promise.resolve(direct.postMessage(type, payload || {}));
    }
    const message = { type, payload: payload || {} };
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

  function postToChild(tab, phase, payload) {
    const frame = frameForTab(tab);
    const frameWindow = frame && frame.contentWindow;
    if (!frameWindow) return;
    const normalizedPayload =
      tab === "skillrunner"
        ? normalizeSkillRunnerSidebarPayload(payload)
        : payload || {};
    installChildBridge(tab);
    frameWindow.postMessage(
      {
        type: messageTypeForTab(tab, phase),
        payload: normalizedPayload,
      },
      "*",
    );
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
    const current = state.latestChildPayloads.get(tab) || {};
    current[phase || "snapshot"] =
      tab === "skillrunner"
        ? normalizeSkillRunnerSidebarPayload(payload)
        : payload || {};
    state.latestChildPayloads.set(tab, current);
    return current[phase || "snapshot"];
  }

  function normalizeSkillRunnerSidebarPayload(payload) {
    const source = payload && typeof payload === "object" ? payload : {};
    return Object.assign({}, source, { hostMode: "sidebar" });
  }

  function ensureSkillRunnerSidebarLayout() {
    const cached = state.latestChildPayloads.get("skillrunner");
    if (cached && cached.init) return;
    const payload = normalizeSkillRunnerSidebarPayload({});
    cacheChildPayload("skillrunner", "init", payload);
    postToChild("skillrunner", "init", payload);
  }

  function replayCachedChildPayload(tab) {
    const cached = state.latestChildPayloads.get(tab);
    if (!cached) return;
    if (tab === "skillrunner" && !cached.init) {
      ensureSkillRunnerSidebarLayout();
    }
    if (cached.init) postToChild(tab, "init", cached.init);
    if (cached.snapshot) postToChild(tab, "snapshot", cached.snapshot);
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
      postToHost("assistant-workspace:action", {
        action: "set-tab",
        tab: nextTab,
      });
    }
    replayCachedChildPayload(nextTab);
    if (nextTab === "skillrunner") {
      installChildBridge("skillrunner");
    }
    updateLoadingState();
  }

  function initializeFrame(tab) {
    installChildBridge(tab);
    replayCachedChildPayload(tab);
    if (tab === "skillrunner") {
      ensureSkillRunnerSidebarLayout();
    }
    if (state.initializedFrames.has(tab)) {
      return;
    }
    state.initializedFrames.add(tab);
    sendChildAction(tab, "ready", {});
  }

  function handleFrameLoad(tab) {
    state.loadedFrames.add(tab);
    initializeFrame(tab);
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
      sendChildAction("acp-chat", data.action || "", data.payload || {});
      return;
    }
    if (data.type === "acp-skill-run:action") {
      sendChildAction("acp-skills", data.action || "", data.payload || {});
      return;
    }
    if (data.type === "skillrunner-sidebar:action") {
      sendChildAction("skillrunner", data.action || "", data.payload || {});
      return;
    }
    if (data.type === "skillrunner-sidebar:init") {
      const payload = normalizeSkillRunnerSidebarPayload(data.payload);
      cacheChildPayload("skillrunner", "init", payload);
      postToChild("skillrunner", "init", payload);
      return;
    }
    if (data.type === "skillrunner-sidebar:snapshot") {
      const payload = normalizeSkillRunnerSidebarPayload(data.payload);
      cacheChildPayload("skillrunner", "snapshot", payload);
      postToChild("skillrunner", "snapshot", payload);
      return;
    }
    if (data.type === "assistant-workspace:init") {
      setActiveTab(data.payload && data.payload.activeTab, {
        notify: false,
        fallback: state.activeTab,
      });
      return;
    }
    if (data.type === "assistant-workspace:set-tab") {
      setActiveTab(data.payload && data.payload.activeTab, {
        notify: false,
        fallback: state.activeTab,
      });
      return;
    }
    if (data.type === "assistant-workspace:child-snapshot") {
      const payload = data.payload || {};
      const tab = normalizeTab(payload.tab, state.activeTab);
      const phase = payload.phase || "snapshot";
      const snapshot = payload.snapshot || {};
      const normalizedSnapshot = cacheChildPayload(tab, phase, snapshot);
      postToChild(tab, phase, normalizedSnapshot || snapshot);
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
    void postToHost("assistant-workspace:action", { action: "ready" });
  });

  attachFrameLoadListeners();
})();
