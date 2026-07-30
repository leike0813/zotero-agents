import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  createSynthesisProductionBackupService,
  inspectSynthesisProductionSource,
} from "../../src/modules/synthesisProductionBackup";
import { getRuntimePersistencePaths } from "../../src/modules/runtimePersistence";

describe("Synthesis production backup", function () {
  it("classifies a wholly absent source separately from a partial source", async function () {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "synthesis-production-source-"),
    );
    const paths = getRuntimePersistencePaths(root);
    try {
      assert.deepEqual(await inspectSynthesisProductionSource(paths), {
        kind: "empty-profile",
        databasePresent: false,
        canonicalPresent: false,
        orphanDatabaseSidecars: [],
      });

      await fs.mkdir(path.dirname(paths.synthesisDbPath), {
        recursive: true,
      });
      await fs.writeFile(`${paths.synthesisDbPath}-wal`, "orphan");
      const partial = await inspectSynthesisProductionSource(paths);
      assert.equal(partial.kind, "incomplete");
      assert.deepEqual(partial.orphanDatabaseSidecars, ["-wal"]);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("uses the native empty-source initializer before verifying a new profile", async function () {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "synthesis-production-empty-"),
    );
    const paths = getRuntimePersistencePaths(root);
    let initialized = 0;
    try {
      const service = createSynthesisProductionBackupService({
        persistenceRoot: root,
        async prepareEmptySource() {
          initialized += 1;
          await fs.mkdir(path.dirname(paths.synthesisDbPath), {
            recursive: true,
          });
          await fs.mkdir(paths.synthesisDataRoot, { recursive: true });
          await fs.writeFile(paths.synthesisDbPath, "native-empty");
        },
      });
      const backup = await service.createVerifiedBackup({
        sourceSchemaVersion: "source-1",
        targetSchemaVersion: "target-1",
      });

      assert.equal(initialized, 1);
      assert.equal(backup.sourceOwner, "empty-profile");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("verifies DB/WAL/canonical copies and restores the same production bytes", async function () {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "synthesis-production-backup-"),
    );
    const paths = getRuntimePersistencePaths(root);
    await fs.mkdir(path.dirname(paths.synthesisDbPath), {
      recursive: true,
    });
    await fs.mkdir(path.join(paths.synthesisDataRoot, "topics", "topic-1"), {
      recursive: true,
    });
    await fs.writeFile(paths.synthesisDbPath, "db-before");
    await fs.writeFile(`${paths.synthesisDbPath}-wal`, "wal-before");
    await fs.writeFile(
      path.join(paths.synthesisDataRoot, "topics", "topic-1", "manifest.json"),
      '{"version":1}',
    );

    try {
      const service = createSynthesisProductionBackupService({
        persistenceRoot: root,
      });
      const backup = await service.createVerifiedBackup({
        sourceSchemaVersion: "source-1",
        targetSchemaVersion: "target-1",
      });
      assert.equal(backup.sourceOwner, "legacy-plugin");
      assert.match(backup.backupId, /^[a-f0-9]{64}$/);
      assert.match(backup.canonicalManifestSha256, /^[a-f0-9]{64}$/);
      await fs.writeFile(paths.synthesisDbPath, "db-after");
      await fs.rm(`${paths.synthesisDbPath}-wal`);
      await fs.writeFile(
        path.join(
          paths.synthesisDataRoot,
          "topics",
          "topic-1",
          "manifest.json",
        ),
        '{"version":2}',
      );

      await service.restoreVerifiedBackup(backup);
      assert.equal(
        await fs.readFile(paths.synthesisDbPath, "utf8"),
        "db-before",
      );
      assert.equal(
        await fs.readFile(`${paths.synthesisDbPath}-wal`, "utf8"),
        "wal-before",
      );
      assert.equal(
        await fs.readFile(
          path.join(
            paths.synthesisDataRoot,
            "topics",
            "topic-1",
            "manifest.json",
          ),
          "utf8",
        ),
        '{"version":1}',
      );
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
