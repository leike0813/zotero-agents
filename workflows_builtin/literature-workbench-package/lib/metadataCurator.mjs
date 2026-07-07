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
  if (identifier.type === "DOI") {
    return normalizeDoi(candidate?.DOI) === identifier.normalized;
  }
  if (identifier.type === "ISBN") {
    return normalizeIsbn(candidate?.ISBN) === identifier.normalized;
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

export function canonicalResultFromMetadata(args) {
  const fields = normalizeMetadataFields(args?.metadata || {});
  const creators = normalizeCreators(args?.metadata?.creators);
  return {
    kind: METADATA_CURATION_KIND,
    status: "succeeded",
    source: normalizeString(args?.source) || "unknown",
    metadata: {
      fields,
      ...(creators.length > 0 ? { creators } : {}),
    },
    evidence: Array.isArray(args?.evidence) ? args.evidence : [],
    warnings: Array.isArray(args?.warnings) ? args.warnings : [],
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
