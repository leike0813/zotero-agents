export const DEFAULT_PREFS_PREFIX = "extensions.zotero.zotero-skills";
export const TAG_VOCAB_PREF_SUFFIX = "tagVocabularyJson";
export const TAG_VOCAB_LOCAL_COMMITTED_PREF_SUFFIX = "tagVocabularyLocalCommittedJson";
export const TAG_VOCAB_REMOTE_COMMITTED_PREF_SUFFIX = "tagVocabularyRemoteCommittedJson";
export const TAG_VOCAB_STAGED_PREF_SUFFIX = "tagVocabularyStagedJson";
export const WORKFLOW_SETTINGS_PREF_SUFFIX = "workflowSettingsJson";
export const DEFAULT_GITHUB_REPO = "Zotero_TagVocab";
export const DEFAULT_GITHUB_FILE_PATH = "tags/tags.json";
export const GITHUB_API_VERSION = "2022-11-28";
export const FACETS = [
  "field",
  "topic",
  "method",
  "model",
  "ai_task",
  "data",
  "tool",
  "status",
];
export const TAG_PATTERN = /^[a-z_]+:[a-zA-Z0-9/_.-]+$/;

export function normalizeParentBindings(value) {
  const seen = new Set();
  const normalized = [];
  for (const entry of Array.isArray(value) ? value : []) {
    const numeric = Number(entry);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      continue;
    }
    const id = Math.trunc(numeric);
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    normalized.push(id);
  }
  normalized.sort((left, right) => left - right);
  return normalized;
}

export function normalizeStagedPublishState(value) {
  const text = String(value || "").trim().toLowerCase();
  if (
    text === "pending-batch" ||
    text === "publishing" ||
    text === "publish-failed"
  ) {
    return text;
  }
  return "";
}

export function normalizeStagedEntryWithBindings(entry, options = {}) {
  const defaultSourceFlow =
    String(options.defaultSourceFlow || "manual-staged").trim() || "manual-staged";
  const source = entry && typeof entry === "object" ? entry : {};
  const tag = String(source.tag || "").trim();
  const facetFromField = String(source.facet || "").trim().toLowerCase();
  const facetFromTag = tag.includes(":")
    ? String(tag.split(":")[0] || "").trim().toLowerCase()
    : "";
  const facet = facetFromField || facetFromTag || "topic";
  const createdAt = String(source.createdAt || "").trim();
  const updatedAt = String(source.updatedAt || "").trim();
  return {
    tag,
    facet,
    source: String(source.source || "manual").trim() || "manual",
    note: String(source.note || ""),
    deprecated: Boolean(source.deprecated),
    createdAt,
    updatedAt: updatedAt || createdAt,
    sourceFlow:
      String(source.sourceFlow || defaultSourceFlow).trim() || defaultSourceFlow,
    parentBindings: normalizeParentBindings(source.parentBindings),
    publishState: normalizeStagedPublishState(source.publishState),
  };
}

export function mergeParentBindingsIntoStagedEntries(args) {
  const entries = Array.isArray(args?.entries) ? args.entries : [];
  const nextEntry = args?.entry || null;
  const parentBindings = normalizeParentBindings(args?.parentBindings);
  const defaultSourceFlow = args?.defaultSourceFlow;
  const normalizedEntries = entries.map((entry) =>
    normalizeStagedEntryWithBindings(entry, { defaultSourceFlow }),
  );
  const candidate = normalizeStagedEntryWithBindings(nextEntry, { defaultSourceFlow });
  const lowered = String(candidate.tag || "").trim().toLowerCase();
  if (!lowered) {
    return normalizedEntries;
  }
  const index = normalizedEntries.findIndex(
    (entry) => String(entry.tag || "").trim().toLowerCase() === lowered,
  );
  if (index < 0) {
    normalizedEntries.push({
      ...candidate,
      parentBindings: normalizeParentBindings([
        ...candidate.parentBindings,
        ...parentBindings,
      ]),
    });
    return normalizedEntries;
  }
  const existing = normalizedEntries[index];
  normalizedEntries[index] = {
    ...existing,
    ...candidate,
    parentBindings: normalizeParentBindings([
      ...existing.parentBindings,
      ...candidate.parentBindings,
      ...parentBindings,
    ]),
    publishState:
      normalizeStagedPublishState(candidate.publishState) ||
      normalizeStagedPublishState(existing.publishState),
  };
  return normalizedEntries;
}

export function collectParentBindingsByTag(entries, tags) {
  const requested = new Set(
    (Array.isArray(tags) ? tags : [])
      .map((entry) => String(entry || "").trim().toLowerCase())
      .filter(Boolean),
  );
  const bindings = new Map();
  for (const rawEntry of Array.isArray(entries) ? entries : []) {
    const entry = normalizeStagedEntryWithBindings(rawEntry);
    const lowered = String(entry.tag || "").trim().toLowerCase();
    if (!lowered || (requested.size > 0 && !requested.has(lowered))) {
      continue;
    }
    bindings.set(
      lowered,
      normalizeParentBindings([
        ...(bindings.get(lowered) || []),
        ...entry.parentBindings,
      ]),
    );
  }
  return bindings;
}

export function toIsoTimestamp(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString();
}

export function nowIsoTimestamp() {
  return new Date().toISOString();
}

export function getTagPrefix(tag) {
  const text = String(tag || "").trim();
  const index = text.indexOf(":");
  return index > 0 ? text.slice(0, index).trim().toLowerCase() : "";
}

export function sanitizeRemoteTags(tags) {
  const seen = new Set();
  const normalized = [];
  for (const entry of Array.isArray(tags) ? tags : []) {
    const tag = String(entry?.tag || "").trim();
    if (!tag) {
      continue;
    }
    const lowered = tag.toLowerCase();
    if (seen.has(lowered)) {
      continue;
    }
    seen.add(lowered);
    const facet =
      String(entry?.facet || "").trim().toLowerCase() || getTagPrefix(tag) || "topic";
    normalized.push({
      tag,
      facet,
      source: String(entry?.source || "manual").trim() || "manual",
      note: String(entry?.note || ""),
      deprecated: Boolean(entry?.deprecated),
    });
  }
  normalized.sort((left, right) => String(left.tag).localeCompare(String(right.tag)));
  return normalized;
}

export function normalizeRemoteAbbrevs(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }
  const output = {};
  for (const [key, value] of Object.entries(input)) {
    const normalizedKey = String(key || "").trim();
    const normalizedValue = String(value || "").trim();
    if (!normalizedKey || !normalizedValue) {
      continue;
    }
    output[normalizedKey] = normalizedValue;
  }
  return output;
}

export function normalizeRemoteVocabularyPayload(payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  const tags = sanitizeRemoteTags(source.tags);
  const remoteFacets = Array.isArray(source.facets)
    ? source.facets
        .map((entry) => String(entry || "").trim())
        .filter(Boolean)
    : [];
  const facets = [];
  for (const facet of FACETS) {
    if (remoteFacets.includes(facet) || tags.some((entry) => entry.facet === facet)) {
      facets.push(facet);
    }
  }
  for (const facet of remoteFacets) {
    if (!facets.includes(facet)) {
      facets.push(facet);
    }
  }
  return {
    version: String(source.version || "1.0.0").trim() || "1.0.0",
    updated_at: toIsoTimestamp(source.updated_at) || nowIsoTimestamp(),
    facets,
    tags,
    abbrevs: normalizeRemoteAbbrevs(source.abbrevs),
    tag_count: Number.isFinite(Number(source.tag_count))
      ? Math.max(0, Math.trunc(Number(source.tag_count)))
      : tags.length,
  };
}
