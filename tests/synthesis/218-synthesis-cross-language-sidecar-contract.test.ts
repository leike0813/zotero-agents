import { assert } from "chai";
import Ajv from "ajv";
import {
  rebuildSynthesisTopicPlanApplyRequest,
  rebuildSynthesisProtocolCapabilityDto,
  rebuildSynthesisProtocolDto,
  SynthesisClientError,
} from "../../packages/synthesis-contracts/src";
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
import {
  checkSynthesisCrossLanguageContracts,
  inspectSynthesisProtocolCoverage,
} from "../../scripts/synthesis/check-synthesis-cross-language-contracts";
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

  it("keeps a short patch error page distinct from canonical JSON chunks", function () {
    const errorPage = {
      descriptor: {
        section: "errors",
        pageIndex: 0,
        rowCount: 1,
        byteLength: 13,
        sha256: `sha256:${"a".repeat(64)}`,
      },
      rows: ["invalid"],
    };
    const rebuilt = rebuildSynthesisProtocolDto({
      schemaId:
        "https://zotero-agents.local/synthesis/sidecar-protocol/v1/worker.schema.json",
      definition: "TopicSectionPatchResultSection",
      direction: "result",
      value: errorPage,
    });
    assert.deepEqual(rebuilt, errorPage);
  });

  const plannedAction = {
    action: "create",
    topic_id: "topic:contract",
    title: "Contract",
    definition: "Synthetic contract",
    resolver: { tag: { or: ["topic:contract"] }, combine: "union" },
    revision: 1,
  };
  const plan = {
    kind: "topic_plan",
    operation: "reconcile",
    base_graph_hash: "graph:1",
    library_index_hash: "library:1",
    topic_actions: [plannedAction],
    relation_proposals: [],
    recommended_updates: [],
  };
  for (const [name, action, accepted] of [
    ["canonical tag selector", plannedAction, true],
    ["empty optional title", { ...plannedAction, title: "" }, true],
    [
      "long permitted definition",
      { ...plannedAction, definition: "x".repeat(20_000) },
      true,
    ],
    [
      "invented selector",
      {
        ...plannedAction,
        resolver: {
          includeTags: ["topic:contract"],
          excludeTags: [],
          strategy: "tag_match",
          match: "any",
        },
      },
      false,
    ],
    ["partial scope", { ...plannedAction, scope: { include: [] } }, false],
    [
      "unknown evidence field",
      { ...plannedAction, basis: [{ library_index_hash: "library:1" }] },
      false,
    ],
    ["zero revision", { ...plannedAction, revision: 0 }, false],
    ["null optional resolver", { ...plannedAction, resolver: null }, false],
    [
      "Unicode title at length limit",
      { ...plannedAction, title: "😀".repeat(16_384) },
      true,
    ],
    [
      "Unicode title over length limit",
      { ...plannedAction, title: "😀".repeat(16_385) },
      false,
    ],
    [
      "upper revision",
      { ...plannedAction, revision: Number.MAX_SAFE_INTEGER },
      true,
    ],
    [
      "unsafe revision",
      { ...plannedAction, revision: Number.MAX_SAFE_INTEGER + 1 },
      false,
    ],
  ] as const) {
    it(`uses the same Topic Plan contract for ${name}`, function () {
      const value = { ...plan, topic_actions: [action] };
      for (const rebuild of [
        () => rebuildSynthesisTopicPlanApplyRequest(value),
        () =>
          rebuildSynthesisProtocolCapabilityDto({
            capability: "client.applyTopicPlan",
            direction: "request",
            value: { args: [value] },
          }),
      ]) {
        if (accepted) assert.doesNotThrow(rebuild);
        else {
          try {
            rebuild();
            assert.fail("invalid plan admitted");
          } catch (error) {
            assert.instanceOf(error, SynthesisClientError);
            assert.equal(
              (error as SynthesisClientError).code,
              "invalid_request",
            );
          }
        }
      }
    });
  }

  it("rejects invented planner selectors at final Skill validation", function () {
    const schema = JSON.parse(
      fs.readFileSync(
        "skills_builtin/topic-planner/assets/output.schema.json",
        "utf8",
      ),
    );
    // Exercise the installed Skill schema, independently of the wire validator.
    const validate = new Ajv({ strict: false }).compile(schema);
    assert.isTrue(validate(plan));
    assert.isFalse(
      validate({
        ...plan,
        topic_actions: [
          { ...plannedAction, resolver: { includeTags: ["topic:contract"] } },
        ],
      }),
    );
  });

  it("does not count mapped entries or unexecuted samples as complete coverage", function () {
    const registry = {
      capabilities: [
        {
          capability: "test.read",
          requestSchemaRef: "request",
          resultSchemaRef: "result",
          errorSchemaRef: "error",
        },
      ],
      workers: [],
    };
    const cases = [
      { id: "request-positive", schemaRef: "request", valid: true, value: {} },
    ];
    const coverage = inspectSynthesisProtocolCoverage(registry, cases);
    assert.equal(coverage.entries.total, 3);
    assert.isBelow(coverage.entries.covered, coverage.entries.total);
    assert.includeMembers(coverage.entries.uncovered, [
      "test.read:result:positive",
      "test.read:error:positive",
    ]);
    assert.isNotEmpty(coverage.crossLanguage.uncovered);
    assert.isFalse(coverage.complete);
    assert.isAbove(
      inspectSynthesisProtocolCoverage(
        {
          ...registry,
          capabilities: [
            ...registry.capabilities,
            { ...registry.capabilities[0], capability: "test.new" },
          ],
        },
        cases,
      ).entries.total,
      coverage.entries.total,
    );
  });

  it("requires raw request rejection and never counts cross-language disagreement", function () {
    const registry = {
      capabilities: [
        {
          capability: "test.read",
          requestSchemaRef: "request",
          resultSchemaRef: "result",
          errorSchemaRef: "error",
        },
      ],
      workers: [],
    };
    const evidence = ["request", "result", "error"].map((part) => ({
      identity: "test",
      slot: `test.read:${part}`,
      outcome: "accepted" as const,
      implementation: "native-process" as const,
    }));
    assert.include(
      inspectSynthesisProtocolCoverage(registry, [], evidence).crossLanguage
        .uncovered,
      "test.read:request",
    );
    const rejected = evidence.map((entry) => ({
      ...entry,
      outcome: "rejected" as const,
    }));
    assert.equal(
      inspectSynthesisProtocolCoverage(registry, [], [...evidence, ...rejected])
        .crossLanguage.covered,
      3,
    );
    assert.include(
      inspectSynthesisProtocolCoverage(
        registry,
        [],
        [
          ...evidence,
          ...rejected,
          { ...evidence[1], outcome: "diverged" as const },
        ],
      ).crossLanguage.uncovered,
      "test.read:result",
    );
  });

  it("keeps recursive native obligations separate from TypeScript structure coverage", function () {
    const obligation = "schema#/$defs/Nested::type:string:reject";
    const inspect = (evidence: any[] = []) =>
      inspectSynthesisProtocolCoverage(
        { capabilities: [], workers: [] },
        [],
        evidence,
        { total: 1, covered: 1, uncovered: [] },
        [obligation],
      );
    assert.deepEqual(inspect().crossLanguage.structure.uncovered, [obligation]);
    assert.equal(inspect().crossLanguage.structure.covered, 0);
    const receipt = {
      identity: "test",
      slot: `structure:${obligation}`,
      outcome: "verified",
      implementation: "native-process",
    };
    assert.equal(inspect([receipt]).crossLanguage.structure.covered, 1);
    assert.equal(
      inspect([receipt, { ...receipt, outcome: "diverged" }]).crossLanguage
        .structure.covered,
      0,
    );
  });

  it("accepts the audit liveness context emitted by the real Host facade", function () {
    const request = {
      args: [
        {
          libraryId: 1,
          vocabularyHash: "vocabulary:1",
          executionIdentity: {
            hostInstanceId: "host:1",
            principal: {
              packageId: "package:1",
              workflowId: "tag-auditor",
              contentDigest: "digest:1",
            },
          },
          activeRunIds: ["audit:1"],
        },
      ],
    };
    assert.doesNotThrow(() =>
      rebuildSynthesisProtocolCapabilityDto({
        capability: "client.beginTagAuditRun",
        direction: "request",
        value: request,
      }),
    );
    assert.throws(() =>
      rebuildSynthesisProtocolCapabilityDto({
        capability: "client.beginTagAuditRun",
        direction: "request",
        value: { args: [{ ...request.args[0], activeRunIds: [null] }] },
      }),
    );
  });

  it("uses the Host audit digest encoding on the reverse wire", function () {
    const value = {
      states: [
        {
          target: { libraryId: 1, itemKey: "ITEMKEY1" },
          revision: "revision:1",
          tagDigest: "a".repeat(64),
        },
      ],
    };
    assert.doesNotThrow(() =>
      rebuildSynthesisProtocolCapabilityDto({
        capability: "library.items.get_audit_state",
        direction: "result",
        value,
      }),
    );
    assert.throws(() =>
      rebuildSynthesisProtocolCapabilityDto({
        capability: "library.items.get_audit_state",
        direction: "result",
        value: {
          states: [
            { ...value.states[0], tagDigest: "sha256:" + "a".repeat(64) },
          ],
        },
      }),
    );
  });

  it("carries global Index matching and bounded summary projections", function () {
    const state = createDefaultSynthesisUiState();
    state.registry.search = "needle";
    const read = toSynthesisWorkbenchReadState(state, {
      indexCursor: "",
      indexLimit: 25,
      indexProjection: "matches",
    });
    assert.include(read.registry, {
      search: "needle",
      artifactCoverage: "all",
      bindingStatus: "all",
      projection: "matches",
    });
    assert.equal(
      toSynthesisWorkbenchReadState(state, {
        indexSourceRefs: ["1:AAAA1111"],
        indexProjection: "summary",
      }).registry.projection,
      "summary",
    );
    assert.throws(() =>
      rebuildSynthesisWorkbenchReadState({
        ...read,
        registry: { ...read.registry, projection: "private" },
      }),
    );
  });

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
    this.timeout(120_000);
    const result = await checkSynthesisCrossLanguageContracts();

    assert.deepEqual(result.errors, []);
    assert.equal(result.ok, result.coverage.complete);
    assert.equal(
      result.contractSetVersion,
      "synthesis-sidecar-protocol-registry.v1",
    );
    assert.equal(result.schemaCount, 19);
    assert.equal(result.protocolCapabilityCount, 135);
    assert.equal(result.workerOperationCount, 15);
    assert.equal(result.unauthorizedGenericEscapeCount, 0);
    assert.match(result.fingerprint, /^sha256:[a-f0-9]{64}$/);
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
