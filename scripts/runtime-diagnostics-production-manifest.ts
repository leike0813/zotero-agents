export const runtimeDiagnosticsFeatureGroups = {
  profiler: {
    switchKey: "profiler",
    define: "__acp_runtime_performance_profiler_enabled__",
    exclusiveModules: [
      "src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts",
      "src/modules/acp/diagnostics/acpRuntimePerformanceBaseline.ts",
    ],
    forbiddenRuntimeMarkers: [
      "zotero-agents.acp-runtime-performance-profile.v1",
      "panel_signature_duration",
      "buffered_write_duration",
    ],
  },
  recorder: {
    switchKey: "recorder",
    define: "__acp_runtime_semantic_trace_recorder_enabled__",
    exclusiveModules: [
      "src/modules/acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts",
    ],
    forbiddenRuntimeMarkers: [
      "single-event-limit",
      "acp-traces",
      "traceSemanticEvent",
      "semanticTraceContext",
      "recordAcpRuntimeSemanticTraceEvent",
      "beginAcpRuntimeSemanticTraceClaimAttempt",
      "claimAcpRuntimeSemanticTraceRoot",
      "finishAcpRuntimeSemanticTraceRoot",
      "recordAcpRuntimeSemanticTraceRequestTerminal",
      "settleAcpRuntimeSemanticTraceOpenRequests",
      "recordAcpSessionNotificationForTrace",
      "recordAcpConnectionSemanticEvent",
      "recordAcpConnectionSessionNotification",
    ],
  },
  replay: {
    switchKey: "replay",
    define: "__acp_runtime_replay_profiler_enabled__",
    exclusiveModules: [
      "src/modules/acp/diagnostics/acpRuntimeReplayIdentity.ts",
      "src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts",
      "src/modules/acp/diagnostics/acpRuntimeReplayLogicalTime.ts",
      "src/modules/acp/diagnostics/acpRuntimeReplayTargets.ts",
      "src/modules/acp/diagnostics/acpRuntimeReplayProductionPorts.ts",
      "src/modules/acp/transport/acpSyntheticConnectionAdapter.ts",
      "src/modules/acp/diagnostics/acpRuntimeReplayProfileContext.ts",
      "src/modules/acp/diagnostics/acpRuntimeReplayController.ts",
      "src/modules/acp/diagnostics/acpRuntimeReplayPublicationSidecar.ts",
    ],
    forbiddenRuntimeMarkers: [
      "zotero-agents.acp-runtime-replay-matrix.v2",
      "ACP_RUNTIME_R2_SYNTHETIC_WORKLOAD_V1",
      "ACP_RUNTIME_LOGICAL_TIME_V1",
      "getAcpRuntimeReplayProfileContext",
      "replayPublicationNonce",
      "pendingReplayPublicationDrainIds",
      "replayPublicationWaiters",
      "replayPublicationDrainId",
      "replay-publication-applied",
      "createAcpSyntheticConnectionAdapter",
      "inspectAcpSyntheticConnectionAdapterTimers",
      "inspectAcpSkillRunTimers",
      "inspectAssistantWorkspaceReplayPostSnapshotTimer",
      "inspectAssistantWorkspaceDiagnosticsPublication",
      "forceAssistantWorkspaceDiagnosticsPublication",
    ],
  },
  skillRunnerAudit: {
    switchKey: "skillRunnerAudit",
    define: "__skillrunner_connection_audit_enabled__",
    exclusiveModules: [
      "src/modules/skillRunner/connection/skillRunnerConnectionAudit.ts",
      "src/modules/skillRunner/connection/skillRunnerConnectionAuditStore.ts",
    ],
    forbiddenRuntimeMarkers: [
      "host_bridge.debug.skillrunner.connections.snapshot.v1",
      "duplicate_stream_rejected",
      "late_resolve_after_timeout",
      "recordSkillRunnerConnectionAuditEvent",
      "readSkillRunnerConnectionAudit",
      "resetSkillRunnerConnectionAudit",
    ],
  },
  synthesisSidecar: {
    switchKey: "synthesisSidecar",
    define: "__synthesis_sidecar_diagnostics_enabled__",
    exclusiveModules: [
      "src/modules/synthesis/sidecar/synthesisSidecarTrace.ts",
      "packages/synthesis-contracts/src/sidecarObservability.ts",
    ],
    forbiddenRuntimeMarkers: [
      "synthesis-sidecar-trace-snapshot.v2",
      "synthesis-sidecar-trace-patch.v2",
      "synthesis-sidecar:events",
    ],
  },
} as const;

export type RuntimeDiagnosticsFeatureName =
  keyof typeof runtimeDiagnosticsFeatureGroups;

export const runtimeDiagnosticsSharedExclusiveModules = [
  "src/modules/acp/diagnostics/acpRuntimeDiagnosticsMode.ts",
  "src/modules/acp/diagnostics/acpRuntimeSemanticTrace.ts",
  "src/modules/acp/diagnostics/acpChatDiagnosticAuditTrail.ts",
] as const;

export const runtimeDiagnosticsExclusiveModules = [
  ...runtimeDiagnosticsSharedExclusiveModules,
  ...Object.values(runtimeDiagnosticsFeatureGroups).flatMap(
    (group) => group.exclusiveModules,
  ),
] as const;

export const forbiddenRuntimeMarkers = Object.fromEntries(
  Object.entries(runtimeDiagnosticsFeatureGroups).map(([name, group]) => [
    name,
    group.forbiddenRuntimeMarkers,
  ]),
) as Record<RuntimeDiagnosticsFeatureName, readonly string[]>;

export const forbiddenProductionRuntimeMarkers = [
  ...Object.values(forbiddenRuntimeMarkers).flat(),
  "zotero-agents.acp-runtime-semantic-trace.v1",
  "zotero-skills.acp-chat.diagnostic.v1",
  "acp-chat-diagnostic-audit",
] as const;

export const productionRuntimeContractMarkers = [
  "synthesis-sidecar-observation.v2",
] as const;

export const runtimeDiagnosticsStaticAllowances = {
  dashboardRoutesAndTemplates: [
    "src/dashboard/dashboardPanelModel.ts",
    "addon/content/dashboard/styles.css",
  ],
  locale: ["addon/locale/*/addon.ftl"],
  typeOnlyAndHiddenRoutes: ["src/modules/taskDashboardSnapshot.ts"],
} as const;

export const runtimeDiagnosticsStaticAllowanceMarkers = [
  "acp-trace-replay",
] as const;

export function runtimeDiagnosticsModuleBasenames() {
  return runtimeDiagnosticsExclusiveModules.map((modulePath) =>
    modulePath.slice(modulePath.lastIndexOf("/") + 1, -3),
  );
}
