import { assert } from "chai";
import {
  SYNTHESIS_HOST_STAGED_TAG_BINDING_RESOLUTION_ID_MAX,
  SYNTHESIS_HOST_TAG_EFFECT_BATCH_MAX,
  SynthesisClientError,
  rebuildSynthesisHostItemRef,
  rebuildSynthesisHostStagedTagBindingResolutionResult,
  rebuildSynthesisHostTagEffectBatchResult,
  type SynthesisHostTagEffect,
} from "../../packages/synthesis-contracts/src/index";
import {
  createZoteroSynthesisStagedTagBindingMigrationPort,
  createZoteroSynthesisTagEffectPort,
} from "../../src/modules/synthesis/tagEffectAdapter";

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
  itemKey = "TAGPAREN",
): SynthesisHostTagEffect {
  return {
    effectId,
    action: "ensure_present",
    target: { libraryId: 1, itemKey },
    tag: "topic:host-effect",
    provenance: { kind: "staged_tag_promotion" },
    precondition: { target: "exists" },
    permission: {
      scope: "synthesis.tags",
      reason: "promote_staged_tag",
    },
  };
}

describe("Synthesis Host Tag effect port", function () {
  it("canonically rebuilds stable refs and drops unknown fields", function () {
    assert.deepEqual(
      rebuildSynthesisHostItemRef({
        libraryId: 1,
        itemKey: "ABCD1234",
        ignored: true,
      }),
      { libraryId: 1, itemKey: "ABCD1234" },
    );
    for (const invalid of [
      { libraryId: 0, itemKey: "ABCD1234" },
      { libraryId: 1, itemKey: "../bad" },
      { libraryId: 1, itemKey: "ABCD1234", callback: () => undefined },
    ]) {
      assert.throws(
        () => rebuildSynthesisHostItemRef(invalid),
        SynthesisClientError,
      );
    }
  });

  it("resolves legacy IDs into stable refs and reports missing IDs", async function () {
    const parent = await createPaper("TAGPAREN", "Tag parent");
    const port = createZoteroSynthesisStagedTagBindingMigrationPort();
    const result = await port.resolve({
      libraryId: 1,
      itemIds: [parent.id, 999999],
    });

    assert.deepEqual(result, {
      resolved: [
        {
          itemId: parent.id,
          ref: { libraryId: 1, itemKey: parent.key },
        },
      ],
      missingItemIds: [999999],
      diagnostics: [],
    });
    assert.doesNotThrow(() => JSON.stringify(result));
  });

  it("rejects invalid resolution input before Zotero lookup", async function () {
    const port = createZoteroSynthesisStagedTagBindingMigrationPort();
    const previousGet = Zotero.Items.get;
    let lookups = 0;
    (Zotero.Items as any).get = (...args: unknown[]) => {
      lookups += 1;
      return previousGet(...(args as [number]));
    };
    try {
      for (const request of [
        { libraryId: 1, itemIds: [1, 1] },
        {
          libraryId: 1,
          itemIds: Array.from(
            {
              length: SYNTHESIS_HOST_STAGED_TAG_BINDING_RESOLUTION_ID_MAX + 1,
            },
            (_, index) => index + 1,
          ),
        },
        { libraryId: 1, itemIds: [1], callback: () => undefined },
      ]) {
        let failure: unknown;
        try {
          await port.resolve(request as any);
        } catch (error) {
          failure = error;
        }
        assert.instanceOf(failure, SynthesisClientError);
      }
    } finally {
      (Zotero.Items as any).get = previousGet;
    }
    assert.equal(lookups, 0);
  });

  it("requires resolution results to exactly partition requested IDs", function () {
    assert.throws(() =>
      rebuildSynthesisHostStagedTagBindingResolutionResult(
        {
          resolved: [{ itemId: 1, ref: { libraryId: 1, itemKey: "ABCD1234" } }],
          missingItemIds: [1],
          diagnostics: [],
        },
        { libraryId: 1, itemIds: [1] },
      ),
    );
  });

  it("applies Tag effects idempotently", async function () {
    const parent = await createPaper("TAGPAREN", "Tag parent");
    const port = createZoteroSynthesisTagEffectPort({
      now: () => "2026-07-16T00:00:00.000Z",
    });

    const applied = await port.applyBatch({
      effects: [effect("tag:apply", parent.key)],
    });
    const satisfied = await port.applyBatch({
      effects: [effect("tag:satisfied", parent.key)],
    });

    assert.deepEqual(
      [applied, satisfied].map((result) => result.receipts[0]?.status),
      ["applied", "already_satisfied"],
    );
    assert.deepEqual(
      parent.getTags().map((entry) => entry.tag),
      ["topic:host-effect"],
    );
  });

  it("validates complete effect batches before Zotero access", async function () {
    const port = createZoteroSynthesisTagEffectPort();
    const previousLookup = Zotero.Items.getByLibraryAndKey;
    let lookups = 0;
    (Zotero.Items as any).getByLibraryAndKey = (...args: unknown[]) => {
      lookups += 1;
      return previousLookup(...(args as [number, string]));
    };
    try {
      for (const request of [
        { effects: [effect("duplicate"), effect("duplicate")] },
        {
          effects: Array.from(
            { length: SYNTHESIS_HOST_TAG_EFFECT_BATCH_MAX + 1 },
            (_, index) => effect(`effect:${index}`),
          ),
        },
        { effects: [{ ...effect("callback"), callback: () => undefined }] },
      ]) {
        let failure: unknown;
        try {
          await port.applyBatch(request as any);
        } catch (error) {
          failure = error;
        }
        assert.instanceOf(failure, SynthesisClientError);
      }
    } finally {
      (Zotero.Items as any).getByLibraryAndKey = previousLookup;
    }
    assert.equal(lookups, 0);
  });

  it("returns stable missing and failed receipts without raw errors", async function () {
    const parent = await createPaper("TAGPAREN", "Tag parent");
    const originalSave = parent.saveTx;
    parent.saveTx = async () => {
      throw new Error("private raw failure /tmp/secret");
    };
    try {
      const result = await createZoteroSynthesisTagEffectPort().applyBatch({
        effects: [
          effect("tag:missing", "MISSING1"),
          effect("tag:failed", parent.key),
        ],
      });
      assert.deepEqual(
        result.receipts.map((receipt) => receipt.status),
        ["not_found", "failed"],
      );
      assert.notInclude(JSON.stringify(result), "private raw failure");
      assert.notInclude(JSON.stringify(result), "/tmp/secret");
    } finally {
      parent.saveTx = originalSave;
    }
  });

  it("rejects malformed or mismatched receipt batches", function () {
    const request = { effects: [effect("tag:receipt")] };
    assert.throws(() =>
      rebuildSynthesisHostTagEffectBatchResult({ receipts: [] }, request),
    );
    assert.throws(() =>
      rebuildSynthesisHostTagEffectBatchResult(
        {
          receipts: [
            {
              effectId: "unexpected",
              action: "ensure_present",
              status: "applied",
              occurredAt: "2026-07-16T00:00:00.000Z",
              diagnostics: [],
            },
          ],
        },
        request,
      ),
    );
  });
});
