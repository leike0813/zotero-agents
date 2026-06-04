import { filterReferenceNotesSelection } from "../../lib/referencesNote.mjs";
import { filterFreshReferenceMatchingSelection } from "../../lib/referenceMatchingFreshness.mjs";
import { withPackageRuntimeScope } from "../../lib/runtime.mjs";

export async function filterInputs({ selectionContext, runtime, executionOptions }) {
  return withPackageRuntimeScope(runtime, async () => {
    const referencesSelection = filterReferenceNotesSelection({
      selectionContext,
      runtime,
    });
    if (!referencesSelection) {
      return referencesSelection;
    }
    return filterFreshReferenceMatchingSelection({
      selectionContext: referencesSelection,
      parameter: executionOptions?.workflowParams || {},
      runtime,
    });
  });
}
