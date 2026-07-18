import {
  rebuildSynthesisConceptKbApplicationDeleteRequest,
  rebuildSynthesisConceptKbApplicationDisplayUpdateRequest,
  rebuildSynthesisConceptKbApplicationIngestRequest,
  rebuildSynthesisConceptKbApplicationMutationResult,
  rebuildSynthesisConceptKbApplicationQueryRequest,
  rebuildSynthesisConceptKbApplicationRebuildIndexRequest,
  rebuildSynthesisConceptKbApplicationReplaceRequest,
  rebuildSynthesisConceptKbApplicationReviewRequest,
  rebuildSynthesisConceptKbApplicationSnapshot,
  rebuildSynthesisConceptKbApplicationState,
  type SynthesisConceptKbApplicationAlias,
  type SynthesisConceptKbApplicationConcept,
  type SynthesisConceptKbApplicationLoaded,
  type SynthesisConceptKbApplicationMutationResult,
  type SynthesisConceptKbApplicationProposal,
  type SynthesisConceptKbApplicationReviewItem,
  type SynthesisConceptKbApplicationSense,
  type SynthesisConceptKbApplicationSnapshot,
  type SynthesisConceptKbApplicationTopicLink,
} from "../../synthesis-contracts/src/conceptKbApplication.js";
import {
  SYNTHESIS_CONCEPT_KB_CONTRACT_VERSION,
  SYNTHESIS_CONCEPT_KB_INDEX_VERSION,
  SYNTHESIS_CONCEPT_KB_QUERY_VERSION,
  rebuildSynthesisConceptKbIndexResult,
  rebuildSynthesisConceptKbQueryResult,
  type SynthesisConceptKbIndexRequest,
  type SynthesisConceptKbIndexResult,
  type SynthesisConceptKbQueryRequest,
  type SynthesisConceptKbQueryResult,
} from "../../synthesis-engine/src/conceptKbIndex.js";
import {
  canonicalizeSynthesisEngineJson,
  hashSynthesisEngineCanonicalJson,
} from "../../synthesis-engine/src/canonicalJson.js";
import type {
  SynthesisConceptApplicationStateRecord,
  SynthesisConceptKbStateRecords,
} from "../../synthesis-repository/src/conceptKb.js";

export type SynthesisConceptKbApplicationRepository = {
  initializeConceptKbApplication(): void;
  getConceptApplicationState(): SynthesisConceptApplicationStateRecord | null;
  listConcepts(): SynthesisConceptKbStateRecords["concepts"];
  listConceptSenses(): SynthesisConceptKbStateRecords["senses"];
  listConceptAliases(): SynthesisConceptKbStateRecords["aliases"];
  listConceptRelations(): SynthesisConceptKbStateRecords["relations"];
  listConceptReviewItems(): SynthesisConceptKbStateRecords["reviewItems"];
  listTopicConceptLinks(): SynthesisConceptKbStateRecords["topicLinks"];
  replaceConceptKbApplicationState(args: {
    expectedManifestHash: string | null;
    manifestHash: string;
    state: SynthesisConceptKbStateRecords;
    now: string;
  }): number | null;
  promoteConceptKbIndex(args: {
    expectedManifestHash: string;
    indexHash: string;
    indexJson: string;
    now: string;
  }): boolean;
};

export type SynthesisConceptKbApplicationCompute = {
  buildIndex(
    request: SynthesisConceptKbIndexRequest,
    options?: { signal?: AbortSignal },
  ): Promise<SynthesisConceptKbIndexResult>;
  query(
    request: SynthesisConceptKbQueryRequest,
    options?: { signal?: AbortSignal },
  ): Promise<SynthesisConceptKbQueryResult>;
};

type Options = {
  repository: SynthesisConceptKbApplicationRepository;
  compute: SynthesisConceptKbApplicationCompute;
  now?: () => string;
};

const emptySnapshot = (): SynthesisConceptKbApplicationSnapshot => ({
  concepts: [],
  senses: [],
  aliases: [],
  relations: [],
  reviewItems: [],
  topicLinks: [],
});

export const normalizeSynthesisConceptText = (value: unknown) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
const normalizedKey = (value: unknown) =>
  normalizeSynthesisConceptText(value).toLowerCase();
const safeId = (value: unknown, fallback = "concept") =>
  normalizedKey(value)
    .replace(/\\/g, "/")
    .replace(/[^a-z0-9_.-]+/g, "-")
    .replace(/^-+|-+$/g, "") || fallback;
const shortHash = (value: unknown) =>
  hashSynthesisEngineCanonicalJson(value).slice("sha256:".length, 12);

export function synthesisConceptIdFromProposal(
  proposal: Pick<SynthesisConceptKbApplicationProposal, "label" | "domain">,
) {
  return `concept:${safeId(proposal.domain || "global")}:${safeId(proposal.label)}`;
}

export function synthesisConceptSenseId(args: {
  conceptId: string;
  label: string;
  domain: string;
  definition: string;
}) {
  return `sense:${safeId(args.conceptId)}:${shortHash({
    label: normalizedKey(args.label),
    domain: normalizedKey(args.domain),
    definition: normalizedKey(args.definition).slice(0, 120),
  })}`;
}

export function synthesisConceptAliasId(alias: string) {
  return `alias:${shortHash(normalizedKey(alias))}`;
}

export function synthesisConceptRelationId(args: {
  sourceConceptId: string;
  targetConceptId: string;
  relation: string;
}) {
  return `relation:${safeId(args.relation)}:${safeId(args.sourceConceptId)}:${safeId(args.targetConceptId)}`;
}

export function synthesisConceptReviewId(args: {
  topicId: string;
  reason: string;
  proposal: SynthesisConceptKbApplicationProposal;
}) {
  return `review:${shortHash({
    topicId: args.topicId,
    reason: args.reason,
    label: normalizedKey(args.proposal.label),
    domain: normalizedKey(args.proposal.domain),
    definition: normalizedKey(args.proposal.definition).slice(0, 120),
  })}`;
}

export function hashSynthesisConceptKbSnapshot(
  snapshot: SynthesisConceptKbApplicationSnapshot,
) {
  return hashSynthesisEngineCanonicalJson(
    rebuildSynthesisConceptKbApplicationSnapshot(snapshot),
  );
}

function fromRecords(
  repository: SynthesisConceptKbApplicationRepository,
): SynthesisConceptKbApplicationSnapshot {
  return rebuildSynthesisConceptKbApplicationSnapshot({
    concepts: repository.listConcepts().map((row) => ({
      conceptId: row.conceptId,
      label: row.label,
      aliases: JSON.parse(row.aliasesJson || "[]"),
      conceptType: row.conceptType,
      domain: row.domain,
      status: row.status,
      shortDefinition: row.shortDefinition,
      definition: row.definition,
      usageNote: row.usageNote,
      editorialNote: row.editorialNote,
      senseIds: JSON.parse(row.senseIdsJson || "[]"),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })),
    senses: repository.listConceptSenses().map((row) => ({
      senseId: row.senseId,
      conceptId: row.conceptId,
      label: row.label,
      aliases: JSON.parse(row.aliasesJson || "[]"),
      domain: row.domain,
      shortDefinition: row.shortDefinition,
      definition: row.definition,
      disambiguation: row.disambiguation,
      topicRelevance: row.topicRelevance,
      confidence: row.confidence,
      sourceTopicIds: JSON.parse(row.sourceTopicIdsJson || "[]"),
      evidence: JSON.parse(row.evidenceJson || "[]"),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })),
    aliases: repository.listConceptAliases().map((row) => ({
      ...row,
      senseId: row.senseId || undefined,
    })),
    relations: repository.listConceptRelations().map((row) => ({
      relationId: row.relationId,
      sourceConceptId: row.sourceConceptId,
      targetConceptId: row.targetConceptId,
      relation: row.relation,
      status: row.status,
      confidence: row.confidence,
      provenance: JSON.parse(row.provenanceJson || "[]"),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })),
    reviewItems: repository.listConceptReviewItems().map((row) => ({
      reviewId: row.reviewId,
      status: row.status,
      reason: row.reason,
      topicId: row.topicId,
      topicPathId: row.topicPathId,
      label: row.label,
      confidence: row.confidence,
      candidateConceptIds: JSON.parse(row.candidateConceptIdsJson || "[]"),
      proposal: JSON.parse(row.proposalJson || "{}"),
      targetConceptId: row.targetConceptId || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      resolvedAt: row.resolvedAt || undefined,
    })),
    topicLinks: repository.listTopicConceptLinks(),
  });
}

function toRecords(
  snapshot: SynthesisConceptKbApplicationSnapshot,
): SynthesisConceptKbStateRecords {
  return {
    concepts: snapshot.concepts.map((row) => ({
      ...row,
      aliasesJson: JSON.stringify(row.aliases),
      senseIdsJson: JSON.stringify(row.senseIds),
    })),
    senses: snapshot.senses.map((row) => ({
      ...row,
      aliasesJson: JSON.stringify(row.aliases),
      sourceTopicIdsJson: JSON.stringify(row.sourceTopicIds),
      evidenceJson: JSON.stringify(row.evidence),
    })),
    aliases: snapshot.aliases,
    relations: snapshot.relations.map((row) => ({
      ...row,
      provenanceJson: JSON.stringify(row.provenance),
    })),
    reviewItems: snapshot.reviewItems.map((row) => ({
      ...row,
      candidateConceptIdsJson: JSON.stringify(row.candidateConceptIds),
      proposalJson: JSON.stringify(row.proposal),
    })),
    topicLinks: snapshot.topicLinks,
  };
}

function source(snapshot: SynthesisConceptKbApplicationSnapshot) {
  return {
    concepts: snapshot.concepts.map((row) => ({
      conceptId: row.conceptId,
      label: row.label,
      aliases: row.aliases,
      conceptType: row.conceptType,
      domain: row.domain,
      status: row.status,
      ...(row.shortDefinition ? { shortDefinition: row.shortDefinition } : {}),
      ...(row.definition ? { definition: row.definition } : {}),
    })),
    senses: snapshot.senses.map((row) => ({
      senseId: row.senseId,
      conceptId: row.conceptId,
      label: row.label,
      ...(row.shortDefinition ? { shortDefinition: row.shortDefinition } : {}),
      ...(row.definition ? { definition: row.definition } : {}),
      confidence: row.confidence,
    })),
    aliases: snapshot.aliases.map((row) => ({
      aliasId: row.aliasId,
      alias: row.alias,
      normalized: row.normalized,
      conceptId: row.conceptId,
      ...(row.senseId ? { senseId: row.senseId } : {}),
      status: row.status,
      confidence: row.confidence,
    })),
  };
}

function emptyResult(
  status: SynthesisConceptKbApplicationMutationResult["status"],
  state: SynthesisConceptApplicationStateRecord | null,
): SynthesisConceptKbApplicationMutationResult {
  return rebuildSynthesisConceptKbApplicationMutationResult({
    status,
    manifestHash: state?.manifestHash ?? null,
    revision: state?.revision ?? 0,
    changedConceptIds: [],
    reviewIds: [],
    diagnostics: [],
  });
}

function tokenOverlap(left: string, right: string) {
  const leftTokens = new Set(
    normalizedKey(left)
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  );
  const rightTokens = new Set(
    normalizedKey(right)
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  );
  if (!leftTokens.size || !rightTokens.size) return 0;
  const common = [...leftTokens].filter((token) =>
    rightTokens.has(token),
  ).length;
  return common / Math.min(leftTokens.size, rightTokens.size);
}

function proposalMatches(
  snapshot: SynthesisConceptKbApplicationSnapshot,
  proposal: SynthesisConceptKbApplicationProposal,
) {
  const keys = new Set(
    [proposal.label, ...proposal.aliases].map(normalizedKey).filter(Boolean),
  );
  const matches = new Set<string>();
  for (const concept of snapshot.concepts) {
    if (
      [concept.label, ...concept.aliases].some((value) =>
        keys.has(normalizedKey(value)),
      )
    ) {
      matches.add(concept.conceptId);
    }
  }
  for (const alias of snapshot.aliases) {
    if (keys.has(normalizedKey(alias.normalized))) matches.add(alias.conceptId);
  }
  const exact = [...matches].sort();
  if (exact.length) return { candidates: exact, ambiguous: exact.length > 1 };
  const scored = snapshot.concepts
    .map((concept) => ({
      conceptId: concept.conceptId,
      score: Math.max(
        tokenOverlap(proposal.label, concept.label),
        ...concept.aliases.map((alias) => tokenOverlap(proposal.label, alias)),
      ),
    }))
    .filter((entry) => entry.score >= 0.5)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.conceptId.localeCompare(right.conceptId),
    );
  const ambiguous = scored.length > 1 && scored[0]!.score === scored[1]!.score;
  return {
    candidates: ambiguous
      ? scored.slice(0, 3).map((entry) => entry.conceptId)
      : [],
    ambiguous,
  };
}

function mergeProposal(
  snapshot: SynthesisConceptKbApplicationSnapshot,
  args: {
    proposal: SynthesisConceptKbApplicationProposal;
    topicId: string;
    targetConceptId?: string;
    now: string;
  },
) {
  const { proposal, topicId, now } = args;
  const conceptId =
    args.targetConceptId || synthesisConceptIdFromProposal(proposal);
  let concept = snapshot.concepts.find((row) => row.conceptId === conceptId);
  if (!concept) {
    concept = {
      conceptId,
      label: proposal.label,
      aliases: [...proposal.aliases].sort(),
      conceptType: proposal.conceptType,
      domain: proposal.domain,
      status: "active",
      ...(proposal.shortDefinition
        ? { shortDefinition: proposal.shortDefinition }
        : {}),
      ...(proposal.definition ? { definition: proposal.definition } : {}),
      senseIds: [],
      createdAt: now,
      updatedAt: now,
    };
    snapshot.concepts.push(concept);
  } else {
    concept.aliases = [
      ...new Set([...concept.aliases, ...proposal.aliases]),
    ].sort();
    concept.updatedAt = now;
  }
  const senseId = synthesisConceptSenseId({
    conceptId,
    label: proposal.label,
    domain: proposal.domain,
    definition: proposal.definition,
  });
  let sense = snapshot.senses.find((row) => row.senseId === senseId);
  if (!sense) {
    sense = {
      senseId,
      conceptId,
      label: proposal.label,
      aliases: [...proposal.aliases].sort(),
      domain: proposal.domain,
      ...(proposal.shortDefinition
        ? { shortDefinition: proposal.shortDefinition }
        : {}),
      ...(proposal.definition ? { definition: proposal.definition } : {}),
      ...(proposal.disambiguation
        ? { disambiguation: proposal.disambiguation }
        : {}),
      ...(proposal.topicRelevance
        ? { topicRelevance: proposal.topicRelevance }
        : {}),
      confidence: proposal.confidence,
      sourceTopicIds: [topicId],
      evidence: proposal.evidence,
      createdAt: now,
      updatedAt: now,
    };
    snapshot.senses.push(sense);
  } else {
    sense.sourceTopicIds = [
      ...new Set([...sense.sourceTopicIds, topicId]),
    ].sort();
    sense.updatedAt = now;
  }
  concept.senseIds = [...new Set([...concept.senseIds, senseId])].sort();
  for (const value of [proposal.label, ...proposal.aliases]) {
    const aliasId = synthesisConceptAliasId(value);
    if (!snapshot.aliases.some((row) => row.aliasId === aliasId)) {
      snapshot.aliases.push({
        aliasId,
        alias: value,
        normalized: normalizedKey(value),
        conceptId,
        senseId,
        status: "active",
        confidence: proposal.confidence,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  const linkKey = `${topicId}\n${conceptId}\n${senseId}`;
  if (
    !snapshot.topicLinks.some(
      (row) => `${row.topicId}\n${row.conceptId}\n${row.senseId}` === linkKey,
    )
  ) {
    snapshot.topicLinks.push({
      topicId,
      conceptId,
      senseId,
      label: proposal.label,
      ...(proposal.topicRelevance
        ? { relevance: proposal.topicRelevance }
        : {}),
      confidence: proposal.confidence,
      source: "topic_synthesis_concept_cards",
      createdAt: now,
      updatedAt: now,
    });
  }
  for (const relation of proposal.relations) {
    if (
      relation.targetConceptId === conceptId ||
      !snapshot.concepts.some(
        (row) => row.conceptId === relation.targetConceptId,
      )
    ) {
      continue;
    }
    const relationId = synthesisConceptRelationId({
      sourceConceptId: conceptId,
      targetConceptId: relation.targetConceptId,
      relation: relation.relation,
    });
    if (!snapshot.relations.some((row) => row.relationId === relationId)) {
      snapshot.relations.push({
        relationId,
        sourceConceptId: conceptId,
        targetConceptId: relation.targetConceptId,
        relation: relation.relation,
        status: "suggested",
        confidence: relation.confidence,
        provenance: relation.provenance,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  return conceptId;
}

export type SynthesisConceptKbApplication = ReturnType<
  typeof createSynthesisConceptKbApplication
>;

export function createSynthesisConceptKbApplication(options: Options) {
  const { repository, compute } = options;
  const now = options.now ?? (() => new Date().toISOString());
  let stopping = false;
  let active: {
    controller: AbortController;
    promise: Promise<unknown>;
  } | null = null;
  const activeQueries = new Map<Promise<unknown>, AbortController>();
  repository.initializeConceptKbApplication();

  const state = () => repository.getConceptApplicationState();
  const inspect = () => {
    const current = state();
    return rebuildSynthesisConceptKbApplicationState({
      manifestHash: current?.manifestHash ?? null,
      revision: current?.revision ?? 0,
      indexHash: current?.indexHash || null,
      indexBasisHash: current?.indexBasisHash || null,
      indexStale: current?.indexStale ?? true,
      conceptCount: repository.listConcepts().length,
      senseCount: repository.listConceptSenses().length,
      aliasCount: repository.listConceptAliases().length,
      relationCount: repository.listConceptRelations().length,
      reviewItemCount: repository.listConceptReviewItems().length,
      topicLinkCount: repository.listTopicConceptLinks().length,
    });
  };

  const load = (): SynthesisConceptKbApplicationLoaded => {
    const current = state();
    return {
      state: inspect(),
      snapshot: current ? fromRecords(repository) : emptySnapshot(),
      index:
        current?.indexJson && current.indexJson !== "{}"
          ? (JSON.parse(current.indexJson) as SynthesisConceptKbIndexResult)
          : null,
    };
  };

  const runMutation = async <T>(
    run: (signal: AbortSignal) => Promise<T>,
    busy: T,
    stopped: T,
  ) => {
    if (stopping) return stopped;
    if (active) return busy;
    const controller = new AbortController();
    const promise = run(controller.signal);
    active = { controller, promise };
    try {
      return await promise;
    } finally {
      if (active?.promise === promise) active = null;
    }
  };

  const commit = (
    expectedManifestHash: string | null,
    candidate: SynthesisConceptKbApplicationSnapshot,
    changedConceptIds: string[],
    reviewIds: string[] = [],
  ) => {
    const snapshot = rebuildSynthesisConceptKbApplicationSnapshot(candidate);
    const manifestHash = hashSynthesisConceptKbSnapshot(snapshot);
    const current = state();
    if ((current?.manifestHash ?? null) !== expectedManifestHash)
      return emptyResult("basis_mismatch", current);
    if (current?.manifestHash === manifestHash)
      return emptyResult("unchanged", current);
    const revision = repository.replaceConceptKbApplicationState({
      expectedManifestHash,
      manifestHash,
      state: toRecords(snapshot),
      now: now(),
    });
    if (revision === null) return emptyResult("basis_mismatch", state());
    return rebuildSynthesisConceptKbApplicationMutationResult({
      status: "committed",
      manifestHash,
      revision,
      changedConceptIds: [...new Set(changedConceptIds)].sort(),
      reviewIds: [...new Set(reviewIds)].sort(),
      diagnostics: [],
    });
  };

  const replaceSnapshot = async (input: unknown) => {
    const request = rebuildSynthesisConceptKbApplicationReplaceRequest(input);
    return runMutation(
      async () =>
        commit(
          request.expectedManifestHash,
          request.snapshot,
          request.snapshot.concepts.map((row) => row.conceptId),
        ),
      emptyResult("concept_kb_busy", state()),
      emptyResult("stopping", state()),
    );
  };

  const ingestProposals = async (input: unknown) => {
    const request = rebuildSynthesisConceptKbApplicationIngestRequest(input);
    return runMutation(
      async () => {
        const current = state();
        if ((current?.manifestHash ?? null) !== request.expectedManifestHash)
          return emptyResult("basis_mismatch", current);
        const snapshot = current ? fromRecords(repository) : emptySnapshot();
        const changed: string[] = [];
        const reviews: string[] = [];
        const timestamp = now();
        for (const proposal of request.proposals) {
          const match = proposalMatches(snapshot, proposal);
          const candidates = match.candidates;
          const reason = match.ambiguous
            ? "ambiguous_concept_match"
            : proposal.confidence === "low"
              ? "low_confidence_concept"
              : null;
          if (reason) {
            const reviewId = synthesisConceptReviewId({
              topicId: request.topicId,
              reason,
              proposal,
            });
            if (
              !snapshot.reviewItems.some((row) => row.reviewId === reviewId)
            ) {
              snapshot.reviewItems.push({
                reviewId,
                status: "open",
                reason,
                topicId: request.topicId,
                topicPathId: request.topicPathId,
                label: proposal.label,
                confidence: proposal.confidence,
                candidateConceptIds: candidates,
                proposal,
                createdAt: timestamp,
                updatedAt: timestamp,
              });
            }
            reviews.push(reviewId);
          } else {
            changed.push(
              mergeProposal(snapshot, {
                proposal,
                topicId: request.topicId,
                targetConceptId: candidates[0],
                now: timestamp,
              }),
            );
          }
        }
        return commit(request.expectedManifestHash, snapshot, changed, reviews);
      },
      emptyResult("concept_kb_busy", state()),
      emptyResult("stopping", state()),
    );
  };

  const review = async (input: unknown) => {
    const request = rebuildSynthesisConceptKbApplicationReviewRequest(input);
    return runMutation(
      async () => {
        const current = state();
        if ((current?.manifestHash ?? null) !== request.expectedManifestHash)
          return emptyResult("basis_mismatch", current);
        if (!current) return emptyResult("not_found", current);
        const snapshot = fromRecords(repository);
        const item = snapshot.reviewItems.find(
          (row) => row.reviewId === request.reviewId && row.status === "open",
        );
        if (!item) return emptyResult("not_found", current);
        const timestamp = now();
        let changed: string[] = [];
        if (request.action === "approve") {
          changed = [
            mergeProposal(snapshot, {
              proposal: item.proposal,
              topicId: item.topicId,
              now: timestamp,
            }),
          ];
          item.status = "approved";
          item.targetConceptId = changed[0];
        } else if (request.action === "merge") {
          if (
            !snapshot.concepts.some(
              (row) => row.conceptId === request.targetConceptId,
            )
          )
            return emptyResult("not_found", current);
          changed = [
            mergeProposal(snapshot, {
              proposal: item.proposal,
              topicId: item.topicId,
              targetConceptId: request.targetConceptId,
              now: timestamp,
            }),
          ];
          item.status = "merged";
          item.targetConceptId = request.targetConceptId;
        } else {
          item.status = "rejected";
        }
        item.updatedAt = timestamp;
        item.resolvedAt = timestamp;
        return commit(request.expectedManifestHash, snapshot, changed, [
          item.reviewId,
        ]);
      },
      emptyResult("concept_kb_busy", state()),
      emptyResult("stopping", state()),
    );
  };

  const updateDisplayText = async (input: unknown) => {
    const request =
      rebuildSynthesisConceptKbApplicationDisplayUpdateRequest(input);
    return runMutation(
      async () => {
        const current = state();
        if ((current?.manifestHash ?? null) !== request.expectedManifestHash)
          return emptyResult("basis_mismatch", current);
        if (!current) return emptyResult("not_found", current);
        const snapshot = fromRecords(repository);
        const concept = snapshot.concepts.find(
          (row) => row.conceptId === request.conceptId,
        );
        if (!concept) return emptyResult("not_found", current);
        Object.assign(concept, {
          label: request.label,
          shortDefinition: request.shortDefinition,
          definition: request.definition,
          usageNote: request.usageNote,
          editorialNote: request.editorialNote,
          updatedAt: now(),
        });
        return commit(request.expectedManifestHash, snapshot, [
          concept.conceptId,
        ]);
      },
      emptyResult("concept_kb_busy", state()),
      emptyResult("stopping", state()),
    );
  };

  const deleteConcepts = async (input: unknown) => {
    const request = rebuildSynthesisConceptKbApplicationDeleteRequest(input);
    return runMutation(
      async () => {
        const current = state();
        if ((current?.manifestHash ?? null) !== request.expectedManifestHash)
          return emptyResult("basis_mismatch", current);
        if (!current) return emptyResult("not_found", current);
        const snapshot = fromRecords(repository);
        const deleted = new Set(
          request.conceptIds.filter((id) =>
            snapshot.concepts.some((row) => row.conceptId === id),
          ),
        );
        if (!deleted.size) return emptyResult("not_found", current);
        const senseIds = new Set(
          snapshot.senses
            .filter((row) => deleted.has(row.conceptId))
            .map((row) => row.senseId),
        );
        snapshot.concepts = snapshot.concepts.filter(
          (row) => !deleted.has(row.conceptId),
        );
        snapshot.senses = snapshot.senses.filter(
          (row) => !deleted.has(row.conceptId),
        );
        snapshot.aliases = snapshot.aliases.filter(
          (row) =>
            !deleted.has(row.conceptId) &&
            !(row.senseId && senseIds.has(row.senseId)),
        );
        snapshot.relations = snapshot.relations.filter(
          (row) =>
            !deleted.has(row.sourceConceptId) &&
            !deleted.has(row.targetConceptId),
        );
        snapshot.topicLinks = snapshot.topicLinks.filter(
          (row) => !deleted.has(row.conceptId) && !senseIds.has(row.senseId),
        );
        snapshot.reviewItems = snapshot.reviewItems.map((row) => ({
          ...row,
          candidateConceptIds: row.candidateConceptIds.filter(
            (id) => !deleted.has(id),
          ),
          ...(row.targetConceptId && deleted.has(row.targetConceptId)
            ? { targetConceptId: undefined }
            : {}),
        }));
        return commit(request.expectedManifestHash, snapshot, [...deleted]);
      },
      emptyResult("concept_kb_busy", state()),
      emptyResult("stopping", state()),
    );
  };

  const rebuildIndex = async (input: unknown) => {
    const request =
      rebuildSynthesisConceptKbApplicationRebuildIndexRequest(input);
    return runMutation(
      async (signal) => {
        const current = state();
        if (!current || current.manifestHash !== request.expectedManifestHash)
          return emptyResult("basis_mismatch", current);
        const indexRequest: SynthesisConceptKbIndexRequest = {
          contractVersion: SYNTHESIS_CONCEPT_KB_CONTRACT_VERSION,
          algorithmVersion: SYNTHESIS_CONCEPT_KB_INDEX_VERSION,
          ...source(fromRecords(repository)),
          sourceManifestHash: current.manifestHash,
          rebuiltAt: now(),
        };
        try {
          const result = rebuildSynthesisConceptKbIndexResult(
            await compute.buildIndex(indexRequest, { signal }),
            indexRequest,
          );
          const indexJson = canonicalizeSynthesisEngineJson(result);
          const promoted = repository.promoteConceptKbIndex({
            expectedManifestHash: current.manifestHash,
            indexHash: hashSynthesisEngineCanonicalJson(result),
            indexJson,
            now: now(),
          });
          return promoted
            ? rebuildSynthesisConceptKbApplicationMutationResult({
                status: "committed",
                manifestHash: current.manifestHash,
                revision: current.revision,
                changedConceptIds: [],
                reviewIds: [],
                diagnostics: [],
              })
            : emptyResult("basis_mismatch", state());
        } catch (error) {
          const code =
            error && typeof error === "object" && "code" in error
              ? String((error as { code: unknown }).code)
              : "";
          return emptyResult(
            code === "worker_canceled" ? "stopping" : "worker_failed",
            state(),
          );
        }
      },
      emptyResult("concept_kb_busy", state()),
      emptyResult("stopping", state()),
    );
  };

  const query = async (input: unknown) => {
    const request = rebuildSynthesisConceptKbApplicationQueryRequest(input);
    if (stopping)
      throw Object.assign(new Error("stopping"), { code: "stopping" });
    const snapshot = state() ? fromRecords(repository) : emptySnapshot();
    const queryRequest: SynthesisConceptKbQueryRequest = {
      contractVersion: SYNTHESIS_CONCEPT_KB_CONTRACT_VERSION,
      algorithmVersion: SYNTHESIS_CONCEPT_KB_QUERY_VERSION,
      ...source(snapshot),
      labels: request.labels,
    };
    const controller = new AbortController();
    const pending = compute.query(queryRequest, { signal: controller.signal });
    activeQueries.set(pending, controller);
    try {
      return rebuildSynthesisConceptKbQueryResult(await pending, queryRequest);
    } finally {
      activeQueries.delete(pending);
    }
  };

  const stopAdmission = () => {
    stopping = true;
    active?.controller.abort();
    for (const controller of activeQueries.values()) controller.abort();
  };
  const shutdown = async () => {
    stopAdmission();
    await Promise.allSettled([
      ...(active ? [active.promise] : []),
      ...activeQueries.keys(),
    ]);
  };

  return {
    inspect,
    load,
    replaceSnapshot,
    ingestProposals,
    review,
    updateDisplayText,
    deleteConcepts,
    rebuildIndex,
    readIndex: () => load().index,
    query,
    stopAdmission,
    shutdown,
  };
}
