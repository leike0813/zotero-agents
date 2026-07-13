import path from "node:path";
import type { Plugin } from "esbuild";

export const acpRuntimeProfilerSideEffectsPlugin: Plugin = {
  name: "acp-runtime-profiler-side-effects",
  setup(build) {
    build.onResolve(
      { filter: /(?:^|\/)acpRuntimePerformanceProfiler$/ },
      (args) => ({
        path: path.resolve(args.resolveDir, `${args.path}.ts`),
        sideEffects: false,
      }),
    );
  },
};
