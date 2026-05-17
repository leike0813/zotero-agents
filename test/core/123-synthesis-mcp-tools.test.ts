import { assert } from "chai";
import { handleZoteroMcpRequestForTests } from "../../src/modules/zoteroMcpServer";
import type { SynthesisMcpService } from "../../src/modules/synthesis/mcpService";

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

describe("Synthesis MCP tools", function () {
  it("lists synthesis job-time tools", async function () {
    const response: any = await handleZoteroMcpRequestForTests({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
    });

    const names = response.result.tools.map((tool: { name: string }) => tool.name);
    assert.includeMembers(names, [
      "synthesis.list_topics",
      "synthesis.get_topic_context",
      "synthesis.get_schemas",
      "synthesis.get_library_index",
      "synthesis.resolve_resolver",
      "synthesis.get_paper_registry",
      "synthesis.get_citation_graph_slice",
      "synthesis.get_paper_artifact_manifest",
      "synthesis.export_paper_artifact_bundle",
      "synthesis.resolve_topic_paper_digest",
      "synthesis.get_review_input",
    ]);
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
        calls.push(`library_index:${args.cursor || "0"}:${args.limit || "default"}`);
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
    assert.equal(indexResponse.result.structuredContent.result.index_hash, "sha256:index");
    assert.isTrue(resolveResponse.result.structuredContent.result.ok);
    assert.equal(resolveResponse.result.structuredContent.result.papers[0].paper_ref, "1:ABCD1234");
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
    assert.match(response.result.structuredContent.result.errors.join("\n"), /mode|selection_strategy/i);
    assert.equal(response.result.structuredContent.result.diagnostics.rejected, true);
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
    };

    for (const [id, name, args] of [
      [1, "synthesis.get_paper_registry", { paperRefs: ["1:ABCD1234"] }],
      [2, "synthesis.get_citation_graph_slice", { paperRef: "1:ABCD1234" }],
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
                { artifact_type: "digest", status: "available", payload_type: "digest-markdown" },
              ],
            },
          ],
          total: 1,
        };
      },
    };

    const manifestResponse: any = await handleZoteroMcpRequestForTests(
      request(1, "synthesis.get_paper_artifact_manifest", { paper_refs: ["1:ABCD1234"] }),
      { resolveSynthesisService: () => service },
    );
    const readResponse: any = await handleZoteroMcpRequestForTests(
      request(2, "synthesis.read_paper_artifacts", { paper_ref: "1:ABCD1234" }),
      { resolveSynthesisService: () => service },
    );

    assert.deepEqual(calls, [
      { method: "manifest", args: { paper_refs: ["1:ABCD1234"] } },
    ]);
    assert.equal(manifestResponse.result.structuredContent.tool, "synthesis.get_paper_artifact_manifest");
    assert.equal(readResponse.error.code, -32602);
    assert.include(readResponse.error.message, "Unknown Zotero MCP tool");
  });

  it("routes paper artifact bundle export without returning hashes to the LLM", async function () {
    const calls: Record<string, unknown>[] = [];
    const service: SynthesisMcpService = {
      exportPaperArtifactBundle(args) {
        calls.push(args);
        return {
          paper_ref: args.paper_ref,
          payload_file: "runtime/payloads/paper-artifacts-1_ABCD1234.json",
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
      request(12, "synthesis.export_paper_artifact_bundle", {
        run_root: ".",
        paper_ref: "1:ABCD1234",
      }),
      { resolveSynthesisService: () => service },
    );

    assert.deepEqual(calls, [{ run_root: ".", paper_ref: "1:ABCD1234" }]);
    const result = response.result.structuredContent.result;
    assert.equal(result.payload_file, "runtime/payloads/paper-artifacts-1_ABCD1234.json");
    assert.notProperty(result, "payload_hash");
    assert.notInclude(JSON.stringify(result), "sha256:");
  });

  it("routes batched paper artifact bundle export without returning payload bodies or hashes", async function () {
    const calls: Record<string, unknown>[] = [];
    const service: SynthesisMcpService = {
      exportPaperArtifactBundle(args) {
        calls.push(args);
        return {
          paper_refs: args.paper_refs,
          manifest_file: "runtime/payloads/paper-artifact-bundles-batch.json",
          payload_files: [
            {
              paper_ref: "1:AAAA1111",
              payload_file: "runtime/payloads/paper-artifacts-1_AAAA1111.json",
            },
            {
              paper_ref: "1:BBBB2222",
              payload_file: "runtime/payloads/paper-artifacts-1_BBBB2222.json",
            },
          ],
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
      request(13, "synthesis.export_paper_artifact_bundle", {
        run_root: ".",
        paper_refs: ["1:AAAA1111", "1:BBBB2222"],
      }),
      { resolveSynthesisService: () => service },
    );

    assert.deepEqual(calls, [
      { run_root: ".", paper_refs: ["1:AAAA1111", "1:BBBB2222"] },
    ]);
    const result = response.result.structuredContent.result;
    assert.equal(result.manifest_file, "runtime/payloads/paper-artifact-bundles-batch.json");
    assert.lengthOf(result.payload_files, 2);
    assert.notInclude(JSON.stringify(result), "payload_hash");
    assert.notInclude(JSON.stringify(result), "sha256:");
    assert.notInclude(JSON.stringify(result), "decoded_text");
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
    assert.equal(response.result.structuredContent.result.topic_id, "object-detection");
    assert.deepInclude(response.result.structuredContent.result.recommended_update, {
      allowed: true,
      reason: "artifact_changed",
      scope: "claims",
      mode: "update_patch",
    });
    assert.deepEqual(
      response.result.structuredContent.result.recommended_update.changed_sections,
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
    assert.equal(response.result.structuredContent.result.digest_markdown, "# Digest");
    assert.isTrue(response.result.structuredContent.result.source_changed);
  });
});
