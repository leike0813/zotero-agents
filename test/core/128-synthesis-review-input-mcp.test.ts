import { assert } from "chai";
import fs from "fs/promises";
import {
  resetHostBridgeFileRegistryForTests,
  resolveHostBridgeFileDownload,
} from "../../src/modules/hostBridgeFileRegistry";
import { handleZoteroMcpRequestForTests } from "../../src/modules/zoteroMcpServer";
import {
  createSynthesisClientFromPort,
  type SynthesisClientPort,
} from "../../src/modules/synthesisClient/clientPortAdapter";

type SynthesisClientPorts = Record<string, (...args: any[]) => any>;

function resolveClientFromPorts(ports: SynthesisClientPorts) {
  const client = createSynthesisClientFromPort(
    ports as unknown as SynthesisClientPort,
  );
  return () => client;
}

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

    const reviewCorpus = JSON.parse(
      await fs.readFile(
        "packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-workflow-review.json",
        "utf8",
      ),
    ) as { cases: Array<{ id: string; value: unknown }> };
    const reviewResult = structuredClone(
      reviewCorpus.cases.find(
        (entry) => entry.id === "workflow-review-recursive-positive",
      )!.value,
    );
    const calls: unknown[] = [];
    const service: SynthesisClientPorts = {
      getReviewInput(args) {
        calls.push(args);
        return reviewResult;
      },
    };
    const response: any = await handleZoteroMcpRequestForTests(
      request(2, "topics.get_review_input", {
        topicId: "topic:1",
        maxGraphNodes: 120,
      }),
      { resolveSynthesisClient: resolveClientFromPorts(service) },
    );

    assert.deepEqual(calls, [{ topicId: "topic:1", maxGraphNodes: 120 }]);
    assert.equal(
      response.result.structuredContent.tool,
      "topics.get_review_input",
    );
    const result = response.result.structuredContent.result;
    assert.deepInclude(result.topic, { topic_id: "topic:1" });
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
    assert.equal(reviewInput.structured_topic.claims[0].id, "claim:1");
    assert.equal(reviewInput.structured_topic.coverage.verdict, "partial");
  });
});
