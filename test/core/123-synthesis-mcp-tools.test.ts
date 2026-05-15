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
      "synthesis.get_review_input",
    ]);
    assert.notInclude(names, "synthesis.query_citation_graph");
    assert.notInclude(names, "synthesis.get_paper_artifact_manifest");
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
    const resolveResponse: any = await handleZoteroMcpRequestForTests(
      request(2, "synthesis.resolve_resolver", {
        resolver: { mode: "tag_query", query: "topic:test" },
      }),
      { resolveSynthesisService: () => service },
    );

    assert.deepEqual(calls, ["list_topics", "schemas:resolver", "resolve:tag_query"]);
    assert.equal(
      listResponse.result.structuredContent.result.topics[0].topic_id,
      "topic-alpha",
    );
    assert.include(schemaResponse.result.content[0].text, "schemas");
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

  it("rejects removed synthesis paper artifact read tools as unknown tools", async function () {
    for (const name of [
      "synthesis.get_paper_artifact_manifest",
      "synthesis.read_paper_artifacts",
    ]) {
      const response: any = await handleZoteroMcpRequestForTests(
        request(1, name, { paperRefs: ["1:ABCD1234"] }),
      );
      assert.equal(response.error.code, -32602);
      assert.match(response.error.message, /unknown .*tool/i);
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
});
