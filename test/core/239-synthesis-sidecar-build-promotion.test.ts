import { assert } from "chai";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SYNTHESIS_SIDECAR_RUNTIME_TARGETS } from "../../packages/synthesis-contracts/src/sidecarRuntimeBundle";
import { rebuildSynthesisSidecarRuntimePrebuildResult } from "../../packages/synthesis-contracts/src/sidecarRuntimeRelease";
import {
  createSynthesisSidecarRuntimeReleaseSet,
  rebuildSynthesisSidecarRuntimeReleaseSet,
  type SynthesisSidecarRuntimeReleaseIdentities,
} from "../../scripts/synthesis-sidecar-runtime-release-set";
import {
  assertSynthesisSidecarBundleReplacement,
  assertSynthesisSidecarPrebuildSourceState,
  parseSynthesisSidecarPrebuildArgs,
} from "../../scripts/dispatch-synthesis-sidecar-prebuild";
import { publishImmutableSynthesisSidecarRuntimeSet } from "../../scripts/publish-synthesis-sidecar-runtime-prebuild";
import { assertSynthesisSidecarReleaseDispatchCheckout } from "../../scripts/dispatch-synthesis-sidecar-release";

const sourceCommit = "1".repeat(40);
const identities: SynthesisSidecarRuntimeReleaseIdentities = {
  sourceFingerprint: "2".repeat(64),
  buildFingerprint: "3".repeat(64),
  verificationFingerprint: "4".repeat(64),
  prebuildPipelineRevision: "5".repeat(64),
  verificationPipelineRevision: "6".repeat(64),
  releasePipelineRevision: "7".repeat(64),
};

function prebuildResult() {
  return {
    schema: "synthesis-sidecar-runtime-prebuild-result.v4",
    repository: "example/zotero-agents",
    workflow: "prebuild-synthesis-sidecar-runtime.yml",
    runId: 101,
    requestId: "dev-101",
    sourceSha: sourceCommit,
    sourceFingerprint: identities.sourceFingerprint,
    buildFingerprint: identities.buildFingerprint,
    prebuildPipelineRevision: identities.prebuildPipelineRevision,
    aggregate: "8".repeat(64),
    prebuildBranch: "synthesis-sidecar-runtime-prebuilds",
    prebuildCommit: "9".repeat(40),
    setPath: `sets/${"8".repeat(64)}`,
    targets: Object.fromEntries(
      SYNTHESIS_SIDECAR_RUNTIME_TARGETS.map((target) => [
        target,
        {
          mode: "built",
          artifactRunId: 101,
          artifactSourceSha: sourceCommit,
          archiveSha256: "a".repeat(64),
          archiveBytes: 100,
          smoke: [
            "win32-x64",
            "darwin-x64",
            "darwin-arm64",
            "linux-x64",
            "linux-arm64",
          ].includes(target)
            ? { status: "passed", runId: 101 }
            : { status: "not_applicable" },
        },
      ]),
    ),
  };
}

function verificationResult(runId = 202) {
  return {
    schema: "synthesis-sidecar-verification-result.v2",
    repository: "example/zotero-agents",
    workflow: "verify-synthesis-sidecar.yml",
    runId,
    event: "push",
    sourceSha: "b".repeat(40),
    sourceFingerprint: identities.sourceFingerprint,
    buildFingerprint: identities.buildFingerprint,
    verificationFingerprint: identities.verificationFingerprint,
    verificationPipelineRevision: identities.verificationPipelineRevision,
    hosts: { linux: "passed", windows: "passed", macos: "passed" },
  };
}

describe("Synthesis sidecar build promotion", function () {
  it("keeps prebuild evidence build-only and strict", function () {
    const result =
      rebuildSynthesisSidecarRuntimePrebuildResult(prebuildResult());
    assert.equal(result.schema, "synthesis-sidecar-runtime-prebuild-result.v4");
    assert.notProperty(result, "verification");
    assert.throws(() =>
      rebuildSynthesisSidecarRuntimePrebuildResult({
        ...prebuildResult(),
        verification: { runId: 202 },
      }),
    );
  });

  it("joins independently produced build and verification evidence once", function () {
    const releaseSet = createSynthesisSidecarRuntimeReleaseSet({
      sourceCommit,
      prebuildResult: prebuildResult(),
      verificationResult: verificationResult(),
      identities,
    });
    assert.equal(releaseSet.schema, "synthesis-sidecar-runtime-release-set.v2");
    assert.equal(releaseSet.prebuild.runId, 101);
    assert.equal(releaseSet.verification.runId, 202);
    assert.deepEqual(
      rebuildSynthesisSidecarRuntimeReleaseSet(releaseSet),
      releaseSet,
    );

    const successor = createSynthesisSidecarRuntimeReleaseSet({
      sourceCommit,
      prebuildResult: prebuildResult(),
      verificationResult: verificationResult(203),
      identities,
    });
    assert.notEqual(successor.releaseSetId, releaseSet.releaseSetId);
    assert.throws(() =>
      rebuildSynthesisSidecarRuntimeReleaseSet({
        ...releaseSet,
        releaseSetId: "ssrs-tampered",
      }),
    );
  });

  it("admits unrelated dirty paths but protects sidecar bundle roots", async function () {
    const commands: Array<{ command: string; args: string[] }> = [];
    const responses = [
      "feature/prebuild\n",
      `${sourceCommit}\n`,
      "",
      "origin/feature/prebuild\n",
      "",
      `${sourceCommit}\n`,
      " M doc/notes.md\n",
    ];
    const source = await assertSynthesisSidecarPrebuildSourceState({
      ref: "feature/prebuild",
      sourceSha: sourceCommit,
      commandRunner: async (command, args) => {
        commands.push({ command, args });
        return { stdout: responses.shift() || "", stderr: "" };
      },
    });
    assert.deepEqual(source.dirtyPaths, ["doc/notes.md"]);
    assert.deepInclude(commands, {
      command: "git",
      args: [
        "fetch",
        "origin",
        "refs/heads/feature/prebuild:refs/remotes/origin/feature/prebuild",
      ],
    });
    assert.deepEqual(
      assertSynthesisSidecarBundleReplacement({
        dirtyPaths: ["doc/notes.md"],
      }),
      [],
    );
    assert.throws(() =>
      assertSynthesisSidecarBundleReplacement({
        dirtyPaths: ["addon/bin/linux-x64/synthesis-sidecar/synthesis-sidecar"],
      }),
    );
    assert.deepEqual(
      assertSynthesisSidecarBundleReplacement({
        dirtyPaths: ["addon/bin/linux-x64/synthesis-sidecar/synthesis-sidecar"],
        overwriteDirtyBundles: true,
      }),
      ["addon/bin/linux-x64/synthesis-sidecar/synthesis-sidecar"],
    );
  });

  it("parses dispatch, resume, and explicit overwrite options", function () {
    assert.deepEqual(
      parseSynthesisSidecarPrebuildArgs([
        "--repo=example/zotero-agents",
        "--ref",
        "feature/prebuild",
        "--source-sha",
        sourceCommit,
        "--resume-run-id=123",
        "--overwrite-dirty-bundles",
      ]),
      {
        repo: "example/zotero-agents",
        ref: "feature/prebuild",
        sourceSha: sourceCommit,
        resumeRunId: 123,
        overwriteDirtyBundles: true,
      },
    );
  });

  it("appends immutable sets without depending on the branch head", async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "ss-prebuild-publish-"));
    const remote = path.join(root, "remote.git");
    execFileSync("git", ["init", "--bare", remote]);
    const first = path.join(root, "first");
    const second = path.join(root, "second");
    fs.mkdirSync(first);
    fs.mkdirSync(second);
    fs.mkdirSync(path.join(root, "attempt-first"));
    fs.writeFileSync(path.join(first, "manifest.json"), "first\n");
    fs.writeFileSync(path.join(second, "manifest.json"), "second\n");

    const firstCommit = await publishImmutableSynthesisSidecarRuntimeSet({
      remote,
      temporaryRoot: path.join(root, "attempt-first"),
      candidateSet: first,
      aggregate: "a".repeat(64),
    });
    fs.mkdirSync(path.join(root, "attempt-second"));
    const secondCommit = await publishImmutableSynthesisSidecarRuntimeSet({
      remote,
      temporaryRoot: path.join(root, "attempt-second"),
      candidateSet: second,
      aggregate: "b".repeat(64),
    });
    assert.notEqual(secondCommit, firstCommit);
    const tree = execFileSync(
      "git",
      ["--git-dir", remote, "ls-tree", "-r", "--name-only", secondCommit],
      { encoding: "utf8" },
    );
    assert.include(tree, `sets/${"a".repeat(64)}/manifest.json`);
    assert.include(tree, `sets/${"b".repeat(64)}/manifest.json`);

    fs.writeFileSync(path.join(first, "manifest.json"), "tampered\n");
    fs.mkdirSync(path.join(root, "attempt-conflict"));
    await publishImmutableSynthesisSidecarRuntimeSet({
      remote,
      temporaryRoot: path.join(root, "attempt-conflict"),
      candidateSet: first,
      aggregate: "a".repeat(64),
    }).then(
      () => assert.fail("expected immutable set conflict"),
      (error) =>
        assert.include(
          error instanceof Error ? error.message : String(error),
          "Immutable prebuild set already exists with other bytes",
        ),
    );
  });

  it("keeps the sidecar source separate from the prepared release-set commit", function () {
    const preparedCommit = "c".repeat(40);
    assert.doesNotThrow(() =>
      assertSynthesisSidecarReleaseDispatchCheckout({
        branch: "main",
        status: "",
        sourceCommit,
        preparedCommit,
        remoteCommit: preparedCommit,
      }),
    );
    assert.throws(() =>
      assertSynthesisSidecarReleaseDispatchCheckout({
        branch: "main",
        status: "",
        sourceCommit,
        preparedCommit,
        remoteCommit: sourceCommit,
      }),
    );
  });
});
