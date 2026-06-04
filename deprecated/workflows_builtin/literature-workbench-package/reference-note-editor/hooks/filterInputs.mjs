import { filterReferenceNotesSelection } from "../../lib/referencesNote.mjs";
import { withPackageRuntimeScope } from "../../lib/runtime.mjs";

export function filterInputs({ selectionContext, runtime }) {
  return withPackageRuntimeScope(runtime, () =>
    filterReferenceNotesSelection({ selectionContext, runtime }),
  );
}
