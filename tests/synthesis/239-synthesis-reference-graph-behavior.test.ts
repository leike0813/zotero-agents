import { assert } from "chai";
import { createHash } from "node:crypto";
import { createDefaultSynthesisUiState } from "../../src/modules/synthesis/uiModel";
import { toSynthesisWorkbenchReadState } from "../../src/modules/synthesisClient/workbenchUiAdapter";
import {
  startSynthesisProductionRouteHarness,
  waitForSynthesisProductionRouteReceipt,
  waitForSynthesisProductionRouteEvidence,
  type SynthesisProductionRouteHarness,
} from "../helpers/synthesisProductionRouteHarness";

type Paper = {
  paperRef: string;
  itemKey: string;
  title: string;
  refs: Array<{ id: string; title: string }>;
};

const AUTHORS = ["Alpha", "Beta", "Gamma"];
const YEAR = "2020";

// Two library papers that cite each other through near-duplicate bibliography
// entries. Each citation fuzzy-matches the *other* paper (suggested_fuzzy_title
// with three shared authors and a compatible year), so the matcher keeps both as
// open zotero_binding proposals. Accepting a proposal binds that Source
// Reference to the target library item, which is exactly the citation edge the
// Citation Graph is built from. Titles differ by a single character so the
// fuzzy band (0.82 <= similarity < 0.97) is hit deterministically instead of an
// automatic strong-title or identifier binding.
const PAPERS: Paper[] = [
  {
    paperRef: "1:AAA",
    itemKey: "AAA",
    title: "alpha study of widgets",
    refs: [{ id: "ref-cites-bbb", title: "beta study of gadge" }],
  },
  {
    paperRef: "1:BBB",
    itemKey: "BBB",
    title: "beta study of gadgets",
    refs: [{ id: "ref-cites-aaa", title: "alpha study of widgetz" }],
  },
];

function artifactEntry(paper: Paper) {
  return [
    {
      paperRef: paper.paperRef,
      artifactType: "digest",
      payloadType: "digest-markdown",
      status: "missing",
      diagnostics: [],
    },
    {
      paperRef: paper.paperRef,
      artifactType: "references",
      payloadType: "references-json",
      status: "available",
      locator: `fixture:references:${paper.itemKey}`,
      payloadHash: `sha256:ref-${paper.itemKey}`,
      estimatedSize: 128,
      diagnostics: [],
    },
    {
      paperRef: paper.paperRef,
      artifactType: "citation_analysis",
      payloadType: "citation-analysis-json",
      status: "missing",
      diagnostics: [],
    },
  ];
}

function libraryItem(paper: Paper) {
  return {
    paperRef: paper.paperRef,
    libraryId: 1,
    itemKey: paper.itemKey,
    itemType: "journalArticle",
    title: paper.title,
    year: YEAR,
    creators: AUTHORS,
    metadataHash: `sha256:${createHash("sha256").update(paper.itemKey).digest("hex")}`,
  };
}

function startFixture(): Promise<SynthesisProductionRouteHarness> {
  return startSynthesisProductionRouteHarness({
    id: "reference-graph-behavior",
    hostFixture: {
      handle({ capability, payload }) {
        const p = payload as Record<string, any>;
        if (capability === "webdav.describe") return { configured: false };
        if (capability === "library.items.list_page") {
          return {
            items: PAPERS.map(libraryItem),
            cursor: p.cursor ?? "",
            nextCursor: "",
            hasMore: false,
            returned: PAPERS.length,
            limit: p.limit ?? 100,
            snapshotRevision: "reference-graph-rev-1",
          };
        }
        if (capability === "library.items.get_by_ref") {
          const refs: string[] = Array.isArray(p.paperRefs) ? p.paperRefs : [];
          return {
            items: PAPERS.filter((paper) => refs.includes(paper.paperRef)).map(
              libraryItem,
            ),
            missingPaperRefs: refs.filter(
              (ref) => !PAPERS.some((paper) => paper.paperRef === ref),
            ),
          };
        }
        if (capability === "library.artifacts.scan_page") {
          return {
            artifacts: PAPERS.flatMap(artifactEntry),
            cursor: p.cursor ?? "",
            nextCursor: "",
            hasMore: false,
            returned: PAPERS.length,
            limit: p.limit ?? 100,
            snapshotRevision: "reference-graph-rev-1",
          };
        }
        if (capability === "library.artifacts.readiness") {
          const refs: string[] = Array.isArray(p.paperRefs)
            ? p.paperRefs
            : PAPERS.map((x) => x.paperRef);
          return {
            artifacts: refs.map((paperRef) => ({
              paperRef,
              artifactType: "references",
              payloadType: "references-json",
              status: "available",
              diagnostics: [],
            })),
          };
        }
        if (capability === "library.artifacts.read") {
          const expected = String(p.expectedHash ?? "");
          const key = expected.replace("sha256:ref-", "");
          const paper = PAPERS.find((entry) => entry.itemKey === key);
          if (!paper) return { status: "missing", diagnostics: [] };
          return {
            status: "available",
            payloadHash: expected,
            content: {
              kind: "json",
              value: {
                schema: "source_reference_artifact.v1",
                references: paper.refs.map((ref) => ({
                  sourceReferenceId: ref.id,
                  extraction: { raw: ref.title, confidence: 1 },
                  bibliography: {
                    title: ref.title,
                    authors: AUTHORS,
                    year: 2020,
                    itemType: "journalArticle",
                  },
                  matching: {},
                })),
              },
            },
            diagnostics: [],
          };
        }
        return { status: "unavailable", diagnostics: [] };
      },
    },
  });
}

async function waitForOperation(
  harness: SynthesisProductionRouteHarness,
  operationId: string,
) {
  const result = await waitForSynthesisProductionRouteReceipt({
    operationId,
    getOperation: (id) =>
      harness.client.maintenance.getOperation({ operation_id: id }),
  });
  const terminal = await waitForSynthesisProductionRouteEvidence({
    read: () => harness.observations(),
    offset: 0,
    matches: (event) =>
      event.phase === "maintenance-terminal" &&
      event.identities?.operation === operationId,
  });
  assert.lengthOf(
    terminal,
    1,
    "terminal observation must be flushed before measuring later work",
  );
  return result;
}

async function readMatchProposals(harness: SynthesisProductionRouteHarness) {
  const state = toSynthesisWorkbenchReadState(createDefaultSynthesisUiState());
  state.reviews.status = "all";
  const surface = await harness.client.workbench.readSurface({
    surface: "review",
    state,
  });
  if (!("registry" in surface)) throw new Error("expected Reference review");
  return surface.registry.matchProposals;
}

async function proposalForItem(
  harness: SynthesisProductionRouteHarness,
  itemKey: string,
) {
  const proposal = (await readMatchProposals(harness)).find(
    (row) => row.target_item_key === itemKey,
  );
  assert.isDefined(proposal, `expected a match proposal targeting ${itemKey}`);
  return proposal!;
}

// A Source Reference is owned by the paper whose bibliography extracted it;
// accepting a proposal binds that citation, which clears the *source* paper's
// unbound reference count (the target item is the cited work, not the owner).
async function readReferenceOwners(harness: SynthesisProductionRouteHarness) {
  const index = await harness.client.references.getSidecarIndex({
    includeReferences: true,
    limit: 10,
  });
  const owners = new Map<string, string>();
  for (const row of index.rows) {
    for (const reference of row.references ?? []) {
      owners.set(reference.reference_instance_id, row.item_key);
    }
  }
  return owners;
}

async function proposalForSourcePaper(
  harness: SynthesisProductionRouteHarness,
  itemKey: string,
) {
  const owners = await readReferenceOwners(harness);
  const proposal = (await readMatchProposals(harness)).find((row) =>
    row.source_raw_reference_ids.some((id) => owners.get(id) === itemKey),
  );
  assert.isDefined(
    proposal,
    `expected a match proposal for the citation owned by ${itemKey}`,
  );
  return proposal!;
}

async function readUnboundCounts(harness: SynthesisProductionRouteHarness) {
  const index = await harness.client.references.getSidecarIndex({ limit: 10 });
  const counts: Record<string, number> = {};
  for (const row of index.rows) {
    counts[row.item_key] = row.unbound_reference_count;
  }
  return counts;
}

async function refreshAndMatch(harness: SynthesisProductionRouteHarness) {
  const refresh = await harness.client.references.refreshReferenceSidecarNow();
  const refreshDone = await waitForOperation(harness, refresh.operation_id);
  assert.equal(refreshDone.status, "completed", JSON.stringify(refreshDone));
  const matching =
    await harness.client.references.runAdvancedReferenceMatchingNow();
  const matchingDone = await waitForOperation(harness, matching.operation_id);
  assert.equal(matchingDone.status, "completed", JSON.stringify(matchingDone));
}

describe("Synthesis Reference decision and Citation Graph behavior", function () {
  this.timeout(120000);

  it("ranks external references across pages and tracks attention after decisions", async function () {
    const harness = await startFixture();
    try {
      await refreshAndMatch(harness);
      const proposals = await readMatchProposals(harness);
      const attention = () => harness.client.references.getAttentionQueue();
      const openIds = proposals.map((row) => row.proposal_id).sort();
      assert.deepEqual(
        (await attention()).items.map((row) => row.target).sort(),
        openIds,
      );

      const external = await harness.client.references.rankExternalReferences();
      assert.deepEqual(
        external.items.map((row) => ({
          title: row.title,
          degree: row.external_degree,
          shared: row.shared_source_count,
          sources: row.source_paper_refs,
        })),
        [
          {
            title: "alpha study of widgetz",
            degree: 1,
            shared: 1,
            sources: ["1:BBB"],
          },
          {
            title: "beta study of gadge",
            degree: 1,
            shared: 1,
            sources: ["1:AAA"],
          },
        ],
      );
      const first = await harness.client.references.rankExternalReferences({
        limit: 1,
      });
      assert.isTrue(first.hasMore);
      assert.isNotEmpty(first.nextCursor);
      const last = await harness.client.references.rankExternalReferences({
        limit: 1,
        cursor: first.nextCursor,
      });
      assert.deepEqual([...first.items, ...last.items], external.items);
      assert.isFalse(last.hasMore);
      assert.equal(last.nextCursor, "");

      const proposal = await proposalForItem(harness, "BBB");
      const peer = await proposalForItem(harness, "AAA");
      const decide = (action: "accept" | "reopen" | "reject") =>
        harness.client.references.applyReferenceMatchProposalAction({
          proposalId: proposal.proposal_id,
          action,
        });
      await decide("accept");
      assert.deepEqual(
        (await attention()).items.map((row) => row.target),
        [peer.proposal_id],
      );
      assert.deepEqual(
        (await harness.client.references.rankExternalReferences()).items.map(
          (row) => row.title,
        ),
        ["alpha study of widgetz"],
      );
      await decide("reopen");
      assert.deepEqual(
        (await attention()).items.map((row) => row.target).sort(),
        openIds,
      );
      await decide("reject");
      assert.deepEqual(
        (await attention()).items.map((row) => row.target),
        [peer.proposal_id],
      );
    } finally {
      await harness.stop();
    }
  });

  it("retargets an accepted binding and reads the new target through Workbench", async function () {
    const harness = await startFixture();
    try {
      await refreshAndMatch(harness);
      const proposal = await proposalForItem(harness, "BBB");
      const peer = await proposalForItem(harness, "AAA");
      await harness.client.references.applyReferenceMatchProposalAction({
        proposalId: proposal.proposal_id,
        action: "accept",
      });
      const bindingTarget = async () => {
        const state = toSynthesisWorkbenchReadState(
          createDefaultSynthesisUiState(),
        );
        state.registry.expandedSourceRefs = ["1:AAA"];
        const surface = await harness.client.workbench.readSurface({
          surface: "index",
          state,
        });
        const source = surface.registry.rows.find(
          (row) => row.paper_ref === "1:AAA",
        );
        assert.isDefined(source);
        assert.lengthOf(source!.references!, 1);
        return source!.references![0];
      };
      const before = await bindingTarget();
      assert.equal(before.target_binding, "library");
      assert.equal(before.target_paper_ref, "1:BBB");
      const retarget =
        await harness.client.references.applyReferenceMatchProposalActions({
          decisions: [
            {
              proposalId: proposal.proposal_id,
              action: "manual_target",
              target: { kind: "zotero_item", libraryId: 1, itemKey: "AAA" },
            },
            { proposalId: peer.proposal_id, action: "reject" },
          ],
        });
      assert.isTrue(retarget.ok);
      assert.equal(retarget.applied_count, 2);
      const after = await bindingTarget();
      assert.equal(after.reference_instance_id, before.reference_instance_id);
      assert.equal(after.target_binding, "library");
      assert.equal(after.target_paper_ref, "1:AAA");
      const reviewed = await readMatchProposals(harness);
      assert.equal(
        reviewed.find((row) => row.proposal_id === proposal.proposal_id)!
          .status,
        "superseded",
      );
      const accepted = reviewed.filter(
        (row) =>
          row.status === "accepted" &&
          row.source_canonical_reference_id ===
            proposal.source_canonical_reference_id,
      );
      assert.lengthOf(accepted, 1);
      assert.equal(accepted[0].target_library_id, 1);
      assert.equal(accepted[0].target_item_key, "AAA");
      assert.deepEqual(
        (await harness.client.references.getAttentionQueue()).items,
        [],
      );
    } finally {
      await harness.stop();
    }
  });

  it("revokes the accepted binding on reopen and reject and applies a mixed batch partially", async function () {
    const harness = await startFixture();
    try {
      await refreshAndMatch(harness);

      const openProposals = (await readMatchProposals(harness)).filter(
        (row) => row.status === "open",
      );
      assert.lengthOf(
        openProposals,
        2,
        "cross-citation fixture yields one open proposal per paper",
      );
      openProposals.forEach((row) => assert.equal(row.kind, "zotero_binding"));

      const baseline = await readUnboundCounts(harness);
      assert.deepEqual(
        baseline,
        { AAA: 1, BBB: 1 },
        "both citations start unbound",
      );

      // Accept: the proposal becomes accepted and the source paper's binding materializes.
      const aaaProposal = await proposalForSourcePaper(harness, "AAA");
      const accepted =
        await harness.client.references.applyReferenceMatchProposalAction({
          proposalId: aaaProposal.proposal_id,
          action: "accept",
        });
      assert.equal(accepted.status, "accepted", JSON.stringify(accepted));
      assert.deepEqual(
        await readUnboundCounts(harness),
        { AAA: 0, BBB: 1 },
        "accepting binds AAA's citation, so it is no longer unbound",
      );

      // Reopen the accepted proposal: the binding fact is revoked in the same decision.
      const reopenedProposal = await proposalForSourcePaper(harness, "AAA");
      const reopened =
        await harness.client.references.applyReferenceMatchProposalAction({
          proposalId: reopenedProposal.proposal_id,
          action: "reopen",
        });
      assert.equal(reopened.status, "open", JSON.stringify(reopened));
      assert.deepEqual(
        await readUnboundCounts(harness),
        { AAA: 1, BBB: 1 },
        "reopening an accepted proposal revokes the binding it produced",
      );

      // Accept again, then reject: reject of an accepted proposal also revokes.
      await harness.client.references.applyReferenceMatchProposalAction({
        proposalId: (await proposalForSourcePaper(harness, "AAA")).proposal_id,
        action: "accept",
      });
      assert.equal((await readUnboundCounts(harness)).AAA, 0);
      const rejected =
        await harness.client.references.applyReferenceMatchProposalAction({
          proposalId: (await proposalForSourcePaper(harness, "AAA"))
            .proposal_id,
          action: "reject",
        });
      assert.equal(rejected.status, "rejected", JSON.stringify(rejected));
      assert.deepEqual(
        await readUnboundCounts(harness),
        { AAA: 1, BBB: 1 },
        "rejecting an accepted proposal revokes the binding it produced",
      );

      // Mixed batch: one valid accept + one invalid (missing) + one valid reject.
      const aaaAgain = await proposalForSourcePaper(harness, "AAA");
      const bbbProposal = await proposalForSourcePaper(harness, "BBB");
      const batch =
        await harness.client.references.applyReferenceMatchProposalActions({
          decisions: [
            { proposalId: aaaAgain.proposal_id, action: "accept" },
            { proposalId: "proposal:missing", action: "accept" },
            { proposalId: bbbProposal.proposal_id, action: "reject" },
          ],
        });
      assert.equal(batch.applied_count, 2, JSON.stringify(batch));
      assert.equal(batch.failed_count, 1, JSON.stringify(batch));
      const failedResult = batch.results.find((row: any) => row.ok === false);
      assert.isDefined(failedResult, JSON.stringify(batch));
      assert.equal(
        failedResult.status,
        "missing",
        JSON.stringify(failedResult),
      );
      // The two valid decisions stay committed despite the invalid one.
      assert.deepEqual(
        await readUnboundCounts(harness),
        { AAA: 0, BBB: 1 },
        "valid batch decisions persist; only the rejected proposal stays unbound",
      );
      assert.equal(
        (await proposalForSourcePaper(harness, "AAA")).status,
        "accepted",
      );
      assert.equal(
        (await proposalForSourcePaper(harness, "BBB")).status,
        "rejected",
      );
    } finally {
      await harness.stop();
    }
  });

  it("rejects a stale graph basis without dispatch, builds a bounded graph, and blocks retry once ready", async function () {
    const harness = await startFixture();
    try {
      await refreshAndMatch(harness);
      for (const itemKey of ["AAA", "BBB"]) {
        const proposal = await proposalForItem(harness, itemKey);
        const accepted =
          await harness.client.references.applyReferenceMatchProposalAction({
            proposalId: proposal.proposal_id,
            action: "accept",
          });
        assert.equal(accepted.status, "accepted");
      }

      const workbench = await harness.client.workbench.readSurface({
        surface: "index",
        state: toSynthesisWorkbenchReadState(createDefaultSynthesisUiState()),
      });
      const referenceBasis = workbench.registry.cacheStatus.source_hash;
      assert.isNotEmpty(referenceBasis);

      const dispatchesSince = (offset: number) =>
        harness
          .observations()
          .slice(offset)
          .filter(
            (event) =>
              event.boundary === "child-worker" &&
              event.phase === "attempt" &&
              event.outcome === "started",
          );
      const validWorkerOffset = harness.observations().length;
      const validHostOffset = harness.recorder.hostCalls.length;
      const update = await harness.client.graph.startUpdate({
        scope: "library",
        expectedReferenceBasisHash: referenceBasis,
      });
      const updateDone = await waitForOperation(harness, update.operation_id);
      assert.equal(updateDone.status, "completed", JSON.stringify(updateDone));
      assert.isAbove(
        dispatchesSince(validWorkerOffset).length,
        0,
        "the positive control must observe real worker dispatch",
      );
      assert.isAbove(
        harness.recorder.hostCalls.length - validHostOffset,
        0,
        "the positive control must observe Host fact collection",
      );
      const overview = await harness.client.graph.getOverview({ limit: 50 });
      const beforeMetrics = await harness.client.graph.getMetrics();
      const staleWorkerOffset = harness.observations().length;
      const staleHostOffset = harness.recorder.hostCalls.length;
      const stale = await harness.client.graph.startUpdate({
        scope: "library",
        expectedReferenceBasisHash: `sha256:${"0".repeat(64)}`,
      });
      const staleDone = await waitForOperation(harness, stale.operation_id);
      assert.equal(staleDone.status, "failed");
      if (!staleDone.receipt || !("diagnostics" in staleDone.receipt)) {
        throw new Error("expected maintenance failure receipt");
      }
      assert.include(
        staleDone.receipt!.diagnostics!.map((entry) => entry.code),
        "reference_basis_mismatch",
      );
      assert.lengthOf(
        dispatchesSince(staleWorkerOffset),
        0,
        "stale basis must fail before dispatching any worker",
      );
      assert.lengthOf(
        harness.recorder.hostCalls.slice(staleHostOffset),
        0,
        "stale basis must fail before collecting Host facts",
      );
      assert.deepEqual(
        await harness.client.graph.getOverview({ limit: 50 }),
        overview,
      );
      assert.deepEqual(await harness.client.graph.getMetrics(), beforeMetrics);
      const nodes = overview.nodes.map((node) => node.node_id).sort();
      assert.deepEqual(
        nodes,
        ["1:AAA", "1:BBB"],
        "graph holds exactly the two library papers",
      );
      const edgePairs = overview.edges
        .map((edge) => `${edge.source}->${edge.target}`)
        .sort();
      assert.deepEqual(
        edgePairs,
        ["1:AAA->1:BBB", "1:BBB->1:AAA"],
        "accepted cross-citations materialize one edge per direction",
      );
      overview.edges.forEach((edge) => {
        assert.equal(edge.kind, "citation");
        assert.equal(edge.mention_count, 1);
      });

      // Rank: both papers sit in one shared component with symmetric, exact metrics.
      const rank = await harness.client.graph.rankLibraryPapers({ limit: 10 });
      assert.equal(rank.diagnostics.total_library_nodes, 2);
      assert.equal(rank.diagnostics.returned_count, 2);
      rank.items.forEach((item) => {
        assert.equal(item.component_size, 2);
        assert.equal(item.component_id, "component:001");
        assert.equal(item.internal_in_degree, 1);
        assert.equal(item.internal_out_degree, 1);
        assert.equal(item.internal_pagerank, 0.5);
        assert.isFalse(item.is_isolated);
      });
      // Rank honors the limit bound and reports a further page.
      const firstPage = await harness.client.graph.rankLibraryPapers({
        limit: 1,
      });
      assert.equal(firstPage.items.length, 1);
      assert.isTrue(firstPage.hasMore);
      assert.equal(firstPage.diagnostics.returned_count, 1);
      assert.isNotEmpty(firstPage.nextCursor);
      const secondPage = await harness.client.graph.rankLibraryPapers({
        limit: 1,
        cursor: firstPage.nextCursor,
      });
      assert.deepEqual(
        firstPage.items.map((item) => item.paper_ref),
        ["1:AAA"],
      );
      assert.deepEqual(
        secondPage.items.map((item) => item.paper_ref),
        ["1:BBB"],
      );
      assert.isFalse(secondPage.hasMore);
      assert.equal(secondPage.nextCursor, "");
      assert.equal(secondPage.graph_hash, firstPage.graph_hash);
      assert.equal(secondPage.metrics_hash, firstPage.metrics_hash);
      assert.deepEqual([...firstPage.items, ...secondPage.items], rank.items);

      const cluster = await harness.client.graph.queryCluster({
        basis: { expectedGraphHash: overview.graph_hash },
        filters: { search: "alpha study" },
      });
      assert.deepEqual(
        cluster.nodes.map((node) => node.node_id),
        ["1:AAA"],
      );
      assert.deepEqual(cluster.edges, []);
      assert.equal(cluster.graph_hash, overview.graph_hash);

      // Slice from AAA reaches the whole connected two-node neighborhood.
      const slice = await harness.client.graph.getSlice({
        paperRef: "1:AAA",
        depth: 1,
      });
      assert.deepEqual(slice.nodes.map((node) => node.node_id).sort(), [
        "1:AAA",
        "1:BBB",
      ]);
      assert.equal(
        slice.edges.length,
        2,
        "slice keeps the endpoint-closed edge set",
      );

      // Once the cache is ready with no failed attempt, retry is unavailable.
      const retry = await harness.client.graph.retryCitationGraphCacheRebuild();
      const retryDone = await waitForOperation(harness, retry.operation_id);
      assert.equal(retryDone.status, "failed");
      if (!retryDone.receipt || !("diagnostics" in retryDone.receipt)) {
        throw new Error("expected maintenance failure receipt");
      }
      assert.include(
        retryDone.receipt!.diagnostics!.map((entry) => entry.code),
        "citation_graph_retry_intent_missing",
      );
    } finally {
      await harness.stop();
    }
  });
});
