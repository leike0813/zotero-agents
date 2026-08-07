import {
  assertLiteratureBundleImportSucceeded,
  importLiteratureBundle,
} from "../../lib/literatureBundle.mjs";
import { requireHostApi, withPackageRuntimeScope } from "../../lib/runtime.mjs";

async function applyResultImpl({ runtime }) {
  return assertLiteratureBundleImportSucceeded(
    await importLiteratureBundle({ host: requireHostApi(runtime), runtime }),
  );
}

export async function applyResult(args) {
  return withPackageRuntimeScope(args?.runtime, () => applyResultImpl(args));
}
