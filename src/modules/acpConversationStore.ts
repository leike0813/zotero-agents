import { ACP_OPENCODE_BACKEND_ID } from "../config/defaults";
import { joinPath } from "../utils/path";
import {
  PLUGIN_TASK_DOMAIN_ACP,
  deletePluginTaskRequestEntry,
  getPluginTaskRequestEntry,
  listPluginTaskRequestEntries,
  listPluginTaskRowEntries,
  replacePluginTaskRowEntries,
  upsertPluginTaskRequestEntry,
} from "./pluginStateStore";
import {
  getRuntimePersistencePaths,
  removeRuntimePath,
} from "./runtimePersistence";
import {
  cloneAcpSelectableOption,
  createEmptyAcpConversationSnapshot,
  normalizeAcpStatus,
  type AcpAuthMethod,
  type AcpAvailableCommand,
  type AcpChatSessionSummary,
  type AcpConversationItem,
  type AcpConversationSnapshot,
  type AcpDiagnosticsEntry,
  type AcpHostContext,
  type AcpPendingPermissionRequest,
  type AcpSelectableOption,
  type AcpUsageSummary,
} from "./acpTypes";
import { resolveAcpChatTranscriptPaths } from "./acpConversationTranscriptStore";

const ACP_SCOPE_ACTIVE = "active";
const ACP_FRONTEND_REQUEST_ID = "frontend";

function legacyConversationRequestId(backendId: string) {
  return `conversation:${backendId}`;
}

function conversationRequestId(backendId: string, conversationId: string) {
  return `conversation:${backendId}:${conversationId}`;
}

function sessionIndexRequestId(backendId: string) {
  return `conversation-index:${backendId}`;
}

function nowIso() {
  return new Date().toISOString();
}

function nextOpaqueId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function truncatePreview(value: unknown) {
  const text = normalizeString(value);
  if (!text) {
    return undefined;
  }
  return text.length > 8 * 1024
    ? `${text.slice(0, 8 * 1024)}...<truncated>`
    : text;
}

function normalizeChatDisplayMode(value: unknown) {
  return normalizeString(value) === "bubble" ? "bubble" : "plain";
}

function normalizeRemoteSessionRestoreStatus(value: unknown) {
  switch (normalizeString(value)) {
    case "unsupported":
    case "pending":
    case "resumed":
    case "loaded":
    case "fallback-new":
    case "failed":
      return normalizeString(value) as
        | "unsupported"
        | "pending"
        | "resumed"
        | "loaded"
        | "fallback-new"
        | "failed";
    default:
      return "none" as const;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseSelectableOption(
  value: unknown,
): AcpSelectableOption | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const id = normalizeString(value.id);
  const label = normalizeString(value.label);
  if (!id || !label) {
    return undefined;
  }
  return {
    id,
    label,
    description: normalizeString(value.description) || undefined,
  };
}

function parseSelectableOptionArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as AcpSelectableOption[];
  }
  return value
    .map((entry) => parseSelectableOption(entry))
    .filter((entry): entry is AcpSelectableOption => !!entry);
}

function parseAuthMethods(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as AcpAuthMethod[];
  }
  const normalized: AcpAuthMethod[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) {
      continue;
    }
    const id = normalizeString(entry.id);
    const name = normalizeString(entry.name);
    if (!id || !name) {
      continue;
    }
    normalized.push({
      id,
      name,
      description: normalizeString(entry.description) || undefined,
    });
  }
  return normalized;
}

function parseAvailableCommands(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as AcpAvailableCommand[];
  }
  const normalized: AcpAvailableCommand[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) {
      continue;
    }
    const name = normalizeString(entry.name);
    if (!name) {
      continue;
    }
    normalized.push({
      name,
      title: normalizeString(entry.title) || undefined,
      description: normalizeString(entry.description) || undefined,
    });
  }
  return normalized;
}

function parseUsage(value: unknown): AcpUsageSummary | null {
  if (!isRecord(value)) {
    return null;
  }
  const used = Number(value.used || 0);
  const size = Number(value.size || 0);
  if (!Number.isFinite(used) || !Number.isFinite(size)) {
    return null;
  }
  return {
    used: Math.max(0, Math.floor(used)),
    size: Math.max(0, Math.floor(size)),
    costText: normalizeString(value.costText) || undefined,
  };
}

function parsePendingPermissionRequest(
  value: unknown,
): AcpPendingPermissionRequest | null {
  if (!isRecord(value)) {
    return null;
  }
  const requestId = normalizeString(value.requestId);
  if (!requestId) {
    return null;
  }
  const options = Array.isArray(value.options)
    ? value.options.reduce(
        (acc, entry) => {
          if (!isRecord(entry)) {
            return acc;
          }
          const optionId = normalizeString(entry.optionId);
          const name = normalizeString(entry.name);
          if (!optionId || !name) {
            return acc;
          }
          acc.push({
            optionId,
            kind: normalizeString(entry.kind),
            name,
            description: normalizeString(entry.description) || undefined,
          });
          return acc;
        },
        [] as AcpPendingPermissionRequest["options"],
      )
    : [];
  return {
    requestId,
    sessionId: normalizeString(value.sessionId),
    toolCallId: normalizeString(value.toolCallId),
    toolTitle: normalizeString(value.toolTitle),
    source: normalizeString(value.source) || undefined,
    summary: normalizeString(value.summary) || undefined,
    detail: normalizeString(value.detail) || undefined,
    requestedAt: normalizeString(value.requestedAt) || nowIso(),
    options,
  };
}

function parseDiagnostics(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as AcpDiagnosticsEntry[];
  }
  return value
    .map((entry) => {
      if (!isRecord(entry)) {
        return undefined;
      }
      const id = normalizeString(entry.id);
      if (!id) {
        return undefined;
      }
      const level = normalizeString(entry.level);
      const normalized: AcpDiagnosticsEntry = {
        id,
        ts: normalizeString(entry.ts) || nowIso(),
        kind: normalizeString(entry.kind),
        level:
          level === "warn" || level === "error"
            ? (level as "warn" | "error")
            : "info",
        message: normalizeString(entry.message),
        detail: normalizeString(entry.detail),
        stage: normalizeString(entry.stage) || undefined,
        errorName: normalizeString(entry.errorName) || undefined,
        stack: normalizeString(entry.stack) || undefined,
        cause: normalizeString(entry.cause) || undefined,
        code:
          typeof entry.code === "number" || typeof entry.code === "string"
            ? entry.code
            : undefined,
        data: entry.data,
        raw: entry.raw,
      };
      return normalized;
    })
    .filter((entry): entry is AcpDiagnosticsEntry => !!entry);
}

function parseHostContext(value: unknown): AcpHostContext | null {
  if (!isRecord(value)) {
    return null;
  }
  const target =
    normalizeString(value.target) === "reader" ? "reader" : "library";
  const currentItem =
    isRecord(value.currentItem) &&
    (Number(value.currentItem.id || 0) > 0 ||
      normalizeString(value.currentItem.key) ||
      normalizeString(value.currentItem.title))
      ? {
          id:
            Number.isFinite(Number(value.currentItem.id || 0)) &&
            Number(value.currentItem.id || 0) > 0
              ? Math.floor(Number(value.currentItem.id || 0))
              : undefined,
          key: normalizeString(value.currentItem.key) || undefined,
          title: normalizeString(value.currentItem.title) || undefined,
        }
      : undefined;
  return {
    target,
    libraryId: normalizeString(value.libraryId) || undefined,
    selectionEmpty: value.selectionEmpty === true,
    currentItem,
  };
}

function normalizeSnapshotPayload(args: {
  backendId: string;
  payload: string;
}) {
  const snapshot = createEmptyAcpConversationSnapshot();
  snapshot.backendId = args.backendId;
  try {
    const parsed = JSON.parse(
      String(args.payload || "{}"),
    ) as Partial<AcpConversationSnapshot>;
    snapshot.conversationId = normalizeString(parsed.conversationId);
    snapshot.conversationTitle = normalizeString(parsed.conversationTitle);
    snapshot.conversationCreatedAt =
      normalizeString(parsed.conversationCreatedAt) || nowIso();
    snapshot.sessionId = normalizeString(parsed.sessionId);
    snapshot.remoteSessionId =
      normalizeString(parsed.remoteSessionId) || snapshot.sessionId;
    snapshot.canLoadRemoteSession = parsed.canLoadRemoteSession === true;
    snapshot.canResumeRemoteSession = parsed.canResumeRemoteSession === true;
    snapshot.remoteSessionRestoreStatus = normalizeRemoteSessionRestoreStatus(
      parsed.remoteSessionRestoreStatus,
    );
    snapshot.remoteSessionRestoreMessage = String(
      parsed.remoteSessionRestoreMessage || "",
    );
    snapshot.status = normalizeAcpStatus(parsed.status);
    snapshot.busy = parsed.busy === true;
    snapshot.showDiagnostics = parsed.showDiagnostics === true;
    snapshot.statusExpanded = parsed.statusExpanded === true;
    snapshot.chatDisplayMode = normalizeChatDisplayMode(parsed.chatDisplayMode);
    snapshot.autoApproveAcpPermissions =
      parsed.autoApproveAcpPermissions === true;
    snapshot.lastError = String(parsed.lastError || "");
    snapshot.prerequisiteError = String(parsed.prerequisiteError || "");
    snapshot.authMethods = parseAuthMethods(parsed.authMethods);
    snapshot.authMethodIds =
      snapshot.authMethods.length > 0
        ? snapshot.authMethods.map((entry) => entry.id)
        : Array.isArray(parsed.authMethodIds)
          ? parsed.authMethodIds
              .map((entry) => normalizeString(entry))
              .filter(Boolean)
          : [];
    snapshot.commandLabel = normalizeString(parsed.commandLabel);
    snapshot.commandLine = normalizeString(parsed.commandLine);
    snapshot.agentLabel = normalizeString(parsed.agentLabel);
    snapshot.agentVersion = normalizeString(parsed.agentVersion);
    snapshot.sessionTitle = normalizeString(parsed.sessionTitle);
    snapshot.sessionUpdatedAt = normalizeString(parsed.sessionUpdatedAt);
    snapshot.modeOptions = parseSelectableOptionArray(parsed.modeOptions);
    snapshot.currentMode = parseSelectableOption(parsed.currentMode);
    snapshot.modelOptions = parseSelectableOptionArray(parsed.modelOptions);
    snapshot.currentModel = parseSelectableOption(parsed.currentModel);
    snapshot.displayModelOptions = parseSelectableOptionArray(
      parsed.displayModelOptions,
    );
    snapshot.currentDisplayModel = parseSelectableOption(
      parsed.currentDisplayModel,
    );
    snapshot.reasoningEffortOptions = parseSelectableOptionArray(
      parsed.reasoningEffortOptions,
    );
    snapshot.currentReasoningEffort = parseSelectableOption(
      parsed.currentReasoningEffort,
    );
    snapshot.availableCommands = parseAvailableCommands(
      parsed.availableCommands,
    );
    snapshot.lastStopReason = normalizeString(parsed.lastStopReason);
    snapshot.usage = parseUsage(parsed.usage);
    snapshot.pendingPermissionRequest = parsePendingPermissionRequest(
      parsed.pendingPermissionRequest,
    );
    snapshot.diagnostics = parseDiagnostics(parsed.diagnostics);
    snapshot.transcriptPath = normalizeString(parsed.transcriptPath);
    snapshot.transcriptIndexPath = normalizeString(parsed.transcriptIndexPath);
    snapshot.transcriptRevision = Math.max(
      0,
      Math.floor(Number(parsed.transcriptRevision || 0) || 0),
    );
    snapshot.transcriptEventSeq = Math.max(
      snapshot.transcriptRevision,
      Math.floor(Number(parsed.transcriptEventSeq || 0) || 0),
    );
    snapshot.transcriptItemCount = Math.max(
      0,
      Math.floor(Number(parsed.transcriptItemCount || 0) || 0),
    );
    snapshot.transcriptPreview = truncatePreview(parsed.transcriptPreview);
    snapshot.lastHostContext = parseHostContext(parsed.lastHostContext);
    snapshot.agentWorkspaceDir = normalizeString(parsed.agentWorkspaceDir);
    const legacyParsed = parsed as Partial<AcpConversationSnapshot> & {
      privateStorageDir?: unknown;
    };
    snapshot.conversationStorageDir = normalizeString(
      parsed.conversationStorageDir || legacyParsed.privateStorageDir,
    );
    snapshot.sessionCwd = normalizeString(parsed.sessionCwd);
    snapshot.workspaceDir = normalizeString(parsed.workspaceDir);
    snapshot.runtimeDir = normalizeString(parsed.runtimeDir);
    snapshot.stderrTail = normalizeString(parsed.stderrTail);
    snapshot.lastLifecycleEvent = normalizeString(parsed.lastLifecycleEvent);
    snapshot.updatedAt = normalizeString(parsed.updatedAt) || nowIso();
  } catch {
    snapshot.updatedAt = nowIso();
  }
  return snapshot;
}

export function resolveAcpChatRuntimePaths(
  backendIdRaw: string,
  conversationIdRaw?: string,
) {
  const backendId =
    String(backendIdRaw || "").trim() || ACP_OPENCODE_BACKEND_ID;
  const conversationId = normalizeString(conversationIdRaw);
  const paths = getRuntimePersistencePaths();
  const agentWorkspaceDir = paths.acpChatWorkspaceDir;
  const conversationStorageDir = conversationId
    ? joinPath(paths.acpChatConversationsDir, backendId, conversationId)
    : joinPath(paths.acpChatConversationsDir, backendId);
  return {
    agentWorkspaceDir,
    conversationStorageDir,
    workspaceDir: agentWorkspaceDir,
    storageDir: conversationStorageDir,
    runtimeDir: conversationStorageDir,
  };
}

function deriveConversationTitle(args: {
  snapshot: AcpConversationSnapshot;
  items: AcpConversationItem[];
}) {
  const explicit = normalizeString(args.snapshot.conversationTitle);
  if (explicit) {
    return explicit;
  }
  const firstUserMessage = args.items.find(
    (item) => item.kind === "message" && item.role === "user",
  );
  const text =
    firstUserMessage && firstUserMessage.kind === "message"
      ? normalizeString(firstUserMessage.text)
      : "";
  if (text) {
    return text.length > 48 ? `${text.slice(0, 48)}...` : text;
  }
  return "New Conversation";
}

function normalizeSessionSummary(
  value: unknown,
): AcpChatSessionSummary | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const conversationId = normalizeString(value.conversationId);
  if (!conversationId) {
    return undefined;
  }
  return {
    conversationId,
    title: normalizeString(value.title) || "New Conversation",
    messageCount: Math.max(0, Math.floor(Number(value.messageCount || 0))),
    status: normalizeAcpStatus(value.status),
    lastError: normalizeString(value.lastError),
    createdAt: normalizeString(value.createdAt) || nowIso(),
    updatedAt: normalizeString(value.updatedAt) || nowIso(),
    archivedAt: normalizeString(value.archivedAt) || undefined,
  };
}

function isVisibleSession(session: AcpChatSessionSummary) {
  return !normalizeString(session.archivedAt);
}

function normalizeSessionIndexPayload(payload: string) {
  try {
    const parsed = JSON.parse(String(payload || "{}")) as {
      activeConversationId?: unknown;
      sessions?: unknown;
    };
    return {
      activeConversationId: normalizeString(parsed.activeConversationId),
      sessions: Array.isArray(parsed.sessions)
        ? parsed.sessions
            .map((entry) => normalizeSessionSummary(entry))
            .filter((entry): entry is AcpChatSessionSummary => !!entry)
        : [],
    };
  } catch {
    return {
      activeConversationId: "",
      sessions: [] as AcpChatSessionSummary[],
    };
  }
}

function removeConversationRowsByRequestId(requestIds: Set<string>) {
  if (requestIds.size === 0) {
    return;
  }
  const preservedRows = listPluginTaskRowEntries(
    PLUGIN_TASK_DOMAIN_ACP,
    ACP_SCOPE_ACTIVE,
  ).filter((entry) => !requestIds.has(String(entry.requestId || "").trim()));
  replacePluginTaskRowEntries(
    PLUGIN_TASK_DOMAIN_ACP,
    ACP_SCOPE_ACTIVE,
    preservedRows,
  );
}

function removeConversationStorageDir(
  backendId: string,
  conversationId: string,
) {
  const paths = resolveAcpChatRuntimePaths(backendId, conversationId);
  void removeRuntimePath(paths.conversationStorageDir);
}

function writeAcpChatSessionIndex(args: {
  backendId: string;
  activeConversationId: string;
  sessions: AcpChatSessionSummary[];
}) {
  const backendId =
    String(args.backendId || "").trim() || ACP_OPENCODE_BACKEND_ID;
  const unique = new Map<string, AcpChatSessionSummary>();
  for (const session of args.sessions) {
    const conversationId = normalizeString(session.conversationId);
    if (!conversationId) {
      continue;
    }
    unique.set(conversationId, {
      ...session,
      conversationId,
      title: normalizeString(session.title) || "New Conversation",
      status: normalizeAcpStatus(session.status),
      createdAt: normalizeString(session.createdAt) || nowIso(),
      updatedAt: normalizeString(session.updatedAt) || nowIso(),
      archivedAt: normalizeString(session.archivedAt) || undefined,
    });
  }
  const sessions = Array.from(unique.values()).sort((left, right) =>
    String(right.updatedAt || "").localeCompare(String(left.updatedAt || "")),
  );
  const activeConversationId =
    normalizeString(args.activeConversationId) ||
    sessions.find(isVisibleSession)?.conversationId ||
    sessions[0]?.conversationId ||
    "";
  upsertPluginTaskRequestEntry(PLUGIN_TASK_DOMAIN_ACP, {
    requestId: sessionIndexRequestId(backendId),
    backendId,
    state: "active",
    updatedAt: nowIso(),
    payload: JSON.stringify({
      activeConversationId,
      sessions,
    }),
  });
}

function readStoredAcpChatSessionIndex(backendIdRaw: string) {
  const backendId =
    String(backendIdRaw || "").trim() || ACP_OPENCODE_BACKEND_ID;
  const requestEntry = getPluginTaskRequestEntry(
    PLUGIN_TASK_DOMAIN_ACP,
    sessionIndexRequestId(backendId),
  );
  if (!requestEntry) {
    return {
      activeConversationId: "",
      sessions: [] as AcpChatSessionSummary[],
    };
  }
  const parsed = normalizeSessionIndexPayload(requestEntry.payload);
  const existingRequestIds = new Set(
    listPluginTaskRequestEntries(PLUGIN_TASK_DOMAIN_ACP)
      .filter((entry) => String(entry.backendId || "").trim() === backendId)
      .map((entry) => String(entry.requestId || "").trim()),
  );
  return {
    activeConversationId: parsed.activeConversationId,
    sessions: parsed.sessions.filter((session) =>
      existingRequestIds.has(
        conversationRequestId(backendId, session.conversationId),
      ),
    ),
  };
}

function removeLegacyConversationIfNeeded(backendId: string) {
  const legacyRequestId = legacyConversationRequestId(backendId);
  const legacyEntry = getPluginTaskRequestEntry(
    PLUGIN_TASK_DOMAIN_ACP,
    legacyRequestId,
  );
  if (!legacyEntry) {
    return;
  }
  deletePluginTaskRequestEntry(PLUGIN_TASK_DOMAIN_ACP, legacyRequestId);
  removeConversationRowsByRequestId(new Set([legacyRequestId]));
}

export function loadAcpChatSessionIndex(backendIdRaw: string) {
  const backendId =
    String(backendIdRaw || "").trim() || ACP_OPENCODE_BACKEND_ID;
  removeLegacyConversationIfNeeded(backendId);
  const stored = readStoredAcpChatSessionIndex(backendId);
  if (stored.sessions.length > 0) {
    const visibleSessions = stored.sessions.filter(isVisibleSession);
    if (visibleSessions.length > 0) {
      const activeConversationId = visibleSessions.some(
        (entry) => entry.conversationId === stored.activeConversationId,
      )
        ? stored.activeConversationId
        : visibleSessions[0].conversationId;
      return {
        activeConversationId,
        sessions: visibleSessions,
      };
    }
  }
  return {
    activeConversationId: "",
    sessions: [] as AcpChatSessionSummary[],
  };
}

export function saveAcpChatSessionIndex(args: {
  backendId: string;
  activeConversationId: string;
  sessions: AcpChatSessionSummary[];
}) {
  writeAcpChatSessionIndex(args);
}

export function listAcpChatSessions(
  backendIdRaw: string,
): AcpChatSessionSummary[] {
  return loadAcpChatSessionIndex(backendIdRaw).sessions.map((entry) => ({
    ...entry,
  }));
}

export function listStoredVisibleAcpChatSessions(
  backendIdRaw: string,
): AcpChatSessionSummary[] {
  const backendId =
    String(backendIdRaw || "").trim() || ACP_OPENCODE_BACKEND_ID;
  return readStoredAcpChatSessionIndex(backendId)
    .sessions.filter(isVisibleSession)
    .map((entry) => ({ ...entry }));
}

export function listAllAcpChatSessions(
  backendIdRaw: string,
): AcpChatSessionSummary[] {
  const backendId =
    String(backendIdRaw || "").trim() || ACP_OPENCODE_BACKEND_ID;
  const stored = readStoredAcpChatSessionIndex(backendId);
  return stored.sessions.map((entry) => ({ ...entry }));
}

export function renameAcpConversationState(args: {
  backendId: string;
  conversationId: string;
  title: string;
}) {
  const backendId =
    String(args.backendId || "").trim() || ACP_OPENCODE_BACKEND_ID;
  const conversationId = normalizeString(args.conversationId);
  const title = normalizeString(args.title);
  if (!conversationId || !title) {
    return;
  }
  const requestId = conversationRequestId(backendId, conversationId);
  const requestEntry = getPluginTaskRequestEntry(
    PLUGIN_TASK_DOMAIN_ACP,
    requestId,
  );
  if (requestEntry) {
    let payload: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(String(requestEntry.payload || "{}"));
      payload = isRecord(parsed) ? parsed : {};
    } catch {
      payload = {};
    }
    payload.conversationTitle = title;
    payload.updatedAt = nowIso();
    upsertPluginTaskRequestEntry(PLUGIN_TASK_DOMAIN_ACP, {
      requestId,
      backendId,
      state: requestEntry.state,
      updatedAt: nowIso(),
      payload: JSON.stringify(payload),
    });
  }
  const stored = readStoredAcpChatSessionIndex(backendId);
  saveAcpChatSessionIndex({
    backendId,
    activeConversationId: stored.activeConversationId,
    sessions: stored.sessions.map((entry) =>
      entry.conversationId === conversationId
        ? {
            ...entry,
            title,
            updatedAt: nowIso(),
          }
        : entry,
    ),
  });
}

export function loadAcpConversationState(
  backendIdRaw: string,
  conversationIdRaw?: string,
) {
  const backendId =
    String(backendIdRaw || "").trim() || ACP_OPENCODE_BACKEND_ID;
  const index = loadAcpChatSessionIndex(backendId);
  const conversationId =
    normalizeString(conversationIdRaw) || index.activeConversationId;
  const requestId = conversationRequestId(backendId, conversationId);
  const requestEntry = getPluginTaskRequestEntry(
    PLUGIN_TASK_DOMAIN_ACP,
    requestId,
  );
  const snapshot = requestEntry
    ? normalizeSnapshotPayload({
        backendId,
        payload: requestEntry.payload,
      })
    : {
        ...createEmptyAcpConversationSnapshot(),
        backendId,
        conversationId,
        conversationCreatedAt: nowIso(),
        updatedAt: nowIso(),
      };
  snapshot.conversationId =
    normalizeString(snapshot.conversationId) || conversationId;
  snapshot.conversationCreatedAt =
    normalizeString(snapshot.conversationCreatedAt) || nowIso();
  snapshot.remoteSessionId =
    normalizeString(snapshot.remoteSessionId) ||
    normalizeString(snapshot.sessionId);
  snapshot.sessionId = "";
  const paths = resolveAcpChatRuntimePaths(backendId, snapshot.conversationId);
  const transcriptPaths = resolveAcpChatTranscriptPaths(
    paths.conversationStorageDir,
  );
  snapshot.conversationStorageDir =
    snapshot.conversationStorageDir || paths.conversationStorageDir;
  snapshot.transcriptPath =
    snapshot.transcriptPath || transcriptPaths.transcriptPath;
  snapshot.transcriptIndexPath =
    snapshot.transcriptIndexPath || transcriptPaths.transcriptIndexPath;
  snapshot.transcriptEventSeq = Math.max(
    snapshot.transcriptEventSeq,
    snapshot.transcriptRevision,
  );
  snapshot.transcriptRevision = snapshot.transcriptEventSeq;
  snapshot.items = [];
  return {
    snapshot,
    items: [] as AcpConversationItem[],
  };
}

export function loadAcpFrontendState() {
  const requestEntry = getPluginTaskRequestEntry(
    PLUGIN_TASK_DOMAIN_ACP,
    ACP_FRONTEND_REQUEST_ID,
  );
  if (!requestEntry) {
    return {
      activeBackendId: "",
    };
  }
  try {
    const parsed = JSON.parse(String(requestEntry.payload || "{}")) as {
      activeBackendId?: unknown;
    };
    return {
      activeBackendId: normalizeString(parsed.activeBackendId),
    };
  } catch {
    return {
      activeBackendId: "",
    };
  }
}

export function saveAcpFrontendState(args: { activeBackendId: string }) {
  upsertPluginTaskRequestEntry(PLUGIN_TASK_DOMAIN_ACP, {
    requestId: ACP_FRONTEND_REQUEST_ID,
    backendId: "",
    state: "active",
    updatedAt: nowIso(),
    payload: JSON.stringify({
      activeBackendId: normalizeString(args.activeBackendId),
    }),
  });
}

export function saveAcpConversationState(snapshot: AcpConversationSnapshot) {
  const backendId =
    String(snapshot.backendId || "").trim() || ACP_OPENCODE_BACKEND_ID;
  const conversationId =
    normalizeString(snapshot.conversationId) ||
    nextOpaqueId("acp-conversation");
  snapshot.conversationId = conversationId;
  snapshot.conversationCreatedAt =
    normalizeString(snapshot.conversationCreatedAt) || nowIso();
  snapshot.conversationTitle = deriveConversationTitle({
    snapshot,
    items: [],
  });
  const requestId = conversationRequestId(backendId, conversationId);
  const paths = resolveAcpChatRuntimePaths(backendId, conversationId);
  const transcriptPaths = resolveAcpChatTranscriptPaths(
    snapshot.conversationStorageDir || paths.conversationStorageDir,
  );
  snapshot.transcriptPath =
    snapshot.transcriptPath || transcriptPaths.transcriptPath;
  snapshot.transcriptIndexPath =
    snapshot.transcriptIndexPath || transcriptPaths.transcriptIndexPath;
  upsertPluginTaskRequestEntry(PLUGIN_TASK_DOMAIN_ACP, {
    requestId,
    backendId,
    state: snapshot.status,
    updatedAt: String(snapshot.updatedAt || nowIso()),
    payload: JSON.stringify({
      conversationId: snapshot.conversationId,
      sessionId: snapshot.sessionId,
      remoteSessionId:
        normalizeString(snapshot.remoteSessionId) ||
        normalizeString(snapshot.sessionId),
      canLoadRemoteSession: snapshot.canLoadRemoteSession === true,
      canResumeRemoteSession: snapshot.canResumeRemoteSession === true,
      remoteSessionRestoreStatus: snapshot.remoteSessionRestoreStatus,
      remoteSessionRestoreMessage: snapshot.remoteSessionRestoreMessage,
      conversationTitle: snapshot.conversationTitle,
      conversationCreatedAt: snapshot.conversationCreatedAt,
      status: snapshot.status,
      busy: snapshot.busy,
      showDiagnostics: snapshot.showDiagnostics,
      statusExpanded: snapshot.statusExpanded,
      chatDisplayMode: snapshot.chatDisplayMode,
      autoApproveAcpPermissions:
        snapshot.autoApproveAcpPermissions === true,
      lastError: snapshot.lastError,
      prerequisiteError: snapshot.prerequisiteError,
      authMethods: snapshot.authMethods.map((entry) => ({ ...entry })),
      authMethodIds: snapshot.authMethodIds,
      commandLabel: snapshot.commandLabel,
      commandLine: snapshot.commandLine,
      agentLabel: snapshot.agentLabel,
      agentVersion: snapshot.agentVersion,
      sessionTitle: snapshot.sessionTitle,
      sessionUpdatedAt: snapshot.sessionUpdatedAt,
      modeOptions: snapshot.modeOptions.map((entry) => ({ ...entry })),
      currentMode: cloneAcpSelectableOption(snapshot.currentMode),
      modelOptions: snapshot.modelOptions.map((entry) => ({ ...entry })),
      currentModel: cloneAcpSelectableOption(snapshot.currentModel),
      displayModelOptions: snapshot.displayModelOptions.map((entry) => ({
        ...entry,
      })),
      currentDisplayModel: cloneAcpSelectableOption(
        snapshot.currentDisplayModel,
      ),
      reasoningEffortOptions: snapshot.reasoningEffortOptions.map((entry) => ({
        ...entry,
      })),
      currentReasoningEffort: cloneAcpSelectableOption(
        snapshot.currentReasoningEffort,
      ),
      availableCommands: snapshot.availableCommands.map((entry) => ({
        ...entry,
      })),
      lastStopReason: snapshot.lastStopReason,
      usage: snapshot.usage ? { ...snapshot.usage } : null,
      pendingPermissionRequest: snapshot.pendingPermissionRequest
        ? {
            ...snapshot.pendingPermissionRequest,
            options: snapshot.pendingPermissionRequest.options.map((entry) => ({
              ...entry,
            })),
          }
        : null,
      diagnostics: snapshot.diagnostics.map((entry) => ({ ...entry })),
      transcriptPath: snapshot.transcriptPath,
      transcriptIndexPath: snapshot.transcriptIndexPath,
      transcriptRevision: snapshot.transcriptRevision,
      transcriptEventSeq: snapshot.transcriptEventSeq,
      transcriptItemCount: snapshot.transcriptItemCount,
      transcriptPreview: snapshot.transcriptPreview,
      lastHostContext: snapshot.lastHostContext
        ? JSON.parse(JSON.stringify(snapshot.lastHostContext))
        : null,
      agentWorkspaceDir: snapshot.agentWorkspaceDir,
      conversationStorageDir: snapshot.conversationStorageDir,
      sessionCwd: snapshot.sessionCwd,
      workspaceDir: snapshot.workspaceDir,
      runtimeDir: snapshot.runtimeDir,
      stderrTail: snapshot.stderrTail,
      lastLifecycleEvent: snapshot.lastLifecycleEvent,
      updatedAt: snapshot.updatedAt || nowIso(),
    }),
  });
  removeConversationRowsByRequestId(new Set([requestId]));
  const indexEntry = getPluginTaskRequestEntry(
    PLUGIN_TASK_DOMAIN_ACP,
    sessionIndexRequestId(backendId),
  );
  const parsedIndex = indexEntry
    ? normalizeSessionIndexPayload(indexEntry.payload)
    : {
        activeConversationId: conversationId,
        sessions: [] as AcpChatSessionSummary[],
      };
  const summaries = parsedIndex.sessions.filter(
    (entry) => entry.conversationId !== conversationId,
  );
  const existingSummary = parsedIndex.sessions.find(
    (entry) => entry.conversationId === conversationId,
  );
  const lastError =
    normalizeString(snapshot.prerequisiteError) ||
    normalizeString(snapshot.lastError);
  summaries.push({
    conversationId,
    title: snapshot.conversationTitle,
    messageCount: snapshot.transcriptItemCount,
    status: snapshot.status,
    lastError,
    createdAt: snapshot.conversationCreatedAt,
    updatedAt: snapshot.updatedAt || nowIso(),
    archivedAt: existingSummary?.archivedAt,
  });
  const activeConversationId =
    normalizeString(parsedIndex.activeConversationId) || conversationId;
  writeAcpChatSessionIndex({
    backendId,
    activeConversationId,
    sessions: summaries,
  });
}

export function deleteAcpConversationState(
  backendIdRaw: string,
  conversationIdRaw: string,
) {
  const backendId =
    String(backendIdRaw || "").trim() || ACP_OPENCODE_BACKEND_ID;
  const conversationId = normalizeString(conversationIdRaw);
  if (!conversationId) {
    return;
  }
  const requestId = conversationRequestId(backendId, conversationId);
  deletePluginTaskRequestEntry(PLUGIN_TASK_DOMAIN_ACP, requestId);
  removeConversationRowsByRequestId(new Set([requestId]));
  removeConversationStorageDir(backendId, conversationId);
  const index = loadAcpChatSessionIndex(backendId);
  const stored = readStoredAcpChatSessionIndex(backendId);
  const sessions = stored.sessions.filter(
    (entry) => entry.conversationId !== conversationId,
  );
  writeAcpChatSessionIndex({
    backendId,
    activeConversationId:
      index.activeConversationId === conversationId
        ? sessions[0]?.conversationId || ""
        : stored.activeConversationId,
    sessions,
  });
}

export function clearAcpConversationState(backendIdRaw: string) {
  const backendId =
    String(backendIdRaw || "").trim() || ACP_OPENCODE_BACKEND_ID;
  const index = readStoredAcpChatSessionIndex(backendId);
  const requestIds = new Set(
    index.sessions.map((entry) =>
      conversationRequestId(backendId, entry.conversationId),
    ),
  );
  requestIds.add(legacyConversationRequestId(backendId));
  for (const requestId of requestIds) {
    deletePluginTaskRequestEntry(PLUGIN_TASK_DOMAIN_ACP, requestId);
  }
  deletePluginTaskRequestEntry(
    PLUGIN_TASK_DOMAIN_ACP,
    sessionIndexRequestId(backendId),
  );
  removeConversationRowsByRequestId(requestIds);
  for (const session of index.sessions) {
    removeConversationStorageDir(backendId, session.conversationId);
  }
}
