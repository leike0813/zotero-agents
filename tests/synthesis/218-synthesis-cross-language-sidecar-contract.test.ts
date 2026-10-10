import { assert } from "chai";
import {
  SynthesisCanonicalJsonError,
  canonicalizeSynthesisContractJsonArtifact,
  canonicalizeSynthesisContractJson,
  hashSynthesisContractCanonicalJson,
} from "../../packages/synthesis-contracts/src/canonicalJson";
import { SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION as CONTRACT_SCHEMA_VERSION } from "../../packages/synthesis-contracts/src/schemaVersion";
import { rebuildSynthesisSidecarCallRequest } from "../../packages/synthesis-contracts/src/sidecarSystem";
import {
  rebuildSynthesisWorkbenchReadState,
  rebuildSynthesisWorkbenchSurfaceResult,
} from "../../packages/synthesis-contracts/src/workbench";
import { rebuildSynthesisHostLibraryItemsPageResult } from "../../packages/synthesis-contracts/src/hostRead";
import { createDefaultSynthesisUiState } from "../../src/modules/synthesis/uiModel";
import { toSynthesisWorkbenchReadState } from "../../src/modules/synthesisClient/workbenchUiAdapter";
import { SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION as REPOSITORY_SCHEMA_VERSION } from "../../packages/synthesis-repository/src/index";
import { checkSynthesisCrossLanguageContracts } from "../../scripts/synthesis/check-synthesis-cross-language-contracts";
import { checkSynthesisRustLicenseInventory } from "../../scripts/synthesis/check-synthesis-rust-license-inventory";
import { findSynthesisContractBoundaryViolations } from "../../scripts/synthesis/check-synthesis-service-boundary";
import { canonicalSynthesisTopicPathId } from "../../packages/synthesis-application/src/topicCanonical";
import fs from "node:fs";
import path from "node:path";

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

  it("admits bounded Index pages and details without opening the closed registry", function () {
    const state = toSynthesisWorkbenchReadState(
      createDefaultSynthesisUiState(),
    );
    const registry = { ...state.registry, cursor: "", limit: 25 };
    assert.deepEqual(
      rebuildSynthesisWorkbenchReadState({ ...state, registry }).registry,
      registry,
    );
    assert.throws(() =>
      rebuildSynthesisWorkbenchReadState({
        ...state,
        registry: { ...registry, sourceRefs: ["1:AAAA1111"] },
      }),
    );
    for (const limit of [0, 101]) {
      assert.throws(() =>
        rebuildSynthesisWorkbenchReadState({
          ...state,
          registry: { ...registry, limit },
        }),
      );
    }
    assert.throws(() =>
      rebuildSynthesisWorkbenchReadState({
        ...state,
        registry: { ...registry, cursor: "next:1" },
      }),
    );
    assert.throws(() =>
      rebuildSynthesisWorkbenchReadState({
        ...state,
        registry: { ...registry, privateQuery: true },
      }),
    );
    const details = {
      ...state.registry,
      sourceRefs: ["1:AAAA1111"],
      expectedBasis: "basis:1",
    };
    assert.deepEqual(
      rebuildSynthesisWorkbenchReadState({ ...state, registry: details })
        .registry,
      details,
    );
    const page = {
      cursor: "",
      nextCursor: "next:1",
      hasMore: true,
      returned: 0,
      limit: 25,
      basis: "basis:1",
      total: 0,
    };
    const result = {
      libraryId: 1,
      reviews: {
        summary: {
          openCount: 0,
          indexCount: 0,
          referenceMatchingCount: 0,
          conceptCount: 0,
          topicGraphCount: 0,
        },
      },
      registry: {
        rows: [],
        cacheStatus: {
          cache_key: "reference-sidecar:library",
          status: "ready",
          source_hash: "",
          basis_hash: "",
          refreshed_at: "",
          updated_at: "",
          diagnostics: [],
          allowed_actions: [],
        },
        page,
      },
    };
    assert.deepEqual(
      rebuildSynthesisWorkbenchSurfaceResult(
        { surface: "index", state },
        result,
      ),
      result,
    );
    const { total: _total, ...pageWithoutTotal } = page;
    assert.throws(() =>
      rebuildSynthesisWorkbenchSurfaceResult(
        { surface: "index", state },
        { ...result, registry: { ...result.registry, page: pageWithoutTotal } },
      ),
    );
    for (const total of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      assert.throws(() =>
        rebuildSynthesisWorkbenchSurfaceResult(
          { surface: "index", state },
          {
            ...result,
            registry: { ...result.registry, page: { ...page, total } },
          },
        ),
      );
    }
    assert.doesNotThrow(() =>
      rebuildSynthesisWorkbenchSurfaceResult(
        { surface: "index", state },
        {
          ...result,
          registry: { ...result.registry, page: { ...page, total: null } },
        },
      ),
    );
  });

  it("requires a safe nonnegative total on Host item pages", function () {
    const page = {
      cursor: "",
      nextCursor: "",
      hasMore: false,
      returned: 0,
      limit: 25,
      total: 274,
      items: [],
    };
    assert.equal(rebuildSynthesisHostLibraryItemsPageResult(page).total, 274);
    const { total: _total, ...pageWithoutTotal } = page;
    assert.throws(() =>
      rebuildSynthesisHostLibraryItemsPageResult(pageWithoutTotal),
    );
    for (const total of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      assert.throws(() =>
        rebuildSynthesisHostLibraryItemsPageResult({ ...page, total }),
      );
    }
  });

  it("derives current Topic path IDs from the shared corpus", function () {
    const corpus = JSON.parse(
      fs.readFileSync(
        path.resolve(
          import.meta.dirname,
          "../../packages/synthesis-contracts/contract-set/synthesis-durable-foundation-v1/corpus.json",
        ),
        "utf8",
      ),
    ) as {
      canonical: { topicPathIds: Array<{ topicId: string; pathId: string }> };
    };
    for (const vector of corpus.canonical.topicPathIds) {
      assert.equal(
        canonicalSynthesisTopicPathId(vector.topicId),
        vector.pathId,
      );
    }
  });

  it("strictly compiles the complete manifest and conforms to both corpora", async function () {
    const result = await checkSynthesisCrossLanguageContracts();

    assert.deepEqual(result.errors, []);
    assert.isTrue(result.ok);
    assert.equal(
      result.contractSetVersion,
      "synthesis-sidecar-protocol-registry.v1",
    );
    assert.equal(result.schemaCount, 19);
    assert.equal(result.protocolCapabilityCount, 135);
    assert.equal(result.workerOperationCount, 15);
    assert.equal(result.unauthorizedGenericEscapeCount, 0);
    assert.equal(
      result.fingerprint,
      "sha256:c6f981dd60a899d07be647112491ac770157f57d767dad9ab7ad37f301cc1dd7",
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
