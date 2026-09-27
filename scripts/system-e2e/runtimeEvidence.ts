import fs from "node:fs/promises";
import path from "node:path";
import {
  getRuntimePersistencePaths,
  getSynthesisSidecarRuntimePaths,
} from "../../src/modules/runtimePersistence";

export const SIDECAR_RUNTIME_EVIDENCE_SCHEMA =
  "system-e2e-sidecar-runtime-evidence.v1";
export const SIDECAR_RUNTIME_EVIDENCE_FILE = "sidecar-runtime-evidence.json";
export const RUNTIME_LOG_EVIDENCE_FILE = "runtime-logs.json";
export const RUNTIME_LOG_EVIDENCE_MAX_BYTES = 512 * 1024;

type InstalledRuntimeEvidence = {
  present: boolean;
  target: string | null;
  bundleId: string | null;
  buildFingerprint: string | null;
  declaredFiles: number;
  missingFiles: number;
};

type SessionEvidence = {
  index: number;
  lifecycleState: string | null;
  bundleIdMatched: boolean;
  processRecorded: boolean;
};

type RuntimeLogEvidence = {
  present: boolean;
  bytes: number;
  captured: boolean;
};

export type CellRuntimeEvidence = {
  schemaVersion: typeof SIDECAR_RUNTIME_EVIDENCE_SCHEMA;
  runtimeRootPresent: boolean;
  install: InstalledRuntimeEvidence;
  sessions: SessionEvidence[];
  runtimeLog: RuntimeLogEvidence;
};

async function readJson(sourcePath: string): Promise<unknown | null> {
  try {
    return JSON.parse(await fs.readFile(sourcePath, "utf8"));
  } catch {
    return null;
  }
}

async function childDirectoryNames(root: string) {
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

async function fileBytes(sourcePath: string) {
  try {
    const stat = await fs.stat(sourcePath);
    return stat.isFile() ? stat.size : null;
  } catch {
    return null;
  }
}

async function pathExists(sourcePath: string) {
  try {
    await fs.stat(sourcePath);
    return true;
  } catch {
    return false;
  }
}

function record(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

async function readInstalledRuntime(
  currentDir: string,
): Promise<InstalledRuntimeEvidence> {
  const install: InstalledRuntimeEvidence = {
    present: false,
    target: null,
    bundleId: null,
    buildFingerprint: null,
    declaredFiles: 0,
    missingFiles: 0,
  };
  const manifest = record(
    await readJson(path.join(currentDir, "manifest.json")),
  );
  if (!manifest) {
    return install;
  }
  const declared = Array.isArray(manifest.files)
    ? manifest.files.map(record).filter(Boolean)
    : [];
  let declaredFiles = 0;
  let missingFiles = 0;
  for (const entry of declared) {
    const relativePath = text(entry?.path);
    if (!relativePath || relativePath.includes("..")) continue;
    declaredFiles += 1;
    if (!(await pathExists(path.join(currentDir, relativePath)))) {
      missingFiles += 1;
    }
  }
  install.present = true;
  install.target = text(manifest.target);
  install.bundleId = text(manifest.bundleId);
  install.buildFingerprint = text(manifest.buildFingerprint);
  install.declaredFiles = declaredFiles;
  install.missingFiles = missingFiles;
  return install;
}

async function readSessions(
  profilesDir: string,
  installedBundleId: string | null,
): Promise<SessionEvidence[]> {
  const sessions: SessionEvidence[] = [];
  for (const profile of await childDirectoryNames(profilesDir)) {
    for (const session of await childDirectoryNames(
      path.join(profilesDir, profile, "sessions"),
    )) {
      const discovery = record(
        await readJson(
          path.join(
            profilesDir,
            profile,
            "sessions",
            session,
            "discovery.json",
          ),
        ),
      );
      sessions.push({
        index: sessions.length + 1,
        lifecycleState: text(discovery?.lifecycleState),
        bundleIdMatched: Boolean(
          installedBundleId && text(discovery?.bundleId) === installedBundleId,
        ),
        processRecorded: Number.isInteger(discovery?.pid),
      });
    }
  }
  return sessions;
}

/**
 * Persists the bounded sidecar runtime observation of one compatibility cell
 * into its diagnostics directory before the run layout is cleaned up. The
 * evidence answers why a cell was not ready without copying the installed
 * runtime bundle, session tokens, or any absolute host path.
 */
export async function collectCellRuntimeEvidence(args: {
  runtimeRootOverride: string;
  diagnosticsDir: string;
  maxRuntimeLogBytes?: number;
}): Promise<string[]> {
  const maxRuntimeLogBytes =
    args.maxRuntimeLogBytes ?? RUNTIME_LOG_EVIDENCE_MAX_BYTES;
  const paths = getRuntimePersistencePaths(args.runtimeRootOverride);
  const sidecar = getSynthesisSidecarRuntimePaths(paths.runtimeRoot);
  const install = await readInstalledRuntime(sidecar.currentDir);
  const sessions = await readSessions(sidecar.profilesDir, install.bundleId);
  const logBytes = await fileBytes(paths.runtimeLogPath);
  const captured = logBytes !== null && logBytes <= maxRuntimeLogBytes;
  const evidence: CellRuntimeEvidence = {
    schemaVersion: SIDECAR_RUNTIME_EVIDENCE_SCHEMA,
    runtimeRootPresent: await pathExists(paths.runtimeRoot),
    install,
    sessions,
    runtimeLog: {
      present: logBytes !== null,
      bytes: logBytes ?? 0,
      captured,
    },
  };
  await fs.mkdir(args.diagnosticsDir, { recursive: true });
  const written: string[] = [];
  if (captured) {
    const logPath = path.join(args.diagnosticsDir, RUNTIME_LOG_EVIDENCE_FILE);
    await fs.copyFile(paths.runtimeLogPath, logPath);
    written.push(logPath);
  }
  const evidencePath = path.join(
    args.diagnosticsDir,
    SIDECAR_RUNTIME_EVIDENCE_FILE,
  );
  await fs.writeFile(
    evidencePath,
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );
  written.push(evidencePath);
  return written;
}
