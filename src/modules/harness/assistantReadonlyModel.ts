import type { BackendInstance } from "../../backends/types";
import { ACP_BACKEND_TYPE } from "../../config/defaults";
import { loadWorkflowManifests } from "../../workflows/loader";
import type { LoadedWorkflow } from "../../workflows/types";
import { buildAcpSidebarViewSnapshot } from "../acpSidebarModel";
import { buildAssistantPanelLabels } from "../assistantPanelLabels";
import {
  createEmptyAcpConversationSnapshot,
  normalizeAcpStatus,
  type AcpConversationSnapshot,
  type AcpRemoteSessionRestoreStatus,
} from "../acpTypes";
import { getHostBridgeServerStatus } from "../hostBridgeServer";
import { isWorkflowVisible } from "../workflowVisibility";
import {
  buildSkillRunnerSidebarSections,
  countWaitingSkillRunnerTasks,
  type SkillRunnerSidebarTaskItem,
} from "../skillRunnerSidebarModel";
import {
  createPluginStateReadonlyStore,
  cleanHarnessString,
  parseHarnessJsonObject,
  type PluginStateReadonlyRow,
} from "./pluginStateReadonly";
import { loadBackendsRegistryReadonly } from "./backendsReadonly";
import { projectSkillRunnerReadonlyRuns } from "./skillRunnerReadonlyProjection";
import type { HarnessSkillRunnerRunProjection } from "./skillRunnerReadonlyProjection";

function cleanString(value: unknown) {
  return cleanHarnessString(value);
}

function parseJsonObject(value: unknown): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, any>;
  }
  return parseHarnessJsonObject(value);
}

function rowPayload(row: PluginStateReadonlyRow): Record<string, any> {
  return parseJsonObject(row.payload || row.payload_json);
}

async function loadHarnessWorkflows(args: {
  workflowsDir?: string;
  builtinWorkflowsDir?: string;
}) {
  const [official, user] = await Promise.all([
    cleanString(args.builtinWorkflowsDir)
      ? loadWorkflowManifests(cleanString(args.builtinWorkflowsDir), {
          workflowSourceKind: "official",
        })
      : Promise.resolve({ workflows: [] }),
    cleanString(args.workflowsDir)
      ? loadWorkflowManifests(cleanString(args.workflowsDir), {
          workflowSourceKind: "user",
        })
      : Promise.resolve({ workflows: [] }),
  ]);
  const byId = new Map<string, LoadedWorkflow>();
  for (const workflow of official.workflows as LoadedWorkflow[]) {
    byId.set(workflow.manifest.id, workflow);
  }
  for (const workflow of user.workflows as LoadedWorkflow[]) {
    byId.set(workflow.manifest.id, workflow);
  }
  return Array.from(byId.values()).filter((workflow) =>
    isWorkflowVisible(workflow),
  );
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function terminalStatus(status: string) {
  return [
    "succeeded",
    "failed",
    "canceled",
    "cancelled",
    "completed",
    "done",
  ].includes(cleanString(status).toLowerCase());
}

function runtimeOption(value: unknown, fallback = "") {
  const text = cleanString(value);
  if (!text) return undefined;
  return { id: text, label: text };
}

function remoteSessionRestoreStatus(
  value: unknown,
): AcpRemoteSessionRestoreStatus {
  const status = cleanString(value);
  return (
    [
      "none",
      "unsupported",
      "pending",
      "resumed",
      "loaded",
      "fallback-new",
      "failed",
    ] as AcpRemoteSessionRestoreStatus[]
  ).includes(status as AcpRemoteSessionRestoreStatus)
    ? (status as AcpRemoteSessionRestoreStatus)
    : "none";
}

function acpRequestRows(rows: PluginStateReadonlyRow[]) {
  return rows.filter((row) => row.domain === "acp");
}

function conversationRows(rows: PluginStateReadonlyRow[]) {
  return acpRequestRows(rows).filter((row) => {
    const payload = rowPayload(row);
    if (cleanString(row.requestId) === "frontend") return false;
    return cleanString(
      payload.conversationId ||
        payload.sessionId ||
        row.requestId ||
        payload.items?.length ||
        payload.messages?.length,
    );
  });
}

function conversationIndex(rows: PluginStateReadonlyRow[]) {
  return acpRequestRows(rows).find((row) => {
    const payload = rowPayload(row);
    return (
      cleanString(payload.activeConversationId) ||
      Array.isArray(payload.sessions) ||
      cleanString(row.requestId) === "frontend"
    );
  });
}

function normalizeAcpItems(payload: Record<string, any>) {
  const items = asArray(
    payload.items || payload.transcript || payload.messages,
  );
  return items.map((item, index) => {
    const source = item && typeof item === "object" ? item : {};
    const kind = cleanString(source.kind || source.type || "message");
    const role = cleanString(source.role || "assistant");
    return {
      id: cleanString(source.id) || `acp-item-${index + 1}`,
      kind:
        kind === "thought" ||
        kind === "tool_call" ||
        kind === "plan" ||
        kind === "status"
          ? kind
          : "message",
      role: role === "user" || role === "system" ? role : "assistant",
      text: cleanString(source.text || source.content || source.message),
      state: cleanString(source.state || source.status || "complete"),
      createdAt: cleanString(source.createdAt || source.ts),
      updatedAt: cleanString(source.updatedAt || source.ts),
      ...source,
    };
  });
}

function acpConversationSnapshot(args: {
  rows: PluginStateReadonlyRow[];
  acpBackends: BackendInstance[];
}) {
  const index = conversationIndex(args.rows);
  const indexPayload = index ? rowPayload(index) : {};
  const rows = conversationRows(args.rows);
  const activeConversationId =
    cleanString(indexPayload.activeConversationId) ||
    cleanString(rows[0]?.requestId);
  const row =
    rows.find((entry) => {
      const payload = rowPayload(entry);
      return (
        cleanString(payload.conversationId || entry.requestId) ===
        activeConversationId
      );
    }) || rows[0];
  const payload = row ? rowPayload(row) : {};
  const backendId =
    cleanString(indexPayload.backendId) ||
    cleanString(row?.backendId) ||
    cleanString(payload.backendId) ||
    cleanString(args.acpBackends[0]?.id);
  const backend =
    args.acpBackends.find((entry) => entry.id === backendId) || null;
  const snapshot: AcpConversationSnapshot = {
    ...createEmptyAcpConversationSnapshot(),
    ...payload,
    backend,
    backendId,
    conversationId:
      cleanString(payload.conversationId) || cleanString(row?.requestId),
    conversationTitle:
      cleanString(payload.conversationTitle || payload.sessionTitle) ||
      "ACP Conversation",
    conversationCreatedAt: cleanString(
      payload.conversationCreatedAt || payload.createdAt,
    ),
    sessionId: cleanString(payload.sessionId),
    remoteSessionId: cleanString(payload.remoteSessionId),
    canLoadRemoteSession: payload.canLoadRemoteSession === true,
    canResumeRemoteSession: payload.canResumeRemoteSession === true,
    remoteSessionRestoreStatus: remoteSessionRestoreStatus(
      payload.remoteSessionRestoreStatus,
    ),
    remoteSessionRestoreMessage: cleanString(
      payload.remoteSessionRestoreMessage,
    ),
    status: normalizeAcpStatus(payload.status || row?.state),
    busy:
      payload.busy === true ||
      normalizeAcpStatus(payload.status || row?.state) === "prompting",
    authMethods: asArray(payload.authMethods),
    authMethodIds: asArray(payload.authMethodIds).map(cleanString),
    modeOptions: asArray(payload.modeOptions),
    currentMode:
      payload.currentMode ||
      runtimeOption(payload.mode || payload.currentModeId),
    modelOptions: asArray(payload.modelOptions),
    currentModel:
      payload.currentModel ||
      runtimeOption(payload.model || payload.currentModelId),
    displayModelOptions: asArray(payload.displayModelOptions),
    currentDisplayModel:
      payload.currentDisplayModel ||
      runtimeOption(payload.displayModel || payload.currentDisplayModelId),
    reasoningEffortOptions: asArray(payload.reasoningEffortOptions),
    currentReasoningEffort:
      payload.currentReasoningEffort ||
      runtimeOption(
        payload.reasoningEffort || payload.currentReasoningEffortId,
      ),
    pendingPermissionRequest:
      payload.pendingPermissionRequest || payload.pendingPermission || null,
    diagnostics: asArray(payload.diagnostics),
    items: normalizeAcpItems(payload) as any,
    mcpServer: payload.mcpServer || { enabled: false, running: false },
    mcpHealth: payload.mcpHealth || { status: "unknown", diagnostics: [] },
    hostBridge: getHostBridgeServerStatus(),
    updatedAt:
      cleanString(row?.updatedAt || payload.updatedAt) ||
      new Date(0).toISOString(),
  };
  return snapshot;
}

function acpFrontendSnapshot(args: {
  rows: PluginStateReadonlyRow[];
  activeSnapshot: AcpConversationSnapshot;
  acpBackends: BackendInstance[];
}) {
  const index = conversationIndex(args.rows);
  const indexPayload = index ? rowPayload(index) : {};
  const conversationRowsList = conversationRows(args.rows);
  const indexedSessions = asArray(indexPayload.sessions);
  const sessions = indexedSessions.length
    ? indexedSessions
    : conversationRowsList.map((row) => {
        const payload = rowPayload(row);
        return {
          conversationId:
            cleanString(payload.conversationId) || cleanString(row.requestId),
          title:
            cleanString(payload.conversationTitle || payload.sessionTitle) ||
            "ACP Conversation",
          messageCount: normalizeAcpItems(payload).length,
          status: normalizeAcpStatus(payload.status || row.state),
          lastError: cleanString(payload.lastError),
          createdAt: cleanString(
            payload.createdAt || payload.conversationCreatedAt,
          ),
          updatedAt: cleanString(row.updatedAt || payload.updatedAt),
          backendId: cleanString(row.backendId || payload.backendId),
        };
      });
  const backendIds = Array.from(
    new Set(
      [
        ...args.acpBackends.map((backend) => backend.id),
        args.activeSnapshot.backendId,
        ...conversationRowsList.map((row) => row.backendId),
      ].filter(Boolean),
    ),
  );
  return {
    activeBackendId: args.activeSnapshot.backendId,
    activeConversationId: args.activeSnapshot.conversationId,
    activeSnapshot: args.activeSnapshot,
    chatSessions: sessions
      .filter(
        (session) =>
          cleanString(session.backendId || args.activeSnapshot.backendId) ===
          args.activeSnapshot.backendId,
      )
      .map((session) => ({
        ...session,
        id: cleanString(session.conversationId),
        backendId: cleanString(
          session.backendId || args.activeSnapshot.backendId,
        ),
      })),
    backendChatSessions: backendIds.map((backendId) => ({
      backendId,
      displayName:
        cleanString(
          args.acpBackends.find((backend) => backend.id === backendId)
            ?.displayName,
        ) || backendId,
      sessions: sessions.filter(
        (session) =>
          cleanString(session.backendId || args.activeSnapshot.backendId) ===
          backendId,
      ),
    })),
    backends: backendIds.map((backendId) => {
      const backend = args.acpBackends.find((entry) => entry.id === backendId);
      const row = conversationRowsList.find(
        (entry) => entry.backendId === backendId,
      );
      const payload = row ? rowPayload(row) : {};
      const status =
        backendId === args.activeSnapshot.backendId
          ? args.activeSnapshot.status
          : normalizeAcpStatus(payload.status || row?.state);
      return {
        backendId,
        displayName: cleanString(backend?.displayName) || backendId,
        status,
        busy: status === "prompting",
        connected: [
          "connected",
          "prompting",
          "permission-required",
          "auth-required",
        ].includes(status),
        messageCount: sessions.filter(
          (session) =>
            cleanString(session.backendId || args.activeSnapshot.backendId) ===
            backendId,
        ).length,
        lastError: cleanString(payload.lastError),
        updatedAt: cleanString(row?.updatedAt || payload.updatedAt),
      };
    }),
    connectedCount: conversationRowsList.filter((row) =>
      ["connected", "prompting"].includes(
        cleanString(rowPayload(row).status || row.state),
      ),
    ).length,
    errorCount: conversationRowsList.filter((row) =>
      ["error", "failed"].includes(
        cleanString(rowPayload(row).status || row.state),
      ),
    ).length,
    totalMessageCount: sessions.reduce(
      (sum, session) => sum + Number(session.messageCount || 0),
      0,
    ),
    updatedAt: cleanString(index?.updatedAt || args.activeSnapshot.updatedAt),
  };
}

function summarizeAcpSkillRun(row: PluginStateReadonlyRow) {
  const payload = rowPayload(row);
  const status = cleanString(payload.status || row.state) || "running";
  return {
    requestId: cleanString(payload.requestId || row.requestId),
    status,
    backendId: cleanString(payload.backendId || row.backendId),
    backendType: cleanString(payload.backendType || ACP_BACKEND_TYPE),
    backendLabel: cleanString(
      payload.backendLabel || payload.backendId || row.backendId,
    ),
    workflowId: cleanString(payload.workflowId),
    workflowLabel: cleanString(payload.workflowLabel),
    taskName:
      cleanString(payload.taskName || payload.skillId || payload.requestId) ||
      cleanString(row.taskId),
    skillName: cleanString(payload.skillName || payload.skill_name),
    skillLabel: cleanString(payload.skillLabel || payload.skill_label),
    skillId: cleanString(payload.skillId),
    executionMode: cleanString(payload.executionMode),
    conversationState: cleanString(payload.conversationState),
    conversationRecoveryState: cleanString(payload.conversationRecoveryState),
    replyState: cleanString(payload.replyState),
    connectionActionState: cleanString(payload.connectionActionState),
    applyResultState: cleanString(payload.applyResultState),
    pendingPermission: payload.pendingPermission || null,
    activePrompt: payload.activePrompt === true,
    error: cleanString(payload.error),
    updatedAt: cleanString(payload.updatedAt || row.updatedAt),
  };
}

function acpSkillRunsSnapshot(rows: PluginStateReadonlyRow[]) {
  const runRows = rows.filter(
    (row) => row.domain === "acp" && row.scope === "skill-runs",
  );
  const runs = runRows.map(summarizeAcpSkillRun);
  const selectedRun = runs[0] || null;
  const selectedPayload = selectedRun
    ? rowPayload(
        runRows.find((row) => row.requestId === selectedRun.requestId) ||
          runRows[0],
      )
    : {};
  return {
    generatedAt: new Date().toISOString(),
    labels: {
      assistantPanel: buildAssistantPanelLabels(),
    },
    selectedRequestId: cleanString(selectedRun?.requestId),
    mcpServer: selectedPayload.mcpServer || { enabled: false, running: false },
    mcpHealth: selectedPayload.mcpHealth || {
      status: "unknown",
      diagnostics: [],
    },
    hostBridge: getHostBridgeServerStatus(),
    summary: {
      total: runs.length,
      active: runs.filter((run) => !terminalStatus(run.status)).length,
      failed: runs.filter((run) => run.status === "failed").length,
      recent: Math.min(runs.length, 20),
    },
    runs,
    selectedRun,
    selectedRuntimeOptions: selectedPayload.selectedRuntimeOptions ||
      selectedPayload.runtimeOptions || {
        modeOptions: asArray(selectedPayload.modeOptions),
        modelOptions: asArray(selectedPayload.modelOptions),
        reasoningEffortOptions: asArray(selectedPayload.reasoningEffortOptions),
      },
    selectedTask: selectedRun
      ? {
          id: selectedRun.requestId,
          requestId: selectedRun.requestId,
          workflowLabel: selectedRun.workflowLabel,
          skillName: selectedRun.skillName,
          skillLabel: selectedRun.skillLabel,
          skillId: selectedRun.skillId,
          state: selectedRun.status,
          updatedAt: selectedRun.updatedAt,
          pendingPermission: selectedRun.pendingPermission,
        }
      : undefined,
    logs: asArray(selectedPayload.logs).map((entry, index) => ({
      id: cleanString(entry.id) || `acp-skill-log-${index + 1}`,
      ts: cleanString(entry.ts || entry.createdAt),
      level: cleanString(entry.level || "info"),
      stage: cleanString(entry.stage),
      message: cleanString(entry.message),
      scope: cleanString(entry.scope || "acp-skill-run"),
    })),
  };
}

function skillRunnerTask(
  projection: HarnessSkillRunnerRunProjection,
): SkillRunnerSidebarTaskItem {
  const status = cleanString(projection.status) || "unknown";
  return {
    key: projection.runKey,
    backendId: projection.backendId,
    backendDisplayName: projection.backendLabel || "SkillRunner",
    requestId: projection.requestId,
    skillName: projection.skillName,
    skillId: projection.skillId,
    workflowLabel: projection.workflowLabel,
    status,
    stateLabel: status.replace(/[_-]+/g, " "),
    applyState: projection.applyState,
    applyAttempt: projection.applyAttempt,
    applyMaxAttempt: projection.applyMaxAttempt,
    applyNextRetryAt: projection.applyNextRetryAt,
    applyError: projection.applyError,
    applyUpdatedAt: projection.applyUpdatedAt,
    updatedAt: projection.updatedAt,
    title: projection.title || projection.runKey,
    selectable: true,
    requestAssigned: projection.requestAssigned,
    backendInteractive: projection.backendInteractive,
    canOpenStream: projection.canOpenStream,
    canCancelBackendRun: projection.canCancelBackendRun,
    canReply: projection.canReply,
    canArchiveLocalRun: projection.canArchiveLocalRun,
    skillRunnerLifecycleState: projection.skillRunnerLifecycleState,
    terminal: projection.terminal,
  };
}

function skillRunnerSession(projection?: HarnessSkillRunnerRunProjection) {
  if (!projection) return null;
  const raw = projection.raw;
  const requestPayload = parseJsonObject(raw.requestPayload);
  const pendingAuth =
    requestPayload.pendingAuth ||
    requestPayload.pending_auth ||
    requestPayload.pending_auth_method_selection ||
    {};
  const status = cleanString(projection.status) || "unknown";
  return {
    title: projection.title || "SkillRunner Run",
    backendTitle: projection.backendLabel,
    requestId: projection.requestId || "",
    runKey: projection.runKey,
    skillName: projection.skillName,
    skillId: projection.skillId,
    status,
    statusSemantics: {
      normalized: status,
      terminal: projection.terminal,
      waiting: status === "waiting_user" || status === "waiting_auth",
    },
    applyState: projection.applyState,
    applyAttempt: projection.applyAttempt,
    applyMaxAttempt: projection.applyMaxAttempt,
    applyNextRetryAt: projection.applyNextRetryAt,
    applyError: projection.applyError,
    applyUpdatedAt: projection.applyUpdatedAt,
    updatedAt: projection.updatedAt,
    engine: cleanString(requestPayload.engine),
    model: cleanString(requestPayload.model),
    pendingOwner: cleanString(
      requestPayload.pendingOwner || requestPayload.pending_owner,
    ),
    pendingInteractionId: Number(requestPayload.pendingInteractionId || 0),
    pendingKind: cleanString(
      requestPayload.pendingKind || requestPayload.pending_kind,
    ),
    pendingPrompt: cleanString(
      requestPayload.pendingPrompt || requestPayload.prompt,
    ),
    pendingOptions: asArray(
      requestPayload.pendingOptions || requestPayload.options,
    ),
    pendingRequiredFields: asArray(requestPayload.pendingRequiredFields).map(
      cleanString,
    ),
    pendingUiHints:
      requestPayload.pendingUiHints || requestPayload.ui_hints || {},
    pendingAskUser:
      requestPayload.pendingAskUser || requestPayload.ask_user || {},
    authPhase: cleanString(pendingAuth.phase || requestPayload.authPhase),
    authSessionId: cleanString(
      pendingAuth.auth_session_id || requestPayload.authSessionId,
    ),
    authProviderId: cleanString(
      pendingAuth.provider_id || requestPayload.authProviderId,
    ),
    authEngine: cleanString(pendingAuth.engine || requestPayload.authEngine),
    authPrompt: cleanString(pendingAuth.prompt || requestPayload.authPrompt),
    authChallengeKind: cleanString(
      pendingAuth.challenge_kind || requestPayload.authChallengeKind,
    ),
    authAvailableMethods: asArray(
      pendingAuth.available_methods || requestPayload.authAvailableMethods,
    ).map(cleanString),
    authAskUser: pendingAuth.ask_user || requestPayload.authAskUser || {},
    authAcceptsChatInput:
      pendingAuth.accepts_chat_input === true ||
      requestPayload.authAcceptsChatInput === true,
    authInputKind: cleanString(
      pendingAuth.input_kind || requestPayload.authInputKind,
    ),
    authUrl: cleanString(pendingAuth.auth_url || requestPayload.authUrl),
    authUserCode: cleanString(
      pendingAuth.user_code || requestPayload.authUserCode,
    ),
    authLastError: cleanString(
      pendingAuth.last_error || requestPayload.authLastError,
    ),
    authUiHints: pendingAuth.ui_hints || requestPayload.authUiHints || {},
    loading: false,
    error: projection.error || "",
    messages: asArray(
      requestPayload.messages ||
        requestPayload.chatEvents ||
        requestPayload.events,
    ).map((entry, index) => ({
      seq: Number(entry.seq || index + 1),
      ts: cleanString(entry.ts || entry.createdAt),
      role: cleanString(entry.role || "assistant"),
      kind: cleanString(entry.kind || "message"),
      text: cleanString(entry.text || entry.message || entry.content),
      displayText: cleanString(entry.displayText),
      displayFormat: cleanString(entry.displayFormat),
      attempt: Number(entry.attempt || 0) || undefined,
      correlation: entry.correlation,
    })),
    labels: {
      assistantPanel: buildAssistantPanelLabels(),
      backend: "Backend",
      requestId: "Request ID",
      status: "Status",
      engine: "Engine",
      model: "Model",
      updatedAt: "Updated At",
      pendingKind: "Pending Kind",
      pendingPrompt: "Prompt",
      loading: "Loading",
      error: "Error",
      replyPlaceholder: "Reply...",
      replyPlaceholderAlternative: "Reply...",
      reply: "Reply",
      cancel: "Cancel Run",
      close: "Close",
      chatEmpty: "No chat events yet.",
      roleAgent: "Agent",
      roleUser: "User",
      roleSystem: "System",
      roleRevision: "Revision",
      runningHintTitle: "Running",
      runningHintDesc: "Waiting for backend updates.",
      waitingUserTitle: "Waiting User",
      waitingAuthTitle: "Waiting Auth",
      pendingInputTitle: "Input required",
      interactionIdLabel: "Interaction",
      kindLabel: "kind:",
      requiredFieldsPrefix: "Required:",
      authRequiredPrompt: "Authentication required.",
      authSessionIdLabel: "Auth session",
      authEngineLabel: "Engine",
      authProviderLabel: "Provider",
      authUrlPrefix: "URL:",
      userCodePrefix: "Code:",
      lastErrorPrefix: "Error:",
      pendingMethodSelection: "Select authentication method",
      replySend: "Send",
      replyShortcut: "Enter to send",
      confirmYes: "Yes",
      confirmNo: "No",
      authPasteApiKey: "Paste API key",
      authPasteCode: "Paste code",
      authSubmitApiKey: "Submit API key",
      authSubmitCode: "Submit code",
      authAwaiting: "Awaiting authentication",
      authInProgress: "Authentication in progress",
      authImportSubmit: "Import",
      authImportHintDefault: "Import authentication files.",
      authImportRiskNotice: "Readonly harness blocks auth imports.",
      authImportRequired: "Required",
      authImportOptional: "Optional",
      authImportUnsupported: "Unsupported",
      thinkingTitle: "Thinking",
      thinkingDesc: "Processing",
      roleThinking: "Thinking",
      processReasoning: "Reasoning",
      processToolCall: "Tool call",
      processCommandExecution: "Command",
      revisionCollapsedPrefix: "Revision",
      revisionExpand: "Expand",
      revisionCollapse: "Collapse",
      finalSummaryTitle: "Summary",
      authImportFailed: "Import failed",
    },
  };
}

function skillRunnerSnapshot(projections: HarnessSkillRunnerRunProjection[]) {
  const tasks = projections.map(skillRunnerTask);
  const byBackend = new Map<string, SkillRunnerSidebarTaskItem[]>();
  for (const task of tasks) {
    const backendId = task.backendId || "skillrunner";
    byBackend.set(backendId, [...(byBackend.get(backendId) || []), task]);
  }
  const groups = Array.from(byBackend.entries()).map(
    ([backendId, entries]) => ({
      backendId,
      backendDisplayName: entries[0]?.backendDisplayName || backendId,
      disabled: false,
      collapsed: false,
      finishedCollapsed: true,
      latestUpdatedAt: entries[0]?.updatedAt || "",
      activeTasks: entries.filter((entry) => !entry.terminal),
      finishedTasks: entries.filter((entry) => entry.terminal),
    }),
  );
  const selectedTask = tasks[0];
  const selectedProjection = projections.find(
    (projection) => projection.runKey === selectedTask?.key,
  );
  const sections = buildSkillRunnerSidebarSections({
    groups,
    selectedTaskKey: selectedTask?.key,
    completedCollapsed: true,
  });
  return {
    title: "SkillRunner Workspace",
    hostMode: "sidebar" as const,
    labels: {
      assistantPanel: buildAssistantPanelLabels(),
      completedTasksTitle: "Completed",
      conversationTitle: "Conversation",
      closeSidebar: "Close",
      tasksToggle: "Runs",
      selectionTasksTitle: "Selection Tasks",
      waitingRequestId: "Waiting for request ID",
      emptyTasks: "No runs.",
      backendUnavailable: "Backend unavailable.",
    },
    session: skillRunnerSession(selectedProjection),
    workspace: {
      groups,
      selectedTaskKey: selectedTask?.key || "",
    },
    drawer: {
      open: false,
      sections,
    },
    badges: {
      waitingCount: countWaitingSkillRunnerTasks(groups),
    },
    selectionTasks: {
      tasks: tasks.map((task) => ({
        key: task.key,
        label: task.title,
        selected: task.key === selectedTask?.key,
      })),
    },
    contextHint: {
      hasRelated: tasks.length > 0,
    },
    navigation: {
      canGoBack: false,
      canGoForward: false,
    },
  };
}

export async function createAssistantReadonlyModel(
  dbPath: string,
  options: {
    workflowsDir?: string;
    builtinWorkflowsDir?: string;
  } = {},
) {
  const store = await createPluginStateReadonlyStore(dbPath);
  const loadedBackends = await loadBackendsRegistryReadonly().catch(() => ({
    backends: [] as BackendInstance[],
  }));
  const backendById = new Map(
    (loadedBackends.backends || []).map((backend) => [backend.id, backend]),
  );
  const acpBackends = (loadedBackends.backends || []).filter(
    (backend) => cleanString(backend.type) === ACP_BACKEND_TYPE,
  );
  const workflows = await loadHarnessWorkflows(options);
  function snapshot() {
    const requestRows = store.listRequestRows({ limit: 300 });
    const taskRows = store.listTaskRows({ limit: 300 });
    const skillRunnerRuns = projectSkillRunnerReadonlyRuns({
      runRows: store.listSkillRunnerRunRows({ limit: 300 }),
      sequenceRows: store.listSkillRunnerSequenceStateRows({ limit: 300 }),
      backendById,
      workflows,
    });
    const activeSnapshot = acpConversationSnapshot({
      rows: requestRows,
      acpBackends,
    });
    const frontendSnapshot = acpFrontendSnapshot({
      rows: requestRows,
      activeSnapshot,
      acpBackends,
    });
    const acpChatView = buildAcpSidebarViewSnapshot({
      target: "library",
      snapshot: activeSnapshot as any,
      frontendSnapshot: frontendSnapshot as any,
    }) as Record<string, unknown>;
    return {
      acpChat: {
        ...acpChatView,
        activeSnapshot,
        frontendSnapshot,
      },
      acpSkills: acpSkillRunsSnapshot(taskRows),
      skillrunner: skillRunnerSnapshot(skillRunnerRuns),
    };
  }
  return {
    snapshot,
    diagnostics() {
      return store.diagnostics();
    },
    close() {
      store.close();
    },
  };
}
