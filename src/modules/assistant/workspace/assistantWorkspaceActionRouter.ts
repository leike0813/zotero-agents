import { workflowSubmissionQueue } from "../../../jobQueue/workflowSubmissionQueue";
import type { WorkflowQueueEntryId } from "../../../jobQueue/workflowSubmissionQueueContracts";
import { copyText } from "../../../utils/ztoolkit";
import { openFolderInSystemFileManager } from "../../../utils/fileSystem";
import { buildAcpHostContext } from "../../acp/chat/acpContextBuilder";
import { readSelectionContext } from "../../selectionContext";
import { createZoteroHostCapabilityBroker } from "../../zoteroHostCapabilityBroker";
import { ACP_CHAT_WORKSPACE_ADAPTER } from "../../acp/chat/acpChatWorkspaceSurface";
import {
  ACP_SKILLS_WORKSPACE_ADAPTER,
  readAcpSkillRunWorkspaceRegions,
} from "../../acp/skillRun/acpSkillsWorkspaceSurface";
import { SKILLRUNNER_WORKSPACE_ADAPTER } from "../../skillRunner/surface/skillRunnerWorkspaceSurface";
// Type-only: the runtime coordinator is injected through the shell host so
// this module keeps no runtime edge into the Pi Conversation graph.
import type { createPiConversationCoordinator } from "../../piConversation";

type PiConversationCoordinator = ReturnType<
  typeof createPiConversationCoordinator
>;
// Type-only: the Pi Skill Run coordinator is injected through the shell host
// so this module keeps no runtime edge into the Pi Skill Run graph.
import type { createPiSkillRunCoordinator } from "../../piSkillRun";

type PiSkillRunCoordinator = ReturnType<typeof createPiSkillRunCoordinator>;
// Type-only: the Pi Runtime Audit exporter is injected through the shell host
// so this module keeps no static edge to the audit graph.
import type { PiOwnerRef } from "../../piTranscriptStore";

/** Result shape the audit exporter reports; a failure never throws. */
type PiDiagnosticExportOutcome =
  | { status: "exported"; bytes?: number; complete?: boolean }
  | { status: "failed"; code: string };

function isFailedPiDiagnosticExport(
  value: unknown,
): value is { status: "failed"; code: string } {
  return (
    !!value &&
    typeof value === "object" &&
    (value as { status?: unknown }).status === "failed" &&
    typeof (value as { code?: unknown }).code === "string"
  );
}
import { openRuntimeFilePicker } from "../../../platform/filePicker";
import { getBaseName } from "../../../platform/path";
import type {
  PiReasoningLevel,
  PiSelection,
} from "../../../shared/piProviderContract";
import type { WorkflowCallControl } from "../../../workflows/types";
import { submitAcpSkillRunInteractionFiles } from "../../acp/skillRun/acpSkillRunInteractionFiles";
import {
  dispatchSkillRunnerWorkspaceAction,
  getSkillRunnerWorkspaceSelectedOwner,
} from "../../skillRunner/surface/skillRunnerRunDialog";
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
} from "../../acp/chat/acpSessionManager";
import {
  getAcpSkillRunDiagnostics,
  getAcpSkillRunWorkspaceReadModel,
} from "../../acp/skillRun/acpSkillRunStore";
import { deterministicInteractionResponseText } from "../../../shared/assistantInteractionContract";
import type {
  AssistantInteractionDeclinePayloadV1,
  AssistantInteractionDraftPayloadV1,
  AssistantInteractionSubmitPayloadV1,
} from "../../../shared/userInteractionContract";
import {
  ASSISTANT_WORKSPACE_ACTION_REGISTRY,
  createAcpChatWorkspaceOwner,
  createAcpSkillsWorkspaceOwner,
  createSkillRunnerWorkspaceOwner,
  type AssistantWorkspaceOwner,
  type AssistantWorkspacePublicationSource,
} from "../publication/assistantWorkspacePublication";
import { parseAssistantWorkspaceTranscriptPageRequest } from "../publication/assistantWorkspaceTranscriptPublication";
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
import type { AssistantWorkspacePublicationAdapter } from "../publication/assistantWorkspacePublicationRuntime";
import type { AssistantWorkspaceTab } from "../../../shared/assistantWireContract";
import type {
  AcpChatAction,
  AcpSkillsAction,
  AssistantWorkspaceChildActionEnvelope,
} from "../../../shared/assistantActionContract";
import type { AcpSidebarTarget } from "../../acpTypes";
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
} from "../../acp/skillRun/acpSkillRunActions";
import {
  getSelectedAcpSkillRunRequestId,
  selectAcpSkillRun,
} from "../../acp/skillRun/acpSkillRunWorkspaceSelection";
import { resolveAcpSkillRunPermissionRequest } from "../../acp/skillRun/acpSkillRunPermissionQueue";

// Shell services owned by assistantWorkspaceSidebar (debug logging, sidebar
// close, tab normalization, shell window resolution). Injected once at module
// load so this module never imports the sidebar shell at runtime (the
// configureAcpChatTranscriptMirrorHost registration pattern).
export type AssistantWorkspaceActionRouterShellHost = {
  /**
   * Pi Conversation surface adapter, injected by the sidebar shell host. It is
   * resolved lazily (never imported here) so this module keeps no static edge
   * to the Pi Conversation graph.
   */
  piConversationsSurface(): {
    adapter: AssistantWorkspacePublicationAdapter<
      "pi-conversations",
      any,
      any,
      any
    >;
  };
  /** Pi Conversation coordinator singleton, injected by the sidebar host. */
  piConversationCoordinator(): PiConversationCoordinator;
  /**
   * Pi Skill Run surface adapter, injected by the sidebar shell host. It is
   * resolved lazily (never imported here) so this module keeps no static edge
   * to the Pi Skill Run graph.
   */
  piSkillRunsSurface(): {
    adapter: AssistantWorkspacePublicationAdapter<
      "pi-skill-runs",
      any,
      any,
      any
    >;
  };
  /** Pi Skill Run coordinator singleton, injected by the sidebar host. */
  piSkillRunCoordinator(): PiSkillRunCoordinator;
  /**
   * Built-in Agent diagnostic exporter, injected by the sidebar host. It is
   * resolved lazily (never imported here) so this module keeps no static edge
   * to the Pi Runtime Audit graph, mirroring the Pi coordinator seams.
   */
  exportPiDiagnostics(args: {
    scope: { kind: "owner"; owner: PiOwnerRef } | { kind: "global" };
    targetPath: string;
  }): Promise<PiDiagnosticExportOutcome>;
  /**
   * Records a Pi Skill Run user-action error as surface notice state. It is
   * never run outcome or coordinator state, and never reaches the transcript.
   */
  setPiSkillRunActionNotice(requestId: string, code: string | null): void;
  openBackendManager(args: {
    window: _ZoteroTypes.MainWindow;
    initialProviderType: "acp" | "skillrunner" | "pi";
  }): Promise<void>;
  logAssistantWorkspaceDebug(
    host: AssistantWorkspaceHostRuntime,
    stage: string,
    message: string,
    details?: Record<string, unknown>,
  ): void;
  closeActiveSidebarHost(host: AssistantWorkspaceHostRuntime): boolean;
  normalizeTab(value: unknown): AssistantWorkspaceTab;
  /**
   * Localizer injected by the sidebar shell host. This module must not import
   * src/utils/locale directly: that graph reaches the plugin bootstrap and
   * would close an import cycle back into this module.
   */
  localizeString(key: string, fallback: string): string;
  resolveCurrentShellWindow(host: AssistantWorkspaceHostRuntime): Window | null;
  /**
   * Liveness of the Workspace host: the sidebar keeps the window-keyed host
   * registry, so it owns this predicate (`hosts.get(host.win) === host`).
   */
  isHostAlive(host: AssistantWorkspaceHostRuntime): boolean;
};

// var for the same cycle-safety reason as assistantWorkspacePublicationHost:
// the sidebar configures this host from its module top, which can run before
// this module body.
// eslint-disable-next-line no-var -- see the cycle-safety rationale above.
var shellHost: AssistantWorkspaceActionRouterShellHost;

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
  if (
    source === "pi-conversations" &&
    Object.keys(owner).sort().join(",") === "conversationId,ownerKey,source"
  ) {
    const conversationId = String(owner.conversationId || "").trim();
    return conversationId && String(owner.ownerKey || "") === conversationId
      ? piConversationOwner(conversationId)
      : null;
  }
  if (
    source === "pi-skill-runs" &&
    Object.keys(owner).sort().join(",") === "ownerKey,requestId,source"
  ) {
    const requestId = String(owner.requestId || "").trim();
    return requestId && String(owner.ownerKey || "") === requestId
      ? { source: "pi-skill-runs" as const, ownerKey: requestId, requestId }
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

// C18 scoped/global diagnostic export. The host owns the save target: a
// cancelled picker performs no export at all, and a selected path is passed
// straight to the Pi Runtime Audit module, which writes the ZIP atomically.
// The owner ref is bound before the await, so a selection change while the
// picker is open cannot redirect the export to a later owner.
async function exportPiDiagnosticsForOwner(ref: PiOwnerRef | null) {
  if (!ref) return;
  const picked = await openRuntimeFilePicker({
    title: "Export diagnostics",
    mode: "save",
    suggestion: `pi-diagnostics-${ref.ownerId}.zip`,
  });
  const targetPath = typeof picked === "string" ? picked.trim() : "";
  if (!targetPath) return;
  const result = await shellHost.exportPiDiagnostics({
    scope: { kind: "owner", owner: ref },
    targetPath,
  });
  // The audit module reports failure as a value so it can never throw into
  // execution. A user-initiated export has no result path of its own, so the
  // failure is re-raised here and surfaced by each source's existing local
  // error channel instead of completing silently.
  if (isFailedPiDiagnosticExport(result)) {
    throw new Error(result.code);
  }
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
  await shellHost.openBackendManager({
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
//
// Every adapter is read through a getter so this table never dereferences a
// surface module at load time. The Workspace composition is cyclic
// (host -> ACP surface -> ... -> sidebar -> this module -> ACP surface); an
// eager read here re-enters a partially initialized module and throws a
// temporal-dead-zone error under entry orders that start outside the sidebar.
const WORKSPACE_SURFACE_DISPATCH: {
  [Source in AssistantWorkspacePublicationSource]?: {
    adapter: AssistantWorkspacePublicationAdapter<Source, any, any, any>;
    context(ctx: AssistantWorkspaceHostActionContext): unknown;
  };
} = {
  "acp-chat": {
    get adapter() {
      return ACP_CHAT_WORKSPACE_ADAPTER;
    },
    context: ({ host, target }) => acpChatWorkspaceSurfaceContext(host, target),
  },
  "pi-conversations": {
    // Deferred: the Pi surface adapter is injected by the sidebar shell host
    // after module load, avoiding a static import cycle.
    get adapter() {
      return shellHost.piConversationsSurface().adapter;
    },
    context: () => undefined,
  },
  "pi-skill-runs": {
    // Deferred for the same reason as "pi-conversations": the Pi Skill Run
    // adapter is injected by the sidebar shell host after module load.
    get adapter() {
      return shellHost.piSkillRunsSurface().adapter;
    },
    context: () => undefined,
  },
  "acp-skills": {
    get adapter() {
      return ACP_SKILLS_WORKSPACE_ADAPTER;
    },
    context: () => undefined,
  },
  skillrunner: {
    get adapter() {
      return SKILLRUNNER_WORKSPACE_ADAPTER;
    },
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
  } else if (pageRequest.owner.source === "pi-skill-runs") {
    const requestId = pageRequest.owner.requestId;
    const selectedRequestId = shellHost.piSkillRunCoordinator().selectedId;
    if (!selectedRequestId || requestId !== selectedRequestId) {
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
  } else if (pageRequest.owner.source === "pi-conversations") {
    const conversationId = pageRequest.owner.conversationId;
    const selectedRequestId = shellHost.piConversationCoordinator().selectedId;
    if (!selectedRequestId || conversationId !== selectedRequestId) {
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
  if (!surface) {
    shellHost.logAssistantWorkspaceDebug(
      host,
      "workspace-surface-unbound",
      "Assistant Workspace transcript page request ignored because no surface adapter is bound to the source.",
      { tab: source },
    );
    return;
  }
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
  if (!surface) {
    shellHost.logAssistantWorkspaceDebug(
      host,
      "workspace-surface-unbound",
      "Assistant Workspace owner-details request ignored because no surface adapter is bound to the source.",
      { tab: source },
    );
    return;
  }
  await host.publicationRuntime?.requestOwnerDetails({
    adapter: surface.adapter,
    owner: owner as Extract<AssistantWorkspaceOwner, { source: Source }>,
    context: surface.context(ctx),
  });
}

// Stable, project-owned Pi Conversation failure codes. A local action failure
// crosses the log/UI boundary as one of these codes only; native error text
// (file paths, provider payloads) never does.
const PI_CONVERSATION_FAILURE_CODES: readonly string[] = [
  "admission_failed",
  "title_failed",
  "record_failed",
  "pi_attachment_reader_unavailable",
  "pi_conversation_lifecycle_frozen",
  "pi_conversation_missing",
  "pi_conversation_not_replyable",
  "pi_file_picker_unavailable",
  "pi_gateway_required",
  "pi_hash_unavailable",
  "pi_message_empty",
  "pi_permission_stale",
  "pi_permission_unavailable",
  "pi_resource_count_exceeded",
  "pi_selection_empty",
  "pi_signal_unavailable",
  "pi_summary_too_large",
  "pi_title_compaction_unavailable",
];

const PI_CONVERSATION_FAILURE_FALLBACK = "pi_conversation_action_failed";
// Rename entry point for the details drawer. An empty payload title means the
// child is asking the host to collect one; the native prompt is the only
// rename affordance the UI can reach. A cancelled prompt leaves the title
// unchanged (null), and a missing prompt fails closed.
function promptPiConversationTitle(
  host: AssistantWorkspaceHostRuntime,
  currentTitle: string,
): string | null {
  const label = shellHost.localizeString(
    "assistant-workspace-pi-rename-prompt",
    "Rename conversation",
  );
  try {
    const win = host.win as unknown as {
      prompt?: (text: string, value?: string) => string | null;
    };
    if (typeof win?.prompt === "function") {
      return win.prompt(label, currentTitle);
    }
  } catch {
    // Fall through to the fail-closed result.
  }
  return null;
}

function piConversationOwner(
  conversationId: string,
): Extract<AssistantWorkspaceOwner, { source: "pi-conversations" }> {
  return {
    source: "pi-conversations",
    ownerKey: conversationId,
    conversationId,
  };
}

function piSkillRunsOwner(
  requestId: string,
): Extract<AssistantWorkspaceOwner, { source: "pi-skill-runs" }> {
  return { source: "pi-skill-runs", ownerKey: requestId, requestId };
}

// A trusted navigation target is bound to one Workspace presentation for the
// whole turn. `resolveAndValidate()` returns the exact source MainWindow only
// while that window still presents the same Pi Conversation, in the same shell
// document and sidebar target; otherwise it returns null and never falls back
// to another window. The window travels as the transient fourth send argument
// and is never serialized into a payload, schema, transcript or receipt. Every
// observed source/owner transition marks the interaction permanently stale, so
// switching away and back cannot revive an old interaction.
type PiNavigationTarget = NonNullable<WorkflowCallControl["target"]>;

/**
 * Permanently invalidates the Pi navigation target bound to this host. The
 * sidebar calls it on a source switch and the router calls it on an owner
 * switch; invalidation is sticky for the bound interaction.
 */
export function invalidateAssistantWorkspacePiNavigationTargets(
  host: AssistantWorkspaceHostRuntime,
) {
  host.invalidatePiNavigation?.();
}

function buildPiNavigationTarget(
  host: AssistantWorkspaceHostRuntime,
  conversationId: string,
): PiNavigationTarget | undefined {
  const sourceWindow = host.win;
  const shellWindow = shellHost.resolveCurrentShellWindow(host);
  const activeTarget = host.activeTarget;
  const documentGeneration = host.readyTabGenerations.get("pi-conversations");
  // A source interaction without a presented shell document or target has no
  // authority to bind; a missing generation must never be admitted (an absent
  // captured and absent presented value would otherwise compare equal).
  if (!shellWindow || !activeTarget || !documentGeneration) return undefined;
  const coordinator = shellHost.piConversationCoordinator();
  // A host presents at most one source interaction, so a new send replaces the
  // previous binding: the earlier interaction is permanently stale.
  host.invalidatePiNavigation?.();
  let invalidated = false;
  const invalidate = () => {
    invalidated = true;
  };
  host.invalidatePiNavigation = invalidate;
  return {
    resolveAndValidate() {
      try {
        const presented =
          !invalidated &&
          shellHost.isHostAlive(host) &&
          !sourceWindow.closed &&
          host.activeTab === "pi-conversations" &&
          host.activeTarget === activeTarget &&
          host.readyTabGenerations.get("pi-conversations") ===
            documentGeneration &&
          coordinator.selectedId === conversationId &&
          shellHost.resolveCurrentShellWindow(host) === shellWindow;
        if (!presented) {
          invalidated = true;
          if (host.invalidatePiNavigation === invalidate)
            host.invalidatePiNavigation = undefined;
          return null;
        }
        return sourceWindow;
      } catch {
        // Any resolution failure is a lost presentation: fail closed and stay
        // stale rather than returning a window on an unexpected error.
        invalidated = true;
        return null;
      }
    },
  };
}

function piConversationFailureCode(
  error: unknown,
  fallback: string = PI_CONVERSATION_FAILURE_FALLBACK,
): string {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message || "")
      : "";
  return PI_CONVERSATION_FAILURE_CODES.includes(message) ? message : fallback;
}
// Pi Conversation host routing. Every handler dispatches to the Conversation
// Local-network authorization crosses the host boundary as an operation-scoped
// callback. The coordinator reuses the exact callback for the turn and for the
// asynchronous title task, prompting again when the requested endpoint differs;
// the granted boolean is per-invocation and is never persisted. The endpoint is
// shown only inside the user dialog and never logged.
export type PiLocalNetworkAuthorizer = (endpoint: string) => Promise<boolean>;

/** One window-scoped local-network approval dialog; shared by every Pi turn. */
export function buildPiLocalNetworkAuthorizer(host: {
  win: _ZoteroTypes.MainWindow;
}): PiLocalNetworkAuthorizer {
  return async (endpoint) => {
    const target = String(endpoint || "").slice(0, 300);
    const title = shellHost.localizeString(
      "assistant-workspace-pi-local-network-title" as never,
      "Allow local network access?",
    );
    const body = shellHost.localizeString(
      "assistant-workspace-pi-local-network-prompt" as never,
      "The built-in agent wants to contact this local endpoint:",
    );
    try {
      const prompt = (Zotero as any)?.Prompt;
      if (typeof prompt?.confirm === "function") {
        return (
          prompt.confirm({
            window: host.win,
            title,
            text: target ? body + "\n\n" + target : body,
            button0: shellHost.localizeString(
              "assistant-workspace-pi-local-network-allow" as never,
              "Allow",
            ),
            button1: shellHost.localizeString(
              "assistant-workspace-pi-local-network-deny" as never,
              "Deny",
            ),
            defaultButton: 1,
          }) === 0
        );
      }
    } catch {
      // Fail closed: a local-network grant is never inferred.
    }
    return false;
  };
}

// coordinator singleton; per-action local failures become bounded structured
// state (composer errors and control status) instead of propagating to the
// child. send() resolves the started turn handle, not the finished stream, so
// the child acknowledges before streaming completes.
async function handlePiConversationAction(
  ctx: AssistantWorkspaceHostActionContext,
  action: string,
) {
  const { host, owner, payload } = ctx;
  const coordinator = shellHost.piConversationCoordinator();
  const authorizeLocalNetwork = buildPiLocalNetworkAuthorizer(host);
  const conversationId =
    owner?.source === "pi-conversations"
      ? owner.conversationId
      : String(payload.conversationId || "").trim();
  const refreshComposer = () => {
    if (!conversationId) return;
    void host.publicationRuntime?.publishRegions({
      adapter: shellHost.piConversationsSurface().adapter,
      owner: piConversationOwner(conversationId),
      context: {},
      kinds: ["composer", "owner-control"],
      cause: "steady-state",
    });
  };
  const setComposerError = (code: string) => {
    if (!conversationId) return;
    coordinator.setComposerError(conversationId, code);
  };
  if (action === "load-transcript-page") {
    await loadTranscriptPageForSource("pi-conversations", ctx);
    return;
  }
  const runLocal = async (
    work: () => Promise<unknown> | unknown,
    failureCode: string = PI_CONVERSATION_FAILURE_FALLBACK,
  ) => {
    try {
      await work();
      return true;
    } catch (error) {
      const code = piConversationFailureCode(error, failureCode);
      // Only the stable project-owned code crosses the log/UI boundary; the
      // raw error message never does.
      shellHost.logAssistantWorkspaceDebug(
        host,
        "pi-conversation-action-failed",
        "Pi Conversation action failed.",
        { tab: "pi-conversations", action, code },
      );
      setComposerError(code);
      refreshComposer();
      return false;
    }
  };
  if (action === "export-diagnostics") {
    if (conversationId) {
      await runLocal(() =>
        exportPiDiagnosticsForOwner({
          kind: "conversation",
          ownerId: conversationId,
        }),
      );
    }
    return;
  }
  // A Conversation check only reassesses its holds. It never dispatches: the
  // next real prompt is a new foreground turn the user sends.
  if (action === "check-owner-recovery") {
    if (conversationId)
      await runLocal(() => coordinator.checkRecovery(conversationId));
    return;
  }
  if (action === "new-conversation") {
    let status = "unavailable";
    try {
      status = (await coordinator.create()).status;
    } catch (error) {
      shellHost.logAssistantWorkspaceDebug(
        host,
        "pi-conversation-create-failed",
        "Pi Conversation creation failed.",
        {
          tab: "pi-conversations",
          code: piConversationFailureCode(error),
        },
      );
      return;
    }
    if (status === "created") return;
    const message = shellHost.localizeString(
      "assistant-workspace-pi-new-unavailable" as never,
      "No usable built-in agent configuration is available yet. Configure one now?",
    );
    let configure = false;
    try {
      const prompt = (Zotero as any)?.Prompt;
      configure =
        typeof prompt?.confirm === "function" &&
        prompt.confirm({
          window: host.win,
          title: shellHost.localizeString(
            "assistant-workspace-pi-new-unavailable-title" as never,
            "Built-in agent unavailable",
          ),
          text: message,
          button0: shellHost.localizeString(
            "assistant-workspace-pi-configure" as never,
            "Configure",
          ),
          button1: shellHost.localizeString(
            "assistant-workspace-pi-cancel" as never,
            "Cancel",
          ),
          defaultButton: 0,
        }) === 0;
    } catch {
      configure =
        typeof host.win.confirm === "function"
          ? host.win.confirm(message)
          : false;
    }
    if (configure) {
      await shellHost.openBackendManager({
        window: host.win,
        initialProviderType: "pi",
      });
    }
    return;
  }
  if (action === "set-active-conversation") {
    // Selecting a different owner is a presentation transition; re-selecting
    // the current owner is a no-op and must keep a live binding valid.
    if (conversationId && coordinator.selectedId !== conversationId)
      invalidateAssistantWorkspacePiNavigationTargets(host);
    if (conversationId) coordinator.select(conversationId);
    return;
  }
  if (action === "send-prompt") {
    const message = String(payload.message || "");
    if (!conversationId) return;
    void coordinator
      .send(
        conversationId,
        message,
        authorizeLocalNetwork,
        buildPiNavigationTarget(host, conversationId),
      )
      .catch(() => refreshComposer());
    return;
  }
  if (action === "cancel") {
    if (conversationId) coordinator.cancel(conversationId);
    return;
  }
  if (action === "rename-conversation") {
    if (!conversationId) return;
    let title = String(payload.title || "").trim();
    if (!title) {
      const current = await coordinator.readModel(conversationId);
      const entered = promptPiConversationTitle(
        host,
        String(current.title || ""),
      );
      if (entered === null) return;
      title = String(entered).trim();
      if (!title) return;
    }
    await runLocal(() => coordinator.rename(conversationId, title));
    return;
  }
  if (action === "compact-conversation") {
    if (conversationId)
      await runLocal(() =>
        coordinator.compact(conversationId, authorizeLocalNetwork),
      );
    return;
  }
  if (action === "archive-conversation") {
    if (conversationId)
      await runLocal(() => coordinator.archive(conversationId));
    return;
  }
  if (action === "restore-conversation") {
    if (conversationId)
      await runLocal(() => coordinator.restore(conversationId));
    return;
  }
  if (action === "delete-conversation") {
    if (conversationId)
      await runLocal(() => coordinator.delete(conversationId));
    return;
  }
  if (action === "add-resource") {
    if (!conversationId) return;
    const kind = String(payload.kind || "");
    await runLocal(
      () =>
        kind === "files"
          ? coordinator.addFiles(conversationId, host.win)
          : coordinator.addSelection(conversationId, host.win),
      "pi_resource_add_failed",
    );
    return;
  }
  if (action === "remove-resource") {
    const resourceId = String(payload.resourceId || "");
    if (conversationId && resourceId)
      await runLocal(
        () => coordinator.removeResource(conversationId, resourceId),
        "pi_resource_add_failed",
      );
    return;
  }
  if (action === "set-model") {
    const modelId = String(payload.modelId || "").trim();
    if (conversationId && modelId)
      await runLocal(() =>
        coordinator.setSelection(conversationId, { configurationId: modelId }),
      );
    return;
  }
  if (action === "set-reasoning-effort") {
    const effortId = String(payload.effortId || "").trim();
    if (!conversationId || !effortId) return;
    const model = await coordinator.readModel(conversationId);
    const configurationId = model.model?.configurationId;
    if (!configurationId) return;
    const selection: PiSelection = {
      configurationId,
      reasoning: effortId as PiReasoningLevel,
    };
    await runLocal(() => coordinator.setSelection(conversationId, selection));
    return;
  }
  if (action === "resolve-permission") {
    const requestId = String(payload.permissionRequestId || "").trim();
    const outcome = String(payload.outcome || "").trim();
    const optionId = String(payload.optionId || "").trim();
    // Deny is the safe default: the shared permission model reports Deny as
    // outcome=selected with optionId=deny, so only an explicit approve
    // selection may run the pending tool call.
    const decision =
      outcome === "selected" && optionId === "approve" ? "approve" : "deny";
    if (conversationId && requestId)
      await runLocal(() =>
        coordinator.permission(conversationId, requestId, decision),
      );
    return;
  }
  // Shared drawer/global chrome actions are local to the child and handled by
  // the generic routes; nothing else routes here.
}

// Pi Skill Run host routing. Every handler dispatches to the Pi Skill Run
// coordinator singleton; local failures stay bounded and structured (a short
// project-owned code for logs) instead of propagating to the child.
const PI_SKILL_RUN_FAILURE_FALLBACK = "pi_skill_run_action_failed";

function piSkillRunFailureCode(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message || "")
      : "";
  return /^[a-z][a-z0-9_]{0,63}$/.test(message)
    ? message
    : PI_SKILL_RUN_FAILURE_FALLBACK;
}

function piSkillRunRequestId(ctx: AssistantWorkspaceHostActionContext) {
  return ctx.owner?.source === "pi-skill-runs"
    ? ctx.owner.requestId
    : String(ctx.payload.requestId || "").trim();
}

// The page names the exact batch/question/slot it is answering; the host never
// guesses which question a file selection belongs to. Sources stay user-picked
// ordinary files and the coordinator owns the immutable snapshot.
async function submitPiSkillRunInteractionFiles(
  requestId: string,
  payload: Record<string, unknown>,
) {
  const batchId = String(payload.batchId || "").trim();
  const questionId = String(payload.questionId || "").trim();
  const slotId = String(payload.slotId || "").trim();
  const mutationId = String(payload.mutationId || "").trim();
  const baseRevision = Number(payload.baseRevision);
  if (
    !batchId ||
    !questionId ||
    !mutationId ||
    !Number.isSafeInteger(baseRevision)
  ) {
    throw new Error("interaction_file_request_invalid");
  }
  const picked = await openRuntimeFilePicker({
    title: "Add files",
    mode: "multiple",
  });
  if (!picked) return;
  const sources = (Array.isArray(picked) ? picked : [picked])
    .map((path) => String(path || "").trim())
    .filter(Boolean)
    .map((path) => ({ path, displayName: getBaseName(path) }));
  if (!sources.length) return;
  await shellHost.piSkillRunCoordinator().submitFiles(
    requestId,
    {
      batchId,
      questionId,
      ...(slotId ? { slotId } : {}),
      baseRevision,
      mutationId,
    },
    sources,
  );
}

async function handlePiSkillRunAction(
  ctx: AssistantWorkspaceHostActionContext,
  action: string,
) {
  const { host, payload } = ctx;
  const coordinator = shellHost.piSkillRunCoordinator();
  const requestId = piSkillRunRequestId(ctx);
  const runLocal = async (work: () => Promise<unknown> | unknown) => {
    try {
      await work();
    } catch (error) {
      const code = piSkillRunFailureCode(error);
      // A user-initiated action error is published as surface notice state
      // only. It never becomes a run outcome or coordinator state.
      shellHost.setPiSkillRunActionNotice(requestId, code);
      void host.publicationRuntime?.publishRegions({
        adapter: shellHost.piSkillRunsSurface().adapter,
        owner: piSkillRunsOwner(requestId),
        context: {},
        kinds: ["owner-presentation"],
        cause: "steady-state",
      });
      shellHost.logAssistantWorkspaceDebug(
        host,
        "pi-skill-run-action-failed",
        "Pi Skill Run action failed.",
        { tab: "pi-skill-runs", action, code },
      );
    }
  };
  if (action === "load-transcript-page") {
    await loadTranscriptPageForSource("pi-skill-runs", ctx);
    return;
  }
  if (action === "request-owner-details") {
    await requestOwnerDetailsForSource("pi-skill-runs", ctx);
    return;
  }
  if (!requestId) return;
  if (action === "export-diagnostics") {
    await runLocal(() =>
      exportPiDiagnosticsForOwner({ kind: "skill_run", ownerId: requestId }),
    );
    return;
  }
  // Recovery is explicit and evidence-bound: the check observes the Broker and
  // reassesses the owner, and the continue resumes only a resolved owner. Both
  // reuse the existing owner surfaces, so no new region is published.
  if (action === "check-owner-recovery") {
    await runLocal(() => coordinator.recover(requestId));
    return;
  }
  if (action === "continue-owner-recovery") {
    await runLocal(() => coordinator.continueRecovery(requestId));
    return;
  }
  if (action === "enable-pi-skill-run-restart") {
    await runLocal(() => coordinator.setTaskRestartConsent(requestId, true));
    return;
  }
  if (action === "disable-pi-skill-run-restart") {
    await runLocal(() => coordinator.setTaskRestartConsent(requestId, false));
    return;
  }
  if (action === "select-run") {
    await coordinator.select(requestId);
    return;
  }
  if (action === "archive-run") {
    await runLocal(() => coordinator.archive(requestId));
    return;
  }
  if (action === "cancel-run") {
    await runLocal(() => coordinator.cancel(requestId));
    return;
  }
  if (action === "interrupt-run-turn") {
    await runLocal(() => coordinator.interrupt(requestId));
    return;
  }
  if (action === "reply-run") {
    await runLocal(() =>
      coordinator.reply(requestId, String(payload.message || "")),
    );
    return;
  }
  if (action === "resolve-permission") {
    const callId = String(payload.permissionRequestId || "").trim();
    // Deny is the safe default: only an explicit approve selection runs it.
    const decision =
      String(payload.outcome || "").trim() === "selected" &&
      String(payload.optionId || "").trim() === "approve"
        ? "approve"
        : "deny";
    if (callId) {
      await runLocal(() =>
        coordinator.resolvePermission(requestId, callId, decision),
      );
    }
    return;
  }
  if (action === "draft") {
    await runLocal(() =>
      coordinator.updateDraft(
        requestId,
        payload as unknown as AssistantInteractionDraftPayloadV1,
      ),
    );
    return;
  }
  if (action === "submit") {
    await runLocal(() =>
      coordinator.submitInteraction(
        requestId,
        payload as unknown as AssistantInteractionSubmitPayloadV1,
      ),
    );
    return;
  }
  if (action === "decline") {
    await runLocal(() =>
      coordinator.declineInteraction(
        requestId,
        payload as unknown as AssistantInteractionDeclinePayloadV1,
      ),
    );
    return;
  }
  if (action === "submit-interaction-files") {
    await runLocal(() => submitPiSkillRunInteractionFiles(requestId, payload));
    return;
  }
  if (action === "set-model") {
    const modelId = String(payload.modelId || "").trim();
    if (modelId) {
      await runLocal(() =>
        coordinator.setModel(requestId, { configurationId: modelId }),
      );
    }
    return;
  }
  if (action === "set-reasoning-effort") {
    const effortId = String(payload.effortId || "").trim();
    if (effortId) {
      await runLocal(() =>
        coordinator.setReasoning(requestId, effortId as PiReasoningLevel),
      );
    }
    return;
  }
  if (action === "copy-request-id") {
    copyText(requestId);
  }
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
              createZoteroHostCapabilityBroker(() => host.win),
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
    payload.source === "pi-conversations" ||
    payload.source === "acp-chat" ||
    payload.source === "pi-skill-runs" ||
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
          : owner?.source === "pi-conversations"
            ? { conversationId: owner.conversationId }
            : owner?.source === "pi-skill-runs"
              ? { requestId: owner.requestId }
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
      "restore-conversation",
      "delete-conversation",
      "archive-run",
      "load-transcript-page",
    ].includes(action)
  ) {
    const selectedOwnerKey =
      owner.source === "pi-conversations"
        ? shellHost.piConversationCoordinator().selectedId || ""
        : owner.source === "acp-chat"
          ? getActiveAcpChatOwnerKey()
          : owner.source === "skillrunner"
            ? getSkillRunnerWorkspaceSelectedOwner()?.requestId ||
              getSkillRunnerWorkspaceSelectedOwner()?.runKey ||
              ""
            : owner.source === "pi-skill-runs"
              ? shellHost.piSkillRunCoordinator().selectedId || ""
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
  if (tab === "pi-conversations") {
    await handlePiConversationAction(ctx, action);
    return;
  }
  if (tab === "pi-skill-runs") {
    await handlePiSkillRunAction(ctx, action);
    return;
  }
  await handleAcpChatAction(ctx, action as AcpChatHostRoutedAction);
}
