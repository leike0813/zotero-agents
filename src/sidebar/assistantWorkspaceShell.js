import {
  ASSISTANT_WORKSPACE_ACP_CHILD_BRIDGE_KEY,
  ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS,
  ASSISTANT_WORKSPACE_MESSAGE_TYPES,
  ASSISTANT_WORKSPACE_SHELL_ACTIONS,
  ASSISTANT_WORKSPACE_SHELL_BRIDGE_KEY,
} from "../shared/assistantWireContract.js";

const tabs = ["acp-chat", "acp-skills", "skillrunner"];
const state = {
  activeTab: "acp-chat",
  initializedFrames: new Set(),
  childDocumentGenerations: new Map(),
  loadedFrames: new Set(),
  pendingChildPublications: new Map(),
  deliveredChildPublications: new Map(),
  scopeKey: "",
  actionTrace: [],
  hostReadyAcked: false,
  hostReadyInFlight: false,
  hostReadyTimer: null,
  hostReadyAttempts: 0,
  surfaceConfiguration: {
    executionDisplayMode: "live",
    transcriptPaginationVirtualizationEnabled: true,
    actionRegistry: {},
  },
  surfaceLabels: {
    "acp-chat": {},
    "acp-skills": {},
    skillrunner: {},
  },
};

const hostReadyRetryDelayMs = 250;

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

function bridgeKeyForTab() {
  return ASSISTANT_WORKSPACE_ACP_CHILD_BRIDGE_KEY;
}

function hostBridge() {
  return [
    window[ASSISTANT_WORKSPACE_SHELL_BRIDGE_KEY],
    window.wrappedJSObject &&
      window.wrappedJSObject[ASSISTANT_WORKSPACE_SHELL_BRIDGE_KEY],
  ].find((entry) => entry && typeof entry.postMessage === "function");
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
    source.sidebar && typeof source.sidebar === "object" ? source.sidebar : {};
  const panes =
    sidebar.panes && typeof sidebar.panes === "object" ? sidebar.panes : {};
  return {
    backendAvailability: String(source.backendAvailability || ""),
    conversationAvailability: String(source.conversationAvailability || ""),
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
  traceAction("post-to-host-bridge-missing", {
    type,
    action: payload && payload.action,
    tab: payload && payload.tab,
    actionId: payload && payload.actionId,
  });
  document.body.setAttribute(
    "data-assistant-workspace-failure",
    "bridge-missing",
  );
  return Promise.resolve({
    ok: false,
    error: "bridge-missing",
  });
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
  postToHost(ASSISTANT_WORKSPACE_MESSAGE_TYPES.ACTION, {
    action: ASSISTANT_WORKSPACE_SHELL_ACTIONS.READY,
  })
    .then(function (result) {
      const acked = !!result && result.ok !== false && result.fallback !== true;
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

function validAcpChildEnvelope(tab, value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const owner = value.owner;
  const validOwner =
    owner === null ||
    (owner &&
      typeof owner === "object" &&
      !Array.isArray(owner) &&
      owner.source === tab &&
      (tab === "acp-chat"
        ? Object.keys(owner).sort().join(",") ===
            "backendId,conversationId,ownerKey,source" &&
          String(owner.ownerKey || "") ===
            String(owner.backendId || "").trim() +
              "\n" +
              String(owner.conversationId || "").trim()
        : tab === "acp-skills"
          ? Object.keys(owner).sort().join(",") ===
              "ownerKey,requestId,source" &&
            String(owner.ownerKey || "") ===
              String(owner.requestId || "").trim()
          : Object.keys(owner).sort().join(",") ===
              "ownerKey,requestId,runKey,source" &&
            String(owner.runKey || "").trim() &&
            String(owner.ownerKey || "") ===
              (String(owner.requestId || "").trim() ||
                String(owner.runKey || "").trim())));
  return (
    Object.keys(value).sort().join(",") ===
      "action,actionId,owner,payload,source" &&
    value.source === tab &&
    typeof value.action === "string" &&
    value.action.trim() &&
    typeof value.actionId === "string" &&
    value.actionId.trim() &&
    value.payload &&
    typeof value.payload === "object" &&
    !Array.isArray(value.payload) &&
    validOwner
  );
}

function handleAcpChildEnvelope(tab, envelope) {
  if (!validAcpChildEnvelope(tab, envelope)) {
    traceAction("drop-invalid-child-action", { tab });
    return;
  }
  const action = String(envelope.action);
  const payload = envelope.payload || {};
  if (action === ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS.READY) {
    acceptChildReady(tab, payload);
  } else if (
    action === ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS.PUBLICATION_ACK
  ) {
    if (!acceptChildPublicationAck(tab, payload)) return;
    envelope = Object.assign({}, envelope, {
      payload: canonicalPublicationAck(payload),
    });
  }
  traceAction("child-action-received", {
    tab,
    action,
    actionId: envelope.actionId,
  });
  postToHost(ASSISTANT_WORKSPACE_MESSAGE_TYPES.CHILD_ACTION, envelope)
    .then(function (result) {
      traceAction(
        result && result.ok === false
          ? "host-action-failed"
          : "host-action-acked",
        {
          tab,
          action,
          actionId: envelope.actionId,
          error: result && result.error ? String(result.error) : "",
        },
      );
    })
    .catch(function (error) {
      traceAction("host-action-failed", {
        tab,
        action,
        actionId: envelope.actionId,
        error: safeError(error),
      });
    });
}

function installChildBridge(tab) {
  const frame = frameForTab(tab);
  const frameWindow = frame && frame.contentWindow;
  if (!frameWindow) return;
  const bridge = {
    sendAction: function (envelope) {
      handleAcpChildEnvelope(tab, envelope);
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
    { type: ASSISTANT_WORKSPACE_MESSAGE_TYPES.CHILD_READY_REQUEST },
    "*",
  );
  return true;
}

function requestAllChildrenReady(reason) {
  tabs.forEach(function (tab) {
    requestChildReady(tab, reason);
  });
}

function publicationAck(publication, stage, outcome, reason) {
  return postToHost(ASSISTANT_WORKSPACE_MESSAGE_TYPES.PUBLICATION_ACK, {
    publicationId: String((publication && publication.publicationId) || ""),
    stage,
    outcome,
    reason: reason || null,
    failure: null,
  });
}

function childDocumentGeneration(tab, payload) {
  const explicit = String((payload && payload.documentGeneration) || "").trim();
  return explicit || tab + ":document";
}

function clearDeliveredChildState(tab) {
  Array.from(state.deliveredChildPublications.keys()).forEach(function (key) {
    if (String(key).startsWith(tab + "\n")) {
      state.deliveredChildPublications.delete(key);
    }
  });
}

function publicationDeliveryKey(tab, publicationId) {
  return tab + "\n" + publicationId;
}

function cacheChildPublication(tab, publication) {
  const publicationId = String(
    (publication && publication.publicationId) || "",
  ).trim();
  if (!publicationId) return false;
  let pending = state.pendingChildPublications.get(tab);
  if (!pending) {
    pending = new Map();
    state.pendingChildPublications.set(tab, pending);
  }
  if (!pending.has(publicationId)) {
    pending.set(publicationId, publication);
    traceAction("cache-child-publication", {
      tab,
      publicationId,
      deliverySequence: Number(publication.deliverySequence || 0),
    });
  }
  return true;
}

function forwardPendingChildPublications(tab) {
  if (!state.initializedFrames.has(tab)) return false;
  const frame = frameForTab(tab);
  const frameWindow = frame && frame.contentWindow;
  if (!frameWindow) return false;
  const generation = state.childDocumentGenerations.get(tab);
  if (!generation) return false;
  const pending = state.pendingChildPublications.get(tab);
  if (!pending || pending.size === 0) return true;
  installChildBridge(tab);
  Array.from(pending.values())
    .sort(function (left, right) {
      return (
        Number(left.deliverySequence || 0) - Number(right.deliverySequence || 0)
      );
    })
    .forEach(function (publication) {
      const publicationId = String(publication.publicationId || "");
      const deliveryKey = publicationDeliveryKey(tab, publicationId);
      if (state.deliveredChildPublications.get(deliveryKey) === generation) {
        return;
      }
      frameWindow.postMessage(
        {
          type: ASSISTANT_WORKSPACE_MESSAGE_TYPES.ACP_PUBLICATION,
          payload: publication,
        },
        "*",
      );
      state.deliveredChildPublications.set(deliveryKey, generation);
      void publicationAck(publication, "shell-forward", "accepted", null);
    });
  state.loadedFrames.add(tab);
  updateLoadingState();
  return true;
}

function acceptChildPublicationAck(tab, payload) {
  const publicationId = String((payload && payload.publicationId) || "").trim();
  const documentGeneration = String(
    (payload && payload.documentGeneration) || "",
  ).trim();
  const currentGeneration = state.childDocumentGenerations.get(tab);
  if (
    !publicationId ||
    !documentGeneration ||
    documentGeneration !== currentGeneration
  ) {
    traceAction("drop-child-publication-ack", {
      tab,
      publicationId,
      documentGeneration,
      currentGeneration: currentGeneration || "",
    });
    return false;
  }
  const terminal =
    payload &&
    (payload.outcome === "rejected" || payload.stage === "render-complete");
  if (terminal) {
    const pending = state.pendingChildPublications.get(tab);
    if (pending) pending.delete(publicationId);
    state.deliveredChildPublications.delete(
      publicationDeliveryKey(tab, publicationId),
    );
    traceAction("complete-child-publication", {
      tab,
      publicationId,
      documentGeneration,
      stage: payload.stage,
      outcome: payload.outcome,
    });
  }
  return true;
}

function canonicalPublicationAck(payload) {
  return {
    publicationId: String((payload && payload.publicationId) || ""),
    stage: payload && payload.stage,
    outcome: payload && payload.outcome,
    reason: (payload && payload.reason) || null,
    failure: (payload && payload.failure) || null,
  };
}

function postPublicationToChild(tab, publication) {
  const retained = cacheChildPublication(tab, publication);
  void publicationAck(
    publication,
    "shell-receive",
    retained ? "accepted" : "rejected",
    retained ? null : "invalid",
  );
  return retained && forwardPendingChildPublications(tab);
}

function normalizeSurfaceConfiguration(value) {
  const source = value && typeof value === "object" ? value : {};
  const mode = String(source.executionDisplayMode || "");
  return {
    executionDisplayMode:
      mode === "boundary" || mode === "silent" ? mode : "live",
    transcriptPaginationVirtualizationEnabled:
      source.transcriptPaginationVirtualizationEnabled !== false,
    actionRegistry:
      source.actionRegistry &&
      typeof source.actionRegistry === "object" &&
      !Array.isArray(source.actionRegistry)
        ? source.actionRegistry
        : {},
  };
}

function postSurfaceConfigurationToChild(tab) {
  const frame = frameForTab(tab);
  const frameWindow = frame && frame.contentWindow;
  if (!frameWindow) return false;
  frameWindow.postMessage(
    {
      type: ASSISTANT_WORKSPACE_MESSAGE_TYPES.SURFACE_BOOTSTRAP,
      payload: {
        configuration: state.surfaceConfiguration,
        labels: state.surfaceLabels[tab] || {},
      },
    },
    "*",
  );
  return true;
}

function postSurfaceConfigurationToAcpChildren() {
  tabs.forEach(function (tab) {
    postSurfaceConfigurationToChild(tab);
  });
}

function closeDrawersForTab(tab) {
  const frame = frameForTab(tab);
  const frameWindow = frame && frame.contentWindow;
  if (!frameWindow) return;
  frameWindow.postMessage(
    { type: ASSISTANT_WORKSPACE_MESSAGE_TYPES.CLOSE_DRAWERS },
    "*",
  );
}

function closeInactiveChildDrawers(activeTab) {
  tabs.forEach(function (entry) {
    if (entry !== activeTab) closeDrawersForTab(entry);
  });
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
  state.pendingChildPublications.forEach(function (pending) {
    pending.forEach(function (publication) {
      void publicationAck(
        publication,
        "shell-forward",
        "rejected",
        "superseded",
      );
    });
  });
  state.pendingChildPublications.clear();
  state.deliveredChildPublications.clear();
  traceAction("child-payload-state-clear", { reason });
}

function acceptChildReady(tab, payload) {
  const normalizedTab = normalizeTab(tab, state.activeTab);
  const firstReady = !state.initializedFrames.has(normalizedTab);
  const generation = childDocumentGeneration(normalizedTab, payload);
  const previousGeneration = state.childDocumentGenerations.get(normalizedTab);
  const generationChanged = previousGeneration !== generation;
  if (firstReady || generationChanged) {
    clearDeliveredChildState(normalizedTab);
  }
  state.childDocumentGenerations.set(normalizedTab, generation);
  installChildBridge(normalizedTab);
  state.loadedFrames.add(normalizedTab);
  state.initializedFrames.add(normalizedTab);
  postSurfaceConfigurationToChild(normalizedTab);
  traceAction("child-ready", {
    tab: normalizedTab,
    firstReady,
    generation,
    generationChanged,
    payload: payloadSummary(payload),
  });
  forwardPendingChildPublications(normalizedTab);
  updateLoadingState();
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
    postToHost(ASSISTANT_WORKSPACE_MESSAGE_TYPES.ACTION, {
      action: ASSISTANT_WORKSPACE_SHELL_ACTIONS.SET_TAB,
      tab: nextTab,
    });
  }
  updateLoadingState();
}

function handleFrameLoad(tab) {
  const normalizedTab = normalizeTab(tab, state.activeTab);
  state.initializedFrames.delete(normalizedTab);
  state.childDocumentGenerations.delete(normalizedTab);
  clearDeliveredChildState(normalizedTab);
  installChildBridge(normalizedTab);
  state.loadedFrames.add(normalizedTab);
  traceAction("frame-load", { tab: normalizedTab });
  requestChildReady(normalizedTab, "frame-load:" + normalizedTab);
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
  if (data.type === ASSISTANT_WORKSPACE_MESSAGE_TYPES.INIT) {
    ensureHostReady("host-init");
    traceAction("workspace-init-received", {
      activeTab: data.payload && data.payload.activeTab,
      summary: payloadSummary(data.payload || {}),
    });
    syncScopeKeyFromPayload(data.payload || {});
    state.surfaceConfiguration = normalizeSurfaceConfiguration(
      data.payload && data.payload.surfaceConfiguration,
    );
    const labels =
      data.payload &&
      data.payload.surfaceLabels &&
      typeof data.payload.surfaceLabels === "object"
        ? data.payload.surfaceLabels
        : {};
    state.surfaceLabels = {
      "acp-chat":
        labels["acp-chat"] && typeof labels["acp-chat"] === "object"
          ? labels["acp-chat"]
          : {},
      "acp-skills":
        labels["acp-skills"] && typeof labels["acp-skills"] === "object"
          ? labels["acp-skills"]
          : {},
      skillrunner:
        labels.skillrunner && typeof labels.skillrunner === "object"
          ? labels.skillrunner
          : {},
    };
    postSurfaceConfigurationToAcpChildren();
    setActiveTab(data.payload && data.payload.activeTab, {
      notify: false,
      fallback: state.activeTab,
    });
    requestAllChildrenReady("host-init");
    return;
  }
  if (data.type === ASSISTANT_WORKSPACE_MESSAGE_TYPES.SURFACE_CONFIG) {
    state.surfaceConfiguration = normalizeSurfaceConfiguration(
      data.payload && data.payload.configuration,
    );
    postSurfaceConfigurationToAcpChildren();
    return;
  }
  // Harness-only message: sent by addon/content/harness/harness-host.js to
  // steer the active tab; production host code uses surface init/config.
  if (data.type === ASSISTANT_WORKSPACE_MESSAGE_TYPES.SET_TAB) {
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
  if (data.type === ASSISTANT_WORKSPACE_MESSAGE_TYPES.CHILD_PUBLICATION) {
    ensureHostReady("host-child-publication");
    const payload = data.payload || {};
    const publication = payload.publication || {};
    const source = String(
      publication.owner && publication.owner.source
        ? publication.owner.source
        : "",
    );
    if (
      source !== "acp-chat" &&
      source !== "acp-skills" &&
      source !== "skillrunner"
    ) {
      traceAction("drop-child-publication", {
        reason: "invalid-source",
        publicationId: publication.publicationId,
      });
      return;
    }
    const tab = source;
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
    void postToHost(ASSISTANT_WORKSPACE_MESSAGE_TYPES.ACTION, {
      action: ASSISTANT_WORKSPACE_SHELL_ACTIONS.CLOSE_SIDEBAR,
    });
  });
  setActiveTab("acp-chat", { notify: false, fallback: "acp-chat" });
  updateLoadingState();
  ensureHostReady("dom-content-loaded");
});

attachFrameLoadListeners();
requestAllChildrenReady("script-start");
ensureHostReady("script-start");
