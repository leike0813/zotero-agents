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
  const parentRef = {
    libraryId: Number(parents[0]?.item?.libraryId || parents[0]?.item?.libraryID),
    key: normalizeString(parents[0]?.item?.key),
  };
  if (!Number.isSafeInteger(parentRef.libraryId) || parentRef.libraryId <= 0 || !parentRef.key) {
    throw new Error(
      "debug existing-parent bundle buildRequest requires a valid parent id",
    );
  }
  const detail = await runtime.hostApi.library.getItemDetail(parentRef);
  if (!detail || detail.kind !== "regular") throw new Error("debug existing-parent bundle parent does not exist");
  return {
    parent: detail.item,
    title:
      normalizeString(detail.item.title) ||
      normalizeString(parents[0]?.item?.title) ||
      `Parent ${parentRef.key}`,
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
