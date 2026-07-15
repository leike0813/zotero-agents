import {
  SynthesisClientError,
  type SynthesisHostItemRef,
} from "../../../packages/synthesis-contracts/src/index";

function cleanString(value: unknown) {
  return String(value || "").trim();
}

export function requireZoteroItems(capability: string) {
  const zotero = (globalThis as { Zotero?: any }).Zotero;
  if (!zotero?.Items) {
    throw new SynthesisClientError(
      "unavailable",
      `${capability} Host is unavailable`,
    );
  }
  return zotero;
}

export async function findZoteroItemByRef(
  zotero: any,
  ref: SynthesisHostItemRef,
) {
  const direct = await zotero.Items?.getByLibraryAndKey?.(
    ref.libraryId,
    ref.itemKey,
  );
  if (direct) return direct;
  const rows = await zotero.Items?.getAll?.(ref.libraryId);
  if (!Array.isArray(rows)) return null;
  return (
    rows.find(
      (item: any) =>
        cleanString(item?.key) === ref.itemKey &&
        Number(item?.libraryID) === ref.libraryId,
    ) || null
  );
}

export function stableRefFromZoteroItem(
  item: any,
  expectedLibraryId: number,
): SynthesisHostItemRef | null {
  const libraryId = Number(item?.libraryID);
  const itemKey = cleanString(item?.key);
  if (libraryId !== expectedLibraryId || !/^[A-Za-z0-9]+$/.test(itemKey)) {
    return null;
  }
  return { libraryId, itemKey };
}
