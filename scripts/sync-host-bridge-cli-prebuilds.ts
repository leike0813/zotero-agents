import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  chmod,
  copyFile,
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path, { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import {
  ADDON_RELEASE_MANIFEST_PATH,
  RELEASE_MANIFEST_PATH,
  getHostBridgeCliReleaseStatus,
  readHostBridgeCliReleaseManifest,
  recordHostBridgeCliBinaryChecksums,
} from "./host-bridge-cli-release-governance.mjs";
import { readHostBridgeCliBuildRecipe } from "./host-bridge-cli-release-governance.mjs";
import { readZipArchiveEntries } from "./zip-archive";

const execFileAsync = promisify(execFile);
const PREBUILD_BRANCH = "host-bridge-cli-prebuilds";
const DOWNLOAD_DIR = path.join(".scaffold", "host-bridge-cli-prebuilds-sync");
const PREBUILD_ROOT = path.join("addon", "bin");

const EXPECTED_PLATFORMS: Array<{ platform: string; binary: string }> =
  readHostBridgeCliBuildRecipe().targets.map(
    ({ platform, binary }: { platform: string; binary: string }) => ({
      platform,
      binary,
    }),
  );

type CommandRunner = (
  command: string,
  args: string[],
) => Promise<{ stdout: string; stderr: string }>;

type PrebuildManifest = {
  schema: "host-bridge.cli-prebuild-set.v1";
  binaryAggregateSha256: string;
  cliVersion: string;
  buildFingerprint: string;
  archives: Array<{
    platform: string;
    binary: string;
    file: string;
    sha256: string;
  }>;
};

export type HostBridgeCliPrebuildResult = {
  schema: "host-bridge-cli-prebuild-result.v1";
  repository: string;
  workflow: "build-host-bridge-cli-prebuilds.yml";
  runId: number;
  requestId: string;
  sourceSha: string;
  ref: string;
  cliVersion: string;
  buildFingerprint: string;
  binaryAggregateSha256: string;
  prebuildBranch: "host-bridge-cli-prebuilds";
  prebuildCommit: string;
  setPath: string;
};

function argValue(name: string) {
  const inline = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  const index = process.argv.indexOf(`--${name}`);
  return (
    inline?.slice(name.length + 3) ||
    (index >= 0 ? process.argv[index + 1] : "")
  ).trim();
}

function packageRepository() {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const raw = String(pkg.repository?.url || pkg.repository || "").trim();
  const match = raw.match(/github\.com[:/](.+?\/.+?)(?:\.git)?$/);
  return match?.[1]?.replace(/\.git$/, "") || "";
}

async function runCommand(command: string, args: string[]) {
  const result = await execFileAsync(command, args, { windowsHide: true });
  return { stdout: result.stdout || "", stderr: result.stderr || "" };
}

function assertHex(value: unknown, length: number, label: string) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (!new RegExp(`^[a-f0-9]{${length}}$`).test(normalized)) {
    throw new Error(`${label} must be a ${length}-character hexadecimal value`);
  }
  return normalized;
}

function assertNonEmpty(value: unknown, label: string) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(`${label} is required`);
  return normalized;
}

function assertRepository(value: unknown) {
  const repository = assertNonEmpty(value, "Prebuild result repository");
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new Error("Prebuild result repository must be owner/name");
  }
  return repository;
}

export function readPrebuildResultText(
  text: string,
): HostBridgeCliPrebuildResult {
  const parsed = JSON.parse(text) as Partial<HostBridgeCliPrebuildResult>;
  if (parsed.schema !== "host-bridge-cli-prebuild-result.v1") {
    throw new Error("Unsupported Host Bridge CLI prebuild result schema");
  }
  if (parsed.workflow !== "build-host-bridge-cli-prebuilds.yml") {
    throw new Error("Prebuild result workflow identity is invalid");
  }
  if (parsed.prebuildBranch !== PREBUILD_BRANCH) {
    throw new Error("Prebuild result branch identity is invalid");
  }
  const runId = Number(parsed.runId);
  if (!Number.isSafeInteger(runId) || runId <= 0) {
    throw new Error("Prebuild result runId must be a positive integer");
  }
  const requestId = assertNonEmpty(
    parsed.requestId,
    "Prebuild result requestId",
  );
  if (!/^[A-Za-z0-9._-]+$/.test(requestId)) {
    throw new Error("Prebuild result requestId contains invalid characters");
  }
  const ref = assertNonEmpty(parsed.ref, "Prebuild result ref");
  if (!/^[A-Za-z0-9._/-]+$/.test(ref) || ref.includes("..")) {
    throw new Error("Prebuild result ref is invalid");
  }
  const cliVersion = assertNonEmpty(
    parsed.cliVersion,
    "Prebuild result CLI version",
  );
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(cliVersion)) {
    throw new Error("Prebuild result CLI version is invalid");
  }
  const binaryAggregateSha256 = assertHex(
    parsed.binaryAggregateSha256,
    64,
    "Prebuild result aggregate",
  );
  const setPath = assertNonEmpty(parsed.setPath, "Prebuild result set path");
  if (setPath !== `sets/${binaryAggregateSha256}`) {
    throw new Error("Prebuild result set path does not match its aggregate");
  }
  return {
    schema: parsed.schema,
    repository: assertRepository(parsed.repository),
    workflow: parsed.workflow,
    runId,
    requestId,
    sourceSha: assertHex(parsed.sourceSha, 40, "Prebuild result source SHA"),
    ref,
    cliVersion,
    buildFingerprint: assertHex(
      parsed.buildFingerprint,
      64,
      "Prebuild result build fingerprint",
    ),
    binaryAggregateSha256,
    prebuildBranch: parsed.prebuildBranch,
    prebuildCommit: assertHex(
      parsed.prebuildCommit,
      40,
      "Prebuild result branch commit",
    ),
    setPath,
  };
}

export function assertPrebuildResultIdentity(
  result: HostBridgeCliPrebuildResult,
  expected: Partial<HostBridgeCliPrebuildResult>,
) {
  for (const field of [
    "repository",
    "workflow",
    "runId",
    "requestId",
    "sourceSha",
    "ref",
    "cliVersion",
    "buildFingerprint",
    "binaryAggregateSha256",
    "prebuildBranch",
    "prebuildCommit",
    "setPath",
  ] as const) {
    const expectedValue = expected[field];
    if (
      expectedValue !== undefined &&
      String(result[field]) !== String(expectedValue)
    ) {
      throw new Error(
        `Prebuild result ${field} does not match the expected identity`,
      );
    }
  }
}

function extractZipWithNode(
  archive: string,
  destination: string,
  expectedPlatform: string,
  expectedBinary: string,
) {
  const allowedEntries = new Set([
    `${expectedPlatform}/`,
    `${expectedPlatform}/${expectedBinary}`,
    `${expectedPlatform}/${expectedBinary}.sha256`,
  ]);
  const archiveEntries = readZipArchiveEntries(archive);
  for (const entryName of archiveEntries.entryNames) {
    if (!allowedEntries.has(entryName)) {
      throw new Error(`Unexpected ZIP entry: ${entryName}`);
    }
  }
  for (const [entryName, bytes] of archiveEntries.selectedEntries) {
    const target = path.join(destination, entryName);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, bytes);
  }
}

async function sha256File(file: string) {
  return createHash("sha256")
    .update(await readFile(file))
    .digest("hex");
}

async function verifyPrebuilds(root = PREBUILD_ROOT) {
  const missing: string[] = [];
  for (const { platform, binary } of EXPECTED_PLATFORMS) {
    for (const file of [binary, `${binary}.sha256`]) {
      const target = path.join(root, platform, file);
      if (!existsSync(target)) missing.push(target);
    }
  }
  if (missing.length) {
    throw new Error(
      `Missing Host Bridge CLI prebuilds:\n${missing.join("\n")}`,
    );
  }
  for (const { platform, binary } of EXPECTED_PLATFORMS) {
    const binaryPath = path.join(root, platform, binary);
    const expected = String(await readFile(`${binaryPath}.sha256`, "utf8"))
      .trim()
      .split(/\s+/)[0];
    if (!/^[a-f0-9]{64}$/i.test(expected)) {
      throw new Error(
        `Invalid prebuild checksum sidecar: ${platform}/${binary}`,
      );
    }
    if ((await sha256File(binaryPath)) !== expected.toLowerCase()) {
      throw new Error(`Prebuild checksum mismatch: ${platform}/${binary}`);
    }
    if (!platform.startsWith("win32")) {
      await chmod(binaryPath, 0o755);
    }
  }
}

async function replacePrebuilds(
  sourceRoot: string,
  targetRoot = PREBUILD_ROOT,
) {
  await verifyPrebuilds(sourceRoot);
  for (const { platform, binary } of EXPECTED_PLATFORMS) {
    const sourceDirectory = path.join(sourceRoot, platform);
    const targetDirectory = path.join(targetRoot, platform);
    await mkdir(targetDirectory, { recursive: true });
    for (const file of [binary, `${binary}.sha256`]) {
      await copyFile(
        path.join(sourceDirectory, file),
        path.join(targetDirectory, file),
      );
    }
  }
  await verifyPrebuilds(targetRoot);
}

type ChangedFileState = {
  target: string;
  backup: string;
  hadOriginal: boolean;
  installed: boolean;
};

async function rollbackChangedFiles(
  changed: ChangedFileState[],
  beforeRestore?: (
    state: ChangedFileState,
    index: number,
  ) => void | Promise<void>,
) {
  const errors: Error[] = [];
  for (const [index, state] of [...changed].reverse().entries()) {
    try {
      await beforeRestore?.(state, index);
      if (state.installed) {
        await rm(state.target, { force: true });
      }
      if (state.hadOriginal && existsSync(state.backup)) {
        await mkdir(path.dirname(state.target), { recursive: true });
        await rename(state.backup, state.target);
      }
    } catch (error) {
      const cause = error instanceof Error ? error.message : String(error);
      errors.push(new Error(`Failed to restore ${state.target}: ${cause}`));
    }
  }
  return errors;
}

async function verifyArchiveSet(
  setDirectory: string,
  aggregate: string,
  expectedIdentity?: { cliVersion: string; buildFingerprint: string },
) {
  const manifest = JSON.parse(
    await readFile(path.join(setDirectory, "manifest.json"), "utf8"),
  ) as PrebuildManifest;
  if (
    manifest.schema !== "host-bridge.cli-prebuild-set.v1" ||
    manifest.binaryAggregateSha256 !== aggregate
  ) {
    throw new Error(`Prebuild manifest does not match aggregate ${aggregate}`);
  }
  if (
    !/^[a-f0-9]{64}$/.test(manifest.buildFingerprint) ||
    !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(manifest.cliVersion)
  ) {
    throw new Error("Prebuild manifest contains an invalid CLI identity");
  }
  if (
    expectedIdentity &&
    (manifest.cliVersion !== expectedIdentity.cliVersion ||
      manifest.buildFingerprint !== expectedIdentity.buildFingerprint)
  ) {
    throw new Error(
      `Prebuild aggregate ${aggregate} is already bound to a different CLI identity`,
    );
  }
  if (!Array.isArray(manifest.archives)) {
    throw new Error("Prebuild manifest archives must be an array");
  }
  const expectedPlatforms = new Map(
    EXPECTED_PLATFORMS.map((entry) => [entry.platform, entry.binary]),
  );
  if (manifest.archives.length !== expectedPlatforms.size) {
    throw new Error("Prebuild manifest must contain exactly seven archives");
  }
  for (const archive of manifest.archives) {
    const expectedBinary = expectedPlatforms.get(archive.platform);
    if (
      !expectedBinary ||
      archive.binary !== expectedBinary ||
      archive.file !== `zotero-bridge-${archive.platform}.zip` ||
      !/^[a-f0-9]{64}$/.test(archive.sha256)
    ) {
      throw new Error(`Unexpected or duplicate prebuild: ${archive.platform}`);
    }
    expectedPlatforms.delete(archive.platform);
    const file = path.join(setDirectory, archive.file);
    if ((await sha256File(file)) !== archive.sha256) {
      throw new Error(`Prebuild archive checksum mismatch: ${archive.file}`);
    }
  }
  return manifest;
}

async function clonePrebuildStore(args: {
  repo: string;
  branch: string;
  destination: string;
  commit?: string;
  commandRunner: CommandRunner;
}) {
  await rm(args.destination, { recursive: true, force: true });
  await mkdir(path.dirname(args.destination), { recursive: true });
  if (!args.commit) {
    await args.commandRunner("gh", [
      "repo",
      "clone",
      args.repo,
      args.destination,
      "--",
      "--branch",
      args.branch,
      "--single-branch",
      "--depth",
      "1",
    ]);
    return;
  }
  await args.commandRunner("gh", [
    "repo",
    "clone",
    args.repo,
    args.destination,
    "--",
    "--branch",
    args.branch,
    "--single-branch",
    "--no-checkout",
    "--filter=blob:none",
  ]);
  await args.commandRunner("git", [
    "-C",
    args.destination,
    "fetch",
    "origin",
    args.commit,
    "--depth",
    "1",
  ]);
  await args.commandRunner("git", [
    "-C",
    args.destination,
    "merge-base",
    "--is-ancestor",
    args.commit,
    `refs/remotes/origin/${args.branch}`,
  ]);
  await args.commandRunner("git", [
    "-C",
    args.destination,
    "checkout",
    "--detach",
    args.commit,
  ]);
  const head = await args.commandRunner("git", [
    "-C",
    args.destination,
    "rev-parse",
    "HEAD",
  ]);
  if (head.stdout.trim() !== args.commit) {
    throw new Error(
      "Checked-out prebuild commit does not match result identity",
    );
  }
}

async function replacePrebuildsAndManifests(args: {
  root: string;
  sourceRoot: string;
  manifest: Record<string, unknown>;
  beforeInstall?: (relativePath: string, index: number) => void | Promise<void>;
}) {
  await verifyPrebuilds(args.sourceRoot);
  const transactionRoot = path.join(
    args.root,
    ".scaffold",
    `host-bridge-cli-sync-${randomUUID()}`,
  );
  const stageRoot = path.join(transactionRoot, "stage");
  const backupRoot = path.join(transactionRoot, "backup");
  const manifestText = `${JSON.stringify(args.manifest, null, 2)}\n`;
  const files: Array<{ relativePath: string; source?: string; text?: string }> =
    [];
  for (const { platform, binary } of EXPECTED_PLATFORMS) {
    for (const file of [binary, `${binary}.sha256`]) {
      files.push({
        relativePath: path.join("addon", "bin", platform, file),
        source: path.join(args.sourceRoot, platform, file),
      });
    }
  }
  files.push(
    { relativePath: RELEASE_MANIFEST_PATH, text: manifestText },
    { relativePath: ADDON_RELEASE_MANIFEST_PATH, text: manifestText },
  );

  await rm(transactionRoot, { recursive: true, force: true });
  for (const file of files) {
    const staged = path.join(stageRoot, file.relativePath);
    await mkdir(path.dirname(staged), { recursive: true });
    if (file.source) {
      await copyFile(file.source, staged);
    } else {
      await writeFile(staged, file.text || "", "utf8");
    }
  }
  await verifyPrebuilds(path.join(stageRoot, "addon", "bin"));

  const changed: ChangedFileState[] = [];
  let retainTransaction = false;
  try {
    for (const [index, file] of files.entries()) {
      await args.beforeInstall?.(file.relativePath, index);
      const staged = path.join(stageRoot, file.relativePath);
      const target = path.join(args.root, file.relativePath);
      const backup = path.join(backupRoot, file.relativePath);
      await mkdir(path.dirname(target), { recursive: true });
      await mkdir(path.dirname(backup), { recursive: true });
      const state = {
        target,
        backup,
        hadOriginal: existsSync(target),
        installed: false,
      };
      changed.push(state);
      if (state.hadOriginal) await rename(target, backup);
      await rename(staged, target);
      state.installed = true;
    }
    await verifyPrebuilds(path.join(args.root, "addon", "bin"));
    for (const manifestPath of [
      RELEASE_MANIFEST_PATH,
      ADDON_RELEASE_MANIFEST_PATH,
    ]) {
      if (
        (await readFile(path.join(args.root, manifestPath), "utf8")) !==
        manifestText
      ) {
        throw new Error(`Release manifest transaction failed: ${manifestPath}`);
      }
    }
  } catch (error) {
    const rollbackErrors = await rollbackChangedFiles(changed);
    if (rollbackErrors.length > 0) {
      retainTransaction = true;
      const original = error instanceof Error ? error.message : String(error);
      throw new Error(
        [
          `Host Bridge CLI prebuild installation failed: ${original}`,
          `Rollback also failed for ${rollbackErrors.length} file(s):`,
          ...rollbackErrors.map((rollbackError) => rollbackError.message),
          `Recovery backups retained at ${backupRoot}`,
        ].join("\n"),
      );
    }
    throw error;
  } finally {
    if (!retainTransaction) {
      await rm(transactionRoot, { recursive: true, force: true });
    }
  }
}

export async function syncHostBridgeCliPrebuilds(args: {
  repo: string;
  branch?: string;
  aggregate?: string;
  identity?: HostBridgeCliPrebuildResult;
  root?: string;
  downloadDir?: string;
  commandRunner?: CommandRunner;
}) {
  const root = path.resolve(args.root || process.cwd());
  const commandRunner = args.commandRunner || runCommand;
  const localRelease = await readHostBridgeCliReleaseManifest({ root });
  const status = await getHostBridgeCliReleaseStatus({ root });
  const identity = args.identity;
  if (identity) {
    assertPrebuildResultIdentity(identity, {
      repository: args.repo,
      prebuildBranch: args.branch || identity.prebuildBranch,
      cliVersion: status.currentVersion,
      buildFingerprint: status.fingerprint,
    });
  }
  const aggregate = identity?.binaryAggregateSha256 || args.aggregate || "";
  assertHex(aggregate, 64, "Prebuild aggregate");
  const branch = args.branch || identity?.prebuildBranch || PREBUILD_BRANCH;
  if (!/^[A-Za-z0-9._/-]+$/.test(branch) || branch.includes("..")) {
    throw new Error("Prebuild branch is invalid");
  }
  const downloadDir = path.resolve(root, args.downloadDir || DOWNLOAD_DIR);
  await clonePrebuildStore({
    repo: args.repo,
    branch,
    destination: downloadDir,
    commit: identity?.prebuildCommit,
    commandRunner,
  });

  const setDirectory = path.join(
    downloadDir,
    ...(identity?.setPath || `sets/${aggregate}`).split("/"),
  );
  const expectedIdentity = identity
    ? {
        cliVersion: identity.cliVersion,
        buildFingerprint: identity.buildFingerprint,
      }
    : {
        cliVersion: String(localRelease.version || ""),
        buildFingerprint: String(localRelease.buildFingerprint || ""),
      };
  const manifest = await verifyArchiveSet(
    setDirectory,
    aggregate,
    expectedIdentity,
  );
  const extractDir = path.join(downloadDir, ".extracted");
  await rm(extractDir, { recursive: true, force: true });
  await mkdir(extractDir, { recursive: true });
  for (const archive of manifest.archives) {
    const archivePath = path.join(setDirectory, archive.file);
    if (!(await stat(archivePath)).isFile()) {
      throw new Error(`Missing prebuild archive: ${archive.file}`);
    }
    extractZipWithNode(
      archivePath,
      extractDir,
      archive.platform,
      archive.binary,
    );
  }
  await verifyPrebuilds(extractDir);
  const nextManifest = await recordHostBridgeCliBinaryChecksums({
    root,
    binaryRoot: extractDir,
    dispatchReason: identity ? "prebuild-only" : localRelease.dispatchReason,
  });
  if (nextManifest.binaryAggregateSha256 !== aggregate) {
    throw new Error(
      "Extracted Host Bridge CLI binaries do not match the prebuild aggregate",
    );
  }
  await replacePrebuildsAndManifests({
    root,
    sourceRoot: extractDir,
    manifest: nextManifest,
  });
  return {
    ok: true,
    repo: args.repo,
    branch,
    aggregate,
    prebuildCommit: identity?.prebuildCommit || "",
    target: path.join(root, PREBUILD_ROOT),
  };
}

async function main() {
  const identityFile = argValue("identity-file");
  const identity = identityFile
    ? readPrebuildResultText(await readFile(identityFile, "utf8"))
    : undefined;
  const repo =
    argValue("repo") ||
    identity?.repository ||
    process.env.GITHUB_REPOSITORY ||
    packageRepository();
  if (!repo) throw new Error("Pass --repo=owner/name");
  const branch =
    argValue("branch") || identity?.prebuildBranch || PREBUILD_BRANCH;
  const aggregate = argValue("aggregate");
  if (identity && aggregate && aggregate !== identity.binaryAggregateSha256) {
    throw new Error("--aggregate conflicts with --identity-file");
  }
  if (identity && repo !== identity.repository) {
    throw new Error("--repo conflicts with prebuild result repository");
  }
  if (identity && branch !== identity.prebuildBranch) {
    throw new Error("--branch conflicts with prebuild result branch");
  }
  console.log(
    JSON.stringify(
      await syncHostBridgeCliPrebuilds({
        repo,
        branch,
        aggregate:
          aggregate ||
          (!identity
            ? String(
                (
                  await readHostBridgeCliReleaseManifest({
                    root: process.cwd(),
                  })
                ).binaryAggregateSha256 || "",
              )
            : ""),
        identity,
      }),
    ),
  );
}

export const syncHostBridgeCliPrebuildInternalsForTests = {
  expectedPlatforms: EXPECTED_PLATFORMS,
  readPrebuildResultText,
  assertPrebuildResultIdentity,
  replacePrebuilds,
  replacePrebuildsAndManifests,
  rollbackChangedFiles,
  verifyArchiveSet,
  verifyPrebuilds,
};

const invokedModule = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedModule) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
