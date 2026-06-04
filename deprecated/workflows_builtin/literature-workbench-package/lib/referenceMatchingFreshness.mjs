import { resolveReferencesPayloadForNote } from "./referencesNote.mjs";
import { requireHostApi } from "./runtime.mjs";

const SCHEMA_VERSION = "1.0.0";
const DEFAULT_REFERENCE_MATCHING_SETTINGS = {
  data_source: "zotero-api",
  confidence_threshold: 0.93,
  ambiguity_delta: 0.03,
  bbt_port: 23119,
  citekey_template: "{author}_{title}_{year}",
};

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b,
  0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
  0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7,
  0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152,
  0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
  0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
  0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08,
  0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f,
  0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function cleanString(value) {
  return String(value ?? "").trim();
}

function normalizeText(value) {
  return cleanString(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function extractYear(value) {
  const match = cleanString(value).match(/\b(1[6-9]\d{2}|20\d{2}|21\d{2})\b/);
  return match ? match[1] : "";
}

function normalizeFiniteNumber(value, fallback, min, max) {
  const parsed = Number(value);
  const next = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(max, Math.max(min, next));
}

function normalizePort(value) {
  const parsed = Math.round(Number(value));
  return Number.isFinite(parsed)
    ? Math.min(65535, Math.max(1, parsed))
    : DEFAULT_REFERENCE_MATCHING_SETTINGS.bbt_port;
}

export function normalizeReferenceMatchingSettings(parameter = {}) {
  const dataSource =
    cleanString(parameter?.data_source) === "bbt-json" ? "bbt-json" : "zotero-api";
  const citekeyTemplate =
    cleanString(parameter?.citekey_template) ||
    DEFAULT_REFERENCE_MATCHING_SETTINGS.citekey_template;
  return {
    data_source: dataSource,
    confidence_threshold: normalizeFiniteNumber(
      parameter?.confidence_threshold,
      DEFAULT_REFERENCE_MATCHING_SETTINGS.confidence_threshold,
      0,
      1,
    ),
    ambiguity_delta: normalizeFiniteNumber(
      parameter?.ambiguity_delta,
      DEFAULT_REFERENCE_MATCHING_SETTINGS.ambiguity_delta,
      0,
      0.2,
    ),
    bbt_port: normalizePort(parameter?.bbt_port),
    citekey_template: citekeyTemplate,
  };
}

function utf8Bytes(input) {
  return new TextEncoder().encode(String(input ?? ""));
}

function rightRotate(value, amount) {
  return (value >>> amount) | (value << (32 - amount));
}

function sha256Hex(input) {
  const bytes = utf8Bytes(input);
  const bitLength = bytes.length * 8;
  const withOne = bytes.length + 1;
  const paddedLength = Math.ceil((withOne + 8) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;
  const words = new Uint32Array(64);

  for (let chunk = 0; chunk < paddedLength; chunk += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(chunk + index * 4, false);
    }
    for (let index = 16; index < 64; index += 1) {
      const s0 =
        rightRotate(words[index - 15], 7) ^
        rightRotate(words[index - 15], 18) ^
        (words[index - 15] >>> 3);
      const s1 =
        rightRotate(words[index - 2], 17) ^
        rightRotate(words[index - 2], 19) ^
        (words[index - 2] >>> 10);
      words[index] =
        (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let index = 0; index < 64; index += 1) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + SHA256_K[index] + words[index]) >>> 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((value) => value.toString(16).padStart(8, "0"))
    .join("");
}

function normalizeJson(value) {
  if (value === undefined || value === null) {
    return null;
  }
  if (
    typeof value === "string" ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return typeof value === "number" && !Number.isFinite(value) ? null : value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeJson(entry));
  }
  if (typeof value === "object") {
    const output = {};
    for (const key of Object.keys(value).sort((left, right) => left.localeCompare(right))) {
      if (value[key] !== undefined) {
        output[key] = normalizeJson(value[key]);
      }
    }
    return output;
  }
  return String(value);
}

export function hashCanonicalJson(value) {
  return sha256Hex(JSON.stringify(normalizeJson(value)));
}

function normalizeAuthors(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeText(entry)).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(/[;\n,]/).map((entry) => normalizeText(entry)).filter(Boolean);
  }
  return [];
}

export function normalizeReferenceInputRows(references) {
  return (Array.isArray(references) ? references : []).map((entry, index) => ({
    id: cleanString(entry?.id || `ref-${index + 1}`),
    title: normalizeText(entry?.title),
    year: extractYear(entry?.year || entry?.date),
    author: normalizeAuthors(entry?.author || entry?.authors),
    rawText: normalizeText(entry?.rawText || entry?.raw || entry?.reference),
    doi: normalizeText(entry?.doi || entry?.DOI),
    url: normalizeText(entry?.url || entry?.URL),
    publicationTitle: normalizeText(entry?.publicationTitle),
    conferenceName: normalizeText(entry?.conferenceName),
    archiveID: normalizeText(entry?.archiveID),
  }));
}

export function normalizeReferenceResultRows(references) {
  return normalizeReferenceInputRows(references).map((entry, index) => ({
    ...entry,
    citekey: cleanString(references?.[index]?.citekey || references?.[index]?.citeKey),
  }));
}

function extractCitekeyFromExtra(extraValue) {
  const match = cleanString(extraValue).match(
    /(?:^|\n)\s*(?:citation\s*key|citekey)\s*:\s*([^\s]+)\s*(?:$|\n)/i,
  );
  return match ? cleanString(match[1]) : "";
}

function getItemField(item, field) {
  try {
    return cleanString(item?.getField?.(field));
  } catch {
    return "";
  }
}

function extractCreatorsFromItem(item) {
  const creators = [];
  const fromGetCreators = item?.getCreators?.();
  if (Array.isArray(fromGetCreators)) {
    for (const creator of fromGetCreators) {
      const name = cleanString(
        creator?.lastName || creator?.name || creator?.firstName,
      );
      if (name) {
        creators.push(name);
      }
    }
  }
  const fromJson = item?.toJSON?.()?.creators;
  if (Array.isArray(fromJson)) {
    for (const creator of fromJson) {
      const name = cleanString(
        creator?.lastName || creator?.name || creator?.firstName,
      );
      if (name) {
        creators.push(name);
      }
    }
  }
  const fallback = cleanString(item?.firstCreator);
  if (fallback) {
    creators.push(fallback);
  }
  return [...new Set(creators.map((entry) => normalizeText(entry)).filter(Boolean))];
}

function extractCitekeyFromItem(item) {
  const direct = getItemField(item, "citationKey");
  if (direct) {
    return direct;
  }
  const fromJson = cleanString(item?.toJSON?.()?.citationKey);
  if (fromJson) {
    return fromJson;
  }
  return extractCitekeyFromExtra(getItemField(item, "extra"));
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
      // fall through
    }
  }
  if (typeof item.deleted === "boolean") {
    return item.deleted;
  }
  const fromJson = item.toJSON?.();
  return !!fromJson?.deleted;
}

function itemToSnapshotRecord(item) {
  return {
    libraryID: Number(item?.libraryID || 0) || 0,
    itemKey: cleanString(item?.key),
    title: normalizeText(getItemField(item, "title") || item?.toJSON?.()?.title),
    year: extractYear(getItemField(item, "date") || item?.toJSON?.()?.date),
    creators: extractCreatorsFromItem(item),
    doi: normalizeText(getItemField(item, "DOI") || getItemField(item, "doi")),
    url: normalizeText(getItemField(item, "url") || getItemField(item, "URL")),
    citekey: cleanString(extractCitekeyFromItem(item)),
  };
}

function normalizeSnapshotRecord(record) {
  return {
    libraryID: Number(record?.libraryID || 0) || 0,
    itemKey: cleanString(record?.itemKey || record?.key),
    title: normalizeText(record?.title),
    year: extractYear(record?.year || record?.date),
    creators: normalizeAuthors(record?.creators || record?.authors),
    doi: normalizeText(record?.doi || record?.DOI),
    url: normalizeText(record?.url || record?.URL),
    citekey: cleanString(record?.citekey || record?.citeKey || record?.citationKey),
  };
}

export function hashLibrarySnapshotRecords(records) {
  const normalized = (Array.isArray(records) ? records : [])
    .map((entry) => normalizeSnapshotRecord(entry))
    .filter((entry) => entry.itemKey || entry.title || entry.citekey)
    .sort((left, right) => {
      const byLibrary = left.libraryID - right.libraryID;
      if (byLibrary !== 0) {
        return byLibrary;
      }
      return `${left.itemKey}\u0000${left.title}\u0000${left.citekey}`.localeCompare(
        `${right.itemKey}\u0000${right.title}\u0000${right.citekey}`,
      );
    });
  return hashCanonicalJson({
    schema: "reference_matching.library_snapshot@1",
    records: normalized,
  });
}

export async function computeLibrarySnapshotHash(runtime) {
  const hostApi = requireHostApi(runtime);
  let items = [];
  if (typeof hostApi.items?.getAll === "function") {
    const loaded = await hostApi.items.getAll();
    if (Array.isArray(loaded)) {
      items = loaded;
    }
  }
  const records = items
    .filter((item) => isRegularItem(item) && !isDeletedItem(item))
    .map((item) => itemToSnapshotRecord(item));
  return hashLibrarySnapshotRecords(records);
}

export function computeReferencesInputHash(references) {
  return hashCanonicalJson({
    schema: "reference_matching.input@1",
    references: normalizeReferenceInputRows(references),
  });
}

export function computeReferencesResultHash(references) {
  return hashCanonicalJson({
    schema: "reference_matching.result@1",
    references: normalizeReferenceResultRows(references),
  });
}

export function computeSettingsHash(parameter) {
  return hashCanonicalJson({
    schema: "reference_matching.settings@1",
    settings: normalizeReferenceMatchingSettings(parameter),
  });
}

export async function buildReferenceMatchingBaseline(args) {
  return {
    schema_version: SCHEMA_VERSION,
    matched_at: cleanString(args?.matchedAt) || new Date().toISOString(),
    workflow_version: cleanString(args?.workflowVersion) || "0.0.0",
    input_hash: computeReferencesInputHash(args?.inputReferences),
    settings_hash: computeSettingsHash(args?.parameter),
    library_snapshot_hash:
      cleanString(args?.librarySnapshotHash) ||
      (await computeLibrarySnapshotHash(args?.runtime)),
    result_hash: computeReferencesResultHash(args?.resultReferences),
  };
}

function isValidBaseline(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  for (const key of ["input_hash", "settings_hash", "library_snapshot_hash"]) {
    if (!/^[a-f0-9]{64}$/.test(cleanString(value[key]))) {
      return false;
    }
  }
  return true;
}

export async function assessReferenceMatchingFreshness(args) {
  const baseline = args?.payload?.reference_matching;
  if (!isValidBaseline(baseline)) {
    return { status: "unknown", fresh: false, reasons: ["baseline_missing"] };
  }
  const inputHash = computeReferencesInputHash(args.references);
  const settingsHash = computeSettingsHash(args.parameter);
  const librarySnapshotHash =
    cleanString(args.librarySnapshotHash) ||
    (await computeLibrarySnapshotHash(args.runtime));
  const reasons = [];
  if (inputHash !== baseline.input_hash) {
    reasons.push("input_changed");
  }
  if (settingsHash !== baseline.settings_hash) {
    reasons.push("settings_changed");
  }
  if (librarySnapshotHash !== baseline.library_snapshot_hash) {
    reasons.push("library_snapshot_changed");
  }
  return {
    status: reasons.length === 0 ? "fresh" : "stale",
    fresh: reasons.length === 0,
    reasons,
    current: {
      input_hash: inputHash,
      settings_hash: settingsHash,
      library_snapshot_hash: librarySnapshotHash,
    },
  };
}

export async function filterFreshReferenceMatchingSelection(args) {
  const selectionContext = args?.selectionContext;
  const notes = Array.isArray(selectionContext?.items?.notes)
    ? selectionContext.items.notes
    : [];
  if (notes.length === 0) {
    return selectionContext;
  }
  let librarySnapshotHash = "";
  try {
    librarySnapshotHash = await computeLibrarySnapshotHash(args.runtime);
  } catch {
    return selectionContext;
  }

  const keptNotes = [];
  for (const noteEntry of notes) {
    try {
      const noteRef =
        typeof noteEntry?.item?.id === "number"
          ? noteEntry.item.id
          : cleanString(noteEntry?.item?.key || noteEntry?.key);
      const noteItem = args.runtime.helpers.resolveItemRef(noteRef);
      const noteContent = cleanString(noteItem?.getNote?.());
      const { payload, references } = await resolveReferencesPayloadForNote({
        noteItem,
        noteContent,
        runtime: args.runtime,
      });
      const freshness = await assessReferenceMatchingFreshness({
        payload,
        references,
        parameter: args.parameter,
        librarySnapshotHash,
        runtime: args.runtime,
      });
      if (freshness.fresh) {
        continue;
      }
    } catch {
      keptNotes.push(noteEntry);
      continue;
    }
    keptNotes.push(noteEntry);
  }

  return {
    ...selectionContext,
    items: {
      ...(selectionContext.items || {}),
      notes: keptNotes,
      attachments: [],
      parents: [],
      children: [],
    },
    summary: {
      ...(selectionContext.summary || {}),
      noteCount: keptNotes.length,
      attachmentCount: 0,
      parentCount: 0,
      childCount: 0,
    },
  };
}

export const __referenceMatchingFreshnessTestOnly = {
  hashLibrarySnapshotRecords,
  normalizeReferenceMatchingSettings,
  computeReferencesInputHash,
  computeReferencesResultHash,
  computeSettingsHash,
};
