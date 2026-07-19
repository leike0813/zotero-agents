import { projectSkillRunnerPanelSnapshot } from "./assistantPanelModel.js";
import { renderAssistantPanelSnapshot } from "./assistantPanelRenderer.js";
import {
  adaptLegacyTranscriptItem,
  renderAssistantTranscript,
  resetAssistantTranscriptVirtualState,
} from "./assistantTranscriptRenderer.js";
import { createThinkingChatModel } from "./chatThinkingCore.js";
import {
  ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS,
  ASSISTANT_WORKSPACE_MESSAGE_TYPES,
  RUN_DIALOG_BRIDGE_TYPES,
  SKILLRUNNER_LEGACY_ACTIONS,
  SKILLRUNNER_LEGACY_ACTION_ALIASES,
  SKILLRUNNER_SIDEBAR_BRIDGE_KEY,
  resolveRunDialogMessageType,
} from "../shared/assistantWireContract.js";
import { validSkillRunnerSnapshotEnvelope } from "../shared/skillRunnerSnapshotContract.js";

const RUN_DIALOG_BRIDGE_PREFIX = RUN_DIALOG_BRIDGE_TYPES[0];
const SKILLRUNNER_SIDEBAR_BRIDGE_PREFIX = RUN_DIALOG_BRIDGE_TYPES[1];

const state = {
  snapshot: null,
  workspaceEnvelope: null,
  bridgePrefix: RUN_DIALOG_BRIDGE_PREFIX,
  hostMode: "dialog",
  drawerOpen: false,
  detailsOpen: false,
  chatDisplayMode: "plain",
  markdownParser: undefined,
  transcriptNodeMap: new Map(),
  transcriptOrderKey: "",
  transcriptModeKey: "",
  transcriptRevision: null,
  transcriptRenderedMode: "",
  transcriptContextKey: "",
  transcriptRenderToken: 0,
  transcriptPaginationVirtualizationEnabled: true,
  pendingTranscriptSnapshot: null,
  toolActivityExpandedIds: new Set(),
  drawerGroupCollapsed: new Map(),
};

const SIDEBAR_ACTION_BRIDGE_KEY = SKILLRUNNER_SIDEBAR_BRIDGE_KEY;
const runRootEl = document.getElementById("run-root");
const transcriptEl = document.getElementById("chat-panel");
const plainModeEl = document.getElementById("chat-mode-plain");
const bubbleModeEl = document.getElementById("chat-mode-bubble");
const hintEl = document.getElementById("skillrunner-hint");

function safeText(value) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function drawerGroupCollapseKey(sectionId, groupKey) {
  const section = safeText(sectionId).trim();
  const group = safeText(groupKey).trim();
  return section && group ? section + "\n" + group : "";
}

function resolveDrawerGroupKey(group) {
  return safeText(
    group &&
      (group.groupKey ||
        group.backendId ||
        group.backendDisplayName ||
        group.title),
  ).trim();
}

function applyDrawerGroupCollapseState(panelSnapshot) {
  if (!panelSnapshot || !panelSnapshot.drawers) return panelSnapshot;
  const sections = Array.isArray(panelSnapshot.drawers.skillrunnerSections)
    ? panelSnapshot.drawers.skillrunnerSections
    : Array.isArray(panelSnapshot.drawers.sections)
      ? panelSnapshot.drawers.sections
      : [];
  const nextSections = sections.map(function (section) {
    const sectionId = safeText(section && section.id).trim();
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
  if (Array.isArray(panelSnapshot.drawers.skillrunnerSections)) {
    panelSnapshot.drawers.skillrunnerSections = nextSections;
  } else {
    panelSnapshot.drawers.sections = nextSections;
  }
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
  const key = "__zsSkillRunnerSidebarTrace";
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

function envelopeSummary(envelope) {
  const source = envelope && typeof envelope === "object" ? envelope : {};
  const session =
    source.session && typeof source.session === "object"
      ? source.session
      : null;
  const workspace =
    source.workspace && typeof source.workspace === "object"
      ? source.workspace
      : null;
  return {
    hostMode: safeText(source.hostMode),
    sessionRequestId: safeText(session && session.requestId),
    sessionStatus: safeText(session && session.status),
    selectedTaskKey: safeText(workspace && workspace.selectedTaskKey),
    groups: Array.isArray(workspace && workspace.groups)
      ? workspace.groups.length
      : 0,
    transcriptPaginationVirtualizationEnabled:
      source.transcriptPaginationVirtualizationEnabled !== false,
  };
}

function normalizedStatus() {
  return safeText(state.snapshot && state.snapshot.status)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function wrappedWindow() {
  return window.wrappedJSObject && typeof window.wrappedJSObject === "object"
    ? window.wrappedJSObject
    : null;
}

function resolveSidebarActionBridge() {
  const wrapped = wrappedWindow();
  const bridge =
    (wrapped && wrapped[SIDEBAR_ACTION_BRIDGE_KEY]) ||
    window[SIDEBAR_ACTION_BRIDGE_KEY];
  return bridge && typeof bridge.sendAction === "function" ? bridge : null;
}

function sendAction(action, payload) {
  if (state.hostMode === "sidebar") {
    try {
      const sidebarBridge = resolveSidebarActionBridge();
      if (sidebarBridge) {
        trace("send-action-direct", {
          action,
          payloadKeys: Object.keys(payload || {}),
        });
        sidebarBridge.sendAction(action, payload || {});
        return;
      }
    } catch {
      // Fallback to postMessage below.
    }
  }
  const prefixes = [state.bridgePrefix || RUN_DIALOG_BRIDGE_PREFIX];
  const targets = [window.parent, window.top, window.opener];
  trace("send-action-fallback", {
    action,
    payloadKeys: Object.keys(payload || {}),
    prefixes,
  });
  prefixes.forEach(function (prefix) {
    targets.forEach(function (target) {
      if (!target) return;
      try {
        target.postMessage(
          {
            type: resolveRunDialogMessageType(prefix, "action"),
            action,
            payload: payload || {},
          },
          "*",
        );
      } catch {
        // ignored
      }
    });
  });
}

function withOptimisticSelectedTask(envelope, taskKey) {
  const key = safeText(taskKey);
  if (!key || !envelope || typeof envelope !== "object") return envelope;
  return Object.assign({}, envelope, {
    workspace: Object.assign({}, envelope.workspace || {}, {
      selectedTaskKey: key,
    }),
  });
}

function resetTranscriptVirtualState(pageKey) {
  if (
    transcriptEl &&
    typeof resetAssistantTranscriptVirtualState === "function"
  ) {
    resetAssistantTranscriptVirtualState(transcriptEl, pageKey);
  }
}

function createCompatibleThinkingChatModel(initialMode) {
  const core = { createThinkingChatModel };
  if (!core || typeof core.createThinkingChatModel !== "function") return null;
  const model = core.createThinkingChatModel(initialMode);
  if (model && typeof model.setDisplayMode === "function")
    model.setDisplayMode(initialMode);
  if (!model || typeof model.getEntries !== "function") return null;
  if (typeof model.getDisplayMode !== "function") {
    model.getDisplayMode = function () {
      return safeText(initialMode).trim().toLowerCase() === "bubble"
        ? "bubble"
        : "plain";
    };
  }
  if (typeof model.toggleRevision !== "function") {
    model.toggleRevision = function () {
      return false;
    };
  }
  return model;
}

function escapeHtml(value) {
  return safeText(value)
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
    xhtmlOut: false,
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
      // Markdown without math is acceptable.
    }
  }
  state.markdownParser = parser;
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

function toChatEvent(raw) {
  if (!raw || typeof raw !== "object") return null;
  const role = safeText(raw.role).trim().toLowerCase();
  const normalizedRole =
    role === "assistant" || role === "user" || role === "system"
      ? role
      : "system";
  const displayText = safeText(raw.displayText || raw.display_text);
  const rawText = safeText(raw.text || raw.summary);
  const kind = safeText(raw.kind);
  if (
    !(displayText || rawText).trim() &&
    kind.trim().toLowerCase() !== "assistant_revision"
  ) {
    return null;
  }
  return {
    seq: Number(raw.seq || 0),
    ts: safeText(raw.ts),
    role: normalizedRole,
    kind,
    text: rawText,
    displayText: displayText || rawText,
    displayFormat: safeText(raw.displayFormat || raw.display_format),
    attempt: Number(raw.attempt || 1),
    correlation:
      raw.correlation && typeof raw.correlation === "object"
        ? raw.correlation
        : {},
  };
}

function chatRoleText(role) {
  if (role === "assistant") return "Agent";
  if (role === "user") return "User";
  return "System";
}

function skillRunnerProcessType(source) {
  const item = source && typeof source === "object" ? source : {};
  const correlation =
    item.correlation && typeof item.correlation === "object"
      ? item.correlation
      : {};
  return safeText(
    item.processType ||
      item.process_type ||
      item.processKind ||
      correlation.process_type ||
      correlation.classification,
  )
    .trim()
    .toLowerCase();
}

function isSkillRunnerToolProcess(processType) {
  const value = safeText(processType).trim().toLowerCase();
  return value === "tool_call" || value === "command_execution";
}

function skillRunnerToolDetails(source) {
  const item = source && typeof source === "object" ? source : {};
  const correlation =
    item.correlation && typeof item.correlation === "object"
      ? item.correlation
      : {};
  const details =
    correlation.details && typeof correlation.details === "object"
      ? correlation.details
      : item.details && typeof item.details === "object"
        ? item.details
        : {};
  return { correlation, details };
}

function compactSkillRunnerToolValue(value) {
  if (Array.isArray(value)) {
    return value.map(compactSkillRunnerToolValue).filter(Boolean).join(" ");
  }
  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return safeText(value);
}

function skillRunnerToolDisplay(source, processType) {
  const item = source && typeof source === "object" ? source : {};
  const tool = skillRunnerToolDetails(item);
  const toolName =
    safeText(tool.correlation.tool_name) ||
    safeText(tool.correlation.toolName) ||
    safeText(tool.correlation.name) ||
    safeText(tool.details.tool) ||
    safeText(tool.details.name) ||
    safeText(tool.details.command) ||
    safeText(tool.details.tool_id) ||
    safeText(item.toolName) ||
    safeText(item.name) ||
    (processType === "command_execution" ? "Command" : "Tool");
  const inputSummary =
    compactSkillRunnerToolValue(tool.correlation.summary) ||
    compactSkillRunnerToolValue(tool.details.path) ||
    compactSkillRunnerToolValue(tool.details.file) ||
    compactSkillRunnerToolValue(tool.details.pattern) ||
    compactSkillRunnerToolValue(tool.details.query) ||
    compactSkillRunnerToolValue(tool.details.command) ||
    compactSkillRunnerToolValue(tool.details.args);
  const fallbackSummary = safeText(
    item.summary || item.displayText || item.display_text || item.text,
  );
  return {
    toolName,
    inputSummary: inputSummary || undefined,
    summary: inputSummary || fallbackSummary,
    text: fallbackSummary || inputSummary,
  };
}

function skillRunnerToolState(source) {
  const item = source && typeof source === "object" ? source : {};
  const tool = skillRunnerToolDetails(item);
  const value = safeText(
    item.state ||
      item.status ||
      tool.correlation.state ||
      tool.correlation.status,
  )
    .trim()
    .toLowerCase();
  return value || "completed";
}

function buildSkillRunnerToolItem(source, id, createdAt) {
  const item = source && typeof source === "object" ? source : {};
  const processType = skillRunnerProcessType(item);
  const display = skillRunnerToolDisplay(item, processType);
  return {
    id,
    kind: "tool",
    state: skillRunnerToolState(item),
    toolName: display.toolName,
    inputSummary: display.inputSummary,
    summary: display.summary,
    text: display.text,
    createdAt,
  };
}

function buildSkillRunnerProcessItem(items, id) {
  const text = (Array.isArray(items) ? items : [])
    .map(function (item) {
      return safeText(
        item.displayText || item.display_text || item.text || item.summary,
      );
    })
    .filter(Boolean)
    .join("\n");
  return text
    ? {
        id,
        kind: "process",
        label: "Thought",
        text,
      }
    : null;
}

function messageText(event) {
  return safeText(
    event &&
      (event.displayText || event.display_text || event.text || event.summary),
  );
}

function skillRunnerConversationItems(session) {
  const messages = (
    Array.isArray(session && session.messages) ? session.messages : []
  )
    .map(toChatEvent)
    .filter(Boolean);
  const model = createCompatibleThinkingChatModel(state.chatDisplayMode);
  if (!model) {
    return messages.map(function (event, index) {
      const processType = skillRunnerProcessType(event);
      if (
        event.kind === "assistant_process" &&
        isSkillRunnerToolProcess(processType)
      ) {
        return buildSkillRunnerToolItem(
          event,
          "skillrunner-tool-" + String(event.seq || index),
          event.ts,
        );
      }
      return {
        id: "skillrunner-message-" + String(event.seq || index),
        kind: event.kind === "assistant_process" ? "process" : "message",
        role: event.role,
        label:
          event.kind === "assistant_process"
            ? "Thought"
            : chatRoleText(event.role),
        text: messageText(event),
        createdAt: event.ts,
      };
    });
  }
  messages.forEach(function (event) {
    model.consume(event);
  });
  return model.getEntries().flatMap(function (entry, index) {
    if (entry.type === "thinking") {
      const items = Array.isArray(entry.items) ? entry.items : [];
      const projected = [];
      let processGroup = [];
      function flushProcessGroup(groupIndex) {
        const processItem = buildSkillRunnerProcessItem(
          processGroup,
          (entry.id || "skillrunner-process-" + String(index)) +
            "-process-" +
            String(groupIndex),
        );
        if (processItem) projected.push(processItem);
        processGroup = [];
      }
      items.forEach(function (item, itemIndex) {
        const processType = skillRunnerProcessType(item);
        if (isSkillRunnerToolProcess(processType)) {
          flushProcessGroup(itemIndex);
          projected.push(
            buildSkillRunnerToolItem(
              item,
              (entry.id || "skillrunner-process-" + String(index)) +
                "-tool-" +
                String(itemIndex),
              item.ts,
            ),
          );
          return;
        }
        processGroup.push(item);
      });
      flushProcessGroup(items.length);
      return projected;
    }
    if (entry.type === "revision") {
      const event = entry.originalEvent || entry.revisionEvent || {};
      return [
        {
          id: entry.id || "skillrunner-revision-" + String(index),
          kind: "message",
          role: "assistant",
          text: messageText(event) || "Rejected final reply",
          revision: {
            count: 1,
            latestStatus: "replaced",
            latestRepairRound: Number(event.attempt || 1),
          },
          createdAt: event.ts,
        },
      ];
    }
    const event = entry.event || {};
    return [
      {
        id: "skillrunner-message-" + String(event.seq || index),
        kind: "message",
        role: event.role || "assistant",
        text: messageText(event),
        createdAt: event.ts,
      },
    ];
  });
}

function projectAssistantPanelSnapshot(envelope) {
  const source = envelope || state.workspaceEnvelope || {};
  const hasSessionField = Object.prototype.hasOwnProperty.call(
    source,
    "session",
  );
  const session = hasSessionField
    ? source.session && typeof source.session === "object"
      ? source.session
      : {}
    : source;
  const base =
    typeof projectSkillRunnerPanelSnapshot === "function"
      ? projectSkillRunnerPanelSnapshot(source)
      : {
          kind: "skillrunner",
          context: {
            title: safeText(source.labels && source.labels.title),
            status: "idle",
          },
          lifecycle: { executionState: "idle" },
          conversation: {
            items: [],
            plan: { entries: [] },
            interaction: { kind: "hidden" },
          },
        };
  const conversationItems = skillRunnerConversationItems(session);
  return Object.assign({}, base, {
    conversation: Object.assign({}, base.conversation || {}, {
      items: conversationItems,
    }),
  });
}

function currentRequestId() {
  return safeText(state.snapshot && state.snapshot.requestId);
}

function currentTaskKey() {
  const workspace =
    state.workspaceEnvelope &&
    state.workspaceEnvelope.workspace &&
    typeof state.workspaceEnvelope.workspace === "object"
      ? state.workspaceEnvelope.workspace
      : {};
  return safeText(workspace.selectedTaskKey);
}

function snapshotTranscriptPaginationVirtualizationEnabled() {
  const source = state.workspaceEnvelope || {};
  if (
    Object.prototype.hasOwnProperty.call(
      source,
      "transcriptPaginationVirtualizationEnabled",
    )
  ) {
    return source.transcriptPaginationVirtualizationEnabled !== false;
  }
  return true;
}

function resetTranscriptRenderState() {
  state.transcriptNodeMap.clear();
  state.transcriptOrderKey = "";
  state.transcriptModeKey = "";
  state.transcriptRevision = null;
  state.transcriptRenderedMode = "";
  state.pendingTranscriptSnapshot = null;
  state.transcriptRenderToken += 1;
  state.toolActivityExpandedIds.clear();
}

function syncTranscriptContext() {
  const contextKey = currentRequestId() + "\n" + currentTaskKey();
  if (contextKey !== state.transcriptContextKey) {
    state.transcriptContextKey = contextKey;
    state.transcriptPaginationVirtualizationEnabled =
      snapshotTranscriptPaginationVirtualizationEnabled();
    resetTranscriptRenderState();
    resetTranscriptVirtualState(contextKey);
  }
}

function isStaleTranscriptRevision(revision) {
  return (
    typeof state.transcriptRevision === "number" &&
    revision < state.transcriptRevision
  );
}

function pendingOptions() {
  const ask =
    state.snapshot &&
    state.snapshot.pendingAskUser &&
    typeof state.snapshot.pendingAskUser === "object"
      ? state.snapshot.pendingAskUser
      : null;
  const raw =
    ask && Array.isArray(ask.options)
      ? ask.options
      : state.snapshot && state.snapshot.pendingOptions;
  return (Array.isArray(raw) ? raw : [])
    .map(function (option) {
      if (typeof option === "string") return { label: option, value: option };
      if (!option || typeof option !== "object") return null;
      const label = safeText(
        option.label || option.name || option.title || option.value,
      );
      const value = safeText(
        option.value || option.reply || option.message || label,
      );
      return label && value ? { label, value } : null;
    })
    .filter(Boolean);
}

function submitReply(message, payload) {
  if (!state.snapshot) return;
  const requestId = currentRequestId();
  if (!requestId) return;
  const textValue = safeText(message);
  const status = normalizedStatus();
  if (
    payload &&
    payload.mode === "auth" &&
    (payload.submission || payload.selection)
  ) {
    sendAction(
      SKILLRUNNER_LEGACY_ACTIONS.REPLY_RUN,
      Object.assign({ requestId }, payload),
    );
    return;
  }
  if (status === "waiting_auth") {
    if (!textValue) return;
    sendAction(SKILLRUNNER_LEGACY_ACTIONS.REPLY_RUN, {
      requestId,
      mode: "auth",
      authSessionId: safeText(state.snapshot.authSessionId),
      submission: {
        kind: safeText(state.snapshot.authInputKind) || "auth_code_or_url",
        value: textValue,
      },
    });
    return;
  }
  const interactionId = Number(state.snapshot.pendingInteractionId || 0);
  if (!interactionId || !textValue) return;
  const matchedOption = pendingOptions().find(function (option) {
    return option.value === textValue || option.label === textValue;
  });
  sendAction(SKILLRUNNER_LEGACY_ACTIONS.REPLY_RUN, {
    requestId,
    mode: "interaction",
    interactionId,
    responseObject: { text: textValue },
    ...(matchedOption ? { responseValue: matchedOption.value } : {}),
  });
}

function readAuthImportFiles() {
  const inputs = hintEl
    ? hintEl.querySelectorAll("input[data-assistant-auth-import-file]")
    : [];
  const jobs = [];
  inputs.forEach(function (input) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const name =
      input.getAttribute("data-assistant-auth-import-name") || file.name;
    jobs.push(
      new Promise(function (resolve, reject) {
        const reader = new FileReader();
        reader.onload = function () {
          const raw = safeText(reader.result);
          const mark = "base64,";
          const index = raw.indexOf(mark);
          if (index < 0) {
            reject(new Error("base64 conversion failed"));
            return;
          }
          resolve({ name, contentBase64: raw.slice(index + mark.length) });
        };
        reader.onerror = function () {
          reject(new Error("file read failed"));
        };
        reader.readAsDataURL(file);
      }),
    );
  });
  return Promise.all(jobs);
}

function handleAssistantPanelAction(action, payload) {
  const data = payload && typeof payload === "object" ? payload : {};
  if (action === "open-context-drawer") {
    state.drawerOpen = true;
    render(state.workspaceEnvelope || {});
    sendAction(SKILLRUNNER_LEGACY_ACTIONS.TOGGLE_DRAWER, {});
    return;
  }
  if (action === "close-context-drawer") {
    state.drawerOpen = false;
    render(state.workspaceEnvelope || {});
    sendAction(SKILLRUNNER_LEGACY_ACTIONS.CLOSE_DRAWER, {});
    return;
  }
  if (action === "open-details-drawer") {
    state.detailsOpen = true;
    render(state.workspaceEnvelope || {});
    return;
  }
  if (action === "close-details-drawer") {
    state.detailsOpen = false;
    render(state.workspaceEnvelope || {});
    return;
  }
  if (action === "toggle-drawer-group") {
    if (toggleDrawerGroup(data)) {
      render(state.workspaceEnvelope || {});
    }
    return;
  }
  if (action === SKILLRUNNER_LEGACY_ACTIONS.SELECT_TASK) {
    const taskKey = safeText(data.taskKey);
    state.drawerOpen = false;
    state.workspaceEnvelope = withOptimisticSelectedTask(
      state.workspaceEnvelope || {},
      taskKey,
    );
    render(state.workspaceEnvelope || {});
    sendAction(SKILLRUNNER_LEGACY_ACTIONS.SELECT_TASK, { taskKey });
    return;
  }
  if (
    action === SKILLRUNNER_LEGACY_ACTION_ALIASES.cancel ||
    action === SKILLRUNNER_LEGACY_ACTIONS.CANCEL_RUN
  ) {
    const requestId = currentRequestId();
    if (!requestId) return;
    sendAction(SKILLRUNNER_LEGACY_ACTIONS.CANCEL_RUN, { requestId });
    return;
  }
  if (action === SKILLRUNNER_LEGACY_ACTIONS.ARCHIVE_RUN) {
    const runKey = safeText(data.runKey || currentTaskKey());
    sendAction(SKILLRUNNER_LEGACY_ACTIONS.ARCHIVE_RUN, {
      runKey,
    });
    return;
  }
  if (
    action === SKILLRUNNER_LEGACY_ACTIONS.COPY_REQUEST_ID ||
    action === SKILLRUNNER_LEGACY_ACTIONS.COPY_DIAGNOSTICS
  ) {
    sendAction(
      action,
      Object.assign({}, data, {
        requestId: safeText(data.requestId || currentRequestId()),
      }),
    );
    return;
  }
  if (action === SKILLRUNNER_LEGACY_ACTIONS.OPEN_BACKEND_MANAGER) {
    sendAction(SKILLRUNNER_LEGACY_ACTIONS.OPEN_BACKEND_MANAGER, {});
    return;
  }
  if (
    action === SKILLRUNNER_LEGACY_ACTION_ALIASES.reply ||
    action === SKILLRUNNER_LEGACY_ACTIONS.REPLY_RUN
  ) {
    submitReply(data.message || data.value || "", data);
    return;
  }
  if (action === SKILLRUNNER_LEGACY_ACTIONS.RESOLVE_PERMISSION) {
    const requestId = safeText(data.requestId || currentRequestId());
    if (!requestId) return;
    sendAction(
      SKILLRUNNER_LEGACY_ACTIONS.RESOLVE_PERMISSION,
      Object.assign({}, data, {
        requestId,
      }),
    );
    return;
  }
  if (action === SKILLRUNNER_LEGACY_ACTIONS.AUTH_IMPORT_RUN) {
    const requestId = currentRequestId();
    if (!requestId) return;
    readAuthImportFiles()
      .then(function (files) {
        sendAction(SKILLRUNNER_LEGACY_ACTIONS.AUTH_IMPORT_RUN, {
          requestId,
          providerId: safeText(state.snapshot && state.snapshot.authProviderId),
          files,
        });
      })
      .catch(function (error) {
        sendAction(SKILLRUNNER_LEGACY_ACTIONS.AUTH_IMPORT_RUN, {
          requestId,
          providerId: safeText(state.snapshot && state.snapshot.authProviderId),
          error: safeText(error && error.message),
          files: [],
        });
      });
    return;
  }
  if (action === "set-chat-display-mode") {
    state.chatDisplayMode = data.mode === "bubble" ? "bubble" : "plain";
    render(state.workspaceEnvelope || {});
    return;
  }
  sendAction(action, data);
}

function renderTranscript(panelSnapshot) {
  if (typeof renderAssistantTranscript !== "function") return;
  const items =
    panelSnapshot.conversation &&
    Array.isArray(panelSnapshot.conversation.items)
      ? panelSnapshot.conversation.items
          .map(adaptLegacyTranscriptItem)
          .filter(Boolean)
      : [];
  const raw =
    panelSnapshot && panelSnapshot.raw
      ? panelSnapshot.raw
      : state.workspaceEnvelope || {};
  const virtualized = state.transcriptPaginationVirtualizationEnabled !== false;
  renderAssistantTranscript({
    container: transcriptEl,
    items,
    virtualized,
    ownerKey: virtualized ? state.transcriptContextKey : undefined,
    transcriptRevision: Number(raw && raw.transcriptRevision) || 0,
    mode: state.chatDisplayMode,
    variant: "skillrunner",
    renderMarkdown,
    labels:
      panelSnapshot.labels?.assistantPanel?.transcript ||
      panelSnapshot.labels?.transcript ||
      {},
    emptyText:
      (!state.snapshot && safeText(panelSnapshot.labels?.emptyTasks)) ||
      panelSnapshot.labels?.assistantPanel?.transcript?.empty ||
      panelSnapshot.labels?.transcript?.empty ||
      "No chat events yet.",
    nodeMap: state.transcriptNodeMap,
    orderKey: state.transcriptOrderKey,
    modeKey: state.transcriptModeKey,
    expandedIds: state.toolActivityExpandedIds,
    onToggleExpanded: function (id) {
      if (state.toolActivityExpandedIds.has(id)) {
        state.toolActivityExpandedIds.delete(id);
      } else {
        state.toolActivityExpandedIds.add(id);
      }
      renderTranscript(panelSnapshot);
    },
    onRendered: function (result) {
      state.transcriptOrderKey = result.orderKey;
      state.transcriptModeKey = result.modeKey;
    },
  });
}

function scheduleTranscriptMicrotask(callback) {
  if (typeof window.queueMicrotask === "function") {
    window.queueMicrotask(callback);
    return;
  }
  if (
    typeof window.Promise === "function" &&
    typeof window.Promise.resolve === "function"
  ) {
    window.Promise.resolve().then(callback);
    return;
  }
  callback();
}

function scheduleTranscriptRender(panelSnapshot) {
  syncTranscriptContext();
  const raw = panelSnapshot && panelSnapshot.raw ? panelSnapshot.raw : {};
  const revision = Number(raw && raw.transcriptRevision) || 0;
  if (isStaleTranscriptRevision(revision)) {
    return;
  }
  if (
    state.transcriptRevision === revision &&
    state.transcriptRenderedMode === state.chatDisplayMode
  ) {
    return;
  }
  const token = state.transcriptRenderToken + 1;
  state.transcriptRenderToken = token;
  state.pendingTranscriptSnapshot = panelSnapshot || null;
  const run = function () {
    if (token !== state.transcriptRenderToken) return;
    const pending = state.pendingTranscriptSnapshot;
    state.pendingTranscriptSnapshot = null;
    renderTranscript(pending || {});
    state.transcriptRevision = revision;
    state.transcriptRenderedMode = state.chatDisplayMode;
  };
  scheduleTranscriptMicrotask(run);
}

function render(envelope) {
  state.workspaceEnvelope =
    envelope && typeof envelope === "object" ? envelope : {};
  trace("render", { summary: envelopeSummary(state.workspaceEnvelope) });
  state.snapshot =
    state.workspaceEnvelope.session &&
    typeof state.workspaceEnvelope.session === "object"
      ? state.workspaceEnvelope.session
      : null;
  const panelSnapshot = projectAssistantPanelSnapshot(state.workspaceEnvelope);
  applyDrawerGroupCollapseState(panelSnapshot);
  document.title =
    panelSnapshot.context.title ||
    safeText(panelSnapshot.labels && panelSnapshot.labels.title);
  if (plainModeEl)
    plainModeEl.setAttribute(
      "aria-pressed",
      state.chatDisplayMode === "plain" ? "true" : "false",
    );
  if (bubbleModeEl)
    bubbleModeEl.setAttribute(
      "aria-pressed",
      state.chatDisplayMode === "bubble" ? "true" : "false",
    );
  if (typeof renderAssistantPanelSnapshot === "function") {
    renderAssistantPanelSnapshot(panelSnapshot, {
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
      },
      onAction: handleAssistantPanelAction,
      root: runRootEl,
      regions: {
        toolbar: document.getElementById("skillrunner-toolbar"),
        banner: document.getElementById("skillrunner-banner"),
        messageCounter: document.getElementById("skillrunner-message-counter"),
        conversation: document.getElementById(
          "skillrunner-conversation-window",
        ),
        plan: document.getElementById("skillrunner-plan"),
        hint: document.getElementById("skillrunner-hint"),
        reply: document.getElementById("reply-form"),
        drawer: document.getElementById("skillrunner-drawer"),
        details: document.getElementById("skillrunner-details"),
      },
    });
  }
  document
    .getElementById("skillrunner-drawer")
    .classList.toggle("hidden", !state.drawerOpen);
  document
    .getElementById("skillrunner-details")
    .classList.toggle("hidden", !state.detailsOpen);
  scheduleTranscriptRender(panelSnapshot);
}

function closeAllDrawers() {
  state.drawerOpen = false;
  state.detailsOpen = false;
  render(state.workspaceEnvelope || {});
}

if (plainModeEl) {
  plainModeEl.addEventListener("click", function () {
    state.chatDisplayMode = "plain";
    render(state.workspaceEnvelope || {});
  });
}
if (bubbleModeEl) {
  bubbleModeEl.addEventListener("click", function () {
    state.chatDisplayMode = "bubble";
    render(state.workspaceEnvelope || {});
  });
}

window.addEventListener("message", function (event) {
  const data = event.data;
  if (!data || typeof data !== "object") return;
  if (data.type === ASSISTANT_WORKSPACE_MESSAGE_TYPES.CHILD_READY_REQUEST) {
    sendAction(ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS.READY, {});
    return;
  }
  if (data.type === ASSISTANT_WORKSPACE_MESSAGE_TYPES.CLOSE_DRAWERS) {
    closeAllDrawers();
    return;
  }
  if (
    data.type ===
      resolveRunDialogMessageType(RUN_DIALOG_BRIDGE_PREFIX, "init") ||
    data.type ===
      resolveRunDialogMessageType(RUN_DIALOG_BRIDGE_PREFIX, "snapshot") ||
    data.type ===
      resolveRunDialogMessageType(SKILLRUNNER_SIDEBAR_BRIDGE_PREFIX, "init") ||
    data.type ===
      resolveRunDialogMessageType(SKILLRUNNER_SIDEBAR_BRIDGE_PREFIX, "snapshot")
  ) {
    const payload = data.payload || null;
    // v1 wire gate: invalid snapshots are traced and dropped before they can
    // reach the projection (which otherwise falls back to sniffing the
    // envelope itself as a session when the own `session` key is missing).
    if (!validSkillRunnerSnapshotEnvelope(payload)) {
      trace("snapshot-rejected", {
        type: data.type,
        summary: envelopeSummary(payload),
      });
      return;
    }
    state.bridgePrefix =
      String(data.type).indexOf(SKILLRUNNER_SIDEBAR_BRIDGE_PREFIX + ":") === 0
        ? SKILLRUNNER_SIDEBAR_BRIDGE_PREFIX
        : RUN_DIALOG_BRIDGE_PREFIX;
    state.hostMode =
      payload && payload.hostMode === "sidebar" ? "sidebar" : "dialog";
    const drawer =
      payload && payload.drawer && typeof payload.drawer === "object"
        ? payload.drawer
        : null;
    if (drawer && typeof drawer.open === "boolean")
      state.drawerOpen = drawer.open;
    trace("message-received", {
      type: data.type,
      summary: envelopeSummary(payload || {}),
    });
    render(payload || {});
  }
});

trace("ready-send", {});
sendAction(ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS.READY, {});
