import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { handleZoteroMcpRequestForTests } from "../../src/modules/zoteroMcpServer";
import { createSynthesisService } from "../../src/modules/synthesis/service";
import type { SynthesisMcpService } from "../../src/modules/synthesis/mcpService";
import { renderPayloadBlock } from "../../src/modules/notePayloadCodec";
import { getRuntimePersistencePaths } from "../../src/modules/runtimePersistence";

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
      "synthesis.list_topics",
      "synthesis.get_topic_context",
      "synthesis.get_schemas",
      "synthesis.get_library_index",
      "synthesis.resolve_resolver",
      "synthesis.get_paper_registry",
      "synthesis.get_citation_graph_slice",
      "synthesis.get_citation_graph_metrics",
      "synthesis.get_paper_artifact_manifest",
      "synthesis.export_filtered_paper_artifacts",
      "synthesis.resolve_topic_paper_digest",
      "synthesis.get_review_input",
    ]);
    assert.notInclude(names, "synthesis.export_paper_artifact_bundle");
    assert.notInclude(names, "synthesis.query_citation_graph");
    assert.notInclude(names, "synthesis.read_paper_artifacts");
    assert.notInclude(names, "synthesis.validate_resolver");
    assert.notInclude(names, "synthesis.apply_update");
  });

  it("routes topic inventory, schema, and resolver calls through the injected synthesis service", async function () {
    const calls: string[] = [];
    const service: SynthesisMcpService = {
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
        calls.push(`resolve:${(args.resolver as any).mode}`);
        return {
          ok: true,
          papers: [{ paper_ref: "1:ABCD1234", match_reasons: ["tag"] }],
          normalized_resolver: args.resolver,
          diagnostics: { final_count: 1 },
        };
      },
    };

    const listResponse: any = await handleZoteroMcpRequestForTests(
      request(0, "synthesis.list_topics"),
      { resolveSynthesisService: () => service },
    );
    const schemaResponse: any = await handleZoteroMcpRequestForTests(
      request(1, "synthesis.get_schemas", { kind: "resolver" }),
      { resolveSynthesisService: () => service },
    );
    const indexResponse: any = await handleZoteroMcpRequestForTests(
      request(3, "synthesis.get_library_index", { cursor: "0", limit: 1 }),
      { resolveSynthesisService: () => service },
    );
    const resolveResponse: any = await handleZoteroMcpRequestForTests(
      request(2, "synthesis.resolve_resolver", {
        resolver: { mode: "tag_query", query: "topic:test" },
      }),
      { resolveSynthesisService: () => service },
    );

    assert.deepEqual(calls, [
      "list_topics",
      "schemas:resolver",
      "library_index:0:1",
      "resolve:tag_query",
    ]);
    assert.equal(
      listResponse.result.structuredContent.result.topics[0].topic_id,
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
      resolveResponse.result.structuredContent.result.papers[0].paper_ref,
      "1:ABCD1234",
    );
  });

  it("returns structured resolver validation failures from resolve_resolver", async function () {
    const response: any = await handleZoteroMcpRequestForTests(
      request(1, "synthesis.resolve_resolver", {
        resolver: {
          selection_strategy: "explicit_refs",
          paper_refs: ["1:ABCD1234"],
        },
      }),
    );

    assert.isFalse(response.result.structuredContent.result.ok);
    assert.match(
      response.result.structuredContent.result.errors.join("\n"),
      /mode|selection_strategy/i,
    );
    assert.equal(
      response.result.structuredContent.result.diagnostics.rejected,
      true,
    );
  });

  it("routes registry and graph slice reads through the injected service", async function () {
    const service: SynthesisMcpService = {
      getPaperRegistry() {
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
    };

    for (const [id, name, args] of [
      [1, "synthesis.get_paper_registry", { paperRefs: ["1:ABCD1234"] }],
      [2, "synthesis.get_citation_graph_slice", { paperRef: "1:ABCD1234" }],
      [
        3,
        "synthesis.get_citation_graph_metrics",
        { paperRefs: ["1:ABCD1234"] },
      ],
    ] as const) {
      const response: any = await handleZoteroMcpRequestForTests(
        request(id, name, args),
        { resolveSynthesisService: () => service },
      );
      assert.equal(response.result.structuredContent.tool, name);
      assert.include(response.result.content[0].text, "synthesis");
    }
  });

  it("routes synthesis paper artifact manifest through the injected service without exposing bundle reads", async function () {
    const calls: Array<{ method: string; args: Record<string, unknown> }> = [];
    const service: SynthesisMcpService = {
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
    };

    const manifestResponse: any = await handleZoteroMcpRequestForTests(
      request(1, "synthesis.get_paper_artifact_manifest", {
        paper_refs: ["1:ABCD1234"],
      }),
      { resolveSynthesisService: () => service },
    );
    const readResponse: any = await handleZoteroMcpRequestForTests(
      request(2, "synthesis.read_paper_artifacts", { paper_ref: "1:ABCD1234" }),
      { resolveSynthesisService: () => service },
    );

    assert.deepEqual(calls, [
      { method: "manifest", args: { paper_refs: ["1:ABCD1234"] } },
    ]);
    assert.equal(
      manifestResponse.result.structuredContent.tool,
      "synthesis.get_paper_artifact_manifest",
    );
    assert.equal(readResponse.error.code, -32602);
    assert.include(readResponse.error.message, "Unknown Zotero MCP tool");
  });

  it("routes filtered paper artifact export without returning hashes to the LLM", async function () {
    const calls: Record<string, unknown>[] = [];
    const service: SynthesisMcpService = {
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
      request(12, "synthesis.export_filtered_paper_artifacts", {
        run_root: ".",
        paper_ref: "1:ABCD1234",
      }),
      { resolveSynthesisService: () => service },
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
    const service: SynthesisMcpService = {
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
      request(13, "synthesis.export_filtered_paper_artifacts", {
        run_root: ".",
        paper_refs: ["1:AAAA1111", "1:BBBB2222"],
      }),
      { resolveSynthesisService: () => service },
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
    const service = createSynthesisService({
      root,
      libraryId: 1,
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
        request(30, "synthesis.export_filtered_paper_artifacts", {
          run_root: runRoot,
          paper_refs: ["1:ABCD1234", "1:EMPTY000"],
          artifact_types: ["digest", "references", "citation_analysis"],
        }),
        { resolveSynthesisService: () => service },
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
      assert.equal(
        manifest.exported_by,
        "synthesis.export_filtered_paper_artifacts",
      );
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

      assert.includeMembers(digestEntry.payload_types_seen, [
        "digest-markdown",
        "references-json",
        "citation-analysis-json",
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
    } finally {
      await fs.rm(runRoot, { recursive: true, force: true });
    }
  });

  it("rejects unknown synthesis tool arguments", async function () {
    const response: any = await handleZoteroMcpRequestForTests(
      request(1, "synthesis.get_schemas", { kind: "resolver", extra: true }),
      {
        resolveSynthesisService: () => ({
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
    const service: SynthesisMcpService = {
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
      request(10, "synthesis.get_topic_context", {
        topicId: "object-detection",
        mode: "update",
      }),
      { resolveSynthesisService: () => service },
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

  it("routes topic paper digest resolution through the injected synthesis service", async function () {
    const calls: Record<string, unknown>[] = [];
    const service: SynthesisMcpService = {
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
      request(11, "synthesis.resolve_topic_paper_digest", {
        topicId: "object-detection",
        digest_ref: {
          paper_ref: "1:ABCD1234",
          payload_type: "digest-markdown",
          payload_hash: "sha256:old",
        },
      }),
      { resolveSynthesisService: () => service },
    );

    assert.equal(calls.length, 1);
    assert.equal(
      response.result.structuredContent.result.digest_markdown,
      "# Digest",
    );
    assert.isTrue(response.result.structuredContent.result.source_changed);
  });

  it("returns paged paper registry rows from the default synthesis service", async function () {
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
    await service.runLiteratureRegistryJobNow();

    const response: any = await handleZoteroMcpRequestForTests(
      request(20, "synthesis.get_paper_registry", {
        paperRefs: ["1:BBBB2222", "1:CCCC3333"],
        cursor: "1",
        limit: 1,
      }),
      { resolveSynthesisService: () => service },
    );
    const result = response.result.structuredContent.result;

    assert.lengthOf(result.rows, 1);
    assert.equal(result.rows[0].paper_ref, "1:CCCC3333");
    assert.equal(result.cursor, "1");
    assert.equal(result.next_cursor, "");
    assert.isFalse(result.has_more);
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
      request(24, "synthesis.get_citation_graph_metrics", { limit: 5 }),
      { resolveSynthesisService: () => service },
    );
    const result = response.result.structuredContent.result;

    assert.isFalse(result.ok);
    assert.include(
      result.diagnostics.recommended_commands,
      "runLiteratureRegistryJobNow",
    );
    assert.equal(result.diagnostics.maintenance.queue_state, "idle");
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
      request(21, "synthesis.resolve_resolver", {
        resolver: { mode: "tag_query", query: { and: ["topic:x"] } },
        cursor: "1",
        limit: 1,
      }),
      { resolveSynthesisService: () => service },
    );
    const result = response.result.structuredContent.result;

    assert.isTrue(result.ok);
    assert.lengthOf(result.papers, 1);
    assert.equal(result.cursor, "1");
    assert.equal(result.next_cursor, "2");
    assert.isTrue(result.has_more);
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
      request(22, "synthesis.get_library_index", { limit: 1 }),
      { resolveSynthesisService: () => service },
    );
    const expanded: any = await handleZoteroMcpRequestForTests(
      request(23, "synthesis.get_library_index", {
        limit: 1,
        includeTags: true,
        includeItems: true,
      }),
      { resolveSynthesisService: () => service },
    );

    const compactResult = compact.result.structuredContent.result;
    const expandedResult = expanded.result.structuredContent.result;
    assert.lengthOf(compactResult.papers, 1);
    assert.notProperty(compactResult, "tags");
    assert.notProperty(compactResult, "registry");
    assert.isArray(expandedResult.tags);
    assert.isArray(expandedResult.registry);
  });

  it("routes bounded review input arguments through the synthesis MCP service", async function () {
    const calls: Record<string, unknown>[] = [];
    const service: SynthesisMcpService = {
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
      request(24, "synthesis.get_review_input", {
        topicId: "topic-alpha",
        maxGraphNodes: 10,
        maxGraphEdges: 20,
        maxChars: 120,
        includePaperArtifacts: false,
      }),
      { resolveSynthesisService: () => service },
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
