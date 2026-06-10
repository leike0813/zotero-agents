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

describe("Synthesis review input MCP tool", function () {
  it("lists and routes the read-only review input tool", async function () {
    const list: any = await handleZoteroMcpRequestForTests({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
    });
    const names = list.result.tools.map((tool: { name: string }) => tool.name);
    assert.include(names, "topics.get_review_input");
    assert.notInclude(names, "synthesis.write_review_input");

    const calls: unknown[] = [];
    const service: SynthesisMcpService = {
      getReviewInput(args) {
        calls.push(args);
        return {
          kind: "synthesis.review_workflow_input",
          topic: { topic_id: args.topicId },
          structured_topic: {
            claims: [{ id: "claim-1" }],
            timeline_events: {
              summary: { text: "Event summary." },
              events: [{ id: "event-1" }],
            },
            paper_evidence: [{ id: "ev-a" }],
            external_literature_analysis: { summary: "External context." },
            coverage: { status: "partial" },
            future_directions: [],
          },
        };
      },
    };
    const response: any = await handleZoteroMcpRequestForTests(
      request(2, "topics.get_review_input", {
        topicId: "topic-alpha",
        maxGraphNodes: 120,
      }),
      { resolveSynthesisService: () => service },
    );

    assert.deepEqual(calls, [{ topicId: "topic-alpha", maxGraphNodes: 120 }]);
    assert.equal(
      response.result.structuredContent.tool,
      "topics.get_review_input",
    );
    assert.equal(
      response.result.structuredContent.result.kind,
      "synthesis.review_workflow_input",
    );
    assert.deepEqual(
      response.result.structuredContent.result.structured_topic.claims,
      [{ id: "claim-1" }],
    );
    assert.equal(
      response.result.structuredContent.result.structured_topic
        .external_literature_analysis.summary,
      "External context.",
    );
  });
});
