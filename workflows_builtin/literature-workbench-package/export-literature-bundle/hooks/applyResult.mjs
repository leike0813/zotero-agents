import { exportLiteratureBundle } from "../../lib/literatureBundle.mjs";
import { requireHostApi, withPackageRuntimeScope } from "../../lib/runtime.mjs";

async function applyResultImpl({ runResult, runtime }) {
  return exportLiteratureBundle({
    host: requireHostApi(runtime),
    selectionContext: runResult?.resultJson?.selectionContext,
    sourceOnly: runResult?.resultJson?.parameter?.sourceOnly === true,
  });
}

export async function applyResult(args) {
  return withPackageRuntimeScope(args?.runtime, () => applyResultImpl(args));
}
