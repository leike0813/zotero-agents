import { applyResult as applyDebugApplyContractResult } from "./applyDebugApplyContractResult.mjs";

async function resolveRequestParent(args) {
  const parentRef = args?.request?.targetParentRef;
  if (!parentRef?.libraryId || !parentRef?.key) {
    throw new Error(
      "debug existing-parent bundle apply requires request target parent",
    );
  }
  const detail = await args.runtime.hostApi.library.getItemDetail(parentRef);
  if (!detail || detail.kind !== "regular") throw new Error("debug existing-parent bundle parent does not exist");
  return detail.item;
}

export async function applyResult(args) {
  const normalizedArgs = args || {};
  const parent = await resolveRequestParent(normalizedArgs);
  return applyDebugApplyContractResult({
    ...normalizedArgs,
    parent,
  });
}
