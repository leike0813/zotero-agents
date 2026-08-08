import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { config } from "../../package.json";
import {
  ACP_OPENCODE_BACKEND_ID,
  ACP_PROMPT_REQUEST_KIND,
} from "../../src/config/defaults";
import { createBackendsPrefsDocument } from "../../src/backends/registry";
import {
  authenticateAcpConversation,
  activateSyntheticAcpChatReplay,
  archiveAcpConversation,
  buildAcpDiagnosticsBundle,
  cancelAcpConversationPrompt,
  connectAcpConversation,
  deleteActiveAcpConversation,
  disconnectAcpConversation,
  getAcpConversationSnapshot,
  getAcpChatExecutionProgress,
  getAcpChatWorkspaceOwnerNavigation,
  getAcpChatTranscriptMirrorDiagnosticsForTests,
  getActiveAcpChatOwner,
  refreshAcpConversationBackends,
  readAcpConversationTranscriptMirrorPage,
  readAcpConversationTranscriptPage,
  prepareSyntheticAcpChatReplay,
  pruneAcpChatSessionRuntimesForBackends,
  reconnectAcpConversation,
  renameAcpConversation,
  resolveAcpConversationPermission,
  resetAcpSessionManagerForTests,
  sendAcpConversationPrompt,
  setActiveAcpBackend,
  setActiveAcpConversation,
  setAcpConversationAutoApprovePermissions,
  setAcpConversationChatDisplayMode,
  setAcpConversationModel,
  setAcpConversationMode,
  setAcpConversationReasoningEffort,
  shutdownAcpSessionManager,
  subscribeAcpChatWorkspaceChanges,
  scheduleAcpChatTranscriptHydrateForOwner,
  setAcpConnectionAdapterFactoryForTests,
  setAcpChatPromptInterruptGraceMsForTests,
  startNewAcpConversation,
  toggleAcpConversationStatusDetails,
  type AcpChatWorkspaceChange,
} from "../../src/modules/acpSessionManager";
import { clearHostBridgePluginSkillBundleMaterializationForTests } from "../../src/modules/hostBridgePluginSkillBundle";
import {
  listAcpChatSessions,
  loadAcpConversationState,
  resolveAcpChatRuntimePaths,
} from "../../src/modules/acpConversationStore";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";
import {
  PLUGIN_TASK_DOMAIN_ACP,
  getPluginTaskRequestEntry,
  listPluginTaskRowEntries,
  replacePluginTaskRowEntries,
  upsertPluginTaskRequestEntry,
} from "../../src/modules/pluginStateStore";
import type {
  AcpConnectionAdapter,
  AcpConnectionAdapterFactoryArgs,
  AcpConnectionSemanticTraceContext,
  AcpConnectionDiagnosticsListener,
  AcpConnectionPermissionListener,
  AcpConnectionUpdateListener,
} from "../../src/modules/acpConnectionAdapter";
import {
  AcpAuthRequiredError,
  buildAcpPromptTextForTests,
} from "../../src/modules/acpConnectionAdapter";
import { createAcpBackendFromPreset } from "../../src/modules/acpBackendPresets";
import { configureZoteroMcpServerForTests } from "../../src/modules/zoteroMcpServer";
import type {
  AcpPermissionOption,
  AcpSessionConfigCategory,
  AcpSessionConfigOption,
  RequestPermissionOutcome,
  SessionNotification,
} from "../../src/modules/acpProtocol";
import { joinPath } from "../../src/utils/path";
import { setAssistantExecutionDisplayMode } from "../../src/modules/assistantExecutionDisplayPolicy";
import { getAssistantExecutionDisplayMode } from "../../src/modules/assistantExecutionDisplayPolicy";

const setAssistantStreamingRenderEnabled = (enabled: boolean) =>
  setAssistantExecutionDisplayMode(enabled ? "live" : "boundary");
import {
  isAssistantTranscriptPaginationVirtualizationEnabled,
  setAssistantTranscriptPaginationVirtualizationEnabled,
} from "../../src/modules/assistantTranscriptRenderingPreference";
import {
  createAcpChatWorkspaceOwner,
  createFailedTranscriptRegion,
  createIdleTranscriptRegion,
  createLoadingTranscriptRegion,
  createReadyTranscriptRegion,
} from "../../src/modules/assistantWorkspacePublication";
import { createAssistantWorkspaceTranscriptPage } from "../../src/modules/assistantWorkspaceTranscriptPublication";
import { buildAcpSidebarViewSnapshot } from "../../src/modules/acpSidebarModel";
import {
  acpChatTranscriptPageKey,
  isPureAcpChatBackgroundChange,
  readAcpChatWorkspaceRegions,
  resolveAcpChatWorkspacePublicationKinds,
  shouldPublishAcpChatWorkspaceChange,
} from "../../src/modules/acpChatWorkspaceSurface";

type AcpChatTestReadOptions = {
  itemMode?: "full" | "structural";
};

function getAcpConversationUiSnapshot(
  backendId?: string,
  conversationId?: string,
  options?: AcpChatTestReadOptions,
) {
  const snapshot = getAcpConversationSnapshot(backendId, conversationId);
  const page =
    snapshot.backendId && snapshot.conversationId
      ? readAcpConversationTranscriptMirrorPage({
          backendId: snapshot.backendId,
          conversationId: snapshot.conversationId,
          limit: Math.max(80, Number(snapshot.transcriptItemCount) || 0),
          executionDisplayMode: getAssistantExecutionDisplayMode(),
        })
      : undefined;
  const items = (Array.isArray(page?.items) ? page.items : []).map((entry) => ({
    ...entry,
    kind: "kind" in entry ? entry.kind : entry.itemKind,
    state: "state" in entry ? entry.state : entry.status,
  }));
  return {
    ...snapshot,
    items:
      options?.itemMode === "structural"
        ? items.filter((entry) => entry.kind === "plan")
        : items,
  };
}

function getAcpFrontendSnapshot(options?: AcpChatTestReadOptions) {
  const active = getActiveAcpChatOwner();
  const navigation = getAcpChatWorkspaceOwnerNavigation();
  const activeSnapshot = getAcpConversationUiSnapshot(
    active.backendId,
    active.conversationId,
    options,
  );
  const entriesByGroup = new Map<string, typeof navigation.entries>();
  for (const entry of navigation.entries) {
    const groupId = String(entry.groupId || "").trim();
    const entries = entriesByGroup.get(groupId) || [];
    entries.push(entry);
    entriesByGroup.set(groupId, entries);
  }
  const backendChatSessions = navigation.groups
    .map((group) => ({
      backendId: group.groupId,
      displayName: group.label,
      sessions: (entriesByGroup.get(group.groupId) || []).map((entry) => ({
        backendId: group.groupId,
        conversationId:
          entry.owner.source === "acp-chat" ? entry.owner.conversationId : "",
        title: entry.label,
        messageCount: entry.messageCount,
        status: entry.status,
        lastError: entry.description || "",
        updatedAt: entry.updatedAt || "",
      })),
    }))
    .sort((left, right) =>
      left.backendId === active.backendId
        ? -1
        : right.backendId === active.backendId
          ? 1
          : 0,
    );
  const connectedStatuses = new Set([
    "connected",
    "prompting",
    "permission-required",
    "auth-required",
  ]);
  const backends = navigation.groups.map((group) => {
    const sessions = entriesByGroup.get(group.groupId) || [];
    const selected =
      group.groupId === active.backendId ? activeSnapshot : undefined;
    const status =
      String(selected?.status || "").trim() ||
      sessions.find((entry) => connectedStatuses.has(entry.status))?.status ||
      group.status;
    return {
      backendId: group.groupId,
      displayName: group.label,
      status,
      connected: connectedStatuses.has(status),
    };
  });
  return {
    activeBackendId: active.backendId,
    activeConversationId: active.conversationId,
    activeSnapshot,
    backends,
    backendChatSessions,
    connectedCount: backends.filter((entry) => entry.connected).length,
    totalMessageCount: navigation.entries.reduce(
      (total, entry) => total + Math.max(0, Number(entry.messageCount) || 0),
      0,
    ),
  };
}

const subscribeAcpChatPanelSnapshots = subscribeAcpChatWorkspaceChanges;

function subscribeAcpConversationSnapshots(
  listener: (snapshot: ReturnType<typeof getAcpConversationUiSnapshot>) => void,
) {
  return subscribeAcpChatWorkspaceChanges((change) => {
    if (change.active !== true && change.global !== true) return;
    listener(
      getAcpConversationUiSnapshot(change.backendId, change.conversationId),
    );
  });
}

function subscribeAcpFrontendSnapshots(
  listener: (snapshot: ReturnType<typeof getAcpFrontendSnapshot>) => void,
) {
  return subscribeAcpChatWorkspaceChanges(() => {
    listener(getAcpFrontendSnapshot());
  });
}

type AcpChatPanelSnapshotChange = AcpChatWorkspaceChange;

async function prepareAcpChatPanelSnapshot(args: {
  target: "library" | "reader";
  transcriptReadMode?: "loading-first" | "page-first";
  transcriptPage?: {
    backendId?: string;
    conversationId?: string;
    requestId?: string;
    cursor?: number;
    limit?: number;
  };
  readTranscriptPage?: (
    args: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
}) {
  const virtualized = isAssistantTranscriptPaginationVirtualizationEnabled();
  const readOptions = virtualized
    ? ({ itemMode: "structural" } as const)
    : undefined;
  const snapshot = getAcpConversationUiSnapshot(
    undefined,
    undefined,
    readOptions,
  );
  const frontendSnapshot = getAcpFrontendSnapshot(readOptions);
  const payload = {
    ...(buildAcpSidebarViewSnapshot({
      target: args.target,
      snapshot,
      frontendSnapshot,
    }) as unknown as Record<string, any>),
    executionDisplayMode: getAssistantExecutionDisplayMode(),
    transcriptPaginationVirtualizationEnabled: virtualized,
  };
  const backendOptions = Array.isArray(payload.backendOptions)
    ? payload.backendOptions
    : [];
  const availableBackendIds = backendOptions
    .map((entry: Record<string, unknown>) =>
      String(entry.backendId || entry.id || entry.value || "").trim(),
    )
    .filter(Boolean);
  const requestedBackendId = String(
    payload.activeBackendId || payload.backendId || "",
  ).trim();
  const backendId =
    (availableBackendIds.includes(requestedBackendId)
      ? requestedBackendId
      : "") ||
    availableBackendIds[0] ||
    "";
  const conversationId = String(
    payload.activeConversationId || payload.conversationId || "",
  ).trim();
  payload.activeBackendId = backendId;
  payload.backendId = backendId;
  payload.backendAvailability = backendId ? "selected" : "none";
  payload.activeConversationId = backendId ? conversationId : "";
  payload.conversationId = backendId ? conversationId : "";
  payload.conversationAvailability =
    backendId && conversationId ? "selected" : "none";
  if (!backendId || !conversationId) {
    payload.transcriptRegion = createIdleTranscriptRegion();
    payload.items = [];
    payload.busy = false;
    if (!backendId) payload.status = "idle";
    return payload;
  }
  const progress = getAcpChatExecutionProgress(backendId, conversationId);
  payload.messageCounts = progress
    ? {
        scopeKey: progress.scopeKey,
        executionKey: progress.executionKey,
        active: progress.active,
        current: { ...progress.current },
        cumulative: { ...progress.cumulative },
        revision: progress.revision,
        completeness: progress.completeness,
      }
    : undefined;
  const owner = createAcpChatWorkspaceOwner(backendId, conversationId);
  if (!virtualized) {
    const items = Array.isArray(payload.items) ? payload.items : [];
    payload.transcriptRegion = createReadyTranscriptRegion(
      owner,
      createAssistantWorkspaceTranscriptPage({
        owner,
        anchor: "tail",
        cursor: 0,
        limit: Math.max(1, items.length),
        totalVisibleItemCount: items.length,
        sourceEventSeq: Number(payload.transcriptEventSeq) || 0,
        items,
      }),
      0,
    );
    return payload;
  }
  if (args.transcriptReadMode === "loading-first") {
    payload.transcriptRegion = createLoadingTranscriptRegion(owner);
    return payload;
  }
  try {
    const request = args.transcriptPage || {};
    const pageArgs = {
      backendId,
      conversationId,
      cursor: request.cursor === undefined ? undefined : Number(request.cursor),
      limit: request.limit === undefined ? undefined : Number(request.limit),
      executionDisplayMode: getAssistantExecutionDisplayMode(),
    };
    const page = (
      args.readTranscriptPage
        ? await args.readTranscriptPage(pageArgs)
        : readAcpConversationTranscriptMirrorPage(pageArgs) ||
          (await readAcpConversationTranscriptPage(pageArgs))
    ) as Record<string, any> | undefined;
    if (
      page &&
      String(page.backendId || "") === backendId &&
      String(page.conversationId || "") === conversationId
    ) {
      payload.transcriptRegion = createReadyTranscriptRegion(
        owner,
        createAssistantWorkspaceTranscriptPage({
          owner,
          anchor: request.cursor === undefined ? "tail" : "cursor",
          cursor: Number(page.cursor) || 0,
          limit: Number(page.limit) || 80,
          totalVisibleItemCount: Number(page.total) || 0,
          previousCursor: page.prevCursor,
          nextCursor: page.nextCursor,
          sourceEventSeq: Number(page.eventSeq) || 0,
          items: Array.isArray(page.items) ? page.items : [],
        }),
        0,
      );
      scheduleAcpChatTranscriptHydrateForOwner({
        backendId,
        conversationId,
      });
    } else {
      payload.transcriptRegion = createLoadingTranscriptRegion(owner);
    }
  } catch (error) {
    payload.transcriptRegion = createFailedTranscriptRegion(owner, {
      code: "transcript-page-read-failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
  return payload;
}

async function readAcpChatWorkspacePublication(args: {
  owner: ReturnType<typeof createAcpChatWorkspaceOwner>;
  publicationKind: string;
}) {
  if (args.publicationKind === "owner-navigation") {
    return getAcpChatWorkspaceOwnerNavigation();
  }
  const publicationKind =
    args.publicationKind === "baseline-status"
      ? "owner-control"
      : args.publicationKind;
  const regions = await readAcpChatWorkspaceRegions({
    owner: args.owner,
    kinds: [publicationKind as any],
  });
  return regions[publicationKind as keyof typeof regions] || null;
}

export {
  assert,
  fs,
  os,
  path,
  config,
  ACP_OPENCODE_BACKEND_ID,
  ACP_PROMPT_REQUEST_KIND,
  createBackendsPrefsDocument,
  authenticateAcpConversation,
  activateSyntheticAcpChatReplay,
  archiveAcpConversation,
  buildAcpDiagnosticsBundle,
  cancelAcpConversationPrompt,
  connectAcpConversation,
  deleteActiveAcpConversation,
  disconnectAcpConversation,
  getAcpConversationSnapshot,
  getAcpChatTranscriptMirrorDiagnosticsForTests,
  getAcpConversationUiSnapshot,
  getAcpFrontendSnapshot,
  refreshAcpConversationBackends,
  readAcpConversationTranscriptPage,
  prepareSyntheticAcpChatReplay,
  pruneAcpChatSessionRuntimesForBackends,
  reconnectAcpConversation,
  renameAcpConversation,
  resolveAcpConversationPermission,
  resetAcpSessionManagerForTests,
  sendAcpConversationPrompt,
  setActiveAcpBackend,
  setActiveAcpConversation,
  setAcpConversationAutoApprovePermissions,
  setAcpConversationChatDisplayMode,
  setAcpConversationModel,
  setAcpConversationMode,
  setAcpConversationReasoningEffort,
  setAcpConnectionAdapterFactoryForTests,
  setAcpChatPromptInterruptGraceMsForTests,
  shutdownAcpSessionManager,
  startNewAcpConversation,
  subscribeAcpChatPanelSnapshots,
  subscribeAcpConversationSnapshots,
  subscribeAcpFrontendSnapshots,
  toggleAcpConversationStatusDetails,
  listAcpChatSessions,
  loadAcpConversationState,
  resolveAcpChatRuntimePaths,
  PLUGIN_TASK_DOMAIN_ACP,
  getPluginTaskRequestEntry,
  listPluginTaskRowEntries,
  replacePluginTaskRowEntries,
  resetPluginStateStoreForTests,
  upsertPluginTaskRequestEntry,
  AcpAuthRequiredError,
  buildAcpPromptTextForTests,
  createAcpBackendFromPreset,
  configureZoteroMcpServerForTests,
  joinPath,
  setAssistantStreamingRenderEnabled,
  setAssistantTranscriptPaginationVirtualizationEnabled,
  createAcpChatWorkspaceOwner,
  acpChatTranscriptPageKey,
  isPureAcpChatBackgroundChange,
  prepareAcpChatPanelSnapshot,
  readAcpChatWorkspacePublication,
  resolveAcpChatWorkspacePublicationKinds,
  shouldPublishAcpChatWorkspaceChange,
};
export type {
  AcpChatPanelSnapshotChange,
  AcpConnectionAdapter,
  AcpConnectionAdapterFactoryArgs,
  AcpConnectionDiagnosticsListener,
  AcpConnectionPermissionListener,
  AcpConnectionUpdateListener,
  AcpPermissionOption,
  AcpSessionConfigCategory,
  AcpSessionConfigOption,
  RequestPermissionOutcome,
  SessionNotification,
};

export async function readActiveTranscriptItems(
  backendId = ACP_OPENCODE_BACKEND_ID,
) {
  const snapshot = getAcpConversationSnapshot(backendId);
  const page = await readAcpConversationTranscriptPage({
    backendId,
    conversationId: snapshot.conversationId,
    limit: 200,
  });
  return page.items;
}

export async function readTranscriptItemsForConversation(
  conversationId: string,
  backendId = ACP_OPENCODE_BACKEND_ID,
) {
  const page = await readAcpConversationTranscriptPage({
    backendId,
    conversationId,
    limit: 200,
  });
  return page.items;
}

function stripStartupPreambleForEcho(message: string) {
  const closingMarker = /^\[\/Zotero Agents ACP Chat startup context\]$/m;
  const match = closingMarker.exec(message);
  if (!match || typeof match.index !== "number") {
    return message;
  }
  return message.slice(match.index + match[0].length).trim() || message;
}

export function configureDefaultAcpBackendForTests() {
  Zotero.Prefs.set(
    `${config.prefsPrefix}.backendsConfigJson`,
    JSON.stringify(
      createBackendsPrefsDocument([createAcpBackendFromPreset("opencode")]),
    ),
    true,
  );
}

export function configureNoAcpBackendForTests() {
  Zotero.Prefs.set(
    `${config.prefsPrefix}.backendsConfigJson`,
    JSON.stringify(createBackendsPrefsDocument([])),
    true,
  );
}

export async function writeRegistrySkill(args: {
  root: string;
  skillId: string;
  body: string;
}) {
  const skillDir = path.join(args.root, args.skillId);
  await fs.mkdir(path.join(skillDir, "assets"), { recursive: true });
  await fs.writeFile(
    path.join(skillDir, "SKILL.md"),
    `---\nname: ${args.skillId}\ndescription: ${args.skillId} test skill\n---\n\n${args.body}\n`,
    "utf8",
  );
  await fs.writeFile(
    path.join(skillDir, "assets", "runner.json"),
    JSON.stringify({
      id: args.skillId,
      execution_modes: ["auto"],
      schemas: { output: "assets/output.schema.json" },
    }),
    "utf8",
  );
  await fs.writeFile(
    path.join(skillDir, "assets", "output.schema.json"),
    JSON.stringify({ type: "object", additionalProperties: true }),
    "utf8",
  );
  return skillDir;
}

export class FakeAcpConnectionAdapter implements AcpConnectionAdapter {
  readonly updates = new Set<AcpConnectionUpdateListener>();
  readonly closeListeners = new Set<
    (event?: { message?: string; stderrText?: string }) => void
  >();
  readonly diagnosticsListeners = new Set<AcpConnectionDiagnosticsListener>();
  readonly permissionListeners = new Set<AcpConnectionPermissionListener>();
  readonly prompts: string[] = [];
  readonly sessionIds: string[] = [];
  readonly modelSelections: string[] = [];
  readonly modeSelections: string[] = [];
  readonly configOptionSelections: string[] = [];
  readonly loadSessionIds: string[] = [];
  readonly resumeSessionIds: string[] = [];
  readonly authenticateCalls: string[] = [];
  readonly cancelSessionIds: string[] = [];
  semanticTraceContext?: AcpConnectionSemanticTraceContext;
  permissionOptions: AcpPermissionOption[] = [
    {
      optionId: "allow-once",
      kind: "allow_once",
      name: "Allow Once",
    },
    {
      optionId: "reject-once",
      kind: "reject_once",
      name: "Reject Once",
    },
  ];
  initializeCalls = 0;
  closeCalls = 0;
  promptStopReason = "end_turn";
  failInitialize = false;
  failNewSessionUntilAuthenticated = false;
  canLoadSession = false;
  canResumeSession = false;
  canUseHttpMcp = false;
  canUseSseMcp = false;
  failLoadSession = false;
  failResumeSession = false;
  emitReplayOnLoad = false;
  emitPermissionDuringPrompt = false;
  permissionSource = "acp-tool-call";
  closeNeverSettles = false;
  closeRejectError: Error | null = null;
  closeHoldUntil: Promise<void> | null = null;
  streamingChunkCount = 0;
  emitUsageAfterEachStreamingChunk = false;
  streamingChunkDelayMs = 0;
  holdPromptUntil: Promise<void> | null = null;
  modelState = {
    currentModelId: "gpt-5.4",
    availableModels: [
      { modelId: "gpt-5.4", name: "GPT-5.4", description: "Default model" },
      {
        modelId: "gpt-5.4-mini",
        name: "GPT-5.4 Mini",
        description: "Smaller model",
      },
    ],
  };
  sessionConfigOptions: AcpSessionConfigOption[] | null = null;
  omitSessionRuntimeOptions = false;
  emptySessionRuntimeOptions = false;
  connected = false;
  lastPermissionOutcome: RequestPermissionOutcome | null = null;
  private permissionRequestId = 0;
  private authenticated = false;
  private promptHoldRelease: (() => void) | null = null;
  private closeHoldRelease: (() => void) | null = null;

  holdPrompt() {
    this.releasePromptHold();
    this.holdPromptUntil = new Promise<void>((resolve) => {
      this.promptHoldRelease = resolve;
    });
    return () => this.releasePromptHold();
  }

  releasePromptHold() {
    const release = this.promptHoldRelease;
    this.promptHoldRelease = null;
    this.holdPromptUntil = null;
    release?.();
  }

  holdClose() {
    this.releaseCloseHold();
    this.closeHoldUntil = new Promise<void>((resolve) => {
      this.closeHoldRelease = resolve;
    });
    return () => this.releaseCloseHold();
  }

  releaseCloseHold() {
    const release = this.closeHoldRelease;
    this.closeHoldRelease = null;
    this.closeHoldUntil = null;
    release?.();
  }

  releaseHolds() {
    this.releasePromptHold();
    this.releaseCloseHold();
    this.closeNeverSettles = false;
  }

  async initialize() {
    if (this.failInitialize) {
      throw new Error('Command "npx" was not found in PATH');
    }
    this.initializeCalls += 1;
    this.connected = true;
    this.emitDiagnostic({
      kind: "command_check",
      level: "info",
      message: "validated npx command",
      detail: "npx -y opencode-ai@latest acp",
    });
    this.emitDiagnostic({
      kind: "spawned",
      level: "info",
      message: "spawned npx process",
      detail: "npx -y opencode-ai@latest acp",
    });
    this.emitDiagnostic({
      kind: "initialized",
      level: "info",
      message: "ACP initialize completed",
    });
    return {
      agentName: "OpenCode",
      agentVersion: "1.2.3",
      authMethods: [
        {
          id: "device",
          name: "Device Login",
          description: "Authenticate via browser",
        },
      ],
      commandLabel: "npx -y opencode-ai@latest acp",
      commandLine: "npx -y opencode-ai@latest acp",
      canLoadSession: this.canLoadSession,
      canResumeSession: this.canResumeSession,
      canUseHttpMcp: this.canUseHttpMcp,
      canUseSseMcp: this.canUseSseMcp,
    };
  }

  onUpdate(listener: AcpConnectionUpdateListener) {
    this.updates.add(listener);
    return () => {
      this.updates.delete(listener);
    };
  }

  onClose(listener: () => void) {
    this.closeListeners.add(listener);
    return () => {
      this.closeListeners.delete(listener);
    };
  }

  onDiagnostics(listener: AcpConnectionDiagnosticsListener) {
    this.diagnosticsListeners.add(listener);
    return () => {
      this.diagnosticsListeners.delete(listener);
    };
  }

  onPermissionRequest(listener: AcpConnectionPermissionListener) {
    this.permissionListeners.add(listener);
    return () => {
      this.permissionListeners.delete(listener);
    };
  }

  async newSession() {
    if (this.failNewSessionUntilAuthenticated && !this.authenticated) {
      this.emitDiagnostic({
        kind: "auth_required",
        level: "warn",
        message: "session/new requires authentication",
      });
      throw new AcpAuthRequiredError("Authentication required", [
        {
          id: "device",
          name: "Device Login",
          description: "Authenticate via browser",
        },
      ]);
    }
    const sessionId = `session-${this.sessionIds.length + 1}`;
    this.sessionIds.push(sessionId);
    this.emitDiagnostic({
      kind: "session_created",
      level: "info",
      message: `created session ${sessionId}`,
    });
    return {
      sessionId,
      sessionTitle: `Conversation ${this.sessionIds.length}`,
      sessionUpdatedAt: "2026-04-22T01:00:00.000Z",
      ...(this.emptySessionRuntimeOptions
        ? {
            modes: {
              currentModeId: "bypassPermissions",
              availableModes: [],
            },
            models: {
              currentModelId: "opus@high",
              availableModels: [],
            },
          }
        : this.omitSessionRuntimeOptions
          ? {}
          : this.sessionConfigOptions
            ? {
                configOptions: this.sessionConfigOptions,
              }
            : {
                modes: {
                  currentModeId: "plan",
                  availableModes: [
                    { id: "plan", name: "Plan", description: "Reason first" },
                    { id: "code", name: "Code", description: "Act directly" },
                  ],
                },
                models: {
                  currentModelId: this.modelState.currentModelId,
                  availableModels: this.modelState.availableModels,
                },
              }),
    };
  }

  async loadSession(args: { sessionId: string }) {
    this.loadSessionIds.push(args.sessionId);
    this.emitDiagnostic({
      kind: "session_load_attempted",
      level: "info",
      message: `load ${args.sessionId}`,
    });
    if (this.failLoadSession) {
      throw new Error("load failed");
    }
    if (this.emitReplayOnLoad) {
      await this.emitUpdate({
        sessionId: args.sessionId,
        update: {
          sessionUpdate: "agent_message_chunk",
          content: {
            type: "text",
            text: "replayed assistant text",
          },
        },
      });
      await this.emitUpdate({
        sessionId: args.sessionId,
        update: {
          sessionUpdate: "session_info_update",
          title: "Loaded session",
          updatedAt: "2026-04-22T02:00:00.000Z",
        },
      });
    }
    this.emitDiagnostic({
      kind: "session_load_succeeded",
      level: "info",
      message: `loaded ${args.sessionId}`,
    });
    return {
      sessionId: args.sessionId,
      sessionTitle: "Loaded session",
      sessionUpdatedAt: "2026-04-22T02:00:00.000Z",
      models: {
        currentModelId: this.modelState.currentModelId,
        availableModels: this.modelState.availableModels,
      },
    };
  }

  async resumeSession(args: { sessionId: string }) {
    this.resumeSessionIds.push(args.sessionId);
    this.emitDiagnostic({
      kind: "session_resume_attempted",
      level: "info",
      message: `resume ${args.sessionId}`,
    });
    if (this.failResumeSession) {
      throw new Error("resume failed");
    }
    this.emitDiagnostic({
      kind: "session_resume_succeeded",
      level: "info",
      message: `resumed ${args.sessionId}`,
    });
    return {
      sessionId: args.sessionId,
      sessionTitle: "Resumed session",
      sessionUpdatedAt: "2026-04-22T02:00:00.000Z",
      models: {
        currentModelId: this.modelState.currentModelId,
        availableModels: this.modelState.availableModels,
      },
    };
  }

  private async emitUpdate(update: SessionNotification) {
    for (const listener of this.updates) {
      await listener(update);
    }
  }

  async emitSessionUpdate(update: SessionNotification) {
    await this.emitUpdate(update);
  }

  private emitDiagnostic(entry: {
    kind: string;
    level: "info" | "warn" | "error";
    message: string;
    detail?: string;
  }) {
    const payload = {
      id: `${entry.kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      ts: new Date().toISOString(),
      kind: entry.kind,
      level: entry.level,
      message: entry.message,
      detail: entry.detail || "",
    };
    for (const listener of this.diagnosticsListeners) {
      listener(payload);
    }
  }

  emitTraceDiagnostics(count: number) {
    for (let index = 0; index < count; index += 1) {
      this.emitDiagnostic({
        kind: "jsonrpc_trace",
        level: "info",
        message: `trace ${index}`,
        detail: `trace ${index}`,
      });
    }
  }

  async prompt(args: { sessionId: string; message: string }) {
    this.prompts.push(args.message);
    this.emitDiagnostic({
      kind: "prompt_started",
      level: "info",
      message: `prompt started for ${args.sessionId}`,
    });
    if (this.holdPromptUntil) {
      await this.holdPromptUntil;
    }
    await this.emitUpdate({
      sessionId: args.sessionId,
      update: {
        sessionUpdate: "agent_thought_chunk",
        content: {
          type: "text",
          text: "Checking the workspace and planning the next step.",
        },
      },
    });
    await this.emitUpdate({
      sessionId: args.sessionId,
      update: {
        sessionUpdate: "tool_call",
        toolCallId: "tool-1",
        title: "Inspect notes",
        kind: "read",
        status: "pending",
      },
    });
    if (this.emitPermissionDuringPrompt) {
      const requestId = `perm-${++this.permissionRequestId}`;
      const outcome = await new Promise<RequestPermissionOutcome>((resolve) => {
        for (const listener of this.permissionListeners) {
          listener({
            requestId,
            sessionId: args.sessionId,
            toolCallId: "tool-1",
            toolTitle: "Inspect notes",
            source: this.permissionSource,
            summary: "Read Zotero notes for the selected paper",
            detail: '{"tool":"get_item_notes","arguments":{"key":"PAPER1"}}',
            requestedAt: new Date().toISOString(),
            options: this.permissionOptions,
            resolve,
          });
        }
      });
      this.lastPermissionOutcome = outcome;
    }
    await this.emitUpdate({
      sessionId: args.sessionId,
      update: {
        sessionUpdate: "tool_call_update",
        toolCallId: "tool-1",
        title: "Inspect notes",
        kind: "read",
        status: "completed",
      },
    });
    await this.emitUpdate({
      sessionId: args.sessionId,
      update: {
        sessionUpdate: "plan",
        entries: [
          {
            content: "Inspect current Zotero selection",
            priority: "high",
            status: "completed",
          },
          {
            content: "Summarize likely next actions",
            priority: "medium",
            status: "in_progress",
          },
        ],
      },
    });
    await this.emitUpdate({
      sessionId: args.sessionId,
      update: {
        sessionUpdate: "available_commands_update",
        availableCommands: [
          {
            name: "create_plan",
            title: "Create Plan",
            description: "Build an execution plan",
            input: { type: "unstructured" },
          },
        ],
      },
    });
    await this.emitUpdate({
      sessionId: args.sessionId,
      update: {
        sessionUpdate: "current_mode_update",
        currentModeId: "code",
      },
    });
    await this.emitUpdate({
      sessionId: args.sessionId,
      update: {
        sessionUpdate: "session_info_update",
        title: "OpenCode session",
        updatedAt: "2026-04-22T01:23:45.000Z",
      },
    });
    await this.emitUpdate({
      sessionId: args.sessionId,
      update: {
        sessionUpdate: "usage_update",
        used: 1200,
        size: 8000,
      },
    });
    if (this.streamingChunkCount > 0) {
      for (let index = 0; index < this.streamingChunkCount; index += 1) {
        if (this.streamingChunkDelayMs > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.streamingChunkDelayMs),
          );
        }
        await this.emitUpdate({
          sessionId: args.sessionId,
          update: {
            sessionUpdate: "agent_message_chunk",
            content: {
              type: "text",
              text: String(index % 10),
            },
          },
        });
        if (this.emitUsageAfterEachStreamingChunk) {
          await this.emitUpdate({
            sessionId: args.sessionId,
            update: {
              sessionUpdate: "usage_update",
              used: 1200 + index,
              size: 8000,
            },
          });
        }
      }
    } else {
      await this.emitUpdate({
        sessionId: args.sessionId,
        update: {
          sessionUpdate: "agent_message_chunk",
          content: {
            type: "text",
            text: `Echo: ${stripStartupPreambleForEcho(args.message)}`,
          },
        },
      });
    }
    this.emitDiagnostic({
      kind: "prompt_finished",
      level: "info",
      message: `prompt finished with ${this.promptStopReason}`,
    });
    return {
      stopReason: this.promptStopReason,
    };
  }

  async cancel(args: { sessionId: string }) {
    this.cancelSessionIds.push(args.sessionId);
  }

  async setMode(args: { sessionId: string; modeId: string }) {
    this.modeSelections.push(`${args.sessionId}:${args.modeId}`);
  }

  async setModel(args: { sessionId: string; modelId: string }) {
    this.modelSelections.push(`${args.sessionId}:${args.modelId}`);
  }

  async setConfigOption(args: {
    sessionId: string;
    category: AcpSessionConfigCategory;
    value: string;
  }) {
    const option = this.sessionConfigOptions?.find(
      (entry) => entry.category === args.category,
    );
    if (!option) {
      return false;
    }
    option.currentValue = args.value;
    this.configOptionSelections.push(
      `${args.sessionId}:${args.category}:${args.value}`,
    );
    return true;
  }

  async authenticate(args: { methodId: string }) {
    this.authenticated = true;
    this.authenticateCalls.push(args.methodId);
    this.emitDiagnostic({
      kind: "initialized",
      level: "info",
      message: `authenticated with ${args.methodId}`,
    });
  }

  async close() {
    this.closeCalls += 1;
    if (this.closeHoldUntil) {
      await this.closeHoldUntil;
    }
    if (this.closeRejectError) {
      throw this.closeRejectError;
    }
    if (this.closeNeverSettles) {
      await new Promise(() => undefined);
      return;
    }
    for (const listener of this.closeListeners) {
      listener();
    }
  }

  emitClose(event?: { message?: string; stderrText?: string }) {
    for (const listener of this.closeListeners) {
      listener(event);
    }
  }
}

export async function waitForAcpConversationSnapshot(
  predicate: (
    snapshot: ReturnType<typeof getAcpConversationSnapshot>,
  ) => boolean,
) {
  let snapshot = getAcpConversationSnapshot();
  for (let index = 0; index < 40; index += 1) {
    if (predicate(snapshot)) {
      return snapshot;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
    snapshot = getAcpConversationSnapshot();
  }
  return snapshot;
}

export async function waitForAcpConversationUiSnapshot(
  predicate: (
    snapshot: ReturnType<typeof getAcpConversationUiSnapshot>,
  ) => boolean,
) {
  let snapshot = getAcpConversationUiSnapshot();
  for (let index = 0; index < 40; index += 1) {
    if (predicate(snapshot)) {
      return snapshot;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
    snapshot = getAcpConversationUiSnapshot();
  }
  return snapshot;
}

export type AcpSessionManagerTestHarness = {
  lastAdapter: FakeAcpConnectionAdapter | null;
  lastFactoryArgs: AcpConnectionAdapterFactoryArgs | null;
  adapters: Set<FakeAcpConnectionAdapter>;
};

export function installAcpSessionManagerTestHooks() {
  const harness: AcpSessionManagerTestHarness = {
    lastAdapter: null,
    lastFactoryArgs: null,
    adapters: new Set<FakeAcpConnectionAdapter>(),
  };
  let previousBackendsPref: unknown;
  let previousDataDirectory: unknown;

  beforeEach(function () {
    clearHostBridgePluginSkillBundleMaterializationForTests();
    harness.lastAdapter = null;
    harness.lastFactoryArgs = null;
    harness.adapters.clear();
    previousDataDirectory = (
      Zotero as typeof Zotero & { DataDirectory?: unknown }
    ).DataDirectory;
    previousBackendsPref = Zotero.Prefs.get(
      `${config.prefsPrefix}.backendsConfigJson`,
      true,
    );
    configureDefaultAcpBackendForTests();
    resetPluginStateStoreForTests();
    resetAcpSessionManagerForTests();
    setAcpConnectionAdapterFactoryForTests(
      async (args: AcpConnectionAdapterFactoryArgs) => {
        harness.lastFactoryArgs = args;
        harness.lastAdapter = new FakeAcpConnectionAdapter();
        harness.lastAdapter.semanticTraceContext = args.semanticTraceContext;
        harness.adapters.add(harness.lastAdapter);
        return harness.lastAdapter;
      },
    );
  });

  afterEach(function () {
    clearHostBridgePluginSkillBundleMaterializationForTests();
    for (const adapter of harness.adapters) {
      adapter.releaseHolds();
    }
    harness.adapters.clear();
    setAssistantStreamingRenderEnabled(true);
    setAssistantTranscriptPaginationVirtualizationEnabled(true);
    setAcpConnectionAdapterFactoryForTests();
    resetAcpSessionManagerForTests();
    resetPluginStateStoreForTests();
    (Zotero as typeof Zotero & { DataDirectory?: unknown }).DataDirectory =
      previousDataDirectory as typeof Zotero.DataDirectory;
    if (typeof previousBackendsPref === "undefined") {
      Zotero.Prefs.clear(`${config.prefsPrefix}.backendsConfigJson`, true);
    } else {
      Zotero.Prefs.set(
        `${config.prefsPrefix}.backendsConfigJson`,
        previousBackendsPref,
        true,
      );
    }
  });

  return harness;
}
