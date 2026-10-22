import { h, render } from "preact";
import { ConversationCreationMenu } from "./components/ConversationCreationMenu";
import {
  ASSISTANT_WORKSPACE_ACP_CHILD_BRIDGE_KEY,
  ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS,
  ASSISTANT_WORKSPACE_MESSAGE_TYPES,
  ASSISTANT_WORKSPACE_SHELL_ACTIONS,
  ASSISTANT_WORKSPACE_SHELL_BRIDGE_KEY,
} from "../shared/assistantWireContract.js";
import {
  ASSISTANT_WORKSPACE_LANE_REGISTRY,
  ASSISTANT_WORKSPACE_LANE_ORDER,
  ASSISTANT_WORKSPACE_SOURCE_REGISTRY,
  DEFAULT_ASSISTANT_WORKSPACE_LANE_ID,
  DEFAULT_ASSISTANT_WORKSPACE_SOURCE_ID,
  listNavigableAssistantWorkspaceLaneSources,
} from "../shared/assistantWorkspaceSourceRegistry.js";

const tabs = Object.keys(ASSISTANT_WORKSPACE_SOURCE_REGISTRY);

function emptySurfaceLabels() {
  const labels = {};
  tabs.forEach(function (sourceId) {
    labels[sourceId] = {};
  });
  return labels;
}

const state = {
  activeTab: DEFAULT_ASSISTANT_WORKSPACE_SOURCE_ID,
  activeLane: DEFAULT_ASSISTANT_WORKSPACE_LANE_ID,
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
  surfaceLabels: emptySurfaceLabels(),
  navigationLabels: { lanes: {}, sources: {} },
  navigationSummaries: new Map(),
  creationNavigation: new Map(),
  // Window-local memory of the source chosen per lane. Lives in this page's
  // module state only: another Workspace window is a separate document with
  // its own shell instance and never sees this map.
  selectedSourceByLane: {},
};

const hostReadyRetryDelayMs = 250;
let creationMenu = null;
let creationSequence = 0;

function closeCreationMenu(restoreFocus = true) {
  if (!creationMenu) return;
  const { mount, opener, cleanup } = creationMenu;
  creationMenu = null;
  cleanup();
  opener?.setAttribute("aria-expanded", "false");
  render(null, mount);
  mount.remove();
  if (restoreFocus && opener?.isConnected) opener.focus();
}

function openCreationMenu(tab) {
  if (
    tab !== state.activeTab ||
    ASSISTANT_WORKSPACE_SOURCE_REGISTRY[tab].lane !== "conversations"
  )
    return;
  closeCreationMenu(false);
  const frame = frameForTab(tab);
  const opener = frame?.contentDocument?.querySelector(
    ".assistant-panel-action-new-conversation",
  );
  if (!opener) return;
  opener.setAttribute("aria-expanded", "true");
  const anchor = opener.getBoundingClientRect();
  const frameRect = frame.getBoundingClientRect();
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const outside = (event) => {
    if (!mount.contains(event.target) && event.target !== opener)
      closeCreationMenu();
  };
  const documents = [
    document,
    ...tabs
      .map((source) => frameForTab(source)?.contentDocument)
      .filter(Boolean),
  ];
  documents.forEach((doc) => doc.addEventListener("pointerdown", outside));
  window.addEventListener("resize", closeCreationMenu);
  creationMenu = {
    mount,
    opener,
    cleanup: () => {
      documents.forEach((doc) =>
        doc.removeEventListener("pointerdown", outside),
      );
      window.removeEventListener("resize", closeCreationMenu);
    },
  };
  const external = state.creationNavigation.get("acp-chat");
  const options = [
    {
      source: "pi-conversations",
      groupId: "pi-conversations",
      label: sourceLabel("pi-conversations"),
      disabledReason: null,
    },
  ];
  for (const group of external?.groups || []) {
    options.push({
      source: "acp-chat",
      groupId: group.groupId,
      label: group.label,
      disabledReason:
        group.disabledReason ||
        (external.canCreateOwner === false || group.status === "unavailable"
          ? state.surfaceLabels["acp-chat"].unavailable || "Unavailable"
          : null),
    });
  }
  let submitted = false;
  render(
    h(ConversationCreationMenu, {
      options,
      externalLabel: sourceLabel("acp-chat"),
      top: Math.min(
        frameRect.top + anchor.bottom + 4,
        Math.max(8, window.innerHeight - 160),
      ),
      left: Math.max(
        8,
        Math.min(frameRect.left + anchor.left, window.innerWidth - 248),
      ),
      onClose: () => closeCreationMenu(),
      onChoose: async (option) => {
        if (submitted || option.disabledReason) return;
        submitted = true;
        closeCreationMenu(false);
        setActiveTab(option.source, { notify: false });
        try {
          const activation = await postToHost(
            ASSISTANT_WORKSPACE_MESSAGE_TYPES.ACTION,
            {
              action: ASSISTANT_WORKSPACE_SHELL_ACTIONS.SET_TAB,
              tab: option.source,
            },
          );
          if (activation?.ok === false) return;
          await postToHost(ASSISTANT_WORKSPACE_MESSAGE_TYPES.CHILD_ACTION, {
            source: option.source,
            owner: null,
            action: "new-conversation",
            payload: { groupId: option.groupId },
            actionId: "workspace-create-" + ++creationSequence,
          });
        } catch (error) {
          traceAction("host-action-failed", {
            tab: option.source,
            action: "new-conversation",
            error: safeError(error),
          });
        }
      },
    }),
    mount,
  );
}

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
          : tab === "pi-conversations"
            ? Object.keys(owner).sort().join(",") ===
                "conversationId,ownerKey,source" &&
              String(owner.ownerKey || "") ===
                String(owner.conversationId || "").trim()
            : tab === "pi-skill-runs"
              ? Object.keys(owner).sort().join(",") ===
                  "ownerKey,requestId,source" &&
                String(owner.ownerKey || "") ===
                  String(owner.requestId || "").trim()
              : tab === "skillrunner" &&
                Object.keys(owner).sort().join(",") ===
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
  if (
    action === ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS.OPEN_CONVERSATION_MENU
  ) {
    if (envelope.owner === null && Object.keys(payload).length === 0)
      openCreationMenu(tab);
    return;
  }
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
  closeCreationMenu(false);
  state.creationNavigation.clear();
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
  state.navigationSummaries.clear();
  updateNavigationSummaries();
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
  return DEFAULT_ASSISTANT_WORKSPACE_SOURCE_ID;
}

function laneLabel(laneId) {
  const resolved = state.navigationLabels.lanes[laneId];
  if (resolved) return resolved;
  const lane = ASSISTANT_WORKSPACE_LANE_REGISTRY[laneId];
  return lane ? lane.label : laneId;
}

function sourceLabel(sourceId) {
  const resolved = state.navigationLabels.sources[sourceId];
  if (resolved) return resolved;
  const descriptor = ASSISTANT_WORKSPACE_SOURCE_REGISTRY[sourceId];
  return descriptor ? descriptor.label : sourceId;
}

function updateNavigationButton(button, label, count, attention) {
  if (!button) return;
  const badge = button.querySelector(".assistant-nav-count");
  if (badge && badge.textContent !== String(count))
    badge.textContent = String(count);
  button.setAttribute("data-attention", String(attention));
  button.setAttribute(
    "aria-label",
    label +
      " (" +
      count +
      ")" +
      (attention
        ? ": " + (state.navigationLabels.attention || "Needs attention")
        : ""),
  );
}

function updateNavigationSummaries() {
  ASSISTANT_WORKSPACE_LANE_ORDER.forEach(function (laneId) {
    let count = 0;
    let attention = false;
    listNavigableAssistantWorkspaceLaneSources(laneId).forEach(
      function (sourceId) {
        const summary = state.navigationSummaries.get(sourceId);
        const sourceCount = summary ? summary.count : 0;
        const sourceAttention = !!(summary && summary.attention);
        count += sourceCount;
        attention = attention || sourceAttention;
        updateNavigationButton(
          $("assistant-tab-" + sourceId),
          sourceLabel(sourceId),
          sourceCount,
          sourceAttention,
        );
      },
    );
    updateNavigationButton(
      $("assistant-lane-" + laneId),
      laneLabel(laneId),
      count,
      attention && laneId !== state.activeLane,
    );
  });
}

function appendNavigationCount(button) {
  const count = document.createElement("span");
  count.className = "assistant-nav-count";
  count.setAttribute("aria-hidden", "true");
  button.appendChild(count);
}

// Lane buttons plus the active lane's sources, from the shared registry.
function renderNavigation() {
  const lanesEl = $("assistant-workspace-lanes");
  const sourcesEl = $("assistant-workspace-sources");
  if (!lanesEl || !sourcesEl) return;
  lanesEl.setAttribute("role", "tablist");
  sourcesEl.setAttribute("role", "tablist");
  lanesEl.textContent = "";
  ASSISTANT_WORKSPACE_LANE_ORDER.forEach(function (laneId) {
    const button = document.createElement("button");
    button.id = "assistant-lane-" + laneId;
    button.className =
      "assistant-tab" + (laneId === state.activeLane ? " is-active" : "");
    button.type = "button";
    button.setAttribute("data-lane", laneId);
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(laneId === state.activeLane));
    button.tabIndex = laneId === state.activeLane ? 0 : -1;
    button.textContent = laneLabel(laneId);
    appendNavigationCount(button);
    lanesEl.appendChild(button);
  });
  sourcesEl.textContent = "";
  listNavigableAssistantWorkspaceLaneSources(state.activeLane).forEach(
    function (sourceId) {
      const button = document.createElement("button");
      button.id = "assistant-tab-" + sourceId;
      button.className =
        "assistant-tab" + (sourceId === state.activeTab ? " is-active" : "");
      button.type = "button";
      button.setAttribute("data-tab", sourceId);
      button.setAttribute("role", "tab");
      button.setAttribute("aria-controls", "assistant-frame-" + sourceId);
      button.setAttribute(
        "aria-selected",
        String(sourceId === state.activeTab),
      );
      button.tabIndex = sourceId === state.activeTab ? 0 : -1;
      button.textContent = sourceLabel(sourceId);
      appendNavigationCount(button);
      sourcesEl.appendChild(button);
    },
  );
  updateNavigationSummaries();
}

function setActiveLane(laneId, options) {
  if (ASSISTANT_WORKSPACE_LANE_ORDER.indexOf(laneId) < 0) return;
  state.activeLane = laneId;
  const laneSources = listNavigableAssistantWorkspaceLaneSources(laneId);
  if (laneSources.indexOf(state.activeTab) < 0) {
    const remembered = state.selectedSourceByLane[laneId];
    const preferred =
      remembered && laneSources.indexOf(remembered) >= 0
        ? remembered
        : ASSISTANT_WORKSPACE_LANE_REGISTRY[laneId].defaultSourceId;
    const target =
      laneSources.indexOf(preferred) >= 0 ? preferred : laneSources[0];
    // Render this lane's buttons before activating its source; setActiveTab
    // only toggles the active class and skips its own lane render when the
    // lane is already current.
    renderNavigation();
    if (target) {
      setActiveTab(target, options);
      return;
    }
  }
  renderNavigation();
}

function setActiveTab(tab, options) {
  const fallback =
    options && options.fallback ? options.fallback : state.activeTab;
  const nextTab = normalizeTab(tab, fallback);
  const previousTab = state.activeTab;
  state.activeTab = nextTab;
  const nextLane = ASSISTANT_WORKSPACE_SOURCE_REGISTRY[nextTab].lane;
  // Remember the choice for its own lane so leaving and returning restores it.
  state.selectedSourceByLane[nextLane] = nextTab;
  if (nextLane !== state.activeLane) {
    state.activeLane = nextLane;
    renderNavigation();
  }
  if (nextTab !== previousTab) {
    closeCreationMenu(false);
    closeInactiveChildDrawers(nextTab);
  }
  tabs.forEach(function (entry) {
    const frame = frameForTab(entry);
    const button = $("assistant-tab-" + entry);
    if (frame) frame.classList.toggle("hidden", entry !== nextTab);
    if (button) {
      button.classList.toggle("is-active", entry === nextTab);
      button.setAttribute("aria-selected", String(entry === nextTab));
      button.tabIndex = entry === nextTab ? 0 : -1;
    }
  });
  if (!options || options.notify !== false) {
    traceAction("set-active-tab-notify", { tab: nextTab });
    postToHost(ASSISTANT_WORKSPACE_MESSAGE_TYPES.ACTION, {
      action: ASSISTANT_WORKSPACE_SHELL_ACTIONS.SET_TAB,
      tab: nextTab,
    });
  }
  updateLoadingState();
  updateNavigationSummaries();
}

function handleFrameLoad(tab) {
  closeCreationMenu(false);
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
    state.surfaceLabels = emptySurfaceLabels();
    tabs.forEach(function (sourceId) {
      const entry = labels[sourceId];
      state.surfaceLabels[sourceId] =
        entry && typeof entry === "object" ? entry : {};
    });
    const navigationLabels =
      data.payload &&
      data.payload.navigationLabels &&
      typeof data.payload.navigationLabels === "object"
        ? data.payload.navigationLabels
        : {};
    state.navigationLabels = {
      attention: String(navigationLabels.attention || "Needs attention"),
      lanes:
        navigationLabels.lanes && typeof navigationLabels.lanes === "object"
          ? navigationLabels.lanes
          : {},
      sources:
        navigationLabels.sources && typeof navigationLabels.sources === "object"
          ? navigationLabels.sources
          : {},
    };
    renderNavigation();
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
    if (tabs.indexOf(source) < 0) {
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
    if (publication.publicationKind === "owner-navigation") {
      const previous = state.navigationSummaries.get(source);
      const sequence = Number(publication.deliverySequence || 0);
      if (!previous || sequence > previous.sequence) {
        if (ASSISTANT_WORKSPACE_SOURCE_REGISTRY[source].canCreateOwner) {
          state.creationNavigation.set(source, publication.payload);
        }
        const entries = Array.isArray(
          publication.payload && publication.payload.entries,
        )
          ? publication.payload.entries
          : [];
        state.navigationSummaries.set(source, {
          sequence,
          count: entries.length,
          attention: entries.some(function (entry) {
            return !!entry.attention;
          }),
        });
        updateNavigationSummaries();
      }
    }
    return;
  }
});

document.addEventListener("DOMContentLoaded", function () {
  ["assistant-workspace-lanes", "assistant-workspace-sources"].forEach(
    function (id) {
      $(id)?.addEventListener("keydown", function (event) {
        const buttons = Array.from($(id).querySelectorAll('[role="tab"]'));
        const index = buttons.indexOf(event.target);
        if (index < 0) return;
        let next;
        if (event.key === "ArrowRight") next = (index + 1) % buttons.length;
        else if (event.key === "ArrowLeft")
          next = (index + buttons.length - 1) % buttons.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = buttons.length - 1;
        else return;
        event.preventDefault();
        const targetId = buttons[next].id;
        buttons[next].click();
        $(targetId)?.focus();
      });
    },
  );
  const lanesEl = $("assistant-workspace-lanes");
  if (lanesEl) {
    lanesEl.addEventListener("click", function (event) {
      const laneId =
        event.target && event.target.closest
          ? event.target.closest("[data-lane]")?.getAttribute("data-lane")
          : "";
      if (laneId) setActiveLane(laneId);
    });
  }
  const sourcesEl = $("assistant-workspace-sources");
  if (sourcesEl) {
    sourcesEl.addEventListener("click", function (event) {
      const tab =
        event.target && event.target.closest
          ? event.target.closest("[data-tab]")?.getAttribute("data-tab")
          : "";
      if (tab) setActiveTab(tab);
    });
  }
  $("assistant-workspace-close")?.addEventListener("click", function () {
    void postToHost(ASSISTANT_WORKSPACE_MESSAGE_TYPES.ACTION, {
      action: ASSISTANT_WORKSPACE_SHELL_ACTIONS.CLOSE_SIDEBAR,
    });
  });
  renderNavigation();
  setActiveTab(DEFAULT_ASSISTANT_WORKSPACE_SOURCE_ID, {
    notify: false,
    fallback: DEFAULT_ASSISTANT_WORKSPACE_SOURCE_ID,
  });
  updateLoadingState();
  ensureHostReady("dom-content-loaded");
});

attachFrameLoadListeners();
requestAllChildrenReady("script-start");
ensureHostReady("script-start");
