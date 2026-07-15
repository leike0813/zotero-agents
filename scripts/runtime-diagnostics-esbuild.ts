import path from "node:path";
import type { Plugin } from "esbuild";
import { runtimeDiagnosticsModuleBasenames } from "./runtime-diagnostics-production-manifest";

const runtimeDiagnosticsModuleFilter = new RegExp(
  `(?:^|/)(?:${runtimeDiagnosticsModuleBasenames()
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")})$`,
);

export const runtimeDiagnosticsSideEffectsPlugin: Plugin = {
  name: "runtime-diagnostics-side-effects",
  setup(build) {
    build.onResolve(
      {
        filter: runtimeDiagnosticsModuleFilter,
      },
      (args) => ({
        path: path.resolve(args.resolveDir, `${args.path}.ts`),
        sideEffects: false,
      }),
    );
  },
};
