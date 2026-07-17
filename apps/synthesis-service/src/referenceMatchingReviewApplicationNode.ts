import {
  createSynthesisReferenceMatchingReviewApplication,
  hashSynthesisReferenceMatchingValue,
  projectSynthesisReferenceMatchingPromotion,
  projectSynthesisReferenceMatchReviewTransition,
  synthesisReferenceMatchingStableId,
  type SynthesisReferenceMatchingBasis,
  type SynthesisReferenceMatchingPromotion,
  type SynthesisReferenceMatchingReviewApplication,
  type SynthesisReferenceMatchingReviewRepository,
} from "../../../packages/synthesis-application/src/referenceMatchingReviewApplication.js";
import type {
  SynthesisReferenceMatchProposal,
  SynthesisReferenceMatchingGraphDelta,
  SynthesisReferenceMatchingInspectResult,
  SynthesisReferenceMatchingMutationResult,
  SynthesisReferenceMatchReviewDecision,
  SynthesisReferenceMatchReviewDecisionResult,
} from "../../../packages/synthesis-contracts/src/referenceMatchingReviewApplication.js";
import {
  createInProcessSynthesisReferenceMatcherEngine,
  type ReferenceCanonicalDedupeInput,
  type ReferenceMatcherReferenceInput,
  type SynthesisReferenceMatcherEngine,
} from "../../../packages/synthesis-engine/src/referenceMatcher.js";
import {
  deleteSynthesisReferenceMatchingPreparation,
  ensureSynthesisReferenceMatchingReviewRepositorySchema,
  getSynthesisReferenceMatchProposal,
  getSynthesisReferenceMatchingState,
  hasRejectedSynthesisReferenceMatchProposal,
  listSynthesisReferenceMatchProposalPage,
  replaceSynthesisReferenceMatchingState,
  updateSynthesisReferenceMatchProposalStatus,
  upsertSynthesisReferenceMatchingPreparation,
  upsertSynthesisReferenceMatchProposal,
  type SqlAdapter,
  type SynthesisReferenceMatchProposalRecord,
} from "../../../packages/synthesis-repository/src/index.js";
import { openSynthesisNodeSqliteAdapter } from "./repositoryNodeSqlite.js";

const clean = (value: unknown) => String(value ?? "").trim();
const jsonArray = (value: unknown) => {
  try {
    const parsed = JSON.parse(clean(value) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};
const jsonObject = (value: unknown) => {
  try {
    const parsed = JSON.parse(clean(value) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
};

function emptyDelta(): SynthesisReferenceMatchingGraphDelta {
  return {
    changedCanonicalIds: [],
    changedBindingCanonicalIds: [],
    changedRedirectCanonicalIds: [],
  };
}

function proposalFromRecord(
  row: SynthesisReferenceMatchProposalRecord,
): SynthesisReferenceMatchProposal {
  return {
    proposalId: row.proposalId,
    kind: row.kind,
    status: row.status,
    sourceCanonicalReferenceId: row.sourceCanonicalReferenceId,
    sourceRawReferenceIds: jsonArray(row.sourceRawReferenceIdsJson)
      .map(clean)
      .filter(Boolean),
    ...(row.targetCanonicalReferenceId
      ? { targetCanonicalReferenceId: row.targetCanonicalReferenceId }
      : {}),
    ...(row.targetLibraryId ? { targetLibraryId: row.targetLibraryId } : {}),
    ...(row.targetItemKey ? { targetItemKey: row.targetItemKey } : {}),
    ...(row.confidence ? { confidence: row.confidence } : {}),
    ...(row.score !== undefined ? { score: row.score } : {}),
    reasons: jsonArray(row.reasonsJson).map(clean).filter(Boolean),
    evidence: jsonObject(row.evidenceJson),
    diagnostics: jsonArray(row.diagnosticsJson),
    ...(row.basisHash ? { basisHash: row.basisHash } : {}),
    ...(row.sourceHash ? { sourceHash: row.sourceHash } : {}),
    ...(row.createdAt ? { createdAt: row.createdAt } : {}),
    ...(row.updatedAt ? { updatedAt: row.updatedAt } : {}),
  };
}

function proposalToRecord(
  proposal: SynthesisReferenceMatchProposal,
): SynthesisReferenceMatchProposalRecord {
  return {
    proposalId: proposal.proposalId,
    kind: proposal.kind,
    status: proposal.status,
    sourceCanonicalReferenceId: proposal.sourceCanonicalReferenceId,
    sourceRawReferenceIdsJson: JSON.stringify(proposal.sourceRawReferenceIds),
    targetCanonicalReferenceId: proposal.targetCanonicalReferenceId,
    targetLibraryId: proposal.targetLibraryId,
    targetItemKey: proposal.targetItemKey,
    confidence: proposal.confidence,
    score: proposal.score,
    reasonsJson: JSON.stringify(proposal.reasons),
    evidenceJson: JSON.stringify(proposal.evidence),
    diagnosticsJson: JSON.stringify(proposal.diagnostics),
    basisHash: proposal.basisHash,
    sourceHash: proposal.sourceHash,
    createdAt: proposal.createdAt,
    updatedAt: proposal.updatedAt,
  };
}

function referenceHash(db: SqlAdapter) {
  return (
    clean(
      db.get(
        "SELECT reference_hash FROM synt_reference_application_state WHERE singleton_id=1",
      )?.reference_hash,
    ) || null
  );
}

function inspect(db: SqlAdapter): SynthesisReferenceMatchingInspectResult {
  const state = getSynthesisReferenceMatchingState(db);
  const proposals = Number(
    db.get("SELECT COUNT(*) AS count FROM synt_reference_match_proposal")
      ?.count ?? 0,
  );
  const open = Number(
    db.get(
      "SELECT COUNT(*) AS count FROM synt_reference_match_proposal WHERE status='open'",
    )?.count ?? 0,
  );
  return {
    referenceHash: referenceHash(db),
    matchingHash: state?.matchingHash ?? null,
    proposalCount: proposals,
    openProposalCount: open,
    matchingReady: state?.matchingReady ?? false,
    graphReady: state?.graphReady ?? false,
    relatedItemsReady: state?.relatedItemsReady ?? false,
  };
}

function captureBasis(db: SqlAdapter): SynthesisReferenceMatchingBasis {
  const rawRows = db.all(
    `SELECT * FROM synt_reference_raw
     WHERE status='active'
     ORDER BY source_ref, reference_index, raw_reference_id`,
  );
  const canonicalRows = db.all(
    `SELECT * FROM synt_reference_canonical
     WHERE status='active'
     ORDER BY canonical_reference_id`,
  );
  const bindingRows = db.all(
    `SELECT * FROM synt_reference_binding
     WHERE status='accepted'
     ORDER BY canonical_reference_id, binding_id`,
  );
  const redirectRows = db.all(
    `SELECT * FROM synt_reference_redirect
     ORDER BY from_canonical_reference_id`,
  );
  const bound = new Set(
    bindingRows.map((row) => clean(row.canonical_reference_id)).filter(Boolean),
  );
  const rawsByCanonical = new Map<string, typeof rawRows>();
  for (const row of rawRows) {
    const id = clean(row.canonical_reference_id);
    if (!id || bound.has(id)) continue;
    rawsByCanonical.set(id, [...(rawsByCanonical.get(id) ?? []), row]);
  }
  const canonicalById = new Map(
    canonicalRows.map((row) => [clean(row.canonical_reference_id), row]),
  );
  const bindingReferences: Array<{
    canonicalReferenceId: string;
    reference: ReferenceMatcherReferenceInput;
  }> = [];
  const dedupeCanonicals: ReferenceCanonicalDedupeInput[] = [];
  for (const [canonicalReferenceId, rows] of [...rawsByCanonical].sort()) {
    const first = rows[0];
    const canonical = canonicalById.get(canonicalReferenceId);
    const authors = jsonArray(first?.authors_json).map(clean).filter(Boolean);
    bindingReferences.push({
      canonicalReferenceId,
      reference: {
        referenceInstanceId: clean(first?.raw_reference_id),
        title: clean(first?.parsed_title),
        normalizedTitle: clean(first?.normalized_title),
        year: clean(first?.year),
        authors,
        rawReference: clean(first?.raw_reference),
      },
    });
    dedupeCanonicals.push({
      canonicalReferenceId,
      title: clean(canonical?.title) || clean(first?.parsed_title),
      normalizedTitle:
        clean(canonical?.normalized_title) || clean(first?.normalized_title),
      year: clean(canonical?.year) || clean(first?.year),
      authors:
        jsonArray(canonical?.authors_json).map(clean).filter(Boolean).length > 0
          ? jsonArray(canonical?.authors_json).map(clean).filter(Boolean)
          : authors,
      acceptedBinding: false,
      stickyRepresentative: redirectRows.some(
        (row) => clean(row.to_canonical_reference_id) === canonicalReferenceId,
      ),
      rawReferenceIds: rows.map((row) => clean(row.raw_reference_id)),
      rawHashes: rows.map((row) => clean(row.raw_hash)),
      rawReferences: rows.map((row) => clean(row.raw_reference)),
      sourceRefs: rows.map((row) => clean(row.source_ref)),
    });
  }
  return {
    referenceHash: referenceHash(db),
    basisHash: hashSynthesisReferenceMatchingValue({
      rawRows,
      canonicalRows,
      bindingRows,
      redirectRows,
    }),
    bindingReferences,
    dedupeCanonicals,
  };
}

function refreshState(
  db: SqlAdapter,
  args: {
    matchingHash: string;
    graphFactsChanged: boolean;
    timestamp: string;
  },
) {
  const current = getSynthesisReferenceMatchingState(db);
  const proposalCount = Number(
    db.get("SELECT COUNT(*) AS count FROM synt_reference_match_proposal")
      ?.count ?? 0,
  );
  const openProposalCount = Number(
    db.get(
      "SELECT COUNT(*) AS count FROM synt_reference_match_proposal WHERE status='open'",
    )?.count ?? 0,
  );
  replaceSynthesisReferenceMatchingState(db, {
    referenceHash: referenceHash(db),
    matchingHash: args.matchingHash,
    proposalCount,
    openProposalCount,
    matchingReady: true,
    graphReady: args.graphFactsChanged ? false : (current?.graphReady ?? false),
    relatedItemsReady: args.graphFactsChanged
      ? false
      : (current?.relatedItemsReady ?? false),
    updatedAt: args.timestamp,
  });
}

function upsertProposal(
  db: SqlAdapter,
  record: SynthesisReferenceMatchProposalRecord,
  timestamp: string,
) {
  if (
    record.basisHash &&
    record.sourceHash &&
    hasRejectedSynthesisReferenceMatchProposal(db, {
      kind: record.kind,
      basisHash: record.basisHash,
      sourceHash: record.sourceHash,
    })
  ) {
    return false;
  }
  upsertSynthesisReferenceMatchProposal(db, record, timestamp);
  return true;
}

function promote(
  db: SqlAdapter,
  args: SynthesisReferenceMatchingPromotion,
): SynthesisReferenceMatchingMutationResult {
  return db.transaction(() => {
    const current = captureBasis(db);
    if (
      current.referenceHash !== args.expectedReferenceHash ||
      current.basisHash !== args.expectedBasisHash
    ) {
      return {
        status: "basis_mismatch",
        referenceHash: current.referenceHash,
        matchingHash: inspect(db).matchingHash,
        warnings: [],
        graphDelta: emptyDelta(),
      };
    }
    const sourceCanonicalIds = new Set([
      ...args.bindingResult.matches.map((match) => match.canonicalReferenceId),
      ...args.dedupeResult.actions.map(
        (action) => action.sourceCanonicalReferenceId,
      ),
    ]);
    const sourceEvidence = Object.fromEntries(
      [...sourceCanonicalIds].map((canonicalReferenceId) => {
        const sourceRows = db.all(
          `SELECT raw_reference_id, raw_hash FROM synt_reference_raw
           WHERE status='active' AND canonical_reference_id=@canonical_id
           ORDER BY raw_reference_id`,
          { canonical_id: canonicalReferenceId },
        );
        return [
          canonicalReferenceId,
          {
            sourceRawReferenceIds: sourceRows.map((row) =>
              clean(row.raw_reference_id),
            ),
            sourceHash: hashSynthesisReferenceMatchingValue(sourceRows),
          },
        ];
      }),
    );
    const projection = projectSynthesisReferenceMatchingPromotion({
      bindingResult: args.bindingResult,
      dedupeResult: args.dedupeResult,
      sourceEvidence,
      hostBasisHash: args.hostBasisHash,
      timestamp: args.timestamp,
    });
    for (const binding of projection.bindingFacts) {
      db.run(
        `INSERT OR REPLACE INTO synt_reference_binding (
          binding_id, canonical_reference_id, library_id, item_key, status,
          confidence, reviewer, basis_hash, diagnostics_json, created_at, updated_at
        ) VALUES (
          @binding_id, @canonical_id, @library_id, @item_key, 'accepted',
          @confidence, 'advanced-reference-matching', @basis_hash,
          @diagnostics_json, @timestamp, @timestamp
        )`,
        {
          binding_id: binding.bindingId,
          canonical_id: binding.canonicalReferenceId,
          library_id: binding.libraryId,
          item_key: binding.itemKey,
          confidence: binding.confidence,
          basis_hash: binding.basisHash,
          diagnostics_json: JSON.stringify(binding.diagnostics),
          timestamp: args.timestamp,
        },
      );
    }
    for (const redirect of projection.redirectFacts) {
      db.run(
        `INSERT OR REPLACE INTO synt_reference_redirect (
          from_canonical_reference_id, to_canonical_reference_id, reason,
          diagnostics_json, created_at, updated_at
        ) VALUES (
          @source, @target, 'advanced_reference_dedupe', @diagnostics,
          @timestamp, @timestamp
        )`,
        {
          source: redirect.sourceCanonicalReferenceId,
          target: redirect.targetCanonicalReferenceId,
          diagnostics: JSON.stringify(redirect.evidence),
          timestamp: args.timestamp,
        },
      );
    }
    for (const proposal of projection.proposals) {
      upsertProposal(db, proposalToRecord(proposal), args.timestamp);
    }
    refreshState(db, {
      matchingHash: projection.matchingHash,
      graphFactsChanged: projection.graphDelta.changedCanonicalIds.length > 0,
      timestamp: args.timestamp,
    });
    return {
      status: "promoted",
      referenceHash: current.referenceHash,
      matchingHash: projection.matchingHash,
      warnings: [],
      graphDelta: projection.graphDelta,
    };
  });
}

function applyReview(
  db: SqlAdapter,
  args: { decision: SynthesisReferenceMatchReviewDecision; timestamp: string },
): SynthesisReferenceMatchReviewDecisionResult {
  return db.transaction(() => {
    const proposalRecord = getSynthesisReferenceMatchProposal(
      db,
      args.decision.proposalId,
    );
    if (!proposalRecord) {
      return {
        ok: false,
        status: "missing",
        proposalId: args.decision.proposalId,
        diagnostics: [{ code: "reference_match_proposal_missing" }],
        graphDelta: emptyDelta(),
      };
    }
    const proposal = proposalFromRecord(proposalRecord);
    if (
      args.decision.action === "manual_target" &&
      args.decision.target?.kind === "canonical_reference" &&
      !db.get(
        `SELECT canonical_reference_id FROM synt_reference_canonical
         WHERE canonical_reference_id=@target AND status='active'`,
        { target: args.decision.target.canonicalReferenceId },
      )
    ) {
      return {
        ok: false,
        status: "invalid_target",
        proposalId: proposal.proposalId,
        diagnostics: [{ code: "reference_match_target_invalid" }],
        graphDelta: emptyDelta(),
      };
    }
    let transition: ReturnType<
      typeof projectSynthesisReferenceMatchReviewTransition
    >;
    try {
      transition = projectSynthesisReferenceMatchReviewTransition({
        proposal,
        decision: args.decision,
        timestamp: args.timestamp,
      });
    } catch (error) {
      return {
        ok: false,
        status: "invalid_action",
        proposalId: proposal.proposalId,
        diagnostics: [
          {
            code:
              error instanceof Error
                ? error.message
                : "reference_match_review_invalid",
          },
        ],
        graphDelta: emptyDelta(),
      };
    }
    const bindingId = synthesisReferenceMatchingStableId(
      "proposal-binding",
      proposal.proposalId,
    );
    const revoke = () => {
      if (proposal.kind === "zotero_binding") {
        db.run("DELETE FROM synt_reference_binding WHERE binding_id=@id", {
          id: bindingId,
        });
      } else {
        db.run(
          `DELETE FROM synt_reference_redirect
           WHERE (
             (from_canonical_reference_id=@source AND to_canonical_reference_id=@target)
             OR (from_canonical_reference_id=@target AND to_canonical_reference_id=@source)
           )
             AND reason LIKE 'advanced_reference_matching%'`,
          {
            source: proposal.sourceCanonicalReferenceId,
            target: proposal.targetCanonicalReferenceId ?? "",
          },
        );
      }
    };
    if (transition.revokeAcceptedFact) revoke();
    if (transition.bindingFact) {
      db.run(
        `INSERT OR REPLACE INTO synt_reference_binding (
          binding_id, canonical_reference_id, library_id, item_key, status,
          confidence, reviewer, basis_hash, diagnostics_json, created_at, updated_at
        ) VALUES (
          @id, @canonical, @library, @item, 'accepted', 'manual',
          'advanced-reference-matching-review', @basis, @diagnostics,
          @timestamp, @timestamp
        )`,
        {
          id: transition.bindingFact.bindingId,
          canonical: transition.bindingFact.canonicalReferenceId,
          library: transition.bindingFact.libraryId,
          item: transition.bindingFact.itemKey,
          basis: transition.bindingFact.basisHash,
          diagnostics: JSON.stringify({
            proposalId: transition.bindingFact.proposalId,
          }),
          timestamp: args.timestamp,
        },
      );
    }
    for (const redirect of transition.redirectFacts) {
      db.run(
        `INSERT OR REPLACE INTO synt_reference_redirect (
          from_canonical_reference_id, to_canonical_reference_id, reason,
          diagnostics_json, created_at, updated_at
        ) VALUES (@source, @target, @reason, @diagnostics, @timestamp, @timestamp)`,
        {
          source: redirect.sourceCanonicalReferenceId,
          target: redirect.targetCanonicalReferenceId,
          reason: redirect.reason,
          diagnostics: JSON.stringify({ proposalId: redirect.proposalId }),
          timestamp: args.timestamp,
        },
      );
    }
    for (const audit of transition.auditProposals) {
      upsertSynthesisReferenceMatchProposal(
        db,
        proposalToRecord(audit),
        args.timestamp,
      );
    }
    updateSynthesisReferenceMatchProposalStatus(db, {
      proposalId: proposal.proposalId,
      status: transition.status,
      timestamp: args.timestamp,
    });
    const graphFactsChanged =
      transition.graphDelta.changedCanonicalIds.length > 0;
    refreshState(db, {
      matchingHash:
        inspect(db).matchingHash ??
        hashSynthesisReferenceMatchingValue({
          proposal: proposal.proposalId,
          status: transition.status,
        }),
      graphFactsChanged,
      timestamp: args.timestamp,
    });
    return {
      ok: true,
      status: transition.status,
      proposalId: proposal.proposalId,
      diagnostics: [],
      graphDelta: transition.graphDelta,
    };
  });
}

function createRepositoryPort(
  db: SqlAdapter,
): SynthesisReferenceMatchingReviewRepository {
  return {
    initializeReferenceMatchingReviewApplication() {
      ensureSynthesisReferenceMatchingReviewRepositorySchema(db);
    },
    inspectReferenceMatchingReviewApplication: () => inspect(db),
    listReferenceMatchProposalPage(args) {
      const cursor = Number(args.cursor || 0);
      const page = listSynthesisReferenceMatchProposalPage(db, {
        cursor: Number.isSafeInteger(cursor) && cursor >= 0 ? cursor : 0,
        limit: args.limit,
      });
      return {
        proposals: page.items.map(proposalFromRecord),
        nextCursor: page.nextCursor === null ? null : String(page.nextCursor),
      };
    },
    captureReferenceMatchingBasis: () => captureBasis(db),
    promoteReferenceMatching: (args) => promote(db, args),
    applyReferenceMatchReviewDecision: (args) => applyReview(db, args),
    recordReferenceMatchingPreparation(args) {
      upsertSynthesisReferenceMatchingPreparation(db, {
        preparationId: args.preparationId,
        referenceHash: args.referenceHash,
        repositoryBasisHash: args.repositoryBasisHash,
        hostBasisHash: args.hostBasisHash,
        status: "prepared",
        diagnosticsJson: "[]",
        createdAt: args.createdAt,
        updatedAt: args.createdAt,
      });
    },
    deleteReferenceMatchingPreparation(preparationId) {
      deleteSynthesisReferenceMatchingPreparation(db, preparationId);
    },
  };
}

export function createSynthesisSidecarReferenceMatchingReviewApplication(options: {
  databasePath: string;
  matcher?: SynthesisReferenceMatcherEngine;
  now?: () => string;
  createPreparationId?: () => string;
}): SynthesisReferenceMatchingReviewApplication {
  const connection = openSynthesisNodeSqliteAdapter(options.databasePath);
  const application = createSynthesisReferenceMatchingReviewApplication({
    repository: createRepositoryPort(connection.adapter),
    matcher:
      options.matcher ?? createInProcessSynthesisReferenceMatcherEngine(),
    now: options.now,
    createPreparationId: options.createPreparationId,
  });
  const shutdown = async () => {
    await application.shutdown();
    connection.close();
  };
  return { ...application, shutdown };
}
