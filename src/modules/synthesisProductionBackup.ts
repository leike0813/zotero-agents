import { sha256Hex } from "../platform/hash";
import { joinPath } from "../utils/path";
import {
  copyRuntimeDirectory,
  copyRuntimeFile,
  ensureRuntimeDirectory,
  getRuntimePersistencePaths,
  moveRuntimePath,
  readRuntimeBytes,
  removeRuntimePath,
  runtimePathExists,
  scanRuntimeTree,
} from "./runtimePersistence";
import type { SynthesisCutoverBackupBasis } from "./synthesisProductionCutover";

export type SynthesisVerifiedProductionBackup =
  SynthesisCutoverBackupBasis & {
    backupRoot: string;
  };

type BackupServiceOptions = {
  persistenceRoot?: string;
};

async function hashText(value: string) {
  return sha256Hex(new TextEncoder().encode(value));
}

async function hashFile(path: string) {
  return sha256Hex(await readRuntimeBytes(path));
}

async function fileHashes(databasePath: string) {
  const result: Record<string, string> = {};
  for (const suffix of ["", "-wal", "-shm"]) {
    const path = `${databasePath}${suffix}`;
    if (await runtimePathExists(path)) {
      result[`synthesis.db${suffix}`] = await hashFile(path);
    }
  }
  if (!result["synthesis.db"]) {
    throw new Error("synthesis_production_database_missing");
  }
  return result;
}

async function canonicalManifest(root: string) {
  const tree = await scanRuntimeTree(root);
  if (tree.issues.length) {
    throw new Error("synthesis_canonical_backup_scan_failed");
  }
  const files = tree.entries
    .filter((entry) => entry.kind === "file")
    .sort((left, right) =>
      left.relativePath.localeCompare(right.relativePath),
    );
  const entries: Array<{
    path: string;
    bytes: number;
    sha256: string;
  }> = [];
  for (const entry of files) {
    entries.push({
      path: entry.relativePath,
      bytes: entry.size,
      sha256: await hashFile(entry.absolutePath),
    });
  }
  return {
    entries,
    sha256: await hashText(JSON.stringify(entries)),
  };
}

async function snapshot(args: {
  databasePath: string;
  canonicalRoot: string;
}) {
  if (!(await runtimePathExists(args.canonicalRoot))) {
    throw new Error("synthesis_canonical_root_missing");
  }
  const databaseFiles = await fileHashes(args.databasePath);
  const canonical = await canonicalManifest(args.canonicalRoot);
  return {
    databaseFiles,
    durableSummarySha256: await hashText(
      JSON.stringify(databaseFiles),
    ),
    canonicalManifestSha256: canonical.sha256,
  };
}

async function copyDatabaseFiles(source: string, target: string) {
  await ensureRuntimeDirectory(
    target.replace(/[\\/][^\\/]+$/, ""),
  );
  for (const suffix of ["", "-wal", "-shm"]) {
    const sourcePath = `${source}${suffix}`;
    if (await runtimePathExists(sourcePath)) {
      await copyRuntimeFile({
        sourcePath,
        targetPath: `${target}${suffix}`,
      });
    }
  }
}

function sameSnapshot(
  left: Awaited<ReturnType<typeof snapshot>>,
  right: Awaited<ReturnType<typeof snapshot>>,
) {
  return (
    left.durableSummarySha256 === right.durableSummarySha256 &&
    left.canonicalManifestSha256 === right.canonicalManifestSha256 &&
    JSON.stringify(left.databaseFiles) ===
      JSON.stringify(right.databaseFiles)
  );
}

export function createSynthesisProductionBackupService(
  options: BackupServiceOptions = {},
) {
  const paths = getRuntimePersistencePaths(options.persistenceRoot);

  async function createVerifiedBackup(args: {
    sourceSchemaVersion: string;
    targetSchemaVersion: string;
  }): Promise<SynthesisVerifiedProductionBackup> {
    const source = await snapshot({
      databasePath: paths.synthesisDbPath,
      canonicalRoot: paths.synthesisDataRoot,
    });
    const backupId = await hashText(
      JSON.stringify({
        databaseFiles: source.databaseFiles,
        canonicalManifestSha256: source.canonicalManifestSha256,
        sourceSchemaVersion: args.sourceSchemaVersion,
        targetSchemaVersion: args.targetSchemaVersion,
      }),
    );
    const backupRoot = joinPath(
      paths.synthesisCutoverBackupRoot,
      backupId,
    );
    const backupDatabasePath = joinPath(
      backupRoot,
      "state",
      "synthesis.db",
    );
    const backupCanonicalRoot = joinPath(
      backupRoot,
      "data",
      "synthesis",
    );
    if (!(await runtimePathExists(backupRoot))) {
      try {
        await copyDatabaseFiles(
          paths.synthesisDbPath,
          backupDatabasePath,
        );
        await copyRuntimeDirectory({
          sourceDir: paths.synthesisDataRoot,
          targetDir: backupCanonicalRoot,
        });
      } catch (error) {
        await removeRuntimePath(backupRoot).catch(() => false);
        throw error;
      }
    }
    const copied = await snapshot({
      databasePath: backupDatabasePath,
      canonicalRoot: backupCanonicalRoot,
    });
    if (!sameSnapshot(source, copied)) {
      throw new Error("synthesis_backup_verification_failed");
    }
    return {
      backupId,
      backupRoot,
      sourceSchemaVersion: args.sourceSchemaVersion,
      targetSchemaVersion: args.targetSchemaVersion,
      canonicalManifestSha256: source.canonicalManifestSha256,
      durableSummarySha256: source.durableSummarySha256,
    };
  }

  async function restoreVerifiedBackup(
    backup:
      | SynthesisVerifiedProductionBackup
      | SynthesisCutoverBackupBasis,
  ) {
    const backupRoot =
      "backupRoot" in backup
        ? backup.backupRoot
        : joinPath(
            paths.synthesisCutoverBackupRoot,
            backup.backupId,
          );
    const backupDatabasePath = joinPath(
      backupRoot,
      "state",
      "synthesis.db",
    );
    const backupCanonicalRoot = joinPath(
      backupRoot,
      "data",
      "synthesis",
    );
    const expected = await snapshot({
      databasePath: backupDatabasePath,
      canonicalRoot: backupCanonicalRoot,
    });
    if (
      expected.durableSummarySha256 !==
        backup.durableSummarySha256 ||
      expected.canonicalManifestSha256 !==
        backup.canonicalManifestSha256
    ) {
      throw new Error("synthesis_backup_identity_mismatch");
    }

    for (const suffix of ["", "-wal", "-shm"]) {
      const backupPath = `${backupDatabasePath}${suffix}`;
      const productionPath = `${paths.synthesisDbPath}${suffix}`;
      if (await runtimePathExists(backupPath)) {
        const staging = `${productionPath}.restore-${backup.backupId}`;
        await removeRuntimePath(staging).catch(() => false);
        await copyRuntimeFile({
          sourcePath: backupPath,
          targetPath: staging,
        });
        await moveRuntimePath({
          sourcePath: staging,
          targetPath: productionPath,
          overwrite: true,
        });
      } else {
        await removeRuntimePath(productionPath).catch(() => false);
      }
    }
    await copyRuntimeDirectory({
      sourceDir: backupCanonicalRoot,
      targetDir: paths.synthesisDataRoot,
    });
    const restored = await snapshot({
      databasePath: paths.synthesisDbPath,
      canonicalRoot: paths.synthesisDataRoot,
    });
    if (!sameSnapshot(expected, restored)) {
      throw new Error("synthesis_backup_restore_verification_failed");
    }
  }

  return { createVerifiedBackup, restoreVerifiedBackup };
}
