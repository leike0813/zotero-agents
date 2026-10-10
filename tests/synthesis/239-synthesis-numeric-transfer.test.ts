import { assert } from "chai";
import { rejects } from "node:assert/strict";
import {
  buildSynthesisCitationGraphBuildTransferManifest,
  buildSynthesisCitationGraphBuildTransferPage,
  rebuildSynthesisCitationGraphBuildTransferPage,
} from "../../packages/synthesis-engine/src/citationGraphBuildTransfer";
import { startSynthesisProductionRouteHarness } from "../helpers/synthesisProductionRouteHarness";

describe("Synthesis cross-language numeric transfer", function () {
  this.timeout(30_000);

  it("admits ECMAScript numeric page hashes through the real Rust transfer", async function () {
    const harness = await startSynthesisProductionRouteHarness({
      id: "numeric-transfer",
    });
    const weights = [1, 0.000001, 1e-7, 1e20, 1e21, 333333333.3333333];
    const pages = [
      buildSynthesisCitationGraphBuildTransferPage("library_nodes", 0, [
        { nodeId: "paper:source", title: "Source", authors: [], aliases: [] },
        { nodeId: "paper:target", title: "Target", authors: [], aliases: [] },
      ]),
      buildSynthesisCitationGraphBuildTransferPage(
        "references",
        0,
        weights.map((weight, index) => ({
          referenceId: `reference:${index}`,
          edgeId: `edge:${index}`,
          sourceId: "paper:source",
          targetId: "paper:target",
          targetKind: "library_paper",
          targetAuthors: [],
          targetAliases: [],
          roles: [],
          weight,
        })),
      ),
    ];
    const manifest = buildSynthesisCitationGraphBuildTransferManifest({
      direction: "input",
      header: {
        contractVersion: "synthesis-citation-graph-build.v1",
        scope: { kind: "full", sourceIds: [] },
        rolePriority: [],
      },
      pages: pages.map((page) => page.descriptor),
    });
    try {
      const call = (payload: unknown) =>
        harness.call(
          "compute.citation_graph_build_transfer",
          payload,
        ) as Promise<any>;
      const { sessionId } = await call({
        action: "begin",
        idempotencyKey: "numeric",
        manifest,
      });
      const tampered = structuredClone(pages[1]);
      (tampered.rows[0] as { weight: number }).weight = 2;
      await rejects(
        call({ action: "put_input_page", sessionId, page: tampered }),
        { code: "transfer_conflict" },
      );
      for (const page of pages)
        await call({ action: "put_input_page", sessionId, page });
      await call({ action: "seal_input", sessionId });
      await call({ action: "execute", sessionId });
      let status;
      const deadline = Date.now() + 10_000;
      do {
        status = await call({ action: "status", sessionId });
        if (
          ["completed", "failed", "canceled"].includes(status.state) ||
          status.execution?.lastFailure
        )
          break;
        await new Promise((resolve) => setTimeout(resolve, 20));
      } while (Date.now() < deadline);
      assert.equal(
        status.state,
        "completed",
        JSON.stringify(status) + harness.stderr(),
      );
      const output = await call({ action: "get_output_manifest", sessionId });
      const resolved: Array<{ weight: number }> = [];
      for (const descriptor of output.pages) {
        const page = rebuildSynthesisCitationGraphBuildTransferPage(
          await call({
            action: "get_output_page",
            sessionId,
            kind: descriptor.kind,
            pageIndex: descriptor.pageIndex,
          }),
        );
        if (descriptor.kind === "resolved_edges")
          resolved.push(...(page.rows as Array<{ weight: number }>));
      }
      assert.sameMembers(
        resolved.map((row) => row.weight),
        weights,
      );
    } finally {
      await harness.stop();
    }
  });
});
