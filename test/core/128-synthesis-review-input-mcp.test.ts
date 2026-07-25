import { assert } from "chai";
import fs from "fs/promises";
import {
  resetHostBridgeFileRegistryForTests,
  resolveHostBridgeFileDownload,
} from "../../src/modules/hostBridgeFileRegistry";
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
  afterEach(function () {
    resetHostBridgeFileRegistryForTests();
  });

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
          registry_rows: [{ paper_ref: "1:ABCD1234" }],
          citation_graph_slice: {
            nodes: [{ node_id: "zotero:item:ABCD1234" }],
            edges: [],
          },
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
    const result = response.result.structuredContent.result;
    assert.deepInclude(result.topic, { topic_id: "topic-alpha" });
    assert.deepEqual(result.summary, {
      registryRows: 1,
      graphNodes: 1,
      graphEdges: 0,
    });
    assert.equal(result.delivery.mode, "bridge-download");
    assert.match(result.delivery.file.fileId, /^file-/);
    assert.notProperty(result.delivery.file, "localPath");

    const downloaded = await resolveHostBridgeFileDownload(
      result.delivery.file.fileId,
    );
    const reviewInput = JSON.parse(
      await fs.readFile(downloaded.source.path, "utf8"),
    );
    assert.equal(reviewInput.kind, "synthesis.review_workflow_input");
    assert.deepEqual(reviewInput.structured_topic.claims, [{ id: "claim-1" }]);
    assert.equal(
      reviewInput.structured_topic.external_literature_analysis.summary,
      "External context.",
    );
  });
});
