import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { isDeepStrictEqual } from "node:util";
import {
  canonicalizeSynthesisEngineJson,
  createInProcessSynthesisCitationGraphMetricsEngine,
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
import { createSynthesisSidecarComputeWorkerPool } from "../apps/synthesis-service/src/computeWorkerPool.js";

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

  const pool = createSynthesisSidecarComputeWorkerPool({
    rustWorkerPath: binary,
  });
  const tagEngine = createInProcessSynthesisTagVocabularyEngine();
  const conceptEngine = createInProcessSynthesisConceptKbIndexEngine();
  try {
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
  } finally {
    await pool.shutdown();
  }
  process.stdout.write(
    `${JSON.stringify({ ok: true, operations: 6, protocol: WORKER_PROTOCOL })}\n`,
  );
}

await main();
