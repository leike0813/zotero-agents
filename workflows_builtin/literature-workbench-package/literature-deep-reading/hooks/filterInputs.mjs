import { collectSelectedLiteratureSources } from "../../lib/sourceSelection.mjs";
import {
  resolveAttachmentSourcePath,
  resolveDeepReadingHtmlPathFromSourcePath,
} from "../../lib/deepReadingResultTarget.mjs";

async function hasDeepReadingTargetConflict(entry, runtime) {
  const sourcePath = await resolveAttachmentSourcePath(entry, runtime);
  const htmlPath = resolveDeepReadingHtmlPathFromSourcePath(sourcePath);
  if (!htmlPath) {
    return true;
  }
  return runtime.hostApi.file.exists(htmlPath);
}

export async function filterInputs({ selectionContext, runtime }) {
  const helpers = runtime.helpers;
  const chosen = collectSelectedLiteratureSources({
    selectionContext,
    helpers,
  });
  const accepted = [];
  for (const entry of chosen) {
    if (!(await hasDeepReadingTargetConflict(entry, runtime))) {
      accepted.push(entry);
    }
  }
  return helpers.withFilteredAttachments(selectionContext, accepted);
}
