import { assert } from "chai";
import fs from "node:fs";
import path from "node:path";
import {
  SynthesisCanonicalJsonError,
  canonicalizeSynthesisContractJsonArtifact,
  canonicalizeSynthesisContractJson,
  hashSynthesisContractCanonicalJson,
} from "../../packages/synthesis-contracts/src/canonicalJson";
import { SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION as CONTRACT_SCHEMA_VERSION } from "../../packages/synthesis-contracts/src/schemaVersion";
import { rebuildSynthesisSidecarCallRequest } from "../../packages/synthesis-contracts/src/sidecarSystem";
import { SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION as REPOSITORY_SCHEMA_VERSION } from "../../packages/synthesis-repository/src/index";
import { checkSynthesisCrossLanguageContracts } from "../../scripts/check-synthesis-cross-language-contracts";
import { checkSynthesisDurableFoundationParity } from "../../scripts/check-synthesis-durable-foundation-parity";
import {
  checkSynthesisTypedApplicationParity,
  findSynthesisApplicationParityMismatchLocations,
} from "../../scripts/check-synthesis-typed-application-parity";
import { checkSynthesisCitationReferenceApplicationParity } from "../../scripts/check-synthesis-citation-reference-application-parity";
import { checkSynthesisTagConceptTopicGraphApplicationParity } from "../../scripts/check-synthesis-tag-concept-topic-graph-application-parity";
import { checkSynthesisCheckpointBundleWebDavDebugApplicationParity } from "../../scripts/check-synthesis-checkpoint-bundle-webdav-debug-application-parity";
import { checkSynthesisRustLicenseInventory } from "../../scripts/check-synthesis-rust-license-inventory";
import { findSynthesisContractBoundaryViolations } from "../../scripts/check-synthesis-service-boundary";
import {
  normalizeSynthesisApplicationParityObservable,
  normalizeSynthesisApplicationParityTableRows,
} from "../../scripts/synthesis-application-parity-policy";

function canonicalErrorCode(action: () => unknown) {
  try {
    action();
    return "admitted";
  } catch (error) {
    return error instanceof SynthesisCanonicalJsonError
      ? error.code
      : "unexpected";
  }
}

describe("Synthesis cross-language sidecar contract", function () {
  this.timeout(30_000);

  it("strictly compiles the complete manifest and conforms to both corpora", async function () {
    const result = await checkSynthesisCrossLanguageContracts();

    assert.deepEqual(result.errors, []);
    assert.isTrue(result.ok);
    assert.equal(
      result.contractSetVersion,
      "synthesis-sidecar-protocol-registry.v1",
    );
    assert.equal(result.schemaCount, 18);
    assert.equal(result.protocolCapabilityCount, 121);
    assert.equal(result.workerOperationCount, 15);
    assert.equal(result.unauthorizedGenericEscapeCount, 0);
    assert.equal(
      result.fingerprint,
      "sha256:612a032812fc2dfb9b6b1c82fdd27a10f71fde20e718a189f86613e86850c276",
    );
  });

  it("locks canonical UTF-16 ordering, ECMAScript numbers, and UTF-8 hashes", function () {
    const value = JSON.parse('{"\\ue000":1,"😀":2,"a":-0,"float":1e-7}');
    const canonical = '{"a":0,"float":1e-7,"😀":2,"":1}';

    const artifact = canonicalizeSynthesisContractJsonArtifact(value);

    assert.equal(canonicalizeSynthesisContractJson(value), canonical);
    assert.equal(artifact.text, canonical);
    assert.equal(new TextDecoder().decode(artifact.bytes), canonical);
    assert.equal(artifact.byteLength, artifact.bytes.byteLength);
    assert.equal(
      hashSynthesisContractCanonicalJson(value),
      "sha256:8ea42081471bf081697b912e59f207b803004aaf41fc75df225c77941edda7ed",
    );
    assert.equal(
      artifact.sha256,
      "sha256:8ea42081471bf081697b912e59f207b803004aaf41fc75df225c77941edda7ed",
    );
    assert.notInclude(canonical, "\n");
  });

  it("preserves v1 normalization while rejecting invalid Unicode and cycles", function () {
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;

    assert.equal(canonicalizeSynthesisContractJson(undefined), "null");
    assert.equal(
      canonicalizeSynthesisContractJson([NaN, undefined]),
      "[null,null]",
    );
    assert.equal(
      canonicalizeSynthesisContractJson({ omitted: undefined, kept: 1 }),
      '{"kept":1}',
    );
    assert.equal(
      canonicalErrorCode(() =>
        canonicalizeSynthesisContractJson({ value: "\ud800" }),
      ),
      "canonical_unpaired_surrogate",
    );
    assert.equal(
      canonicalErrorCode(() => canonicalizeSynthesisContractJson(cycle)),
      "canonical_cycle",
    );
  });

  it("keeps raw input separate from normalized DTO and enforces wire bounds", function () {
    assert.deepEqual(
      rebuildSynthesisSidecarCallRequest({
        protocol: "synthesis-sidecar.v1",
        requestId: "r1",
        profileId: "p1",
        capability: "system.handshake",
        payload: {
          schemaVersion: "synthesis-repository-foundation.v1",
          bundleId: "1".repeat(64),
          buildFingerprint: "2".repeat(64),
          supervisorInstanceId: "supervisor-1",
        },
      }),
      {
        protocol: "synthesis-sidecar.v1",
        requestId: "r1",
        profileId: "p1",
        capability: "system.handshake",
        payload: {
          schemaVersion: "synthesis-repository-foundation.v1",
          bundleId: "1".repeat(64),
          buildFingerprint: "2".repeat(64),
          supervisorInstanceId: "supervisor-1",
        },
      },
    );
    assert.throws(() =>
      rebuildSynthesisSidecarCallRequest({
        protocol: "synthesis-sidecar.v1",
        requestId: "r1",
        profileId: "p1",
        capability: "system.handshake",
        payload: {
          schemaVersion: "synthesis-repository-foundation.v1",
          bundleId: "1".repeat(64),
          buildFingerprint: "2".repeat(64),
          supervisorInstanceId: "supervisor-1",
        },
        unknown: true,
      }),
    );
    assert.throws(() =>
      rebuildSynthesisSidecarCallRequest({
        protocol: "synthesis-sidecar.v1",
        requestId: "x".repeat(513),
        profileId: "p1",
        capability: "system.handshake",
        payload: {},
      }),
    );
  });

  it("owns the repository schema version without a reverse dependency", function () {
    assert.equal(CONTRACT_SCHEMA_VERSION, REPOSITORY_SCHEMA_VERSION);
    assert.deepEqual(findSynthesisContractBoundaryViolations(), []);
  });

  it("normalizes the Rust-private redirect-graph schema marker by key", function () {
    const exact = {
      key: "reference_redirect_graph_schema_version",
      value: "synthesis-reference-redirect-graph.v1",
    };
    const wrongValue = {
      key: "reference_redirect_graph_schema_version",
      value: "synthesis-reference-redirect-graph.v999",
    };
    const unrelated = {
      key: "repository_foundation_schema_version",
      value: "synthesis-repository-foundation.v3",
    };
    const rows = [exact, wrongValue, unrelated];

    assert.deepEqual(
      normalizeSynthesisApplicationParityTableRows(
        "rust",
        "synt_schema_meta",
        rows,
      ),
      [unrelated],
    );
    assert.deepEqual(
      normalizeSynthesisApplicationParityTableRows(
        "node",
        "synt_schema_meta",
        rows,
      ),
      rows,
    );
    assert.deepEqual(
      normalizeSynthesisApplicationParityTableRows(
        "rust",
        "synt_operation",
        rows,
      ),
      rows,
    );
    assert.deepEqual(
      normalizeSynthesisApplicationParityObservable("rust", {
        tables: { synt_schema_meta: rows },
        nested: { synt_schema_meta: [exact, unrelated] },
      }),
      {
        tables: { synt_schema_meta: [unrelated] },
        nested: { synt_schema_meta: [unrelated] },
      },
    );
  });

  it("reports stable observable mismatch locations", function () {
    assert.deepEqual(
      findSynthesisApplicationParityMismatchLocations(
        {
          tables: { synt_cache: [{ key: "one", value: 1 }] },
          workbench: { status: "ready" },
        },
        {
          tables: { synt_cache: [{ key: "one", value: 2 }] },
          workbench: { status: "failed" },
        },
      ),
      ["$.tables.synt_cache[0].value", "$.workbench.status"],
    );
  });

  it("shares the complete durable foundation corpus with the Node oracle and Rust candidate", function () {
    const result = checkSynthesisDurableFoundationParity();

    assert.deepEqual(result.errors, []);
    assert.isTrue(result.ok);
    assert.equal(result.corpus, "synthesis-durable-foundation-corpus.v1");
    assert.equal(result.nodeOracleFiles, 15);
    assert.equal(result.tables, 53);
    assert.equal(result.indexes, 46);
    assert.equal(result.faultPoints, 7);
    assert.equal(result.canaries, 2);
    assert.equal(result.implementations.node.role, "oracle");
    assert.match(
      result.implementations.node.sourceFingerprint,
      /^sha256:[a-f0-9]{64}$/,
    );
    assert.equal(result.implementations.rust.role, "candidate");
    assert.match(
      result.implementations.rust.sourceFingerprint,
      /^sha256:[a-f0-9]{64}$/,
    );
    assert.notEqual(
      result.implementations.node.sourceFingerprint,
      result.implementations.rust.sourceFingerprint,
    );
  });

  it("executes the independent Workbench and Topic typed application differential", async function () {
    const result = await checkSynthesisTypedApplicationParity();

    assert.deepEqual(result.errors, []);
    assert.isTrue(result.ok);
    assert.equal(result.corpus, "synthesis-typed-application-parity-v1");
    assert.equal(
      result.reportSchema,
      "synthesis-typed-application-parity-report.v1",
    );
    assert.equal(result.tables, 53);
    assert.equal(result.workbenchCases, 7);
    assert.equal(result.topicCases, 24);
    assert.equal(result.implementations.node.role, "oracle");
    assert.equal(result.implementations.rust.role, "candidate");
    assert.match(
      result.implementations.node.sourceFingerprint,
      /^sha256:[a-f0-9]{64}$/,
    );
    assert.match(
      result.implementations.rust.sourceFingerprint,
      /^sha256:[a-f0-9]{64}$/,
    );
  });

  it("executes the independent Citation/Reference typed application differential", async function () {
    const result = await checkSynthesisCitationReferenceApplicationParity();

    assert.deepEqual(result.errors, []);
    assert.isTrue(result.ok);
    assert.equal(
      result.corpus,
      "synthesis-citation-reference-application-parity.v1",
    );
    assert.equal(
      result.reportSchema,
      "synthesis-citation-reference-application-parity-report.v1",
    );
    assert.equal(result.tables, 53);
    assert.equal(result.comparedTables, 53);
    assert.equal(result.applicationFamilies, 3);
    assert.equal(result.implementations.node.role, "oracle");
    assert.equal(result.implementations.rust.role, "candidate");
    const workflow = fs.readFileSync(
      path.resolve(
        process.cwd(),
        ".github/workflows/verify-synthesis-sidecar.yml",
      ),
      "utf8",
    );
    const checkerIndex = workflow.indexOf(
      "check:synthesis-citation-reference-application-parity",
    );
    const rustIndex = workflow.indexOf("Run complete Rust workspace");
    assert.isAtLeast(checkerIndex, 0);
    assert.isAbove(checkerIndex, rustIndex);
  });

  it("executes the independent Tag/Concept/Topic Graph typed application differential", async function () {
    const result = await checkSynthesisTagConceptTopicGraphApplicationParity();

    assert.deepEqual(result.errors, []);
    assert.isTrue(result.ok);
    assert.equal(
      result.corpus,
      "synthesis-tag-concept-topic-graph-application-parity.v1",
    );
    assert.equal(
      result.reportSchema,
      "synthesis-tag-concept-topic-graph-application-parity-report.v1",
    );
    assert.equal(result.tables, 53);
    assert.equal(result.comparedTables, 53);
    assert.equal(result.applicationFamilies, 3);
    assert.equal(result.implementations.node.role, "oracle");
    assert.equal(result.implementations.rust.role, "candidate");
  });

  it("executes the independent Checkpoint/Bundle/WebDAV/Debug typed application differential", async function () {
    const result =
      await checkSynthesisCheckpointBundleWebDavDebugApplicationParity();

    assert.deepEqual(result.errors, []);
    assert.isTrue(result.ok);
    assert.equal(
      result.corpus,
      "synthesis-checkpoint-bundle-webdav-debug-application-parity.v1",
    );
    assert.equal(
      result.reportSchema,
      "synthesis-checkpoint-bundle-webdav-debug-application-parity-report.v1",
    );
    assert.equal(result.tables, 53);
    assert.equal(result.comparedTables, 53);
    assert.equal(result.applicationFamilies, 4);
    assert.equal(result.implementations.node.role, "oracle");
    assert.equal(result.implementations.rust.role, "candidate");

    const workflow = fs.readFileSync(
      path.resolve(
        process.cwd(),
        ".github/workflows/verify-synthesis-sidecar.yml",
      ),
      "utf8",
    );
    const checkerIndex = workflow.indexOf(
      "check:synthesis-checkpoint-bundle-webdav-debug-application-parity",
    );
    const rustIndex = workflow.indexOf("Run complete Rust workspace");
    assert.isAtLeast(checkerIndex, 0);
    assert.isAbove(checkerIndex, rustIndex);
  });

  it("accounts for every locked Rust and bundled SQLite license", function () {
    const result = checkSynthesisRustLicenseInventory();

    assert.deepEqual(result.errors, []);
    assert.isTrue(result.ok);
    assert.isAbove(result.cargoPackages, 0);
    assert.equal(result.licensedPackages, result.cargoPackages);
    assert.equal(result.bundledComponents, 1);
    assert.equal(result.bundledSqlite, "3.53.2");
  });
});
