import {
  rebuildSynthesisHostStagedTagBindingResolutionRequest,
  rebuildSynthesisHostTagEffectBatchRequest,
  hashSynthesisContractCanonicalJson,
  type SynthesisHostStagedTagBindingMigrationPort,
  type SynthesisHostTagEffect,
  type SynthesisHostTagEffectPort,
  type SynthesisHostTagEffectReceipt,
} from "../../../packages/synthesis-contracts/src/index";
import {
  createZoteroHostCapabilityBroker,
  ZoteroHostCapabilityError,
  type ZoteroHostCapabilityBroker,
} from "../zoteroHostCapabilityBroker";
import {
  requireZoteroItems,
  stableRefFromZoteroItem,
} from "./zoteroItemRefAdapter";

function diagnostic(code: string) {
  return { code, severity: "error" as const };
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

async function applyEffect(
  broker: ZoteroHostCapabilityBroker,
  effect: SynthesisHostTagEffect,
  now: () => string,
): Promise<SynthesisHostTagEffectReceipt> {
  try {
    const result = await broker.mutations.execute(
      {
        operation: "item.updateTags",
        operationId: `tag-effect:${hashSynthesisContractCanonicalJson(effect.effectId)}`,
        itemRef: {
          libraryId: effect.target.libraryId,
          key: effect.target.itemKey,
        },
        add: [effect.tag],
        remove: [],
      },
      { ownerId: "synthesis.tags" },
    );
    if ("attempt" in result) {
      const missing = result.attempt.error.code === "not_found";
      return {
        effectId: effect.effectId,
        action: effect.action,
        status: missing ? "not_found" : "failed",
        occurredAt: now(),
        diagnostics: [
          diagnostic(
            missing
              ? "staged_tag_target_not_found"
              : "staged_tag_mutation_failed",
          ),
        ],
      };
    }
    return {
      effectId: effect.effectId,
      action: effect.action,
      status: result.outcome === "unchanged" ? "already_satisfied" : "applied",
      occurredAt: now(),
      diagnostics: [],
    };
  } catch (error) {
    const missing =
      error instanceof ZoteroHostCapabilityError && error.code === "not_found";
    return {
      effectId: effect.effectId,
      action: effect.action,
      status: missing ? "not_found" : "failed",
      occurredAt: now(),
      diagnostics: [
        diagnostic(
          missing
            ? "staged_tag_target_not_found"
            : "staged_tag_mutation_failed",
        ),
      ],
    };
  }
}

export function createZoteroSynthesisTagEffectPort(
  args: { now?: () => string } = {},
): SynthesisHostTagEffectPort {
  const now = args.now || (() => new Date().toISOString());
  const broker = createZoteroHostCapabilityBroker();
  return {
    async applyBatch(request) {
      const canonical = rebuildSynthesisHostTagEffectBatchRequest(request);
      const receipts: SynthesisHostTagEffectReceipt[] = [];
      for (const effect of canonical.effects) {
        receipts.push(await applyEffect(broker, effect, now));
      }
      return { receipts };
    },
  };
}
