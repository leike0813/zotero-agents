import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  analyzeReleaseGate,
  parseReleaseGateCliArgs,
  type ReleaseGateCommandRunner,
} from "../../../scripts/release-coordinator-gate";

function commandRunner(
  overrides?: Record<string, string | Error>,
): ReleaseGateCommandRunner {
  const defaults: Record<string, string | Error> = {
    "git status --porcelain": "",
    "git branch --show-current": "main\n",
    "git rev-parse --verify HEAD": "abc123\n",
    "git describe --tags --abbrev=0": "v0.5.3\n",
    "git diff --name-only v0.5.3..HEAD": "",
    "git rev-list --left-right --count HEAD...origin/main": "0\t0\n",
    "git rev-list --left-right --count HEAD...gitee/main": "0\t0\n",
    "git ls-remote --tags origin refs/tags/v0.5.5": "",
    "git ls-remote --tags gitee refs/tags/v0.5.5": "",
    "git tag --list v0.5.5": "",
    "gh release view v0.5.5 --repo leike0813/zotero-agents": "",
  };
  const responses = { ...defaults, ...(overrides || {}) };
  return async (command, args) => {
    const key = [command, ...args].join(" ");
    const response = responses[key];
    if (response instanceof Error) {
      throw response;
    }
    return {
      stdout: response || "",
      stderr: "",
    };
  };
}

async function withPackageVersion<T>(
  version: string,
  callback: (packageJsonPath: string) => Promise<T>,
) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-release-gate-"));
  try {
    const packageJsonPath = path.join(root, "package.json");
    await fs.writeFile(packageJsonPath, JSON.stringify({ version }), "utf8");
    return await callback(packageJsonPath);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

function blockerCodes(report: Awaited<ReturnType<typeof analyzeReleaseGate>>) {
  return report.blockers.map((blocker) => blocker.code);
}

describe("release coordinator gate", function () {
  it("reports ready_to_release when release gates and remote state are clean", async function () {
    await withPackageVersion("0.5.4", async (packageJsonPath) => {
      const report = await analyzeReleaseGate({
        packageJsonPath,
        targetVersion: "v0.5.5",
        commandRunner: commandRunner(),
        testNodeFullPassed: true,
        lintCheckPassed: true,
        contentPackageReleaseVerified: true,
      });

      assert.equal(report.schema, "zotero-agents.release-gate.v1");
      assert.equal(report.next_action, "ready_to_release");
      assert.deepEqual(report.blockers, []);
      assert.include(report.suggested_commands, "npm run release -- v0.5.5");
    });
  });

  it("blocks dirty working trees before any release action", async function () {
    await withPackageVersion("0.5.4", async (packageJsonPath) => {
      const report = await analyzeReleaseGate({
        packageJsonPath,
        targetVersion: "v0.5.5",
        commandRunner: commandRunner({
          "git status --porcelain": [
            " M addon/bin/win32-x64/zotero-bridge.exe",
            "M  addon/bin/win32-x64/zotero-bridge.exe.sha256",
          ].join("\n"),
        }),
        testNodeFullPassed: true,
        lintCheckPassed: true,
      });

      assert.equal(report.next_action, "resolve_blockers");
      assert.include(blockerCodes(report), "dirty_worktree");
      assert.deepEqual(report.blockers[0].details?.files, [
        "addon/bin/win32-x64/zotero-bridge.exe",
        "addon/bin/win32-x64/zotero-bridge.exe.sha256",
      ]);
    });
  });

  it("routes Host Bridge candidate changes to the Host Bridge pipeline", async function () {
    await withPackageVersion("0.5.4", async (packageJsonPath) => {
      const report = await analyzeReleaseGate({
        packageJsonPath,
        targetVersion: "v0.5.5",
        changedFiles: ["cli/zotero-bridge/src/main.rs"],
        commandRunner: commandRunner(),
        testNodeFullPassed: true,
        lintCheckPassed: true,
        contentPackageReleaseVerified: true,
      });

      assert.equal(report.next_action, "run_host_bridge_pipeline");
      assert.isTrue(report.host_bridge.required);
      assert.include(blockerCodes(report), "host_bridge_pipeline_required");
    });
  });

  it("requires content package verification for content package candidate changes", async function () {
    await withPackageVersion("0.5.4", async (packageJsonPath) => {
      const report = await analyzeReleaseGate({
        packageJsonPath,
        targetVersion: "v0.5.5",
        changedFiles: ["workflows_builtin/manifest.json"],
        commandRunner: commandRunner(),
        testNodeFullPassed: true,
        lintCheckPassed: true,
      });

      assert.equal(report.next_action, "publish_content_package");
      assert.isTrue(report.content_package.candidate);
      assert.include(
        blockerCodes(report),
        "content_package_release_not_verified",
      );
    });
  });

  it("blocks release when main is not synced to a remote", async function () {
    await withPackageVersion("0.5.4", async (packageJsonPath) => {
      const report = await analyzeReleaseGate({
        packageJsonPath,
        targetVersion: "v0.5.5",
        commandRunner: commandRunner({
          "git rev-list --left-right --count HEAD...gitee/main": "1\t0\n",
        }),
        testNodeFullPassed: true,
        lintCheckPassed: true,
        contentPackageReleaseVerified: true,
      });

      assert.equal(report.next_action, "sync_main_remotes");
      assert.include(blockerCodes(report), "main_not_synced_gitee");
    });
  });

  it("routes existing target tags to recovery", async function () {
    await withPackageVersion("0.5.4", async (packageJsonPath) => {
      const report = await analyzeReleaseGate({
        packageJsonPath,
        targetVersion: "v0.5.5",
        commandRunner: commandRunner({
          "git tag --list v0.5.5": "v0.5.5\n",
        }),
        testNodeFullPassed: true,
        lintCheckPassed: true,
        contentPackageReleaseVerified: true,
      });

      assert.equal(report.next_action, "recover_release_state");
      assert.include(blockerCodes(report), "target_tag_exists_local");
    });
  });

  it("parses CLI evidence flags", function () {
    const args = parseReleaseGateCliArgs([
      "--target",
      "v0.5.5",
      "--changed-file",
      "cli/zotero-bridge/src/main.rs",
      "--host-bridge-done",
      "--test-node-full-passed",
      "--lint-check-passed",
      "--content-package-release-verified",
      "--content-package-mirror-verified",
    ]);

    assert.equal(args.targetVersion, "v0.5.5");
    assert.deepEqual(args.changedFiles, ["cli/zotero-bridge/src/main.rs"]);
    assert.isTrue(args.hostBridgeDone);
    assert.isTrue(args.testNodeFullPassed);
    assert.isTrue(args.lintCheckPassed);
    assert.isTrue(args.contentPackageReleaseVerified);
    assert.isTrue(args.contentPackageMirrorVerified);
  });
});
