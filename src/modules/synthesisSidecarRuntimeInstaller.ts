import {
  synthesisSidecarRuntimePlatformIdentity,
  rebuildSynthesisSidecarRuntimeBundleManifest,
  type SynthesisSidecarRuntimeBundleManifest,
  type SynthesisSidecarRuntimeTarget,
} from "../../packages/synthesis-contracts/src/sidecarRuntimeBundle";
import { sha256Hex } from "../platform/hash";
import {
  detectSynthesisSidecarRuntimeTarget,
  type SynthesisSidecarRuntimeTargetDetection,
} from "../platform/runtimePlatform";
import { joinPath } from "../utils/path";
import {
  ensureRuntimeDirectory,
  getRuntimeFilePermissions,
  getSynthesisSidecarRuntimePaths,
  moveRuntimePath,
  readRuntimeBytes,
  readRuntimeTextFile,
  removeRuntimePath,
  runtimePathExists,
  setRuntimeExecutablePermissions,
  statRuntimePath,
  writeRuntimeBytes,
  writeRuntimeTextFile,
  type SynthesisSidecarRuntimePaths,
} from "./runtimePersistence";
import {
  loadPackagedSynthesisSidecarRuntimeBundle,
  type SynthesisSidecarPackagedAssetReader,
  type VerifiedSynthesisSidecarRuntimeBundle,
} from "./synthesisSidecarRuntimeManifest";

export type SynthesisSidecarRuntimeInstallState =
  | "ready"
  | "missing"
  | "corrupt"
  | "unsupported";

export type SynthesisSidecarRuntimeInstallSnapshot = {
  state: SynthesisSidecarRuntimeInstallState;
  target: SynthesisSidecarRuntimeTargetDetection;
  bundleId?: string;
  implementation?: "rust-native";
  targetTriple?: SynthesisSidecarRuntimeBundleManifest["targetTriple"];
  serviceVersion?: string;
  protocolVersion?: string;
  buildFingerprint?: string;
  platformSignature?: ReturnType<
    typeof synthesisSidecarRuntimePlatformIdentity
  >;
  installRoot?: string;
  executablePath?: string;
  diagnostics: Array<{ code: string }>;
};

export type SynthesisSidecarRuntimeInstallPaths = SynthesisSidecarRuntimePaths;

export type SynthesisSidecarRuntimeInstaller = {
  inspect: () => Promise<SynthesisSidecarRuntimeInstallSnapshot>;
  ensureInstalled: () => Promise<SynthesisSidecarRuntimeInstallSnapshot>;
};

type InstallerOptions = {
  runtimeRoot: string;
  target?: SynthesisSidecarRuntimeTargetDetection;
  readPackagedAsset?: SynthesisSidecarPackagedAssetReader;
  verificationPolicy?: "candidate" | "production";
};

function diagnosticSnapshot(
  state: Exclude<SynthesisSidecarRuntimeInstallState, "ready">,
  target: SynthesisSidecarRuntimeTargetDetection,
  code: string,
): SynthesisSidecarRuntimeInstallSnapshot {
  return { state, target, diagnostics: [{ code }] };
}

function errorCode(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return message.split(/\s+/)[0]?.slice(0, 256) || "unknown_error";
}

export function getSynthesisSidecarRuntimeInstallPaths(
  runtimeRoot: string,
): SynthesisSidecarRuntimeInstallPaths {
  return getSynthesisSidecarRuntimePaths(runtimeRoot);
}

async function verifyInstalledRuntime(args: {
  target: SynthesisSidecarRuntimeTarget;
  installRoot: string;
  expectedManifest?: SynthesisSidecarRuntimeBundleManifest;
}): Promise<SynthesisSidecarRuntimeInstallSnapshot> {
  const manifestPath = joinPath(args.installRoot, "manifest.json");
  const text = (await readRuntimeTextFile(manifestPath)).trim();
  if (!text) {
    return diagnosticSnapshot(
      (await runtimePathExists(args.installRoot)) ? "corrupt" : "missing",
      args.target,
      "installed_manifest_missing",
    );
  }
  let manifest: SynthesisSidecarRuntimeBundleManifest;
  try {
    manifest = rebuildSynthesisSidecarRuntimeBundleManifest(JSON.parse(text));
  } catch (error) {
    return diagnosticSnapshot(
      "corrupt",
      args.target,
      `installed_manifest_invalid:${errorCode(error)}`,
    );
  }
  if (
    manifest.target !== args.target ||
    (args.expectedManifest &&
      JSON.stringify(manifest) !== JSON.stringify(args.expectedManifest))
  ) {
    return diagnosticSnapshot(
      "corrupt",
      args.target,
      "installed_manifest_identity_mismatch",
    );
  }
  for (const entry of manifest.files) {
    const filePath = joinPath(args.installRoot, entry.path);
    const stat = await statRuntimePath(filePath);
    if (!stat.exists || stat.isDir || stat.size !== entry.bytes) {
      return diagnosticSnapshot(
        "corrupt",
        args.target,
        `installed_file_size:${entry.path}`,
      );
    }
    if ((await sha256Hex(await readRuntimeBytes(filePath))) !== entry.sha256) {
      return diagnosticSnapshot(
        "corrupt",
        args.target,
        `installed_file_hash:${entry.path}`,
      );
    }
    if (
      entry.executable &&
      args.target !== "win32-x64" &&
      (((await getRuntimeFilePermissions(filePath)) ?? 0) & 0o111) === 0
    ) {
      return diagnosticSnapshot(
        "corrupt",
        args.target,
        `installed_file_permissions:${entry.path}`,
      );
    }
  }
  return {
    state: "ready",
    target: args.target,
    bundleId: manifest.bundleId,
    implementation: manifest.implementation,
    targetTriple: manifest.targetTriple,
    serviceVersion: manifest.serviceVersion,
    protocolVersion: manifest.protocolVersion,
    buildFingerprint: manifest.buildFingerprint,
    platformSignature: synthesisSidecarRuntimePlatformIdentity(args.target),
    installRoot: args.installRoot,
    executablePath: joinPath(args.installRoot, manifest.executable),
    diagnostics: [],
  };
}

async function stageBundle(args: {
  bundle: VerifiedSynthesisSidecarRuntimeBundle;
  stagingRoot: string;
}) {
  await ensureRuntimeDirectory(args.stagingRoot);
  for (const entry of args.bundle.manifest.files) {
    const fileBytes = args.bundle.files.get(entry.path);
    if (!fileBytes) {
      throw new Error(`verified_bundle_file_missing:${entry.path}`);
    }
    const targetPath = joinPath(args.stagingRoot, entry.path);
    await writeRuntimeBytes(targetPath, fileBytes);
    if (entry.executable) {
      await setRuntimeExecutablePermissions(targetPath);
    }
  }
  await writeRuntimeTextFile(
    joinPath(args.stagingRoot, "manifest.json"),
    `${JSON.stringify(args.bundle.manifest)}\n`,
  );
  const verified = await verifyInstalledRuntime({
    target: args.bundle.manifest.target,
    installRoot: args.stagingRoot,
    expectedManifest: args.bundle.manifest,
  });
  if (verified.state !== "ready") {
    throw new Error(verified.diagnostics[0]?.code || "staging_verify_failed");
  }
}

export function createSynthesisSidecarRuntimeInstaller(
  options: InstallerOptions,
): SynthesisSidecarRuntimeInstaller {
  const target = options.target || detectSynthesisSidecarRuntimeTarget();
  const paths = getSynthesisSidecarRuntimeInstallPaths(options.runtimeRoot);
  let ensurePromise: Promise<SynthesisSidecarRuntimeInstallSnapshot> | null =
    null;

  async function inspect() {
    if (target === "unsupported") {
      return diagnosticSnapshot("unsupported", target, "unsupported_target");
    }
    return verifyInstalledRuntime({
      target,
      installRoot: paths.currentDir,
    });
  }

  async function performEnsure() {
    if (target === "unsupported") {
      return diagnosticSnapshot("unsupported", target, "unsupported_target");
    }
    let bundle: VerifiedSynthesisSidecarRuntimeBundle;
    try {
      bundle = await loadPackagedSynthesisSidecarRuntimeBundle({
        target,
        readPackagedAsset: options.readPackagedAsset,
        verificationPolicy: options.verificationPolicy ?? "production",
        allowExpired: true,
      });
    } catch (error) {
      return diagnosticSnapshot(
        "corrupt",
        target,
        `packaged_bundle_invalid:${errorCode(error)}`,
      );
    }
    const current = await verifyInstalledRuntime({
      target,
      installRoot: paths.currentDir,
      expectedManifest: bundle.manifest,
    });
    if (current.state === "ready") {
      return current;
    }

    const nonce = `${Date.now().toString(36)}-${Math.random()
      .toString(16)
      .slice(2)}`;
    const stagingRoot = `${paths.currentDir}.staging-${nonce}`;
    const oldRoot = `${paths.currentDir}.old-${nonce}`;
    let movedCurrent = false;
    try {
      await ensureRuntimeDirectory(paths.root);
      await removeRuntimePath(stagingRoot);
      await removeRuntimePath(oldRoot);
      await stageBundle({ bundle, stagingRoot });
      if (await runtimePathExists(paths.currentDir)) {
        await moveRuntimePath({
          sourcePath: paths.currentDir,
          targetPath: oldRoot,
        });
        movedCurrent = true;
      }
      try {
        await moveRuntimePath({
          sourcePath: stagingRoot,
          targetPath: paths.currentDir,
        });
      } catch (error) {
        if (movedCurrent) {
          await moveRuntimePath({
            sourcePath: oldRoot,
            targetPath: paths.currentDir,
          }).catch(() => undefined);
        }
        throw error;
      }
      const installed = await verifyInstalledRuntime({
        target,
        installRoot: paths.currentDir,
        expectedManifest: bundle.manifest,
      });
      if (installed.state !== "ready") {
        throw new Error(
          installed.diagnostics[0]?.code || "final_verify_failed",
        );
      }
      await removeRuntimePath(oldRoot);
      return installed;
    } catch (error) {
      await removeRuntimePath(stagingRoot).catch(() => false);
      return diagnosticSnapshot(
        "corrupt",
        target,
        `install_failed:${errorCode(error)}`,
      );
    }
  }

  return {
    inspect,
    ensureInstalled() {
      ensurePromise ||= performEnsure().finally(() => {
        ensurePromise = null;
      });
      return ensurePromise;
    },
  };
}
