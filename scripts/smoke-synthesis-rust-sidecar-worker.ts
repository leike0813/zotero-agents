import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { isDeepStrictEqual } from "node:util";
import {
  canonicalizeSynthesisEngineJson,
  createInProcessSynthesisCitationGraphMetricsEngine,
  rebuildSynthesisCitationGraphLayoutRequest,
  rebuildSynthesisCitationGraphMetricsRequest,
} from "../packages/synthesis-engine/src/index.js";
import {
  createInProcessSynthesisTagVocabularyEngine,
  rebuildSynthesisTagVocabularyIndexRequest,
  rebuildSynthesisTagVocabularyValidationRequest,
} from "../packages/synthesis-engine/src/tagVocabulary.js";
import {
  createInProcessSynthesisConceptKbIndexEngine,
  rebuildSynthesisConceptKbIndexRequest,
  rebuildSynthesisConceptKbQueryRequest,
} from "../packages/synthesis-engine/src/conceptKbIndex.js";
import {
  createInProcessSynthesisTopicGraphIndexEngine,
  rebuildSynthesisTopicGraphIndexRequest,
} from "../packages/synthesis-engine/src/topicGraphIndex.js";
import {
  computeSynthesisReferenceBinding,
  computeSynthesisReferenceDedupe,
  rebuildSynthesisReferenceBindingRequest,
  rebuildSynthesisReferenceDedupeRequest,
} from "../packages/synthesis-engine/src/referenceMatcher.js";
import {
  createInProcessSynthesisTopicStructuredArtifactEngine,
  rebuildSynthesisTopicArtifactAssemblyRequest,
  rebuildSynthesisTopicArtifactValidationRequest,
  rebuildSynthesisTopicManifestValidationRequest,
  rebuildSynthesisTopicSectionPatchRequest,
} from "../packages/synthesis-engine/src/topicStructuredArtifact.js";
import {
  createInProcessSynthesisCitationGraphBuildEngine,
  rebuildSynthesisCitationGraphBuildRequest,
} from "../packages/synthesis-engine/src/citationGraphBuild.js";
import { buildSynthesisCitationGraphBuildTransferPageArtifact } from "../packages/synthesis-engine/src/citationGraphBuildTransfer.js";
import {
  createSynthesisSidecarComputeWorkerPool,
  synthesisRustPagedRequestHash,
} from "../apps/synthesis-service/src/computeWorkerPool.js";

const WORKER_PROTOCOL = "synthesis-rust-worker.v1";

function requiredArgument(index: number, label: string) {
  const value = String(process.argv[index] || "").trim();
  if (!value) throw new Error(`Missing ${label}`);
  return value;
}

async function expectedFingerprint(source: string) {
  if (/^[a-f0-9]{64}$/.test(source)) return source;
  const provenance = JSON.parse(await fs.readFile(source, "utf8")) as {
    sourceFingerprint?: unknown;
  };
  if (
    typeof provenance.sourceFingerprint !== "string" ||
    !/^[a-f0-9]{64}$/.test(provenance.sourceFingerprint)
  ) {
    throw new Error("Invalid Rust sidecar provenance fingerprint");
  }
  return provenance.sourceFingerprint;
}

async function verifyReady(binary: string, expected: string) {
  const child = spawn(binary, ["worker"], {
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderr = `${stderr}${String(chunk)}`.slice(-4096);
  });
  const lines = createInterface({ input: child.stdout });
  let readyTimeout: NodeJS.Timeout | undefined;
  try {
    const frame = await Promise.race([
      new Promise<Record<string, unknown>>((resolve, reject) => {
        lines.once("line", (line) => {
          try {
            resolve(JSON.parse(line) as Record<string, unknown>);
          } catch (error) {
            reject(error);
          }
        });
        child.once("error", reject);
        child.once("exit", (code) =>
          reject(
            new Error(`Rust worker exited before ready (${code}): ${stderr}`),
          ),
        );
      }),
      new Promise<never>(
        (_, reject) =>
          (readyTimeout = setTimeout(
            () => reject(new Error("Rust worker ready timeout")),
            5_000,
          )),
      ),
    ]);
    if (
      frame.protocol !== WORKER_PROTOCOL ||
      frame.type !== "ready" ||
      frame.buildFingerprint !== expected
    ) {
      throw new Error(
        `Unexpected Rust worker ready frame: ${JSON.stringify(frame)}`,
      );
    }
  } finally {
    clearTimeout(readyTimeout);
    lines.close();
    child.kill();
  }
}

function assertParity(operation: string, actual: unknown, expected: unknown) {
  if (!isDeepStrictEqual(actual, expected)) {
    throw new Error(
      `${operation} parity failed: ${canonicalizeSynthesisEngineJson(actual)} != ${canonicalizeSynthesisEngineJson(expected)}`,
    );
  }
}

async function main() {
  const binary = requiredArgument(2, "Rust sidecar binary path");
  const fingerprintSource = requiredArgument(
    3,
    "Rust fingerprint or provenance path",
  );
  await verifyReady(binary, await expectedFingerprint(fingerprintSource));

  const metricsRequest = rebuildSynthesisCitationGraphMetricsRequest({
    graphHash: `sha256:${"0".repeat(64)}`,
    nodes: [
      {
        nodeId: "paper:1",
        kind: "library_paper",
        libraryId: 1,
        itemKey: "1",
        title: "Smoke",
        year: "2024",
      },
    ],
    edges: [],
  });
  const tagValidationRequest = rebuildSynthesisTagVocabularyValidationRequest({
    contractVersion: "synthesis-tag-vocabulary.v1",
    algorithmVersion: "tag-vocabulary-validation.v1",
    entries: [
      {
        tag: "ai_task:NER",
        facet: "ai_task",
        aliases: [],
        abbrev: [],
      },
    ],
    aliases: {},
    abbrev: { ner: "NER" },
    protocol: {
      version: "1.0.0",
      tagPattern: "^[a-z_]+:[a-zA-Z0-9/_.-]+$",
      maxTagLength: 120,
      facets: ["ai_task"],
    },
  });
  const tagIndexRequest = rebuildSynthesisTagVocabularyIndexRequest({
    ...tagValidationRequest,
    algorithmVersion: "tag-vocabulary-index.v1",
    sourceManifestHash: `sha256:${"a".repeat(64)}`,
    rebuiltAt: "2026-07-19T00:00:00.000Z",
  });
  const conceptSource = {
    concepts: [
      {
        conceptId: "concept:vision",
        label: "Vision",
        aliases: ["CV"],
        conceptType: "method",
        domain: "research",
        status: "active" as const,
      },
    ],
    senses: [],
    aliases: [
      {
        aliasId: "alias:cv",
        alias: "CV",
        normalized: "cv",
        conceptId: "concept:vision",
        status: "active" as const,
        confidence: "high" as const,
      },
    ],
  };
  const conceptIndexRequest = rebuildSynthesisConceptKbIndexRequest({
    contractVersion: "synthesis-concept-kb-index.v1",
    algorithmVersion: "concept-kb-index.v1",
    ...conceptSource,
    sourceManifestHash: `sha256:${"b".repeat(64)}`,
    rebuiltAt: "2026-07-19T00:00:00.000Z",
  });
  const conceptQueryRequest = rebuildSynthesisConceptKbQueryRequest({
    contractVersion: "synthesis-concept-kb-index.v1",
    algorithmVersion: "concept-kb-query.v1",
    ...conceptSource,
    labels: ["CV"],
  });
  const topicRequest = rebuildSynthesisTopicGraphIndexRequest({
    contractVersion: "synthesis-topic-graph-index.v1",
    algorithmVersion: "topic-graph-index.v1",
    sourceManifestHash: `sha256:${"c".repeat(64)}`,
    rebuiltAt: "2026-07-19T00:00:00.000Z",
    nodes: [
      {
        topicId: "topic:root",
        isRoot: true,
        level: "top",
        definitionStatus: "has_synthesis",
      },
      {
        topicId: "topic:child",
        isRoot: false,
        level: "normal",
        definitionStatus: "placeholder",
      },
    ],
    edges: [
      {
        edgeId: "edge:root-child",
        sourceTopicId: "topic:child",
        targetTopicId: "topic:root",
        relation: "broader_than",
        status: "confirmed",
      },
    ],
  });
  const layoutRequest = rebuildSynthesisCitationGraphLayoutRequest({
    graphHash: `sha256:${"1".repeat(64)}`,
    algorithm: "force",
    nodes: [
      {
        nodeId: "paper:1",
        kind: "library_paper",
        title: "Smoke",
        year: "2024",
        initialX: 0,
        initialY: 0,
      },
    ],
    edges: [],
  });
  const bindingRequest = rebuildSynthesisReferenceBindingRequest({
    contractVersion: "synthesis-reference-matcher.v1",
    algorithmVersion: "reference-binding.v1",
    policyId: "production",
    papers: [
      {
        paperRef: "1:A",
        itemKey: "A",
        title: "Smoke Reference",
        authors: ["Author"],
        identifiers: [{ kind: "doi", value: "10.1000/smoke" }],
      },
    ],
    references: [
      {
        canonicalReferenceId: "canonical:1",
        reference: {
          title: "Smoke Reference",
          rawReference: "doi:10.1000/smoke",
        },
      },
    ],
  });
  const dedupeRequest = rebuildSynthesisReferenceDedupeRequest({
    contractVersion: "synthesis-reference-matcher.v1",
    algorithmVersion: "canonical-cluster-dedupe.v1",
    canonicals: [
      {
        canonicalReferenceId: "canonical:1",
        title: "Exact Reference Matching Work",
        year: "2024",
        authors: ["Alpha"],
        acceptedBinding: false,
        stickyRepresentative: true,
        rawReferenceIds: ["raw:1"],
        rawHashes: ["hash:1"],
        rawReferences: ["Exact Reference Matching Work"],
        sourceRefs: ["1:A"],
        identifiers: [{ kind: "doi", value: "10.1000/exact" }],
        titleCandidates: [],
      },
      {
        canonicalReferenceId: "canonical:2",
        title: "Exact Reference Matching Work",
        year: "2024",
        authors: ["Alpha"],
        acceptedBinding: false,
        stickyRepresentative: false,
        rawReferenceIds: ["raw:2"],
        rawHashes: ["hash:2"],
        rawReferences: ["Exact Reference Matching Work"],
        sourceRefs: ["1:B"],
        identifiers: [{ kind: "doi", value: "10.1000/exact" }],
        titleCandidates: [],
      },
    ],
  });
  const topicArtifactEngine =
    createInProcessSynthesisTopicStructuredArtifactEngine();
  const manifestValidationRequest =
    rebuildSynthesisTopicManifestValidationRequest({
      contractVersion: "synthesis-topic-structured-artifact.v1",
      algorithmVersion: "topic-analysis-manifest-validation.v1",
      manifest: {},
    });
  const artifactAssemblyRequest = rebuildSynthesisTopicArtifactAssemblyRequest({
    contractVersion: "synthesis-topic-structured-artifact.v1",
    algorithmVersion: "topic-structured-artifact-assembly.v1",
    manifest: { language: "en" },
    sections: { topic: { title: "Smoke" } },
  });
  const artifactValidationRequest =
    rebuildSynthesisTopicArtifactValidationRequest({
      contractVersion: "synthesis-topic-structured-artifact.v1",
      algorithmVersion: "topic-structured-artifact-validation.v1",
      artifact: { schema_id: "invalid" },
    });
  const sectionPatchRequest = rebuildSynthesisTopicSectionPatchRequest({
    contractVersion: "synthesis-topic-structured-artifact.v1",
    algorithmVersion: "topic-section-patch.v1",
    currentManifest: { section_hashes: { topic: "sha256:old" } },
    currentSections: { topic: { title: "Old" } },
    patchManifest: {
      patch: {
        read_section_hashes: { topic: "sha256:old" },
        replace_section_hashes: { topic: "sha256:old" },
        sections: { topic: { hash: "sha256:new" } },
      },
    },
    changedSections: { topic: { title: "New" } },
  });
  const graphBuildRequest = rebuildSynthesisCitationGraphBuildRequest({
    contractVersion: "synthesis-citation-graph-build.v1",
    scope: { kind: "full", sourceIds: [] },
    rolePriority: [],
    libraryNodes: [
      { nodeId: "paper:A", title: "Smoke", authors: [], aliases: [] },
    ],
    references: [],
  });

  const pool = createSynthesisSidecarComputeWorkerPool({
    rustWorkerPath: binary,
  });
  const tagEngine = createInProcessSynthesisTagVocabularyEngine();
  const conceptEngine = createInProcessSynthesisConceptKbIndexEngine();
  try {
    const layoutResult = await pool.runCitationGraphLayout(layoutRequest);
    if (
      layoutResult.layoutEngine !== "forceatlas2-rust" ||
      layoutResult.layoutVersion !== 2 ||
      layoutResult.nodes.length !== 1 ||
      layoutResult.nodes[0]?.nodeId !== "paper:1"
    ) {
      throw new Error(
        `citation_graph_layout.v2 smoke failed: ${canonicalizeSynthesisEngineJson(layoutResult)}`,
      );
    }
    assertParity(
      "citation_graph_metrics.v1",
      await pool.runCitationGraphMetrics(metricsRequest),
      await createInProcessSynthesisCitationGraphMetricsEngine().compute(
        metricsRequest,
      ),
    );
    assertParity(
      "tag_vocabulary_validate.v1",
      await pool.runTagVocabularyValidation(tagValidationRequest),
      tagEngine.validate(tagValidationRequest),
    );
    assertParity(
      "tag_vocabulary_index.v1",
      await pool.runTagVocabularyIndex(tagIndexRequest),
      tagEngine.buildIndex(tagIndexRequest),
    );
    assertParity(
      "concept_kb_index.v1",
      await pool.runConceptKbIndex(conceptIndexRequest),
      await conceptEngine.buildIndex(conceptIndexRequest),
    );
    assertParity(
      "concept_kb_query.v1",
      await pool.runConceptKbQuery(conceptQueryRequest),
      await conceptEngine.query(conceptQueryRequest),
    );
    assertParity(
      "topic_graph_index.v1",
      await pool.runTopicGraphIndex(topicRequest),
      await createInProcessSynthesisTopicGraphIndexEngine().buildIndex(
        topicRequest,
      ),
    );
    assertParity(
      "reference_binding.v1",
      await pool.runReferenceBinding(bindingRequest),
      computeSynthesisReferenceBinding(bindingRequest),
    );
    assertParity(
      "reference_canonical_dedupe.v1",
      await pool.runReferenceCanonicalDedupe(dedupeRequest),
      computeSynthesisReferenceDedupe(dedupeRequest),
    );
    assertParity(
      "topic_manifest_validate.v1",
      await pool.runTopicManifestValidation(manifestValidationRequest),
      await topicArtifactEngine.validateManifest(manifestValidationRequest),
    );
    assertParity(
      "topic_artifact_assemble.v1",
      await pool.runTopicArtifactAssembly(artifactAssemblyRequest),
      await topicArtifactEngine.assembleArtifact(artifactAssemblyRequest),
    );
    assertParity(
      "topic_artifact_validate.v1",
      await pool.runTopicArtifactValidation(artifactValidationRequest),
      await topicArtifactEngine.validateArtifact(artifactValidationRequest),
    );
    assertParity(
      "topic_section_patch.v1",
      await pool.runTopicSectionPatch(sectionPatchRequest),
      await topicArtifactEngine.applySectionPatch(sectionPatchRequest),
    );
    const graphExpected =
      await createInProcessSynthesisCitationGraphBuildEngine().compute(
        graphBuildRequest,
      );
    assertParity(
      "citation_graph_build.v1",
      await pool.runCitationGraphBuild(graphBuildRequest),
      graphExpected,
    );
    const inputArtifacts = [
      buildSynthesisCitationGraphBuildTransferPageArtifact(
        "library_nodes",
        0,
        graphBuildRequest.libraryNodes,
      ),
      buildSynthesisCitationGraphBuildTransferPageArtifact(
        "references",
        0,
        graphBuildRequest.references,
      ),
    ];
    const transferHeader = {
      contractVersion: graphBuildRequest.contractVersion,
      scope: graphBuildRequest.scope,
      rolePriority: graphBuildRequest.rolePriority,
    };
    const output = new Map<string, unknown[]>();
    let outputHeader: Record<string, unknown> = {};
    await pool.runCitationGraphBuildTransfer({
      header: transferHeader,
      requestHash: synthesisRustPagedRequestHash(
        "citation_graph_build_transfer.v1",
        transferHeader,
        inputArtifacts.map(({ page }) => ({
          section:
            page.descriptor.kind === "library_nodes"
              ? "libraryNodes"
              : "references",
          pageIndex: page.descriptor.pageIndex,
          rowCount: page.descriptor.rowCount,
          byteLength: page.descriptor.byteLength,
          sha256: page.descriptor.sha256,
        })),
      ),
      async *inputPages() {
        for (const artifact of inputArtifacts) {
          yield {
            descriptor: artifact.page.descriptor,
            bytes: artifact.bytes.buffer.slice(
              artifact.bytes.byteOffset,
              artifact.bytes.byteOffset + artifact.bytes.byteLength,
            ) as ArrayBuffer,
          };
        }
      },
      outputStarted() {},
      outputPage(frame) {
        output.set(frame.descriptor.kind, [
          ...(output.get(frame.descriptor.kind) || []),
          ...(JSON.parse(new TextDecoder().decode(frame.bytes)) as unknown[]),
        ]);
      },
      outputComplete(header) {
        outputHeader = header;
      },
    });
    assertParity(
      "citation_graph_build_transfer.v1",
      {
        ...outputHeader,
        nodes: output.get("nodes") || [],
        resolvedEdges: output.get("resolved_edges") || [],
        aggregateEdges: output.get("aggregate_edges") || [],
        sourceOwnership: output.get("source_ownership") || [],
        incomingGroups: output.get("incoming_groups") || [],
        lightMetrics: output.get("light_metrics") || [],
      },
      graphExpected,
    );
  } finally {
    await pool.shutdown();
  }
  process.stdout.write(
    `${JSON.stringify({ ok: true, operations: 15, protocol: WORKER_PROTOCOL })}\n`,
  );
}

await main();
