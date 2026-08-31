import { exportLiteratureBundle } from "../../lib/literatureBundle.mjs";
import { requireHostApi, withPackageRuntimeScope } from "../../lib/runtime.mjs";

async function applyResultImpl({ runResult, request, runtime }) {
  const parameter = runResult?.resultJson?.parameter
    || runResult?.resultJson?.parameters
    || request?.parameter
    || request?.request?.json?.parameter
    || {};
  return exportLiteratureBundle({
    host: requireHostApi(runtime),
    selectionContext: runResult?.resultJson?.selectionContext || request?.selectionContext,
    runtime,
    mode: parameter.mode || "selection",
    targetCollection: parameter.targetCollection,
    sourceOnly: parameter.sourceOnly === true,
  });
}

export async function applyResult(args) {
  return withPackageRuntimeScope(args?.runtime, () => applyResultImpl(args));
}
