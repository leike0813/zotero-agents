import path from "node:path";
import type { Plugin } from "esbuild";
import {
  runtimeDiagnosticsFeatureGroups,
  runtimeDiagnosticsModuleBasenames,
} from "./runtime-diagnostics-production-manifest";

const runtimeDiagnosticsModuleFilter = new RegExp(
  `(?:^|/)(?:${runtimeDiagnosticsModuleBasenames()
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")})$`,
);

const profilerModuleBasename = path.basename(
  runtimeDiagnosticsFeatureGroups.profiler.exclusiveModules[0],
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
    build.onResolve(
      {
        filter: runtimeDiagnosticsModuleFilter,
      },
      (args) => {
        if (
          profilerDisabled &&
          path.basename(args.path) === profilerModuleBasename
        ) {
          return {
            path: profilerModuleBasename,
            namespace: "runtime-diagnostics-disabled",
            sideEffects: false,
          };
        }
        return {
          path: path.resolve(args.resolveDir, `${args.path}.ts`),
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
  },
};
