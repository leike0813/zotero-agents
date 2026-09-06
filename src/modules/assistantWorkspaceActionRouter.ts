import { workflowSubmissionQueue } from "../jobQueue/workflowSubmissionQueue";
import type { WorkflowQueueEntryId } from "../jobQueue/workflowSubmissionQueueContracts";
import { copyText } from "../utils/ztoolkit";
import { openFolderInSystemFileManager } from "../utils/fileSystem";
import { buildAcpHostContext } from "./acpContextBuilder";
import { readSelectionContext } from "./selectionContext";
import { createZoteroHostCapabilityBroker } from "./zoteroHostCapabilityBroker";
import { ACP_CHAT_WORKSPACE_ADAPTER } from "./acpChatWorkspaceSurface";
import {
  ACP_SKILLS_WORKSPACE_ADAPTER,
  readAcpSkillRunWorkspaceRegions,
} from "./acpSkillsWorkspaceSurface";
import { SKILLRUNNER_WORKSPACE_ADAPTER } from "./skillRunnerWorkspaceSurface";
import { submitAcpSkillRunInteractionFiles } from "./acpSkillRunInteractionFiles";
import {
  dispatchSkillRunnerWorkspaceAction,
  getSkillRunnerWorkspaceSelectedOwner,
} from "./skillRunnerRunDialog";
import { openBackendManagerDialog } from "./backendManager";
import {
  authenticateAcpConversation,
  archiveAcpConversation,
  buildAcpDiagnosticsBundle,
  cancelAcpConversationPrompt,
  connectAcpConversation,
  disconnectAcpConversation,
  getAcpChatWorkspaceOwnerNavigation,
  getAcpChatWorkspaceReadModel,
  reconnectAcpConversation,
  renameAcpConversation,
  resolveAcpConversationPermission,
  sendAcpConversationPrompt,
  setActiveAcpBackend,
  setActiveAcpConversation,
  setAcpConversationAutoApprovePermissions,
  setAcpConversationChatDisplayMode,
  setAcpConversationMode,
  setAcpConversationModel,
  setAcpConversationReasoningEffort,
  startNewAcpConversation,
  toggleAcpConversationDiagnostics,
  toggleAcpConversationStatusDetails,
} from "./acpSessionManager";
import {
  getAcpSkillRunDiagnostics,
  getAcpSkillRunWorkspaceReadModel,
} from "./acpSkillRunStore";
import { deterministicInteractionResponseText } from "../shared/assistantInteractionContract";
import {
  ASSISTANT_WORKSPACE_ACTION_REGISTRY,
  createAcpChatWorkspaceOwner,
  createAcpSkillsWorkspaceOwner,
  createSkillRunnerWorkspaceOwner,
  type AssistantWorkspaceOwner,
  type AssistantWorkspacePublicationSource,
} from "./assistantWorkspacePublication";
import { parseAssistantWorkspaceTranscriptPageRequest } from "./assistantWorkspaceTranscriptPublication";
import {
  acpChatWorkspaceSurfaceContext,
  getActiveAcpChatOwnerKey,
  hasPublishedChildBaselineInit,
  hasPublishedWorkspaceBaselineInit,
  markChildBaselineInitPublished,
  publishAssistantWorkspaceStatePulse,
  recordWorkspacePublicationAck,
  recordWorkspacePublicationRenderObservation,
  scheduleAcpChatBackendRefreshBoundary,
  scheduleAcpSkillRunPublications,
  scheduleSkillRunnerPublications,
  setAssistantWorkspaceExecutionDisplayMode,
} from "./assistantWorkspacePublicationHost";
import type { AssistantWorkspacePublicationAdapter } from "./assistantWorkspacePublicationRuntime";
import type { AssistantWorkspaceTab } from "../shared/assistantWireContract";
import type {
  AcpChatAction,
  AcpSkillsAction,
  AssistantWorkspaceChildActionEnvelope,
} from "../shared/assistantActionContract";
import type { AcpSidebarTarget } from "./acpTypes";
import type { AssistantWorkspaceHostRuntime } from "./assistantWorkspaceSidebar";
import {
  archiveAcpSkillRun,
  cancelAcpSkillRun,
  connectAcpSkillRun,
  disconnectAcpSkillRun,
  endAcpSkillRunSession,
  interruptAcpSkillRunCurrentTurn,
  replyAcpSkillRun,
  setAcpSkillRunMode,
  setAcpSkillRunModel,
  setAcpSkillRunReasoningEffort,
} from "./acpSkillRunActions";
import {
  getSelectedAcpSkillRunRequestId,
  selectAcpSkillRun,
} from "./acpSkillRunWorkspaceSelection";
import { resolveAcpSkillRunPermissionRequest } from "./acpSkillRunPermissionQueue";

// Shell services owned by assistantWorkspaceSidebar (debug logging, sidebar
// close, tab normalization, shell window resolution). Injected once at module
// load so this module never imports the sidebar shell at runtime (the
// configureAcpChatTranscriptMirrorHost registration pattern).
export type AssistantWorkspaceActionRouterShellHost = {
  logAssistantWorkspaceDebug(
    host: AssistantWorkspaceHostRuntime,
    stage: string,
    message: string,
    details?: Record<string, unknown>,
  ): void;
  closeActiveSidebarHost(host: AssistantWorkspaceHostRuntime): boolean;
  normalizeTab(value: unknown): AssistantWorkspaceTab;
  resolveCurrentShellWindow(host: AssistantWorkspaceHostRuntime): Window | null;
};

let shellHost: AssistantWorkspaceActionRouterShellHost;

export function configureAssistantWorkspaceActionRouterShellHost(
  nextHost: AssistantWorkspaceActionRouterShellHost,
) {
  shellHost = nextHost;
}

function parseAssistantWorkspaceActionOwner(
  source: AssistantWorkspacePublicationSource,
  value: unknown,
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const owner = value as Record<string, unknown>;
  if (owner.source !== source) return null;
  if (
    source === "acp-chat" &&
    Object.keys(owner).sort().join(",") ===
      "backendId,conversationId,ownerKey,source"
  ) {
    const backendId = String(owner.backendId || "").trim();
    const conversationId = String(owner.conversationId || "").trim();
    const expected = `${backendId}\n${conversationId}`;
    return backendId &&
      conversationId &&
      String(owner.ownerKey || "") === expected
      ? createAcpChatWorkspaceOwner(backendId, conversationId)
      : null;
  }
  if (
    source === "acp-skills" &&
    Object.keys(owner).sort().join(",") === "ownerKey,requestId,source"
  ) {
    const requestId = String(owner.requestId || "").trim();
    return requestId && String(owner.ownerKey || "") === requestId
      ? createAcpSkillsWorkspaceOwner(requestId)
      : null;
  }
  if (
    source === "skillrunner" &&
    Object.keys(owner).sort().join(",") === "ownerKey,requestId,runKey,source"
  ) {
    const requestId = String(owner.requestId || "").trim() || null;
    const runKey = String(owner.runKey || "").trim();
    return runKey && String(owner.ownerKey || "") === (requestId || runKey)
      ? createSkillRunnerWorkspaceOwner({ requestId, runKey })
      : null;
  }
  return null;
}

// Actions the host routers accept: the registry-routed actions for the source
// plus a defensive "ready" branch and dead routes without a known sender that
// predate the registry (see the TODO(contract) markers in the table below).
// The payload stays a merged record: handleChildAction merges the action
// payload with the owner identity fields (backendId/conversationId or
// requestId) before dispatch, and the handlers keep their defensive runtime
// reads; the per-action payload shapes are contract-typed at the envelope
// boundary (src/shared/assistantActionContract.ts).
type AcpSkillsHostRoutedAction = AcpSkillsAction | "ready" | "end-session";
type AcpChatHostRoutedAction =
  | AcpChatAction
  | "ready"
  | "rename-conversation"
  | "reconnect"
  | "toggle-diagnostics"
  | "toggle-status-details";

type AssistantWorkspaceHostRoutedAction =
  | AcpSkillsHostRoutedAction
  | AcpChatHostRoutedAction;

export type AssistantWorkspaceHostActionContext = {
  host: AssistantWorkspaceHostRuntime;
  target: AcpSidebarTarget;
  owner: AssistantWorkspaceOwner | null;
  source: AssistantWorkspacePublicationSource;
  payload: Record<string, unknown>;
};

export type AssistantWorkspaceHostActionHandler = (
  ctx: AssistantWorkspaceHostActionContext,
) => Promise<void>;

async function resolvePermissionForSource(
  source: AssistantWorkspacePublicationSource,
  { payload }: AssistantWorkspaceHostActionContext,
) {
  if (source === "acp-skills") {
    resolveAcpSkillRunPermissionRequest({
      runRequestId: String(payload.requestId || "").trim(),
      permissionRequestId: String(payload.permissionRequestId || "").trim(),
      outcome:
        String(payload.outcome || "").trim() === "selected"
          ? "selected"
          : "cancelled",
      optionId: String(payload.optionId || "").trim(),
    });
    return;
  }
  await resolveAcpConversationPermission({
    outcome:
      String(payload.outcome || "").trim() === "selected"
        ? "selected"
        : "cancelled",
    permissionRequestId: String(
      payload.permissionRequestId || payload.requestId || "",
    ).trim(),
    optionId: String(payload.optionId || "").trim(),
    backendId: String(payload.backendId || "").trim(),
    conversationId: String(payload.conversationId || "").trim(),
  });
}

async function copyDiagnosticsForSource(
  source: AssistantWorkspacePublicationSource,
  { payload }: AssistantWorkspaceHostActionContext,
) {
  if (source === "acp-skills") {
    const requestId = String(payload.requestId || "").trim();
    copyText(JSON.stringify(getAcpSkillRunDiagnostics(requestId), null, 2));
    return;
  }
  const backendId = String(payload.backendId || "").trim();
  const conversationId = String(payload.conversationId || "").trim();
  copyText(
    JSON.stringify(
      buildAcpDiagnosticsBundle(backendId, conversationId),
      null,
      2,
    ),
  );
  toggleAcpConversationDiagnostics({
    backendId,
    conversationId,
    visible: true,
  });
}

async function openWorkspaceForSource(
  source: AssistantWorkspacePublicationSource,
  { payload }: AssistantWorkspaceHostActionContext,
) {
  if (source === "acp-skills") {
    const requestId = String(payload.requestId || "").trim();
    const run = getAcpSkillRunWorkspaceReadModel(requestId);
    const workspaceDir = String(
      run?.workspaceDir || run?.runtimeDir || "",
    ).trim();
    if (workspaceDir) openFolderInSystemFileManager(workspaceDir);
    return;
  }
  const backendId = String(payload.backendId || "").trim();
  const conversationId = String(payload.conversationId || "").trim();
  const session = getAcpChatWorkspaceReadModel(backendId, conversationId);
  const workspaceDir = String(
    session.agentWorkspaceDir ||
      session.sessionCwd ||
      session.workspaceDir ||
      session.runtimeDir ||
      "",
  ).trim();
  if (workspaceDir) openFolderInSystemFileManager(workspaceDir);
}

async function setModeForSource(
  source: AssistantWorkspacePublicationSource,
  { payload }: AssistantWorkspaceHostActionContext,
) {
  if (source === "acp-skills") {
    await setAcpSkillRunMode({
      requestId: String(payload.requestId || "").trim(),
      modeId: String(payload.modeId || "").trim(),
    });
    return;
  }
  const modeId = String(payload.modeId || "").trim();
  if (modeId)
    await setAcpConversationMode({
      modeId,
      backendId: String(payload.backendId || "").trim(),
      conversationId: String(payload.conversationId || "").trim(),
    });
}

async function setModelForSource(
  source: AssistantWorkspacePublicationSource,
  { payload }: AssistantWorkspaceHostActionContext,
) {
  if (source === "acp-skills") {
    await setAcpSkillRunModel({
      requestId: String(payload.requestId || "").trim(),
      modelId: String(payload.modelId || "").trim(),
    });
    return;
  }
  const modelId = String(payload.modelId || "").trim();
  if (modelId)
    await setAcpConversationModel({
      modelId,
      backendId: String(payload.backendId || "").trim(),
      conversationId: String(payload.conversationId || "").trim(),
    });
}

async function setReasoningEffortForSource(
  source: AssistantWorkspacePublicationSource,
  { payload }: AssistantWorkspaceHostActionContext,
) {
  if (source === "acp-skills") {
    await setAcpSkillRunReasoningEffort({
      requestId: String(payload.requestId || "").trim(),
      effortId: String(payload.effortId || "").trim(),
    });
    return;
  }
  const effortId = String(payload.effortId || "").trim();
  if (effortId)
    await setAcpConversationReasoningEffort({
      effortId,
      backendId: String(payload.backendId || "").trim(),
      conversationId: String(payload.conversationId || "").trim(),
    });
}

async function cancelQueuedWorkflowUnitForSource(
  source: AssistantWorkspacePublicationSource,
  { host, payload }: AssistantWorkspaceHostActionContext,
) {
  const queueId = String(payload.queueId || "").trim();
  if (source === "skillrunner") {
    if (queueId) {
      workflowSubmissionQueue.cancel(queueId as WorkflowQueueEntryId);
      scheduleSkillRunnerPublications(host, {
        global: true,
        kinds: ["global"],
      });
    }
    return;
  }
  if (queueId) {
    workflowSubmissionQueue.cancel(queueId as WorkflowQueueEntryId);
  }
  scheduleAcpSkillRunPublications(host, {
    global: true,
    kinds: ["global"],
  });
}

async function openBackendManagerForSource(
  source: AssistantWorkspacePublicationSource,
  { host, target }: AssistantWorkspaceHostActionContext,
) {
  await openBackendManagerDialog({
    window: host.win,
    initialProviderType: source === "skillrunner" ? "skillrunner" : "acp",
  });
  if (source === "acp-chat") {
    scheduleAcpChatBackendRefreshBoundary(host, target);
  }
}

// load-transcript-page and request-owner-details resolve their surface
// adapter through this lookup; the only per-source difference is that ACP
// Chat needs the surface context built from the host window target.
const WORKSPACE_SURFACE_DISPATCH: {
  [Source in AssistantWorkspacePublicationSource]: {
    adapter: AssistantWorkspacePublicationAdapter<Source, any, any, any>;
    context(ctx: AssistantWorkspaceHostActionContext): unknown;
  };
} = {
  "acp-chat": {
    adapter: ACP_CHAT_WORKSPACE_ADAPTER,
    context: ({ host, target }) => acpChatWorkspaceSurfaceContext(host, target),
  },
  "acp-skills": {
    adapter: ACP_SKILLS_WORKSPACE_ADAPTER,
    context: () => undefined,
  },
  skillrunner: {
    adapter: SKILLRUNNER_WORKSPACE_ADAPTER,
    context: () => undefined,
  },
};

async function loadTranscriptPageForSource<
  Source extends AssistantWorkspacePublicationSource,
>(source: Source, ctx: AssistantWorkspaceHostActionContext) {
  const { host, owner, payload } = ctx;
  const pageRequest = parseAssistantWorkspaceTranscriptPageRequest({
    owner,
    request: payload.request,
  });
  if (!pageRequest || pageRequest.owner.source !== source) {
    shellHost.logAssistantWorkspaceDebug(
      host,
      "transcript-page-request-drop",
      "Assistant Workspace transcript page request ignored because its canonical owner is invalid.",
      { tab: source, payload },
    );
    return;
  }
  if (pageRequest.owner.source === "acp-skills") {
    const requestId = pageRequest.owner.requestId;
    const selectedRequestId = getSelectedAcpSkillRunRequestId();
    if (requestId !== selectedRequestId) {
      shellHost.logAssistantWorkspaceDebug(
        host,
        "transcript-page-request-drop-owner-mismatch",
        "Assistant Workspace transcript page request ignored because its owner is not selected.",
        {
          tab: source,
          ownerKey: pageRequest.owner.ownerKey,
          selectedRequestId,
        },
      );
      return;
    }
  } else if (pageRequest.owner.source === "skillrunner") {
    const selected = getSkillRunnerWorkspaceSelectedOwner();
    if (!selected || selected.runKey !== pageRequest.owner.runKey) {
      shellHost.logAssistantWorkspaceDebug(
        host,
        "transcript-page-request-drop-owner-mismatch",
        "Assistant Workspace transcript page request ignored because its owner is not selected.",
        { tab: source, ownerKey: pageRequest.owner.ownerKey },
      );
      return;
    }
  } else if (pageRequest.owner.ownerKey !== getActiveAcpChatOwnerKey()) {
    shellHost.logAssistantWorkspaceDebug(
      host,
      "transcript-page-request-drop-owner-mismatch",
      "Assistant Workspace transcript page request ignored because its owner is not active.",
      { tab: source, ownerKey: pageRequest.owner.ownerKey },
    );
    return;
  }
  const surface = WORKSPACE_SURFACE_DISPATCH[source];
  await host.publicationRuntime?.requestTranscriptPage({
    adapter: surface.adapter,
    owner: pageRequest.owner as Extract<
      AssistantWorkspaceOwner,
      { source: Source }
    >,
    context: surface.context(ctx),
    request: {
      cursor: pageRequest.request.cursor ?? undefined,
      limit: pageRequest.request.limit,
    },
    cause: "page-request",
  });
}

async function requestOwnerDetailsForSource<
  Source extends AssistantWorkspacePublicationSource,
>(source: Source, ctx: AssistantWorkspaceHostActionContext) {
  const { host, owner } = ctx;
  if (!owner) {
    return;
  }
  const surface = WORKSPACE_SURFACE_DISPATCH[source];
  await host.publicationRuntime?.requestOwnerDetails({
    adapter: surface.adapter,
    owner: owner as Extract<AssistantWorkspaceOwner, { source: Source }>,
    context: surface.context(ctx),
  });
}

// Decision 4: one dispatch table keyed by action then owner source, with a
// uniform handler signature. Action vocabulary comes from
// ASSISTANT_WORKSPACE_ACTION_REGISTRY (validated once in handleChildAction);
// handler bodies shared across sources exist once (the cells delegate to the
// shared *ForSource implementations above). The five TODO(contract) routes
// stay verbatim with their markers — they are parked improvement candidates,
// not dead code to clean.
const ASSISTANT_WORKSPACE_HOST_ACTION_TABLE: {
  [Action in AssistantWorkspaceHostRoutedAction]?: Partial<
    Record<
      AssistantWorkspacePublicationSource,
      AssistantWorkspaceHostActionHandler
    >
  >;
} = {
  ready: {
    "acp-chat": async () => undefined,
    "acp-skills": async () => undefined,
  },
  "set-execution-display-mode": {
    "acp-chat": async ({ host, payload }) => {
      setAssistantWorkspaceExecutionDisplayMode(host, payload.mode);
    },
    "acp-skills": async ({ host, payload }) => {
      setAssistantWorkspaceExecutionDisplayMode(host, payload.mode);
    },
    skillrunner: async ({ host, payload }) => {
      setAssistantWorkspaceExecutionDisplayMode(host, payload.mode);
    },
  },
  "load-transcript-page": {
    "acp-chat": (ctx) => loadTranscriptPageForSource("acp-chat", ctx),
    "acp-skills": (ctx) => loadTranscriptPageForSource("acp-skills", ctx),
    skillrunner: (ctx) => loadTranscriptPageForSource("skillrunner", ctx),
  },
  "request-owner-details": {
    "acp-chat": (ctx) => requestOwnerDetailsForSource("acp-chat", ctx),
    "acp-skills": (ctx) => requestOwnerDetailsForSource("acp-skills", ctx),
    skillrunner: (ctx) => requestOwnerDetailsForSource("skillrunner", ctx),
  },
  "resolve-permission": {
    "acp-chat": (ctx) => resolvePermissionForSource("acp-chat", ctx),
    "acp-skills": (ctx) => resolvePermissionForSource("acp-skills", ctx),
  },
  "copy-diagnostics": {
    "acp-chat": (ctx) => copyDiagnosticsForSource("acp-chat", ctx),
    "acp-skills": (ctx) => copyDiagnosticsForSource("acp-skills", ctx),
  },
  "open-workspace": {
    "acp-chat": (ctx) => openWorkspaceForSource("acp-chat", ctx),
    "acp-skills": (ctx) => openWorkspaceForSource("acp-skills", ctx),
  },
  "set-mode": {
    "acp-chat": (ctx) => setModeForSource("acp-chat", ctx),
    "acp-skills": (ctx) => setModeForSource("acp-skills", ctx),
  },
  "set-model": {
    "acp-chat": (ctx) => setModelForSource("acp-chat", ctx),
    "acp-skills": (ctx) => setModelForSource("acp-skills", ctx),
  },
  "set-reasoning-effort": {
    "acp-chat": (ctx) => setReasoningEffortForSource("acp-chat", ctx),
    "acp-skills": (ctx) => setReasoningEffortForSource("acp-skills", ctx),
  },
  "cancel-queued-workflow-unit": {
    "acp-skills": (ctx) => cancelQueuedWorkflowUnitForSource("acp-skills", ctx),
    skillrunner: (ctx) => cancelQueuedWorkflowUnitForSource("skillrunner", ctx),
  },
  "open-backend-manager": {
    "acp-chat": (ctx) => openBackendManagerForSource("acp-chat", ctx),
    "acp-skills": (ctx) => openBackendManagerForSource("acp-skills", ctx),
    skillrunner: (ctx) => openBackendManagerForSource("skillrunner", ctx),
  },
  "close-sidebar": {
    "acp-chat": async ({ host }) => {
      shellHost.closeActiveSidebarHost(host);
    },
    "acp-skills": async ({ host }) => {
      shellHost.closeActiveSidebarHost(host);
    },
  },
  "set-active-backend": {
    "acp-chat": async ({ host, target, payload }) => {
      const backendId = String(payload.backendId || "").trim();
      if (backendId) {
        await setActiveAcpBackend({ backendId });
        scheduleAcpChatBackendRefreshBoundary(host, target);
      }
    },
  },
  "set-active-conversation": {
    "acp-chat": async ({ payload }) => {
      const conversationId = String(payload.conversationId || "").trim();
      const backendId = String(payload.backendId || "").trim();
      if (!conversationId) return;
      await setActiveAcpConversation({ conversationId, backendId });
    },
  },
  "new-conversation": {
    "acp-chat": async ({ payload }) => {
      const backendId = String(payload.backendId || "").trim();
      await startNewAcpConversation({ backendId });
    },
  },
  // TODO(contract): host route without a known sender; verify and remove in a later phase
  "rename-conversation": {
    "acp-chat": async ({ payload }) => {
      const title = String(payload.title || "").trim();
      const conversationId = String(payload.conversationId || "").trim();
      const backendId = String(payload.backendId || "").trim();
      if (title)
        await renameAcpConversation({ title, conversationId, backendId });
    },
  },
  "archive-conversation": {
    "acp-chat": async ({ payload }) => {
      const conversationId = String(payload.conversationId || "").trim();
      const backendId = String(payload.backendId || "").trim();
      if (conversationId)
        await archiveAcpConversation({ conversationId, backendId });
    },
  },
  // TODO(contract): host route without a known sender; verify and remove in a later phase
  reconnect: {
    "acp-chat": async ({ payload }) => {
      await reconnectAcpConversation({
        backendId: String(payload.backendId || "").trim(),
        conversationId: String(payload.conversationId || "").trim(),
      });
    },
  },
  connect: {
    "acp-chat": async ({ payload }) => {
      await connectAcpConversation({
        backendId: String(payload.backendId || "").trim(),
        conversationId: String(payload.conversationId || "").trim(),
      });
    },
  },
  disconnect: {
    "acp-chat": async ({ payload }) => {
      await disconnectAcpConversation({
        backendId: String(payload.backendId || "").trim(),
        conversationId: String(payload.conversationId || "").trim(),
      });
    },
  },
  cancel: {
    "acp-chat": async ({ payload }) => {
      await cancelAcpConversationPrompt({
        backendId: String(payload.backendId || "").trim(),
        conversationId: String(payload.conversationId || "").trim(),
      });
    },
  },
  authenticate: {
    "acp-chat": async ({ payload }) => {
      await authenticateAcpConversation({
        backendId: String(payload.backendId || "").trim(),
        conversationId: String(payload.conversationId || "").trim(),
        methodId: String(payload.methodId || "").trim(),
      });
    },
  },
  "set-auto-approve-permissions": {
    "acp-chat": async ({ payload }) => {
      setAcpConversationAutoApprovePermissions({
        enabled: payload.enabled === true,
        backendId: String(payload.backendId || "").trim(),
        conversationId: String(payload.conversationId || "").trim(),
      });
    },
  },
  // TODO(contract): host route without a known sender; verify and remove in a later phase
  "toggle-diagnostics": {
    "acp-chat": async ({ payload }) => {
      toggleAcpConversationDiagnostics({
        backendId: String(payload.backendId || "").trim(),
        conversationId: String(payload.conversationId || "").trim(),
        visible:
          typeof payload.visible === "boolean"
            ? Boolean(payload.visible)
            : undefined,
      });
    },
  },
  // TODO(contract): host route without a known sender; verify and remove in a later phase
  "toggle-status-details": {
    "acp-chat": async ({ payload }) => {
      toggleAcpConversationStatusDetails({
        backendId: String(payload.backendId || "").trim(),
        conversationId: String(payload.conversationId || "").trim(),
        expanded:
          typeof payload.expanded === "boolean"
            ? Boolean(payload.expanded)
            : undefined,
      });
    },
  },
  "set-chat-display-mode": {
    "acp-chat": async ({ payload }) => {
      setAcpConversationChatDisplayMode({
        backendId: String(payload.backendId || "").trim(),
        conversationId: String(payload.conversationId || "").trim(),
        mode:
          String(payload.mode || "").trim() === "bubble" ? "bubble" : "plain",
      });
    },
  },
  "send-prompt": {
    "acp-chat": async ({ host, target, payload }) => {
      const message = String(payload.message || "").trim();
      if (!message) return;
      const selectionContext =
        target === "library"
          ? await readSelectionContext(
              createZoteroHostCapabilityBroker({}, () => host.win),
            )
          : undefined;
      await sendAcpConversationPrompt({
        message,
        backendId: String(payload.backendId || "").trim(),
        conversationId: String(payload.conversationId || "").trim(),
        hostContext: buildAcpHostContext({
          window: host.win,
          target,
          selectionContext,
        }),
      });
    },
  },
  "select-run": {
    "acp-skills": async ({ payload }) => {
      await selectAcpSkillRun(String(payload.requestId || "").trim());
    },
  },
  "cancel-run": {
    "acp-skills": async ({ payload }) => {
      await cancelAcpSkillRun(String(payload.requestId || "").trim());
    },
  },
  "interrupt-run-turn": {
    "acp-skills": async ({ payload }) => {
      await interruptAcpSkillRunCurrentTurn(
        String(payload.requestId || "").trim(),
      );
    },
  },
  "archive-run": {
    "acp-skills": async ({ payload }) => {
      archiveAcpSkillRun(String(payload.requestId || "").trim());
    },
  },
  // TODO(contract): host route without a known sender; verify and remove in a later phase
  "end-session": {
    "acp-skills": async ({ payload }) => {
      await endAcpSkillRunSession(String(payload.requestId || "").trim());
    },
  },
  "copy-request-id": {
    "acp-skills": async ({ payload }) => {
      copyText(String(payload.requestId || "").trim());
    },
  },
  "reply-run": {
    "acp-skills": async ({ payload }) => {
      await replyAcpSkillRun({
        requestId: String(payload.requestId || "").trim(),
        message: String(payload.message || ""),
      });
    },
    // SkillRunner cell preprocessing: dispatchSkillRunnerWorkspaceAction
    // normalizes the canonical reply-run payload to the legacy run-workspace
    // envelope (auth submission vs interaction response) before delegating.
    skillrunner: async ({ payload }) => {
      await dispatchSkillRunnerWorkspaceAction({
        action: "reply-run",
        payload,
      });
    },
  },
  "select-interaction-option": {
    "acp-skills": async ({ payload }) => {
      const requestId = String(payload.requestId || "").trim();
      const promptMessage = deterministicInteractionResponseText(
        payload.responseValue,
      );
      const control = await readAcpSkillRunWorkspaceRegions({
        requestId,
        kinds: ["owner-control"],
      });
      const ownerControl = control["owner-control"];
      const option = ownerControl?.interaction?.options.find(
        (candidate) =>
          deterministicInteractionResponseText(candidate.value) ===
          promptMessage,
      );
      if (ownerControl?.status !== "waiting_user" || !option) {
        throw new Error("ACP skill run is not waiting for that option.");
      }
      await replyAcpSkillRun({
        requestId,
        displayMessage: option.label || promptMessage,
        promptMessage,
      });
    },
    // SkillRunner cell preprocessing: dispatchSkillRunnerWorkspaceAction
    // normalizes the canonical select-interaction-option payload to the legacy
    // run-workspace envelope (auth selection vs interaction response).
    skillrunner: async ({ payload }) => {
      await dispatchSkillRunnerWorkspaceAction({
        action: "select-interaction-option",
        payload,
      });
    },
  },
  "submit-interaction-files": {
    "acp-skills": async ({ payload }) => {
      const requestId = String(payload.requestId || "").trim();
      const control = await readAcpSkillRunWorkspaceRegions({
        requestId,
        kinds: ["owner-control"],
      });
      const interaction = control["owner-control"]?.interaction;
      if (
        !interaction ||
        interaction.inputKind !== "upload_files" ||
        control["owner-control"]?.status !== "waiting_user"
      ) {
        throw new Error("ACP skill run is not waiting for file input.");
      }
      await submitAcpSkillRunInteractionFiles({
        requestId,
        slots: interaction.files,
      });
    },
  },
  "connect-run": {
    "acp-skills": async ({ payload }) => {
      await connectAcpSkillRun(String(payload.requestId || "").trim());
    },
  },
  "disconnect-run": {
    "acp-skills": async ({ payload }) => {
      await disconnectAcpSkillRun(String(payload.requestId || "").trim());
    },
  },
};

// Per-source dispatch over the shared table. The alert asymmetry preserves the
// legacy routers: ACP Chat/Skills actions surface failures through the host
// alert, while SkillRunner actions (and the acp-skills select-run fast path)
// propagate to the bridge error result.
export async function handleAcpSkillRunAction(
  ctx: AssistantWorkspaceHostActionContext,
  action: AcpSkillsHostRoutedAction,
) {
  const handler = ASSISTANT_WORKSPACE_HOST_ACTION_TABLE[action]?.["acp-skills"];
  if (!handler) {
    return;
  }
  if (action === "select-run") {
    await handler(ctx);
    return;
  }
  try {
    await handler(ctx);
  } catch (error) {
    ctx.host.win.alert?.(String(error));
  }
}

export async function handleAcpChatAction(
  ctx: AssistantWorkspaceHostActionContext,
  action: AcpChatHostRoutedAction,
) {
  const handler = ASSISTANT_WORKSPACE_HOST_ACTION_TABLE[action]?.["acp-chat"];
  if (!handler) {
    return;
  }
  try {
    await handler(ctx);
  } catch (error) {
    ctx.host.win.alert?.(String(error));
  }
}

// Chrome-level SkillRunner actions that stay host-side after the Stage 3
// cutover: queue cancellation (the queue is host state) and the backend
// manager dialog (needs the host window), plus the shared table cells. Drawer
// toggles and view-mode switches are panel-local in the child; every business
// action (select-task, reply-run, cancel-run, resolve-permission,
// auth-import-run, copy-*, …) falls through to
// `dispatchSkillRunnerWorkspaceAction` via the typed registry route in
// `handleChildAction`.
export function createSkillRunnerHostActionHandler(
  ctx: AssistantWorkspaceHostActionContext,
) {
  return async (envelope: {
    action?: string;
    payload?: Record<string, unknown>;
  }) => {
    const action = String(
      envelope.action || "",
    ).trim() as AssistantWorkspaceHostRoutedAction;
    const handler = ASSISTANT_WORKSPACE_HOST_ACTION_TABLE[action]?.skillrunner;
    if (!handler) {
      return false;
    }
    await handler(ctx);
    return true;
  };
}

export async function handleChildAction(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
  payload: AssistantWorkspaceChildActionEnvelope,
) {
  const source =
    payload.source === "acp-chat" ||
    payload.source === "acp-skills" ||
    payload.source === "skillrunner"
      ? payload.source
      : null;
  if (
    source &&
    Object.keys(payload).sort().join(",") !==
      "action,actionId,owner,payload,source"
  ) {
    return;
  }
  const tab = source || shellHost.normalizeTab(payload.tab);
  const action = String(payload.action || "").trim();
  const childPayload =
    payload.payload &&
    typeof payload.payload === "object" &&
    !Array.isArray(payload.payload)
      ? (payload.payload as Record<string, unknown>)
      : {};
  const owner = source
    ? parseAssistantWorkspaceActionOwner(source, payload.owner)
    : null;
  const ownerPayload: Record<string, unknown> =
    owner?.source === "acp-chat"
      ? {
          backendId: owner.backendId,
          conversationId: owner.conversationId,
        }
      : owner?.source === "acp-skills"
        ? { requestId: owner.requestId }
        : owner?.source === "skillrunner"
          ? { requestId: owner.requestId, runKey: owner.runKey }
          : {};
  const actionPayload = { ...childPayload, ...ownerPayload };
  if (action === "publication-ack") {
    recordWorkspacePublicationAck(host, childPayload);
    return;
  }
  if (action === "publication-render-observation") {
    recordWorkspacePublicationRenderObservation(host, childPayload);
    return;
  }
  if (action === "ready") {
    const documentGeneration =
      String(childPayload.documentGeneration || "").trim() || `${tab}:document`;
    const duplicateGeneration =
      host.readyTabGenerations.get(tab) === documentGeneration;
    host.readyTabGenerations.set(tab, documentGeneration);
    host.readyTabs.add(tab);
    const inFlight = host.childInitInFlight.get(tab);
    if (duplicateGeneration && inFlight) {
      await inFlight;
      return;
    }
    if (duplicateGeneration && hasPublishedChildBaselineInit(host, tab)) {
      return;
    }
    if (source && tab !== host.activeTab) {
      shellHost.logAssistantWorkspaceDebug(
        host,
        "child-ready-inactive-source",
        "Assistant Workspace inactive ACP child registered without reading its source.",
        { target, tab, documentGeneration },
      );
      return;
    }
    const workspaceInit = host.workspaceInitInFlight;
    if (
      workspaceInit &&
      workspaceInit.frameWindow === shellHost.resolveCurrentShellWindow(host) &&
      workspaceInit.target === host.activeTarget
    ) {
      await workspaceInit.promise;
      if (
        host.readyTabGenerations.get(tab) === documentGeneration &&
        hasPublishedWorkspaceBaselineInit(host)
      ) {
        markChildBaselineInitPublished(host, tab, target, documentGeneration);
        return;
      }
    }
    const init = publishAssistantWorkspaceStatePulse(
      host,
      "child-ready",
      tab,
      "init",
    );
    host.childInitInFlight.set(tab, init);
    try {
      await init;
    } finally {
      if (host.childInitInFlight.get(tab) === init) {
        host.childInitInFlight.delete(tab);
      }
    }
    return;
  }
  const actionRoute = source
    ? ASSISTANT_WORKSPACE_ACTION_REGISTRY[
        action as keyof typeof ASSISTANT_WORKSPACE_ACTION_REGISTRY
      ]
    : null;
  if (
    source &&
    (!actionRoute ||
      !actionRoute.sources.includes(source as never) ||
      Object.keys(childPayload).sort().join(",") !==
        [...actionRoute.payloadKeys].sort().join(","))
  ) {
    return;
  }
  if (
    source &&
    (actionRoute?.scope === "target-owner" ||
      actionRoute?.scope === "selected-owner") !== Boolean(owner)
  ) {
    return;
  }
  if (
    source &&
    (actionRoute?.scope === "navigation-group" ||
      actionRoute?.scope === "global") &&
    owner
  ) {
    return;
  }
  if (
    owner &&
    ![
      "set-active-conversation",
      "set-active-backend",
      "select-run",
      "select-task",
      "archive-conversation",
      "archive-run",
      "load-transcript-page",
    ].includes(action)
  ) {
    const selectedOwnerKey =
      owner.source === "acp-chat"
        ? getActiveAcpChatOwnerKey()
        : owner.source === "skillrunner"
          ? getSkillRunnerWorkspaceSelectedOwner()?.requestId ||
            getSkillRunnerWorkspaceSelectedOwner()?.runKey ||
            ""
          : getSelectedAcpSkillRunRequestId();
    if (owner.ownerKey !== selectedOwnerKey) return;
  }
  if (source === "acp-chat" && actionRoute?.scope === "navigation-group") {
    const groupId = String(childPayload.groupId || "").trim();
    const navigation = getAcpChatWorkspaceOwnerNavigation();
    if (!navigation.groups.some((group) => group.groupId === groupId)) {
      return;
    }
    actionPayload.backendId = groupId;
  }
  const ctx: AssistantWorkspaceHostActionContext = {
    host,
    target,
    owner,
    source: source || tab,
    payload: actionPayload,
  };
  if (tab === "acp-skills") {
    // The registry validation above narrows action to the source's routed
    // set; the no-source fallthrough stays defensive inside the routers.
    await handleAcpSkillRunAction(ctx, action as AcpSkillsHostRoutedAction);
    return;
  }
  if (tab === "skillrunner") {
    // Registry-routed SkillRunner actions: chrome-level actions are handled
    // host-side through the dispatch table; everything else delegates to the
    // run-workspace action dispatcher with the owner identity merged into the
    // payload.
    const handledByHost = await createSkillRunnerHostActionHandler(ctx)({
      action,
      payload: actionPayload,
    });
    if (handledByHost) {
      return;
    }
    await dispatchSkillRunnerWorkspaceAction({
      action,
      payload: actionPayload,
    });
    return;
  }
  await handleAcpChatAction(ctx, action as AcpChatHostRoutedAction);
}
