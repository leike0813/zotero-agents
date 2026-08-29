export const SYNTHESIS_REFERENCE_MATCHING_REVIEW_APPLICATION_LIMITS = {
  page: 100,
  decisions: 100,
  papers: 25_000,
  authors: 64,
  identifiers: 32,
  string: 4096,
} as const;

export type SynthesisReferenceMatchingPaper = {
  paperRef: string;
  itemKey?: string;
  literatureItemId?: string;
  title?: string;
  normalizedTitle?: string;
  year?: string;
  authors?: string[];
  doi?: string;
  arxiv?: string;
  isbn?: string;
  url?: string;
  citekey?: string;
  identifiers?: Array<{ kind: string; value: string }>;
};

export type SynthesisReferenceMatchProposalKind =
  | "zotero_binding"
  | "canonical_merge";
export type SynthesisReferenceMatchProposalStatus =
  | "open"
  | "accepted"
  | "rejected"
  | "superseded"
  | "retargeted";

export type SynthesisReferenceMatchProposal = {
  proposalId: string;
  kind: SynthesisReferenceMatchProposalKind;
  status: SynthesisReferenceMatchProposalStatus;
  sourceCanonicalReferenceId: string;
  sourceRawReferenceIds: string[];
  targetCanonicalReferenceId?: string;
  targetLibraryId?: number;
  targetItemKey?: string;
  confidence?: string;
  score?: number;
  reasons: string[];
  evidence: Record<string, unknown>;
  diagnostics: unknown[];
  basisHash?: string;
  sourceHash?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisReferenceMatchingGraphDelta = {
  changedCanonicalIds: string[];
  changedBindingCanonicalIds: string[];
  changedRedirectCanonicalIds: string[];
};

export type SynthesisReferenceMatchingInspectResult = {
  referenceHash: string | null;
  matchingHash: string | null;
  proposalCount: number;
  openProposalCount: number;
  matchingReady: boolean;
  graphReady: boolean;
  relatedItemsReady: boolean;
};

export type SynthesisReferenceMatchProposalPage = {
  proposals: SynthesisReferenceMatchProposal[];
  nextCursor: string | null;
};

export type SynthesisReferenceMatchingMutationStatus =
  | "prepared"
  | "promoted"
  | "unchanged"
  | "basis_mismatch"
  | "reference_matching_busy"
  | "preparation_missing"
  | "invalid_request"
  | "engine_failed"
  | "repair_required"
  | "stopping";

export type SynthesisReferenceMatchingMutationResult = {
  status: SynthesisReferenceMatchingMutationStatus;
  referenceHash: string | null;
  matchingHash: string | null;
  warnings: string[];
  graphDelta: SynthesisReferenceMatchingGraphDelta;
};

export type SynthesisReferenceMatchingPrepareResult =
  | (SynthesisReferenceMatchingMutationResult & {
      status: "prepared";
      preparationId: string;
      hostBasisHash: string;
      bindingMatchCount: number;
      dedupeActionCount: number;
    })
  | (SynthesisReferenceMatchingMutationResult & {
      status: Exclude<SynthesisReferenceMatchingMutationStatus, "prepared">;
    });

export type SynthesisReferenceMatchReviewAction =
  | "accept"
  | "reverse_accept"
  | "reject"
  | "reopen"
  | "delete"
  | "manual_target";

export type SynthesisReferenceMatchReviewTarget =
  | { kind: "zotero_item"; libraryId: number; itemKey: string }
  | { kind: "canonical_reference"; canonicalReferenceId: string };

export type SynthesisReferenceMatchReviewDecision = {
  proposalId: string;
  action: SynthesisReferenceMatchReviewAction;
  target?: SynthesisReferenceMatchReviewTarget;
};

export type SynthesisReferenceMatchReviewDecisionResult = {
  ok: boolean;
  status: string;
  proposalId: string;
  diagnostics: unknown[];
  graphDelta: SynthesisReferenceMatchingGraphDelta;
};

export type SynthesisReferenceMatchReviewResult = {
  ok: boolean;
  appliedCount: number;
  skippedCount: number;
  failedCount: number;
  results: SynthesisReferenceMatchReviewDecisionResult[];
  graphDelta: SynthesisReferenceMatchingGraphDelta;
};

export class SynthesisReferenceMatchingReviewContractError extends Error {
  readonly code = "invalid_request" as const;

  constructor(readonly location: string) {
    super(`Invalid Reference Matching/Review value at ${location}`);
    this.name = "SynthesisReferenceMatchingReviewContractError";
  }
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const clean = (value: unknown) => String(value ?? "").trim();

function invalid(location: string): never {
  throw new SynthesisReferenceMatchingReviewContractError(location);
}

function plainObject(value: unknown, location: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return invalid(location);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) invalid(location);
  return value as Record<string, unknown>;
}

function exactFields(
  input: Record<string, unknown>,
  fields: readonly string[],
  location: string,
) {
  const allowed = new Set(fields);
  if (Object.keys(input).some((field) => !allowed.has(field))) {
    invalid(`${location}.fields`);
  }
}

function requiredString(value: unknown, location: string, max = 4096) {
  if (
    typeof value !== "string" ||
    !value ||
    value !== value.trim() ||
    value.length > max
  ) {
    invalid(location);
  }
  return value;
}

function hashOrNull(value: unknown, location: string) {
  if (value === null) return null;
  if (typeof value !== "string" || !HASH_PATTERN.test(value)) invalid(location);
  return value;
}

export function rebuildSynthesisReferenceMatchingPrepareRequest(
  value: unknown,
): {
  expectedReferenceHash: string | null;
  papers: SynthesisReferenceMatchingPaper[];
} {
  const input = plainObject(value, "referenceMatchingPrepare");
  exactFields(
    input,
    ["expectedReferenceHash", "papers"],
    "referenceMatchingPrepare",
  );
  if (
    !Array.isArray(input.papers) ||
    input.papers.length >
      SYNTHESIS_REFERENCE_MATCHING_REVIEW_APPLICATION_LIMITS.papers
  ) {
    invalid("referenceMatchingPrepare.papers");
  }
  const papers = input.papers.map((value, index) => {
    const location = `referenceMatchingPrepare.papers[${index}]`;
    const paper = plainObject(value, location);
    exactFields(
      paper,
      [
        "paperRef",
        "itemKey",
        "literatureItemId",
        "title",
        "normalizedTitle",
        "year",
        "authors",
        "doi",
        "arxiv",
        "isbn",
        "url",
        "citekey",
        "identifiers",
      ],
      location,
    );
    const optional = (field: string) =>
      paper[field] === undefined
        ? undefined
        : requiredString(paper[field], `${location}.${field}`);
    const authors = paper.authors === undefined ? undefined : paper.authors;
    if (
      authors !== undefined &&
      (!Array.isArray(authors) ||
        authors.length >
          SYNTHESIS_REFERENCE_MATCHING_REVIEW_APPLICATION_LIMITS.authors)
    ) {
      invalid(`${location}.authors`);
    }
    const identifiers =
      paper.identifiers === undefined ? undefined : paper.identifiers;
    if (
      identifiers !== undefined &&
      (!Array.isArray(identifiers) ||
        identifiers.length >
          SYNTHESIS_REFERENCE_MATCHING_REVIEW_APPLICATION_LIMITS.identifiers)
    ) {
      invalid(`${location}.identifiers`);
    }
    return {
      paperRef: requiredString(paper.paperRef, `${location}.paperRef`, 512),
      ...(optional("itemKey") ? { itemKey: optional("itemKey") } : {}),
      ...(optional("literatureItemId")
        ? { literatureItemId: optional("literatureItemId") }
        : {}),
      ...(optional("title") ? { title: optional("title") } : {}),
      ...(optional("normalizedTitle")
        ? { normalizedTitle: optional("normalizedTitle") }
        : {}),
      ...(optional("year") ? { year: optional("year") } : {}),
      ...(authors
        ? {
            authors: authors.map((entry, authorIndex) =>
              requiredString(entry, `${location}.authors[${authorIndex}]`),
            ),
          }
        : {}),
      ...(optional("doi") ? { doi: optional("doi") } : {}),
      ...(optional("arxiv") ? { arxiv: optional("arxiv") } : {}),
      ...(optional("isbn") ? { isbn: optional("isbn") } : {}),
      ...(optional("url") ? { url: optional("url") } : {}),
      ...(optional("citekey") ? { citekey: optional("citekey") } : {}),
      ...(identifiers
        ? {
            identifiers: identifiers.map((entry, identifierIndex) => {
              const identifier = plainObject(
                entry,
                `${location}.identifiers[${identifierIndex}]`,
              );
              exactFields(
                identifier,
                ["kind", "value"],
                `${location}.identifiers[${identifierIndex}]`,
              );
              return {
                kind: requiredString(
                  identifier.kind,
                  `${location}.identifiers[${identifierIndex}].kind`,
                ),
                value: requiredString(
                  identifier.value,
                  `${location}.identifiers[${identifierIndex}].value`,
                ),
              };
            }),
          }
        : {}),
    } satisfies SynthesisReferenceMatchingPaper;
  });
  return {
    expectedReferenceHash: hashOrNull(
      input.expectedReferenceHash,
      "referenceMatchingPrepare.expectedReferenceHash",
    ),
    papers,
  };
}

export function rebuildSynthesisReferenceMatchingApplyRequest(value: unknown) {
  const input = plainObject(value, "referenceMatchingApply");
  exactFields(
    input,
    ["preparationId", "hostBasisHash"],
    "referenceMatchingApply",
  );
  const hostBasisHash = requiredString(
    input.hostBasisHash,
    "referenceMatchingApply.hostBasisHash",
  );
  if (!HASH_PATTERN.test(hostBasisHash)) {
    invalid("referenceMatchingApply.hostBasisHash");
  }
  return {
    preparationId: requiredString(
      input.preparationId,
      "referenceMatchingApply.preparationId",
    ),
    hostBasisHash,
  };
}

export function rebuildSynthesisReferenceMatchingDiscardRequest(
  value: unknown,
) {
  const input = plainObject(value, "referenceMatchingDiscard");
  exactFields(input, ["preparationId"], "referenceMatchingDiscard");
  return {
    preparationId: requiredString(
      input.preparationId,
      "referenceMatchingDiscard.preparationId",
    ),
  };
}

export function rebuildSynthesisReferenceMatchProposalPageRequest(
  value: unknown,
) {
  const input = plainObject(value, "referenceMatchProposalPage");
  exactFields(input, ["cursor", "limit"], "referenceMatchProposalPage");
  const cursor = input.cursor === undefined ? "" : clean(input.cursor);
  if (
    cursor.length > 4096 ||
    (input.cursor !== undefined && cursor !== input.cursor)
  ) {
    invalid("referenceMatchProposalPage.cursor");
  }
  const limit = input.limit === undefined ? 100 : Number(input.limit);
  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > SYNTHESIS_REFERENCE_MATCHING_REVIEW_APPLICATION_LIMITS.page
  ) {
    invalid("referenceMatchProposalPage.limit");
  }
  return { cursor, limit };
}

export function rebuildSynthesisReferenceMatchReviewDecision(
  value: unknown,
): SynthesisReferenceMatchReviewDecision {
  const input = plainObject(value, "referenceMatchReviewDecision");
  exactFields(
    input,
    ["proposalId", "action", "target"],
    "referenceMatchReviewDecision",
  );
  const action = clean(input.action) as SynthesisReferenceMatchReviewAction;
  if (
    ![
      "accept",
      "reverse_accept",
      "reject",
      "reopen",
      "delete",
      "manual_target",
    ].includes(action)
  ) {
    invalid("referenceMatchReviewDecision.action");
  }
  const proposalId = requiredString(
    input.proposalId,
    "referenceMatchReviewDecision.proposalId",
  );
  if (action !== "manual_target") {
    if (input.target !== undefined)
      invalid("referenceMatchReviewDecision.target");
    return { proposalId, action };
  }
  const target = plainObject(
    input.target,
    "referenceMatchReviewDecision.target",
  );
  if (target.kind === "zotero_item") {
    exactFields(
      target,
      ["kind", "libraryId", "itemKey"],
      "referenceMatchReviewDecision.target",
    );
    const libraryId = Number(target.libraryId);
    if (!Number.isSafeInteger(libraryId) || libraryId <= 0) {
      invalid("referenceMatchReviewDecision.target.libraryId");
    }
    return {
      proposalId,
      action,
      target: {
        kind: "zotero_item",
        libraryId,
        itemKey: requiredString(
          target.itemKey,
          "referenceMatchReviewDecision.target.itemKey",
        ),
      },
    };
  }
  if (target.kind === "canonical_reference") {
    exactFields(
      target,
      ["kind", "canonicalReferenceId"],
      "referenceMatchReviewDecision.target",
    );
    return {
      proposalId,
      action,
      target: {
        kind: "canonical_reference",
        canonicalReferenceId: requiredString(
          target.canonicalReferenceId,
          "referenceMatchReviewDecision.target.canonicalReferenceId",
        ),
      },
    };
  }
  return invalid("referenceMatchReviewDecision.target.kind");
}

export function rebuildSynthesisReferenceMatchReviewRequest(value: unknown) {
  const input = plainObject(value, "referenceMatchReview");
  exactFields(input, ["decisions"], "referenceMatchReview");
  if (
    !Array.isArray(input.decisions) ||
    input.decisions.length >
      SYNTHESIS_REFERENCE_MATCHING_REVIEW_APPLICATION_LIMITS.decisions
  ) {
    invalid("referenceMatchReview.decisions");
  }
  const decisions = input.decisions.map(
    rebuildSynthesisReferenceMatchReviewDecision,
  );
  const ids = decisions.map((decision) => decision.proposalId);
  if (new Set(ids).size !== ids.length)
    invalid("referenceMatchReview.duplicates");
  return { decisions };
}

function nonNegativeInteger(value: unknown, location: string) {
  if (!Number.isSafeInteger(value) || Number(value) < 0) invalid(location);
  return Number(value);
}

function booleanValue(value: unknown, location: string) {
  if (typeof value !== "boolean") invalid(location);
  return value;
}

function boundedStringArray(
  value: unknown,
  location: string,
  limit: number = SYNTHESIS_REFERENCE_MATCHING_REVIEW_APPLICATION_LIMITS.papers,
) {
  if (!Array.isArray(value) || value.length > limit) invalid(location);
  return value.map((entry, index) =>
    requiredString(entry, `${location}[${index}]`),
  );
}

function jsonSafe(value: unknown, location: string, depth = 0): unknown {
  if (depth > 32) invalid(location);
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (
      value.length >
      SYNTHESIS_REFERENCE_MATCHING_REVIEW_APPLICATION_LIMITS.string
    ) {
      invalid(location);
    }
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) invalid(location);
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > 10_000) invalid(location);
    return value.map((entry, index) =>
      jsonSafe(entry, `${location}[${index}]`, depth + 1),
    );
  }
  const object = plainObject(value, location);
  const entries = Object.entries(object);
  if (entries.length > 1_000) invalid(location);
  return Object.fromEntries(
    entries.map(([key, entry]) => [
      requiredString(key, `${location}.key`),
      jsonSafe(entry, `${location}.${key}`, depth + 1),
    ]),
  );
}

function jsonArray(value: unknown, location: string) {
  if (!Array.isArray(value)) invalid(location);
  return jsonSafe(value, location) as unknown[];
}

function jsonObject(value: unknown, location: string) {
  plainObject(value, location);
  return jsonSafe(value, location) as Record<string, unknown>;
}

function rebuildGraphDelta(
  value: unknown,
  location: string,
): SynthesisReferenceMatchingGraphDelta {
  const input = plainObject(value, location);
  exactFields(
    input,
    [
      "changedCanonicalIds",
      "changedBindingCanonicalIds",
      "changedRedirectCanonicalIds",
    ],
    location,
  );
  return {
    changedCanonicalIds: boundedStringArray(
      input.changedCanonicalIds,
      `${location}.changedCanonicalIds`,
    ),
    changedBindingCanonicalIds: boundedStringArray(
      input.changedBindingCanonicalIds,
      `${location}.changedBindingCanonicalIds`,
    ),
    changedRedirectCanonicalIds: boundedStringArray(
      input.changedRedirectCanonicalIds,
      `${location}.changedRedirectCanonicalIds`,
    ),
  };
}

export function rebuildSynthesisReferenceMatchProposal(
  value: unknown,
): SynthesisReferenceMatchProposal {
  const input = plainObject(value, "referenceMatchProposal");
  exactFields(
    input,
    [
      "proposalId",
      "kind",
      "status",
      "sourceCanonicalReferenceId",
      "sourceRawReferenceIds",
      "targetCanonicalReferenceId",
      "targetLibraryId",
      "targetItemKey",
      "confidence",
      "score",
      "reasons",
      "evidence",
      "diagnostics",
      "basisHash",
      "sourceHash",
      "createdAt",
      "updatedAt",
    ],
    "referenceMatchProposal",
  );
  const optionalString = (field: string) =>
    input[field] === undefined
      ? undefined
      : requiredString(input[field], `referenceMatchProposal.${field}`);
  const optionalHash = (field: string) => {
    const result = optionalString(field);
    if (result !== undefined && !HASH_PATTERN.test(result)) {
      invalid(`referenceMatchProposal.${field}`);
    }
    return result;
  };
  const targetLibraryId =
    input.targetLibraryId === undefined
      ? undefined
      : nonNegativeInteger(
          input.targetLibraryId,
          "referenceMatchProposal.targetLibraryId",
        );
  if (targetLibraryId === 0) invalid("referenceMatchProposal.targetLibraryId");
  const score =
    input.score === undefined
      ? undefined
      : Number(jsonSafe(input.score, "referenceMatchProposal.score"));
  return {
    proposalId: requiredString(
      input.proposalId,
      "referenceMatchProposal.proposalId",
    ),
    kind:
      input.kind === "zotero_binding" || input.kind === "canonical_merge"
        ? input.kind
        : invalid("referenceMatchProposal.kind"),
    status:
      input.status === "open" ||
      input.status === "accepted" ||
      input.status === "rejected" ||
      input.status === "superseded" ||
      input.status === "retargeted"
        ? input.status
        : invalid("referenceMatchProposal.status"),
    sourceCanonicalReferenceId: requiredString(
      input.sourceCanonicalReferenceId,
      "referenceMatchProposal.sourceCanonicalReferenceId",
    ),
    sourceRawReferenceIds: boundedStringArray(
      input.sourceRawReferenceIds,
      "referenceMatchProposal.sourceRawReferenceIds",
    ),
    ...(optionalString("targetCanonicalReferenceId")
      ? {
          targetCanonicalReferenceId: optionalString(
            "targetCanonicalReferenceId",
          ),
        }
      : {}),
    ...(targetLibraryId ? { targetLibraryId } : {}),
    ...(optionalString("targetItemKey")
      ? { targetItemKey: optionalString("targetItemKey") }
      : {}),
    ...(optionalString("confidence")
      ? { confidence: optionalString("confidence") }
      : {}),
    ...(score !== undefined ? { score } : {}),
    reasons: boundedStringArray(
      input.reasons,
      "referenceMatchProposal.reasons",
      100,
    ),
    evidence: jsonObject(input.evidence, "referenceMatchProposal.evidence"),
    diagnostics: jsonArray(
      input.diagnostics,
      "referenceMatchProposal.diagnostics",
    ),
    ...(optionalHash("basisHash")
      ? { basisHash: optionalHash("basisHash") }
      : {}),
    ...(optionalHash("sourceHash")
      ? { sourceHash: optionalHash("sourceHash") }
      : {}),
    ...(optionalString("createdAt")
      ? { createdAt: optionalString("createdAt") }
      : {}),
    ...(optionalString("updatedAt")
      ? { updatedAt: optionalString("updatedAt") }
      : {}),
  };
}

export function rebuildSynthesisReferenceMatchingInspectResult(
  value: unknown,
): SynthesisReferenceMatchingInspectResult {
  const input = plainObject(value, "referenceMatchingInspect");
  exactFields(
    input,
    [
      "referenceHash",
      "matchingHash",
      "proposalCount",
      "openProposalCount",
      "matchingReady",
      "graphReady",
      "relatedItemsReady",
    ],
    "referenceMatchingInspect",
  );
  return {
    referenceHash: hashOrNull(
      input.referenceHash,
      "referenceMatchingInspect.referenceHash",
    ),
    matchingHash: hashOrNull(
      input.matchingHash,
      "referenceMatchingInspect.matchingHash",
    ),
    proposalCount: nonNegativeInteger(
      input.proposalCount,
      "referenceMatchingInspect.proposalCount",
    ),
    openProposalCount: nonNegativeInteger(
      input.openProposalCount,
      "referenceMatchingInspect.openProposalCount",
    ),
    matchingReady: booleanValue(
      input.matchingReady,
      "referenceMatchingInspect.matchingReady",
    ),
    graphReady: booleanValue(
      input.graphReady,
      "referenceMatchingInspect.graphReady",
    ),
    relatedItemsReady: booleanValue(
      input.relatedItemsReady,
      "referenceMatchingInspect.relatedItemsReady",
    ),
  };
}

export function rebuildSynthesisReferenceMatchProposalPage(
  value: unknown,
): SynthesisReferenceMatchProposalPage {
  const input = plainObject(value, "referenceMatchProposalPageResult");
  exactFields(
    input,
    ["proposals", "nextCursor"],
    "referenceMatchProposalPageResult",
  );
  if (
    !Array.isArray(input.proposals) ||
    input.proposals.length >
      SYNTHESIS_REFERENCE_MATCHING_REVIEW_APPLICATION_LIMITS.page
  ) {
    invalid("referenceMatchProposalPageResult.proposals");
  }
  const nextCursor = input.nextCursor;
  if (nextCursor !== null && typeof nextCursor !== "string") {
    invalid("referenceMatchProposalPageResult.nextCursor");
  }
  return {
    proposals: input.proposals.map(rebuildSynthesisReferenceMatchProposal),
    nextCursor:
      nextCursor === null
        ? null
        : requiredString(
            nextCursor,
            "referenceMatchProposalPageResult.nextCursor",
          ),
  };
}

export function rebuildSynthesisReferenceMatchingMutationResult(
  value: unknown,
): SynthesisReferenceMatchingMutationResult {
  const input = plainObject(value, "referenceMatchingMutationResult");
  exactFields(
    input,
    ["status", "referenceHash", "matchingHash", "warnings", "graphDelta"],
    "referenceMatchingMutationResult",
  );
  const statuses: SynthesisReferenceMatchingMutationStatus[] = [
    "prepared",
    "promoted",
    "unchanged",
    "basis_mismatch",
    "reference_matching_busy",
    "preparation_missing",
    "invalid_request",
    "engine_failed",
    "repair_required",
    "stopping",
  ];
  const status = input.status as SynthesisReferenceMatchingMutationStatus;
  if (!statuses.includes(status))
    invalid("referenceMatchingMutationResult.status");
  return {
    status,
    referenceHash: hashOrNull(
      input.referenceHash,
      "referenceMatchingMutationResult.referenceHash",
    ),
    matchingHash: hashOrNull(
      input.matchingHash,
      "referenceMatchingMutationResult.matchingHash",
    ),
    warnings: boundedStringArray(
      input.warnings,
      "referenceMatchingMutationResult.warnings",
      100,
    ),
    graphDelta: rebuildGraphDelta(
      input.graphDelta,
      "referenceMatchingMutationResult.graphDelta",
    ),
  };
}

export function rebuildSynthesisReferenceMatchingPrepareResult(
  value: unknown,
): SynthesisReferenceMatchingPrepareResult {
  const input = plainObject(value, "referenceMatchingPrepareResult");
  if (input.status !== "prepared") {
    return rebuildSynthesisReferenceMatchingMutationResult(input) as Exclude<
      SynthesisReferenceMatchingPrepareResult,
      { status: "prepared" }
    >;
  }
  exactFields(
    input,
    [
      "status",
      "referenceHash",
      "matchingHash",
      "warnings",
      "graphDelta",
      "preparationId",
      "hostBasisHash",
      "bindingMatchCount",
      "dedupeActionCount",
    ],
    "referenceMatchingPrepareResult",
  );
  const base = rebuildSynthesisReferenceMatchingMutationResult({
    status: input.status,
    referenceHash: input.referenceHash,
    matchingHash: input.matchingHash,
    warnings: input.warnings,
    graphDelta: input.graphDelta,
  });
  const hostBasisHash = requiredString(
    input.hostBasisHash,
    "referenceMatchingPrepareResult.hostBasisHash",
  );
  if (!HASH_PATTERN.test(hostBasisHash)) {
    invalid("referenceMatchingPrepareResult.hostBasisHash");
  }
  return {
    ...base,
    status: "prepared",
    preparationId: requiredString(
      input.preparationId,
      "referenceMatchingPrepareResult.preparationId",
    ),
    hostBasisHash,
    bindingMatchCount: nonNegativeInteger(
      input.bindingMatchCount,
      "referenceMatchingPrepareResult.bindingMatchCount",
    ),
    dedupeActionCount: nonNegativeInteger(
      input.dedupeActionCount,
      "referenceMatchingPrepareResult.dedupeActionCount",
    ),
  };
}

export function rebuildSynthesisReferenceMatchReviewDecisionResult(
  value: unknown,
): SynthesisReferenceMatchReviewDecisionResult {
  const input = plainObject(value, "referenceMatchReviewDecisionResult");
  exactFields(
    input,
    ["ok", "status", "proposalId", "diagnostics", "graphDelta"],
    "referenceMatchReviewDecisionResult",
  );
  const status = requiredString(
    input.status,
    "referenceMatchReviewDecisionResult.status",
  );
  if (
    ![
      "open",
      "accepted",
      "rejected",
      "superseded",
      "retargeted",
      "missing",
      "invalid_action",
      "invalid_target",
      "skipped",
      "failed",
    ].includes(status)
  ) {
    invalid("referenceMatchReviewDecisionResult.status");
  }
  return {
    ok: booleanValue(input.ok, "referenceMatchReviewDecisionResult.ok"),
    status,
    proposalId: requiredString(
      input.proposalId,
      "referenceMatchReviewDecisionResult.proposalId",
    ),
    diagnostics: jsonArray(
      input.diagnostics,
      "referenceMatchReviewDecisionResult.diagnostics",
    ),
    graphDelta: rebuildGraphDelta(
      input.graphDelta,
      "referenceMatchReviewDecisionResult.graphDelta",
    ),
  };
}

export function rebuildSynthesisReferenceMatchReviewResult(
  value: unknown,
): SynthesisReferenceMatchReviewResult {
  const input = plainObject(value, "referenceMatchReviewResult");
  exactFields(
    input,
    [
      "ok",
      "appliedCount",
      "skippedCount",
      "failedCount",
      "results",
      "graphDelta",
    ],
    "referenceMatchReviewResult",
  );
  if (
    !Array.isArray(input.results) ||
    input.results.length >
      SYNTHESIS_REFERENCE_MATCHING_REVIEW_APPLICATION_LIMITS.decisions
  ) {
    invalid("referenceMatchReviewResult.results");
  }
  const appliedCount = nonNegativeInteger(
    input.appliedCount,
    "referenceMatchReviewResult.appliedCount",
  );
  const skippedCount = nonNegativeInteger(
    input.skippedCount,
    "referenceMatchReviewResult.skippedCount",
  );
  const failedCount = nonNegativeInteger(
    input.failedCount,
    "referenceMatchReviewResult.failedCount",
  );
  if (appliedCount + skippedCount + failedCount !== input.results.length) {
    invalid("referenceMatchReviewResult.counts");
  }
  return {
    ok: booleanValue(input.ok, "referenceMatchReviewResult.ok"),
    appliedCount,
    skippedCount,
    failedCount,
    results: input.results.map(
      rebuildSynthesisReferenceMatchReviewDecisionResult,
    ),
    graphDelta: rebuildGraphDelta(
      input.graphDelta,
      "referenceMatchReviewResult.graphDelta",
    ),
  };
}
