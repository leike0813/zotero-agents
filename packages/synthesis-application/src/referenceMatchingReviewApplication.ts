import {
  SYNTHESIS_REFERENCE_MATCHER_BINDING_ALGORITHM_VERSION,
  SYNTHESIS_REFERENCE_MATCHER_CONTRACT_VERSION,
  SYNTHESIS_REFERENCE_MATCHER_DEDUPE_ALGORITHM_VERSION,
  rebuildSynthesisReferenceBindingRequest,
  rebuildSynthesisReferenceBindingResult,
  rebuildSynthesisReferenceDedupeRequest,
  rebuildSynthesisReferenceDedupeResult,
  type SynthesisReferenceBindingRequest,
  type SynthesisReferenceBindingResult,
  type SynthesisReferenceDedupeRequest,
  type SynthesisReferenceDedupeResult,
  type SynthesisReferenceMatcherEngine,
} from "../../synthesis-engine/src/referenceMatcher.js";
import { hashSynthesisEngineCanonicalJson } from "../../synthesis-engine/src/canonicalJson.js";
import {
  rebuildSynthesisReferenceMatchingApplyRequest,
  rebuildSynthesisReferenceMatchingDiscardRequest,
  rebuildSynthesisReferenceMatchingInspectResult,
  rebuildSynthesisReferenceMatchingMutationResult,
  rebuildSynthesisReferenceMatchingPrepareRequest,
  rebuildSynthesisReferenceMatchingPrepareResult,
  rebuildSynthesisReferenceMatchProposalPage,
  rebuildSynthesisReferenceMatchProposalPageRequest,
  rebuildSynthesisReferenceMatchReviewDecisionResult,
  rebuildSynthesisReferenceMatchReviewRequest,
  rebuildSynthesisReferenceMatchReviewResult,
  type SynthesisReferenceMatchProposalPage,
  type SynthesisReferenceMatchProposal,
  type SynthesisReferenceMatchProposalStatus,
  type SynthesisReferenceMatchingGraphDelta,
  type SynthesisReferenceMatchingInspectResult,
  type SynthesisReferenceMatchingMutationResult,
  type SynthesisReferenceMatchingMutationStatus,
  type SynthesisReferenceMatchingPrepareResult,
  type SynthesisReferenceMatchReviewDecision,
  type SynthesisReferenceMatchReviewDecisionResult,
  type SynthesisReferenceMatchReviewResult,
} from "../../synthesis-contracts/src/referenceMatchingReviewApplication.js";

export type SynthesisReferenceMatchingBasis = {
  referenceHash: string | null;
  basisHash: string;
  bindingReferences: SynthesisReferenceBindingRequest["references"];
  dedupeCanonicals: SynthesisReferenceDedupeRequest["canonicals"];
};

export type SynthesisReferenceMatchingPromotion = {
  preparationId: string;
  expectedReferenceHash: string | null;
  expectedBasisHash: string;
  hostBasisHash: string;
  bindingResult: SynthesisReferenceBindingResult;
  dedupeResult: SynthesisReferenceDedupeResult;
  timestamp: string;
};

export type SynthesisReferenceMatchingReviewRepository = {
  initializeReferenceMatchingReviewApplication(): void;
  inspectReferenceMatchingReviewApplication(): SynthesisReferenceMatchingInspectResult;
  listReferenceMatchProposalPage(args: {
    cursor: string;
    limit: number;
  }): SynthesisReferenceMatchProposalPage;
  captureReferenceMatchingBasis(): SynthesisReferenceMatchingBasis;
  promoteReferenceMatching(
    args: SynthesisReferenceMatchingPromotion,
  ): SynthesisReferenceMatchingMutationResult;
  applyReferenceMatchReviewDecision(args: {
    decision: SynthesisReferenceMatchReviewDecision;
    timestamp: string;
  }): SynthesisReferenceMatchReviewDecisionResult;
  recordReferenceMatchingPreparation?(args: {
    preparationId: string;
    referenceHash: string | null;
    repositoryBasisHash: string;
    hostBasisHash: string;
    createdAt: string;
  }): void;
  deleteReferenceMatchingPreparation?(preparationId: string): void;
};

type Options = {
  repository: SynthesisReferenceMatchingReviewRepository;
  matcher: SynthesisReferenceMatcherEngine;
  now?: () => string;
  createPreparationId?: () => string;
};

type Preparation = {
  preparationId: string;
  referenceHash: string | null;
  repositoryBasisHash: string;
  hostBasisHash: string;
  bindingResult: SynthesisReferenceBindingResult;
  dedupeResult: SynthesisReferenceDedupeResult;
};

function emptyDelta(): SynthesisReferenceMatchingGraphDelta {
  return {
    changedCanonicalIds: [],
    changedBindingCanonicalIds: [],
    changedRedirectCanonicalIds: [],
  };
}

function mutationResult<S extends SynthesisReferenceMatchingMutationStatus>(
  status: S,
  state: SynthesisReferenceMatchingInspectResult | null,
): SynthesisReferenceMatchingMutationResult & { status: S } {
  return {
    status,
    referenceHash: state?.referenceHash ?? null,
    matchingHash: state?.matchingHash ?? null,
    warnings: [],
    graphDelta: emptyDelta(),
  };
}

function aggregateDelta(
  results: SynthesisReferenceMatchReviewDecisionResult[],
): SynthesisReferenceMatchingGraphDelta {
  return {
    changedCanonicalIds: Array.from(
      new Set(
        results.flatMap((result) => result.graphDelta.changedCanonicalIds),
      ),
    ).sort(),
    changedBindingCanonicalIds: Array.from(
      new Set(
        results.flatMap(
          (result) => result.graphDelta.changedBindingCanonicalIds,
        ),
      ),
    ).sort(),
    changedRedirectCanonicalIds: Array.from(
      new Set(
        results.flatMap(
          (result) => result.graphDelta.changedRedirectCanonicalIds,
        ),
      ),
    ).sort(),
  };
}

export function synthesisReferenceMatchingStableId(
  prefix: string,
  value: unknown,
) {
  return `${prefix}:${hashSynthesisReferenceMatchingValue(value).slice(7, 31)}`;
}

export function hashSynthesisReferenceMatchingValue(value: unknown) {
  return hashSynthesisEngineCanonicalJson(value);
}

export type SynthesisReferenceMatchReviewTransition = {
  status: SynthesisReferenceMatchProposalStatus;
  revokeAcceptedFact: boolean;
  bindingFact?: {
    bindingId: string;
    canonicalReferenceId: string;
    libraryId: number;
    itemKey: string;
    basisHash: string;
    proposalId: string;
  };
  redirectFacts: Array<{
    sourceCanonicalReferenceId: string;
    targetCanonicalReferenceId: string;
    reason: string;
    proposalId: string;
  }>;
  auditProposals: SynthesisReferenceMatchProposal[];
  graphDelta: SynthesisReferenceMatchingGraphDelta;
};

export type SynthesisReferenceMatchingProjection = {
  bindingFacts: Array<{
    bindingId: string;
    canonicalReferenceId: string;
    libraryId: number;
    itemKey: string;
    confidence: string;
    basisHash: string;
    diagnostics: unknown[];
  }>;
  redirectFacts: Array<{
    sourceCanonicalReferenceId: string;
    targetCanonicalReferenceId: string;
    evidence: unknown;
  }>;
  proposals: SynthesisReferenceMatchProposal[];
  graphDelta: SynthesisReferenceMatchingGraphDelta;
  matchingHash: string;
};

export function projectSynthesisReferenceMatchingPromotion(args: {
  bindingResult: SynthesisReferenceBindingResult;
  dedupeResult: SynthesisReferenceDedupeResult;
  sourceEvidence: Readonly<
    Record<string, { sourceRawReferenceIds: string[]; sourceHash: string }>
  >;
  hostBasisHash: string;
  timestamp: string;
}): SynthesisReferenceMatchingProjection {
  const bindingFacts: SynthesisReferenceMatchingProjection["bindingFacts"] = [];
  const redirectFacts: SynthesisReferenceMatchingProjection["redirectFacts"] =
    [];
  const proposals: SynthesisReferenceMatchProposal[] = [];
  const changedCanonicalIds = new Set<string>();
  const changedBindingCanonicalIds = new Set<string>();
  const changedRedirectCanonicalIds = new Set<string>();
  for (const match of args.bindingResult.matches) {
    const candidate = match.result.suggestedCandidates[0];
    if (
      match.result.status === "matched" &&
      (match.result.confidence === "deterministic" ||
        match.result.confidence === "high") &&
      candidate?.itemKey
    ) {
      bindingFacts.push({
        bindingId: synthesisReferenceMatchingStableId("binding", {
          canonical: match.canonicalReferenceId,
          target: candidate.paperRef,
        }),
        canonicalReferenceId: match.canonicalReferenceId,
        libraryId: Number(candidate.paperRef.split(":")[0]) || 0,
        itemKey: candidate.itemKey,
        confidence: match.result.confidence,
        basisHash: hashSynthesisReferenceMatchingValue(candidate),
        diagnostics: match.result.diagnostics,
      });
      changedCanonicalIds.add(match.canonicalReferenceId);
      changedBindingCanonicalIds.add(match.canonicalReferenceId);
      continue;
    }
    if (
      match.result.status !== "suggested" &&
      match.result.status !== "ambiguous"
    ) {
      continue;
    }
    const source = args.sourceEvidence[match.canonicalReferenceId];
    for (const proposed of match.result.suggestedCandidates.slice(0, 3)) {
      if (!proposed.itemKey) continue;
      const basisHash = hashSynthesisReferenceMatchingValue({
        result: match.result.status,
        candidate: proposed,
      });
      proposals.push({
        proposalId: synthesisReferenceMatchingStableId("proposal", {
          kind: "zotero_binding",
          source: match.canonicalReferenceId,
          target: proposed.paperRef,
          basisHash,
        }),
        kind: "zotero_binding",
        status: "open",
        sourceCanonicalReferenceId: match.canonicalReferenceId,
        sourceRawReferenceIds: source?.sourceRawReferenceIds ?? [],
        ...(Number(proposed.paperRef.split(":")[0])
          ? { targetLibraryId: Number(proposed.paperRef.split(":")[0]) }
          : {}),
        targetItemKey: proposed.itemKey,
        confidence: match.result.confidence,
        score: proposed.score,
        reasons: proposed.reasons,
        evidence: proposed.evidence,
        diagnostics: match.result.diagnostics,
        basisHash,
        ...(source?.sourceHash ? { sourceHash: source.sourceHash } : {}),
        createdAt: args.timestamp,
        updatedAt: args.timestamp,
      });
    }
  }
  for (const action of args.dedupeResult.actions) {
    const basisHash = hashSynthesisReferenceMatchingValue(action);
    const source = args.sourceEvidence[action.sourceCanonicalReferenceId];
    if (action.action === "redirect") {
      redirectFacts.push({
        sourceCanonicalReferenceId: action.sourceCanonicalReferenceId,
        targetCanonicalReferenceId: action.targetCanonicalReferenceId,
        evidence: action.evidence,
      });
      changedCanonicalIds.add(action.sourceCanonicalReferenceId);
      changedCanonicalIds.add(action.targetCanonicalReferenceId);
      changedRedirectCanonicalIds.add(action.sourceCanonicalReferenceId);
      changedRedirectCanonicalIds.add(action.targetCanonicalReferenceId);
      continue;
    }
    proposals.push({
      proposalId: synthesisReferenceMatchingStableId("proposal", {
        kind: "canonical_merge",
        source: action.sourceCanonicalReferenceId,
        target: action.targetCanonicalReferenceId,
        basisHash,
      }),
      kind: "canonical_merge",
      status: "open",
      sourceCanonicalReferenceId: action.sourceCanonicalReferenceId,
      sourceRawReferenceIds: source?.sourceRawReferenceIds ?? [],
      targetCanonicalReferenceId: action.targetCanonicalReferenceId,
      confidence: action.confidence,
      score: action.score,
      reasons: action.reasons,
      evidence: action.evidence,
      diagnostics: action.riskSignals,
      basisHash,
      ...(source?.sourceHash ? { sourceHash: source.sourceHash } : {}),
      createdAt: args.timestamp,
      updatedAt: args.timestamp,
    });
  }
  return {
    bindingFacts,
    redirectFacts,
    proposals,
    graphDelta: {
      changedCanonicalIds: [...changedCanonicalIds].sort(),
      changedBindingCanonicalIds: [...changedBindingCanonicalIds].sort(),
      changedRedirectCanonicalIds: [...changedRedirectCanonicalIds].sort(),
    },
    matchingHash: hashSynthesisReferenceMatchingValue({
      hostBasisHash: args.hostBasisHash,
      bindingResult: args.bindingResult,
      dedupeResult: args.dedupeResult,
    }),
  };
}

export function projectSynthesisReferenceMatchReviewTransition(args: {
  proposal: SynthesisReferenceMatchProposal;
  decision: SynthesisReferenceMatchReviewDecision;
  timestamp: string;
}): SynthesisReferenceMatchReviewTransition {
  const { proposal, decision, timestamp } = args;
  const revokeAcceptedFact = proposal.status === "accepted";
  const changed = new Set<string>();
  const redirectFacts: SynthesisReferenceMatchReviewTransition["redirectFacts"] =
    [];
  const auditProposals: SynthesisReferenceMatchProposal[] = [];
  const basisFor = (source: string, target: string) =>
    hashSynthesisReferenceMatchingValue({
      policy: "manual-reference-match-target-v1",
      source,
      target,
      originalProposalId: proposal.proposalId,
    });
  const auditFor = (args: {
    sourceCanonicalReferenceId: string;
    targetCanonicalReferenceId?: string;
    targetLibraryId?: number;
    targetItemKey?: string;
  }) => {
    const target = args.targetCanonicalReferenceId
      ? args.targetCanonicalReferenceId
      : `${args.targetLibraryId}:${args.targetItemKey}`;
    const proposalId = synthesisReferenceMatchingStableId("proposal", {
      kind: proposal.kind,
      source: args.sourceCanonicalReferenceId,
      target,
      originalProposalId: proposal.proposalId,
    });
    const basisHash = basisFor(args.sourceCanonicalReferenceId, target);
    const audit: SynthesisReferenceMatchProposal = {
      ...proposal,
      ...args,
      proposalId,
      status: "accepted",
      confidence: "manual",
      score: 1,
      reasons: ["manual_target"],
      evidence: {
        manualTarget: true,
        originalProposalId: proposal.proposalId,
      },
      diagnostics: [
        {
          code: "reference_match_manual_target",
          originalProposalId: proposal.proposalId,
        },
      ],
      basisHash,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    auditProposals.push(audit);
    return audit;
  };

  if (
    decision.action === "reject" ||
    decision.action === "reopen" ||
    decision.action === "delete"
  ) {
    const status =
      decision.action === "reject"
        ? "rejected"
        : decision.action === "reopen"
          ? "open"
          : "superseded";
    return {
      status,
      revokeAcceptedFact,
      redirectFacts,
      auditProposals,
      graphDelta: revokeAcceptedFact
        ? proposal.kind === "zotero_binding"
          ? {
              changedCanonicalIds: [proposal.sourceCanonicalReferenceId],
              changedBindingCanonicalIds: [proposal.sourceCanonicalReferenceId],
              changedRedirectCanonicalIds: [],
            }
          : {
              changedCanonicalIds: [
                proposal.sourceCanonicalReferenceId,
                ...(proposal.targetCanonicalReferenceId
                  ? [proposal.targetCanonicalReferenceId]
                  : []),
              ].sort(),
              changedBindingCanonicalIds: [],
              changedRedirectCanonicalIds: [
                proposal.sourceCanonicalReferenceId,
                ...(proposal.targetCanonicalReferenceId
                  ? [proposal.targetCanonicalReferenceId]
                  : []),
              ].sort(),
            }
        : emptyDelta(),
    };
  }

  if (proposal.kind === "zotero_binding") {
    if (decision.action === "reverse_accept") {
      throw new Error(
        "reference_match_reverse_accept_requires_canonical_merge",
      );
    }
    const manual = decision.action === "manual_target";
    if (manual && decision.target?.kind !== "zotero_item") {
      throw new Error("reference_match_manual_binding_target_invalid");
    }
    const libraryId =
      (manual && decision.target?.kind === "zotero_item"
        ? decision.target.libraryId
        : proposal.targetLibraryId) ?? 0;
    const itemKey =
      (manual && decision.target?.kind === "zotero_item"
        ? decision.target.itemKey
        : proposal.targetItemKey) ?? "";
    if (!libraryId || !itemKey) {
      throw new Error("reference_match_target_invalid");
    }
    const audit = manual
      ? auditFor({
          sourceCanonicalReferenceId: proposal.sourceCanonicalReferenceId,
          targetLibraryId: libraryId,
          targetItemKey: itemKey,
        })
      : null;
    const proposalId = audit?.proposalId ?? proposal.proposalId;
    return {
      status: manual ? "retargeted" : "accepted",
      revokeAcceptedFact,
      bindingFact: {
        bindingId: synthesisReferenceMatchingStableId(
          "proposal-binding",
          proposalId,
        ),
        canonicalReferenceId: proposal.sourceCanonicalReferenceId,
        libraryId,
        itemKey,
        basisHash: audit?.basisHash ?? proposal.basisHash ?? "",
        proposalId,
      },
      redirectFacts,
      auditProposals,
      graphDelta: {
        changedCanonicalIds: [proposal.sourceCanonicalReferenceId],
        changedBindingCanonicalIds: [proposal.sourceCanonicalReferenceId],
        changedRedirectCanonicalIds: [],
      },
    };
  }

  const manual = decision.action === "manual_target";
  if (manual && decision.target?.kind !== "canonical_reference") {
    throw new Error("reference_match_manual_merge_target_invalid");
  }
  const target =
    (manual && decision.target?.kind === "canonical_reference"
      ? decision.target.canonicalReferenceId
      : proposal.targetCanonicalReferenceId) ?? "";
  if (
    !target ||
    target === proposal.sourceCanonicalReferenceId ||
    (manual && target === proposal.targetCanonicalReferenceId)
  ) {
    throw new Error("reference_match_target_invalid");
  }
  const reverse = decision.action === "reverse_accept";
  const sources = manual
    ? Array.from(
        new Set([
          proposal.sourceCanonicalReferenceId,
          proposal.targetCanonicalReferenceId ?? "",
        ]),
      ).filter((source) => source && source !== target)
    : [reverse ? target : proposal.sourceCanonicalReferenceId];
  for (const source of sources) {
    const redirectTarget = reverse
      ? proposal.sourceCanonicalReferenceId
      : target;
    redirectFacts.push({
      sourceCanonicalReferenceId: source,
      targetCanonicalReferenceId: redirectTarget,
      reason: manual
        ? "advanced_reference_matching_manual_target"
        : reverse
          ? "advanced_reference_matching_reverse_accept"
          : "advanced_reference_matching_accept",
      proposalId: proposal.proposalId,
    });
    changed.add(source);
    changed.add(redirectTarget);
    if (manual) {
      auditFor({
        sourceCanonicalReferenceId: source,
        targetCanonicalReferenceId: redirectTarget,
      });
    }
  }
  return {
    status: manual ? "retargeted" : "accepted",
    revokeAcceptedFact,
    redirectFacts,
    auditProposals,
    graphDelta: {
      changedCanonicalIds: [...changed].sort(),
      changedBindingCanonicalIds: [],
      changedRedirectCanonicalIds: [...changed].sort(),
    },
  };
}

export type SynthesisReferenceMatchingReviewApplication = ReturnType<
  typeof createSynthesisReferenceMatchingReviewApplication
>;

export function createSynthesisReferenceMatchingReviewApplication(
  options: Options,
) {
  const repository = options.repository;
  const matcher = options.matcher;
  const now = options.now ?? (() => new Date().toISOString());
  let sequence = 0;
  const createPreparationId =
    options.createPreparationId ??
    (() => `reference-matching:${now()}:${++sequence}`);
  let preparation: Preparation | null = null;
  let stopping = false;
  let activeMutation: Promise<unknown> | null = null;
  repository.initializeReferenceMatchingReviewApplication();

  const inspect = () =>
    rebuildSynthesisReferenceMatchingInspectResult(
      repository.inspectReferenceMatchingReviewApplication(),
    );

  const listProposals = (requestInput: unknown) => {
    const request =
      rebuildSynthesisReferenceMatchProposalPageRequest(requestInput);
    return rebuildSynthesisReferenceMatchProposalPage(
      repository.listReferenceMatchProposalPage(request),
    );
  };

  const prepareMatching = async (
    requestInput: unknown,
  ): Promise<SynthesisReferenceMatchingPrepareResult> => {
    const state = inspect();
    if (stopping) return mutationResult("stopping", state);
    if (preparation || activeMutation) {
      return mutationResult("reference_matching_busy", state);
    }
    let request: ReturnType<
      typeof rebuildSynthesisReferenceMatchingPrepareRequest
    >;
    try {
      request = rebuildSynthesisReferenceMatchingPrepareRequest(requestInput);
    } catch {
      return mutationResult("invalid_request", state);
    }
    const run = (async (): Promise<SynthesisReferenceMatchingPrepareResult> => {
      let captured: SynthesisReferenceMatchingBasis;
      try {
        captured = repository.captureReferenceMatchingBasis();
      } catch {
        return mutationResult("repair_required", inspect());
      }
      if (captured.referenceHash !== request.expectedReferenceHash) {
        return mutationResult("basis_mismatch", inspect());
      }
      const hostBasisHash = hashSynthesisReferenceMatchingValue(request.papers);
      let bindingResult: SynthesisReferenceBindingResult;
      let dedupeResult: SynthesisReferenceDedupeResult;
      try {
        const bindingRequest = rebuildSynthesisReferenceBindingRequest({
          contractVersion: SYNTHESIS_REFERENCE_MATCHER_CONTRACT_VERSION,
          algorithmVersion:
            SYNTHESIS_REFERENCE_MATCHER_BINDING_ALGORITHM_VERSION,
          policyId: "production",
          papers: request.papers,
          references: captured.bindingReferences,
        });
        bindingResult = rebuildSynthesisReferenceBindingResult(
          await matcher.matchBindings(bindingRequest),
          bindingRequest,
        );
        const automaticallyBound = new Set(
          bindingResult.matches
            .filter(
              (match) =>
                match.result.status === "matched" &&
                (match.result.confidence === "deterministic" ||
                  match.result.confidence === "high") &&
                Boolean(match.result.suggestedCandidates[0]?.itemKey),
            )
            .map((match) => match.canonicalReferenceId),
        );
        const dedupeRequest = rebuildSynthesisReferenceDedupeRequest({
          contractVersion: SYNTHESIS_REFERENCE_MATCHER_CONTRACT_VERSION,
          algorithmVersion:
            SYNTHESIS_REFERENCE_MATCHER_DEDUPE_ALGORITHM_VERSION,
          canonicals: captured.dedupeCanonicals.filter(
            (canonical) =>
              !automaticallyBound.has(canonical.canonicalReferenceId),
          ),
        });
        dedupeResult = rebuildSynthesisReferenceDedupeResult(
          await matcher.dedupeCanonicals(dedupeRequest),
          dedupeRequest,
        );
      } catch {
        return mutationResult("engine_failed", inspect());
      }
      if (stopping) return mutationResult("stopping", inspect());
      const preparationId = createPreparationId();
      preparation = {
        preparationId,
        referenceHash: captured.referenceHash,
        repositoryBasisHash: captured.basisHash,
        hostBasisHash,
        bindingResult,
        dedupeResult,
      };
      try {
        repository.recordReferenceMatchingPreparation?.({
          preparationId,
          referenceHash: captured.referenceHash,
          repositoryBasisHash: captured.basisHash,
          hostBasisHash,
          createdAt: now(),
        });
      } catch {
        preparation = null;
        return mutationResult("repair_required", inspect());
      }
      return rebuildSynthesisReferenceMatchingPrepareResult({
        ...mutationResult("prepared", inspect()),
        status: "prepared",
        preparationId,
        hostBasisHash,
        bindingMatchCount: bindingResult.matches.length,
        dedupeActionCount: dedupeResult.actions.length,
      });
    })();
    activeMutation = run;
    try {
      return await run;
    } finally {
      if (activeMutation === run) activeMutation = null;
    }
  };

  const applyMatching = async (
    requestInput: unknown,
  ): Promise<SynthesisReferenceMatchingMutationResult> => {
    const state = inspect();
    if (stopping) return mutationResult("stopping", state);
    if (activeMutation) {
      return mutationResult("reference_matching_busy", state);
    }
    let request: ReturnType<
      typeof rebuildSynthesisReferenceMatchingApplyRequest
    >;
    try {
      request = rebuildSynthesisReferenceMatchingApplyRequest(requestInput);
    } catch {
      return mutationResult("invalid_request", state);
    }
    const prepared = preparation;
    if (!prepared || prepared.preparationId !== request.preparationId) {
      return mutationResult("preparation_missing", state);
    }
    preparation = null;
    const run = (async () => {
      try {
        repository.deleteReferenceMatchingPreparation?.(prepared.preparationId);
      } catch {
        return mutationResult("repair_required", inspect());
      }
      if (request.hostBasisHash !== prepared.hostBasisHash) {
        return mutationResult("basis_mismatch", inspect());
      }
      try {
        return rebuildSynthesisReferenceMatchingMutationResult(
          repository.promoteReferenceMatching({
            preparationId: prepared.preparationId,
            expectedReferenceHash: prepared.referenceHash,
            expectedBasisHash: prepared.repositoryBasisHash,
            hostBasisHash: prepared.hostBasisHash,
            bindingResult: prepared.bindingResult,
            dedupeResult: prepared.dedupeResult,
            timestamp: now(),
          }),
        );
      } catch {
        return mutationResult("repair_required", inspect());
      }
    })();
    activeMutation = run;
    try {
      return await run;
    } finally {
      if (activeMutation === run) activeMutation = null;
    }
  };

  const discardPreparation = (requestInput: unknown) => {
    let request: ReturnType<
      typeof rebuildSynthesisReferenceMatchingDiscardRequest
    >;
    try {
      request = rebuildSynthesisReferenceMatchingDiscardRequest(requestInput);
    } catch {
      return mutationResult("invalid_request", inspect());
    }
    if (!preparation || preparation.preparationId !== request.preparationId) {
      return mutationResult("preparation_missing", inspect());
    }
    preparation = null;
    try {
      repository.deleteReferenceMatchingPreparation?.(request.preparationId);
      return mutationResult("unchanged", inspect());
    } catch {
      return mutationResult("repair_required", inspect());
    }
  };

  const applyReviewDecisions = async (
    requestInput: unknown,
  ): Promise<
    | SynthesisReferenceMatchReviewResult
    | SynthesisReferenceMatchingMutationResult
  > => {
    const state = inspect();
    if (stopping) return mutationResult("stopping", state);
    if (preparation || activeMutation) {
      return mutationResult("reference_matching_busy", state);
    }
    let request: ReturnType<typeof rebuildSynthesisReferenceMatchReviewRequest>;
    try {
      request = rebuildSynthesisReferenceMatchReviewRequest(requestInput);
    } catch {
      return mutationResult("invalid_request", state);
    }
    const run = (async (): Promise<SynthesisReferenceMatchReviewResult> => {
      const results: SynthesisReferenceMatchReviewDecisionResult[] = [];
      let appliedCount = 0;
      let skippedCount = 0;
      let failedCount = 0;
      for (const decision of request.decisions) {
        try {
          const result = rebuildSynthesisReferenceMatchReviewDecisionResult(
            repository.applyReferenceMatchReviewDecision({
              decision,
              timestamp: now(),
            }),
          );
          results.push(result);
          if (result.ok) appliedCount += 1;
          else if (result.status === "skipped") skippedCount += 1;
          else failedCount += 1;
        } catch {
          failedCount += 1;
          results.push({
            ok: false,
            status: "failed",
            proposalId: decision.proposalId,
            diagnostics: [{ code: "reference_match_review_failed" }],
            graphDelta: emptyDelta(),
          });
        }
      }
      return rebuildSynthesisReferenceMatchReviewResult({
        ok: failedCount === 0,
        appliedCount,
        skippedCount,
        failedCount,
        results,
        graphDelta: aggregateDelta(results),
      });
    })();
    activeMutation = run;
    try {
      return await run;
    } finally {
      if (activeMutation === run) activeMutation = null;
    }
  };

  const stopAdmission = () => {
    stopping = true;
  };

  const shutdown = async () => {
    stopAdmission();
    const outstanding = preparation;
    preparation = null;
    if (outstanding) {
      try {
        repository.deleteReferenceMatchingPreparation?.(
          outstanding.preparationId,
        );
      } catch {
        // Repository shutdown/recovery owns durable receipt cleanup failures.
      }
    }
    await activeMutation;
  };

  return {
    inspect,
    listProposals,
    prepareMatching,
    applyMatching,
    discardPreparation,
    applyReviewDecisions,
    stopAdmission,
    shutdown,
  };
}
