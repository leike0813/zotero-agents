import { assert } from "chai";
import {
  SYNTHESIS_HOST_RELATED_ITEMS_EFFECT_BATCH_MAX,
  SynthesisClientError,
  type SynthesisHostRelatedItemsEffect,
} from "../../packages/synthesis-contracts/src/index";
import { createZoteroSynthesisRelatedItemsEffectPort } from "../../src/modules/synthesis/relatedItemsEffectAdapter";

async function createPaper(key: string, title: string) {
  const item = new Zotero.Item("journalArticle");
  item.key = key;
  item.libraryID = Zotero.Libraries.userLibraryID;
  item.setField("title", title);
  await item.saveTx();
  return item;
}

function effect(
  effectId: string,
  action: "ensure_present" | "ensure_absent" = "ensure_present",
  sourceItemKey = "SOURCE01",
  targetItemKey = "TARGET01",
): SynthesisHostRelatedItemsEffect {
  return {
    effectId,
    action,
    source: { libraryId: 1, itemKey: sourceItemKey },
    target: { libraryId: 1, itemKey: targetItemKey },
    provenance: {
      citationEdgeId: "edge:source-target",
      kind:
        action === "ensure_present"
          ? "accepted_citation"
          : "synthesis_created_relation",
    },
    permission: {
      scope: "synthesis.related_items",
      reason:
        action === "ensure_present"
          ? "accepted_citation"
          : "revoke_synthesis_effect",
    },
  };
}

describe("Synthesis Host Related Items effect port", function () {
  it("applies idempotent ensure-present and ensure-absent effects", async function () {
    const source = await createPaper("SOURCE01", "Source");
    const target = await createPaper("TARGET01", "Target");
    const port = createZoteroSynthesisRelatedItemsEffectPort();

    const added = await port.applyBatch({
      effects: [effect("effect:add", "ensure_present", source.key, target.key)],
    });
    const existing = await port.applyBatch({
      effects: [
        effect("effect:add-2", "ensure_present", source.key, target.key),
      ],
    });
    const removed = await port.applyBatch({
      effects: [
        effect("effect:remove", "ensure_absent", source.key, target.key),
      ],
    });
    const absent = await port.applyBatch({
      effects: [
        effect("effect:remove-2", "ensure_absent", source.key, target.key),
      ],
    });

    assert.deepEqual(
      [added, existing, removed, absent].map(
        (result) => result.receipts[0]?.status,
      ),
      ["applied", "already_satisfied", "applied", "already_satisfied"],
    );
    assert.notInclude(source.relatedItems, target.key);
    assert.doesNotThrow(() =>
      JSON.stringify({ added, existing, removed, absent }),
    );
  });

  it("validates the whole batch before resolving Zotero items", async function () {
    const port = createZoteroSynthesisRelatedItemsEffectPort();
    const previousLookup = Zotero.Items.getByLibraryAndKey;
    let lookups = 0;
    (Zotero.Items as any).getByLibraryAndKey = (...args: unknown[]) => {
      lookups += 1;
      return previousLookup(...(args as [number, string]));
    };
    const requests = [
      {
        effects: Array.from(
          { length: SYNTHESIS_HOST_RELATED_ITEMS_EFFECT_BATCH_MAX + 1 },
          (_, index) => effect(`effect:${index}`),
        ),
      },
      { effects: [effect("duplicate"), effect("duplicate")] },
      {
        effects: [
          { ...effect("self"), target: { libraryId: 1, itemKey: "SOURCE01" } },
        ],
      },
      { effects: [{ ...effect("function"), extra: () => undefined }] },
    ];
    try {
      for (const request of requests) {
        let failure: unknown;
        try {
          await port.applyBatch(request as any);
        } catch (error) {
          failure = error;
        }
        assert.instanceOf(failure, SynthesisClientError);
        assert.equal((failure as SynthesisClientError).code, "invalid_request");
      }
    } finally {
      (Zotero.Items as any).getByLibraryAndKey = previousLookup;
    }
    assert.equal(lookups, 0);
  });

  it("returns per-effect missing and save-failure receipts", async function () {
    const source = await createPaper("SOURCE01", "Source");
    const target = await createPaper("TARGET01", "Target");
    const port = createZoteroSynthesisRelatedItemsEffectPort();
    const missing = effect(
      "effect:missing",
      "ensure_present",
      source.key,
      "MISSING1",
    );
    const previousSave = source.saveTx;
    source.saveTx = async () => {
      throw new Error("forced save failure");
    };
    try {
      const result = await port.applyBatch({
        effects: [
          missing,
          effect("effect:failed", "ensure_present", source.key, target.key),
        ],
      });
      assert.deepEqual(
        result.receipts.map((receipt) => receipt.status),
        ["not_found", "failed"],
      );
      assert.deepEqual(
        result.receipts.map((receipt) => receipt.effectId),
        ["effect:missing", "effect:failed"],
      );
    } finally {
      source.saveTx = previousSave;
    }
  });
});
