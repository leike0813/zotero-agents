import { escapeAttribute, escapeHtml } from "../../lib/htmlCodec.mjs";
import {
  buildPredictedCitekey,
  resolveCitekeyTemplate,
} from "../../lib/citekeyTemplate.mjs";
import {
  persistReferencesPayloadForNote,
  parseReferencesNoteKind,
  replaceReferencesTable,
  resolveReferencesPayloadForNote,
  resolveSelectedReferenceNote,
} from "../../lib/referencesNote.mjs";
import { buildReferenceMatchingBaseline } from "../../lib/referenceMatchingFreshness.mjs";
import {
  requireHostApi,
  requireHostItems,
  resolveRuntimeFetch,
  withPackageRuntimeScope,
} from "../../lib/runtime.mjs";

function normalizeText(text) {
  return String(text || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&amp;/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokenize(text) {
  return normalizeText(text)
    .split(" ")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function jaccardLikeSimilarity(a, b) {
  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));
  if (tokensA.size === 0 || tokensB.size === 0) {
    return 0;
  }
  let common = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      common += 1;
    }
  }
  return common / Math.max(tokensA.size, tokensB.size);
}

function bigramSimilarity(a, b) {
  const left = normalizeText(a).replace(/\s+/g, "");
  const right = normalizeText(b).replace(/\s+/g, "");
  if (!left || !right) {
    return 0;
  }
  if (left === right) {
    return 1;
  }
  const makeBigrams = (value) => {
    if (value.length < 2) {
      return [value];
    }
    const result = [];
    for (let i = 0; i < value.length - 1; i++) {
      result.push(value.slice(i, i + 2));
    }
    return result;
  };
  const leftBigrams = makeBigrams(left);
  const rightBigrams = makeBigrams(right);
  const rightCount = new Map();
  for (const gram of rightBigrams) {
    rightCount.set(gram, (rightCount.get(gram) || 0) + 1);
  }
  let overlap = 0;
  for (const gram of leftBigrams) {
    const count = rightCount.get(gram) || 0;
    if (count > 0) {
      overlap += 1;
      rightCount.set(gram, count - 1);
    }
  }
  return (2 * overlap) / (leftBigrams.length + rightBigrams.length);
}

function extractYear(value) {
  const match = String(value || "").match(/\b(1[6-9]\d{2}|20\d{2}|21\d{2})\b/);
  return match ? match[1] : "";
}

function normalizeCitekeyLookupKey(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}


function normalizeAuthors(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeText(entry))
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[;,]/)
      .map((entry) => normalizeText(entry))
      .filter(Boolean);
  }
  return [];
}

function extractReferenceAuthors(reference) {
  const explicitAuthor = normalizeAuthors(reference?.author);
  if (explicitAuthor.length > 0) {
    return explicitAuthor;
  }
  return normalizeAuthors(reference?.authors);
}

function extractCreatorsFromItem(item) {
  const creators = [];
  const fromGetCreators = item?.getCreators?.();
  if (Array.isArray(fromGetCreators)) {
    for (const creator of fromGetCreators) {
      const name = String(
        creator?.lastName || creator?.name || creator?.firstName || "",
      ).trim();
      if (name) {
        creators.push(name);
      }
    }
  }
  const fromJson = item?.toJSON?.()?.creators;
  if (Array.isArray(fromJson)) {
    for (const creator of fromJson) {
      const name = String(
        creator?.lastName || creator?.name || creator?.firstName || "",
      ).trim();
      if (name) {
        creators.push(name);
      }
    }
  }
  const fallback = String(item?.firstCreator || "").trim();
  if (fallback) {
    creators.push(fallback);
  }
  return creators;
}

function extractCitekeyFromExtra(extraValue) {
  const match = String(extraValue || "").match(
    /(?:^|\n)\s*(?:citation\s*key|citekey)\s*:\s*([^\s]+)\s*(?:$|\n)/i,
  );
  return match ? String(match[1] || "").trim() : "";
}

function getItemField(item, field) {
  try {
    return String(item?.getField?.(field) || "");
  } catch {
    return "";
  }
}

function extractCitekeyFromItem(item) {
  const direct = getItemField(item, "citationKey");
  if (direct) {
    return direct.trim();
  }
  const fromJson = String(item?.toJSON?.()?.citationKey || "").trim();
  if (fromJson) {
    return fromJson;
  }
  const extra = getItemField(item, "extra");
  const fromExtra = extractCitekeyFromExtra(extra);
  if (fromExtra) {
    return fromExtra;
  }
  return "";
}

function isRegularItem(item) {
  if (!item || typeof item !== "object") {
    return false;
  }
  if (typeof item.isRegularItem === "function") {
    return !!item.isRegularItem();
  }
  if (typeof item.isNote === "function" && item.isNote()) {
    return false;
  }
  if (typeof item.isAttachment === "function" && item.isAttachment()) {
    return false;
  }
  return true;
}

function isDeletedItem(item) {
  if (!item || typeof item !== "object") {
    return false;
  }
  if (typeof item.isDeleted === "function") {
    try {
      return !!item.isDeleted();
    } catch {
      // ignore and continue fallback checks
    }
  }
  const direct = item.deleted;
  if (typeof direct === "boolean") {
    return direct;
  }
  if (typeof direct === "number") {
    return direct !== 0;
  }
  const fromJson = item.toJSON?.();
  if (fromJson && typeof fromJson === "object") {
    const value = fromJson.deleted;
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") {
      return value !== 0;
    }
  }
  return false;
}

function collectLibraryItemsByIdScan(runtime) {
  const itemsApi = requireHostItems(runtime);
  const results = [];
  let misses = 0;
  const maxMisses = 200;
  const maxScan = 50000;
  for (let id = 1; id <= maxScan; id++) {
    const item = itemsApi.get(id);
    if (!item) {
      misses += 1;
      if (misses >= maxMisses) {
        break;
      }
      continue;
    }
    misses = 0;
    if (!isRegularItem(item)) {
      continue;
    }
    if (isDeletedItem(item)) {
      continue;
    }
    results.push(item);
  }
  return results;
}

async function collectLibraryItemsFromZoteroApi(runtime) {
  try {
    const loaded = await requireHostApi(runtime).items.getAll();
    if (Array.isArray(loaded)) {
      return loaded.filter(
        (entry) => isRegularItem(entry) && !isDeletedItem(entry),
      );
    }
  } catch {
    // fallback to id scan
  }
  return collectLibraryItemsByIdScan(runtime);
}

function resolveFetchImpl(runtime) {
  return resolveRuntimeFetch(runtime);
}

function resolveBbtRpcEndpoint(parameter) {
  const parsedPort = Math.round(parseNumeric(parameter?.bbt_port, 23119));
  const port = Math.max(1, Math.min(65535, parsedPort));
  return `http://127.0.0.1:${port}/better-bibtex/json-rpc`;
}

async function postJsonRpc(url, payload, runtime) {
  const fetchImpl = resolveFetchImpl(runtime);
  let response = null;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new Error(`bbt-json request failed (${url}): ${String(error)}`);
  }
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text.trim() ? JSON.parse(text) : {};
  } catch {
    throw new Error(`bbt-json response is not valid JSON (${url})`);
  }
  if (!response.ok) {
    throw new Error(
      `bbt-json request failed (${url}): HTTP ${response.status} ${JSON.stringify(parsed)}`,
    );
  }
  if (parsed && typeof parsed === "object" && parsed.error) {
    throw new Error(`bbt-json rpc error (${url}): ${JSON.stringify(parsed.error)}`);
  }
  return parsed?.result;
}

function normalizeBbtCreators(value) {
  const creators = [];
  if (!Array.isArray(value)) {
    return creators;
  }
  for (const entry of value) {
    if (typeof entry === "string" && entry.trim()) {
      creators.push(entry.trim());
      continue;
    }
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const name = String(
      entry.lastName ||
        entry.family ||
        entry.name ||
        entry.firstName ||
        entry.given ||
        "",
    ).trim();
    if (name) {
      creators.push(name);
    }
  }
  return creators;
}

function extractBbtYear(entry) {
  const direct = extractYear(entry?.year || entry?.date || entry?.issued);
  if (direct) {
    return direct;
  }
  const parts = entry?.issued?.["date-parts"];
  if (Array.isArray(parts) && Array.isArray(parts[0])) {
    const year = String(parts[0][0] || "").trim();
    return extractYear(year);
  }
  return "";
}

function buildCandidateFromBbtEntry(entry) {
  const title = String(entry?.title || entry?.data?.title || "").trim();
  const citekey = String(
    entry?.citekey ||
      entry?.citeKey ||
      entry?.citationKey ||
      entry?.data?.citationKey ||
      "",
  ).trim();
  const authors = normalizeAuthors([
    ...normalizeBbtCreators(entry?.creators),
    ...normalizeBbtCreators(entry?.authors),
    ...normalizeAuthors(entry?.author),
  ]);
  return {
    item: entry,
    title,
    normalizedTitle: normalizeText(title),
    year: extractBbtYear(entry),
    authors,
    citekey,
  };
}

async function collectLibraryItemsFromBbtJson(parameter, runtime) {
  const endpoint = resolveBbtRpcEndpoint(parameter);
  const result = await postJsonRpc(endpoint, {
    jsonrpc: "2.0",
    method: "item.search",
    params: [""],
    id: `zotero-skills-reference-matching-${Date.now()}`,
  }, runtime);
  if (Array.isArray(result)) {
    return result;
  }
  if (result && typeof result === "object" && Array.isArray(result.items)) {
    return result.items;
  }
  throw new Error(`bbt-json response payload is unsupported (${endpoint})`);
}

function buildCandidateFromZoteroItem(item) {
  const title = getItemField(item, "title");
  return {
    item,
    title,
    normalizedTitle: normalizeText(title),
    year: extractYear(getItemField(item, "date")),
    authors: normalizeAuthors(extractCreatorsFromItem(item)),
    citekey: extractCitekeyFromItem(item),
  };
}

async function collectLibraryCandidates(dataSource, parameter, runtime) {
  if (dataSource === "bbt-json") {
    const bbtItems = await collectLibraryItemsFromBbtJson(parameter, runtime);
    return bbtItems.map((entry) => buildCandidateFromBbtEntry(entry));
  }
  const zoteroItems = await collectLibraryItemsFromZoteroApi(runtime);
  return zoteroItems.map((entry) => buildCandidateFromZoteroItem(entry));
}

function buildCitekeyIndex(candidates) {
  const index = new Map();
  for (const candidate of candidates || []) {
    const raw = String(candidate?.citekey || "").trim();
    if (!raw) {
      continue;
    }
    const key = normalizeCitekeyLookupKey(raw);
    if (!key) {
      continue;
    }
    const bucket = index.get(key) || [];
    bucket.push(candidate);
    index.set(key, bucket);
  }
  return index;
}

function resolveCandidateByCitekey(citekey, citekeyIndex) {
  const key = normalizeCitekeyLookupKey(citekey);
  if (!key) {
    return { candidate: null, ambiguous: false };
  }
  const bucket = citekeyIndex.get(key) || [];
  if (bucket.length === 1) {
    return { candidate: bucket[0], ambiguous: false };
  }
  if (bucket.length > 1) {
    return { candidate: null, ambiguous: true };
  }
  return { candidate: null, ambiguous: false };
}

function computeMatchScore(reference, candidate) {
  const referenceTitle = String(reference?.title || "");
  const normalizedRefTitle = normalizeText(referenceTitle);
  const normalizedCandidateTitle = candidate.normalizedTitle;
  if (!normalizedRefTitle || !normalizedCandidateTitle || !candidate.citekey) {
    return {
      score: 0,
      exactTitle: false,
      titleScore: 0,
      authorScore: 0,
      yearScore: 0,
    };
  }

  const exactTitle = normalizedRefTitle === normalizedCandidateTitle;
  let titleScore = 0;
  if (exactTitle) {
    titleScore = 1;
  } else if (
    normalizedRefTitle.includes(normalizedCandidateTitle) ||
    normalizedCandidateTitle.includes(normalizedRefTitle)
  ) {
    titleScore = 0.95;
  } else {
    titleScore = Math.max(
      jaccardLikeSimilarity(referenceTitle, candidate.title),
      bigramSimilarity(referenceTitle, candidate.title),
    );
  }

  const referenceAuthors = extractReferenceAuthors(reference);
  let authorScore = 0;
  if (referenceAuthors.length > 0 && candidate.authors.length > 0) {
    const candidateSet = new Set(candidate.authors);
    for (const author of referenceAuthors) {
      if (candidateSet.has(author)) {
        authorScore = 1;
        break;
      }
    }
  }

  const referenceYear = extractYear(reference?.year);
  const yearScore =
    referenceYear && candidate.year && referenceYear === candidate.year ? 1 : 0;

  let score =
    titleScore * 0.82 + authorScore * 0.13 + yearScore * 0.05;
  if (exactTitle) {
    score = Math.max(score, 0.98);
  }
  return {
    score,
    exactTitle,
    titleScore,
    authorScore,
    yearScore,
  };
}

function parseNumeric(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveMatchingOptions(parameter) {
  return {
    confidenceThreshold: Math.min(
      1,
      Math.max(0, parseNumeric(parameter?.confidence_threshold, 0.93)),
    ),
    ambiguityDelta: Math.min(
      0.2,
      Math.max(0, parseNumeric(parameter?.ambiguity_delta, 0.03)),
    ),
    minimumFuzzyTitleScore: 0.9,
  };
}

function resolveReferenceMatch(reference, candidates, options) {
  const scored = [];
  for (const candidate of candidates) {
    const metrics = computeMatchScore(reference, candidate);
    if (metrics.exactTitle) {
      scored.push({
        candidate,
        ...metrics,
      });
      continue;
    }
    if (metrics.titleScore < options.minimumFuzzyTitleScore) {
      continue;
    }
    if (metrics.authorScore === 0 && metrics.yearScore === 0) {
      continue;
    }
    scored.push({
      candidate,
      ...metrics,
    });
  }
  if (scored.length === 0) {
    return null;
  }
  scored.sort((a, b) => b.score - a.score);
  const top = scored[0];
  if (top.score < options.confidenceThreshold) {
    return null;
  }
  if (scored.length > 1) {
    const second = scored[1];
    if (top.score - second.score <= options.ambiguityDelta) {
      return null;
    }
  }
  return top.candidate;
}

function resolveParentItemForReferenceNote(noteItem, runResult, runtime) {
  const selectionParentId = runResult?.resultJson?.selectionContext?.items?.notes?.[0]?.parent?.id;
  if (typeof selectionParentId === "number" && selectionParentId > 0) {
    try {
      return runtime.helpers.resolveItemRef(selectionParentId);
    } catch {
      return null;
    }
  }
  const fallbackParentId =
    (typeof noteItem?.parentItemID === "number" && noteItem.parentItemID > 0
      ? noteItem.parentItemID
      : null) ||
    (typeof noteItem?.parentID === "number" && noteItem.parentID > 0
      ? noteItem.parentID
      : null);
  if (typeof fallbackParentId === "number" && fallbackParentId > 0) {
    try {
      return runtime.helpers.resolveItemRef(fallbackParentId);
    } catch {
      return null;
    }
  }
  return null;
}

function listRelatedKeys(item) {
  const raw = Array.isArray(item?.relatedItems) ? item.relatedItems : [];
  return raw
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
}

function resolveMatchedItem(candidate, runtime) {
  const source = candidate?.item;
  if (!source || typeof source !== "object") {
    return null;
  }
  const id = source.id;
  if (typeof id === "number" && id > 0) {
    try {
      return runtime.helpers.resolveItemRef(id);
    } catch {
      return null;
    }
  }
  const key = String(source.key || "").trim();
  if (key) {
    try {
      return runtime.helpers.resolveItemRef(key);
    } catch {
      return null;
    }
  }
  return null;
}

async function syncParentRelatedItems({
  parentItem,
  matchedCandidates,
  runtime,
}) {
  const resolvedItemsByKey = new Map();
  let unresolved = 0;
  for (const candidate of matchedCandidates || []) {
    const item = resolveMatchedItem(candidate, runtime);
    if (!item) {
      unresolved += 1;
      continue;
    }
    const key = String(item.key || "").trim();
    if (!key) {
      unresolved += 1;
      continue;
    }
    resolvedItemsByKey.set(key, item);
  }
  if (!parentItem) {
    return {
      added: 0,
      existing: 0,
      skipped: resolvedItemsByKey.size + unresolved,
    };
  }
  const existingKeys = new Set(listRelatedKeys(parentItem));
  const toAdd = [];
  let existing = 0;
  for (const [key, item] of resolvedItemsByKey.entries()) {
    if (existingKeys.has(key)) {
      existing += 1;
      continue;
    }
    toAdd.push(item);
  }
  if (toAdd.length > 0) {
    await requireHostApi(runtime).parents.addRelated(parentItem, toAdd);
  }
  return {
    added: toAdd.length,
    existing,
    skipped: unresolved,
  };
}

export async function applyResultImpl({ runResult, runtime, manifest }) {
  const parameter = runResult?.resultJson?.parameter || {};
  const dataSource = String(parameter?.data_source || "zotero-api").trim();
  const options = resolveMatchingOptions(parameter);
  const { noteItem, noteContent } = resolveSelectedReferenceNote({
    runResult,
    runtime,
    workflowId: "reference-matching",
  });
  const { payload, references, payloadTag, source } =
    await resolveReferencesPayloadForNote({
      noteItem,
      noteContent,
      runtime,
    });
  const candidates = await collectLibraryCandidates(dataSource, parameter, runtime);
  const citekeyTemplate = resolveCitekeyTemplate(parameter);
  const citekeyIndex = buildCitekeyIndex(candidates);
  const matchedCandidates = [];

  const nextReferences = references.map((reference) => {
    const explicit = resolveCandidateByCitekey(
      reference?.citekey || reference?.citeKey,
      citekeyIndex,
    );
    if (explicit.candidate && explicit.candidate.citekey) {
      matchedCandidates.push(explicit.candidate);
      return {
        ...(reference || {}),
        citekey: explicit.candidate.citekey,
      };
    }

    const predictedCitekey = buildPredictedCitekey(reference, citekeyTemplate);
    const predicted = resolveCandidateByCitekey(predictedCitekey, citekeyIndex);
    if (predicted.candidate && predicted.candidate.citekey) {
      matchedCandidates.push(predicted.candidate);
      return {
        ...(reference || {}),
        citekey: predicted.candidate.citekey,
      };
    }

    const selected = resolveReferenceMatch(reference, candidates, options);
    if (!selected || !selected.citekey) {
      const cleared = { ...(reference || {}) };
      delete cleared.citekey;
      delete cleared.citeKey;
      return cleared;
    }
    matchedCandidates.push(selected);
    return {
      ...(reference || {}),
      citekey: selected.citekey,
    };
  });

  const nextPayloadBase = runtime.helpers.replacePayloadReferences(
    payload,
    nextReferences,
  );
  const nextPayload = {
    ...(nextPayloadBase && typeof nextPayloadBase === "object"
      ? nextPayloadBase
      : { references: nextReferences }),
    reference_matching: await buildReferenceMatchingBaseline({
      inputReferences: references,
      resultReferences: nextReferences,
      parameter,
      workflowVersion: manifest?.version || "0.1.0",
      runtime,
    }),
  };
  const withPayload = await persistReferencesPayloadForNote({
    source,
    noteItem,
    noteContent,
    payloadTag,
    nextPayload,
    runtime,
  });
  const nextNoteContent = replaceReferencesTable(
    withPayload,
    runtime.helpers.renderReferencesTable(nextReferences),
  );
  await requireHostApi(runtime).notes.update(noteItem, {
    content: nextNoteContent,
  });
  const parentItem = resolveParentItemForReferenceNote(noteItem, runResult, runtime);
  const related = await syncParentRelatedItems({
    parentItem,
    matchedCandidates,
    runtime,
  });

  const matched = nextReferences.filter((entry) =>
    String(entry?.citekey || "").trim(),
  ).length;
  return {
    updated: 1,
    matched,
    total: nextReferences.length,
    related_added: related.added,
    related_existing: related.existing,
    related_skipped: related.skipped,
  };
}

export async function applyResult(args) {
  return withPackageRuntimeScope(args?.runtime, () => applyResultImpl(args));
}

// Test-only export for fixture-driven unit tests.
export const __referenceMatchingTestOnly = {
  buildPredictedCitekey,
};
