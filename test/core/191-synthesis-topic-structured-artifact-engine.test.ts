import { assert } from "chai";
import fs from "fs/promises";
import path from "path";
import { Worker } from "node:worker_threads";
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
    assert.equal(assembled.artifact.schema_version, "3.0.0");
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

  it("returns the same canonical assembly through the Node worker canary", async function () {
    const request = rebuildSynthesisTopicArtifactAssemblyRequest(
      JSON.parse(JSON.stringify(assemblyRequest())),
    );
    const expected =
      await createInProcessSynthesisTopicStructuredArtifactEngine().assembleArtifact(
        request,
      );
    const worker = new Worker(
      new URL(
        "../fixtures/synthesis-topic-structured-artifact-engine-worker.ts",
        import.meta.url,
      ),
      { execArgv: ["--import", "tsx"] },
    );
    try {
      const actual = await new Promise<unknown>((resolve, reject) => {
        worker.once("message", resolve);
        worker.once("error", reject);
        worker.postMessage(request);
      });
      assert.deepEqual(actual, expected);
    } finally {
      await worker.terminate();
    }
  });

  it("keeps the engine source environment-neutral", async function () {
    const source = await fs.readFile(
      path.resolve("packages/synthesis-engine/src/topicStructuredArtifact.ts"),
      "utf8",
    );
    for (const forbidden of [
      /from\s+["']node:/,
      /\bZotero\b/,
      /\bdocument\b/,
      /zotero-plugin-toolkit/,
      /from\s+["'][^"']*repository/,
      /from\s+["'][^"']*foundation/,
      /from\s+["'][^"']*runtime/,
    ]) {
      assert.notMatch(source, forbidden);
    }
  });
});
