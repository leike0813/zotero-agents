const BUILD_TIME_DEBUG_MODE = typeof __debug_mode__ !== "undefined" ? __debug_mode__ : false;
// Source-controlled debug capability switch. Keep this literal so the bundler
// can fold profiler instrumentation out when the capability is disabled.
export const ACP_RUNTIME_PERFORMANCE_PROFILER_ENABLED = true;
// Keep the recorder and replay switches independent: release-elision checks
// replace these literals separately and verify that neither subsystem drags the
// other into a disabled bundle.
export const ACP_RUNTIME_SEMANTIC_TRACE_RECORDER_ENABLED = true;
export const ACP_RUNTIME_REPLAY_PROFILER_ENABLED = true;
export const SKILLRUNNER_CONNECTION_AUDIT_ENABLED = false;
export const SYNTHESIS_SIDECAR_DIAGNOSTICS_ENABLED = true;
export const PI_RUNTIME_AUDIT_DEBUG_ENABLED = false;
// Assert every outgoing assistant workspace publication against the strict v1
// wire schema at the single construction funnel. Debug-only; release builds
// fold this out through the esbuild define below.
export const WORKSPACE_PUBLICATION_WIRE_ASSERT_ENABLED = true;
if (typeof __acp_runtime_performance_profiler_enabled__ === "undefined") {
    globalThis.__acp_runtime_performance_profiler_enabled__ =
        ACP_RUNTIME_PERFORMANCE_PROFILER_ENABLED;
}
if (typeof __acp_runtime_semantic_trace_recorder_enabled__ === "undefined") {
    globalThis.__acp_runtime_semantic_trace_recorder_enabled__ =
        ACP_RUNTIME_SEMANTIC_TRACE_RECORDER_ENABLED;
}
if (typeof __acp_runtime_replay_profiler_enabled__ === "undefined") {
    globalThis.__acp_runtime_replay_profiler_enabled__ =
        ACP_RUNTIME_REPLAY_PROFILER_ENABLED;
}
if (typeof __skillrunner_connection_audit_enabled__ === "undefined") {
    globalThis.__skillrunner_connection_audit_enabled__ =
        SKILLRUNNER_CONNECTION_AUDIT_ENABLED;
}
if (typeof __synthesis_sidecar_diagnostics_enabled__ === "undefined") {
    globalThis.__synthesis_sidecar_diagnostics_enabled__ =
        SYNTHESIS_SIDECAR_DIAGNOSTICS_ENABLED;
}
if (typeof __workspace_publication_wire_assert_enabled__ === "undefined") {
    globalThis.__workspace_publication_wire_assert_enabled__ =
        WORKSPACE_PUBLICATION_WIRE_ASSERT_ENABLED;
}
let debugModeOverrideForTests;
const DEBUG_MODE_OVERRIDE_KEY = "__zs_debug_mode_override_for_tests__";
export function isDebugModeEnabled() {
    if (typeof debugModeOverrideForTests === "boolean") {
        return debugModeOverrideForTests;
    }
    return BUILD_TIME_DEBUG_MODE;
}
export function isAcpRuntimePerformanceProfilerAvailable() {
    const sourceEnabled = typeof __acp_runtime_performance_profiler_enabled__ !== "undefined"
        ? __acp_runtime_performance_profiler_enabled__
        : ACP_RUNTIME_PERFORMANCE_PROFILER_ENABLED;
    return sourceEnabled && isDebugModeEnabled();
}
export function isAcpRuntimeSemanticTraceRecorderAvailable() {
    return ACP_RUNTIME_SEMANTIC_TRACE_RECORDER_ENABLED && isDebugModeEnabled();
}
export function isAcpRuntimeReplayProfilerAvailable() {
    return ACP_RUNTIME_REPLAY_PROFILER_ENABLED && isDebugModeEnabled();
}
export function isSkillRunnerConnectionAuditAvailable() {
    return __skillrunner_connection_audit_enabled__ && isDebugModeEnabled();
}
export function isSynthesisSidecarDiagnosticsAvailable() {
    const sourceEnabled = typeof __synthesis_sidecar_diagnostics_enabled__ !== "undefined"
        ? __synthesis_sidecar_diagnostics_enabled__
        : SYNTHESIS_SIDECAR_DIAGNOSTICS_ENABLED;
    return sourceEnabled && isDebugModeEnabled();
}
export function setSynthesisSidecarDiagnosticsSourceOverrideForTests(enabled) {
    globalThis.__synthesis_sidecar_diagnostics_enabled__ =
        typeof enabled === "boolean"
            ? enabled
            : SYNTHESIS_SIDECAR_DIAGNOSTICS_ENABLED;
}
export function setSkillRunnerConnectionAuditSourceOverrideForTests(enabled) {
    globalThis.__skillrunner_connection_audit_enabled__ =
        typeof enabled === "boolean"
            ? enabled
            : SKILLRUNNER_CONNECTION_AUDIT_ENABLED;
}
export function isWorkspacePublicationWireAssertAvailable() {
    return __workspace_publication_wire_assert_enabled__ && isDebugModeEnabled();
}
export function setWorkspacePublicationWireAssertOverrideForTests(enabled) {
    globalThis.__workspace_publication_wire_assert_enabled__ =
        typeof enabled === "boolean"
            ? enabled
            : WORKSPACE_PUBLICATION_WIRE_ASSERT_ENABLED;
}
export function setDebugModeOverrideForTests(enabled) {
    if (typeof enabled === "boolean") {
        debugModeOverrideForTests = enabled;
        globalThis[DEBUG_MODE_OVERRIDE_KEY] = enabled;
        return;
    }
    debugModeOverrideForTests = undefined;
    delete globalThis[DEBUG_MODE_OVERRIDE_KEY];
}
