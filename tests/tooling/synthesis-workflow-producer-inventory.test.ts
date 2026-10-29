import { assert } from "chai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { synthesisWorkflowProducerIds } from "../../scripts/synthesis/check-synthesis-cross-language-contracts";

describe("Synthesis workflow producer inventory", function () {
  it("includes imported consumers and discovers new workflows without a second roster", function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "synthesis-producers-"));
    const write = (file: string, source: unknown) => {
      const fullPath = path.join(root, file);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(
        fullPath,
        typeof source === "string" ? source : JSON.stringify(source),
      );
    };
    try {
      write("package/workflow-package.json", {
        workflows: ["consumer/workflow.json", "other/workflow.json"],
      });
      write("package/consumer/workflow.json", {
        id: "consumer",
        hooks: { applyResult: "hook.mjs" },
      });
      write(
        "package/consumer/hook.mjs",
        'import { apply } from "../lib.mjs"; export { apply };',
      );
      write(
        "package/lib.mjs",
        'export function apply(host) { return host.synthesis.topics.getReport({ topicId: "topic:1" }); }',
      );
      write("package/other/workflow.json", {
        id: "other",
        hooks: { applyResult: "hook.mjs" },
      });
      write(
        "package/other/hook.mjs",
        'export function apply() { return "synthesis mentioned in prose"; }',
      );
      assert.deepEqual(synthesisWorkflowProducerIds(root), ["consumer"]);
      write("package/new/workflow.json", {
        id: "new",
        hooks: { buildRequest: "../consumer/hook.mjs" },
      });
      write("package/workflow-package.json", {
        workflows: [
          "consumer/workflow.json",
          "other/workflow.json",
          "new/workflow.json",
        ],
      });
      assert.deepEqual(synthesisWorkflowProducerIds(root), ["consumer", "new"]);
      write(
        "package/other/hook.mjs",
        'import { label } from "../lib.mjs"; export function applyResult() { return label; }',
      );
      write(
        "package/lib.mjs",
        'export const label = "shared label"; export function apply(host) { return host.synthesis.topics.getReport({ topicId: "topic:1" }); }',
      );
      assert.deepEqual(synthesisWorkflowProducerIds(root), ["consumer", "new"]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
