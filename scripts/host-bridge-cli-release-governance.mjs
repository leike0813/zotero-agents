#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const RELEASE_MANIFEST_PATH = "cli/zotero-bridge/release.json";
export const ADDON_RELEASE_MANIFEST_PATH =
  "addon/bin/zotero-bridge-release.json";
export const CARGO_TOML_PATH = "cli/zotero-bridge/Cargo.toml";
export const CARGO_LOCK_PATH = "cli/zotero-bridge/Cargo.lock";

export const EXPECTED_PREBUILDS = [
  { platform: "win32-x64", binary: "zotero-bridge.exe" },
  { platform: "darwin-x64", binary: "zotero-bridge" },
  { platform: "darwin-arm64", binary: "zotero-bridge" },
  { platform: "linux-x86", binary: "zotero-bridge" },
  { platform: "linux-x64", binary: "zotero-bridge" },
  { platform: "linux-arm", binary: "zotero-bridge" },
  { platform: "linux-arm64", binary: "zotero-bridge" },
];

const BUILD_INPUT_EXACT_PATHS = new Set([
  ".github/workflows/build-zotero-bridge-cli.yml",
  "scripts/build-zotero-bridge-cli.mjs",
  "scripts/package-zotero-bridge-cli.mjs",
  "scripts/host-bridge-cli-release-governance.mjs",
  CARGO_TOML_PATH,
  CARGO_LOCK_PATH,
]);

const BUILD_INPUT_PREFIXES = ["cli/zotero-bridge/src/"];

function normalizeRelativePath(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "");
}

function repoPath(root, relativePath) {
  return path.join(root, ...normalizeRelativePath(relativePath).split("/"));
}

async function readText(root, relativePath) {
  return fs.readFile(repoPath(root, relativePath), "utf8");
}

async function writeText(root, relativePath, value) {
  await fs.mkdir(path.dirname(repoPath(root, relativePath)), {
    recursive: true,
  });
  await fs.writeFile(repoPath(root, relativePath), value, "utf8");
}

async function listFiles(root, relativeDir) {
  const dir = repoPath(root, relativeDir);
  if (!existsSync(dir)) {
    return [];
  }
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = `${normalizeRelativePath(relativeDir)}/${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...(await listFiles(root, child)));
    } else if (entry.isFile()) {
      files.push(child);
    }
  }
  return files;
}

export function isHostBridgeCliBuildInputPath(relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  return (
    BUILD_INPUT_EXACT_PATHS.has(normalized) ||
    BUILD_INPUT_PREFIXES.some((prefix) => normalized.startsWith(prefix))
  );
}

export function normalizeCargoTomlForFingerprint(source) {
  let inPackage = false;
  return String(source || "")
    .split(/\r?\n/)
    .map((line) => {
      const section = line.match(/^\s*\[([^\]]+)\]\s*$/)?.[1] || "";
      if (section) {
        inPackage = section === "package";
      }
      if (inPackage && /^\s*version\s*=/.test(line)) {
        return 'version = "<fingerprint-ignored>"';
      }
      return line;
    })
    .join("\n");
}

export function normalizeCargoLockForFingerprint(source) {
  const lines = String(source || "").split(/\r?\n/);
  let blockStart = -1;
  let blockName = "";
  const output = [...lines];
  for (let index = 0; index <= lines.length; index += 1) {
    const line = lines[index] || "";
    const startsBlock = index === lines.length || line.trim() === "[[package]]";
    if (startsBlock && blockStart >= 0) {
      if (blockName === "zotero-bridge") {
        for (let blockIndex = blockStart; blockIndex < index; blockIndex += 1) {
          if (/^\s*version\s*=/.test(output[blockIndex] || "")) {
            output[blockIndex] = 'version = "<fingerprint-ignored>"';
          }
        }
      }
      blockName = "";
    }
    if (line.trim() === "[[package]]") {
      blockStart = index;
      blockName = "";
      continue;
    }
    if (blockStart >= 0 && !blockName) {
      const name = line.match(/^\s*name\s*=\s*"([^"]+)"/)?.[1] || "";
      if (name) {
        blockName = name;
      }
    }
  }
  return output.join("\n");
}

async function collectBuildInputFiles(root) {
  const files = new Set([...BUILD_INPUT_EXACT_PATHS]);
  for (const prefix of BUILD_INPUT_PREFIXES) {
    const dir = prefix.replace(/\/+$/, "");
    for (const file of await listFiles(root, dir)) {
      files.add(file);
    }
  }
  return Array.from(files)
    .filter((file) => existsSync(repoPath(root, file)))
    .sort((left, right) => left.localeCompare(right));
}

async function readFingerprintContent(root, relativePath) {
  const text = await readText(root, relativePath);
  if (relativePath === CARGO_TOML_PATH) {
    return normalizeCargoTomlForFingerprint(text);
  }
  if (relativePath === CARGO_LOCK_PATH) {
    return normalizeCargoLockForFingerprint(text);
  }
  return text;
}

export async function computeHostBridgeCliBuildFingerprint(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const files = await collectBuildInputFiles(root);
  const hash = createHash("sha256");
  for (const file of files) {
    const content = await readFingerprintContent(root, file);
    hash.update(`${file}\0`);
    hash.update(content);
    hash.update("\0");
  }
  return {
    fingerprint: hash.digest("hex"),
    files,
  };
}

export function readCargoPackageVersion(source) {
  let inPackage = false;
  for (const line of String(source || "").split(/\r?\n/)) {
    const section = line.match(/^\s*\[([^\]]+)\]\s*$/)?.[1] || "";
    if (section) {
      inPackage = section === "package";
    }
    if (!inPackage) {
      continue;
    }
    const version = line.match(/^\s*version\s*=\s*"([^"]+)"/)?.[1] || "";
    if (version) {
      return version;
    }
  }
  throw new Error("Cargo.toml package version is missing");
}

export function bumpPatchVersion(version) {
  const match = String(version || "").match(/^(\d+)\.(\d+)\.(\d+)(.*)$/);
  if (!match) {
    throw new Error(`Unsupported Cargo package version: ${version}`);
  }
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}${match[4] || ""}`;
}

export function replaceCargoPackageVersion(source, version) {
  let inPackage = false;
  return String(source || "")
    .split(/\r?\n/)
    .map((line) => {
      const section = line.match(/^\s*\[([^\]]+)\]\s*$/)?.[1] || "";
      if (section) {
        inPackage = section === "package";
      }
      if (inPackage && /^\s*version\s*=/.test(line)) {
        return `version = "${version}"`;
      }
      return line;
    })
    .join("\n");
}

export function replaceCargoLockPackageVersion(source, packageName, version) {
  const lines = String(source || "").split(/\r?\n/);
  let blockStart = -1;
  let blockName = "";
  const output = [...lines];
  for (let index = 0; index <= lines.length; index += 1) {
    const line = lines[index] || "";
    const startsBlock = index === lines.length || line.trim() === "[[package]]";
    if (startsBlock && blockStart >= 0) {
      if (blockName === packageName) {
        for (let blockIndex = blockStart; blockIndex < index; blockIndex += 1) {
          if (/^\s*version\s*=/.test(output[blockIndex] || "")) {
            output[blockIndex] = `version = "${version}"`;
          }
        }
      }
      blockName = "";
    }
    if (line.trim() === "[[package]]") {
      blockStart = index;
      blockName = "";
      continue;
    }
    if (blockStart >= 0 && !blockName) {
      const name = line.match(/^\s*name\s*=\s*"([^"]+)"/)?.[1] || "";
      if (name) {
        blockName = name;
      }
    }
  }
  return output.join("\n");
}

async function readReleaseManifest(root) {
  const manifestPath = repoPath(root, RELEASE_MANIFEST_PATH);
  if (!existsSync(manifestPath)) {
    return {
      schema: "zotero-bridge-cli-release.v1",
      version: "",
      buildFingerprint: "",
      fingerprintInputs: [],
      binaries: [],
    };
  }
  return JSON.parse(await fs.readFile(manifestPath, "utf8"));
}

export async function readHostBridgeCliReleaseManifest(options = {}) {
  return readReleaseManifest(path.resolve(options.root || process.cwd()));
}

async function writeReleaseManifest(root, manifest) {
  await writeText(
    root,
    RELEASE_MANIFEST_PATH,
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

export async function getHostBridgeCliReleaseStatus(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const { fingerprint, files } = await computeHostBridgeCliBuildFingerprint({
    root,
  });
  const manifest = await readReleaseManifest(root);
  const currentVersion = readCargoPackageVersion(
    await readText(root, CARGO_TOML_PATH),
  );
  return {
    changed: manifest.buildFingerprint !== fingerprint,
    currentVersion,
    manifestVersion: String(manifest.version || ""),
    fingerprint,
    manifestFingerprint: String(manifest.buildFingerprint || ""),
    files,
  };
}

export async function bumpHostBridgeCliPatchVersion(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const status = await getHostBridgeCliReleaseStatus({ root });
  const manifest = await readReleaseManifest(root);
  if (!status.changed && !options.force) {
    return {
      changed: false,
      previousVersion: status.currentVersion,
      version: status.currentVersion,
      fingerprint: status.fingerprint,
    };
  }

  const previousVersion = status.currentVersion;
  const version = bumpPatchVersion(previousVersion);
  const cargoToml = await readText(root, CARGO_TOML_PATH);
  const cargoLock = await readText(root, CARGO_LOCK_PATH);
  await writeText(
    root,
    CARGO_TOML_PATH,
    replaceCargoPackageVersion(cargoToml, version),
  );
  await writeText(
    root,
    CARGO_LOCK_PATH,
    replaceCargoLockPackageVersion(cargoLock, "zotero-bridge", version),
  );
  await writeReleaseManifest(root, {
    schema: "zotero-bridge-cli-release.v1",
    version,
    buildFingerprint: status.fingerprint,
    fingerprintInputs: status.files,
    binaries: Array.isArray(manifest.binaries) ? manifest.binaries : [],
    dispatchReason: options.dispatchReason || manifest.dispatchReason || "",
  });
  return {
    changed: true,
    previousVersion,
    version,
    fingerprint: status.fingerprint,
  };
}

async function readSha256File(root, platform, binary) {
  const raw = await readText(root, `addon/bin/${platform}/${binary}.sha256`);
  const checksum = raw.trim().split(/\s+/)[0] || "";
  if (!/^[a-f0-9]{64}$/i.test(checksum)) {
    throw new Error(`Invalid sha256 file for ${platform}/${binary}`);
  }
  return checksum.toLowerCase();
}

export async function recordHostBridgeCliBinaryChecksums(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const status = await getHostBridgeCliReleaseStatus({ root });
  const manifest = await readReleaseManifest(root);
  const currentVersion = readCargoPackageVersion(
    await readText(root, CARGO_TOML_PATH),
  );
  const binaries = [];
  const aggregate = createHash("sha256");
  for (const entry of EXPECTED_PREBUILDS) {
    const binaryPath = repoPath(
      root,
      `addon/bin/${entry.platform}/${entry.binary}`,
    );
    const stat = await fs.stat(binaryPath);
    const sha256 = await readSha256File(root, entry.platform, entry.binary);
    aggregate.update(
      `${entry.platform}/${entry.binary}:${sha256}:${stat.size}\n`,
    );
    binaries.push({
      platform: entry.platform,
      binary: entry.binary,
      sha256,
      bytes: stat.size,
    });
  }
  const next = {
    schema: "zotero-bridge-cli-release.v1",
    version: currentVersion,
    buildFingerprint: status.fingerprint,
    fingerprintInputs: status.files,
    binaryAggregateSha256: aggregate.digest("hex"),
    binaries,
    dispatchReason: options.dispatchReason || manifest.dispatchReason || "",
  };
  if (options.write) {
    await writeReleaseManifest(root, next);
    await writeText(
      root,
      ADDON_RELEASE_MANIFEST_PATH,
      `${JSON.stringify(next, null, 2)}\n`,
    );
  }
  return next;
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function main(argv) {
  const [command = "status", ...args] = argv;
  const write = args.includes("--write");
  const force = args.includes("--force");
  const json = args.includes("--json") || true;
  const dispatchReasonArg = args.find((entry) =>
    entry.startsWith("--dispatch-reason="),
  );
  const dispatchReason = dispatchReasonArg
    ? dispatchReasonArg.slice("--dispatch-reason=".length)
    : "";
  if (command === "fingerprint") {
    printJson(await computeHostBridgeCliBuildFingerprint());
    return;
  }
  if (command === "status") {
    printJson(await getHostBridgeCliReleaseStatus());
    return;
  }
  if (command === "bump-patch") {
    if (!write) {
      throw new Error("bump-patch requires --write");
    }
    printJson(await bumpHostBridgeCliPatchVersion({ force, dispatchReason }));
    return;
  }
  if (command === "record-binaries") {
    printJson(
      await recordHostBridgeCliBinaryChecksums({ write, dispatchReason }),
    );
    return;
  }
  if (json) {
    printJson({ ok: false, error: `Unknown command: ${command}` });
  }
  process.exitCode = 2;
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (
  invokedFile &&
  pathToFileURL(invokedFile).href === pathToFileURL(currentFile).href
) {
  main(process.argv.slice(2)).catch((error) => {
    printJson({
      ok: false,
      error: error instanceof Error ? error.message : String(error || ""),
    });
    process.exitCode = 1;
  });
}
