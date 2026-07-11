import { importLiteratureBundle } from "../../lib/literatureBundle.mjs";
import { requireHostApi, withPackageRuntimeScope } from "../../lib/runtime.mjs";

async function applyResultImpl({ runtime }) {
  return importLiteratureBundle({ host: requireHostApi(runtime) });
}

export async function applyResult(args) {
  return withPackageRuntimeScope(args?.runtime, () => applyResultImpl(args));
}
