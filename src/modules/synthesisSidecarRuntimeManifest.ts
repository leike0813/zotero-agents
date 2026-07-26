import {
  isExpiredSynthesisSidecarRuntimeManifest,
  isProductionSynthesisSidecarRuntimeSignature,
  rebuildSynthesisSidecarRuntimeBundleManifest,
  type SynthesisSidecarRuntimeBundleManifest,
  type SynthesisSidecarRuntimeTarget,
} from "../../packages/synthesis-contracts/src/sidecarRuntimeBundle";
import { sha256Hex } from "../platform/hash";
import { readPackagedBinaryAsset } from "./packagedAssetResolver";

export type SynthesisSidecarPackagedAssetReader = (
  relativePath: string,
) => Promise<Uint8Array | null>;

export type VerifiedSynthesisSidecarRuntimeBundle = {
  manifest: SynthesisSidecarRuntimeBundleManifest;
  files: ReadonlyMap<string, Uint8Array>;
};

function decodeUtf8(bytes: Uint8Array) {
  return new TextDecoder().decode(bytes);
}

export function synthesisSidecarRuntimeAssetRoot(
  target: SynthesisSidecarRuntimeTarget,
) {
  return `bin/synthesis-sidecar/${target}`;
}

async function defaultReadPackagedAsset(relativePath: string) {
  const result = await readPackagedBinaryAsset(relativePath);
  return result.ok ? result.bytes : null;
}

export async function loadPackagedSynthesisSidecarRuntimeBundle(args: {
  target: SynthesisSidecarRuntimeTarget;
  readPackagedAsset?: SynthesisSidecarPackagedAssetReader;
  verificationPolicy?: "candidate" | "production";
  nowMs?: number;
  allowExpired?: boolean;
}): Promise<VerifiedSynthesisSidecarRuntimeBundle> {
  const readAsset = args.readPackagedAsset || defaultReadPackagedAsset;
  const root = synthesisSidecarRuntimeAssetRoot(args.target);
  const manifestBytes = await readAsset(`${root}/manifest.json`);
  if (!manifestBytes) {
    throw new Error("synthesis_sidecar_runtime_manifest_missing");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(decodeUtf8(manifestBytes));
  } catch {
    throw new Error("synthesis_sidecar_runtime_manifest_invalid_json");
  }
  const manifest = rebuildSynthesisSidecarRuntimeBundleManifest(parsed);
  if (manifest.target !== args.target) {
    throw new Error("synthesis_sidecar_runtime_target_mismatch");
  }
  if (
    !args.allowExpired &&
    isExpiredSynthesisSidecarRuntimeManifest(manifest, args.nowMs)
  ) {
    throw new Error("synthesis_sidecar_runtime_expired");
  }
  if (
    (args.verificationPolicy ?? "production") === "production" &&
    !isProductionSynthesisSidecarRuntimeSignature(manifest.platformSignature)
  ) {
    throw new Error("synthesis_sidecar_runtime_signature_unverified");
  }
  const files = new Map<string, Uint8Array>();
  for (const entry of manifest.files) {
    const fileBytes = await readAsset(`${root}/${entry.path}`);
    if (!fileBytes) {
      throw new Error(`synthesis_sidecar_runtime_asset_missing:${entry.path}`);
    }
    if (fileBytes.byteLength !== entry.bytes) {
      throw new Error(`synthesis_sidecar_runtime_asset_size:${entry.path}`);
    }
    if ((await sha256Hex(fileBytes)) !== entry.sha256) {
      throw new Error(`synthesis_sidecar_runtime_asset_hash:${entry.path}`);
    }
    files.set(entry.path, fileBytes);
  }
  return {
    manifest,
    files,
  };
}
