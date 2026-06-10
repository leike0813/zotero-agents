const DOI_PATTERN = /^(?:doi:\s*)?10\.\d{4,9}\/\S+$/i;
const DOI_URL_PATTERN = /^(?:https?:\/\/)?(?:dx\.)?doi\.org\/10\.\d{4,9}\/\S+$/i;
const URL_PATTERN = /^(?:https?:\/\/|\/\/)\S+$/i;
const ARXIV_PATTERN = /^(?:arxiv:\s*)?\d{4}\.\d{4,5}(?:v\d+)?$/i;
const BIBLIOGRAPHIC_MARKER_PATTERN =
  /\b(?:arxiv preprint|preprint|in proceedings|proceedings of|conference on|journal of|transactions on|vol\.?|volume|no\.?|issue|pp\.?|pages?|publisher|press|springer|ieee|acm|pmlr)\b/i;
const METADATA_ONLY_PATTERN =
  /^(?:[A-Za-z][A-Za-z&.\-/ ]{1,80}\s+)?(?:vol\.?\s*)?\d{1,4}(?:\s*\(\s*\d+\s*\))?(?:\s*,?\s*(?:no\.?|issue|pp\.?|pages?)?\s*\d{1,6}(?:\s*[-–]\s*\d{1,6})?)+\.?$/i;
const AUTHOR_CONNECTOR_PATTERN = /\b(?:and|et\s+al)\b|,/i;
const AUTHOR_TOKEN_PATTERN =
  /^(?:[A-Z]\.?|[A-Z][a-z]+(?:[-'][A-Z][a-z]+)?|[A-Z][a-z]*\.)$/;
const PLACEHOLDER_TITLE_PATTERN =
  /^(?:n\/?a|none|null|undefined|unknown|untitled|not\s+available)$/i;

type ReferenceQualityDisposition = "accept" | "reject";

export type ReferenceExtractionQuality = {
  disposition: ReferenceQualityDisposition;
  rejectReasons: string[];
  warningReasons: string[];
  title: string;
};

function cleanText(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function titleOf(reference: Record<string, unknown>) {
  return cleanText(
    reference.title ||
      reference.parsed_title ||
      reference.parsedTitle ||
      reference.paper_title,
  );
}

function rawOf(reference: Record<string, unknown>) {
  return cleanText(reference.raw || reference.raw_reference || reference.reference);
}

function authorsOf(reference: Record<string, unknown>) {
  const value = reference.authors || reference.author;
  if (Array.isArray(value)) {
    return value.map(cleanText).filter(Boolean);
  }
  const text = cleanText(value);
  return text ? [text] : [];
}

function yearOf(reference: Record<string, unknown>) {
  const direct = cleanText(reference.year);
  if (direct) {
    return direct;
  }
  const match = rawOf(reference).match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : "";
}

function normalizedTitle(value: unknown) {
  return cleanText(value)
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleTokens(value: unknown) {
  return normalizedTitle(value)
    .split(/\s+/)
    .filter(Boolean);
}

function contentTokens(value: unknown) {
  const stop = new Set([
    "a",
    "an",
    "and",
    "for",
    "in",
    "of",
    "on",
    "the",
    "to",
    "with",
    "vol",
    "volume",
    "no",
    "issue",
    "pp",
    "pages",
    "proceedings",
    "conference",
    "journal",
    "preprint",
    "arxiv",
    "doi",
  ]);
  return titleTokens(value).filter(
    (token) => token.length > 1 && !/^\d+$/.test(token) && !stop.has(token),
  );
}

function isBareIdentifierOrUrl(title: string) {
  const text = cleanText(title).replace(/[.,;]+$/g, "");
  return (
    DOI_PATTERN.test(text) ||
    DOI_URL_PATTERN.test(text) ||
    URL_PATTERN.test(text) ||
    ARXIV_PATTERN.test(text)
  );
}

function isPlaceholderTitle(title: string) {
  return PLACEHOLDER_TITLE_PATTERN.test(cleanText(title));
}

function isMetadataOnlyTitle(title: string) {
  const text = cleanText(title);
  if (!text) {
    return false;
  }
  if (/^(?:in\s+)?proceedings\b/i.test(text)) {
    return true;
  }
  if (METADATA_ONLY_PATTERN.test(text)) {
    return true;
  }
  return (
    BIBLIOGRAPHIC_MARKER_PATTERN.test(text) &&
    contentTokens(text).length <= 1 &&
    /\d/.test(text)
  );
}

function isAuthorOnlyTitle(title: string) {
  const text = cleanText(title);
  if (!AUTHOR_CONNECTOR_PATTERN.test(text) || /[:?]/.test(text)) {
    return false;
  }
  const tokens = text
    .replace(/[.,;()]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length < 2 || tokens.length > 18) {
    return false;
  }
  const authorLike = tokens.filter((token) => AUTHOR_TOKEN_PATTERN.test(token));
  return authorLike.length / tokens.length >= 0.75;
}

function hasPossibleAuthorPrefixNoise(title: string) {
  const text = cleanText(title);
  const firstSentence = text.split(/\.\s+/)[0] || "";
  return (
    firstSentence.length > 20 &&
    AUTHOR_CONNECTOR_PATTERN.test(firstSentence) &&
    isAuthorOnlyTitle(firstSentence)
  );
}

function hasBibliographicSuffix(title: string) {
  const text = cleanText(title);
  return BIBLIOGRAPHIC_MARKER_PATTERN.test(text) && contentTokens(text).length >= 2;
}

export function classifySynthesisReferenceQuality(
  reference: Record<string, unknown>,
  options: { longTitleThreshold?: number } = {},
): ReferenceExtractionQuality {
  const title = titleOf(reference);
  const authors = authorsOf(reference);
  const year = yearOf(reference);
  const rejectReasons: string[] = [];
  const warningReasons: string[] = [];

  if (!title) {
    rejectReasons.push("empty_title");
  } else if (isPlaceholderTitle(title)) {
    rejectReasons.push("placeholder_title");
  } else if (isBareIdentifierOrUrl(title)) {
    rejectReasons.push("bare_identifier_or_url_title");
  } else if (isMetadataOnlyTitle(title)) {
    rejectReasons.push("publication_metadata_only_title");
  } else if (isAuthorOnlyTitle(title)) {
    rejectReasons.push("author_only_title");
  } else if (contentTokens(title).length === 0) {
    rejectReasons.push("no_usable_title_tokens");
  }

  if (rejectReasons.length === 0) {
    if (hasBibliographicSuffix(title)) {
      warningReasons.push("bibliographic_suffix_in_title");
    }
    if (hasPossibleAuthorPrefixNoise(title)) {
      warningReasons.push("possible_author_prefix_noise");
    }
    if (title.length > (options.longTitleThreshold || 180)) {
      warningReasons.push("very_long_title");
    }
    if (contentTokens(title).length < 2) {
      warningReasons.push("short_title_requires_context");
    }
    if (!year) {
      warningReasons.push("missing_year");
    }
    if (authors.length === 0) {
      warningReasons.push("missing_authors");
    }
  }

  return {
    disposition: rejectReasons.length > 0 ? "reject" : "accept",
    rejectReasons,
    warningReasons,
    title,
  };
}
