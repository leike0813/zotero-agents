import {
  buildFallbackContext,
  buildParentSnapshot,
  normalizeString,
  resolveParentItem,
  selectIdentifier,
} from "../../lib/metadataCurator.mjs";
import {
  portableItemRef,
  requireHostApi,
  withPackageRuntimeScope,
} from "../../lib/runtime.mjs";

function resolveTaskName(parent, parentRef) {
  return (
    normalizeString(parent?.title) || `item-${parentRef?.key || "metadata"}`
  );
}

async function buildRequestImpl({ selectionContext, preflight, runtime }) {
  const parentRef = portableItemRef(
    preflight?.context?.parentRef ||
      resolveParentItem(selectionContext, runtime),
  );
  const parentDetail =
    await requireHostApi(runtime).library.getItemDetail(parentRef);
  if (parentDetail?.kind !== "regular") {
    throw new Error(
      "literature-metadata-curator requires one regular parent item",
    );
  }
  const parent = parentDetail.item;
  const parentSnapshot =
    preflight?.context?.parent || buildParentSnapshot(parent);
  const identifier =
    preflight?.context?.identifier || selectIdentifier(parentSnapshot);
  const diagnostics = Array.isArray(preflight?.context?.diagnostics)
    ? preflight.context.diagnostics
    : [];
  return {
    kind: "skillrunner.job.v1",
    taskName: `Curate metadata: ${resolveTaskName(parentSnapshot, parentRef)}`,
    targetParentRef: parentRef,
    sourceAttachmentRefs: [],
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
  return withPackageRuntimeScope(args?.runtime, () =>
    buildRequestImpl(args || {}),
  );
}

export const __metadataCuratorBuildRequestTestOnly = {
  buildRequestImpl,
};
