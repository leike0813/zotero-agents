import {
  buildReferenceMatcherIndex,
  normalizeSynthesisLiteratureTitle,
  resolveReferenceWithPolicy,
  type ReferenceMatcherCandidate,
  type ReferenceMatcherPaperInput,
  type ReferenceMatcherPolicyId,
  type ReferenceMatcherReferenceInput,
  type ReferenceResolutionGoldLabel,
} from "../../src/modules/synthesis/referenceMatcher";

export const REVIEW_SEED_SCHEMA =
  "synthesis.reference_resolution_review_seed.v1";
const REVIEW_STATE_SCHEMA = "synthesis.reference_resolution_review_state.v1";
const REVIEWED_GOLD_SCHEMA =
  "synthesis.reference_resolution_gold_labels.reviewed.v1";

type JsonRecord = Record<string, any>;

export type ReviewSeedEdgeKind = "confirmed" | "candidate";

export type ReviewSeedEdge = {
  id: string;
  reference_instance_id: string;
  target_item_key: string;
  target_literature_item_id: string;
  kind: ReviewSeedEdgeKind;
  confidence: "deterministic" | "high" | "low" | "review";
  score: number;
  evidence: string[];
  reason: string;
  source: string;
};

export type ReviewSeedReference = JsonRecord & {
  reference_instance_id: string;
  seed_status: "confirmed" | "candidate" | "unresolved";
  confirmed_edges: string[];
  candidate_edges: string[];
};

export type ReviewSeedDocument = {
  schema: typeof REVIEW_SEED_SCHEMA;
  fixture: string;
  generated_at: string;
  policy: ReferenceMatcherPolicyId;
  source_labels: string;
  papers: ReferenceMatcherPaperInput[];
  source_papers: Array<{
    item_key: string;
    literature_item_id: string;
    title: string;
    year: string;
    reference_count: number;
    confirmed_count: number;
    candidate_count: number;
  }>;
  references: ReviewSeedReference[];
  edges: ReviewSeedEdge[];
  diagnostics: Array<{ code: string; message: string; details?: JsonRecord }>;
};

type BuildReviewSeedInput = {
  fixture: string;
  policy?: ReferenceMatcherPolicyId;
  sourceLabels?: string;
  library: { papers: ReferenceMatcherPaperInput[] };
  references: { references: ReferenceMatcherReferenceInput[] };
  trustedLabels?: { labels?: ReferenceResolutionGoldLabel[] };
  dangerPairs?: {
    pairs?: Array<{
      reference_title: string;
      candidate_item_key: string;
      candidate_title?: string;
      expected?: string;
    }>;
  };
  generatedAt?: string;
};

export type ReviewDecision = {
  label:
    | "match"
    | "suggested_match"
    | "ambiguous"
    | "external_or_missing"
    | "ignore";
  target_item_key: string;
  target_literature_item_id: string;
  rejected_target_item_keys: string[];
  evidence: string[];
  rationale: string;
  reviewed_at: string;
  reviewer: "human";
};

export type ReviewStateDocument = {
  schema: typeof REVIEW_STATE_SCHEMA;
  updated_at: string;
  decisions: Record<string, ReviewDecision>;
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function itemKeyOf(paper: ReferenceMatcherPaperInput) {
  return cleanString(paper.itemKey || paper.item_key);
}

function literatureItemIdOf(paper: ReferenceMatcherPaperInput) {
  return cleanString(paper.literatureItemId || paper.literature_item_id);
}

function referenceIdOf(reference: ReferenceMatcherReferenceInput) {
  return cleanString(
    reference.referenceInstanceId || reference.reference_instance_id,
  );
}

function sourceItemKeyOf(reference: JsonRecord) {
  return cleanString(reference.source_item_key || reference.sourceItemKey);
}

function edgeId(referenceId: string, itemKey: string) {
  return `${referenceId}::${itemKey}`;
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.map(cleanString).filter(Boolean))).sort(
    (left, right) => left.localeCompare(right),
  );
}

function scoreValue(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Number(numeric.toFixed(4)) : 0;
}

function normalizedTitleOfReference(reference: ReferenceMatcherReferenceInput) {
  return (
    cleanString(reference.normalizedTitle || reference.normalized_title) ||
    normalizeSynthesisLiteratureTitle(
      reference.title || reference.parsedTitle || reference.parsed_title,
    )
  );
}

function normalizedTitleOfPaper(paper: ReferenceMatcherPaperInput) {
  return (
    cleanString(paper.normalizedTitle || paper.normalized_title) ||
    normalizeSynthesisLiteratureTitle(paper.title)
  );
}

function referenceTitleForDanger(reference: ReferenceMatcherReferenceInput) {
  return cleanString(
    reference.title || reference.parsedTitle || reference.parsed_title,
  );
}

function titleContains(left: string, right: string) {
  const a = normalizeSynthesisLiteratureTitle(left);
  const b = normalizeSynthesisLiteratureTitle(right);
  return Boolean(a && b && a.includes(b));
}

function isDangerousEdge(
  reference: ReferenceMatcherReferenceInput,
  targetItemKey: string,
  dangerPairs: BuildReviewSeedInput["dangerPairs"],
) {
  const refTitle = referenceTitleForDanger(reference);
  return Boolean(
    (dangerPairs?.pairs || []).some(
      (pair) =>
        targetItemKey === pair.candidate_item_key &&
        titleContains(refTitle, pair.reference_title),
    ),
  );
}

function strictTitleCompatible(
  reference: ReferenceMatcherReferenceInput,
  paper: ReferenceMatcherPaperInput,
) {
  return (
    normalizedTitleOfReference(reference) === normalizedTitleOfPaper(paper)
  );
}

function paperByRef(papers: ReferenceMatcherPaperInput[]) {
  return new Map(
    papers.map((paper) => [
      cleanString(paper.paperRef || paper.paper_ref),
      paper,
    ]),
  );
}

function paperByItemKey(papers: ReferenceMatcherPaperInput[]) {
  return new Map(papers.map((paper) => [itemKeyOf(paper), paper]));
}

function candidateEvidence(candidate: ReferenceMatcherCandidate) {
  return uniqueSorted([
    ...candidate.reasons.map((reason) => `matcher:${reason}`),
    Number(candidate.evidence.author_overlap_count || 0) > 0
      ? "author_overlap"
      : "",
    Number(candidate.evidence.year_delta || 999) <= 1 ? "year_compatible" : "",
  ]);
}

function edgeFromCandidate(
  referenceId: string,
  candidate: ReferenceMatcherCandidate,
  kind: ReviewSeedEdgeKind,
  source: string,
  confidence: ReviewSeedEdge["confidence"],
  reason: string,
): ReviewSeedEdge | null {
  const targetItemKey = cleanString(candidate.itemKey);
  if (!targetItemKey) {
    return null;
  }
  return {
    id: edgeId(referenceId, targetItemKey),
    reference_instance_id: referenceId,
    target_item_key: targetItemKey,
    target_literature_item_id: cleanString(candidate.literatureItemId),
    kind,
    confidence,
    score: scoreValue(candidate.score),
    evidence: candidateEvidence(candidate),
    reason,
    source,
  };
}

function edgeFromTrustedLabel(
  label: ReferenceResolutionGoldLabel,
  paper: ReferenceMatcherPaperInput,
): ReviewSeedEdge {
  const targetItemKey = itemKeyOf(paper);
  return {
    id: edgeId(label.reference_instance_id, targetItemKey),
    reference_instance_id: label.reference_instance_id,
    target_item_key: targetItemKey,
    target_literature_item_id:
      cleanString(label.target_literature_item_id) || literatureItemIdOf(paper),
    kind: "confirmed",
    confidence: "high",
    score: 1,
    evidence: uniqueSorted([
      "trusted_reference_note_citekey",
      "old_reference_matching_workflow",
    ]),
    reason:
      "trusted reference-note citeKey resolves uniquely to this active library item",
    source: "trusted-citekey-label",
  };
}

function mergeEdge(
  edgesById: Map<string, ReviewSeedEdge>,
  edge: ReviewSeedEdge | null,
) {
  if (!edge) {
    return;
  }
  const existing = edgesById.get(edge.id);
  if (!existing) {
    edgesById.set(edge.id, edge);
    return;
  }
  if (existing.kind === "confirmed") {
    edgesById.set(edge.id, {
      ...existing,
      evidence: uniqueSorted([...existing.evidence, ...edge.evidence]),
      source: uniqueSorted([existing.source, edge.source]).join("+"),
      score: Math.max(existing.score, edge.score),
    });
    return;
  }
  if (edge.kind === "confirmed") {
    edgesById.set(edge.id, {
      ...edge,
      evidence: uniqueSorted([...existing.evidence, ...edge.evidence]),
      source: uniqueSorted([existing.source, edge.source]).join("+"),
      score: Math.max(existing.score, edge.score),
    });
    return;
  }
  edgesById.set(edge.id, {
    ...existing,
    evidence: uniqueSorted([...existing.evidence, ...edge.evidence]),
    source: uniqueSorted([existing.source, edge.source]).join("+"),
    score: Math.max(existing.score, edge.score),
  });
}

function shouldConfirmMatcherResult(
  reference: ReferenceMatcherReferenceInput,
  targetPaper: ReferenceMatcherPaperInput | undefined,
  candidate: ReferenceMatcherCandidate | undefined,
  dangerPairs: BuildReviewSeedInput["dangerPairs"],
) {
  if (!targetPaper || !candidate) {
    return false;
  }
  if (isDangerousEdge(reference, itemKeyOf(targetPaper), dangerPairs)) {
    return false;
  }
  if (candidate.reasons.some((reason) => reason.startsWith("identifier:"))) {
    return true;
  }
  return (
    strictTitleCompatible(reference, targetPaper) &&
    candidate.reasons.some((reason) =>
      [
        "exact_title_author_same_year",
        "exact_title_author_year_delta",
      ].includes(reason),
    ) &&
    Number(candidate.evidence.author_overlap_count || 0) > 0 &&
    Number(candidate.evidence.year_delta || 999) <= 1
  );
}

export function buildReviewSeedData(
  input: BuildReviewSeedInput,
): ReviewSeedDocument {
  const policy = input.policy || "production";
  const papers = input.library.papers || [];
  const references = input.references.references || [];
  const byPaperRef = paperByRef(papers);
  const byItemKey = paperByItemKey(papers);
  const trustedLabels = new Map(
    (input.trustedLabels?.labels || []).map((label) => [
      cleanString(label.reference_instance_id),
      label,
    ]),
  );
  const matcherIndex = buildReferenceMatcherIndex(papers);
  const diagnostics: ReviewSeedDocument["diagnostics"] = [];
  const edgesById = new Map<string, ReviewSeedEdge>();

  for (const reference of references) {
    const referenceId = referenceIdOf(reference);
    const trusted = trustedLabels.get(referenceId);
    if (trusted?.label === "match" && trusted.target_item_key) {
      const target = byItemKey.get(cleanString(trusted.target_item_key));
      if (
        target &&
        !isDangerousEdge(reference, itemKeyOf(target), input.dangerPairs)
      ) {
        mergeEdge(edgesById, edgeFromTrustedLabel(trusted, target));
      } else {
        diagnostics.push({
          code: "trusted_label_target_missing_or_dangerous",
          message:
            "Trusted citeKey label target was not promoted to confirmed edge.",
          details: {
            reference_instance_id: referenceId,
            target_item_key: trusted.target_item_key,
          },
        });
      }
    }

    const result = resolveReferenceWithPolicy(reference, matcherIndex, policy);
    const suggested = result.suggestedCandidates || [];
    const targetPaper = byPaperRef.get(cleanString(result.targetPaperRef));
    const targetCandidate = suggested.find(
      (candidate) => candidate.paperRef === result.targetPaperRef,
    );
    const promoteMatcher =
      result.status === "matched" &&
      shouldConfirmMatcherResult(
        reference,
        targetPaper,
        targetCandidate,
        input.dangerPairs,
      );

    if (promoteMatcher && targetCandidate) {
      mergeEdge(
        edgesById,
        edgeFromCandidate(
          referenceId,
          targetCandidate,
          "confirmed",
          "production-matcher",
          result.confidence === "deterministic" ? "deterministic" : "high",
          result.confidence === "deterministic"
            ? "production matcher found a unique strong identifier match"
            : "production matcher found an exact title, author-overlap, year-compatible match",
        ),
      );
    }

    for (const candidate of suggested) {
      if (
        isDangerousEdge(
          reference,
          cleanString(candidate.itemKey),
          input.dangerPairs,
        )
      ) {
        continue;
      }
      const alreadyConfirmed =
        edgesById.get(edgeId(referenceId, cleanString(candidate.itemKey)))
          ?.kind === "confirmed";
      if (alreadyConfirmed) {
        continue;
      }
      mergeEdge(
        edgesById,
        edgeFromCandidate(
          referenceId,
          candidate,
          "candidate",
          "production-matcher",
          result.confidence,
          "production matcher suggested this target for human review",
        ),
      );
    }
  }

  const edges = Array.from(edgesById.values()).sort(
    (left, right) =>
      left.reference_instance_id.localeCompare(right.reference_instance_id) ||
      (left.kind === right.kind ? 0 : left.kind === "confirmed" ? -1 : 1) ||
      right.score - left.score ||
      left.target_item_key.localeCompare(right.target_item_key),
  );
  const edgeIdsByReference = new Map<string, ReviewSeedEdge[]>();
  for (const edge of edges) {
    const existing = edgeIdsByReference.get(edge.reference_instance_id) || [];
    existing.push(edge);
    edgeIdsByReference.set(edge.reference_instance_id, existing);
  }
  const seedReferences: ReviewSeedReference[] = references.map((reference) => {
    const referenceId = referenceIdOf(reference);
    const referenceEdges = edgeIdsByReference.get(referenceId) || [];
    const confirmed = referenceEdges
      .filter((edge) => edge.kind === "confirmed")
      .map((edge) => edge.id);
    const candidates = referenceEdges
      .filter((edge) => edge.kind === "candidate")
      .map((edge) => edge.id);
    return {
      ...reference,
      reference_instance_id: referenceId,
      seed_status: confirmed.length
        ? "confirmed"
        : candidates.length
          ? "candidate"
          : "unresolved",
      confirmed_edges: confirmed,
      candidate_edges: candidates,
    };
  });

  const referencesBySource = new Map<string, ReviewSeedReference[]>();
  for (const reference of seedReferences) {
    const sourceKey = sourceItemKeyOf(reference);
    referencesBySource.set(sourceKey, [
      ...(referencesBySource.get(sourceKey) || []),
      reference,
    ]);
  }
  const sourcePapers = papers
    .filter((paper) => referencesBySource.has(itemKeyOf(paper)))
    .map((paper) => {
      const sourceReferences = referencesBySource.get(itemKeyOf(paper)) || [];
      return {
        item_key: itemKeyOf(paper),
        literature_item_id: literatureItemIdOf(paper),
        title: cleanString(paper.title),
        year: cleanString(paper.year),
        reference_count: sourceReferences.length,
        confirmed_count: sourceReferences.filter(
          (reference) => reference.seed_status === "confirmed",
        ).length,
        candidate_count: sourceReferences.filter(
          (reference) => reference.seed_status === "candidate",
        ).length,
      };
    })
    .sort((left, right) => left.title.localeCompare(right.title));

  return {
    schema: REVIEW_SEED_SCHEMA,
    fixture: input.fixture,
    generated_at: input.generatedAt || new Date().toISOString(),
    policy,
    source_labels: input.sourceLabels || "",
    papers,
    source_papers: sourcePapers,
    references: seedReferences,
    edges,
    diagnostics,
  };
}

export function emptyReviewState(): ReviewStateDocument {
  return {
    schema: REVIEW_STATE_SCHEMA,
    updated_at: new Date(0).toISOString(),
    decisions: {},
  };
}

function paperMaps(seed: ReviewSeedDocument) {
  const byItemKey = new Map(
    seed.papers.map((paper) => [
      cleanString(paper.itemKey || paper.item_key),
      paper,
    ]),
  );
  const references = new Set(
    seed.references.map((reference) =>
      cleanString(reference.reference_instance_id),
    ),
  );
  return { byItemKey, references };
}

export function validateDecisionInput(
  seed: ReviewSeedDocument,
  input: JsonRecord,
): { referenceId: string; decision: ReviewDecision } {
  const referenceId = cleanString(
    input.reference_instance_id || input.referenceInstanceId,
  );
  const { byItemKey, references } = paperMaps(seed);
  if (!references.has(referenceId)) {
    throw new Error(`unknown reference_instance_id: ${referenceId}`);
  }
  const allowed = new Set([
    "match",
    "suggested_match",
    "ambiguous",
    "external_or_missing",
    "ignore",
  ]);
  const label = cleanString(input.label) as ReviewDecision["label"];
  if (!allowed.has(label)) {
    throw new Error(`invalid label: ${label}`);
  }
  const targetItemKey = cleanString(
    input.target_item_key || input.targetItemKey,
  );
  const target = targetItemKey ? byItemKey.get(targetItemKey) : undefined;
  if (targetItemKey && !target) {
    throw new Error(`unknown target_item_key: ${targetItemKey}`);
  }
  if (label === "match" && !target) {
    throw new Error("match decision requires a valid target_item_key");
  }
  const rejected = uniqueSorted(
    Array.isArray(input.rejected_target_item_keys)
      ? input.rejected_target_item_keys
      : [],
  ).filter((itemKey) => byItemKey.has(itemKey));
  const decision: ReviewDecision = {
    label,
    target_item_key: targetItemKey,
    target_literature_item_id:
      cleanString(input.target_literature_item_id) ||
      cleanString(target?.literatureItemId || target?.literature_item_id),
    rejected_target_item_keys: rejected,
    evidence: uniqueSorted(
      Array.isArray(input.evidence) ? input.evidence : ["human_review"],
    ),
    rationale: cleanString(input.rationale),
    reviewed_at: new Date().toISOString(),
    reviewer: "human",
  };
  return { referenceId, decision };
}

function candidateForEdge(edge: ReviewSeedEdge, seed: ReviewSeedDocument) {
  const paper = seed.papers.find(
    (entry) =>
      cleanString(entry.itemKey || entry.item_key) === edge.target_item_key,
  );
  return {
    item_key: edge.target_item_key,
    literature_item_id: edge.target_literature_item_id,
    title: cleanString(paper?.title),
    year: cleanString(paper?.year),
    score: edge.score,
    reasons: edge.evidence,
  };
}

function labelFromDecision(
  referenceId: string,
  decision: ReviewDecision,
  seed: ReviewSeedDocument,
) {
  const candidates = decision.target_item_key
    ? [
        candidateForEdge(
          {
            id: `${referenceId}::${decision.target_item_key}`,
            reference_instance_id: referenceId,
            target_item_key: decision.target_item_key,
            target_literature_item_id: decision.target_literature_item_id,
            kind: decision.label === "match" ? "confirmed" : "candidate",
            confidence: "high",
            score: 1,
            evidence: decision.evidence,
            reason: decision.rationale,
            source: "human-review",
          },
          seed,
        ),
      ]
    : [];
  return {
    reference_instance_id: referenceId,
    label: decision.label,
    target_item_key: decision.label === "match" ? decision.target_item_key : "",
    target_literature_item_id:
      decision.label === "match" ? decision.target_literature_item_id : "",
    evidence: decision.evidence,
    rationale: decision.rationale || "human review decision",
    suggested_candidates:
      decision.label === "suggested_match" ? candidates : [],
  };
}

function labelFromSeed(reference: JsonRecord, seed: ReviewSeedDocument) {
  const referenceId = cleanString(reference.reference_instance_id);
  const edgeMap = new Map(seed.edges.map((edge) => [edge.id, edge]));
  const confirmed = (reference.confirmed_edges || [])
    .map((id: string) => edgeMap.get(id))
    .filter(Boolean) as ReviewSeedEdge[];
  const candidates = (reference.candidate_edges || [])
    .map((id: string) => edgeMap.get(id))
    .filter(Boolean) as ReviewSeedEdge[];
  if (confirmed.length) {
    const edge = confirmed[0]!;
    return {
      reference_instance_id: referenceId,
      label: "match",
      target_item_key: edge.target_item_key,
      target_literature_item_id: edge.target_literature_item_id,
      evidence: edge.evidence,
      rationale: edge.reason,
      suggested_candidates: [candidateForEdge(edge, seed)],
    };
  }
  if (candidates.length) {
    return {
      reference_instance_id: referenceId,
      label: "suggested_match",
      target_item_key: "",
      target_literature_item_id: "",
      evidence: ["seed_candidate"],
      rationale: "unreviewed seed candidate requires human confirmation",
      suggested_candidates: candidates.map((edge) =>
        candidateForEdge(edge, seed),
      ),
    };
  }
  return {
    reference_instance_id: referenceId,
    label: "external_or_missing",
    target_item_key: "",
    target_literature_item_id: "",
    evidence: [],
    rationale: "no confirmed or candidate edge in review seed",
    suggested_candidates: [],
  };
}

export function exportReviewedGoldLabels(
  seed: ReviewSeedDocument,
  state: ReviewStateDocument,
) {
  const labels = seed.references.map((reference) => {
    const referenceId = cleanString(reference.reference_instance_id);
    const decision = state.decisions[referenceId];
    return decision
      ? labelFromDecision(referenceId, decision, seed)
      : labelFromSeed(reference, seed);
  });
  const counts = labels.reduce<Record<string, number>>((acc, label) => {
    acc[label.label] = (acc[label.label] || 0) + 1;
    return acc;
  }, {});
  return {
    schema: REVIEWED_GOLD_SCHEMA,
    generated_at: new Date().toISOString(),
    source: "reference-resolution-review-harness",
    labels,
    summary: {
      reference_count: labels.length,
      human_decision_count: Object.keys(state.decisions).length,
      label_counts: counts,
    },
  };
}
