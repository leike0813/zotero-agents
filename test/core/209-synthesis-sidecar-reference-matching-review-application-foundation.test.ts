import { assert } from "chai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  SYNTHESIS_REFERENCE_MATCHING_REVIEW_APPLICATION_LIMITS,
  rebuildSynthesisReferenceMatchingApplyRequest,
  rebuildSynthesisReferenceMatchingInspectResult,
  rebuildSynthesisReferenceMatchingPrepareRequest,
  rebuildSynthesisReferenceMatchingPrepareResult,
  rebuildSynthesisReferenceMatchProposalPageRequest,
  rebuildSynthesisReferenceMatchReviewRequest,
} from "../../packages/synthesis-contracts/src/referenceMatchingReviewApplication";
import {
  createSynthesisReferenceMatchingReviewApplication,
  type SynthesisReferenceMatchingReviewRepository,
} from "../../packages/synthesis-application/src/referenceMatchingReviewApplication";
import {
  SYNTHESIS_REFERENCE_MATCHER_AUTHOR_MAX,
  SYNTHESIS_REFERENCE_MATCHER_IDENTIFIER_MAX,
  SYNTHESIS_REFERENCE_MATCHER_LIBRARY_PAPER_MAX,
  SYNTHESIS_REFERENCE_MATCHER_STRING_MAX,
  createInProcessSynthesisReferenceMatcherEngine,
} from "../../packages/synthesis-engine/src/referenceMatcher";
import {
  ensureSynthesisReferenceMatchingReviewRepositorySchema,
  listSynthesisReferenceMatchProposals,
  upsertSynthesisReferenceMatchProposal,
} from "../../packages/synthesis-repository/src/referenceMatchingReview";
import { openSynthesisSidecarIsolatedRepository } from "../../apps/synthesis-service/src/isolatedRepository";
import { openSynthesisNodeSqliteAdapter } from "../../apps/synthesis-service/src/repositoryNodeSqlite";
import { createSynthesisSidecarReferenceMatchingReviewApplication } from "../../apps/synthesis-service/src/referenceMatchingReviewApplicationNode";

const PROFILE_ID = "1".repeat(64);
const DATA_ROOT_ID = "2".repeat(64);
const REFERENCE_HASH = `sha256:${"a".repeat(64)}`;

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "zs-reference-matching-"));
}

function emptyDelta() {
  return {
    changedCanonicalIds: [],
    changedBindingCanonicalIds: [],
    changedRedirectCanonicalIds: [],
  };
}

function fakeRepository(): SynthesisReferenceMatchingReviewRepository {
  const state = {
    referenceHash: REFERENCE_HASH,
    matchingHash: null,
    proposalCount: 0,
    openProposalCount: 0,
    matchingReady: false,
    graphReady: true,
    relatedItemsReady: true,
  };
  return {
    initializeReferenceMatchingReviewApplication() {},
    inspectReferenceMatchingReviewApplication: () => state,
    listReferenceMatchProposalPage: () => ({
      proposals: [],
      nextCursor: null,
    }),
    captureReferenceMatchingBasis: () => ({
      referenceHash: REFERENCE_HASH,
      basisHash: `sha256:${"b".repeat(64)}`,
      bindingReferences: [],
      dedupeCanonicals: [],
    }),
    promoteReferenceMatching(args) {
      return {
        status: "promoted",
        referenceHash: args.expectedReferenceHash,
        matchingHash: `sha256:${"c".repeat(64)}`,
        warnings: [],
        graphDelta: emptyDelta(),
      };
    },
    applyReferenceMatchReviewDecision({ decision }) {
      return decision.proposalId === "missing"
        ? {
            ok: false,
            status: "missing",
            proposalId: decision.proposalId,
            diagnostics: [],
            graphDelta: emptyDelta(),
          }
        : {
            ok: true,
            status: decision.action === "delete" ? "superseded" : "accepted",
            proposalId: decision.proposalId,
            diagnostics: [],
            graphDelta: {
              changedCanonicalIds: [decision.proposalId],
              changedBindingCanonicalIds: [decision.proposalId],
              changedRedirectCanonicalIds: [],
            },
          };
    },
  };
}

describe("Synthesis sidecar Reference Matching/Review application foundation", function () {
  const roots: string[] = [];

  afterEach(function () {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("strictly rebuilds bounded matching and review requests", function () {
    assert.deepInclude(SYNTHESIS_REFERENCE_MATCHING_REVIEW_APPLICATION_LIMITS, {
      papers: SYNTHESIS_REFERENCE_MATCHER_LIBRARY_PAPER_MAX,
      authors: SYNTHESIS_REFERENCE_MATCHER_AUTHOR_MAX,
      identifiers: SYNTHESIS_REFERENCE_MATCHER_IDENTIFIER_MAX,
      string: SYNTHESIS_REFERENCE_MATCHER_STRING_MAX,
    });
    assert.deepEqual(
      rebuildSynthesisReferenceMatchingPrepareRequest({
        expectedReferenceHash: REFERENCE_HASH,
        papers: [{ paperRef: "1:B", itemKey: "B", title: "Target Paper" }],
      }).papers[0],
      { paperRef: "1:B", itemKey: "B", title: "Target Paper" },
    );
    assert.deepEqual(rebuildSynthesisReferenceMatchProposalPageRequest({}), {
      cursor: "",
      limit: 100,
    });
    assert.deepEqual(
      rebuildSynthesisReferenceMatchingApplyRequest({
        preparationId: "prep:1",
        hostBasisHash: `sha256:${"d".repeat(64)}`,
      }).preparationId,
      "prep:1",
    );
    assert.throws(() =>
      rebuildSynthesisReferenceMatchingPrepareRequest({
        expectedReferenceHash: REFERENCE_HASH,
        papers: [],
        unknown: true,
      }),
    );
    assert.throws(() =>
      rebuildSynthesisReferenceMatchProposalPageRequest({ limit: 101 }),
    );
    assert.throws(() =>
      rebuildSynthesisReferenceMatchReviewRequest({
        decisions: [
          { proposalId: "p:1", action: "accept" },
          { proposalId: "p:1", action: "reject" },
        ],
      }),
    );
    assert.throws(() =>
      rebuildSynthesisReferenceMatchReviewRequest({
        decisions: [
          {
            proposalId: "p:1",
            action: "manual_target",
            target: { kind: "zotero_item", libraryId: 0, itemKey: "A" },
          },
        ],
      }),
    );
    assert.deepInclude(
      rebuildSynthesisReferenceMatchingInspectResult({
        referenceHash: REFERENCE_HASH,
        matchingHash: null,
        proposalCount: 1,
        openProposalCount: 1,
        matchingReady: false,
        graphReady: true,
        relatedItemsReady: true,
      }),
      { proposalCount: 1, matchingReady: false },
    );
    assert.throws(() =>
      rebuildSynthesisReferenceMatchingPrepareResult({
        status: "prepared",
        referenceHash: REFERENCE_HASH,
        matchingHash: null,
        warnings: [],
        graphDelta: emptyDelta(),
        preparationId: "prep:strict",
        hostBasisHash: `sha256:${"0".repeat(64)}`,
        bindingMatchCount: 0,
        dedupeActionCount: 0,
        unknown: true,
      }),
    );
  });

  it("prepares both matcher passes, applies once, batches review, and stops", async function () {
    let sequence = 0;
    const application = createSynthesisReferenceMatchingReviewApplication({
      repository: fakeRepository(),
      matcher: createInProcessSynthesisReferenceMatcherEngine(),
      createPreparationId: () => `prep:${++sequence}`,
    });
    const prepared = await application.prepareMatching({
      expectedReferenceHash: REFERENCE_HASH,
      papers: [{ paperRef: "1:B", itemKey: "B", title: "Target Paper" }],
    });
    assert.equal(prepared.status, "prepared");
    if (prepared.status !== "prepared") return;
    assert.equal(
      (
        await application.prepareMatching({
          expectedReferenceHash: REFERENCE_HASH,
          papers: [],
        })
      ).status,
      "reference_matching_busy",
    );
    assert.equal(
      (
        await application.applyMatching({
          preparationId: prepared.preparationId,
          hostBasisHash: prepared.hostBasisHash,
        })
      ).status,
      "promoted",
    );
    assert.equal(
      (
        await application.applyMatching({
          preparationId: prepared.preparationId,
          hostBasisHash: prepared.hostBasisHash,
        })
      ).status,
      "preparation_missing",
    );
    const reviewed = await application.applyReviewDecisions({
      decisions: [
        { proposalId: "accepted", action: "accept" },
        { proposalId: "missing", action: "reject" },
      ],
    });
    assert.property(reviewed, "appliedCount", 1);
    assert.property(reviewed, "failedCount", 1);
    application.stopAdmission();
    assert.equal(
      (
        await application.prepareMatching({
          expectedReferenceHash: REFERENCE_HASH,
          papers: [],
        })
      ).status,
      "stopping",
    );
    await application.shutdown();
  });

  it("preserves last-good state on stale bases, discard, and engine failure", async function () {
    const stale = createSynthesisReferenceMatchingReviewApplication({
      repository: {
        ...fakeRepository(),
        captureReferenceMatchingBasis: () => ({
          referenceHash: `sha256:${"0".repeat(64)}`,
          basisHash: `sha256:${"b".repeat(64)}`,
          bindingReferences: [],
          dedupeCanonicals: [],
        }),
      },
      matcher: createInProcessSynthesisReferenceMatcherEngine(),
    });
    assert.equal(
      (
        await stale.prepareMatching({
          expectedReferenceHash: REFERENCE_HASH,
          papers: [],
        })
      ).status,
      "basis_mismatch",
    );
    await stale.shutdown();

    const discarded = createSynthesisReferenceMatchingReviewApplication({
      repository: fakeRepository(),
      matcher: createInProcessSynthesisReferenceMatcherEngine(),
      createPreparationId: () => "prep:discard",
    });
    const preparation = await discarded.prepareMatching({
      expectedReferenceHash: REFERENCE_HASH,
      papers: [],
    });
    assert.equal(preparation.status, "prepared");
    assert.equal(
      discarded.discardPreparation({ preparationId: "prep:discard" }).status,
      "unchanged",
    );
    assert.equal(
      (
        await discarded.applyMatching({
          preparationId: "prep:discard",
          hostBasisHash: `sha256:${"0".repeat(64)}`,
        })
      ).status,
      "preparation_missing",
    );
    await discarded.shutdown();

    const failed = createSynthesisReferenceMatchingReviewApplication({
      repository: fakeRepository(),
      matcher: {
        matchBindings: async () => {
          throw new Error("engine failed");
        },
        dedupeCanonicals: async () => {
          throw new Error("engine failed");
        },
      },
    });
    assert.equal(
      (
        await failed.prepareMatching({
          expectedReferenceHash: REFERENCE_HASH,
          papers: [],
        })
      ).status,
      "engine_failed",
    );
    assert.isFalse(failed.inspect().matchingReady);
    await failed.shutdown();
  });

  it("persists proposal rows and rejected-basis decisions", function () {
    const root = tempRoot();
    roots.push(root);
    const databasePath = path.join(root, "repository.db");
    const connection = openSynthesisNodeSqliteAdapter(databasePath);
    connection.adapter.run(
      "CREATE TABLE synt_schema_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
    );
    ensureSynthesisReferenceMatchingReviewRepositorySchema(connection.adapter);
    upsertSynthesisReferenceMatchProposal(
      connection.adapter,
      {
        proposalId: "proposal:1",
        kind: "zotero_binding",
        status: "rejected",
        sourceCanonicalReferenceId: "canonical:1",
        basisHash: `sha256:${"e".repeat(64)}`,
        sourceHash: `sha256:${"f".repeat(64)}`,
      },
      "2026-07-17T16:00:00.000Z",
    );
    assert.deepInclude(
      listSynthesisReferenceMatchProposals(connection.adapter)[0],
      {
        proposalId: "proposal:1",
        status: "rejected",
      },
    );
    connection.close();

    const reopened = openSynthesisNodeSqliteAdapter(databasePath);
    assert.equal(
      listSynthesisReferenceMatchProposals(reopened.adapter)[0]?.status,
      "rejected",
    );
    reopened.close();
  });

  it("applies the complete review lifecycle and revokes accepted facts", async function () {
    const root = tempRoot();
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
      now: () => "2026-07-17T16:15:00.000Z",
    });
    const connection = openSynthesisNodeSqliteAdapter(
      repository.paths.databasePath,
    );
    for (const canonicalReferenceId of [
      "canonical:A",
      "canonical:B",
      "canonical:C",
    ]) {
      connection.adapter.run(
        `INSERT INTO synt_reference_canonical (
          canonical_reference_id, title, normalized_title, year, authors_json,
          identifiers_json, metadata_hash, status, created_at, updated_at
        ) VALUES (
          @id, @id, @id, '2024', '[]', '[]', @hash, 'active', @now, @now
        )`,
        {
          id: canonicalReferenceId,
          hash: `sha256:${"7".repeat(64)}`,
          now: "2026-07-17T16:15:00.000Z",
        },
      );
    }
    upsertSynthesisReferenceMatchProposal(
      connection.adapter,
      {
        proposalId: "proposal:binding",
        kind: "zotero_binding",
        status: "open",
        sourceCanonicalReferenceId: "canonical:A",
        targetLibraryId: 1,
        targetItemKey: "B",
        basisHash: `sha256:${"8".repeat(64)}`,
        sourceHash: `sha256:${"9".repeat(64)}`,
      },
      "2026-07-17T16:15:00.000Z",
    );
    upsertSynthesisReferenceMatchProposal(
      connection.adapter,
      {
        proposalId: "proposal:merge",
        kind: "canonical_merge",
        status: "open",
        sourceCanonicalReferenceId: "canonical:A",
        targetCanonicalReferenceId: "canonical:B",
        basisHash: `sha256:${"a".repeat(64)}`,
        sourceHash: `sha256:${"b".repeat(64)}`,
      },
      "2026-07-17T16:15:00.000Z",
    );
    const application =
      createSynthesisSidecarReferenceMatchingReviewApplication({
        databasePath: repository.paths.databasePath,
        now: () => "2026-07-17T16:15:00.000Z",
      });

    assert.equal(
      (
        await application.applyReviewDecisions({
          decisions: [{ proposalId: "proposal:binding", action: "accept" }],
        })
      ).results[0]?.status,
      "accepted",
    );
    assert.equal(repository.store.listReferenceBindings().length, 1);
    await application.applyReviewDecisions({
      decisions: [{ proposalId: "proposal:binding", action: "reject" }],
    });
    assert.equal(repository.store.listReferenceBindings().length, 0);
    await application.applyReviewDecisions({
      decisions: [{ proposalId: "proposal:binding", action: "reopen" }],
    });
    await application.applyReviewDecisions({
      decisions: [
        {
          proposalId: "proposal:binding",
          action: "manual_target",
          target: { kind: "zotero_item", libraryId: 1, itemKey: "MANUAL" },
        },
      ],
    });
    const bindingAudit = listSynthesisReferenceMatchProposals(
      connection.adapter,
      { kinds: ["zotero_binding"], statuses: ["accepted"] },
    )[0];
    assert.exists(bindingAudit);
    assert.equal(
      repository.store.listReferenceBindings()[0]?.itemKey,
      "MANUAL",
    );
    await application.applyReviewDecisions({
      decisions: [{ proposalId: bindingAudit!.proposalId, action: "delete" }],
    });
    assert.equal(repository.store.listReferenceBindings().length, 0);

    await application.applyReviewDecisions({
      decisions: [{ proposalId: "proposal:merge", action: "reverse_accept" }],
    });
    assert.deepInclude(
      connection.adapter.get(
        "SELECT * FROM synt_reference_redirect WHERE from_canonical_reference_id='canonical:B'",
      ),
      {
        from_canonical_reference_id: "canonical:B",
        to_canonical_reference_id: "canonical:A",
      },
    );
    await application.applyReviewDecisions({
      decisions: [{ proposalId: "proposal:merge", action: "reject" }],
    });
    assert.isNull(
      connection.adapter.get(
        "SELECT * FROM synt_reference_redirect WHERE from_canonical_reference_id='canonical:B'",
      ),
    );
    await application.applyReviewDecisions({
      decisions: [{ proposalId: "proposal:merge", action: "reopen" }],
    });
    const retargeted = await application.applyReviewDecisions({
      decisions: [
        {
          proposalId: "proposal:merge",
          action: "manual_target",
          target: {
            kind: "canonical_reference",
            canonicalReferenceId: "canonical:C",
          },
        },
      ],
    });
    assert.equal(retargeted.results[0]?.status, "retargeted");
    assert.sameMembers(
      connection.adapter
        .all(
          "SELECT * FROM synt_reference_redirect WHERE to_canonical_reference_id='canonical:C'",
        )
        .map((row) => row.from_canonical_reference_id),
      ["canonical:A", "canonical:B"],
    );
    assert.equal(
      listSynthesisReferenceMatchProposals(connection.adapter, {
        kinds: ["canonical_merge"],
        statuses: ["accepted"],
      }).length,
      2,
    );

    await application.shutdown();
    connection.close();
    repository.close();
  });

  it("runs matching against the real isolated Node SQLite repository", async function () {
    const root = tempRoot();
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
      now: () => "2026-07-17T16:30:00.000Z",
    });
    repository.store.replaceReferenceProjection({
      expectedReferenceHash: null,
      referenceHash: REFERENCE_HASH,
      inputHash: `sha256:${"1".repeat(64)}`,
      scope: "full",
      sourceRefs: ["1:A"],
      replaceReferenceSourceRefs: ["1:A"],
      sources: [],
      artifacts: [],
      rawReferences: [
        {
          rawReferenceId: "raw:1",
          sourceRef: "1:A",
          referencesArtifactHash: `sha256:${"2".repeat(64)}`,
          referenceIndex: 0,
          rawHash: `sha256:${"3".repeat(64)}`,
          parsedTitle: "Target Paper",
          normalizedTitle: "target paper",
          year: "2024",
          authorsJson: "[]",
          rawReference: "Target Paper",
          canonicalReferenceId: "canonical:1",
          status: "active",
          rolesJson: "[]",
          diagnosticsJson: "[]",
          createdAt: "2026-07-17T16:30:00.000Z",
          updatedAt: "2026-07-17T16:30:00.000Z",
        },
      ],
      canonicals: [
        {
          canonicalReferenceId: "canonical:1",
          title: "Target Paper",
          normalizedTitle: "target paper",
          year: "2024",
          authorsJson: "[]",
          identifiersJson: "[]",
          metadataHash: `sha256:${"4".repeat(64)}`,
          status: "active",
          createdAt: "2026-07-17T16:30:00.000Z",
          updatedAt: "2026-07-17T16:30:00.000Z",
        },
      ],
      bindings: [],
      reviews: [],
      graphFactsChanged: false,
      now: "2026-07-17T16:30:00.000Z",
    });
    const application =
      createSynthesisSidecarReferenceMatchingReviewApplication({
        databasePath: repository.paths.databasePath,
        now: () => "2026-07-17T16:30:00.000Z",
        createPreparationId: () => "prep:node",
      });
    assert.equal(
      (
        await application.prepareMatching({
          expectedReferenceHash: REFERENCE_HASH,
          papers: [],
          unknown: true,
        })
      ).status,
      "invalid_request",
    );
    assert.equal(
      (
        await application.prepareMatching({
          expectedReferenceHash: REFERENCE_HASH,
          papers: Array.from(
            {
              length:
                SYNTHESIS_REFERENCE_MATCHING_REVIEW_APPLICATION_LIMITS.papers +
                1,
            },
            (_, index) => ({ paperRef: `1:${index}` }),
          ),
        })
      ).status,
      "invalid_request",
    );
    const stalePreparation = await application.prepareMatching({
      expectedReferenceHash: REFERENCE_HASH,
      papers: [{ paperRef: "1:B", itemKey: "B", title: "Target Paper" }],
    });
    assert.equal(stalePreparation.status, "prepared");
    if (stalePreparation.status !== "prepared") return;
    assert.equal(
      (
        await application.applyMatching({
          preparationId: stalePreparation.preparationId,
          hostBasisHash: `sha256:${"0".repeat(64)}`,
        })
      ).status,
      "basis_mismatch",
    );
    const prepared = await application.prepareMatching({
      expectedReferenceHash: REFERENCE_HASH,
      papers: [{ paperRef: "1:B", itemKey: "B", title: "Target Paper" }],
    });
    assert.equal(prepared.status, "prepared");
    if (prepared.status !== "prepared") return;
    const promoted = await application.applyMatching({
      preparationId: prepared.preparationId,
      hostBasisHash: prepared.hostBasisHash,
    });
    assert.equal(promoted.status, "promoted");
    assert.isTrue(application.inspect().matchingReady);
    assert.equal(
      repository.store
        .listReferenceBindings()
        .some((row) => row.itemKey === "B"),
      true,
    );
    await application.shutdown();
    const failedApplication =
      createSynthesisSidecarReferenceMatchingReviewApplication({
        databasePath: repository.paths.databasePath,
        matcher: {
          matchBindings: async () => {
            throw new Error("engine failed");
          },
          dedupeCanonicals: async () => {
            throw new Error("engine failed");
          },
        },
      });
    assert.equal(
      (
        await failedApplication.prepareMatching({
          expectedReferenceHash: REFERENCE_HASH,
          papers: [],
        })
      ).status,
      "engine_failed",
    );
    await failedApplication.shutdown();
    repository.close();
  });
});
