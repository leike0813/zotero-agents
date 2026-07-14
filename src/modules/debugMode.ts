const BUILD_TIME_DEBUG_MODE: boolean =
  typeof __debug_mode__ !== "undefined" ? __debug_mode__ : false;

// Source-controlled debug capability switch. Keep this literal so the bundler
// can fold profiler instrumentation out when the capability is disabled.
export const ACP_RUNTIME_PERFORMANCE_PROFILER_ENABLED = true;

// Keep the recorder and replay switches independent: release-elision checks
// replace these literals separately and verify that neither subsystem drags the
// other into a disabled bundle.
export const ACP_RUNTIME_SEMANTIC_TRACE_RECORDER_ENABLED = true;
export const ACP_RUNTIME_REPLAY_PROFILER_ENABLED = true;
export const SKILLRUNNER_CONNECTION_AUDIT_ENABLED = false;

if (typeof __acp_runtime_performance_profiler_enabled__ === "undefined") {
  (
    globalThis as typeof globalThis & {
      __acp_runtime_performance_profiler_enabled__?: boolean;
    }
  ).__acp_runtime_performance_profiler_enabled__ =
    ACP_RUNTIME_PERFORMANCE_PROFILER_ENABLED;
}

if (typeof __acp_runtime_semantic_trace_recorder_enabled__ === "undefined") {
  (
    globalThis as typeof globalThis & {
      __acp_runtime_semantic_trace_recorder_enabled__?: boolean;
    }
  ).__acp_runtime_semantic_trace_recorder_enabled__ =
    ACP_RUNTIME_SEMANTIC_TRACE_RECORDER_ENABLED;
}

if (typeof __acp_runtime_replay_profiler_enabled__ === "undefined") {
  (
    globalThis as typeof globalThis & {
      __acp_runtime_replay_profiler_enabled__?: boolean;
    }
  ).__acp_runtime_replay_profiler_enabled__ =
    ACP_RUNTIME_REPLAY_PROFILER_ENABLED;
}

if (typeof __skillrunner_connection_audit_enabled__ === "undefined") {
  (
    globalThis as typeof globalThis & {
      __skillrunner_connection_audit_enabled__?: boolean;
    }
  ).__skillrunner_connection_audit_enabled__ =
    SKILLRUNNER_CONNECTION_AUDIT_ENABLED;
}

let debugModeOverrideForTests: boolean | undefined;
const DEBUG_MODE_OVERRIDE_KEY = "__zs_debug_mode_override_for_tests__";

type DebugModeRuntime = typeof globalThis & {
  [DEBUG_MODE_OVERRIDE_KEY]?: boolean;
};

export function isDebugModeEnabled() {
  if (typeof debugModeOverrideForTests === "boolean") {
    return debugModeOverrideForTests;
  }
  return BUILD_TIME_DEBUG_MODE;
}

export function isAcpRuntimePerformanceProfilerAvailable() {
  return ACP_RUNTIME_PERFORMANCE_PROFILER_ENABLED && isDebugModeEnabled();
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

export function setSkillRunnerConnectionAuditSourceOverrideForTests(
  enabled?: boolean,
) {
  (
    globalThis as typeof globalThis & {
      __skillrunner_connection_audit_enabled__?: boolean;
    }
  ).__skillrunner_connection_audit_enabled__ =
    typeof enabled === "boolean"
      ? enabled
      : SKILLRUNNER_CONNECTION_AUDIT_ENABLED;
}

export function setDebugModeOverrideForTests(enabled?: boolean) {
  if (typeof enabled === "boolean") {
    debugModeOverrideForTests = enabled;
    (globalThis as DebugModeRuntime)[DEBUG_MODE_OVERRIDE_KEY] = enabled;
    return;
  }
  debugModeOverrideForTests = undefined;
  delete (globalThis as DebugModeRuntime)[DEBUG_MODE_OVERRIDE_KEY];
}
