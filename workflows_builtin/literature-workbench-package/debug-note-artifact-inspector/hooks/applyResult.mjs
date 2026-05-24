import {
  exportGeneratedNoteCandidate,
  parseDigestPayload,
} from "../../lib/literatureDigestNotes.mjs";
import {
  parseWorkbenchEmbeddedPayloadBytes,
  WORKBENCH_EMBEDDED_PAYLOAD_MARKER,
} from "../../lib/embeddedPayloadAttachments.mjs";
import { copyTextToClipboard } from "../../lib/clipboard.mjs";
import { parseGeneratedNoteKind } from "../../lib/referencesNote.mjs";
import { requireHostApi, withPackageRuntimeScope } from "../../lib/runtime.mjs";

const PSEUDO_EMBEDDED_PAYLOAD_MARKER = "ZS_EMBEDDED_PAYLOAD_V1:";

function normalizeText(value) {
  return String(value || "").trim();
}

function toUint8Array(value) {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return new Uint8Array();
}

function encodeAsciiBytes(text) {
  const value = String(text || "");
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0x7f;
  }
  return bytes;
}

function indexOfBytes(haystack, needle) {
  if (!haystack.length || !needle.length || needle.length > haystack.length) {
    return -1;
  }
  outer: for (let index = 0; index <= haystack.length - needle.length; index += 1) {
    for (let inner = 0; inner < needle.length; inner += 1) {
      if (haystack[index + inner] !== needle[inner]) {
        continue outer;
      }
    }
    return index;
  }
  return -1;
}

function decodeUtf8Bytes(bytes, runtime) {
  const Decoder =
    runtime?.TextDecoder ||
    (typeof globalThis?.TextDecoder === "function"
      ? globalThis.TextDecoder
      : null);
  if (Decoder) {
    return new Decoder("utf-8").decode(bytes);
  }
  if (runtime?.Buffer && typeof runtime.Buffer.from === "function") {
    return runtime.Buffer.from(bytes).toString("utf8");
  }
  let text = "";
  for (const byte of bytes) {
    text += String.fromCharCode(byte);
  }
  return text;
}

function decodeBase64Utf8(text, runtime) {
  const raw = normalizeText(text);
  if (!raw) {
    return "";
  }
  if (runtime?.Buffer && typeof runtime.Buffer.from === "function") {
    return runtime.Buffer.from(raw, "base64").toString("utf8");
  }
  const atobImpl =
    typeof runtime?.atob === "function"
      ? runtime.atob
      : typeof globalThis?.atob === "function"
        ? globalThis.atob.bind(globalThis)
        : null;
  if (!atobImpl) {
    throw new Error("base64 decoder unavailable");
  }
  const binary = atobImpl(raw);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return decodeUtf8Bytes(bytes, runtime);
}

export function parsePseudoEmbeddedPayloadBytesForDebug(value, runtime) {
  const bytes = toUint8Array(value);
  const marker = encodeAsciiBytes(PSEUDO_EMBEDDED_PAYLOAD_MARKER);
  const start = indexOfBytes(bytes, marker);
  if (start < 0) {
    return null;
  }
  let cursor = start + marker.length;
  while (
    cursor < bytes.length &&
    (bytes[cursor] === 0x20 || bytes[cursor] === 0x09)
  ) {
    cursor += 1;
  }
  let end = cursor;
  while (
    end < bytes.length &&
    bytes[end] !== 0x0a &&
    bytes[end] !== 0x0d &&
    bytes[end] !== 0x00
  ) {
    end += 1;
  }
  const encodedPayload = decodeUtf8Bytes(bytes.slice(cursor, end), runtime);
  const payloadText = decodeBase64Utf8(encodedPayload, runtime);
  const envelope = JSON.parse(payloadText);
  const payload = envelope?.payload;
  const content =
    typeof payload?.content === "string"
      ? payload.content
      : typeof payload?.citation_analysis?.report_md === "string"
        ? payload.citation_analysis.report_md
        : JSON.stringify(payload || "");
  return {
    marker: PSEUDO_EMBEDDED_PAYLOAD_MARKER,
    schemaVersion: envelope?.schemaVersion || null,
    kind: normalizeText(envelope?.kind),
    noteKind: normalizeText(envelope?.noteKind),
    noteKey: normalizeText(envelope?.noteKey),
    payloadType: normalizeText(envelope?.payloadType),
    payloadFormat: normalizeText(payload?.format),
    payloadEntry: normalizeText(payload?.entry),
    contentLength: String(content || "").length,
    envelope,
  };
}

function summarizeWorkbenchEmbeddedPayloadForDebug(parsed) {
  const payload = parsed?.payload;
  const content =
    typeof payload?.content === "string"
      ? payload.content
      : typeof payload?.citation_analysis?.report_md === "string"
        ? payload.citation_analysis.report_md
        : JSON.stringify(payload || "");
  return {
    marker: WORKBENCH_EMBEDDED_PAYLOAD_MARKER,
    schemaVersion: parsed?.schemaVersion || null,
    kind: normalizeText(parsed?.envelope?.kind),
    noteKind: normalizeText(parsed?.noteKind),
    noteKey: normalizeText(parsed?.envelope?.noteKey),
    payloadType: normalizeText(parsed?.payloadType),
    payloadFormat: normalizeText(payload?.format),
    payloadEntry: normalizeText(payload?.entry),
    contentLength: String(content || "").length,
    envelope: parsed?.envelope || null,
  };
}

function collectAttributeValues(html, attributeName) {
  const escaped = String(attributeName || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "gi",
  );
  return Array.from(String(html || "").matchAll(pattern))
    .map((match) => normalizeText(match[1] || match[2] || match[3] || ""))
    .filter(Boolean);
}

function unique(values) {
  return Array.from(new Set((values || []).map(normalizeText).filter(Boolean)));
}

function uniqueRefs(values) {
  const refs = [];
  const seen = new Set();
  for (const value of values || []) {
    const normalized =
      typeof value === "number" ? value : normalizeText(value);
    if (!normalized) {
      continue;
    }
    const key = typeof normalized === "number" ? `id:${normalized}` : `key:${normalized}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    refs.push(normalized);
  }
  return refs;
}

function readFirstAttribute(html, attributeName) {
  return collectAttributeValues(html, attributeName)[0] || "";
}

function hasPattern(html, pattern) {
  return pattern.test(String(html || ""));
}

export function analyzeNoteHtmlForDebug(noteContent) {
  const html = String(noteContent || "");
  const payloadTypes = unique(collectAttributeValues(html, "data-zs-payload"));
  const noteKinds = unique(collectAttributeValues(html, "data-zs-note-kind"));
  const attachmentKeys = unique(collectAttributeValues(html, "data-attachment-key"));
  const representativeImageAttachmentKeys = unique([
    ...attachmentKeys,
    ...collectAttributeValues(
      html,
      "data-zs-representative_image_attachment_key",
    ),
    ...Array.from(
      html.matchAll(
        /<div\b[^>]*data-zs-block=(["'])representative-image\1[\s\S]*?<\/div>/gi,
      ),
    ).flatMap((match) =>
      collectAttributeValues(match[0], "data-attachment-key"),
    ),
  ]);
  const guessedKind = parseGeneratedNoteKind(html);
  const hasSchemaVersion = hasPattern(
    html,
    /<div\b[^>]*data-schema-version=(["'])[^"']+\1/i,
  );
  const schemaVersion = readFirstAttribute(html, "data-schema-version");
  const hasRepresentativeImageBlock = hasPattern(
    html,
    /data-zs-block=(["'])representative-image\1/i,
  );
  const hasDigestPayload = payloadTypes.includes("digest-markdown");
  const hasDigestHeading =
    /<h1[^>]*>\s*Digest\s*<\/h1>/i.test(html) ||
    /(^|\n)\s*#\s*Digest\s*($|\n)/i.test(html);
  const editorRewriteRisk =
    guessedKind === "digest" &&
    hasSchemaVersion &&
    !hasDigestPayload &&
    hasDigestHeading;
  return {
    htmlLength: html.length,
    schemaVersion: schemaVersion || null,
    hasSchemaVersion,
    currentExportKindGuess: guessedKind,
    payloadTypes,
    noteKinds,
    hasDigestPayload,
    hasReferencesPayload: payloadTypes.includes("references-json"),
    hasCitationPayload: payloadTypes.includes("citation-analysis-json"),
    hasRepresentativeImageBlock,
    attachmentKeys,
    representativeImageAttachmentKeys,
    hasDigestHeading,
    diagnosis: editorRewriteRisk
      ? "html_only_digest_after_editor_rewrite"
      : hasDigestPayload
        ? "payload_backed_digest"
        : guessedKind
          ? "generated_note_without_expected_payload"
          : "unrecognized_note",
  };
}

function resolveSelectionContext(args) {
  return (
    args?.request?.selectionContext ||
    args?.runResult?.resultJson?.selectionContext ||
    args?.runResult?.responseJson?.selectionContext ||
    null
  );
}

function addRef(refs, ref) {
  if (typeof ref === "number") {
    refs.push(ref);
    return;
  }
  if (ref && typeof ref === "object") {
    addRef(refs, ref.id || ref.key);
    return;
  }
  const text = normalizeText(ref);
  if (text) {
    refs.push(text);
  }
}

function collectSelectionRefs(selectionContext) {
  const refs = [];
  const items = selectionContext?.items || {};
  for (const entry of Array.isArray(items.parents) ? items.parents : []) {
    addRef(refs, entry?.item?.id || entry?.id || entry?.item?.key || entry?.key);
  }
  for (const entry of Array.isArray(items.notes) ? items.notes : []) {
    addRef(refs, entry?.item?.id || entry?.id || entry?.item?.key || entry?.key);
  }
  for (const entry of Array.isArray(items.attachments) ? items.attachments : []) {
    addRef(
      refs,
      entry?.parent?.id ||
        entry?.item?.parentItemID ||
        entry?.parent?.key ||
        entry?.item?.parentItem,
    );
  }
  for (const entry of Array.isArray(items.children) ? items.children : []) {
    addRef(
      refs,
      entry?.parent?.id ||
        entry?.item?.parentItemID ||
        entry?.parent?.key ||
        entry?.item?.parentItem,
    );
  }
  return uniqueRefs(refs);
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

function getItemTitle(item) {
  return normalizeText(item?.getField?.("title")) || normalizeText(item?.title);
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

async function tryReadPseudoEmbeddedPayload(host, runtime, path) {
  if (!path || typeof host.file?.readBytes !== "function") {
    return null;
  }
  try {
    const bytes = await host.file.readBytes(path);
    const formal = parseWorkbenchEmbeddedPayloadBytes(bytes, runtime);
    if (formal) {
      return summarizeWorkbenchEmbeddedPayloadForDebug(formal);
    }
    return parsePseudoEmbeddedPayloadBytesForDebug(bytes, runtime);
  } catch (error) {
    return {
      error: normalizeText(error?.message || error || "parse failed"),
    };
  }
}

async function resolveAttachmentDetail(host, noteItem, attachmentRef, runtime) {
  const key = normalizeText(attachmentRef);
  const detail = {
    key,
    found: false,
    id: null,
    parentID: null,
    parentMatchesNote: false,
    contentType: "",
    linkMode: null,
    isEmbeddedImage: false,
    path: "",
    pseudoEmbeddedPayload: null,
  };
  if ((!key && typeof attachmentRef !== "number") || !noteItem) {
    return detail;
  }
  let attachment = null;
  try {
    attachment =
      typeof attachmentRef === "number"
        ? host.items.get(attachmentRef)
        : host.items.getByLibraryAndKey(noteItem.libraryID, key);
  } catch {
    attachment = null;
  }
  if (!attachment) {
    return detail;
  }
  detail.found = true;
  detail.id = attachment.id || null;
  detail.key = normalizeText(attachment.key) || key;
  detail.parentID = attachment.parentID || attachment.parentItemID || null;
  detail.parentMatchesNote = detail.parentID === noteItem.id;
  detail.contentType = normalizeText(
    attachment.attachmentContentType ||
      attachment.contentType ||
      attachment.getField?.("contentType"),
  );
  detail.linkMode =
    typeof attachment.getAttachmentLinkMode === "function"
      ? attachment.getAttachmentLinkMode()
      : attachment.attachmentLinkMode ?? null;
  detail.isEmbeddedImage =
    typeof attachment.isEmbeddedImageAttachment === "function"
      ? !!attachment.isEmbeddedImageAttachment()
      : detail.linkMode === 4;
  try {
    detail.path = normalizeText(await attachment.getFilePathAsync?.());
  } catch {
    detail.path = "";
  }
  if (!detail.path) {
    detail.path = normalizeText(attachment.getField?.("path"));
  }
  detail.pseudoEmbeddedPayload = await tryReadPseudoEmbeddedPayload(
    host,
    runtime,
    detail.path,
  );
  return detail;
}

async function tryParseDigestPayload(noteContent, runtime) {
  try {
    const parsed = parseDigestPayload(noteContent, runtime);
    return {
      ok: true,
      entry: normalizeText(parsed.payload?.entry),
      format: normalizeText(parsed.payload?.format),
      contentLength: String(parsed.payload?.content || "").length,
    };
  } catch (error) {
    return {
      ok: false,
      error: normalizeText(error?.message || error || "parse failed"),
    };
  }
}

function payloadAttachmentsFromDetails(details) {
  return (details || [])
    .map((detail) => detail?.pseudoEmbeddedPayload)
    .filter((payload) => payload && !payload.error);
}

function summarizePseudoDigestPayload(payload) {
  const envelopePayload = payload?.envelope?.payload || {};
  const content =
    typeof envelopePayload.content === "string" ? envelopePayload.content : "";
  return {
    ok: true,
    source: "embedded-image-attachment",
    entry: normalizeText(envelopePayload.entry || payload?.payloadEntry),
    format: normalizeText(envelopePayload.format || payload?.payloadFormat),
    contentLength: content.length,
  };
}

async function tryExportNote(args) {
  if (!args.kind) {
    return {
      attempted: false,
    };
  }
  try {
    const exported = await exportGeneratedNoteCandidate({
      kind: args.kind,
      noteItemID: args.noteItem.id,
      runtime: args.runtime,
    });
    return {
      attempted: true,
      ok: true,
      files: (exported.files || []).map((file) => ({
        fileName: file.fileName,
        hasContent: typeof file.content === "string",
        hasBytes: !!file.bytes,
        sourcePath: file.sourcePath || "",
        optional: file.optional === true,
      })),
    };
  } catch (error) {
    return {
      attempted: true,
      ok: false,
      error: normalizeText(error?.message || error || "export failed"),
    };
  }
}

export async function analyzeNoteItemForDebug(args) {
  const noteItem = args.noteItem;
  const noteContent = String(noteItem?.getNote?.() || "");
  const html = analyzeNoteHtmlForDebug(noteContent);
  const attachmentKeys = unique([
    ...html.attachmentKeys,
    ...html.representativeImageAttachmentKeys,
  ]);
  const attachmentDetails = [];
  const seenAttachments = new Set();
  for (const key of attachmentKeys) {
    const detail = await resolveAttachmentDetail(
      args.host,
      noteItem,
      key,
      args.runtime,
    );
    const seenKey = detail.id ? `id:${detail.id}` : `key:${key}`;
    seenAttachments.add(seenKey);
    attachmentDetails.push(detail);
  }
  for (const ref of noteItem?.getAttachments?.() || []) {
    const detail = await resolveAttachmentDetail(
      args.host,
      noteItem,
      ref,
      args.runtime,
    );
    const seenKey = detail.id ? `id:${detail.id}` : `ref:${String(ref)}`;
    if (seenAttachments.has(seenKey)) {
      continue;
    }
    seenAttachments.add(seenKey);
    attachmentDetails.push(detail);
  }
  const digestPayload =
    html.currentExportKindGuess === "digest"
      ? await tryParseDigestPayload(noteContent, args.runtime)
      : null;
  const embeddedPayloads = payloadAttachmentsFromDetails(attachmentDetails);
  const embeddedPayloadTypes = unique(
    embeddedPayloads.map((payload) => payload.payloadType),
  );
  const effectivePayloadTypes = unique([
    ...html.payloadTypes,
    ...embeddedPayloadTypes,
  ]);
  const effectiveKind =
    normalizeText(embeddedPayloads[0]?.noteKind) || html.currentExportKindGuess;
  const embeddedDigestPayload = embeddedPayloads.find(
    (payload) => payload.payloadType === "digest-markdown",
  );
  const effectiveDigestPayload =
    digestPayload?.ok === true
      ? digestPayload
      : embeddedDigestPayload
        ? summarizePseudoDigestPayload(embeddedDigestPayload)
        : digestPayload;
  const effectiveDiagnosis =
    embeddedPayloadTypes.length > 0
      ? "payload_attachment_backed_note"
      : html.diagnosis;
  const exportAttempt = await tryExportNote({
    kind: effectiveKind,
    noteItem,
    runtime: args.runtime,
  });
  return {
    id: noteItem?.id || null,
    key: normalizeText(noteItem?.key),
    parentID: noteItem?.parentID || noteItem?.parentItemID || null,
    title: getItemTitle(noteItem),
    html,
    effectiveExportKindGuess: effectiveKind,
    effectivePayloadTypes,
    effectiveDiagnosis,
    digestPayload: effectiveDigestPayload,
    embeddedPayloads,
    attachmentDetails,
    exportAttempt,
  };
}

async function applyResultImpl(args) {
  const runtime = args?.runtime || {};
  const host = requireHostApi(runtime);
  const selectionContext = resolveSelectionContext(args);
  const refs = collectSelectionRefs(selectionContext);
  if (args?.parent) {
    addRef(refs, args.parent);
  }
  if (refs.length === 0) {
    for (const selected of host.context.getSelectedItems?.() || []) {
      addRef(refs, selected.id || selected.key);
    }
  }

  const notes = [];
  const seenNoteIds = new Set();
  const selectedItems = uniqueRefs(refs)
    .map((ref) => resolveHostItem(host, ref))
    .filter(Boolean);
  for (const item of selectedItems) {
    for (const note of collectNotesFromItem(host, item)) {
      if (!note?.id || seenNoteIds.has(note.id)) {
        continue;
      }
      seenNoteIds.add(note.id);
      notes.push(note);
    }
  }

  const analyzedNotes = [];
  for (const note of notes) {
    analyzedNotes.push(
      await analyzeNoteItemForDebug({
        host,
        noteItem: note,
        runtime,
      }),
    );
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
    notes: analyzedNotes,
    summary: {
      selectedItemCount: selectedItems.length,
      noteCount: analyzedNotes.length,
      exportableCount: analyzedNotes.filter(
        (note) => note.exportAttempt?.ok === true,
      ).length,
      editorRewrittenDigestCount: analyzedNotes.filter(
        (note) =>
          note.html?.diagnosis === "html_only_digest_after_editor_rewrite",
      ).length,
    },
  };
  const text = JSON.stringify(result, null, 2);
  return {
    ...result,
    clipboard: await copyTextToClipboard(text, runtime),
  };
}

export async function applyResult(args) {
  return withPackageRuntimeScope(args?.runtime, () => applyResultImpl(args));
}
