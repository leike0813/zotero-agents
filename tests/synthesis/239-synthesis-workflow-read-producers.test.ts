import { SYNTHESIS_DISABLED_WEBDAV_DESCRIPTION } from "../helpers/synthesisProductionRouteHarness";
import { assert } from "chai";
import { execFile } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { consumeSynthesisSidecarOutputJson } from "../../src/modules/synthesis/sidecar/synthesisSidecarTransferClient";
import { createSynthesisSidecarRpcClient } from "../../src/modules/synthesis/sidecar/synthesisSidecarRpcClient";
import { createSynthesisHostRunWorkspaceMaterializationPort } from "../../src/modules/synthesis/runWorkspaceMaterializationAdapter";
import { SYNTHESIS_PRODUCTION_ROUTE_CLIENT_TOKEN } from "../helpers/synthesisProductionRouteHarness";
import { installNodeZoteroTransactionStub } from "../helpers/nodeZoteroTransactionStub";
import { nativeFixtureMutations as handlers } from "../helpers/nativeFixtureMutations";
import {
  buildSelectionContext,
  itemRef,
} from "../helpers/workflowSelectionContext";
import {
  setZoteroLibrarySourcePageQueryAdapterForTests,
  resetZoteroLibrarySourcePageQueryAdapterForTests,
} from "../../src/modules/zoteroHost/zoteroLibraryPageQuery";
import { createMockZoteroLibrarySourcePageQueryAdapter } from "../helpers/zoteroLibraryPageQueryAdapter";
import { createWorkflowHostApi } from "../../src/workflows/hostApi";
import { createWorkflowSynthesisHostApi } from "../../src/modules/synthesisClient/workflowHostClient";
import { createWorkflowArchiveApi } from "../../src/workflows/archive";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import { executeBuildRequests } from "../../src/workflows/runtime";
import { ZipBundleReader } from "../../src/workflows/zipBundleReader";
import { hashSynthesisContractCanonicalJson } from "../../packages/synthesis-contracts/src";
import type { SynthesisTopicApplyRequest } from "../../packages/synthesis-contracts/src";
import {
  SYNTHESIS_PRODUCTION_ROUTE_EXECUTABLE as EXECUTABLE,
  startSynthesisProductionRouteHarness,
  type SynthesisProductionRouteHarness,
  type SynthesisProductionRouteHostFixture,
} from "../helpers/synthesisProductionRouteHarness";
import { startTopicSynthesisPrepareProducerHarness } from "../helpers/topicSynthesisPrepareProducerHarness";
import { getRuntimePersistencePaths } from "../../src/modules/runtimePersistence";
import {
  isZoteroRuntime,
  joinPath,
  mkTempDir,
  writeUtf8,
  workflowsPath,
} from "../zotero/workflow-test-utils";

const SOURCE_PAPER_REF = "1:READPRODUCER1";
const DIGEST_MARKER = "Read-producer digest body 7c41a";
const REPORT_MARKER = "Read-producer Topic report body 3b90e";

/**
 * The production Hook composition. Only the client source is substituted; the
 * facade, its member surface, and the read routing are production code.
 */
function producerHostApi(harness: SynthesisProductionRouteHarness) {
  return createWorkflowHostApi({
    synthesis: createWorkflowSynthesisHostApi({
      resolveClient: async () => harness.client,
    }),
  });
}

async function producerWorkflow(workflowId: string) {
  const loaded = await loadWorkflowManifests(workflowsPath());
  const workflow = loaded.workflows.find(
    (entry) => entry.manifest.id === workflowId,
  );
  assert.isOk(
    workflow,
    `workflow ${workflowId} not found; warnings=${JSON.stringify(loaded.warnings)} errors=${JSON.stringify(loaded.errors)}`,
  );
  return workflow!;
}

function digest(value: unknown) {
  return hashSynthesisContractCanonicalJson(value);
}

type ArtifactFixture = {
  artifactType: string;
  payloadType: string;
  content: Record<string, unknown>;
};

/**
 * Real host-side paper artifacts. The sidecar scans and reads these through its
 * own artifact library route, so the workflow sees what the production route
 * decodes, not a test-owned read result.
 */
function paperArtifactHostFixture(
  paperRef: string,
  artifacts: ArtifactFixture[],
): SynthesisProductionRouteHostFixture {
  const locator = (artifactType: string) =>
    `fixture:${paperRef}:${artifactType}`;
  return {
    handle({ capability, payload }) {
      if (capability === "webdav.describe")
        return SYNTHESIS_DISABLED_WEBDAV_DESCRIPTION;
      if (capability === "library.artifacts.scan_page") {
        const rows = artifacts.map((artifact) => ({
          paperRef,
          artifactType: artifact.artifactType,
          payloadType: artifact.payloadType,
          status: "available",
          locator: locator(artifact.artifactType),
          payloadHash: digest(artifact.content),
          diagnostics: [],
        }));
        return {
          artifacts: rows,
          cursor: String(payload.cursor || ""),
          nextCursor: "",
          hasMore: false,
          returned: rows.length,
          limit: Number(payload.limit || 50),
          snapshotRevision: "read-producers",
        };
      }
      if (capability === "library.artifacts.read") {
        const artifact = artifacts.find(
          (entry) => locator(entry.artifactType) === payload.locator,
        );
        if (!artifact) return { status: "missing", diagnostics: [] };
        return {
          status: "available",
          payloadHash: payload.expectedHash,
          content: artifact.content,
          diagnostics: [],
        };
      }
      return { status: "unavailable", diagnostics: [] };
    },
  };
}

function paperArtifacts() {
  return [
    {
      artifactType: "digest",
      payloadType: "digest-markdown",
      content: {
        kind: "text",
        text: `# Digest\n\n${DIGEST_MARKER}`,
        mediaType: "text/markdown",
      },
    },
    {
      artifactType: "references",
      payloadType: "references-json",
      content: {
        kind: "json",
        value: {
          schema: "source_reference_artifact.v1",
          references: [
            {
              sourceReferenceId: "source-reference-read-producer",
              extraction: null,
              bibliography: {
                title: "Read producer reference",
                authors: [],
                year: 2020,
              },
              matching: {},
            },
          ],
        },
      },
    },
    {
      artifactType: "citation_analysis",
      payloadType: "citation-analysis-json",
      content: {
        kind: "json",
        value: {
          schema: "citation_analysis_artifact.v1",
          meta: {
            language: "en",
            scope: { section_title: null, line_start: null, line_end: null },
            scope_source: null,
            scope_decision: {
              selection_reason: null,
              covered_sections: [],
              fallback_from: null,
              fallback_reason: null,
            },
            mapping_reliability: "normal",
            reference_extraction: { status: "completed" },
          },
          summary: "Read producer citation analysis.",
          timeline: {
            early: { summary: "", sourceReferenceIds: [] },
            mid: { summary: "", sourceReferenceIds: [] },
            recent: { summary: "", sourceReferenceIds: [] },
          },
          items: [],
          unresolved: [],
        },
      },
    },
  ];
}

function topicPrepareArtifacts(paperRef: string): ArtifactFixture[] {
  const [digest, references, citation] = paperArtifacts();
  return [
    {
      ...digest,
      content: {
        kind: "text",
        text: `# ${paperRef}\n\nSynthetic digest evidence.`,
        mediaType: "text/markdown",
      },
    },
    references,
    citation,
    {
      artifactType: "literature_score",
      payloadType: "literature-score-json",
      content: {
        kind: "json",
        value: {
          schema: "literature_score.v1",
          rubric_id: "fixture.v1",
          paper_type: "empirical",
          paper_type_reason: "Synthetic test evidence.",
          overall_score: 75,
          confidence: 0.8,
          confidence_adjusted_score: 60,
          dimensions: [
            "methodological_rigor",
            "evidence_completeness",
            "reproducibility",
            "innovation_signals",
            "research_impact_potential",
            "writing_quality",
          ].map((dimension_key) => ({
            dimension_key,
            name: dimension_key,
            configured_weight: 1 / 6,
            effective_weight: 1 / 6,
            raw_score: 7,
            applicable_max_score: 10,
            score: 70,
            confidence: 0.8,
            summary: "Synthetic assessment.",
            criteria: [
              {
                criterion_key: `${dimension_key}.criterion`,
                name: "Synthetic criterion",
                status: "scored",
                score: 7,
                max_score: 10,
                reason: "Synthetic evidence.",
                evidence: [],
              },
            ],
          })),
        },
      },
    },
  ];
}

/**
 * The artifact library route is the only capability that fails; the workflow
 * must surface it as a stable diagnostic instead of reporting success.
 */
function failingArtifactHostFixture(): SynthesisProductionRouteHostFixture {
  return {
    handle({ capability }) {
      if (capability === "webdav.describe")
        return SYNTHESIS_DISABLED_WEBDAV_DESCRIPTION;
      if (capability === "library.artifacts.scan_page") {
        throw new Error("fixture artifact scan failure");
      }
      return { status: "unavailable", diagnostics: [] };
    },
  };
}

function topicApplyRequest(topicId: string): SynthesisTopicApplyRequest {
  const title = "Read Producer Topic";
  const definition = "A durable read-producer fixture.";
  const sections: Record<string, unknown> = {
    topic: {
      id: topicId,
      title,
      definition,
      discipline: "Information Science",
      scope: "Read producer coverage",
    },
    summary: { overview: "A bounded read-producer fixture." },
    taxonomy: {
      summary: { text: "One bounded route." },
      nodes: [
        {
          id: "route:read-producer",
          definition: "Durable read route",
          core_problem: "Serve Topic reports to workflow consumers",
          mechanism: "Canonical repository and artifact library",
          source_paper_refs: [SOURCE_PAPER_REF],
          strengths: ["durable"],
          limitations: ["fixture scope"],
          maturity: "validated",
        },
      ],
    },
    improvement_dimensions: [
      {
        id: "dimension:read-producer",
        analysis: "Reads stay available to workflow consumers.",
        source_paper_refs: [SOURCE_PAPER_REF],
      },
    ],
    claims: [
      {
        id: "claim:read-producer",
        text: "Topic reports are readable by producers.",
        analysis: "The public route serves the committed artifact.",
        scope: "Read producer fixture",
        source_paper_refs: [SOURCE_PAPER_REF],
      },
    ],
    timeline_events: {
      summary: { text: "Create, commit, read back." },
      events: [
        {
          id: "event:read-producer",
          description: "The report is read through the public route.",
          phase: "validation",
          source_paper_refs: [SOURCE_PAPER_REF],
        },
      ],
    },
    source_papers: [
      {
        paper_ref: SOURCE_PAPER_REF,
        digest_ref: {
          paper_ref: SOURCE_PAPER_REF,
          payload_type: "digest-markdown",
        },
      },
    ],
    debates: [],
    statistics: {
      paper_count: 1,
      time_span: { start_year: 2026, end_year: 2026 },
      route_coverage: "One fixture route",
      coverage_verdict: "partial",
    },
    coverage: {
      coverage_verdict: "partial",
      coverage_reason: "One bounded fixture source.",
      coverage_caveats: ["Fixture scope."],
      external_context_summary: "Outside this fixture.",
      suggested_collection_directions: [],
    },
    future_directions: [
      { id: "future:read-producer", source_paper_refs: [SOURCE_PAPER_REF] },
    ],
    review_outline: {
      topic_importance: "Readable reports keep workflow consumers honest.",
      writing_strategies: [
        {
          id: "strategy:read-producer",
          title: "Read producer",
          review_thesis: "Consumers read committed artifacts.",
          writing_strategy: "Follow the committed report body.",
          best_for: "Read coverage",
          risks: "Fixture scope",
          section_plan: ["Create", "Read back"],
          source_paper_refs: [SOURCE_PAPER_REF],
        },
      ],
      recommended_strategy_id: "strategy:read-producer",
    },
    synthesis_report: {
      title: "Read Producer Route",
      source_section_chapters: {
        research_routes: "taxonomy.summary",
        historical_progression: "timeline_events.summary",
      },
      body:
        `This bounded report is read back by a workflow producer through the public route. ${REPORT_MARKER}. ` +
        "The fixture keeps its literature claims narrow because the observable contract under test is that a " +
        "read-only workflow consumer receives the committed Topic report body over the production transport " +
        "rather than a test-owned stand-in. The body is deliberately longer than the minimum substantive prose " +
        "bound so the canonical artifact validator accepts the fixture without weakening any assertion about the " +
        "read path, and it stays a single paragraph because the fixture keeps its source paper count small.",
    },
    source_artifacts: [
      {
        paper_ref: SOURCE_PAPER_REF,
        artifact_type: "digest",
        payload_type: "digest-markdown",
        status: "available",
        hash: "sha256:read-producer-fixture-digest",
      },
      {
        paper_ref: SOURCE_PAPER_REF,
        artifact_type: "references",
        payload_type: "references-json",
        status: "available",
        hash: "sha256:read-producer-fixture-references",
      },
      {
        paper_ref: SOURCE_PAPER_REF,
        artifact_type: "citation_analysis",
        payload_type: "citation-analysis-json",
        status: "available",
        hash: "sha256:read-producer-fixture-citation-analysis",
      },
    ],
    diagnostics: { warnings: [] },
  };
  const sidecars: Record<string, unknown> = {
    concept_cards_proposal: {
      schema_id: "synthesis.concept_cards_proposal",
      schema_version: "1.0.0",
      cards: [],
    },
    topic_graph_relation_proposals: {
      schema_id: "synthesis.topic_graph_relation_proposals",
      proposals: [],
    },
    topic_interest_metadata: {
      schema: "topic_interest_metadata.v1",
      topic_id: topicId,
      include_terms: ["read producer"],
    },
    prospective_topic_relation_proposals: {
      schema_id: "synthesis.prospective_topic_relation_proposals",
      proposals: [],
    },
  };
  return {
    bundle: {
      kind: "topic_synthesis",
      operation: "create",
      mode: "create",
      language: "en",
      topic_definition: { id: topicId, title, definition },
      artifact_manifest_path: "asset/artifact-manifest",
      artifact_metadata: {
        runtime: "split-skill",
        topic_id: topicId,
        depends_on: {
          papers: [SOURCE_PAPER_REF],
          artifacts: ["digest-markdown"],
        },
      },
    },
    assets: [
      {
        id: "asset/artifact-manifest",
        mediaType: "application/json",
        text: JSON.stringify({
          topic_analysis: "asset/manifest",
          resolver_manifest: "asset/resolver",
        }),
      },
      {
        id: "asset/manifest",
        mediaType: "application/json",
        text: JSON.stringify({
          schema_id: "synthesis.topic_analysis_manifest",
          schema_version: "3.0.0",
          operation: "create",
          topic_id: topicId,
          language: "en",
          sections: Object.fromEntries(
            Object.keys(sections).map((name) => [
              name,
              { path: `asset/section/${name}`, content_type: "json" },
            ]),
          ),
          sidecars: Object.fromEntries(
            Object.keys(sidecars).map((name) => [
              name,
              {
                path: `asset/sidecar/${name}`,
                content_type: "json",
                schema_id: `fixture.${name}`,
              },
            ]),
          ),
        }),
      },
      {
        id: "asset/resolver",
        mediaType: "application/json",
        text: JSON.stringify({
          resolver: {
            paper_refs: [SOURCE_PAPER_REF],
            collection_key: [],
            combine: "union",
          },
          resolved_paper_set: { papers: [{ paper_ref: SOURCE_PAPER_REF }] },
        }),
      },
      ...Object.entries(sections).map(([name, value]) => ({
        id: `asset/section/${name}`,
        mediaType: "application/json" as const,
        text: JSON.stringify(value),
      })),
      ...Object.entries(sidecars).map(([name, value]) => ({
        id: `asset/sidecar/${name}`,
        mediaType: "application/json" as const,
        text: JSON.stringify(value),
      })),
    ],
  } as unknown as SynthesisTopicApplyRequest;
}

function selectionRequest(topicId: string) {
  return {
    schema_id: "research_bundle.selection",
    intent: {
      paper_title: "Read producer selection",
      article_type: "original research",
      research_content: "Read the committed Topic report.",
    },
    topics: [{ topic_id: topicId, relevance: 1 }],
    papers: [],
  };
}

async function runExportResearchBundle(args: {
  harness: SynthesisProductionRouteHarness;
  selection: unknown;
}) {
  const workflow = await producerWorkflow("export-research-bundle");
  let registration: Record<string, any> | undefined;
  const applied = (await workflow.hooks.applyResult({
    runResult: { status: "succeeded" },
    resultContext: {
      resultJson: { selection_manifest_path: "result/research-selection.json" },
      async readArtifactText() {
        return { text: JSON.stringify(args.selection) };
      },
    },
    runtime: {
      hostApi: {
        ...producerHostApi(args.harness),
        researchBundles: {
          async materializePapers() {
            return { papers: [], completeness: "complete", issues: [] };
          },
        },
        archive: createWorkflowArchiveApi(),
      },
    },
    productStorage: {
      async registerProduct(input: Record<string, any>) {
        registration = input;
        return {
          productId: "read-producer-product",
          assetCount: input.assets.length,
          availableAssetCount: input.assets.length,
          missingAssetCount: 0,
        };
      },
    },
  })) as Record<string, any>;
  return { applied, registration: registration! };
}

function assetText(registration: Record<string, any>, path: string) {
  const asset = registration.assets.find(
    (entry: any) => entry.productAssetPath === path,
  );
  assert.isOk(asset, `the Product must carry ${path}`);
  return String(asset.source?.text ?? "");
}

describe("Synthesis read-only workflow producer routes", function () {
  this.timeout(180_000);

  before(function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
  });

  describe("export-research-bundle", function () {
    it("embeds the Topic report read through the real production route", async function () {
      const topicId = "read-producer-report-topic";
      const harness = await startSynthesisProductionRouteHarness({
        id: "producer-export-research-bundle",
      });
      try {
        const seeded =
          await harness.client.workflowApply.applyTopicSynthesisResult(
            topicApplyRequest(topicId),
          );
        assert.equal(seeded.status, "persisted");

        const wireOffset = harness.recorder.wire.length;
        const { applied, registration } = await runExportResearchBundle({
          harness,
          selection: selectionRequest(topicId),
        });

        assert.equal(applied.status, "recorded");
        assert.deepEqual(applied.product, {
          productId: "read-producer-product",
          assetCount: registration.assets.length,
        });
        const manifest = JSON.parse(assetText(registration, "manifest.json"));
        const report = assetText(registration, "topics/topic-001/report.md");
        assert.include(report, REPORT_MARKER);
        assert.deepEqual(
          manifest.topics.map((topic: any) => ({
            topic_id: topic.topic_id,
            report_path: topic.report_path,
          })),
          [{ topic_id: topicId, report_path: "topics/topic-001/report.md" }],
        );
        assert.deepEqual(manifest.warnings, []);
        assert.include(
          harness.recorder.wire
            .slice(wireOffset)
            .map((sample) => sample.capability),
          "client.getTopicReport",
          "the report must be read over the production route",
        );
        harness.recordWorkflowProducer("export-research-bundle");
      } finally {
        await harness.stop();
      }
    });

    it("propagates an absent Topic report as a stable warning", async function () {
      const harness = await startSynthesisProductionRouteHarness({
        id: "producer-export-research-bundle-missing",
      });
      try {
        const missingTopicId = "topic:read-producer-missing";
        const { applied, registration } = await runExportResearchBundle({
          harness,
          selection: selectionRequest(missingTopicId),
        });

        assert.equal(applied.status, "recorded");
        const manifest = JSON.parse(assetText(registration, "manifest.json"));
        assert.isNull(
          manifest.topics[0].report_path,
          "an unreadable report must not claim a path",
        );
        assert.deepEqual(
          manifest.warnings.map((warning: any) => warning.code),
          ["topic_report_missing"],
        );
        assert.notInclude(
          registration.assets.map((entry: any) => entry.productAssetPath),
          "topics/topic-001/report.md",
        );
      } finally {
        await harness.stop();
      }
    });
  });

  describe("literature-deep-reading", function () {
    let restoreTransaction: () => void;
    beforeEach(() => {
      restoreTransaction = installNodeZoteroTransactionStub();
      if (!isZoteroRuntime()) {
        setZoteroLibrarySourcePageQueryAdapterForTests(
          createMockZoteroLibrarySourcePageQueryAdapter(),
        );
      }
    });
    afterEach(() => {
      restoreTransaction();
      resetZoteroLibrarySourcePageQueryAdapterForTests();
    });

    async function deepReadingSourceBundle(args: {
      harness: SynthesisProductionRouteHarness;
      workflow: Awaited<ReturnType<typeof producerWorkflow>>;
      parent: Zotero.Item;
    }) {
      const requests = (await executeBuildRequests({
        workflow: args.workflow,
        selectionContext: await buildSelectionContext([args.parent]),
        runtime: { hostApi: producerHostApi(args.harness) },
      })) as Array<{
        steps: Array<{ id: string; input?: { source_bundle_path?: string } }>;
      }>;
      assert.lengthOf(requests, 1);
      const step = requests[0].steps.find(
        (entry) => entry.id === "deep_reading",
      );
      assert.isOk(step, "the deep_reading step must be built");
      const bundle = new ZipBundleReader(step?.input?.source_bundle_path || "");
      const manifest = JSON.parse(
        await bundle.readText("source-manifest.json"),
      );
      return { bundle, manifest };
    }

    async function createPaperWithMarkdown() {
      const tempDir = await mkTempDir("zs-deep-reading-read-producer");
      const markdownPath = joinPath(tempDir, "paper.md");
      await writeUtf8(markdownPath, "# Read producer paper\n\nBody.");
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Read producer paper" },
      });
      await handlers.attachment.createFromPath({
        parent,
        path: markdownPath,
        title: "paper.md",
        mimeType: "text/markdown",
      });
      return { parent, markdownPath };
    }

    it("bundles paper artifacts read through the real production route", async function () {
      const workflow = await producerWorkflow("literature-deep-reading");
      const { parent } = await createPaperWithMarkdown();
      const paperRef = `1:${parent.key}`;
      const harness = await startSynthesisProductionRouteHarness({
        id: "producer-deep-reading-artifacts",
        hostFixture: paperArtifactHostFixture(paperRef, paperArtifacts()),
      });
      try {
        const { bundle, manifest } = await deepReadingSourceBundle({
          harness,
          workflow,
          parent,
        });

        assert.include(
          await bundle.readText("artifacts/digest.md"),
          DIGEST_MARKER,
        );
        const references = JSON.parse(
          await bundle.readText("artifacts/references.json"),
        );
        assert.equal(references.schema, "source_reference_artifact.v1");
        assert.equal(
          references.references[0].bibliography.title,
          "Read producer reference",
        );
        const citation = JSON.parse(
          await bundle.readText("artifacts/citation_analysis.json"),
        );
        assert.equal(citation.schema, "citation_analysis_artifact.v1");
        assert.equal(citation.summary, "Read producer citation analysis.");
        assert.equal(
          manifest.sidecar_artifacts.digest.source,
          "host_synthesis_read_paper_artifacts",
        );
        const artifactHostCalls = harness.recorder.hostCalls
          .map((call) => call.capability)
          .filter((capability) => capability.startsWith("library.artifacts."));
        assert.includeMembers(artifactHostCalls, [
          "library.artifacts.scan_page",
          "library.artifacts.read",
        ]);
        harness.recordWorkflowProducer("literature-deep-reading");
      } finally {
        await harness.stop();
      }
    });

    it("propagates a failed artifact library read as a stable diagnostic", async function () {
      const workflow = await producerWorkflow("literature-deep-reading");
      const { parent } = await createPaperWithMarkdown();
      const harness = await startSynthesisProductionRouteHarness({
        id: "producer-deep-reading-artifacts-failed",
        hostFixture: failingArtifactHostFixture(),
      });
      try {
        const { manifest } = await deepReadingSourceBundle({
          harness,
          workflow,
          parent,
        });

        assert.isTrue(
          manifest.diagnostics.some(
            (diagnostic: any) =>
              diagnostic.code === "sidecar_host_read_failed" &&
              diagnostic.paper_ref === `1:${parent.key}`,
          ),
          `a stable read-failure diagnostic is required: ${JSON.stringify(manifest.diagnostics)}`,
        );
        assert.notEqual(
          manifest.sidecar_artifacts?.digest?.status,
          "available",
          "a failed read must not report an available artifact",
        );
      } finally {
        await harness.stop();
      }
    });
  });

  describe("create-topic-synthesis-prepare", function () {
    const paperRefs = Array.from(
      { length: 24 },
      (_, index) => `1:TOPIC${String(index + 1).padStart(2, "0")}`,
    );
    function runGateProcess(
      skillRoot: string,
      args: string[],
      env: NodeJS.ProcessEnv,
    ) {
      return new Promise<{
        status: number | null;
        stdout: string;
        stderr: string;
      }>((resolve) => {
        execFile(
          "uv",
          [
            "run",
            "--project",
            "C:/Users/leike/.ar",
            "--locked",
            "--",
            "python",
            path.join(skillRoot, "scripts", "gate.py"),
            ...args,
          ],
          {
            cwd: process.cwd(),
            encoding: "utf8",
            env: { ...process.env, ...env },
            maxBuffer: 8 * 1024 * 1024,
          },
          (error, stdout, stderr) =>
            resolve({
              status:
                error && typeof error.code === "number"
                  ? error.code
                  : error
                    ? null
                    : 0,
              stdout,
              stderr,
            }),
        );
      });
    }

    async function runGate(
      skillRoot: string,
      args: string[],
      env: NodeJS.ProcessEnv,
    ) {
      const result = await runGateProcess(skillRoot, args, env);
      if (result.status !== 0)
        throw new Error(`${result.stdout}\n${result.stderr}`);
      return JSON.parse(result.stdout);
    }

    async function prepareFixture(failExport = false) {
      const runtimeRoot = getRuntimePersistencePaths().root;
      const runRoot = path.join(
        runtimeRoot,
        "runtime",
        "acp",
        "skill-runs",
        `acp-skill-topic-prepare-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      );
      const skillRoot = path.resolve(
        "skills_builtin/create-topic-synthesis-prepare",
      );
      await fsp.mkdir(path.join(runRoot, "runtime", "payloads"), {
        recursive: true,
      });
      const contents = new Map<string, unknown>();
      const artifactRows = paperRefs.flatMap((paperRef) =>
        topicPrepareArtifacts(paperRef).map((artifact) => {
          const content = artifact.content;
          const locator = `fixture:${paperRef}:${artifact.artifactType}`;
          contents.set(locator, content);
          return {
            paperRef,
            artifactType: artifact.artifactType,
            payloadType: artifact.payloadType,
            status: "available",
            locator,
            payloadHash: digest(content),
            diagnostics: [],
          };
        }),
      );
      const harness = await startSynthesisProductionRouteHarness({
        id: `topic-prepare-${Date.now()}`,
        hostFixture: {
          handle: async ({ capability, payload }) => {
            if (capability === "webdav.describe")
              return SYNTHESIS_DISABLED_WEBDAV_DESCRIPTION;
            if (capability === "library.items.list_page") {
              return {
                items: [],
                cursor: String(payload.cursor || ""),
                nextCursor: "",
                hasMore: false,
                returned: 0,
                limit: Number(payload.limit || 100),
              };
            }
            if (capability === "library.items.get_by_ref") {
              const refs = Array.isArray(payload.paperRefs)
                ? payload.paperRefs
                : [];
              return {
                items: refs
                  .filter(
                    (ref): ref is string =>
                      typeof ref === "string" && paperRefs.includes(ref),
                  )
                  .map((paperRef) => ({
                    paperRef,
                    libraryId: 1,
                    itemKey: paperRef.split(":")[1],
                    itemType: "journalArticle",
                    title: `Synthetic ${paperRef}`,
                    year: "2024",
                    date: "2024",
                    creators: ["Synthetic Author"],
                    tags: [],
                    collections: [],
                    doi: "",
                    arxiv: "",
                    isbn: "",
                    url: "",
                    citekey: "",
                    dateAdded: "2024-01-01",
                  })),
                missingPaperRefs: [],
              };
            }
            if (capability === "library.artifacts.scan_page") {
              const cursor = Number(payload.cursor || 0);
              const limit = Number(payload.limit || 50);
              const rows = artifactRows.slice(cursor, cursor + limit);
              return {
                artifacts: rows,
                cursor: String(cursor),
                nextCursor:
                  cursor + rows.length < artifactRows.length
                    ? String(cursor + rows.length)
                    : "",
                hasMore: cursor + rows.length < artifactRows.length,
                returned: rows.length,
                limit,
                snapshotRevision: "topic-prepare-fixture",
              };
            }
            if (capability === "library.artifacts.read") {
              const content = contents.get(String(payload.locator));
              return content
                ? {
                    status: "available",
                    payloadHash: payload.expectedHash,
                    content,
                    diagnostics: [],
                  }
                : { status: "missing", diagnostics: [] };
            }
            if (capability === "delivery.export.materialize_run_workspace") {
              const health = await (
                await fetch(
                  `http://127.0.0.1:${harness.port}/synthesis/v1/health`,
                )
              ).json();
              const content = (await consumeSynthesisSidecarOutputJson({
                rpcClient: createSynthesisSidecarRpcClient(),
                connection: {
                  baseUrl: `http://127.0.0.1:${harness.port}`,
                  profileId: "1".repeat(64),
                  clientToken: SYNTHESIS_PRODUCTION_ROUTE_CLIENT_TOKEN,
                  serviceInstanceId: health.serviceInstanceId,
                },
                reference: payload.contentTransfer as never,
                target: "host_export_entries",
                capability: "paper_artifacts.export_filtered",
                cancelAfterRead: false,
              })) as { entries: Array<{ path: string; text: string }> };
              return createSynthesisHostRunWorkspaceMaterializationPort({
                runtimeRoot,
              }).materialize({
                capability: "paper_artifacts.export_filtered",
                runRoot: String(payload.runRoot),
                entries: content.entries,
              });
            }
            return { status: "unavailable", diagnostics: [] };
          },
          ...(failExport
            ? {
                error: ({ capability }) =>
                  capability === "delivery.export.materialize_run_workspace"
                    ? {
                        code: "unavailable",
                        message: "synthetic export failure",
                      }
                    : undefined,
              }
            : {}),
        },
      });
      const producer = await startTopicSynthesisPrepareProducerHarness({
        harness,
        root: runRoot,
      });
      const env = { ...producer.env, PYTHONUTF8: "1" };
      const planning = await harness.client.topics.getPlanningContext();
      const planned = await harness.client.workflowApply.applyTopicPlan({
        kind: "topic_plan",
        operation: "reconcile",
        base_graph_hash: String(
          planning.topic_graph.manifest.manifest_hash ?? "",
        ),
        library_index_hash: String(planning.library.index_hash),
        topic_actions: [
          {
            action: "create",
            topic_id: "goal24paper",
            title: "Synthetic topic",
            definition: "Synthetic evidence for an integration regression.",
            resolver: { paper_refs: paperRefs, combine: "union" },
          },
        ],
        relation_proposals: [],
        recommended_updates: [],
      });
      assert.equal(planned.status, "persisted");
      const plannedContext = await harness.client.topics.getContext({
        topicId: "goal24paper",
        view: "semantic",
      });
      await fsp.writeFile(
        path.join(runRoot, "runtime/input.json"),
        JSON.stringify({
          parameter: {
            usePlannedTopic: true,
            plannedTopicId: "goal24paper",
            language: "en",
          },
          planned_topic: plannedContext.semantic,
        }),
        "utf8",
      );
      return { runRoot, skillRoot, harness, producer, env };
    }

    it("passes 24 planned papers and 96 exported artifacts through the real resolver, gate, and prepare handoff", async function () {
      const fixture = await prepareFixture();
      try {
        const dbPath = path.join(
          fixture.runRoot,
          "runtime/topic-synthesis.sqlite",
        );
        await runGate(fixture.skillRoot, ["--db", dbPath], fixture.env);
        await runGate(
          fixture.skillRoot,
          ["--db", dbPath, "--action", "run"],
          fixture.env,
        );
        const resolver = JSON.parse(
          await fsp.readFile(
            path.join(fixture.runRoot, "runtime/payloads/resolver.json"),
            "utf8",
          ),
        );
        assert.deepEqual(
          resolver.resolved_paper_set.papers.map(
            (paper: any) => paper.paper_ref,
          ),
          paperRefs,
        );
        const manifest = JSON.parse(
          await fsp.readFile(
            path.join(
              fixture.runRoot,
              "runtime/payloads/paper-artifacts-manifest-batch-1.json",
            ),
            "utf8",
          ),
        );
        assert.lengthOf(manifest.papers, 24);
        assert.equal(
          manifest.papers.reduce(
            (count: number, paper: any) => count + paper.artifacts.length,
            0,
          ),
          96,
        );
        const contentFiles = manifest.papers.flatMap((paper: any) =>
          paper.artifacts.map((artifact: any) => artifact.content_file),
        );
        assert.equal(new Set(contentFiles).size, 96);
        for (const file of contentFiles) {
          assert.isTrue(
            fs.existsSync(
              path.isAbsolute(file) ? file : path.join(fixture.runRoot, file),
            ),
          );
        }
        await runGate(fixture.skillRoot, ["--db", dbPath], fixture.env);
        const payloadPath = path.join(
          fixture.runRoot,
          "runtime/payloads/prepare-analysis-context.json",
        );
        await fsp.writeFile(
          payloadPath,
          JSON.stringify({
            assessments: paperRefs.map((paper_ref) => ({
              paper_ref,
              relevance_level: "core",
              relevance_reason: "Synthetic fixture paper.",
              core_digest: `Evidence from ${paper_ref}.`,
              caveats: [],
            })),
          }),
          "utf8",
        );
        const submitted = await runGate(
          fixture.skillRoot,
          [
            "--db",
            dbPath,
            "--action",
            "submit",
            "--payload",
            "runtime/payloads/prepare-analysis-context.json",
          ],
          fixture.env,
        );
        assert.equal(submitted.result.handoff.kind, "topic_synthesis_handoff");
        const handoff = JSON.parse(
          await fsp.readFile(
            path.join(
              fixture.runRoot,
              "runtime/handoff/prepare-analysis-context.json",
            ),
            "utf8",
          ),
        );
        assert.deepEqual(
          JSON.parse(
            await fsp.readFile(handoff.resolver_manifest, "utf8"),
          ).resolved_paper_set.papers.map((paper: any) => paper.paper_ref),
          paperRefs,
        );
        assert.lengthOf(
          JSON.parse(
            await fsp.readFile(
              handoff.paper_artifacts_manifest_batch_1,
              "utf8",
            ),
          ).papers,
          24,
        );
        assert.deepEqual(
          (await fixture.producer.readRequests()).map(
            (request) => request.command,
          ),
          [
            "synthesis resolver resolve",
            "synthesis graph get-metrics",
            "synthesis artifact export-filtered",
          ],
        );
      } finally {
        await fixture.producer.close();
        await fixture.harness.stop();
        await fsp.rm(fixture.runRoot, { recursive: true, force: true });
      }
    });

    it("does not create a prepare handoff when the real artifact export fails", async function () {
      const fixture = await prepareFixture(true);
      try {
        const dbPath = path.join(
          fixture.runRoot,
          "runtime/topic-synthesis.sqlite",
        );
        await runGate(fixture.skillRoot, ["--db", dbPath], fixture.env);
        const failed = await runGateProcess(
          fixture.skillRoot,
          ["--db", dbPath, "--action", "run"],
          fixture.env,
        );
        assert.equal(failed.status, 2, `${failed.stdout}\n${failed.stderr}`);
        assert.deepEqual(
          (await fixture.producer.readRequests()).map(
            (request) => request.command,
          ),
          [
            "synthesis resolver resolve",
            "synthesis graph get-metrics",
            "synthesis artifact export-filtered",
          ],
        );
        assert.isFalse(
          fs.existsSync(
            path.join(
              fixture.runRoot,
              "runtime/handoff/prepare-analysis-context.json",
            ),
          ),
        );
      } finally {
        await fixture.producer.close();
        await fixture.harness.stop();
        await fsp.rm(fixture.runRoot, { recursive: true, force: true });
      }
    });
  });
});
