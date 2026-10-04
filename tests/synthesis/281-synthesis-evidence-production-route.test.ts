import { assert } from "chai";
import { nativeFixtureMutations } from "../helpers/nativeFixtureMutations";
import {
  setZoteroLibraryPageQueryAdapterForTests,
  resetZoteroLibraryPageQueryAdapterForTests,
  setZoteroLibrarySourcePageQueryAdapterForTests,
  resetZoteroLibrarySourcePageQueryAdapterForTests,
} from "../../src/modules/zoteroHost/zoteroLibraryPageQuery";
import {
  createMockZoteroLibraryPageQueryAdapter,
  createMockZoteroLibrarySourcePageQueryAdapter,
} from "../helpers/zoteroLibraryPageQueryAdapter";
import { createZoteroSynthesisHostReadPort } from "../../src/modules/synthesis/libraryAdapter";
import { managedArtifactContent } from "../../src/modules/zoteroHost/zoteroManagedNotes";
import { mkTempDir, writeUtf8 } from "../zotero/workflow-test-utils";
import { joinPath } from "../../src/utils/path";
import { startSynthesisProductionRouteHarness } from "../helpers/synthesisProductionRouteHarness";
import { executeHostBridgeCapability } from "../../src/modules/hostBridgeCapabilityRegistry";
import { handleZoteroMcpJsonRpc } from "../../src/modules/hostBridge/mcp/zoteroMcpProtocol";
import { withHostBridgeCliHarness } from "../helpers/hostBridgeCliHarness";

describe("Synthesis evidence production route", function () {
  this.timeout(120_000);

  beforeEach(function () {
    setZoteroLibraryPageQueryAdapterForTests(
      createMockZoteroLibraryPageQueryAdapter(),
    );
    setZoteroLibrarySourcePageQueryAdapterForTests(
      createMockZoteroLibrarySourcePageQueryAdapter(),
    );
  });
  afterEach(function () {
    resetZoteroLibraryPageQueryAdapterForTests();
    resetZoteroLibrarySourcePageQueryAdapterForTests();
  });

  it("reads verified metadata through the typed client, real Rust runtime and Broker owner", async function () {
    const item = await nativeFixtureMutations.item.create({
      itemType: "journalArticle",
      fields: {
        title: "😀 verified retrieval evidence",
        abstractNote: "A bounded evidence passage.",
      },
    });
    const host = createZoteroSynthesisHostReadPort({ libraryId: 1 });
    const runtime = await startSynthesisProductionRouteHarness({
      id: "evidence-source-owner",
      hostFixture: {
        async handle({ capability, payload }) {
          if (capability === "library.evidence.sources")
            return host.evidence.listSources(payload as never);
          if (capability === "library.evidence.read")
            return host.evidence.readSource(payload as never);
          if (capability === "webdav.describe") return { configured: false };
          return { items: [], missingPaperRefs: [] };
        },
      },
    });
    try {
      const result = await runtime.client.searchEvidence({
        query: "retrieval evidence",
        libraryIds: [1],
        itemRefs: [{ libraryId: 1, key: item.key }],
        sourceKinds: ["metadata"],
      });
      assert.equal(result.status, "completed");
      assert.equal(result.method, "lexical");
      assert.equal(result.results[0].content, "😀 verified retrieval evidence");
      assert.deepEqual(result.results[0].itemRef, {
        libraryId: 1,
        key: item.key,
      });
      assert.deepEqual(result.results[0].location.range, { start: 0, end: 30 });
      assert.notProperty(result.results[0], "path");
      assert.equal(result.coverage.kind, "library");
      assert.isNull(result.nextCursor);
      const bridgeContext = {
        connectionMode: "local" as const,
        getStatus: () => ({}) as never,
        resolveSynthesisClient: () => runtime.client,
      };
      const request = {
        query: "retrieval evidence",
        libraryIds: [1],
        itemRefs: [{ libraryId: 1, key: item.key }],
        sourceKinds: ["metadata"],
      };
      const bridge = await executeHostBridgeCapability(
        "synthesis.search_evidence",
        request,
        bridgeContext,
      );
      assert.deepEqual(bridge, result);
      const mcp = (await handleZoteroMcpJsonRpc(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "synthesis.search_evidence", arguments: request },
        },
        bridgeContext,
      )) as any;
      assert.notProperty(mcp, "error");
      assert.deepEqual(mcp.result.structuredContent.data, result);

      await withHostBridgeCliHarness(
        {
          "synthesis evidence search": async ({ input }) =>
            (await executeHostBridgeCapability(
              "synthesis.search_evidence",
              input,
              bridgeContext,
            )) as Record<string, unknown>,
        },
        async (cli) => {
          const output = await cli.runCli([
            "--endpoint",
            cli.endpoint,
            "synthesis",
            "evidence",
            "search",
            "--query",
            JSON.stringify(request),
          ]);
          assert.equal(output.exitCode, 0, output.stderr);
          assert.deepInclude(output.output, { ok: true });
          assert.deepEqual(
            (output.output.data as { data: unknown }).data,
            result,
          );
          assert.deepInclude(cli.requests[0], {
            command: "synthesis evidence search",
            capability: "synthesis.search_evidence",
            input: request,
          });
          assert.match(
            String(cli.requests[0].headers.authorization),
            /^Bearer /,
          );
          assert.notInclude(output.stdout, "/home/");
        },
      );
    } finally {
      await runtime.stop();
    }
  });

  it("searches a canonical JSON analysis leaf through its pointer and raw range", async function () {
    const item = await nativeFixtureMutations.item.create({
      itemType: "journalArticle",
      fields: { title: "JSON analysis source" },
    });
    const summary = 'bounded needle evidence with "quoted" text';
    const analysis = {
      schema: "citation_analysis_artifact.v1",
      meta: {
        language: "en",
        scope: { section_title: null, line_start: null, line_end: null },
        scope_source: null,
        scope_decision: {
          selection_reason: null,
          covered_sections: [],
          fallback_from: null,
          fallback_reason: null,
        },
        mapping_reliability: "normal",
        reference_extraction: { status: "completed" },
      },
      summary,
      timeline: {
        early: { summary: "", sourceReferenceIds: [] },
        mid: { summary: "", sourceReferenceIds: [] },
        recent: { summary: "", sourceReferenceIds: [] },
      },
      items: [],
      unresolved: [],
    };
    await nativeFixtureMutations.note.create({
      parent: item,
      content: managedArtifactContent(
        "citation-analysis",
        "Citation analysis",
        analysis,
      ).content,
    });
    const tempDir = await mkTempDir("synthesis-evidence-route");
    const markdownPath = joinPath(tempDir, "evidence.md");
    await writeUtf8(
      markdownPath,
      "# Fulltext\n\nbounded needle evidence in Markdown.",
    );
    await nativeFixtureMutations.attachment.createFromPath({
      parent: item,
      path: markdownPath,
      title: "evidence.md",
      mimeType: "text/markdown",
    });
    const host = createZoteroSynthesisHostReadPort({ libraryId: 1 });
    const runtime = await startSynthesisProductionRouteHarness({
      id: "evidence-analysis-owner",
      hostFixture: {
        async handle({ capability, payload }) {
          if (capability === "library.evidence.sources")
            return host.evidence.listSources(payload as never);
          if (capability === "library.evidence.read")
            return host.evidence.readSource(payload as never);
          if (capability === "webdav.describe") return { configured: false };
          return { items: [], missingPaperRefs: [] };
        },
      },
    });
    try {
      let invalidRequest: unknown;
      try {
        await runtime.call("client.searchEvidence", {
          args: [{ query: "  " }],
        });
      } catch (error) {
        invalidRequest = error;
      }
      assert.equal(
        (invalidRequest as { code?: string } | undefined)?.code,
        "invalid_request",
      );

      const result = await runtime.client.searchEvidence({
        query: "bounded needle evidence",
        libraryIds: [1],
        itemRefs: [{ libraryId: 1, key: item.key }],
        sourceKinds: ["analysis"],
      });
      assert.equal(result.status, "completed");
      assert.equal(result.results.length, 1);
      assert.equal(result.results[0].format, "text");
      assert.equal(result.results[0].source.kind, "analysis");
      assert.equal(result.results[0].location.unit, "analysis_field");
      assert.equal(result.results[0].location.field, "/summary");
      assert.equal(result.results[0].content, JSON.stringify(summary));
      assert.equal(
        result.results[0].location.range.end -
          result.results[0].location.range.start,
        JSON.stringify(summary).length,
      );
      assert.notProperty(result.results[0], "path");
      assert.notInclude(JSON.stringify(result), markdownPath);

      const fulltext = await runtime.client.searchEvidence({
        query: "bounded needle evidence",
        libraryIds: [1],
        itemRefs: [{ libraryId: 1, key: item.key }],
        sourceKinds: ["fulltext"],
      });
      assert.equal(fulltext.results[0].source.kind, "fulltext");
      assert.equal(fulltext.results[0].format, "markdown");
      assert.include(fulltext.results[0].content, "bounded needle evidence");
      assert.notInclude(JSON.stringify(fulltext), markdownPath);
      assert.notProperty(fulltext.results[0].source, "path");
    } finally {
      await runtime.stop();
    }
  });

  it("reports unavailable and stale Broker reads as bounded issues without local paths", async function () {
    const item = await nativeFixtureMutations.item.create({
      itemType: "journalArticle",
      fields: { title: "stale evidence source" },
    });
    const host = createZoteroSynthesisHostReadPort({ libraryId: 1 });
    let readFault: "unavailable" | "stale" | "none" = "unavailable";
    let locationReadCount = 0;
    const runtime = await startSynthesisProductionRouteHarness({
      id: "evidence-source-failures",
      hostFixture: {
        async handle({ capability, payload }) {
          if (capability === "library.evidence.sources")
            return host.evidence.listSources(payload as never);
          if (capability === "library.evidence.read") {
            const result = await host.evidence.readSource(payload as never);
            if (payload.location) {
              locationReadCount += 1;
              if (readFault === "stale") return { outcome: "source_changed" };
            } else if (
              readFault === "unavailable" &&
              result.outcome === "available"
            ) {
              return { outcome: "source_unavailable" };
            }
            return result;
          }
          if (capability === "webdav.describe") return { configured: false };
          return { items: [], missingPaperRefs: [] };
        },
      },
    });
    try {
      const request = {
        query: "stale evidence",
        libraryIds: [1],
        itemRefs: [{ libraryId: 1, key: item.key }],
        sourceKinds: ["metadata"],
      };
      const unavailable = await runtime.client.searchEvidence(request);
      assert.deepEqual(unavailable.results, []);
      assert.isAtMost(unavailable.issues.length, 8);
      assert.isTrue(
        unavailable.issues.some((issue) => issue.code === "source_unavailable"),
      );
      assert.isTrue(
        unavailable.issues.every(
          (issue) => issue.affectedCount > 0 && issue.affectedCount <= 256,
        ),
      );
      assert.notInclude(JSON.stringify(unavailable), "/home/");

      readFault = "stale";
      const stale = await runtime.client.searchEvidence(request);
      assert.deepEqual(stale.results, []);
      assert.isAbove(locationReadCount, 0);
      assert.isTrue(
        stale.issues.some((issue) => issue.code === "source_changed"),
      );
      assert.isTrue(
        stale.issues.every(
          (issue) => issue.affectedCount > 0 && issue.affectedCount <= 256,
        ),
      );
      assert.notInclude(JSON.stringify(stale), "/home/");

      readFault = "none";
      const noMatch = await runtime.client.searchEvidence({
        ...request,
        query: "query with no matching terms",
      });
      assert.deepEqual(noMatch.results, []);
      assert.deepEqual(noMatch.issues, []);
      assert.equal(noMatch.status, "completed");
      assert.notInclude(JSON.stringify(noMatch), "/home/");
    } finally {
      await runtime.stop();
    }
  });
});
