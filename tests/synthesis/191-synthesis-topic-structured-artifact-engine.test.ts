import { assert } from "chai";
import topicDomainSchema from "../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/topic-domain.schema.json";
import { SYNTHESIS_TOPIC_ARTIFACT_SECTIONS } from "../../packages/synthesis-contracts/src/topicDomain";
import {
  SYNTHESIS_TOPIC_ARTIFACT_ASSEMBLY_VERSION,
  SYNTHESIS_TOPIC_ARTIFACT_VALIDATION_VERSION,
  SYNTHESIS_TOPIC_MANIFEST_VALIDATION_VERSION,
  SYNTHESIS_TOPIC_SECTION_PATCH_VERSION,
  SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CHECKPOINT_INTERVAL,
  SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
  SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_JSON_DEPTH_MAX,
  SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_JSON_NODE_MAX,
  createInProcessSynthesisTopicStructuredArtifactEngine,
  rebuildSynthesisTopicArtifactAssemblyRequest,
  rebuildSynthesisTopicArtifactAssemblyResult,
  rebuildSynthesisTopicArtifactValidationRequest,
  rebuildSynthesisTopicArtifactValidationResult,
  rebuildSynthesisTopicManifestValidationRequest,
  rebuildSynthesisTopicManifestValidationResult,
  rebuildSynthesisTopicSectionPatchRequest,
  rebuildSynthesisTopicSectionPatchResult,
} from "../../packages/synthesis-engine/src/topicStructuredArtifact";

function manifest() {
  return {
    schema_id: "synthesis.topic_analysis_manifest",
    schema_version: "3.0.0",
    operation: "create",
    topic_id: "topic:test",
    language: "zh-CN",
    custom_policy: { preserve: true },
    sidecars: {},
    sections: {},
  };
}

function assemblyRequest() {
  return {
    contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_TOPIC_ARTIFACT_ASSEMBLY_VERSION,
    manifest: manifest(),
    sections: {
      topic: { id: "topic:test", custom: { preserved: true } },
      diagnostics: [],
    },
  };
}

function patchRequest() {
  return {
    contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_TOPIC_SECTION_PATCH_VERSION,
    currentManifest: {
      artifact_hash: "sha256:drifted",
      section_hashes: {
        claims: "sha256:old-claims",
        coverage: "sha256:newer-coverage",
      },
    },
    currentSections: {
      claims: [{ id: "claim:old" }],
      coverage: { verdict: "partial" },
    },
    patchManifest: {
      base: {
        current_artifact_hash: "sha256:old-artifact",
        read_section_hashes: {
          claims: "sha256:old-claims",
        },
        replace_section_hashes: {
          claims: "sha256:old-claims",
        },
      },
      patch: {
        mode: "section_replace",
        changed_sections: ["claims"],
        unchanged_section_policy: "inherit_current",
        sections: {
          claims: {
            path: "result/sections/claims.json",
            hash: "sha256:new-claims",
            content_type: "json",
          },
        },
      },
    },
    changedSections: {
      claims: [{ id: "claim:new" }],
    },
  };
}

describe("Synthesis Topic Structured Artifact engine", function () {
  it("keeps the wire section allowlist equal to canonical artifact content sections", function () {
    assert.sameMembers(
      topicDomainSchema.$defs.TopicSectionName.enum,
      SYNTHESIS_TOPIC_ARTIFACT_SECTIONS,
    );
  });
  it("patches an optional comparison matrix without making it mandatory", async function () {
    const engine = createInProcessSynthesisTopicStructuredArtifactEngine();
    const request = {
      ...patchRequest(),
      currentManifest: {
        section_hashes: { comparison_matrix: "sha256:old-matrix" },
      },
      currentSections: { comparison_matrix: { summary: "Old comparison" } },
      patchManifest: {
        schema_id: "synthesis.topic_section_patch_manifest",
        schema_version: "1.0.0",
        operation: "update_patch",
        topic_id: "topic:test",
        language: "zh-CN",
        sidecars: Object.fromEntries(
          [
            "topic_interest_metadata",
            "concept_cards_proposal",
            "topic_graph_relation_proposals",
            "prospective_topic_relation_proposals",
          ].map((name) => [
            name,
            {
              path: `result/${name}.json`,
              content_type: "json",
              schema_id: `synthesis.${name}`,
            },
          ]),
        ),
        base: {
          read_section_hashes: { comparison_matrix: "sha256:old-matrix" },
          replace_section_hashes: { comparison_matrix: "sha256:old-matrix" },
        },
        patch: {
          mode: "section_replace",
          changed_sections: ["comparison_matrix"],
          unchanged_section_policy: "inherit_current",
          sections: {
            comparison_matrix: {
              path: "result/sections/comparison_matrix.json",
              content_type: "json",
            },
          },
        },
      },
      changedSections: { comparison_matrix: { summary: "New comparison" } },
    };
    const validated = await engine.validateManifest(
      rebuildSynthesisTopicManifestValidationRequest({
        contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
        algorithmVersion: SYNTHESIS_TOPIC_MANIFEST_VALIDATION_VERSION,
        manifest: request.patchManifest,
      }),
    );
    assert.isTrue(validated.ok, validated.errors.join("; "));
    const result = await engine.applySectionPatch(
      rebuildSynthesisTopicSectionPatchRequest(request),
    );
    assert.equal(result.status, "applied");
    if (result.status === "applied") {
      assert.deepEqual(
        result.sections.comparison_matrix,
        request.changedSections.comparison_matrix,
      );
    }
    const absent = await engine.validateManifest(
      rebuildSynthesisTopicManifestValidationRequest({
        contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
        algorithmVersion: SYNTHESIS_TOPIC_MANIFEST_VALIDATION_VERSION,
        manifest: manifest(),
      }),
    );
    assert.isFalse(
      absent.errors.some((error) => error.includes("comparison_matrix")),
    );
  });
  it("rebuilds strict versioned envelopes while preserving open domain JSON", function () {
    assert.equal(
      SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
      "synthesis-topic-structured-artifact.v1",
    );
    assert.equal(
      SYNTHESIS_TOPIC_MANIFEST_VALIDATION_VERSION,
      "topic-analysis-manifest-validation.v1",
    );
    assert.equal(
      SYNTHESIS_TOPIC_ARTIFACT_ASSEMBLY_VERSION,
      "topic-structured-artifact-assembly.v1",
    );
    assert.equal(
      SYNTHESIS_TOPIC_ARTIFACT_VALIDATION_VERSION,
      "topic-structured-artifact-validation.v1",
    );
    assert.equal(
      SYNTHESIS_TOPIC_SECTION_PATCH_VERSION,
      "topic-section-patch.v1",
    );
    assert.equal(SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_JSON_DEPTH_MAX, 32);
    assert.equal(SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_JSON_NODE_MAX, 1_000_000);
    assert.equal(SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CHECKPOINT_INTERVAL, 256);

    const rebuilt = rebuildSynthesisTopicArtifactAssemblyRequest({
      ...assemblyRequest(),
      ignoredEnvelopeField: true,
    });
    assert.notProperty(rebuilt, "ignoredEnvelopeField");
    assert.deepEqual(
      (rebuilt.manifest.custom_policy as Record<string, unknown>).preserve,
      true,
    );
    assert.deepEqual(
      (
        (rebuilt.sections.topic as Record<string, unknown>).custom as Record<
          string,
          unknown
        >
      ).preserved,
      true,
    );

    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    assert.throws(() =>
      rebuildSynthesisTopicArtifactValidationRequest({
        contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
        algorithmVersion: SYNTHESIS_TOPIC_ARTIFACT_VALIDATION_VERSION,
        artifact: cyclic,
      }),
    );
    let nested: unknown = "leaf";
    for (
      let index = 0;
      index <= SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_JSON_DEPTH_MAX;
      index += 1
    ) {
      nested = { nested };
    }
    assert.throws(() =>
      rebuildSynthesisTopicManifestValidationRequest({
        contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
        algorithmVersion: SYNTHESIS_TOPIC_MANIFEST_VALIDATION_VERSION,
        manifest: nested,
      }),
    );
  });

  it("preserves validation, assembly, and section patch behavior", async function () {
    const engine = createInProcessSynthesisTopicStructuredArtifactEngine();
    const invalidManifestRequest =
      rebuildSynthesisTopicManifestValidationRequest({
        contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
        algorithmVersion: SYNTHESIS_TOPIC_MANIFEST_VALIDATION_VERSION,
        manifest: manifest(),
      });
    const manifestResult = await engine.validateManifest(
      invalidManifestRequest,
    );
    assert.isFalse(manifestResult.ok);
    assert.include(manifestResult.errors.join("; "), "sections.topic");

    const request =
      rebuildSynthesisTopicArtifactAssemblyRequest(assemblyRequest());
    const assembled = await engine.assembleArtifact(request);
    assert.equal(
      assembled.artifact.schema_id,
      "synthesis.topic_synthesis_artifact",
    );
    assert.equal(assembled.artifact.schema_version, "4.0.0");
    assert.equal(assembled.artifact.language, "zh-CN");
    assert.deepEqual(assembled.artifact.topic, request.sections.topic);

    const artifactValidationRequest =
      rebuildSynthesisTopicArtifactValidationRequest({
        contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
        algorithmVersion: SYNTHESIS_TOPIC_ARTIFACT_VALIDATION_VERSION,
        artifact: assembled.artifact,
        expectedLanguage: "en-US",
      });
    const artifactValidation = await engine.validateArtifact(
      artifactValidationRequest,
    );
    assert.isFalse(artifactValidation.ok);
    assert.include(
      artifactValidation.errors.join("; "),
      "artifact language must be en-US",
    );

    const applied = await engine.applySectionPatch(
      rebuildSynthesisTopicSectionPatchRequest(patchRequest()),
    );
    assert.equal(applied.status, "applied");
    if (applied.status === "applied") {
      assert.deepEqual(applied.sections.claims, [{ id: "claim:new" }]);
      assert.deepEqual(applied.sections.coverage, { verdict: "partial" });
      assert.equal(applied.nextSectionHashes.claims, "sha256:new-claims");
    }

    const conflictRequest = patchRequest();
    conflictRequest.currentManifest.section_hashes.claims =
      "sha256:other-claims";
    const conflict = await engine.applySectionPatch(
      rebuildSynthesisTopicSectionPatchRequest(conflictRequest),
    );
    assert.equal(conflict.status, "conflict");
  });

  it("rejects fabricated results and supports checkpoint cancellation", async function () {
    const assembly =
      rebuildSynthesisTopicArtifactAssemblyRequest(assemblyRequest());
    const engine = createInProcessSynthesisTopicStructuredArtifactEngine();
    const assemblyResult = await engine.assembleArtifact(assembly);
    const rebuiltAssembly = rebuildSynthesisTopicArtifactAssemblyResult(
      { ...assemblyResult, ignored: true },
      assembly,
    );
    assert.notProperty(rebuiltAssembly, "ignored");
    assert.throws(() =>
      rebuildSynthesisTopicArtifactAssemblyResult(
        {
          ...assemblyResult,
          artifact: { ...assemblyResult.artifact, language: "en-US" },
        },
        assembly,
      ),
    );

    const validationRequest = rebuildSynthesisTopicArtifactValidationRequest({
      contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
      algorithmVersion: SYNTHESIS_TOPIC_ARTIFACT_VALIDATION_VERSION,
      artifact: assemblyResult.artifact,
    });
    const validationResult = await engine.validateArtifact(validationRequest);
    assert.throws(() =>
      rebuildSynthesisTopicArtifactValidationResult(
        { ...validationResult, errors: [] },
        validationRequest,
      ),
    );

    const manifestRequest = rebuildSynthesisTopicManifestValidationRequest({
      contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
      algorithmVersion: SYNTHESIS_TOPIC_MANIFEST_VALIDATION_VERSION,
      manifest: manifest(),
    });
    const manifestResult = await engine.validateManifest(manifestRequest);
    assert.deepEqual(
      rebuildSynthesisTopicManifestValidationResult(
        manifestResult,
        manifestRequest,
      ),
      manifestResult,
    );

    const sectionPatchRequest =
      rebuildSynthesisTopicSectionPatchRequest(patchRequest());
    const sectionPatchResult =
      await engine.applySectionPatch(sectionPatchRequest);
    assert.throws(() =>
      rebuildSynthesisTopicSectionPatchResult(
        { ...sectionPatchResult, status: "invalid", errors: ["fabricated"] },
        sectionPatchRequest,
      ),
    );

    const checkpoints: string[] = [];
    let cancellation: unknown;
    try {
      await createInProcessSynthesisTopicStructuredArtifactEngine({
        checkpoint(checkpoint) {
          checkpoints.push(`${checkpoint.phase}:${checkpoint.processedCount}`);
          if (checkpoint.processedCount >= 1) {
            throw new Error("cancelled");
          }
        },
        checkpointInterval: 1,
      }).assembleArtifact(assembly);
    } catch (error) {
      cancellation = error;
    }
    assert.equal((cancellation as Error)?.message, "cancelled");
    assert.include(checkpoints, "start:0");
  });
});
