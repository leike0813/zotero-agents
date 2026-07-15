import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { buildSynthesisKnowledgeGraphPaths } from "../../src/modules/synthesis/foundation";
import { createSynthesisRepository } from "../../src/modules/synthesis/repository";
import { createSynthesisService } from "../../src/modules/synthesis/service";
import { createSynthesisTagVocabularyService } from "../../src/modules/synthesis/tagVocabulary";
import { createZoteroSynthesisHostReadPort } from "../../src/modules/synthesis/libraryAdapter";
import { handlers } from "../../src/handlers";
import {
  readRuntimeTextFile,
  runtimePathExists,
} from "../../src/modules/runtimePersistence";

async function makeRuntimeRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "zs-tag-vocabulary-"));
}

function canonicalStoreText(root: string, kind: string) {
  return createSynthesisRepository({ runtimeRoot: root })
    .listCanonicalStoreRecords({ recordKinds: [kind] })
    .map((row) => row.payloadJson)
    .join("\n");
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

    const port = createZoteroSynthesisHostReadPort({ libraryId });
    const page = await port.library.listItemsPage({ libraryId, limit: 100 });
    const byTag = new Map<string, number>();
    for (const item of page.items) {
      for (const tag of item.tags) {
        byTag.set(tag, (byTag.get(tag) || 0) + 1);
      }
    }

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

  it("atomically updates and renames canonical Tag Vocabulary entries while preserving metadata", async function () {
    const root = await makeRuntimeRoot();
    let currentTime = "2026-07-16T00:00:00.000Z";
    const repository = createSynthesisRepository({
      runtimeRoot: root,
      now: () => currentTime,
    });
    const service = createSynthesisTagVocabularyService({
      root,
      repository,
      now: () => currentTime,
    });
    await service.saveTagVocabulary({
      entries: [
        {
          tag: "topic:same",
          facet: "topic",
          note: "clear me",
          source: "manual",
          aliases: ["same-entry-alias"],
          abbrev: ["SAME"],
          usage_count: 7,
          last_synced_at: "2026-07-15T00:00:00.000Z",
        },
        {
          tag: "topic:old",
          facet: "topic",
          note: "old note",
          source: "import",
          deprecated: true,
          replacement: "topic:replacement",
          aliases: ["old-entry-alias"],
          abbrev: ["OLD"],
          usage_count: 3,
          last_synced_at: "2026-07-14T00:00:00.000Z",
        },
        { tag: "topic:replacement", facet: "topic" },
        {
          tag: "topic:dependent",
          facet: "topic",
          deprecated: true,
          replacement: "topic:old",
        },
        { tag: "topic:CaseOnly", facet: "topic", source: "manual" },
      ],
      aliases: {
        "old-global-alias": "topic:old",
        "stable-global-alias": "topic:replacement",
      },
      abbrev: { detr: "DETR" },
    });
    const initialAliases = repository.listTagAliases();
    const initialAbbrev = repository.listTagAbbrevs();
    const initialProtocol = repository.getTagProtocol();

    currentTime = "2026-07-16T01:00:00.000Z";
    const sameResult = await service.updateTagVocabularyEntry({
      originalTag: "topic:same",
      tag: "topic:same",
      facet: "topic",
      note: "",
    });
    assert.isTrue(sameResult.mutated);
    const same = repository
      .listTagVocabularyEntries()
      .find((entry) => entry.tag === "topic:same")!;
    assert.deepInclude(same, {
      tag: "topic:same",
      facet: "topic",
      source: "manual",
      aliasesJson: '["same-entry-alias"]',
      abbrevJson: '["SAME"]',
      usageCount: 7,
      lastSyncedAt: "2026-07-15T00:00:00.000Z",
      createdAt: "2026-07-16T00:00:00.000Z",
      updatedAt: "2026-07-16T01:00:00.000Z",
    });
    assert.isUndefined(same.note);

    currentTime = "2026-07-16T02:00:00.000Z";
    const renameResult = await service.updateTagVocabularyEntry({
      originalTag: "topic:old",
      tag: "topic:new",
      facet: "topic",
      note: "new note",
    });
    assert.isTrue(renameResult.mutated);
    const renamed = repository
      .listTagVocabularyEntries()
      .find((entry) => entry.tag === "topic:new")!;
    assert.deepInclude(renamed, {
      facet: "topic",
      note: "new note",
      source: "import",
      deprecated: true,
      replacement: "topic:replacement",
      aliasesJson: '["old-entry-alias"]',
      abbrevJson: '["OLD"]',
      usageCount: 3,
      lastSyncedAt: "2026-07-14T00:00:00.000Z",
      createdAt: "2026-07-16T00:00:00.000Z",
      updatedAt: "2026-07-16T02:00:00.000Z",
    });
    assert.notInclude(
      repository.listTagVocabularyEntries().map((entry) => entry.tag),
      "topic:old",
    );
    assert.deepInclude(
      repository
        .listTagVocabularyEntries()
        .find((entry) => entry.tag === "topic:dependent")!,
      {
        replacement: "topic:new",
        createdAt: "2026-07-16T00:00:00.000Z",
        updatedAt: "2026-07-16T02:00:00.000Z",
      },
    );
    const aliasesAfterRename = repository.listTagAliases();
    assert.deepInclude(
      aliasesAfterRename.find((entry) => entry.alias === "old-global-alias")!,
      {
        tag: "topic:new",
        createdAt: initialAliases[0].createdAt,
        updatedAt: "2026-07-16T02:00:00.000Z",
      },
    );
    assert.deepEqual(
      aliasesAfterRename.find((entry) => entry.alias === "stable-global-alias"),
      initialAliases.find((entry) => entry.alias === "stable-global-alias"),
    );
    assert.deepEqual(repository.listTagAbbrevs(), initialAbbrev);
    assert.deepEqual(repository.getTagProtocol(), initialProtocol);

    currentTime = "2026-07-16T03:00:00.000Z";
    const caseRename = await service.updateTagVocabularyEntry({
      originalTag: "topic:CaseOnly",
      tag: "topic:caseonly",
      facet: "topic",
      note: "case only",
    });
    assert.isTrue(caseRename.mutated);
    assert.deepInclude(
      repository
        .listTagVocabularyEntries()
        .find((entry) => entry.tag === "topic:caseonly")!,
      {
        source: "manual",
        createdAt: "2026-07-16T00:00:00.000Z",
        updatedAt: "2026-07-16T03:00:00.000Z",
      },
    );
    assert.deepEqual(
      (await service.loadTagVocabulary()).validation_warnings,
      [],
    );
  });

  it("returns singular diagnostics for Tag rename conflicts and missing updates, with delete missing as a no-op", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisTagVocabularyService({
      root,
      now: () => "2026-07-16T00:00:00.000Z",
    });
    await service.saveTagVocabulary({
      entries: [
        { tag: "topic:old", facet: "topic" },
        { tag: "topic:target", facet: "topic" },
      ],
    });
    const before = await service.loadTagVocabulary();

    const exactConflict = await service.updateTagVocabularyEntry({
      originalTag: "topic:old",
      tag: "topic:target",
      facet: "topic",
      note: "",
    });
    const caseConflict = await service.updateTagVocabularyEntry({
      originalTag: "topic:old",
      tag: "TOPIC:TARGET",
      facet: "topic",
      note: "",
    });
    const missing = await service.updateTagVocabularyEntry({
      originalTag: "topic:missing",
      tag: "topic:new",
      facet: "topic",
      note: "",
    });
    const deleteMissing = await service.deleteTagVocabularyEntry({
      originalTag: "topic:missing",
    });

    assert.isFalse(exactConflict.mutated);
    assert.equal(
      exactConflict.diagnostic.code,
      "tag_vocabulary_entry_conflict",
    );
    assert.isFalse(caseConflict.mutated);
    assert.equal(caseConflict.diagnostic.code, "tag_vocabulary_entry_conflict");
    assert.isFalse(missing.mutated);
    assert.equal(missing.diagnostic.code, "tag_vocabulary_entry_not_found");
    assert.deepEqual(deleteMissing, { mutated: false, deleted: [] });
    assert.deepEqual(await service.loadTagVocabulary(), before);
  });

  it("deletes Tag Vocabulary entries with reference cleanup and rolls back invalid or failed mutations", async function () {
    const root = await makeRuntimeRoot();
    const now = () => "2026-07-16T00:00:00.000Z";
    const repository = createSynthesisRepository({ runtimeRoot: root, now });
    const service = createSynthesisTagVocabularyService({
      root,
      repository,
      now,
    });
    await service.saveTagVocabulary({
      entries: [
        { tag: "topic:old", facet: "topic" },
        {
          tag: "topic:dependent",
          facet: "topic",
          deprecated: true,
          replacement: "topic:old",
        },
        { tag: "topic:stable", facet: "topic" },
      ],
      aliases: {
        remove: "topic:old",
        stable: "topic:stable",
      },
    });

    const beforeInvalid = await service.loadTagVocabulary();
    try {
      await service.updateTagVocabularyEntry({
        originalTag: "topic:old",
        tag: "invalid tag",
        facet: "topic",
        note: "",
      });
      assert.fail("expected protocol validation failure");
    } catch (error) {
      assert.match(String(error), /tag vocabulary validation failed/i);
    }
    assert.deepEqual(await service.loadTagVocabulary(), beforeInvalid);

    const originalReplace =
      repository.replaceTagVocabularyStateInCurrentTransaction.bind(repository);
    repository.replaceTagVocabularyStateInCurrentTransaction = (args) => {
      originalReplace(args);
      throw new Error("fault-injected Tag Vocabulary write");
    };
    try {
      await service.updateTagVocabularyEntry({
        originalTag: "topic:old",
        tag: "topic:new",
        facet: "topic",
        note: "",
      });
      assert.fail("expected atomic Tag Vocabulary update failure");
    } catch (error) {
      assert.match(String(error), /fault-injected Tag Vocabulary write/);
    } finally {
      repository.replaceTagVocabularyStateInCurrentTransaction =
        originalReplace;
    }
    assert.deepEqual(await service.loadTagVocabulary(), beforeInvalid);

    const deleted = await service.deleteTagVocabularyEntry({
      originalTag: "topic:old",
    });
    assert.deepEqual(deleted, { mutated: true, deleted: ["topic:old"] });
    const afterDelete = await service.loadTagVocabulary();
    assert.notInclude(
      afterDelete.entries.map((entry) => entry.tag),
      "topic:old",
    );
    assert.deepEqual(afterDelete.aliases, { stable: "topic:stable" });
    assert.isUndefined(
      afterDelete.entries.find((entry) => entry.tag === "topic:dependent")
        ?.replacement,
    );
    assert.deepEqual(afterDelete.validation_warnings, []);
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
      staged.find((entry) => entry.tag === "topic:suggested")?.parent_bindings,
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

  it("atomically updates, upserts, and renames staged Tag suggestions", async function () {
    const root = await makeRuntimeRoot();
    let currentTime = "2026-07-16T00:00:00.000Z";
    const repository = createSynthesisRepository({
      runtimeRoot: root,
      now: () => currentTime,
    });
    const service = createSynthesisTagVocabularyService({
      root,
      repository,
      now: () => currentTime,
    });
    await service.stageTagSuggestions({
      entries: [
        {
          tag: "topic:same",
          facet: "topic",
          note: "existing note",
          source_flow: "original-flow",
          parent_bindings: [7],
        },
        {
          tag: "topic:rename-old",
          facet: "topic",
          note: "must not be inherited",
          source_flow: "old-flow",
          parent_bindings: [99],
        },
      ],
    });

    currentTime = "2026-07-16T01:00:00.000Z";
    await service.updateStagedTagSuggestion({
      originalTag: "topic:same",
      tag: "topic:same",
      facet: "method",
      note: "",
      sourceFlow: "manual-edit",
      parentBindings: [8, 7],
    });
    await service.updateStagedTagSuggestion({
      originalTag: "topic:missing",
      tag: "Unvalidated Tag",
      facet: "custom facet",
      note: "new note",
      sourceFlow: "manual-edit",
      parentBindings: [],
    });
    await service.updateStagedTagSuggestion({
      originalTag: "topic:rename-old",
      tag: "topic:rename-new",
      facet: "topic",
      note: "",
      sourceFlow: "manual-edit",
      parentBindings: [3],
    });

    const staged = await service.listStagedTagSuggestions();
    assert.deepInclude(
      staged.find((entry) => entry.tag === "topic:same"),
      {
        tag: "topic:same",
        facet: "method",
        note: "existing note",
        source_flow: "manual-edit",
        parent_bindings: [7, 8],
        created_at: "2026-07-16T00:00:00.000Z",
        updated_at: "2026-07-16T01:00:00.000Z",
      },
    );
    assert.deepInclude(
      staged.find((entry) => entry.tag === "Unvalidated Tag"),
      {
        facet: "custom facet",
        note: "new note",
        parent_bindings: [],
        created_at: "2026-07-16T01:00:00.000Z",
        updated_at: "2026-07-16T01:00:00.000Z",
      },
    );
    assert.deepInclude(
      staged.find((entry) => entry.tag === "topic:rename-new"),
      {
        facet: "topic",
        source_flow: "manual-edit",
        parent_bindings: [3],
        created_at: "2026-07-16T01:00:00.000Z",
        updated_at: "2026-07-16T01:00:00.000Z",
      },
    );
    assert.isUndefined(
      staged.find((entry) => entry.tag === "topic:rename-new")?.note,
    );
    assert.notInclude(
      staged.map((entry) => entry.tag),
      "topic:rename-old",
    );
  });

  it("merges staged Tag rename collisions and removes every casing variant", async function () {
    const root = await makeRuntimeRoot();
    let currentTime = "2026-07-16T00:00:00.000Z";
    const repository = createSynthesisRepository({
      runtimeRoot: root,
      now: () => currentTime,
    });
    const service = createSynthesisTagVocabularyService({
      root,
      repository,
      now: () => currentTime,
    });
    await service.stageTagSuggestions({
      entries: [
        {
          tag: "topic:old",
          facet: "topic",
          note: "old note",
          parent_bindings: [1],
        },
        {
          tag: "topic:target",
          facet: "topic",
          note: "target note",
          source_flow: "target-flow",
          parent_bindings: [2],
        },
        {
          tag: "topic:case-old",
          facet: "topic",
          parent_bindings: [10],
        },
        {
          tag: "Topic:CaseTarget",
          facet: "topic",
          note: "case target note",
          parent_bindings: [11],
        },
      ],
    });
    repository.upsertTagStagedSuggestion({
      tag: "TOPIC:TARGET",
      facet: "topic",
      note: "variant note",
      sourceFlow: "variant-flow",
      parentBindingsJson: "[20]",
      createdAt: "2026-07-16T00:30:00.000Z",
      updatedAt: "2026-07-16T00:30:00.000Z",
    });

    currentTime = "2026-07-16T02:00:00.000Z";
    await service.updateStagedTagSuggestion({
      originalTag: "topic:old",
      tag: "topic:target",
      facet: "method",
      note: "",
      sourceFlow: "manual-edit",
      parentBindings: [3, 2],
    });
    await service.updateStagedTagSuggestion({
      originalTag: "topic:case-old",
      tag: "topic:casetarget",
      facet: "topic",
      note: "replacement",
      sourceFlow: "manual-edit",
      parentBindings: [12],
    });

    const staged = await service.listStagedTagSuggestions();
    const targetRows = staged.filter(
      (entry) => entry.tag.toLowerCase() === "topic:target",
    );
    assert.lengthOf(targetRows, 1);
    assert.deepEqual(targetRows[0], {
      tag: "topic:target",
      facet: "method",
      note: "target note",
      source_flow: "manual-edit",
      parent_bindings: [2, 3],
      created_at: "2026-07-16T00:00:00.000Z",
      updated_at: "2026-07-16T02:00:00.000Z",
    });
    assert.deepEqual(
      staged.find((entry) => entry.tag === "topic:casetarget"),
      {
        tag: "topic:casetarget",
        facet: "topic",
        note: "replacement",
        source_flow: "manual-edit",
        parent_bindings: [11, 12],
        created_at: "2026-07-16T00:00:00.000Z",
        updated_at: "2026-07-16T02:00:00.000Z",
      },
    );
    assert.notIncludeMembers(
      staged.map((entry) => entry.tag),
      ["topic:old", "topic:case-old", "Topic:CaseTarget", "TOPIC:TARGET"],
    );
  });

  it("rolls back both staged Tag rows when the atomic replacement write fails", async function () {
    const root = await makeRuntimeRoot();
    const repository = createSynthesisRepository({ runtimeRoot: root });
    const service = createSynthesisTagVocabularyService({ root, repository });
    await service.stageTagSuggestions({
      entries: [
        { tag: "topic:old", facet: "topic", note: "old", parent_bindings: [1] },
        {
          tag: "topic:target",
          facet: "topic",
          note: "target",
          parent_bindings: [2],
        },
      ],
    });
    const before = await service.listStagedTagSuggestions();
    const originalUpsert =
      repository.upsertTagStagedSuggestion.bind(repository);
    repository.upsertTagStagedSuggestion = (record) => {
      originalUpsert(record);
      if (record.tag === "topic:target") {
        throw new Error("fault-injected staged Tag write");
      }
    };

    try {
      await service.updateStagedTagSuggestion({
        originalTag: "topic:old",
        tag: "topic:target",
        facet: "topic",
        note: "replacement",
        sourceFlow: "manual-edit",
        parentBindings: [3],
      });
      assert.fail("expected the atomic staged Tag update to fail");
    } catch (error) {
      assert.match(String(error), /fault-injected staged Tag write/);
    } finally {
      repository.upsertTagStagedSuggestion = originalUpsert;
    }

    assert.deepEqual(await service.listStagedTagSuggestions(), before);
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
    const diagnostics = canonicalStoreText(root, "diagnostic");
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
        path.join(
          process.cwd(),
          "test/fixtures/synthesis-tag-vocabulary/zotero-tagvocab-sample.json",
        ),
        "utf8",
      ),
    );

    const preview = await service.previewImport(tagVocabPayload);
    assert.equal(preview.additions.length, tagVocabPayload.tags.length);
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
    assert.equal(snapshot.abbrev.cnn, "CNN");
    assert.include(
      snapshot.entries.map((entry) => entry.tag),
      "data:LiDAR",
    );
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
    assert.equal(syncRuns, 0);

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

    const indexPath = path.join(
      buildSynthesisKnowledgeGraphPaths(root).sidecarRoot,
      "tag-index.json",
    );
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
