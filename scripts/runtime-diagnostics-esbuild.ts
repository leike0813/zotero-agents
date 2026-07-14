import path from "node:path";
import type { Plugin } from "esbuild";

export const runtimeDiagnosticsSideEffectsPlugin: Plugin = {
  name: "runtime-diagnostics-side-effects",
  setup(build) {
    build.onResolve(
      {
        filter:
          /(?:^|\/)(?:acpRuntimePerformanceProfiler|acpRuntimePerformanceBaseline|acpRuntimeDiagnosticsMode|acpRuntimeSemanticTrace|acpRuntimeSemanticTraceRecorder|acpRuntimeReplayProfiler|acpRuntimeReplayTargets|acpRuntimeReplayProductionPorts|acpRuntimeReplayProfileContext|acpRuntimeReplayController|skillRunnerConnectionAudit|skillRunnerConnectionAuditStore)$/,
      },
      (args) => ({
        path: path.resolve(args.resolveDir, `${args.path}.ts`),
        sideEffects: false,
      }),
    );
  },
};
