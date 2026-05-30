import { hashCanonicalJson } from "./foundation";

export type ReferenceMatcherIdentifier = {
  kind: string;
  value: string;
};

export type ReferenceMatcherPaperInput = {
  paperRef: string;
  paper_ref?: string;
  itemKey?: string;
  item_key?: string;
  literatureItemId?: string;
  literature_item_id?: string;
  title?: string;
  normalizedTitle?: string;
  normalized_title?: string;
  year?: string;
  authors?: string[];
  doi?: string;
  arxiv?: string;
  url?: string;
  citekey?: string;
  identifiers?: ReferenceMatcherIdentifier[];
};

export type ReferenceMatcherReferenceInput = {
  referenceInstanceId?: string;
  reference_instance_id?: string;
  title?: string;
  parsedTitle?: string;
  parsed_title?: string;
  normalizedTitle?: string;
  normalized_title?: string;
  year?: string;
  authors?: string[];
  rawReference?: string;
  raw_reference?: string;
  doi?: string;
  arxiv?: string;
  url?: string;
  citekey?: string;
};

export type ReferenceMatcherPolicyId =
  | "baseline"
  | "policy-a"
  | "policy-b"
  | "policy-c"
  | "policy-d"
  | "production";

export type ReferenceMatcherCandidate = {
  paperRef: string;
  itemKey?: string;
  literatureItemId?: string;
  title: string;
  year: string;
  score: number;
  reasons: string[];
  evidence: Record<string, unknown>;
};

export type ReferenceMatcherResult = {
  status: "matched" | "unmatched" | "ambiguous";
  targetPaperRef?: string;
  confidence: "deterministic" | "low" | "review";
  diagnostics: unknown[];
  suggestedCandidates: ReferenceMatcherCandidate[];
};

export type ReferenceMatcherIndex = {
  papers: ReferenceMatcherPaperInput[];
  identifiers: Map<string, ReferenceMatcherPaperInput[]>;
  title: Map<string, ReferenceMatcherPaperInput[]>;
  compactTitle: Map<string, ReferenceMatcherPaperInput[]>;
  strongCompactTitle: Map<string, ReferenceMatcherPaperInput[]>;
};

type PolicyConfig = {
  rawIdentifiers: boolean;
  yearDelta: boolean;
  compactTitle: boolean;
  guardedFuzzy: boolean;
};

export type ReferenceResolutionGoldLabel = {
  reference_instance_id: string;
  label: string;
  target_item_key?: string;
  target_literature_item_id?: string;
};

export type ReferenceResolutionFixture = {
  library: { papers: ReferenceMatcherPaperInput[] };
  references: { references: ReferenceMatcherReferenceInput[] };
  goldLabels: { labels: ReferenceResolutionGoldLabel[] };
  dangerPairs?: {
    pairs: Array<{
      reference_title: string;
      candidate_item_key: string;
      candidate_title?: string;
      expected?: string;
    }>;
  };
};

export type ReferenceResolutionEvaluationResult = {
  policy: ReferenceMatcherPolicyId;
  total: number;
  truePositive: number;
  falsePositive: number;
  falseNegative: number;
  precision: number;
  recall: number;
  f1: number;
  candidateAt1Recall: number;
  candidateAt3Recall: number;
  dangerFalsePositive: number;
  falsePositiveIds: string[];
  falseNegativeIds: string[];
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function uniqueSorted<T>(values: T[]) {
  return Array.from(new Set(values)).sort((left, right) =>
    String(left).localeCompare(String(right)),
  );
}

function paperRefOf(paper: ReferenceMatcherPaperInput) {
  return cleanString(paper.paperRef || paper.paper_ref);
}

function itemKeyOf(paper: ReferenceMatcherPaperInput) {
  return cleanString(paper.itemKey || paper.item_key);
}

export function normalizeSynthesisLiteratureTitle(input: unknown) {
  return cleanString(input)
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function compactSynthesisLiteratureTitle(input: unknown) {
  return normalizeSynthesisLiteratureTitle(input).replace(/\s+/g, "");
}

export function strongCompactSynthesisLiteratureTitle(input: unknown) {
  return cleanString(input)
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

function normalizeDoi(value: unknown) {
  return cleanString(value)
    .toLocaleLowerCase("en-US")
    .replace(/^https?:\/\/(dx\.)?doi\.org\//, "")
    .replace(/^doi:/, "")
    .replace(/[.,;:]+$/g, "")
    .trim();
}

function normalizeArxiv(value: unknown) {
  return cleanString(value)
    .toLocaleLowerCase("en-US")
    .replace(/^https?:\/\/arxiv\.org\/(abs|pdf)\//, "")
    .replace(/^arxiv:/, "")
    .replace(/^10\.48550\/arxiv\./, "")
    .replace(/\.pdf$/, "")
    .replace(/v\d+$/, "")
    .replace(/[.,;:]+$/g, "")
    .trim();
}

function normalizeUrl(value: unknown) {
  return cleanString(value).toLocaleLowerCase("en-US").replace(/\/+$/g, "");
}

export function normalizeReferenceIdentifier(
  kind: string,
  value: unknown,
): ReferenceMatcherIdentifier | null {
  const normalizedKind = cleanString(kind).toLocaleLowerCase("en-US");
  if (normalizedKind === "doi") {
    const doi = normalizeDoi(value);
    return doi ? { kind: "doi", value: doi } : null;
  }
  if (normalizedKind === "arxiv") {
    const arxiv = normalizeArxiv(value);
    return arxiv ? { kind: "arxiv", value: arxiv } : null;
  }
  if (normalizedKind === "url") {
    const url = normalizeUrl(value);
    return url ? { kind: "url", value: url } : null;
  }
  if (normalizedKind === "citekey" || normalizedKind === "isbn") {
    const text = cleanString(value).toLocaleLowerCase("en-US");
    return text ? { kind: normalizedKind, value: text } : null;
  }
  return null;
}

function identityKey(identifier: ReferenceMatcherIdentifier) {
  return `${identifier.kind}:${identifier.value}`;
}

function addIdentity(
  target: ReferenceMatcherIdentifier[],
  kind: string,
  value: unknown,
) {
  const identifier = normalizeReferenceIdentifier(kind, value);
  if (identifier) {
    target.push(identifier);
    if (
      identifier.kind === "doi" &&
      identifier.value.startsWith("10.48550/arxiv.")
    ) {
      const arxiv = normalizeReferenceIdentifier("arxiv", identifier.value);
      if (arxiv) {
        target.push(arxiv);
      }
    }
    if (identifier.kind === "url" && identifier.value.includes("arxiv.org")) {
      const arxiv = normalizeReferenceIdentifier("arxiv", identifier.value);
      if (arxiv) {
        target.push(arxiv);
      }
    }
  }
}

export function extractReferenceIdentifiersFromText(
  ...texts: unknown[]
): ReferenceMatcherIdentifier[] {
  const text = texts.map(cleanString).filter(Boolean).join(" ");
  const identifiers: ReferenceMatcherIdentifier[] = [];
  for (const match of text.matchAll(/10\.\d{4,9}\/[^\s,;\]）)]+/gi)) {
    addIdentity(identifiers, "doi", match[0]);
  }
  for (const match of text.matchAll(/arXiv[:\s]*(\d{4}\.\d{4,5}(?:v\d+)?)/gi)) {
    addIdentity(identifiers, "arxiv", match[1]);
  }
  for (const match of text.matchAll(
    /https?:\/\/arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5}(?:v\d+)?)(?:\.pdf)?/gi,
  )) {
    addIdentity(identifiers, "arxiv", match[1]);
  }
  return dedupeIdentifiers(identifiers);
}

function dedupeIdentifiers(identifiers: ReferenceMatcherIdentifier[]) {
  const seen = new Set<string>();
  const result: ReferenceMatcherIdentifier[] = [];
  for (const identifier of identifiers) {
    const key = identityKey(identifier);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(identifier);
    }
  }
  return result.sort((left, right) =>
    identityKey(left).localeCompare(identityKey(right)),
  );
}

function paperIdentifiers(
  paper: ReferenceMatcherPaperInput,
): ReferenceMatcherIdentifier[] {
  const identifiers: ReferenceMatcherIdentifier[] = [];
  addIdentity(identifiers, "doi", paper.doi);
  addIdentity(identifiers, "arxiv", paper.arxiv);
  addIdentity(identifiers, "url", paper.url);
  addIdentity(identifiers, "citekey", paper.citekey);
  for (const identifier of paper.identifiers || []) {
    addIdentity(identifiers, identifier.kind, identifier.value);
  }
  return dedupeIdentifiers(identifiers);
}

function referenceIdentifiers(
  reference: ReferenceMatcherReferenceInput,
  includeRaw: boolean,
) {
  const identifiers: ReferenceMatcherIdentifier[] = [];
  addIdentity(identifiers, "doi", reference.doi);
  addIdentity(identifiers, "arxiv", reference.arxiv);
  addIdentity(identifiers, "url", reference.url);
  addIdentity(identifiers, "citekey", reference.citekey);
  if (includeRaw) {
    identifiers.push(
      ...extractReferenceIdentifiersFromText(
        reference.title,
        reference.parsedTitle || reference.parsed_title,
        reference.rawReference || reference.raw_reference,
      ),
    );
  }
  return dedupeIdentifiers(identifiers);
}

function normalizedTitle(input: {
  title?: string;
  parsedTitle?: string;
  parsed_title?: string;
  normalizedTitle?: string;
  normalized_title?: string;
}) {
  return (
    cleanString(input.normalizedTitle || input.normalized_title) ||
    normalizeSynthesisLiteratureTitle(
      input.title || input.parsedTitle || input.parsed_title,
    )
  );
}

type TitleVariant = {
  normalized: string;
  strongCompact: string;
  stripped: boolean;
};

function titleInputStrings(input: {
  title?: string;
  parsedTitle?: string;
  parsed_title?: string;
  normalizedTitle?: string;
  normalized_title?: string;
}) {
  return uniqueSorted(
    [
      input.normalizedTitle,
      input.normalized_title,
      input.title,
      input.parsedTitle,
      input.parsed_title,
    ]
      .map(cleanString)
      .filter(Boolean),
  );
}

function wordCount(value: string) {
  return value.split(/\s+/).filter(Boolean).length;
}

function bibliographicSuffixVariants(normalized: string) {
  const patterns = [
    /\b(?:in\s+)?proceedings\s+of\b.*$/u,
    /\barxiv\s+preprint\b.*$/u,
    /\bcorr\b.*$/u,
    /\b(?:in\s+)?(?:cvpr|iccv|eccv|neurips|nips|iclr|aaai|ijcai|wacv|bmvc|pami)\b.*$/u,
    /\bpp\b.*$/u,
    /\bpages?\b.*$/u,
    /\b(?:19|20)\d{2}\b(?:\s+\d+)*$/u,
  ];
  const variants: string[] = [];
  for (const pattern of patterns) {
    const stripped = normalized.replace(pattern, "").trim();
    if (
      stripped &&
      stripped !== normalized &&
      wordCount(stripped) >= 3 &&
      stripped.length >= 12
    ) {
      variants.push(stripped);
    }
  }
  return uniqueSorted(variants);
}

function titleVariants(input: {
  title?: string;
  parsedTitle?: string;
  parsed_title?: string;
  normalizedTitle?: string;
  normalized_title?: string;
}) {
  const variants = new Map<string, TitleVariant>();
  for (const text of titleInputStrings(input)) {
    const normalized = normalizeSynthesisLiteratureTitle(text);
    if (!normalized) {
      continue;
    }
    for (const [value, stripped] of [
      [normalized, false] as const,
      ...bibliographicSuffixVariants(normalized).map(
        (variant) => [variant, true] as const,
      ),
    ]) {
      const strongCompact = strongCompactSynthesisLiteratureTitle(value);
      if (strongCompact) {
        variants.set(`${value}:${stripped}`, {
          normalized: value,
          strongCompact,
          stripped,
        });
      }
    }
  }
  return Array.from(variants.values()).sort(
    (left, right) =>
      Number(left.stripped) - Number(right.stripped) ||
      left.normalized.localeCompare(right.normalized),
  );
}

function authorTokens(authors: unknown) {
  return new Set(
    uniqueSorted(
      (Array.isArray(authors) ? authors : [])
        .map((author) => {
          const text = cleanString(author);
          const first =
            text.split(/\s+(?:and|&)\s+/i)[0]?.split(",")[0] || text;
          const parts = normalizeSynthesisLiteratureTitle(first)
            .split(/\s+/)
            .filter(Boolean);
          return parts.at(-1) || "";
        })
        .filter((token) => token && token !== "et" && token !== "al"),
    ),
  );
}

function yearDelta(left: unknown, right: unknown) {
  const a = Number(cleanString(left));
  const b = Number(cleanString(right));
  return Number.isFinite(a) && Number.isFinite(b) ? Math.abs(a - b) : 999;
}

function yearEvidenceReasons(left: unknown, right: unknown) {
  const delta = yearDelta(left, right);
  if (delta === 0) {
    return ["year_same"];
  }
  if (delta === 1) {
    return ["year_delta_1"];
  }
  if (delta === 2) {
    return ["year_delta_2"];
  }
  return [];
}

function titleSimilarity(left: string, right: string) {
  if (!left || !right) {
    return 0;
  }
  const n = left.length;
  const m = right.length;
  const dp = Array.from({ length: n + 1 }, () => new Array<number>(m + 1));
  for (let i = 0; i <= n; i += 1) {
    dp[i]![0] = i;
  }
  for (let j = 0; j <= m; j += 1) {
    dp[0]![j] = j;
  }
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost,
      );
    }
  }
  return 1 - dp[n]![m]! / Math.max(n, m);
}

function policyConfig(policy: ReferenceMatcherPolicyId): PolicyConfig {
  if (policy === "baseline") {
    return {
      rawIdentifiers: false,
      yearDelta: false,
      compactTitle: false,
      guardedFuzzy: false,
    };
  }
  if (policy === "policy-a") {
    return {
      rawIdentifiers: true,
      yearDelta: false,
      compactTitle: false,
      guardedFuzzy: false,
    };
  }
  if (policy === "policy-b") {
    return {
      rawIdentifiers: true,
      yearDelta: true,
      compactTitle: false,
      guardedFuzzy: false,
    };
  }
  if (policy === "policy-c") {
    return {
      rawIdentifiers: true,
      yearDelta: true,
      compactTitle: true,
      guardedFuzzy: false,
    };
  }
  return {
    rawIdentifiers: true,
    yearDelta: true,
    compactTitle: true,
    guardedFuzzy: true,
  };
}

function addToMap(
  map: Map<string, ReferenceMatcherPaperInput[]>,
  key: string,
  paper: ReferenceMatcherPaperInput,
) {
  if (!key) {
    return;
  }
  const existing = map.get(key) || [];
  if (!existing.some((entry) => entry.paperRef === paper.paperRef)) {
    map.set(
      key,
      [...existing, paper].sort((left, right) =>
        left.paperRef.localeCompare(right.paperRef),
      ),
    );
  }
}

export function buildReferenceMatcherIndex(
  papers: ReferenceMatcherPaperInput[],
): ReferenceMatcherIndex {
  const identifiers = new Map<string, ReferenceMatcherPaperInput[]>();
  const title = new Map<string, ReferenceMatcherPaperInput[]>();
  const compactTitle = new Map<string, ReferenceMatcherPaperInput[]>();
  const strongCompactTitle = new Map<string, ReferenceMatcherPaperInput[]>();
  const normalizedPapers = papers.map((paper) => ({
    ...paper,
    paperRef: paperRefOf(paper),
    itemKey: cleanString(paper.itemKey || paper.item_key) || undefined,
    literatureItemId:
      cleanString(paper.literatureItemId || paper.literature_item_id) ||
      undefined,
    title: cleanString(paper.title),
    normalizedTitle: normalizedTitle(paper),
    year: cleanString(paper.year),
    authors: uniqueSorted(paper.authors || []),
    identifiers: paperIdentifiers(paper),
  }));
  for (const paper of normalizedPapers) {
    for (const identifier of paper.identifiers || []) {
      addToMap(identifiers, identityKey(identifier), paper);
    }
    for (const variant of titleVariants(paper)) {
      addToMap(title, variant.normalized, paper);
      addToMap(
        compactTitle,
        compactSynthesisLiteratureTitle(variant.normalized),
        paper,
      );
      addToMap(strongCompactTitle, variant.strongCompact, paper);
    }
  }
  return {
    papers: normalizedPapers,
    identifiers,
    title,
    compactTitle,
    strongCompactTitle,
  };
}

function uniqueCandidate(candidates: ReferenceMatcherPaperInput[]) {
  const unique = new Map(candidates.map((paper) => [paper.paperRef, paper]));
  return unique.size === 1 ? Array.from(unique.values())[0] : null;
}

function candidateFor(
  paper: ReferenceMatcherPaperInput,
  reference: ReferenceMatcherReferenceInput,
  reasons: string[],
  score: number,
): ReferenceMatcherCandidate {
  const refTokens = authorTokens(reference.authors);
  const paperTokens = authorTokens(paper.authors);
  const overlap = Array.from(refTokens)
    .filter((token) => paperTokens.has(token))
    .sort();
  return {
    paperRef: paper.paperRef,
    itemKey: paper.itemKey,
    literatureItemId: paper.literatureItemId,
    title: cleanString(paper.title),
    year: cleanString(paper.year),
    score,
    reasons: uniqueSorted([
      ...reasons,
      ...yearEvidenceReasons(reference.year, paper.year),
    ]),
    evidence: {
      author_overlap: overlap,
      author_overlap_count: overlap.length,
      year_delta: yearDelta(reference.year, paper.year),
      title_similarity: score,
    },
  };
}

function candidateSort(
  left: ReferenceMatcherCandidate,
  right: ReferenceMatcherCandidate,
) {
  const yearRank = (candidate: ReferenceMatcherCandidate) => {
    const delta = Number(candidate.evidence.year_delta);
    return Number.isFinite(delta) && delta <= 2 ? 3 - delta : 0;
  };
  return (
    right.score - left.score ||
    Number(right.evidence.author_overlap_count || 0) -
      Number(left.evidence.author_overlap_count || 0) ||
    yearRank(right) - yearRank(left) ||
    left.paperRef.localeCompare(right.paperRef)
  );
}

function titleCandidates(
  reference: ReferenceMatcherReferenceInput,
  index: ReferenceMatcherIndex,
  config: PolicyConfig,
) {
  const refTitle = normalizedTitle(reference);
  const refVariants = titleVariants(reference);
  const refTokens = authorTokens(reference.authors);
  const candidates = new Map<string, ReferenceMatcherCandidate>();
  const consider = (
    paper: ReferenceMatcherPaperInput,
    reasons: string[],
    score: number,
    options: { requireAuthorOverlap?: boolean } = {},
  ) => {
    const paperTokens = authorTokens(paper.authors);
    const overlap = Array.from(refTokens).filter((token) =>
      paperTokens.has(token),
    ).length;
    if (options.requireAuthorOverlap !== false && overlap <= 0) {
      return;
    }
    const existing = candidates.get(paper.paperRef);
    const nextReasons = existing
      ? uniqueSorted([...existing.reasons, ...reasons])
      : reasons;
    const nextScore = Math.max(existing?.score || 0, score);
    candidates.set(
      paper.paperRef,
      candidateFor(paper, reference, nextReasons, nextScore),
    );
  };

  for (const variant of refVariants) {
    for (const paper of index.strongCompactTitle.get(variant.strongCompact) ||
      []) {
      consider(
        paper,
        [
          variant.stripped
            ? "stripped_strong_compact_title_exact"
            : "strong_compact_title_exact",
        ],
        1,
        { requireAuthorOverlap: false },
      );
    }
    for (const paper of index.title.get(variant.normalized) || []) {
      consider(
        paper,
        [
          variant.stripped
            ? "stripped_exact_title_author"
            : "exact_title_author",
        ],
        0.999,
      );
    }
  }

  if (config.compactTitle) {
    for (const variant of refVariants) {
      const refCompact = compactSynthesisLiteratureTitle(variant.normalized);
      for (const paper of index.compactTitle.get(refCompact) || []) {
        consider(
          paper,
          [
            variant.stripped
              ? "stripped_compact_title_author"
              : "compact_title_author",
          ],
          0.995,
        );
      }
    }
  }

  if (config.guardedFuzzy) {
    for (const paper of index.papers) {
      if (candidates.has(paper.paperRef)) {
        continue;
      }
      const score = titleSimilarity(
        refTitle,
        cleanString(paper.normalizedTitle),
      );
      const paperTokens = authorTokens(paper.authors);
      const overlap = Array.from(refTokens).filter((token) =>
        paperTokens.has(token),
      ).length;
      if (score >= 0.97 && overlap >= 2) {
        candidates.set(
          paper.paperRef,
          candidateFor(paper, reference, ["guarded_fuzzy_title"], score),
        );
      } else if (score >= 0.82 && overlap >= 2) {
        candidates.set(
          paper.paperRef,
          candidateFor(paper, reference, ["suggested_fuzzy_title"], score),
        );
      }
    }
  }

  return Array.from(candidates.values()).sort(candidateSort);
}

export function resolveReferenceWithPolicy(
  reference: ReferenceMatcherReferenceInput,
  index: ReferenceMatcherIndex,
  policy: ReferenceMatcherPolicyId = "production",
): ReferenceMatcherResult {
  const config = policyConfig(policy);
  for (const identifier of referenceIdentifiers(
    reference,
    config.rawIdentifiers,
  )) {
    const candidates = index.identifiers.get(identityKey(identifier)) || [];
    const unique = uniqueCandidate(candidates);
    if (unique) {
      return {
        status: "matched",
        targetPaperRef: unique.paperRef,
        confidence: "deterministic",
        diagnostics: [
          {
            code: "reference_identifier_match",
            kind: identifier.kind,
            policy,
          },
        ],
        suggestedCandidates: [
          candidateFor(unique, reference, [`identifier:${identifier.kind}`], 1),
        ],
      };
    }
    if (candidates.length > 1) {
      return {
        status: "ambiguous",
        confidence: "review",
        diagnostics: [
          {
            code: "ambiguous_reference_identifier_match",
            kind: identifier.kind,
            candidates: candidates.map((paper) => paper.paperRef),
            policy,
          },
        ],
        suggestedCandidates: candidates
          .map((paper) =>
            candidateFor(
              paper,
              reference,
              [`identifier:${identifier.kind}`],
              1,
            ),
          )
          .sort(candidateSort)
          .slice(0, 3),
      };
    }
  }

  const candidates = titleCandidates(reference, index, config);
  const autoCandidates = candidates.filter((candidate) =>
    candidate.reasons.some((reason) =>
      [
        "exact_title_author_same_year",
        "exact_title_author_year_delta",
        "compact_title_author_year_delta",
        "exact_title_author",
        "stripped_exact_title_author",
        "compact_title_author",
        "stripped_compact_title_author",
        "strong_compact_title_exact",
        "stripped_strong_compact_title_exact",
        "guarded_fuzzy_title",
      ].includes(reason),
    ),
  );
  const uniqueAuto = uniqueCandidate(
    autoCandidates
      .map((candidate) =>
        index.papers.find((paper) => paper.paperRef === candidate.paperRef),
      )
      .filter((paper): paper is ReferenceMatcherPaperInput => Boolean(paper)),
  );
  if (uniqueAuto && autoCandidates.length === 1) {
    const candidate = autoCandidates[0]!;
    const deterministicTitleMatch = candidate.reasons.some((reason) =>
      [
        "strong_compact_title_exact",
        "stripped_strong_compact_title_exact",
      ].includes(reason),
    );
    return {
      status: "matched",
      targetPaperRef: uniqueAuto.paperRef,
      confidence: deterministicTitleMatch ? "deterministic" : "low",
      diagnostics: [
        {
          code: "reference_title_match",
          reasons: candidate.reasons,
          policy,
        },
      ],
      suggestedCandidates: [candidate],
    };
  }

  return {
    status: candidates.length > 1 ? "ambiguous" : "unmatched",
    confidence: "review",
    diagnostics: [
      {
        code: candidates.length
          ? "reference_match_suggestions"
          : "needs_resolution_review",
        policy,
        suggested_candidates: candidates.slice(0, 3),
      },
    ],
    suggestedCandidates: candidates.slice(0, 3),
  };
}

function scoreValue(value: number) {
  return Number.isFinite(value) ? Number(value.toFixed(4)) : 0;
}

function titleContains(left: string, right: string) {
  const a = normalizeSynthesisLiteratureTitle(left);
  const b = normalizeSynthesisLiteratureTitle(right);
  return Boolean(a && b && a.includes(b));
}

export function evaluateReferenceResolutionFixture(
  fixture: ReferenceResolutionFixture,
  policy: ReferenceMatcherPolicyId,
): ReferenceResolutionEvaluationResult {
  const index = buildReferenceMatcherIndex(fixture.library.papers);
  const labels = new Map(
    fixture.goldLabels.labels.map((label) => [
      label.reference_instance_id,
      label,
    ]),
  );
  const dangerPairs = fixture.dangerPairs?.pairs || [];
  let truePositive = 0;
  let falsePositive = 0;
  let falseNegative = 0;
  let candidateAt1 = 0;
  let candidateAt3 = 0;
  let candidateTargets = 0;
  let dangerFalsePositive = 0;
  const falsePositiveIds: string[] = [];
  const falseNegativeIds: string[] = [];

  for (const reference of fixture.references.references) {
    const id = cleanString(
      reference.referenceInstanceId || reference.reference_instance_id,
    );
    const label = labels.get(id);
    if (!label) {
      continue;
    }
    const result = resolveReferenceWithPolicy(reference, index, policy);
    const autoTarget = result.status === "matched" ? result.targetPaperRef : "";
    const autoTargetKey = itemKeyOf(
      fixture.library.papers.find(
        (paper) => paperRefOf(paper) === autoTarget,
      ) || ({} as ReferenceMatcherPaperInput),
    );
    const expectedKey = cleanString(label.target_item_key);
    const expectedMatch = label.label === "match" && expectedKey;

    if (expectedKey) {
      candidateTargets += 1;
      const suggestionKeys = result.suggestedCandidates.map(
        (candidate) => candidate.itemKey || "",
      );
      if (suggestionKeys[0] === expectedKey || autoTargetKey === expectedKey) {
        candidateAt1 += 1;
      }
      if (
        suggestionKeys.slice(0, 3).includes(expectedKey) ||
        autoTargetKey === expectedKey
      ) {
        candidateAt3 += 1;
      }
    }

    if (expectedMatch && autoTargetKey === expectedKey) {
      truePositive += 1;
    } else if (
      autoTargetKey &&
      (!expectedMatch || autoTargetKey !== expectedKey)
    ) {
      falsePositive += 1;
      falsePositiveIds.push(id);
    } else if (expectedMatch) {
      falseNegative += 1;
      falseNegativeIds.push(id);
    }

    const refTitle = cleanString(
      reference.title || reference.parsedTitle || reference.parsed_title,
    );
    for (const pair of dangerPairs) {
      if (
        autoTargetKey === pair.candidate_item_key &&
        titleContains(refTitle, pair.reference_title)
      ) {
        dangerFalsePositive += 1;
      }
    }
  }

  const precision = truePositive / Math.max(1, truePositive + falsePositive);
  const recall = truePositive / Math.max(1, truePositive + falseNegative);
  const f1 = (2 * precision * recall) / Math.max(0.0001, precision + recall);
  return {
    policy,
    total: fixture.references.references.length,
    truePositive,
    falsePositive,
    falseNegative,
    precision: scoreValue(precision),
    recall: scoreValue(recall),
    f1: scoreValue(f1),
    candidateAt1Recall: scoreValue(
      candidateAt1 / Math.max(1, candidateTargets),
    ),
    candidateAt3Recall: scoreValue(
      candidateAt3 / Math.max(1, candidateTargets),
    ),
    dangerFalsePositive,
    falsePositiveIds: falsePositiveIds.sort(),
    falseNegativeIds: falseNegativeIds.sort(),
  };
}

export function referenceMatcherFingerprint(value: unknown) {
  return hashCanonicalJson(value);
}
