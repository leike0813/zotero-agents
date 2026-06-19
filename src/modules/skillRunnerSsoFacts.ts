import {
  SKILLRUNNER_PROVIDER_STATES,
  SKILLRUNNER_TERMINAL_STATES,
} from "./skillRunnerProviderStateMachine";
import {
  SKILLRUNNER_BACKEND_PROBE_BACKOFF_STEPS_MS,
  SKILLRUNNER_BACKEND_PROBE_FAILURE_THRESHOLD_FOR_GATE,
  SKILLRUNNER_BACKEND_PROBE_SUCCESS_THRESHOLD_FOR_RECOVERY,
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
    failureThresholdForGate:
      SKILLRUNNER_BACKEND_PROBE_FAILURE_THRESHOLD_FOR_GATE,
    successThresholdForRecovery:
      SKILLRUNNER_BACKEND_PROBE_SUCCESS_THRESHOLD_FOR_RECOVERY,
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
    autoApplyOwner: "reconciler",
    interactiveApplyOwner: "reconciler",
    foregroundAutoApply: "skip-and-defer-to-reconciler",
    providerSubmitBoundary: "request_ready",
    providerPollsTerminalAfterReady: false,
    providerFetchesResultAfterReady: false,
    resultNormalizationOwner: "reconciler",
    bundleNormalizationOwner: "reconciler",
    sequenceContinueOwner: "reconciler",
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
  uiGating: {
    flaggedBackendBlocksRunDialog: true,
    flaggedBackendHiddenInHome: true,
    flaggedBackendTabDisabled: true,
    flaggedBackendWorkspaceDisabled: true,
  },
  workspace: {
    singletonRunWorkspace: true,
    stateRenderSource: "skillrunner-run-store-projection",
    firstVisibleSkillRunnerState: "request_ready",
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
