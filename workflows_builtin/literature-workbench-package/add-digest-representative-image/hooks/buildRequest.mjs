import { withPackageRuntimeScope } from "../../lib/runtime.mjs";

export function buildRequest({ selectionContext, executionOptions, runtime }) {
  return withPackageRuntimeScope(runtime, () => ({
    kind: "pass-through.run.v1",
    selectionContext,
    parameter: executionOptions?.workflowParams || {},
    markdown_src: String(
      executionOptions?.workflowParams?.markdown_src || "",
    ).trim(),
    digestRepresentativeImageTarget:
      selectionContext?.digestRepresentativeImageTarget || null,
  }));
}
