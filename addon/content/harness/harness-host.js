(function () {
  "use strict";

  const state = {
    frames: Object.create(null),
    actionLog: [],
    frameState: Object.create(null),
    assistantActiveTab: "acp-chat",
    assistantSkillRunnerDrawerOpen: false,
    assistantSkillRunnerSelectedTaskKey: "",
    selectedWorkspaceView:
      new URLSearchParams(window.location.search).get("view") === "synthesis"
        ? "synthesis"
        : "dashboard",
  };

  const frameSources = {
    dashboard: "/content/dashboard/index.html",
    synthesis: "/content/synthesis/index.html",
  };

  function sendFrame(frame, type, payload) {
    if (!frame || !frame.contentWindow) return;
    frame.contentWindow.postMessage({ type, payload: payload || {} }, "*");
  }

  function markFrameState(key, patch) {
    state.frameState[key] = {
      ...(state.frameState[key] || {}),
      ...(patch || {}),
      updatedAt: new Date().toISOString(),
    };
    window.__zsReadonlyHarnessFrameState = { ...state.frameState };
  }

  async function api(path, body) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || response.statusText);
    }
    return payload;
  }

  function appendLog(entry) {
    state.actionLog.unshift(entry);
    state.actionLog.splice(80);
    window.__zsReadonlyHarnessActionLog = state.actionLog.slice();
  }

  function installWorkspaceBridge(frame) {
    const win = frame && frame.contentWindow;
    if (!win) return;
    if (!win.__zsReadonlyHarnessNestedBridgeInstalled) {
      win.__zsReadonlyHarnessNestedBridgeInstalled = true;
      win.addEventListener("message", (event) => {
        const data = event.data || {};
        if (data.type === "dashboard:action") {
          void handleDashboardAction(
            frameForSource(event.source) || state.frames["workspace-dashboard"],
            data.action || "",
            data.payload || {},
          );
        }
        if (data.type === "synthesis:action") {
          void handleSynthesisAction(
            frameForSource(event.source) || state.frames["workspace-synthesis"],
            data.action || "",
            data.payload || {},
          );
        }
      });
    }
    win.__zoteroSkillsWorkspaceBridge = {
      postMessage(action, payload) {
        return handleWorkspaceAction(frame, action, payload || {});
      },
    };
  }

  function installSynthesisBridge(frame) {
    const win = frame && frame.contentWindow;
    if (!win) return;
    win.__zoteroSkillsSynthesisWorkbenchBridge = {
      postMessage(action, payload) {
        return handleSynthesisAction(frame, action, payload || {});
      },
    };
  }

  function installAssistantBridge(frame) {
    const win = frame && frame.contentWindow;
    if (!win) return;
    win.__zsAssistantWorkspaceBridge = {
      postMessage(type, payload) {
        return handleAssistantMessage(frame, type, payload || {});
      },
    };
  }

  function createChildFrame(view, ownerDocument) {
    const frame = ownerDocument.createElement("iframe");
    frame.className = "harness-embedded-frame";
    frame.title = view;
    frame.style.display = "block";
    frame.style.width = "100%";
    frame.style.height = "100%";
    frame.style.border = "0";
    frame.addEventListener("load", () => {
      if (view === "synthesis") installSynthesisBridge(frame);
      if (view === "dashboard") void initDashboard(frame);
      if (view === "synthesis") initSynthesisWithRetries(frame);
    });
    frame.src = frameSources[view];
    return frame;
  }

  async function initDashboard(frame) {
    const payload = await api("/api/harness/dashboard/action", {
      action: "ready",
      payload: {},
    });
    markFrameState("dashboard", {
      initialized: true,
      snapshotKind: payload.snapshot ? "dashboard" : "empty",
    });
    sendFrame(frame, "dashboard:init", payload.snapshot);
  }

  async function handleDashboardAction(frame, action, payload) {
    const result = await api("/api/harness/dashboard/action", {
      action,
      payload,
    });
    if (result.logEntry) appendLog(result.logEntry);
    markFrameState("dashboard", {
      lastAction: action,
      snapshotKind: result.snapshot ? "dashboard" : "empty",
    });
    sendFrame(frame, "dashboard:snapshot", result.snapshot);
    return { ok: true };
  }

  async function initSynthesis(frame) {
    installSynthesisBridge(frame);
    await handleSynthesisAction(frame, "ready", {});
  }

  function initSynthesisWithRetries(frame, attempts = 4) {
    void initSynthesis(frame);
    if (attempts <= 0) return;
    window.setTimeout(
      () => initSynthesisWithRetries(frame, attempts - 1),
      attempts === 4 ? 100 : 500,
    );
  }

  async function handleSynthesisAction(frame, action, payload) {
    const result = await api("/api/harness/synthesis/action", {
      action,
      payload,
    });
    (result.messages || []).forEach((message) =>
      sendFrame(frame, message.type, message.payload),
    );
    (result.actionLog || []).forEach(appendLog);
    markFrameState("synthesis", {
      lastAction: action,
      messageTypes: (result.messages || []).map((message) => message.type),
    });
    return { ok: true };
  }

  async function handleWorkspaceAction(frame, action, payload) {
    if (action === "ready") {
      sendFrame(frame, "workspace:init", {
        selectedView: state.selectedWorkspaceView,
      });
      return { ok: true };
    }
    if (action === "select-view") {
      state.selectedWorkspaceView =
        payload && payload.view === "synthesis" ? "synthesis" : "dashboard";
      sendFrame(frame, "workspace:snapshot", {
        selectedView: state.selectedWorkspaceView,
      });
      return { ok: true };
    }
    if (action === "dashboard-mount-ready") {
      mountWorkspaceChild(frame, "dashboard");
      return { ok: true };
    }
    if (action === "synthesis-mount-ready") {
      mountWorkspaceChild(frame, "synthesis");
      return { ok: true };
    }
    const result = await api("/api/harness/mock-action", {
      source: "workspace",
      action,
      payload,
    });
    appendLog(result.logEntry);
    return { ok: true };
  }

  function mountWorkspaceChild(workspaceFrame, view) {
    const doc = workspaceFrame.contentDocument;
    if (!doc) return;
    const mount = doc.getElementById(
      view === "dashboard" ? "dashboard-mount" : "synthesis-mount",
    );
    if (!mount || mount.querySelector("iframe")) return;
    const child = createChildFrame(view, doc);
    state.frames["workspace-" + view] = child;
    mount.appendChild(child);
    if (view === "synthesis") {
      installSynthesisBridge(child);
      initSynthesisWithRetries(child);
    }
    if (view === "dashboard") {
      void initDashboard(child);
    }
  }

  function ensureWorkspaceChildren(workspaceFrame, attempts) {
    if (!workspaceFrame) return;
    sendFrame(workspaceFrame, "workspace:init", {
      selectedView: state.selectedWorkspaceView,
    });
    mountWorkspaceChild(workspaceFrame, "dashboard");
    mountWorkspaceChild(workspaceFrame, "synthesis");
    if (attempts > 0) {
      window.setTimeout(
        () => ensureWorkspaceChildren(workspaceFrame, attempts - 1),
        150,
      );
    }
  }

  function postAssistantSnapshots(frame, snapshots, phase) {
    [
      ["acp-chat", snapshots.acpChat],
      ["acp-skills", snapshots.acpSkills],
      ["skillrunner", snapshots.skillrunner],
    ].forEach(([tab, snapshot]) => {
      sendFrame(frame, "assistant-workspace:child-snapshot", {
        tab,
        phase,
        snapshot,
      });
    });
  }

  async function fetchAssistantSnapshots() {
    return fetch("/api/harness/assistant/snapshot").then((response) =>
      response.json(),
    );
  }

  function applyAssistantHostState(snapshots) {
    const source = snapshots && typeof snapshots === "object" ? snapshots : {};
    const skillrunner =
      source.skillrunner && typeof source.skillrunner === "object"
        ? { ...source.skillrunner }
        : {};
    const drawer =
      skillrunner.drawer && typeof skillrunner.drawer === "object"
        ? { ...skillrunner.drawer }
        : {};
    drawer.open = state.assistantSkillRunnerDrawerOpen;
    if (state.assistantSkillRunnerSelectedTaskKey) {
      drawer.selectedTaskKey = state.assistantSkillRunnerSelectedTaskKey;
    }
    skillrunner.drawer = drawer;
    return {
      ...source,
      skillrunner,
    };
  }

  function markAssistantState(snapshots) {
    markFrameState("assistant", {
      initialized: true,
      activeTab: state.assistantActiveTab,
      acpBackends: snapshots.acpChat?.backendOptions?.length || 0,
      acpSessions: snapshots.acpChat?.chatSessions?.length || 0,
      acpSkillRuns: snapshots.acpSkills?.runs?.length || 0,
      skillRunnerDrawerOpen: state.assistantSkillRunnerDrawerOpen,
      skillRunnerSections: snapshots.skillrunner?.drawer?.sections?.length || 0,
    });
  }

  async function refreshAssistant(frame) {
    const snapshots = applyAssistantHostState(await fetchAssistantSnapshots());
    markAssistantState(snapshots);
    postAssistantSnapshots(frame, snapshots, "snapshot");
  }

  async function initAssistant(frame) {
    installAssistantBridge(frame);
    const snapshots = applyAssistantHostState(await fetchAssistantSnapshots());
    markAssistantState(snapshots);
    sendFrame(frame, "assistant-workspace:init", {
      activeTab: state.assistantActiveTab,
    });
    postAssistantSnapshots(frame, snapshots, "init");
    postAssistantSnapshots(frame, snapshots, "snapshot");
  }

  function applyAssistantChildAction(type, payload) {
    if (type !== "assistant-workspace:child-action") return false;
    if (!payload || payload.tab !== "skillrunner") return false;
    const action = String(payload.action || "");
    const data =
      payload.payload && typeof payload.payload === "object"
        ? payload.payload
        : {};
    if (action === "toggle-drawer") {
      state.assistantSkillRunnerDrawerOpen =
        !state.assistantSkillRunnerDrawerOpen;
      return true;
    }
    if (action === "open-context-drawer") {
      state.assistantSkillRunnerDrawerOpen = true;
      return true;
    }
    if (action === "close-drawer" || action === "close-context-drawer") {
      state.assistantSkillRunnerDrawerOpen = false;
      return true;
    }
    if (action === "select-task") {
      state.assistantSkillRunnerDrawerOpen = false;
      state.assistantSkillRunnerSelectedTaskKey = String(
        data.taskKey || data.key || "",
      ).trim();
      return true;
    }
    return false;
  }

  async function handleAssistantMessage(frame, type, payload) {
    if (type === "assistant-workspace:action" && payload.action === "set-tab") {
      state.assistantActiveTab =
        payload.tab === "acp-skills" || payload.tab === "skillrunner"
          ? payload.tab
          : "acp-chat";
      if (state.assistantActiveTab !== "skillrunner") {
        state.assistantSkillRunnerDrawerOpen = false;
      }
      sendFrame(frame, "assistant-workspace:set-tab", {
        activeTab: state.assistantActiveTab,
      });
      return { ok: true };
    }
    if (type === "assistant-workspace:action" && payload.action === "ready") {
      void initAssistant(frame);
      return { ok: true };
    }
    applyAssistantChildAction(type, payload);
    const result = await api("/api/harness/mock-action", {
      source: "assistant",
      action: type,
      payload,
    });
    appendLog(result.logEntry);
    void refreshAssistant(frame);
    return { ok: true, readonly: true };
  }

  function frameForSource(source) {
    return Object.values(state.frames).find(
      (candidate) => candidate.contentWindow === source,
    );
  }

  function installLiveReload() {
    if (!window.EventSource) return;
    const source = new EventSource("/api/harness/live");
    source.addEventListener("reload", () => {
      window.location.reload();
    });
    source.addEventListener("build-error", (event) => {
      try {
        const payload = JSON.parse(event.data || "{}");
        console.warn(
          "Readonly harness live reload build failed:",
          payload.error || payload,
        );
      } catch {
        console.warn("Readonly harness live reload build failed.");
      }
    });
    window.addEventListener("beforeunload", () => source.close(), {
      once: true,
    });
  }

  window.addEventListener("message", (event) => {
    const data = event.data || {};
    if (data.type === "dashboard:action") {
      void handleDashboardAction(
        frameForSource(event.source) || state.frames["workspace-dashboard"],
        data.action || "",
        data.payload || {},
      );
    }
    if (data.type === "synthesis:action") {
      void handleSynthesisAction(
        frameForSource(event.source) || state.frames["workspace-synthesis"],
        data.action || "",
        data.payload || {},
      );
    }
    if (data.type === "workspace:action") {
      void handleWorkspaceAction(
        state.frames.workspace,
        data.action || "",
        data.payload || {},
      );
    }
    if (String(data.type || "").startsWith("assistant-workspace:")) {
      void handleAssistantMessage(
        state.frames.assistant,
        data.type,
        data.payload || data,
      );
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    installLiveReload();
    state.frames.workspace = document.getElementById("harness-workspace-frame");
    state.frames.assistant = document.getElementById("harness-assistant-frame");

    state.frames.workspace?.addEventListener("load", () => {
      installWorkspaceBridge(state.frames.workspace);
      ensureWorkspaceChildren(state.frames.workspace, 12);
    });
    state.frames.assistant?.addEventListener("load", () => {
      void initAssistant(state.frames.assistant);
    });

    installWorkspaceBridge(state.frames.workspace);
    ensureWorkspaceChildren(state.frames.workspace, 12);
    void initAssistant(state.frames.assistant);
  });
})();
