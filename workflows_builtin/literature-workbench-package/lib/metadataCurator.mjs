export const METADATA_CURATION_KIND = "literature_metadata_curation";

const FIELD_ALLOWLIST = [
  "title",
  "shortTitle",
  "DOI",
  "ISBN",
  "ISSN",
  "url",
  "abstractNote",
  "date",
  "publicationTitle",
  "journalAbbreviation",
  "volume",
  "issue",
  "pages",
  "language",
  "libraryCatalog",
  "place",
  "publisher",
  "edition",
  "series",
  "seriesTitle",
  "seriesNumber",
  "numberOfVolumes",
  "numPages",
  "bookTitle",
  "conferenceName",
  "proceedingsTitle",
  "university",
  "thesisType",
  "reportType",
  "institution",
  "archive",
  "archiveLocation",
  "callNumber",
  "rights",
  "accessDate",
  "extra",
];

export function isObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function normalizeString(value) {
  return String(value || "").trim();
}

export function normalizeDoi(value) {
  return normalizeString(value)
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .replace(/[.,;]+$/g, "")
    .toLowerCase();
}

export function normalizeIsbn(value) {
  return normalizeString(value)
    .replace(/^ISBN(?:-1[03])?:/i, "")
    .replace(/[\s-]+/g, "")
    .toUpperCase();
}

export function normalizeArxiv(value) {
  const normalized = normalizeString(value)
    .replace(/^arxiv:\s*/i, "")
    .replace(/^https?:\/\/(?:www\.)?arxiv\.org\/(?:abs|pdf)\//i, "")
    .replace(/\.pdf(?:[?#].*)?$/i, "")
    .replace(/[?#].*$/g, "")
    .replace(/[.,;]+$/g, "");
  const match =
    normalized.match(/^\d{4}\.\d{4,5}(?:v\d+)?$/i) ||
    normalized.match(/^[a-z-]+(?:\.[A-Z]{2})?\/\d{7}(?:v\d+)?$/i);
  return match ? match[0] : "";
}

export function normalizePmid(value) {
  const normalized = normalizeString(value)
    .replace(/^PMID:\s*/i, "")
    .replace(/[?#].*$/g, "")
    .replace(/[.,;]+$/g, "");
  return /^\d{1,12}$/.test(normalized) ? normalized : "";
}

function decodeUrlComponentSafe(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function trimIdentifierTail(value) {
  return normalizeString(value).replace(/[)\].,;'"<>]+$/g, "");
}

function extractDoiFromText(value) {
  const decoded = decodeUrlComponentSafe(normalizeString(value));
  const match = decoded.match(/\b10\.\d{4,9}\/[^\s"'<>]+/i);
  return match ? normalizeDoi(trimIdentifierTail(match[0])) : "";
}

function extractPrefixedIdentifier(value, label, normalizer) {
  const pattern = new RegExp(`(?:^|\\n)\\s*${label}\\s*:\\s*([^\\n]+)`, "i");
  const match = normalizeString(value).match(pattern);
  return match ? normalizer(trimIdentifierTail(match[1])) : "";
}

export function selectIdentifierFromExtra(value) {
  const raw = normalizeString(value);
  if (!raw) {
    return null;
  }
  const doi = extractPrefixedIdentifier(raw, "DOI", normalizeDoi);
  if (doi) {
    return { type: "DOI", value: doi, normalized: doi, source: "extra" };
  }
  const isbn = extractPrefixedIdentifier(raw, "ISBN(?:-1[03])?", normalizeIsbn);
  if (isbn) {
    return { type: "ISBN", value: isbn, normalized: isbn, source: "extra" };
  }
  const arxiv = extractPrefixedIdentifier(raw, "arXiv", normalizeArxiv);
  if (arxiv) {
    return {
      type: "arXiv",
      value: arxiv,
      normalized: arxiv.toLowerCase(),
      source: "extra",
    };
  }
  const pmid = extractPrefixedIdentifier(raw, "PMID", normalizePmid);
  if (pmid) {
    return { type: "PMID", value: pmid, normalized: pmid, source: "extra" };
  }
  return null;
}

export function selectIdentifierFromUrl(value) {
  const raw = normalizeString(value);
  if (!raw) {
    return null;
  }
  const doi = extractDoiFromText(raw);
  if (doi) {
    return {
      type: "DOI",
      value: doi,
      normalized: doi,
      source: "url",
    };
  }

  let parsed = null;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const pathParts = parsed.pathname.split("/").filter(Boolean);
  if (hostname === "arxiv.org" && pathParts.length >= 2) {
    const namespace = pathParts[0].toLowerCase();
    if (namespace === "abs" || namespace === "pdf") {
      const arxiv = normalizeArxiv(pathParts[1]);
      if (arxiv) {
        return {
          type: "arXiv",
          value: arxiv,
          normalized: arxiv.toLowerCase(),
          source: "url",
        };
      }
    }
  }
  if (hostname === "pubmed.ncbi.nlm.nih.gov" && pathParts.length >= 1) {
    const pmid = normalizePmid(pathParts[0]);
    if (pmid) {
      return {
        type: "PMID",
        value: pmid,
        normalized: pmid,
        source: "url",
      };
    }
  }
  return null;
}

function readField(item, field) {
  try {
    return normalizeString(item?.getField?.(field));
  } catch {
    return "";
  }
}

function getCreators(item) {
  try {
    const creators = item?.getCreators?.() || [];
    return Array.isArray(creators)
      ? creators.map((creator) => ({ ...(creator || {}) }))
      : [];
  } catch {
    return [];
  }
}

export function resolveParentEntry(selectionContext) {
  const parents = selectionContext?.items?.parents;
  return Array.isArray(parents) && parents.length > 0 ? parents[0] : null;
}

export function resolveParentItem(selectionContext, runtime) {
  const entry = resolveParentEntry(selectionContext);
  const item = entry?.item || null;
  if (item && typeof item.getField === "function") {
    return item;
  }
  const id = Number(item?.id || entry?.id || 0);
  const hostItems = runtime?.hostApi?.items;
  if (id && typeof hostItems?.get === "function") {
    const resolved = hostItems.get(id);
    if (resolved) {
      return resolved;
    }
  }
  if (id && typeof hostItems?.resolve === "function") {
    try {
      const resolved = hostItems.resolve(id);
      if (resolved) {
        return resolved;
      }
    } catch {
      // Fall through to key-based and legacy runtime resolution.
    }
  }
  const key = normalizeString(item?.key || entry?.key);
  const libraryID = Number(item?.libraryID || entry?.libraryID || 0);
  if (key && typeof hostItems?.getByLibraryAndKey === "function") {
    const resolved = hostItems.getByLibraryAndKey(libraryID, key);
    if (resolved) {
      return resolved;
    }
  }
  if (id && runtime?.zotero?.Items?.get) {
    const resolved = runtime.zotero.Items.get(id);
    if (resolved) {
      return resolved;
    }
  }
  if (key && runtime?.zotero?.Items?.getByLibraryAndKey) {
    const resolved = runtime.zotero.Items.getByLibraryAndKey(
      libraryID || runtime.zotero.Libraries?.userLibraryID,
      key,
    );
    if (resolved) {
      return resolved;
    }
  }
  throw new Error("literature-metadata-curator requires one selected parent item");
}

export function buildParentSnapshot(parent) {
  const fields = {};
  for (const field of FIELD_ALLOWLIST) {
    const value = readField(parent, field);
    if (value) {
      fields[field] = value;
    }
  }
  return {
    id: parent?.id || null,
    key: normalizeString(parent?.key),
    libraryID: parent?.libraryID || null,
    itemType: normalizeString(parent?.itemType),
    title: fields.title || "",
    DOI: fields.DOI || "",
    ISBN: fields.ISBN || "",
    url: fields.url || "",
    fields,
    creators: getCreators(parent),
  };
}

export function selectIdentifier(snapshot) {
  const doi = normalizeDoi(snapshot?.DOI || snapshot?.fields?.DOI);
  if (doi) {
    return {
      type: "DOI",
      value: snapshot?.DOI || snapshot?.fields?.DOI,
      normalized: doi,
    };
  }
  const isbn = normalizeIsbn(snapshot?.ISBN || snapshot?.fields?.ISBN);
  if (isbn) {
    return {
      type: "ISBN",
      value: snapshot?.ISBN || snapshot?.fields?.ISBN,
      normalized: isbn,
    };
  }
  const extraIdentifier = selectIdentifierFromExtra(snapshot?.fields?.extra);
  if (extraIdentifier) {
    return extraIdentifier;
  }
  const urlIdentifier = selectIdentifierFromUrl(
    snapshot?.url || snapshot?.fields?.url,
  );
  if (urlIdentifier) {
    return urlIdentifier;
  }
  return null;
}

export function normalizeMetadataFields(source) {
  const fields = {};
  if (!isObject(source)) {
    return fields;
  }
  for (const field of FIELD_ALLOWLIST) {
    const value = source[field];
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      const normalized =
        typeof value === "string" ? normalizeString(value) : value;
      if (normalized !== "") {
        fields[field] = normalized;
      }
    }
  }
  return fields;
}

export function normalizeCreators(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const creators = [];
  for (const entry of value) {
    if (!isObject(entry)) {
      continue;
    }
    const creatorType = normalizeString(entry.creatorType) || "author";
    const name = normalizeString(entry.name);
    if (name) {
      creators.push({ name, creatorType });
      continue;
    }
    const firstName = normalizeString(entry.firstName);
    const lastName = normalizeString(entry.lastName);
    if (firstName || lastName) {
      creators.push({ firstName, lastName, creatorType });
    }
  }
  return creators;
}

export function candidateMatchesIdentifier(candidate, identifier) {
  if (!identifier) {
    return false;
  }
  const extraIdentifier = selectIdentifierFromExtra(candidate?.extra);
  if (identifier.type === "DOI") {
    return (
      normalizeDoi(candidate?.DOI) === identifier.normalized ||
      (extraIdentifier?.type === "DOI" &&
        extraIdentifier.normalized === identifier.normalized)
    );
  }
  if (identifier.type === "ISBN") {
    return (
      normalizeIsbn(candidate?.ISBN) === identifier.normalized ||
      (extraIdentifier?.type === "ISBN" &&
        extraIdentifier.normalized === identifier.normalized)
    );
  }
  if (identifier.type === "arXiv") {
    const candidateArxiv =
      normalizeArxiv(candidate?.archiveID) ||
      normalizeArxiv(candidate?.arXiv) ||
      (extraIdentifier?.type === "arXiv" ? extraIdentifier.normalized : "");
    return candidateArxiv.toLowerCase() === identifier.normalized;
  }
  if (identifier.type === "PMID") {
    return (
      normalizePmid(candidate?.PMID) === identifier.normalized ||
      normalizePmid(candidate?.pmid) === identifier.normalized ||
      (extraIdentifier?.type === "PMID" &&
        extraIdentifier.normalized === identifier.normalized)
    );
  }
  return false;
}

export function hasCoreBibliographicMetadata(candidate) {
  if (!isObject(candidate)) {
    return false;
  }
  if (normalizeString(candidate.title)) {
    return true;
  }
  const fields = normalizeMetadataFields(candidate);
  return (
    Object.keys(fields).some((field) => field !== "DOI" && field !== "ISBN") ||
    normalizeCreators(candidate.creators).length > 0
  );
}

function detectOriginalScript(value) {
  const text = normalizeString(value);
  const groups = [
    ["han", /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u],
    ["kana", /[\u3040-\u30ff]/u],
    ["hangul", /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/u],
    ["cyrillic", /[\u0400-\u052f]/u],
    ["arabic", /[\u0600-\u06ff\u0750-\u077f]/u],
    ["hebrew", /[\u0590-\u05ff]/u],
    ["devanagari", /[\u0900-\u097f]/u],
    ["thai", /[\u0e00-\u0e7f]/u],
    ["greek", /[\u0370-\u03ff]/u],
  ];
  return groups.find(([, pattern]) => pattern.test(text))?.[0] || "";
}

function creatorText(creators) {
  return normalizeCreators(creators)
    .map((creator) =>
      normalizeString(
        creator.name || `${creator.firstName || ""}${creator.lastName || ""}`,
      ),
    )
    .join(" ");
}

function appendWarningOnce(warnings, warning) {
  if (!warnings.some((entry) => entry?.code === warning.code)) {
    warnings.push(warning);
  }
}

export function protectOriginalScriptMetadata(args) {
  const parent = args?.parent?.fields
    ? args.parent
    : args?.parent && typeof args.parent.getField === "function"
      ? buildParentSnapshot(args.parent)
      : args?.parent || {};
  const metadata = {
    ...(isObject(args?.metadata) ? args.metadata : {}),
    fields: {
      ...(isObject(args?.metadata?.fields) ? args.metadata.fields : {}),
    },
  };
  const warnings = Array.isArray(args?.warnings) ? [...args.warnings] : [];

  const parentTitle = normalizeString(parent?.title || parent?.fields?.title);
  const candidateTitle = normalizeString(metadata.fields.title);
  const titleScript = detectOriginalScript(parentTitle);
  if (
    titleScript &&
    candidateTitle &&
    detectOriginalScript(candidateTitle) !== titleScript
  ) {
    delete metadata.fields.title;
    appendWarningOnce(warnings, {
      code: "native_title_translation_only",
      message:
        "The candidate title uses a different script, so the original-script title was preserved.",
    });
  }

  const parentCreatorScript = detectOriginalScript(creatorText(parent?.creators));
  const candidateCreators = normalizeCreators(metadata.creators);
  if (
    parentCreatorScript &&
    candidateCreators.length > 0 &&
    detectOriginalScript(creatorText(candidateCreators)) !== parentCreatorScript
  ) {
    delete metadata.creators;
    appendWarningOnce(warnings, {
      code: "native_creator_names_unverified",
      message:
        "The candidate creators do not preserve the authoritative original-script names.",
    });
  }
  return { metadata, warnings };
}

function normalizeSemanticMetadata(source) {
  const originalTitle = isObject(source?.originalTitle)
    ? {
        value: normalizeString(source.originalTitle.value),
        ...(normalizeString(source.originalTitle.language)
          ? { language: normalizeString(source.originalTitle.language) }
          : {}),
        ...(normalizeString(source.originalTitle.script)
          ? { script: normalizeString(source.originalTitle.script) }
          : {}),
      }
    : null;
  const alternateTitles = (Array.isArray(source?.alternateTitles)
    ? source.alternateTitles
    : []
  )
    .filter(isObject)
    .map((entry) => ({
      value: normalizeString(entry.value),
      role: normalizeString(entry.role) || "alternate",
      ...(normalizeString(entry.language)
        ? { language: normalizeString(entry.language) }
        : {}),
      ...(normalizeString(entry.script)
        ? { script: normalizeString(entry.script) }
        : {}),
    }))
    .filter((entry) => entry.value);
  const containers = (Array.isArray(source?.containers)
    ? source.containers
    : []
  )
    .filter(isObject)
    .map((entry) => ({
      role: normalizeString(entry.role),
      title: normalizeString(entry.title),
      ...(normalizeString(entry.language)
        ? { language: normalizeString(entry.language) }
        : {}),
      ...(normalizeString(entry.script)
        ? { script: normalizeString(entry.script) }
        : {}),
    }))
    .filter((entry) => entry.role && entry.title);
  const creatorCompleteness = normalizeString(source?.creatorCompleteness);
  return {
    ...(originalTitle?.value ? { originalTitle } : {}),
    ...(alternateTitles.length ? { alternateTitles } : {}),
    ...(containers.length ? { containers } : {}),
    ...(normalizeString(source?.language)
      ? { language: normalizeString(source.language) }
      : {}),
    ...(normalizeString(source?.script)
      ? { script: normalizeString(source.script) }
      : {}),
    ...(creatorCompleteness
      ? { creatorCompleteness }
      : {}),
  };
}

export function canonicalResultFromMetadata(args) {
  const fields = normalizeMetadataFields(args?.metadata || {});
  const creators = normalizeCreators(args?.metadata?.creators);
  const itemType = normalizeString(args?.metadata?.itemType);
  const protectedResult = protectOriginalScriptMetadata({
    parent: args?.parent,
    metadata: {
      ...(itemType ? { itemType } : {}),
      fields,
      ...(creators.length > 0 ? { creators } : {}),
      ...normalizeSemanticMetadata(args?.metadata),
    },
    warnings: args?.warnings,
  });
  return {
    kind: METADATA_CURATION_KIND,
    status: "succeeded",
    source: normalizeString(args?.source) || "unknown",
    metadata: protectedResult.metadata,
    evidence: Array.isArray(args?.evidence) ? args.evidence : [],
    warnings: protectedResult.warnings,
  };
}

export function resolveCanonicalResult(args) {
  const candidates = [
    args?.resultContext?.resultJson?.data,
    args?.resultContext?.resultJson,
    args?.runResult?.resultJson?.data,
    args?.runResult?.resultJson,
  ];
  for (const candidate of candidates) {
    if (isObject(candidate) && candidate.kind === METADATA_CURATION_KIND) {
      return candidate;
    }
  }
  return null;
}

export function buildFallbackContext(args) {
  return {
    parent: args?.parent || null,
    identifier: args?.identifier || null,
    diagnostics: Array.isArray(args?.diagnostics) ? args.diagnostics : [],
  };
}
