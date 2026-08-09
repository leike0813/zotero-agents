import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { handleZoteroMcpRequestForTests } from "../../src/modules/zoteroMcpServer";
import { createSynthesisService } from "../../src/modules/synthesis/service";
import { createSynthesisHostExportDeliveryPort } from "../../src/modules/synthesis/exportDeliveryAdapter";
import {
  createInProcessSynthesisClient,
  type LegacySynthesisPort,
} from "../../src/modules/synthesisClient/inProcessClient";

type SynthesisClientPorts = Record<string, (...args: any[]) => any>;

function resolveClientFromPorts(ports: SynthesisClientPorts) {
  const client = createInProcessSynthesisClient(
    ports as unknown as LegacySynthesisPort,
  );
  return () => client;
}
import { renderPayloadBlock } from "../../src/modules/notePayloadCodec";
import { getRuntimePersistencePaths } from "../../src/modules/runtimePersistence";
import {
  resetHostBridgeFileRegistryForTests,
  resolveHostBridgeFileDownload,
} from "../../src/modules/hostBridgeFileRegistry";

function request(id: number, name: string, args: Record<string, unknown> = {}) {
  return {
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: {
      name,
      arguments: args,
    },
  };
}

async function makeRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "zs-synthesis-mcp-"));
}

async function makeAcpRunRoot() {
  const runsDir = getRuntimePersistencePaths().acpSkillRunsDir;
  const runRoot = path.join(
    runsDir,
    `acp-skill-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await fs.mkdir(runRoot, { recursive: true });
  return runRoot;
}

describe("Synthesis MCP tools", function () {
  it("uses the Host Bridge catalog as the only MCP tool registry", async function () {
    const source = await fs.readFile(
      path.join(process.cwd(), "src/modules/zoteroMcpProtocol.ts"),
      "utf8",
    );
    assert.include(source, "listHostBridgeMcpToolDefinitions");
    assert.include(source, "listHostBridgeCapabilities");
    assert.notMatch(source, /\bTOOL_REGISTRY\b/);
    assert.notMatch(source, /\bcallSynthesisService\b/);
    assert.notMatch(source, /synthesis\/service["']/);
  });

  it("lists synthesis job-time tools", async function () {
    const response: any = await handleZoteroMcpRequestForTests({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
    });

    const names = response.result.tools.map(
      (tool: { name: string }) => tool.name,
    );
    assert.includeMembers(names, [
      "topics.list",
      "topics.find_by_paper_ref",
      "topics.get_context",
      "topics.get_report",
      "topics.get_review_input",
      "schemas.get",
      "library_index.get",
      "resolvers.resolve",
      "reference_index.get",
      "citation_graph.get_overview",
      "citation_graph.get_slice",
      "citation_graph.get_layout",
      "citation_graph.get_metrics",
      "citation_graph.rank_external_references",
      "citation_graph.rank_library_papers",
      "paper_artifacts.get_manifest",
      "paper_artifacts.export_filtered",
      "paper_artifacts.resolve_topic_digest",
      "concepts.query",
      "citation_graph.query_cluster",
      "insights.get_attention_queue",
    ]);
    assert.notInclude(names, "synthesis.export_paper_artifact_bundle");
    assert.notInclude(names, "synthesis.query_citation_graph");
    assert.notInclude(names, "synthesis.read_paper_artifacts");
    assert.notInclude(names, "synthesis.list_topics");
    assert.notInclude(names, "synthesis.validate_resolver");
    assert.notInclude(names, "synthesis.apply_update");
  });

  it("routes topic inventory, schema, and resolver calls through the injected synthesis service", async function () {
    const calls: string[] = [];
    const service: SynthesisClientPorts = {
      listTopics() {
        calls.push("list_topics");
        return {
          topics: [
            {
              topic_id: "topic-alpha",
              title: "Alpha Topic",
              description: "Semantic scope",
              aliases: ["Alpha"],
              updated_at: "2026-05-12T00:00:00.000Z",
            },
          ],
          diagnostics: { count: 1, source: "canonical-topic-definitions" },
        };
      },
      findTopicsByPaperRef(args) {
        calls.push(`topics_by_paper:${args.paper_ref || "none"}`);
        return {
          ok: true,
          status: "ok",
          paper_refs: [args.paper_ref],
          topics: [
            {
              topic_id: "topic-alpha",
              title: "Alpha Topic",
              freshness: "fresh",
              coverage: "complete",
              matched_paper_refs: [args.paper_ref],
              match_sources: ["current_dependencies"],
            },
          ],
          diagnostics: {
            requested_count: 1,
            matched_topic_count: 1,
            unmatched_paper_refs: [],
            source: "artifact_state",
          },
        };
      },
      getSchemas(args) {
        calls.push(`schemas:${args.kind || "all"}`);
        return { schemas: { resolver: { type: "object" } } };
      },
      getLibraryIndex(args) {
        calls.push(
          `library_index:${args.cursor || "0"}:${args.limit || "default"}`,
        );
        return {
          libraryId: 1,
          papers: [{ paper_ref: "1:ABCD1234", title: "Alpha Paper" }],
          cursor: String(args.cursor || "0"),
          next_cursor: "",
          has_more: false,
          returned: 1,
          total_papers: 1,
          index_hash: "sha256:index",
          page_hash: "sha256:page",
        };
      },
      resolveResolver(args) {
        calls.push(`resolve:${(args.tag as any) || "direct"}`);
        return {
          ok: true,
          papers: [{ paper_ref: "1:ABCD1234", match_reasons: ["tag"] }],
          normalized_resolver: args,
          diagnostics: { final_count: 1 },
        };
      },
    };

    const listResponse: any = await handleZoteroMcpRequestForTests(
      request(0, "topics.list"),
      { resolveSynthesisClient: resolveClientFromPorts(service) },
    );
    const topicsByPaperResponse: any = await handleZoteroMcpRequestForTests(
      request(4, "topics.find_by_paper_ref", { paper_ref: "1:ABCD1234" }),
      { resolveSynthesisClient: resolveClientFromPorts(service) },
    );
    const schemaResponse: any = await handleZoteroMcpRequestForTests(
      request(1, "schemas.get", { kind: "resolver" }),
      { resolveSynthesisClient: resolveClientFromPorts(service) },
    );
    const indexResponse: any = await handleZoteroMcpRequestForTests(
      request(3, "library_index.get", { cursor: "0", limit: 1 }),
      { resolveSynthesisClient: resolveClientFromPorts(service) },
    );
    const resolveResponse: any = await handleZoteroMcpRequestForTests(
      request(2, "resolvers.resolve", {
        tag: "topic:test",
      }),
      { resolveSynthesisClient: resolveClientFromPorts(service) },
    );

    assert.deepEqual(calls, [
      "list_topics",
      "topics_by_paper:1:ABCD1234",
      "schemas:resolver",
      "library_index:0:1",
      "resolve:topic:test",
    ]);
    assert.equal(
      listResponse.result.structuredContent.result.topics[0].topic_id,
      "topic-alpha",
    );
    assert.equal(
      topicsByPaperResponse.result.structuredContent.result.topics[0].topic_id,
      "topic-alpha",
    );
    assert.include(schemaResponse.result.content[0].text, "schemas");
    assert.equal(indexResponse.result.structuredContent.result.has_more, false);
    assert.equal(
      indexResponse.result.structuredContent.result.index_hash,
      "sha256:index",
    );
    assert.isTrue(resolveResponse.result.structuredContent.result.ok);
    assert.equal(
      resolveResponse.result.structuredContent.result.candidates[0].paper_ref,
      "1:ABCD1234",
    );
  });

  it("returns structured resolver validation failures from resolve_resolver", async function () {
    const root = await makeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs: [],
    });
    const response: any = await handleZoteroMcpRequestForTests(
      request(1, "resolvers.resolve", {
        resolver: {
          selection_strategy: "explicit_refs",
          paper_refs: ["1:ABCD1234"],
        },
      }),
      { resolveSynthesisClient: resolveClientFromPorts(service) },
    );

    assert.isFalse(response.result.structuredContent.result.ok);
    assert.match(
      response.result.structuredContent.result.errors.join("\n"),
      /resolver|selection_strategy/i,
    );
    assert.equal(
      response.result.structuredContent.result.diagnostics.rejected,
      true,
    );
  });

  it("routes reference sidecar index and graph slice reads through the injected service", async function () {
    const service: SynthesisClientPorts = {
      getReferenceSidecarIndex() {
        return { rows: [{ paper_ref: "1:ABCD1234" }], total: 1 };
      },
      getCitationGraphSlice() {
        return {
          ok: true,
          graph_hash: "sha256:graph",
          start_node_id: "zotero:item:ABCD1234",
          nodes: [{ node_id: "zotero:item:ABCD1234" }],
          edges: [],
          diagnostics: {
            snapshot_found: true,
            depth: 1,
            node_count: 1,
            edge_count: 0,
            truncated: false,
            limits: { maxNodes: 80, maxEdges: 160, maxDepth: 2 },
            warnings: [],
          },
        };
      },
      getCitationGraphLayout(args) {
        return {
          ok: true,
          status: "ready",
          scope: args.scope || "slice",
          graph_hash: "sha256:graph",
          layout_hash: "sha256:layout",
          layout_status: "ready",
          preset: "force",
          view_key: "workbench_overview",
          nodes: [
            {
              node_id: "zotero:item:ABCD1234",
              node_type: "library_paper",
              paper_ref: "1:ABCD1234",
              title: "Alpha Paper",
              x: 1,
              y: 2,
            },
          ],
          edges: [],
          diagnostics: {
            snapshot_found: true,
            layout_found: true,
            node_count: 1,
            edge_count: 0,
            truncated: false,
            limits: {
              maxNodes: 200,
              maxEdges: 500,
              hardMaxNodes: 5000,
              hardMaxEdges: 20000,
            },
            warnings: [],
          },
        };
      },
      getCitationGraphMetrics() {
        return {
          ok: true,
          graph_hash: "sha256:graph",
          metrics_hash: "sha256:metrics",
          status: "ready",
          items: [
            {
              node_id: "zotero:item:ABCD1234",
              paper_ref: "1:ABCD1234",
              internal_in_degree: 1,
              internal_out_degree: 0,
              internal_pagerank: 1,
              foundation_score: 1,
              frontier_score: 0.2,
              synthesis_role_hints: ["foundation"],
            },
          ],
          diagnostics: {
            snapshot_found: true,
            metrics_found: true,
            stale: false,
            total_library_nodes: 1,
            returned_count: 1,
            limits: { limit: 25, maxLimit: 100 },
            warnings: [],
          },
        };
      },
      queryConceptKb(args) {
        return {
          ok: true,
          labels: args.concept_candidate_labels,
          matches: [{ label: "DETR", exact_matches: [] }],
          diagnostics: [],
        };
      },
      queryCitationGraphCluster(args) {
        return {
          ok: true,
          source_paper_refs: args.source_paper_refs,
          cluster_policy: "bounded_external",
          nodes: [{ node_id: "zotero:item:ABCD1234" }],
          edges: [],
          summaries: { cluster_node_count: 1 },
          diagnostics: { bounded: true, side_effect_free: true },
        };
      },
    };

    for (const [id, name, args] of [
      [1, "reference_index.get", { sourceRefs: ["1:ABCD1234"] }],
      [2, "citation_graph.get_slice", { paperRef: "1:ABCD1234" }],
      [6, "citation_graph.get_layout", { scope: "full" }],
      [3, "citation_graph.get_metrics", { paperRefs: ["1:ABCD1234"] }],
      [4, "concepts.query", { concept_candidate_labels: ["DETR"] }],
      [
        5,
        "citation_graph.query_cluster",
        { source_paper_refs: ["1:ABCD1234"] },
      ],
    ] as const) {
      const response: any = await handleZoteroMcpRequestForTests(
        request(id, name, args),
        { resolveSynthesisClient: resolveClientFromPorts(service) },
      );
      assert.equal(response.result.structuredContent.tool, name);
      assert.include(response.result.content[0].text, "Host Bridge capability");
    }
  });

  it("routes synthesis paper artifact manifest and bounded reads through the injected client", async function () {
    const calls: Array<{ method: string; args: Record<string, unknown> }> = [];
    const service: SynthesisClientPorts = {
      getPaperArtifactManifest(args) {
        calls.push({ method: "manifest", args });
        return {
          papers: [
            {
              paper_ref: "1:ABCD1234",
              artifacts: [
                {
                  artifact_type: "digest",
                  status: "available",
                  payload_type: "digest-markdown",
                },
              ],
            },
          ],
          total: 1,
        };
      },
      readPaperArtifacts(args) {
        calls.push({ method: "read", args });
        return {
          papers: [
            {
              paper_ref: args.paper_ref,
              artifacts: [
                {
                  artifact_type: "digest",
                  payload_type: "digest-markdown",
                  status: "available",
                  content: "# Digest",
                },
              ],
            },
          ],
        };
      },
    };

    const manifestResponse: any = await handleZoteroMcpRequestForTests(
      request(1, "paper_artifacts.get_manifest", {
        paper_refs: ["1:ABCD1234"],
      }),
      { resolveSynthesisClient: resolveClientFromPorts(service) },
    );
    const readResponse: any = await handleZoteroMcpRequestForTests(
      request(2, "paper_artifacts.read", { paper_ref: "1:ABCD1234" }),
      { resolveSynthesisClient: resolveClientFromPorts(service) },
    );

    assert.deepEqual(calls, [
      { method: "manifest", args: { paper_refs: ["1:ABCD1234"] } },
      { method: "read", args: { paper_refs: ["1:ABCD1234"] } },
    ]);
    assert.equal(
      manifestResponse.result.structuredContent.tool,
      "paper_artifacts.get_manifest",
    );
    assert.equal(
      readResponse.result.structuredContent.tool,
      "paper_artifacts.read",
    );
  });

  it("routes filtered paper artifact export without returning hashes to the LLM", async function () {
    const calls: Record<string, unknown>[] = [];
    const service: SynthesisClientPorts = {
      exportFilteredPaperArtifacts(args) {
        calls.push(args);
        return {
          paper_ref: args.paper_ref,
          paper_refs: [args.paper_ref],
          manifest_file: "runtime/payloads/paper-artifacts-manifest.json",
          artifact_statuses: [
            {
              paper_ref: args.paper_ref,
              artifact_type: "digest",
              payload_type: "digest-markdown",
              status: "available",
            },
          ],
          diagnostics: [],
        };
      },
    };

    const response: any = await handleZoteroMcpRequestForTests(
      request(12, "paper_artifacts.export_filtered", {
        run_root: ".",
        paper_ref: "1:ABCD1234",
      }),
      { resolveSynthesisClient: resolveClientFromPorts(service) },
    );

    assert.deepEqual(calls, [{ run_root: ".", paper_ref: "1:ABCD1234" }]);
    const result = response.result.structuredContent.result;
    assert.equal(
      result.manifest_file,
      "runtime/payloads/paper-artifacts-manifest.json",
    );
    assert.notProperty(result, "payload_file");
    assert.notProperty(result, "payload_files");
    assert.notProperty(result, "payload_hash");
    assert.notInclude(JSON.stringify(result), "sha256:");
  });

  it("routes batched filtered paper artifact export without returning payload bodies or hashes", async function () {
    const calls: Record<string, unknown>[] = [];
    const service: SynthesisClientPorts = {
      exportFilteredPaperArtifacts(args) {
        calls.push(args);
        return {
          paper_refs: args.paper_refs,
          manifest_file: "runtime/payloads/paper-artifacts-manifest.json",
          artifact_statuses: [
            {
              paper_ref: "1:AAAA1111",
              artifact_type: "digest",
              payload_type: "digest-markdown",
              status: "available",
            },
          ],
          diagnostics: [],
        };
      },
    };

    const response: any = await handleZoteroMcpRequestForTests(
      request(13, "paper_artifacts.export_filtered", {
        run_root: ".",
        paper_refs: ["1:AAAA1111", "1:BBBB2222"],
      }),
      { resolveSynthesisClient: resolveClientFromPorts(service) },
    );

    assert.deepEqual(calls, [
      { run_root: ".", paper_refs: ["1:AAAA1111", "1:BBBB2222"] },
    ]);
    const result = response.result.structuredContent.result;
    assert.equal(
      result.manifest_file,
      "runtime/payloads/paper-artifacts-manifest.json",
    );
    assert.notProperty(result, "payload_files");
    assert.notProperty(result, "payload_file");
    assert.notInclude(JSON.stringify(result), "payload_hash");
    assert.notInclude(JSON.stringify(result), "sha256:");
    assert.notInclude(JSON.stringify(result), "decoded_text");
  });

  it("default export writes only filtered manifest and content files", async function () {
    const root = await makeRoot();
    const runRoot = await makeAcpRunRoot();
    const digest = [
      "## Digest One",
      "Intro",
      "### Detail",
      "Detail text",
      "## Digest Two",
      "Two",
      "## Digest Three",
      "Three",
      "## Digest Four",
      "Four",
      "## Digest Five",
      "Should be removed",
    ].join("\n");
    const scorePayload = {
      literature_score: {
        schema: "literature_score.v1",
        rubric_id: "literature-analysis-rubric.v1",
        paper_type: "empirical",
        paper_type_reason: "The paper reports an empirical study.",
        overall_score: 80,
        confidence: 0.75,
        confidence_adjusted_score: 72,
        dimensions: [
          "methodological_rigor",
          "evidence_completeness",
          "reproducibility",
          "innovation_signals",
          "research_impact_potential",
          "writing_quality",
        ].map((dimensionKey) => ({
          dimension_key: dimensionKey,
          name: dimensionKey,
          score: 80,
          confidence: 0.75,
          summary: `${dimensionKey} assessment`,
        })),
      },
    };
    const service = createSynthesisService({
      root,
      libraryId: 1,
      hostExportDeliveryPort: createSynthesisHostExportDeliveryPort(),
      registryInputs: [
        {
          libraryId: 1,
          itemKey: "ABCD1234",
          title: "Alpha Paper",
          notes: [
            {
              key: "N1",
              title: "Digest",
              html: renderPayloadBlock({
                payloadType: "digest-markdown",
                payload: digest,
                payloadFormat: "text",
              }),
            },
            {
              key: "N2",
              title: "References",
              html: renderPayloadBlock({
                payloadType: "references-json",
                payload: {
                  references: [
                    {
                      id: "r1",
                      year: "2024",
                      authors: ["Alice", "Bob"],
                      title: "Reference One",
                      confidence: 0.9,
                    },
                  ],
                  parser_metadata: { raw: true },
                },
              }),
            },
            {
              key: "N3",
              title: "Citation Analysis",
              html: renderPayloadBlock({
                payloadType: "citation-analysis-json",
                payload: {
                  citation_analysis: {
                    report_md: [
                      "## Citation Wrapper",
                      "",
                      "### Mapped Citations",
                      "Mapped body",
                      "",
                      "### Trailing Section",
                      "Trailing body",
                    ].join("\n"),
                  },
                },
              }),
            },
            {
              key: "N4",
              title: "Literature Score",
              html: renderPayloadBlock({
                payloadType: "literature-score-json",
                payload: scorePayload,
              }),
            },
          ],
        },
        {
          libraryId: 1,
          itemKey: "EMPTY000",
          title: "Empty Artifact Paper",
          notes: [],
        },
      ],
    });

    try {
      const response: any = await handleZoteroMcpRequestForTests(
        request(30, "paper_artifacts.export_filtered", {
          run_root: runRoot,
          paper_refs: ["1:ABCD1234", "1:EMPTY000"],
        }),
        { resolveSynthesisClient: resolveClientFromPorts(service) },
      );
      const result = response.result.structuredContent.result;
      assert.equal(
        result.manifest_file,
        "runtime/payloads/paper-artifacts-manifest.json",
      );
      assert.notProperty(result, "payload_file");
      assert.notProperty(result, "payload_files");

      const manifestPath = path.join(runRoot, result.manifest_file);
      const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
      const manifestText = JSON.stringify(manifest);
      assert.equal(
        manifest.schema_id,
        "synthesis.filtered_paper_artifacts_manifest",
      );
      assert.equal(manifest.exported_by, "paper_artifacts.export_filtered");
      assert.equal(manifest.schema_version, "1.1.0");
      assert.notInclude(manifestText, "decoded_text");
      assert.notInclude(manifestText, 'content":"');
      assert.notInclude(manifestText, '"markdown":');
      assert.notInclude(manifestText, "parser_metadata");

      const paper = manifest.papers[0];
      const digestEntry = paper.artifacts.find(
        (entry: any) => entry.artifact_type === "digest",
      );
      const refsEntry = paper.artifacts.find(
        (entry: any) => entry.artifact_type === "references",
      );
      const citationEntry = paper.artifacts.find(
        (entry: any) => entry.artifact_type === "citation_analysis",
      );
      const scoreEntry = paper.artifacts.find(
        (entry: any) => entry.artifact_type === "literature_score",
      );
      const emptyPaper = manifest.papers.find(
        (entry: any) => entry.paper_ref === "1:EMPTY000",
      );
      const emptyDigestEntry = emptyPaper.artifacts.find(
        (entry: any) => entry.artifact_type === "digest",
      );
      const digestMd = await fs.readFile(
        path.join(runRoot, digestEntry.content_file),
        "utf8",
      );
      const refs = JSON.parse(
        await fs.readFile(path.join(runRoot, refsEntry.content_file), "utf8"),
      );
      const citationMd = await fs.readFile(
        path.join(runRoot, citationEntry.content_file),
        "utf8",
      );
      const score = JSON.parse(
        await fs.readFile(path.join(runRoot, scoreEntry.content_file), "utf8"),
      );

      assert.includeMembers(digestEntry.payload_types_seen, [
        "digest-markdown",
        "references-json",
        "citation-analysis-json",
        "literature-score-json",
      ]);
      assert.deepEqual(emptyDigestEntry.payload_types_seen, []);
      assert.include(digestMd, "#### Digest One");
      assert.include(digestMd, "##### Detail");
      assert.notInclude(digestMd, "Digest Five");
      assert.deepEqual(refs.references, [
        {
          id: "r1",
          year: "2024",
          authors: "Alice; Bob",
          title: "Reference One",
        },
      ]);
      assert.notInclude(JSON.stringify(refs), "confidence");
      assert.include(citationMd, "#### Mapped Citations");
      assert.notInclude(citationMd, "Citation Wrapper");
      assert.notInclude(citationMd, "Trailing Section");
      assert.equal(
        citationEntry.removed_trailing_section_heading,
        "Trailing Section",
      );
      assert.deepEqual(score, scorePayload);
      assert.equal(paper.literature_quality.status, "available");
      assert.equal(paper.literature_quality.overall_score, 80);
      assert.equal(paper.literature_quality.quality_prior, 0.725);

      const remoteResult: any = await service.exportFilteredPaperArtifacts(
        {
          paper_refs: ["1:ABCD1234"],
          artifact_types: ["digest", "references"],
        },
        { mode: "remote" },
      );
      assert.equal(
        remoteResult.manifest_file,
        "runtime/payloads/paper-artifacts-manifest.json",
      );
      assert.equal(remoteResult.delivery.mode, "bridge-download");
      assert.include(
        remoteResult.delivery.downloadCommand,
        "zotero-bridge file download",
      );
      assert.include(remoteResult.delivery.unpackHint, "unzip ");
      const fileId = remoteResult.delivery.bundle.fileId;
      assert.isString(fileId);
      assert.notInclude(JSON.stringify(remoteResult), runRoot);
      const downloaded = await resolveHostBridgeFileDownload(fileId);
      const zipText = Buffer.from(
        await fs.readFile(downloaded.source.path),
      ).toString("utf8");
      assert.include(zipText, "runtime/payloads/paper-artifacts-manifest.json");
      assert.include(
        zipText,
        "runtime/payloads/artifacts/1_ABCD1234/digest.md",
      );
      assert.include(zipText, "#### Digest One");
    } finally {
      resetHostBridgeFileRegistryForTests();
      await fs.rm(runRoot, { recursive: true, force: true });
    }
  });

  it("fails remote artifact delivery atomically when the Host port is unavailable", async function () {
    const root = await makeRoot();
    const inputs = [
      {
        libraryId: 1,
        itemKey: "ABCD1234",
        title: "Alpha Paper",
        notes: [],
      },
    ];
    const ports = [
      undefined,
      {
        async publishArchive() {
          throw new Error("/private/secret/raw export failure");
        },
      },
      {
        async publishArchive() {
          return {
            status: "unavailable" as const,
            capability: "paper_artifacts.export_filtered" as const,
            diagnostics: ["host_export_delivery_failed"],
          };
        },
      },
      {
        async publishArchive() {
          return {
            status: "available" as const,
            capability: "topics.get_context" as const,
            delivery: {},
            diagnostics: [],
          } as any;
        },
      },
    ];
    for (const hostExportDeliveryPort of ports) {
      const service = createSynthesisService({
        root,
        libraryId: 1,
        registryInputs: inputs,
        ...(hostExportDeliveryPort ? { hostExportDeliveryPort } : {}),
      });
      let error: unknown;
      try {
        await service.exportFilteredPaperArtifacts(
          { paper_refs: ["1:ABCD1234"] },
          { mode: "remote" },
        );
      } catch (caught) {
        error = caught;
      }
      assert.equal((error as { code?: unknown })?.code, "unavailable");
      assert.notInclude(JSON.stringify(error), "/private/secret");
    }
  });

  it("rejects unknown synthesis tool arguments", async function () {
    const response: any = await handleZoteroMcpRequestForTests(
      request(1, "schemas.get", { kind: "resolver", extra: true }),
      {
        resolveSynthesisClient: resolveClientFromPorts({
          getSchemas() {
            return {};
          },
        }),
      },
    );

    assert.equal(response.error.code, -32602);
    assert.match(response.error.message, /unknown|additional/i);
  });

  it("returns recommended_update from get_topic_context for prefilled update jobs", async function () {
    const calls: Record<string, unknown>[] = [];
    const service: SynthesisClientPorts = {
      getTopicContext(args) {
        calls.push(args);
        return {
          topic_id: args.topicId,
          mode: args.mode,
          language: "zh-CN",
          current_hashes: {
            manifest: "sha256:manifest",
            artifact: "sha256:artifact",
            export: "sha256:export",
            metadata: "sha256:metadata",
          },
          section_hashes: {
            claims: "sha256:claims",
            coverage: "sha256:coverage",
          },
          recommended_update: {
            allowed: true,
            reason: "artifact_changed",
            scope: "claims",
            mode: "update_patch",
            changed_sections: ["claims"],
          },
        };
      },
    };

    const response: any = await handleZoteroMcpRequestForTests(
      request(10, "topics.get_context", {
        topicId: "object-detection",
        mode: "update",
      }),
      { resolveSynthesisClient: resolveClientFromPorts(service) },
    );

    assert.deepEqual(calls, [{ topicId: "object-detection", mode: "update" }]);
    assert.equal(
      response.result.structuredContent.result.topic_id,
      "object-detection",
    );
    assert.deepInclude(
      response.result.structuredContent.result.recommended_update,
      {
        allowed: true,
        reason: "artifact_changed",
        scope: "claims",
        mode: "update_patch",
      },
    );
    assert.deepEqual(
      response.result.structuredContent.result.recommended_update
        .changed_sections,
      ["claims"],
    );
  });

  it("exposes topic context view and file-output arguments in the MCP schema", async function () {
    const response: any = await handleZoteroMcpRequestForTests({
      jsonrpc: "2.0",
      id: 12,
      method: "tools/list",
    });
    const tool = response.result.tools.find(
      (entry: { name: string }) => entry.name === "topics.get_context",
    );

    assert.deepEqual(tool.inputSchema.properties.view.enum, [
      "digest",
      "semantic",
      "audit",
      "full",
    ]);
    assert.property(tool.inputSchema.properties, "outputPath");
    assert.property(tool.inputSchema.properties, "output_path");
    assert.property(tool.inputSchema.properties, "overwrite");
  });

  it("returns a compact topic context file-output envelope through MCP", async function () {
    const calls: Record<string, unknown>[] = [];
    const service: SynthesisClientPorts = {
      getTopicContext(args) {
        calls.push(args);
        return {
          schema_id: "synthesis.topic_context.output",
          schema_version: "2.0.0",
          topic_id: args.topicId,
          view: args.view,
          output: {
            mode: "file",
            path: args.outputPath,
            bytes: 2048,
            sha256: "sha256:semantic",
          },
          omitted_inline_result: true,
        };
      },
    };

    const response: any = await handleZoteroMcpRequestForTests(
      request(13, "topics.get_context", {
        topicId: "object-detection",
        view: "semantic",
        outputPath: "runtime/topic-context.semantic.json",
        overwrite: true,
      }),
      { resolveSynthesisClient: resolveClientFromPorts(service) },
    );

    assert.deepEqual(calls, [
      {
        topicId: "object-detection",
        view: "semantic",
        outputPath: "runtime/topic-context.semantic.json",
        overwrite: true,
      },
    ]);
    assert.equal(
      response.result.structuredContent.result.omitted_inline_result,
      true,
    );
    assert.deepEqual(response.result.structuredContent.result.output, {
      mode: "file",
      path: "runtime/topic-context.semantic.json",
      bytes: 2048,
      sha256: "sha256:semantic",
    });
    assert.notProperty(response.result.structuredContent.result, "semantic");
  });

  it("routes topic report markdown reads through the injected synthesis service", async function () {
    const calls: Record<string, unknown>[] = [];
    const service: SynthesisClientPorts = {
      getTopicReport(args) {
        calls.push(args);
        return {
          ok: true,
          status: "available",
          topic_id: args.topicId,
          title: "Object Detection Synthesis Report",
          format: "markdown",
          markdown: "## 技术路线\n\nReport body.",
          source: {
            path: "topics/object-detection/current/artifact.json",
            field: "synthesis_report.body",
            ssot: "runtime.synthesis_report.body",
          },
          diagnostics: [],
        };
      },
    };

    const response: any = await handleZoteroMcpRequestForTests(
      request(11, "topics.get_report", {
        topicId: "object-detection",
      }),
      { resolveSynthesisClient: resolveClientFromPorts(service) },
    );

    assert.deepEqual(calls, [{ topicId: "object-detection" }]);
    assert.equal(
      response.result.structuredContent.result.markdown,
      "## 技术路线\n\nReport body.",
    );
    assert.equal(
      response.result.structuredContent.result.source.ssot,
      "runtime.synthesis_report.body",
    );
  });

  it("routes topic paper digest resolution through the injected synthesis service", async function () {
    const calls: Record<string, unknown>[] = [];
    const service: SynthesisClientPorts = {
      resolveTopicPaperDigest(args) {
        calls.push(args);
        return {
          ok: true,
          status: "available",
          paper_ref: "1:ABCD1234",
          digest_markdown: "# Digest",
          recorded_hash: "sha256:old",
          current_hash: "sha256:new",
          source_changed: true,
          diagnostics: [],
        };
      },
    };

    const response: any = await handleZoteroMcpRequestForTests(
      request(11, "paper_artifacts.resolve_topic_digest", {
        topicId: "object-detection",
        digest_ref: {
          paper_ref: "1:ABCD1234",
          payload_type: "digest-markdown",
          payload_hash: "sha256:old",
        },
      }),
      { resolveSynthesisClient: resolveClientFromPorts(service) },
    );

    assert.equal(calls.length, 1);
    assert.equal(
      response.result.structuredContent.result.digest_markdown,
      "# Digest",
    );
    assert.isTrue(response.result.structuredContent.result.source_changed);
  });

  it("returns paged reference sidecar index rows from the default synthesis service", async function () {
    const root = await makeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs: [
        { libraryId: 1, itemKey: "AAAA1111", title: "Alpha", tags: ["a"] },
        { libraryId: 1, itemKey: "BBBB2222", title: "Beta", tags: ["b"] },
        { libraryId: 1, itemKey: "CCCC3333", title: "Gamma", tags: ["c"] },
      ],
    });
    await service.refreshReferenceSidecarNow();

    const response: any = await handleZoteroMcpRequestForTests(
      request(20, "reference_index.get", {
        sourceRefs: ["1:BBBB2222", "1:CCCC3333"],
        includeReferences: true,
        referenceSourceRefs: ["1:CCCC3333"],
        rawReferenceIds: [],
        cursor: "1",
        limit: 1,
      }),
      { resolveSynthesisClient: resolveClientFromPorts(service) },
    );
    const result = response.result.structuredContent.result;

    assert.lengthOf(result.entries, 1);
    assert.equal(result.entries[0].paper_ref, "1:CCCC3333");
    assert.equal(result.cursor, "1");
    assert.equal(result.nextCursor, "");
    assert.isFalse(result.hasMore);
    assert.equal(result.returned, 1);
    assert.equal(result.total, 2);
    assert.deepEqual(result.diagnostics.recommended_commands, []);
    assert.equal(result.diagnostics.maintenance.pending_dirty_count, 0);
  });

  it("returns bounded maintenance diagnostics from read-only citation graph MCP reads", async function () {
    const root = await makeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
    });

    const response: any = await handleZoteroMcpRequestForTests(
      request(24, "citation_graph.get_metrics", { limit: 5 }),
      { resolveSynthesisClient: resolveClientFromPorts(service) },
    );
    const result = response.result.structuredContent.result;

    assert.isFalse(result.ok);
    assert.include(
      result.diagnostics.recommended_commands,
      "refreshCitationGraphMetricsNow",
    );
    assert.notInclude(
      result.diagnostics.recommended_commands,
      "rebuildCitationGraphCacheNow",
    );
    assert.equal(result.diagnostics.maintenance.queue_state, "removed");
  });

  it("returns paged resolver matches from the default synthesis service", async function () {
    const root = await makeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs: [
        {
          libraryId: 1,
          itemKey: "AAAA1111",
          title: "Alpha",
          tags: ["topic:x"],
        },
        { libraryId: 1, itemKey: "BBBB2222", title: "Beta", tags: ["topic:x"] },
        {
          libraryId: 1,
          itemKey: "CCCC3333",
          title: "Gamma",
          tags: ["topic:x"],
        },
      ],
    });

    const response: any = await handleZoteroMcpRequestForTests(
      request(21, "resolvers.resolve", {
        tag: { and: ["topic:x"] },
        cursor: "1",
        limit: 1,
      }),
      { resolveSynthesisClient: resolveClientFromPorts(service) },
    );
    const result = response.result.structuredContent.result;

    assert.isTrue(result.ok);
    assert.lengthOf(result.candidates, 1);
    assert.equal(result.cursor, "1");
    assert.equal(result.nextCursor, "2");
    assert.isTrue(result.hasMore);
    assert.equal(result.returned, 1);
    assert.equal(result.total, 3);
  });

  it("returns compact library index pages unless include flags request larger sections", async function () {
    const root = await makeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs: [
        {
          libraryId: 1,
          itemKey: "AAAA1111",
          title: "Alpha",
          tags: ["topic:x"],
        },
        { libraryId: 1, itemKey: "BBBB2222", title: "Beta", tags: ["topic:y"] },
      ],
    });

    const compact: any = await handleZoteroMcpRequestForTests(
      request(22, "library_index.get", { limit: 1 }),
      { resolveSynthesisClient: resolveClientFromPorts(service) },
    );
    const expanded: any = await handleZoteroMcpRequestForTests(
      request(23, "library_index.get", {
        limit: 1,
        includeTags: true,
        includeItems: true,
      }),
      { resolveSynthesisClient: resolveClientFromPorts(service) },
    );

    const compactResult = compact.result.structuredContent.result;
    const expandedResult = expanded.result.structuredContent.result;
    assert.lengthOf(compactResult.papers, 1);
    assert.deepInclude(compactResult.papers[0], {
      title: "Alpha",
    });
    assert.deepEqual(compactResult.papers[0].tags, ["topic:x"]);
    assert.notProperty(compactResult, "tags");
    assert.notProperty(compactResult, "registry");
    assert.isArray(expandedResult.tags);
    assert.lengthOf(expandedResult.tags, 1);
    assert.isArray(expandedResult.registry);
    assert.isObject(expandedResult.pagination);
    assert.strictEqual(expandedResult.pagination.papers.limit, 1);
    assert.strictEqual(expandedResult.pagination.tags.limit, 1);
    assert.strictEqual(expandedResult.pagination.registry.limit, 1);
  });

  it("returns paged citation graph overview sections", async function () {
    const root = await makeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      citationGraphPapers: [
        {
          libraryId: 1,
          itemKey: "A",
          title: "Alpha",
          references: [
            { title: "Shared External", year: "2020" },
            { title: "Alpha Only", year: "2021" },
          ],
        },
        {
          libraryId: 1,
          itemKey: "B",
          title: "Beta",
          references: [{ title: "Shared External", year: "2020" }],
        },
        { libraryId: 1, itemKey: "C", title: "Gamma" },
      ],
    });
    await service.refreshReferenceSidecarNow();
    await service.rebuildCitationGraphCacheNow();

    const first: any = await handleZoteroMcpRequestForTests(
      request(25, "citation_graph.get_overview", { limit: 2 }),
      { resolveSynthesisClient: resolveClientFromPorts(service) },
    );
    const firstResult = first.result.structuredContent.result;

    assert.lengthOf(firstResult.nodes, 2);
    assert.isTrue(firstResult.pagination.nodes.hasMore);
    assert.strictEqual(firstResult.pagination.nodes.nextCursor, "2");
    assert.isTrue(firstResult.diagnostics.bounded);
    assert.isObject(firstResult.summary);

    const second: any = await handleZoteroMcpRequestForTests(
      request(26, "citation_graph.get_overview", {
        nodeCursor: firstResult.pagination.nodes.nextCursor,
        limit: 2,
      }),
      { resolveSynthesisClient: resolveClientFromPorts(service) },
    );
    const secondResult = second.result.structuredContent.result;

    assert.isAtLeast(secondResult.nodes.length, 1);
    assert.notDeepEqual(
      firstResult.nodes.map((node: any) => node.node_id),
      secondResult.nodes.map((node: any) => node.node_id),
    );
  });

  it("routes bounded review input arguments through the synthesis MCP service", async function () {
    const calls: Record<string, unknown>[] = [];
    const service: SynthesisClientPorts = {
      getReviewInput(args) {
        calls.push(args);
        return {
          topic: { topic_id: args.topicId, markdown: "# Topic" },
          diagnostics: {
            warnings: ["topic markdown truncated to 120 chars"],
          },
        };
      },
    };

    const response: any = await handleZoteroMcpRequestForTests(
      request(24, "topics.get_review_input", {
        topicId: "topic-alpha",
        maxGraphNodes: 10,
        maxGraphEdges: 20,
        maxChars: 120,
        includePaperArtifacts: false,
      }),
      { resolveSynthesisClient: resolveClientFromPorts(service) },
    );

    assert.deepEqual(calls, [
      {
        topicId: "topic-alpha",
        maxGraphNodes: 10,
        maxGraphEdges: 20,
        maxChars: 120,
        includePaperArtifacts: false,
      },
    ]);
    assert.include(
      response.result.structuredContent.result.diagnostics.warnings.join("\n"),
      "truncated",
    );
  });
});
