import { applyResult as applyDebugApplyContractResult } from "./applyDebugApplyContractResult.mjs";

async function resolveRequestParent(args) {
  const parentId = Number(args?.request?.targetParentID || 0);
  if (!Number.isSafeInteger(parentId) || parentId <= 0) {
    throw new Error(
      "debug existing-parent bundle apply requires request target parent",
    );
  }
  if (!args?.runtime?.helpers?.resolveItemRef) {
    throw new Error(
      "debug existing-parent bundle apply requires item resolver",
    );
  }
  let parent;
  try {
    parent = await args.runtime.helpers.resolveItemRef(parentId);
  } catch (_error) {
    throw new Error(
      `debug existing-parent bundle apply parent does not exist: ${parentId}`,
    );
  }
  if (!parent || Number(parent.id) !== parentId) {
    throw new Error(
      `debug existing-parent bundle apply parent does not exist: ${parentId}`,
    );
  }
  return parent;
}

export async function applyResult(args) {
  const normalizedArgs = args || {};
  const parent = await resolveRequestParent(normalizedArgs);
  return applyDebugApplyContractResult({
    ...normalizedArgs,
    parent,
  });
}
