import { assert } from "chai";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { createServer, type Socket } from "node:net";
import os from "node:os";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import {
  SYNTHESIS_SIDECAR_RUNTIME_TARGETS,
  SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES,
  rebuildSynthesisSidecarRuntimeBundleManifest,
  synthesisSidecarRuntimeTargetBundlePath,
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
  computeSynthesisSidecarRuntimeIdentities,
  computeSynthesisSidecarRuntimeBuildFingerprint,
  readSynthesisSidecarRuntimeBuildRecipe,
  synthesisSidecarRuntimeIdentityInputs,
} from "../../scripts/synthesis-sidecar-runtime-release-governance";
import { checkSynthesisSidecarRuntimeFreshness } from "../../scripts/check-synthesis-sidecar-runtime-freshness";
import {
  stageSynthesisSidecarRuntimePrebuildArchives,
  stageSynthesisSidecarRuntimePrebuildSet,
} from "../../scripts/stage-synthesis-sidecar-runtime-prebuilds";
import { syncSynthesisSidecarRuntimePrebuilds } from "../../scripts/sync-synthesis-sidecar-runtime-prebuilds";
import {
  assertReleaseEligibleSynthesisSidecarRuntimePrebuildResult,
  assertSynthesisSidecarRuntimePrebuildResultIdentity,
  rebuildSynthesisSidecarVerificationResult,
  rebuildSynthesisSidecarRuntimePrebuildSet,
  rebuildSynthesisSidecarRuntimePrebuildResult,
} from "../../packages/synthesis-contracts/src/sidecarRuntimeRelease";
import {
  advanceSynthesisSidecarRuntimeReleaseReceipt,
  createSynthesisSidecarRuntimeReleaseReceipt,
} from "../../scripts/synthesis-sidecar-runtime-release-controller";
import { loopbackRequest } from "../../scripts/smoke-synthesis-rust-durable-candidate";
import { selectTrustedSynthesisSidecarVerification } from "../../scripts/resolve-synthesis-sidecar-verification";
import { resolveSynthesisSidecarRuntimeCache } from "../../scripts/resolve-synthesis-sidecar-runtime-cache";

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
    sourceFingerprint?: string;
    contentId?: string;
    createdAt?: string;
    expiresAt?: string | null;
  } = {},
) {
  const executable =
    target === "win32-x64" ? "synthesis-sidecar.exe" : "synthesis-sidecar";
  const assets = new Map<string, Uint8Array>([
    [
      executable,
      bytes(`native-${target}-${options.contentId || options.bundleId || "a"}`),
    ],
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
    createdAt: options.createdAt || "2026-07-27T00:00:00.000Z",
    expiresAt: options.expiresAt ?? null,
    provenance: {
      sourceFingerprint: options.sourceFingerprint || "c".repeat(64),
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
  const prefix = `bin/${synthesisSidecarRuntimeTargetBundlePath(target)}/`;
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
  relativeRoot = target,
) {
  const targetRoot = path.join(root, relativeRoot);
  fs.mkdirSync(targetRoot, { recursive: true });
  fs.writeFileSync(
    path.join(targetRoot, "manifest.json"),
    `${JSON.stringify(bundle.manifest)}\n`,
  );
  for (const [relativePath, value] of bundle.assets) {
    const filePath = path.join(targetRoot, relativePath);
    fs.writeFileSync(filePath, value);
    if (relativePath === bundle.manifest.executable && target !== "win32-x64") {
      fs.chmodSync(filePath, 0o755);
    }
  }
}

function writeAddonBundle(
  root: string,
  target: SynthesisSidecarRuntimeTarget,
  bundle: ReturnType<typeof createBundle>,
) {
  writeBundle(
    root,
    target,
    bundle,
    synthesisSidecarRuntimeTargetBundlePath(target),
  );
}

describe("Synthesis sidecar native runtime packaging", function () {
  this.timeout(30_000);

  it("separates runtime, bundle, verification, and pipeline identities", async function () {
    const inputs = await synthesisSidecarRuntimeIdentityInputs(ROOT);
    assert.notInclude(
      inputs.build,
      ".github/workflows/prebuild-synthesis-sidecar-runtime.yml",
    );
    assert.notInclude(
      inputs.source,
      "native/synthesis-sidecar/build-recipe.json",
    );
    assert.include(inputs.build, "native/synthesis-sidecar/build-recipe.json");
    assert.notInclude(
      inputs.source,
      "native/synthesis-sidecar/crates/synthesis-test-support/src/lib.rs",
    );
    assert.include(
      inputs.verification,
      "native/synthesis-sidecar/crates/synthesis-test-support/src/lib.rs",
    );
    assert.include(
      inputs.verification,
      ".github/workflows/verify-synthesis-sidecar.yml",
    );
    assert.include(
      inputs.pipeline,
      ".github/workflows/prebuild-synthesis-sidecar-runtime.yml",
    );
    const identities = await computeSynthesisSidecarRuntimeIdentities(ROOT);
    for (const value of [
      identities.sourceFingerprint,
      identities.buildFingerprint,
      identities.verificationFingerprint,
      identities.pipelineRevision,
    ]) {
      assert.match(value, /^[a-f0-9]{64}$/);
    }
  });

  it("accepts only trusted closed three-host verification evidence", function () {
    const receipt = rebuildSynthesisSidecarVerificationResult({
      schema: "synthesis-sidecar-verification-result.v1",
      repository: "example/zotero-agents",
      workflow: "verify-synthesis-sidecar.yml",
      runId: 41,
      event: "push",
      sourceSha: "a".repeat(40),
      verificationFingerprint: "b".repeat(64),
      pipelineRevision: "c".repeat(64),
      hosts: { linux: "passed", windows: "passed", macos: "passed" },
    });
    assert.equal(receipt.event, "push");
    assert.equal(
      selectTrustedSynthesisSidecarVerification({
        receipts: [
          { ...receipt, sourceSha: "d".repeat(40), runId: 40 },
          receipt,
        ],
        repository: receipt.repository,
        sourceSha: receipt.sourceSha,
        verificationFingerprint: receipt.verificationFingerprint,
        pipelineRevision: receipt.pipelineRevision,
      })?.runId,
      41,
    );
    assert.throws(() =>
      rebuildSynthesisSidecarVerificationResult({
        ...receipt,
        event: "pull_request",
      }),
    );
    assert.throws(() =>
      rebuildSynthesisSidecarVerificationResult({
        ...receipt,
        hosts: { linux: "passed", windows: "failed", macos: "passed" },
      }),
    );
  });

  it("discovers cross-SHA cache candidates without trusting expired artifacts", async function () {
    const currentSha = "1".repeat(40);
    const donorSha = "2".repeat(40);
    const resolution = await resolveSynthesisSidecarRuntimeCache({
      repo: "example/zotero-agents",
      sourceSha: currentSha,
      sourceFingerprint: "a".repeat(64),
      buildFingerprint: "b".repeat(64),
      listRuns: async () => [
        { databaseId: 9, conclusion: "failure", sourceSha: donorSha },
      ],
      listArtifacts: async () =>
        SYNTHESIS_SIDECAR_RUNTIME_TARGETS.map((target, index) => ({
          artifactId: index + 1,
          name: `synthesis-sidecar-runtime-${target}`,
          sizeInBytes: 100 + index,
          archiveDownloadUrl: `https://example.test/${target}`,
          expired: target === "linux-arm",
        })),
    });
    assert.equal(
      resolution.schema,
      "synthesis-sidecar-runtime-cache-resolution.v3",
    );
    assert.isTrue(resolution.platforms["linux-x64"].candidate);
    assert.equal(resolution.platforms["linux-x64"].sourceSha, donorSha);
    assert.isFalse(resolution.platforms["linux-arm"].candidate);
    assert.equal(resolution.platforms["linux-arm"].reason, "artifact_expired");
  });

  it("strictly rebuilds the XPI-owned native manifest", function () {
    const { manifest } = createBundle();
    assert.equal(manifest.implementation, "rust-native");
    assert.equal(manifest.targetTriple, "x86_64-unknown-linux-gnu");
    assert.deepEqual(manifest.capabilities, SYNTHESIS_SIDECAR_CAPABILITIES);
    assert.isTrue(Object.isFrozen(manifest));

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

  it("materializes one current XPI bundle and reuses verified content", async function () {
    const runtimeRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-native-runtime-install-"),
    );
    const firstBundle = createBundle("linux-x64", {
      bundleId: "1".repeat(64),
    });
    let reads = 0;
    const installer = createSynthesisSidecarRuntimeInstaller({
      runtimeRoot,
      target: "linux-x64",
      readPackagedAsset: async (relativePath) => {
        reads += 1;
        return packagedReader("linux-x64", firstBundle)(relativePath);
      },
    });

    const first = await installer.ensureInstalled();
    const firstReads = reads;
    const second = await installer.ensureInstalled();
    const paths = getSynthesisSidecarRuntimeInstallPaths(runtimeRoot);

    assert.equal(first.state, "ready");
    assert.equal(second.state, "ready");
    assert.equal(first.executablePath, second.executablePath);
    assert.equal(first.installRoot, paths.currentDir);
    assert.equal(fs.readdirSync(paths.root).sort().join(","), "current");
    assert.isAtLeast(reads, firstReads);
  });

  it("atomically replaces current content and leaves legacy runtime state inert", async function () {
    const runtimeRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-native-runtime-replace-"),
    );
    const first = createBundle("linux-x64", { bundleId: "1".repeat(64) });
    const second = createBundle("linux-x64", {
      bundleId: "2".repeat(64),
      buildFingerprint: "e".repeat(64),
    });
    let selected = first;
    const installer = createSynthesisSidecarRuntimeInstaller({
      runtimeRoot,
      target: "linux-x64",
      readPackagedAsset: async (relativePath) =>
        packagedReader("linux-x64", selected)(relativePath),
    });
    const paths = getSynthesisSidecarRuntimeInstallPaths(runtimeRoot);
    fs.mkdirSync(paths.legacyVersionsDir, { recursive: true });
    fs.writeFileSync(paths.legacyActivePointerPath, "legacy-active\n");
    fs.writeFileSync(
      path.join(paths.legacyVersionsDir, "legacy"),
      "legacy-version\n",
    );

    assert.equal(
      (await installer.ensureInstalled()).bundleId,
      first.manifest.bundleId,
    );
    selected = second;
    assert.equal(
      (await installer.ensureInstalled()).bundleId,
      second.manifest.bundleId,
    );
    assert.equal(
      fs.readFileSync(paths.legacyActivePointerPath, "utf8"),
      "legacy-active\n",
    );
    assert.equal(
      fs.readFileSync(path.join(paths.legacyVersionsDir, "legacy"), "utf8"),
      "legacy-version\n",
    );
  });

  it("treats XPI manifest expiry as release metadata, not startup policy", async function () {
    const expired = createBundle("linux-x64", {
      expiresAt: "2026-07-28T00:00:00.000Z",
    });
    const restartInstaller = createSynthesisSidecarRuntimeInstaller({
      runtimeRoot: fs.mkdtempSync(path.join(os.tmpdir(), "zs-expired-active-")),
      target: "linux-x64",
      readPackagedAsset: packagedReader("linux-x64", expired),
    });
    assert.equal((await restartInstaller.ensureInstalled()).state, "ready");
    assert.equal((await restartInstaller.ensureInstalled()).state, "ready");
  });

  it("verifies all seven native prebuilds and build workflow governance", async function () {
    const assetRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-native-freshness-"),
    );
    const build = await computeSynthesisSidecarRuntimeBuildFingerprint(ROOT);
    for (const target of SYNTHESIS_SIDECAR_RUNTIME_TARGETS) {
      writeAddonBundle(
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
    const verificationWorkflowSource = fs.readFileSync(
      path.join(ROOT, ".github/workflows/verify-synthesis-sidecar.yml"),
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
      ["linux-x86", "linux-x64", "linux-arm"],
    );
    assert.deepInclude(recipe.targets, {
      runner: "ubuntu-24.04-arm",
      platform: "linux-arm64",
      target: "aarch64-unknown-linux-gnu",
      binary: "synthesis-sidecar",
      useZig: false,
      nativeSmoke: true,
    });

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
    fs.writeFileSync(
      invalidRecipePath,
      JSON.stringify({
        ...recipe,
        targets: recipe.targets.map((target) =>
          target.platform === "linux-arm64"
            ? { ...target, useZig: true }
            : target,
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
    assert.include(
      workflowSource,
      "goto-bus-stop/setup-zig@abea47f85e598557f500fa1fd2ab7464fcb39406",
    );
    assert.include(workflowSource, "cargo install cargo-zigbuild --locked");
    assert.include(
      workflowSource,
      'cargo +${{ needs.plan.outputs.rust_toolchain }} build --release --locked --target "${{ matrix.target }}"',
    );
    assert.notInclude(workflowSource, "gcc-multilib");
    assert.notInclude(workflowSource, "gcc-arm-linux-gnueabihf");
    assert.notInclude(workflowSource, "cargo test --workspace");
    assert.notInclude(workflowSource, "clippy --workspace");
    assert.notInclude(
      workflowSource,
      "check:synthesis-cross-language-contracts",
    );
    assert.notInclude(
      workflowSource,
      "check-synthesis-native-worker-transfer-parity.ts",
    );
    assert.include(verificationWorkflowSource, "--no-fail-fast");
    assert.include(
      verificationWorkflowSource,
      "check:synthesis-native-runtime-contract-parity",
    );
    assert.include(
      verificationWorkflowSource,
      "check:synthesis-native-worker-transfer-parity",
    );
    assert.include(verificationWorkflowSource, "windows-2025");
    assert.include(workflowSource, "request_id:");
    assert.include(workflowSource, "source_sha:");
    assert.include(
      workflowSource,
      'test "$GITHUB_SHA" = "${{ inputs.source_sha }}"',
    );
    assert.include(workflowSource, "verification_fingerprint:");
    assert.include(workflowSource, "pipeline_revision:");
    assert.include(workflowSource, "SYNTHESIS_RUST_BUILD_FINGERPRINT:");
    assert.include(
      workflowSource,
      'smoke-synthesis-rust-sidecar-worker.ts "$binary" "${{ needs.plan.outputs.build_fingerprint }}"',
    );
    assert.notInclude(
      workflowSource,
      'smoke-synthesis-rust-sidecar-worker.ts "$binary" "$bundle/provenance.json"',
    );
    assert.include(workflowSource, "resolve-synthesis-sidecar-verification.ts");
    assert.include(
      workflowSource,
      "synthesis-sidecar-runtime-prebuild-result.v3",
    );
    assert.include(workflowSource, "--archive-root=.scaffold/prebuild");
    assert.notInclude(workflowSource, "mkdir extracted");
    assert.notInclude(workflowSource, "push:");
    assert.notInclude(workflowSource, "node-v24");
    assert.notInclude(workflowSource, "SHASUMS256");
    assert.notInclude(workflowSource, "build-synthesis-rust-sidecar.yml");
    assert.notMatch(
      `${workflowSource}\n${verificationWorkflowSource}`,
      /uses:\s+[^\s]+@v\d/,
    );

    const durableSmokeSource = fs.readFileSync(
      path.join(ROOT, "scripts/smoke-synthesis-rust-durable-candidate.ts"),
      "utf8",
    );
    assert.notInclude(durableSmokeSource, 'from "node:http"');
    assert.include(durableSmokeSource, 'from "node:net"');
    assert.include(durableSmokeSource, "HTTP/1.1\\r\\n");
    assert.include(
      durableSmokeSource,
      '"content-length": String(body.byteLength)',
    );
    assert.include(
      durableSmokeSource,
      "Health route returned ${healthResponse.status} for ${target}: ${healthResponse.body}",
    );
  });

  it("completes a framed durable-smoke response without waiting for connection EOF", async function () {
    const sockets = new Set<Socket>();
    const server = createServer({ allowHalfOpen: true }, (socket) => {
      sockets.add(socket);
      socket.once("close", () => sockets.delete(socket));
      let request = Buffer.alloc(0);
      let responded = false;
      socket.on("data", (chunk: Buffer) => {
        if (responded) return;
        request = Buffer.concat([request, chunk]);
        const separator = request.indexOf("\r\n\r\n");
        if (separator < 0) return;
        const length = Number(
          /\r\ncontent-length:\s*([0-9]+)/iu.exec(
            request.subarray(0, separator).toString("utf8"),
          )?.[1] || "0",
        );
        if (request.byteLength < separator + 4 + length) return;
        responded = true;
        const body = Buffer.from('{"ok":true}', "utf8");
        socket.write(
          Buffer.concat([
            Buffer.from(
              `HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: ${body.byteLength}\r\nConnection: close\r\n\r\n`,
              "utf8",
            ),
            body,
          ]),
        );
      });
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    assert.isObject(address);
    try {
      const response = await loopbackRequest(
        `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}/synthesis/v1/health`,
      );
      assert.deepEqual(response, { status: 200, body: '{"ok":true}' });
    } finally {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("finalizes the release through the seven-target runtime synchronizer", function () {
    const workflow = parseYaml(
      fs.readFileSync(
        path.join(ROOT, ".github/workflows/release-synthesis-sidecar.yml"),
        "utf8",
      ),
    ) as {
      jobs?: {
        materialize?: {
          steps?: Array<{ name?: string; run?: string }>;
        };
      };
    };
    const finalize = workflow.jobs?.materialize?.steps?.find(
      (step) => step.name === "Finalize source main",
    );

    assert.exists(finalize);
    assert.include(
      finalize?.run,
      "npm run sync:synthesis-sidecar-runtime-prebuilds",
    );
    assert.include(finalize?.run, "--addon-root=.finalize/addon/bin");
    assert.notInclude(finalize?.run, "cp -a addon/bin/synthesis-sidecar");
  });

  it("binds and synchronizes an exact content-addressed seven-target set transactionally", async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-prebuild-set-"));
    const input = path.join(root, "input");
    const store = path.join(root, "store");
    const addon = path.join(root, "addon", "bin");
    const build = await computeSynthesisSidecarRuntimeBuildFingerprint(ROOT);
    for (const target of SYNTHESIS_SIDECAR_RUNTIME_TARGETS) {
      writeBundle(
        input,
        target,
        createBundle(target, {
          buildFingerprint: build.fingerprint,
          sourceFingerprint: "a".repeat(64),
        }),
      );
    }
    const staged = await stageSynthesisSidecarRuntimePrebuildSet({
      inputRoot: input,
      outputRoot: store,
      buildFingerprint: build.fingerprint,
      sourceFingerprint: "a".repeat(64),
    });
    const nativeSmokeTargets = new Set(
      readSynthesisSidecarRuntimeBuildRecipe({ root: ROOT })
        .targets.filter((target) => target.nativeSmoke)
        .map((target) => target.platform),
    );
    const targetEvidence = Object.fromEntries(
      staged.archives.map((archive) => [
        archive.target,
        {
          mode: "built",
          artifactRunId: 42,
          artifactSourceSha: "b".repeat(40),
          archiveSha256: archive.sha256,
          archiveBytes: archive.bytes,
          smoke: nativeSmokeTargets.has(archive.target)
            ? { status: "passed", runId: 42 }
            : { status: "not_applicable" },
        },
      ]),
    );
    const resultDocument = {
      schema: "synthesis-sidecar-runtime-prebuild-result.v3",
      repository: "example/zotero-agents",
      workflow: "prebuild-synthesis-sidecar-runtime.yml",
      runId: 42,
      requestId: "sidecar-test-42",
      sourceSha: "b".repeat(40),
      sourceFingerprint: "a".repeat(64),
      buildFingerprint: build.fingerprint,
      verificationFingerprint: "e".repeat(64),
      pipelineRevision: "f".repeat(64),
      verification: {
        runId: 41,
        sourceSha: "b".repeat(40),
        event: "push",
      },
      aggregate: staged.aggregate,
      prebuildBranch: "synthesis-sidecar-runtime-prebuilds",
      prebuildCommit: "c".repeat(40),
      setPath: `sets/${staged.aggregate}`,
      targets: targetEvidence,
    };
    const result = rebuildSynthesisSidecarRuntimePrebuildResult(resultDocument);
    assertReleaseEligibleSynthesisSidecarRuntimePrebuildResult(result);
    const missingTarget = { ...targetEvidence };
    delete missingTarget["linux-arm"];
    assert.throws(() =>
      rebuildSynthesisSidecarRuntimePrebuildResult({
        ...resultDocument,
        targets: missingTarget,
      }),
    );
    assert.throws(() =>
      rebuildSynthesisSidecarRuntimePrebuildResult({
        ...resultDocument,
        targets: {
          ...targetEvidence,
          "linux-x64": {
            ...targetEvidence["linux-x64"],
            mode: "reused",
            artifactRunId: 12,
            artifactSourceSha: "d".repeat(40),
            smoke: { status: "passed", runId: 12 },
          },
        },
      }),
    );
    const legacy = rebuildSynthesisSidecarRuntimePrebuildResult({
      schema: "synthesis-sidecar-runtime-prebuild-result.v1",
      repository: "example/zotero-agents",
      workflow: "prebuild-synthesis-sidecar-runtime.yml",
      runId: 1,
      requestId: "legacy",
      sourceSha: "b".repeat(40),
      buildFingerprint: build.fingerprint,
      aggregate: staged.aggregate,
      prebuildBranch: "synthesis-sidecar-runtime-prebuilds",
      prebuildCommit: "c".repeat(40),
      setPath: `sets/${staged.aggregate}`,
    });
    assert.throws(() =>
      assertReleaseEligibleSynthesisSidecarRuntimePrebuildResult(legacy),
    );
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
    const siblingBinary = path.join(addon, "linux-arm", "zotero-bridge");
    fs.mkdirSync(path.dirname(siblingBinary), { recursive: true });
    fs.writeFileSync(siblingBinary, "host-bridge");
    const synced = await syncSynthesisSidecarRuntimePrebuilds({
      aggregate: staged.aggregate,
      storeRoot: store,
      addonRoot: addon,
      result,
      expected: { sourceSha: "b".repeat(40), runId: 42 },
    });
    assert.isTrue(synced.ok);
    assert.isTrue(
      fs.existsSync(
        path.join(addon, "linux-arm", "synthesis-sidecar", "synthesis-sidecar"),
      ),
    );
    assert.equal(fs.readFileSync(siblingBinary, "utf8"), "host-bridge");
    assert.isFalse(
      fs.existsSync(path.join(addon, "synthesis-sidecar", "linux-arm")),
    );

    const archiveRoot = path.join(root, "archives");
    fs.mkdirSync(archiveRoot, { recursive: true });
    for (const archive of staged.archives) {
      fs.copyFileSync(
        path.join(store, "sets", staged.aggregate, archive.file),
        path.join(archiveRoot, archive.file),
      );
    }
    const restaged = await stageSynthesisSidecarRuntimePrebuildArchives({
      archiveRoot,
      outputRoot: store,
      buildFingerprint: build.fingerprint,
      sourceFingerprint: "a".repeat(64),
    });
    assert.equal(restaged.aggregate, staged.aggregate);
    fs.unlinkSync(path.join(archiveRoot, staged.archives[0]!.file));
    await stageSynthesisSidecarRuntimePrebuildArchives({
      archiveRoot,
      outputRoot: store,
      buildFingerprint: build.fingerprint,
      sourceFingerprint: "a".repeat(64),
    }).then(
      () => assert.fail("expected missing archive to be rejected"),
      () => undefined,
    );

    const sourceMismatchRoot = path.join(root, "source-mismatch");
    for (const target of SYNTHESIS_SIDECAR_RUNTIME_TARGETS) {
      writeBundle(
        sourceMismatchRoot,
        target,
        createBundle(target, {
          buildFingerprint: build.fingerprint,
          sourceFingerprint: "f".repeat(64),
        }),
      );
    }
    await stageSynthesisSidecarRuntimePrebuildSet({
      inputRoot: sourceMismatchRoot,
      outputRoot: store,
      buildFingerprint: build.fingerprint,
      sourceFingerprint: "a".repeat(64),
    }).then(
      () => assert.fail("expected source provenance mismatch to be rejected"),
      () => undefined,
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
      fs.existsSync(
        path.join(addon, "linux-arm", "synthesis-sidecar", "synthesis-sidecar"),
      ),
    );
    assert.equal(fs.readFileSync(siblingBinary, "utf8"), "host-bridge");
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
