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

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function titleOf(reference) {
  if (!reference || typeof reference !== "object" || Array.isArray(reference)) {
    return "";
  }
  return cleanText(
    reference.title ||
      reference.parsed_title ||
      reference.parsedTitle ||
      reference.paper_title,
  );
}

function rawOf(reference) {
  if (!reference || typeof reference !== "object" || Array.isArray(reference)) {
    return "";
  }
  return cleanText(reference.raw || reference.raw_reference || reference.reference);
}

function authorsOf(reference) {
  const value = reference?.authors || reference?.author;
  if (Array.isArray(value)) {
    return value.map(cleanText).filter(Boolean);
  }
  const text = cleanText(value);
  return text ? [text] : [];
}

function yearOf(reference) {
  const direct = cleanText(reference?.year);
  if (direct) {
    return direct;
  }
  const raw = rawOf(reference);
  const match = raw.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : "";
}

function normalizedTitle(value) {
  return cleanText(value)
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleTokens(value) {
  return normalizedTitle(value)
    .split(/\s+/)
    .filter(Boolean);
}

function contentTokens(value) {
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

function isBareIdentifierOrUrl(title) {
  const text = cleanText(title).replace(/[.,;]+$/g, "");
  return (
    DOI_PATTERN.test(text) ||
    DOI_URL_PATTERN.test(text) ||
    URL_PATTERN.test(text) ||
    ARXIV_PATTERN.test(text)
  );
}

function isMetadataOnlyTitle(title) {
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

function isAuthorOnlyTitle(title) {
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

function hasPossibleAuthorPrefixNoise(title) {
  const text = cleanText(title);
  const firstSentence = text.split(/\.\s+/)[0] || "";
  return (
    firstSentence.length > 20 &&
    AUTHOR_CONNECTOR_PATTERN.test(firstSentence) &&
    isAuthorOnlyTitle(firstSentence)
  );
}

function hasBibliographicSuffix(title) {
  const text = cleanText(title);
  if (!BIBLIOGRAPHIC_MARKER_PATTERN.test(text)) {
    return false;
  }
  return contentTokens(text).length >= 2;
}

export function classifyReferenceExtractionQuality(reference, options = {}) {
  const title = titleOf(reference);
  const authors = authorsOf(reference);
  const year = yearOf(reference);
  const rejectReasons = [];
  const warningReasons = [];

  if (!title) {
    rejectReasons.push("empty_title");
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
    if (title.length > Number(options.longTitleThreshold || 180)) {
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

function summarizeQuality(records) {
  const reasonCounts = {};
  for (const record of records) {
    for (const reason of record.reasons || []) {
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    }
  }
  return reasonCounts;
}

export function filterReferencesForDigestApply(references, options = {}) {
  const accepted = [];
  const rejected = [];
  const warnings = [];
  const input = Array.isArray(references) ? references : [];
  for (let index = 0; index < input.length; index += 1) {
    const reference = input[index];
    const quality = classifyReferenceExtractionQuality(reference, options);
    if (quality.disposition === "reject") {
      rejected.push({
        index,
        title: quality.title,
        reasons: quality.rejectReasons,
      });
      continue;
    }
    accepted.push(reference);
    if (quality.warningReasons.length > 0) {
      warnings.push({
        index,
        title: quality.title,
        reasons: quality.warningReasons,
      });
    }
  }
  return {
    accepted,
    rejected,
    warnings,
    summary: {
      input_count: input.length,
      accepted_count: accepted.length,
      rejected_count: rejected.length,
      warning_count: warnings.length,
      rejected_reason_counts: summarizeQuality(rejected),
      warning_reason_counts: summarizeQuality(warnings),
      rejected,
      warnings,
    },
  };
}
