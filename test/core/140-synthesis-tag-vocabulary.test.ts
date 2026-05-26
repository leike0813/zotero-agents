import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  buildSynthesisKnowledgeGraphPaths,
  readProjectionRegistryState,
} from "../../src/modules/synthesis/foundation";
import { createSynthesisService } from "../../src/modules/synthesis/service";
import { createSynthesisTagVocabularyService } from "../../src/modules/synthesis/tagVocabulary";
import {
  readRuntimeTextFile,
  removeRuntimePath,
  runtimePathExists,
} from "../../src/modules/runtimePersistence";

async function makeRuntimeRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "zs-tag-vocabulary-"));
}

async function waitFor(predicate: () => Promise<boolean> | boolean) {
  const deadline = Date.now() + 1000;
  while (Date.now() < deadline) {
    if (await predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail("timed out waiting for condition");
}

describe("Synthesis tag vocabulary", function () {
  it("initializes canonical tag assets in an empty KG store", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisTagVocabularyService({ root });

    const snapshot = await service.loadTagVocabulary();
    const paths = buildSynthesisKnowledgeGraphPaths(root);

    assert.deepEqual(snapshot.entries, []);
    for (const fileName of [
      "vocabulary.json",
      "aliases.json",
      "abbrev.json",
      "protocol.json",
      "manifest.json",
    ]) {
      assert.isTrue(
        await runtimePathExists(path.join(paths.tagsRoot, fileName)),
      );
    }
  });

  it("writes, reads, validates, and exports canonical vocabulary", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisTagVocabularyService({
      root,
      now: () => "2026-05-24T00:00:00.000Z",
    });

    await service.saveTagVocabulary({
      transactionId: "tag-vocab-save",
      entries: [
        {
          tag: "field:object_detection",
          facet: "field",
          note: "Object detection",
          source: "manual",
          aliases: ["detection"],
          abbrev: ["OD"],
        },
        {
          tag: "status:deprecated_sample",
          facet: "status",
          deprecated: true,
        },
      ],
      aliases: { detection: "field:object_detection" },
      abbrev: { od: "OD" },
    });

    const snapshot = await service.loadTagVocabulary();
    assert.deepEqual(
      snapshot.entries.map((entry) => entry.tag),
      ["field:object_detection", "status:deprecated_sample"],
    );
    assert.deepEqual(await service.validateTagVocabulary(), []);
    assert.deepEqual(await service.exportTagVocabularyForRegulator(), [
      "field:object_detection",
    ]);
    assert.deepEqual(snapshot.abbrev, { od: "OD" });

    const canonical = JSON.parse(
      await readRuntimeTextFile(
        path.join(
          buildSynthesisKnowledgeGraphPaths(root).tagsRoot,
          "vocabulary.json",
        ),
      ),
    );
    assert.isArray(canonical.data.tags);
    assert.isUndefined(canonical.data.entries);
    assert.equal(canonical.data.version, "1.0.0");
    assert.equal(canonical.data.tag_count, 2);
    assert.deepEqual(canonical.data.abbrevs, { od: "OD" });
  });

  it("emits one store event and marks tag-index stale for a vocabulary transaction", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisTagVocabularyService({ root });
    await service.loadTagVocabulary();

    await service.saveTagVocabulary({
      transactionId: "tag-vocab-transaction",
      entries: [{ tag: "method:transformer", facet: "method" }],
    });

    const paths = buildSynthesisKnowledgeGraphPaths(root);
    const events = (await readRuntimeTextFile(paths.eventsLog))
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    assert.lengthOf(
      events.filter(
        (event) => event.transaction_id === "tag-vocab-transaction",
      ),
      1,
    );
    const projection = await readProjectionRegistryState(root);
    assert.isTrue(projection.projections["tag-index"].stale);
    assert.equal(
      projection.projections["tag-index"].last_transaction_id,
      "tag-vocab-transaction",
    );
  });

  it("rejects invalid vocabulary without replacing canonical target and writes sanitized diagnostics", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisTagVocabularyService({ root });

    await service.saveTagVocabulary({
      transactionId: "tag-vocab-original",
      entries: [{ tag: "topic:detr", facet: "topic" }],
    });

    try {
      await service.saveTagVocabulary({
        transactionId: "tag-vocab-invalid",
        entries: [
          {
            tag: "bad tag token=abc123",
            facet: `${root}\\secret\\tags.json`,
          },
        ],
      });
      assert.fail("expected invalid vocabulary to fail");
    } catch (error) {
      assert.match(String(error), /validation failed/i);
    }

    const snapshot = await service.loadTagVocabulary();
    assert.deepEqual(
      snapshot.entries.map((entry) => entry.tag),
      ["topic:detr"],
    );
    const diagnostics = await readRuntimeTextFile(
      buildSynthesisKnowledgeGraphPaths(root).diagnosticsLog,
    );
    assert.notInclude(diagnostics, "abc123");
    assert.notInclude(diagnostics, root);
    assert.include(diagnostics, "[redacted]");
  });

  it("previews import conflicts without silent replacement", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisTagVocabularyService({ root });
    await service.saveTagVocabulary({
      entries: [
        {
          tag: "model:detr",
          facet: "model",
          note: "local",
        },
      ],
    });

    const preview = await service.previewImport({
      entries: [
        { tag: "model:detr", facet: "model", note: "imported" },
        { tag: "data:coco", facet: "data" },
      ],
    });

    assert.deepEqual(
      preview.additions.map((entry) => entry.tag),
      ["data:coco"],
    );
    assert.deepEqual(
      preview.conflicts.map((entry) => entry.tag),
      ["model:detr"],
    );
    assert.equal((await service.loadTagVocabulary()).entries[0]?.note, "local");
  });

  it("imports Zotero TagVocab protocol payloads with tags and abbrevs", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisTagVocabularyService({ root });
    const tagVocabPayload = JSON.parse(
      await fs.readFile(
        path.join(process.cwd(), "reference/Zotero_TagVocab/tags/tags.json"),
        "utf8",
      ),
    );

    const preview = await service.previewImport(tagVocabPayload);
    assert.isAbove(preview.additions.length, 200);
    assert.include(
      preview.additions.map((entry) => entry.tag),
      "ai_task:NER",
    );
    assert.deepEqual(
      preview.warnings.filter((entry) => entry.severity === "error"),
      [],
    );

    await service.applyImport({
      payload: tagVocabPayload,
      action: "merge-non-conflicting",
    });

    const snapshot = await service.loadTagVocabulary();
    assert.equal(snapshot.entries.length, tagVocabPayload.tags.length);
    assert.equal(snapshot.abbrev.lidar, "LiDAR");
    assert.include(
      await service.exportTagVocabularyForRegulator(),
      "ai_task:NER",
    );
  });

  it("keeps legacy entries and plain-array imports compatible", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisTagVocabularyService({ root });

    const legacyPreview = await service.previewImport({
      entries: [{ tag: "model:DETR", facet: "model" }],
      abbrevs: { detr: "DETR" },
    });
    assert.deepEqual(
      legacyPreview.additions.map((entry) => entry.tag),
      ["model:DETR"],
    );

    const arrayPreview = await service.previewImport(["data:COCO"]);
    assert.deepEqual(
      arrayPreview.additions.map((entry) => entry.tag),
      ["data:COCO"],
    );
  });

  it("reports registered abbreviation casing errors", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisTagVocabularyService({ root });

    const warnings = await service.validateTagVocabulary({
      entries: [{ tag: "model:dl/CNN", facet: "model" }],
      abbrev: { dl: "DL", cnn: "CNN" },
    });
    assert.include(
      warnings.map((entry) => entry.code),
      "abbrev_case_error",
    );

    try {
      await service.saveTagVocabulary({
        entries: [{ tag: "model:dl/CNN", facet: "model" }],
        abbrev: { dl: "DL", cnn: "CNN" },
      });
      assert.fail("expected invalid abbreviation casing to fail");
    } catch (error) {
      assert.match(String(error), /abbrev_case_error/);
    }
  });

  it("exposes import preview through service snapshots and applies explicit imports", async function () {
    const root = await makeRuntimeRoot();
    let syncRuns = 0;
    const service = createSynthesisService({
      root,
      libraryId: 1,
      gitSyncDebounceMs: 0,
      gitSyncAdapter: {
        merge: () => {
          syncRuns += 1;
          return { status: "clean" };
        },
      },
    });
    await service.saveTagVocabulary({
      entries: [{ tag: "model:detr", facet: "model", note: "local" }],
    });
    await waitFor(() => syncRuns >= 1);
    syncRuns = 0;

    await service.previewTagVocabularyImport({
      entries: [
        { tag: "model:detr", facet: "model", note: "imported" },
        { tag: "data:coco", facet: "data" },
      ],
    });
    const previewSnapshot = await service.getSynthesisSnapshot();
    assert.deepEqual(
      previewSnapshot.tags.importPreview?.conflicts.map((entry) => entry.tag),
      ["model:detr"],
    );
    assert.equal(
      (await service.loadTagVocabulary()).entries.find(
        (entry) => entry.tag === "model:detr",
      )?.note,
      "local",
    );

    await service.applyTagVocabularyImport({
      action: "merge-non-conflicting",
      payload: {
        entries: [
          { tag: "model:detr", facet: "model", note: "imported" },
          { tag: "data:coco", facet: "data" },
        ],
      },
    });

    const tags = await service.loadTagVocabulary();
    assert.include(
      tags.entries.map((entry) => entry.tag),
      "data:coco",
    );
    await waitFor(() => syncRuns >= 1);
  });

  it("rebuilds tag-index projection from canonical state", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisTagVocabularyService({ root });
    await service.saveTagVocabulary({
      entries: [{ tag: "ai_task:tag_normalization", facet: "ai_task" }],
    });

    const projection = await service.rebuildTagIndexProjection();
    assert.isFalse(projection.stale);
    assert.equal(projection.target, "tag-index");

    const paths = buildSynthesisKnowledgeGraphPaths(root);
    const indexPath = path.join(paths.stateRoot, "tag-index.json");
    assert.isTrue(await runtimePathExists(indexPath));
    await removeRuntimePath(indexPath);
    assert.isFalse(await runtimePathExists(indexPath));

    await service.rebuildTagIndexProjection();
    assert.isTrue(await runtimePathExists(indexPath));
  });
});
