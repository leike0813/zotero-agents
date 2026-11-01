import { assert } from "chai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  appendSynthesisProtocolExecutionEvidence,
  appendSynthesisProtocolObservation,
  beginSynthesisProtocolExecutionScope,
  readSynthesisProtocolExecutionEvidence,
  readSynthesisProtocolObservations,
  synthesisProtocolExecutionIdentity,
  SynthesisProtocolExecutionIdentityChangedError,
} from "../../scripts/synthesis/synthesisProtocolExecutionEvidence";

const SOURCE_FILES = [
  "packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/registry.json",
  "packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/literature-score-artifact.schema.json",
  "packages/synthesis-contracts/src/workflow.ts",
  "src/modules/synthesisClient/nativeComposition.ts",
  "src/modules/synthesis/sidecar/client.ts",
  "src/modules/synthesis/reverseHost/endpoint.ts",
  "workflows_builtin/package/hook.mjs",
  "src/modules/zoteroHost/adapter.ts",
  "src/modules/zoteroHostCapabilityBroker.ts",
  "rust/synthesis-sidecar/crates/runtime/src/lib.rs",
  "rust/synthesis-sidecar/crates/runtime/src/schema.sql",
  "tests/fixtures/synthesis-sidecar-migration/observable.json",
  "tests/helpers/harness.ts",
  "tests/synthesis/producer.test.ts",
  "tests/workflow-literature-analysis/producer.test.ts",
  "tests/workflow-literature-workbench-package/producer.test.ts",
  "scripts/synthesis/check-synthesis-native-worker-transfer-parity.ts",
  "scripts/synthesis/check-synthesis-cross-language-contracts.ts",
  "scripts/synthesis/synthesisProtocolStructureCoverage.ts",
  "scripts/synthesis/synthesisProtocolExecutionEvidence.ts",
];

function binaryFile(
  root: string,
  targetDirectory = "rust/synthesis-sidecar/target",
) {
  return path.join(
    root,
    targetDirectory,
    "debug",
    `synthesis-sidecar${process.platform === "win32" ? ".exe" : ""}`,
  );
}

function createWorkspace(targetDirectory = "rust/synthesis-sidecar/target") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "synthesis-evidence-"));
  for (const file of SOURCE_FILES) {
    const fullPath = path.join(root, file);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, "initial");
  }
  const binary = binaryFile(root, targetDirectory);
  fs.mkdirSync(path.dirname(binary), { recursive: true });
  fs.writeFileSync(binary, "initial");
  return root;
}

function rewriteKeepingTimestamp(file: string, contents: string) {
  const { atime, mtime } = fs.statSync(file);
  fs.writeFileSync(file, contents);
  fs.utimesSync(file, atime, mtime);
}

function removeWorkspace(root: string) {
  fs.rmSync(root, { recursive: true, force: true });
}

describe("Synthesis execution evidence freshness", function () {
  let originalCargoTarget: string | undefined;
  let originalEvidenceRoot: string | undefined;

  beforeEach(function () {
    originalCargoTarget = process.env.CARGO_TARGET_DIR;
    originalEvidenceRoot = process.env.ZOTERO_SYNTHESIS_PROTOCOL_EVIDENCE_DIR;
    delete process.env.CARGO_TARGET_DIR;
    delete process.env.ZOTERO_SYNTHESIS_PROTOCOL_EVIDENCE_DIR;
  });

  afterEach(function () {
    if (originalCargoTarget === undefined) delete process.env.CARGO_TARGET_DIR;
    else process.env.CARGO_TARGET_DIR = originalCargoTarget;
    if (originalEvidenceRoot === undefined)
      delete process.env.ZOTERO_SYNTHESIS_PROTOCOL_EVIDENCE_DIR;
    else
      process.env.ZOTERO_SYNTHESIS_PROTOCOL_EVIDENCE_DIR = originalEvidenceRoot;
  });

  it("invalidates receipts when a contract, producer, rebuilder or executable changes", function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "synthesis-evidence-"));
    try {
      assert.isUndefined(synthesisProtocolExecutionIdentity(root));
      for (const file of SOURCE_FILES) {
        const fullPath = path.join(root, file);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, "initial");
      }
      const binary = binaryFile(root);
      fs.mkdirSync(path.dirname(binary), { recursive: true });
      fs.writeFileSync(binary, "initial");
      const original = synthesisProtocolExecutionIdentity(root);
      assert.match(original!, /^[a-f0-9]{64}$/);
      for (const file of [
        ...SOURCE_FILES.map((file) => path.join(root, file)),
        binary,
      ]) {
        fs.writeFileSync(file, "changed");
        assert.notEqual(
          synthesisProtocolExecutionIdentity(root),
          original,
          file,
        );
        fs.writeFileSync(file, "initial");
      }
      assert.equal(synthesisProtocolExecutionIdentity(root), original);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("reuses one identity inside an explicit scope and rejects source drift at the end", function () {
    const root = createWorkspace();
    try {
      const original = synthesisProtocolExecutionIdentity(root);
      assert.match(original!, /^[a-f0-9]{64}$/);
      const scope = beginSynthesisProtocolExecutionScope({
        workspaceRoot: root,
      });
      assert.equal(scope.identity, original);

      rewriteKeepingTimestamp(path.join(root, SOURCE_FILES[0]), "changed");
      assert.equal(synthesisProtocolExecutionIdentity(root), original);
      assert.equal(synthesisProtocolExecutionIdentity(root), original);

      let failure: unknown;
      try {
        scope.end();
      } catch (error) {
        failure = error;
      }
      assert.instanceOf(
        failure,
        SynthesisProtocolExecutionIdentityChangedError,
      );
      assert.equal(
        (failure as SynthesisProtocolExecutionIdentityChangedError).code,
        "synthesis_protocol_execution_identity_changed",
      );
      assert.notEqual(synthesisProtocolExecutionIdentity(root), original);
    } finally {
      removeWorkspace(root);
    }
  });

  it("rechecks the executable at scope end", function () {
    const root = createWorkspace();
    try {
      const original = synthesisProtocolExecutionIdentity(root);
      const scope = beginSynthesisProtocolExecutionScope({
        workspaceRoot: root,
      });
      rewriteKeepingTimestamp(binaryFile(root), "changed");
      assert.equal(synthesisProtocolExecutionIdentity(root), original);
      assert.throws(
        () => scope.end(),
        SynthesisProtocolExecutionIdentityChangedError,
      );
    } finally {
      removeWorkspace(root);
    }
  });

  it("keeps unscoped identity reads independent and uncached", function () {
    const root = createWorkspace();
    try {
      const original = synthesisProtocolExecutionIdentity(root);
      rewriteKeepingTimestamp(path.join(root, SOURCE_FILES[0]), "changed");
      assert.notEqual(synthesisProtocolExecutionIdentity(root), original);
    } finally {
      removeWorkspace(root);
    }
  });

  it("does not reuse a scope identity for another fixture root", function () {
    const scopedRoot = createWorkspace();
    const otherRoot = createWorkspace();
    try {
      const otherIdentity = synthesisProtocolExecutionIdentity(otherRoot);
      const scope = beginSynthesisProtocolExecutionScope({
        workspaceRoot: scopedRoot,
      });
      rewriteKeepingTimestamp(path.join(otherRoot, SOURCE_FILES[0]), "changed");
      assert.notEqual(
        synthesisProtocolExecutionIdentity(otherRoot),
        otherIdentity,
      );
      assert.equal(
        synthesisProtocolExecutionIdentity(scopedRoot),
        scope.identity,
      );
      scope.end();
    } finally {
      removeWorkspace(scopedRoot);
      removeWorkspace(otherRoot);
    }
  });

  it("hashes the executable selected by CARGO_TARGET_DIR", function () {
    const targetDirectory = "custom-cargo-target";
    const root = createWorkspace(targetDirectory);
    try {
      process.env.CARGO_TARGET_DIR = targetDirectory;
      const original = synthesisProtocolExecutionIdentity(root);
      assert.match(original!, /^[a-f0-9]{64}$/);
      rewriteKeepingTimestamp(binaryFile(root, targetDirectory), "changed");
      assert.notEqual(synthesisProtocolExecutionIdentity(root), original);
    } finally {
      removeWorkspace(root);
    }
  });

  it("isolates execution and observation evidence by evidence root", function () {
    const identity = synthesisProtocolExecutionIdentity();
    assert.isDefined(identity);
    const first = fs.mkdtempSync(
      path.join(os.tmpdir(), "synthesis-evidence-a-"),
    );
    const second = fs.mkdtempSync(
      path.join(os.tmpdir(), "synthesis-evidence-b-"),
    );
    try {
      process.env.ZOTERO_SYNTHESIS_PROTOCOL_EVIDENCE_DIR = first;
      appendSynthesisProtocolExecutionEvidence(
        identity!,
        "root:first",
        "accepted",
      );
      appendSynthesisProtocolObservation(identity!, "schema:test", {
        root: "first",
      });
      assert.isTrue(
        fs.existsSync(path.join(first, "execution", `${identity}.jsonl`)),
      );
      assert.isTrue(
        fs.existsSync(path.join(first, "observations", `${identity}.jsonl`)),
      );

      process.env.ZOTERO_SYNTHESIS_PROTOCOL_EVIDENCE_DIR = second;
      assert.deepEqual(readSynthesisProtocolExecutionEvidence(), []);
      assert.deepEqual(readSynthesisProtocolObservations(), []);
      appendSynthesisProtocolExecutionEvidence(
        identity!,
        "root:second",
        "accepted",
      );
      appendSynthesisProtocolObservation(identity!, "schema:test", {
        root: "second",
      });
      assert.deepEqual(
        readSynthesisProtocolExecutionEvidence().map((entry) => entry.slot),
        ["root:second"],
      );

      process.env.ZOTERO_SYNTHESIS_PROTOCOL_EVIDENCE_DIR = first;
      assert.deepEqual(
        readSynthesisProtocolExecutionEvidence().map((entry) => entry.slot),
        ["root:first"],
      );
      assert.deepEqual(
        readSynthesisProtocolObservations().map((entry) => entry.value),
        [{ root: "first" }],
      );
    } finally {
      removeWorkspace(first);
      removeWorkspace(second);
    }
  });
});
