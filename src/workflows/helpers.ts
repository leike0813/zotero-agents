import type { HookHelpers } from "./types";
import { evaluateGeneratedNoteReadiness } from "../modules/libraryArtifactReadiness";

const REFERENCE_SOURCE_FIELDS = [
  "publicationTitle",
  "conferenceName",
  "university",
  "archiveID",
] as const;
const REFERENCE_OPTIONAL_METADATA_FIELDS = [
  ...REFERENCE_SOURCE_FIELDS,
  "volume",
  "issue",
  "pages",
  "place",
] as const;

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function getBaseName(targetPath: string) {
  const normalized = targetPath.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : "";
}

function normalizeReferenceText(value: unknown) {
  return String(value || "").trim();
}

function normalizeReferenceAuthors(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[;\n]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

function resolveReferenceSource(entry: unknown) {
  const reference =
    entry && typeof entry === "object"
      ? (entry as Record<string, unknown>)
      : {};
  for (const field of REFERENCE_SOURCE_FIELDS) {
    const value = normalizeReferenceText(reference[field]);
    if (value) {
      return value;
    }
  }
  return "";
}

function renderReferenceLocator(entry: unknown) {
  const reference =
    entry && typeof entry === "object"
      ? (entry as Record<string, unknown>)
      : {};
  const volume = normalizeReferenceText(reference.volume);
  const issue = normalizeReferenceText(reference.issue);
  const pages = normalizeReferenceText(reference.pages);
  const place = normalizeReferenceText(reference.place);
  const parts: string[] = [];
  if (volume) {
    parts.push(`Vol. ${volume}`);
  }
  if (issue) {
    parts.push(`No. ${issue}`);
  }
  if (pages) {
    parts.push(`pp. ${pages}`);
  }
  if (place) {
    parts.push(place);
  }
  return parts.join("; ");
}

function normalizeReferenceEntry(entry: unknown, index: number) {
  const normalized =
    entry && typeof entry === "object"
      ? ({ ...entry } as Record<string, unknown>)
      : {};
  const output: Record<string, unknown> = { ...normalized };
  output.id = normalizeReferenceText(output.id || `ref-${index + 1}`);
  output.title = normalizeReferenceText(output.title);
  output.year = normalizeReferenceText(output.year);
  const author = normalizeReferenceAuthors(output.author || output.authors);
  output.author = author;
  delete output.authors;

  const citekey = normalizeReferenceText(output.citekey || output.citeKey);
  if (citekey) {
    output.citekey = citekey;
  } else {
    delete output.citekey;
    delete output.citeKey;
  }

  const rawText = normalizeReferenceText(output.rawText);
  if (rawText) {
    output.rawText = rawText;
  } else {
    delete output.rawText;
  }

  for (const field of REFERENCE_OPTIONAL_METADATA_FIELDS) {
    const value = normalizeReferenceText(output[field]);
    if (value) {
      output[field] = value;
    } else {
      delete output[field];
    }
  }

  return output;
}

function normalizeReferencesArray(value: unknown) {
  const refs = Array.isArray(value) ? value : [];
  return refs.map((entry, index) => normalizeReferenceEntry(entry, index));
}

function normalizeReferencesPayload(payload: unknown) {
  if (Array.isArray(payload)) {
    return normalizeReferencesArray(payload);
  }
  if (payload && typeof payload === "object") {
    const typed = payload as Record<string, unknown>;
    if (Array.isArray(typed.references)) {
      return normalizeReferencesArray(typed.references);
    }
    if (Array.isArray(typed.items)) {
      return normalizeReferencesArray(typed.items);
    }
  }
  throw new Error("references payload JSON does not contain references array");
}

function replacePayloadReferences(
  payload: unknown,
  references: Record<string, unknown>[],
) {
  if (Array.isArray(payload)) {
    return references;
  }
  if (!payload || typeof payload !== "object") {
    return { references };
  }
  const typed = payload as Record<string, unknown>;
  if (Array.isArray(typed.references)) {
    return {
      ...typed,
      references,
    };
  }
  if (Array.isArray(typed.items)) {
    return {
      ...typed,
      items: references,
    };
  }
  return {
    ...typed,
    references,
  };
}

function renderReferencesTable(references: unknown) {
  const normalized = normalizeReferencesArray(references);
  const rows = normalized.map((entry, index) => {
    const year = normalizeReferenceText(entry.year);
    const title = normalizeReferenceText(entry.title);
    const authors = normalizeReferenceAuthors(entry.author).join("; ");
    const source = resolveReferenceSource(entry);
    const locator = renderReferenceLocator(entry);
    return [
      "<tr>",
      `<td>${index + 1}</td>`,
      `<td>${escapeHtml(year)}</td>`,
      `<td>${escapeHtml(title)}</td>`,
      `<td>${escapeHtml(authors)}</td>`,
      `<td>${escapeHtml(source)}</td>`,
      `<td>${escapeHtml(locator)}</td>`,
      "</tr>",
    ].join("");
  });
  return [
    '<table data-zs-view="references-table">',
    "<thead><tr><th>#</th><th>Year</th><th>Title</th><th>Authors</th><th>Source</th><th>Locator</th></tr></thead>",
    `<tbody>${rows.join("")}</tbody>`,
    "</table>",
  ].join("");
}

export function createHookHelpers(zotero: typeof Zotero): HookHelpers {
  const helpers: HookHelpers = {
    resolveItemRef: (ref) => {
      if (typeof ref === "object") {
        return ref;
      }
      if (typeof ref === "number") {
        const item = zotero.Items.get(ref);
        if (!item) {
          throw new Error(`Item not found: ${ref}`);
        }
        return item;
      }
      const item = zotero.Items.getByLibraryAndKey(
        zotero.Libraries.userLibraryID,
        ref,
      );
      if (!item) {
        throw new Error(`Item not found: ${ref}`);
      }
      return item;
    },
    basenameOrFallback: (targetPath, fallback) =>
      targetPath ? getBaseName(targetPath) : fallback,
    toHtmlNote: (title, body) =>
      `<div><h1>${escapeHtml(title)}</h1><pre>${escapeHtml(body)}</pre></div>`,
    normalizeReferenceAuthors,
    normalizeReferenceEntry,
    normalizeReferencesArray,
    normalizeReferencesPayload,
    replacePayloadReferences,
    resolveReferenceSource,
    renderReferenceLocator,
    renderReferencesTable,
    inspectGeneratedNoteReadiness: async (parentRef, spec) => {
      const parent = helpers.resolveItemRef(parentRef);
      return evaluateGeneratedNoteReadiness(parent, spec);
    },
  };

  return helpers;
}
