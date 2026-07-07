import {
  buildFallbackContext,
  buildParentSnapshot,
  normalizeString,
  resolveParentItem,
  selectIdentifier,
} from "../../lib/metadataCurator.mjs";
import { withPackageRuntimeScope } from "../../lib/runtime.mjs";

function resolveTaskName(parent) {
  return normalizeString(parent?.title) || `item-${parent?.id || "metadata"}`;
}

function buildRequestImpl({ selectionContext, preflight, runtime }) {
  const parent = resolveParentItem(selectionContext, runtime);
  const parentSnapshot = preflight?.context?.parent || buildParentSnapshot(parent);
  const identifier = preflight?.context?.identifier || selectIdentifier(parentSnapshot);
  const diagnostics = Array.isArray(preflight?.context?.diagnostics)
    ? preflight.context.diagnostics
    : [];
  return {
    kind: "skillrunner.job.v1",
    taskName: `Curate metadata: ${resolveTaskName(parentSnapshot)}`,
    targetParentID: parentSnapshot.id || parent.id,
    sourceAttachmentPaths: [],
    skill_id: "literature-metadata-search",
    skill_source: "local-package",
    runtime_options: {
      execution_mode: "auto",
    },
    input: buildFallbackContext({
      parent: parentSnapshot,
      identifier,
      diagnostics,
    }),
    fetch_type: "result",
    poll: {
      interval_ms: 2000,
    },
  };
}

export function buildRequest(args) {
  return withPackageRuntimeScope(args?.runtime, () => buildRequestImpl(args || {}));
}

export const __metadataCuratorBuildRequestTestOnly = {
  buildRequestImpl,
};
