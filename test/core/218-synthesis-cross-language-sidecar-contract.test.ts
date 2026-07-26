import { assert } from "chai";
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
import { checkSynthesisRustLicenseInventory } from "../../scripts/check-synthesis-rust-license-inventory";
import { findSynthesisContractBoundaryViolations } from "../../scripts/check-synthesis-service-boundary";

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
  it("strictly compiles the complete manifest and conforms to both corpora", async function () {
    const result = await checkSynthesisCrossLanguageContracts();

    assert.deepEqual(result.errors, []);
    assert.isTrue(result.ok);
    assert.equal(
      result.contractSetVersion,
      "synthesis-cross-language-sidecar-contract.v1",
    );
    assert.equal(result.schemaCount, 6);
    assert.equal(result.definitionCount, 115);
    assert.equal(result.positiveCaseCount, 14);
    assert.equal(result.negativeCaseCount, 11);
    assert.equal(
      result.fingerprint,
      "sha256:45b1d784963d57cd754f243d829da63b1396a8beb4228ffe9a3e9c2ffab02508",
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
        payload: {},
        unknown: true,
      }),
      {
        protocol: "synthesis-sidecar.v1",
        requestId: "r1",
        profileId: "p1",
        capability: "system.handshake",
        payload: {},
      },
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

  it("shares the complete durable foundation corpus with the Node oracle and Rust candidate", function () {
    const result = checkSynthesisDurableFoundationParity();

    assert.deepEqual(result.errors, []);
    assert.isTrue(result.ok);
    assert.equal(result.corpus, "synthesis-durable-foundation-corpus.v1");
    assert.equal(result.nodeOracleFiles, 15);
    assert.equal(result.tables, 51);
    assert.equal(result.indexes, 40);
    assert.equal(result.faultPoints, 7);
    assert.equal(result.applications, 13);
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

  it("accounts for every locked Rust and bundled SQLite license", function () {
    const result = checkSynthesisRustLicenseInventory();

    assert.deepEqual(result.errors, []);
    assert.isTrue(result.ok);
    assert.equal(result.cargoPackages, 70);
    assert.equal(result.licensedPackages, 70);
    assert.equal(result.bundledComponents, 1);
    assert.equal(result.bundledSqlite, "3.53.2");
  });
});
