import {
  rebuildSynthesisHostRelatedItemsEffectBatchRequest,
  type SynthesisHostRelatedItemsEffect,
  type SynthesisHostRelatedItemsEffectPort,
  type SynthesisHostRelatedItemsEffectReceipt,
} from "../../../packages/synthesis-contracts/src/index";
import {
  findZoteroItemByRef,
  requireZoteroItems,
} from "./zoteroItemRefAdapter";

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function hasRelatedItem(source: any, target: any) {
  const related = source.getRelatedItems?.();
  const values = Array.isArray(related)
    ? related
    : Array.isArray(source.relatedItems)
      ? source.relatedItems
      : [];
  return values.some(
    (entry: any) =>
      cleanString(entry?.key || entry) === cleanString(target?.key) ||
      Number(entry) === Number(target?.id),
  );
}

async function saveItem(item: any) {
  if (typeof item?.saveTx === "function") {
    await item.saveTx();
    return;
  }
  if (typeof item?.save === "function") {
    await item.save();
  }
}

function diagnostic(code: string, message?: string) {
  return {
    code,
    severity: "error",
    ...(message ? { message } : {}),
  };
}

async function applyEffect(
  zotero: any,
  effect: SynthesisHostRelatedItemsEffect,
  now: () => string,
): Promise<SynthesisHostRelatedItemsEffectReceipt> {
  try {
    const source = await findZoteroItemByRef(zotero, effect.source);
    const target = await findZoteroItemByRef(zotero, effect.target);
    if (!source || !target) {
      return {
        effectId: effect.effectId,
        action: effect.action,
        status: "not_found",
        occurredAt: now(),
        diagnostics: [diagnostic("related_items_target_not_found")],
      };
    }
    const exists = hasRelatedItem(source, target);
    const desired = effect.action === "ensure_present";
    if (exists === desired) {
      return {
        effectId: effect.effectId,
        action: effect.action,
        status: "already_satisfied",
        occurredAt: now(),
        diagnostics: [],
      };
    }
    if (desired) {
      if (typeof source.addRelatedItem !== "function") {
        throw new Error("Related Items add is unsupported");
      }
      await source.addRelatedItem(target);
    } else {
      if (typeof source.removeRelatedItem !== "function") {
        throw new Error("Related Items remove is unsupported");
      }
      await source.removeRelatedItem(target);
    }
    await saveItem(source);
    return {
      effectId: effect.effectId,
      action: effect.action,
      status: "applied",
      occurredAt: now(),
      diagnostics: [],
    };
  } catch (error) {
    return {
      effectId: effect.effectId,
      action: effect.action,
      status: "failed",
      occurredAt: now(),
      diagnostics: [
        diagnostic(
          "related_items_mutation_failed",
          error instanceof Error ? error.message : String(error),
        ),
      ],
    };
  }
}

export function createZoteroSynthesisRelatedItemsEffectPort(
  args: { now?: () => string } = {},
): SynthesisHostRelatedItemsEffectPort {
  const now = args.now || (() => new Date().toISOString());
  return {
    async applyBatch(request) {
      const canonical =
        rebuildSynthesisHostRelatedItemsEffectBatchRequest(request);
      const zotero = requireZoteroItems("Zotero Related Items");
      const receipts: SynthesisHostRelatedItemsEffectReceipt[] = [];
      for (const effect of canonical.effects) {
        receipts.push(await applyEffect(zotero, effect, now));
      }
      return { receipts };
    },
  };
}
