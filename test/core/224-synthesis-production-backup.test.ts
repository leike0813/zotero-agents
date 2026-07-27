import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  createSynthesisProductionBackupService,
} from "../../src/modules/synthesisProductionBackup";
import { getRuntimePersistencePaths } from "../../src/modules/runtimePersistence";

describe("Synthesis production backup", function () {
  it("verifies DB/WAL/canonical copies and restores the same production bytes", async function () {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "synthesis-production-backup-"),
    );
    const paths = getRuntimePersistencePaths(root);
    await fs.mkdir(path.dirname(paths.synthesisDbPath), {
      recursive: true,
    });
    await fs.mkdir(
      path.join(paths.synthesisDataRoot, "topics", "topic-1"),
      { recursive: true },
    );
    await fs.writeFile(paths.synthesisDbPath, "db-before");
    await fs.writeFile(`${paths.synthesisDbPath}-wal`, "wal-before");
    await fs.writeFile(
      path.join(
        paths.synthesisDataRoot,
        "topics",
        "topic-1",
        "manifest.json",
      ),
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
      assert.match(backup.backupId, /^[a-f0-9]{64}$/);
      assert.match(
        backup.canonicalManifestSha256,
        /^[a-f0-9]{64}$/,
      );
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
