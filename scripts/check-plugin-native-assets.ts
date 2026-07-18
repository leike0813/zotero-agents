import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { readZipArchiveEntries } from "./zip-archive";

export type HostBridgeCliReleaseManifest = {
  schema: "zotero-bridge-cli-release.v1";
  binaries: Array<{
    platform: string;
    binary: string;
    sha256: string;
    bytes: number;
  }>;
};

export type PluginNativeAssetIssueCode =
  | "native_binary_missing"
  | "native_sidecar_missing"
  | "native_sidecar_invalid"
  | "native_checksum_mismatch"
  | "host_bridge_release_mismatch";

export type PluginNativeAssetIssue = {
  code: PluginNativeAssetIssueCode;
  path: string;
};

export type PluginNativeAssetVerification = {
  ok: boolean;
  issues: PluginNativeAssetIssue[];
};

const ACP_BRIDGE_BINARY = "bin/win32-x64/zotero-acp-bridge.exe";

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

export function verifyPluginNativeAssets(args: {
  xpiPath: string;
  hostBridgeRelease?: HostBridgeCliReleaseManifest;
  hostBridgeReleasePath?: string;
}): PluginNativeAssetVerification {
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
  const selectedPaths = new Set(
    expectedAssets.flatMap(({ binaryPath }) => [
      binaryPath,
      `${binaryPath}.sha256`,
    ]),
  );
  const { selectedEntries } = readZipArchiveEntries(args.xpiPath, {
    selectedEntries: selectedPaths,
  });
  const issues: PluginNativeAssetIssue[] = [];

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

export function assertPluginNativeAssets(args: {
  xpiPath: string;
  hostBridgeReleasePath?: string;
}) {
  const result = verifyPluginNativeAssets(args);
  if (!result.ok) {
    throw new Error(
      `Plugin native asset verification failed:\n${result.issues
        .map((issue) => `${issue.code}: ${issue.path}`)
        .join("\n")}`,
    );
  }
  return result;
}
