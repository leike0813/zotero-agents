import {
  decodeHtmlEntities,
  escapeAttribute,
  escapeHtml,
  readTagAttribute,
} from "../../lib/htmlCodec.mjs";
import {
  parseCitationAnalysisPayload,
  recoverDigestMarkdownPayloadFromNoteHtml,
  stripDigestWrapperHeading,
} from "../../lib/literatureDigestNotes.mjs";
import {
  buildLegalGeneratedMarkdownNoteContent,
  buildLegalGeneratedNoteContent,
} from "../../lib/noteCodecs.mjs";
import {
  attachWorkbenchPayloadToNote,
  resolveWorkbenchEmbeddedPayloadBlock,
} from "../../lib/embeddedPayloadAttachments.mjs";
import { copyTextToClipboard } from "../../lib/clipboard.mjs";
import {
  extractRepresentativeImageExportDescriptor,
} from "../../lib/representativeImage.mjs";
import {
  parseGeneratedNoteKind,
  parseReferencesPayload,
} from "../../lib/referencesNote.mjs";
import { requireHostApi, withPackageRuntimeScope } from "../../lib/runtime.mjs";

const WORKBENCH_PAYLOAD_TYPES = [
  "digest-markdown",
  "references-json",
  "citation-analysis-json",
];

function normalizeText(value) {
  return String(value || "").trim();
}

function addRef(refs, value) {
  if (value == null || value === false) {
    return;
  }
  if (typeof value === "number") {
    refs.push(value);
    return;
  }
  if (typeof value === "string") {
    const text = value.trim();
    if (text) {
      refs.push(text);
    }
    return;
  }
  if (typeof value === "object") {
    addRef(refs, value.id || value.key || value.item?.id || value.item?.key);
  }
}

function uniqueRefs(refs) {
  const seen = new Set();
  const output = [];
  for (const ref of refs) {
    const key = typeof ref === "number" ? `id:${ref}` : `key:${String(ref)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(ref);
  }
  return output;
}

function resolveSelectionContext(args) {
  return (
    args?.runResult?.resultJson?.selectionContext ||
    args?.runResult?.request?.selectionContext ||
    args?.request?.selectionContext ||
    args?.selectionContext ||
    {}
  );
}

function collectSelectionRefs(selectionContext) {
  const refs = [];
  const items = selectionContext?.items || {};
  for (const groupName of [
    "notes",
    "parents",
    "attachments",
    "children",
    "regular",
    "selected",
  ]) {
    for (const entry of Array.isArray(items[groupName]) ? items[groupName] : []) {
      addRef(refs, entry);
    }
  }
  return refs;
}

function resolveHostItem(host, ref) {
  try {
    return host.items.get(ref) || null;
  } catch {
    return null;
  }
}

function isNoteItem(item) {
  try {
    if (typeof item?.isNote === "function") {
      return item.isNote();
    }
  } catch {
    // ignore
  }
  return String(item?.itemType || "") === "note";
}

function isRegularItem(item) {
  try {
    if (typeof item?.isRegularItem === "function") {
      return item.isRegularItem();
    }
  } catch {
    // ignore
  }
  return !!item && !isNoteItem(item) && String(item.itemType || "") !== "attachment";
}

function collectNotesFromItem(host, item) {
  if (!item) {
    return [];
  }
  if (isNoteItem(item)) {
    return [item];
  }
  let parent = item;
  if (!isRegularItem(parent) && item.parentID) {
    parent = resolveHostItem(host, item.parentID);
  }
  if (!parent || typeof parent.getNotes !== "function") {
    return [];
  }
  return (parent.getNotes() || [])
    .map((ref) => resolveHostItem(host, ref))
    .filter(Boolean);
}

function stripHtmlTags(value) {
  return decodeHtmlEntities(String(value || "").replace(/<[^>]+>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeReferencesFromPayload(payload, runtime) {
  try {
    if (typeof runtime?.helpers?.normalizeReferencesPayload === "function") {
      return runtime.helpers.normalizeReferencesPayload(payload);
    }
  } catch {
    // fall through
  }
  if (Array.isArray(payload?.references)) {
    return payload.references;
  }
  if (Array.isArray(payload?.items)) {
    return payload.items;
  }
  if (Array.isArray(payload)) {
    return payload;
  }
  return [];
}

function renderReferencesTable(references, runtime) {
  if (typeof runtime?.helpers?.renderReferencesTable === "function") {
    return runtime.helpers.renderReferencesTable(references || []);
  }
  const rows = (Array.isArray(references) ? references : []).map((entry, index) => {
    const title = escapeHtml(normalizeText(entry?.title));
    const year = escapeHtml(normalizeText(entry?.year));
    return `<tr><td>${index + 1}</td><td>${title}</td><td>${year}</td></tr>`;
  });
  return [
    "<table>",
    "<thead><tr><th>#</th><th>Title</th><th>Year</th></tr></thead>",
    `<tbody>${rows.join("")}</tbody>`,
    "</table>",
  ].join("");
}

function stripInitialHeading(markdown, title) {
  const escaped = String(title || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return String(markdown || "").replace(
    new RegExp(`^\\s*#\\s+${escaped}\\s*(?:\\r?\\n)+`, "i"),
    "",
  );
}

function extractFirstRepresentativeImageTag(noteContent) {
  const descriptor = extractRepresentativeImageExportDescriptor(noteContent);
  if (!descriptor?.attachmentKey) {
    return null;
  }
  const imgTagMatch = String(noteContent || "").match(
    /<img\b[^>]*\bdata-attachment-key\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)[^>]*>/i,
  );
  if (!imgTagMatch) {
    return null;
  }
  const imgTag = imgTagMatch[0];
  const key = normalizeText(readTagAttribute(imgTag, "data-attachment-key"));
  if (key !== descriptor.attachmentKey) {
    return null;
  }
  return {
    imgTag,
    index: imgTagMatch.index || 0,
    attachmentKey: key,
    alt:
      normalizeText(readTagAttribute(imgTag, "alt")) ||
      normalizeText(descriptor.alt) ||
      "Representative image",
    width: normalizeText(readTagAttribute(imgTag, "width")),
    height: normalizeText(readTagAttribute(imgTag, "height")),
  };
}

function extractRepresentativeCaption(noteContent, imgIndex) {
  const oldBlockMatch = String(noteContent || "").match(
    /<div\s+data-zs-block=(["'])representative-image\1[\s\S]*?<\/div>/i,
  );
  const figcaptionMatch = oldBlockMatch?.[0]?.match(
    /<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i,
  );
  if (figcaptionMatch) {
    return stripHtmlTags(figcaptionMatch[1]);
  }
  const afterImage = String(noteContent || "").slice(imgIndex);
  const paragraphCaption = afterImage.match(
    /<\/p>\s*<p\b[^>]*>(?!\s*<img\b)([\s\S]*?)<\/p>/i,
  );
  return stripHtmlTags(paragraphCaption?.[1] || "");
}

function renderRepresentativeImageAfterTitle(noteContent) {
  const image = extractFirstRepresentativeImageTag(noteContent);
  if (!image) {
    return "";
  }
  const attrs = [
    `data-attachment-key="${escapeAttribute(image.attachmentKey)}"`,
    `alt="${escapeAttribute(image.alt)}"`,
  ];
  if (image.width) {
    attrs.push(`width="${escapeAttribute(image.width)}"`);
  }
  if (image.height) {
    attrs.push(`height="${escapeAttribute(image.height)}"`);
  }
  const caption = extractRepresentativeCaption(noteContent, image.index);
  return [
    `<p><img ${attrs.join(" ")}></p>`,
    caption ? `<p>${escapeHtml(caption)}</p>` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function parseLegacyPayload(noteContent, runtime) {
  try {
    const parsed = parseReferencesPayload(noteContent, runtime);
    return {
      status: "legacy-html-payload",
      kind: "references",
      payloadType: "references-json",
      payload: parsed.payload,
    };
  } catch {
    // try next payload type
  }
  try {
    const parsed = parseCitationAnalysisPayload(noteContent, runtime);
    return {
      status: "legacy-html-payload",
      kind: "citation-analysis",
      payloadType: "citation-analysis-json",
      payload: parsed.payload,
    };
  } catch {
    return null;
  }
}

function rebuildDigestPayloadFromHtml(noteContent) {
  if (parseGeneratedNoteKind(noteContent) !== "digest") {
    return null;
  }
  const payload = recoverDigestMarkdownPayloadFromNoteHtml(noteContent);
  if (!payload) {
    return null;
  }
  return {
    status: "rebuilt-digest-html",
    kind: "digest",
    payloadType: "digest-markdown",
    payload,
  };
}

async function hasNewPayloadAttachment(noteItem, runtime) {
  for (const payloadType of WORKBENCH_PAYLOAD_TYPES) {
    const block = await resolveWorkbenchEmbeddedPayloadBlock({
      runtime,
      noteItem,
      payloadType,
    });
    if (block && !block.errors?.length) {
      return payloadType;
    }
  }
  return "";
}

function buildMigratedNoteHtml(migration, noteContent, runtime) {
  if (migration.kind === "digest") {
    const representativeImageBlock = renderRepresentativeImageAfterTitle(noteContent);
    return buildLegalGeneratedMarkdownNoteContent({
      title: "Digest",
      markdown: stripDigestWrapperHeading(migration.payload?.content || ""),
      afterTitleBlocks: representativeImageBlock ? [representativeImageBlock] : [],
    });
  }
  if (migration.kind === "references") {
    const references = normalizeReferencesFromPayload(migration.payload, runtime);
    return buildLegalGeneratedNoteContent({
      title: "References",
      bodyHtml: renderReferencesTable(references, runtime),
    });
  }
  if (migration.kind === "citation-analysis") {
    const native =
      migration.payload?.citation_analysis &&
      typeof migration.payload.citation_analysis === "object"
        ? migration.payload.citation_analysis
        : migration.payload || {};
    const reportMarkdown =
      normalizeText(native.report_md) ||
      `# Citation Analysis\n\n${JSON.stringify(native, null, 2)}`;
    return buildLegalGeneratedMarkdownNoteContent({
      title: "Citation Analysis",
      markdown: stripInitialHeading(reportMarkdown, "Citation Analysis"),
    });
  }
  return noteContent;
}

async function migrateNote(args) {
  const noteItem = args.noteItem;
  const runtime = args.runtime;
  const host = args.host;
  const noteContent = String(noteItem?.getNote?.() || "");
  const digestMigration = rebuildDigestPayloadFromHtml(noteContent);
  if (digestMigration) {
    const nextContent = buildMigratedNoteHtml(
      digestMigration,
      noteContent,
      runtime,
    );
    await host.notes.update(noteItem, {
      content: nextContent,
    });
    const refreshedNote = host.items.get(noteItem.id) || noteItem;
    const attached = await attachWorkbenchPayloadToNote({
      runtime,
      note: refreshedNote,
      noteKind: digestMigration.kind,
      payloadType: digestMigration.payloadType,
      payload: digestMigration.payload,
    });
    return {
      noteId: noteItem.id || null,
      noteKey: normalizeText(noteItem.key),
      status: "migrated",
      source: digestMigration.status,
      kind: digestMigration.kind,
      payloadType: digestMigration.payloadType,
      attachmentKey: normalizeText(attached?.attachmentKey),
      contentLength: String(digestMigration.payload?.content || "").length || undefined,
    };
  }

  const existingPayloadType = await hasNewPayloadAttachment(noteItem, runtime);
  if (existingPayloadType) {
    return {
      noteId: noteItem.id || null,
      noteKey: normalizeText(noteItem.key),
      status: "skipped",
      reason: "already_attachment_backed",
      payloadType: existingPayloadType,
    };
  }

  const migration = parseLegacyPayload(noteContent, runtime);
  if (!migration) {
    return {
      noteId: noteItem.id || null,
      noteKey: normalizeText(noteItem.key),
      status: "skipped",
      reason: "no_supported_payload_or_recoverable_digest",
      detectedKind: parseGeneratedNoteKind(noteContent),
    };
  }

  const nextContent = buildMigratedNoteHtml(migration, noteContent, runtime);
  await host.notes.update(noteItem, {
    content: nextContent,
  });
  const refreshedNote = host.items.get(noteItem.id) || noteItem;
  const attached = await attachWorkbenchPayloadToNote({
    runtime,
    note: refreshedNote,
    noteKind: migration.kind,
    payloadType: migration.payloadType,
    payload: migration.payload,
  });
  return {
    noteId: noteItem.id || null,
    noteKey: normalizeText(noteItem.key),
    status: "migrated",
    source: migration.status,
    kind: migration.kind,
    payloadType: migration.payloadType,
    attachmentKey: normalizeText(attached?.attachmentKey),
    contentLength: String(migration.payload?.content || "").length || undefined,
  };
}

function getItemTitle(item) {
  return normalizeText(item?.getField?.("title")) || normalizeText(item?.title);
}

async function applyResultImpl(args) {
  const runtime = args?.runtime || {};
  const host = requireHostApi(runtime);
  const refs = collectSelectionRefs(resolveSelectionContext(args));
  if (args?.parent) {
    addRef(refs, args.parent);
  }
  if (refs.length === 0) {
    for (const selected of host.context.getSelectedItems?.() || []) {
      addRef(refs, selected.id || selected.key);
    }
  }

  const selectedItems = uniqueRefs(refs)
    .map((ref) => resolveHostItem(host, ref))
    .filter(Boolean);
  const notes = [];
  const seenNoteIds = new Set();
  for (const item of selectedItems) {
    for (const note of collectNotesFromItem(host, item)) {
      if (!note?.id || seenNoteIds.has(note.id)) {
        continue;
      }
      seenNoteIds.add(note.id);
      notes.push(note);
    }
  }

  const results = [];
  for (const note of notes) {
    try {
      results.push(await migrateNote({ host, noteItem: note, runtime }));
    } catch (error) {
      results.push({
        noteId: note?.id || null,
        noteKey: normalizeText(note?.key),
        status: "failed",
        error: normalizeText(error?.message || error || "migration failed"),
      });
    }
  }

  const result = {
    generatedAt: new Date().toISOString(),
    selectedRefs: uniqueRefs(refs),
    selectedItems: selectedItems.map((item) => ({
      id: item.id || null,
      key: normalizeText(item.key),
      itemType: normalizeText(item.itemType),
      title: getItemTitle(item),
    })),
    notes: results,
    summary: {
      selectedItemCount: selectedItems.length,
      noteCount: notes.length,
      migratedCount: results.filter((entry) => entry.status === "migrated")
        .length,
      recoveredDigestCount: results.filter(
        (entry) =>
          entry.source === "rebuilt-digest-html" ||
          entry.source === "recovered-normalized-digest-html",
      ).length,
      skippedCount: results.filter((entry) => entry.status === "skipped")
        .length,
      failedCount: results.filter((entry) => entry.status === "failed").length,
    },
  };
  return {
    ...result,
    clipboard: await copyTextToClipboard(JSON.stringify(result, null, 2), runtime),
  };
}

export async function applyResult(args) {
  return withPackageRuntimeScope(args?.runtime, () => applyResultImpl(args));
}
