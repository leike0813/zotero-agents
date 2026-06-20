import {
  SKILLRUNNER_PROVIDER_STATES,
  SKILLRUNNER_TERMINAL_STATES,
} from "./skillRunnerProviderStateMachine";
import {
  SKILLRUNNER_BACKEND_AUTO_DISABLE_AFTER_MS,
  SKILLRUNNER_BACKEND_PROBE_TICK_MS,
  SKILLRUNNER_BACKEND_PROBE_BACKOFF_STEPS_MS,
  SKILLRUNNER_BACKEND_RECENT_SUCCESS_SKIP_MS,
} from "./skillRunnerBackendHealthRegistry";
import {
  SKILLRUNNER_EVENT_STREAM_CONNECT_SNAPSHOT,
  SKILLRUNNER_EVENT_STREAM_DISCONNECT_STATES,
} from "./skillRunnerSessionSyncManager";
import { MANAGED_LOCAL_BACKEND_ID } from "./skillRunnerLocalRuntimeConstants";

export const SKILLRUNNER_SSOT_FACTS = {
  states: [...SKILLRUNNER_PROVIDER_STATES],
  terminalStates: [...SKILLRUNNER_TERMINAL_STATES],
  legacyManagedBackendIds: [] as string[],
  managedLocalBackendId: MANAGED_LOCAL_BACKEND_ID,
  nonTerminalWriteSource: "events",
  terminalWriteSource: "jobs-terminal",
  backendHealth: {
    probeBackoffMs: [...SKILLRUNNER_BACKEND_PROBE_BACKOFF_STEPS_MS],
    probeTickMs: SKILLRUNNER_BACKEND_PROBE_TICK_MS,
    recentSuccessSkipMs: SKILLRUNNER_BACKEND_RECENT_SUCCESS_SKIP_MS,
    autoDisableAfterMs: SKILLRUNNER_BACKEND_AUTO_DISABLE_AFTER_MS,
    submitVisibility: "enabled_and_reachable",
    recoveryTrigger: "unreachable_to_reachable",
  },
  streamLifecycle: {
    eventConnectOnlySnapshot: SKILLRUNNER_EVENT_STREAM_CONNECT_SNAPSHOT,
    eventDisconnectStates: [...SKILLRUNNER_EVENT_STREAM_DISCONNECT_STATES],
    chatOwnership: "two-stream-mru-pool",
  },
  startup: {
    autoReconnectSnapshot: "running",
  },
  managedLocal: {
    profileCreatePolicy: "deploy-only",
    probePolicy: "probe-only-if-registry-present",
  },
  applyOwnership: {
    autoApplyOwner: "foreground-orchestrator",
    interactiveApplyOwner: "foreground-orchestrator",
    foregroundAutoApply: "apply-single-terminal-success",
    providerSubmitBoundary: "submit_phase_request_ready",
    providerPollsTerminalAfterReady: true,
    providerFetchesResultAfterReady: true,
    resultNormalizationOwner: "foreground-provider-continuation",
    bundleNormalizationOwner: "foreground-provider-continuation",
    sequenceContinueOwner: "foreground-continuation",
    resultParseFailure: "visible_failed_apply",
    bundleArtifactMissing: "visible_failed_apply",
    applyHookFailure: "visible_failed_apply",
    hostBridgeFailure: "visible_failed_apply",
    storeWriteFailure: "diagnostics_and_retry_or_failed_state",
    runStateAxis: "backend_run_state",
    applyStateAxis: [
      "idle",
      "pending",
      "running",
      "succeeded",
      "failed",
      "skipped",
    ],
  },
  reconciler: {
    missingContextIntervalScan: false,
    missingContextOneShotBoundaries: [
      "startup",
      "backend_recovery",
      "managed_local_post_up",
    ],
    missingContextSkipsNonIdleApply: false,
    recoveryOwnership: "one_shot_handoff",
    pollsJobsContinuously: false,
    fetchesResults: false,
    appliesResults: false,
    missingContextOutcome: "failed",
  },
  uiGating: {
    unavailableBackendBlocksRunDialog: true,
    unavailableBackendHiddenInHome: true,
    unavailableBackendTabDisabled: true,
    unavailableBackendWorkspaceDisabled: true,
  },
  workspace: {
    singletonRunWorkspace: true,
    stateRenderSource: "skillrunner-run-store-projection",
    firstVisibleSkillRunnerState: "running",
    preReadyProjectable: false,
    flaggedGroupRules: {
      flaggedGroupDisabled: true,
      flaggedGroupNoBubbles: false,
      flaggedGroupReleasesStreams: true,
      flaggedGroupPreservesProjections: true,
    },
    firstFrameRules: {
      firstFrameUsesRunStoreProjection: true,
      refreshFailureNoForcedRunning: true,
      noFallbackAutoSelection: true,
    },
    pendingRules: {
      waitingEdgeFetchPending: true,
      leaveWaitingClearsPending: true,
      pendingFailureRetainsLastGood: true,
      selectedWaitingOnly: true,
    },
    terminalApplyPendingVisible: true,
    terminalApplyRunningVisible: true,
    terminalApplyFailedVisible: true,
  },
} as const;
