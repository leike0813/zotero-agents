import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, copyFile, mkdir, readFile, rm, stat } from "node:fs/promises";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path, { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { readHostBridgeCliBuildRecipe } from "./host-bridge-cli-release-governance.mjs";
import { readZipArchiveEntries } from "./zip-archive";

const PREBUILD_BRANCH = "host-bridge-cli-prebuilds";
const DOWNLOAD_DIR = path.join(".scaffold", "host-bridge-cli-prebuilds-sync");
const EXTRACT_DIR = path.join(DOWNLOAD_DIR, "extracted");
const PREBUILD_ROOT = path.join("addon", "bin");

const EXPECTED_PLATFORMS: Array<{ platform: string; binary: string }> =
  readHostBridgeCliBuildRecipe().targets.map(
    ({ platform, binary }: { platform: string; binary: string }) => ({
      platform,
      binary,
    }),
  );

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

function requireCommand(command: string) {
  const result = spawnSync(command, ["--version"], { stdio: "ignore" });
  if (result.error || result.status !== 0) {
    throw new Error(`Missing required command: ${command}`);
  }
}

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited ${result.status}`);
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
    expectedIdentity &&
    (manifest.cliVersion !== expectedIdentity.cliVersion ||
      manifest.buildFingerprint !== expectedIdentity.buildFingerprint)
  ) {
    throw new Error(
      `Prebuild aggregate ${aggregate} is already bound to a different CLI identity`,
    );
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
      archive.file !== `zotero-bridge-${archive.platform}.zip`
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

async function main() {
  const release = JSON.parse(
    readFileSync("cli/zotero-bridge/release.json", "utf8"),
  );
  const aggregate =
    argValue("aggregate") || String(release.binaryAggregateSha256 || "");
  if (!/^[a-f0-9]{64}$/.test(aggregate)) {
    throw new Error(
      "--aggregate requires a 64-character binary aggregate SHA-256",
    );
  }
  const repo =
    argValue("repo") || process.env.GITHUB_REPOSITORY || packageRepository();
  const branch = argValue("branch") || PREBUILD_BRANCH;
  if (!repo) throw new Error("Pass --repo=owner/name");
  requireCommand("gh");
  await rm(DOWNLOAD_DIR, { recursive: true, force: true });
  await mkdir(dirname(DOWNLOAD_DIR), { recursive: true });
  run("gh", [
    "repo",
    "clone",
    repo,
    DOWNLOAD_DIR,
    "--",
    "--branch",
    branch,
    "--single-branch",
    "--depth",
    "1",
  ]);
  const setDirectory = path.join(DOWNLOAD_DIR, "sets", aggregate);
  const manifest = await verifyArchiveSet(setDirectory, aggregate, {
    cliVersion: String(release.version || ""),
    buildFingerprint: String(release.buildFingerprint || ""),
  });
  await rm(EXTRACT_DIR, { recursive: true, force: true });
  await mkdir(EXTRACT_DIR, { recursive: true });
  for (const archive of manifest.archives) {
    const archivePath = path.join(setDirectory, archive.file);
    if (!(await stat(archivePath)).isFile()) continue;
    extractZipWithNode(
      archivePath,
      EXTRACT_DIR,
      archive.platform,
      archive.binary,
    );
  }
  await replacePrebuilds(EXTRACT_DIR);
  console.log(
    JSON.stringify({
      ok: true,
      repo,
      branch,
      aggregate,
      target: PREBUILD_ROOT,
    }),
  );
}

export const syncHostBridgeCliPrebuildInternalsForTests = {
  expectedPlatforms: EXPECTED_PLATFORMS,
  replacePrebuilds,
  verifyArchiveSet,
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
