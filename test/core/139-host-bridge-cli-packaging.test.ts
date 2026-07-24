import { assert } from "chai";
import { execFile } from "child_process";
import { createHash } from "crypto";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { promisify } from "util";
import {
  resolveHostBridgeCliBinary,
  resolveHostBridgeCliPlatform,
  hostBridgeCliResolverInternalsForTests,
} from "../../src/modules/hostBridgeCliResolver";
import {
  installHostBridgeCli,
  resolveHostBridgeCliInstallTarget,
  hostBridgeCliInstallerInternalsForTests,
} from "../../src/modules/hostBridgeCliInstaller";
import { packagedAssetResolverInternalsForTests } from "../../src/modules/packagedAssetResolver";
import {
  resolveHostBridgeWellKnownProfilePath,
  writeHostBridgeWellKnownProfile,
} from "../../src/modules/hostBridgeProfileStore";
import { setRuntimeExecutablePermissions } from "../../src/modules/runtimePersistence";
import {
  promptHostBridgeCliInstallOnStartup,
  resolveHostBridgeCliInstallPromptState,
  shouldPromptHostBridgeCliInstall,
  shouldRunHostBridgeCliStartupPrompt,
} from "../../src/modules/hostBridgeCliInstallPrompt";
import {
  syncHostBridgeCliPrebuildInternalsForTests,
  syncHostBridgeCliPrebuilds,
} from "../../scripts/sync-host-bridge-cli-prebuilds";
import { stageHostBridgeCliPrebuildSet } from "../../scripts/stage-host-bridge-cli-prebuilds";
import {
  assertLockedHostBridgeCliIdentity,
  assertPrebuildSourceState,
  parsePrebuildCliArgs,
  prebuildZoteroBridgeCli,
} from "../../scripts/prebuild-zotero-bridge-cli";

const execFileAsync = promisify(execFile);

const COMMAND_REFERENCE_PARTITIONS = [
  {
    path: "commands/connection-and-context.md",
    roots: ["surface", "bridge", "context"],
  },
  { path: "commands/library.md", roots: ["library"] },
  { path: "commands/mutation.md", roots: ["mutation"] },
  {
    path: "commands/files-products-and-operations.md",
    roots: ["file", "product", "operation"],
  },
  { path: "commands/workflow.md", roots: ["workflow"] },
  { path: "commands/run.md", roots: ["run"] },
  { path: "commands/synthesis.md", roots: ["synthesis"] },
  { path: "commands/diagnostics.md", roots: ["debug", "call"] },
] as const;

const COMMAND_CATALOG_PATH = "references/command-catalog.md";

async function pathExists(target: string) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function readCommandReferences(packageRoot: string) {
  const result = new Map<string, string>();
  for (const partition of COMMAND_REFERENCE_PARTITIONS) {
    result.set(
      partition.path,
      await fs.readFile(
        path.join(packageRoot, "references", partition.path),
        "utf8",
      ),
    );
  }
  return result;
}

function encodeText(value: string) {
  return new TextEncoder().encode(value);
}

function sha256Hex(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function writeTextFile(
  root: string,
  relativePath: string,
  content: string,
) {
  const target = path.join(root, ...relativePath.split("/"));
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, "utf8");
}

async function writeBinaryFixture(
  root: string,
  relativePath: string,
  bytes: Uint8Array,
) {
  const target = path.join(root, ...relativePath.split("/"));
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, bytes);
}

async function createFreshnessFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-cli-fresh-"));
  await writeTextFile(
    root,
    "host-bridge/cli-build-recipe.json",
    `${JSON.stringify({ schema: "host-bridge.cli-build-recipe.v1" })}\n`,
  );
  await writeTextFile(
    root,
    "scripts/build-zotero-bridge-cli.mjs",
    "console.log('build');\n",
  );
  await writeTextFile(
    root,
    "scripts/package-zotero-bridge-cli.mjs",
    "console.log('package');\n",
  );
  await writeTextFile(
    root,
    "cli/zotero-bridge/Cargo.toml",
    '[package]\nname = "zotero-bridge"\nversion = "0.1.0"\n',
  );
  await writeTextFile(
    root,
    "cli/zotero-bridge/Cargo.lock",
    '[[package]]\nname = "zotero-bridge"\nversion = "0.1.0"\n',
  );
  await writeTextFile(root, "cli/zotero-bridge/src/main.rs", "fn main() {}\n");
  const governance =
    await import("../../scripts/host-bridge-cli-release-governance.mjs");
  const freshness =
    await import("../../scripts/check-host-bridge-cli-prebuild-freshness.mjs");
  const fingerprint = await governance.computeHostBridgeCliBuildFingerprint({
    root,
  });
  const binaries = [];
  for (const entry of governance.EXPECTED_PREBUILDS) {
    const bytes = encodeText(`${entry.platform}:${entry.binary}`);
    const sha256 = sha256Hex(bytes);
    await writeBinaryFixture(
      root,
      `addon/bin/${entry.platform}/${entry.binary}`,
      bytes,
    );
    await writeTextFile(
      root,
      `addon/bin/${entry.platform}/${entry.binary}.sha256`,
      `${sha256}  ${entry.binary}\n`,
    );
    binaries.push({
      platform: entry.platform,
      binary: entry.binary,
      sha256,
      bytes: bytes.length,
    });
  }
  const manifest = {
    schema: "zotero-bridge-cli-release.v1",
    version: "0.1.0",
    buildFingerprint: fingerprint.fingerprint,
    binariesBuildFingerprint: fingerprint.fingerprint,
    fingerprintInputs: fingerprint.files,
    binaries,
  };
  await writeTextFile(
    root,
    "cli/zotero-bridge/release.json",
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  await writeTextFile(
    root,
    "addon/bin/zotero-bridge-release.json",
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  return { root, freshness, governance };
}

describe("host bridge cli packaging and install", function () {
  it("keeps the Minimum source as a task-neutral executable CLI contract", async function () {
    const root = path.join(process.cwd(), "skills_src/zotero-bridge-cli");
    const skill = await fs.readFile(path.join(root, "SKILL.md"), "utf8");
    const runner = JSON.parse(
      await fs.readFile(path.join(root, "runner.json"), "utf8"),
    );
    const references = (
      await fs.readdir(path.join(root, "references", "commands"))
    ).sort();

    assert.match(skill, /^---\nname: zotero-bridge-cli\ndescription: .+\n/m);
    const description = skill.match(/^description: (.+)$/m)?.[1] || "";
    assert.isAtMost([...description].length, 240);
    assert.match(description, /Use when/i);
    for (const heading of [
      "## Goal",
      "## Inputs",
      "## Workflow",
      "## Hard constraints",
      "## Completion",
      "## Failure handling",
      "## References",
    ]) {
      assert.include(skill, heading);
    }
    for (const partition of COMMAND_REFERENCE_PARTITIONS) {
      assert.include(skill, `references/${partition.path}`);
    }
    assert.include(skill, COMMAND_CATALOG_PATH);
    assert.isTrue(await pathExists(path.join(root, COMMAND_CATALOG_PATH)));
    assert.deepEqual(
      references,
      COMMAND_REFERENCE_PARTITIONS.map(({ path: referencePath }) =>
        path.basename(referencePath),
      ).sort(),
    );
    assert.notInclude(skill, "operating-contract.md");
    assert.notInclude(skill, "zotero-library-agent");
    assert.notInclude(skill, "host-bridge-shared");
    assert.strictEqual(runner.version, "__HOST_BRIDGE_SURFACE_VERSION__");
    assert.notInclude(
      runner.entrypoint.prompts.common,
      "operating-contract.md",
    );
    assert.notInclude(
      runner.entrypoint.prompts.common,
      "references/command-reference.md",
    );
    assert.include(runner.entrypoint.prompts.common, "references/commands/");
    assert.include(runner.entrypoint.prompts.common, COMMAND_CATALOG_PATH);
    const profileTemplate = await fs.readFile(
      path.join(root, "profile.template.json"),
      "utf8",
    );
    assert.strictEqual(
      await fs.readFile(
        "skills_builtin/zotero-bridge-cli/assets/profile.template.json",
        "utf8",
      ),
      profileTemplate,
    );
    assert.strictEqual(
      await fs.readFile(
        "profiles/hermes/zotero-librarian/skills/zotero-bridge-cli/assets/profile.template.json",
        "utf8",
      ),
      profileTemplate,
    );
  });

  it("replaces only managed prebuild files after a complete staged set verifies", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-cli-sync-"));
    const sourceRoot = path.join(root, "source");
    const targetRoot = path.join(root, "target");
    const staleMarker = path.join(targetRoot, "linux-x64", "stale");
    const acpBridge = path.join(
      targetRoot,
      "win32-x64",
      "zotero-acp-bridge.exe",
    );
    const acpBridgeSidecar = `${acpBridge}.sha256`;
    await writeTextFile(targetRoot, "linux-x64/stale", "preserve-on-error");
    await writeTextFile(
      targetRoot,
      "win32-x64/zotero-acp-bridge.exe",
      "preserve-acp-binary",
    );
    await writeTextFile(
      targetRoot,
      "win32-x64/zotero-acp-bridge.exe.sha256",
      "preserve-acp-sidecar",
    );

    let missingError: unknown;
    try {
      await syncHostBridgeCliPrebuildInternalsForTests.replacePrebuilds(
        sourceRoot,
        targetRoot,
      );
    } catch (error) {
      missingError = error;
    }
    assert.match(String(missingError), /Missing Host Bridge CLI prebuilds/);
    assert.strictEqual(
      await fs.readFile(staleMarker, "utf8"),
      "preserve-on-error",
    );

    for (const {
      platform,
      binary,
    } of syncHostBridgeCliPrebuildInternalsForTests.expectedPlatforms) {
      await writeTextFile(sourceRoot, `${platform}/${binary}`, platform);
      await writeTextFile(
        sourceRoot,
        `${platform}/${binary}.sha256`,
        `${sha256Hex(encodeText(platform))}  ${binary}\n`,
      );
    }

    await syncHostBridgeCliPrebuildInternalsForTests.replacePrebuilds(
      sourceRoot,
      targetRoot,
    );
    assert.strictEqual(
      await fs.readFile(staleMarker, "utf8"),
      "preserve-on-error",
    );
    assert.strictEqual(
      await fs.readFile(acpBridge, "utf8"),
      "preserve-acp-binary",
    );
    assert.strictEqual(
      await fs.readFile(acpBridgeSidecar, "utf8"),
      "preserve-acp-sidecar",
    );
    for (const {
      platform,
      binary,
    } of syncHostBridgeCliPrebuildInternalsForTests.expectedPlatforms) {
      assert.strictEqual(
        await fs.readFile(path.join(targetRoot, platform, binary), "utf8"),
        platform,
      );
    }
  });

  it("validates an explicit prebuild result without consulting a stale local aggregate", function () {
    const result =
      syncHostBridgeCliPrebuildInternalsForTests.readPrebuildResultText(
        JSON.stringify({
          schema: "host-bridge-cli-prebuild-result.v1",
          repository: "owner/repo",
          workflow: "build-host-bridge-cli-prebuilds.yml",
          runId: 42,
          requestId: "hbcp-request",
          sourceSha: "a".repeat(40),
          ref: "dev",
          cliVersion: "0.3.0",
          buildFingerprint: "b".repeat(64),
          binaryAggregateSha256: "c".repeat(64),
          prebuildBranch: "host-bridge-cli-prebuilds",
          prebuildCommit: "d".repeat(40),
          setPath: `sets/${"c".repeat(64)}`,
        }),
      );

    assert.strictEqual(result.binaryAggregateSha256, "c".repeat(64));
    assert.strictEqual(result.cliVersion, "0.3.0");
    assert.throws(
      () =>
        syncHostBridgeCliPrebuildInternalsForTests.assertPrebuildResultIdentity(
          result,
          { cliVersion: "0.4.0" },
        ),
      /cliVersion.*expected identity/i,
    );
    assert.throws(
      () =>
        syncHostBridgeCliPrebuildInternalsForTests.readPrebuildResultText(
          JSON.stringify({
            ...result,
            setPath: `sets/${"e".repeat(64)}`,
          }),
        ),
      /set path/i,
    );
  });

  it("synchronizes the explicit result set when the local aggregate is stale", async function () {
    const fixture = await createFreshnessFixture();
    const storeRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-cli-remote-store-"),
    );
    const sourceRoot = path.join(storeRoot, "source");
    const releaseManifest = path.join(storeRoot, "release.json");
    const prebuildCommit = "d".repeat(40);
    try {
      const status = await fixture.governance.getHostBridgeCliReleaseStatus({
        root: fixture.root,
      });
      for (const {
        platform,
        binary,
      } of syncHostBridgeCliPrebuildInternalsForTests.expectedPlatforms) {
        const bytes = encodeText(`remote:${platform}:${binary}`);
        await writeBinaryFixture(sourceRoot, `${platform}/${binary}`, bytes);
        await writeTextFile(
          sourceRoot,
          `${platform}/${binary}.sha256`,
          `${sha256Hex(bytes)}  ${binary}\n`,
        );
      }
      const remoteManifest =
        await fixture.governance.recordHostBridgeCliBinaryChecksums({
          root: fixture.root,
          binaryRoot: sourceRoot,
          dispatchReason: "prebuild-only",
        });
      await fs.writeFile(
        releaseManifest,
        `${JSON.stringify(remoteManifest, null, 2)}\n`,
      );
      await stageHostBridgeCliPrebuildSet({
        outputRoot: storeRoot,
        sourceRoot,
        releaseManifest,
      });

      const localManifestPath = path.join(
        fixture.root,
        "cli",
        "zotero-bridge",
        "release.json",
      );
      const staleLocalManifest = JSON.parse(
        await fs.readFile(localManifestPath, "utf8"),
      );
      staleLocalManifest.binaryAggregateSha256 = "e".repeat(64);
      await fs.writeFile(
        localManifestPath,
        `${JSON.stringify(staleLocalManifest, null, 2)}\n`,
      );
      await fs.writeFile(
        path.join(fixture.root, "addon", "bin", "zotero-bridge-release.json"),
        `${JSON.stringify(staleLocalManifest, null, 2)}\n`,
      );

      const identity = {
        schema: "host-bridge-cli-prebuild-result.v1",
        repository: "owner/repo",
        workflow: "build-host-bridge-cli-prebuilds.yml",
        runId: 42,
        requestId: "hbcp-stale-local",
        sourceSha: "a".repeat(40),
        ref: "dev",
        cliVersion: "0.1.0",
        buildFingerprint: status.fingerprint,
        binaryAggregateSha256: remoteManifest.binaryAggregateSha256,
        prebuildBranch: "host-bridge-cli-prebuilds",
        prebuildCommit,
        setPath: `sets/${remoteManifest.binaryAggregateSha256}`,
      } as const;
      const downloadDir = path.join(fixture.root, ".scaffold", "sync-test");

      await syncHostBridgeCliPrebuilds({
        repo: identity.repository,
        identity,
        root: fixture.root,
        downloadDir,
        commandRunner: async (command, args) => {
          if (command === "gh" && args[0] === "repo") {
            await fs.cp(storeRoot, downloadDir, { recursive: true });
          }
          if (command === "git" && args.includes("rev-parse")) {
            return { stdout: `${prebuildCommit}\n`, stderr: "" };
          }
          return { stdout: "", stderr: "" };
        },
      });

      const synchronized = JSON.parse(
        await fs.readFile(localManifestPath, "utf8"),
      );
      assert.strictEqual(
        synchronized.binaryAggregateSha256,
        remoteManifest.binaryAggregateSha256,
      );
      assert.strictEqual(
        await fs.readFile(
          path.join(fixture.root, "addon", "bin", "linux-x64", "zotero-bridge"),
          "utf8",
        ),
        "remote:linux-x64:zotero-bridge",
      );
    } finally {
      await fs.rm(fixture.root, { recursive: true, force: true });
      await fs.rm(storeRoot, { recursive: true, force: true });
    }
  });

  it("requires a locked CLI version and build fingerprint before prebuild dispatch", function () {
    assert.doesNotThrow(() =>
      assertLockedHostBridgeCliIdentity({
        currentVersion: "0.3.0",
        manifestVersion: "0.3.0",
        fingerprint: "a".repeat(64),
        manifestFingerprint: "a".repeat(64),
      }),
    );
    assert.throws(
      () =>
        assertLockedHostBridgeCliIdentity({
          currentVersion: "0.3.0",
          manifestVersion: "0.3.0",
          fingerprint: "a".repeat(64),
          manifestFingerprint: "b".repeat(64),
        }),
      /lock.*identity|fingerprint/i,
    );
  });

  it("parses explicit prebuild CLI identity and resume arguments", function () {
    const sourceSha = "a".repeat(40);
    assert.deepEqual(
      parsePrebuildCliArgs(
        [
          "--repo",
          "owner/repo",
          "--ref=feature/prebuild",
          "--source-sha",
          sourceSha,
          "--resume-run-id=77",
        ],
        {
          repo: "default/repo",
          ref: "main",
          sourceSha: "b".repeat(40),
        },
      ),
      {
        repo: "owner/repo",
        ref: "feature/prebuild",
        sourceSha,
        resumeRunId: 77,
      },
    );
  });

  it("requires an attached clean branch whose upstream tip equals HEAD", async function () {
    const head = "a".repeat(40);
    const calls: Array<{ command: string; args: string[] }> = [];
    const state = await assertPrebuildSourceState({
      ref: "dev",
      sourceSha: head,
      commandRunner: async (command, args) => {
        calls.push({ command, args });
        const key = `${command} ${args.join(" ")}`;
        const stdout =
          key === "git branch --show-current"
            ? "dev\n"
            : key === "git status --porcelain"
              ? ""
              : key === "git rev-parse HEAD"
                ? `${head}\n`
                : key ===
                    "git rev-parse --abbrev-ref --symbolic-full-name @{upstream}"
                  ? "origin/dev\n"
                  : key === "git rev-parse @{upstream}"
                    ? `${head}\n`
                    : key === "git rev-parse refs/remotes/origin/dev"
                      ? `${head}\n`
                      : "";
        return { stdout, stderr: "" };
      },
    });

    assert.deepEqual(state, {
      branch: "dev",
      upstream: "origin/dev",
      remote: "origin",
      ref: "dev",
      sourceSha: head,
    });
    assert.deepInclude(calls, {
      command: "git",
      args: ["fetch", "origin", "refs/heads/dev:refs/remotes/origin/dev"],
    });
  });

  it("rejects detached, dirty, missing-upstream, and unpushed prebuild sources", async function () {
    const head = "a".repeat(40);
    const cases = [
      { branch: "", status: "", upstream: "origin/dev", remoteSha: head },
      {
        branch: "dev",
        status: " M package.json\n",
        upstream: "origin/dev",
        remoteSha: head,
      },
      { branch: "dev", status: "", upstream: "", remoteSha: head },
      {
        branch: "dev",
        status: "",
        upstream: "origin/dev",
        remoteSha: "b".repeat(40),
      },
    ];

    for (const fixture of cases) {
      let error: unknown;
      try {
        await assertPrebuildSourceState({
          ref: "dev",
          sourceSha: head,
          commandRunner: async (_command, args) => {
            const key = args.join(" ");
            const stdout =
              key === "branch --show-current"
                ? `${fixture.branch}\n`
                : key === "status --porcelain"
                  ? fixture.status
                  : key === "rev-parse HEAD"
                    ? `${head}\n`
                    : key ===
                        "rev-parse --abbrev-ref --symbolic-full-name @{upstream}"
                      ? `${fixture.upstream}\n`
                      : key === "rev-parse @{upstream}"
                        ? `${fixture.remoteSha}\n`
                        : key === "rev-parse refs/remotes/origin/dev"
                          ? `${fixture.remoteSha}\n`
                          : "";
            return { stdout, stderr: "" };
          },
        });
      } catch (caught) {
        error = caught;
      }
      assert.instanceOf(error, Error);
    }
  });

  it("resumes an exact prebuild run without dispatching another workflow", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-cli-resume-"));
    const head = "a".repeat(40);
    const fingerprint = "b".repeat(64);
    const aggregate = "c".repeat(64);
    const artifact = {
      schema: "host-bridge-cli-prebuild-result.v1",
      repository: "owner/repo",
      workflow: "build-host-bridge-cli-prebuilds.yml",
      runId: 77,
      requestId: "hbcp-resume",
      sourceSha: head,
      ref: "dev",
      cliVersion: "0.3.0",
      buildFingerprint: fingerprint,
      binaryAggregateSha256: aggregate,
      prebuildBranch: "host-bridge-cli-prebuilds",
      prebuildCommit: "d".repeat(40),
      setPath: `sets/${aggregate}`,
    } as const;
    const calls: Array<{ command: string; args: string[] }> = [];
    let synchronizedIdentity: unknown;
    try {
      const result = await prebuildZoteroBridgeCli({
        repo: "owner/repo",
        ref: "dev",
        sourceSha: head,
        resumeRunId: 77,
        artifactRoot: root,
        commandRunner: async (command, args) => {
          calls.push({ command, args });
          const key = `${command} ${args.join(" ")}`;
          if (key === "git branch --show-current") {
            return { stdout: "dev\n", stderr: "" };
          }
          if (key === "git status --porcelain") {
            return { stdout: "", stderr: "" };
          }
          if (
            key === "git rev-parse HEAD" ||
            key === "git rev-parse @{upstream}" ||
            key === "git rev-parse refs/remotes/origin/dev"
          ) {
            return { stdout: `${head}\n`, stderr: "" };
          }
          if (
            key ===
            "git rev-parse --abbrev-ref --symbolic-full-name @{upstream}"
          ) {
            return { stdout: "origin/dev\n", stderr: "" };
          }
          if (key === "gh api repos/owner/repo/actions/runs/77 --method GET") {
            return {
              stdout: JSON.stringify({
                id: 77,
                display_title: "Host Bridge CLI prebuild hbcp-resume",
                event: "workflow_dispatch",
                head_branch: "dev",
                head_sha: head,
                html_url: "https://example.invalid/runs/77",
                path: ".github/workflows/build-host-bridge-cli-prebuilds.yml",
              }),
              stderr: "",
            };
          }
          if (args[0] === "run" && args[1] === "download") {
            await fs.writeFile(
              path.join(root, "host-bridge-cli-prebuild-result.json"),
              JSON.stringify(artifact),
            );
          }
          return { stdout: "", stderr: "" };
        },
        getReleaseStatus: async () => ({
          currentVersion: "0.3.0",
          manifestVersion: "0.3.0",
          fingerprint,
          manifestFingerprint: fingerprint,
        }),
        syncPrebuilds: async ({ identity }) => {
          synchronizedIdentity = identity;
          return { ok: true };
        },
        checkFreshness: async () => ({ ok: true }),
      });

      assert.strictEqual(result.runId, 77);
      assert.deepEqual(synchronizedIdentity, artifact);
      assert.isFalse(
        calls.some(
          ({ command, args }) =>
            command === "gh" && args[0] === "workflow" && args[1] === "run",
        ),
      );
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("reports exact resume evidence when workflow observation fails", async function () {
    const head = "a".repeat(40);
    let caught: unknown;
    try {
      await prebuildZoteroBridgeCli({
        repo: "owner/repo",
        ref: "dev",
        sourceSha: head,
        resumeRunId: 77,
        commandRunner: async (command, args) => {
          const key = `${command} ${args.join(" ")}`;
          if (key === "git branch --show-current") {
            return { stdout: "dev\n", stderr: "" };
          }
          if (key === "git status --porcelain") {
            return { stdout: "", stderr: "" };
          }
          if (
            key === "git rev-parse HEAD" ||
            key === "git rev-parse @{upstream}" ||
            key === "git rev-parse refs/remotes/origin/dev"
          ) {
            return { stdout: `${head}\n`, stderr: "" };
          }
          if (
            key ===
            "git rev-parse --abbrev-ref --symbolic-full-name @{upstream}"
          ) {
            return { stdout: "origin/dev\n", stderr: "" };
          }
          if (key === "gh api repos/owner/repo/actions/runs/77 --method GET") {
            return {
              stdout: JSON.stringify({
                id: 77,
                display_title: "Host Bridge CLI prebuild hbcp-resume",
                event: "workflow_dispatch",
                head_branch: "dev",
                head_sha: head,
                html_url: "https://example.invalid/runs/77",
                path: ".github/workflows/build-host-bridge-cli-prebuilds.yml",
              }),
              stderr: "",
            };
          }
          if (key.startsWith("gh run watch 77 ")) {
            throw new Error("network interrupted");
          }
          return { stdout: "", stderr: "" };
        },
        getReleaseStatus: async () => ({
          currentVersion: "0.3.0",
          manifestVersion: "0.3.0",
          fingerprint: "b".repeat(64),
          manifestFingerprint: "b".repeat(64),
        }),
      });
    } catch (error) {
      caught = error;
    }
    assert.match(String(caught), /--resume-run-id 77/);
    assert.match(String(caught), /hbcp-resume/);
    assert.match(String(caught), /runs\/77/);
  });

  it("rolls back managed binaries and manifests after a partial install failure", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-cli-rollback-"));
    const sourceRoot = path.join(root, "source");
    const oldManifest = '{"schema":"old"}\n';
    try {
      for (const {
        platform,
        binary,
      } of syncHostBridgeCliPrebuildInternalsForTests.expectedPlatforms) {
        const nextBytes = encodeText(`next:${platform}`);
        await writeBinaryFixture(
          sourceRoot,
          `${platform}/${binary}`,
          nextBytes,
        );
        await writeTextFile(
          sourceRoot,
          `${platform}/${binary}.sha256`,
          `${sha256Hex(nextBytes)}  ${binary}\n`,
        );
        const oldBytes = encodeText(`old:${platform}`);
        await writeBinaryFixture(
          root,
          `addon/bin/${platform}/${binary}`,
          oldBytes,
        );
        await writeTextFile(
          root,
          `addon/bin/${platform}/${binary}.sha256`,
          `${sha256Hex(oldBytes)}  ${binary}\n`,
        );
      }
      await writeTextFile(root, "cli/zotero-bridge/release.json", oldManifest);
      await writeTextFile(
        root,
        "addon/bin/zotero-bridge-release.json",
        oldManifest,
      );
      await writeTextFile(
        root,
        "addon/bin/win32-x64/zotero-acp-bridge.exe",
        "unrelated",
      );

      let caught: unknown;
      try {
        await syncHostBridgeCliPrebuildInternalsForTests.replacePrebuildsAndManifests(
          {
            root,
            sourceRoot,
            manifest: { schema: "next" },
            beforeInstall: (_relativePath, index) => {
              if (index === 2) throw new Error("injected install failure");
            },
          },
        );
      } catch (error) {
        caught = error;
      }
      assert.match(String(caught), /injected install failure/);
      for (const {
        platform,
        binary,
      } of syncHostBridgeCliPrebuildInternalsForTests.expectedPlatforms) {
        assert.strictEqual(
          await fs.readFile(
            path.join(root, "addon", "bin", platform, binary),
            "utf8",
          ),
          `old:${platform}`,
        );
      }
      assert.strictEqual(
        await fs.readFile(
          path.join(root, "cli", "zotero-bridge", "release.json"),
          "utf8",
        ),
        oldManifest,
      );
      assert.strictEqual(
        await fs.readFile(
          path.join(root, "addon", "bin", "zotero-bridge-release.json"),
          "utf8",
        ),
        oldManifest,
      );
      assert.strictEqual(
        await fs.readFile(
          path.join(root, "addon", "bin", "win32-x64", "zotero-acp-bridge.exe"),
          "utf8",
        ),
        "unrelated",
      );
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("continues rollback and preserves recovery backups when one restore fails", async function () {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-cli-rollback-recovery-"),
    );
    const targetA = path.join(root, "target-a");
    const targetB = path.join(root, "target-b");
    const backupA = path.join(root, "backup", "target-a");
    const backupB = path.join(root, "backup", "target-b");
    await fs.mkdir(path.dirname(backupA), { recursive: true });
    await fs.writeFile(targetA, "new-a");
    await fs.writeFile(targetB, "new-b");
    await fs.writeFile(backupA, "old-a");
    await fs.writeFile(backupB, "old-b");

    const rollbackErrors =
      await syncHostBridgeCliPrebuildInternalsForTests.rollbackChangedFiles(
        [
          {
            target: targetA,
            backup: backupA,
            hadOriginal: true,
            installed: true,
          },
          {
            target: targetB,
            backup: backupB,
            hadOriginal: true,
            installed: true,
          },
        ],
        (_state, index) => {
          if (index === 1) throw new Error("injected rollback failure");
        },
      );

    assert.lengthOf(rollbackErrors, 1);
    assert.strictEqual(await fs.readFile(targetB, "utf8"), "old-b");
    assert.strictEqual(await fs.readFile(targetA, "utf8"), "new-a");
    assert.strictEqual(await fs.readFile(backupA, "utf8"), "old-a");
    await fs.rm(root, { recursive: true, force: true });
  });

  it("stages one immutable seven-platform prebuild set and reuses it by aggregate", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-cli-store-"));
    const sourceRoot = path.join(root, "addon", "bin");
    const outputRoot = path.join(root, "store");
    const releaseManifest = path.join(root, "release.json");
    const aggregate = "a".repeat(64);
    try {
      for (const {
        platform,
        binary,
      } of syncHostBridgeCliPrebuildInternalsForTests.expectedPlatforms) {
        const bytes = encodeText(`${platform}:${binary}`);
        await writeBinaryFixture(sourceRoot, `${platform}/${binary}`, bytes);
        await writeTextFile(
          sourceRoot,
          `${platform}/${binary}.sha256`,
          `${sha256Hex(bytes)}  ${binary}\n`,
        );
      }
      await fs.writeFile(
        releaseManifest,
        `${JSON.stringify({
          version: "0.3.0",
          buildFingerprint: "b".repeat(64),
          binaryAggregateSha256: aggregate,
        })}\n`,
      );

      const first = await stageHostBridgeCliPrebuildSet({
        outputRoot,
        sourceRoot,
        releaseManifest,
      });
      const second = await stageHostBridgeCliPrebuildSet({
        outputRoot,
        sourceRoot,
        releaseManifest,
      });
      assert.isFalse(first.reused);
      assert.isTrue(second.reused);
      const manifest = JSON.parse(
        await fs.readFile(
          path.join(outputRoot, "sets", aggregate, "manifest.json"),
          "utf8",
        ),
      );
      assert.lengthOf(manifest.archives, 7);
      manifest.archives.pop();
      await fs.writeFile(
        path.join(outputRoot, "sets", aggregate, "manifest.json"),
        `${JSON.stringify(manifest, null, 2)}\n`,
      );
      let incompleteError: unknown;
      try {
        await syncHostBridgeCliPrebuildInternalsForTests.verifyArchiveSet(
          path.join(outputRoot, "sets", aggregate),
          aggregate,
          {
            cliVersion: "0.3.0",
            buildFingerprint: "b".repeat(64),
          },
        );
      } catch (error) {
        incompleteError = error;
      }
      assert.match(String(incompleteError), /exactly seven archives/i);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("renders exhaustive disjoint mechanism command references from the embedded descriptor", async function () {
    const descriptor = JSON.parse(
      await fs.readFile("cli/zotero-bridge/src/agent-surface.json", "utf8"),
    );
    const references = await readCommandReferences(
      "skills_builtin/zotero-bridge-cli",
    );
    const hermesReferences = await readCommandReferences(
      "profiles/hermes/zotero-librarian/skills/zotero-bridge-cli",
    );
    const renderedCommands: string[] = [];
    for (const partition of COMMAND_REFERENCE_PARTITIONS) {
      const reference = references.get(partition.path) || "";
      assert.strictEqual(reference, hermesReferences.get(partition.path));
      const commands = [
        ...reference.matchAll(/^## `zotero-bridge (.+)`$/gm),
      ].map((match) => match[1]);
      renderedCommands.push(...commands);
      for (const command of commands) {
        assert.include(
          partition.roots,
          command.split(" ")[0] as (typeof partition.roots)[number],
          `${command} is rendered in ${partition.path}`,
        );
      }
    }
    assert.deepEqual(
      [...renderedCommands].sort(),
      descriptor.commands
        .map((entry: { command: string }) => entry.command)
        .sort(),
    );
    assert.strictEqual(new Set(renderedCommands).size, renderedCommands.length);
    assert.isFalse(
      await pathExists(
        "skills_builtin/zotero-bridge-cli/references/command-reference.md",
      ),
    );
    assert.notProperty(descriptor, "workflowCatalog");
  });

  it("renders one intent-first command catalog before detailed command selection", async function () {
    const descriptor = JSON.parse(
      await fs.readFile("cli/zotero-bridge/src/agent-surface.json", "utf8"),
    ) as { commands: Array<{ command: string; summary: string }> };
    const catalog = await fs.readFile(
      path.join("skills_builtin/zotero-bridge-cli", COMMAND_CATALOG_PATH),
      "utf8",
    );
    const hermesCatalog = await fs.readFile(
      path.join(
        "profiles/hermes/zotero-librarian/skills/zotero-bridge-cli",
        COMMAND_CATALOG_PATH,
      ),
      "utf8",
    );
    assert.strictEqual(catalog, hermesCatalog);
    for (const partition of COMMAND_REFERENCE_PARTITIONS) {
      assert.include(catalog, `commands/${path.basename(partition.path)}`);
    }
    for (const command of descriptor.commands) {
      const row = `| \`zotero-bridge ${command.command}\` |`;
      assert.strictEqual(
        catalog.split(row).length - 1,
        1,
        `${command.command} must appear once in the compact command index`,
      );
      assert.include(catalog, command.summary);
    }
    for (const cardLabel of [
      "- Argv:",
      "- Payload schema:",
      "- Effects:",
      "- Approval:",
      "- Handle transitions:",
      "- Recovery:",
    ]) {
      assert.notInclude(catalog, cardLabel);
    }
  });

  it("keeps every materialized minimum reference above the hard depth floor", async function () {
    const referenceRoot = "skills_builtin/zotero-bridge-cli/references";
    const files = [
      COMMAND_CATALOG_PATH.replace(/^references\//, ""),
      ...COMMAND_REFERENCE_PARTITIONS.map((partition) => partition.path),
    ];
    for (const file of files) {
      const content = await fs.readFile(path.join(referenceRoot, file), "utf8");
      assert.isAtLeast(
        content.split(/\r?\n/).length,
        200,
        `${file} is too shallow for an unfamiliar agent`,
      );
    }
  });

  it("covers library commands in the generated command reference", async function () {
    const commands = await fs.readFile(
      path.join(process.cwd(), "cli/zotero-bridge/src/commands.rs"),
      "utf8",
    );
    const wrapperReference = await fs.readFile(
      "skills_builtin/zotero-bridge-cli/references/commands/library.md",
      "utf8",
    );
    for (const command of [
      "zotero-bridge library items list",
      "zotero-bridge library snapshot",
      "zotero-bridge library readiness missing-analysis",
    ]) {
      assert.include(wrapperReference, command);
    }
    for (const type of [
      "LibraryItemsCommand::List",
      "LibraryCommand::Snapshot",
      "LibraryReadinessCommand::MissingAnalysis",
    ]) {
      assert.include(commands, type);
    }
  });

  it("covers synthesis topic context in the generated command reference", async function () {
    const cliArgs = await fs.readFile(
      path.join(process.cwd(), "cli/zotero-bridge/src/args.rs"),
      "utf8",
    );
    const wrapperReference = await fs.readFile(
      "skills_builtin/zotero-bridge-cli/references/commands/synthesis.md",
      "utf8",
    );

    assert.include(cliArgs, "topics.get_context");
    assert.include(cliArgs, "get-context");
    assert.include(
      wrapperReference,
      "zotero-bridge synthesis topic get-context",
    );
  });

  it("declares remote Host Bridge profile and master token preference controls", async function () {
    const prefs = await fs.readFile(
      path.join(process.cwd(), "addon/content/preferences.xhtml"),
      "utf8",
    );
    const preferenceScript = await fs.readFile(
      path.join(process.cwd(), "src/modules/preferenceScript.ts"),
      "utf8",
    );
    const docs = await fs.readFile(
      path.join(process.cwd(), "doc/host-bridge-cli.md"),
      "utf8",
    );
    const zhPreferences = await fs.readFile(
      path.join(process.cwd(), "addon/locale/zh-CN/preferences.ftl"),
      "utf8",
    );

    assert.include(prefs, "host-bridge-advertised-host");
    assert.include(prefs, "pref-host-bridge-advertised-host-input");
    assert.include(prefs, "pref-host-bridge-advertised-host-help");
    assert.include(zhPreferences, "发送给远程主机的本机 IP");
    assert.include(zhPreferences, "留空时自动探测");
    assert.include(prefs, "host-bridge-rotate-master-token");
    assert.include(prefs, "host-bridge-copy-master-token");
    assert.include(prefs, "host-bridge-copy-remote-profile");
    assert.include(preferenceScript, "copyHostBridgeRemoteProfile");
    assert.include(preferenceScript, "copyHostBridgeMasterToken");
    assert.include(
      preferenceScript,
      "hostBridgePinPortCheckbox.disabled = lanEnabled",
    );
    assert.include(docs, "manual-remote");
    assert.include(docs, "master token");
  });

  it("uses stable bundled platform directory names", function () {
    const cases = [
      {
        input: { platform: "win32" },
        expected: { dir: "win32-x64", binary: "zotero-bridge.exe" },
      },
      {
        input: { platform: "darwin", arch: "x64" },
        expected: { dir: "darwin-x64", binary: "zotero-bridge" },
      },
      {
        input: { platform: "darwin", arch: "arm64" },
        expected: { dir: "darwin-arm64", binary: "zotero-bridge" },
      },
      {
        input: { platform: "linux", arch: "ia32" },
        expected: { dir: "linux-x86", binary: "zotero-bridge" },
      },
      {
        input: { platform: "linux", arch: "x86" },
        expected: { dir: "linux-x86", binary: "zotero-bridge" },
      },
      {
        input: { platform: "linux", arch: "x64" },
        expected: { dir: "linux-x64", binary: "zotero-bridge" },
      },
      {
        input: { platform: "linux", arch: "arm" },
        expected: { dir: "linux-arm", binary: "zotero-bridge" },
      },
      {
        input: { platform: "linux", arch: "arm64" },
        expected: { dir: "linux-arm64", binary: "zotero-bridge" },
      },
      {
        input: { platform: "linux" },
        expected: { dir: "linux-x64", binary: "zotero-bridge" },
      },
    ];
    for (const entry of cases) {
      assert.deepEqual(
        resolveHostBridgeCliPlatform(entry.input),
        entry.expected,
      );
    }
  });

  it("packages extensionless POSIX zotero-bridge binaries into the XPI", async function () {
    const configSource = await fs.readFile(
      path.join(process.cwd(), "zotero-plugin.config.ts"),
      "utf8",
    );

    assert.include(configSource, "addon/bin/**/zotero-bridge");
  });

  it("preserves executable bits for packaged POSIX binaries and installers", async function () {
    const packageScript = await fs.readFile(
      path.join(process.cwd(), "scripts/package-zotero-bridge-cli.mjs"),
      "utf8",
    );
    const publishScript = await fs.readFile(
      path.join(process.cwd(), "scripts/publish-host-bridge-cli-bundle.ps1"),
      "utf8",
    );
    const releaseWorkflow = await fs.readFile(
      path.join(process.cwd(), ".github/workflows/release-host-bridge.yml"),
      "utf8",
    );

    assert.include(packageScript, "chmod(target, 0o755)");
    assert.include(publishScript, "update-index --chmod=+x install.sh");
    assert.include(publishScript, "$entry.platform -notlike 'win32-*'");
    assert.include(publishScript, "update-index --chmod=+x $entry.binaryPath");
    assert.include(releaseWorkflow, "restore_surface_executable_modes");
    assert.include(releaseWorkflow, 'update-index --chmod=+x "$relative_path"');
    assert.include(
      releaseWorkflow,
      'update-index --chmod=+x "addon/bin/$platform/$binary"',
    );
  });

  it("keeps tracked POSIX Host Bridge artifacts executable", async function () {
    if (process.platform === "win32") {
      this.skip();
    }
    const release = JSON.parse(
      await fs.readFile(
        path.join(process.cwd(), "cli/zotero-bridge/release.json"),
        "utf8",
      ),
    ) as {
      binaries: Array<{ platform: string; binary: string }>;
    };
    const executablePaths = [
      "cli/zotero-bridge/scripts/install.sh",
      ...release.binaries
        .filter((entry) => !entry.platform.startsWith("win32-"))
        .map((entry) => `addon/bin/${entry.platform}/${entry.binary}`),
    ];

    for (const relativePath of executablePaths) {
      const stat = await fs.stat(path.join(process.cwd(), relativePath));
      assert.notEqual(
        stat.mode & 0o111,
        0,
        `${relativePath} must be executable`,
      );
    }
  });

  it("prefers ZOTERO_BRIDGE_CLI env override when available", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-cli-resolver-"));
    const binary = path.join(root, "zotero-bridge.exe");
    await fs.writeFile(binary, "binary");
    const previous = process.env.ZOTERO_BRIDGE_CLI;
    process.env.ZOTERO_BRIDGE_CLI = binary;
    try {
      const resolved = await resolveHostBridgeCliBinary();
      assert.isTrue(resolved.available);
      if (resolved.available) {
        assert.strictEqual(resolved.binaryPath, binary);
        assert.strictEqual(resolved.source, "env");
      }
    } finally {
      if (typeof previous === "string") {
        process.env.ZOTERO_BRIDGE_CLI = previous;
      } else {
        delete process.env.ZOTERO_BRIDGE_CLI;
      }
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("resolves bundled CLI from plugin rootPath before process cwd", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-cli-root-"));
    const platform = resolveHostBridgeCliPlatform({
      platform: process.platform,
      arch: process.arch,
    });
    const binaryDir = path.join(root, "bin", platform.dir);
    const binary = path.join(binaryDir, platform.binary);
    await fs.mkdir(binaryDir, { recursive: true });
    await fs.writeFile(binary, "binary");
    const previousCli = process.env.ZOTERO_BRIDGE_CLI;
    const previousRootPath = (globalThis as { rootPath?: string }).rootPath;
    delete process.env.ZOTERO_BRIDGE_CLI;
    (globalThis as { rootPath?: string }).rootPath = root;
    try {
      const resolved = await resolveHostBridgeCliBinary();
      assert.isTrue(resolved.available);
      if (resolved.available) {
        assert.strictEqual(path.normalize(resolved.binaryPath), binary);
        assert.strictEqual(resolved.source, "bundled");
      }
    } finally {
      if (typeof previousCli === "string") {
        process.env.ZOTERO_BRIDGE_CLI = previousCli;
      }
      if (typeof previousRootPath === "string") {
        (globalThis as { rootPath?: string }).rootPath = previousRootPath;
      } else {
        delete (globalThis as { rootPath?: string }).rootPath;
      }
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("resolves CLI from PATH when no env override or bundled binary is available", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-cli-path-"));
    const pathDir = path.join(root, "path-bin");
    const workspace = path.join(root, "workspace");
    const platform = resolveHostBridgeCliPlatform({
      platform: process.platform,
      arch: process.arch,
    });
    const binary = path.join(pathDir, platform.binary);
    await fs.mkdir(pathDir, { recursive: true });
    await fs.mkdir(workspace, { recursive: true });
    await fs.writeFile(binary, "binary");

    const previousCli = process.env.ZOTERO_BRIDGE_CLI;
    const previousPath = process.env.PATH;
    const previousRootPath = (globalThis as { rootPath?: string }).rootPath;
    const previousCwd = process.cwd();
    delete process.env.ZOTERO_BRIDGE_CLI;
    process.env.PATH = pathDir;
    (globalThis as { rootPath?: string }).rootPath = workspace;
    process.chdir(workspace);
    try {
      const resolved = await resolveHostBridgeCliBinary();
      assert.isTrue(resolved.available);
      if (resolved.available) {
        assert.strictEqual(path.normalize(resolved.binaryPath), binary);
        assert.strictEqual(resolved.source, "path");
      }
    } finally {
      process.chdir(previousCwd);
      if (typeof previousCli === "string") {
        process.env.ZOTERO_BRIDGE_CLI = previousCli;
      } else {
        delete process.env.ZOTERO_BRIDGE_CLI;
      }
      if (typeof previousPath === "string") {
        process.env.PATH = previousPath;
      } else {
        delete process.env.PATH;
      }
      if (typeof previousRootPath === "string") {
        (globalThis as { rootPath?: string }).rootPath = previousRootPath;
      } else {
        delete (globalThis as { rootPath?: string }).rootPath;
      }
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("finds bundled CLI when runtime rootPath points at a nested addon directory", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-cli-nested-"));
    const addonRoot = path.join(root, "build", "addon");
    const contentRoot = path.join(addonRoot, "content");
    const binaryDir = path.join(addonRoot, "bin", "win32-x64");
    const binary = path.join(binaryDir, "zotero-bridge.exe");
    await fs.mkdir(contentRoot, { recursive: true });
    await fs.mkdir(binaryDir, { recursive: true });
    await fs.writeFile(binary, "binary");
    const candidates =
      hostBridgeCliResolverInternalsForTests.buildBundledCandidates({
        roots: [contentRoot],
        platformDir: "win32-x64",
        binary: "zotero-bridge.exe",
      });
    assert.include(
      candidates.map((entry) => path.normalize(entry)),
      binary,
    );
    await fs.rm(root, { recursive: true, force: true });
  });

  it("builds packaged asset candidates from runtime URI and path roots", function () {
    const previousRootUri = (globalThis as { rootURI?: string }).rootURI;
    const previousResourceUri = (globalThis as { resourceURI?: string })
      .resourceURI;
    const previousRootPath = (globalThis as { rootPath?: string }).rootPath;
    (globalThis as { rootURI?: string }).rootURI =
      "https://example.test/addon/";
    (globalThis as { resourceURI?: string }).resourceURI =
      "resource://zotero-skills/";
    (globalThis as { rootPath?: string }).rootPath =
      "C:\\Users\\A\\Zotero\\Profiles\\p\\extensions\\zotero-skills";
    try {
      const candidates =
        packagedAssetResolverInternalsForTests.buildPackagedAssetCandidates(
          "bin/win32-x64/zotero-bridge.exe",
        );
      assert.include(
        candidates.checkedUris,
        "https://example.test/addon/bin/win32-x64/zotero-bridge.exe",
      );
      assert.include(
        candidates.checkedUris,
        "resource://zotero-skills/bin/win32-x64/zotero-bridge.exe",
      );
      assert.isAtLeast(candidates.checkedPaths.length, 2);
    } finally {
      if (typeof previousRootUri === "string") {
        (globalThis as { rootURI?: string }).rootURI = previousRootUri;
      } else {
        delete (globalThis as { rootURI?: string }).rootURI;
      }
      if (typeof previousResourceUri === "string") {
        (globalThis as { resourceURI?: string }).resourceURI =
          previousResourceUri;
      } else {
        delete (globalThis as { resourceURI?: string }).resourceURI;
      }
      if (typeof previousRootPath === "string") {
        (globalThis as { rootPath?: string }).rootPath = previousRootPath;
      } else {
        delete (globalThis as { rootPath?: string }).rootPath;
      }
    }
  });

  it("returns cli_binary_unavailable when no env or bundled binary exists", async function () {
    const previous = process.env.ZOTERO_BRIDGE_CLI;
    delete process.env.ZOTERO_BRIDGE_CLI;
    try {
      const resolved = await resolveHostBridgeCliBinary();
      if (resolved.available) {
        this.skip();
      }
      assert.isFalse(resolved.available);
      if (!resolved.available) {
        assert.strictEqual(resolved.code, "cli_binary_unavailable");
        assert.isAtLeast(resolved.checkedPaths.length, 1);
      }
    } finally {
      if (typeof previous === "string") {
        process.env.ZOTERO_BRIDGE_CLI = previous;
      }
    }
  });

  it("chooses only user-level CLI install targets on POSIX", function () {
    assert.include(
      resolveHostBridgeCliInstallTarget({
        platform: () => "win32",
        localAppDataDir: () => "C:\\Users\\A\\AppData\\Local",
      }).targetPath,
      "zotero-agents",
    );
    assert.strictEqual(
      resolveHostBridgeCliInstallTarget({
        platform: () => "darwin",
        homeDir: () => "/Users/a",
        pathEnv: () => "/opt/homebrew/bin:/usr/bin",
      }).targetPath,
      "/Users/a/.local/bin/zotero-bridge",
    );
    assert.strictEqual(
      resolveHostBridgeCliInstallTarget({
        platform: () => "darwin",
        homeDir: () => "/Users/a",
        pathEnv: () => "/Users/a/bin:/usr/bin",
      }).targetPath,
      "/Users/a/bin/zotero-bridge",
    );
    assert.strictEqual(
      resolveHostBridgeCliInstallTarget({
        platform: () => "darwin",
        homeDir: () => "/Users/a",
        pathEnv: () => "/usr/bin",
      }).targetPath,
      "/Users/a/.local/bin/zotero-bridge",
    );
    assert.strictEqual(
      resolveHostBridgeCliInstallTarget({
        platform: () => "linux",
        homeDir: () => "/home/a",
        pathEnv: () => "/home/a/bin:/usr/bin",
      }).targetPath,
      "/home/a/bin/zotero-bridge",
    );
    assert.strictEqual(
      resolveHostBridgeCliInstallTarget({
        platform: () => "linux",
        homeDir: () => "/home/a",
        pathEnv: () => "/usr/local/bin:/usr/bin",
      }).targetPath,
      "/home/a/.local/bin/zotero-bridge",
    );
  });

  it("marks user-directory fallback installs as requiring shell profile PATH setup", async function () {
    const copied: Array<[string, string]> = [];
    const result = await installHostBridgeCli({
      resolveCli: async () => ({
        available: true,
        binaryPath: "addon/bin/linux-x64/zotero-bridge",
        cliDir: "addon/bin/linux-x64",
        source: "bundled",
      }),
      copyFile: async (source, target) => {
        copied.push([source, target]);
      },
      chmodExecutable: async () => true,
      platform: () => "linux",
      homeDir: () => "/home/a",
      pathEnv: () => "/usr/local/bin:/usr/bin",
      pathIncludes: () => false,
    });

    assert.isTrue(result.ok);
    assert.deepEqual(copied, [
      ["addon/bin/linux-x64/zotero-bridge", "/home/a/.local/bin/zotero-bridge"],
    ]);
    if (result.ok) {
      assert.isFalse(result.pathAlreadyConfigured);
      assert.isTrue(
        (result as { manualPathSetupRequired?: boolean })
          .manualPathSetupRequired,
      );
    }
  });

  it("installs an extensionless Windows shell shim beside the exe", async function () {
    const writes: Array<{ target: string; content: string }> = [];
    const result = await installHostBridgeCli({
      resolveCli: async () => ({
        available: true,
        binaryPath: "addon/bin/win32-x64/zotero-bridge.exe",
        cliDir: "addon/bin/win32-x64",
        source: "bundled",
      }),
      platform: () => "win32",
      localAppDataDir: () => "C:\\Users\\A\\AppData\\Local",
      pathIncludes: () => true,
      copyFile: async () => undefined,
      writeTextFile: async (target, content) => {
        writes.push({ target, content });
      },
      chmodExecutable: async () => undefined,
    });

    assert.isTrue(result.ok);
    assert.deepEqual(
      writes.map((entry) => entry.target),
      ["C:\\Users\\A\\AppData\\Local\\zotero-agents\\bin\\zotero-bridge"],
    );
    assert.include(writes[0]?.content || "", "zotero-bridge.exe");
    assert.include(writes[0]?.content || "", "#!/usr/bin/env sh");
    assert.strictEqual(
      hostBridgeCliInstallerInternalsForTests.resolveWindowsShellShimPath({
        platform: "linux",
        targetDir: "/home/a/.local/bin",
      }),
      "",
    );
  });

  it("writes a well-known local CLI profile with endpoint and token", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-cli-profile-"));
    const previousLocalAppData = process.env.LOCALAPPDATA;
    const previousXdgDataHome = process.env.XDG_DATA_HOME;
    const previousHome = process.env.HOME;
    process.env.LOCALAPPDATA = root;
    process.env.XDG_DATA_HOME = root;
    process.env.HOME = root;
    try {
      const result = await writeHostBridgeWellKnownProfile({
        endpoint: "http://127.0.0.1:26570/bridge/v1",
        token: "well-known-token",
        updatedAt: "2026-05-20T00:00:00.000Z",
      });
      assert.isTrue(result.ok);
      const profilePath = resolveHostBridgeWellKnownProfilePath();
      assert.strictEqual(result.path, profilePath);
      const profile = JSON.parse(await fs.readFile(profilePath, "utf8"));
      assert.strictEqual(profile.schema, "zotero-bridge.profile.v1");
      assert.strictEqual(profile.endpoint, "http://127.0.0.1:26570/bridge/v1");
      assert.strictEqual(profile.connectionMode, "local");
      assert.deepInclude(profile.auth, {
        type: "bearer",
        token: "well-known-token",
      });
      assert.strictEqual(profile.source, "well-known");
    } finally {
      if (typeof previousLocalAppData === "string") {
        process.env.LOCALAPPDATA = previousLocalAppData;
      } else {
        delete process.env.LOCALAPPDATA;
      }
      if (typeof previousXdgDataHome === "string") {
        process.env.XDG_DATA_HOME = previousXdgDataHome;
      } else {
        delete process.env.XDG_DATA_HOME;
      }
      if (typeof previousHome === "string") {
        process.env.HOME = previousHome;
      } else {
        delete process.env.HOME;
      }
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("installs bundled CLI and does not modify PATH when already configured", async function () {
    const copied: Array<[string, string]> = [];
    const result = await installHostBridgeCli({
      resolveCli: async () => ({
        available: true,
        binaryPath: "addon/bin/linux-x64/zotero-bridge",
        cliDir: "addon/bin/linux-x64",
        source: "bundled",
      }),
      platform: () => "linux",
      homeDir: () => "/home/a",
      pathEnv: () => "",
      pathIncludes: () => true,
      copyFile: async (source, target) => {
        copied.push([source, target]);
      },
      chmodExecutable: async () => undefined,
    });

    assert.isTrue(result.ok);
    assert.deepEqual(copied[0], [
      "addon/bin/linux-x64/zotero-bridge",
      "/home/a/.local/bin/zotero-bridge",
    ]);
    if (result.ok) {
      assert.isTrue(result.pathAlreadyConfigured);
      assert.isFalse(result.pathUpdated);
      assert.include(result.message, "PATH is already configured");
    }
  });

  it("installs CLI from packaged asset URI when filesystem resolver misses", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-cli-asset-"));
    const previousRootUri = (globalThis as { rootURI?: string }).rootURI;
    const previousFetch = globalThis.fetch;
    const platform = resolveHostBridgeCliPlatform({
      platform: process.platform,
      arch: process.arch,
    });
    (globalThis as { rootURI?: string }).rootURI =
      "https://example.test/addon/";
    globalThis.fetch = (async (input: string | URL | Request) => {
      const uri = String(input);
      if (!uri.endsWith(`bin/${platform.dir}/${platform.binary}`)) {
        return {
          ok: false,
          status: 404,
          arrayBuffer: async () => new ArrayBuffer(0),
        } as Response;
      }
      const bytes = new TextEncoder().encode("packaged-binary").buffer;
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => bytes,
      } as Response;
    }) as typeof fetch;
    try {
      const result = await installHostBridgeCli({
        resolveCli: async () => ({
          available: false,
          code: "cli_binary_unavailable",
          message: "missing filesystem binary",
          checkedPaths: ["missing"],
        }),
        platform: () => process.platform,
        homeDir: () => root,
        localAppDataDir: () => root,
        pathEnv: () => "",
        pathIncludes: () => true,
        chmodExecutable: async () => undefined,
      });
      assert.isTrue(result.ok);
      if (result.ok) {
        assert.include(result.sourcePath, "https://example.test/addon/");
        const written = await fs.readFile(result.targetPath, "utf8");
        assert.strictEqual(written, "packaged-binary");
      }
    } finally {
      if (typeof previousRootUri === "string") {
        (globalThis as { rootURI?: string }).rootURI = previousRootUri;
      } else {
        delete (globalThis as { rootURI?: string }).rootURI;
      }
      globalThis.fetch = previousFetch;
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("overwrites an existing CLI install target when bundled bytes differ", async function () {
    const writes: Array<{
      target: string;
      content: string;
      overwrite: boolean;
    }> = [];
    const sourceBytes = encodeText("new-binary");
    const targetBytes = encodeText("old-binary");
    const result = await installHostBridgeCli({
      resolveCli: async () => ({
        available: true,
        binaryPath: "addon/bin/win32-x64/zotero-bridge.exe",
        cliDir: "addon/bin/win32-x64",
        source: "bundled",
      }),
      platform: () => "win32",
      localAppDataDir: () => "C:\\Users\\A\\AppData\\Local",
      pathIncludes: () => true,
      readFile: async (target) =>
        target.includes("addon/bin") ? sourceBytes : targetBytes,
      pathExists: async () => true,
      writeFile: async (target, bytes, options) => {
        writes.push({
          target,
          content: new TextDecoder().decode(bytes),
          overwrite: Boolean(options?.overwrite),
        });
      },
      writeTextFile: async () => undefined,
      chmodExecutable: async () => true,
    });

    assert.isTrue(result.ok);
    assert.deepEqual(writes, [
      {
        target:
          "C:\\Users\\A\\AppData\\Local\\zotero-agents\\bin\\zotero-bridge.exe",
        content: "new-binary",
        overwrite: true,
      },
    ]);
    if (result.ok) {
      assert.isTrue(result.changed);
      assert.strictEqual(result.sourceSha256, sha256Hex(sourceBytes));
      assert.strictEqual(result.targetSha256, sha256Hex(sourceBytes));
    }
  });

  it("skips copying matching CLI bytes but still repairs POSIX executable permissions", async function () {
    let writeCount = 0;
    let chmodCount = 0;
    const bytes = encodeText("same-binary");
    const result = await installHostBridgeCli({
      resolveCli: async () => ({
        available: true,
        binaryPath: "addon/bin/linux-x64/zotero-bridge",
        cliDir: "addon/bin/linux-x64",
        source: "bundled",
      }),
      platform: () => "linux",
      homeDir: () => "/home/a",
      pathEnv: () => "",
      pathIncludes: () => true,
      readFile: async () => bytes,
      pathExists: async () => true,
      writeFile: async () => {
        writeCount += 1;
      },
      chmodExecutable: async () => {
        chmodCount += 1;
        return true;
      },
    });

    assert.isTrue(result.ok);
    assert.strictEqual(writeCount, 0);
    assert.strictEqual(chmodCount, 1);
    if (result.ok) {
      assert.isFalse(result.changed);
      assert.isTrue(result.permissionFixed);
      assert.strictEqual(result.sourceSha256, result.targetSha256);
    }
  });

  it("sets executable permissions through XPCOM file objects when available", async function () {
    if (process.platform === "win32") {
      this.skip();
    }
    const runtime = globalThis as typeof globalThis & {
      Components?: unknown;
    };
    const previousComponents = Object.getOwnPropertyDescriptor(
      runtime,
      "Components",
    );
    const file = {
      path: "",
      permissions: 0,
      initWithPath(value: string) {
        this.path = value;
      },
    };
    Object.defineProperty(runtime, "Components", {
      configurable: true,
      writable: true,
      value: {
        classes: {
          "@mozilla.org/file/local;1": {
            createInstance: () => file,
          },
        },
        interfaces: {
          nsIFile: {},
        },
      },
    });
    try {
      const ok = await setRuntimeExecutablePermissions("/tmp/zotero-bridge");
      assert.isTrue(ok);
      assert.strictEqual(file.path, "/tmp/zotero-bridge");
      assert.strictEqual(file.permissions, 0o755);
    } finally {
      if (previousComponents) {
        Object.defineProperty(runtime, "Components", previousComponents);
      } else {
        delete runtime.Components;
      }
    }
  });

  it("does not use a PATH-resolved CLI binary as the install source", async function () {
    const previousRootUri = (globalThis as { rootURI?: string }).rootURI;
    const previousFetch = globalThis.fetch;
    const packagedBytes = encodeText("packaged-current-binary");
    (globalThis as { rootURI?: string }).rootURI =
      "https://example.test/addon/";
    globalThis.fetch = (async () =>
      ({
        ok: true,
        status: 200,
        arrayBuffer: async () => packagedBytes.buffer,
      }) as Response) as typeof fetch;
    try {
      let copiedPathBytes = false;
      const result = await installHostBridgeCli({
        resolveCli: async () => ({
          available: true,
          binaryPath: "C:\\stale\\zotero-bridge.exe",
          cliDir: "C:\\stale",
          source: "path",
        }),
        platform: () => "win32",
        localAppDataDir: () => "C:\\Users\\A\\AppData\\Local",
        pathIncludes: () => true,
        readFile: async () => {
          copiedPathBytes = true;
          return encodeText("stale-path-binary");
        },
        pathExists: async () => false,
        writeFile: async (_target, bytes) => {
          assert.strictEqual(
            new TextDecoder().decode(bytes),
            "packaged-current-binary",
          );
        },
        writeTextFile: async () => undefined,
        chmodExecutable: async () => true,
      });

      assert.isTrue(result.ok);
      assert.isFalse(copiedPathBytes);
      if (result.ok) {
        assert.include(result.sourcePath, "https://example.test/addon/");
      }
    } finally {
      if (typeof previousRootUri === "string") {
        (globalThis as { rootURI?: string }).rootURI = previousRootUri;
      } else {
        delete (globalThis as { rootURI?: string }).rootURI;
      }
      globalThis.fetch = previousFetch;
    }
  });

  it("returns a stable target-busy error when CLI overwrite fails", async function () {
    const result = await installHostBridgeCli({
      resolveCli: async () => ({
        available: true,
        binaryPath: "addon/bin/win32-x64/zotero-bridge.exe",
        cliDir: "addon/bin/win32-x64",
        source: "bundled",
      }),
      platform: () => "win32",
      localAppDataDir: () => "C:\\Users\\A\\AppData\\Local",
      pathIncludes: () => true,
      readFile: async (target) =>
        target.includes("addon/bin")
          ? encodeText("new-binary")
          : encodeText("old-binary"),
      pathExists: async () => true,
      writeFile: async () => {
        const error = new Error("target is busy") as Error & { code: string };
        error.code = "EBUSY";
        throw error;
      },
      writeTextFile: async () => undefined,
    });

    assert.isFalse(result.ok);
    if (!result.ok) {
      assert.strictEqual(result.code, "cli_install_target_busy");
    }
  });

  it("requires explicit Windows confirmation before user PATH update", async function () {
    let copyCount = 0;
    const declined = await installHostBridgeCli({
      resolveCli: async () => ({
        available: true,
        binaryPath: "addon/bin/win32-x64/zotero-bridge.exe",
        cliDir: "addon/bin/win32-x64",
        source: "bundled",
      }),
      platform: () => "win32",
      localAppDataDir: () => "C:\\Users\\A\\AppData\\Local",
      pathIncludes: () => false,
      copyFile: async () => {
        copyCount += 1;
      },
      writeTextFile: async () => undefined,
      chmodExecutable: async () => undefined,
      confirmAddToPath: () => false,
      setWindowsUserPath: async () => {
        throw new Error("must not update path without confirmation");
      },
    });

    assert.isFalse(declined.ok);
    if (!declined.ok) {
      assert.strictEqual(declined.code, "cli_path_update_declined");
    }
    assert.strictEqual(copyCount, 1);

    const accepted = await installHostBridgeCli({
      resolveCli: async () => ({
        available: true,
        binaryPath: "addon/bin/win32-x64/zotero-bridge.exe",
        cliDir: "addon/bin/win32-x64",
        source: "bundled",
      }),
      platform: () => "win32",
      localAppDataDir: () => "C:\\Users\\A\\AppData\\Local",
      pathIncludes: () => false,
      copyFile: async () => undefined,
      writeTextFile: async () => undefined,
      chmodExecutable: async () => undefined,
      confirmAddToPath: () => true,
      setWindowsUserPath: async () => true,
    });

    assert.isTrue(accepted.ok);
    if (accepted.ok) {
      assert.isTrue(accepted.pathUpdated);
      assert.isTrue(accepted.terminalRestartRequired);
      assert.include(accepted.message, "Restart terminals");
    }
  });

  it("updates Windows user PATH through Zotero subprocess when available", async function () {
    const runtime = globalThis as typeof globalThis & {
      Zotero: {
        Utilities?: {
          Internal?: {
            subprocess?: (command: string, args?: string[]) => Promise<string>;
          };
        };
      };
    };
    const previousUtilities = runtime.Zotero.Utilities;
    const previousInternal = runtime.Zotero.Utilities?.Internal;
    const previousSubprocess = runtime.Zotero.Utilities?.Internal?.subprocess;
    const calls: Array<{ command: string; args: string[] }> = [];
    runtime.Zotero.Utilities = runtime.Zotero.Utilities || {};
    runtime.Zotero.Utilities.Internal = runtime.Zotero.Utilities.Internal || {};
    runtime.Zotero.Utilities.Internal.subprocess = async (
      command: string,
      args: string[] = [],
    ) => {
      calls.push({ command, args });
      return "updated";
    };
    try {
      const result = await installHostBridgeCli({
        resolveCli: async () => ({
          available: true,
          binaryPath: "addon/bin/win32-x64/zotero-bridge.exe",
          cliDir: "addon/bin/win32-x64",
          source: "bundled",
        }),
        platform: () => "win32",
        localAppDataDir: () => "C:\\Users\\A\\AppData\\Local",
        pathIncludes: () => false,
        copyFile: async () => undefined,
        writeTextFile: async () => undefined,
        chmodExecutable: async () => undefined,
        confirmAddToPath: () => true,
      });

      assert.isTrue(result.ok);
      if (result.ok) {
        assert.isTrue(result.pathUpdated);
      }
      assert.isAtLeast(calls.length, 1);
      assert.match(calls[0].command, /powershell|pwsh/i);
      assert.include(calls[0].args.join(" "), "SetEnvironmentVariable");
      assert.include(calls[0].args.join(" "), "zotero-agents");
    } finally {
      if (previousInternal) {
        runtime.Zotero.Utilities = runtime.Zotero.Utilities || {};
        runtime.Zotero.Utilities.Internal = previousInternal;
        runtime.Zotero.Utilities.Internal.subprocess = previousSubprocess;
      } else if (runtime.Zotero.Utilities) {
        delete runtime.Zotero.Utilities.Internal;
      }
      if (previousUtilities) {
        runtime.Zotero.Utilities = previousUtilities;
      } else {
        delete runtime.Zotero.Utilities;
      }
    }
  });

  it("governs CLI release fingerprints and patch bumps from CLI build inputs", async function () {
    const governance =
      await import("../../scripts/host-bridge-cli-release-governance.mjs");

    assert.isTrue(
      governance.isHostBridgeCliBuildInputPath("cli/zotero-bridge/src/main.rs"),
    );
    assert.isTrue(
      governance.isHostBridgeCliBuildInputPath(
        "host-bridge/cli-build-recipe.json",
      ),
    );
    assert.isFalse(
      governance.isHostBridgeCliBuildInputPath(
        ".github/workflows/release-host-bridge.yml",
      ),
    );
    assert.isFalse(
      governance.isHostBridgeCliBuildInputPath(
        "scripts/check-zotero-bridge-cli-binary-identity.mjs",
      ),
    );
    assert.isFalse(
      governance.isHostBridgeCliBuildInputPath(
        "skills_builtin/zotero-bridge-cli/SKILL.md",
      ),
    );
    assert.isFalse(
      governance.isHostBridgeCliBuildInputPath(
        "profiles/hermes/zotero-librarian/profile.json",
      ),
    );
    assert.strictEqual(governance.bumpPatchVersion("0.1.0"), "0.1.1");
    assert.include(
      governance.replaceCargoPackageVersion(
        '[package]\nname = "zotero-bridge"\nversion = "0.1.0"\n',
        "0.1.1",
      ),
      'version = "0.1.1"',
    );
    assert.include(
      governance.replaceCargoLockPackageVersion(
        '[[package]]\nname = "zotero-bridge"\nversion = "0.1.0"\n',
        "zotero-bridge",
        "0.1.1",
      ),
      'version = "0.1.1"',
    );
  });

  it("keeps pipeline edits out of the CLI fingerprint while recipe edits change it", async function () {
    const { root, governance } = await createFreshnessFixture();
    try {
      const first = await governance.computeHostBridgeCliBuildFingerprint({
        root,
      });
      await writeTextFile(
        root,
        ".github/workflows/release-host-bridge.yml",
        "name: changed pipeline\n",
      );
      const pipelineChanged =
        await governance.computeHostBridgeCliBuildFingerprint({ root });
      assert.strictEqual(pipelineChanged.fingerprint, first.fingerprint);

      await writeTextFile(
        root,
        "host-bridge/cli-build-recipe.json",
        `${JSON.stringify({ schema: "host-bridge.cli-build-recipe.v2" })}\n`,
      );
      const recipeChanged =
        await governance.computeHostBridgeCliBuildFingerprint({ root });
      assert.notStrictEqual(recipeChanged.fingerprint, first.fingerprint);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("checks Host Bridge CLI prebuild freshness against release manifests", async function () {
    const { root, freshness } = await createFreshnessFixture();
    try {
      const result = await freshness.checkHostBridgeCliPrebuildFreshness({
        root,
      });
      assert.isTrue(result.ok);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("fails Host Bridge CLI freshness when the release fingerprint is stale", async function () {
    const { root, freshness } = await createFreshnessFixture();
    try {
      const manifestPath = path.join(root, "cli/zotero-bridge/release.json");
      const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
      manifest.buildFingerprint = "stale";
      await fs.writeFile(
        manifestPath,
        `${JSON.stringify(manifest, null, 2)}\n`,
      );
      const result = await freshness.checkHostBridgeCliPrebuildFreshness({
        root,
      });
      assert.isFalse(result.ok);
      if (!result.ok) {
        assert.strictEqual(result.code, "host_bridge_cli_fingerprint_stale");
      }
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("fails Host Bridge CLI freshness when binaries belong to another fingerprint", async function () {
    const { root, freshness } = await createFreshnessFixture();
    try {
      const manifestPath = path.join(root, "cli/zotero-bridge/release.json");
      const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
      manifest.binariesBuildFingerprint = "0".repeat(64);
      await fs.writeFile(
        manifestPath,
        `${JSON.stringify(manifest, null, 2)}\n`,
      );
      const result = await freshness.checkHostBridgeCliPrebuildFreshness({
        root,
      });
      assert.isFalse(result.ok);
      if (!result.ok) {
        assert.strictEqual(
          result.code,
          "host_bridge_cli_binary_identity_stale",
        );
      }
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("fails Host Bridge CLI freshness when a binary checksum is stale", async function () {
    const { root, freshness } = await createFreshnessFixture();
    try {
      await fs.writeFile(
        path.join(root, "addon/bin/linux-x64/zotero-bridge"),
        "tampered",
      );
      const result = await freshness.checkHostBridgeCliPrebuildFreshness({
        root,
      });
      assert.isFalse(result.ok);
      if (!result.ok) {
        assert.strictEqual(result.code, "host_bridge_cli_prebuilds_stale");
      }
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("detects missing, stale, and current managed CLI install targets", async function () {
    const bundled = encodeText("bundled");
    const stale = encodeText("stale");
    const targetPath = "/home/a/.local/bin/zotero-bridge";
    const baseDeps = {
      platform: () => "linux",
      homeDir: () => "/home/a",
      pathEnv: () => "/usr/bin",
      readBundledAsset: async (relativePath: string) =>
        relativePath.endsWith("zotero-bridge-release.json")
          ? encodeText('{"version":"0.1.0"}')
          : bundled,
      readInstalledVersion: async () => "",
      hashBytes: async (bytes: Uint8Array) => sha256Hex(bytes),
    };

    const missing = await resolveHostBridgeCliInstallPromptState({
      ...baseDeps,
      runtimePathExists: async () => false,
      readRuntimeFile: async () => {
        throw new Error("must not read missing target");
      },
    });
    assert.strictEqual(missing.status, "missing");
    assert.strictEqual(missing.targetPath, targetPath);
    assert.strictEqual(missing.bundledVersion, "0.1.0");

    const staleResult = await resolveHostBridgeCliInstallPromptState({
      ...baseDeps,
      runtimePathExists: async () => true,
      readRuntimeFile: async () => stale,
    });
    assert.strictEqual(staleResult.status, "stale");

    const newerInstalled = await resolveHostBridgeCliInstallPromptState({
      ...baseDeps,
      runtimePathExists: async () => true,
      readRuntimeFile: async () => stale,
      readInstalledVersion: async () => "0.1.1",
    });
    assert.strictEqual(newerInstalled.status, "current");
    assert.strictEqual(newerInstalled.installedVersion, "0.1.1");
    assert.isFalse(
      shouldPromptHostBridgeCliInstall({
        state: newerInstalled,
        dismissedIdentity: "",
      }),
    );

    const current = await resolveHostBridgeCliInstallPromptState({
      ...baseDeps,
      runtimePathExists: async () => true,
      readRuntimeFile: async () => bundled,
    });
    assert.strictEqual(current.status, "current");
    assert.isFalse(
      shouldPromptHostBridgeCliInstall({
        state: current,
        dismissedIdentity: "",
      }),
    );
  });

  it("deduplicates declined startup CLI prompts by bundled identity", async function () {
    let dismissedIdentity = "";
    let installCount = 0;
    const confirms: boolean[] = [false, true];
    const messages: string[] = [];
    const result = await promptHostBridgeCliInstallOnStartup({
      win: {
        confirm: (message: string) => {
          messages.push(message);
          return confirms.shift() === true;
        },
        alert: () => undefined,
      },
      message: (state) => `install ${state.bundledIdentity}`,
      successMessage: () => "installed",
      failureMessage: () => "failed",
      deps: {
        platform: () => "linux",
        homeDir: () => "/home/a",
        pathEnv: () => "/usr/bin",
        readBundledAsset: async (relativePath) =>
          relativePath.endsWith("zotero-bridge-release.json")
            ? encodeText('{"version":"0.1.0"}')
            : encodeText("bundled"),
        runtimePathExists: async () => false,
        readRuntimeFile: async () => encodeText(""),
        hashBytes: async (bytes) => sha256Hex(bytes),
        getDismissedIdentity: () => dismissedIdentity,
        setDismissedIdentity: (identity) => {
          dismissedIdentity = identity;
        },
        install: async () => {
          installCount += 1;
          return {
            ok: true,
            stage: "host-bridge-cli-install",
            message: "installed",
            sourcePath: "source",
            targetPath: "target",
            targetDir: "dir",
            pathAlreadyConfigured: true,
            pathUpdated: false,
            manualPathSetupRequired: false,
            terminalRestartRequired: false,
            changed: true,
            sourceSha256: "source",
            targetSha256: "source",
            permissionFixed: true,
          };
        },
      },
    });
    assert.isTrue(result.prompted);
    assert.isFalse(result.installed);
    assert.strictEqual(installCount, 0);
    assert.isNotEmpty(dismissedIdentity);

    const suppressed = await promptHostBridgeCliInstallOnStartup({
      win: {
        confirm: () => {
          throw new Error("prompt must be suppressed");
        },
        alert: () => undefined,
      },
      message: (state) => `install ${state.bundledIdentity}`,
      successMessage: () => "installed",
      failureMessage: () => "failed",
      deps: {
        platform: () => "linux",
        homeDir: () => "/home/a",
        pathEnv: () => "/usr/bin",
        readBundledAsset: async (relativePath) =>
          relativePath.endsWith("zotero-bridge-release.json")
            ? encodeText('{"version":"0.1.0"}')
            : encodeText("bundled"),
        runtimePathExists: async () => false,
        readRuntimeFile: async () => encodeText(""),
        hashBytes: async (bytes) => sha256Hex(bytes),
        getDismissedIdentity: () => dismissedIdentity,
      },
    });
    assert.isFalse(suppressed.prompted);

    const promptedAgain = await promptHostBridgeCliInstallOnStartup({
      win: {
        confirm: () => true,
        alert: () => undefined,
      },
      message: (state) => `install ${state.bundledIdentity}`,
      successMessage: () => "installed",
      failureMessage: () => "failed",
      deps: {
        platform: () => "linux",
        homeDir: () => "/home/a",
        pathEnv: () => "/usr/bin",
        readBundledAsset: async (relativePath) =>
          relativePath.endsWith("zotero-bridge-release.json")
            ? encodeText('{"version":"0.1.1"}')
            : encodeText("bundled-new"),
        runtimePathExists: async () => false,
        readRuntimeFile: async () => encodeText(""),
        hashBytes: async (bytes) => sha256Hex(bytes),
        getDismissedIdentity: () => dismissedIdentity,
        install: async () => {
          installCount += 1;
          return {
            ok: true,
            stage: "host-bridge-cli-install",
            message: "installed",
            sourcePath: "source",
            targetPath: "target",
            targetDir: "dir",
            pathAlreadyConfigured: true,
            pathUpdated: false,
            manualPathSetupRequired: false,
            terminalRestartRequired: false,
            changed: true,
            sourceSha256: "source",
            targetSha256: "source",
            permissionFixed: true,
          };
        },
      },
    });
    assert.isTrue(promptedAgain.prompted);
    assert.isTrue(promptedAgain.installed);
    assert.strictEqual(installCount, 1);
    assert.lengthOf(messages, 1);
  });

  it("suppresses startup CLI prompts in non-interactive runtimes", async function () {
    const production = () => "production" as const;
    const development = () => "development" as const;
    const emptyEnv = () => "";

    assert.isFalse(
      shouldRunHostBridgeCliStartupPrompt({
        runtimeEnv: development,
        readEnv: emptyEnv,
      }),
    );
    assert.isTrue(
      shouldRunHostBridgeCliStartupPrompt({
        runtimeEnv: production,
        readEnv: emptyEnv,
      }),
    );
    assert.isFalse(
      shouldRunHostBridgeCliStartupPrompt({
        runtimeEnv: production,
        readEnv: (name) => (name === "CI" ? "true" : ""),
      }),
    );
    assert.isFalse(
      shouldRunHostBridgeCliStartupPrompt({
        runtimeEnv: production,
        readEnv: (name) => (name === "ZOTERO_TEST_MODE" ? "lite" : ""),
      }),
    );
    assert.isFalse(
      shouldRunHostBridgeCliStartupPrompt({
        runtimeEnv: production,
        readEnv: (name) =>
          name === "ZOTERO_AGENTS_DISABLE_HOST_BRIDGE_CLI_STARTUP_PROMPT"
            ? "1"
            : "",
      }),
    );
  });

  it("keeps startup CLI prompt environment policy out of hooks", async function () {
    const hooks = await fs.readFile("src/hooks.ts", "utf8");

    assert.include(hooks, "shouldRunHostBridgeCliStartupPrompt()");
    assert.notInclude(hooks, "typeof __env__");
    assert.notInclude(hooks, "__env__ !==");
  });

  it("ignores PATH-resolved CLI state for startup install prompts", async function () {
    const bundled = encodeText("bundled");
    const state = await resolveHostBridgeCliInstallPromptState({
      platform: () => "linux",
      homeDir: () => "/home/a",
      pathEnv: () => "/old/path/bin:/usr/bin",
      readBundledAsset: async (relativePath) =>
        relativePath.endsWith("zotero-bridge-release.json")
          ? encodeText('{"version":"0.1.0"}')
          : bundled,
      runtimePathExists: async (target) =>
        target === "/home/a/.local/bin/zotero-bridge",
      readRuntimeFile: async () => bundled,
      hashBytes: async (bytes) => sha256Hex(bytes),
    });
    assert.strictEqual(state.status, "current");
    assert.isFalse(
      shouldPromptHostBridgeCliInstall({
        state,
        dismissedIdentity: "",
      }),
    );
  });

  it("declares CLI release packaging workflow and addon bin directories", async function () {
    const workflow = await fs.readFile(
      ".github/workflows/release-host-bridge.yml",
      "utf8",
    );
    const prebuildWorkflow = await fs.readFile(
      ".github/workflows/build-host-bridge-cli-prebuilds.yml",
      "utf8",
    );
    const releaseWorkflow = await fs.readFile(
      ".github/workflows/release.yml",
      "utf8",
    );
    const recipe = JSON.parse(
      await fs.readFile("host-bridge/cli-build-recipe.json", "utf8"),
    );
    for (const platform of [
      "win32-x64",
      "darwin-x64",
      "darwin-arm64",
      "linux-x86",
      "linux-x64",
      "linux-arm",
      "linux-arm64",
    ]) {
      assert.include(JSON.stringify(recipe), platform);
      const stat = await fs.stat(path.join("addon", "bin", platform));
      assert.isTrue(stat.isDirectory());
    }
    for (const rustTarget of [
      "i686-unknown-linux-gnu",
      "x86_64-unknown-linux-gnu",
      "armv7-unknown-linux-gnueabihf",
      "aarch64-unknown-linux-gnu",
      "x86_64-apple-darwin",
      "aarch64-apple-darwin",
    ]) {
      assert.include(JSON.stringify(recipe), rustTarget);
    }
    assert.include(
      prebuildWorkflow,
      "cargo install cargo-zigbuild --locked --version",
    );
    assert.include(prebuildWorkflow, "goto-bus-stop/setup-zig@v2");
    assert.include(
      prebuildWorkflow,
      "node scripts/check-zotero-bridge-cli-binary-identity.mjs",
    );
    assert.include(
      prebuildWorkflow,
      "fromJSON(needs.plan.outputs.build_matrix)",
    );
    assert.include(
      prebuildWorkflow,
      "run-name: Host Bridge CLI prebuild ${{ inputs.request_id }}",
    );
    assert.match(
      prebuildWorkflow,
      /request_id:\s*\n\s+description:.*\n\s+required: true/,
    );
    assert.include(prebuildWorkflow, "host-bridge-cli-prebuild-result.v1");
    assert.include(prebuildWorkflow, "name: host-bridge-cli-prebuild-result");
    assert.include(
      prebuildWorkflow,
      "host-bridge-cli-release-governance.mjs status --json",
    );
    assert.include(prebuildWorkflow, "if: ${{ !matrix.runtimeIdentity }}");
    assert.include(prebuildWorkflow, "if: matrix.runtimeIdentity");
    assert.include(workflow, "group: host-bridge-release");
    assert.include(workflow, "--output=.host-bridge-plan.json");
    assert.include(prebuildWorkflow, "record-binaries --write");
    assert.include(workflow, "npm run render:host-bridge-surface");
    assert.include(
      workflow,
      "npm run check:host-bridge-cli-prebuild-freshness",
    );
    assert.include(workflow, "npm run check:host-bridge-surface");
    assert.include(workflow, "materialize-host-bridge-surfaces.ts");
    assert.include(workflow, "host-bridge-artifacts/surfaces");
    assert.include(workflow, "actions/attest-build-provenance@v2");
    assert.include(workflow, "Publish immutable commits and tags");
    assert.include(workflow, "Verify immutable manifests");
    assert.include(
      workflow,
      "Advance mutable pointers after all immutable surfaces verify",
    );
    assert.include(workflow, "advance_mutable_pointer()");
    assert.include(workflow, 'push --force-with-lease="$remote_ref:$expected"');
    assert.include(
      workflow,
      "advance_mutable_pointer .publish/cli host-bridge/zotero-bridge-cli-bundle",
    );
    assert.notInclude(workflow, "cargo zigbuild");
    assert.notInclude(workflow, "needs.build");
    assert.include(
      workflow,
      'test "$(jq -r .prebuildRequired .host-bridge-plan.json)" = "false"',
    );
    assert.include(
      workflow,
      'aggregate="${{ needs.plan.outputs.cli_aggregate }}"',
    );
    assert.include(workflow, "host-bridge-release-controller.ts");
    assert.notInclude(workflow, "bump-patch --write");
    assert.isBelow(
      workflow.indexOf("npm run check:host-bridge-cli-prebuild-freshness"),
      workflow.indexOf("materialize-host-bridge-surfaces.ts"),
    );
    assert.isBelow(
      workflow.indexOf("Verify immutable manifests"),
      workflow.indexOf(
        "Advance mutable pointers after all immutable surfaces verify",
      ),
    );
    assert.notInclude(workflow, "  push:");
    assert.include(workflow, "source_sha:");
    assert.include(workflow, "request_id:");
    assert.include(workflow, "host-bridge-cli-prebuilds");
    assert.include(workflow, "sets/$aggregate");
    assert.include(
      workflow,
      'fetch --depth=1 origin "refs/heads/${PREBUILD_BRANCH}:refs/remotes/origin/${PREBUILD_BRANCH}"',
    );
    assert.include(
      workflow,
      'checkout -B "$PREBUILD_BRANCH" "origin/$PREBUILD_BRANCH"',
    );
    assert.include(
      prebuildWorkflow,
      'push origin "HEAD:refs/heads/$PREBUILD_BRANCH"',
    );
    assert.notInclude(workflow, "gh release create");
    assert.notInclude(workflow, "gh release download");
    assert.include(workflow, "Finalize source main");
    assert.include(workflow, "latest-complete-release-receipt.json");
    assert.include(workflow, "npm run sync:host-bridge-cli-prebuilds");
    assert.include(workflow, "actions/download-artifact@v4");
    assert.include(
      releaseWorkflow,
      "npm run check:host-bridge-cli-prebuild-freshness",
    );
    assert.include(releaseWorkflow, "npm run test:gate:release");
    assert.isBelow(
      releaseWorkflow.indexOf(
        "npm run check:host-bridge-cli-prebuild-freshness",
      ),
      releaseWorkflow.indexOf("npm run test:gate:release"),
    );
    const ciGate = await fs.readFile("scripts/run-ci-gate.ts", "utf8");
    assert.notInclude(ciGate, "check:host-bridge-cli-prebuild-freshness");
    const packageScript = await fs.readFile(
      "scripts/package-zotero-bridge-cli.mjs",
      "utf8",
    );
    assert.include(packageScript, "sha256");
    assert.include(packageScript, "ZOTERO_BRIDGE_TARGET");
    const buildScript = await fs.readFile(
      "scripts/build-zotero-bridge-cli.mjs",
      "utf8",
    );
    assert.include(buildScript, "cargo-zigbuild is required");
    assert.include(buildScript, "cargo");
    assert.include(buildScript, "zigbuild");
    const publishScript = await fs.readFile(
      "scripts/publish-host-bridge-cli-bundle.ps1",
      "utf8",
    );
    assert.include(publishScript, "assets/profile.template.json");
    assert.include(publishScript, "install.ps1");
    assert.include(publishScript, "install.sh");
    assert.include(publishScript, "installer");
    assert.include(publishScript, "zotero-agents");
    assert.include(publishScript, "ZOTERO_BRIDGE_CONNECTION_MODE");
    assert.include(publishScript, "profileTemplate");
    assert.notInclude(publishScript, "[switch]$BuildLinux");
    assert.notInclude(publishScript, "scripts\\build-zotero-bridge-cli.mjs");
    const syncScript = await fs.readFile(
      "scripts/sync-host-bridge-cli-prebuilds.ts",
      "utf8",
    );
    assert.include(syncScript, "host-bridge-cli-prebuilds");
    assert.include(syncScript, "gh");
    assert.include(syncScript, "--identity-file");
    assert.include(syncScript, "host-bridge-cli-prebuild-result.v1");
    assert.include(syncScript, "replacePrebuildsAndManifests");
    assert.include(syncScript, 'path.join(setDirectory, "manifest.json")');
    assert.include(syncScript, 'path.join("addon", "bin")');
    assert.include(syncScript, "--aggregate");
    assert.notInclude(syncScript, '"release"');
    assert.notInclude(syncScript, "release download");
    const packageJson = JSON.parse(await fs.readFile("package.json", "utf8"));
    assert.strictEqual(
      packageJson.scripts["sync:host-bridge-cli-prebuilds"],
      "tsx scripts/sync-host-bridge-cli-prebuilds.ts",
    );
    assert.strictEqual(
      packageJson.scripts["prebuild:zotero-bridge-cli"],
      "tsx scripts/prebuild-zotero-bridge-cli.ts",
    );
    assert.strictEqual(
      packageJson.scripts["build:local:zotero-bridge-cli"],
      "node scripts/build-zotero-bridge-cli.mjs",
    );
    assert.notInclude(
      packageJson.scripts["build:local:zotero-bridge-cli"],
      "github",
    );
    assert.strictEqual(
      packageJson.scripts["check:zotero-bridge-cli-governance"],
      "node scripts/host-bridge-cli-release-governance.mjs status --json",
    );
    assert.strictEqual(
      packageJson.scripts["check:host-bridge-cli-prebuild-freshness"],
      "node scripts/check-host-bridge-cli-prebuild-freshness.mjs",
    );
    const releaseManifest = JSON.parse(
      await fs.readFile("cli/zotero-bridge/release.json", "utf8"),
    );
    const addonReleaseManifest = JSON.parse(
      await fs.readFile("addon/bin/zotero-bridge-release.json", "utf8"),
    );
    assert.strictEqual(releaseManifest.schema, "zotero-bridge-cli-release.v1");
    assert.strictEqual(
      addonReleaseManifest.schema,
      "zotero-bridge-cli-release.v1",
    );
    assert.strictEqual(addonReleaseManifest.version, releaseManifest.version);
    assert.match(releaseManifest.buildFingerprint, /^[a-f0-9]{64}$/);
    assert.isAtLeast(releaseManifest.binaries.length, 7);
    const releaseSkill = await fs.readFile(
      ".agents/skills/host-bridge-release-pipeline/SKILL.md",
      "utf8",
    );
    assert.include(releaseSkill, "npm run check:host-bridge-content");
    assert.include(workflow, "leike0813/zotero-librarian-profile");
    assert.include(releaseSkill, "check:host-bridge-cli-prebuild-freshness");
    assert.include(releaseSkill, "release-host-bridge.yml");
    assert.include(releaseSkill, "release:host-bridge:dispatch");
    assert.include(releaseSkill, "host-bridge-cli-prebuilds");
    assert.notInclude(releaseSkill, "automatic `push`");
    assert.notInclude(
      releaseSkill,
      "publish-host-bridge-cli-bundle.ps1 -AllowDirty -Push",
    );
    const profileTemplate = JSON.parse(
      await fs.readFile(
        "skills_builtin/zotero-bridge-cli/assets/profile.template.json",
        "utf8",
      ),
    );
    assert.strictEqual(profileTemplate.connectionMode, "local");
    assert.strictEqual(profileTemplate.auth.tokenEnv, "ZOTERO_BRIDGE_TOKEN");
  });

  it("checks cross-compiled CLI identity without executing the target binary", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-cli-identity-"));
    try {
      const version = "0.3.0";
      const buildFingerprint = "a".repeat(64);
      const commandCatalogChecksum = "b".repeat(64);
      const binary = "zotero-bridge";
      await writeTextFile(
        root,
        "cli/zotero-bridge/release.json",
        `${JSON.stringify({ version, buildFingerprint })}\n`,
      );
      await writeTextFile(
        root,
        "cli/zotero-bridge/src/agent-surface.json",
        `${JSON.stringify({
          protocol: "host-bridge.v1",
          cliSchema: "zotero-bridge.cli.v2",
          commandCatalogChecksum,
        })}\n`,
      );
      await writeBinaryFixture(
        root,
        `addon/bin/linux-arm64/${binary}`,
        encodeText(
          [
            version,
            buildFingerprint,
            commandCatalogChecksum,
            "host-bridge.v1",
            "zotero-bridge.cli.v2",
          ].join("\0"),
        ),
      );
      const identity =
        await import("../../scripts/check-zotero-bridge-cli-binary-identity.mjs");
      const current = await identity.checkHostBridgeCliBinaryIdentity({
        root,
        platform: "linux-arm64",
        binary,
      });
      assert.isTrue(current.ok);

      await writeBinaryFixture(
        root,
        `addon/bin/linux-arm64/${binary}`,
        encodeText("wrong binary"),
      );
      const stale = await identity.checkHostBridgeCliBinaryIdentity({
        root,
        platform: "linux-arm64",
        binary,
      });
      assert.isFalse(stale.ok);
      assert.include(stale.missing, buildFingerprint);
      assert.include(stale.missing, commandCatalogChecksum);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("declares the standalone Zotero Library Agent bundle surface", async function () {
    const packageJson = JSON.parse(await fs.readFile("package.json", "utf8"));
    const releaseWorkflow = await fs.readFile(
      ".github/workflows/release-host-bridge.yml",
      "utf8",
    );
    const publisher = await fs.readFile(
      "scripts/publish-zotero-library-agent-bundle.ps1",
      "utf8",
    );
    const surfaces = JSON.parse(
      await fs.readFile("host-bridge/surfaces.json", "utf8"),
    );
    const skill = await fs.readFile(
      "skills_builtin/zotero-library-agent/SKILL.md",
      "utf8",
    );
    const genericSurface = surfaces.surfaces.find(
      (surface: { id: string }) => surface.id === "zotero-library-agent",
    );
    assert.isAtLeast(genericSurface.patch, 0);
    assert.include(skill, "references/research-task-model.md");
    assert.notMatch(skill, /HERMES_HOME|cron|SQLite|run-register/);

    assert.include(releaseWorkflow, "npm run check:host-bridge-surface");
    assert.include(releaseWorkflow, "materialize-host-bridge-surfaces.ts");
    assert.include(releaseWorkflow, "leike0813/zotero-library-agent-bundle");
    assert.include(publisher, "host-bridge.surface-release.v1");
    assert.include(publisher, "skills/zotero-library-agent");
    assert.include(publisher, "skills/zotero-bridge-cli");
    assert.include(publisher, "cli/zotero-bridge/release.json");
    assert.notMatch(publisher, /profiles\/hermes|zotero_librarian_index/);
    assert.strictEqual(
      packageJson.scripts["check:zotero-library-agent-bundle"],
      "tsx scripts/check-host-bridge-skill-packages.ts skills_builtin/zotero-library-agent skills_builtin/zotero-library-query skills_builtin/zotero-literature-acquisition skills_builtin/zotero-literature-analysis skills_builtin/zotero-research-synthesis skills_builtin/zotero-library-curation",
    );
    assert.strictEqual(
      packageJson.scripts["inspect:zotero-library-agent-bundle-version"],
      "tsx scripts/host-bridge-surface-version.ts --surface=zotero-library-agent",
    );
  });

  it("documents agent-friendly bundle installers without platform override", async function () {
    const installPs1 = await fs.readFile(
      "cli/zotero-bridge/scripts/install.ps1",
      "utf8",
    );
    const installSh = await fs.readFile(
      "cli/zotero-bridge/scripts/install.sh",
      "utf8",
    );
    const wrapperSkill = await fs.readFile(
      "skills_builtin/zotero-bridge-cli/SKILL.md",
      "utf8",
    );

    for (const source of [installPs1, installSh]) {
      assert.include(source, "zotero-agents");
      assert.include(source, "ZOTERO_BRIDGE_INSTALL_DIR");
      assert.include(source, "ZOTERO_BRIDGE_TOKEN");
      assert.include(source, "Platform override is not supported");
    }
    for (const partition of COMMAND_REFERENCE_PARTITIONS) {
      assert.include(wrapperSkill, `references/${partition.path}`);
    }
    assert.notInclude(wrapperSkill, "references/operating-contract.md");
  });

  it("renders every public Agent Surface command field into the offline command references", async function () {
    const descriptor = JSON.parse(
      await fs.readFile(
        "skills_builtin/zotero-bridge-cli/assets/agent-surface.json",
        "utf8",
      ),
    );
    const references = await readCommandReferences(
      "skills_builtin/zotero-bridge-cli",
    );
    const reference = [...references.values()].join("\n");
    const count = (label: string) => reference.split(label).length - 1;

    assert.lengthOf(descriptor.commands, 125);
    for (const label of [
      "- Argv: ",
      "- Argv bindings: ",
      "- Invocation schema: ",
      "- Payload schema: ",
      "- Result schema: ",
      "- Pagination: ",
      "- Effects: ",
      "- Approval: ",
      "- Handle transitions: ",
      "- Recovery: ",
      "- Targets: ",
      "- Aliases: ",
      "- Intent search: ",
    ]) {
      assert.strictEqual(count(label), descriptor.commands.length, label);
    }
  });

  it("packages a target-triple release binary into the requested platform directory", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-cli-package-"));
    try {
      const binaryDir = path.join(
        root,
        "cli",
        "zotero-bridge",
        "target",
        "i686-unknown-linux-gnu",
        "release",
      );
      const binary = path.join(binaryDir, "zotero-bridge");
      await fs.mkdir(binaryDir, { recursive: true });
      await fs.writeFile(binary, "linux-x86-binary");
      await execFileAsync(
        process.execPath,
        [
          path.join(process.cwd(), "scripts/package-zotero-bridge-cli.mjs"),
          "--platform=linux-x86",
          "--target=i686-unknown-linux-gnu",
        ],
        { cwd: root },
      );
      const packaged = await fs.readFile(
        path.join(root, "addon", "bin", "linux-x86", "zotero-bridge"),
        "utf8",
      );
      const checksum = await fs.readFile(
        path.join(root, "addon", "bin", "linux-x86", "zotero-bridge.sha256"),
        "utf8",
      );
      assert.strictEqual(packaged, "linux-x86-binary");
      assert.match(checksum, /^[a-f0-9]{64} {2}zotero-bridge\n$/);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
