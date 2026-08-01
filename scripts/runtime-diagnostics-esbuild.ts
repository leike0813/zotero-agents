import path from "node:path";
import type { Plugin } from "esbuild";
import {
  runtimeDiagnosticsFeatureGroups,
  runtimeDiagnosticsModuleBasenames,
} from "./runtime-diagnostics-production-manifest";

const runtimeDiagnosticsModuleFilter = new RegExp(
  `(?:^|/)(?:${runtimeDiagnosticsModuleBasenames()
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")})(?:\\.(?:js|ts))?$`,
);

const profilerModuleBasename = path.basename(
  runtimeDiagnosticsFeatureGroups.profiler.exclusiveModules[0],
  ".ts",
);
const chatDiagnosticAuditModuleBasename = path.basename(
  "src/modules/acpChatDiagnosticAuditTrail.ts",
  ".ts",
);
const synthesisSidecarDiagnosticsModuleBasename = path.basename(
  runtimeDiagnosticsFeatureGroups.synthesisSidecar.exclusiveModules[0],
  ".ts",
);
const synthesisSidecarObservabilityModuleBasename = path.basename(
  runtimeDiagnosticsFeatureGroups.synthesisSidecar.exclusiveModules[1],
  ".ts",
);

const disabledProfilerModule = `
export const ACP_RUNTIME_PERFORMANCE_PROFILE_SCHEMA = "";
export function readAcpRuntimePerformanceClockMs() { return 0; }
export function recordAcpRuntimePublicationAck() {}
export function enableAcpRuntimePerformanceProfiler() { return false; }
export function disableAcpRuntimePerformanceProfiler() {}
export function isAcpRuntimePerformanceProfilerEnabled() { return false; }
export function startAcpRuntimeProfile() {}
export function registerAcpRuntimeProfileAlias() { return false; }
export function finishAcpRuntimeProfile() {}
export function incrementAcpRuntimeMetric() {}
export function observeAcpRuntimeDuration() {}
export function observeAcpRuntimeGauge() {}
export function snapshotAcpRuntimeProfiles() { return undefined; }
export function configureAcpRuntimePerformanceProfilerForTests() {}
export function resetAcpRuntimePerformanceProfilerForTests() {}
`;

const disabledChatDiagnosticAuditModule = `
export function acpChatDiagnosticAuditOwnerKey() { return ""; }
export function activateAcpChatDiagnosticAuditOwner() {}
export function appendAcpChatDiagnosticAudit() {}
export function flushAcpChatDiagnosticAudit() { return Promise.resolve(); }
export function releaseAcpChatDiagnosticAudit() { return Promise.resolve(); }
export function discardAcpChatDiagnosticAudit() { return Promise.resolve(); }
export function resetAcpChatDiagnosticAuditForTests() { return Promise.resolve(); }
export function discardAllAcpChatDiagnosticAuditsForTests() {}
`;

const disabledSynthesisSidecarDiagnosticsModule = `
export function createSynthesisSidecarTraceContext() { return undefined; }
export function recordSynthesisSidecarTraceEvent() { return undefined; }
export function retainSynthesisSidecarNativeTraceEvent() { return undefined; }
export function readSynthesisSidecarTraceSnapshot() { return { traces: [], eventCount: 0 }; }
export function subscribeSynthesisSidecarTracePatches() { return () => {}; }
export function flushSynthesisSidecarTracePatchesForTests() {}
export function resetSynthesisSidecarTraceForTests() {}
`;

const disabledSynthesisSidecarObservabilityModule = `
export function rebuildSynthesisSidecarTraceContext() { return undefined; }
export function rebuildSynthesisSidecarObservationEvent() { return undefined; }
`;

function moduleBasename(modulePath: string) {
  return path.basename(modulePath).replace(/\.(?:js|ts)$/, "");
}

export const runtimeDiagnosticsSideEffectsPlugin: Plugin = {
  name: "runtime-diagnostics-side-effects",
  setup(build) {
    const debugDisabled =
      build.initialOptions.define?.__debug_mode__ === "false";
    const profilerDisabled =
      debugDisabled ||
      build.initialOptions.define?.[
        runtimeDiagnosticsFeatureGroups.profiler.define
      ] === "false";
    const synthesisSidecarDisabled =
      debugDisabled ||
      build.initialOptions.define?.[
        runtimeDiagnosticsFeatureGroups.synthesisSidecar.define
      ] === "false";
    build.onResolve(
      {
        filter: runtimeDiagnosticsModuleFilter,
      },
      (args) => {
        if (
          profilerDisabled &&
          moduleBasename(args.path) === profilerModuleBasename
        ) {
          return {
            path: profilerModuleBasename,
            namespace: "runtime-diagnostics-disabled",
            sideEffects: false,
          };
        }
        if (
          debugDisabled &&
          moduleBasename(args.path) === chatDiagnosticAuditModuleBasename
        ) {
          return {
            path: chatDiagnosticAuditModuleBasename,
            namespace: "runtime-diagnostics-disabled",
            sideEffects: false,
          };
        }
        if (
          synthesisSidecarDisabled &&
          moduleBasename(args.path) ===
            synthesisSidecarDiagnosticsModuleBasename
        ) {
          return {
            path: synthesisSidecarDiagnosticsModuleBasename,
            namespace: "runtime-diagnostics-disabled",
            sideEffects: false,
          };
        }
        if (
          synthesisSidecarDisabled &&
          moduleBasename(args.path) ===
            synthesisSidecarObservabilityModuleBasename
        ) {
          return {
            path: synthesisSidecarObservabilityModuleBasename,
            namespace: "runtime-diagnostics-disabled",
            sideEffects: false,
          };
        }
        return {
          path: path.resolve(
            args.resolveDir,
            args.path.endsWith(".js")
              ? `${args.path.slice(0, -3)}.ts`
              : args.path.endsWith(".ts")
                ? args.path
                : `${args.path}.ts`,
          ),
          sideEffects: false,
        };
      },
    );
    build.onLoad(
      {
        filter: new RegExp(`^${profilerModuleBasename}$`),
        namespace: "runtime-diagnostics-disabled",
      },
      () => ({
        contents: disabledProfilerModule,
        loader: "js",
      }),
    );
    build.onLoad(
      {
        filter: new RegExp(`^${chatDiagnosticAuditModuleBasename}$`),
        namespace: "runtime-diagnostics-disabled",
      },
      () => ({
        contents: disabledChatDiagnosticAuditModule,
        loader: "js",
      }),
    );
    build.onLoad(
      {
        filter: new RegExp(`^${synthesisSidecarDiagnosticsModuleBasename}$`),
        namespace: "runtime-diagnostics-disabled",
      },
      () => ({
        contents: disabledSynthesisSidecarDiagnosticsModule,
        loader: "js",
      }),
    );
    build.onLoad(
      {
        filter: new RegExp(`^${synthesisSidecarObservabilityModuleBasename}$`),
        namespace: "runtime-diagnostics-disabled",
      },
      () => ({
        contents: disabledSynthesisSidecarObservabilityModule,
        loader: "js",
      }),
    );
  },
};
