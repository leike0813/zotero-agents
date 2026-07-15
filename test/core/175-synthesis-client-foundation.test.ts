import { assert } from "chai";
import fs from "fs";
import path from "path";
import {
  SynthesisClientError,
  type SynthesisWorkflowTopicOptionsResult,
} from "../../packages/synthesis-contracts/src/index";
import { createInProcessSynthesisClient } from "../../src/modules/synthesisClient/inProcessClient";

const ROOT = path.resolve(import.meta.dirname, "../..");

describe("Synthesis client foundation", function () {
  it("keeps the contracts package environment-neutral and independently checked", function () {
    const packageRoot = path.join(ROOT, "packages/synthesis-contracts");
    const source = fs
      .readdirSync(path.join(packageRoot, "src"), { recursive: true })
      .filter((entry) => String(entry).endsWith(".ts"))
      .map((entry) =>
        fs.readFileSync(path.join(packageRoot, "src", String(entry)), "utf8"),
      )
      .join("\n");
    const tsconfig = JSON.parse(
      fs.readFileSync(path.join(packageRoot, "tsconfig.json"), "utf8"),
    ) as { compilerOptions?: { lib?: string[]; types?: string[] } };
    const rootPackage = JSON.parse(
      fs.readFileSync(path.join(ROOT, "package.json"), "utf8"),
    ) as { scripts?: Record<string, string>; workspaces?: string[] };

    assert.deepEqual(tsconfig.compilerOptions?.lib, ["ES2022"]);
    assert.deepEqual(tsconfig.compilerOptions?.types, []);
    assert.include(rootPackage.workspaces, "packages/*");
    assert.include(rootPackage.scripts?.build, "check:synthesis-contracts");
    assert.notMatch(
      source,
      /(?:from\s+|import\s*\()["'](?:node:|zotero-|\.\.\/\.\.\/src|\.\.\/\.\.\/\.\.\/src)/,
    );
    assert.notMatch(source, /\b(?:Zotero|Window|Document|HTMLElement)\b/);
  });

  it("routes the Topic option use case through a grouped narrow port", async function () {
    let requestedFilter = "";
    const expected: SynthesisWorkflowTopicOptionsResult = {
      options: [
        {
          value: "topic-alpha",
          label: "Alpha",
          description: "Update",
          meta: { kind: "synthesis.topic", topicId: "topic-alpha" },
        },
      ],
      diagnostics: [],
    };
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions(args) {
        requestedFilter = args?.filter || "";
        return expected;
      },
    });

    assert.deepEqual(
      await client.topics.listWorkflowOptions({ filter: "updatable" }),
      expected,
    );
    assert.equal(requestedFilter, "updatable");
    assert.notProperty(client, "listWorkflowTopicOptions");
  });

  it("normalizes ordinary failures to a stable client error", async function () {
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        throw new Error("legacy exploded");
      },
    });

    try {
      await client.topics.listWorkflowOptions();
      assert.fail("expected the client call to reject");
    } catch (error) {
      assert.instanceOf(error, SynthesisClientError);
      assert.equal((error as SynthesisClientError).code, "internal");
      assert.equal((error as SynthesisClientError).details?.causeName, "Error");
    }
  });

  it("preserves existing stable client errors", async function () {
    const expected = new SynthesisClientError("timeout", "timed out", {
      operation: "topics.listWorkflowOptions",
    });
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        throw expected;
      },
    });

    try {
      await client.topics.listWorkflowOptions();
      assert.fail("expected the client call to reject");
    } catch (error) {
      assert.strictEqual(error, expected);
    }
  });

  it("isolates legacy default-service resolution in client composition", function () {
    const composition = fs.readFileSync(
      path.join(ROOT, "src/modules/synthesisClient/defaultClient.ts"),
      "utf8",
    );
    const consumer = fs.readFileSync(
      path.join(ROOT, "src/modules/workflowParameterOptions.ts"),
      "utf8",
    );

    assert.include(composition, "getDefaultSynthesisService");
    assert.notMatch(composition, /\btype\s+SynthesisService\b/);
    assert.notInclude(consumer, "getDefaultSynthesisService");
    assert.notInclude(consumer, "./synthesis/service");
    assert.include(consumer, "getDefaultSynthesisClient");
  });
});
