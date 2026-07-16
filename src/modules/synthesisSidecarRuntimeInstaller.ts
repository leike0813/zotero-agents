import {
  SYNTHESIS_SIDECAR_RUNTIME_POINTER_SCHEMA,
  rebuildSynthesisSidecarRuntimeBundleManifest,
  rebuildSynthesisSidecarRuntimePointer,
  type SynthesisSidecarRuntimeBundleManifest,
  type SynthesisSidecarRuntimePointer,
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
  replaceRuntimeTextFileAtomically,
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
  nodeVersion?: string;
  serviceVersion?: string;
  protocolVersion?: string;
  installRoot?: string;
  nodePath?: string;
  entrypointPath?: string;
  diagnostics: Array<{ code: string }>;
};

export type SynthesisSidecarRuntimeInstallPaths = SynthesisSidecarRuntimePaths;

export type SynthesisSidecarRuntimeInstaller = {
  inspect: () => Promise<SynthesisSidecarRuntimeInstallSnapshot>;
  ensureInstalled: () => Promise<SynthesisSidecarRuntimeInstallSnapshot>;
  rollback: () => Promise<SynthesisSidecarRuntimeInstallSnapshot>;
};

type InstallerOptions = {
  runtimeRoot: string;
  target?: SynthesisSidecarRuntimeTargetDetection;
  readPackagedAsset?: SynthesisSidecarPackagedAssetReader;
};

function diagnosticSnapshot(
  state: Exclude<SynthesisSidecarRuntimeInstallState, "ready">,
  target: SynthesisSidecarRuntimeTargetDetection,
  code: string,
): SynthesisSidecarRuntimeInstallSnapshot {
  return {
    state,
    target,
    diagnostics: [{ code }],
  };
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

function versionRoot(
  paths: SynthesisSidecarRuntimeInstallPaths,
  bundleId: string,
) {
  return joinPath(paths.versionsDir, bundleId);
}

function pointerDocument(bundleId: string): SynthesisSidecarRuntimePointer {
  return {
    schema: SYNTHESIS_SIDECAR_RUNTIME_POINTER_SCHEMA,
    bundleId,
  };
}

async function readPointer(path: string) {
  const text = (await readRuntimeTextFile(path)).trim();
  if (!text) {
    return null;
  }
  return rebuildSynthesisSidecarRuntimePointer(JSON.parse(text));
}

async function writePointer(path: string, bundleId: string) {
  const pointer = rebuildSynthesisSidecarRuntimePointer(
    pointerDocument(bundleId),
  );
  await replaceRuntimeTextFileAtomically(path, `${JSON.stringify(pointer)}\n`);
}

async function verifyInstalledRuntime(args: {
  target: SynthesisSidecarRuntimeTarget;
  installRoot: string;
  expectedBundleId?: string;
}): Promise<SynthesisSidecarRuntimeInstallSnapshot> {
  const manifestPath = joinPath(args.installRoot, "manifest.json");
  const text = (await readRuntimeTextFile(manifestPath)).trim();
  if (!text) {
    return diagnosticSnapshot(
      "corrupt",
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
    (args.expectedBundleId && manifest.bundleId !== args.expectedBundleId)
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
    nodeVersion: manifest.nodeVersion,
    serviceVersion: manifest.serviceVersion,
    protocolVersion: manifest.protocolVersion,
    installRoot: args.installRoot,
    nodePath: joinPath(args.installRoot, manifest.executable),
    entrypointPath: joinPath(args.installRoot, manifest.entrypoint),
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
    expectedBundleId: args.bundle.manifest.bundleId,
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
    let active: SynthesisSidecarRuntimePointer | null;
    try {
      active = await readPointer(paths.activePointerPath);
    } catch (error) {
      return diagnosticSnapshot(
        "corrupt",
        target,
        `active_pointer_invalid:${errorCode(error)}`,
      );
    }
    if (!active) {
      return diagnosticSnapshot("missing", target, "active_pointer_missing");
    }
    return verifyInstalledRuntime({
      target,
      installRoot: versionRoot(paths, active.bundleId),
      expectedBundleId: active.bundleId,
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
      });
    } catch (error) {
      return diagnosticSnapshot(
        "corrupt",
        target,
        `packaged_bundle_invalid:${errorCode(error)}`,
      );
    }

    const current = await inspect();
    if (
      current.state === "ready" &&
      current.bundleId === bundle.manifest.bundleId
    ) {
      return current;
    }
    const finalRoot = versionRoot(paths, bundle.manifest.bundleId);
    let finalSnapshot = await verifyInstalledRuntime({
      target,
      installRoot: finalRoot,
      expectedBundleId: bundle.manifest.bundleId,
    });
    let stagingRoot = "";
    try {
      if (finalSnapshot.state !== "ready") {
        if (await runtimePathExists(finalRoot)) {
          await removeRuntimePath(finalRoot);
        }
        await ensureRuntimeDirectory(paths.versionsDir);
        await ensureRuntimeDirectory(paths.stagingDir);
        stagingRoot = joinPath(
          paths.stagingDir,
          `${bundle.manifest.bundleId}-${Date.now().toString(36)}`,
        );
        await removeRuntimePath(stagingRoot);
        await stageBundle({ bundle, stagingRoot });
        await moveRuntimePath({
          sourcePath: stagingRoot,
          targetPath: finalRoot,
        });
        stagingRoot = "";
        finalSnapshot = await verifyInstalledRuntime({
          target,
          installRoot: finalRoot,
          expectedBundleId: bundle.manifest.bundleId,
        });
        if (finalSnapshot.state !== "ready") {
          throw new Error(
            finalSnapshot.diagnostics[0]?.code || "final_verify_failed",
          );
        }
      }
      if (
        current.state === "ready" &&
        current.bundleId &&
        current.bundleId !== bundle.manifest.bundleId
      ) {
        await writePointer(paths.previousPointerPath, current.bundleId);
      }
      await writePointer(paths.activePointerPath, bundle.manifest.bundleId);
      return verifyInstalledRuntime({
        target,
        installRoot: finalRoot,
        expectedBundleId: bundle.manifest.bundleId,
      });
    } catch (error) {
      if (stagingRoot) {
        await removeRuntimePath(stagingRoot).catch(() => false);
      }
      return diagnosticSnapshot(
        "corrupt",
        target,
        `install_failed:${errorCode(error)}`,
      );
    }
  }

  async function ensureInstalled() {
    ensurePromise ||= performEnsure().finally(() => {
      ensurePromise = null;
    });
    return ensurePromise;
  }

  async function rollback() {
    if (target === "unsupported") {
      return diagnosticSnapshot("unsupported", target, "unsupported_target");
    }
    const active = await inspect();
    if (active.state !== "ready" || !active.bundleId) {
      return diagnosticSnapshot("corrupt", target, "rollback_active_invalid");
    }
    let previous: SynthesisSidecarRuntimePointer | null;
    try {
      previous = await readPointer(paths.previousPointerPath);
    } catch (error) {
      return diagnosticSnapshot(
        "corrupt",
        target,
        `rollback_pointer_invalid:${errorCode(error)}`,
      );
    }
    if (!previous) {
      return diagnosticSnapshot("missing", target, "rollback_previous_missing");
    }
    const previousSnapshot = await verifyInstalledRuntime({
      target,
      installRoot: versionRoot(paths, previous.bundleId),
      expectedBundleId: previous.bundleId,
    });
    if (previousSnapshot.state !== "ready") {
      return diagnosticSnapshot("corrupt", target, "rollback_previous_invalid");
    }
    try {
      await writePointer(paths.previousPointerPath, active.bundleId);
      await writePointer(paths.activePointerPath, previous.bundleId);
      return previousSnapshot;
    } catch (error) {
      return diagnosticSnapshot(
        "corrupt",
        target,
        `rollback_failed:${errorCode(error)}`,
      );
    }
  }

  return {
    inspect,
    ensureInstalled,
    rollback,
  };
}
