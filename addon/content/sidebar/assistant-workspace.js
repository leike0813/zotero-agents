/* global window, document */
(function () {
  "use strict";

  const tabs = ["acp-chat", "acp-skills", "skillrunner"];
  const state = {
    activeTab: "acp-chat",
    initializedFrames: new Set(),
    childDocumentGenerations: new Map(),
    loadedFrames: new Set(),
    latestChildPayloads: new Map(),
    latestChildRevisions: new Map(),
    childPayloadGeneration: 0,
    deliveredChildPayloads: new Map(),
    pendingReplayTabs: new Set(),
    pendingChildPublications: new Map(),
    deliveredChildPublications: new Map(),
    scopeKey: "",
    actionSeq: 0,
    actionTrace: [],
    hostReadyAcked: false,
    hostReadyInFlight: false,
    hostReadyTimer: null,
    hostReadyAttempts: 0,
    childReplayTimer: null,
    childReplayAttempts: 0,
    surfaceConfiguration: {
      executionDisplayMode: "live",
      transcriptPaginationVirtualizationEnabled: true,
    },
    surfaceLabels: {
      "acp-chat": {},
      "acp-skills": {},
    },
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
    return "__zsAssistantWorkspaceAcpBridge";
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

  function sendLegacyChildAction(tab, action, payload) {
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

  function handleSkillRunnerChildAction(tab, action, payload) {
    const normalizedAction = String(action || "");
    const normalizedPayload = payload || {};
    if (normalizedAction === "ready") {
      acceptChildReady(tab, normalizedPayload);
      sendLegacyChildAction(tab, normalizedAction, normalizedPayload);
      return;
    }
    sendLegacyChildAction(tab, normalizedAction, normalizedPayload);
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
          : Object.keys(owner).sort().join(",") ===
              "ownerKey,requestId,source" &&
            String(owner.ownerKey || "") ===
              String(owner.requestId || "").trim()));
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
    if (action === "ready") {
      acceptChildReady(tab, payload);
    } else if (action === "publication-ack") {
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
    postToHost("assistant-workspace:child-action", envelope)
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
    const bridge =
      tab === "skillrunner"
        ? {
            sendAction: function (action, payload) {
              handleSkillRunnerChildAction(tab, action, payload || {});
            },
          }
        : {
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
      failure: null,
    });
  }

  function childDocumentGeneration(tab, payload) {
    const explicit = String(
      (payload && payload.documentGeneration) || "",
    ).trim();
    return explicit || tab + ":document";
  }

  function clearDeliveredChildState(tab) {
    Array.from(state.deliveredChildPayloads.keys()).forEach(function (key) {
      if (String(key).startsWith(tab + ":")) {
        state.deliveredChildPayloads.delete(key);
      }
    });
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
          Number(left.deliverySequence || 0) -
          Number(right.deliverySequence || 0)
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
            type: "assistant-workspace:acp-publication",
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
    const publicationId = String(
      (payload && payload.publicationId) || "",
    ).trim();
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
    };
  }

  function postSurfaceConfigurationToChild(tab) {
    if (tab === "skillrunner") return true;
    const frame = frameForTab(tab);
    const frameWindow = frame && frame.contentWindow;
    if (!frameWindow) return false;
    frameWindow.postMessage(
      {
        type: "assistant-workspace:surface-bootstrap",
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
    postSurfaceConfigurationToChild("acp-chat");
    postSurfaceConfigurationToChild("acp-skills");
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
    const generation = childDocumentGeneration(normalizedTab, payload);
    const previousGeneration =
      state.childDocumentGenerations.get(normalizedTab);
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
    if (!replayCachedChildPayload(normalizedTab)) {
      queueChildReplay(normalizedTab, "child-ready:" + normalizedTab);
    }
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
    state.initializedFrames.delete(normalizedTab);
    state.childDocumentGenerations.delete(normalizedTab);
    clearDeliveredChildState(normalizedTab);
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
    if (data.type === "skillrunner-sidebar:action") {
      handleSkillRunnerChildAction("skillrunner", data.action, data.payload);
      return;
    }
    if (data.type === "assistant-workspace:init") {
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
      };
      postSurfaceConfigurationToAcpChildren();
      setActiveTab(data.payload && data.payload.activeTab, {
        notify: false,
        fallback: state.activeTab,
      });
      requestAllChildrenReady("host-init");
      return;
    }
    if (data.type === "assistant-workspace:surface-config") {
      state.surfaceConfiguration = normalizeSurfaceConfiguration(
        data.payload && data.payload.configuration,
      );
      postSurfaceConfigurationToAcpChildren();
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
      if (tab !== "skillrunner") {
        traceAction("drop-child-snapshot", {
          tab,
          reason: "acp-publication-required",
        });
        return;
      }
      const phase = payload.phase || "snapshot";
      const snapshot = payload.snapshot || {};
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
      const source = String(
        publication.owner && publication.owner.source
          ? publication.owner.source
          : "",
      );
      if (source !== "acp-chat" && source !== "acp-skills") {
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
