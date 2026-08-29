import {
  canonicalizeSynthesisEngineJson,
  compareSynthesisEngineStrings,
  hashSynthesisEngineCanonicalJson,
} from "./canonicalJson.ts";

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
  isbn?: string;
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
  isbn?: string;
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
  status: "matched" | "suggested" | "unmatched" | "ambiguous";
  targetPaperRef?: string;
  confidence: "deterministic" | "high" | "low" | "review";
  diagnostics: unknown[];
  suggestedCandidates: ReferenceMatcherCandidate[];
};

export type ReferenceCanonicalDedupeInput = {
  canonicalReferenceId: string;
  title?: string;
  normalizedTitle?: string;
  year?: string;
  authors?: string[];
  acceptedBinding?: boolean;
  stickyRepresentative?: boolean;
  rawReferenceIds?: string[];
  rawHashes?: string[];
  rawReferences?: string[];
  sourceRefs?: string[];
  identifiers?: ReferenceMatcherIdentifier[];
  titleCandidates?: ReferenceCanonicalDedupeTitleCandidate[];
};

export type ReferenceCanonicalDedupeTitleCandidate = {
  title: string;
  normalizedTitle?: string;
  year?: string;
  authors?: string[];
  identifiers?: ReferenceMatcherIdentifier[];
  rawReferenceIds?: string[];
  sourceCanonicalReferenceId?: string;
  source:
    | "input"
    | "effective_canonical"
    | "physical_canonical"
    | "raw_reference";
  frequency?: number;
};

export type ReferenceCanonicalDedupeClusterEdgeType =
  | "identifier_exact"
  | "exact_normalized_title_year"
  | "exact_compact_title_year"
  | "typo_equivalent_title"
  | "contained_bibliographic_noise"
  | "contained_author_noise"
  | "contained_extension_risk"
  | "weak_fuzzy_title";

export type ReferenceCanonicalDedupeEdge = {
  edgeId: string;
  sourceCanonicalReferenceId: string;
  targetCanonicalReferenceId: string;
  edgeType: ReferenceCanonicalDedupeClusterEdgeType;
  confidence: "deterministic" | "high" | "low" | "review";
  score: number;
  reasons: string[];
  riskSignals: string[];
  evidence: Record<string, unknown>;
};

export type ReferenceCanonicalDedupeClusterAction = {
  actionId: string;
  action: "redirect" | "review";
  sourceCanonicalReferenceId: string;
  targetCanonicalReferenceId: string;
  clusterId: string;
  subclusterId: string;
  edgeType: ReferenceCanonicalDedupeClusterEdgeType;
  confidence: "deterministic" | "high" | "low" | "review";
  score: number;
  reasons: string[];
  riskSignals: string[];
  evidence: Record<string, unknown>;
};

export type ReferenceCanonicalDedupeCluster = {
  clusterId: string;
  canonicalReferenceIds: string[];
  representativeCanonicalReferenceId: string;
  representativeRationale: string[];
  members: Array<{
    canonicalReferenceId: string;
    title: string;
    normalizedTitle: string;
    year: string;
    rawCount: number;
    stickyRepresentative: boolean;
    acceptedBinding: boolean;
    eligibility: ReferenceCanonicalDedupeEligibility;
    eligibilityReasons: string[];
    titleCandidateCount: number;
    selectedTitleCandidate?: ReferenceCanonicalDedupeTitleCandidate;
    titleCandidates: ReferenceCanonicalDedupeTitleCandidate[];
    representativeRationale: string[];
  }>;
  subclusters: Array<{
    subclusterId: string;
    canonicalReferenceIds: string[];
    representativeCanonicalReferenceId: string;
    edgeTypes: ReferenceCanonicalDedupeClusterEdgeType[];
    deterministic: boolean;
    representativeRationale: string[];
  }>;
};

export type ReferenceCanonicalDedupeEligibility =
  | "eligible"
  | "weak"
  | "excluded";

export type ReferenceCanonicalDedupeClusteredResult = {
  clusters: ReferenceCanonicalDedupeCluster[];
  edges: ReferenceCanonicalDedupeEdge[];
  actions: ReferenceCanonicalDedupeClusterAction[];
  diagnostics: unknown[];
  counters: {
    canonical_count: number;
    block_count: number;
    block_skipped_count: number;
    candidate_pair_count: number;
    candidate_pair_budget: number;
    edge_count: number;
    cluster_count: number;
    subcluster_count: number;
    redirect_action_count: number;
    review_action_count: number;
    extension_risk_edge_count: number;
    weak_record_count: number;
    excluded_record_count: number;
  };
};

export type ReferenceMatcherIndex = {
  papers: ReferenceMatcherPaperInput[];
  identifiers: Map<string, ReferenceMatcherPaperInput[]>;
  title: Map<string, ReferenceMatcherPaperInput[]>;
  compactTitle: Map<string, ReferenceMatcherPaperInput[]>;
  strongCompactTitle: Map<string, ReferenceMatcherPaperInput[]>;
  paperFeatures: Map<string, ReferenceMatcherPaperFeature>;
  authorTokenIndex: Map<string, ReferenceMatcherPaperInput[]>;
};

export type ReferenceMatcherPaperFeature = {
  paperRef: string;
  normalizedTitle: string;
  authorTokens: Set<string>;
  yearNumber: number | null;
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
    compareSynthesisEngineStrings(String(left), String(right)),
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
    compareSynthesisEngineStrings(identityKey(left), identityKey(right)),
  );
}

function paperIdentifiers(
  paper: ReferenceMatcherPaperInput,
): ReferenceMatcherIdentifier[] {
  const identifiers: ReferenceMatcherIdentifier[] = [];
  addIdentity(identifiers, "doi", paper.doi);
  addIdentity(identifiers, "arxiv", paper.arxiv);
  addIdentity(identifiers, "isbn", paper.isbn);
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
  addIdentity(identifiers, "isbn", reference.isbn);
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
      compareSynthesisEngineStrings(left.normalized, right.normalized),
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

function numericYear(value: unknown) {
  const text = cleanString(value);
  if (!text) {
    return null;
  }
  const year = Number(text);
  return Number.isFinite(year) ? year : null;
}

function yearDelta(left: unknown, right: unknown) {
  const a = numericYear(left);
  const b = numericYear(right);
  return a !== null && b !== null ? Math.abs(a - b) : 999;
}

function compatibleYearEvidence(
  leftYear: number | null,
  rightYear: number | null,
) {
  return (
    leftYear === null ||
    rightYear === null ||
    Math.abs(leftYear - rightYear) <= 2
  );
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

function titleSimilarity(left: string, right: string, minimumScore = 0) {
  if (!left || !right) {
    return 0;
  }
  let source = left;
  let target = right;
  if (target.length > source.length) {
    [source, target] = [target, source];
  }
  const n = source.length;
  const m = target.length;
  const maxLength = Math.max(n, m);
  const maxDistance =
    minimumScore > 0 ? Math.floor((1 - minimumScore) * maxLength) : maxLength;
  if (minimumScore > 0 && Math.abs(n - m) > maxDistance) {
    return 0;
  }
  let previous = Array.from({ length: m + 1 }, (_, index) => index);
  let current = new Array<number>(m + 1);
  for (let i = 1; i <= n; i += 1) {
    current[0] = i;
    for (let j = 1; j <= m; j += 1) {
      const cost = source[i - 1] === target[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j]! + 1,
        current[j - 1]! + 1,
        previous[j - 1]! + cost,
      );
    }
    [previous, current] = [current, previous];
  }
  return 1 - previous[m]! / maxLength;
}

function tokenDice(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) {
    return 0;
  }
  let overlap = 0;
  for (const token of left) {
    if (right.has(token)) {
      overlap += 1;
    }
  }
  return (2 * overlap) / (left.size + right.size);
}

const FUZZY_STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "of",
  "for",
  "with",
  "and",
  "or",
  "to",
  "in",
  "on",
  "by",
  "from",
  "via",
  "using",
  "based",
  "towards",
  "toward",
  "end",
  "real",
  "time",
]);

function contentTokens(value: string) {
  return normalizeSynthesisLiteratureTitle(value)
    .split(/\s+/)
    .filter(
      (token) =>
        token.length >= 2 &&
        !FUZZY_STOP_WORDS.has(token) &&
        !/^\d+$/.test(token),
    );
}

function firstTokens(tokens: string[], count: number) {
  return tokens.slice(0, count).join(" ");
}

function lastTokens(tokens: string[], count: number) {
  return tokens.slice(Math.max(0, tokens.length - count)).join(" ");
}

function hasKnownDangerSignal(left: string, right: string) {
  const pairs = [
    ["transtrack multiple object tracking with transformer", "motr"],
    ["fast segment anything", "segment anything"],
    ["sparse r cnn", "sparse detr"],
    ["yolact", "yolact"],
  ];
  const a = normalizeSynthesisLiteratureTitle(left);
  const b = normalizeSynthesisLiteratureTitle(right);
  for (const [leftDanger, rightDanger] of pairs) {
    if (
      ((a.includes(leftDanger) && b.includes(rightDanger)) ||
        (b.includes(leftDanger) && a.includes(rightDanger))) &&
      a !== b
    ) {
      return true;
    }
  }
  return false;
}

type CanonicalDedupeRecord = {
  canonicalReferenceId: string;
  title: string;
  normalizedTitle: string;
  year: string;
  authors: string[];
  acceptedBinding: boolean;
  stickyRepresentative: boolean;
  eligibility: ReferenceCanonicalDedupeEligibility;
  eligibilityReasons: string[];
  noiseProfile: BibliographicNoiseProfile;
  rawReferenceIds: string[];
  rawHashes: string[];
  rawReferences: string[];
  sourceRefs: string[];
  identifiers: ReferenceMatcherIdentifier[];
  identifierKeys: string[];
  strongIdentifierKeys: string[];
  contentTokens: string[];
  tokenSet: Set<string>;
  strongCompactTitle: string;
  compactTitle: string;
  rawCount: number;
  titleCandidates: ReferenceCanonicalDedupeTitleCandidate[];
  selectedTitleCandidate: ReferenceCanonicalDedupeTitleCandidate;
};

type BibliographicNoiseProfile = {
  coreMarkerCount: number;
  weakVenueCount: number;
  hasDoiOrArxiv: boolean;
  hasProceedingsPhrase: boolean;
  hasPageMarker: boolean;
  hasVolumeIssuePagePattern: boolean;
  hasYearSuffix: boolean;
  hasPublisherOrEditorPhrase: boolean;
  score: number;
  reasons: string[];
};

const CORE_BIBLIOGRAPHIC_MARKERS = new Set([
  "arxiv",
  "doi",
  "preprint",
  "proceedings",
  "conference",
  "journal",
  "transactions",
  "pages",
  "page",
  "pp",
  "vol",
  "volume",
  "no",
  "number",
  "eds",
  "editor",
  "editors",
  "publisher",
]);

const WEAK_VENUE_MARKERS = new Set([
  "cvpr",
  "iccv",
  "eccv",
  "neurips",
  "nips",
  "iclr",
  "aaai",
  "ijcai",
  "wacv",
  "bmvc",
  "pami",
  "ieee",
  "acm",
  "springer",
  "sensors",
  "remote",
  "sensing",
]);

function bibliographicNoiseProfile(
  normalizedTitle: string,
): BibliographicNoiseProfile {
  const tokens = normalizeSynthesisLiteratureTitle(normalizedTitle)
    .split(/\s+/)
    .filter(Boolean);
  const tokenSet = new Set(tokens);
  const hasDoiOrArxiv =
    /\b(?:arxiv|doi|preprint)\b/u.test(normalizedTitle) ||
    /(?:10\.\d{4,9}\/|doi\s+org)/u.test(normalizedTitle);
  const hasProceedingsPhrase = /\b(?:in\s+)?proceedings\b/u.test(
    normalizedTitle,
  );
  const hasPageMarker = /\b(?:pp|pages?|p)\s*\d+\b/u.test(normalizedTitle);
  const hasVolumeIssuePagePattern =
    /\b[a-z][a-z0-9-]*\s+\d{1,4}\s+\d{1,4}\s+\d{1,6}\b/u.test(
      normalizedTitle,
    ) || /\b(?:vol|volume|no|number)\s+\d+\b/u.test(normalizedTitle);
  const hasYearSuffix = /\b(?:19|20)\d{2}\s*$/u.test(normalizedTitle);
  const hasPublisherOrEditorPhrase =
    /\b(?:eds?|editors?|publisher|springer|ieee|acm)\b/u.test(normalizedTitle);
  const coreMarkerCount = tokens.filter((token) =>
    CORE_BIBLIOGRAPHIC_MARKERS.has(token),
  ).length;
  const weakVenueCount = tokens.filter((token) =>
    WEAK_VENUE_MARKERS.has(token),
  ).length;
  const reasons = [
    hasDoiOrArxiv && "doi_or_arxiv_suffix",
    hasProceedingsPhrase && "proceedings_phrase",
    hasPageMarker && "page_marker",
    hasVolumeIssuePagePattern && "volume_issue_page_pattern",
    hasYearSuffix && "year_suffix",
    hasPublisherOrEditorPhrase && "publisher_or_editor_phrase",
    coreMarkerCount > 0 && "core_bibliographic_marker",
    weakVenueCount > 0 && "weak_venue_marker",
  ].filter((reason): reason is string => Boolean(reason));
  const score =
    (hasDoiOrArxiv ? 4 : 0) +
    (hasProceedingsPhrase ? 3 : 0) +
    (hasPageMarker ? 3 : 0) +
    (hasVolumeIssuePagePattern ? 3 : 0) +
    (hasPublisherOrEditorPhrase ? 2 : 0) +
    (hasYearSuffix ? 1 : 0) +
    Math.min(coreMarkerCount, 3) * 2 +
    Math.min(weakVenueCount, 2);
  return {
    coreMarkerCount,
    weakVenueCount,
    hasDoiOrArxiv,
    hasProceedingsPhrase,
    hasPageMarker,
    hasVolumeIssuePagePattern,
    hasYearSuffix,
    hasPublisherOrEditorPhrase,
    score,
    reasons: uniqueSorted(reasons),
  };
}

function titleNoisePenalty(normalizedTitle: string) {
  const noise = bibliographicNoiseProfile(normalizedTitle);
  const words = wordCount(normalizedTitle);
  const length = strongCompactSynthesisLiteratureTitle(normalizedTitle).length;
  const fusedTokenPenalty = /\b(?:offreebies|bagoffreebies)\b/u.test(
    normalizedTitle,
  )
    ? 18
    : 0;
  const authorPrefixPenalty =
    /^[a-z]+(?:\s+[a-z]\b|\s+[a-z]+,|\s+[a-z]+){2,8}\s+/u.test(normalizedTitle)
      ? 12
      : 0;
  return (
    fusedTokenPenalty +
    noise.score * 8 +
    authorPrefixPenalty +
    Math.max(0, words - 12) * 3 +
    Math.max(0, length - 110) / 5
  );
}

function normalizeTitleCandidate(
  candidate: ReferenceCanonicalDedupeTitleCandidate,
): ReferenceCanonicalDedupeTitleCandidate | null {
  const title = cleanString(candidate.title);
  const normalizedTitle =
    cleanString(candidate.normalizedTitle) ||
    normalizeSynthesisLiteratureTitle(title);
  const tokens = contentTokens(normalizedTitle || title);
  if (!title || !normalizedTitle || tokens.length < 2) {
    return null;
  }
  return {
    ...candidate,
    title,
    normalizedTitle,
    year: cleanString(candidate.year),
    authors: uniqueSorted(
      (candidate.authors || []).map(cleanString).filter(Boolean),
    ),
    identifiers: dedupeIdentifiers(
      (candidate.identifiers || [])
        .map((identifier) =>
          normalizeReferenceIdentifier(identifier.kind, identifier.value),
        )
        .filter((identifier): identifier is ReferenceMatcherIdentifier =>
          Boolean(identifier),
        ),
    ),
    rawReferenceIds: uniqueSorted(candidate.rawReferenceIds || []),
    sourceCanonicalReferenceId: cleanString(
      candidate.sourceCanonicalReferenceId,
    ),
    frequency: Math.max(1, Math.floor(Number(candidate.frequency) || 1)),
  };
}

function titleCandidateQuality(
  candidate: ReferenceCanonicalDedupeTitleCandidate,
) {
  const normalizedTitle =
    cleanString(candidate.normalizedTitle) ||
    normalizeSynthesisLiteratureTitle(candidate.title);
  const tokens = contentTokens(normalizedTitle);
  const compactLength =
    strongCompactSynthesisLiteratureTitle(normalizedTitle).length;
  const frequencySupport = Math.min(
    4,
    Math.log2(Math.max(1, Number(candidate.frequency) || 1) + 1),
  );
  return (
    Math.min(tokens.length, 12) * 4 +
    Math.min(compactLength, 90) / 8 +
    Math.min((candidate.authors || []).length, 6) * 1.5 +
    (candidate.year ? 2 : 0) +
    Math.min((candidate.identifiers || []).length, 2) * 2 +
    frequencySupport -
    titleNoisePenalty(normalizedTitle)
  );
}

function chooseTitleCandidate(
  input: ReferenceCanonicalDedupeInput,
): ReferenceCanonicalDedupeTitleCandidate | null {
  const candidates = [
    {
      title: cleanString(input.title),
      normalizedTitle: cleanString(input.normalizedTitle),
      year: cleanString(input.year),
      authors: input.authors,
      identifiers: input.identifiers,
      rawReferenceIds: input.rawReferenceIds,
      source: "input" as const,
      frequency: Math.max(1, (input.rawReferenceIds || []).length),
    },
    ...(input.titleCandidates || []),
  ]
    .map(normalizeTitleCandidate)
    .filter((candidate): candidate is ReferenceCanonicalDedupeTitleCandidate =>
      Boolean(candidate),
    );
  return (
    candidates
      .slice()
      .sort(
        (left, right) =>
          titleCandidateQuality(right) - titleCandidateQuality(left) ||
          compareSynthesisEngineStrings(
            cleanString(left.title),
            cleanString(right.title),
          ),
      )[0] || null
  );
}

function canonicalEligibility(args: {
  normalizedTitle: string;
  contentTokens: string[];
  authors: string[];
  identifiers: ReferenceMatcherIdentifier[];
  noiseProfile: BibliographicNoiseProfile;
}): {
  eligibility: ReferenceCanonicalDedupeEligibility;
  reasons: string[];
} {
  const {
    normalizedTitle,
    contentTokens: tokens,
    authors,
    identifiers,
    noiseProfile,
  } = args;
  const reasons: string[] = [];
  if (
    /^(?:https?\s+)?(?:dx\s+)?doi\s+org\s+|^doi\s+|^10\s+\d{4,9}\s+/u.test(
      normalizedTitle,
    )
  ) {
    reasons.push("bare_doi_or_url_title");
  }
  if (/^(?:https?|www)\b/u.test(normalizedTitle)) {
    reasons.push("bare_url_title");
  }
  if (tokens.length < 3) {
    reasons.push("too_few_content_tokens");
  }
  if (
    authors.length >= 2 &&
    tokens.length <= 8 &&
    tokenDice(new Set(tokens), authorTokens(authors)) >= 0.65
  ) {
    reasons.push("mostly_author_tokens");
  }
  if (noiseProfile.score >= 8 && tokens.length <= 6) {
    reasons.push("mostly_bibliographic_metadata");
  }
  if (
    reasons.some((reason) => reason.startsWith("bare_")) ||
    reasons.includes("too_few_content_tokens")
  ) {
    return { eligibility: "excluded", reasons: uniqueSorted(reasons) };
  }
  if (reasons.length || noiseProfile.score >= 6) {
    return {
      eligibility: "weak",
      reasons: uniqueSorted([
        ...reasons,
        ...(noiseProfile.score >= 6 ? ["bibliographic_noise_heavy"] : []),
      ]),
    };
  }
  return { eligibility: "eligible", reasons: [] };
}

function canonicalDedupeRecord(
  input: ReferenceCanonicalDedupeInput,
): CanonicalDedupeRecord | null {
  const canonicalReferenceId = cleanString(input.canonicalReferenceId);
  const selectedTitleCandidate = chooseTitleCandidate(input);
  const title =
    cleanString(selectedTitleCandidate?.title) || cleanString(input.title);
  const normalized =
    cleanString(selectedTitleCandidate?.normalizedTitle) ||
    cleanString(input.normalizedTitle) ||
    normalizeSynthesisLiteratureTitle(title);
  const tokens = contentTokens(normalized || title);
  if (!canonicalReferenceId || !normalized || tokens.length < 2) {
    return null;
  }
  const titleCandidates = [
    {
      title,
      normalizedTitle: normalized,
      year: cleanString(input.year),
      authors: input.authors,
      identifiers: input.identifiers,
      rawReferenceIds: input.rawReferenceIds,
      source: "input" as const,
      frequency: Math.max(1, (input.rawReferenceIds || []).length),
    },
    ...(input.titleCandidates || []),
  ]
    .map(normalizeTitleCandidate)
    .filter((candidate): candidate is ReferenceCanonicalDedupeTitleCandidate =>
      Boolean(candidate),
    );
  const candidateIdentifiers = titleCandidates.flatMap(
    (candidate) => candidate.identifiers || [],
  );
  const candidateAuthors = titleCandidates.flatMap(
    (candidate) => candidate.authors || [],
  );
  const explicitIdentifiers = (input.identifiers || [])
    .map((identifier) =>
      normalizeReferenceIdentifier(identifier.kind, identifier.value),
    )
    .filter((identifier): identifier is ReferenceMatcherIdentifier =>
      Boolean(identifier),
    );
  const identifiers = dedupeIdentifiers([
    ...explicitIdentifiers,
    ...candidateIdentifiers,
    ...extractReferenceIdentifiersFromText(
      title,
      normalized,
      ...(input.rawReferences || []),
    ),
  ]);
  const noiseProfile = bibliographicNoiseProfile(normalized);
  const eligibility = canonicalEligibility({
    normalizedTitle: normalized,
    contentTokens: tokens,
    authors: uniqueSorted([...(input.authors || []), ...candidateAuthors]),
    identifiers,
    noiseProfile,
  });
  return {
    canonicalReferenceId,
    title: title || normalized,
    normalizedTitle: normalized,
    year: cleanString(input.year),
    authors: uniqueSorted([...(input.authors || []), ...candidateAuthors]),
    acceptedBinding: Boolean(input.acceptedBinding),
    stickyRepresentative: Boolean(input.stickyRepresentative),
    eligibility: eligibility.eligibility,
    eligibilityReasons: eligibility.reasons,
    noiseProfile,
    rawReferenceIds: uniqueSorted(input.rawReferenceIds || []),
    rawHashes: uniqueSorted(input.rawHashes || []),
    rawReferences: uniqueSorted(input.rawReferences || []).slice(0, 3),
    sourceRefs: uniqueSorted(input.sourceRefs || []),
    identifiers,
    identifierKeys: identifiers.map(identityKey),
    strongIdentifierKeys: identifiers
      .filter(
        (identifier) =>
          identifier.kind === "doi" || identifier.kind === "arxiv",
      )
      .map(identityKey),
    contentTokens: tokens,
    tokenSet: new Set(tokens),
    strongCompactTitle: strongCompactSynthesisLiteratureTitle(normalized),
    compactTitle: compactSynthesisLiteratureTitle(normalized),
    rawCount: Math.max(1, (input.rawReferenceIds || []).length),
    titleCandidates,
    selectedTitleCandidate: selectedTitleCandidate || titleCandidates[0]!,
  };
}

function cappedRawSupport(record: CanonicalDedupeRecord) {
  return Math.min(3, Math.log2(record.rawCount + 1));
}

function canonicalTitleQuality(record: CanonicalDedupeRecord) {
  const words = wordCount(record.normalizedTitle);
  const length = record.strongCompactTitle.length;
  return (
    Math.min(words, 12) * 4 +
    Math.min(length, 90) / 8 +
    Math.min(record.authors.length, 8) * 1.5 +
    record.identifiers.length * 2 +
    (record.year ? 3 : 0) +
    cappedRawSupport(record) -
    titleNoisePenalty(record.normalizedTitle)
  );
}

function representativeQualityScore(record: CanonicalDedupeRecord) {
  return (
    canonicalTitleQuality(record) -
    titleNoisePenalty(record.normalizedTitle) * 2
  );
}

function chooseCanonicalRepresentative(records: CanonicalDedupeRecord[]) {
  return records
    .slice()
    .sort(
      (left, right) =>
        Number(right.stickyRepresentative) -
          Number(left.stickyRepresentative) ||
        Number(right.acceptedBinding) - Number(left.acceptedBinding) ||
        representativeQualityScore(right) - representativeQualityScore(left) ||
        right.strongIdentifierKeys.length - left.strongIdentifierKeys.length ||
        right.authors.length - left.authors.length ||
        cappedRawSupport(right) - cappedRawSupport(left) ||
        compareSynthesisEngineStrings(
          left.canonicalReferenceId,
          right.canonicalReferenceId,
        ),
    )[0];
}

function strongRetargetAllowed(
  sticky: CanonicalDedupeRecord,
  candidate: CanonicalDedupeRecord,
  edges: ReferenceCanonicalDedupeEdge[],
) {
  if (
    !compatibleYear(sticky, candidate) ||
    identifierConflict([sticky, candidate])
  ) {
    return false;
  }
  if (hasKnownDangerSignal(sticky.normalizedTitle, candidate.normalizedTitle)) {
    return false;
  }
  const pairEdges = edges.filter(
    (edge) =>
      (edge.sourceCanonicalReferenceId === sticky.canonicalReferenceId &&
        edge.targetCanonicalReferenceId === candidate.canonicalReferenceId) ||
      (edge.sourceCanonicalReferenceId === candidate.canonicalReferenceId &&
        edge.targetCanonicalReferenceId === sticky.canonicalReferenceId),
  );
  if (pairEdges.some((edge) => edge.edgeType === "identifier_exact")) {
    return true;
  }
  return (
    sticky.strongIdentifierKeys.length === 0 &&
    candidate.strongIdentifierKeys.length > 0 &&
    pairEdges.some(
      (edge) =>
        edge.edgeType === "exact_normalized_title_year" ||
        edge.edgeType === "exact_compact_title_year",
    )
  );
}

function recordEvidenceSummary(record: CanonicalDedupeRecord) {
  return {
    canonicalReferenceId: record.canonicalReferenceId,
    title: record.title,
    normalizedTitle: record.normalizedTitle,
    year: record.year,
    rawCount: record.rawCount,
    stickyRepresentative: record.stickyRepresentative,
    acceptedBinding: record.acceptedBinding,
    eligibility: record.eligibility,
    eligibilityReasons: record.eligibilityReasons,
    noiseProfile: record.noiseProfile,
    titleCandidateCount: record.titleCandidates.length,
    selectedTitleCandidate: record.selectedTitleCandidate,
    titleCandidates: record.titleCandidates.slice(0, 12),
    representativeRationale: titleCleanlinessReasons(record),
  };
}

function clusterRepresentativeRanking(
  records: CanonicalDedupeRecord[],
  edges: ReferenceCanonicalDedupeEdge[],
) {
  const noiseShorterBoost = new Map<string, number>();
  const noiseLongerPenalty = new Map<string, number>();
  for (const edge of edges) {
    if (
      edge.edgeType !== "contained_bibliographic_noise" &&
      edge.edgeType !== "contained_author_noise"
    ) {
      continue;
    }
    const shorter = cleanString(edge.evidence.shorter_canonical_reference_id);
    const longer = cleanString(edge.evidence.longer_canonical_reference_id);
    if (shorter) {
      noiseShorterBoost.set(
        shorter,
        (noiseShorterBoost.get(shorter) || 0) + 18,
      );
    }
    if (longer) {
      noiseLongerPenalty.set(
        longer,
        (noiseLongerPenalty.get(longer) || 0) + 20,
      );
    }
  }
  return records.slice().sort((left, right) => {
    const leftScore =
      representativeQualityScore(left) +
      (noiseShorterBoost.get(left.canonicalReferenceId) || 0) -
      (noiseLongerPenalty.get(left.canonicalReferenceId) || 0);
    const rightScore =
      representativeQualityScore(right) +
      (noiseShorterBoost.get(right.canonicalReferenceId) || 0) -
      (noiseLongerPenalty.get(right.canonicalReferenceId) || 0);
    return (
      Number(right.acceptedBinding) - Number(left.acceptedBinding) ||
      rightScore - leftScore ||
      right.strongIdentifierKeys.length - left.strongIdentifierKeys.length ||
      right.authors.length - left.authors.length ||
      cappedRawSupport(right) - cappedRawSupport(left) ||
      compareSynthesisEngineStrings(
        left.canonicalReferenceId,
        right.canonicalReferenceId,
      )
    );
  });
}

function chooseClusterRepresentative(
  records: CanonicalDedupeRecord[],
  edges: ReferenceCanonicalDedupeEdge[],
) {
  const ranked = clusterRepresentativeRanking(records, edges);
  const candidate = ranked[0];
  const sticky = records
    .filter((record) => record.stickyRepresentative)
    .sort(
      (left, right) =>
        Number(right.acceptedBinding) - Number(left.acceptedBinding) ||
        right.strongIdentifierKeys.length - left.strongIdentifierKeys.length ||
        canonicalTitleQuality(right) - canonicalTitleQuality(left) ||
        compareSynthesisEngineStrings(
          left.canonicalReferenceId,
          right.canonicalReferenceId,
        ),
    )[0];
  if (
    sticky &&
    candidate &&
    sticky.canonicalReferenceId !== candidate.canonicalReferenceId &&
    !strongRetargetAllowed(sticky, candidate, edges)
  ) {
    return sticky;
  }
  return candidate;
}

function representativeRetargetReviewCandidate(
  representative: CanonicalDedupeRecord,
  records: CanonicalDedupeRecord[],
  edges: ReferenceCanonicalDedupeEdge[],
) {
  if (!representative.stickyRepresentative) {
    return null;
  }
  const candidate = clusterRepresentativeRanking(records, edges).find(
    (record) =>
      record.canonicalReferenceId !== representative.canonicalReferenceId,
  );
  if (!candidate || strongRetargetAllowed(representative, candidate, edges)) {
    return null;
  }
  const materiallyStronger =
    (candidate.acceptedBinding && !representative.acceptedBinding) ||
    candidate.strongIdentifierKeys.length >
      representative.strongIdentifierKeys.length;
  if (!materiallyStronger) {
    return null;
  }
  return candidate;
}

function identifierConflict(records: CanonicalDedupeRecord[]) {
  const byKind = new Map<string, Set<string>>();
  for (const record of records) {
    for (const identifier of record.identifiers) {
      if (identifier.kind !== "doi" && identifier.kind !== "arxiv") {
        continue;
      }
      byKind.set(identifier.kind, byKind.get(identifier.kind) || new Set());
      byKind.get(identifier.kind)!.add(identifier.value);
    }
  }
  return Array.from(byKind.values()).some((values) => values.size > 1);
}

function compatibleYear(
  left: CanonicalDedupeRecord,
  right: CanonicalDedupeRecord,
) {
  if (!left.year || !right.year) {
    return true;
  }
  return yearDelta(left.year, right.year) <= 1;
}

function containedStrongTitle(
  left: CanonicalDedupeRecord,
  right: CanonicalDedupeRecord,
) {
  const shorter =
    left.strongCompactTitle.length <= right.strongCompactTitle.length
      ? left
      : right;
  const longer = shorter === left ? right : left;
  if (
    shorter.contentTokens.length < 4 ||
    shorter.strongCompactTitle.length < 18
  ) {
    return false;
  }
  const ratio =
    shorter.strongCompactTitle.length /
    Math.max(1, longer.strongCompactTitle.length);
  return (
    ratio >= 0.25 &&
    longer.strongCompactTitle.includes(shorter.strongCompactTitle)
  );
}

function hasNumericBibliographicSuffix(record: CanonicalDedupeRecord) {
  const normalized = record.normalizedTitle;
  return /\b(?:\d{1,4}\s+){1,3}\d{1,5}$/u.test(normalized);
}

function classifyBibliographicSuffix(args: {
  extraTokens: string[];
  extraSuffixTokens: string[];
  longer: CanonicalDedupeRecord;
}) {
  const extraText = args.extraTokens.join(" ");
  const suffixText = args.extraSuffixTokens.join(" ");
  const extraProfile = bibliographicNoiseProfile(extraText);
  const suffixProfile = bibliographicNoiseProfile(suffixText);
  const numericBibliographicSuffix =
    args.extraSuffixTokens.length > 0 &&
    hasNumericBibliographicSuffix(args.longer);
  const structural =
    extraProfile.hasDoiOrArxiv ||
    suffixProfile.hasDoiOrArxiv ||
    extraProfile.hasProceedingsPhrase ||
    suffixProfile.hasProceedingsPhrase ||
    extraProfile.hasPageMarker ||
    suffixProfile.hasPageMarker ||
    extraProfile.hasVolumeIssuePagePattern ||
    suffixProfile.hasVolumeIssuePagePattern ||
    numericBibliographicSuffix;
  const weakVenueWithStructure =
    (extraProfile.weakVenueCount > 0 || suffixProfile.weakVenueCount > 0) &&
    (numericBibliographicSuffix ||
      extraProfile.hasProceedingsPhrase ||
      suffixProfile.hasProceedingsPhrase ||
      extraProfile.hasPageMarker ||
      suffixProfile.hasPageMarker);
  const bibliographic =
    structural ||
    weakVenueWithStructure ||
    extraProfile.coreMarkerCount >=
      Math.ceil(Math.max(1, args.extraTokens.length) * 0.5);
  return {
    bibliographic,
    reasons: uniqueSorted(
      [
        ...extraProfile.reasons,
        ...suffixProfile.reasons.map((reason) => `suffix_${reason}`),
        numericBibliographicSuffix ? "numeric_bibliographic_suffix" : "",
      ].filter(Boolean),
    ),
    score:
      extraProfile.score +
      suffixProfile.score +
      (numericBibliographicSuffix ? 3 : 0),
  };
}

const SEMANTIC_EXTENSION_TOKENS = new Set([
  "with",
  "using",
  "via",
  "under",
  "based",
  "supervision",
  "supervised",
  "weakly",
  "semi",
  "prompt",
  "point",
  "points",
  "open",
  "vocabulary",
  "multi",
  "modal",
  "domain",
  "adaptation",
]);

function edgePairId(left: string, right: string) {
  return [left, right]
    .sort((a, b) => compareSynthesisEngineStrings(a, b))
    .join("::");
}

function clusterStableId(prefix: string, ids: string[]) {
  return `${prefix}:${hashSynthesisEngineCanonicalJson(uniqueSorted(ids)).slice(0, 16)}`;
}

function sameYearOrUnknown(
  left: CanonicalDedupeRecord,
  right: CanonicalDedupeRecord,
) {
  return !left.year || !right.year || left.year === right.year;
}

function sameTitleYearGroupSafe(records: CanonicalDedupeRecord[]) {
  return (
    records.length > 1 &&
    !identifierConflict(records) &&
    !records.some((left) =>
      records.some(
        (right) =>
          left !== right &&
          hasKnownDangerSignal(left.normalizedTitle, right.normalizedTitle),
      ),
    )
  );
}

function sequenceIndex(haystack: string[], needle: string[]) {
  if (!needle.length || needle.length > haystack.length) {
    return -1;
  }
  for (let index = 0; index <= haystack.length - needle.length; index += 1) {
    if (needle.every((token, offset) => haystack[index + offset] === token)) {
      return index;
    }
  }
  return -1;
}

function titleCleanlinessReasons(record: CanonicalDedupeRecord) {
  const reasons: string[] = [];
  if (record.stickyRepresentative) {
    reasons.push("sticky_representative");
  }
  if (record.acceptedBinding) {
    reasons.push("accepted_binding");
  }
  if (record.strongIdentifierKeys.length) {
    reasons.push("strong_identifier");
  }
  if (record.noiseProfile.score < 3) {
    reasons.push("clean_title");
  }
  if (record.eligibility !== "eligible") {
    reasons.push(`eligibility_${record.eligibility}`);
  }
  if (record.titleCandidates.length > 1) {
    reasons.push("selected_from_title_candidates");
  }
  if (record.rawCount > 1) {
    reasons.push("raw_support_capped");
  }
  if (record.identifiers.length) {
    reasons.push("has_identifier");
  }
  if (record.authors.length) {
    reasons.push("has_authors");
  }
  if (record.year) {
    reasons.push("has_year");
  }
  return reasons.length ? reasons : ["stable_id_tiebreaker"];
}

function containedTitleDetails(
  left: CanonicalDedupeRecord,
  right: CanonicalDedupeRecord,
) {
  const shorter =
    left.strongCompactTitle.length <= right.strongCompactTitle.length
      ? left
      : right;
  const longer = shorter === left ? right : left;
  if (!containedStrongTitle(left, right)) {
    return null;
  }
  const shortTokens = shorter.contentTokens;
  const longTokens = longer.contentTokens;
  const start = sequenceIndex(longTokens, shortTokens);
  const extraPrefixTokens = start > 0 ? longTokens.slice(0, start) : [];
  const extraSuffixTokens =
    start >= 0 ? longTokens.slice(start + shortTokens.length) : [];
  const extraTokens =
    start >= 0
      ? [...extraPrefixTokens, ...extraSuffixTokens]
      : longTokens.filter((token) => !shorter.tokenSet.has(token));
  const authorTokensForPair = new Set([
    ...Array.from(authorTokens(shorter.authors)),
    ...Array.from(authorTokens(longer.authors)),
  ]);
  const semantic = extraTokens.filter((token) =>
    SEMANTIC_EXTENSION_TOKENS.has(token),
  );
  const bibliographic = classifyBibliographicSuffix({
    extraTokens,
    extraSuffixTokens,
    longer,
  });
  const authorNoise = extraTokens.filter((token) =>
    authorTokensForPair.has(token),
  );
  const authorPrefixLike =
    extraPrefixTokens.length >= 2 &&
    extraPrefixTokens.length <= 8 &&
    !bibliographic.bibliographic &&
    semantic.length === 0;
  let edgeType: ReferenceCanonicalDedupeClusterEdgeType =
    "contained_bibliographic_noise";
  const riskSignals: string[] = [];
  if (bibliographic.bibliographic) {
    edgeType = "contained_bibliographic_noise";
  } else if (authorNoise.length > 0 || authorPrefixLike) {
    edgeType = "contained_author_noise";
  } else if (semantic.length > 0) {
    edgeType = "contained_extension_risk";
    riskSignals.push("semantic_title_extension");
  } else if (!bibliographic.bibliographic && extraTokens.length > 0) {
    edgeType = "contained_extension_risk";
    riskSignals.push("unclassified_extra_title_tokens");
  }
  return {
    shorter,
    longer,
    extraTokens: uniqueSorted(extraTokens),
    extraPrefixTokens: uniqueSorted(extraPrefixTokens),
    extraSuffixTokens: uniqueSorted(extraSuffixTokens),
    edgeType,
    riskSignals,
    bibliographicReasons: bibliographic.reasons,
  };
}

function canonicalDedupeEdge(args: {
  left: CanonicalDedupeRecord;
  right: CanonicalDedupeRecord;
  edgeType: ReferenceCanonicalDedupeClusterEdgeType;
  confidence: ReferenceCanonicalDedupeEdge["confidence"];
  score: number;
  reasons: string[];
  riskSignals?: string[];
  evidence?: Record<string, unknown>;
}): ReferenceCanonicalDedupeEdge {
  const [source, target] = [args.left, args.right].sort((left, right) =>
    compareSynthesisEngineStrings(
      left.canonicalReferenceId,
      right.canonicalReferenceId,
    ),
  );
  const reasons = uniqueSorted(args.reasons);
  const riskSignals = uniqueSorted(args.riskSignals || []);
  const evidence = {
    source: {
      canonical_reference_id: source.canonicalReferenceId,
      title: source.title,
      selected_title_candidate: source.selectedTitleCandidate,
      normalized_title: source.normalizedTitle,
      year: source.year,
      raw_count: source.rawCount,
      raw_sample: source.rawReferences[0] || "",
    },
    target: {
      canonical_reference_id: target.canonicalReferenceId,
      title: target.title,
      selected_title_candidate: target.selectedTitleCandidate,
      normalized_title: target.normalizedTitle,
      year: target.year,
      raw_count: target.rawCount,
      raw_sample: target.rawReferences[0] || "",
    },
    token_dice: scoreValue(tokenDice(source.tokenSet, target.tokenSet)),
    year_delta: yearDelta(source.year, target.year),
    ...args.evidence,
  };
  return {
    edgeId: `edge:${hashSynthesisEngineCanonicalJson({
      source: source.canonicalReferenceId,
      target: target.canonicalReferenceId,
      edgeType: args.edgeType,
      reasons,
      riskSignals,
      evidence,
    }).slice(0, 24)}`,
    sourceCanonicalReferenceId: source.canonicalReferenceId,
    targetCanonicalReferenceId: target.canonicalReferenceId,
    edgeType: args.edgeType,
    confidence: args.confidence,
    score: scoreValue(args.score),
    reasons,
    riskSignals,
    evidence,
  };
}

function addClusterBlock(
  blocks: Map<string, Set<string>>,
  key: string,
  record: CanonicalDedupeRecord,
) {
  if (!key) {
    return;
  }
  blocks.set(key, blocks.get(key) || new Set());
  blocks.get(key)!.add(record.canonicalReferenceId);
}

function connectedComponents(
  records: CanonicalDedupeRecord[],
  edges: ReferenceCanonicalDedupeEdge[],
) {
  const adjacency = new Map<string, Set<string>>();
  for (const record of records) {
    adjacency.set(record.canonicalReferenceId, new Set());
  }
  for (const edge of edges) {
    adjacency
      .get(edge.sourceCanonicalReferenceId)
      ?.add(edge.targetCanonicalReferenceId);
    adjacency
      .get(edge.targetCanonicalReferenceId)
      ?.add(edge.sourceCanonicalReferenceId);
  }
  const seen = new Set<string>();
  const components: string[][] = [];
  for (const record of records) {
    const id = record.canonicalReferenceId;
    if (seen.has(id) || !adjacency.get(id)?.size) {
      continue;
    }
    const stack = [id];
    const component: string[] = [];
    seen.add(id);
    while (stack.length) {
      const next = stack.pop()!;
      component.push(next);
      for (const neighbor of adjacency.get(next) || []) {
        if (!seen.has(neighbor)) {
          seen.add(neighbor);
          stack.push(neighbor);
        }
      }
    }
    components.push(
      component.sort((left, right) =>
        compareSynthesisEngineStrings(left, right),
      ),
    );
  }
  return components.sort((left, right) =>
    compareSynthesisEngineStrings(left[0]!, right[0]!),
  );
}

function deterministicEdge(edge: ReferenceCanonicalDedupeEdge) {
  return (
    edge.edgeType === "identifier_exact" ||
    edge.edgeType === "exact_normalized_title_year" ||
    edge.edgeType === "exact_compact_title_year"
  );
}

function subclustersForComponent(
  componentIds: string[],
  edges: ReferenceCanonicalDedupeEdge[],
) {
  const adjacency = new Map(componentIds.map((id) => [id, new Set<string>()]));
  for (const edge of edges.filter(deterministicEdge)) {
    adjacency
      .get(edge.sourceCanonicalReferenceId)
      ?.add(edge.targetCanonicalReferenceId);
    adjacency
      .get(edge.targetCanonicalReferenceId)
      ?.add(edge.sourceCanonicalReferenceId);
  }
  const seen = new Set<string>();
  const subclusters: string[][] = [];
  for (const id of componentIds) {
    if (seen.has(id)) {
      continue;
    }
    const stack = [id];
    const subcluster: string[] = [];
    seen.add(id);
    while (stack.length) {
      const next = stack.pop()!;
      subcluster.push(next);
      for (const neighbor of adjacency.get(next) || []) {
        if (!seen.has(neighbor)) {
          seen.add(neighbor);
          stack.push(neighbor);
        }
      }
    }
    subclusters.push(
      subcluster.sort((left, right) =>
        compareSynthesisEngineStrings(left, right),
      ),
    );
  }
  return subclusters;
}

function reviewSourceForEdge(
  edge: ReferenceCanonicalDedupeEdge,
  clusterRepresentative: CanonicalDedupeRecord,
  source: CanonicalDedupeRecord,
  target: CanonicalDedupeRecord,
) {
  const longer = cleanString(edge.evidence.longer_canonical_reference_id);
  if (longer === source.canonicalReferenceId) {
    if (
      source.canonicalReferenceId === clusterRepresentative.canonicalReferenceId
    ) {
      return target;
    }
    return source;
  }
  if (longer === target.canonicalReferenceId) {
    if (
      target.canonicalReferenceId === clusterRepresentative.canonicalReferenceId
    ) {
      return source;
    }
    return target;
  }
  return clusterRepresentative.canonicalReferenceId ===
    source.canonicalReferenceId
    ? target
    : source;
}

function semanticActionKey(action: ReferenceCanonicalDedupeClusterAction) {
  return [
    action.action,
    action.sourceCanonicalReferenceId,
    action.targetCanonicalReferenceId,
    action.clusterId,
    action.edgeType,
    action.reasons.includes("representative_retarget_review")
      ? "representative_retarget_review"
      : "",
  ].join("::");
}

export function dedupeCanonicalReferencesClustered(
  inputs: ReferenceCanonicalDedupeInput[],
  options: {
    maxBlockSize?: number;
    maxCandidatePairs?: number;
    checkpoint?: SynthesisReferenceDedupeCheckpoint;
    checkpointInterval?: number;
  } = {},
): ReferenceCanonicalDedupeClusteredResult {
  const checkpointInterval = Math.max(
    1,
    Math.floor(Number(options.checkpointInterval) || 256),
  );
  options.checkpoint?.({ phase: "start", processed: 0, total: inputs.length });
  const maxBlockSize = Math.max(
    2,
    Math.floor(Number(options.maxBlockSize) || 30),
  );
  const maxCandidatePairs = Math.max(
    0,
    Math.floor(Number(options.maxCandidatePairs) || 3000),
  );
  const records = inputs
    .map((input, index) => {
      if (index % checkpointInterval === 0) {
        options.checkpoint?.({
          phase: "records",
          processed: index,
          total: inputs.length,
        });
      }
      return canonicalDedupeRecord(input);
    })
    .filter((record): record is CanonicalDedupeRecord => Boolean(record))
    .sort((left, right) =>
      compareSynthesisEngineStrings(
        left.canonicalReferenceId,
        right.canonicalReferenceId,
      ),
    );
  const diagnostics: unknown[] = [];
  const excludedRecords = records.filter(
    (record) => record.eligibility === "excluded",
  );
  const matchRecords = records.filter(
    (record) => record.eligibility !== "excluded",
  );
  for (const record of excludedRecords) {
    diagnostics.push({
      code: "cluster_dedupe_record_excluded",
      canonical_reference_id: record.canonicalReferenceId,
      title: record.title,
      eligibility: record.eligibility,
      reasons: record.eligibilityReasons,
    });
  }
  const recordById = new Map(
    matchRecords.map((record) => [record.canonicalReferenceId, record]),
  );
  const blocks = new Map<string, Set<string>>();
  const addBlock = (key: string, record: CanonicalDedupeRecord) =>
    addClusterBlock(blocks, key, record);

  for (
    let recordIndex = 0;
    recordIndex < matchRecords.length;
    recordIndex += 1
  ) {
    const record = matchRecords[recordIndex]!;
    if (recordIndex % checkpointInterval === 0) {
      options.checkpoint?.({
        phase: "blocks",
        processed: recordIndex,
        total: matchRecords.length,
      });
    }
    for (const key of record.strongIdentifierKeys) {
      addBlock(`identifier:${key}`, record);
    }
    if (record.year && record.normalizedTitle) {
      addBlock(`normalized:${record.year}:${record.normalizedTitle}`, record);
    }
    if (record.year && record.compactTitle) {
      addBlock(`compact:${record.year}:${record.compactTitle}`, record);
    }
    if (record.year && record.strongCompactTitle) {
      addBlock(`strong:${record.year}:${record.strongCompactTitle}`, record);
    }
    if (record.compactTitle) {
      addBlock(`compact-any-year:${record.compactTitle}`, record);
    }
    if (record.strongCompactTitle) {
      addBlock(`strong-any-year:${record.strongCompactTitle}`, record);
    }
    if (record.year && record.contentTokens.length >= 3) {
      addBlock(
        `first-last:${record.year}:${firstTokens(record.contentTokens, 2)}:${lastTokens(record.contentTokens, 1)}`,
        record,
      );
      addBlock(
        `first:${record.year}:${firstTokens(record.contentTokens, 3)}`,
        record,
      );
      addBlock(
        `last:${record.year}:${lastTokens(record.contentTokens, 3)}`,
        record,
      );
    }
  }

  const edgesByPair = new Map<string, ReferenceCanonicalDedupeEdge>();
  let blockSkippedCount = 0;
  let candidatePairCount = 0;
  const upsertEdge = (edge: ReferenceCanonicalDedupeEdge) => {
    const pairKey = edgePairId(
      edge.sourceCanonicalReferenceId,
      edge.targetCanonicalReferenceId,
    );
    const existing = edgesByPair.get(pairKey);
    if (
      !existing ||
      edge.score > existing.score ||
      (edge.score === existing.score &&
        compareSynthesisEngineStrings(edge.edgeType, existing.edgeType) < 0)
    ) {
      edgesByPair.set(pairKey, edge);
    }
  };

  for (const [blockKey, ids] of blocks) {
    const uniqueIds = Array.from(ids).sort((left, right) =>
      compareSynthesisEngineStrings(left, right),
    );
    if (uniqueIds.length < 2) {
      continue;
    }
    if (uniqueIds.length > maxBlockSize) {
      blockSkippedCount += 1;
      diagnostics.push({
        code: "cluster_dedupe_block_skipped",
        block_key: blockKey,
        size: uniqueIds.length,
        max_block_size: maxBlockSize,
      });
      continue;
    }
    for (let i = 0; i < uniqueIds.length; i += 1) {
      for (let j = i + 1; j < uniqueIds.length; j += 1) {
        if (candidatePairCount >= maxCandidatePairs) {
          diagnostics.push({
            code: "cluster_dedupe_pair_budget_exceeded",
            max_candidate_pairs: maxCandidatePairs,
          });
          break;
        }
        const left = recordById.get(uniqueIds[i]!);
        const right = recordById.get(uniqueIds[j]!);
        if (!left || !right || identifierConflict([left, right])) {
          continue;
        }
        candidatePairCount += 1;
        if (candidatePairCount % checkpointInterval === 0) {
          options.checkpoint?.({
            phase: "pairs",
            processed: candidatePairCount,
            total: maxCandidatePairs,
          });
        }
        const sameNormalized =
          compatibleYear(left, right) &&
          left.normalizedTitle === right.normalizedTitle;
        const sameCompact =
          compatibleYear(left, right) &&
          left.compactTitle === right.compactTitle;
        const sameStrong = left.strongCompactTitle === right.strongCompactTitle;
        const sameIdentifier = left.strongIdentifierKeys.some((key) =>
          right.strongIdentifierKeys.includes(key),
        );
        const similarity = titleSimilarity(
          left.normalizedTitle,
          right.normalizedTitle,
        );
        const dice = tokenDice(left.tokenSet, right.tokenSet);
        if (sameIdentifier) {
          upsertEdge(
            canonicalDedupeEdge({
              left,
              right,
              edgeType: "identifier_exact",
              confidence: "deterministic",
              score: 1,
              reasons: ["cluster_identifier_exact"],
              evidence: {
                matching_identifiers: left.strongIdentifierKeys.filter((key) =>
                  right.strongIdentifierKeys.includes(key),
                ),
              },
            }),
          );
          continue;
        }
        if (sameNormalized) {
          upsertEdge(
            canonicalDedupeEdge({
              left,
              right,
              edgeType: "exact_normalized_title_year",
              confidence: "deterministic",
              score: 0.999,
              reasons: ["cluster_exact_normalized_title_year"],
            }),
          );
          continue;
        }
        if (sameCompact || sameStrong) {
          upsertEdge(
            canonicalDedupeEdge({
              left,
              right,
              edgeType: "exact_compact_title_year",
              confidence: "deterministic",
              score: sameStrong ? 0.998 : 0.995,
              reasons: [
                sameStrong
                  ? "cluster_exact_strong_compact_title"
                  : "cluster_exact_compact_title_year",
              ],
            }),
          );
          continue;
        }
        const contained = containedTitleDetails(left, right);
        if (contained && compatibleYear(left, right) && dice >= 0.45) {
          upsertEdge(
            canonicalDedupeEdge({
              left,
              right,
              edgeType: contained.edgeType,
              confidence: "review",
              score: similarity,
              reasons: [`cluster_${contained.edgeType}`],
              riskSignals: contained.riskSignals,
              evidence: {
                shorter_canonical_reference_id:
                  contained.shorter.canonicalReferenceId,
                longer_canonical_reference_id:
                  contained.longer.canonicalReferenceId,
                extra_tokens: contained.extraTokens,
                extra_prefix_tokens: contained.extraPrefixTokens,
                extra_suffix_tokens: contained.extraSuffixTokens,
                containment_classification: contained.edgeType,
                bibliographic_reasons: contained.bibliographicReasons,
              },
            }),
          );
          continue;
        }
        if (compatibleYear(left, right) && similarity >= 0.97 && dice >= 0.72) {
          upsertEdge(
            canonicalDedupeEdge({
              left,
              right,
              edgeType: "typo_equivalent_title",
              confidence: "review",
              score: similarity,
              reasons: ["cluster_typo_equivalent_title"],
            }),
          );
        } else if (
          compatibleYear(left, right) &&
          similarity >= 0.9 &&
          dice >= 0.72
        ) {
          upsertEdge(
            canonicalDedupeEdge({
              left,
              right,
              edgeType: "weak_fuzzy_title",
              confidence: "review",
              score: similarity,
              reasons: ["cluster_weak_fuzzy_title"],
            }),
          );
        }
      }
    }
  }

  const edges = Array.from(edgesByPair.values()).sort(
    (left, right) =>
      compareSynthesisEngineStrings(
        left.sourceCanonicalReferenceId,
        right.sourceCanonicalReferenceId,
      ) ||
      compareSynthesisEngineStrings(
        left.targetCanonicalReferenceId,
        right.targetCanonicalReferenceId,
      ) ||
      compareSynthesisEngineStrings(left.edgeType, right.edgeType),
  );
  const edgesByComponentKey = new Map<string, ReferenceCanonicalDedupeEdge[]>();
  for (const edge of edges) {
    for (const id of [
      edge.sourceCanonicalReferenceId,
      edge.targetCanonicalReferenceId,
    ]) {
      edgesByComponentKey.set(id, [
        ...(edgesByComponentKey.get(id) || []),
        edge,
      ]);
    }
  }

  const clusters: ReferenceCanonicalDedupeCluster[] = [];
  const actions: ReferenceCanonicalDedupeClusterAction[] = [];
  for (const componentIds of connectedComponents(matchRecords, edges)) {
    const componentRecords = componentIds
      .map((id) => recordById.get(id))
      .filter((record): record is CanonicalDedupeRecord => Boolean(record));
    const clusterId = clusterStableId("cluster", componentIds);
    const componentEdges = edges.filter(
      (edge) =>
        componentIds.includes(edge.sourceCanonicalReferenceId) &&
        componentIds.includes(edge.targetCanonicalReferenceId),
    );
    const clusterRepresentative = chooseClusterRepresentative(
      componentRecords,
      componentEdges,
    )!;
    const subclusters = subclustersForComponent(
      componentIds,
      componentEdges,
    ).map((subclusterIds) => {
      const subclusterRecords = subclusterIds
        .map((id) => recordById.get(id))
        .filter((record): record is CanonicalDedupeRecord => Boolean(record));
      const subclusterEdges = componentEdges.filter(
        (edge) =>
          subclusterIds.includes(edge.sourceCanonicalReferenceId) &&
          subclusterIds.includes(edge.targetCanonicalReferenceId),
      );
      const representative = chooseClusterRepresentative(
        subclusterRecords,
        subclusterEdges,
      )!;
      const edgeTypes = uniqueSorted(
        subclusterEdges.map((edge) => edge.edgeType),
      );
      const subclusterId = clusterStableId("subcluster", subclusterIds);
      for (const record of subclusterRecords) {
        if (
          record.canonicalReferenceId ===
          clusterRepresentative.canonicalReferenceId
        ) {
          continue;
        }
        const supportingEdges = subclusterEdges.filter(
          (edge) =>
            edge.sourceCanonicalReferenceId === record.canonicalReferenceId ||
            edge.targetCanonicalReferenceId === record.canonicalReferenceId,
        );
        const bestEdge = supportingEdges.sort(
          (left, right) =>
            right.score - left.score ||
            compareSynthesisEngineStrings(left.edgeType, right.edgeType),
        )[0];
        if (!bestEdge) {
          continue;
        }
        const redirectEligible =
          record.eligibility === "eligible" &&
          clusterRepresentative.eligibility === "eligible" &&
          deterministicEdge(bestEdge) &&
          sameTitleYearGroupSafe(subclusterRecords) &&
          bestEdge.edgeType !== "contained_extension_risk" &&
          subclusterIds.includes(clusterRepresentative.canonicalReferenceId);
        const target = clusterRepresentative.canonicalReferenceId;
        actions.push({
          actionId: `action:${hashSynthesisEngineCanonicalJson({
            action: redirectEligible ? "redirect" : "review",
            source: record.canonicalReferenceId,
            target,
            clusterId,
            subclusterId,
            edge: bestEdge.edgeId,
          }).slice(0, 24)}`,
          action: redirectEligible ? "redirect" : "review",
          sourceCanonicalReferenceId: record.canonicalReferenceId,
          targetCanonicalReferenceId: target,
          clusterId,
          subclusterId,
          edgeType: bestEdge.edgeType,
          confidence: redirectEligible ? bestEdge.confidence : "review",
          score: bestEdge.score,
          reasons: bestEdge.reasons,
          riskSignals: bestEdge.riskSignals,
          evidence: {
            ...bestEdge.evidence,
            representative_canonical_reference_id:
              clusterRepresentative.canonicalReferenceId,
            representative: recordEvidenceSummary(clusterRepresentative),
            source_record: recordEvidenceSummary(record),
            subcluster_representative_canonical_reference_id:
              representative.canonicalReferenceId,
            representative_rationale: titleCleanlinessReasons(
              clusterRepresentative,
            ),
            supporting_edge_target_canonical_reference_id:
              bestEdge.sourceCanonicalReferenceId ===
              record.canonicalReferenceId
                ? bestEdge.targetCanonicalReferenceId
                : bestEdge.sourceCanonicalReferenceId,
          },
        });
      }
      return {
        subclusterId,
        canonicalReferenceIds: subclusterIds,
        representativeCanonicalReferenceId: representative.canonicalReferenceId,
        edgeTypes,
        deterministic:
          subclusterEdges.length > 0 &&
          subclusterEdges.every(deterministicEdge),
        representativeRationale: titleCleanlinessReasons(representative),
      };
    });
    clusters.push({
      clusterId,
      canonicalReferenceIds: componentIds,
      representativeCanonicalReferenceId:
        clusterRepresentative.canonicalReferenceId,
      representativeRationale: titleCleanlinessReasons(clusterRepresentative),
      members: componentRecords.map(recordEvidenceSummary),
      subclusters,
    });
    const retargetCandidate = representativeRetargetReviewCandidate(
      clusterRepresentative,
      componentRecords,
      componentEdges,
    );
    if (retargetCandidate) {
      const retargetEdge =
        componentEdges
          .filter(
            (edge) =>
              (edge.sourceCanonicalReferenceId ===
                clusterRepresentative.canonicalReferenceId &&
                edge.targetCanonicalReferenceId ===
                  retargetCandidate.canonicalReferenceId) ||
              (edge.sourceCanonicalReferenceId ===
                retargetCandidate.canonicalReferenceId &&
                edge.targetCanonicalReferenceId ===
                  clusterRepresentative.canonicalReferenceId),
          )
          .sort(
            (left, right) =>
              right.score - left.score ||
              compareSynthesisEngineStrings(left.edgeType, right.edgeType),
          )[0] || componentEdges[0];
      if (retargetEdge) {
        actions.push({
          actionId: `action:${hashSynthesisEngineCanonicalJson({
            action: "review",
            source: clusterRepresentative.canonicalReferenceId,
            target: retargetCandidate.canonicalReferenceId,
            clusterId,
            edge: retargetEdge.edgeId,
            reason: "representative_retarget_review",
          }).slice(0, 24)}`,
          action: "review",
          sourceCanonicalReferenceId:
            clusterRepresentative.canonicalReferenceId,
          targetCanonicalReferenceId: retargetCandidate.canonicalReferenceId,
          clusterId,
          subclusterId: clusterStableId("subcluster", [
            clusterRepresentative.canonicalReferenceId,
            retargetCandidate.canonicalReferenceId,
          ]),
          edgeType: retargetEdge.edgeType,
          confidence: "review",
          score: retargetEdge.score,
          reasons: uniqueSorted([
            ...retargetEdge.reasons,
            "representative_retarget_review",
          ]),
          riskSignals: uniqueSorted([
            ...retargetEdge.riskSignals,
            "retarget_requires_review",
          ]),
          evidence: {
            ...retargetEdge.evidence,
            representative_canonical_reference_id:
              clusterRepresentative.canonicalReferenceId,
            retarget_candidate_canonical_reference_id:
              retargetCandidate.canonicalReferenceId,
            representative: recordEvidenceSummary(clusterRepresentative),
            retarget_candidate: recordEvidenceSummary(retargetCandidate),
            representative_rationale: titleCleanlinessReasons(
              clusterRepresentative,
            ),
            retarget_rationale: titleCleanlinessReasons(retargetCandidate),
          },
        });
      }
    }
    for (const edge of componentEdges.filter(
      (edge) => !deterministicEdge(edge),
    )) {
      const source = recordById.get(edge.sourceCanonicalReferenceId);
      const target = recordById.get(edge.targetCanonicalReferenceId);
      if (!source || !target) {
        continue;
      }
      const representative = chooseClusterRepresentative(
        [source, target],
        [edge],
      )!;
      const other = reviewSourceForEdge(
        edge,
        clusterRepresentative,
        source,
        target,
      );
      if (
        other.canonicalReferenceId ===
        clusterRepresentative.canonicalReferenceId
      ) {
        continue;
      }
      if (
        actions.some(
          (action) =>
            action.clusterId === clusterId &&
            action.action === "redirect" &&
            action.sourceCanonicalReferenceId === other.canonicalReferenceId &&
            action.targetCanonicalReferenceId ===
              clusterRepresentative.canonicalReferenceId,
        )
      ) {
        continue;
      }
      actions.push({
        actionId: `action:${hashSynthesisEngineCanonicalJson({
          action: "review",
          source: other.canonicalReferenceId,
          target: clusterRepresentative.canonicalReferenceId,
          clusterId,
          edge: edge.edgeId,
        }).slice(0, 24)}`,
        action: "review",
        sourceCanonicalReferenceId: other.canonicalReferenceId,
        targetCanonicalReferenceId: clusterRepresentative.canonicalReferenceId,
        clusterId,
        subclusterId: clusterStableId("subcluster", [
          edge.sourceCanonicalReferenceId,
          edge.targetCanonicalReferenceId,
        ]),
        edgeType: edge.edgeType,
        confidence: "review",
        score: edge.score,
        reasons: edge.reasons,
        riskSignals: edge.riskSignals,
        evidence: {
          ...edge.evidence,
          representative_canonical_reference_id:
            clusterRepresentative.canonicalReferenceId,
          representative: recordEvidenceSummary(clusterRepresentative),
          source_record: recordEvidenceSummary(other),
          pair_representative_canonical_reference_id:
            representative.canonicalReferenceId,
          representative_rationale: titleCleanlinessReasons(
            clusterRepresentative,
          ),
        },
      });
    }
  }

  clusters.sort((left, right) =>
    compareSynthesisEngineStrings(left.clusterId, right.clusterId),
  );
  const uniqueActions = Array.from(
    actions
      .slice()
      .sort((left, right) => right.score - left.score)
      .reduce((map, action) => {
        const key = semanticActionKey(action);
        if (!map.has(key)) {
          map.set(key, action);
        }
        return map;
      }, new Map<string, ReferenceCanonicalDedupeClusterAction>())
      .values(),
  ).sort(
    (left, right) =>
      compareSynthesisEngineStrings(left.clusterId, right.clusterId) ||
      compareSynthesisEngineStrings(
        left.sourceCanonicalReferenceId,
        right.sourceCanonicalReferenceId,
      ) ||
      compareSynthesisEngineStrings(
        left.targetCanonicalReferenceId,
        right.targetCanonicalReferenceId,
      ),
  );
  options.checkpoint?.({
    phase: "clusters",
    processed: clusters.length,
    total: clusters.length,
  });
  options.checkpoint?.({
    phase: "complete",
    processed: records.length,
    total: records.length,
  });
  return {
    clusters,
    edges,
    actions: uniqueActions,
    diagnostics,
    counters: {
      canonical_count: records.length,
      block_count: blocks.size,
      block_skipped_count: blockSkippedCount,
      candidate_pair_count: candidatePairCount,
      candidate_pair_budget: maxCandidatePairs,
      edge_count: edges.length,
      cluster_count: clusters.length,
      subcluster_count: clusters.reduce(
        (total, cluster) => total + cluster.subclusters.length,
        0,
      ),
      redirect_action_count: uniqueActions.filter(
        (action) => action.action === "redirect",
      ).length,
      review_action_count: uniqueActions.filter(
        (action) => action.action === "review",
      ).length,
      extension_risk_edge_count: edges.filter(
        (edge) => edge.edgeType === "contained_extension_risk",
      ).length,
      weak_record_count: records.filter(
        (record) => record.eligibility === "weak",
      ).length,
      excluded_record_count: excludedRecords.length,
    },
  };
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
        compareSynthesisEngineStrings(left.paperRef, right.paperRef),
      ),
    );
  }
}

function appendToMap(
  map: Map<string, ReferenceMatcherPaperInput[]>,
  key: string,
  paper: ReferenceMatcherPaperInput,
) {
  if (!key) {
    return;
  }
  const existing = map.get(key);
  if (existing) {
    existing.push(paper);
  } else {
    map.set(key, [paper]);
  }
}

export function buildReferenceMatcherIndex(
  papers: ReferenceMatcherPaperInput[],
): ReferenceMatcherIndex {
  const identifiers = new Map<string, ReferenceMatcherPaperInput[]>();
  const title = new Map<string, ReferenceMatcherPaperInput[]>();
  const compactTitle = new Map<string, ReferenceMatcherPaperInput[]>();
  const strongCompactTitle = new Map<string, ReferenceMatcherPaperInput[]>();
  const paperFeatures = new Map<string, ReferenceMatcherPaperFeature>();
  const authorTokenIndex = new Map<string, ReferenceMatcherPaperInput[]>();
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
    const feature = {
      paperRef: paper.paperRef,
      normalizedTitle: cleanString(paper.normalizedTitle),
      authorTokens: authorTokens(paper.authors),
      yearNumber: numericYear(paper.year),
    };
    paperFeatures.set(paper.paperRef, feature);
    for (const token of feature.authorTokens) {
      appendToMap(authorTokenIndex, token, paper);
    }
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
  for (const candidates of authorTokenIndex.values()) {
    candidates.sort((left, right) =>
      compareSynthesisEngineStrings(left.paperRef, right.paperRef),
    );
  }
  return {
    papers: normalizedPapers,
    identifiers,
    title,
    compactTitle,
    strongCompactTitle,
    paperFeatures,
    authorTokenIndex,
  };
}

function paperFeatureFor(
  index: ReferenceMatcherIndex,
  paper: ReferenceMatcherPaperInput,
) {
  return (
    index.paperFeatures.get(paper.paperRef) || {
      paperRef: paper.paperRef,
      normalizedTitle: cleanString(paper.normalizedTitle),
      authorTokens: authorTokens(paper.authors),
      yearNumber: numericYear(paper.year),
    }
  );
}

function uniqueCandidate(candidates: ReferenceMatcherPaperInput[]) {
  const unique = new Map(candidates.map((paper) => [paper.paperRef, paper]));
  return unique.size === 1 ? Array.from(unique.values())[0] : null;
}

type CandidateEvidenceInput = {
  refAuthorTokens?: Set<string>;
  paperAuthorTokens?: Set<string>;
};

function candidateFor(
  paper: ReferenceMatcherPaperInput,
  reference: ReferenceMatcherReferenceInput,
  reasons: string[],
  score: number,
  evidenceInput: CandidateEvidenceInput = {},
): ReferenceMatcherCandidate {
  const refTokens =
    evidenceInput.refAuthorTokens || authorTokens(reference.authors);
  const paperTokens =
    evidenceInput.paperAuthorTokens || authorTokens(paper.authors);
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
    compareSynthesisEngineStrings(left.paperRef, right.paperRef)
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
  const refYear = numericYear(reference.year);
  const candidates = new Map<string, ReferenceMatcherCandidate>();
  const consider = (
    paper: ReferenceMatcherPaperInput,
    reasons: string[],
    score: number,
    options: { requireAuthorOverlap?: boolean } = {},
  ) => {
    const paperFeature = paperFeatureFor(index, paper);
    const paperTokens = paperFeature.authorTokens;
    const overlap = Array.from(refTokens).filter((token) =>
      paperTokens.has(token),
    ).length;
    if (options.requireAuthorOverlap !== false && overlap <= 0) {
      return;
    }
    if (
      options.requireAuthorOverlap !== false &&
      config.yearDelta &&
      !compatibleYearEvidence(refYear, paperFeature.yearNumber)
    ) {
      return;
    }
    const existing = candidates.get(paper.paperRef);
    const nextReasons = existing
      ? uniqueSorted([...existing.reasons, ...reasons])
      : reasons;
    const nextScore = Math.max(existing?.score || 0, score);
    candidates.set(
      paper.paperRef,
      candidateFor(paper, reference, nextReasons, nextScore, {
        refAuthorTokens: refTokens,
        paperAuthorTokens: paperTokens,
      }),
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

  if (config.guardedFuzzy && refTokens.size >= 2 && refTitle) {
    const overlapCounts = new Map<
      string,
      {
        paper: ReferenceMatcherPaperInput;
        feature: ReferenceMatcherPaperFeature;
        count: number;
      }
    >();
    for (const token of refTokens) {
      for (const paper of index.authorTokenIndex.get(token) || []) {
        if (candidates.has(paper.paperRef)) {
          continue;
        }
        const paperFeature = paperFeatureFor(index, paper);
        if (
          config.yearDelta &&
          !compatibleYearEvidence(refYear, paperFeature.yearNumber)
        ) {
          continue;
        }
        const existing = overlapCounts.get(paper.paperRef);
        if (existing) {
          existing.count += 1;
        } else {
          overlapCounts.set(paper.paperRef, {
            paper,
            feature: paperFeature,
            count: 1,
          });
        }
      }
    }
    const fuzzyCandidates = Array.from(overlapCounts.values())
      .filter((entry) => entry.count >= 2)
      .sort((left, right) =>
        compareSynthesisEngineStrings(
          left.paper.paperRef,
          right.paper.paperRef,
        ),
      );
    for (const { paper, feature: paperFeature } of fuzzyCandidates) {
      const score = titleSimilarity(
        refTitle,
        paperFeature.normalizedTitle,
        0.82,
      );
      if (score >= 0.97) {
        candidates.set(
          paper.paperRef,
          candidateFor(paper, reference, ["guarded_fuzzy_title"], score, {
            refAuthorTokens: refTokens,
            paperAuthorTokens: paperFeature.authorTokens,
          }),
        );
      } else if (score >= 0.82) {
        candidates.set(
          paper.paperRef,
          candidateFor(paper, reference, ["suggested_fuzzy_title"], score, {
            refAuthorTokens: refTokens,
            paperAuthorTokens: paperFeature.authorTokens,
          }),
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
      confidence: deterministicTitleMatch ? "deterministic" : "high",
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

  const suggestionOnly = candidates.length === 1;
  return {
    status: suggestionOnly
      ? "suggested"
      : candidates.length > 1
        ? "ambiguous"
        : "unmatched",
    confidence: suggestionOnly ? "low" : "review",
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
  return hashSynthesisEngineCanonicalJson(value);
}

export const SYNTHESIS_REFERENCE_MATCHER_CONTRACT_VERSION =
  "synthesis-reference-matcher.v1" as const;
export const SYNTHESIS_REFERENCE_MATCHER_BINDING_ALGORITHM_VERSION =
  "reference-binding.v1" as const;
export const SYNTHESIS_REFERENCE_MATCHER_DEDUPE_ALGORITHM_VERSION =
  "canonical-cluster-dedupe.v1" as const;
export const SYNTHESIS_REFERENCE_MATCHER_LIBRARY_PAPER_MAX = 25_000 as const;
export const SYNTHESIS_REFERENCE_MATCHER_BINDING_INPUT_MAX = 750_000 as const;
export const SYNTHESIS_REFERENCE_MATCHER_DEDUPE_INPUT_MAX = 750_000 as const;
export const SYNTHESIS_REFERENCE_MATCHER_AUTHOR_MAX = 64 as const;
export const SYNTHESIS_REFERENCE_MATCHER_IDENTIFIER_MAX = 32 as const;
export const SYNTHESIS_REFERENCE_MATCHER_TITLE_CANDIDATE_MAX = 16 as const;
export const SYNTHESIS_REFERENCE_MATCHER_SUGGESTED_CANDIDATE_MAX = 3 as const;
export const SYNTHESIS_REFERENCE_MATCHER_EVIDENCE_ARRAY_MAX = 4096 as const;
export const SYNTHESIS_REFERENCE_MATCHER_STRING_MAX = 4096 as const;
export const SYNTHESIS_REFERENCE_MATCHER_CLUSTER_BLOCK_MAX = 30 as const;
export const SYNTHESIS_REFERENCE_MATCHER_CANDIDATE_PAIR_MAX = 3000 as const;

const SYNTHESIS_REFERENCE_MATCHER_ID_MAX = 512;

export type SynthesisReferenceBindingInput = {
  canonicalReferenceId: string;
  reference: ReferenceMatcherReferenceInput;
};

export type SynthesisReferenceBindingRequest = {
  contractVersion: typeof SYNTHESIS_REFERENCE_MATCHER_CONTRACT_VERSION;
  algorithmVersion: typeof SYNTHESIS_REFERENCE_MATCHER_BINDING_ALGORITHM_VERSION;
  policyId: ReferenceMatcherPolicyId;
  papers: ReferenceMatcherPaperInput[];
  references: SynthesisReferenceBindingInput[];
};

export type SynthesisReferenceBindingMatch = {
  canonicalReferenceId: string;
  result: ReferenceMatcherResult;
};

export type SynthesisReferenceBindingResult = {
  contractVersion: typeof SYNTHESIS_REFERENCE_MATCHER_CONTRACT_VERSION;
  algorithmVersion: typeof SYNTHESIS_REFERENCE_MATCHER_BINDING_ALGORITHM_VERSION;
  policyId: ReferenceMatcherPolicyId;
  matches: SynthesisReferenceBindingMatch[];
};

export type SynthesisReferenceDedupeRequest = {
  contractVersion: typeof SYNTHESIS_REFERENCE_MATCHER_CONTRACT_VERSION;
  algorithmVersion: typeof SYNTHESIS_REFERENCE_MATCHER_DEDUPE_ALGORITHM_VERSION;
  canonicals: ReferenceCanonicalDedupeInput[];
};

export type SynthesisReferenceDedupeResult = {
  contractVersion: typeof SYNTHESIS_REFERENCE_MATCHER_CONTRACT_VERSION;
  algorithmVersion: typeof SYNTHESIS_REFERENCE_MATCHER_DEDUPE_ALGORITHM_VERSION;
  clusters: ReferenceCanonicalDedupeCluster[];
  edges: ReferenceCanonicalDedupeEdge[];
  actions: ReferenceCanonicalDedupeClusterAction[];
  diagnostics: unknown[];
  counters: ReferenceCanonicalDedupeClusteredResult["counters"];
};

export type SynthesisReferenceBindingCheckpoint = (checkpoint: {
  phase: "start" | "index" | "references" | "complete";
  processed?: number;
  total?: number;
}) => void;

export type SynthesisReferenceDedupeCheckpoint = (checkpoint: {
  phase: "start" | "records" | "blocks" | "pairs" | "clusters" | "complete";
  processed?: number;
  total?: number;
}) => void;

export type SynthesisReferenceMatcherBounds = {
  libraryPaperMax?: number;
  bindingInputMax?: number;
  dedupeInputMax?: number;
  authorMax?: number;
  identifierMax?: number;
  titleCandidateMax?: number;
  stringMax?: number;
};

export interface SynthesisReferenceMatcherEngine {
  matchBindings(
    request: SynthesisReferenceBindingRequest,
  ): Promise<SynthesisReferenceBindingResult>;
  dedupeCanonicals(
    request: SynthesisReferenceDedupeRequest,
  ): Promise<SynthesisReferenceDedupeResult>;
}

export class SynthesisReferenceMatcherContractError extends Error {
  readonly code = "invalid_request";

  constructor(message: string) {
    super(message);
    this.name = "SynthesisReferenceMatcherContractError";
  }
}

function matcherInvalid(message: string): never {
  throw new SynthesisReferenceMatcherContractError(message);
}

function matcherPlainObject(
  value: unknown,
  location: string,
): Record<string, unknown> {
  matcherAssertJsonSafe(value, location);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return matcherInvalid(`${location} must be an object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return matcherInvalid(`${location} must be a plain object`);
  }
  return value as Record<string, unknown>;
}

function matcherAssertJsonSafe(
  value: unknown,
  location: string,
  seen = new Set<object>(),
): void {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      matcherInvalid(`${location} must contain finite numbers`);
    }
    return;
  }
  if (typeof value !== "object" || value === undefined) {
    matcherInvalid(`${location} must be JSON-safe`);
  }
  const object = value as object;
  if (seen.has(object)) {
    matcherInvalid(`${location} must not contain cycles`);
  }
  seen.add(object);
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      matcherAssertJsonSafe(entry, `${location}[${index}]`, seen),
    );
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      matcherInvalid(`${location} must contain plain objects`);
    }
    for (const [key, entry] of Object.entries(
      value as Record<string, unknown>,
    )) {
      matcherAssertJsonSafe(entry, `${location}.${key}`, seen);
    }
  }
  seen.delete(object);
}

function matcherHasControlCharacter(value: string) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

function matcherString(
  value: unknown,
  location: string,
  options: {
    required?: boolean;
    max?: number;
  } = {},
) {
  if (value === undefined || value === null) {
    if (options.required) {
      return matcherInvalid(`${location} is required`);
    }
    return "";
  }
  if (typeof value !== "string") {
    return matcherInvalid(`${location} must be a string`);
  }
  const normalized = value.trim();
  if (options.required && !normalized) {
    return matcherInvalid(`${location} must be non-empty`);
  }
  const max = options.max || SYNTHESIS_REFERENCE_MATCHER_STRING_MAX;
  if (normalized.length > max || matcherHasControlCharacter(normalized)) {
    return matcherInvalid(`${location} is invalid`);
  }
  return normalized;
}

function matcherBoolean(value: unknown, location: string) {
  if (typeof value !== "boolean") {
    return matcherInvalid(`${location} must be boolean`);
  }
  return value;
}

function matcherPositiveInteger(value: unknown, location: string) {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    return matcherInvalid(`${location} must be a positive integer`);
  }
  return Number(value);
}

function matcherArray(
  value: unknown,
  location: string,
  max: number,
): unknown[] {
  if (!Array.isArray(value)) {
    return matcherInvalid(`${location} must be an array`);
  }
  if (value.length > max) {
    return matcherInvalid(`${location} exceeds ${max}`);
  }
  return value;
}

function matcherBounds(bounds: SynthesisReferenceMatcherBounds = {}) {
  const positive = (value: number | undefined, fallback: number) =>
    value === undefined ? fallback : Math.max(1, Math.floor(value));
  return {
    libraryPaperMax: positive(
      bounds.libraryPaperMax,
      SYNTHESIS_REFERENCE_MATCHER_LIBRARY_PAPER_MAX,
    ),
    bindingInputMax: positive(
      bounds.bindingInputMax,
      SYNTHESIS_REFERENCE_MATCHER_BINDING_INPUT_MAX,
    ),
    dedupeInputMax: positive(
      bounds.dedupeInputMax,
      SYNTHESIS_REFERENCE_MATCHER_DEDUPE_INPUT_MAX,
    ),
    authorMax: positive(
      bounds.authorMax,
      SYNTHESIS_REFERENCE_MATCHER_AUTHOR_MAX,
    ),
    identifierMax: positive(
      bounds.identifierMax,
      SYNTHESIS_REFERENCE_MATCHER_IDENTIFIER_MAX,
    ),
    titleCandidateMax: positive(
      bounds.titleCandidateMax,
      SYNTHESIS_REFERENCE_MATCHER_TITLE_CANDIDATE_MAX,
    ),
    stringMax: positive(
      bounds.stringMax,
      SYNTHESIS_REFERENCE_MATCHER_STRING_MAX,
    ),
  };
}

function matcherStringArray(
  value: unknown,
  location: string,
  max: number,
  stringMax: number,
) {
  return uniqueSorted(
    matcherArray(value ?? [], location, max).map((entry, index) =>
      matcherString(entry, `${location}[${index}]`, { max: stringMax }),
    ),
  ).filter(Boolean);
}

function rebuildMatcherIdentifier(
  value: unknown,
  location: string,
  stringMax: number,
): ReferenceMatcherIdentifier {
  const object = matcherPlainObject(value, location);
  const kind = matcherString(object.kind, `${location}.kind`, {
    required: true,
    max: SYNTHESIS_REFERENCE_MATCHER_ID_MAX,
  });
  const identifierValue = matcherString(object.value, `${location}.value`, {
    required: true,
    max: stringMax,
  });
  return (
    normalizeReferenceIdentifier(kind, identifierValue) ||
    matcherInvalid(`${location} is unsupported`)
  );
}

function rebuildMatcherIdentifiers(
  value: unknown,
  location: string,
  bounds: ReturnType<typeof matcherBounds>,
) {
  const identifiers = matcherArray(
    value ?? [],
    location,
    bounds.identifierMax,
  ).map((entry, index) =>
    rebuildMatcherIdentifier(entry, `${location}[${index}]`, bounds.stringMax),
  );
  const unique = new Map(
    identifiers.map((identifier) => [
      `${identifier.kind}:${identifier.value}`,
      identifier,
    ]),
  );
  return Array.from(unique.values()).sort(
    (left, right) =>
      compareSynthesisEngineStrings(left.kind, right.kind) ||
      compareSynthesisEngineStrings(left.value, right.value),
  );
}

function optionalMatcherField(
  output: Record<string, unknown>,
  key: string,
  value: string,
) {
  if (value) {
    output[key] = value;
  }
}

function rebuildMatcherPaper(
  value: unknown,
  location: string,
  bounds: ReturnType<typeof matcherBounds>,
): ReferenceMatcherPaperInput {
  const object = matcherPlainObject(value, location);
  const output: Record<string, unknown> = {
    paperRef: matcherString(object.paperRef, `${location}.paperRef`, {
      required: true,
      max: SYNTHESIS_REFERENCE_MATCHER_ID_MAX,
    }),
    authors: matcherStringArray(
      object.authors,
      `${location}.authors`,
      bounds.authorMax,
      bounds.stringMax,
    ),
    identifiers: rebuildMatcherIdentifiers(
      object.identifiers,
      `${location}.identifiers`,
      bounds,
    ),
  };
  for (const key of [
    "itemKey",
    "literatureItemId",
    "title",
    "normalizedTitle",
    "year",
    "doi",
    "arxiv",
    "isbn",
    "url",
    "citekey",
  ] as const) {
    optionalMatcherField(
      output,
      key,
      matcherString(object[key], `${location}.${key}`, {
        max:
          key === "itemKey" || key === "literatureItemId"
            ? SYNTHESIS_REFERENCE_MATCHER_ID_MAX
            : bounds.stringMax,
      }),
    );
  }
  return output as ReferenceMatcherPaperInput;
}

function rebuildMatcherReference(
  value: unknown,
  location: string,
  bounds: ReturnType<typeof matcherBounds>,
): ReferenceMatcherReferenceInput {
  const object = matcherPlainObject(value, location);
  const output: Record<string, unknown> = {
    authors: matcherStringArray(
      object.authors,
      `${location}.authors`,
      bounds.authorMax,
      bounds.stringMax,
    ),
  };
  for (const key of [
    "referenceInstanceId",
    "title",
    "parsedTitle",
    "normalizedTitle",
    "year",
    "rawReference",
    "doi",
    "arxiv",
    "isbn",
    "url",
    "citekey",
  ] as const) {
    optionalMatcherField(
      output,
      key,
      matcherString(object[key], `${location}.${key}`, {
        max:
          key === "referenceInstanceId"
            ? SYNTHESIS_REFERENCE_MATCHER_ID_MAX
            : bounds.stringMax,
      }),
    );
  }
  return output as ReferenceMatcherReferenceInput;
}

function rebuildDedupeTitleCandidate(
  value: unknown,
  location: string,
  bounds: ReturnType<typeof matcherBounds>,
): ReferenceCanonicalDedupeTitleCandidate {
  const object = matcherPlainObject(value, location);
  const source = matcherString(object.source, `${location}.source`, {
    required: true,
    max: 64,
  });
  if (
    source !== "input" &&
    source !== "effective_canonical" &&
    source !== "physical_canonical" &&
    source !== "raw_reference"
  ) {
    return matcherInvalid(`${location}.source is invalid`);
  }
  const output: ReferenceCanonicalDedupeTitleCandidate = {
    title: matcherString(object.title, `${location}.title`, {
      required: true,
      max: bounds.stringMax,
    }),
    authors: matcherStringArray(
      object.authors,
      `${location}.authors`,
      bounds.authorMax,
      bounds.stringMax,
    ),
    identifiers: rebuildMatcherIdentifiers(
      object.identifiers,
      `${location}.identifiers`,
      bounds,
    ),
    rawReferenceIds: matcherStringArray(
      object.rawReferenceIds,
      `${location}.rawReferenceIds`,
      SYNTHESIS_REFERENCE_MATCHER_EVIDENCE_ARRAY_MAX,
      SYNTHESIS_REFERENCE_MATCHER_ID_MAX,
    ),
    source,
  };
  const normalizedTitle = matcherString(
    object.normalizedTitle,
    `${location}.normalizedTitle`,
    { max: bounds.stringMax },
  );
  const year = matcherString(object.year, `${location}.year`, {
    max: bounds.stringMax,
  });
  const sourceCanonicalReferenceId = matcherString(
    object.sourceCanonicalReferenceId,
    `${location}.sourceCanonicalReferenceId`,
    { max: SYNTHESIS_REFERENCE_MATCHER_ID_MAX },
  );
  if (normalizedTitle) {
    output.normalizedTitle = normalizedTitle;
  }
  if (year) {
    output.year = year;
  }
  if (sourceCanonicalReferenceId) {
    output.sourceCanonicalReferenceId = sourceCanonicalReferenceId;
  }
  if (object.frequency !== undefined) {
    output.frequency = matcherPositiveInteger(
      object.frequency,
      `${location}.frequency`,
    );
  }
  return output;
}

function rebuildDedupeCanonical(
  value: unknown,
  location: string,
  bounds: ReturnType<typeof matcherBounds>,
): ReferenceCanonicalDedupeInput {
  const object = matcherPlainObject(value, location);
  const output: ReferenceCanonicalDedupeInput = {
    canonicalReferenceId: matcherString(
      object.canonicalReferenceId,
      `${location}.canonicalReferenceId`,
      {
        required: true,
        max: SYNTHESIS_REFERENCE_MATCHER_ID_MAX,
      },
    ),
    authors: matcherStringArray(
      object.authors,
      `${location}.authors`,
      bounds.authorMax,
      bounds.stringMax,
    ),
    acceptedBinding: matcherBoolean(
      object.acceptedBinding,
      `${location}.acceptedBinding`,
    ),
    stickyRepresentative: matcherBoolean(
      object.stickyRepresentative,
      `${location}.stickyRepresentative`,
    ),
    rawReferenceIds: matcherStringArray(
      object.rawReferenceIds,
      `${location}.rawReferenceIds`,
      SYNTHESIS_REFERENCE_MATCHER_EVIDENCE_ARRAY_MAX,
      SYNTHESIS_REFERENCE_MATCHER_ID_MAX,
    ),
    rawHashes: matcherStringArray(
      object.rawHashes,
      `${location}.rawHashes`,
      SYNTHESIS_REFERENCE_MATCHER_EVIDENCE_ARRAY_MAX,
      bounds.stringMax,
    ),
    rawReferences: matcherStringArray(
      object.rawReferences,
      `${location}.rawReferences`,
      SYNTHESIS_REFERENCE_MATCHER_EVIDENCE_ARRAY_MAX,
      bounds.stringMax,
    ),
    sourceRefs: matcherStringArray(
      object.sourceRefs,
      `${location}.sourceRefs`,
      SYNTHESIS_REFERENCE_MATCHER_EVIDENCE_ARRAY_MAX,
      SYNTHESIS_REFERENCE_MATCHER_ID_MAX,
    ),
    identifiers: rebuildMatcherIdentifiers(
      object.identifiers,
      `${location}.identifiers`,
      bounds,
    ),
    titleCandidates: matcherArray(
      object.titleCandidates ?? [],
      `${location}.titleCandidates`,
      bounds.titleCandidateMax,
    )
      .map((entry, index) =>
        rebuildDedupeTitleCandidate(
          entry,
          `${location}.titleCandidates[${index}]`,
          bounds,
        ),
      )
      .sort(
        (left, right) =>
          compareSynthesisEngineStrings(left.source, right.source) ||
          compareSynthesisEngineStrings(left.title, right.title) ||
          compareSynthesisEngineStrings(
            left.sourceCanonicalReferenceId || "",
            right.sourceCanonicalReferenceId || "",
          ),
      ),
  };
  for (const key of ["title", "normalizedTitle", "year"] as const) {
    const field = matcherString(object[key], `${location}.${key}`, {
      max: bounds.stringMax,
    });
    if (field) {
      output[key] = field;
    }
  }
  return output;
}

function assertUniqueMatcherIds(values: string[], location: string) {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      matcherInvalid(`${location} contains duplicate ${value}`);
    }
    seen.add(value);
  }
}

function matcherPolicy(value: unknown, location: string) {
  const policy = matcherString(value, location, { required: true, max: 32 });
  if (
    policy !== "baseline" &&
    policy !== "policy-a" &&
    policy !== "policy-b" &&
    policy !== "policy-c" &&
    policy !== "policy-d" &&
    policy !== "production"
  ) {
    return matcherInvalid(`${location} is invalid`);
  }
  return policy;
}

function matcherJsonClone<T>(value: T): T {
  return JSON.parse(canonicalizeSynthesisEngineJson(value)) as T;
}

export function rebuildSynthesisReferenceBindingRequest(
  value: unknown,
  boundsInput: SynthesisReferenceMatcherBounds = {},
): SynthesisReferenceBindingRequest {
  const bounds = matcherBounds(boundsInput);
  const object = matcherPlainObject(value, "request");
  if (
    object.contractVersion !== SYNTHESIS_REFERENCE_MATCHER_CONTRACT_VERSION ||
    object.algorithmVersion !==
      SYNTHESIS_REFERENCE_MATCHER_BINDING_ALGORITHM_VERSION
  ) {
    return matcherInvalid("request matcher version is invalid");
  }
  const papers = matcherArray(
    object.papers,
    "request.papers",
    bounds.libraryPaperMax,
  )
    .map((entry, index) =>
      rebuildMatcherPaper(entry, `request.papers[${index}]`, bounds),
    )
    .sort((left, right) =>
      compareSynthesisEngineStrings(left.paperRef, right.paperRef),
    );
  assertUniqueMatcherIds(
    papers.map((paper) => paper.paperRef),
    "request.papers",
  );
  const references = matcherArray(
    object.references,
    "request.references",
    bounds.bindingInputMax,
  )
    .map((entry, index) => {
      const reference = matcherPlainObject(
        entry,
        `request.references[${index}]`,
      );
      return {
        canonicalReferenceId: matcherString(
          reference.canonicalReferenceId,
          `request.references[${index}].canonicalReferenceId`,
          {
            required: true,
            max: SYNTHESIS_REFERENCE_MATCHER_ID_MAX,
          },
        ),
        reference: rebuildMatcherReference(
          reference.reference,
          `request.references[${index}].reference`,
          bounds,
        ),
      };
    })
    .sort((left, right) =>
      compareSynthesisEngineStrings(
        left.canonicalReferenceId,
        right.canonicalReferenceId,
      ),
    );
  assertUniqueMatcherIds(
    references.map((entry) => entry.canonicalReferenceId),
    "request.references",
  );
  return {
    contractVersion: SYNTHESIS_REFERENCE_MATCHER_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_REFERENCE_MATCHER_BINDING_ALGORITHM_VERSION,
    policyId: matcherPolicy(object.policyId, "request.policyId"),
    papers,
    references,
  };
}

export function rebuildSynthesisReferenceDedupeRequest(
  value: unknown,
  boundsInput: SynthesisReferenceMatcherBounds = {},
): SynthesisReferenceDedupeRequest {
  const bounds = matcherBounds(boundsInput);
  const object = matcherPlainObject(value, "request");
  if (
    object.contractVersion !== SYNTHESIS_REFERENCE_MATCHER_CONTRACT_VERSION ||
    object.algorithmVersion !==
      SYNTHESIS_REFERENCE_MATCHER_DEDUPE_ALGORITHM_VERSION
  ) {
    return matcherInvalid("request matcher version is invalid");
  }
  const canonicals = matcherArray(
    object.canonicals,
    "request.canonicals",
    bounds.dedupeInputMax,
  )
    .map((entry, index) =>
      rebuildDedupeCanonical(entry, `request.canonicals[${index}]`, bounds),
    )
    .sort((left, right) =>
      compareSynthesisEngineStrings(
        left.canonicalReferenceId,
        right.canonicalReferenceId,
      ),
    );
  assertUniqueMatcherIds(
    canonicals.map((entry) => entry.canonicalReferenceId),
    "request.canonicals",
  );
  return {
    contractVersion: SYNTHESIS_REFERENCE_MATCHER_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_REFERENCE_MATCHER_DEDUPE_ALGORITHM_VERSION,
    canonicals,
  };
}

export function computeSynthesisReferenceBinding(
  requestInput: SynthesisReferenceBindingRequest,
  options: {
    bounds?: SynthesisReferenceMatcherBounds;
    checkpoint?: SynthesisReferenceBindingCheckpoint;
    checkpointInterval?: number;
  } = {},
): SynthesisReferenceBindingResult {
  const request = rebuildSynthesisReferenceBindingRequest(
    requestInput,
    options.bounds,
  );
  const interval = Math.max(
    1,
    Math.floor(Number(options.checkpointInterval) || 256),
  );
  options.checkpoint?.({
    phase: "start",
    processed: 0,
    total: request.references.length,
  });
  options.checkpoint?.({
    phase: "index",
    processed: 0,
    total: request.papers.length,
  });
  const index = buildReferenceMatcherIndex(request.papers);
  options.checkpoint?.({
    phase: "index",
    processed: request.papers.length,
    total: request.papers.length,
  });
  const matches = request.references.map((entry, indexValue) => {
    if (indexValue % interval === 0) {
      options.checkpoint?.({
        phase: "references",
        processed: indexValue,
        total: request.references.length,
      });
    }
    return {
      canonicalReferenceId: entry.canonicalReferenceId,
      result: matcherJsonClone(
        resolveReferenceWithPolicy(entry.reference, index, request.policyId),
      ),
    };
  });
  options.checkpoint?.({
    phase: "complete",
    processed: matches.length,
    total: matches.length,
  });
  return {
    contractVersion: SYNTHESIS_REFERENCE_MATCHER_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_REFERENCE_MATCHER_BINDING_ALGORITHM_VERSION,
    policyId: request.policyId,
    matches,
  };
}

export function computeSynthesisReferenceDedupe(
  requestInput: SynthesisReferenceDedupeRequest,
  options: {
    bounds?: SynthesisReferenceMatcherBounds;
    checkpoint?: SynthesisReferenceDedupeCheckpoint;
    checkpointInterval?: number;
  } = {},
): SynthesisReferenceDedupeResult {
  const request = rebuildSynthesisReferenceDedupeRequest(
    requestInput,
    options.bounds,
  );
  const result = matcherJsonClone(
    dedupeCanonicalReferencesClustered(request.canonicals, {
      maxBlockSize: SYNTHESIS_REFERENCE_MATCHER_CLUSTER_BLOCK_MAX,
      maxCandidatePairs: SYNTHESIS_REFERENCE_MATCHER_CANDIDATE_PAIR_MAX,
      checkpoint: options.checkpoint,
      checkpointInterval: options.checkpointInterval,
    }),
  );
  return {
    contractVersion: SYNTHESIS_REFERENCE_MATCHER_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_REFERENCE_MATCHER_DEDUPE_ALGORITHM_VERSION,
    ...result,
  };
}

function rebuildMatcherResultStringArray(value: unknown, location: string) {
  return matcherArray(
    value,
    location,
    SYNTHESIS_REFERENCE_MATCHER_EVIDENCE_ARRAY_MAX,
  ).map((entry, index) =>
    matcherString(entry, `${location}[${index}]`, {
      required: true,
      max: SYNTHESIS_REFERENCE_MATCHER_STRING_MAX,
    }),
  );
}

function rebuildMatcherCandidate(
  value: unknown,
  location: string,
  paperIds: Set<string>,
): ReferenceMatcherCandidate {
  const object = matcherPlainObject(value, location);
  const paperRef = matcherString(object.paperRef, `${location}.paperRef`, {
    required: true,
    max: SYNTHESIS_REFERENCE_MATCHER_ID_MAX,
  });
  if (!paperIds.has(paperRef)) {
    return matcherInvalid(`${location}.paperRef is not in the request`);
  }
  if (
    typeof object.score !== "number" ||
    !Number.isFinite(object.score) ||
    object.score < 0 ||
    object.score > 1
  ) {
    return matcherInvalid(`${location}.score is invalid`);
  }
  const candidate: ReferenceMatcherCandidate = {
    paperRef,
    title: matcherString(object.title, `${location}.title`, {
      max: SYNTHESIS_REFERENCE_MATCHER_STRING_MAX,
    }),
    year: matcherString(object.year, `${location}.year`, {
      max: SYNTHESIS_REFERENCE_MATCHER_STRING_MAX,
    }),
    score: object.score,
    reasons: rebuildMatcherResultStringArray(
      object.reasons,
      `${location}.reasons`,
    ),
    evidence: matcherJsonClone(
      matcherPlainObject(object.evidence, `${location}.evidence`),
    ),
  };
  for (const key of ["itemKey", "literatureItemId"] as const) {
    const field = matcherString(object[key], `${location}.${key}`, {
      max: SYNTHESIS_REFERENCE_MATCHER_ID_MAX,
    });
    if (field) candidate[key] = field;
  }
  return candidate;
}

function rebuildMatcherBindingDecision(
  value: unknown,
  location: string,
  paperIds: Set<string>,
): ReferenceMatcherResult {
  const object = matcherPlainObject(value, location);
  if (
    object.status !== "matched" &&
    object.status !== "suggested" &&
    object.status !== "unmatched" &&
    object.status !== "ambiguous"
  ) {
    return matcherInvalid(`${location}.status is invalid`);
  }
  if (
    object.confidence !== "deterministic" &&
    object.confidence !== "high" &&
    object.confidence !== "low" &&
    object.confidence !== "review"
  ) {
    return matcherInvalid(`${location}.confidence is invalid`);
  }
  const targetPaperRef = matcherString(
    object.targetPaperRef,
    `${location}.targetPaperRef`,
    { max: SYNTHESIS_REFERENCE_MATCHER_ID_MAX },
  );
  if (targetPaperRef && !paperIds.has(targetPaperRef)) {
    return matcherInvalid(`${location}.targetPaperRef is not in the request`);
  }
  if ((object.status === "matched") !== Boolean(targetPaperRef)) {
    return matcherInvalid(`${location}.targetPaperRef is inconsistent`);
  }
  const suggestedCandidates = matcherArray(
    object.suggestedCandidates,
    `${location}.suggestedCandidates`,
    SYNTHESIS_REFERENCE_MATCHER_SUGGESTED_CANDIDATE_MAX,
  ).map((entry, index) =>
    rebuildMatcherCandidate(
      entry,
      `${location}.suggestedCandidates[${index}]`,
      paperIds,
    ),
  );
  assertUniqueMatcherIds(
    suggestedCandidates.map((entry) => entry.paperRef),
    `${location}.suggestedCandidates`,
  );
  for (let index = 1; index < suggestedCandidates.length; index += 1) {
    const previous = suggestedCandidates[index - 1]!;
    const current = suggestedCandidates[index]!;
    if (
      previous.score < current.score ||
      (previous.score === current.score &&
        compareSynthesisEngineStrings(previous.paperRef, current.paperRef) >= 0)
    ) {
      return matcherInvalid(`${location}.suggestedCandidates is not ordered`);
    }
  }
  return {
    status: object.status,
    ...(targetPaperRef ? { targetPaperRef } : {}),
    confidence: object.confidence,
    diagnostics: matcherArray(
      object.diagnostics,
      `${location}.diagnostics`,
      SYNTHESIS_REFERENCE_MATCHER_EVIDENCE_ARRAY_MAX,
    ).map((entry) => matcherJsonClone(entry)),
    suggestedCandidates,
  };
}

export function rebuildSynthesisReferenceBindingResult(
  value: unknown,
  requestInput: SynthesisReferenceBindingRequest,
): SynthesisReferenceBindingResult {
  const request = rebuildSynthesisReferenceBindingRequest(requestInput);
  const object = matcherPlainObject(value, "result");
  if (
    object.contractVersion !== SYNTHESIS_REFERENCE_MATCHER_CONTRACT_VERSION ||
    object.algorithmVersion !==
      SYNTHESIS_REFERENCE_MATCHER_BINDING_ALGORITHM_VERSION ||
    object.policyId !== request.policyId
  ) {
    return matcherInvalid("result matcher identity is invalid");
  }
  const rows = matcherArray(
    object.matches,
    "result.matches",
    request.references.length,
  );
  if (rows.length !== request.references.length) {
    return matcherInvalid("result.matches does not cover the request");
  }
  const paperIds = new Set(request.papers.map((paper) => paper.paperRef));
  const matches = rows.map((entry, index) => {
    const row = matcherPlainObject(entry, `result.matches[${index}]`);
    const expectedId = request.references[index]!.canonicalReferenceId;
    if (row.canonicalReferenceId !== expectedId) {
      return matcherInvalid("result.matches identity or ordering is invalid");
    }
    return {
      canonicalReferenceId: expectedId,
      result: rebuildMatcherBindingDecision(
        row.result,
        `result.matches[${index}].result`,
        paperIds,
      ),
    };
  });
  return {
    contractVersion: SYNTHESIS_REFERENCE_MATCHER_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_REFERENCE_MATCHER_BINDING_ALGORITHM_VERSION,
    policyId: request.policyId,
    matches,
  };
}

export function rebuildSynthesisReferenceDedupeResult(
  value: unknown,
  requestInput: SynthesisReferenceDedupeRequest,
): SynthesisReferenceDedupeResult {
  const request = rebuildSynthesisReferenceDedupeRequest(requestInput);
  const object = matcherPlainObject(value, "result");
  if (
    object.contractVersion !== SYNTHESIS_REFERENCE_MATCHER_CONTRACT_VERSION ||
    object.algorithmVersion !==
      SYNTHESIS_REFERENCE_MATCHER_DEDUPE_ALGORITHM_VERSION
  ) {
    return matcherInvalid("result matcher identity is invalid");
  }
  const clusters = matcherJsonClone(
    matcherArray(object.clusters, "result.clusters", request.canonicals.length),
  ) as ReferenceCanonicalDedupeCluster[];
  const edges = matcherJsonClone(
    matcherArray(
      object.edges,
      "result.edges",
      SYNTHESIS_REFERENCE_MATCHER_CANDIDATE_PAIR_MAX,
    ),
  ) as ReferenceCanonicalDedupeEdge[];
  const actions = matcherJsonClone(
    matcherArray(
      object.actions,
      "result.actions",
      SYNTHESIS_REFERENCE_MATCHER_CANDIDATE_PAIR_MAX * 2,
    ),
  ) as ReferenceCanonicalDedupeClusterAction[];
  const diagnostics = matcherArray(
    object.diagnostics,
    "result.diagnostics",
    SYNTHESIS_REFERENCE_MATCHER_EVIDENCE_ARRAY_MAX,
  ).map((entry) => matcherJsonClone(entry));
  const countersObject = matcherPlainObject(object.counters, "result.counters");
  const counterNames = [
    "canonical_count",
    "block_count",
    "block_skipped_count",
    "candidate_pair_count",
    "candidate_pair_budget",
    "edge_count",
    "cluster_count",
    "subcluster_count",
    "redirect_action_count",
    "review_action_count",
    "extension_risk_edge_count",
    "weak_record_count",
    "excluded_record_count",
  ] as const;
  const counters = Object.fromEntries(
    counterNames.map((name) => {
      const entry = countersObject[name];
      if (!Number.isSafeInteger(entry) || Number(entry) < 0) {
        return matcherInvalid(`result.counters.${name} is invalid`);
      }
      return [name, Number(entry)];
    }),
  ) as SynthesisReferenceDedupeResult["counters"];
  const canonicalIds = new Set(
    request.canonicals.map((entry) => entry.canonicalReferenceId),
  );
  const seenMembers = new Set<string>();
  const clusterIds = new Set<string>();
  let subclusterCount = 0;
  let previousClusterId = "";
  for (const [index, cluster] of clusters.entries()) {
    matcherAssertJsonSafe(cluster, `result.clusters[${index}]`);
    if (
      !cluster ||
      typeof cluster.clusterId !== "string" ||
      (previousClusterId &&
        compareSynthesisEngineStrings(previousClusterId, cluster.clusterId) >=
          0) ||
      clusterIds.has(cluster.clusterId) ||
      !Array.isArray(cluster.canonicalReferenceIds) ||
      !cluster.canonicalReferenceIds.includes(
        cluster.representativeCanonicalReferenceId,
      ) ||
      !Array.isArray(cluster.members) ||
      !Array.isArray(cluster.subclusters)
    ) {
      return matcherInvalid("result.clusters is inconsistent");
    }
    previousClusterId = cluster.clusterId;
    clusterIds.add(cluster.clusterId);
    subclusterCount += cluster.subclusters.length;
    for (const member of cluster.members) {
      if (
        !canonicalIds.has(member.canonicalReferenceId) ||
        seenMembers.has(member.canonicalReferenceId) ||
        !cluster.canonicalReferenceIds.includes(member.canonicalReferenceId)
      ) {
        return matcherInvalid("result cluster member identity is invalid");
      }
      seenMembers.add(member.canonicalReferenceId);
    }
  }
  const edgeIds = new Set<string>();
  let previousEdgeKey = "";
  for (const edge of edges) {
    const key = `${edge.sourceCanonicalReferenceId}\0${edge.targetCanonicalReferenceId}\0${edge.edgeType}`;
    if (
      typeof edge.edgeId !== "string" ||
      edgeIds.has(edge.edgeId) ||
      !canonicalIds.has(edge.sourceCanonicalReferenceId) ||
      !canonicalIds.has(edge.targetCanonicalReferenceId) ||
      compareSynthesisEngineStrings(
        edge.sourceCanonicalReferenceId,
        edge.targetCanonicalReferenceId,
      ) >= 0 ||
      (previousEdgeKey &&
        compareSynthesisEngineStrings(previousEdgeKey, key) >= 0) ||
      typeof edge.score !== "number" ||
      !Number.isFinite(edge.score)
    ) {
      return matcherInvalid("result.edges is inconsistent");
    }
    previousEdgeKey = key;
    edgeIds.add(edge.edgeId);
  }
  const actionIds = new Set<string>();
  let previousActionKey = "";
  for (const action of actions) {
    const key = `${action.clusterId}\0${action.sourceCanonicalReferenceId}\0${action.targetCanonicalReferenceId}`;
    if (
      typeof action.actionId !== "string" ||
      actionIds.has(action.actionId) ||
      (action.action !== "redirect" && action.action !== "review") ||
      !clusterIds.has(action.clusterId) ||
      !canonicalIds.has(action.sourceCanonicalReferenceId) ||
      !canonicalIds.has(action.targetCanonicalReferenceId) ||
      (previousActionKey &&
        compareSynthesisEngineStrings(previousActionKey, key) > 0)
    ) {
      return matcherInvalid("result.actions is inconsistent");
    }
    previousActionKey = key;
    actionIds.add(action.actionId);
  }
  if (
    counters.canonical_count !== request.canonicals.length ||
    counters.candidate_pair_budget !==
      SYNTHESIS_REFERENCE_MATCHER_CANDIDATE_PAIR_MAX ||
    counters.edge_count !== edges.length ||
    counters.cluster_count !== clusters.length ||
    counters.subcluster_count !== subclusterCount ||
    counters.redirect_action_count !==
      actions.filter((entry) => entry.action === "redirect").length ||
    counters.review_action_count !==
      actions.filter((entry) => entry.action === "review").length ||
    counters.extension_risk_edge_count !==
      edges.filter((entry) => entry.edgeType === "contained_extension_risk")
        .length ||
    counters.weak_record_count + counters.excluded_record_count >
      counters.canonical_count
  ) {
    return matcherInvalid("result.counters are inconsistent");
  }
  return {
    contractVersion: SYNTHESIS_REFERENCE_MATCHER_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_REFERENCE_MATCHER_DEDUPE_ALGORITHM_VERSION,
    clusters,
    edges,
    actions,
    diagnostics,
    counters,
  };
}

export function createInProcessSynthesisReferenceMatcherEngine(
  options: {
    bounds?: SynthesisReferenceMatcherBounds;
    bindingCheckpoint?: SynthesisReferenceBindingCheckpoint;
    dedupeCheckpoint?: SynthesisReferenceDedupeCheckpoint;
    checkpointInterval?: number;
  } = {},
): SynthesisReferenceMatcherEngine {
  return {
    async matchBindings(request) {
      return computeSynthesisReferenceBinding(request, {
        bounds: options.bounds,
        checkpoint: options.bindingCheckpoint,
        checkpointInterval: options.checkpointInterval,
      });
    },
    async dedupeCanonicals(request) {
      return computeSynthesisReferenceDedupe(request, {
        bounds: options.bounds,
        checkpoint: options.dedupeCheckpoint,
        checkpointInterval: options.checkpointInterval,
      });
    },
  };
}
