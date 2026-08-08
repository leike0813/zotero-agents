import { getBaseName, sanitizeFileNameSegment } from "./path.mjs";
import {
  buildResearchProduct,
  RESEARCH_PRODUCT_SCHEMA,
} from "./researchBundle.mjs";
import { attachWorkbenchPayloadToNote } from "./embeddedPayloadAttachments.mjs";
import { rewriteMarkdownLocalImages } from "./markdownLocalImages.mjs";

export { rewriteMarkdownLocalImages };

export const LITERATURE_BUNDLE_KIND = "zotero-agents-literature-bundle";
export const LITERATURE_BUNDLE_SCHEMA_VERSION = 1;
export const LITERATURE_BUNDLE_SOURCE_ONLY_KIND = "zotero-agents-literature-bundle-source-only";
export const LITERATURE_EXPORT_MODES = new Set(["selection", "collection", "library"]);
const EXCLUDED_ITEM_TYPES = new Set(["attachment", "note", "annotation"]);
const LIST_PAGE_LIMIT = 200;
const LIST_PAGE_GUARD = 10000;

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeEntryPath(value) {
  const path = normalizeText(value).replace(/\\/g, "/");
  if (
    !path ||
    path.startsWith("/") ||
    /^[A-Za-z]:\//.test(path) ||
    path.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error(`unsafe bundle entry path: ${path}`);
  }
  return path;
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function makePortableNoteHtml(html, attachmentRefs) {
  const unresolvedKeys = [];
  const portableHtml = String(html || "").replace(/<img\b[^>]*>/gi, (tag) => {
    const keyMatch = tag.match(/\bdata-attachment-key\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
    const key = normalizeText(keyMatch?.[1] || keyMatch?.[2] || keyMatch?.[3]);
    if (!key) return tag;
    const ref = attachmentRefs?.get?.(key);
    if (!ref) {
      unresolvedKeys.push(key);
      return "";
    }
    return tag.replace(
      new RegExp(`\\s*data-attachment-key\\s*=\\s*(?:"${escapeRegex(key)}"|'${escapeRegex(key)}'|${escapeRegex(key)})`, "i"),
      ` data-zb-attachment-ref="${ref}"`,
    );
  });
  return { html: portableHtml, unresolvedKeys };
}

export function restorePortableNoteHtml(html, attachmentKeys) {
  return String(html || "").replace(/<img\b[^>]*>/gi, (tag) => {
    const refMatch = tag.match(/\bdata-zb-attachment-ref\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
    const ref = normalizeText(refMatch?.[1] || refMatch?.[2] || refMatch?.[3]);
    if (!ref) return tag;
    const key = attachmentKeys?.get?.(ref);
    if (!key) return "";
    return tag.replace(
      new RegExp(`\\s*data-zb-attachment-ref\\s*=\\s*(?:"${escapeRegex(ref)}"|'${escapeRegex(ref)}'|${escapeRegex(ref)})`, "i"),
      ` data-attachment-key="${key}"`,
    );
  });
}

function ensureUniqueIds(manifest) {
  if (!manifest.items.length) {
    throw new Error("literature bundle must contain at least one item");
  }
  const itemIds = new Set();
  const ensureLocalIds = (records, kind) => {
    const ids = new Set();
    for (const record of records || []) {
      const id = normalizeText(record?.id);
      if (!id || ids.has(id)) {
        throw new Error(`duplicate or missing bundle ${kind} id`);
      }
      ids.add(id);
    }
  };
  for (const item of manifest.items) {
    const itemId = normalizeText(item?.id);
    if (!itemId || itemIds.has(itemId)) throw new Error("duplicate or missing bundle item id");
    itemIds.add(itemId);
    if (!normalizeText(item?.itemJson?.itemType)) throw new Error(`item ${itemId} itemType is missing`);
    ensureLocalIds(item.attachments, "attachment");
    ensureLocalIds(item.notes, "note");
    for (const attachment of item.attachments || []) {
      ensureLocalIds(attachment.assets, "asset");
    }
    for (const note of item.notes || []) {
      ensureLocalIds(note.images, "image");
    }
  }
  for (const item of manifest.items) {
    for (const relatedId of item.relatedItemIds || []) {
      if (!itemIds.has(normalizeText(relatedId))) throw new Error("unresolved related item ref");
    }
  }
}

export function validateLiteratureBundleManifest(value, archiveEntries) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("bundle manifest must be an object");
  if (value.kind !== LITERATURE_BUNDLE_KIND) throw new Error("unsupported literature bundle kind");
  if (Number(value.schemaVersion) !== LITERATURE_BUNDLE_SCHEMA_VERSION) throw new Error("unsupported literature bundle schema version");
  if (!Array.isArray(value.items) || !value.files || typeof value.files !== "object") throw new Error("bundle manifest items/files are missing");
  ensureUniqueIds(value);
  const declared = Object.keys(value.files).map(normalizeEntryPath).sort();
  if (new Set(declared).size !== declared.length) throw new Error("duplicate declared file path");
  for (const path of declared) {
    const detail = value.files[path];
    if (!Number.isInteger(detail?.size) || detail.size < 0 || !/^[a-f0-9]{64}$/.test(normalizeText(detail?.sha256))) {
      throw new Error(`invalid file integrity record: ${path}`);
    }
  }
  const declaredSet = new Set(declared);
  const referencedPaths = [];
  for (const item of value.items) {
    for (const attachment of item.attachments || []) {
      if (attachment.path) referencedPaths.push(attachment.path);
      for (const asset of attachment.assets || []) {
        if (asset.path) referencedPaths.push(asset.path);
      }
    }
    for (const note of item.notes || []) {
      if (note.htmlPath) referencedPaths.push(note.htmlPath);
      for (const image of note.images || []) {
        if (image.path) referencedPaths.push(image.path);
      }
    }
  }
  for (const path of referencedPaths.map(normalizeEntryPath)) {
    if (!declaredSet.has(path)) throw new Error(`unresolved manifest file ref: ${path}`);
  }
  const actual = (archiveEntries || [])
    .map(normalizeEntryPath)
    .filter((path) => path !== "manifest.json")
    .sort();
  if (JSON.stringify(declared) !== JSON.stringify(actual)) throw new Error("declared file closure does not match archive entries");
  return value;
}

export async function verifyLiteratureBundleFiles(manifest, archive) {
  if (typeof archive?.measureEntries !== "function") {
    throw new Error("extracted archive integrity measurement is unavailable");
  }
  const measured = await archive.measureEntries(Object.keys(manifest.files || {}));
  for (const [path, expected] of Object.entries(manifest.files || {})) {
    const actual = measured?.files?.[path];
    if (actual?.size !== expected.size || actual?.sha256 !== expected.sha256) {
      throw new Error(`bundle file integrity mismatch: ${path}`);
    }
  }
}

export function validateResearchProductManifest(value, archiveEntries) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("research product manifest must be an object");
  }
  if (value.schema_id !== RESEARCH_PRODUCT_SCHEMA || String(value.schema_version) !== "2.0.0") {
    throw new Error("unsupported research product schema");
  }
  if (!Array.isArray(value.papers) || !value.files || typeof value.files !== "object") {
    throw new Error("research product papers/files are missing");
  }
  const declared = Object.keys(value.files).map(normalizeEntryPath).sort();
  if (new Set(declared).size !== declared.length) throw new Error("duplicate declared file path");
  for (const path of declared) {
    const detail = value.files[path];
    if (!Number.isInteger(detail?.size) || detail.size < 0 || !/^[a-f0-9]{64}$/.test(normalizeText(detail?.sha256))) {
      throw new Error(`invalid file integrity record: ${path}`);
    }
  }
  const declaredSet = new Set(declared);
  const referenced = ["README.md", "index.md"];
  if (value.bibliography?.path) referenced.push(value.bibliography.path);
  for (const topic of value.topics || []) if (topic?.report_path) referenced.push(topic.report_path);
  for (const paper of value.papers) {
    if (!paper?.metadata_path) throw new Error("research product paper metadata is missing");
    referenced.push(paper.metadata_path);
    if (paper.source?.path) referenced.push(paper.source.path);
    for (const asset of paper.source?.assets || []) if (asset?.path) referenced.push(asset.path);
    for (const payload of paper.payloads || []) {
      if (!new Set(["digest-markdown", "references-json", "citation-analysis-json", "conversation-note-markdown"]).has(normalizeText(payload?.payload_type))) {
        throw new Error("unsupported research product payload type");
      }
      if (payload?.path) referenced.push(payload.path);
    }
  }
  for (const path of referenced.map(normalizeEntryPath)) {
    if (!declaredSet.has(path)) throw new Error(`unresolved research product file ref: ${path}`);
  }
  const actual = (archiveEntries || []).map(normalizeEntryPath).filter((path) => path !== "manifest.json").sort();
  if (JSON.stringify(declared) !== JSON.stringify(actual)) throw new Error("research product file closure does not match archive entries");
  return value;
}

export async function verifyResearchProductFiles(manifest, archive) {
  if (typeof archive?.measureEntries !== "function") throw new Error("extracted archive integrity measurement is unavailable");
  const measured = await archive.measureEntries(Object.keys(manifest.files || {}));
  for (const [path, expected] of Object.entries(manifest.files || {})) {
    const actual = measured?.files?.[path];
    if (actual?.size !== expected.size || actual?.sha256 !== expected.sha256) {
      throw new Error(`research product file integrity mismatch: ${path}`);
    }
  }
}

function attachmentMetadata(attachment) {
  return {
    title: normalizeText(attachment?.getField?.("title")),
    contentType: normalizeText(
      attachment?.attachmentContentType || attachment?.getField?.("contentType"),
    ),
    charset: normalizeText(attachment?.attachmentCharset || attachment?.getField?.("charset")),
    url: normalizeText(attachment?.getField?.("url")),
    linkMode:
      typeof attachment?.getAttachmentLinkMode === "function"
        ? attachment.getAttachmentLinkMode()
        : attachment?.attachmentLinkMode ?? null,
  };
}

async function readableAttachmentPath(attachment, host) {
  let path = "";
  try {
    path = normalizeText(await attachment?.getFilePathAsync?.());
  } catch {
    path = "";
  }
  return path && (await host.file.exists(path)) ? path : "";
}

export async function buildLiteratureBundleExport(args) {
  const { host, parents } = args;
  const warnings = [];
  const payloadEntries = [];
  const itemRecords = [];
  const parentIds = new Map();
  const parentKeys = new Map();
  for (let index = 0; index < parents.length; index += 1) {
    const id = `i${index + 1}`;
    parentIds.set(parents[index].id, id);
    parentKeys.set(normalizeText(parents[index].key), id);
  }

  for (const parent of parents) {
    const itemId = parentIds.get(parent.id);
    const attachmentRecords = [];
    const noteRecords = [];
    let attachmentIndex = 0;
    for (const attachmentRef of parent.getAttachments?.() || []) {
      const attachment = host.items.get(attachmentRef);
      if (!attachment) continue;
      const id = `a${++attachmentIndex}`;
      const metadata = attachmentMetadata(attachment);
      const sourcePath = await readableAttachmentPath(attachment, host);
      if (!sourcePath && Number(metadata.linkMode) === 3 && metadata.url) {
        attachmentRecords.push({ id, kind: "url", metadata });
        continue;
      }
      if (!sourcePath) {
        warnings.push({ code: "attachment_file_missing", itemId, childId: id });
        attachmentRecords.push({ id, kind: "skipped", metadata, warningCode: "attachment_file_missing" });
        continue;
      }
      const baseName = sanitizeFileNameSegment(getBaseName(sourcePath) || `${id}.bin`);
      const basePath = `items/${itemId}/attachments/${id}`;
      const isMarkdown = /(?:markdown|text\/plain)/i.test(metadata.contentType) || /\.md$/i.test(baseName);
      if (isMarkdown) {
        const original = await host.file.readText(sourcePath);
        const rewritten = await rewriteMarkdownLocalImages({
          markdown: original,
          sourcePath,
          resolveLocalPath: async (candidate) =>
            (await host.file.exists(candidate)) ? candidate : null,
        });
        warnings.push(...rewritten.warnings.map((warning) => ({ ...warning, itemId, childId: id })));
        const path = `${basePath}/${baseName}`;
        payloadEntries.push({ name: path, text: rewritten.markdown });
        const assets = rewritten.assets.map((asset) => {
          const assetPath = `${basePath}/${asset.relativePath}`;
          payloadEntries.push({ name: assetPath, sourcePath: asset.sourcePath });
          return { id: asset.id, path: assetPath, relativePath: asset.relativePath };
        });
        attachmentRecords.push({ id, kind: "markdown", metadata, path, assets });
      } else {
        const path = `${basePath}/${baseName}`;
        payloadEntries.push({ name: path, sourcePath });
        attachmentRecords.push({ id, kind: "file", metadata, path });
      }
    }

    let noteIndex = 0;
    for (const noteRef of parent.getNotes?.() || []) {
      const note = host.items.get(noteRef);
      if (!note) continue;
      const id = `n${++noteIndex}`;
      const imageRecords = [];
      const keyRefs = new Map();
      let imageIndex = 0;
      for (const imageRef of note.getAttachments?.() || []) {
        const image = host.items.get(imageRef);
        if (!image) continue;
        const imageId = `e${++imageIndex}`;
        const sourcePath = await readableAttachmentPath(image, host);
        if (!sourcePath) {
          warnings.push({ code: "note_image_missing", itemId, childId: `${id}:${imageId}` });
          continue;
        }
        const path = `items/${itemId}/notes/${id}/images/${imageId}/${sanitizeFileNameSegment(getBaseName(sourcePath) || `${imageId}.bin`)}`;
        payloadEntries.push({ name: path, sourcePath });
        keyRefs.set(normalizeText(image.key), imageId);
        imageRecords.push({ id: imageId, path, metadata: attachmentMetadata(image) });
      }
      const portable = makePortableNoteHtml(note.getNote?.() || "", keyRefs);
      warnings.push(...portable.unresolvedKeys.map(() => ({ code: "note_image_missing", itemId, childId: id })));
      const htmlPath = `items/${itemId}/notes/${id}/note.html`;
      payloadEntries.push({ name: htmlPath, text: portable.html });
      noteRecords.push({ id, htmlPath, images: imageRecords });
    }

    const relatedItemIds = Array.from(parent.relatedItems || [])
      .map((key) => parentKeys.get(normalizeText(key)))
      .filter(Boolean);
    itemRecords.push({
      id: itemId,
      itemJson: host.items.exportPortableJson(parent),
      relatedItemIds,
      attachments: attachmentRecords,
      notes: noteRecords,
    });
  }

  const measured = await host.archive.measureEntries(payloadEntries);
  const manifest = {
    kind: LITERATURE_BUNDLE_KIND,
    schemaVersion: LITERATURE_BUNDLE_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    source: {
      zoteroVersion: normalizeText(globalThis.Zotero?.version),
      addonVersion: normalizeText(host.addon?.getConfig?.()?.addonVersion),
    },
    warnings,
    items: itemRecords,
    files: measured.files,
  };
  return { manifest, entries: payloadEntries, warnings };
}

export async function buildLiteratureBundleSourceOnlyExport(args) {
  const { host, parents } = args;
  const warnings = [];
  const payloadEntries = [];
  const itemRecords = [];
  const usedNames = new Set();

  function allocateName(base, ext) {
    let candidate = `${base}.${ext}`;
    if (!usedNames.has(candidate)) {
      usedNames.add(candidate);
      return candidate;
    }
    let n = 2;
    while (true) {
      candidate = `${base}_${n}.${ext}`;
      if (!usedNames.has(candidate)) {
        usedNames.add(candidate);
        return candidate;
      }
      n += 1;
    }
  }

  for (let index = 0; index < parents.length; index += 1) {
    const parent = parents[index];
    const bundleLocalId = `i${index + 1}`;
    const rawTitle = normalizeText(parent.getField?.("title"));
    const titleBase = rawTitle ? sanitizeFileNameSegment(rawTitle) : bundleLocalId;
    let chosenAttachment = null;
    for (const attachmentRef of parent.getAttachments?.() || []) {
      const attachment = host.items.get(attachmentRef);
      if (!attachment) continue;
      const metadata = attachmentMetadata(attachment);
      const sourcePath = await readableAttachmentPath(attachment, host);
      if (!sourcePath) continue;
      const baseName = getBaseName(sourcePath);
      const isMarkdown =
        /(?:markdown|text\/plain)/i.test(metadata.contentType) ||
        /\.md$/i.test(baseName);
      if (isMarkdown) {
        chosenAttachment = { sourcePath, isMarkdown: true };
        break;
      }
      const isPdf =
        /application\/pdf/i.test(metadata.contentType) || /\.pdf$/i.test(baseName);
      if (isPdf && !chosenAttachment) {
        chosenAttachment = { sourcePath, isMarkdown: false };
      }
    }
    if (!chosenAttachment) {
      warnings.push({ code: "no_source_file", itemId: bundleLocalId });
      itemRecords.push({ id: bundleLocalId, path: null });
      continue;
    }
    const ext = chosenAttachment.isMarkdown ? "md" : "pdf";
    const fileName = allocateName(titleBase, ext);
    const entryPath = `items/${fileName}`;
    if (chosenAttachment.isMarkdown) {
      const text = await host.file.readText(chosenAttachment.sourcePath);
      payloadEntries.push({ name: entryPath, text });
    } else {
      payloadEntries.push({ name: entryPath, sourcePath: chosenAttachment.sourcePath });
    }
    itemRecords.push({ id: bundleLocalId, path: entryPath });
  }

  const measured = await host.archive.measureEntries(payloadEntries);
  const manifest = {
    kind: LITERATURE_BUNDLE_SOURCE_ONLY_KIND,
    createdAt: new Date().toISOString(),
    source: {
      zoteroVersion: normalizeText(globalThis.Zotero?.version),
      addonVersion: normalizeText(host.addon?.getConfig?.()?.addonVersion),
    },
    warnings,
    items: itemRecords,
    files: measured.files,
  };
  return { manifest, entries: payloadEntries, warnings };
}

function parentIdsFromSelection(selection) {
  return (selection?.items?.parents || [])
    .map((entry) => Number(entry?.item?.id || 0))
    .filter((id) => Number.isFinite(id) && id > 0);
}

function exportValidationError(code, message) {
  const error = new Error(message);
  error.code = "validation_failed";
  error.structuredResult = {
    kind: "literature_bundle_export",
    status: "validation_failed",
    itemCount: 0,
    warnings: [{ code }],
  };
  return error;
}

function isTopLevelRegularSummary(item) {
  const itemType = normalizeText(item?.itemType ?? item?.item_type).toLowerCase();
  return Boolean(itemType)
    && !EXCLUDED_ITEM_TYPES.has(itemType)
    && !item?.parent
    && Number(item?.parentItemID ?? item?.parentID ?? 0) === 0;
}

function paperRefFromSummary(item, fallbackLibraryId) {
  const libraryId = Number(item?.libraryId ?? item?.libraryID ?? fallbackLibraryId);
  const key = normalizeText(item?.key ?? item?.itemKey ?? item?.item_key);
  return libraryId > 0 && key ? `${libraryId}:${key}` : "";
}

async function listTopLevelRegularParents(host, args) {
  const byRef = new Map();
  let cursor;
  for (let pageIndex = 0; pageIndex < LIST_PAGE_GUARD; pageIndex += 1) {
    const input = { libraryId: args.libraryId, limit: LIST_PAGE_LIMIT };
    if (args.collectionKey) input.collectionKey = args.collectionKey;
    if (cursor !== undefined) input.cursor = cursor;
    const page = await host.library.listItems(input);
    for (const summary of Array.isArray(page?.items) ? page.items : []) {
      if (!isTopLevelRegularSummary(summary)) continue;
      const paperRef = paperRefFromSummary(summary, args.libraryId);
      if (!paperRef || byRef.has(paperRef)) continue;
      const [libraryId, key] = paperRef.split(":");
      const item = host.items.getByLibraryAndKey(Number(libraryId), key);
      if (item?.isRegularItem?.()) byRef.set(paperRef, item);
    }
    if (page?.hasMore !== true) {
      return [...byRef.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([, item]) => item);
    }
    const nextCursor = normalizeText(page?.nextCursor);
    if (!nextCursor || nextCursor === cursor) {
      throw exportValidationError("invalid_pagination", "Literature export received hasMore without a new cursor");
    }
    cursor = nextCursor;
  }
  throw exportValidationError("pagination_guard_exceeded", "Literature export exceeded the library pagination guard");
}

export async function resolveLiteratureBundleParents(args) {
  const host = args.host;
  const mode = normalizeText(args.mode) || "selection";
  if (!LITERATURE_EXPORT_MODES.has(mode)) {
    throw exportValidationError("invalid_export_mode", `Unsupported literature export mode: ${mode}`);
  }
  if (mode === "selection") {
    const seen = new Set();
    const parents = [];
    for (const id of parentIdsFromSelection(args.selectionContext)) {
      const item = host.items.get(id);
      const ref = item ? `${Number(item.libraryID ?? item.libraryId)}:${normalizeText(item.key)}` : "";
      if (item?.isRegularItem?.() && ref && !seen.has(ref)) {
        seen.add(ref);
        parents.push(item);
      }
    }
    if (!parents.length) {
      throw exportValidationError("selection_required", "Selection mode requires at least one top-level regular Zotero item");
    }
    return parents;
  }
  if (mode === "collection") {
    const target = normalizeText(args.targetCollection);
    const match = /^([1-9][0-9]*):([A-Za-z0-9]+)$/.exec(target);
    if (!match) {
      throw exportValidationError("target_collection_required", "Collection mode requires targetCollection as libraryId:collectionKey");
    }
    const parents = await listTopLevelRegularParents(host, {
      libraryId: Number(match[1]),
      collectionKey: match[2],
    });
    if (!parents.length) {
      throw exportValidationError("collection_empty", "The target collection has no top-level regular items");
    }
    return parents;
  }
  const view = host.context.getCurrentView() || {};
  const libraryId = Number(view.libraryId ?? view.libraryID ?? 0);
  if (!libraryId) {
    throw exportValidationError("library_unavailable", "The current Zotero library is unavailable");
  }
  const parents = await listTopLevelRegularParents(host, { libraryId });
  if (!parents.length) {
    throw exportValidationError("library_empty", "The current library has no top-level regular items");
  }
  return parents;
}

function literatureResearchSelection(parents, mode) {
  const papers = parents.map((parent, index) => ({
    paper_ref: `${Number(parent.libraryID ?? parent.libraryId)}:${normalizeText(parent.key)}`,
    role: "core",
    semantic_relevance: 1,
    graph_available: false,
    graph_importance: 0,
    topic_coverage: 0,
    material_readiness: 0,
    score: 0.8,
    reason: `Included by literature export ${mode} mode.`,
    matched_topic_ids: [],
    candidate_sources: [`literature-export:${mode}:${index + 1}`],
  }));
  return {
    schema_id: "research_bundle.selection",
    schema_version: "1.0.0",
    intent: {
      paper_title: "Literature Export",
      article_type: "literature collection",
      research_content: `Zotero literature exported in ${mode} mode.`,
    },
    limits: {
      max_topics: 0,
      max_core_papers: Math.max(1, papers.length),
      max_related_papers: Math.max(1, papers.length),
    },
    query_plan: {},
    topics: [],
    papers,
    diagnostics: [],
  };
}

export async function exportLiteratureBundle(args) {
  const mode = normalizeText(args.mode) || "selection";
  const parents = await resolveLiteratureBundleParents({
    host: args.host,
    mode,
    targetCollection: args.targetCollection,
    selectionContext: args.selectionContext,
  });
  const remoteOutput = args.host.resources?.mode === "non-interactive";
  const allocatedOutput = remoteOutput
    ? await args.host.resources.allocateOutput({
        slotId: "bundle",
        suggestedName: "literature-bundle.zip",
        contentType: "application/zip",
      })
    : null;
  const selectedTargetPath = remoteOutput
    ? allocatedOutput?.path || null
    : await args.host.file.pickSaveFile({
        title: "Export Literature Bundle",
        filters: [["Literature bundle", "*.zip"]],
        suggestedName: "literature-bundle.zip",
      });
  if (!selectedTargetPath) {
    return { kind: "literature_bundle_export", status: "canceled", itemCount: 0, attachmentCount: 0, noteCount: 0, warnings: [] };
  }
  const targetPath = remoteOutput
    ? selectedTargetPath
    : /\.zip$/i.test(selectedTargetPath)
      ? selectedTargetPath
      : `${selectedTargetPath}.zip`;
  if (args.sourceOnly) {
    const built = await buildLiteratureBundleSourceOnlyExport({ host: args.host, parents });
    await args.host.archive.writeZipAtomic({
      targetPath,
      entries: [
        { name: "manifest.json", text: JSON.stringify(built.manifest, null, 2) },
        ...built.entries,
      ],
    });
    const output = remoteOutput
      ? await args.host.resources.publishOutput({
          slotId: "bundle",
          path: targetPath,
          displayName: "literature-bundle.zip",
          contentType: "application/zip",
        })
      : null;
    return {
      kind: "literature_bundle_source_only_export",
      status: "completed",
      itemCount: built.manifest.items.length,
      warnings: built.warnings,
      ...(output ? { resourceOutputs: [output] } : {}),
    };
  }
  const built = await buildResearchProduct({
    selection: literatureResearchSelection(parents, mode),
    normalizedSelection: true,
    runtime: args.runtime || { hostApi: args.host },
  });
  await args.host.archive.writeZipAtomic({
    targetPath,
    entries: [
      { name: "manifest.json", text: JSON.stringify(built.manifest, null, 2) },
      ...built.entries,
    ],
  });
  const output = remoteOutput
    ? await args.host.resources.publishOutput({
        slotId: "bundle",
        path: targetPath,
        displayName: "literature-bundle.zip",
        contentType: "application/zip",
      })
    : null;
  return {
    kind: "literature_research_product_export",
    status: "completed",
    schemaId: RESEARCH_PRODUCT_SCHEMA,
    itemCount: built.manifest.papers.length,
    warnings: built.manifest.warnings,
    ...(output ? { resourceOutputs: [output] } : {}),
  };
}

export async function importLiteratureBundleArchive(args) {
  const { host, archive, manifest } = args;
  const target = args.target || resolveLiteratureBundleImportTarget(host);
  const { view, libraryID } = target;
  const importedItems = [];
  const failedItems = [];
  const warnings = [...(manifest.warnings || [])];
  const importedByBundleId = new Map();

  for (const itemRecord of manifest.items) {
    let parent = null;
    const createdChildren = [];
    try {
      parent = await host.items.createFromJson({ itemJson: itemRecord.itemJson, libraryID });
      if (view.currentCollection?.id && Number(view.currentCollection.libraryId) === libraryID) {
        await host.collections.add(parent, view.currentCollection.id);
      }
      for (const attachmentRecord of itemRecord.attachments || []) {
        if (attachmentRecord.kind === "skipped") continue;
        if (attachmentRecord.kind === "url") {
          createdChildren.push(
            await host.attachments.createFromUrl({
              parent,
              url: attachmentRecord.metadata.url,
              title: attachmentRecord.metadata.title,
              mimeType: attachmentRecord.metadata.contentType,
              deduplicate: false,
            }),
          );
          continue;
        }
        const attachment = await host.attachments.importStoredFile({
          parent,
          path: archive.resolvePath(attachmentRecord.path),
          title: attachmentRecord.metadata?.title,
          mimeType: attachmentRecord.metadata?.contentType,
          charset: attachmentRecord.metadata?.charset,
          url: attachmentRecord.metadata?.url,
          companionFiles:
            attachmentRecord.kind === "markdown"
              ? (attachmentRecord.assets || []).map((asset) => ({
                  sourcePath: archive.resolvePath(asset.path),
                  relativePath: asset.relativePath,
                }))
              : [],
        });
        createdChildren.push(attachment);
      }
      for (const noteRecord of itemRecord.notes || []) {
        const portableHtml = await archive.readText(noteRecord.htmlPath);
        const note = await host.parents.addNote(parent, { content: portableHtml });
        createdChildren.push(note);
        const newKeys = new Map();
        for (const imageRecord of noteRecord.images || []) {
          const bytes = await archive.readBytes(imageRecord.path);
          const imported = await host.notes.importEmbeddedImage(note, {
            bytes,
            mimeType: imageRecord.metadata?.contentType || "image/png",
            width: 1,
            height: 1,
            originalBytes: bytes.length,
            compressedBytes: bytes.length,
          });
          createdChildren.push(imported.attachmentItem);
          newKeys.set(imageRecord.id, imported.attachmentKey);
        }
        await host.notes.update(note, {
          content: restorePortableNoteHtml(portableHtml, newKeys),
        });
      }
      importedByBundleId.set(itemRecord.id, parent);
      importedItems.push({ bundleItemId: itemRecord.id, itemId: parent.id, itemKey: parent.key });
    } catch (error) {
      appendLiteratureBundleImportLog(host, {
        stage: "literature-bundle-parent-import-failed",
        operation: "materialize-parent",
        details: { bundleItemId: itemRecord.id },
        error,
      });
      for (const child of createdChildren.reverse()) {
        try {
          await host.items.remove(child);
        } catch {
          warnings.push({ code: "import_cleanup_failed", itemId: itemRecord.id });
        }
      }
      if (parent) {
        try {
          await host.items.remove(parent);
        } catch {
          warnings.push({ code: "import_cleanup_failed", itemId: itemRecord.id });
        }
      }
      failedItems.push({ bundleItemId: itemRecord.id, code: "parent_import_failed" });
    }
  }

  for (const itemRecord of manifest.items) {
    const parent = importedByBundleId.get(itemRecord.id);
    if (!parent) continue;
    for (const relatedId of itemRecord.relatedItemIds || []) {
      const related = importedByBundleId.get(relatedId);
      if (!related || String(itemRecord.id) >= String(relatedId)) continue;
      try {
        await host.parents.addRelated(parent, related);
        await host.parents.addRelated(related, parent);
      } catch {
        warnings.push({ code: "related_item_restore_failed", itemId: itemRecord.id, childId: relatedId });
      }
    }
  }

  return {
    kind: "literature_bundle_import",
    status: failedItems.length || warnings.length ? "partial" : "completed",
    importedItems,
    failedItems,
    warnings,
  };
}

function productPayloadForImport(payloadType, content) {
  if (payloadType === "digest-markdown" || payloadType === "conversation-note-markdown") {
    return { format: "markdown", content };
  }
  return JSON.parse(content);
}

function productPayloadNoteKind(payloadType) {
  return payloadType === "digest-markdown"
    ? "digest"
    : payloadType === "references-json"
      ? "references"
      : payloadType === "citation-analysis-json"
        ? "citation-analysis"
        : "conversation-note";
}

export async function importResearchProductArchive(args) {
  const { host, archive, manifest } = args;
  const target = args.target || resolveLiteratureBundleImportTarget(host);
  const { view, libraryID } = target;
  const importedItems = [];
  const failedItems = [];
  const warnings = [...(manifest.warnings || [])];
  for (const paper of manifest.papers) {
    let parent = null;
    const createdChildren = [];
    try {
      const metadata = JSON.parse(await archive.readText(paper.metadata_path));
      parent = await host.items.createFromJson({ itemJson: metadata, libraryID });
      if (view.currentCollection?.id && Number(view.currentCollection.libraryId) === libraryID) {
        await host.collections.add(parent, view.currentCollection.id);
      }
      if (paper.source?.path) {
        const isMarkdown = paper.source.kind === "markdown" || /\.md$/i.test(paper.source.path);
        const attachment = await host.attachments.importStoredFile({
          parent,
          path: archive.resolvePath(paper.source.path),
          title: "Research source",
          mimeType: isMarkdown ? "text/markdown" : "application/pdf",
          companionFiles: isMarkdown
            ? (paper.source.assets || []).map((asset) => ({
                sourcePath: archive.resolvePath(asset.path),
                relativePath: asset.source_relative_path || asset.relativePath,
              }))
            : [],
        });
        createdChildren.push(attachment);
      }
      for (const payload of paper.payloads || []) {
        const content = await archive.readText(payload.path);
        const noteKind = productPayloadNoteKind(payload.payload_type);
        const note = await host.parents.addNote(parent, {
          content: `<div data-zs-note-kind="${noteKind}"></div>`,
        });
        createdChildren.push(note);
        await attachWorkbenchPayloadToNote({
          runtime: args.runtime || { hostApi: host },
          note,
          noteKind,
          payloadType: payload.payload_type,
          payload: productPayloadForImport(payload.payload_type, content),
        });
      }
      importedItems.push({ bundleItemId: paper.logical_id, itemId: parent.id, itemKey: parent.key });
    } catch (error) {
      appendLiteratureBundleImportLog(host, {
        stage: "research-product-paper-import-failed",
        operation: "materialize-paper",
        details: { paperId: paper.logical_id },
        error,
      });
      for (const child of createdChildren.reverse()) {
        try { await host.items.remove(child); } catch { warnings.push({ code: "import_cleanup_failed", itemId: paper.logical_id }); }
      }
      if (parent) {
        try { await host.items.remove(parent); } catch { warnings.push({ code: "import_cleanup_failed", itemId: paper.logical_id }); }
      }
      failedItems.push({ bundleItemId: paper.logical_id, code: "parent_import_failed" });
    }
  }
  return {
    kind: "literature_bundle_import",
    status: failedItems.length || warnings.length ? "partial" : "completed",
    importedItems,
    failedItems,
    warnings,
  };
}

function appendLiteratureBundleImportLog(host, args) {
  try {
    host.logging?.appendRuntimeLog?.({
      level: "error",
      scope: "workflow",
      workflowId: "import-literature-bundle",
      component: "literature-bundle",
      operation: args.operation,
      stage: args.stage,
      message: args.message || "literature bundle import failed",
      details: args.details,
      error: args.error,
    });
  } catch {
    // Diagnostics must not replace the workflow's structured result.
  }
}

function resolveLiteratureBundleImportTarget(host) {
  const view = host.context.getCurrentView();
  const libraryID = Number(view?.libraryId || 0);
  if (!libraryID) throw new Error("current Zotero library is unavailable");
  return { view, libraryID };
}

function literatureBundleValidationFailure(host, stage, error) {
  appendLiteratureBundleImportLog(host, {
    stage: "literature-bundle-validation-failed",
    operation: "validate-import",
    details: { validationStage: stage },
    error,
  });
  return {
    kind: "literature_bundle_import",
    status: "validation_failed",
    importedItems: [],
    failedItems: [],
    warnings: [{ code: "bundle_validation_failed", stage }],
  };
}

function throwLiteratureBundleImportFailure(host, stage, error) {
  appendLiteratureBundleImportLog(host, {
    stage: "literature-bundle-import-failed",
    operation: "import",
    details: { importStage: stage },
    error,
  });
  const reason = normalizeText(error?.message || error) || "unknown error";
  const failure = new Error(`Literature bundle import failed during ${stage}: ${reason}`);
  failure.code = "import_failed";
  failure.structuredResult = {
    kind: "literature_bundle_import",
    status: "import_failed",
    importedItems: [],
    failedItems: [],
    warnings: [{ code: "bundle_import_failed", stage }],
  };
  throw failure;
}

export async function importLiteratureBundle(args) {
  const sourcePath =
    args.host.resources?.getInput("bundle")?.path ||
    (await args.host.file.pickFile({
      title: "Import Literature Bundle",
      filters: [["Literature bundle", "*.zip"]],
    }));
  if (!sourcePath) {
    return { kind: "literature_bundle_import", status: "canceled", importedItems: [], failedItems: [], warnings: [] };
  }
  let callbackStarted = false;
  try {
    return await args.host.archive.withExtractedZip(sourcePath, async (archive) => {
      callbackStarted = true;
      let manifest;
      try {
        const raw = JSON.parse(await archive.readText("manifest.json"));
        manifest = raw?.schema_id === RESEARCH_PRODUCT_SCHEMA
          ? validateResearchProductManifest(raw, archive.entries)
          : validateLiteratureBundleManifest(raw, archive.entries);
      } catch (error) {
        return literatureBundleValidationFailure(args.host, "manifest", error);
      }
      try {
        if (manifest?.schema_id === RESEARCH_PRODUCT_SCHEMA) {
          await verifyResearchProductFiles(manifest, archive);
        } else {
          await verifyLiteratureBundleFiles(manifest, archive);
        }
      } catch (error) {
        return literatureBundleValidationFailure(args.host, "integrity", error);
      }
      let target;
      try {
        target = resolveLiteratureBundleImportTarget(args.host);
      } catch (error) {
        return throwLiteratureBundleImportFailure(args.host, "target", error);
      }
      try {
        const importArgs = {
          host: args.host,
          archive,
          manifest,
          target,
          runtime: args.runtime,
        };
        return manifest?.schema_id === RESEARCH_PRODUCT_SCHEMA
          ? await importResearchProductArchive(importArgs)
          : await importLiteratureBundleArchive(importArgs);
      } catch (error) {
        return throwLiteratureBundleImportFailure(
          args.host,
          "materialization",
          error,
        );
      }
    });
  } catch (error) {
    if (error?.structuredResult) {
      throw error;
    }
    if (!callbackStarted) {
      return literatureBundleValidationFailure(args.host, "archive_open", error);
    }
    return throwLiteratureBundleImportFailure(args.host, "cleanup", error);
  }
}

export function assertLiteratureBundleImportSucceeded(result) {
  const status = normalizeText(result?.status);
  const importedItems = Array.isArray(result?.importedItems)
    ? result.importedItems
    : [];
  const noItemsImported = importedItems.length === 0;
  const failed =
    status === "validation_failed" ||
    status === "partial" && noItemsImported ||
    status === "completed" && noItemsImported;
  if (!failed) {
    return result;
  }

  const message =
    status === "validation_failed"
      ? "Literature bundle validation failed"
      : "Literature bundle import did not create any items";
  const error = new Error(message);
  error.code = status || "import_failed";
  error.structuredResult = result;
  throw error;
}
