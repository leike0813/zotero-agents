import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { buildSynthesisKnowledgeGraphPaths } from "../../src/modules/synthesis/foundation";
import { createSynthesisRepository } from "../../src/modules/synthesis/repository";
import { createSynthesisService } from "../../src/modules/synthesis/service";
import { createSynthesisTagVocabularyService } from "../../src/modules/synthesis/tagVocabulary";
import { createZoteroSynthesisLibraryAdapter } from "../../src/modules/synthesis/libraryAdapter";
import { handlers } from "../../src/handlers";
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
  it("counts Zotero tag usage from current user library top-level non-trashed items", async function () {
    const libraryId = Zotero.Libraries.userLibraryID;
    const countedTag = "usage:test-top-level";
    const ignoredTag = "usage:test-ignored";
    const visible = new Zotero.Item("journalArticle");
    visible.libraryID = libraryId;
    visible.setField("title", "Visible usage source");
    visible.addTag(countedTag);
    await visible.saveTx();

    const child = new Zotero.Item("journalArticle");
    child.libraryID = libraryId;
    child.parentItemID = visible.id;
    child.setField("title", "Child usage source");
    child.addTag(countedTag);
    await child.saveTx();

    const trashed = new Zotero.Item("journalArticle");
    trashed.libraryID = libraryId;
    trashed.setField("title", "Trashed usage source");
    trashed.addTag(countedTag);
    await trashed.saveTx();
    await Zotero.Items.trashTx([trashed.id]);

    const groupItem = new Zotero.Item("journalArticle");
    groupItem.libraryID = 99;
    groupItem.setField("title", "Group usage source");
    groupItem.addTag(countedTag);
    groupItem.addTag(ignoredTag);
    await groupItem.saveTx();

    const adapter = createZoteroSynthesisLibraryAdapter({ libraryId });
    const counts = await adapter.getTagUsageCounts?.({ libraryId });
    const byTag = new Map((counts || []).map((row) => [row.tag, row.count]));

    assert.equal(byTag.get(countedTag), 1);
    assert.isUndefined(byTag.get(ignoredTag));
  });

  it("initializes Tag Vocabulary runtime state in SQLite without canonical assets", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisTagVocabularyService({ root });

    const snapshot = await service.loadTagVocabulary();
    const paths = buildSynthesisKnowledgeGraphPaths(root);
    const repository = createSynthesisRepository({ runtimeRoot: root });

    assert.deepEqual(snapshot.entries, []);
    assert.equal(repository.countRows("synt_tag_vocabulary_entry"), 0);
    assert.equal(repository.countRows("synt_tag_protocol"), 1);
    for (const fileName of [
      "vocabulary.json",
      "aliases.json",
      "abbrev.json",
      "protocol.json",
      "manifest.json",
    ]) {
      assert.isFalse(
        await runtimePathExists(path.join(paths.tagsRoot, fileName)),
      );
    }
  });

  it("writes, reads, validates, and exports active vocabulary from SQLite", async function () {
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

    const repository = createSynthesisRepository({ runtimeRoot: root });
    assert.equal(repository.countRows("synt_tag_vocabulary_entry"), 2);
    assert.equal(repository.countRows("synt_tag_alias"), 1);
    assert.equal(repository.countRows("synt_tag_abbrev"), 1);
    assert.deepEqual(
      repository.listTagVocabularyEntries().map((entry) => entry.tag),
      ["field:object_detection", "status:deprecated_sample"],
    );
    assert.isFalse(
      await runtimePathExists(
        path.join(
          buildSynthesisKnowledgeGraphPaths(root).tagsRoot,
          "vocabulary.json",
        ),
      ),
    );
  });

  it("stages, promotes, and discards tag-regulator suggestions in Synthesis state", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisTagVocabularyService({
      root,
      now: () => "2026-05-24T00:00:00.000Z",
    });

    await service.saveTagVocabulary({
      entries: [{ tag: "topic:existing", facet: "topic" }],
    });
    await service.stageTagSuggestions({
      entries: [
        {
          tag: "topic:suggested",
          facet: "topic",
          note: "suggested note",
          source_flow: "tag-regulator-suggest",
          parent_bindings: [10],
        },
        {
          tag: "topic:suggested",
          facet: "topic",
          parent_bindings: [11, 10],
        },
        {
          tag: "topic:discard-me",
          facet: "topic",
        },
      ],
    });

    const staged = await service.listStagedTagSuggestions();
    assert.deepEqual(
      staged.map((entry) => entry.tag),
      ["topic:discard-me", "topic:suggested"],
    );
    assert.deepEqual(
      staged.find((entry) => entry.tag === "topic:suggested")
        ?.parent_bindings,
      [10, 11],
    );

    await service.discardStagedTagSuggestions({ tags: ["topic:discard-me"] });
    const promoted = await service.promoteStagedTagSuggestions({
      tags: ["topic:suggested"],
    });

    assert.deepEqual(promoted.promoted, ["topic:suggested"]);
    assert.deepEqual(await service.listStagedTagSuggestions(), []);
    assert.deepEqual(await service.exportTagVocabularyForRegulator(), [
      "topic:existing",
      "topic:suggested",
    ]);
  });

  it("promotes staged suggestions through Synthesis service and applies bound parent tags", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-24T00:00:00.000Z",
    });
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Synthesis Staged Tag Parent" },
    });

    await service.saveTagVocabulary({
      entries: [{ tag: "topic:existing", facet: "topic" }],
    });
    await service.stageTagSuggestions({
      entries: [
        {
          tag: "topic:bound",
          facet: "topic",
          note: "bound note",
          source_flow: "tag-regulator-suggest",
          parent_bindings: [parent.id],
        },
        {
          tag: "topic:existing",
          facet: "topic",
          note: "duplicate",
          parent_bindings: [parent.id],
        },
      ],
    });

    const promoted = await service.promoteStagedTagSuggestions({
      tags: ["topic:bound", "topic:existing"],
    });

    assert.deepEqual(promoted.promoted, ["topic:bound"]);
    assert.deepEqual(promoted.skipped, ["topic:existing"]);
    assert.deepEqual(promoted.applied_parent_tags, [
      { tag: "topic:bound", parent_item_id: parent.id },
    ]);
    assert.deepEqual(
      parent.getTags().map((entry) => entry.tag),
      ["topic:bound"],
    );
    assert.deepEqual(
      (await service.listStagedTagSuggestions()).map((entry) => entry.tag),
      ["topic:existing"],
    );
  });

  it("exports TagVocab JSON only through an explicit checkpoint", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisTagVocabularyService({
      root,
      now: () => "2026-05-24T00:00:00.000Z",
    });
    const paths = buildSynthesisKnowledgeGraphPaths(root);
    const vocabularyPath = path.join(paths.tagsRoot, "vocabulary.json");

    await service.saveTagVocabulary({
      entries: [{ tag: "ai_task:NER", facet: "ai_task" }],
      abbrev: { ner: "NER" },
    });

    assert.isFalse(await runtimePathExists(vocabularyPath));

    const checkpoint = await service.exportTagVocabularyCheckpoint({
      transactionId: "tag-vocab-checkpoint",
    });
    const envelope = JSON.parse(await readRuntimeTextFile(vocabularyPath));

    assert.equal(checkpoint.transactionId, "tag-vocab-checkpoint");
    assert.equal(envelope.schema_id, "synthesis.tag_vocabulary");
    assert.deepEqual(
      envelope.data.tags.map(
        (entry: { tag: string; facet: string }) => entry.tag,
      ),
      ["ai_task:NER"],
    );
    assert.deepEqual(envelope.data.abbrevs, { ner: "NER" });
    assert.isTrue(
      await runtimePathExists(path.join(paths.tagsRoot, "manifest.json")),
    );
  });

  it("stores validation warning state in SQLite for valid warning-only vocabulary", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisTagVocabularyService({ root });

    await service.saveTagVocabulary({
      entries: [
        {
          tag: "topic:old",
          facet: "topic",
          deprecated: true,
          replacement: "topic:new",
        },
      ],
    });

    const repository = createSynthesisRepository({ runtimeRoot: root });
    assert.deepEqual(
      repository.listTagValidationWarnings().map((entry) => entry.code),
      ["missing_replacement"],
    );
    assert.deepEqual(
      (await service.loadTagVocabulary()).validation_warnings.map(
        (entry) => entry.code,
      ),
      ["missing_replacement"],
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

  it("exposes import preview through service snapshots and applies explicit DB imports", async function () {
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
    assert.equal(syncRuns, 0);
    assert.isFalse(
      await runtimePathExists(
        path.join(
          buildSynthesisKnowledgeGraphPaths(root).tagsRoot,
          "vocabulary.json",
        ),
      ),
    );
  });

  it("rebuilds tag-index projection from SQLite state", async function () {
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

    const computed = await service.readTagIndexProjection();
    assert.include(computed.tags, "ai_task:tag_normalization");
    assert.isFalse(await runtimePathExists(indexPath));
  });

  it("enriches Workbench tag rows with current user library usage counts", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs: [
        {
          libraryId: 1,
          itemKey: "usage-a",
          title: "Usage A",
          tags: ["field:usage", "method:usage", "field:usage"],
        },
        {
          libraryId: 1,
          itemKey: "usage-b",
          title: "Usage B",
          tags: ["field:usage"],
        },
        {
          libraryId: 2,
          itemKey: "usage-group",
          title: "Usage group",
          tags: ["field:usage"],
        },
      ],
    });
    await service.saveTagVocabulary({
      entries: [
        { tag: "field:usage", facet: "field" },
        { tag: "method:usage", facet: "method" },
        { tag: "topic:unused", facet: "topic" },
      ],
    });

    const input = await service.getSynthesisWorkbenchSurfaceInput("tags");
    const usage = new Map(
      (input.tags?.entries || []).map((entry) => [
        entry.tag,
        entry.usage_count,
      ]),
    );

    assert.equal(usage.get("field:usage"), 2);
    assert.equal(usage.get("method:usage"), 1);
    assert.equal(usage.get("topic:unused"), 0);
  });
});
