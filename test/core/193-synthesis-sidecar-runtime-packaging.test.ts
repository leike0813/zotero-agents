import { assert } from "chai";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  SYNTHESIS_SIDECAR_NODE_VERSION,
  rebuildSynthesisSidecarRuntimeBundleManifest,
  rebuildSynthesisSidecarRuntimePointer,
  type SynthesisSidecarRuntimeBundleManifest,
  type SynthesisSidecarRuntimeTarget,
} from "../../packages/synthesis-contracts/src/sidecarRuntimeBundle";
import {
  createSynthesisSidecarRuntimeInstaller,
  getSynthesisSidecarRuntimeInstallPaths,
} from "../../src/modules/synthesisSidecarRuntimeInstaller";
import {
  computeSynthesisSidecarRuntimeBuildFingerprint,
  runtimeArchiveName,
  SYNTHESIS_SIDECAR_COMPUTE_RUNTIME_PACKAGES,
} from "../../scripts/synthesis-sidecar-runtime-release-governance";
import { checkSynthesisSidecarRuntimeFreshness } from "../../scripts/check-synthesis-sidecar-runtime-freshness";

const ROOT = path.resolve(import.meta.dirname, "../..");

function sha256(bytes: Uint8Array | string) {
  return createHash("sha256").update(bytes).digest("hex");
}

function bytes(value: string) {
  return new TextEncoder().encode(value);
}

function createBundle(
  target: SynthesisSidecarRuntimeTarget = "linux-x64",
  bundleId = "a".repeat(64),
) {
  const executable = target.startsWith("win32") ? "node.exe" : "node";
  const assets = new Map<string, Uint8Array>([
    [executable, bytes("product-owned-node")],
    ["service/entrypoint.js", bytes("export const service = true;\n")],
    ["LICENSE-node.txt", bytes("Node.js license\n")],
  ]);
  const manifest = rebuildSynthesisSidecarRuntimeBundleManifest({
    schema: "synthesis-sidecar-runtime-bundle.v1",
    bundleId,
    nodeVersion: SYNTHESIS_SIDECAR_NODE_VERSION,
    serviceVersion: "0.1.0",
    protocolVersion: "synthesis-sidecar.v1",
    target,
    buildFingerprint: "b".repeat(64),
    upstream: {
      archive: `node-v${SYNTHESIS_SIDECAR_NODE_VERSION}-${target}.archive`,
      sha256: "c".repeat(64),
      signature: "verified",
      platformSignature: target.startsWith("linux")
        ? "not-applicable"
        : "verified",
    },
    executable,
    entrypoint: "service/entrypoint.js",
    files: Array.from(assets.entries())
      .map(([filePath, value]) => ({
        path: filePath,
        bytes: value.byteLength,
        sha256: sha256(value),
        executable: filePath === executable,
      }))
      .sort((left, right) => left.path.localeCompare(right.path)),
  });
  return { manifest, assets };
}

function packagedReader(
  target: SynthesisSidecarRuntimeTarget,
  bundle: ReturnType<typeof createBundle>,
) {
  const prefix = `bin/synthesis-sidecar/${target}/`;
  return async (relativePath: string) => {
    if (relativePath === `${prefix}manifest.json`) {
      return bytes(`${JSON.stringify(bundle.manifest)}\n`);
    }
    const value = bundle.assets.get(relativePath.slice(prefix.length));
    return value ? new Uint8Array(value) : null;
  };
}

describe("Synthesis sidecar runtime packaging", function () {
  this.timeout(10_000);

  it("strictly rebuilds manifests and pointers", function () {
    const { manifest } = createBundle();
    assert.equal(manifest.nodeVersion, "24.18.0");
    assert.equal(manifest.target, "linux-x64");
    assert.isTrue(Object.isFrozen(manifest));
    assert.isTrue(Object.isFrozen(manifest.files));

    assert.deepEqual(
      rebuildSynthesisSidecarRuntimePointer({
        schema: "synthesis-sidecar-runtime-pointer.v1",
        bundleId: manifest.bundleId,
      }),
      {
        schema: "synthesis-sidecar-runtime-pointer.v1",
        bundleId: manifest.bundleId,
      },
    );

    for (const unsafePath of [
      "../node",
      "/tmp/node",
      "C:\\node.exe",
      "service//entrypoint.js",
      "service/./entrypoint.js",
    ]) {
      assert.throws(() =>
        rebuildSynthesisSidecarRuntimeBundleManifest({
          ...manifest,
          files: manifest.files.map((entry, index) =>
            index === 0 ? { ...entry, path: unsafePath } : entry,
          ),
        }),
      );
    }
    assert.throws(() =>
      rebuildSynthesisSidecarRuntimeBundleManifest({
        ...manifest,
        unknown: true,
      }),
    );
    assert.throws(() =>
      rebuildSynthesisSidecarRuntimeBundleManifest({
        ...manifest,
        files: [...manifest.files, { ...manifest.files[0] }],
      }),
    );
  });

  it("assembles the compiled worker, engine, D3 runtime, and licenses", function () {
    execFileSync(
      process.execPath,
      [
        path.join(ROOT, "node_modules/typescript/bin/tsc"),
        "-p",
        path.join(ROOT, "apps/synthesis-service/tsconfig.build.json"),
      ],
      { cwd: ROOT, stdio: "pipe" },
    );
    const tempRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-sidecar-package-compute-"),
    );
    const nodeRoot = path.join(tempRoot, "node");
    const outputRoot = path.join(tempRoot, "bundle");
    fs.mkdirSync(path.join(nodeRoot, "bin"), { recursive: true });
    fs.writeFileSync(path.join(nodeRoot, "bin", "node"), "node-runtime");
    fs.writeFileSync(path.join(nodeRoot, "LICENSE"), "Node license\n");
    execFileSync(
      process.execPath,
      [
        path.join(ROOT, "node_modules/tsx/dist/cli.mjs"),
        path.join(ROOT, "scripts/package-synthesis-sidecar-runtime.ts"),
        "--target=linux-x64",
        `--node-root=${nodeRoot}`,
        `--output=${outputRoot}`,
        `--upstream-sha256=${"a".repeat(64)}`,
        "--upstream-signature=verified",
        "--platform-signature=not-applicable",
      ],
      { cwd: ROOT, stdio: "pipe" },
    );
    const manifest = rebuildSynthesisSidecarRuntimeBundleManifest(
      JSON.parse(
        fs.readFileSync(path.join(outputRoot, "manifest.json"), "utf8"),
      ),
    );
    const files = manifest.files.map((entry) => entry.path);
    for (const required of [
      "service/apps/synthesis-service/src/computeWorker.js",
      "service/apps/synthesis-service/src/computeWorkerPool.js",
      "service/apps/synthesis-service/src/computeProtocol.js",
      "service/apps/synthesis-service/src/citationGraphTransferOwner.js",
      "service/apps/synthesis-service/src/citationGraphBuildTransferExecutor.js",
      "service/packages/synthesis-engine/src/index.js",
      "service/packages/synthesis-engine/src/citationGraphBuild.js",
      "service/packages/synthesis-engine/src/citationGraphBuildTransfer.js",
      "service/packages/synthesis-engine/src/citationGraphBuildPacked.js",
      "service/packages/synthesis-contracts/src/sidecarTransfer.js",
      "service/node_modules/d3-force/LICENSE",
      "service/node_modules/d3-force/src/index.js",
      "service/node_modules/d3-dispatch/LICENSE",
      "service/node_modules/d3-quadtree/LICENSE",
      "service/node_modules/d3-timer/LICENSE",
    ]) {
      assert.include(files, required);
    }
    const packagedProtocol = fs.readFileSync(
      path.join(
        outputRoot,
        "service/apps/synthesis-service/src/computeProtocol.js",
      ),
      "utf8",
    );
    assert.include(packagedProtocol, "citation_graph_metrics.v1");
    assert.include(packagedProtocol, "citation_graph_build.v1");
    assert.include(packagedProtocol, "citation_graph_build_transfer.v1");
    const packagedWorker = fs.readFileSync(
      path.join(
        outputRoot,
        "service/apps/synthesis-service/src/computeWorker.js",
      ),
      "utf8",
    );
    assert.include(
      packagedWorker,
      "createInProcessSynthesisCitationGraphMetricsEngine",
    );
    assert.include(
      packagedWorker,
      "createInProcessSynthesisCitationGraphBuildEngine",
    );
    assert.include(
      packagedWorker,
      "createSynthesisCitationGraphBuildPackedAccumulator",
    );
  });

  it("installs a verified bundle without consulting system Node or PATH", async function () {
    const runtimeRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-sidecar-runtime-install-"),
    );
    const target = "linux-x64";
    const bundle = createBundle(target);
    const installer = createSynthesisSidecarRuntimeInstaller({
      runtimeRoot,
      target,
      readPackagedAsset: packagedReader(target, bundle),
    });

    const previousPath = process.env.PATH;
    process.env.PATH = "";
    try {
      const [first, second] = await Promise.all([
        installer.ensureInstalled(),
        installer.ensureInstalled(),
      ]);
      assert.equal(first.state, "ready");
      assert.deepEqual(second, first);
      assert.equal(first.bundleId, bundle.manifest.bundleId);
      assert.equal(first.nodeVersion, bundle.manifest.nodeVersion);
      assert.equal(first.serviceVersion, bundle.manifest.serviceVersion);
      assert.equal(first.protocolVersion, bundle.manifest.protocolVersion);
      assert.equal(
        fs.readFileSync(first.nodePath!, "utf8"),
        "product-owned-node",
      );
      assert.equal(
        fs.readFileSync(first.entrypointPath!, "utf8"),
        "export const service = true;\n",
      );
      assert.equal(
        await installer.inspect().then((value) => value.state),
        "ready",
      );
    } finally {
      process.env.PATH = previousPath;
    }
  });

  it("fails closed on packaged hash mismatch without changing active", async function () {
    const runtimeRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-sidecar-runtime-hash-"),
    );
    const target = "linux-x64";
    const good = createBundle(target, "1".repeat(64));
    const installer = createSynthesisSidecarRuntimeInstaller({
      runtimeRoot,
      target,
      readPackagedAsset: packagedReader(target, good),
    });
    const ready = await installer.ensureInstalled();
    assert.equal(ready.state, "ready");

    const bad = createBundle(target, "2".repeat(64));
    bad.assets.set("node", bytes("tampered-node"));
    const badInstaller = createSynthesisSidecarRuntimeInstaller({
      runtimeRoot,
      target,
      readPackagedAsset: packagedReader(target, bad),
    });
    const failed = await badInstaller.ensureInstalled();
    assert.equal(failed.state, "corrupt");
    assert.equal((await installer.inspect()).bundleId, good.manifest.bundleId);
  });

  it("repairs a corrupt active version from trusted packaged assets", async function () {
    const runtimeRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-sidecar-runtime-repair-"),
    );
    const target = "linux-x64";
    const bundle = createBundle(target);
    const installer = createSynthesisSidecarRuntimeInstaller({
      runtimeRoot,
      target,
      readPackagedAsset: packagedReader(target, bundle),
    });
    const ready = await installer.ensureInstalled();
    fs.chmodSync(ready.nodePath!, 0o644);
    assert.equal((await installer.inspect()).state, "corrupt");
    const permissionRepaired = await installer.ensureInstalled();
    assert.notEqual(fs.statSync(permissionRepaired.nodePath!).mode & 0o111, 0);

    fs.writeFileSync(permissionRepaired.nodePath!, "corrupt");

    assert.equal((await installer.inspect()).state, "corrupt");
    const repaired = await installer.ensureInstalled();
    assert.equal(repaired.state, "ready");
    assert.equal(
      fs.readFileSync(repaired.nodePath!, "utf8"),
      "product-owned-node",
    );
  });

  it("preserves previous and atomically rolls back one verified version", async function () {
    const runtimeRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-sidecar-runtime-rollback-"),
    );
    const target = "linux-x64";
    const first = createBundle(target, "1".repeat(64));
    const firstInstaller = createSynthesisSidecarRuntimeInstaller({
      runtimeRoot,
      target,
      readPackagedAsset: packagedReader(target, first),
    });
    await firstInstaller.ensureInstalled();

    const second = createBundle(target, "2".repeat(64));
    second.assets.set(
      "service/entrypoint.js",
      bytes("export const service = 2;\n"),
    );
    second.manifest = rebuildSynthesisSidecarRuntimeBundleManifest({
      ...second.manifest,
      files: second.manifest.files.map((entry) =>
        entry.path === "service/entrypoint.js"
          ? {
              ...entry,
              bytes: second.assets.get(entry.path)!.byteLength,
              sha256: sha256(second.assets.get(entry.path)!),
            }
          : entry,
      ),
    });
    const secondInstaller = createSynthesisSidecarRuntimeInstaller({
      runtimeRoot,
      target,
      readPackagedAsset: packagedReader(target, second),
    });
    assert.equal(
      (await secondInstaller.ensureInstalled()).bundleId,
      "2".repeat(64),
    );

    const rolledBack = await secondInstaller.rollback();
    assert.equal(rolledBack.state, "ready");
    assert.equal(rolledBack.bundleId, "1".repeat(64));
    assert.equal(
      fs.readFileSync(rolledBack.entrypointPath!, "utf8"),
      "export const service = true;\n",
    );
  });

  it("keeps staging failure and all installer paths inside the managed root", async function () {
    const runtimeRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-sidecar-runtime-scope-"),
    );
    const target = "linux-x64";
    const bundle = createBundle(target);
    const paths = getSynthesisSidecarRuntimeInstallPaths(runtimeRoot);
    const outside = path.join(runtimeRoot, "..", "outside-sentinel.txt");
    fs.writeFileSync(outside, "keep");
    let reads = 0;
    const installer = createSynthesisSidecarRuntimeInstaller({
      runtimeRoot,
      target,
      readPackagedAsset: async (relativePath) => {
        reads += 1;
        if (reads > 2) {
          throw new Error("simulated interrupted staging");
        }
        return packagedReader(target, bundle)(relativePath);
      },
    });

    assert.equal((await installer.ensureInstalled()).state, "corrupt");
    assert.equal((await installer.inspect()).state, "missing");
    assert.equal(fs.readFileSync(outside, "utf8"), "keep");
    assert.equal(
      path.relative(runtimeRoot, paths.root).replace(/\\/g, "/"),
      "synthesis/service-runtime",
    );
  });

  it("returns unsupported without reading packaged assets", async function () {
    let readCount = 0;
    const installer = createSynthesisSidecarRuntimeInstaller({
      runtimeRoot: "/tmp/unused-sidecar-runtime",
      target: "unsupported",
      readPackagedAsset: async () => {
        readCount += 1;
        return null;
      },
    });
    assert.equal((await installer.inspect()).state, "unsupported");
    assert.equal((await installer.ensureInstalled()).state, "unsupported");
    assert.equal(readCount, 0);
  });

  it("pins the five-platform signed prebuild and release freshness pipeline", async function () {
    const first = await computeSynthesisSidecarRuntimeBuildFingerprint(ROOT);
    const second = await computeSynthesisSidecarRuntimeBuildFingerprint(ROOT);
    assert.equal(first.fingerprint, second.fingerprint);
    assert.include(first.inputs, "apps/synthesis-service/src/entrypoint.ts");
    assert.include(first.inputs, "apps/synthesis-service/src/computeWorker.ts");
    assert.include(
      first.inputs,
      "apps/synthesis-service/src/computeWorkerPool.ts",
    );
    assert.include(first.inputs, "packages/synthesis-engine/src/index.ts");
    assert.include(
      first.inputs,
      "packages/synthesis-engine/src/citationGraphBuild.ts",
    );
    assert.include(
      first.inputs,
      "packages/synthesis-engine/src/citationGraphBuildTransfer.ts",
    );
    assert.include(
      first.inputs,
      "packages/synthesis-engine/src/citationGraphBuildPacked.ts",
    );
    assert.include(
      first.inputs,
      "apps/synthesis-service/src/citationGraphTransferOwner.ts",
    );
    assert.include(
      first.inputs,
      "apps/synthesis-service/src/citationGraphBuildTransferExecutor.ts",
    );
    assert.include(
      first.inputs,
      "packages/synthesis-contracts/src/sidecarSystem.ts",
    );
    assert.include(
      first.inputs,
      "packages/synthesis-contracts/src/sidecarTransfer.ts",
    );
    assert.include(first.inputs, "package-lock.json");
    assert.deepEqual(SYNTHESIS_SIDECAR_COMPUTE_RUNTIME_PACKAGES, [
      "d3-dispatch",
      "d3-force",
      "d3-quadtree",
      "d3-timer",
    ]);
    for (const packageName of SYNTHESIS_SIDECAR_COMPUTE_RUNTIME_PACKAGES) {
      assert.include(first.inputs, `node_modules/${packageName}/package.json`);
      assert.include(first.inputs, `node_modules/${packageName}/LICENSE`);
    }

    const packageScript = fs.readFileSync(
      path.join(ROOT, "scripts/package-synthesis-sidecar-runtime.ts"),
      "utf8",
    );
    assert.include(packageScript, "copyComputeRuntimeDependencies");
    assert.include(packageScript, 'path.join(targetRoot, "src")');
    const xpiCheck = fs.readFileSync(
      path.join(ROOT, "scripts/check-synthesis-sidecar-runtime-xpi.ts"),
      "utf8",
    );
    assert.include(xpiCheck, "computeWorker.js");
    assert.include(xpiCheck, "packages/synthesis-engine/src/index.js");
    assert.include(
      xpiCheck,
      "packages/synthesis-engine/src/citationGraphBuild.js",
    );
    assert.include(
      xpiCheck,
      "packages/synthesis-engine/src/citationGraphBuildTransfer.js",
    );
    assert.include(xpiCheck, "citationGraphTransferOwner.js");
    assert.include(xpiCheck, "sidecarTransfer.js");
    assert.include(xpiCheck, "node_modules/d3-force/LICENSE");
    assert.equal(runtimeArchiveName("win32-x64"), "node-v24.18.0-win-x64.zip");
    assert.equal(
      runtimeArchiveName("linux-arm64"),
      "node-v24.18.0-linux-arm64.tar.xz",
    );

    const workflow = fs.readFileSync(
      path.join(ROOT, ".github/workflows/build-synthesis-sidecar-runtime.yml"),
      "utf8",
    );
    for (const target of [
      "win32-x64",
      "darwin-x64",
      "darwin-arm64",
      "linux-x64",
      "linux-arm64",
    ]) {
      assert.include(workflow, `target: ${target}`);
    }
    assert.include(workflow, "SHASUMS256.txt.asc");
    assert.include(workflow, "nodejs/release-keys");
    assert.include(workflow, "Get-AuthenticodeSignature");
    assert.include(workflow, "codesign --verify");
    assert.include(workflow, "spctl --assess");

    const release = fs.readFileSync(
      path.join(ROOT, ".github/workflows/release.yml"),
      "utf8",
    );
    assert.include(release, "sync:synthesis-sidecar-runtime-prebuilds");
    assert.include(release, "check:synthesis-sidecar-runtime-freshness");
    assert.include(release, "check:synthesis-sidecar-runtime-xpi");

    const pluginConfig = fs.readFileSync(
      path.join(ROOT, "zotero-plugin.config.ts"),
      "utf8",
    );
    assert.include(pluginConfig, "addon/bin/synthesis-sidecar/**/*");
  });

  it("fails the production release gate until every platform prebuild is present and current", async function () {
    const emptyAssets = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-sidecar-empty-prebuilds-"),
    );
    const result = await checkSynthesisSidecarRuntimeFreshness(
      ROOT,
      emptyAssets,
    );

    assert.isFalse(result.ok);
    assert.deepEqual(result.targets, [
      "win32-x64",
      "darwin-x64",
      "darwin-arm64",
      "linux-x64",
      "linux-arm64",
    ]);
    assert.deepEqual(
      result.diagnostics.map((entry) => [entry.code, entry.target]),
      result.targets.map((target) => ["bundle_unreadable", target]),
    );
  });
});
