#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ADDON_RELEASE_MANIFEST_PATH,
  EXPECTED_PREBUILDS,
  RELEASE_MANIFEST_PATH,
  computeHostBridgeCliBuildFingerprint,
  readHostBridgeCliReleaseManifest,
} from "./host-bridge-cli-release-governance.mjs";

function repoPath(root, relativePath) {
  return path.join(root, ...String(relativePath || "").split(/[\\/]+/));
}

async function sha256File(filePath) {
  return createHash("sha256")
    .update(await fs.readFile(filePath))
    .digest("hex");
}

async function readSidecarSha256(root, platform, binary) {
  const sidecarPath = repoPath(root, `addon/bin/${platform}/${binary}.sha256`);
  const raw = await fs.readFile(sidecarPath, "utf8");
  const checksum = raw.trim().split(/\s+/)[0] || "";
  if (!/^[a-f0-9]{64}$/i.test(checksum)) {
    throw new Error(`Invalid sha256 sidecar: ${sidecarPath}`);
  }
  return checksum.toLowerCase();
}

function binaryManifestByPlatform(manifest) {
  const map = new Map();
  for (const entry of Array.isArray(manifest.binaries)
    ? manifest.binaries
    : []) {
    map.set(String(entry.platform || ""), entry);
  }
  return map;
}

function createFailure(code, message, details = {}) {
  return {
    ok: false,
    code,
    message,
    details,
  };
}

export async function checkHostBridgeCliPrebuildFreshness(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const manifest = await readHostBridgeCliReleaseManifest({ root });
  const current = await computeHostBridgeCliBuildFingerprint({ root });
  if (manifest.buildFingerprint !== current.fingerprint) {
    return createFailure(
      "host_bridge_cli_fingerprint_stale",
      "Host Bridge CLI release manifest fingerprint does not match current build inputs.",
      {
        manifestPath: RELEASE_MANIFEST_PATH,
        manifestFingerprint: String(manifest.buildFingerprint || ""),
        currentFingerprint: current.fingerprint,
      },
    );
  }

  const addonManifestPath = repoPath(root, ADDON_RELEASE_MANIFEST_PATH);
  if (!existsSync(addonManifestPath)) {
    return createFailure(
      "host_bridge_cli_addon_manifest_missing",
      "Addon Host Bridge CLI release manifest is missing.",
      {
        addonManifestPath: ADDON_RELEASE_MANIFEST_PATH,
      },
    );
  }
  const addonManifest = JSON.parse(readFileSync(addonManifestPath, "utf8"));
  if (
    addonManifest.version !== manifest.version ||
    addonManifest.buildFingerprint !== manifest.buildFingerprint
  ) {
    return createFailure(
      "host_bridge_cli_addon_manifest_stale",
      "Addon Host Bridge CLI release manifest is not synchronized with the CLI release manifest.",
      {
        addonManifestPath: ADDON_RELEASE_MANIFEST_PATH,
        version: addonManifest.version,
        expectedVersion: manifest.version,
        buildFingerprint: addonManifest.buildFingerprint,
        expectedBuildFingerprint: manifest.buildFingerprint,
      },
    );
  }

  const byPlatform = binaryManifestByPlatform(manifest);
  const addonByPlatform = binaryManifestByPlatform(addonManifest);
  const diagnostics = [];
  for (const expected of EXPECTED_PREBUILDS) {
    const binaryPath = repoPath(
      root,
      `addon/bin/${expected.platform}/${expected.binary}`,
    );
    if (!existsSync(binaryPath)) {
      diagnostics.push({
        code: "missing_binary",
        platform: expected.platform,
        path: `addon/bin/${expected.platform}/${expected.binary}`,
      });
      continue;
    }
    const stat = await fs.stat(binaryPath);
    const actualSha256 = await sha256File(binaryPath);
    const sidecarSha256 = await readSidecarSha256(
      root,
      expected.platform,
      expected.binary,
    );
    const manifestEntry = byPlatform.get(expected.platform);
    const addonManifestEntry = addonByPlatform.get(expected.platform);
    if (!manifestEntry) {
      diagnostics.push({
        code: "missing_manifest_entry",
        platform: expected.platform,
      });
      continue;
    }
    if (actualSha256 !== sidecarSha256) {
      diagnostics.push({
        code: "sidecar_sha256_mismatch",
        platform: expected.platform,
        actualSha256,
        sidecarSha256,
      });
    }
    if (
      manifestEntry.binary !== expected.binary ||
      manifestEntry.sha256 !== actualSha256 ||
      Number(manifestEntry.bytes || 0) !== stat.size
    ) {
      diagnostics.push({
        code: "release_manifest_binary_mismatch",
        platform: expected.platform,
        actualSha256,
        actualBytes: stat.size,
        manifestEntry,
      });
    }
    if (
      !addonManifestEntry ||
      addonManifestEntry.binary !== manifestEntry.binary ||
      addonManifestEntry.sha256 !== manifestEntry.sha256 ||
      Number(addonManifestEntry.bytes || 0) !== Number(manifestEntry.bytes || 0)
    ) {
      diagnostics.push({
        code: "addon_manifest_binary_mismatch",
        platform: expected.platform,
        addonManifestEntry: addonManifestEntry || null,
        manifestEntry,
      });
    }
  }

  if (diagnostics.length) {
    return createFailure(
      "host_bridge_cli_prebuilds_stale",
      "Host Bridge CLI prebuilds do not match the release manifest.",
      { diagnostics },
    );
  }

  return {
    ok: true,
    version: manifest.version,
    buildFingerprint: manifest.buildFingerprint,
    binaryAggregateSha256: manifest.binaryAggregateSha256 || "",
    platforms: EXPECTED_PREBUILDS.map((entry) => entry.platform),
  };
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  checkHostBridgeCliPrebuildFreshness()
    .then((result) => {
      printJson(result);
      if (!result.ok) {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      printJson({
        ok: false,
        code: "host_bridge_cli_freshness_check_failed",
        message: error instanceof Error ? error.message : String(error || ""),
      });
      process.exitCode = 1;
    });
}
