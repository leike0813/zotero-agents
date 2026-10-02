import { isExpiredSynthesisSidecarRuntimeManifest, rebuildSynthesisSidecarRuntimeBundleManifest, synthesisSidecarRuntimeTargetBundlePath, } from "../../../../packages/synthesis-contracts/src/sidecarRuntimeBundle";
import { sha256Hex } from "../../../platform/hash";
import { readPackagedBinaryAsset } from "../../packagedAssetResolver";
function decodeUtf8(bytes) {
    return new TextDecoder().decode(bytes);
}
export function synthesisSidecarRuntimeAssetRoot(target) {
    return `bin/${synthesisSidecarRuntimeTargetBundlePath(target)}`;
}
async function defaultReadPackagedAsset(relativePath) {
    const result = await readPackagedBinaryAsset(relativePath);
    return result.ok ? result.bytes : null;
}
export async function loadPackagedSynthesisSidecarRuntimeBundle(args) {
    const readAsset = args.readPackagedAsset || defaultReadPackagedAsset;
    const root = synthesisSidecarRuntimeAssetRoot(args.target);
    const manifestBytes = await readAsset(`${root}/manifest.json`);
    if (!manifestBytes) {
        throw new Error("synthesis_sidecar_runtime_manifest_missing");
    }
    let parsed;
    try {
        parsed = JSON.parse(decodeUtf8(manifestBytes));
    }
    catch {
        throw new Error("synthesis_sidecar_runtime_manifest_invalid_json");
    }
    const manifest = rebuildSynthesisSidecarRuntimeBundleManifest(parsed);
    if (manifest.target !== args.target) {
        throw new Error("synthesis_sidecar_runtime_target_mismatch");
    }
    if (!args.allowExpired &&
        isExpiredSynthesisSidecarRuntimeManifest(manifest, args.nowMs)) {
        throw new Error("synthesis_sidecar_runtime_expired");
    }
    const files = new Map();
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
