import {
  rebuildSynthesisHostStagedTagBindingResolutionRequest,
  rebuildSynthesisHostTagEffectBatchRequest,
  type SynthesisHostStagedTagBindingMigrationPort,
  type SynthesisHostTagEffect,
  type SynthesisHostTagEffectPort,
  type SynthesisHostTagEffectReceipt,
} from "../../../packages/synthesis-contracts/src/index";
import { handlers } from "../../handlers";
import {
  findZoteroItemByRef,
  requireZoteroItems,
  stableRefFromZoteroItem,
} from "./zoteroItemRefAdapter";

function diagnostic(code: string) {
  return { code, severity: "error" };
}

export function createZoteroSynthesisStagedTagBindingMigrationPort(): SynthesisHostStagedTagBindingMigrationPort {
  return {
    async resolve(request) {
      const canonical =
        rebuildSynthesisHostStagedTagBindingResolutionRequest(request);
      const zotero = requireZoteroItems("Zotero staged Tag binding migration");
      const resolved = [];
      const missingItemIds: number[] = [];
      for (const itemId of canonical.itemIds) {
        const item = zotero.Items.get(itemId);
        const ref = stableRefFromZoteroItem(item, canonical.libraryId);
        if (ref) {
          resolved.push({ itemId, ref });
        } else {
          missingItemIds.push(itemId);
        }
      }
      return { resolved, missingItemIds, diagnostics: [] };
    },
  };
}

function hasTag(item: any, tag: string) {
  const target = tag.toLowerCase();
  const tags = Array.isArray(item?.getTags?.()) ? item.getTags() : [];
  return tags.some(
    (entry: any) =>
      String(entry?.tag || "")
        .trim()
        .toLowerCase() === target,
  );
}

async function applyEffect(
  zotero: any,
  effect: SynthesisHostTagEffect,
  now: () => string,
): Promise<SynthesisHostTagEffectReceipt> {
  try {
    const item = await findZoteroItemByRef(zotero, effect.target);
    if (!item) {
      return {
        effectId: effect.effectId,
        action: effect.action,
        status: "not_found",
        occurredAt: now(),
        diagnostics: [diagnostic("staged_tag_target_not_found")],
      };
    }
    if (hasTag(item, effect.tag)) {
      return {
        effectId: effect.effectId,
        action: effect.action,
        status: "already_satisfied",
        occurredAt: now(),
        diagnostics: [],
      };
    }
    await handlers.tag.add(item, [effect.tag]);
    return {
      effectId: effect.effectId,
      action: effect.action,
      status: "applied",
      occurredAt: now(),
      diagnostics: [],
    };
  } catch {
    return {
      effectId: effect.effectId,
      action: effect.action,
      status: "failed",
      occurredAt: now(),
      diagnostics: [diagnostic("staged_tag_mutation_failed")],
    };
  }
}

export function createZoteroSynthesisTagEffectPort(
  args: { now?: () => string } = {},
): SynthesisHostTagEffectPort {
  const now = args.now || (() => new Date().toISOString());
  return {
    async applyBatch(request) {
      const canonical = rebuildSynthesisHostTagEffectBatchRequest(request);
      const zotero = requireZoteroItems("Zotero staged Tag effect");
      const receipts: SynthesisHostTagEffectReceipt[] = [];
      for (const effect of canonical.effects) {
        receipts.push(await applyEffect(zotero, effect, now));
      }
      return { receipts };
    },
  };
}
