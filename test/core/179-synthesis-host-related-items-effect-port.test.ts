import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  SYNTHESIS_HOST_RELATED_ITEMS_EFFECT_BATCH_MAX,
  SynthesisClientError,
  type SynthesisHostRelatedItemsEffect,
  type SynthesisHostRelatedItemsEffectPort,
} from "../../packages/synthesis-contracts/src/index";
import { createZoteroSynthesisRelatedItemsEffectPort } from "../../src/modules/synthesis/relatedItemsEffectAdapter";
import { createSynthesisRepository } from "../../src/modules/synthesis/repository";
import { createSynthesisService } from "../../src/modules/synthesis/service";

async function runtimeRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "zs-related-effect-"));
}

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

async function seedAcceptedEdge(
  service: ReturnType<typeof createSynthesisService>,
) {
  await service.applyReferenceMatchingSidecar({
    libraryId: 1,
    itemKey: "SOURCE01",
    title: "Source",
    references: [{ title: "Target", citekey: "target" }],
    matchedItems: [
      {
        libraryId: 1,
        itemKey: "TARGET01",
        title: "Target",
        citekey: "target",
      },
    ],
  });
}

async function seedAcceptedEdges(
  service: ReturnType<typeof createSynthesisService>,
  count: number,
) {
  for (let start = 0; start < count; start += 10) {
    const targets = Array.from(
      { length: Math.min(10, count - start) },
      (_, offset) => {
        const index = start + offset;
        return {
          itemKey: `TARGET${String(index).padStart(2, "0")}`,
          title: `Target ${index}`,
          citekey: `target${index}`,
        };
      },
    );
    await service.applyReferenceMatchingSidecar({
      libraryId: 1,
      itemKey: `SOURCE${String(start / 10).padStart(2, "0")}`,
      title: `Source ${start / 10}`,
      references: targets.map(({ title, citekey }) => ({ title, citekey })),
      matchedItems: targets.map(({ itemKey, title, citekey }) => ({
        libraryId: 1,
        itemKey,
        title,
        citekey,
      })),
    });
  }
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

  it("persists pending before Host IO and preserves an early notifier echo", async function () {
    const root = await runtimeRoot();
    const repository = createSynthesisRepository({ runtimeRoot: root });
    let observedPending = false;
    const port: SynthesisHostRelatedItemsEffectPort = {
      async applyBatch(request) {
        const row = repository.getRelatedItemsSyncEffect(
          request.effects[0].effectId,
        );
        observedPending = row?.status === "pending_external_write";
        repository.consumeRelatedItemsSyncEcho({
          libraryId: 1,
          itemKey: "SOURCE01",
          relatedItemKey: "TARGET01",
        });
        return {
          receipts: request.effects.map((entry) => ({
            effectId: entry.effectId,
            action: entry.action,
            status: "applied" as const,
            occurredAt: "2026-07-16T00:00:01.000Z",
            diagnostics: [],
          })),
        };
      },
    };
    const service = createSynthesisService({
      root,
      runtimeRoot: root,
      libraryId: 1,
      synthesisRepository: repository,
      hostRelatedItemsEffectPort: port,
    });
    await seedAcceptedEdge(service);

    const result = await service.syncRelatedItemsNow();
    const row = repository.listRelatedItemsSyncEffects()[0];

    assert.equal(observedPending, true);
    assert.equal(result.added, 1);
    assert.equal(row?.status, "applied");
    assert.equal(row?.createdBySynthesis, true);
    assert.equal(row?.echoState, "observed");
  });

  it("leaves uncertain effects pending and recovers them idempotently", async function () {
    const root = await runtimeRoot();
    const repository = createSynthesisRepository({ runtimeRoot: root });
    const failing = createSynthesisService({
      root,
      runtimeRoot: root,
      libraryId: 1,
      synthesisRepository: repository,
      hostRelatedItemsEffectPort: {
        async applyBatch() {
          throw new Error("transport unavailable");
        },
      },
    });
    await seedAcceptedEdge(failing);

    const failed = await failing.syncRelatedItemsNow();
    assert.equal(failed.failed, 1);
    assert.equal(
      repository.listRelatedItemsSyncEffects()[0]?.status,
      "pending_external_write",
    );

    const recovered = createSynthesisService({
      root,
      runtimeRoot: root,
      libraryId: 1,
      synthesisRepository: repository,
      hostRelatedItemsEffectPort: {
        async applyBatch(request) {
          return {
            receipts: request.effects.map((entry) => ({
              effectId: entry.effectId,
              action: entry.action,
              status: "already_satisfied" as const,
              occurredAt: "2026-07-16T00:00:02.000Z",
              diagnostics: [],
            })),
          };
        },
      },
    });
    const result = await recovered.syncRelatedItemsNow();
    const row = repository.listRelatedItemsSyncEffects()[0];

    assert.equal(result.existing, 1);
    assert.equal(row?.status, "applied");
    assert.equal(row?.createdBySynthesis, true);
    assert.include(row?.diagnosticsJson || "", "recovered");
  });

  it("leaves the batch pending when Host receipts are malformed", async function () {
    const root = await runtimeRoot();
    const repository = createSynthesisRepository({ runtimeRoot: root });
    const service = createSynthesisService({
      root,
      runtimeRoot: root,
      libraryId: 1,
      synthesisRepository: repository,
      hostRelatedItemsEffectPort: {
        async applyBatch() {
          return { receipts: [] };
        },
      },
    });
    await seedAcceptedEdge(service);

    const result = await service.syncRelatedItemsNow();

    assert.equal(result.failed, 1);
    assert.equal(result.processed, 0);
    assert.equal(
      repository.listRelatedItemsSyncEffects()[0]?.status,
      "pending_external_write",
    );
  });

  it("reconciles mixed receipts independently", async function () {
    const root = await runtimeRoot();
    const repository = createSynthesisRepository({ runtimeRoot: root });
    const statuses = [
      "applied",
      "already_satisfied",
      "not_found",
      "failed",
    ] as const;
    const service = createSynthesisService({
      root,
      runtimeRoot: root,
      libraryId: 1,
      synthesisRepository: repository,
      hostRelatedItemsEffectPort: {
        async applyBatch(request) {
          return {
            receipts: request.effects.map((entry, index) => ({
              effectId: entry.effectId,
              action: entry.action,
              status: statuses[index],
              occurredAt: `2026-07-16T00:00:0${index}.000Z`,
              diagnostics: [],
            })),
          };
        },
      },
    });
    await seedAcceptedEdges(service, statuses.length);

    const result = await service.syncRelatedItemsNow();
    const durableStatuses = repository
      .listRelatedItemsSyncEffects()
      .map((row) => row.status)
      .sort();

    assert.deepEqual(
      {
        processed: result.processed,
        added: result.added,
        existing: result.existing,
        failed: result.failed,
      },
      { processed: 4, added: 1, existing: 1, failed: 2 },
    );
    assert.deepEqual(durableStatuses, [
      "already_existed",
      "applied",
      "failed",
      "needs_attention",
    ]);
  });

  it("dispatches at most 25 effects and stops later batches after transport failure", async function () {
    const root = await runtimeRoot();
    const repository = createSynthesisRepository({ runtimeRoot: root });
    const batchSizes: number[] = [];
    const service = createSynthesisService({
      root,
      runtimeRoot: root,
      libraryId: 1,
      synthesisRepository: repository,
      hostRelatedItemsEffectPort: {
        async applyBatch(request) {
          batchSizes.push(request.effects.length);
          throw new Error("transport unavailable");
        },
      },
    });
    repository.upsertCitationNode({
      literatureItemId: "1:SOURCE01",
      nodeStatus: "active",
      hasZoteroBinding: true,
    });
    for (let index = 0; index < 26; index += 1) {
      const targetRef = `1:TARGET${String(index).padStart(2, "0")}`;
      repository.upsertCitationNode({
        literatureItemId: targetRef,
        nodeStatus: "active",
        hasZoteroBinding: true,
      });
      repository.upsertCitationEdge({
        edgeId: `edge:${String(index).padStart(2, "0")}`,
        sourceLiteratureItemId: "1:SOURCE01",
        targetLiteratureItemId: targetRef,
        edgeStatus: "accepted",
      });
    }
    repository.upsertCacheBasis({
      cacheKey: "citation-graph:library",
      cacheKind: "citation_graph",
      scopeKind: "library",
      scopeRef: "1",
      status: "ready",
    });

    const result = await service.syncRelatedItemsNow();

    assert.deepEqual(batchSizes, [25]);
    assert.equal(result.failed, 25);
    assert.lengthOf(repository.listRelatedItemsSyncEffects(), 25);
    assert.isTrue(
      repository
        .listRelatedItemsSyncEffects()
        .every((row) => row.status === "pending_external_write"),
    );
  });

  it("never revokes a relation that was not created by Synthesis", async function () {
    const root = await runtimeRoot();
    const repository = createSynthesisRepository({ runtimeRoot: root });
    const seen: SynthesisHostRelatedItemsEffect[] = [];
    repository.upsertRelatedItemsSyncEffect({
      effectId: "related-items:user-existing",
      operationId: "seed",
      citationEdgeId: "edge:user",
      sourceLiteratureItemId: "1:USER01",
      targetLiteratureItemId: "1:TARGET01",
      sourceLibraryId: 1,
      sourceItemKey: "USER01",
      targetLibraryId: 1,
      targetItemKey: "TARGET01",
      action: "add",
      status: "already_existed",
      createdBySynthesis: false,
    });
    repository.upsertRelatedItemsSyncEffect({
      effectId: "related-items:synthesis-created",
      operationId: "seed",
      citationEdgeId: "edge:synthesis",
      sourceLiteratureItemId: "1:SYNTH01",
      targetLiteratureItemId: "1:TARGET01",
      sourceLibraryId: 1,
      sourceItemKey: "SYNTH01",
      targetLibraryId: 1,
      targetItemKey: "TARGET01",
      action: "add",
      status: "applied",
      createdBySynthesis: true,
    });
    const service = createSynthesisService({
      root,
      runtimeRoot: root,
      libraryId: 1,
      synthesisRepository: repository,
      hostRelatedItemsEffectPort: {
        async applyBatch(request) {
          seen.push(...request.effects);
          return {
            receipts: request.effects.map((entry) => ({
              effectId: entry.effectId,
              action: entry.action,
              status: "already_satisfied" as const,
              occurredAt: "2026-07-16T00:00:03.000Z",
              diagnostics: [],
            })),
          };
        },
      },
    });

    await service.syncRelatedItemsNow();

    assert.deepEqual(
      seen.map((entry) => entry.source.itemKey),
      ["SYNTH01"],
    );
    assert.equal(seen[0]?.action, "ensure_absent");
    assert.equal(
      repository.getRelatedItemsSyncEffect("related-items:user-existing")
        ?.status,
      "already_existed",
    );
  });
});
