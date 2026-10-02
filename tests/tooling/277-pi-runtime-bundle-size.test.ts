import { assert } from "chai";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  assertCandidatePiRuntimeBuildIdentity,
  PI_BUNDLE_LIMITS,
  toPiBundleEvidence,
  type PiRuntimeBuildIdentity,
} from "../../src/config/piRuntimeBuild";
import {
  isPiBundleInput,
  normalizePiBundleMeasurement,
  piBundleDiscardReasons,
  readSourceFingerprint,
  renderPiBundleSizeMarkdown,
  toPiRuntimeBundleRecord,
  type PiRuntimeBundleMeasurement,
} from "../../scripts/measure-pi-runtime-bundle";

const candidateIdentity: PiRuntimeBuildIdentity = {
  schema: "zotero-agents.pi-runtime-build.v1",
  enabled: true,
  capacity: 12,
  measurementOnly: false,
  debug: false,
  buildTime: "2026-10-02T00:00:00.000Z",
  source: { commit: "a".repeat(40), clean: false },
};

function variant(name: string, bytes: number, piInputs: string[]) {
  return {
    dist: name,
    enabled: name === "candidate",
    capacity: 12,
    xpiPath: `${name}/zotero-agents.xpi`,
    xpiBytes: bytes * 10,
    xpiSha256: `${name === "candidate" ? "b" : "c"}`.repeat(64),
    jsPath: `${name}/zotero-skills.js`,
    jsBytes: bytes,
    gzipJsBytes: Math.round(bytes / 5),
    identity: { ...candidateIdentity, enabled: name === "candidate" },
    piInputs,
    piInputBytes: piInputs.length,
  };
}

function measurement(
  overrides: Partial<PiRuntimeBundleMeasurement> = {},
): PiRuntimeBundleMeasurement {
  const candidate = variant("candidate", 1000, []);
  const control = variant("control", 400, []);
  return {
    schema: "zotero-agents.pi-runtime-bundle-size.v1",
    sourceCommit: "a".repeat(40),
    dirty: false,
    sameInputs: true,
    browserGuardPassed: true,
    rawBytes: candidate.jsBytes - control.jsBytes,
    gzipBytes: candidate.gzipJsBytes - control.gzipJsBytes,
    xpiDeltaBytes: candidate.xpiBytes - control.xpiBytes,
    candidateDigest: candidate.xpiSha256,
    controlDigest: control.xpiSha256,
    excludedFully: true,
    withinLimits: true,
    exceededLimits: [],
    candidate,
    control,
    inputs: {
      sourceCommit: "a".repeat(40),
      lockSha256: "d".repeat(64),
      settingsSha256: "e".repeat(64),
      capacity: 12,
      candidateDefines: { __PI_RUNTIME_ENABLED__: "true" },
      controlDefines: { __PI_RUNTIME_ENABLED__: "false" },
    },
    ...overrides,
  };
}

describe("Pi runtime bundle size", () => {
  it("classifies project and package Pi inputs only", () => {
    assert.isTrue(isPiBundleInput("src/modules/piConversation.ts"));
    assert.isTrue(isPiBundleInput("src/shared/piFailureContract.ts"));
    assert.isTrue(
      isPiBundleInput("src/modules/pluginStateStore/piOwnerTable.ts"),
    );
    assert.isTrue(
      isPiBundleInput("node_modules/@earendil-works/pi-ai/dist/index.js"),
    );
    assert.isTrue(
      isPiBundleInput("node_modules/@oh-my-pi/pi-catalog/src/models.json"),
    );
    assert.isFalse(
      isPiBundleInput("src/modules/acp/chat/acpSessionManager.ts"),
    );
    assert.isFalse(
      isPiBundleInput("node_modules/preact/dist/preact.module.js"),
    );
  });

  it("rejects invalid measurement records instead of defaulting to zero", () => {
    assert.throws(
      () =>
        normalizePiBundleMeasurement({
          ...measurement(),
          rawBytes: Number.NaN,
        }),
      /measurement_invalid:rawBytes/,
    );
    assert.throws(
      () =>
        normalizePiBundleMeasurement({ ...measurement(), xpiDeltaBytes: -1 }),
      /measurement_invalid:xpiDeltaBytes/,
    );
    assert.throws(
      () =>
        normalizePiBundleMeasurement({
          ...measurement(),
          sourceCommit: "short",
        }),
      /measurement_invalid:sourceCommit/,
    );
    assert.throws(
      () =>
        normalizePiBundleMeasurement({
          ...measurement(),
          candidateDigest: "x",
        }),
      /measurement_invalid:candidateDigest/,
    );
    assert.equal(normalizePiBundleMeasurement(measurement()).rawBytes, 600);
  });

  it("accepts a source-bound candidate stamp and rejects a control stamp", () => {
    assert.equal(
      assertCandidatePiRuntimeBuildIdentity(candidateIdentity).capacity,
      12,
    );
    assert.throws(
      () =>
        assertCandidatePiRuntimeBuildIdentity({
          ...candidateIdentity,
          enabled: false,
          measurementOnly: true,
        }),
      /control_build_is_not_a_candidate/,
    );
    assert.throws(
      () =>
        assertCandidatePiRuntimeBuildIdentity({
          ...candidateIdentity,
          source: { commit: "deadbeef", clean: true },
        }),
      /identity_invalid/,
    );
    assert.throws(
      () =>
        assertCandidatePiRuntimeBuildIdentity({
          ...candidateIdentity,
          debug: "no",
        }),
      /identity_invalid/,
    );
  });

  it("preserves an incomplete exclusion as a discard instead of a pass", () => {
    const incomplete = measurement({
      excludedFully: false,
      control: variant("control", 400, ["src/modules/piConversation.ts"]),
    });
    assert.isFalse(incomplete.excludedFully);
    assert.deepEqual(piBundleDiscardReasons(incomplete), [
      "control-still-contains-pi",
    ]);
    const record = toPiRuntimeBundleRecord(incomplete, {
      artifact: "artifacts/pi-runtime-bundle.json",
    });
    assert.isFalse(record.bundle.excludedFully);
    assert.deepEqual(record.discarded, ["control-still-contains-pi"]);
    assert.equal(record.candidateDigest, incomplete.candidate.xpiSha256);
    assert.equal(record.id, "bundle");
    assert.equal(record.status, "failed");
    assert.equal(record.candidate.xpiSha256, incomplete.candidateDigest);
    assert.match(record.candidate.version, /^\d+\.\d+\.\d+/);
    assert.equal(record.artifact, "artifacts/pi-runtime-bundle.json");
  });

  it("flags dirty and same-input violations and reports limit excess", () => {
    assert.deepEqual(
      piBundleDiscardReasons(measurement({ dirty: true, sameInputs: false })),
      ["inputs-not-identical", "dirty-worktree"],
    );
    const over = measurement({ rawBytes: PI_BUNDLE_LIMITS.rawBytes + 1 });
    assert.include(
      renderPiBundleSizeMarkdown({
        ...over,
        exceededLimits: ["rawBytes"],
        withinLimits: false,
      }),
      "Exceeded review thresholds: rawBytes",
    );
    assert.deepEqual(toPiBundleEvidence(measurement()), {
      rawBytes: 600,
      gzipBytes: 120,
      xpiDeltaBytes: 6000,
      sameInputs: true,
      browserGuardPassed: true,
      excludedFully: true,
    });
  });

  it("detects an untracked source content change between two builds", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "pi-fingerprint-"));
    const git = (args: string[]) =>
      execFileSync("git", args, { cwd: root, stdio: "pipe" });
    git(["init", "-q"]);
    fs.writeFileSync(path.join(root, "package-lock.json"), "{}\n");
    fs.writeFileSync(path.join(root, "tracked.ts"), "export const a = 1;\n");
    git(["add", "tracked.ts", "package-lock.json"]);
    git(["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qm", "init"]);
    fs.writeFileSync(path.join(root, "untracked.ts"), "export const b = 1;\n");
    const before = await readSourceFingerprint(root);
    // Same paths, same git status, different content: only hashing the
    // untracked bytes catches this inner-loop edit.
    fs.writeFileSync(path.join(root, "untracked.ts"), "export const b = 2;\n");
    const after = await readSourceFingerprint(root);
    assert.equal(before.head, after.head);
    assert.notEqual(before.worktreeSha256, after.worktreeSha256);
  });
});
