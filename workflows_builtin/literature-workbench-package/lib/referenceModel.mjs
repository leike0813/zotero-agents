export function normalizeReferenceAuthors(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[;\n]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

export function normalizeReferenceEntry(entry, index) {
  const normalized = entry && typeof entry === "object" ? { ...entry } : {};
  const id = String(normalized.id || `ref-${index + 1}`).trim();
  const title = String(normalized.title || "").trim();
  const year = String(normalized.year || "").trim();
  const rawText = String(normalized.rawText || "").trim();
  const citekey = String(normalized.citekey || normalized.citeKey || "").trim();
  const author = normalizeReferenceAuthors(normalized.author || normalized.authors);
  const output = {
    ...normalized,
    id,
    title,
    year,
    author,
    rawText,
  };
  const optionalFields = [
    "publicationTitle",
    "conferenceName",
    "university",
    "archiveID",
    "volume",
    "issue",
    "pages",
    "place",
  ];
  for (const field of optionalFields) {
    const value = String(output[field] || "").trim();
    if (value) {
      output[field] = value;
    } else {
      delete output[field];
    }
  }
  if (citekey) {
    output.citekey = citekey;
  } else {
    delete output.citekey;
    delete output.citeKey;
  }
  return output;
}

export function normalizeReferencesArray(value) {
  const refs = Array.isArray(value) ? value : [];
  return refs.map((entry, index) => normalizeReferenceEntry(entry, index));
}

export function normalizeReferencesPayload(payload) {
  if (Array.isArray(payload)) return normalizeReferencesArray(payload);
  if (Array.isArray(payload?.references)) {
    return normalizeReferencesArray(payload.references);
  }
  if (Array.isArray(payload?.items)) return normalizeReferencesArray(payload.items);
  throw new Error("references payload JSON does not contain references array");
}

export function renderReferencesTable(references) {
  const rows = normalizeReferencesArray(references).map((entry, index) => {
    const source = [
      "publicationTitle",
      "conferenceName",
      "university",
      "archiveID",
    ].map((field) => String(entry[field] || "").trim()).find(Boolean) || "";
    const locator = [
      entry.volume ? `Vol. ${entry.volume}` : "",
      entry.issue ? `No. ${entry.issue}` : "",
      entry.pages ? `pp. ${entry.pages}` : "",
      entry.place || "",
    ].filter(Boolean).join("; ");
    return `<tr><td>${index + 1}</td><td>${escapeHtml(entry.year)}</td><td>${escapeHtml(entry.title)}</td><td>${escapeHtml(normalizeReferenceAuthors(entry.author).join("; "))}</td><td>${escapeHtml(source)}</td><td>${escapeHtml(locator)}</td></tr>`;
  });
  return `<table data-zs-view="references-table"><thead><tr><th>#</th><th>Year</th><th>Title</th><th>Authors</th><th>Source</th><th>Locator</th></tr></thead><tbody>${rows.join("")}</tbody></table>`;
}
import { escapeHtml } from "./htmlCodec.mjs";
