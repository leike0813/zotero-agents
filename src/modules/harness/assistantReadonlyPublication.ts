import type { BackendInstance } from "../../backends/types";
import { ACP_BACKEND_TYPE } from "../../config/defaults";
import { loadWorkflowManifests } from "../../workflows/loader";
import type { LoadedWorkflow } from "../../workflows/types";
import { isWorkflowVisible } from "../workflowVisibility";
import {
  ASSISTANT_WORKSPACE_ACTION_REGISTRY,
  createAcpChatWorkspaceOwner,
  createAcpSkillsWorkspaceOwner,
  createReadyTranscriptRegion,
  createSkillRunnerWorkspaceOwner,
  projectAssistantWorkspaceOptionGroup,
  projectAssistantWorkspacePermissionRequest,
  type AssistantWorkspaceOwner,
  type AssistantWorkspaceOwnerNavigation,
  type AssistantWorkspacePublication,
  type AssistantWorkspacePublicationAck,
  type AssistantWorkspacePublicationSource,
} from "../assistantWorkspacePublication";
import { AssistantWorkspacePublicationCoordinator } from "../assistantWorkspacePublicationCoordinator";
import {
  AssistantWorkspacePublicationRuntime,
  defineAssistantWorkspacePublicationAdapter,
  type AssistantWorkspacePublicationAdapter,
  type AssistantWorkspacePublicationRuntimeConfiguration,
} from "../assistantWorkspacePublicationRuntime";
import {
  createWorkspaceOwnerControl,
  readWorkspaceOwnerRegions,
  skillRunSecondaryLabel,
} from "../assistantWorkspaceSurfaceSkeleton";
import {
  createAssistantWorkspaceTranscriptPage,
  parseAssistantWorkspaceTranscriptPageRequest,
  type AssistantWorkspaceTranscriptRegion,
} from "../assistantWorkspaceTranscriptPublication";
import { buildAssistantWorkspacePublicationLabels } from "../assistantWorkspacePublicationLabels";
import {
  ASSISTANT_INTERACTION_FILE_MAX_BYTES,
  ASSISTANT_INTERACTION_TOTAL_MAX_BYTES,
  ASSISTANT_PENDING_INTERACTION_FILE_LIMIT,
  projectAssistantPendingInteraction,
  projectAssistantPendingInteractionAuth,
  projectAssistantPendingInteractionFromHints,
  type AssistantInteractionOption,
  type AssistantPendingInteraction,
  type AssistantPendingInteractionAuth,
} from "../../shared/assistantInteractionContract";
import {
  createPluginStateReadonlyStore,
  cleanHarnessString,
  parseHarnessJsonObject,
  type PluginStateReadonlyRow,
  type PluginStateReadonlyStore,
} from "./pluginStateReadonly";
import { loadBackendsRegistryReadonly } from "./backendsReadonly";
import {
  projectSkillRunnerReadonlyRuns,
  type HarnessSkillRunnerRunProjection,
} from "./skillRunnerReadonlyProjection";

/**
 * Readonly harness Assistant Workspace publication session.
 *
 * Drives the real AssistantWorkspacePublicationRuntime +
 * AssistantWorkspacePublicationCoordinator (one channel per tab source) with
 * harness-owned readonly adapters fed from the readonly plugin-state SQLite
 * store. The shell receives exactly the same child-publication envelopes as
 * in the plugin; write-capable registry actions never execute — they are
 * returned as mock-action records for the server-side action log.
 *
 * Row-normalization helpers (conversation rows, ACP item normalization, skill
 * run summaries, SkillRunner request-payload parsing) moved here from the
 * removed assistantReadonlyModel snapshot plane.
 */

type HarnessTranscriptPageRequest = {
  cursor?: number | null;
  limit?: number;
};

type HarnessAdapter = AssistantWorkspacePublicationAdapter<
  AssistantWorkspacePublicationSource,
  unknown,
  undefined,
  HarnessTranscriptPageRequest
>;

type HarnessChannel = {
  adapter: HarnessAdapter;
  runtime: AssistantWorkspacePublicationRuntime;
};

type HarnessChannels = Record<AssistantWorkspacePublicationSource, HarnessChannel>;

type HarnessSelection = {
  "acp-chat": Extract<AssistantWorkspaceOwner, { source: "acp-chat" }> | null;
  "acp-skills": Extract<
    AssistantWorkspaceOwner,
    { source: "acp-skills" }
  > | null;
  skillrunner: Extract<
    AssistantWorkspaceOwner,
    { source: "skillrunner" }
  > | null;
};

export type AssistantReadonlyPublicationBootstrap = {
  scopeKey: string;
  configuration: AssistantWorkspacePublicationRuntimeConfiguration;
  surfaceLabels: Record<
    AssistantWorkspacePublicationSource,
    ReturnType<typeof buildAssistantWorkspacePublicationLabels>
  >;
  publications: AssistantWorkspacePublication[];
};

export type AssistantReadonlyMockAction = {
  action: string;
  payload: Record<string, unknown>;
};

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

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
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

function statusToken(value: unknown): string {
  return cleanString(value).toLowerCase().replace(/[\s_]+/g, "-");
}

// ---------------------------------------------------------------------------
// ACP row normalization (from the removed assistantReadonlyModel)
// ---------------------------------------------------------------------------

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

function summarizeAcpSkillRun(row: PluginStateReadonlyRow) {
  const payload = rowPayload(row);
  const status = cleanString(payload.status || row.state) || "running";
  return {
    requestId: cleanString(payload.requestId || row.requestId),
    status,
    backendId: cleanString(payload.backendId || row.backendId),
    backendLabel: cleanString(
      payload.backendLabel || payload.backendId || row.backendId,
    ),
    workflowId: cleanString(payload.workflowId),
    workflowLabel: cleanString(payload.workflowLabel),
    taskName:
      cleanString(payload.taskName || payload.skillId || payload.requestId) ||
      cleanString(row.taskId),
    skillName: cleanString(payload.skillName || payload.skill_name),
    skillId: cleanString(payload.skillId),
    conversationState: cleanString(payload.conversationState),
    conversationRecoveryState: cleanString(payload.conversationRecoveryState),
    connectionActionState: cleanString(payload.connectionActionState),
    applyResultState: cleanString(payload.applyResultState),
    replyState: cleanString(payload.replyState),
    activePrompt: payload.activePrompt === true,
    pendingPermission: payload.pendingPermission || null,
    error: cleanString(payload.error),
    updatedAt: cleanString(payload.updatedAt || row.updatedAt),
    payload,
  };
}

// ---------------------------------------------------------------------------
// Read models
// ---------------------------------------------------------------------------

type AcpChatConversationModel = {
  backendId: string;
  conversationId: string;
  title: string;
  status: string;
  busy: boolean;
  connected: boolean;
  error: string;
  sessionId: string;
  authMethods: any[];
  modeOptions: any[];
  currentModeId: string | null;
  modelOptions: any[];
  displayModelOptions: any[];
  currentModelId: string | null;
  currentDisplayModelId: string | null;
  reasoningEffortOptions: any[];
  currentReasoningEffortId: string | null;
  pendingPermission: unknown;
  planEntries: any[];
  items: ReturnType<typeof normalizeAcpItems>;
  updatedAt: string;
};

type AcpChatData = {
  backends: BackendInstance[];
  conversations: AcpChatConversationModel[];
  defaultOwner: Extract<
    AssistantWorkspaceOwner,
    { source: "acp-chat" }
  > | null;
};

function acpChatConversationModel(
  row: PluginStateReadonlyRow,
  fallbackBackendId: string,
): AcpChatConversationModel | null {
  const payload = rowPayload(row);
  const conversationId =
    cleanString(payload.conversationId) || cleanString(row.requestId);
  const backendId =
    cleanString(payload.backendId) ||
    cleanString(row.backendId) ||
    fallbackBackendId;
  if (!conversationId || !backendId) return null;
  const status = cleanString(payload.status || row.state) || "idle";
  const currentMode = parseJsonObject(payload.currentMode);
  const currentModel = parseJsonObject(payload.currentModel);
  const currentDisplayModel = parseJsonObject(payload.currentDisplayModel);
  const currentReasoningEffort = parseJsonObject(payload.currentReasoningEffort);
  return {
    backendId,
    conversationId,
    title:
      cleanString(payload.conversationTitle || payload.sessionTitle) ||
      conversationId,
    status,
    busy: payload.busy === true || status === "prompting",
    connected: [
      "connected",
      "prompting",
      "permission-required",
      "auth-required",
    ].includes(status),
    error: cleanString(payload.lastError || payload.prerequisiteError),
    sessionId: cleanString(payload.sessionId || payload.remoteSessionId),
    authMethods: asArray(payload.authMethods),
    modeOptions: asArray(payload.modeOptions),
    currentModeId:
      cleanString(currentMode.id) ||
      cleanString(payload.mode || payload.currentModeId) ||
      null,
    modelOptions: asArray(payload.modelOptions),
    displayModelOptions: asArray(payload.displayModelOptions),
    currentModelId:
      cleanString(currentModel.id) ||
      cleanString(payload.model || payload.currentModelId) ||
      null,
    currentDisplayModelId:
      cleanString(currentDisplayModel.id) ||
      cleanString(payload.displayModel || payload.currentDisplayModelId) ||
      null,
    reasoningEffortOptions: asArray(payload.reasoningEffortOptions),
    currentReasoningEffortId:
      cleanString(currentReasoningEffort.id) ||
      cleanString(
        payload.reasoningEffort || payload.currentReasoningEffortId,
      ) ||
      null,
    pendingPermission:
      payload.pendingPermissionRequest || payload.pendingPermission || null,
    planEntries: asArray(payload.planEntries || payload.plan),
    items: normalizeAcpItems(payload),
    updatedAt: cleanString(row.updatedAt || payload.updatedAt),
  };
}

type SkillRunnerRunModel = {
  projection: HarnessSkillRunnerRunProjection;
  status: string;
  terminal: boolean;
  waiting: boolean;
  error: string;
  authRequired: boolean;
  pendingAuth: AssistantPendingInteractionAuth | null;
  pendingInteraction: AssistantPendingInteraction | null;
  pendingPermission: unknown;
  messages: any[];
};

function authMethodOptions(raw: unknown): AssistantInteractionOption[] {
  return asArray(raw)
    .map((option) => {
      if (
        typeof option === "string" ||
        typeof option === "number" ||
        typeof option === "boolean"
      ) {
        const label = String(option).trim();
        return label ? { label, value: option, description: null } : null;
      }
      if (!option || typeof option !== "object") return null;
      const entry = option as Record<string, unknown>;
      const label = cleanString(entry.label || entry.name || entry.title);
      if (!label) return null;
      return {
        label,
        value: Object.prototype.hasOwnProperty.call(entry, "value")
          ? (entry.value as AssistantInteractionOption["value"])
          : label,
        description: cleanString(entry.description) || null,
      };
    })
    .filter((entry): entry is AssistantInteractionOption => !!entry);
}

function skillRunnerRunModel(
  projection: HarnessSkillRunnerRunProjection,
): SkillRunnerRunModel {
  const raw = projection.raw;
  const requestPayload = parseJsonObject(raw.requestPayload);
  const pendingAuthRaw = parseJsonObject(
    requestPayload.pendingAuth ||
      requestPayload.pending_auth ||
      requestPayload.pending_auth_method_selection,
  );
  const status = cleanString(projection.status) || "unknown";
  const waiting = status === "waiting_user" || status === "waiting_auth";
  const authRequired = status === "waiting_auth";
  const pendingAuth =
    authRequired && Object.keys(pendingAuthRaw).length > 0
      ? projectAssistantPendingInteractionAuth({
          phase:
            cleanString(pendingAuthRaw.phase || requestPayload.authPhase) ||
            null,
          challengeKind:
            cleanString(
              pendingAuthRaw.challenge_kind || requestPayload.authChallengeKind,
            ) || null,
          prompt:
            cleanString(pendingAuthRaw.prompt || requestPayload.authPrompt) ||
            null,
          hint: null,
          inputKind:
            cleanString(
              pendingAuthRaw.input_kind || requestPayload.authInputKind,
            ) || null,
          acceptsChatInput:
            pendingAuthRaw.accepts_chat_input === true ||
            requestPayload.authAcceptsChatInput === true,
          authUrl:
            cleanString(pendingAuthRaw.auth_url || requestPayload.authUrl) ||
            null,
          userCode:
            cleanString(
              pendingAuthRaw.user_code || requestPayload.authUserCode,
            ) || null,
          lastError:
            cleanString(
              pendingAuthRaw.last_error || requestPayload.authLastError,
            ) || null,
          actionPending: false,
          actionKind: null,
          methods: authMethodOptions(
            pendingAuthRaw.available_methods ||
              requestPayload.authAvailableMethods,
          ),
          importFiles: [],
          importRiskNoticeRequired: false,
        })
      : null;
  const pendingInteraction =
    status === "waiting_user"
      ? projectAssistantPendingInteractionFromHints({
          pendingKind:
            requestPayload.pendingKind || requestPayload.pending_kind,
          uiHints:
            requestPayload.pendingUiHints || requestPayload.ui_hints,
          options: requestPayload.pendingOptions || requestPayload.options,
          files: requestPayload.pendingRequiredFields,
        })
      : null;
  return {
    projection,
    status,
    terminal: projection.terminal,
    waiting,
    error: cleanString(projection.error),
    authRequired,
    pendingAuth,
    pendingInteraction,
    pendingPermission: requestPayload.pendingPermission || null,
    messages: asArray(
      requestPayload.messages ||
        requestPayload.chatEvents ||
        requestPayload.events,
    ),
  };
}

function skillRunnerTranscriptItems(model: SkillRunnerRunModel) {
  const items: Array<Record<string, unknown>> = model.messages.map((entry, index) => {
    const source = entry && typeof entry === "object" ? entry : {};
    const kind = cleanString(source.kind);
    return {
      id:
        cleanString(source.id) ||
        `skillrunner-message-${Number(source.seq || index + 1)}`,
      kind: kind === "thought" ? "thought" : "message",
      role: cleanString(source.role) || "assistant",
      text: cleanString(
        source.displayText || source.text || source.message || source.content,
      ),
      state: "complete",
      createdAt: cleanString(source.ts || source.createdAt),
    };
  });
  const permission = projectAssistantWorkspacePermissionRequest(
    model.pendingPermission,
  );
  if (permission) {
    items.push({
      id: `skillrunner-pending-permission-${permission.requestId}`,
      kind: "permission",
      role: "assistant",
      text: "",
      state: "complete",
      createdAt: permission.review.requestedAt || "",
      permissionRequestId: permission.requestId,
      title: permission.title,
      summary: permission.summary,
      source: permission.approvalKind,
      status: "pending",
    });
  }
  return items;
}

// ---------------------------------------------------------------------------
// Transcript pagination (mirrors the production surface adapters)
// ---------------------------------------------------------------------------

function paginateTranscriptItems(args: {
  owner: AssistantWorkspaceOwner;
  items: Array<Record<string, unknown>>;
  request?: HarnessTranscriptPageRequest;
}): AssistantWorkspaceTranscriptRegion {
  const limit = Math.max(1, Math.floor(Number(args.request?.limit) || 80));
  const cursor = args.request?.cursor;
  const tail = cursor === undefined || cursor === null;
  const total = args.items.length;
  const startCursor = tail
    ? Math.max(0, total - limit)
    : Math.max(0, Math.floor(Number(cursor)));
  const pageItems = args.items.slice(startCursor, startCursor + limit);
  const page = createAssistantWorkspaceTranscriptPage({
    owner: args.owner,
    anchor: tail ? "tail" : "cursor",
    cursor: startCursor,
    limit,
    totalVisibleItemCount: total,
    previousCursor: startCursor > 0 ? Math.max(0, startCursor - limit) : null,
    nextCursor:
      !tail && startCursor + limit < total ? startCursor + limit : null,
    sourceEventSeq: total,
    items: pageItems,
  });
  return createReadyTranscriptRegion(args.owner, page, 0);
}

// Mirrors transcriptRebasePageRequest in assistantWorkspacePublicationHost.
function rebasePageRequest(
  owner: AssistantWorkspaceOwner,
  pageKey: string,
): HarnessTranscriptPageRequest {
  const suffix = pageKey.startsWith(`${owner.ownerKey}\n`)
    ? pageKey.slice(owner.ownerKey.length + 1)
    : "";
  const tail = /^tail:(\d+)$/.exec(suffix);
  if (tail) {
    return { cursor: undefined, limit: Math.max(1, Number(tail[1]) || 80) };
  }
  const cursor = /^cursor:(\d+):(\d+)$/.exec(suffix);
  if (cursor) {
    return {
      cursor: Math.max(0, Number(cursor[1]) || 0),
      limit: Math.max(1, Number(cursor[2]) || 80),
    };
  }
  return { cursor: undefined, limit: 80 };
}

function optionList(options: any[]) {
  return options
    .map((option) => ({
      id: cleanString(option?.id),
      label: cleanString(option?.label || option?.id),
    }))
    .filter((option) => option.id);
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export async function createAssistantReadonlyPublicationSession(args: {
  pluginDbPath: string;
  workflowsDir?: string;
  builtinWorkflowsDir?: string;
}) {
  const store: PluginStateReadonlyStore =
    await createPluginStateReadonlyStore(args.pluginDbPath);
  const loadedBackends = await loadBackendsRegistryReadonly().catch(() => ({
    backends: [] as BackendInstance[],
  }));
  const backendById = new Map(
    (loadedBackends.backends || []).map((backend) => [backend.id, backend]),
  );
  const acpBackends = (loadedBackends.backends || []).filter(
    (backend) => cleanString(backend.type) === ACP_BACKEND_TYPE,
  );
  const workflows = await loadHarnessWorkflows(args);

  const selection: HarnessSelection = {
    "acp-chat": null,
    "acp-skills": null,
    skillrunner: null,
  };
  let selectionInitialized = false;
  let activeTab = "acp-chat";
  let bootstrapGeneration = 0;
  let scopeKey = "";
  let channels: HarnessChannels | null = null;
  const deliveryQueue: AssistantWorkspacePublication[] = [];
  const ackRoutes = new Map<string, AssistantWorkspacePublicationRuntime>();

  function drainPublications() {
    return deliveryQueue.splice(0, deliveryQueue.length);
  }

  function readAcpChatData(): AcpChatData {
    const rows = store.listRequestRows({ limit: 300 });
    const fallbackBackendId = cleanString(acpBackends[0]?.id);
    const conversations = conversationRows(rows)
      .map((row) => acpChatConversationModel(row, fallbackBackendId))
      .filter((entry): entry is AcpChatConversationModel => !!entry);
    const index = conversationIndex(rows);
    const indexPayload = index ? rowPayload(index) : {};
    const activeConversationId =
      cleanString(indexPayload.activeConversationId) ||
      cleanString(conversations[0]?.conversationId);
    const activeBackendId =
      cleanString(indexPayload.backendId) ||
      cleanString(conversations[0]?.backendId) ||
      fallbackBackendId;
    const selected =
      conversations.find(
        (conversation) =>
          conversation.conversationId === activeConversationId &&
          (!cleanString(indexPayload.backendId) ||
            conversation.backendId === activeBackendId),
      ) || conversations[0];
    return {
      backends: acpBackends,
      conversations,
      defaultOwner: selected
        ? createAcpChatWorkspaceOwner(
            selected.backendId,
            selected.conversationId,
          )
        : null,
    };
  }

  function readAcpSkillRuns() {
    return store
      .listTaskRows({ limit: 300 })
      .filter((row) => row.domain === "acp" && row.scope === "skill-runs")
      .map(summarizeAcpSkillRun)
      .filter((run) => run.requestId);
  }

  function readSkillRunnerRuns() {
    return projectSkillRunnerReadonlyRuns({
      runRows: store.listSkillRunnerRunRows({ limit: 300 }),
      sequenceRows: store.listSkillRunnerSequenceStateRows({ limit: 300 }),
      backendById,
      workflows,
    });
  }

  function ensureSelection() {
    if (selectionInitialized) return;
    selectionInitialized = true;
    selection["acp-chat"] = readAcpChatData().defaultOwner;
    const runs = readAcpSkillRuns();
    selection["acp-skills"] = runs[0]
      ? createAcpSkillsWorkspaceOwner(runs[0].requestId)
      : null;
    const projections = readSkillRunnerRuns();
    selection.skillrunner = projections[0]
      ? createSkillRunnerWorkspaceOwner({
          requestId: projections[0].requestId,
          runKey: projections[0].runKey,
        })
      : null;
  }

  // -------------------------------------------------------------------------
  // ACP Chat surface (mirrors acpChatWorkspaceSurface over readonly data)
  // -------------------------------------------------------------------------

  function acpChatHint(conversation: AcpChatConversationModel) {
    if (conversation.error) {
      return { kind: "error" as const, message: conversation.error };
    }
    if (conversation.status === "auth-required") {
      return { kind: "auth" as const, message: null };
    }
    if (conversation.busy || conversation.status === "prompting") {
      return { kind: "running" as const, message: null };
    }
    return { kind: "hidden" as const, message: null };
  }

  function prepareAcpChatNavigation(): AssistantWorkspaceOwnerNavigation {
    const data = readAcpChatData();
    const groups = new Map<
      string,
      AssistantWorkspaceOwnerNavigation["groups"][number]
    >();
    for (const backend of data.backends) {
      groups.set(backend.id, {
        groupId: backend.id,
        label: cleanString(backend.displayName) || backend.id,
        status: "idle",
        disabledReason: null,
      });
    }
    const entries = data.conversations.map((conversation) => {
      if (!groups.has(conversation.backendId)) {
        groups.set(conversation.backendId, {
          groupId: conversation.backendId,
          label: conversation.backendId,
          status: "idle",
          disabledReason: null,
        });
      }
      return {
        owner: createAcpChatWorkspaceOwner(
          conversation.backendId,
          conversation.conversationId,
        ),
        groupId: conversation.backendId,
        label: conversation.title,
        subtitle: null,
        description: conversation.error || null,
        groupLabel: groups.get(conversation.backendId)?.label || null,
        status: conversation.status,
        backendStatus: null,
        applyState: null,
        attention: conversation.pendingPermission
          ? "permission-required"
          : conversation.error
            ? "warning"
            : null,
        updatedAt: conversation.updatedAt || null,
        messageCount: conversation.items.length,
        canArchive: false,
        submission: null,
        resumptionPending: false,
      };
    });
    const selectedOwner = selection["acp-chat"];
    return {
      selectedOwner,
      selectedGroupId: selectedOwner?.backendId || null,
      groups: [...groups.values()],
      entries,
      queuedEntries: [],
      canCreateOwner: false,
      notice: null,
    };
  }

  const acpChatAdapter = defineAssistantWorkspacePublicationAdapter({
    source: "acp-chat",
    supportedKinds: [
      "owner-navigation",
      "owner-control",
      "message-counts",
      "transcript",
      "plan",
      "permission",
      "composer",
      "owner-presentation",
    ],
    selectedOwner() {
      return selection["acp-chat"];
    },
    async readOwnerNavigation() {
      return prepareAcpChatNavigation();
    },
    mapChange() {
      // The harness never schedules store changes; initialize /
      // requestTranscriptPage / requestOwnerDetails are the only entries.
      return { owner: null, targetsActiveOwner: false, publicationKinds: [] };
    },
    async readOwnerRegions({ owner, kinds }) {
      const conversation = readAcpChatData().conversations.find(
        (entry) =>
          entry.backendId === owner.backendId &&
          entry.conversationId === owner.conversationId,
      );
      if (!conversation) return {};
      const connected = conversation.connected;
      const connectionChanging = ["connecting", "disconnecting"].includes(
        conversation.status,
      );
      const pendingPermission = Boolean(conversation.pendingPermission);
      const modelOptions = conversation.displayModelOptions.length
        ? conversation.displayModelOptions
        : conversation.modelOptions;
      const modelConfigurationEditable = connected && !conversation.busy;
      return readWorkspaceOwnerRegions({
        kinds,
        readers: {
          "message-counts": () => ({ counts: null }),
          plan: () => ({
            items: conversation.planEntries.map((entry, index) => ({
              itemId: `plan:${index}`,
              content: cleanString(entry?.content ?? entry),
              priority: cleanString(entry?.priority) || null,
              status: cleanString(entry?.status) || null,
            })),
          }),
          permission: () => ({
            request: projectAssistantWorkspacePermissionRequest(
              conversation.pendingPermission,
            ),
          }),
          composer: () => ({
            reply: {
              status:
                conversation.busy ||
                connectionChanging ||
                pendingPermission
                  ? conversation.busy
                    ? ("busy" as const)
                    : ("disabled" as const)
                  : ("enabled" as const),
            },
            runtimeOptions: {
              mode: projectAssistantWorkspaceOptionGroup(
                connected ? optionList(conversation.modeOptions) : [],
                conversation.currentModeId,
                connected && conversation.modeOptions.length > 0,
              ),
              model: projectAssistantWorkspaceOptionGroup(
                connected ? optionList(modelOptions) : [],
                conversation.currentDisplayModelId ||
                  conversation.currentModelId,
                modelConfigurationEditable && modelOptions.length > 0,
              ),
              reasoningEffort: projectAssistantWorkspaceOptionGroup(
                connected ? optionList(conversation.reasoningEffortOptions) : [],
                conversation.currentReasoningEffortId,
                modelConfigurationEditable &&
                  conversation.reasoningEffortOptions.length > 0,
              ),
            },
          }),
          "owner-presentation": () => ({
            title: "",
            subtitle: null,
            description: null,
            notice: null,
            metadata: [
              {
                fieldId: "backend" as const,
                value:
                  cleanString(
                    acpBackends.find(
                      (backend) => backend.id === conversation.backendId,
                    )?.displayName,
                  ) || conversation.backendId,
              },
              {
                fieldId: "conversation" as const,
                value: conversation.title,
              },
            ].filter((entry) => entry.value),
            usage: null,
          }),
          "owner-control": () =>
            createWorkspaceOwnerControl({
              status: conversation.status,
              busy: conversation.busy,
              hint: acpChatHint(conversation),
              interaction: null,
              connection: {
                status: conversation.status,
                sessionAvailable: Boolean(conversation.sessionId),
                connected,
                canConnect:
                  !conversation.busy && !connected && !connectionChanging,
                canDisconnect:
                  connected && !conversation.busy && !connectionChanging,
              },
              execution: {
                canCancel: conversation.busy,
                canInterrupt: false,
              },
              authentication: {
                required: conversation.status === "auth-required",
                canAuthenticate:
                  conversation.status === "auth-required" &&
                  conversation.authMethods.length > 0,
                methodId: cleanString(conversation.authMethods[0]?.id) || null,
              },
              permissionPolicy: {
                autoApprove: false,
                canSetAutoApprove: true,
              },
              badges: null,
            }),
        },
      });
    },
    async readTranscriptPage({ owner, request }) {
      const conversation = readAcpChatData().conversations.find(
        (entry) =>
          entry.backendId === owner.backendId &&
          entry.conversationId === owner.conversationId,
      );
      return paginateTranscriptItems({
        owner,
        items: (conversation?.items || []) as Array<Record<string, unknown>>,
        request,
      });
    },
  } satisfies AssistantWorkspacePublicationAdapter<
    "acp-chat",
    unknown,
    undefined,
    HarnessTranscriptPageRequest
  >);

  // -------------------------------------------------------------------------
  // ACP Skills surface (mirrors acpSkillsWorkspaceSurface over readonly data)
  // -------------------------------------------------------------------------

  function acpSkillRunHint(run: ReturnType<typeof summarizeAcpSkillRun>) {
    if (run.status === "succeeded") {
      return { kind: "completed" as const, message: null };
    }
    if (run.status === "canceled") {
      return { kind: "canceled" as const, message: null };
    }
    if (run.status === "failed") {
      return { kind: "error" as const, message: run.error || null };
    }
    if (run.error) {
      return { kind: "error" as const, message: run.error };
    }
    if (run.status === "waiting_user") {
      return { kind: "waiting_user" as const, message: null };
    }
    if (run.status === "repairing") {
      return { kind: "repairing" as const, message: null };
    }
    if (
      run.status === "queued" ||
      run.status === "running" ||
      run.activePrompt
    ) {
      return { kind: "running" as const, message: null };
    }
    return { kind: "hidden" as const, message: null };
  }

  function prepareAcpSkillsNavigation(): AssistantWorkspaceOwnerNavigation {
    const runs = readAcpSkillRuns();
    const groups = new Map<
      string,
      AssistantWorkspaceOwnerNavigation["groups"][number]
    >();
    const entries = runs.map((run) => {
      const groupId = run.backendId || "default";
      if (!groups.has(groupId)) {
        groups.set(groupId, {
          groupId,
          label: run.backendLabel || groupId,
          status: "idle",
          disabledReason: null,
        });
      }
      return {
        owner: createAcpSkillsWorkspaceOwner(run.requestId),
        groupId,
        label:
          run.taskName || run.workflowLabel || run.skillId || run.requestId,
        subtitle: skillRunSecondaryLabel(run),
        description: run.error || null,
        groupLabel: run.backendLabel || null,
        status: run.status,
        backendStatus: null,
        applyState: run.applyResultState || null,
        attention: run.pendingPermission
          ? "permission-required"
          : run.error
            ? "warning"
            : null,
        updatedAt: run.updatedAt || null,
        messageCount: normalizeAcpItems(run.payload).length,
        canArchive: terminalStatus(run.status) && !run.activePrompt,
        submission: null,
        resumptionPending: false,
      };
    });
    const selectedOwner = selection["acp-skills"];
    const selectedRun = runs.find(
      (run) => run.requestId === selectedOwner?.requestId,
    );
    return {
      selectedOwner,
      selectedGroupId: selectedRun?.backendId || null,
      groups: [...groups.values()],
      entries,
      queuedEntries: [],
      canCreateOwner: false,
      notice: null,
    };
  }

  const acpSkillsAdapter = defineAssistantWorkspacePublicationAdapter({
    source: "acp-skills",
    supportedKinds: [
      "owner-navigation",
      "owner-control",
      "message-counts",
      "transcript",
      "plan",
      "permission",
      "composer",
      "owner-presentation",
    ],
    selectedOwner() {
      return selection["acp-skills"];
    },
    async readOwnerNavigation() {
      return prepareAcpSkillsNavigation();
    },
    mapChange() {
      return { owner: null, targetsActiveOwner: false, publicationKinds: [] };
    },
    async readOwnerRegions({ owner, kinds }) {
      const run = readAcpSkillRuns().find(
        (entry) => entry.requestId === owner.requestId,
      );
      if (!run) return {};
      const connected =
        run.conversationState === "active" ||
        run.conversationRecoveryState === "connected";
      const waitingForUser =
        run.status === "waiting_user" ||
        (Boolean(run.payload.pendingInteraction) && !run.activePrompt);
      const options = parseJsonObject(
        run.payload.selectedRuntimeOptions || run.payload.runtimeOptions,
      );
      const modelOptions = asArray(
        asArray(options.displayModelOptions).length
          ? options.displayModelOptions
          : options.modelOptions,
      );
      return readWorkspaceOwnerRegions({
        kinds,
        readers: {
          "message-counts": () => ({ counts: null }),
          plan: () => ({
            items: asArray(run.payload.planEntries || run.payload.plan).map(
              (entry, index) => ({
                itemId: `plan:${index}`,
                content: cleanString(entry?.content ?? entry),
                priority: cleanString(entry?.priority) || null,
                status: cleanString(entry?.status) || null,
              }),
            ),
          }),
          permission: () => ({
            request: projectAssistantWorkspacePermissionRequest(
              run.pendingPermission,
            ),
          }),
          composer: () => ({
            reply: {
              status:
                run.activePrompt ||
                run.replyState === "submitted" ||
                run.replyState === "accepted"
                  ? ("busy" as const)
                  : waitingForUser && !run.pendingPermission
                    ? ("enabled" as const)
                    : ("disabled" as const),
            },
            runtimeOptions: {
              mode: projectAssistantWorkspaceOptionGroup(
                optionList(asArray(options.modeOptions)),
                cleanString(run.payload.acpModeId) || null,
                false,
              ),
              model: projectAssistantWorkspaceOptionGroup(
                optionList(modelOptions),
                cleanString(
                  run.payload.acpModelId || run.payload.acpRawModelId,
                ) || null,
                false,
              ),
              reasoningEffort: projectAssistantWorkspaceOptionGroup(
                optionList(asArray(options.reasoningEffortOptions)),
                cleanString(run.payload.acpReasoningEffort) || null,
                false,
              ),
            },
          }),
          "owner-presentation": () => ({
            title:
              run.taskName || run.workflowLabel || run.skillId || run.requestId,
            subtitle: skillRunSecondaryLabel(run),
            description: null,
            notice: null,
            metadata: [
              {
                fieldId: "backend" as const,
                value: run.backendLabel || run.backendId,
              },
            ].filter((entry) => entry.value),
            usage: null,
          }),
          "owner-control": () =>
            createWorkspaceOwnerControl({
              status: run.status,
              busy:
                run.status === "running" ||
                run.status === "repairing" ||
                run.activePrompt ||
                run.replyState === "submitted" ||
                run.replyState === "accepted",
              hint: acpSkillRunHint(run),
              interaction:
                waitingForUser && run.payload.pendingInteraction
                  ? projectAssistantPendingInteractionFromHints({
                      pendingKind: run.payload.pendingInteraction.kind,
                      uiHints: run.payload.pendingInteraction.uiHints,
                      options: run.payload.pendingInteraction.options,
                      files: run.payload.pendingInteraction.requiredFields,
                    })
                  : null,
              connection: {
                status:
                  run.connectionActionState ||
                  run.conversationState ||
                  run.conversationRecoveryState ||
                  "idle",
                sessionAvailable: Boolean(run.payload.sessionId),
                connected,
                canConnect: false,
                canDisconnect: false,
              },
              execution: {
                canCancel: !terminalStatus(run.status),
                canInterrupt: run.activePrompt,
              },
              authentication: {
                required: false,
                canAuthenticate: false,
                methodId: null,
              },
              permissionPolicy: {
                autoApprove: false,
                canSetAutoApprove: false,
              },
              badges: null,
            }),
        },
      });
    },
    async readTranscriptPage({ owner, request }) {
      const run = readAcpSkillRuns().find(
        (entry) => entry.requestId === owner.requestId,
      );
      return paginateTranscriptItems({
        owner,
        items: normalizeAcpItems(run?.payload || {}) as Array<
          Record<string, unknown>
        >,
        request,
      });
    },
  } satisfies AssistantWorkspacePublicationAdapter<
    "acp-skills",
    unknown,
    undefined,
    HarnessTranscriptPageRequest
  >);

  // -------------------------------------------------------------------------
  // SkillRunner surface (mirrors skillRunnerWorkspaceSurface over readonly
  // projections; see that file for the production DTO semantics)
  // -------------------------------------------------------------------------

  function skillRunnerWorkspaceHint(model: SkillRunnerRunModel) {
    if (model.status === "failed" || (model.error && model.terminal)) {
      return { kind: "error" as const, message: model.error || null };
    }
    if (model.authRequired) {
      return {
        kind: "auth" as const,
        message: model.pendingAuth?.prompt || null,
      };
    }
    if (
      model.status === "waiting_user" ||
      (model.waiting && model.pendingInteraction)
    ) {
      return { kind: "waiting_user" as const, message: null };
    }
    if (model.status === "succeeded") {
      return { kind: "completed" as const, message: null };
    }
    if (model.status === "canceled") {
      return { kind: "canceled" as const, message: null };
    }
    if (model.error) {
      return { kind: "error" as const, message: model.error };
    }
    if (!model.terminal && !model.waiting) {
      return { kind: "running" as const, message: null };
    }
    return { kind: "hidden" as const, message: null };
  }

  function skillRunnerWorkspaceInteraction(
    model: SkillRunnerRunModel,
  ): AssistantPendingInteraction | null {
    if (!model.waiting) return null;
    if (model.authRequired) {
      if (!model.pendingAuth) return null;
      const base =
        model.pendingInteraction ||
        projectAssistantPendingInteraction({
          inputKind: "open_text",
          prompt: null,
          hint: null,
          options: [],
          files: [],
          fileReply: {
            supported: false,
            maxFiles: ASSISTANT_PENDING_INTERACTION_FILE_LIMIT,
            maxFileBytes: ASSISTANT_INTERACTION_FILE_MAX_BYTES,
            maxTotalBytes: ASSISTANT_INTERACTION_TOTAL_MAX_BYTES,
          },
        });
      return base ? { ...base, auth: model.pendingAuth } : null;
    }
    return model.pendingInteraction;
  }

  function skillRunnerControlBadge(model: SkillRunnerRunModel) {
    const status = statusToken(model.status);
    const submitPhase = statusToken(model.projection.submitPhase);
    const permission = projectAssistantWorkspacePermissionRequest(
      model.pendingPermission,
    );
    if (permission) {
      return {
        state: "approval",
        tone: "warning",
        title: permission.summary || permission.title || null,
      };
    }
    if (model.pendingAuth?.phase || status === "waiting-auth") {
      return { state: "auth", tone: "warning", title: null };
    }
    if (model.projection.canReply || status === "waiting-user") {
      return { state: "input", tone: "warning", title: null };
    }
    if (!model.projection.requestAssigned || !model.projection.requestId) {
      return { state: "preparing", tone: "accent", title: null };
    }
    if (!model.projection.backendInteractive) {
      const uploading =
        submitPhase === "uploading" ||
        status === "uploading" ||
        status === "request-creating";
      return {
        state: uploading ? "submitting" : "preparing",
        tone: "accent",
        title: null,
      };
    }
    if (model.terminal) {
      return { state: "read-only", tone: "muted", title: null };
    }
    return { state: "streaming", tone: "success", title: null };
  }

  function skillRunnerComposerStatus(
    model: SkillRunnerRunModel,
  ): "enabled" | "disabled" | "busy" {
    const status = statusToken(model.status);
    if (
      model.projection.backendInteractive &&
      (status === "running" || status === "prompting")
    ) {
      return "busy";
    }
    if (model.terminal || !model.waiting) {
      return "disabled";
    }
    if (model.authRequired) {
      const auth = model.pendingAuth;
      const inputKind = statusToken(auth?.inputKind);
      const acceptsChatInput =
        auth?.acceptsChatInput === true &&
        !!inputKind &&
        inputKind !== "import-files" &&
        inputKind !== "custom-provider" &&
        statusToken(auth?.phase) !== "method-selection";
      return acceptsChatInput && auth?.actionPending !== true
        ? "enabled"
        : "disabled";
    }
    return model.projection.canReply ? "enabled" : "disabled";
  }

  function skillRunnerNavigationEntryAttention(
    projection: HarnessSkillRunnerRunProjection,
  ) {
    const status = statusToken(projection.status);
    if (status === "waiting-user" || status === "waiting-auth") {
      return projection.status;
    }
    return null;
  }

  function prepareSkillRunnerNavigation(): AssistantWorkspaceOwnerNavigation {
    const projections = readSkillRunnerRuns();
    const groups = new Map<
      string,
      AssistantWorkspaceOwnerNavigation["groups"][number]
    >();
    const entries = projections.map((projection) => {
      const groupId = projection.backendId || "skillrunner";
      if (!groups.has(groupId)) {
        groups.set(groupId, {
          groupId,
          label: projection.backendLabel || groupId,
          status: "idle",
          disabledReason: null,
        });
      }
      return {
        owner: createSkillRunnerWorkspaceOwner({
          requestId: projection.requestId,
          runKey: projection.runKey,
        }),
        groupId,
        label: projection.title || projection.runKey,
        subtitle:
          cleanString(
            projection.skillName || projection.workflowLabel,
          ) || null,
        description:
          cleanString(projection.error || projection.applyError) || null,
        groupLabel: projection.backendLabel || null,
        status: projection.status || "queued",
        backendStatus: cleanString(projection.backendStatus) || null,
        applyState: cleanString(projection.applyState) || null,
        attention: skillRunnerNavigationEntryAttention(projection),
        updatedAt: projection.updatedAt || null,
        messageCount: skillRunnerRunModel(projection).messages.length,
        canArchive:
          ["succeeded", "failed", "canceled"].includes(projection.status) ||
          cleanString(projection.applyState) === "failed",
        submission: null,
        resumptionPending: false,
      };
    });
    const selectedOwner = selection.skillrunner;
    const selectedProjection = projections.find(
      (projection) =>
        projection.runKey === selectedOwner?.runKey ||
        (projection.requestId &&
          projection.requestId === selectedOwner?.requestId),
    );
    return {
      selectedOwner,
      selectedGroupId: selectedProjection?.backendId || null,
      groups: [...groups.values()],
      entries,
      queuedEntries: [],
      canCreateOwner: false,
      notice: null,
    };
  }

  const skillRunnerAdapter = defineAssistantWorkspacePublicationAdapter({
    source: "skillrunner",
    supportedKinds: [
      "owner-navigation",
      "owner-control",
      "message-counts",
      "transcript",
      "permission",
      "composer",
      "owner-presentation",
    ],
    selectedOwner() {
      return selection.skillrunner;
    },
    async readOwnerNavigation() {
      return prepareSkillRunnerNavigation();
    },
    mapChange() {
      return { owner: null, targetsActiveOwner: false, publicationKinds: [] };
    },
    async readOwnerRegions({ owner, kinds }) {
      const projection = readSkillRunnerRuns().find(
        (entry) => entry.runKey === owner.runKey,
      );
      if (!projection) return {};
      const model = skillRunnerRunModel(projection);
      return readWorkspaceOwnerRegions({
        kinds,
        readers: {
          "message-counts": () => ({ counts: null }),
          composer: () => ({
            reply: { status: skillRunnerComposerStatus(model) },
            runtimeOptions: null,
          }),
          permission: () => ({
            request: projectAssistantWorkspacePermissionRequest(
              model.pendingPermission,
            ),
          }),
          "owner-presentation": () => ({
            title: model.projection.title || model.projection.runKey,
            subtitle:
              skillRunSecondaryLabel({
                requestId:
                  model.projection.requestId || model.projection.runKey,
                skillName: model.projection.skillId
                  ? model.projection.skillName
                  : undefined,
                skillId: model.projection.skillId,
                workflowLabel: model.projection.workflowLabel,
                sequenceStepId: model.projection.sequenceStepId,
                sequenceStepIndex: model.projection.sequenceStepIndex,
              }) ||
              (model.projection.requestId &&
              model.projection.requestId !== model.projection.title
                ? model.projection.requestId
                : null),
            description: null,
            notice:
              model.error && !model.terminal
                ? { tone: "warning" as const, text: model.error }
                : null,
            metadata: [
              {
                fieldId: "backend" as const,
                value:
                  model.projection.backendLabel || model.projection.backendId,
              },
              { fieldId: "status" as const, value: model.status },
            ].filter((entry) => entry.value),
            usage: null,
          }),
          "owner-control": () =>
            createWorkspaceOwnerControl({
              status: model.status,
              busy:
                !model.terminal &&
                !model.waiting &&
                model.status !== "queued",
              hint: skillRunnerWorkspaceHint(model),
              interaction: skillRunnerWorkspaceInteraction(model),
              connection: {
                status: "idle",
                sessionAvailable: false,
                connected: false,
                canConnect: false,
                canDisconnect: false,
              },
              execution: {
                canCancel: model.projection.canCancel && !model.terminal,
                canInterrupt: false,
              },
              authentication: {
                required: model.authRequired,
                canAuthenticate: false,
                methodId: null,
              },
              permissionPolicy: {
                autoApprove: false,
                canSetAutoApprove: false,
              },
              badges: {
                control: skillRunnerControlBadge(model),
                autoReply: null,
              },
            }),
        },
      });
    },
    async readTranscriptPage({ owner, request }) {
      const projection = readSkillRunnerRuns().find(
        (entry) => entry.runKey === owner.runKey,
      );
      const items = projection
        ? skillRunnerTranscriptItems(skillRunnerRunModel(projection))
        : [];
      return paginateTranscriptItems({
        owner,
        items: items as Array<Record<string, unknown>>,
        request,
      });
    },
  } satisfies AssistantWorkspacePublicationAdapter<
    "skillrunner",
    unknown,
    undefined,
    HarnessTranscriptPageRequest
  >);

  const adapters: Record<AssistantWorkspacePublicationSource, HarnessAdapter> =
    {
      "acp-chat": acpChatAdapter as unknown as HarnessAdapter,
      "acp-skills": acpSkillsAdapter as unknown as HarnessAdapter,
      skillrunner: skillRunnerAdapter as unknown as HarnessAdapter,
    };

  function createChannel(
    source: AssistantWorkspacePublicationSource,
    nextScopeKey: string,
  ): HarnessChannel {
    const adapter = adapters[source];
    let runtime!: AssistantWorkspacePublicationRuntime;
    const coordinator = new AssistantWorkspacePublicationCoordinator({
      scopeKey: `${nextScopeKey}-${source}`,
      getActiveOwner(ownerSource) {
        return ownerSource === source
          ? (selection[source] as AssistantWorkspaceOwner | null)
          : null;
      },
      post(publication) {
        deliveryQueue.push(publication);
        ackRoutes.set(publication.publicationId, runtime);
        // The harness child applies every publication immediately, so release
        // the coordinator's ack-gated transcript lane on the next microtask.
        // Deferred (not synchronous) because pumpTranscriptLane marks the
        // publication inFlight only after postPrepared returns.
        queueMicrotask(() => {
          coordinator.acknowledge({
            publicationId: publication.publicationId,
            stage: "render-complete",
            outcome: "accepted",
            reason: null,
            failure: null,
          });
        });
        return true;
      },
      onTranscriptRebaseRequired({ owner, pageKey }) {
        const request = rebasePageRequest(owner, pageKey);
        void runtime.requestTranscriptPage({
          adapter,
          owner,
          context: undefined,
          request,
          cause: "rebase",
          force: true,
        });
      },
    });
    runtime = new AssistantWorkspacePublicationRuntime({
      coordinator,
      activity: () => "matching-target",
    });
    return { adapter, runtime };
  }

  async function initializeChannels(cause: "initialization" | "owner-switch") {
    if (!channels) return;
    for (const source of [
      "acp-chat",
      "acp-skills",
      "skillrunner",
    ] as const) {
      const channel = channels[source];
      await channel.runtime.initialize({
        adapter: channel.adapter,
        context: undefined,
        cause,
      });
    }
  }

  async function bootstrap(): Promise<AssistantReadonlyPublicationBootstrap> {
    bootstrapGeneration += 1;
    scopeKey = `harness-assistant-${bootstrapGeneration}`;
    ensureSelection();
    if (channels) {
      for (const channel of Object.values(channels)) {
        channel.runtime.deactivate();
      }
    }
    deliveryQueue.length = 0;
    ackRoutes.clear();
    channels = {
      "acp-chat": createChannel("acp-chat", scopeKey),
      "acp-skills": createChannel("acp-skills", scopeKey),
      skillrunner: createChannel("skillrunner", scopeKey),
    };
    await initializeChannels("initialization");
    return {
      scopeKey,
      configuration: {
        executionDisplayMode: "live",
        transcriptPaginationVirtualizationEnabled: true,
        actionRegistry: ASSISTANT_WORKSPACE_ACTION_REGISTRY,
      },
      surfaceLabels: {
        "acp-chat": buildAssistantWorkspacePublicationLabels("acp-chat"),
        "acp-skills": buildAssistantWorkspacePublicationLabels("acp-skills"),
        skillrunner: buildAssistantWorkspacePublicationLabels("skillrunner"),
      },
      publications: drainPublications(),
    };
  }

  // -------------------------------------------------------------------------
  // Message routing (mirrors handleChildAction in the production action
  // router: control actions first, registry validation, local scope no-ops,
  // selection actions re-initialize, everything else is write-capable)
  // -------------------------------------------------------------------------

  function parseActionOwner(
    source: AssistantWorkspacePublicationSource,
    value: unknown,
  ): AssistantWorkspaceOwner | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }
    const owner = value as Record<string, unknown>;
    if (owner.source !== source) return null;
    if (source === "acp-chat") {
      const backendId = cleanString(owner.backendId);
      const conversationId = cleanString(owner.conversationId);
      return backendId &&
        conversationId &&
        cleanString(owner.ownerKey) === `${backendId}\n${conversationId}`
        ? createAcpChatWorkspaceOwner(backendId, conversationId)
        : null;
    }
    if (source === "acp-skills") {
      const requestId = cleanString(owner.requestId);
      return requestId && cleanString(owner.ownerKey) === requestId
        ? createAcpSkillsWorkspaceOwner(requestId)
        : null;
    }
    const requestId = cleanString(owner.requestId) || null;
    const runKey = cleanString(owner.runKey);
    return runKey && cleanString(owner.ownerKey) === (requestId || runKey)
      ? createSkillRunnerWorkspaceOwner({ requestId, runKey })
      : null;
  }

  function ownerIdentityPayload(
    owner: AssistantWorkspaceOwner | null,
  ): Record<string, unknown> {
    if (owner?.source === "acp-chat") {
      return {
        backendId: owner.backendId,
        conversationId: owner.conversationId,
      };
    }
    if (owner?.source === "acp-skills") {
      return { requestId: owner.requestId };
    }
    if (owner?.source === "skillrunner") {
      return { requestId: owner.requestId, runKey: owner.runKey };
    }
    return {};
  }

  const ACK_STAGES = [
    "shell-receive",
    "shell-forward",
    "child-apply",
    "render-complete",
  ];
  const ACK_REASONS = [
    "old-owner",
    "stale",
    "gap",
    "superseded",
    "invalid",
    "render-failed",
  ];

  function acknowledge(value: Record<string, unknown>) {
    const publicationId = cleanString(value.publicationId);
    if (!publicationId) return;
    const runtime = ackRoutes.get(publicationId);
    if (!runtime) return;
    const stage = cleanString(value.stage);
    const reason = cleanString(value.reason);
    runtime.acknowledge({
      publicationId,
      stage: (
        ACK_STAGES.includes(stage) ? stage : "render-complete"
      ) as AssistantWorkspacePublicationAck["stage"],
      outcome: value.outcome === "rejected" ? "rejected" : "accepted",
      reason: (
        ACK_REASONS.includes(reason) ? reason : null
      ) as AssistantWorkspacePublicationAck["reason"],
      failure: (
        value.failure && typeof value.failure === "object"
          ? value.failure
          : null
      ) as AssistantWorkspacePublicationAck["failure"],
    });
  }

  async function requestTranscriptPage(
    owner: AssistantWorkspaceOwner,
    request: { cursor: number | null; limit: number },
  ) {
    if (!channels) return;
    const pageRequest = {
      cursor: request.cursor ?? undefined,
      limit: request.limit,
    };
    if (owner.source === "acp-chat") {
      const channel = channels["acp-chat"];
      await channel.runtime.requestTranscriptPage({
        adapter: channel.adapter,
        owner,
        context: undefined,
        request: pageRequest,
        cause: "page-request",
      });
      await channel.runtime.flush();
      return;
    }
    if (owner.source === "acp-skills") {
      const channel = channels["acp-skills"];
      await channel.runtime.requestTranscriptPage({
        adapter: channel.adapter,
        owner,
        context: undefined,
        request: pageRequest,
        cause: "page-request",
      });
      await channel.runtime.flush();
      return;
    }
    const channel = channels.skillrunner;
    await channel.runtime.requestTranscriptPage({
      adapter: channel.adapter,
      owner,
      context: undefined,
      request: pageRequest,
      cause: "page-request",
    });
    await channel.runtime.flush();
  }

  async function requestOwnerDetails(owner: AssistantWorkspaceOwner) {
    if (!channels) return;
    const channel = channels[owner.source];
    await channel.runtime.requestOwnerDetails({
      adapter: channel.adapter,
      owner,
      context: undefined,
    });
    await channel.runtime.flush();
  }

  async function reinitializeSource(
    source: AssistantWorkspacePublicationSource,
  ) {
    if (!channels) return;
    const channel = channels[source];
    await channel.runtime.initialize({
      adapter: channel.adapter,
      context: undefined,
      cause: "owner-switch",
    });
    await channel.runtime.flush();
  }

  async function handleMessage(message: {
    type: string;
    payload: unknown;
  }): Promise<{
    publications: AssistantWorkspacePublication[];
    mockAction?: AssistantReadonlyMockAction | null;
  }> {
    const type = cleanString(message.type);
    const payload =
      message.payload &&
      typeof message.payload === "object" &&
      !Array.isArray(message.payload)
        ? (message.payload as Record<string, unknown>)
        : {};
    if (type === "assistant-workspace:publication-ack") {
      acknowledge(payload);
      return { publications: drainPublications(), mockAction: null };
    }
    if (type === "assistant-workspace:action") {
      const action = cleanString(payload.action);
      if (action === "set-tab") {
        const tab = cleanString(payload.tab);
        activeTab =
          tab === "acp-skills" || tab === "skillrunner" ? tab : "acp-chat";
        return { publications: [], mockAction: null };
      }
      // "ready" is handled by the host page (it bootstraps); anything else on
      // the shell channel (e.g. close-sidebar) is recorded, never executed.
      if (action && action !== "ready") {
        return {
          publications: [],
          mockAction: { action, payload },
        };
      }
      return { publications: [], mockAction: null };
    }
    if (type !== "assistant-workspace:child-action") {
      return { publications: [], mockAction: null };
    }
    const source =
      payload.source === "acp-chat" ||
      payload.source === "acp-skills" ||
      payload.source === "skillrunner"
        ? payload.source
        : null;
    const action = cleanString(payload.action);
    const childPayload =
      payload.payload &&
      typeof payload.payload === "object" &&
      !Array.isArray(payload.payload)
        ? (payload.payload as Record<string, unknown>)
        : {};
    if (!source || !action) {
      return { publications: [], mockAction: null };
    }
    if (action === "ready" || action === "publication-render-observation") {
      return { publications: [], mockAction: null };
    }
    if (action === "publication-ack") {
      acknowledge(childPayload);
      return { publications: drainPublications(), mockAction: null };
    }
    if (action === "load-transcript-page") {
      const pageRequest =
        parseAssistantWorkspaceTranscriptPageRequest(childPayload);
      if (pageRequest && pageRequest.owner.source === source) {
        await requestTranscriptPage(pageRequest.owner, pageRequest.request);
      }
      return { publications: drainPublications(), mockAction: null };
    }
    if (action === "request-owner-details") {
      const owner = parseActionOwner(source, payload.owner);
      if (owner) await requestOwnerDetails(owner);
      return { publications: drainPublications(), mockAction: null };
    }
    const route =
      ASSISTANT_WORKSPACE_ACTION_REGISTRY[
        action as keyof typeof ASSISTANT_WORKSPACE_ACTION_REGISTRY
      ];
    if (!route || !(route.sources as readonly string[]).includes(source)) {
      return { publications: [], mockAction: null };
    }
    if (route.scope === "local") {
      // Child-side UI state (drawers, display mode): acknowledge without
      // runtime involvement, mirroring the production host's no-op route.
      return { publications: [], mockAction: null };
    }
    const owner = parseActionOwner(source, payload.owner);
    const actionPayload = { ...childPayload, ...ownerIdentityPayload(owner) };
    if (action === "set-active-conversation" && source === "acp-chat") {
      const conversationId = cleanString(actionPayload.conversationId);
      const backendId = cleanString(actionPayload.backendId);
      if (conversationId && backendId) {
        selection["acp-chat"] = createAcpChatWorkspaceOwner(
          backendId,
          conversationId,
        );
        await reinitializeSource("acp-chat");
      }
      return { publications: drainPublications(), mockAction: null };
    }
    if (action === "set-active-backend" && source === "acp-chat") {
      const groupId = cleanString(childPayload.groupId);
      if (groupId) {
        const conversation = readAcpChatData().conversations.find(
          (entry) => entry.backendId === groupId,
        );
        selection["acp-chat"] = conversation
          ? createAcpChatWorkspaceOwner(
              conversation.backendId,
              conversation.conversationId,
            )
          : null;
        await reinitializeSource("acp-chat");
      }
      return { publications: drainPublications(), mockAction: null };
    }
    if (action === "select-run" && source === "acp-skills") {
      const requestId = cleanString(actionPayload.requestId);
      if (requestId) {
        selection["acp-skills"] = createAcpSkillsWorkspaceOwner(requestId);
        await reinitializeSource("acp-skills");
      }
      return { publications: drainPublications(), mockAction: null };
    }
    if (action === "select-task" && source === "skillrunner") {
      const runKey = cleanString(
        actionPayload.runKey || actionPayload.taskKey || actionPayload.key,
      );
      if (runKey) {
        selection.skillrunner = createSkillRunnerWorkspaceOwner({
          requestId: cleanString(actionPayload.requestId) || null,
          runKey,
        });
        await reinitializeSource("skillrunner");
      }
      return { publications: drainPublications(), mockAction: null };
    }
    // Every other registry action is write-capable in the readonly harness:
    // record it on the mock-action log and never execute it.
    return {
      publications: drainPublications(),
      mockAction: { action, payload: actionPayload },
    };
  }

  return {
    bootstrap,
    handleMessage,
    diagnostics() {
      return {
        store: store.diagnostics(),
        scopeKey,
        activeTab,
        bootstrapGeneration,
        queuedPublications: deliveryQueue.length,
      };
    },
    close() {
      if (channels) {
        for (const channel of Object.values(channels)) {
          channel.runtime.deactivate();
        }
        channels = null;
      }
      store.close();
    },
  };
}
