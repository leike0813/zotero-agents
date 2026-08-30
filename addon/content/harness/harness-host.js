(function () {
  "use strict";

  const supportedLocales = [
    "en-US",
    "zh-CN",
    "zh-TW",
    "ja-JP",
    "fr-FR",
    "de",
    "es-ES",
    "pt-BR",
    "ko-KR",
    "it-IT",
    "ru-RU",
  ];

  const state = {
    frames: Object.create(null),
    actionLog: [],
    frameState: Object.create(null),
    locale: resolveInitialLocale(),
    assistantActiveTab: "acp-chat",
    assistantScopeKey: "",
    assistantPublications: Object.create(null),
    assistantBootstrapQueue: Promise.resolve(),
    selectedWorkspaceView:
      new URLSearchParams(window.location.search).get("view") === "synthesis"
        ? "synthesis"
        : "dashboard",
  };

  const frameSources = {
    dashboard: "/content/dashboard/index.html",
    synthesis: "/content/synthesis/index.html",
  };

  function normalizeLocale(input) {
    const value = String(input || "")
      .replace("_", "-")
      .toLowerCase();
    if (!value) return "";
    const exact = supportedLocales.find(
      (locale) => locale.toLowerCase() === value,
    );
    if (exact) return exact;
    const language = value.split("-")[0];
    if (language === "zh") return "zh-CN";
    if (language === "ja") return "ja-JP";
    if (language === "fr") return "fr-FR";
    if (language === "de") return "de";
    if (language === "es") return "es-ES";
    if (language === "pt") return "pt-BR";
    if (language === "ko") return "ko-KR";
    if (language === "it") return "it-IT";
    if (language === "ru") return "ru-RU";
    if (language === "en") return "en-US";
    return "";
  }

  function resolveInitialLocale() {
    const query = new URLSearchParams(window.location.search).get("locale");
    const stored = window.localStorage?.getItem("zsReadonlyHarnessLocale");
    const navigatorLocale = window.navigator?.language;
    return (
      normalizeLocale(query) ||
      normalizeLocale(stored) ||
      normalizeLocale(navigatorLocale) ||
      "en-US"
    );
  }

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
      headers: {
        "content-type": "application/json",
        "x-zs-harness-locale": state.locale,
      },
      body: JSON.stringify({
        ...(body || {}),
        locale: state.locale,
      }),
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
    const tabParam = new URLSearchParams(window.location.search).get("tab");
    if (tabParam) {
      await api("/api/harness/dashboard/action", {
        action: "select-tab",
        payload: { tabKey: tabParam },
      });
    }
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

  function deliverAssistantPublications(frame, publications) {
    (publications || []).forEach((publication) => {
      const tab =
        publication && publication.owner && publication.owner.source
          ? String(publication.owner.source)
          : "unknown";
      state.assistantPublications[tab] =
        (state.assistantPublications[tab] || 0) + 1;
      sendFrame(frame, "assistant-workspace:child-publication", {
        publication,
      });
    });
    markAssistantState();
  }

  function markAssistantState(patch) {
    markFrameState("assistant", {
      initialized: true,
      activeTab: state.assistantActiveTab,
      scopeKey: state.assistantScopeKey,
      publications: { ...state.assistantPublications },
      ...(patch || {}),
    });
  }

  async function bootstrapAssistant(frame) {
    const result = await api("/api/harness/assistant/bootstrap", {});
    state.assistantScopeKey = String(result.scopeKey || "");
    state.assistantPublications = Object.create(null);
    sendFrame(frame, "assistant-workspace:init", {
      activeTab: state.assistantActiveTab,
      scopeKey: result.scopeKey,
      surfaceConfiguration: result.configuration,
      surfaceLabels: result.surfaceLabels,
    });
    deliverAssistantPublications(frame, result.publications);
  }

  function queueAssistantBootstrap(frame) {
    const queued = state.assistantBootstrapQueue.then(() =>
      bootstrapAssistant(frame),
    );
    state.assistantBootstrapQueue = queued.catch(() => undefined);
    return queued;
  }

  async function initAssistant(frame) {
    installAssistantBridge(frame);
    await queueAssistantBootstrap(frame);
  }

  async function handleAssistantMessage(frame, type, payload) {
    if (type === "assistant-workspace:action" && payload.action === "set-tab") {
      state.assistantActiveTab =
        payload.tab === "acp-skills" || payload.tab === "skillrunner"
          ? payload.tab
          : "acp-chat";
      sendFrame(frame, "assistant-workspace:set-tab", {
        activeTab: state.assistantActiveTab,
      });
      markAssistantState();
      const result = await api("/api/harness/assistant/message", {
        type,
        payload,
      });
      if (result.logEntry) appendLog(result.logEntry);
      return { ok: true };
    }
    if (type === "assistant-workspace:action" && payload.action === "ready") {
      await queueAssistantBootstrap(frame);
      return { ok: true };
    }
    const result = await api("/api/harness/assistant/message", {
      type,
      payload,
    });
    if (result.logEntry) appendLog(result.logEntry);
    deliverAssistantPublications(frame, result.publications);
    return { ok: true, readonly: true };
  }

  function refreshSynthesisLocale() {
    const frame = state.frames["workspace-synthesis"];
    if (!frame) return;
    installSynthesisBridge(frame);
    void handleSynthesisAction(frame, "ready", {});
  }

  function syncLocaleToUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set("locale", state.locale);
    window.history.replaceState(null, "", url);
  }

  function initLocaleControl() {
    const select = document.getElementById("harness-locale-select");
    if (!select) return;
    select.value = state.locale;
    syncLocaleToUrl();
    select.addEventListener("change", () => {
      const nextLocale = normalizeLocale(select.value) || "en-US";
      if (nextLocale === state.locale) return;
      state.locale = nextLocale;
      select.value = state.locale;
      window.localStorage?.setItem("zsReadonlyHarnessLocale", state.locale);
      syncLocaleToUrl();
      markFrameState("harness", { locale: state.locale });
      refreshSynthesisLocale();
    });
    markFrameState("harness", { locale: state.locale });
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
    initLocaleControl();
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
