import path from "node:path";
import type { Plugin } from "esbuild";

export const acpRuntimeProfilerSideEffectsPlugin: Plugin = {
  name: "acp-runtime-profiler-side-effects",
  setup(build) {
    build.onResolve(
      {
        filter:
          /(?:^|\/)(?:acpRuntimePerformanceProfiler|acpRuntimePerformanceBaseline|acpRuntimeDiagnosticsMode|acpRuntimeSemanticTrace|acpRuntimeSemanticTraceRecorder|acpRuntimeReplayProfiler|acpRuntimeReplayTargets|acpRuntimeReplayProductionPorts|acpRuntimeReplayProfileContext|acpRuntimeReplayController)$/,
      },
      (args) => ({
        path: path.resolve(args.resolveDir, `${args.path}.ts`),
        sideEffects: false,
      }),
    );
  },
};
