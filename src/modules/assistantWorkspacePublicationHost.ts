import {
  getAssistantExecutionDisplayMode,
  isAssistantExecutionDisplayMode,
  setAssistantExecutionDisplayMode,
} from "./assistantExecutionDisplayPolicy";
import { isAssistantTranscriptPaginationVirtualizationEnabled } from "./assistantTranscriptRenderingPreference";
import {
  ACP_CHAT_WORKSPACE_ADAPTER,
  acpChatTranscriptPageKey,
} from "./acpChatWorkspaceSurface";
import { ACP_SKILLS_WORKSPACE_ADAPTER } from "./acpSkillsWorkspaceSurface";
import { SKILLRUNNER_WORKSPACE_ADAPTER } from "./skillRunnerWorkspaceSurface";
import {
  readAssistantWorkspaceServiceStatus,
  type AssistantWorkspacePublicationRuntimeConfiguration,
} from "./assistantWorkspacePublicationRuntime";
import { buildAssistantWorkspacePublicationLabels } from "./assistantWorkspacePublicationLabels";
import {
  getActiveAcpChatOwner,
  refreshAcpConversationBackends,
  type AcpChatWorkspaceChange,
} from "./acpSessionManager";
import { type AcpSkillRunWorkspaceChange } from "./acpSkillRunStore";
import {
  getSkillRunnerWorkspaceSelectedOwner,
  refreshSkillRunnerSidebarHostSnapshot,
  type SkillRunnerWorkspaceChange,
} from "./skillRunnerRunDialog";
import {
  ASSISTANT_WORKSPACE_ACTION_REGISTRY,
  assertAssistantWorkspacePublicationAck,
  createAcpChatWorkspaceOwner,
  createAcpSkillsWorkspaceOwner,
  type AssistantWorkspaceOwner,
  type AssistantWorkspacePublication,
  type AssistantWorkspacePublicationAck,
  type AssistantWorkspacePublicationKind,
  type AssistantWorkspacePublicationSource,
} from "./assistantWorkspacePublication";
import {
  incrementAcpRuntimeMetric,
  observeAcpRuntimeDuration,
  readAcpRuntimePerformanceClockMs,
  recordAcpRuntimePublicationAck,
} from "./acpRuntimePerformanceProfiler";
import { isDebugModeEnabled } from "./debugMode";
import { appendRuntimeLog } from "./runtimeLogManager";
import { resolveSidebarFrameWindow } from "./sidebarBrowserHost";
import {
  ASSISTANT_WORKSPACE_MESSAGE_TYPES,
  type AssistantWorkspaceTab,
} from "../shared/assistantWireContract";
import type { AcpSidebarTarget } from "./acpTypes";
import type { AssistantWorkspaceHostRuntime } from "./assistantWorkspaceSidebar";
import { getSelectedAcpSkillRunRequestId } from "./acpSkillRunWorkspaceSelection";

// Shell services owned by assistantWorkspaceSidebar (debug logging, shell
// message posting, shell window resolution, SkillRunner attach, host registry
// access). Injected once at module load so this module never imports the
// sidebar shell at runtime (the configureAcpChatTranscriptMirrorHost
// registration pattern).
export type AssistantWorkspacePublicationShellHost = {
  logAssistantWorkspaceDebug(
    host: AssistantWorkspaceHostRuntime,
    stage: string,
    message: string,
    details?: Record<string, unknown>,
  ): void;
  postShellMessage(
    host: AssistantWorkspaceHostRuntime,
    type: string,
    payload?: Record<string, unknown>,
  ): boolean;
  resolveCurrentShellWindow(host: AssistantWorkspaceHostRuntime): Window | null;
  attachSkillRunnerToShell(
    host: AssistantWorkspaceHostRuntime,
    options?: { allowInactive?: boolean },
  ): void;
  postShellInit(
    host: AssistantWorkspaceHostRuntime,
    activeTab: AssistantWorkspaceTab,
  ): void;
  getWorkspaceHost(
    win: _ZoteroTypes.MainWindow,
  ): AssistantWorkspaceHostRuntime | undefined;
};

const MAX_WORKSPACE_PUBLICATION_LIFECYCLES = 256;

let shellHost: AssistantWorkspacePublicationShellHost;

export function configureAssistantWorkspacePublicationShellHost(
  nextHost: AssistantWorkspacePublicationShellHost,
) {
  shellHost = nextHost;
}

function acpSkillRunChangeKinds(change?: AcpSkillRunWorkspaceChange) {
  return Array.isArray(change?.kinds) ? change.kinds : [];
}

export function isPureAcpSkillRunBackgroundChange(
  change?: AcpSkillRunWorkspaceChange,
) {
  if (!change || change.global === true) {
    return false;
  }
  const kinds = acpSkillRunChangeKinds(change);
  return (
    kinds.length > 0 &&
    kinds.every((kind) => kind === "transcript" || kind === "runtime-options")
  );
}

export function scheduleAcpSkillRunPublications(
  host: AssistantWorkspaceHostRuntime,
  change?: AcpSkillRunWorkspaceChange,
) {
  if (!change) return;
  host.publicationRuntime?.schedule({
    adapter: ACP_SKILLS_WORKSPACE_ADAPTER,
    change,
    context: undefined,
  });
}

// Stage 2 (dark landing): the SkillRunner surface adapter mirrors store
// changes into the publication plane while the legacy snapshot path keeps
// serving the tab. Both receive the same changes; neither disturbs the
// other.
export function scheduleSkillRunnerPublications(
  host: AssistantWorkspaceHostRuntime,
  change?: SkillRunnerWorkspaceChange,
) {
  if (!change) return;
  host.publicationRuntime?.schedule({
    adapter: SKILLRUNNER_WORKSPACE_ADAPTER,
    change,
    context: undefined,
  });
}

export function transcriptRebasePageRequest(
  owner: AssistantWorkspaceOwner,
  pageKey: string,
) {
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

export function deactivateWorkspacePublicationRuntime(
  host: AssistantWorkspaceHostRuntime,
) {
  host.pendingSnapshotTab = undefined;
  host.publicationRuntime?.deactivate();
  for (const lifecycle of host.publicationLifecycles.values()) {
    if (lifecycle.state !== "pending") continue;
    lifecycle.state = "rejected";
    lifecycle.reason = "superseded";
  }
  trimWorkspacePublicationLifecycles(host);
}

export function clearAssistantWorkspaceReadyTabs(
  host: AssistantWorkspaceHostRuntime,
  reason: string,
) {
  if (
    host.readyTabs.size === 0 &&
    host.readyTabGenerations.size === 0 &&
    host.childInitInFlight.size === 0
  ) {
    return;
  }
  shellHost.logAssistantWorkspaceDebug(
    host,
    "child-ready-state-clear",
    "Assistant Workspace child ready state cleared.",
    { reason, readyTabs: Array.from(host.readyTabs) },
  );
  host.readyTabs.clear();
  host.readyTabGenerations.clear();
  host.childInitInFlight.clear();
}

export function clearAssistantWorkspaceInitPublicationState(
  host: AssistantWorkspaceHostRuntime,
  reason: string,
) {
  if (
    !host.workspaceInitDelivery &&
    !host.workspaceInitInFlight &&
    host.childInitDeliveries.size === 0
  ) {
    return;
  }
  shellHost.logAssistantWorkspaceDebug(
    host,
    "workspace-init-publication-clear",
    "Assistant Workspace init publication state cleared.",
    {
      reason,
      workspaceInitTarget: host.workspaceInitDelivery?.target || "",
      workspaceInitInFlightTarget: host.workspaceInitInFlight?.target || "",
      childInitTabs: Array.from(host.childInitDeliveries.keys()),
    },
  );
  host.workspaceInitDelivery = null;
  host.workspaceInitInFlight = null;
  host.childInitDeliveries.clear();
}

export function hasPublishedWorkspaceBaselineInit(
  host: AssistantWorkspaceHostRuntime,
) {
  const frameWindow = shellHost.resolveCurrentShellWindow(host);
  return (
    !!frameWindow &&
    !!host.activeTarget &&
    host.workspaceInitDelivery?.frameWindow === frameWindow &&
    host.workspaceInitDelivery.target === host.activeTarget
  );
}

export function markWorkspaceBaselineInitPublished(args: {
  host: AssistantWorkspaceHostRuntime;
  frameWindow: Window;
  target: AcpSidebarTarget;
}) {
  const { host, frameWindow, target } = args;
  if (
    shellHost.resolveCurrentShellWindow(host) === frameWindow &&
    host.activeTarget === target
  ) {
    host.workspaceInitDelivery = {
      frameWindow,
      target,
    };
  }
}

export function hasPublishedChildBaselineInit(
  host: AssistantWorkspaceHostRuntime,
  tab: AssistantWorkspaceTab,
) {
  const documentGeneration = host.readyTabGenerations.get(tab);
  const delivery = host.childInitDeliveries.get(tab);
  return (
    !!documentGeneration &&
    !!host.activeTarget &&
    delivery?.documentGeneration === documentGeneration &&
    delivery.target === host.activeTarget
  );
}

export function markChildBaselineInitPublished(
  host: AssistantWorkspaceHostRuntime,
  tab: AssistantWorkspaceTab,
  target: AcpSidebarTarget,
  documentGeneration = host.readyTabGenerations.get(tab),
) {
  if (
    documentGeneration &&
    host.activeTarget === target &&
    host.readyTabGenerations.get(tab) === documentGeneration
  ) {
    host.childInitDeliveries.set(tab, {
      documentGeneration,
      target,
    });
  }
}

function trimWorkspacePublicationLifecycles(
  host: AssistantWorkspaceHostRuntime,
) {
  if (!host.publicationLifecycles) return;
  while (
    host.publicationLifecycles.size > MAX_WORKSPACE_PUBLICATION_LIFECYCLES
  ) {
    const completed = [...host.publicationLifecycles.values()].find(
      (entry) => entry.state !== "pending",
    );
    if (!completed) return;
    host.publicationLifecycles.delete(completed.publicationId);
  }
}

export function registerWorkspacePublication(
  host: AssistantWorkspaceHostRuntime,
  source: AssistantWorkspacePublicationSource,
  publicationId: string,
  publication?: AssistantWorkspacePublication,
) {
  host.publicationLifecycles ||= new Map();
  host.publicationLifecycles.set(publicationId, {
    publicationId,
    state: "pending",
    reason: null,
    failure: null,
    acknowledgements: new Set<string>(),
    ownerKey: publication?.owner.ownerKey || "",
    source: publication?.owner.source || source,
    kind: publication?.publicationKind || "owner-control",
    cause: publication?.publicationCause || "initialization",
    form: publication?.publicationForm || "snapshot",
    deliverySequence: publication?.deliverySequence || 0,
    postedAtMs:
      __acp_runtime_performance_profiler_enabled__ &&
      (typeof __debug_mode__ === "undefined"
        ? isDebugModeEnabled()
        : __debug_mode__)
        ? readAcpRuntimePerformanceClockMs()
        : 0,
  });
  trimWorkspacePublicationLifecycles(host);
}

export function assistantWorkspacePublicationMetricLabels(
  surface: AssistantWorkspacePublicationSource,
  kind: AssistantWorkspacePublicationKind,
  causality:
    | "matching-target"
    | "opposite-active"
    | "inactive-source"
    | "owner-mismatch" = "matching-target",
  phase: "initialization" | "steady-state" = "steady-state",
) {
  return {
    operationClass: "panel" as const,
    publicationKind: kind,
    publicationCausality: causality,
    publicationPhase: phase,
    publicationSurface: surface,
  };
}

export function acpChatWorkspaceSurfaceContext(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
) {
  return {
    target,
    activeTab: host.activeTab,
    hasActiveTarget: !!host.activeTarget,
    transcriptPaginationVirtualizationEnabled:
      isAssistantTranscriptPaginationVirtualizationEnabled(),
    executionDisplayMode: getAssistantExecutionDisplayMode(),
  };
}

async function initializeAcpChatWorkspaceSurface(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
  cause: "initialization" | "activation" | "owner-switch",
) {
  const publicationIds = await host.publicationRuntime?.initialize({
    adapter: ACP_CHAT_WORKSPACE_ADAPTER,
    context: acpChatWorkspaceSurfaceContext(host, target),
    cause,
    serviceStatus: readAssistantWorkspaceServiceStatus(),
  });
  return publicationIds?.at(-1);
}

async function initializeAcpSkillsWorkspaceSurface(
  host: AssistantWorkspaceHostRuntime,
  cause: "initialization" | "activation" | "owner-switch",
) {
  const publicationIds = await host.publicationRuntime?.initialize({
    adapter: ACP_SKILLS_WORKSPACE_ADAPTER,
    context: undefined,
    cause,
    serviceStatus: readAssistantWorkspaceServiceStatus(),
  });
  return publicationIds?.at(-1);
}

export function scheduleAcpChatPublications(
  host: AssistantWorkspaceHostRuntime,
  change: AcpChatWorkspaceChange,
) {
  const context = {
    target: host.activeTarget || ("library" as const),
    activeTab: host.activeTab,
    hasActiveTarget: !!host.activeTarget,
    transcriptPaginationVirtualizationEnabled:
      isAssistantTranscriptPaginationVirtualizationEnabled(),
    executionDisplayMode: getAssistantExecutionDisplayMode(),
  };
  host.publicationRuntime?.schedule({
    adapter: ACP_CHAT_WORKSPACE_ADAPTER,
    change,
    context,
  });
}

export function getActiveAcpChatOwnerKey() {
  const { backendId, conversationId } = getActiveAcpChatOwner();
  if (!backendId) return "";
  return conversationId
    ? acpChatTranscriptPageKey(backendId, conversationId)
    : `${backendId}\n`;
}

async function runAcpChatBackendRefreshBoundary(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
) {
  try {
    await refreshAcpConversationBackends();
  } catch (error) {
    appendRuntimeLog({
      level: "warn",
      scope: "system",
      component: "assistant-shell",
      operation: "acp-chat-backend-refresh",
      phase: "error",
      stage: "lifecycle-boundary",
      message: "ACP Chat backend refresh failed after shell lifecycle event.",
      error,
    });
  } finally {
    host.acpChatBackendRefreshTimer = null;
  }
}

export async function preloadAcpChatBackendsForWorkspaceInit(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
) {
  try {
    await refreshAcpConversationBackends();
  } catch (error) {
    appendRuntimeLog({
      level: "warn",
      scope: "system",
      component: "assistant-shell",
      operation: "acp-chat-backend-refresh",
      phase: "error",
      stage: "pre-init",
      message:
        "ACP Chat backend registry could not be loaded before workspace init.",
      error,
    });
  }
}

export function scheduleAcpChatBackendRefreshBoundary(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
) {
  if (host.acpChatBackendRefreshTimer) {
    return;
  }
  host.acpChatBackendRefreshTimer = setTimeout(() => {
    void runAcpChatBackendRefreshBoundary(host, target);
  }, 0);
}

export function clearAcpChatBackendRefreshBoundary(
  host: AssistantWorkspaceHostRuntime,
) {
  if (host.acpChatBackendRefreshTimer) {
    clearTimeout(host.acpChatBackendRefreshTimer);
    host.acpChatBackendRefreshTimer = null;
  }
}

async function initializeSkillRunnerWorkspaceSurface(
  host: AssistantWorkspaceHostRuntime,
  cause: "initialization" | "activation" | "owner-switch",
) {
  const publicationIds = await host.publicationRuntime?.initialize({
    adapter: SKILLRUNNER_WORKSPACE_ADAPTER,
    context: undefined,
    cause,
  });
  return publicationIds?.at(-1);
}

// SkillRunner tab activation after the Stage 3 cutover: the legacy
// CHILD_SNAPSHOT push is gone. The host attach stays (the read model's
// refresh cycles are host-gated), the refresh repopulates the read model and
// fires the publication-change notify funnel, and the runtime initialize
// publishes the baseline regions through the shared publication plane.
async function activateSkillRunnerWorkspaceSurface(
  host: AssistantWorkspaceHostRuntime,
  phase: "init" | "snapshot" = "snapshot",
  options?: { force?: boolean },
) {
  if (
    !host.activeTarget ||
    (host.activeTab !== "skillrunner" &&
      options?.force !== true &&
      phase !== "init")
  ) {
    return false;
  }
  shellHost.attachSkillRunnerToShell(host, {
    allowInactive: options?.force === true || phase === "init",
  });
  await refreshSkillRunnerSidebarHostSnapshot({
    forceInit: phase === "init",
  });
  return !!(await initializeSkillRunnerWorkspaceSurface(
    host,
    phase === "init" ? "initialization" : "activation",
  ));
}

async function postSnapshotForTab(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
  tab: AssistantWorkspaceTab,
  phase: "init" | "snapshot" = "snapshot",
  options?: { force?: boolean },
) {
  if (tab === "acp-chat") {
    if (options?.force === true || phase === "init") {
      return !!(await initializeAcpChatWorkspaceSurface(
        host,
        target,
        phase === "init" ? "initialization" : "activation",
      ));
    }
    const ownerKey = getActiveAcpChatOwnerKey();
    if (ownerKey) {
      const [backendId, conversationId] = ownerKey.split("\n", 2);
      const owner = createAcpChatWorkspaceOwner(backendId, conversationId);
      const context = acpChatWorkspaceSurfaceContext(host, target);
      const results = await Promise.all([
        host.publicationRuntime?.publishRegions({
          adapter: ACP_CHAT_WORKSPACE_ADAPTER,
          owner,
          context,
          kinds: ["owner-control"],
          cause: "activation",
        }),
        host.publicationRuntime?.requestTranscriptPage({
          adapter: ACP_CHAT_WORKSPACE_ADAPTER,
          owner,
          context,
          cause: "activation",
        }),
      ]);
      return results.some((result) =>
        Array.isArray(result) ? result.length > 0 : Boolean(result),
      );
    }
    return false;
  }
  if (tab === "acp-skills") {
    if (options?.force === true || phase === "init") {
      return !!(await initializeAcpSkillsWorkspaceSurface(
        host,
        phase === "init" ? "initialization" : "activation",
      ));
    }
    return !!(await initializeAcpSkillsWorkspaceSurface(host, "activation"));
  }
  if (tab === "skillrunner") {
    return activateSkillRunnerWorkspaceSurface(host, phase, options);
  }
  return false;
}

function canPublishAssistantWorkspaceStatePulse(
  host: AssistantWorkspaceHostRuntime,
) {
  if (!host.activeTarget) {
    return false;
  }
  return host.shell.ready && !!shellHost.resolveCurrentShellWindow(host);
}

function shouldRefreshAcpChatBackendsForWorkspacePulse(reason: string) {
  return reason === "shell-ready";
}

export function assistantWorkspaceAcpRuntimeConfiguration(): AssistantWorkspacePublicationRuntimeConfiguration {
  return {
    executionDisplayMode: getAssistantExecutionDisplayMode(),
    transcriptPaginationVirtualizationEnabled:
      isAssistantTranscriptPaginationVirtualizationEnabled(),
    actionRegistry: ASSISTANT_WORKSPACE_ACTION_REGISTRY,
  };
}

export function postAssistantWorkspacePublicationConfiguration(
  host: AssistantWorkspaceHostRuntime,
) {
  return shellHost.postShellMessage(
    host,
    ASSISTANT_WORKSPACE_MESSAGE_TYPES.SURFACE_CONFIG,
    {
      configuration: assistantWorkspaceAcpRuntimeConfiguration(),
    },
  );
}

export async function postInitialSnapshotForActiveTab(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
  phase: "init" | "snapshot" = "init",
) {
  const tab = host.activeTab;
  const documentGeneration = host.readyTabGenerations.get(tab);
  await postSnapshotForTab(host, target, tab, phase, { force: true });
  if (phase === "init") {
    markChildBaselineInitPublished(host, tab, target, documentGeneration);
  }
}

export async function publishAssistantWorkspaceStatePulse(
  host: AssistantWorkspaceHostRuntime,
  reason: string,
  tab?: AssistantWorkspaceTab,
  phase: "init" | "snapshot" = "init",
) {
  if (!canPublishAssistantWorkspaceStatePulse(host)) {
    shellHost.logAssistantWorkspaceDebug(
      host,
      "workspace-pulse-drop-inactive",
      "Assistant Workspace state pulse dropped because the host cannot publish.",
      { reason, tab, phase },
    );
    return false;
  }
  const target = host.activeTarget;
  if (!target) {
    shellHost.logAssistantWorkspaceDebug(
      host,
      "workspace-pulse-drop-no-target",
      "Assistant Workspace state pulse dropped because no active target is set.",
      { reason, tab, phase },
    );
    return false;
  }
  if (phase === "init" && reason !== "child-ready") {
    shellHost.postShellInit(host, host.activeTab);
  }
  if (shouldRefreshAcpChatBackendsForWorkspacePulse(reason)) {
    scheduleAcpChatBackendRefreshBoundary(host, target);
  }
  if (tab) {
    const documentGeneration = host.readyTabGenerations.get(tab);
    if (reason === "child-ready") {
      host.readyTabs.add(tab);
    }
    await postSnapshotForTab(host, target, tab, phase, {
      force: reason === "child-ready" || reason === "tab-switch",
    });
    if (
      phase === "init" &&
      documentGeneration &&
      host.readyTabGenerations.get(tab) === documentGeneration
    ) {
      markChildBaselineInitPublished(host, tab, target, documentGeneration);
    }
    return true;
  }
  if (phase === "init") {
    await postInitialSnapshotForActiveTab(host, target, phase);
    return true;
  }
  await postSnapshotForTab(host, target, host.activeTab, phase, {
    force: reason === "child-ready" || reason === "tab-switch",
  });
  return true;
}

async function flushScheduledWorkspacePost(
  host: AssistantWorkspaceHostRuntime,
) {
  await host.publicationRuntime?.flush();
  const tab = host.pendingSnapshotTab;
  host.pendingSnapshotTab = undefined;
  if (!tab || host.activeTab !== tab || !host.activeTarget) return;
  postSnapshotForTab(host, host.activeTarget, tab, "snapshot");
}

export function schedulePostSnapshot(
  host: AssistantWorkspaceHostRuntime,
  tab: AssistantWorkspaceTab = host.activeTab,
) {
  host.pendingSnapshotTab = tab;
  if (host.postSnapshotTimer) {
    return;
  }
  host.postSnapshotTimer = setTimeout(() => {
    host.postSnapshotTimer = null;
    void flushScheduledWorkspacePost(host);
  }, 16);
}

export function inspectAssistantWorkspaceReplayPostSnapshotTimer(args: {
  window?: _ZoteroTypes.MainWindow;
  expectedTab: "acp-chat" | "acp-skills";
  expectedChatOwner?: { backendId: string; conversationId: string };
  expectedSkillRequestIds?: readonly string[];
}): import("./acpRuntimeReplayLogicalTime").AcpRuntimeReplayLogicalTimerInspection {
  if (
    !(typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__) ||
    !__acp_runtime_replay_profiler_enabled__
  ) {
    return { timers: [], warnings: [] };
  }
  const win =
    args.window ||
    (Zotero.getMainWindow?.() as _ZoteroTypes.MainWindow | undefined);
  const host = win ? shellHost.getWorkspaceHost(win) : undefined;
  if (!host) {
    return {
      timers: [],
      warnings: ["logical-timer-contamination:workspace-host-missing"],
    };
  }
  if (!host.activeTarget || host.activeTab !== args.expectedTab) {
    return {
      timers: [],
      warnings: ["logical-timer-contamination:workspace-target"],
    };
  }
  let ownerKey = "";
  if (args.expectedChatOwner) {
    const chat = getActiveAcpChatOwner();
    if (
      chat.backendId !== args.expectedChatOwner.backendId ||
      chat.conversationId !== args.expectedChatOwner.conversationId
    ) {
      return {
        timers: [],
        warnings: ["logical-timer-contamination:workspace-chat-owner"],
      };
    }
    ownerKey = `${args.expectedChatOwner.backendId}\n${args.expectedChatOwner.conversationId}`;
  } else {
    const requestIds = Array.from(
      new Set(args.expectedSkillRequestIds || []),
    ).sort();
    if (!requestIds.includes(getSelectedAcpSkillRunRequestId())) {
      return {
        timers: [],
        warnings: ["logical-timer-contamination:workspace-skill-owner"],
      };
    }
    ownerKey = requestIds.join("\n");
  }
  const runtimeToken = host.publicationRuntime?.inspectTimer() || null;
  const nativeToken = runtimeToken || host.postSnapshotTimer;
  if (!nativeToken) return { timers: [], warnings: [] };
  const runtimeOwned = runtimeToken === nativeToken;
  let currentToken = nativeToken;
  return {
    warnings: [],
    timers: [
      {
        domain: "assistant-workspace-post-snapshot",
        ownerKey,
        delayMs: 16,
        nativeToken,
        detachNative: () => {
          if (
            shellHost.getWorkspaceHost(host.win) !== host ||
            (runtimeOwned
              ? !host.publicationRuntime?.ownsTimer(currentToken)
              : host.postSnapshotTimer !== currentToken)
          ) {
            return false;
          }
          clearTimeout(currentToken);
          return true;
        },
        fireIfCurrent: () => {
          if (
            shellHost.getWorkspaceHost(host.win) !== host ||
            (runtimeOwned
              ? !host.publicationRuntime?.ownsTimer(currentToken)
              : host.postSnapshotTimer !== currentToken)
          ) {
            return false;
          }
          if (!runtimeOwned) host.postSnapshotTimer = null;
          if (runtimeOwned) {
            void host.publicationRuntime?.flush();
          } else {
            flushScheduledWorkspacePost(host);
          }
          return true;
        },
        resumeNative: (remainingMs) => {
          if (
            shellHost.getWorkspaceHost(host.win) !== host ||
            (runtimeOwned
              ? !host.publicationRuntime?.ownsTimer(currentToken)
              : host.postSnapshotTimer !== currentToken)
          ) {
            return false;
          }
          if (runtimeOwned) {
            const replacement = host.publicationRuntime?.rescheduleFlush(
              currentToken,
              remainingMs,
            );
            if (!replacement) return false;
            currentToken = replacement;
            return true;
          }
          currentToken = setTimeout(
            () => {
              host.postSnapshotTimer = null;
              flushScheduledWorkspacePost(host);
            },
            Math.max(0, remainingMs),
          );
          host.postSnapshotTimer = currentToken;
          return true;
        },
      },
    ],
  };
}

export function setAssistantWorkspaceExecutionDisplayMode(
  host: AssistantWorkspaceHostRuntime,
  mode: unknown,
) {
  if (!isAssistantExecutionDisplayMode(mode)) {
    return getAssistantExecutionDisplayMode();
  }
  host.streamingRenderPreferenceLocalWriteDepth += 1;
  try {
    const next = setAssistantExecutionDisplayMode(mode);
    postAssistantWorkspacePublicationConfiguration(host);
    if (host.activeTarget && host.activeTab === "acp-chat") {
      const ownerKey = getActiveAcpChatOwnerKey();
      if (ownerKey) {
        const [backendId, conversationId] = ownerKey.split("\n", 2);
        void host.publicationRuntime?.requestTranscriptPage({
          adapter: ACP_CHAT_WORKSPACE_ADAPTER,
          owner: createAcpChatWorkspaceOwner(backendId, conversationId),
          context: acpChatWorkspaceSurfaceContext(host, host.activeTarget),
          cause: "rebase",
          force: true,
        });
      }
    } else if (host.activeTarget && host.activeTab === "acp-skills") {
      const requestId = getSelectedAcpSkillRunRequestId();
      if (requestId) {
        void host.publicationRuntime?.requestTranscriptPage({
          adapter: ACP_SKILLS_WORKSPACE_ADAPTER,
          owner: createAcpSkillsWorkspaceOwner(requestId),
          context: undefined,
          cause: "rebase",
          force: true,
        });
      }
    }
    return next;
  } finally {
    host.streamingRenderPreferenceLocalWriteDepth = Math.max(
      0,
      host.streamingRenderPreferenceLocalWriteDepth - 1,
    );
  }
}

export function recordWorkspacePublicationAck(
  host: AssistantWorkspaceHostRuntime,
  payload: Record<string, unknown>,
) {
  try {
    assertAssistantWorkspacePublicationAck(payload);
  } catch {
    return;
  }
  const ack: AssistantWorkspacePublicationAck = payload;
  const publicationId = String(ack.publicationId || "").trim();
  host.publicationCoordinator?.acknowledge(ack);
  const lifecycle = host.publicationLifecycles.get(publicationId);
  const acknowledgementKey = [
    ack.stage,
    ack.outcome,
    ack.reason || "",
    ack.failure?.stage || "",
    ack.failure?.code || "",
  ].join(":");
  if (!lifecycle) {
    if (
      __acp_runtime_performance_profiler_enabled__ &&
      (typeof __debug_mode__ === "undefined"
        ? isDebugModeEnabled()
        : __debug_mode__)
    ) {
      recordAcpRuntimePublicationAck(null, ack);
    }
    return;
  }
  if (lifecycle.acknowledgements.has(acknowledgementKey)) return;
  lifecycle.acknowledgements.add(acknowledgementKey);
  if (ack.outcome === "rejected" && lifecycle.state === "pending") {
    lifecycle.state = "rejected";
    lifecycle.reason = ack.reason;
    lifecycle.failure = ack.failure;
  } else if (
    lifecycle.state === "pending" &&
    ack.stage === "render-complete" &&
    ack.outcome === "accepted"
  ) {
    lifecycle.state = "render-complete";
  }
  trimWorkspacePublicationLifecycles(host);

  if (
    !__acp_runtime_performance_profiler_enabled__ ||
    !(typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__)
  ) {
    return;
  }
  const ownerKey = lifecycle.ownerKey;
  if (!ownerKey) return;
  recordAcpRuntimePublicationAck(ownerKey, ack);
  if (ack.outcome !== "accepted") return;
  const labels = {
    operationClass: "panel" as const,
    publicationKind: lifecycle.kind,
    publicationCausality: "matching-target" as const,
    publicationPhase:
      lifecycle.cause === "initialization"
        ? ("initialization" as const)
        : ("steady-state" as const),
    publicationSurface: lifecycle.source,
    publicationForm: lifecycle.form,
    publicationCause: lifecycle.cause,
    publicationDeliverySequence: String(lifecycle.deliverySequence),
    publicationId,
  };
  if (ack.stage === "shell-forward") {
    incrementAcpRuntimeMetric(ownerKey, "panel_shell_forward", labels);
    return;
  }
  if (ack.stage === "child-apply") {
    incrementAcpRuntimeMetric(ownerKey, "panel_child_apply", labels);
    return;
  }
  if (ack.stage === "render-complete") {
    incrementAcpRuntimeMetric(ownerKey, "panel_render_ack", labels);
    if (lifecycle.postedAtMs > 0) {
      observeAcpRuntimeDuration(
        ownerKey,
        "panel_render_duration",
        labels,
        readAcpRuntimePerformanceClockMs() - lifecycle.postedAtMs,
      );
    }
  }
}

export function recordWorkspacePublicationRenderObservation(
  host: AssistantWorkspaceHostRuntime,
  payload: Record<string, unknown>,
) {
  if (
    !__acp_runtime_performance_profiler_enabled__ ||
    !(typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__)
  ) {
    return;
  }
  const publicationId = String(payload.publicationId || "").trim();
  const lifecycle = host.publicationLifecycles.get(publicationId);
  if (!publicationId || !lifecycle || !lifecycle.ownerKey) return;
  const labels = {
    operationClass: "panel" as const,
    publicationKind: lifecycle.kind,
    publicationCausality: "matching-target" as const,
    publicationPhase:
      lifecycle.cause === "initialization"
        ? ("initialization" as const)
        : ("steady-state" as const),
    publicationSurface: lifecycle.source,
    publicationForm: lifecycle.form,
    publicationCause: lifecycle.cause,
    publicationDeliverySequence: String(lifecycle.deliverySequence),
    renderPath:
      payload.renderPath === "snapshot"
        ? ("snapshot" as const)
        : payload.renderPath === "recovery-full"
          ? ("recovery-full" as const)
          : ("incremental" as const),
    publicationId,
  };
  for (const [name, field] of [
    ["panel_render_inserted_rows", "insertedRows"],
    ["panel_render_updated_rows", "updatedRows"],
    ["panel_render_removed_rows", "removedRows"],
    ["panel_render_measured_rows", "measuredRows"],
  ] as const) {
    const value = Math.min(
      10_000,
      Math.max(0, Math.floor(Number(payload[field]) || 0)),
    );
    incrementAcpRuntimeMetric(lifecycle.ownerKey, name, labels, value);
  }
}

export type AssistantWorkspaceDiagnosticsPublicationOptions = {
  window?: _ZoteroTypes.MainWindow;
  tab: AssistantWorkspaceTab;
  expectedChatOwner?: {
    backendId: string;
    conversationId: string;
  };
  expectedSkillRequestId?: string;
};

export function inspectAssistantWorkspaceDiagnosticsPublicationLanes(args?: {
  window?: _ZoteroTypes.MainWindow;
}) {
  const win =
    args?.window ||
    (Zotero.getMainWindow?.() as _ZoteroTypes.MainWindow | undefined);
  const host = win ? shellHost.getWorkspaceHost(win) : undefined;
  if (!host) {
    return {
      childWindow: null,
      publications: [],
      detail: "workspace-host-not-ready",
    };
  }
  return {
    childWindow: null,
    publications: [...host.publicationLifecycles.values()].map(
      ({
        publicationId,
        source,
        deliverySequence,
        state,
        reason,
        failure,
      }) => ({
        publicationId,
        source,
        deliverySequence,
        state,
        ...(reason ? { reason } : {}),
        ...(failure ? { failure } : {}),
      }),
    ),
    detail:
      !host.activeTarget || !host.shell.ready
        ? "workspace-shell-not-ready"
        : "",
  };
}

function assistantWorkspaceDiagnosticsReadinessDetail(
  host: AssistantWorkspaceHostRuntime,
  args: AssistantWorkspaceDiagnosticsPublicationOptions,
) {
  if (!host.activeTarget) return "workspace-target-not-ready";
  if (host.activeTab !== args.tab) return "workspace-tab-not-ready";
  if (!host.shell.ready) return "workspace-shell-not-ready";
  if (!host.readyTabs.has(args.tab)) return "workspace-child-not-ready";
  if (args.expectedChatOwner) {
    const chat = getActiveAcpChatOwner();
    if (
      chat.backendId !== args.expectedChatOwner.backendId ||
      chat.conversationId !== args.expectedChatOwner.conversationId
    ) {
      return "workspace-owner-not-ready";
    }
  }
  if (
    args.expectedSkillRequestId &&
    getSelectedAcpSkillRunRequestId() !== args.expectedSkillRequestId
  ) {
    return "workspace-owner-not-ready";
  }
  return "";
}

export function inspectAssistantWorkspaceDiagnosticsPublication(
  args: AssistantWorkspaceDiagnosticsPublicationOptions,
) {
  const win =
    args.window ||
    (Zotero.getMainWindow?.() as _ZoteroTypes.MainWindow | undefined);
  const host = win ? shellHost.getWorkspaceHost(win) : undefined;
  if (!host) {
    return {
      childWindow: null,
      publications: [],
      detail: "workspace-host-not-ready",
    };
  }
  const detail = assistantWorkspaceDiagnosticsReadinessDetail(host, args);
  const shellWindow = shellHost.resolveCurrentShellWindow(host);
  const childFrame = shellWindow?.document?.getElementById(
    `assistant-frame-${args.tab}`,
  );
  const childWindow = resolveSidebarFrameWindow(childFrame || null);
  return {
    childWindow,
    publications: [...host.publicationLifecycles.values()]
      .filter((entry) => entry.source === args.tab)
      .map(
        ({
          publicationId,
          source,
          deliverySequence,
          state,
          reason,
          failure,
        }) => ({
          publicationId,
          source,
          deliverySequence,
          state,
          ...(reason ? { reason } : {}),
          ...(failure ? { failure } : {}),
        }),
      ),
    detail: detail || (childWindow ? "" : "workspace-child-not-ready"),
  };
}

export async function forceAssistantWorkspaceDiagnosticsPublication(
  args: AssistantWorkspaceDiagnosticsPublicationOptions,
) {
  const win =
    args.window ||
    (Zotero.getMainWindow?.() as _ZoteroTypes.MainWindow | undefined);
  const host = win ? shellHost.getWorkspaceHost(win) : undefined;
  if (!host || shellHost.getWorkspaceHost(host.win) !== host) {
    throw new Error("workspace-host-not-ready");
  }
  const readinessDetail = assistantWorkspaceDiagnosticsReadinessDetail(
    host,
    args,
  );
  if (readinessDetail) throw new Error(readinessDetail);
  const activeTarget = host.activeTarget;
  if (!activeTarget) {
    throw new Error("workspace-target-not-ready");
  }
  await host.publicationRuntime?.flush();
  const barrier = async (publicationId: string) => {
    const publication =
      await host.publicationCoordinator?.waitForPostedPublication(
        publicationId,
      );
    return publication
      ? {
          source: publication.owner.source,
          publicationId,
          deliverySequence: publication.deliverySequence,
        }
      : undefined;
  };
  if (args.tab === "acp-chat") {
    const ownerKey = getActiveAcpChatOwnerKey();
    if (!ownerKey) {
      const publicationId = await initializeAcpChatWorkspaceSurface(
        host,
        activeTarget,
        "activation",
      );
      return publicationId ? barrier(publicationId) : undefined;
    }
    const [backendId, conversationId] = ownerKey.split("\n", 2);
    const publication = await host.publicationRuntime?.requestTranscriptPage({
      adapter: ACP_CHAT_WORKSPACE_ADAPTER,
      owner: createAcpChatWorkspaceOwner(backendId, conversationId),
      context: acpChatWorkspaceSurfaceContext(host, activeTarget),
      cause: "diagnostic",
      force: true,
    });
    const publicationId = publication?.publicationId;
    return publicationId ? barrier(publicationId) : undefined;
  } else if (args.tab === "acp-skills") {
    const requestId = getSelectedAcpSkillRunRequestId();
    const publicationId = requestId
      ? (
          await host.publicationRuntime?.requestTranscriptPage({
            adapter: ACP_SKILLS_WORKSPACE_ADAPTER,
            owner: createAcpSkillsWorkspaceOwner(requestId),
            context: undefined,
            cause: "diagnostic",
            force: true,
          })
        )?.publicationId
      : await initializeAcpSkillsWorkspaceSurface(host, "activation");
    return publicationId ? barrier(publicationId) : undefined;
  } else {
    postSnapshotForTab(host, activeTarget, args.tab, "snapshot", {
      force: true,
    });
    return undefined;
  }
}
