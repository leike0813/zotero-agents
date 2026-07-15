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

  it("routes the four region-scoped Workbench reads through narrow ports", async function () {
    const calls: Array<{ operation: string; args: unknown[] }> = [];
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async getSynthesisWorkbenchChromeInput(state) {
        calls.push({ operation: "chrome", args: [state] });
        return { libraryId: 1, storage: { rootState: "ready" } };
      },
      async getSynthesisWorkbenchSurfaceInput(surface, state) {
        calls.push({ operation: "surface", args: [surface, state] });
        return { libraryId: 1, registry: { rows: [] } };
      },
      async readTopicDetail(request) {
        calls.push({ operation: "topic-detail", args: [request] });
        return {
          ok: true,
          status: "ready",
          topicId: request.topicId,
          title: "Topic Alpha",
          source_papers: [],
        };
      },
      async resolveTopicPaperDigest(request) {
        calls.push({ operation: "paper-digest", args: [request] });
        return {
          ok: true,
          status: "available",
          paper_ref: String(request.paper_ref || ""),
          digest_markdown: "# Digest",
          recorded_hash: "old",
          current_hash: "new",
          source_changed: true,
          diagnostics: [],
          optional_field: undefined,
        };
      },
    });
    const state = { selectedTab: "registry" };

    assert.deepEqual(await client.workbench.readChrome({ state }), {
      libraryId: 1,
      storage: { rootState: "ready" },
    });
    assert.deepEqual(
      await client.workbench.readSurface({ surface: "index", state }),
      { libraryId: 1, registry: { rows: [] } },
    );
    assert.deepEqual(
      await client.workbench.readTopicDetail({ topicId: "topic-alpha" }),
      {
        ok: true,
        status: "ready",
        topicId: "topic-alpha",
        title: "Topic Alpha",
        source_papers: [],
      },
    );
    assert.deepEqual(
      await client.workbench.readPaperDigest({
        topicId: "topic-alpha",
        paperRef: "1:ABCD1234",
        digestRef: { note_key: "NOTE1234" },
        includeRepresentativeImage: true,
      }),
      {
        ok: true,
        status: "available",
        paper_ref: "1:ABCD1234",
        digest_markdown: "# Digest",
        recorded_hash: "old",
        current_hash: "new",
        source_changed: true,
        diagnostics: [],
      },
    );
    assert.deepEqual(calls, [
      { operation: "chrome", args: [state] },
      { operation: "surface", args: ["index", state] },
      {
        operation: "topic-detail",
        args: [{ topicId: "topic-alpha" }],
      },
      {
        operation: "paper-digest",
        args: [
          {
            topicId: "topic-alpha",
            paper_ref: "1:ABCD1234",
            digest_ref: { note_key: "NOTE1234" },
            include_representative_image: true,
          },
        ],
      },
    ]);
    assert.notProperty(client.workbench, "getSynthesisSnapshot");
  });

  it("rejects non-JSON Workbench state before invoking the legacy port", async function () {
    let invoked = false;
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async getSynthesisWorkbenchChromeInput() {
        invoked = true;
        return {};
      },
    });

    try {
      await client.workbench.readChrome({
        state: { callback: (() => undefined) as never },
      });
      assert.fail("expected the Workbench request to reject");
    } catch (error) {
      assert.instanceOf(error, SynthesisClientError);
      assert.equal((error as SynthesisClientError).code, "invalid_request");
      assert.equal(invoked, false);
    }
  });

  it("normalizes Workbench legacy failures without retrying", async function () {
    let attempts = 0;
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async readTopicDetail() {
        attempts += 1;
        throw new Error("topic detail exploded");
      },
    });

    try {
      await client.workbench.readTopicDetail({ topicId: "topic-alpha" });
      assert.fail("expected the Workbench request to reject");
    } catch (error) {
      assert.instanceOf(error, SynthesisClientError);
      assert.equal((error as SynthesisClientError).code, "internal");
      assert.equal(attempts, 1);
    }
  });

  it("isolates legacy default-service resolution in client composition", function () {
    const composition = fs.readFileSync(
      path.join(ROOT, "src/modules/synthesisClient/legacyComposition.ts"),
      "utf8",
    );
    const defaultClient = fs.readFileSync(
      path.join(ROOT, "src/modules/synthesisClient/defaultClient.ts"),
      "utf8",
    );
    const consumer = fs.readFileSync(
      path.join(ROOT, "src/modules/workflowParameterOptions.ts"),
      "utf8",
    );

    assert.include(composition, "getDefaultSynthesisService");
    assert.notMatch(composition, /\btype\s+SynthesisService\b/);
    assert.notInclude(defaultClient, "getDefaultSynthesisService");
    assert.notInclude(defaultClient, "../synthesis/service");
    assert.notInclude(consumer, "getDefaultSynthesisService");
    assert.notInclude(consumer, "./synthesis/service");
    assert.include(consumer, "getDefaultSynthesisClient");
  });
});
