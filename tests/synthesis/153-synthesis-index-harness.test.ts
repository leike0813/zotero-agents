import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { assert } from "chai";
import {
  LEGACY_TABLE_NAMES,
  assertDebugDbSafe,
  loadRunResults,
  loadSnapshot,
  runCluster,
} from "../../tools/synthesis-index-harness/cli";

function sqlite(dbPath: string, sql: string) {
  const sqlPath = path.join(
    os.tmpdir(),
    `synthesis-index-harness-test-${Date.now()}-${Math.random().toString(16).slice(2)}.sql`,
  );
  fs.writeFileSync(sqlPath, sql, "utf8");
  try {
    execFileSync("sqlite3", [dbPath, `.read ${sqlPath}`], {
      encoding: "utf8",
      stdio: "pipe",
    });
  } finally {
    fs.rmSync(sqlPath, { force: true });
  }
}

function sqliteText(dbPath: string, sql: string) {
  return execFileSync("sqlite3", ["-readonly", dbPath, sql], {
    encoding: "utf8",
    stdio: "pipe",
  }).trim();
}

function createFixture() {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), "synthesis-index-harness-"),
  );
  const zoteroDb = path.join(dir, "zotero.sqlite");
  const pluginDb = path.join(dir, "plugin.sqlite");
  const debugDb = path.join(dir, "debug.sqlite");
  sqlite(
    zoteroDb,
    `
    CREATE TABLE items (itemID INTEGER PRIMARY KEY, itemTypeID INT, libraryID INT, key TEXT);
    CREATE TABLE itemTypes (itemTypeID INTEGER PRIMARY KEY, typeName TEXT);
    CREATE TABLE deletedItems (itemID INTEGER);
    CREATE TABLE itemAttachments (itemID INTEGER PRIMARY KEY, parentItemID INT);
    CREATE TABLE itemNotes (itemID INTEGER PRIMARY KEY, parentItemID INT, note TEXT, title TEXT);
    CREATE TABLE fields (fieldID INTEGER PRIMARY KEY, fieldName TEXT);
    CREATE TABLE itemData (itemID INT, fieldID INT, valueID INT);
    CREATE TABLE itemDataValues (valueID INTEGER PRIMARY KEY, value TEXT);
    CREATE TABLE creators (creatorID INTEGER PRIMARY KEY, firstName TEXT, lastName TEXT);
    CREATE TABLE itemCreators (itemID INT, creatorID INT, creatorTypeID INT, orderIndex INT);
    INSERT INTO itemTypes VALUES (1, 'journalArticle'), (2, 'attachment'), (3, 'note');
    INSERT INTO fields VALUES (1, 'title'), (2, 'date'), (3, 'DOI'), (4, 'url');
    INSERT INTO items VALUES
      (10, 1, 1, 'SRCITEM'),
      (11, 1, 1, 'TARGET'),
      (12, 2, 1, 'ATTACH'),
      (13, 3, 1, 'NOTEITEM');
    INSERT INTO itemAttachments VALUES (12, 10);
    INSERT INTO itemNotes VALUES (13, 10, '<p>note</p>', 'Child note');
    INSERT INTO itemDataValues VALUES
      (1, 'Source Paper Title'),
      (2, '2024'),
      (3, 'Target Paper Title'),
      (4, '2021'),
      (5, '10.1000/target');
    INSERT INTO itemData VALUES
      (10, 1, 1), (10, 2, 2),
      (11, 1, 3), (11, 2, 4), (11, 3, 5);
    INSERT INTO creators VALUES (1, 'Ada', 'Lovelace'), (2, 'Grace', 'Hopper');
    INSERT INTO itemCreators VALUES (10, 1, 1, 0), (11, 2, 1, 0);
    `,
  );
  sqlite(
    pluginDb,
    `
    CREATE TABLE synt_artifact_sidecar (
      source_ref TEXT, library_id INTEGER, item_key TEXT, artifact_type TEXT,
      status TEXT, artifact_hash TEXT, locator_json TEXT, diagnostics_json TEXT,
      scanned_at TEXT, updated_at TEXT
    );
    CREATE TABLE synt_raw_reference (
      raw_reference_id TEXT PRIMARY KEY, source_ref TEXT, references_artifact_hash TEXT,
      reference_index INTEGER, raw_hash TEXT, parsed_title TEXT, normalized_title TEXT,
      year TEXT, authors_json TEXT, raw_reference TEXT, canonical_reference_id TEXT,
      status TEXT, diagnostics_json TEXT, created_at TEXT, updated_at TEXT
    );
    CREATE TABLE synt_canonical_reference (
      canonical_reference_id TEXT PRIMARY KEY, title TEXT, normalized_title TEXT,
      year TEXT, authors_json TEXT, identifiers_json TEXT, metadata_hash TEXT,
      status TEXT, created_at TEXT, updated_at TEXT
    );
    CREATE TABLE synt_canonical_reference_redirect (
      from_canonical_reference_id TEXT PRIMARY KEY, to_canonical_reference_id TEXT,
      reason TEXT, diagnostics_json TEXT, created_at TEXT, updated_at TEXT
    );
    CREATE TABLE synt_reference_binding (
      binding_id TEXT PRIMARY KEY, canonical_reference_id TEXT, library_id INTEGER,
      item_key TEXT, status TEXT, confidence TEXT, reviewer TEXT, basis_hash TEXT,
      diagnostics_json TEXT, created_at TEXT, updated_at TEXT
    );
    CREATE TABLE synt_reference_match_proposal (
      proposal_id TEXT PRIMARY KEY, kind TEXT, status TEXT,
      source_canonical_reference_id TEXT, source_raw_reference_ids_json TEXT,
      target_canonical_reference_id TEXT, target_library_id INTEGER,
      target_item_key TEXT, confidence TEXT, score REAL, reasons_json TEXT,
      evidence_json TEXT, diagnostics_json TEXT, basis_hash TEXT, source_hash TEXT,
      created_at TEXT, updated_at TEXT
    );
    CREATE TABLE synt_literature_item (legacy_id TEXT);
    CREATE TABLE synt_reference_instance (legacy_id TEXT);
    CREATE TABLE synt_reference_resolution (legacy_id TEXT);
    INSERT INTO synt_artifact_sidecar VALUES
      ('1:SRCITEM', 1, 'SRCITEM', 'references', 'available', 'hash:refs', '{}', '[]', 't', 't');
    INSERT INTO synt_canonical_reference VALUES
      ('cref:a', 'Fully convolutional networks for panoptic segmentation', 'fully convolutional networks for panoptic segmentation', '2021', '["Yanwei Li"]', '{}', 'h:a', 'active', 't', 't'),
      ('cref:b', 'Fully convolutional networks for panoptic segmentation with point-based supervision', 'fully convolutional networks for panoptic segmentation with point based supervision', '2021', '["Yanwei Li"]', '{}', 'h:b', 'active', 't', 't'),
      ('cref:c', 'Fully convolutional networks for panoptic segmentation. In CVPR, pp', 'fully convolutional networks for panoptic segmentation in cvpr pp', '2021', '["Yanwei Li"]', '{}', 'h:c', 'active', 't', 't');
    INSERT INTO synt_canonical_reference_redirect VALUES
      ('cref:c', 'cref:a', 'accepted_review', '{}', 't', 't');
    INSERT INTO synt_raw_reference VALUES
      ('raw:a', '1:SRCITEM', 'hash:refs', 0, 'rawhash:a', 'Fully convolutional networks for panoptic segmentation', 'fully convolutional networks for panoptic segmentation', '2021', '["Yanwei Li"]', 'Yanwei Li. Fully convolutional networks for panoptic segmentation. In CVPR, 2021.', 'cref:a', 'active', '[]', 't', 't'),
      ('raw:b', '1:SRCITEM', 'hash:refs', 1, 'rawhash:b', 'Fully convolutional networks for panoptic segmentation with point-based supervision', 'fully convolutional networks for panoptic segmentation with point based supervision', '2021', '["Yanwei Li"]', 'Yanwei Li. Fully convolutional networks for panoptic segmentation with point-based supervision. arXiv preprint arXiv:2108.07682, 2021.', 'cref:b', 'active', '[]', 't', 't'),
      ('raw:c', '1:SRCITEM', 'hash:refs', 2, 'rawhash:c', 'Fully convolutional networks for panoptic segmentation. In CVPR, pp', 'fully convolutional networks for panoptic segmentation in cvpr pp', '2021', '["Yanwei Li"]', 'Yanwei Li. Fully convolutional networks for panoptic segmentation. In CVPR, pp. 2021.', 'cref:c', 'active', '[]', 't', 't');
    `,
  );
  return { dir, zoteroDb, pluginDb, debugDb };
}

describe("Synthesis index harness", function () {
  this.timeout(10000);

  it("builds a sidecar read model from Zotero titles and active reference tables", async function () {
    const fixture = createFixture();
    try {
      const snapshot = await loadSnapshot({
        zoteroDb: fixture.zoteroDb,
        pluginDb: fixture.pluginDb,
      });
      assert.equal(snapshot.zoteroItems[0]?.title, "Source Paper Title");
      assert.deepEqual(
        snapshot.zoteroItems.map((item) => item.itemKey).sort(),
        ["SRCITEM", "TARGET"],
      );
      assert.equal(snapshot.rawReferences.length, 3);
      assert.equal(snapshot.canonicalInputs.length, 2);
      const mergedInput = snapshot.canonicalInputs.find(
        (entry) => entry.canonicalReferenceId === "cref:a",
      );
      assert.equal(mergedInput?.rawReferenceIds?.length, 2);
      assert.isTrue(mergedInput?.stickyRepresentative);
      assert.isAtLeast(mergedInput?.titleCandidates?.length || 0, 3);
      assert.isTrue(
        mergedInput?.titleCandidates?.some(
          (candidate) => candidate.source === "physical_canonical",
        ),
      );
      assert.include(LEGACY_TABLE_NAMES, "synt_literature_item");
    } finally {
      fs.rmSync(fixture.dir, { recursive: true, force: true });
    }
  });

  it("rejects debug DB overlap and writes cluster runs only to debug DB", async function () {
    const fixture = createFixture();
    try {
      assert.throws(
        () =>
          assertDebugDbSafe({
            zoteroDb: fixture.zoteroDb,
            pluginDb: fixture.pluginDb,
            debugDb: fixture.pluginDb,
          }),
        /debug DB path/,
      );
      const before = sqliteText(
        fixture.pluginDb,
        "SELECT COUNT(*) FROM synt_reference_match_proposal",
      );
      const result = await runCluster({
        zoteroDb: fixture.zoteroDb,
        pluginDb: fixture.pluginDb,
        debugDb: fixture.debugDb,
      });
      const after = sqliteText(
        fixture.pluginDb,
        "SELECT COUNT(*) FROM synt_reference_match_proposal",
      );
      assert.equal(after, before);
      assert.isAtLeast(result.result.counters.extension_risk_edge_count, 1);
      assert.equal(
        sqliteText(fixture.debugDb, "SELECT COUNT(*) FROM harness_run"),
        "1",
      );
      assert.equal(
        sqliteText(fixture.debugDb, "SELECT COUNT(*) FROM harness_action"),
        String(result.result.actions.length),
      );
    } finally {
      fs.rmSync(fixture.dir, { recursive: true, force: true });
    }
  });

  it("loads cluster results from the latest run by default", async function () {
    const fixture = createFixture();
    try {
      const first = await runCluster({
        zoteroDb: fixture.zoteroDb,
        pluginDb: fixture.pluginDb,
        debugDb: fixture.debugDb,
      });
      await new Promise((resolve) => setTimeout(resolve, 5));
      const second = await runCluster({
        zoteroDb: fixture.zoteroDb,
        pluginDb: fixture.pluginDb,
        debugDb: fixture.debugDb,
      });
      const results = await loadRunResults(fixture.debugDb);
      assert.equal(results.runId, second.persisted?.runId);
      assert.notEqual(results.runId, first.persisted?.runId);
      assert.isNotEmpty(results.clusters);
      assert.isTrue(
        results.clusters.every((row) => row.run_id === second.persisted?.runId),
      );
      assert.equal(
        sqliteText(fixture.debugDb, "SELECT COUNT(*) FROM harness_run"),
        "2",
      );
    } finally {
      fs.rmSync(fixture.dir, { recursive: true, force: true });
    }
  });

  it("keeps legacy registry tables out of the harness source", function () {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "tools/synthesis-index-harness/cli.ts"),
      "utf8",
    );
    for (const table of LEGACY_TABLE_NAMES) {
      assert.notInclude(
        source.replace(/LEGACY_TABLE_NAMES[\s\S]*?\];/, ""),
        table,
      );
    }
  });

  it("keeps the static harness UI script parseable", function () {
    const html = fs.readFileSync(
      path.resolve(
        process.cwd(),
        "tools/synthesis-index-harness/static/index.html",
      ),
      "utf8",
    );
    const scripts = Array.from(
      html.matchAll(/<script>([\s\S]*?)<\/script>/g),
    ).map((match) => match[1]);
    assert.isNotEmpty(scripts);
    for (const script of scripts) {
      assert.doesNotThrow(() => new Function(script));
    }
  });
});
