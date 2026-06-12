import { collectSelectedLiteratureSources } from "../../lib/sourceSelection.mjs";

export function filterInputs({ selectionContext, runtime }) {
  const helpers = runtime.helpers;
  const chosen = collectSelectedLiteratureSources({
    selectionContext,
    helpers,
  });
  return helpers.withFilteredAttachments(selectionContext, chosen);
}
