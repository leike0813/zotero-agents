import {
  buildSingleRequest,
  randomRunKey,
} from "./buildDebugApplyContractRequest.mjs";

function portableItemRef(value) {
  const source = value?.ref || value || {};
  const libraryId = source.libraryId;
  const key = String(source.key || "").trim();
  if (
    !Number.isSafeInteger(libraryId) ||
    libraryId <= 0 ||
    !key ||
    Object.keys(source).some(
      (entry) => entry !== "libraryId" && entry !== "key",
    )
  ) {
    throw new Error("portable Zotero item ref is required");
  }
  return { libraryId, key };
}

function selectionItems(selectionContext) {
  return Array.isArray(selectionContext?.items) ? selectionContext.items : [];
}

function normalizeString(value) {
  return String(value || "").trim();
}

async function resolveSelectedParent({ selectionContext, runtime }) {
  const parents = selectionItems(selectionContext).filter(
    (item) => item?.kind === "parent",
  );
  if (parents.length !== 1) {
    throw new Error(
      "debug existing-parent bundle buildRequest requires exactly one scoped parent",
    );
  }
  const parentRef = portableItemRef(parents[0].ref);
  const detail = await runtime?.hostApi?.library?.getItemDetail(parentRef);
  if (!detail || detail.kind !== "regular")
    throw new Error("debug existing-parent bundle parent does not exist");
  return {
    parent: detail.item,
    title:
      normalizeString(detail.item.title) ||
      normalizeString(parents[0]?.title) ||
      `Parent ${parentRef.key}`,
  };
}

export async function buildRequest(args) {
  const workflowId =
    normalizeString(args?.manifest?.id) || "debug-apply-existing-parent-bundle";
  const { parent, title } = await resolveSelectedParent(args || {});
  return buildSingleRequest({
    workflowId,
    parent,
    parentTitle: title,
    runKey: randomRunKey(),
    applyMode: "bundle",
  });
}
