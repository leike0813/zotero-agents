/**
 * Prototype Assistant Workspace shell for GitHub issue #36
 * ("Prototype source switching within Conversations and Skill Runs").
 *
 * Harness-only fork of assistantWorkspaceShell.js: the child-frame wiring
 * (message types, bridge, ready handshake, publication forwarding, loading
 * overlay) is identical to production; the navigation model is replaced by
 * two lanes ("Conversations", "Skill Runs") whose per-lane sources are
 * switched by a sub-tab row (the decided variant-C design). Mock
 * "Zotero Agent" sources are shell-side panel replicas that mirror the real
 * ACP panel DOM structure and classes (rendered by the same production
 * stylesheets) with static preview data; they never send or receive
 * publications.
 *
 * Production builds never include this entry; it is served exclusively by
 * scripts/ui-harness-serve.ts at /content/harness/prototype-workspace.bundle.js.
 */
import {
  ASSISTANT_WORKSPACE_ACP_CHILD_BRIDGE_KEY,
  ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS,
  ASSISTANT_WORKSPACE_MESSAGE_TYPES,
  ASSISTANT_WORKSPACE_SHELL_ACTIONS,
  ASSISTANT_WORKSPACE_SHELL_BRIDGE_KEY,
} from "../shared/assistantWireContract.js";

// Real child-panel sources, driven exactly like the production shell.
const tabs = ["acp-chat", "acp-skills", "skillrunner"];

const lanes = ["conversations", "skill-runs"];
const laneLabels = {
  conversations: "Conversations",
  "skill-runs": "Skill Runs",
};
const laneSources = {
  conversations: ["pi-conversations", "acp-chat"],
  "skill-runs": ["pi-skill-runs", "acp-skills", "skillrunner"],
};
const laneForSource = {
  "pi-conversations": "conversations",
  "acp-chat": "conversations",
  "pi-skill-runs": "skill-runs",
  "acp-skills": "skill-runs",
  skillrunner: "skill-runs",
};
const sourceLabels = {
  "pi-conversations": "Zotero Agent",
  "pi-skill-runs": "Zotero Agent",
  "acp-chat": "External Agent",
  "acp-skills": "External Agent",
  skillrunner: "SkillRunner",
};
const mockSources = ["pi-conversations", "pi-skill-runs"];

// ---------------------------------------------------------------------------
// Mock Zotero Agent workspace data (preview of the built-in Pi runtime).
// Transcript rows use a tiny DSL rendered into the exact transcript-row
// markup of src/sidebar/assistantTranscriptRenderer.js.
// ---------------------------------------------------------------------------

const MOCK_MODEL_GROUPS = [
  { label: "Anthropic", options: ["Claude Sonnet 4.5", "Claude Opus 4.1"] },
  { label: "OpenAI", options: ["GPT-5", "GPT-5 mini"] },
  { label: "Google", options: ["Gemini 2.5 Pro", "Gemini 2.5 Flash"] },
];
const MOCK_REASONING_OPTIONS = ["Default", "Low", "Medium", "High"];

const mockPanels = {
  "pi-conversations": {
    panelKind: "acp-chat",
    ownerNoun: "Sessions",
    groupLabel: "Zotero Agent",
    emptyText: "Select a conversation to inspect its transcript.",
    bannerSubtitle: "Chat with your Zotero library.",
    metaPills: [
      { label: "Runtime", value: "Zotero Agent (Pi)" },
      { label: "Model", value: "Claude Sonnet 4.5" },
      { label: "Workspace", value: "Assistant Workspace" },
    ],
    replyPlaceholder: "Ask Zotero Agent about the current library or item…",
    usagePercent: 38,
    owners: [
      {
        id: "pi-conv-1",
        title: "Summarize Kwon 2024 methodology",
        statusToken: "active",
        statusLabel: "Running",
        statusTone: "success",
        attention: false,
        updatedAt: "2026-08-30T14:02:11Z",
        replyEnabled: true,
        transcript: [
          {
            kind: "message",
            role: "user",
            time: "14:02",
            html: "<p>Summarize the methodology of Kwon 2024 and compare it with RETRO.</p>",
          },
          {
            kind: "thought",
            label: "Thinking",
            text: "Planning retrieval over the library: locate Kwon 2024, extract sections 3–4, then pull the RETRO paper for contrast.",
          },
          {
            kind: "tool",
            name: "library.search",
            summary: "query: “Kwon 2024 methodology” — 3 hits",
            status: "completed",
          },
          {
            kind: "tool",
            name: "doc.read",
            summary: "Kwon 2024.pdf — sections 3–4",
            status: "completed",
          },
          {
            kind: "message",
            role: "assistant",
            time: "14:03",
            html:
              "<p>Kwon 2024 evaluates retrieval-augmented drafting with a two-stage pipeline: a BM25 pre-filter over 1.2M passages, followed by a cross-encoder reranker that keeps the top 24 chunks.</p>" +
              "<p>The key methodological choice is that retrieval is re-run <em>per section</em> of the draft, so evidence stays local to the claim being written.</p>",
          },
          {
            kind: "tool",
            name: "doc.read",
            summary: "RETRO (Borgeaud 2022) — §2 method",
            status: "running",
          },
          {
            kind: "message",
            role: "assistant",
            time: "14:04",
            streaming: true,
            text: "Comparing the two approaches, the main difference is that RETRO retrieves at the chunk level during generation, while Kwon 2024 retrieves per section before drafting…",
          },
        ],
      },
      {
        id: "pi-conv-2",
        title: "Compare attention variants",
        statusToken: "idle",
        statusLabel: "Idle",
        statusTone: "muted",
        attention: true,
        attentionLabel: "New activity",
        updatedAt: "2026-08-30T11:26:40Z",
        replyEnabled: true,
        transcript: [
          {
            kind: "message",
            role: "user",
            time: "11:20",
            html: "<p>Compare the three source-switching variants from issue #36. Which signals does each one surface?</p>",
          },
          {
            kind: "message",
            role: "assistant",
            time: "11:21",
            html:
              "<p>All three variants surface the same two signals — per-source owner counts and attention dots — but at different costs:</p>" +
              "<ul><li><strong>A (grouped drawer)</strong> shows every owner at once but spends a full pane on navigation.</li>" +
              "<li><strong>B (source menu)</strong> is compact but hides the other sources behind a click.</li>" +
              "<li><strong>C (sub-tabs)</strong> keeps counts and attention visible in one permanent row.</li></ul>",
          },
          {
            kind: "message",
            role: "user",
            time: "11:24",
            html: "<p>Which one do you recommend?</p>",
          },
          {
            kind: "thought",
            label: "Thinking",
            text: "Weighing glanceability against vertical space; the sidebar is narrow, so a single persistent row is affordable.",
          },
          {
            kind: "message",
            role: "assistant",
            time: "11:26",
            html: "<p>Variant C. In a ~460px sidebar the sub-tab row costs about 32px of vertical space, and the attention dot on an inactive sub-tab is visible without any interaction — that is exactly the signal issue #36 asked for.</p>",
          },
        ],
      },
      {
        id: "pi-conv-3",
        title: "Library overview questions",
        statusToken: "idle",
        statusLabel: "Idle",
        statusTone: "muted",
        attention: false,
        updatedAt: "2026-08-28T16:44:02Z",
        replyEnabled: true,
        transcript: [
          {
            kind: "message",
            role: "user",
            time: "16:40",
            html: "<p>What topics dominate this library?</p>",
          },
          {
            kind: "tool",
            name: "library.stats",
            summary: "1,284 items · 31 collections",
            status: "completed",
          },
          {
            kind: "message",
            role: "assistant",
            time: "16:41",
            html: "<p>Mostly computer vision and LLM papers: about 62% of items are tagged <code>cv</code> or <code>llm</code>, with a long tail of NLP classics and a small HCI cluster.</p>",
          },
          {
            kind: "message",
            role: "user",
            time: "16:43",
            html: "<p>Anything published before 2015 worth keeping?</p>",
          },
          {
            kind: "message",
            role: "assistant",
            time: "16:44",
            html: "<p>Yes — the pre-2015 core is small but canonical: R-CNN lineage papers, Word2Vec, seq2seq, and the original attention paper. I would keep all 41 of them.</p>",
          },
        ],
      },
    ],
  },
  "pi-skill-runs": {
    panelKind: "skillrunner",
    ownerNoun: "Runs",
    groupLabel: "Zotero Agent",
    emptyText: "No skill runs yet.",
    bannerSubtitle: "Skill run",
    metaPills: [
      { label: "Runtime", value: "Zotero Agent (Pi)" },
      { label: "Model", value: "Claude Sonnet 4.5" },
      { label: "Usage", value: "12,480 tokens" },
    ],
    replyPlaceholder: "Reply to the pending interaction…",
    usagePercent: null,
    owners: [
      {
        id: "pi-run-1",
        title: "Batch translate — 6 PDFs",
        workflowLabel: "Literature translate",
        statusToken: "waiting_user",
        statusLabel: "Waiting for permission",
        statusTone: "warning",
        attention: true,
        attentionLabel: "Needs user interaction",
        updatedAt: "2026-08-30T09:42:18Z",
        replyEnabled: true,
        hint: {
          tone: "warning",
          text: "Waiting for your permission decision.",
        },
        permission: {
          toolTitle: "Write Zotero notes",
          summary: "The agent wants to create 6 notes in the library.",
          meta: "Source: Zotero · Requested: 09:42",
          command:
            "notes.create × 6\n" +
            "- Kwon 2024 — 中文翻译\n" +
            "- Zhou 2025 — 中文翻译\n" +
            "- RETRO (Borgeaud 2022) — 中文翻译\n" +
            "- … 3 more",
          actions: [
            { label: "Approve", tone: "primary", outcome: "approved" },
            { label: "Deny", tone: "danger", outcome: "denied" },
          ],
        },
        transcript: [
          {
            kind: "message",
            role: "user",
            time: "09:38",
            html: "<p>Translate these 6 PDFs to Chinese and save the results as notes.</p>",
          },
          {
            kind: "tool",
            name: "attachments.read",
            summary: "6 PDFs queued for translation",
            status: "completed",
          },
          {
            kind: "message",
            role: "assistant",
            time: "09:41",
            html: "<p>I've translated 4 of 6 documents. Before I write anything into your library I need your approval for the batch of notes.</p>",
          },
          {
            kind: "tool",
            name: "notes.create",
            summary: "Kwon 2024 — 中文翻译",
            status: "running",
          },
          {
            kind: "permission",
            summary: "Allow writing 6 new notes to the library?",
            status: "pending",
          },
        ],
      },
      {
        id: "pi-run-2",
        title: "Literature digest — Zhou 2025",
        workflowLabel: "Literature digest",
        statusToken: "active",
        statusLabel: "Running",
        statusTone: "success",
        attention: false,
        updatedAt: "2026-08-30T13:57:03Z",
        replyEnabled: true,
        transcript: [
          {
            kind: "message",
            role: "user",
            time: "13:55",
            html: "<p>Run a literature digest on Zhou 2025.</p>",
          },
          {
            kind: "toolGroup",
            expanded: true,
            items: [
              { name: "pdf.parse", summary: "Zhou 2025.pdf — 14 pages", status: "completed" },
              { name: "sections.extract", summary: "6 sections detected", status: "completed" },
              { name: "refs.resolve", summary: "38 references — 12 matched in library", status: "running" },
            ],
          },
          {
            kind: "message",
            role: "assistant",
            time: "13:57",
            streaming: true,
            text: "Digest so far: Zhou 2025 introduces a curriculum over synthetic counterfactuals; the ablation in §5.2 is the part most relevant to your reading queue…",
          },
        ],
      },
      {
        id: "pi-run-3",
        title: "Tag regulation — 42 items",
        workflowLabel: "Tag regulation",
        statusToken: "failed",
        statusLabel: "Failed",
        statusTone: "error",
        attention: true,
        attentionLabel: "Run failed",
        updatedAt: "2026-08-29T21:12:55Z",
        replyEnabled: false,
        hint: {
          tone: "error",
          text: "Run failed: tag validation error in batch 2.",
        },
        transcript: [
          {
            kind: "message",
            role: "user",
            time: "21:10",
            html: "<p>Regulate tags on the 42 items in “CV classics”.</p>",
          },
          {
            kind: "tool",
            name: "items.tag",
            summary: "batch 1/3 — 14 items updated",
            status: "completed",
          },
          {
            kind: "tool",
            name: "items.tag",
            summary: "batch 2/3 — validation error",
            status: "failed",
          },
          {
            kind: "message",
            role: "assistant",
            time: "21:12",
            html: "<p>The run failed while applying batch 2: the tag <code>DeepLearning</code> violates the regulated vocabulary (expected <code>deep-learning</code>). No items from batch 2 or 3 were modified; batch 1 remains applied.</p>",
          },
        ],
      },
    ],
  },
};

const state = {
  activeLane: "conversations",
  activeSource: {
    conversations: "pi-conversations",
    "skill-runs": "skillrunner",
  },
  navigationBySource: {}, // real source -> latest owner-navigation payload
  lastNotifiedTab: null,
  mockUi: {
    "pi-conversations": {
      selectedOwnerId: "pi-conv-1",
      drawer: null, // "context" | "details" | null
      permissionOpen: false,
      viewMode: "plain",
    },
    "pi-skill-runs": {
      selectedOwnerId: "pi-run-1",
      drawer: null,
      permissionOpen: false,
      viewMode: "plain",
    },
  },
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
let prototypeActionSequence = 0;

function $(id) {
  return document.getElementById(id);
}

function frameForTab(tab) {
  return $("assistant-frame-" + tab);
}

function loadingOverlay() {
  return $("assistant-workspace-loading");
}

function isRealSource(source) {
  return tabs.indexOf(source) >= 0;
}

function visiblePaneKey() {
  return state.activeSource[state.activeLane];
}

function updateLoadingState() {
  const overlay = loadingOverlay();
  if (!overlay) return;
  const key = visiblePaneKey();
  const isLoading = isRealSource(key) && !state.loadedFrames.has(key);
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

function safeText(value) {
  return typeof value === "string" ? value.trim() : "";
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

/**
 * Prototype-only action origin: the shell's own + New picker sends
 * child-actions through the exact same envelope validation and host path a
 * real child panel would use.
 */
function sendPrototypeChildAction(source, action, payload, owner) {
  prototypeActionSequence += 1;
  const envelope = {
    source,
    owner: owner || null,
    action: String(action),
    payload:
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? payload
        : {},
    actionId: [
      "prototype-shell",
      source,
      String(action),
      String(prototypeActionSequence),
    ].join("-"),
  };
  traceAction("prototype-shell-action", { source, action });
  handleAcpChildEnvelope(source, envelope);
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
  const normalizedTab = normalizeTab(tab, "acp-chat");
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

function handleFrameLoad(tab) {
  const normalizedTab = normalizeTab(tab, "acp-chat");
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

// ---------------------------------------------------------------------------
// Prototype navigation model (lanes + sub-tab source switcher)
// ---------------------------------------------------------------------------

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

function dot(kind) {
  return el("span", "dot is-" + kind);
}

function toast(message) {
  const device = $("proto-shell");
  if (!device) return;
  let node = device.querySelector(".proto-toast");
  if (!node) {
    node = el("div", "proto-toast");
    node.setAttribute("role", "status");
    device.appendChild(node);
  }
  node.textContent = message;
  node.classList.add("is-on");
  setTimeout(function () {
    node.classList.remove("is-on");
  }, 2200);
}

function navigationPayload(source) {
  const payload = state.navigationBySource[source];
  return payload && typeof payload === "object" ? payload : null;
}

function navigationEntries(source) {
  const payload = navigationPayload(source);
  return payload && Array.isArray(payload.entries) ? payload.entries : [];
}

function entryNeedsAttention(entry) {
  return Boolean(
    safeText(entry && entry.attention) || safeText(entry && entry.description),
  );
}

function sourceCount(source) {
  if (mockSources.indexOf(source) >= 0) {
    return mockPanels[source].owners.length;
  }
  return navigationEntries(source).length;
}

function sourceAttention(source) {
  if (mockSources.indexOf(source) >= 0) {
    return mockPanels[source].owners.some(function (owner) {
      return owner.attention === true;
    });
  }
  return navigationEntries(source).some(entryNeedsAttention);
}

function laneAttention(lane) {
  return laneSources[lane].some(sourceAttention);
}

// --- pane visibility + host tab notification -------------------------------

function updatePaneVisibility(options) {
  const key = visiblePaneKey();
  const panes = {
    "pi-conversations": $("proto-mock-pi-conversations"),
    "pi-skill-runs": $("proto-mock-pi-skill-runs"),
    "acp-chat": frameForTab("acp-chat"),
    "acp-skills": frameForTab("acp-skills"),
    skillrunner: frameForTab("skillrunner"),
  };
  Object.keys(panes).forEach(function (paneKey) {
    const node = panes[paneKey];
    if (node) node.classList.toggle("hidden", paneKey !== key);
  });
  const realVisible = isRealSource(key) ? key : null;
  if (realVisible) {
    closeInactiveChildDrawers(realVisible);
  }
  if (
    realVisible &&
    realVisible !== state.lastNotifiedTab &&
    (!options || options.notify !== false)
  ) {
    state.lastNotifiedTab = realVisible;
    traceAction("set-active-tab-notify", { tab: realVisible });
    postToHost(ASSISTANT_WORKSPACE_MESSAGE_TYPES.ACTION, {
      action: ASSISTANT_WORKSPACE_SHELL_ACTIONS.SET_TAB,
      tab: realVisible,
    });
  }
  updateLoadingState();
}

function selectSource(source, options) {
  if (laneSources[state.activeLane].indexOf(source) < 0) return;
  state.activeSource[state.activeLane] = source;
  traceAction("prototype-select-source", { source, lane: state.activeLane });
  renderChrome();
  updatePaneVisibility(options);
}

function setActiveLane(lane, options) {
  if (lanes.indexOf(lane) < 0 || lane === state.activeLane) return;
  state.activeLane = lane;
  traceAction("prototype-select-lane", { lane });
  renderChrome();
  updatePaneVisibility(options);
}

/** Host-initiated tab steering (init / set-tab echo): map real source -> lane. */
function applyHostTab(tab) {
  const normalized = normalizeTab(tab, "acp-chat");
  const lane = laneForSource[normalized];
  state.activeLane = lane;
  state.activeSource[lane] = normalized;
  state.lastNotifiedTab = normalized;
  renderChrome();
  updatePaneVisibility({ notify: false });
}

// --- menus (only the + New picker remains) ----------------------------------

function closeOpenMenu() {
  const open = document.querySelector(".proto-menu");
  if (open && open.parentElement) open.parentElement.removeChild(open);
  document.querySelectorAll('[aria-expanded="true"]').forEach(function (node) {
    if (node.classList.contains("proto-btn")) {
      node.setAttribute("aria-expanded", "false");
    }
  });
}

function openMenu(anchor, items, onPick, options) {
  closeOpenMenu();
  const wrap = anchor.closest(".proto-menuwrap") || anchor.parentElement;
  const menu = el("div", "proto-menu");
  menu.setAttribute("role", "menu");
  let lastGroup = "";
  items.forEach(function (item) {
    if (item.group && item.group !== lastGroup) {
      menu.appendChild(el("div", "proto-menu-label", item.group));
      lastGroup = item.group;
    }
    const it = el(
      "button",
      "proto-menu-item" + (item.checked ? " is-checked" : ""),
    );
    it.setAttribute("role", "menuitem");
    it.appendChild(el("span", "", (item.checked ? "✓ " : "") + item.label));
    if (item.meta || item.attention || item.unavailable) {
      const meta = el("span", "meta");
      if (item.unavailable) meta.appendChild(dot("error"));
      else if (item.attention) meta.appendChild(dot("attention"));
      if (item.meta) meta.appendChild(el("span", "", item.meta));
      it.appendChild(meta);
    }
    it.addEventListener("click", function () {
      dismissMenu();
      onPick(item);
    });
    menu.appendChild(it);
  });
  wrap.style.position = "relative";
  if (options && options.align === "right") {
    menu.classList.add("align-right");
  }
  wrap.appendChild(menu);
  const focusables = Array.prototype.slice.call(
    menu.querySelectorAll(".proto-menu-item"),
  );
  menu.addEventListener("keydown", function (ev) {
    const index = focusables.indexOf(document.activeElement);
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      (focusables[index + 1] || focusables[0]).focus();
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      (focusables[index - 1] || focusables[focusables.length - 1]).focus();
    } else if (ev.key === "Escape") {
      ev.preventDefault();
      dismissMenu();
      anchor.focus();
    }
  });
  if (focusables[0]) focusables[0].focus();
  document.addEventListener(
    "mousedown",
    function onDoc(ev) {
      if (!menu.contains(ev.target) && ev.target !== anchor) {
        dismissMenu();
        document.removeEventListener("mousedown", onDoc);
      }
    },
    { capture: true },
  );
  function dismissMenu() {
    if (menu.parentElement) menu.parentElement.removeChild(menu);
    anchor.setAttribute("aria-expanded", "false");
  }
  anchor.setAttribute("aria-expanded", "true");
}

// --- + New (Conversations lane) ---------------------------------------------

function newConversationItems() {
  const items = [{ label: "Zotero Agent", kind: "mock-new" }];
  const payload = navigationPayload("acp-chat");
  const groups = payload && Array.isArray(payload.groups) ? payload.groups : [];
  groups.forEach(function (group) {
    items.push({
      label: safeText(group.label) || safeText(group.groupId),
      group: "External Agent",
      kind: "backend-new",
      groupId: safeText(group.groupId),
      unavailable: safeText(group.status) === "unavailable",
    });
  });
  return items;
}

function handleNewConversationPick(item) {
  if (!item || item.kind === "mock-new") {
    toast("Zotero Agent is a preview — conversation creation is not wired yet.");
    return;
  }
  if (item.kind === "backend-new" && item.groupId) {
    sendPrototypeChildAction(
      "acp-chat",
      "new-conversation",
      { groupId: item.groupId },
      null,
    );
    toast("New conversation requested — " + item.label + " (mock action).");
  }
}

// --- chrome renderers -------------------------------------------------------

function renderLaneSwitcher() {
  const nav = $("proto-lanes");
  if (!nav) return;
  nav.innerHTML = "";
  lanes.forEach(function (lane) {
    const button = el(
      "button",
      "proto-lane" + (state.activeLane === lane ? " is-active" : ""),
      laneLabels[lane],
    );
    button.type = "button";
    button.setAttribute(
      "aria-pressed",
      state.activeLane === lane ? "true" : "false",
    );
    if (laneAttention(lane) && state.activeLane !== lane) {
      button.appendChild(dot("attention"));
      button.setAttribute("aria-label", laneLabels[lane] + " — needs attention");
    }
    button.addEventListener("click", function () {
      setActiveLane(lane);
    });
    nav.appendChild(button);
  });
  nav.onkeydown = function (ev) {
    if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
    const buttons = Array.prototype.slice.call(nav.querySelectorAll(".proto-lane"));
    const index = buttons.indexOf(document.activeElement);
    if (index < 0) return;
    ev.preventDefault();
    const next =
      ev.key === "ArrowRight" ? buttons[index + 1] : buttons[index - 1];
    if (next) {
      next.focus();
      next.click();
    }
  };
}

function renderSubTabs() {
  const nav = $("proto-subtabs");
  if (!nav) return;
  nav.innerHTML = "";
  const current = state.activeSource[state.activeLane];
  laneSources[state.activeLane].forEach(function (source) {
    const tab = el(
      "button",
      "proto-subtab" + (current === source ? " is-active" : ""),
    );
    tab.type = "button";
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", current === source ? "true" : "false");
    tab.appendChild(el("span", "proto-subtab-label", sourceLabels[source]));
    tab.appendChild(el("span", "proto-subtab-count", String(sourceCount(source))));
    if (sourceAttention(source)) {
      tab.appendChild(dot("attention"));
      tab.setAttribute(
        "aria-label",
        sourceLabels[source] +
          " — " +
          String(sourceCount(source)) +
          " owners, needs attention",
      );
    }
    tab.addEventListener("click", function () {
      selectSource(source);
    });
    nav.appendChild(tab);
  });
  nav.onkeydown = function (ev) {
    if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
    const buttons = Array.prototype.slice.call(
      nav.querySelectorAll(".proto-subtab"),
    );
    const index = buttons.indexOf(document.activeElement);
    if (index < 0) return;
    ev.preventDefault();
    const next =
      ev.key === "ArrowRight" ? buttons[index + 1] : buttons[index - 1];
    if (next) {
      next.focus();
      next.click();
    }
  };
}

// ---------------------------------------------------------------------------
// Mock Zotero Agent panes: DOM-level replicas of the real ACP child panels
// (same classes as src/sidebar/assistantWorkspaceAcpChild.js output, rendered
// by the same production stylesheets). Shell-side only; zero host traffic.
// ---------------------------------------------------------------------------

function mockOwner(source, ownerId) {
  return (
    mockPanels[source].owners.find(function (owner) {
      return owner.id === ownerId;
    }) || mockPanels[source].owners[0]
  );
}

function mockSelector(id, labelText, buildOptions, disabled) {
  const label = el("label", "assistant-panel-selector");
  label.setAttribute("data-assistant-selector-id", id);
  if (disabled) label.setAttribute("data-assistant-disabled", "true");
  label.appendChild(el("span", "assistant-panel-selector-label", labelText));
  const select = el("select", "assistant-panel-select");
  if (disabled) select.disabled = true;
  buildOptions(select);
  label.appendChild(select);
  return label;
}

function mockToolLed(status) {
  const led = el(
    "span",
    "assistant-transcript-tool-led " + mockToolToneClass(status),
  );
  led.setAttribute("aria-hidden", "true");
  return led;
}

function mockToolToneClass(status) {
  const token = safeText(status);
  if (token === "completed" || token === "approved") return "is-completed";
  if (token === "failed" || token === "error" || token === "denied") {
    return "is-failed";
  }
  return "is-running";
}

// Mirrors the production permission resolution flow: an Approve/Deny/Cancel
// option (hint row or drawer) resolves the request, clears the warning hint,
// and settles the transcript permission row; the drawer alone never resolves.
function resolveMockPermission(source, ui, outcome) {
  const owner = mockOwner(source, ui.selectedOwnerId);
  if (!owner.permission) return;
  owner.transcript.forEach(function (item) {
    if (item.kind === "permission" && item.status === "pending") {
      item.status = outcome === "approved" ? "approved" : "denied";
    }
  });
  delete owner.permission;
  if (outcome === "approved") {
    owner.hint = { tone: "success", text: "Permission approved. The run continues." };
    owner.statusToken = "active";
    owner.statusLabel = "Running";
    owner.statusTone = "success";
  } else {
    owner.hint = {
      tone: "muted",
      text:
        outcome === "cancelled"
          ? "Permission request cancelled."
          : "Permission denied.",
    };
    owner.statusToken = "idle";
    owner.statusLabel = "Idle";
    owner.statusTone = "muted";
  }
  owner.attention = false;
  ui.permissionOpen = false;
  renderMockPanes();
  renderSubTabs();
}

function mockTranscriptRow(item) {
  const row = el("article", "assistant-transcript-row");
  row.setAttribute("data-assistant-panel-kind", "acp-chat");
  const meta = el("div", "assistant-transcript-meta");
  const body = el("div", "assistant-transcript-body");
  body.setAttribute("data-assistant-transcript-body", "true");
  row.appendChild(meta);
  row.appendChild(body);

  if (item.kind === "message") {
    row.setAttribute("data-assistant-item-kind", "message");
    row.setAttribute("data-assistant-role", item.role || "assistant");
    if (item.streaming) row.classList.add("is-streaming");
    meta.appendChild(
      el("span", "assistant-transcript-role", item.role || "assistant"),
    );
    meta.appendChild(el("span", "assistant-transcript-time", item.time || ""));
    if (item.streaming) {
      body.textContent = String(item.text || "");
    } else {
      body.classList.add("assistant-transcript-markdown-body");
      body.innerHTML = String(item.html || "");
    }
    return row;
  }
  if (item.kind === "thought") {
    row.setAttribute("data-assistant-item-kind", "thought");
    row.setAttribute("data-assistant-role", "process");
    row.classList.add("is-process");
    meta.textContent = item.label || "Thinking";
    body.classList.add("assistant-transcript-markdown-body");
    body.innerHTML = "<p>" + String(item.text || "") + "</p>";
    return row;
  }
  if (item.kind === "tool") {
    row.setAttribute("data-assistant-item-kind", "tool-call");
    row.setAttribute("data-assistant-role", "tool");
    row.classList.add("is-tool");
    meta.textContent = "Tool";
    body.appendChild(mockToolLed(item.status));
    body.appendChild(
      el("span", "assistant-transcript-tool-badge", item.name || "tool"),
    );
    if (item.summary) {
      body.appendChild(
        el("span", "assistant-transcript-tool-summary", item.summary),
      );
    }
    return row;
  }
  if (item.kind === "toolGroup") {
    row.setAttribute("data-assistant-item-kind", "tool-activity-group");
    row.setAttribute("data-assistant-role", "tool");
    row.classList.add("is-tool", "is-tool-activity-group");
    const expanded = item.expanded === true;
    row.classList.add(expanded ? "is-expanded" : "is-collapsed");
    meta.appendChild(
      el(
        "span",
        "assistant-transcript-role",
        "Tool activity (" + String(item.items.length) + ")",
      ),
    );
    const summary = el("button", "assistant-transcript-tool-activity-summary");
    summary.type = "button";
    summary.setAttribute("aria-expanded", expanded ? "true" : "false");
    const chevron = el(
      "span",
      "assistant-transcript-tool-activity-chevron",
      expanded ? "−" : "+",
    );
    chevron.setAttribute("aria-hidden", "true");
    summary.appendChild(chevron);
    const anyRunning = item.items.some(function (tool) {
      return tool.status === "running";
    });
    summary.appendChild(mockToolLed(anyRunning ? "running" : "completed"));
    summary.appendChild(
      el(
        "span",
        "assistant-transcript-tool-summary",
        item.items
          .map(function (tool) {
            return tool.name;
          })
          .join(" · "),
      ),
    );
    summary.addEventListener("click", function (ev) {
      ev.stopPropagation();
      item.expanded = !expanded;
      renderMockPanes();
    });
    body.appendChild(summary);
    if (expanded) {
      const list = el("div", "assistant-transcript-tool-activity-list");
      item.items.forEach(function (tool) {
        const entry = el(
          "div",
          "assistant-transcript-tool-activity-item " +
            mockToolToneClass(tool.status),
        );
        entry.appendChild(mockToolLed(tool.status));
        entry.appendChild(
          el("span", "assistant-transcript-tool-badge", tool.name),
        );
        if (tool.summary) {
          entry.appendChild(
            el("span", "assistant-transcript-tool-summary", tool.summary),
          );
        }
        list.appendChild(entry);
      });
      row.appendChild(list);
    }
    return row;
  }
  if (item.kind === "permission") {
    row.setAttribute("data-assistant-item-kind", "permission");
    row.setAttribute("data-assistant-role", "permission");
    row.classList.add("is-permission");
    meta.textContent = "Permission";
    body.appendChild(mockToolLed(item.status));
    const icon = el(
      "span",
      "assistant-transcript-permission-icon",
      item.status === "approved"
        ? "✓"
        : item.status === "denied"
          ? "×"
          : "!",
    );
    icon.setAttribute("aria-hidden", "true");
    body.appendChild(icon);
    body.appendChild(
      el(
        "span",
        "assistant-transcript-permission-summary",
        item.summary || "Permission request",
      ),
    );
    return row;
  }
  return row;
}

function mockDrawerOwnerRow(source, owner, ui) {
  const selected = ui.selectedOwnerId === owner.id;
  const wrap = el(
    "div",
    "assistant-workspace-drawer-task skillrunner-workspace-task" +
      (selected ? " is-active" : ""),
  );
  wrap.setAttribute("data-assistant-task-key", owner.id);
  const main = el("button", "assistant-workspace-drawer-task-main");
  main.type = "button";
  const content = el("div", "assistant-workspace-drawer-task-content");
  const title = el(
    "div",
    "assistant-workspace-drawer-task-title skillrunner-workspace-task-title",
  );
  title.appendChild(
    el("span", "assistant-workspace-drawer-task-title-text", owner.title),
  );
  content.appendChild(title);
  content.appendChild(
    el(
      "div",
      "assistant-workspace-drawer-task-workflow skillrunner-workspace-task-workflow",
      owner.workflowLabel || mockPanels[source].groupLabel,
    ),
  );
  const meta = el(
    "div",
    "assistant-workspace-drawer-task-meta skillrunner-workspace-task-meta",
  );
  meta.appendChild(
    el(
      "span",
      "assistant-workspace-drawer-task-main-status is-" + owner.statusTone,
      owner.statusLabel,
    ),
  );
  const axes = el("span", "assistant-workspace-drawer-task-status-axes");
  const axis = el("span", "assistant-workspace-drawer-task-status-axis");
  axis.appendChild(
    el("span", "assistant-workspace-drawer-task-status-axis-label", "Runtime"),
  );
  axis.appendChild(el("span", "asst-led is-" + owner.statusTone));
  axis.appendChild(
    el(
      "span",
      "assistant-workspace-drawer-task-status-axis-value",
      owner.statusLabel,
    ),
  );
  axes.appendChild(axis);
  meta.appendChild(axes);
  meta.appendChild(
    el("span", "assistant-workspace-drawer-task-updated-at", owner.updatedAt),
  );
  content.appendChild(meta);
  main.appendChild(content);
  main.addEventListener("click", function () {
    ui.selectedOwnerId = owner.id;
    ui.drawer = null;
    ui.permissionOpen = false;
    renderMockPanes();
  });
  wrap.appendChild(main);
  const actions = el("div", "assistant-workspace-drawer-task-actions");
  const archive = el(
    "button",
    "assistant-workspace-drawer-task-action is-archive",
  );
  archive.type = "button";
  archive.title = "Archive";
  archive.setAttribute("aria-label", "Archive");
  archive.appendChild(el("span", "zs-icon zs-icon-sm zs-icon-archive"));
  archive.addEventListener("click", function (ev) {
    ev.stopPropagation();
    toast("Preview only — nothing is archived.");
  });
  actions.appendChild(archive);
  wrap.appendChild(actions);
  return wrap;
}

function mockContextDrawer(source, ui) {
  const overlay = el(
    "section",
    "asst-panel-drawer-overlay assistant-panel-region assistant-panel-context-drawer is-assistant-managed" +
      (ui.drawer === "context" ? "" : " hidden"),
  );
  overlay.setAttribute("data-role", "context-drawer");
  overlay.setAttribute("data-assistant-region", "drawer");
  const panel = el(
    "div",
    "assistant-panel-managed-view assistant-panel-managed-drawer asst-drawer-panel",
  );
  const header = el(
    "div",
    "assistant-panel-context-drawer-header assistant-workspace-drawer-header skillrunner-workspace-drawer-header",
  );
  header.appendChild(el("strong", "", mockPanels[source].ownerNoun));
  const close = el("button", "asst-button-compact", "Close");
  close.type = "button";
  close.addEventListener("click", function () {
    ui.drawer = null;
    renderMockPanes();
  });
  header.appendChild(close);
  panel.appendChild(header);
  const sections = el(
    "div",
    "assistant-workspace-drawer-sections skillrunner-workspace-sections",
  );
  const section = el(
    "section",
    "assistant-workspace-drawer-section skillrunner-workspace-section is-neutral is-expanded",
  );
  const sectionBody = el(
    "div",
    "assistant-workspace-drawer-section-body skillrunner-workspace-section-body",
  );
  const group = el(
    "section",
    "assistant-workspace-drawer-group skillrunner-workspace-group is-expanded",
  );
  const groupHeader = el(
    "button",
    "assistant-workspace-drawer-group-header skillrunner-workspace-group-header",
  );
  groupHeader.type = "button";
  groupHeader.setAttribute("aria-expanded", "true");
  groupHeader.appendChild(
    el(
      "span",
      "assistant-workspace-drawer-group-title",
      mockPanels[source].groupLabel,
    ),
  );
  group.appendChild(groupHeader);
  const groupBody = el(
    "div",
    "assistant-workspace-drawer-group-body skillrunner-workspace-group-body",
  );
  mockPanels[source].owners.forEach(function (owner) {
    groupBody.appendChild(mockDrawerOwnerRow(source, owner, ui));
  });
  group.appendChild(groupBody);
  sectionBody.appendChild(group);
  section.appendChild(sectionBody);
  sections.appendChild(section);
  panel.appendChild(sections);
  overlay.appendChild(panel);
  overlay.addEventListener("click", function (ev) {
    if (!panel.contains(ev.target)) {
      ui.drawer = null;
      renderMockPanes();
    }
  });
  return overlay;
}

function mockDetailsRow(label, value) {
  const row = el("div", "assistant-panel-details-row");
  row.setAttribute("data-assistant-details-entry-kind", "text");
  row.appendChild(el("div", "assistant-panel-details-label", label));
  row.appendChild(el("div", "assistant-panel-details-value", value));
  return row;
}

function mockDetailsSection(title, summary, rows) {
  const section = el("section", "assistant-panel-details-section");
  section.setAttribute("data-assistant-details-kind", "metadata");
  const head = el("div", "assistant-panel-details-section-summary");
  head.appendChild(el("span", "assistant-panel-details-section-title", title));
  if (summary) {
    head.appendChild(
      el("span", "assistant-panel-details-section-subtitle", summary),
    );
  }
  section.appendChild(head);
  const body = el("div", "assistant-panel-details-section-body");
  rows.forEach(function (row) {
    body.appendChild(mockDetailsRow(row[0], row[1]));
  });
  section.appendChild(body);
  return section;
}

function mockDetailsDrawer(source, ui) {
  const owner = mockOwner(source, ui.selectedOwnerId);
  const overlay = el(
    "section",
    "asst-panel-details-overlay is-assistant-managed" +
      (ui.drawer === "details" ? "" : " hidden"),
  );
  overlay.setAttribute("data-role", "details-drawer");
  const panel = el(
    "div",
    "assistant-panel-managed-view assistant-panel-managed-details asst-drawer-panel",
  );
  const header = el("div", "assistant-panel-details-header");
  header.appendChild(el("strong", "", "Details"));
  const close = el("button", "asst-button-compact", "Close");
  close.type = "button";
  close.addEventListener("click", function () {
    ui.drawer = null;
    renderMockPanes();
  });
  header.appendChild(close);
  panel.appendChild(header);
  const list = el("div", "assistant-panel-details-list");
  const isChat = mockPanels[source].panelKind === "acp-chat";
  list.appendChild(
    mockDetailsSection(
      isChat ? "Conversation" : "Run",
      owner.statusLabel,
      [
        [isChat ? "Session" : "Run", owner.title],
        ["Runtime", "Zotero Agent (Pi preview)"],
        ["Model", "Anthropic · Claude Sonnet 4.5"],
        ["Status", owner.statusLabel],
        ["Updated", owner.updatedAt],
      ],
    ),
  );
  list.appendChild(
    mockDetailsSection("Usage", "this " + (isChat ? "conversation" : "run"), [
      ["Input tokens", "18,204"],
      ["Output tokens", "2,311"],
      ["Estimated cost", "$0.042"],
    ]),
  );
  panel.appendChild(list);
  overlay.appendChild(panel);
  overlay.addEventListener("click", function (ev) {
    if (!panel.contains(ev.target)) {
      ui.drawer = null;
      renderMockPanes();
    }
  });
  return overlay;
}

function mockPermissionOverlay(source, ui) {
  const owner = mockOwner(source, ui.selectedOwnerId);
  const overlay = el(
    "section",
    "assistant-panel-permission-drawer-overlay" +
      (ui.permissionOpen && owner.permission ? "" : " hidden"),
  );
  if (!owner.permission) return overlay;
  const request = owner.permission;
  const panel = el("aside", "assistant-panel-permission-drawer-panel");
  const header = el("div", "assistant-panel-permission-drawer-header");
  const titleStack = el("div", "assistant-panel-permission-drawer-title-stack");
  titleStack.appendChild(el("strong", "", request.toolTitle));
  titleStack.appendChild(
    el("div", "assistant-panel-permission-drawer-subtitle", request.summary),
  );
  header.appendChild(titleStack);
  const close = el("button", "asst-button-compact", "Close");
  close.type = "button";
  close.addEventListener("click", function () {
    ui.permissionOpen = false;
    renderMockPanes();
  });
  header.appendChild(close);
  panel.appendChild(header);
  panel.appendChild(
    el("div", "assistant-panel-permission-drawer-meta", request.meta),
  );
  const command = el("pre", "assistant-panel-permission-drawer-command");
  command.textContent = request.command;
  panel.appendChild(command);
  const actions = el("div", "assistant-panel-permission-drawer-actions");
  request.actions.forEach(function (action) {
    const button = el("button", "asst-button", action.label);
    button.type = "button";
    button.setAttribute("data-assistant-button-tone", action.tone);
    button.addEventListener("click", function () {
      resolveMockPermission(source, ui, action.outcome);
    });
    actions.appendChild(button);
  });
  panel.appendChild(actions);
  overlay.appendChild(panel);
  overlay.addEventListener("click", function (ev) {
    if (!panel.contains(ev.target)) {
      ui.permissionOpen = false;
      renderMockPanes();
    }
  });
  return overlay;
}

function mockCollapseToggle(region) {
  const toggle = el("button", "assistant-region-collapse-toggle");
  toggle.type = "button";
  toggle.setAttribute("data-collapse-region", region);
  toggle.setAttribute("aria-expanded", region === "banner" ? "false" : "true");
  toggle.setAttribute(
    "aria-label",
    (region === "banner" ? "Expand" : "Collapse") + " " + region,
  );
  const icon = el("span", "assistant-region-collapse-toggle-icon");
  icon.setAttribute("aria-hidden", "true");
  toggle.appendChild(icon);
  toggle.addEventListener("click", function () {
    const regionNode = toggle.closest(".assistant-panel-region");
    if (!regionNode) return;
    const collapsed = regionNode.classList.toggle("is-region-collapsed");
    toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
  });
  return toggle;
}

function mockToolbar(source, ui) {
  const header = el(
    "header",
    "asst-shell-toolbar assistant-panel-region assistant-panel-toolbar is-assistant-managed",
  );
  header.setAttribute("data-role", "toolbar");
  header.setAttribute("data-assistant-region", "toolbar");
  const view = el(
    "div",
    "assistant-panel-managed-view assistant-panel-managed-toolbar",
  );
  const start = el(
    "div",
    "assistant-panel-toolbar-group assistant-panel-toolbar-group-start",
  );
  const owners = el(
    "button",
    "asst-button-compact assistant-panel-action assistant-panel-action-open-context-drawer",
    mockPanels[source].ownerNoun,
  );
  owners.type = "button";
  owners.addEventListener("click", function () {
    ui.drawer = ui.drawer === "context" ? null : "context";
    renderMockPanes();
  });
  start.appendChild(owners);
  const details = el(
    "button",
    "asst-button-compact assistant-panel-action assistant-panel-action-open-details-drawer",
    "Details",
  );
  details.type = "button";
  details.addEventListener("click", function () {
    ui.drawer = ui.drawer === "details" ? null : "details";
    renderMockPanes();
  });
  start.appendChild(details);
  view.appendChild(start);
  const end = el(
    "div",
    "assistant-panel-toolbar-group assistant-panel-toolbar-group-end",
  );
  end.appendChild(el("span", "proto-preview-tag", "preview"));
  const mode = el("div", "assistant-panel-display-mode assistant-panel-action");
  mode.setAttribute("role", "radiogroup");
  mode.setAttribute("aria-label", "Display mode");
  ["Live", "By message", "Silent"].forEach(function (label, index) {
    const option = el("button", "assistant-panel-display-mode-option", label);
    option.type = "button";
    option.setAttribute("role", "radio");
    option.setAttribute("aria-checked", index === 0 ? "true" : "false");
    option.addEventListener("click", function () {
      Array.prototype.forEach.call(
        mode.querySelectorAll(".assistant-panel-display-mode-option"),
        function (peer) {
          peer.setAttribute("aria-checked", peer === option ? "true" : "false");
        },
      );
    });
    mode.appendChild(option);
  });
  end.appendChild(mode);
  view.appendChild(end);
  header.appendChild(view);
  header.appendChild(mockCollapseToggle("toolbar"));
  return header;
}

function mockBanner(source, ui) {
  const owner = mockOwner(source, ui.selectedOwnerId);
  const banner = el(
    "section",
    "asst-banner assistant-panel-region assistant-panel-banner is-assistant-managed",
  );
  banner.setAttribute("data-role", "banner");
  banner.setAttribute("data-assistant-region", "banner");
  const view = el(
    "div",
    "assistant-panel-managed-view assistant-panel-managed-banner",
  );
  const mainBox = el("div", "assistant-panel-banner-main");
  mainBox.appendChild(el("div", "assistant-panel-banner-title", owner.title));
  mainBox.appendChild(
    el(
      "div",
      "assistant-panel-banner-subtitle",
      owner.workflowLabel || mockPanels[source].bannerSubtitle,
    ),
  );
  view.appendChild(mainBox);
  const metaBox = el("div", "assistant-panel-banner-meta");
  mockPanels[source].metaPills.forEach(function (pill) {
    const node = el("span", "asst-meta-pill assistant-panel-meta-pill");
    node.appendChild(el("strong", "", pill.label));
    node.appendChild(el("span", "", pill.value));
    metaBox.appendChild(node);
  });
  if (mockPanels[source].panelKind !== "acp-chat" && owner.workflowLabel) {
    const node = el("span", "asst-meta-pill assistant-panel-meta-pill");
    node.appendChild(el("strong", "", "Workflow"));
    node.appendChild(el("span", "", owner.workflowLabel));
    metaBox.appendChild(node);
  }
  view.appendChild(metaBox);
  const statusRow = el("div", "assistant-panel-banner-status-row");
  const status = el(
    "span",
    "assistant-panel-banner-status assistant-workspace-drawer-task-main-status is-" +
      owner.statusTone,
    owner.statusLabel,
  );
  status.setAttribute("data-assistant-banner-status", owner.statusToken);
  statusRow.appendChild(status);
  const indicators = el("div", "assistant-panel-indicators");
  const indicator = el("span", "assistant-panel-indicator");
  indicator.setAttribute("data-assistant-indicator-id", "connection");
  indicator.setAttribute("data-assistant-indicator-tone", "success");
  indicator.appendChild(el("span", "asst-led is-success"));
  indicator.appendChild(
    el("span", "assistant-panel-indicator-label", "Connection"),
  );
  indicator.appendChild(
    el("strong", "assistant-panel-indicator-value", "Connected"),
  );
  indicators.appendChild(indicator);
  statusRow.appendChild(indicators);
  view.appendChild(statusRow);
  if (source === "pi-conversations") {
    // Same circular "+" as the production acp-chat banner
    // (.assistant-panel-action-new-conversation, absolutely positioned by
    // assistant-panel-shared.css); opens the same source picker menu.
    const actions = el("div", "assistant-panel-context-actions");
    const wrap = el("span", "proto-menuwrap");
    const newButton = el(
      "button",
      "asst-button-compact assistant-panel-action assistant-panel-action-new-conversation",
      "New",
    );
    newButton.type = "button";
    newButton.setAttribute("aria-label", "New conversation");
    newButton.setAttribute("aria-haspopup", "menu");
    newButton.setAttribute("aria-expanded", "false");
    newButton.addEventListener("click", function () {
      openMenu(newButton, newConversationItems(), handleNewConversationPick, {
        align: "right",
      });
    });
    wrap.appendChild(newButton);
    actions.appendChild(wrap);
    view.appendChild(actions);
  }
  banner.appendChild(view);
  banner.appendChild(mockCollapseToggle("banner"));
  return banner;
}

function mockHintSurface(source, ui) {
  const owner = mockOwner(source, ui.selectedOwnerId);
  const hint = owner.hint;
  const surface = el(
    "section",
    "asst-hint-surface assistant-panel-region assistant-panel-hint is-assistant-managed" +
      (hint ? "" : " hidden"),
  );
  surface.setAttribute("data-role", "interaction");
  surface.setAttribute("data-assistant-region", "hint");
  if (hint) {
    surface.setAttribute("data-assistant-interaction", hint.tone);
    const view = el(
      "div",
      "assistant-panel-managed-view assistant-panel-managed-hint",
    );
    const row = el("div", "assistant-panel-hint-row");
    row.appendChild(el("span", "asst-led is-" + hint.tone));
    row.appendChild(el("span", "", hint.text));
    view.appendChild(row);
    if (owner.permission) {
      // Same two-level shape as the production PermissionSummary
      // (src/sidebar/components/HintRegion.tsx): summary + meta + "View
      // details", then the inline option buttons that resolve the request.
      const request = owner.permission;
      const summary = el("div", "assistant-panel-permission-summary");
      const summaryText = el(
        "div",
        "assistant-panel-permission-summary-text",
        request.summary,
      );
      summaryText.title = request.summary;
      summary.appendChild(summaryText);
      summary.appendChild(
        el(
          "div",
          "assistant-panel-permission-meta",
          "Zotero write approval · " + request.toolTitle,
        ),
      );
      const viewDetails = el(
        "button",
        "asst-button-compact assistant-panel-permission-view-full-request",
        "View details",
      );
      viewDetails.type = "button";
      viewDetails.addEventListener("click", function () {
        ui.permissionOpen = true;
        renderMockPanes();
      });
      summary.appendChild(viewDetails);
      view.appendChild(summary);
      const options = el(
        "div",
        "assistant-panel-hint-options assistant-panel-permission-actions",
      );
      request.actions.forEach(function (action) {
        const button = el(
          "button",
          "asst-button-compact assistant-panel-action",
          action.label,
        );
        button.type = "button";
        button.setAttribute("data-assistant-button-tone", action.tone);
        button.addEventListener("click", function () {
          resolveMockPermission(source, ui, action.outcome);
        });
        options.appendChild(button);
      });
      const cancel = el(
        "button",
        "asst-button-compact assistant-panel-action",
        "Cancel",
      );
      cancel.type = "button";
      cancel.setAttribute("data-assistant-button-tone", "danger");
      cancel.addEventListener("click", function () {
        resolveMockPermission(source, ui, "cancelled");
      });
      options.appendChild(cancel);
      view.appendChild(options);
    }
    surface.appendChild(view);
  }
  return surface;
}

function mockConversationSurface(source, ui) {
  const owner = mockOwner(source, ui.selectedOwnerId);
  const surface = el(
    "section",
    "asst-conversation-surface assistant-panel-region assistant-panel-conversation",
  );
  surface.setAttribute("data-role", "conversation");
  surface.setAttribute("data-assistant-region", "conversation");
  const empty = el(
    "section",
    "asst-empty-state hidden",
    mockPanels[source].emptyText,
  );
  empty.setAttribute("aria-live", "polite");
  surface.appendChild(empty);
  const transcript = el(
    "section",
    (ui.viewMode === "bubble" ? "bubble-mode" : "plain-mode") +
      " assistant-transcript",
  );
  transcript.setAttribute("data-role", "transcript");
  transcript.setAttribute(
    "data-assistant-panel-kind",
    mockPanels[source].panelKind,
  );
  owner.transcript.forEach(function (item) {
    transcript.appendChild(mockTranscriptRow(item));
  });
  surface.appendChild(transcript);
  const overlay = el("div", "asst-conversation-overlay-menu");
  overlay.setAttribute("role", "group");
  overlay.setAttribute("aria-label", "View");
  [
    { mode: "plain", label: "Plain", icon: "zs-icon-subject" },
    { mode: "bubble", label: "Bubble", icon: "zs-icon-forum" },
  ].forEach(function (entry) {
    const button = el("button", "asst-button-compact");
    button.type = "button";
    button.setAttribute("data-assistant-view-mode", entry.mode);
    button.setAttribute("aria-label", entry.label);
    button.setAttribute(
      "aria-pressed",
      ui.viewMode === entry.mode ? "true" : "false",
    );
    const icon = el(
      "span",
      "zs-icon zs-icon-sm asst-view-mode-icon " + entry.icon,
    );
    icon.setAttribute("aria-hidden", "true");
    button.appendChild(icon);
    button.appendChild(el("span", "asst-view-mode-label", entry.label));
    button.addEventListener("click", function () {
      ui.viewMode = entry.mode;
      renderMockPanes();
    });
    overlay.appendChild(button);
  });
  surface.appendChild(overlay);
  return surface;
}

function mockReplySurface(source, ui) {
  const owner = mockOwner(source, ui.selectedOwnerId);
  const surface = el(
    "section",
    "asst-reply-surface assistant-panel-region assistant-panel-reply is-assistant-managed",
  );
  surface.setAttribute("data-role", "composer");
  surface.setAttribute("data-assistant-region", "reply");
  surface.setAttribute(
    "data-assistant-reply-enabled",
    owner.replyEnabled ? "true" : "false",
  );
  surface.setAttribute("data-assistant-reply-state", "idle");
  const view = el(
    "div",
    "assistant-panel-managed-view assistant-panel-managed-reply",
  );
  const textarea = el("textarea", "assistant-panel-reply-input");
  textarea.placeholder = mockPanels[source].replyPlaceholder;
  if (!owner.replyEnabled) textarea.disabled = true;
  view.appendChild(textarea);
  const footer = el("div", "assistant-panel-reply-footer");
  const primary = el("div", "assistant-panel-reply-primary");
  const send = el(
    "button",
    "asst-button assistant-panel-reply-submit",
    "Send",
  );
  send.type = "button";
  send.setAttribute("data-assistant-button-tone", "primary");
  if (!owner.replyEnabled) send.disabled = true;
  send.addEventListener("click", function () {
    toast("Preview only — messages are not sent.");
  });
  primary.appendChild(send);
  footer.appendChild(primary);
  const controls = el(
    "div",
    "assistant-panel-reply-controls" +
      (mockPanels[source].panelKind === "acp-chat"
        ? ""
        : " proto-reply-controls-2col"),
  );
  if (mockPanels[source].panelKind === "acp-chat") {
    controls.appendChild(
      mockSelector("mode", "Mode", function (select) {
        ["Chat", "Research"].forEach(function (value) {
          const option = el("option", "", value);
          option.value = value.toLowerCase();
          select.appendChild(option);
        });
      }),
    );
  }
  controls.appendChild(
    mockSelector("model", "Model", function (select) {
      MOCK_MODEL_GROUPS.forEach(function (group) {
        const optgroup = document.createElement("optgroup");
        optgroup.label = group.label;
        group.options.forEach(function (value) {
          const option = el("option", "", value);
          option.value = group.label + " · " + value;
          optgroup.appendChild(option);
        });
        select.appendChild(optgroup);
      });
    }),
  );
  controls.appendChild(
    mockSelector("reasoning", "Reasoning", function (select) {
      MOCK_REASONING_OPTIONS.forEach(function (value) {
        const option = el("option", "", value);
        option.value = value.toLowerCase();
        select.appendChild(option);
      });
    }),
  );
  footer.appendChild(controls);
  const secondary = el("div", "assistant-panel-reply-secondary");
  secondary.appendChild(el("span", "assistant-panel-reply-hint"));
  if (mockPanels[source].usagePercent != null) {
    const gauge = el("div", "assistant-panel-usage-gauge");
    gauge.title = "Mock usage";
    gauge.setAttribute("aria-label", "Mock usage");
    const ring = el("span", "assistant-panel-usage-ring");
    ring.style.setProperty(
      "--assistant-usage-percent",
      String(mockPanels[source].usagePercent) + "%",
    );
    ring.appendChild(
      el(
        "span",
        "assistant-panel-usage-label",
        String(mockPanels[source].usagePercent) + "%",
      ),
    );
    gauge.appendChild(ring);
    secondary.appendChild(gauge);
  }
  footer.appendChild(secondary);
  view.appendChild(footer);
  surface.appendChild(view);
  surface.appendChild(mockCollapseToggle("composer"));
  return surface;
}

function renderMockPane(source) {
  const mount = $("proto-mock-" + source);
  if (!mount) return;
  const ui = state.mockUi[source];
  mount.innerHTML = "";
  const root = el(
    "main",
    "assistant-workspace-acp-shell asst-panel-shell assistant-panel-root",
  );
  root.setAttribute("data-role", "root");
  root.setAttribute(
    "data-assistant-panel-kind",
    mockPanels[source].panelKind,
  );
  const owner = mockOwner(source, ui.selectedOwnerId);
  root.setAttribute("data-assistant-context-id", owner.id);
  root.setAttribute("data-assistant-execution-state", owner.statusToken);
  root.setAttribute("data-assistant-tone", owner.statusTone);
  root.appendChild(mockToolbar(source, ui));
  root.appendChild(mockBanner(source, ui));
  const counter = el(
    "section",
    "assistant-message-counter-region hidden assistant-panel-region assistant-panel-message-counter",
  );
  counter.setAttribute("data-role", "message-counts");
  root.appendChild(counter);
  root.appendChild(mockContextDrawer(source, ui));
  const mainRegion = el("section", "asst-panel-main");
  mainRegion.setAttribute("data-role", "main");
  mainRegion.appendChild(mockConversationSurface(source, ui));
  const plan = el(
    "section",
    "asst-plan-surface hidden assistant-panel-region assistant-panel-plan is-assistant-managed",
  );
  plan.setAttribute("data-role", "plan");
  mainRegion.appendChild(plan);
  mainRegion.appendChild(mockHintSurface(source, ui));
  mainRegion.appendChild(mockReplySurface(source, ui));
  root.appendChild(mainRegion);
  root.appendChild(mockDetailsDrawer(source, ui));
  root.appendChild(mockPermissionOverlay(source, ui));
  mount.appendChild(root);
}

function renderMockPanes() {
  mockSources.forEach(renderMockPane);
}

function renderChrome() {
  closeOpenMenu();
  renderLaneSwitcher();
  renderSubTabs();
  renderMockPanes();
}

// ---------------------------------------------------------------------------
// Host message handling (identical protocol to the production shell)
// ---------------------------------------------------------------------------

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
    // Host init only steers the real sources; the prototype starts on the
    // Zotero Agent preview pane for the Conversations lane.
    state.lastNotifiedTab = normalizeTab(
      (data.payload && data.payload.activeTab) || "acp-chat",
      "acp-chat",
    );
    renderChrome();
    updatePaneVisibility({ notify: false });
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
  if (data.type === ASSISTANT_WORKSPACE_MESSAGE_TYPES.SET_TAB) {
    ensureHostReady("host-set-tab");
    traceAction("workspace-set-tab-received", {
      activeTab: data.payload && data.payload.activeTab,
    });
    applyHostTab((data.payload && data.payload.activeTab) || "acp-chat");
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
    if (publication.publicationKind === "owner-navigation") {
      state.navigationBySource[tab] =
        publication.payload && typeof publication.payload === "object"
          ? publication.payload
          : {};
      traceAction("prototype-navigation-projection", {
        tab,
        entries: navigationEntries(tab).length,
      });
      renderLaneSwitcher();
      renderSubTabs();
    }
    postPublicationToChild(tab, publication);
    return;
  }
});

// ---------------------------------------------------------------------------
// Review hook: state inspection + programmatic navigation for screenshots.
// ---------------------------------------------------------------------------

window.__zsPrototypeShell = {
  getState: function () {
    return {
      activeLane: state.activeLane,
      activeSource: Object.assign({}, state.activeSource),
      mockUi: JSON.parse(JSON.stringify(state.mockUi)),
      navigationSources: Object.keys(state.navigationBySource),
    };
  },
  selectSource: function (source) {
    selectSource(source);
  },
  setActiveLane: function (lane) {
    setActiveLane(lane);
  },
};

function bootstrapPrototypeShell() {
  $("assistant-workspace-close")?.addEventListener("click", function () {
    void postToHost(ASSISTANT_WORKSPACE_MESSAGE_TYPES.ACTION, {
      action: ASSISTANT_WORKSPACE_SHELL_ACTIONS.CLOSE_SIDEBAR,
    });
  });
  renderChrome();
  updatePaneVisibility({ notify: false });
  updateLoadingState();
  ensureHostReady("dom-content-loaded");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrapPrototypeShell);
} else {
  bootstrapPrototypeShell();
}

attachFrameLoadListeners();
requestAllChildrenReady("script-start");
ensureHostReady("script-start");
