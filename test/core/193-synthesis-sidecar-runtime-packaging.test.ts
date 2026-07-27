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
  readSynthesisSidecarRuntimeBuildRecipe,
} from "../../scripts/synthesis-sidecar-runtime-release-governance";
import { checkSynthesisSidecarRuntimeFreshness } from "../../scripts/check-synthesis-sidecar-runtime-freshness";
import { stageSynthesisSidecarRuntimePrebuildSet } from "../../scripts/stage-synthesis-sidecar-runtime-prebuilds";
import { syncSynthesisSidecarRuntimePrebuilds } from "../../scripts/sync-synthesis-sidecar-runtime-prebuilds";
import {
  assertSynthesisSidecarRuntimePrebuildResultIdentity,
  rebuildSynthesisSidecarRuntimePrebuildSet,
  rebuildSynthesisSidecarRuntimePrebuildResult,
} from "../../packages/synthesis-contracts/src/sidecarRuntimeRelease";
import {
  advanceSynthesisSidecarRuntimeReleaseReceipt,
  createSynthesisSidecarRuntimeReleaseReceipt,
} from "../../scripts/synthesis-sidecar-runtime-release-controller";

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
    schema: "synthesis-sidecar-runtime-bundle.v3",
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

  it("strictly rebuilds manifest v3 and pointer v2", function () {
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
      { ...manifest, platformSignature: { scheme: "authenticode" } },
      { ...manifest, schema: "synthesis-sidecar-runtime-bundle.v2" },
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

  it("installs, repairs through quarantine, and rolls back only v3 bundles", async function () {
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

  it("activates v3 over legacy pointers without making v1 rollback eligible", async function () {
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

  it("rejects expired packages while production admission is integrity-only", async function () {
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

    const mac = createBundle("darwin-arm64");
    const production = createSynthesisSidecarRuntimeInstaller({
      runtimeRoot: fs.mkdtempSync(path.join(os.tmpdir(), "zs-integrity-")),
      target: "darwin-arm64",
      readPackagedAsset: packagedReader("darwin-arm64", mac),
    });
    assert.equal((await production.ensureInstalled()).state, "ready");
  });

  it("verifies all seven native prebuilds and build workflow governance", async function () {
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
      path.join(
        ROOT,
        ".github/workflows/prebuild-synthesis-sidecar-runtime.yml",
      ),
      "utf8",
    );
    const recipe = readSynthesisSidecarRuntimeBuildRecipe({ root: ROOT });
    assert.deepEqual(
      recipe.targets.map((target) => target.platform),
      SYNTHESIS_SIDECAR_RUNTIME_TARGETS,
    );
    assert.deepEqual(
      recipe.targets.map((target) => target.target),
      SYNTHESIS_SIDECAR_RUNTIME_TARGETS.map(
        (target) => SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES[target],
      ),
    );
    assert.deepEqual(
      recipe.targets
        .filter((target) => target.useZig)
        .map((target) => target.platform),
      ["linux-x86", "linux-x64", "linux-arm", "linux-arm64"],
    );

    const invalidRecipeRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-native-recipe-"),
    );
    const invalidRecipePath = path.join(
      invalidRecipeRoot,
      "native/synthesis-sidecar/build-recipe.json",
    );
    fs.mkdirSync(path.dirname(invalidRecipePath), { recursive: true });
    fs.writeFileSync(
      invalidRecipePath,
      JSON.stringify({
        ...recipe,
        targets: recipe.targets.map((target, index) =>
          index === 0 ? { ...target, target: "invalid-target" } : target,
        ),
      }),
    );
    assert.throws(() =>
      readSynthesisSidecarRuntimeBuildRecipe({ root: invalidRecipeRoot }),
    );

    const workflow = parseYaml(workflowSource) as {
      permissions?: { contents?: string };
      jobs?: {
        prebuild?: {
          needs?: string;
          strategy?: { matrix?: { include?: string } };
        };
      };
    };
    assert.equal(workflow.permissions?.contents, "write");
    assert.equal(workflow.jobs?.prebuild?.needs, "plan");
    assert.equal(
      workflow.jobs?.prebuild?.strategy?.matrix?.include,
      "${{ fromJSON(needs.plan.outputs.build_matrix) }}",
    );
    assert.include(
      workflowSource,
      "dtolnay/rust-toolchain@2c7215f132e9ebf062739d9130488b56d53c060c",
    );
    assert.include(workflowSource, "goto-bus-stop/setup-zig@v2");
    assert.include(workflowSource, "cargo install cargo-zigbuild --locked");
    assert.notInclude(workflowSource, "gcc-multilib");
    assert.notInclude(workflowSource, "gcc-arm-linux-gnueabihf");
    assert.include(workflowSource, "--all --check");
    assert.include(
      workflowSource,
      "check-synthesis-native-runtime-contract-parity.ts",
    );
    assert.include(workflowSource, "request_id:");
    assert.include(workflowSource, "source_sha:");
    assert.notInclude(workflowSource, "push:");
    assert.notInclude(workflowSource, "node-v24");
    assert.notInclude(workflowSource, "SHASUMS256");
    assert.notInclude(workflowSource, "build-synthesis-rust-sidecar.yml");
  });

  it("binds and synchronizes an exact content-addressed seven-target set transactionally", async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-prebuild-set-"));
    const input = path.join(root, "input");
    const store = path.join(root, "store");
    const addon = path.join(root, "addon", "synthesis-sidecar");
    const build = await computeSynthesisSidecarRuntimeBuildFingerprint(ROOT);
    for (const target of SYNTHESIS_SIDECAR_RUNTIME_TARGETS) {
      writeBundle(
        input,
        target,
        createBundle(target, { buildFingerprint: build.fingerprint }),
      );
    }
    const staged = await stageSynthesisSidecarRuntimePrebuildSet({
      inputRoot: input,
      outputRoot: store,
      buildFingerprint: build.fingerprint,
      sourceFingerprint: "a".repeat(64),
    });
    const result = rebuildSynthesisSidecarRuntimePrebuildResult({
      schema: "synthesis-sidecar-runtime-prebuild-result.v1",
      repository: "example/zotero-agents",
      workflow: "prebuild-synthesis-sidecar-runtime.yml",
      runId: 42,
      requestId: "sidecar-test-42",
      sourceSha: "b".repeat(40),
      buildFingerprint: build.fingerprint,
      aggregate: staged.aggregate,
      prebuildBranch: "synthesis-sidecar-runtime-prebuilds",
      prebuildCommit: "c".repeat(40),
      setPath: `sets/${staged.aggregate}`,
    });
    assertSynthesisSidecarRuntimePrebuildResultIdentity(result, {
      aggregate: staged.aggregate,
      requestId: "sidecar-test-42",
    });
    assert.throws(() =>
      assertSynthesisSidecarRuntimePrebuildResultIdentity(result, {
        sourceSha: "d".repeat(40),
      }),
    );
    const setPath = path.join(store, "sets", staged.aggregate, "manifest.json");
    const set = JSON.parse(fs.readFileSync(setPath, "utf8"));
    assert.throws(() =>
      rebuildSynthesisSidecarRuntimePrebuildSet({
        ...set,
        archives: set.archives.slice(0, -1),
      }),
    );
    assert.throws(() =>
      rebuildSynthesisSidecarRuntimePrebuildSet({
        ...set,
        archives: [
          { ...set.archives[0] },
          { ...set.archives[0] },
          ...set.archives.slice(2),
        ],
      }),
    );
    const synced = await syncSynthesisSidecarRuntimePrebuilds({
      aggregate: staged.aggregate,
      storeRoot: store,
      addonRoot: addon,
      result,
      expected: { sourceSha: "b".repeat(40), runId: 42 },
    });
    assert.isTrue(synced.ok);
    assert.isTrue(
      fs.existsSync(path.join(addon, "linux-arm", "synthesis-sidecar")),
    );
    fs.writeFileSync(
      path.join(store, "sets", staged.aggregate, staged.archives[0]!.file),
      "digest drift",
    );
    await syncSynthesisSidecarRuntimePrebuilds({
      aggregate: staged.aggregate,
      storeRoot: store,
      addonRoot: addon,
      result,
    }).then(
      () => assert.fail("expected digest drift to be rejected"),
      () => undefined,
    );
    assert.isTrue(
      fs.existsSync(path.join(addon, "linux-arm", "synthesis-sidecar")),
    );
    const initialReceipt = createSynthesisSidecarRuntimeReleaseReceipt({
      releaseSet: {
        schema: "synthesis-sidecar-runtime-release-set.v1",
        releaseSetId: "ssrs-test",
        sourceCommit: "b".repeat(40),
        prebuild: { aggregate: staged.aggregate },
      } as never,
      workflowRun: "test",
      pipelineRevision: "test",
    });
    assert.throws(() =>
      advanceSynthesisSidecarRuntimeReleaseReceipt(
        initialReceipt,
        "finalize",
        "complete",
      ),
    );
  });
});
