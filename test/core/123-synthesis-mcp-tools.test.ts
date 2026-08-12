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

async function loadProtocolCorpusCase(file: string, id: string) {
  const corpus = JSON.parse(
    await fs.readFile(
      path.join(
        process.cwd(),
        "packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus",
        file,
      ),
      "utf8",
    ),
  ) as { cases: Array<{ id: string; value: unknown }> };
  return structuredClone(corpus.cases.find((entry) => entry.id === id)!.value);
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
          topics: [],
          cursor: "",
          next_cursor: "",
          has_more: false,
          returned: 0,
          total: 0,
          limit: 25,
          diagnostics: {
            count: 0,
            total_count: 0,
            source: "rust-topic-application",
          },
        };
      },
      findTopicsByPaperRef(args) {
        calls.push(`topics_by_paper:${args.paper_refs.join(",")}`);
        return {
          ok: true,
          status: "ok",
          paper_refs: args.paper_refs,
          topics: [],
          diagnostics: {
            requested_count: 1,
            matched_topic_count: 0,
            unmatched_paper_refs: args.paper_refs,
            source: "rust-topic-application",
          },
        };
      },
      getSchemas() {
        calls.push("schemas:all");
        return {
          schema: "synthesis-artifact-library-debug-schemas.v1",
          schemas: {
            result_bundle: "synthesis.topic_synthesis_result_bundle@1.0.0",
            canonical_metadata: "synthesis.topic_artifact_metadata@1.0.0",
            artifact_manifest: "synthesis.paper_artifact_manifest@1.0.0",
            library_index: "synthesis.library_index@1.0.0",
            debug_snapshot: "synthesis.debug-maintenance.v1",
          },
          redaction: {
            local_paths: "[redacted-path]",
            credentials: "omitted",
            host_objects: "omitted",
          },
        };
      },
      getLibraryIndex(args) {
        calls.push(
          `library_index:${args.cursor || "0"}:${args.limit || "default"}`,
        );
        return {
          libraryId: 1,
          papers: [],
          cursor: String(args.cursor || "0"),
          next_cursor: "",
          has_more: false,
          returned: 0,
          total_papers: 0,
          limit: 1,
          index_hash: `sha256:${"a".repeat(64)}`,
          page_hash: `sha256:${"b".repeat(64)}`,
          pagination: {
            papers: {
              cursor: "0",
              nextCursor: "",
              hasMore: false,
              returned: 0,
              total: 0,
              limit: 1,
            },
          },
        };
      },
      resolveResolver(args) {
        calls.push(`resolve:${args.tag.and[0]}`);
        return {
          ok: true,
          errors: [],
          papers: [
            {
              paper_ref: "1:ABCD1234",
              item_key: "ABCD1234",
              title: "Alpha Paper",
              year: "2026",
              match_reasons: ["tag"],
            },
          ],
          normalized_resolver: args,
          cursor: "0",
          next_cursor: "",
          has_more: false,
          returned: 1,
          total: 1,
          limit: 25,
          diagnostics: {
            final_count: 1,
            total_candidates: 1,
            rejected: false,
          },
        };
      },
    };

    const listResponse: any = await handleZoteroMcpRequestForTests(
      request(0, "topics.list", { cursor: "", limit: 25 }),
      { resolveSynthesisClient: resolveClientFromPorts(service) },
    );
    const topicsByPaperResponse: any = await handleZoteroMcpRequestForTests(
      request(4, "topics.find_by_paper_ref", {
        paper_refs: ["1:ABCD1234"],
      }),
      { resolveSynthesisClient: resolveClientFromPorts(service) },
    );
    const schemaResponse: any = await handleZoteroMcpRequestForTests(
      request(1, "schemas.get"),
      { resolveSynthesisClient: resolveClientFromPorts(service) },
    );
    const indexResponse: any = await handleZoteroMcpRequestForTests(
      request(3, "library_index.get", { cursor: "0", limit: 1 }),
      { resolveSynthesisClient: resolveClientFromPorts(service) },
    );
    const resolveResponse: any = await handleZoteroMcpRequestForTests(
      request(2, "resolvers.resolve", {
        paper_refs: [],
        collection_key: [],
        tag: { and: ["topic:test"] },
        combine: "union",
        cursor: 0,
        limit: 25,
      }),
      { resolveSynthesisClient: resolveClientFromPorts(service) },
    );

    assert.deepEqual(calls, [
      "list_topics",
      "topics_by_paper:1:ABCD1234",
      "schemas:all",
      "library_index:0:1",
      "resolve:topic:test",
    ]);
    assert.deepEqual(listResponse.result.structuredContent.result.topics, []);
    assert.deepEqual(
      topicsByPaperResponse.result.structuredContent.result.paper_refs,
      ["1:ABCD1234"],
    );
    assert.include(schemaResponse.result.content[0].text, "schemas");
    assert.equal(indexResponse.result.structuredContent.result.has_more, false);
    assert.equal(indexResponse.result.structuredContent.result.returned, 0);
    assert.isTrue(resolveResponse.result.structuredContent.result.ok);
    assert.equal(
      resolveResponse.result.structuredContent.result.candidates[0].paper_ref,
      "1:ABCD1234",
    );
  });

  it("returns structured resolver validation failures from resolve_resolver", async function () {
    const response: any = await handleZoteroMcpRequestForTests(
      request(1, "resolvers.resolve", {
        resolver: {
          selection_strategy: "explicit_refs",
          paper_refs: ["1:ABCD1234"],
        },
      }),
      { resolveSynthesisClient: resolveClientFromPorts({}) },
    );

    assert.equal(response.error.code, -32602);
    assert.match(response.error.message, /resolver|unknown|additional/i);
  });

  it("routes reference sidecar index and graph slice reads through the injected service", async function () {
    const service: SynthesisClientPorts = {
      getReferenceSidecarIndex() {
        return {
          rows: [],
          cursor: "",
          next_cursor: "",
          has_more: false,
          returned: 0,
          total: 0,
          limit: 25,
          diagnostics: {
            cache_found: false,
            storage: "sqlite",
            stale: false,
            warnings: [],
            recommended_commands: [],
            repository_basis_hash: `sha256:${"a".repeat(64)}`,
            canonical_basis_hash: `sha256:${"b".repeat(64)}`,
          },
        };
      },
      getCitationGraphSlice() {
        return {
          ok: true,
          graph_hash: `sha256:${"c".repeat(64)}`,
          querySignature: `sha256:${"d".repeat(64)}`,
          start_node_id: "zotero:item:ABCD1234",
          nodes: [],
          edges: [],
          diagnostics: {
            snapshot_found: false,
            depth: 1,
            direction: "both",
            node_count: 0,
            edge_count: 0,
            truncated: false,
            bounded: true,
            warnings: [],
          },
        };
      },
    };

    for (const [id, name, args] of [
      [1, "reference_index.get", { sourceRefs: ["1:ABCD1234"], limit: 25 }],
      [2, "citation_graph.get_slice", { paperRef: "1:ABCD1234" }],
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
          artifacts: [
            {
              paper_ref: "1:ABCD1234",
              artifact_type: "digest",
              status: "available",
              payload_type: "digest-markdown",
              payload_types_seen: ["digest-markdown"],
              diagnostics: [],
            },
          ],
          diagnostics: [],
          total: 1,
        };
      },
      readPaperArtifacts(args) {
        calls.push({ method: "read", args });
        return {
          artifacts: [
            {
              paper_ref: args.paper_refs[0],
              artifact_type: "digest",
              payload_type: "digest-markdown",
              status: "available",
              markdown: "# Digest",
              decoded_text: "# Digest",
              payload_types_seen: ["digest-markdown"],
              diagnostics: [],
            },
          ],
          diagnostics: [],
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
          paper_ref: args.paper_refs[0],
          paper_refs: args.paper_refs,
          manifest_file: "runtime/payloads/paper-artifacts-manifest.json",
          artifact_statuses: [
            {
              paper_ref: args.paper_refs[0],
              artifact_type: "digest",
              payload_type: "digest-markdown",
              status: "available",
              missing_reason: "",
            },
          ],
          diagnostics: [],
        };
      },
    };

    const response: any = await handleZoteroMcpRequestForTests(
      request(12, "paper_artifacts.export_filtered", {
        run_root: ".",
        paper_refs: ["1:ABCD1234"],
      }),
      { resolveSynthesisClient: resolveClientFromPorts(service) },
    );

    assert.deepEqual(calls, [{ run_root: ".", paper_refs: ["1:ABCD1234"] }]);
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
              missing_reason: "",
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

  it("routes the current digest view through get_topic_context", async function () {
    const calls: Record<string, unknown>[] = [];
    const service: SynthesisClientPorts = {
      getTopicContext(args) {
        calls.push(args);
        return {
          schema_id: "synthesis.topic_context",
          schema_version: "2.0.0",
          topic_id: args.topicId,
          view: "digest",
          diagnostics: [],
        };
      },
    };

    const response: any = await handleZoteroMcpRequestForTests(
      request(10, "topics.get_context", {
        topicId: "object-detection",
        view: "digest",
      }),
      { resolveSynthesisClient: resolveClientFromPorts(service) },
    );

    assert.deepEqual(calls, [{ topicId: "object-detection", view: "digest" }]);
    assert.equal(
      response.result.structuredContent.result.topic_id,
      "object-detection",
    );
    assert.equal(response.result.structuredContent.result.view, "digest");
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

  it("returns the strict semantic topic context through MCP", async function () {
    const calls: Record<string, unknown>[] = [];
    const service: SynthesisClientPorts = {
      getTopicContext(args) {
        calls.push(args);
        return {
          schema_id: "synthesis.topic_context",
          schema_version: "2.0.0",
          topic_id: args.topicId,
          view: args.view,
          diagnostics: [],
        };
      },
    };

    const response: any = await handleZoteroMcpRequestForTests(
      request(13, "topics.get_context", {
        topicId: "object-detection",
        view: "semantic",
      }),
      { resolveSynthesisClient: resolveClientFromPorts(service) },
    );

    assert.deepEqual(calls, [
      {
        topicId: "object-detection",
        view: "semantic",
      },
    ]);
    assert.equal(response.result.structuredContent.result.view, "semantic");
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
            workflowId: "topic-synthesis",
            runId: "run-object-detection",
            skillId: "topic-synthesis-finalize",
            artifactPath: "topics/object-detection/current/artifact.json",
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
      response.result.structuredContent.result.source.artifactPath,
      "topics/object-detection/current/artifact.json",
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
        paperRef: "1:ABCD1234",
        includeRepresentativeImage: false,
        digestRef: {
          paperRef: "1:ABCD1234",
          locator: "runtime:topic-digest:ABCD1234",
          payloadHash: "sha256:old",
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

  it("returns paged reference sidecar index rows from the injected client", async function () {
    const service: SynthesisClientPorts = {
      getReferenceSidecarIndex() {
        return {
          rows: [
            {
              paper_ref: "1:CCCC3333",
              library_id: 1,
              item_key: "CCCC3333",
              title: "Gamma",
              year: "2026",
              metadata_hash: `sha256:${"c".repeat(64)}`,
              updated_at: "2026-08-12T00:00:00Z",
              artifactCoverage: "partial",
              missing_artifacts: [],
              reference_count: 0,
              unbound_reference_count: 0,
              references: [],
            },
          ],
          cursor: "1",
          next_cursor: "",
          has_more: false,
          returned: 1,
          total: 2,
          limit: 1,
          diagnostics: {
            cache_found: true,
            storage: "sqlite",
            stale: false,
            warnings: [],
            recommended_commands: [],
            repository_basis_hash: `sha256:${"a".repeat(64)}`,
            canonical_basis_hash: `sha256:${"b".repeat(64)}`,
          },
        };
      },
    };

    const response: any = await handleZoteroMcpRequestForTests(
      request(20, "reference_index.get", {
        sourceRefs: ["1:BBBB2222", "1:CCCC3333"],
        includeReferences: true,
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

  it("returns paged resolver matches from the injected client", async function () {
    const service: SynthesisClientPorts = {
      resolveResolver(args) {
        return {
          ok: true,
          errors: [],
          papers: [
            {
              paper_ref: "1:BBBB2222",
              item_key: "BBBB2222",
              title: "Beta",
              year: "2026",
              match_reasons: ["tag_query"],
            },
          ],
          normalized_resolver: args,
          cursor: "1",
          next_cursor: "2",
          has_more: true,
          returned: 1,
          total: 3,
          limit: 1,
          diagnostics: {
            final_count: 1,
            total_candidates: 3,
            rejected: false,
          },
        };
      },
    };

    const response: any = await handleZoteroMcpRequestForTests(
      request(21, "resolvers.resolve", {
        tag: { and: ["topic:x"] },
        paper_refs: [],
        collection_key: [],
        combine: "union",
        cursor: 1,
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
    const paper = {
      paper_ref: "1:AAAA1111",
      library_id: 1,
      item_key: "AAAA1111",
      title: "Alpha",
      year: "2026",
      item_type: "journalArticle",
      creators: [],
      tags: ["topic:x"],
      collections: [],
    };
    const service: SynthesisClientPorts = {
      getLibraryIndex(args) {
        const result: Record<string, any> = {
          libraryId: 1,
          papers: [paper],
          cursor: "",
          next_cursor: "",
          has_more: false,
          returned: 1,
          total_papers: 1,
          limit: 1,
          index_hash: `sha256:${"a".repeat(64)}`,
          page_hash: `sha256:${"b".repeat(64)}`,
          pagination: {
            papers: {
              cursor: "",
              nextCursor: "",
              hasMore: false,
              returned: 1,
              total: 1,
              limit: 1,
            },
          },
        };
        if (args.includeTags) {
          result.tags = {
            items: [{ tag: "topic:x", count: 1 }],
            cursor: "",
            nextCursor: "",
            hasMore: false,
            returned: 1,
            total: 1,
            limit: 1,
          };
        }
        if (args.includeItems) {
          result.registry = {
            items: [paper],
            cursor: "",
            nextCursor: "",
            hasMore: false,
            returned: 1,
            total: 1,
            limit: 1,
          };
        }
        return result;
      },
    };

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
    assert.lengthOf(expandedResult.tags.items, 1);
    assert.lengthOf(expandedResult.registry.items, 1);
    assert.isObject(expandedResult.pagination);
    assert.strictEqual(expandedResult.pagination.papers.limit, 1);
    assert.strictEqual(expandedResult.tags.limit, 1);
    assert.strictEqual(expandedResult.registry.limit, 1);
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
    const reviewResult = await loadProtocolCorpusCase(
      "client-workflow-review.json",
      "workflow-review-recursive-positive",
    );
    const calls: Record<string, unknown>[] = [];
    const service: SynthesisClientPorts = {
      getReviewInput(args) {
        calls.push(args);
        return reviewResult;
      },
    };

    const response: any = await handleZoteroMcpRequestForTests(
      request(24, "topics.get_review_input", {
        topicId: "topic:1",
        maxGraphNodes: 10,
        maxGraphEdges: 20,
        maxChars: 120,
        includePaperArtifacts: false,
      }),
      { resolveSynthesisClient: resolveClientFromPorts(service) },
    );

    assert.deepEqual(calls, [
      {
        topicId: "topic:1",
        maxGraphNodes: 10,
        maxGraphEdges: 20,
        maxChars: 120,
        includePaperArtifacts: false,
      },
    ]);
    assert.equal(
      response.result.structuredContent.result.topic.topic_id,
      "topic:1",
    );
    assert.equal(
      response.result.structuredContent.result.summary.registryRows,
      1,
    );
  });
});
