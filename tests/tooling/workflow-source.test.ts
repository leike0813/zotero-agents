import { assert } from "chai";
import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  prepareWorkflowSource,
  type PrivateWorkflowSource,
} from "../../scripts/system-e2e/workflowSource";

async function expectReject(promise: Promise<unknown>, pattern: RegExp) {
  let failure: unknown;
  try {
    await promise;
  } catch (error) {
    failure = error;
  }
  assert.instanceOf(failure, Error);
  assert.match((failure as Error).message, pattern);
}

function seedSourceDatabase(databasePath: string, absolutePdfPath: string) {
  const database = new DatabaseSync(databasePath);
  database.exec(`
    CREATE TABLE itemTypes (
      itemTypeID INTEGER PRIMARY KEY,
      typeName TEXT NOT NULL,
      display INTEGER NOT NULL DEFAULT 1,
      custom INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE items (
      itemID INTEGER PRIMARY KEY,
      itemTypeID INTEGER NOT NULL,
      libraryID INTEGER NOT NULL,
      key TEXT NOT NULL
    );
    CREATE TABLE deletedItems (itemID INTEGER PRIMARY KEY);
    CREATE TABLE fields (
      fieldID INTEGER PRIMARY KEY,
      fieldName TEXT NOT NULL
    );
    CREATE TABLE itemDataValues (
      valueID INTEGER PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE itemData (
      itemID INTEGER NOT NULL,
      fieldID INTEGER NOT NULL,
      valueID INTEGER NOT NULL,
      PRIMARY KEY (itemID, fieldID)
    );
    CREATE TABLE creatorTypes (
      creatorTypeID INTEGER PRIMARY KEY,
      creatorType TEXT NOT NULL
    );
    CREATE TABLE creators (
      creatorID INTEGER PRIMARY KEY,
      firstName TEXT,
      lastName TEXT,
      fieldMode INTEGER
    );
    CREATE TABLE itemCreators (
      itemID INTEGER NOT NULL,
      creatorID INTEGER NOT NULL,
      creatorTypeID INTEGER NOT NULL,
      orderIndex INTEGER NOT NULL
    );
    CREATE TABLE tags (
      tagID INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    );
    CREATE TABLE itemTags (
      itemID INTEGER NOT NULL,
      tagID INTEGER NOT NULL,
      type INTEGER NOT NULL
    );
    CREATE TABLE collections (
      collectionID INTEGER PRIMARY KEY,
      collectionName TEXT NOT NULL,
      parentCollectionID INTEGER,
      libraryID INTEGER NOT NULL,
      key TEXT NOT NULL
    );
    CREATE TABLE deletedCollections (collectionID INTEGER PRIMARY KEY);
    CREATE TABLE collectionItems (
      collectionID INTEGER NOT NULL,
      itemID INTEGER NOT NULL,
      orderIndex INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE itemAttachments (
      itemID INTEGER PRIMARY KEY,
      parentItemID INTEGER,
      linkMode INTEGER,
      contentType TEXT,
      path TEXT
    );

    INSERT INTO itemTypes (itemTypeID, typeName) VALUES
      (1, 'journalArticle'),
      (2, 'attachment'),
      (3, 'note'),
      (4, 'annotation');
    INSERT INTO items (itemID, itemTypeID, libraryID, key) VALUES
      (1, 1, 1, 'ITEMAAAA'),
      (2, 1, 1, 'ITEMBBBB'),
      (3, 1, 1, 'TRASHAAA'),
      (4, 1, 2, 'OTHERAAA'),
      (5, 2, 1, 'PDFSTOR1'),
      (6, 2, 1, 'PDFREL01'),
      (7, 2, 1, 'PDFMISS1'),
      (8, 2, 1, 'NONPDF01'),
      (9, 2, 1, 'PDFDEL01'),
      (10, 2, 1, 'PDFTRSH1'),
      (11, 2, 1, 'PDFABS01'),
      (12, 3, 1, 'NOTEAAAA');
    INSERT INTO deletedItems (itemID) VALUES (3), (9);
    INSERT INTO itemAttachments
      (itemID, parentItemID, linkMode, contentType, path)
    VALUES
      (5, 1, 0, 'application/pdf', 'storage:stored.pdf'),
      (6, 1, 2, 'application/pdf', 'attachments:linked/relative.pdf'),
      (7, 2, 2, 'application/pdf', 'attachments:linked/missing.pdf'),
      (8, 2, 0, 'text/plain', 'storage:notes.txt'),
      (9, 1, 0, 'application/pdf', 'storage:deleted.pdf'),
      (10, 3, 0, 'application/pdf', 'storage:trash.pdf');
    INSERT INTO fields (fieldID, fieldName) VALUES
      (1, 'title'),
      (2, 'date');
    INSERT INTO itemDataValues (valueID, value) VALUES
      (1, 'Synthetic title A'),
      (2, 'Synthetic date A'),
      (3, 'Synthetic title B'),
      (4, 'Synthetic PDF title');
    INSERT INTO itemData (itemID, fieldID, valueID) VALUES
      (1, 1, 1),
      (1, 2, 2),
      (2, 1, 3),
      (5, 1, 4);
    INSERT INTO creatorTypes (creatorTypeID, creatorType) VALUES
      (1, 'author'),
      (2, 'editor');
    INSERT INTO creators
      (creatorID, firstName, lastName, fieldMode)
    VALUES
      (1, 'Ada', 'Synthetic', 0),
      (2, NULL, 'Synthetic Group', 1);
    INSERT INTO itemCreators
      (itemID, creatorID, creatorTypeID, orderIndex)
    VALUES
      (1, 1, 1, 0),
      (1, 2, 2, 1);
    INSERT INTO tags (tagID, name) VALUES (1, 'synthetic-tag');
    INSERT INTO itemTags (itemID, tagID, type) VALUES (1, 1, 1);
    INSERT INTO collections
      (collectionID, collectionName, parentCollectionID, libraryID, key)
    VALUES
      (1, 'Synthetic root', NULL, 1, 'COLLROOT'),
      (2, 'Synthetic child', 1, 1, 'COLLCHILD'),
      (3, 'Synthetic deleted', 1, 1, 'COLLDEL1');
    INSERT INTO deletedCollections (collectionID) VALUES (3);
    INSERT INTO collectionItems (collectionID, itemID) VALUES
      (1, 1),
      (2, 1),
      (2, 2),
      (3, 2);
  `);
  database
    .prepare(
      `INSERT INTO itemAttachments
        (itemID, parentItemID, linkMode, contentType, path)
       VALUES (11, 2, 2, 'application/pdf', ?)`,
    )
    .run(absolutePdfPath);
  database.close();
}

describe("private workflow E2E source", function () {
  let root: string;
  let sourceDataDir: string;
  let baseAttachmentDir: string;
  let targetDir: string;
  let sourceDatabasePath: string;

  beforeEach(async function () {
    root = await mkdtemp(path.join(tmpdir(), "workflow-source-"));
    sourceDataDir = path.join(root, "source-data");
    baseAttachmentDir = path.join(root, "linked");
    targetDir = path.join(root, "target");
    sourceDatabasePath = path.join(sourceDataDir, "zotero.sqlite");
    await mkdir(sourceDataDir, { recursive: true });
    await mkdir(path.join(sourceDataDir, "storage", "PDFSTOR1"), {
      recursive: true,
    });
    await mkdir(path.join(sourceDataDir, "storage", "PDFTRSH1"), {
      recursive: true,
    });
    await mkdir(path.join(sourceDataDir, "storage", "NONPDF01"), {
      recursive: true,
    });
    await mkdir(path.join(baseAttachmentDir, "linked"), { recursive: true });
    const absolutePdfPath = path.join(root, "absolute.pdf");
    seedSourceDatabase(sourceDatabasePath, absolutePdfPath);
    await writeFile(
      path.join(sourceDataDir, "storage", "PDFSTOR1", "stored.pdf"),
      "stored pdf",
    );
    await writeFile(
      path.join(sourceDataDir, "storage", "NONPDF01", "notes.txt"),
      "not a pdf",
    );
    await writeFile(
      path.join(baseAttachmentDir, "linked", "relative.pdf"),
      "relative pdf",
    );
    await writeFile(absolutePdfPath, "absolute pdf");
    await writeFile(
      path.join(sourceDataDir, "storage", "PDFTRSH1", "trash.pdf"),
      "trash pdf",
    );
  });

  afterEach(async function () {
    await rm(root, { recursive: true, force: true });
  });

  it("copies active library-one parents, metadata, hierarchy, and PDFs", async function () {
    const sourceBefore = createHash("sha256")
      .update(await readFile(sourceDatabasePath))
      .digest("hex");

    const prepared = await prepareWorkflowSource({
      sourceDataDir,
      baseAttachmentDir,
      targetDir,
    });

    assert.equal(prepared.manifestPath, path.join(targetDir, "source.json"));
    assert.deepEqual(prepared.facts, {
      items: 2,
      pdfs: 3,
      missingPdfs: 1,
      collections: 2,
    });
    const manifest = JSON.parse(
      await readFile(prepared.manifestPath, "utf8"),
    ) as PrivateWorkflowSource;
    assert.equal(manifest.schemaVersion, "workflow-e2e-private-source.v1");
    assert.deepEqual(
      manifest.items.map((item) => item.sourceKey),
      ["ITEMAAAA", "ITEMBBBB"],
    );

    const first = manifest.items[0]!;
    assert.equal(first.itemType, "journalArticle");
    assert.deepEqual(first.fields, {
      date: "Synthetic date A",
      title: "Synthetic title A",
    });
    assert.deepEqual(first.creators, [
      {
        creatorType: "author",
        firstName: "Ada",
        lastName: "Synthetic",
      },
      { creatorType: "editor", name: "Synthetic Group" },
    ]);
    assert.deepEqual(first.tags, [{ tag: "synthetic-tag", type: 1 }]);
    assert.deepEqual([...first.collectionKeys].sort(), [
      "COLLCHILD",
      "COLLROOT",
    ]);
    assert.deepEqual(
      first.pdfs.map(({ sourceKey, path: pdfPath, title }) => ({
        sourceKey,
        path: pdfPath,
        title,
      })),
      [
        {
          sourceKey: "PDFSTOR1",
          path: "pdfs/PDFSTOR1.pdf",
          title: "Synthetic PDF title",
        },
        {
          sourceKey: "PDFREL01",
          path: "pdfs/PDFREL01.pdf",
          title: "relative.pdf",
        },
      ],
    );
    assert.deepEqual(manifest.items[1]!.collectionKeys, ["COLLCHILD"]);
    assert.deepEqual(manifest.items[1]!.pdfs, [
      {
        sourceKey: "PDFABS01",
        path: "pdfs/PDFABS01.pdf",
        contentType: "application/pdf",
        title: "absolute.pdf",
      },
    ]);
    assert.deepEqual(manifest.collections, [
      {
        sourceKey: "COLLROOT",
        name: "Synthetic root",
        parentKey: null,
      },
      {
        sourceKey: "COLLCHILD",
        name: "Synthetic child",
        parentKey: "COLLROOT",
      },
    ]);
    assert.deepEqual(manifest.missingPdfs, [
      {
        sourceKey: "PDFMISS1",
        parentKey: "ITEMBBBB",
        path: path.join(baseAttachmentDir, "linked", "missing.pdf"),
      },
    ]);

    const copied = path.join(targetDir, "pdfs");
    assert.deepEqual((await readdir(copied)).sort(), [
      "PDFABS01.pdf",
      "PDFREL01.pdf",
      "PDFSTOR1.pdf",
    ]);
    assert.equal(
      await readFile(path.join(copied, "PDFSTOR1.pdf"), "utf8"),
      "stored pdf",
    );
    assert.equal(
      await readFile(path.join(copied, "PDFREL01.pdf"), "utf8"),
      "relative pdf",
    );
    assert.equal(
      await readFile(path.join(copied, "PDFABS01.pdf"), "utf8"),
      "absolute pdf",
    );
    const [storedSource, storedTarget] = await Promise.all([
      stat(path.join(sourceDataDir, "storage", "PDFSTOR1", "stored.pdf"), {
        bigint: true,
      }),
      stat(path.join(copied, "PDFSTOR1.pdf"), { bigint: true }),
    ]);
    assert.notEqual(storedSource.ino, storedTarget.ino);
    assert.isFalse(
      (await lstat(path.join(copied, "PDFSTOR1.pdf"))).isSymbolicLink(),
    );

    const snapshot = new DatabaseSync(path.join(targetDir, "source.sqlite"), {
      readOnly: true,
    });
    assert.equal(
      (
        snapshot.prepare("SELECT COUNT(*) AS count FROM items").get() as {
          count: number;
        }
      ).count,
      12,
    );
    snapshot.close();

    const sourceAfter = createHash("sha256")
      .update(await readFile(sourceDatabasePath))
      .digest("hex");
    assert.equal(sourceAfter, sourceBefore);
    await expectReject(readFile(`${sourceDatabasePath}-wal`), /ENOENT/);
  });

  it("rejects a non-quiescent source, an occupied target, and a nested target", async function () {
    await writeFile(`${sourceDatabasePath}-wal`, "pending pages");
    await expectReject(
      prepareWorkflowSource({
        sourceDataDir,
        baseAttachmentDir,
        targetDir,
      }),
      /WAL/i,
    );
    await rm(`${sourceDatabasePath}-wal`);

    await mkdir(targetDir);
    await writeFile(path.join(targetDir, "keep.txt"), "keep");
    await expectReject(
      prepareWorkflowSource({
        sourceDataDir,
        baseAttachmentDir,
        targetDir,
      }),
      /empty/i,
    );
    assert.equal(
      await readFile(path.join(targetDir, "keep.txt"), "utf8"),
      "keep",
    );

    await expectReject(
      prepareWorkflowSource({
        sourceDataDir,
        baseAttachmentDir,
        targetDir: path.join(sourceDataDir, "nested-target"),
      }),
      /target/i,
    );
  });
});
