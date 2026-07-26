import {
  buildSingleRequest,
  randomRunKey,
} from "./buildDebugApplyContractRequest.mjs";

function normalizeString(value) {
  return String(value || "").trim();
}

async function resolveSelectedParent({ selectionContext, runtime }) {
  const parents = Array.isArray(selectionContext?.items?.parents)
    ? selectionContext.items.parents
    : [];
  if (parents.length !== 1) {
    throw new Error(
      "debug existing-parent bundle buildRequest requires exactly one scoped parent",
    );
  }
  const parentId = Number(parents[0]?.item?.id || 0);
  if (!Number.isSafeInteger(parentId) || parentId <= 0) {
    throw new Error(
      "debug existing-parent bundle buildRequest requires a valid parent id",
    );
  }
  if (!runtime?.helpers?.resolveItemRef) {
    throw new Error(
      "debug existing-parent bundle buildRequest requires item resolver",
    );
  }
  let parent;
  try {
    parent = await runtime.helpers.resolveItemRef(parentId);
  } catch (_error) {
    throw new Error(
      `debug existing-parent bundle parent does not exist: ${parentId}`,
    );
  }
  if (!parent || Number(parent.id) !== parentId) {
    throw new Error(
      `debug existing-parent bundle parent does not exist: ${parentId}`,
    );
  }
  return {
    parent,
    title:
      normalizeString(parent.getField?.("title")) ||
      normalizeString(parents[0]?.item?.title) ||
      `Parent ${parentId}`,
  };
}

export async function buildRequest(args) {
  const workflowId =
    normalizeString(args?.manifest?.id) ||
    "debug-apply-existing-parent-bundle";
  const { parent, title } = await resolveSelectedParent(args || {});
  return buildSingleRequest({
    workflowId,
    parent,
    parentTitle: title,
    runKey: randomRunKey(),
    applyMode: "bundle",
  });
}
