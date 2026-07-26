import { assert } from "chai";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import {
  SYNTHESIS_SIDECAR_RUNTIME_TARGETS,
  SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES,
  rebuildSynthesisSidecarRuntimeBundleManifest,
  rebuildSynthesisSidecarRuntimePointer,
  type SynthesisSidecarRuntimeBundleManifest,
  type SynthesisSidecarRuntimeTarget,
} from "../../packages/synthesis-contracts/src/sidecarRuntimeBundle";
import { SYNTHESIS_SIDECAR_CAPABILITIES } from "../../packages/synthesis-contracts/src/sidecarSystem";
import {
  createSynthesisSidecarRuntimeInstaller,
  getSynthesisSidecarRuntimeInstallPaths,
} from "../../src/modules/synthesisSidecarRuntimeInstaller";
import {
  SYNTHESIS_SIDECAR_RUNTIME_TARGET_MATRIX,
  computeSynthesisSidecarRuntimeBuildFingerprint,
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
  options: {
    bundleId?: string;
    buildFingerprint?: string;
    expiresAt?: string | null;
    unsigned?: boolean;
  } = {},
) {
  const executable =
    target === "win32-x64" ? "synthesis-sidecar.exe" : "synthesis-sidecar";
  const assets = new Map<string, Uint8Array>([
    [executable, bytes(`native-${target}-${options.bundleId || "a"}`)],
    [
      "provenance.json",
      bytes('{"schema":"synthesis-rust-sidecar-provenance.v2"}\n'),
    ],
    [
      "licenses.json",
      bytes(
        '{"schema":"synthesis-rust-sidecar-license-inventory.v1","packages":[]}\n',
      ),
    ],
    ["LICENSE-AGPL-3.0.txt", bytes("AGPL-3.0-only\n")],
  ]);
  const manifest = rebuildSynthesisSidecarRuntimeBundleManifest({
    schema: "synthesis-sidecar-runtime-bundle.v2",
    bundleId: options.bundleId || "a".repeat(64),
    implementation: "rust-native",
    serviceVersion: "0.1.0",
    protocolVersion: "synthesis-sidecar.v1",
    target,
    targetTriple: SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES[target],
    executable,
    buildFingerprint: options.buildFingerprint || "b".repeat(64),
    capabilities: [...SYNTHESIS_SIDECAR_CAPABILITIES],
    createdAt: "2026-07-27T00:00:00.000Z",
    expiresAt: options.expiresAt ?? null,
    provenance: {
      sourceFingerprint: "c".repeat(64),
      toolchain: "nightly-2026-07-25",
      cargoLockSha256: "d".repeat(64),
      licenseInventory: "licenses.json",
    },
    platformSignature: target.startsWith("linux")
      ? {
          scheme: "not-applicable",
          status: "not-applicable",
          signer: null,
        }
      : {
          scheme:
            target === "win32-x64" ? "authenticode" : "apple-code-signing",
          status: options.unsigned ? "unsigned-candidate" : "verified",
          signer: options.unsigned ? null : "test signer",
        },
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

function writeBundle(
  root: string,
  target: SynthesisSidecarRuntimeTarget,
  bundle: ReturnType<typeof createBundle>,
) {
  const targetRoot = path.join(root, target);
  fs.mkdirSync(targetRoot, { recursive: true });
  fs.writeFileSync(
    path.join(targetRoot, "manifest.json"),
    `${JSON.stringify(bundle.manifest)}\n`,
  );
  for (const [relativePath, value] of bundle.assets) {
    fs.writeFileSync(path.join(targetRoot, relativePath), value);
  }
}

describe("Synthesis sidecar native runtime packaging", function () {
  this.timeout(30_000);

  it("strictly rebuilds manifest v2 and pointer v2", function () {
    const { manifest } = createBundle();
    assert.equal(manifest.implementation, "rust-native");
    assert.equal(manifest.targetTriple, "x86_64-unknown-linux-gnu");
    assert.deepEqual(manifest.capabilities, SYNTHESIS_SIDECAR_CAPABILITIES);
    assert.isTrue(Object.isFrozen(manifest));

    assert.deepEqual(
      rebuildSynthesisSidecarRuntimePointer({
        schema: "synthesis-sidecar-runtime-pointer.v2",
        bundleId: manifest.bundleId,
      }),
      {
        schema: "synthesis-sidecar-runtime-pointer.v2",
        bundleId: manifest.bundleId,
      },
    );

    for (const invalid of [
      { ...manifest, nodeVersion: "24.18.0" },
      { ...manifest, targetTriple: "x86_64-unknown-linux-musl" },
      { ...manifest, capabilities: [...manifest.capabilities].reverse() },
      { ...manifest, executable: "../synthesis-sidecar" },
      { ...manifest, expiresAt: "2026-01-01T00:00:00.000Z" },
    ]) {
      assert.throws(() =>
        rebuildSynthesisSidecarRuntimeBundleManifest(invalid),
      );
    }
    assert.throws(() =>
      rebuildSynthesisSidecarRuntimePointer({
        schema: "synthesis-sidecar-runtime-pointer.v1",
        bundleId: manifest.bundleId,
      }),
    );
  });

  it("packages one native executable without Node or JavaScript runtime files", function () {
    const tempRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-native-runtime-package-"),
    );
    const binary = path.join(tempRoot, "synthesis-sidecar");
    const output = path.join(tempRoot, "bundle");
    fs.writeFileSync(binary, "native-binary");
    execFileSync(
      process.execPath,
      [
        path.join(ROOT, "node_modules/tsx/dist/cli.mjs"),
        path.join(ROOT, "scripts/package-synthesis-sidecar-runtime.ts"),
        "--target=linux-x64",
        `--rust-sidecar=${binary}`,
        "--created-at=2026-07-27T00:00:00.000Z",
        "--platform-signature=not-applicable",
        `--output=${output}`,
      ],
      { cwd: ROOT, stdio: "pipe" },
    );
    const names = fs.readdirSync(output).sort();
    assert.deepEqual(names, [
      "LICENSE-AGPL-3.0.txt",
      "licenses.json",
      "manifest.json",
      "provenance.json",
      "synthesis-sidecar",
    ]);
    const manifest = rebuildSynthesisSidecarRuntimeBundleManifest(
      JSON.parse(fs.readFileSync(path.join(output, "manifest.json"), "utf8")),
    );
    assert.equal(manifest.files.length, 4);
    assert.notInclude(JSON.stringify(manifest), "nodeVersion");
    assert.notInclude(JSON.stringify(manifest), "entrypoint");
  });

  it("installs, repairs through quarantine, and rolls back only v2 bundles", async function () {
    const runtimeRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-native-runtime-install-"),
    );
    const firstBundle = createBundle("linux-x64", {
      bundleId: "1".repeat(64),
    });
    let selected = firstBundle;
    const installer = createSynthesisSidecarRuntimeInstaller({
      runtimeRoot,
      target: "linux-x64",
      readPackagedAsset: async (relativePath) =>
        packagedReader("linux-x64", selected)(relativePath),
      now: () => Date.parse("2026-07-27T01:00:00.000Z"),
    });

    const first = await installer.ensureInstalled();
    assert.equal(first.state, "ready");
    assert.equal(first.implementation, "rust-native");
    assert.equal(
      fs.readFileSync(first.executablePath!, "utf8"),
      "native-linux-x64-1111111111111111111111111111111111111111111111111111111111111111",
    );

    fs.writeFileSync(first.executablePath!, "corrupt");
    const repaired = await installer.ensureInstalled();
    assert.equal(repaired.state, "ready");
    const paths = getSynthesisSidecarRuntimeInstallPaths(runtimeRoot);
    assert.lengthOf(fs.readdirSync(paths.quarantineDir), 1);

    selected = createBundle("linux-x64", {
      bundleId: "2".repeat(64),
    });
    const second = await installer.ensureInstalled();
    assert.equal(second.bundleId, "2".repeat(64));
    const rolledBack = await installer.rollback();
    assert.equal(rolledBack.bundleId, "1".repeat(64));
  });

  it("activates v2 over legacy pointers without making v1 rollback eligible", async function () {
    const runtimeRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-native-runtime-upgrade-"),
    );
    const paths = getSynthesisSidecarRuntimeInstallPaths(runtimeRoot);
    fs.mkdirSync(paths.root, { recursive: true });
    fs.writeFileSync(
      paths.activePointerPath,
      `${JSON.stringify({
        schema: "synthesis-sidecar-runtime-pointer.v1",
        bundleId: "9".repeat(64),
      })}\n`,
    );
    fs.writeFileSync(paths.previousPointerPath, "legacy\n");
    const bundle = createBundle();
    const installer = createSynthesisSidecarRuntimeInstaller({
      runtimeRoot,
      target: "linux-x64",
      readPackagedAsset: packagedReader("linux-x64", bundle),
    });
    const ready = await installer.ensureInstalled();
    assert.equal(ready.state, "ready");
    assert.isFalse(fs.existsSync(paths.previousPointerPath));
    assert.equal((await installer.rollback()).state, "missing");
  });

  it("rejects expired and unsigned formal packages while candidate policy is explicit", async function () {
    const expired = createBundle("linux-x64", {
      expiresAt: "2026-07-28T00:00:00.000Z",
    });
    let restartNow = Date.parse("2026-07-27T00:00:00.000Z");
    const restartInstaller = createSynthesisSidecarRuntimeInstaller({
      runtimeRoot: fs.mkdtempSync(path.join(os.tmpdir(), "zs-expired-active-")),
      target: "linux-x64",
      readPackagedAsset: packagedReader("linux-x64", expired),
      now: () => restartNow,
    });
    assert.equal((await restartInstaller.ensureInstalled()).state, "ready");
    restartNow = Date.parse("2026-07-29T00:00:00.000Z");
    assert.equal((await restartInstaller.ensureInstalled()).state, "ready");

    const expiredInstaller = createSynthesisSidecarRuntimeInstaller({
      runtimeRoot: fs.mkdtempSync(path.join(os.tmpdir(), "zs-expired-")),
      target: "linux-x64",
      readPackagedAsset: packagedReader("linux-x64", expired),
      now: () => Date.parse("2026-07-29T00:00:00.000Z"),
    });
    assert.equal((await expiredInstaller.ensureInstalled()).state, "corrupt");

    const unsigned = createBundle("darwin-arm64", { unsigned: true });
    const production = createSynthesisSidecarRuntimeInstaller({
      runtimeRoot: fs.mkdtempSync(path.join(os.tmpdir(), "zs-unsigned-")),
      target: "darwin-arm64",
      readPackagedAsset: packagedReader("darwin-arm64", unsigned),
    });
    assert.equal((await production.ensureInstalled()).state, "corrupt");
    const candidate = createSynthesisSidecarRuntimeInstaller({
      runtimeRoot: fs.mkdtempSync(path.join(os.tmpdir(), "zs-candidate-")),
      target: "darwin-arm64",
      readPackagedAsset: packagedReader("darwin-arm64", unsigned),
      verificationPolicy: "candidate",
    });
    assert.equal((await candidate.ensureInstalled()).state, "ready");
  });

  it("verifies all five current native prebuilds and build workflow governance", async function () {
    const assetRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-native-freshness-"),
    );
    const build = await computeSynthesisSidecarRuntimeBuildFingerprint(ROOT);
    for (const target of SYNTHESIS_SIDECAR_RUNTIME_TARGETS) {
      writeBundle(
        assetRoot,
        target,
        createBundle(target, { buildFingerprint: build.fingerprint }),
      );
    }
    const freshness = await checkSynthesisSidecarRuntimeFreshness(
      ROOT,
      assetRoot,
    );
    assert.isTrue(freshness.ok);
    assert.equal(freshness.implementation, "rust-native");
    assert.deepEqual(
      freshness.targets,
      SYNTHESIS_SIDECAR_RUNTIME_TARGET_MATRIX,
    );

    const workflowSource = fs.readFileSync(
      path.join(ROOT, ".github/workflows/build-synthesis-sidecar-runtime.yml"),
      "utf8",
    );
    const workflow = parseYaml(workflowSource) as {
      permissions?: { contents?: string };
      jobs?: {
        candidate?: { strategy?: { matrix?: { include?: unknown[] } } };
      };
    };
    assert.equal(workflow.permissions?.contents, "read");
    assert.lengthOf(
      workflow.jobs?.candidate?.strategy?.matrix?.include || [],
      5,
    );
    assert.include(
      workflowSource,
      "dtolnay/rust-toolchain@2c7215f132e9ebf062739d9130488b56d53c060c",
    );
    assert.include(workflowSource, "toolchain: nightly-2026-07-25");
    assert.include(workflowSource, "--all --check");
    assert.include(
      workflowSource,
      "check-synthesis-native-runtime-contract-parity.ts",
    );
    assert.notInclude(workflowSource, "gh release");
    assert.notInclude(workflowSource, "node-v24");
    assert.notInclude(workflowSource, "SHASUMS256");
    assert.notInclude(workflowSource, "build-synthesis-rust-sidecar.yml");
  });
});
