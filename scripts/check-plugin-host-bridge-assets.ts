import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { readZipArchiveEntries } from "./zip-archive";
import {
  HOST_BRIDGE_PLUGIN_SKILL_BUNDLE_SCHEMA,
  hostBridgePluginSkillBundleDigestPayload,
  isSafeHostBridgePluginSkillBundlePath,
  type HostBridgePluginSkillBundleManifest,
} from "../src/shared/hostBridgePluginSkillBundleContract";
import {
  loadHostBridgeSurfaceDefinitions,
  resolveHostBridgeSurface,
} from "./host-bridge-surface-model";

export type HostBridgeCliReleaseManifest = {
  schema: "zotero-bridge-cli-release.v1";
  version: string;
  buildFingerprint: string;
  binaries: Array<{
    platform: string;
    binary: string;
    sha256: string;
    bytes: number;
  }>;
};

export type PluginHostBridgeAssetIssueCode =
  | "native_binary_missing"
  | "native_sidecar_missing"
  | "native_sidecar_invalid"
  | "native_checksum_mismatch"
  | "host_bridge_release_mismatch"
  | "skill_bundle_manifest_missing"
  | "skill_bundle_manifest_invalid"
  | "skill_bundle_inventory_missing"
  | "skill_bundle_inventory_extra"
  | "skill_bundle_digest_mismatch"
  | "skill_bundle_identity_mismatch";

export type PluginHostBridgeAssetIssue = {
  code: PluginHostBridgeAssetIssueCode;
  path: string;
};

export type PluginHostBridgeAssetVerification = {
  ok: boolean;
  issues: PluginHostBridgeAssetIssue[];
};

const ACP_BRIDGE_BINARY = "bin/win32-x64/zotero-acp-bridge.exe";
const CLI_RELEASE_PATH = "bin/zotero-bridge-release.json";
const SKILL_BUNDLE_ROOT = "content/host-bridge-skills";
const SKILL_BUNDLE_MANIFEST_PATH = `${SKILL_BUNDLE_ROOT}/manifest.json`;

function sha256(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

function parseSha256Sidecar(bytes: Uint8Array) {
  const match = Buffer.from(bytes)
    .toString("utf8")
    .trim()
    .match(/\b[a-fA-F0-9]{64}\b/);
  return match?.[0].toLowerCase() || "";
}

function readHostBridgeRelease(pathname: string) {
  return JSON.parse(
    readFileSync(pathname, "utf8"),
  ) as HostBridgeCliReleaseManifest;
}

function validateHostBridgeRelease(manifest: HostBridgeCliReleaseManifest) {
  if (
    manifest.schema !== "zotero-bridge-cli-release.v1" ||
    !manifest.version ||
    !/^[a-f0-9]{64}$/i.test(manifest.buildFingerprint) ||
    !Array.isArray(manifest.binaries) ||
    !manifest.binaries.length
  ) {
    throw new Error("Invalid Host Bridge CLI release manifest");
  }
  for (const entry of manifest.binaries) {
    if (
      !entry.platform ||
      !entry.binary ||
      !/^[a-f0-9]{64}$/i.test(entry.sha256) ||
      !Number.isSafeInteger(entry.bytes) ||
      entry.bytes < 0
    ) {
      throw new Error("Invalid Host Bridge CLI release binary entry");
    }
  }
}

function expectedHostBridgeSkillIds() {
  const definitions = loadHostBridgeSurfaceDefinitions();
  return resolveHostBridgeSurface(
    definitions,
    "zotero-library-agent",
  ).skills.map((skill) => skill.id);
}

function parseSkillBundleManifest(
  bytes: Uint8Array,
): HostBridgePluginSkillBundleManifest | undefined {
  try {
    return JSON.parse(Buffer.from(bytes).toString("utf8"));
  } catch {
    return undefined;
  }
}

function validateSkillBundleManifest(args: {
  manifest: HostBridgePluginSkillBundleManifest;
  expectedSkillIds: string[];
}) {
  const { manifest } = args;
  if (
    manifest.schema !== HOST_BRIDGE_PLUGIN_SKILL_BUNDLE_SCHEMA ||
    !manifest.cli?.version ||
    !/^[a-f0-9]{64}$/i.test(manifest.cli?.buildFingerprint || "") ||
    !/^[a-f0-9]{64}$/i.test(manifest.cli?.commandCatalogChecksum || "") ||
    !/^[a-f0-9]{64}$/i.test(manifest.aggregateSha256 || "") ||
    !Array.isArray(manifest.files) ||
    !Array.isArray(manifest.skills) ||
    !Array.isArray(manifest.surfaces)
  ) {
    return false;
  }
  if (
    JSON.stringify(manifest.skills.map((skill) => skill.id)) !==
    JSON.stringify(args.expectedSkillIds)
  ) {
    return false;
  }
  const skillIds = new Set(args.expectedSkillIds);
  const paths = new Set<string>();
  for (const skill of manifest.skills) {
    if (
      skill.mount !== `skills/${skill.id}` ||
      !String(skill.runnerVersion || "").trim()
    ) {
      return false;
    }
  }
  for (const file of manifest.files) {
    const owner = file.path.split("/")[0];
    if (
      !isSafeHostBridgePluginSkillBundlePath(file.path) ||
      paths.has(file.path) ||
      !skillIds.has(owner) ||
      !Number.isSafeInteger(file.bytes) ||
      file.bytes < 0 ||
      !/^[a-f0-9]{64}$/i.test(file.sha256)
    ) {
      return false;
    }
    paths.add(file.path);
  }
  const { aggregateSha256: _aggregateSha256, ...withoutDigest } = manifest;
  return (
    sha256(
      Buffer.from(hostBridgePluginSkillBundleDigestPayload(withoutDigest)),
    ) === manifest.aggregateSha256
  );
}

export function verifyPluginHostBridgeAssets(args: {
  xpiPath: string;
  hostBridgeRelease?: HostBridgeCliReleaseManifest;
  hostBridgeReleasePath?: string;
  expectedSkillIds?: string[];
}): PluginHostBridgeAssetVerification {
  const hostBridgeRelease =
    args.hostBridgeRelease ||
    readHostBridgeRelease(
      args.hostBridgeReleasePath ||
        path.join("cli", "zotero-bridge", "release.json"),
    );
  validateHostBridgeRelease(hostBridgeRelease);

  const expectedAssets = [
    ...hostBridgeRelease.binaries.map((entry) => ({
      binaryPath: `bin/${entry.platform}/${entry.binary}`,
      expectedSha256: entry.sha256.toLowerCase(),
      expectedBytes: entry.bytes,
      hostBridge: true,
    })),
    {
      binaryPath: ACP_BRIDGE_BINARY,
      expectedSha256: "",
      expectedBytes: -1,
      hostBridge: false,
    },
  ];
  const nativePaths = new Set(
    expectedAssets.flatMap(({ binaryPath }) => [
      binaryPath,
      `${binaryPath}.sha256`,
    ]),
  );
  const inventoryRead = readZipArchiveEntries(args.xpiPath, {
    selectedEntries: new Set([SKILL_BUNDLE_MANIFEST_PATH, CLI_RELEASE_PATH]),
  });
  const issues: PluginHostBridgeAssetIssue[] = [];
  const manifestBytes = inventoryRead.selectedEntries.get(
    SKILL_BUNDLE_MANIFEST_PATH,
  );
  if (!manifestBytes) {
    issues.push({
      code: "skill_bundle_manifest_missing",
      path: SKILL_BUNDLE_MANIFEST_PATH,
    });
  }
  const manifest = manifestBytes
    ? parseSkillBundleManifest(manifestBytes)
    : undefined;
  const expectedSkillIds =
    args.expectedSkillIds || expectedHostBridgeSkillIds();
  if (
    manifest &&
    !validateSkillBundleManifest({ manifest, expectedSkillIds })
  ) {
    issues.push({
      code: "skill_bundle_manifest_invalid",
      path: SKILL_BUNDLE_MANIFEST_PATH,
    });
  }

  const expectedBundlePaths = new Set(
    manifest
      ? [
          SKILL_BUNDLE_MANIFEST_PATH,
          ...manifest.files.map((file) => `${SKILL_BUNDLE_ROOT}/${file.path}`),
        ]
      : [SKILL_BUNDLE_MANIFEST_PATH],
  );
  const actualBundlePaths = new Set(
    inventoryRead.entryNames.filter(
      (entry) =>
        entry.startsWith(`${SKILL_BUNDLE_ROOT}/`) && !entry.endsWith("/"),
    ),
  );
  for (const expected of expectedBundlePaths) {
    if (!actualBundlePaths.has(expected)) {
      issues.push({ code: "skill_bundle_inventory_missing", path: expected });
    }
  }
  for (const actual of actualBundlePaths) {
    if (!expectedBundlePaths.has(actual)) {
      issues.push({ code: "skill_bundle_inventory_extra", path: actual });
    }
  }

  const selectedPaths = new Set([
    ...nativePaths,
    ...expectedBundlePaths,
    CLI_RELEASE_PATH,
  ]);
  const { selectedEntries } = readZipArchiveEntries(args.xpiPath, {
    selectedEntries: selectedPaths,
  });

  if (manifest) {
    for (const file of manifest.files) {
      const xpiPath = `${SKILL_BUNDLE_ROOT}/${file.path}`;
      const bytes = selectedEntries.get(xpiPath);
      if (!bytes) continue;
      if (bytes.length !== file.bytes || sha256(bytes) !== file.sha256) {
        issues.push({ code: "skill_bundle_digest_mismatch", path: xpiPath });
      }
    }
    const xpiReleaseBytes = selectedEntries.get(CLI_RELEASE_PATH);
    let xpiRelease: HostBridgeCliReleaseManifest | undefined;
    try {
      xpiRelease = xpiReleaseBytes
        ? (JSON.parse(
            Buffer.from(xpiReleaseBytes).toString("utf8"),
          ) as HostBridgeCliReleaseManifest)
        : undefined;
    } catch {
      xpiRelease = undefined;
    }
    if (
      !xpiRelease ||
      manifest.cli.version !== hostBridgeRelease.version ||
      manifest.cli.buildFingerprint !== hostBridgeRelease.buildFingerprint ||
      xpiRelease.version !== hostBridgeRelease.version ||
      xpiRelease.buildFingerprint !== hostBridgeRelease.buildFingerprint
    ) {
      issues.push({
        code: "skill_bundle_identity_mismatch",
        path: SKILL_BUNDLE_MANIFEST_PATH,
      });
    }
  }

  for (const asset of expectedAssets) {
    const binary = selectedEntries.get(asset.binaryPath);
    const sidecarPath = `${asset.binaryPath}.sha256`;
    const sidecar = selectedEntries.get(sidecarPath);
    if (!binary) {
      issues.push({ code: "native_binary_missing", path: asset.binaryPath });
    }
    if (!sidecar) {
      issues.push({ code: "native_sidecar_missing", path: sidecarPath });
    }
    if (!binary || !sidecar) {
      continue;
    }

    const sidecarSha256 = parseSha256Sidecar(sidecar);
    if (!sidecarSha256) {
      issues.push({ code: "native_sidecar_invalid", path: sidecarPath });
      continue;
    }
    const binarySha256 = sha256(binary);
    if (binarySha256 !== sidecarSha256) {
      issues.push({
        code: "native_checksum_mismatch",
        path: asset.binaryPath,
      });
    }
    if (
      asset.hostBridge &&
      (binarySha256 !== asset.expectedSha256 ||
        sidecarSha256 !== asset.expectedSha256 ||
        binary.length !== asset.expectedBytes)
    ) {
      issues.push({
        code: "host_bridge_release_mismatch",
        path: asset.binaryPath,
      });
    }
  }

  return { ok: issues.length === 0, issues };
}

export function assertPluginHostBridgeAssets(args: {
  xpiPath: string;
  hostBridgeReleasePath?: string;
}) {
  const result = verifyPluginHostBridgeAssets(args);
  if (!result.ok) {
    throw new Error(
      `Plugin Host Bridge asset verification failed:\n${result.issues
        .map((issue) => `${issue.code}: ${issue.path}`)
        .join("\n")}`,
    );
  }
  return result;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const xpiPath = String(process.argv[2] || "").trim();
  if (!xpiPath) {
    throw new Error("Usage: check-plugin-host-bridge-assets.ts <plugin.xpi>");
  }
  assertPluginHostBridgeAssets({ xpiPath });
}
