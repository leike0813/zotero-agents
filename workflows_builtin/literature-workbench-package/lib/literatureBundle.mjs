import { getBaseName, sanitizeFileNameSegment } from "./path.mjs";
import { RESEARCH_PRODUCT_SCHEMA } from "./researchBundle.mjs";
import {
  attachWorkbenchPayloadToNote,
  listWorkbenchEmbeddedPayloadBlocksForNote,
  workbenchPayloadArtifactName,
  workbenchPayloadText,
} from "./embeddedPayloadAttachments.mjs";
import { exportBundleBibliography } from "./bundleBibliography.mjs";
import { rewriteMarkdownLocalImages } from "./markdownLocalImages.mjs";
import {
  buildLiteratureScorePayload,
  upsertLiteratureScoreNote,
} from "./literatureScoreNote.mjs";

export { rewriteMarkdownLocalImages };

export const LITERATURE_BUNDLE_KIND = "zotero-agents-literature-bundle";
export const LITERATURE_BUNDLE_SCHEMA_VERSION = 1;
export const LITERATURE_PRODUCT_SCHEMA = "literature_bundle.product";
export const LITERATURE_PRODUCT_SCHEMA_VERSION = "1.0.0";
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

function bindPortableNoteImageSlots(html) {
  return String(html || "").replace(
    /\sdata-zb-attachment-ref\s*=\s*(?:"([^"]+)"|'([^']+)')/gi,
    (_match, doubleQuoted, singleQuoted) =>
      ` data-zotero-agents-image-slot="${normalizeText(doubleQuoted || singleQuoted)}"`,
  );
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

function ensureUniqueProductIds(manifest) {
  if (!manifest.papers.length) {
    throw new Error("literature product must contain at least one paper");
  }
  const paperIds = new Set();
  for (const paper of manifest.papers) {
    const paperId = normalizeText(paper?.logical_id);
    if (!paperId || paperIds.has(paperId)) {
      throw new Error("duplicate or missing literature product paper id");
    }
    paperIds.add(paperId);
    const paperRoot = `papers/${paperId}`;
    if (
      normalizeEntryPath(paper?.metadata_path) !== `${paperRoot}/metadata.json`
    ) {
      throw new Error("literature product paper metadata ownership mismatch");
    }
    const uniqueIds = (records, kind) => {
      const ids = new Set();
      for (const record of records || []) {
        const id = normalizeText(record?.id);
        if (!id || ids.has(id)) {
          throw new Error(`duplicate or missing literature product ${kind} id`);
        }
        ids.add(id);
      }
      return ids;
    };
    const attachmentIds = uniqueIds(paper.attachments, "attachment");
    uniqueIds(paper.notes, "note");
    uniqueIds(paper.payloads, "payload");
    for (const attachment of paper.attachments || []) {
      uniqueIds(attachment.assets, "asset");
      const attachmentRoot = `${paperRoot}/attachments/${attachment.id}/`;
      if (
        ["file", "markdown"].includes(normalizeText(attachment?.kind)) &&
        !attachment?.path
      ) {
        throw new Error("literature product attachment path is missing");
      }
      if (
        attachment?.path &&
        !normalizeEntryPath(attachment.path).startsWith(attachmentRoot)
      ) {
        throw new Error("literature product attachment ownership mismatch");
      }
      for (const asset of attachment.assets || []) {
        if (!normalizeEntryPath(asset?.path).startsWith(attachmentRoot)) {
          throw new Error("literature product attachment asset ownership mismatch");
        }
      }
    }
    const noteImages = new Map();
    for (const note of paper.notes || []) {
      if (!note?.htmlPath) {
        throw new Error("literature product note HTML path is missing");
      }
      const noteRoot = `${paperRoot}/notes/${note.id}`;
      if (normalizeEntryPath(note.htmlPath) !== `${noteRoot}/note.html`) {
        throw new Error("literature product note ownership mismatch");
      }
      for (const image of note.images || []) {
        if (
          !normalizeEntryPath(image?.path).startsWith(
            `${noteRoot}/images/${image.id}/`,
          )
        ) {
          throw new Error("literature product note image ownership mismatch");
        }
      }
      noteImages.set(note.id, uniqueIds(note.images, "image"));
    }
    if (paper.primary_source) {
      const attachmentId = normalizeText(paper.primary_source.attachment_id);
      const attachment = (paper.attachments || []).find(
        (entry) => normalizeText(entry?.id) === attachmentId,
      );
      if (!attachmentIds.has(attachmentId) || !attachment?.path) {
        throw new Error("unresolved literature product primary source attachment");
      }
      if (normalizeEntryPath(paper.primary_source.path) !== normalizeEntryPath(attachment.path)) {
        throw new Error("literature product primary source path mismatch");
      }
      if (
        JSON.stringify(paper.primary_source.assets || []) !==
        JSON.stringify(attachment.assets || [])
      ) {
        throw new Error("literature product primary source assets mismatch");
      }
    }
    for (const payload of paper.payloads || []) {
      if (
        payload?.path &&
        !normalizeEntryPath(payload.path).startsWith(`${paperRoot}/payloads/`)
      ) {
        throw new Error("literature product payload ownership mismatch");
      }
      const noteId = normalizeText(payload?.source_note_id);
      const imageId = normalizeText(payload?.source_image_id);
      if (!noteImages.get(noteId)?.has(imageId)) {
        throw new Error("unresolved literature product payload source");
      }
      if (
        !payload?.path ||
        !["markdown", "json", "text"].includes(normalizeText(payload?.format)) ||
        !["present", "stale", "missing"].includes(
          normalizeText(payload?.anchor_status),
        )
      ) {
        throw new Error("invalid literature product payload projection");
      }
    }
  }
  for (const paper of manifest.papers) {
    for (const relatedId of paper.related_paper_ids || []) {
      if (!paperIds.has(normalizeText(relatedId))) {
        throw new Error("unresolved related literature product paper ref");
      }
    }
  }
}

export function validateLiteratureProductManifest(value, archiveEntries) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("literature product manifest must be an object");
  }
  if (
    value.schema_id !== LITERATURE_PRODUCT_SCHEMA ||
    String(value.schema_version) !== LITERATURE_PRODUCT_SCHEMA_VERSION
  ) {
    throw new Error("unsupported literature product schema");
  }
  if (!Array.isArray(value.papers) || !value.files || typeof value.files !== "object") {
    throw new Error("literature product papers/files are missing");
  }
  ensureUniqueProductIds(value);
  const declared = Object.keys(value.files).map(normalizeEntryPath).sort();
  if (new Set(declared).size !== declared.length) {
    throw new Error("duplicate declared file path");
  }
  for (const path of declared) {
    const detail = value.files[path];
    if (
      !Number.isInteger(detail?.size) ||
      detail.size < 0 ||
      !/^[a-f0-9]{64}$/.test(normalizeText(detail?.sha256))
    ) {
      throw new Error(`invalid file integrity record: ${path}`);
    }
  }
  const referenced = ["README.md", "index.md"];
  if (value.bibliography?.path) referenced.push(value.bibliography.path);
  for (const paper of value.papers) {
    if (!paper?.metadata_path) {
      throw new Error("literature product paper metadata is missing");
    }
    referenced.push(paper.metadata_path);
    for (const attachment of paper.attachments || []) {
      if (attachment?.path) referenced.push(attachment.path);
      for (const asset of attachment?.assets || []) {
        if (asset?.path) referenced.push(asset.path);
      }
    }
    for (const note of paper.notes || []) {
      if (note?.htmlPath) referenced.push(note.htmlPath);
      for (const image of note?.images || []) {
        if (image?.path) referenced.push(image.path);
      }
    }
    for (const payload of paper.payloads || []) {
      if (!workbenchPayloadArtifactName(payload?.payload_type)) {
        throw new Error("unsupported literature product payload type");
      }
      if (payload?.path) referenced.push(payload.path);
    }
  }
  const declaredSet = new Set(declared);
  for (const path of referenced.map(normalizeEntryPath)) {
    if (!declaredSet.has(path)) {
      throw new Error(`unresolved literature product file ref: ${path}`);
    }
  }
  const actual = (archiveEntries || [])
    .map(normalizeEntryPath)
    .filter((path) => path !== "manifest.json")
    .sort();
  if (JSON.stringify(declared) !== JSON.stringify(actual)) {
    throw new Error("literature product file closure does not match archive entries");
  }
  return value;
}

export async function verifyLiteratureProductFiles(manifest, archive) {
  if (typeof archive?.measureEntries !== "function") {
    throw new Error("extracted archive integrity measurement is unavailable");
  }
  const measured = await archive.measureEntries(Object.keys(manifest.files || {}));
  for (const [path, expected] of Object.entries(manifest.files || {})) {
    const actual = measured?.files?.[path];
    if (actual?.size !== expected.size || actual?.sha256 !== expected.sha256) {
      throw new Error(`literature product file integrity mismatch: ${path}`);
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

function literatureProductPath(path, itemId, logicalId) {
  if (!path) return path;
  const prefix = `items/${itemId}/`;
  if (!String(path).startsWith(prefix)) {
    throw new Error(`unexpected literature snapshot path: ${path}`);
  }
  return `papers/${logicalId}/${String(path).slice(prefix.length)}`;
}

function renderLiteratureProductReadme() {
  return [
    "# Literature Bundle",
    "",
    "This `literature_bundle.product@1.0.0` archive is both a complete Zotero transfer package and an Agent-readable literature product.",
    "",
    "- Use `index.md` to locate papers and their preferred Markdown or PDF source.",
    "- Read `papers/<id>/metadata.json` for portable bibliographic metadata.",
    "- Read `papers/<id>/payloads/` for decoded analysis artifacts.",
    "- Treat `manifest.json` as the authority for attachments, notes, relations, warnings, and file integrity.",
    "- Zotero import restores `attachments` and `notes`; payload text files are read-only Agent projections.",
    "",
  ].join("\n");
}

function escapeMarkdownCell(value) {
  return normalizeText(value).replace(/\|/g, "\\|") || "(untitled)";
}

function renderLiteratureProductIndex(papers) {
  const lines = [
    "# Literature Bundle Index",
    "",
    "| Title | Directory | Primary source |",
    "| --- | --- | --- |",
  ];
  for (const paper of papers) {
    lines.push(
      `| ${escapeMarkdownCell(paper.title)} | \`papers/${paper.logical_id}\` | ${paper.primary_source?.path ? `\`${paper.primary_source.path}\`` : "—"} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

export async function buildLiteratureProduct(args) {
  const { host, parents } = args;
  const snapshot = await buildLiteratureBundleExport({ host, parents });
  const warnings = [...snapshot.warnings];
  const entries = [];
  const paperIdByItemId = new Map(
    snapshot.manifest.items.map((item, index) => [
      item.id,
      `paper-${String(index + 1).padStart(3, "0")}`,
    ]),
  );
  const runtime = {
    ...(args.runtime || {}),
    hostApi: host,
    helpers: {
      ...(args.runtime?.helpers || {}),
      resolveItemRef:
        args.runtime?.helpers?.resolveItemRef || ((ref) => host.items.get(ref)),
    },
  };

  for (const entry of snapshot.entries) {
    const itemId = /^items\/([^/]+)\//.exec(entry.name)?.[1];
    const logicalId = paperIdByItemId.get(itemId);
    if (!logicalId) throw new Error(`unresolved literature snapshot entry owner: ${entry.name}`);
    entries.push({
      ...entry,
      name: literatureProductPath(entry.name, itemId, logicalId),
    });
  }

  const papers = [];
  for (let index = 0; index < snapshot.manifest.items.length; index += 1) {
    const item = snapshot.manifest.items[index];
    const parent = parents[index];
    const logicalId = paperIdByItemId.get(item.id);
    const remapPath = (path) => literatureProductPath(path, item.id, logicalId);
    const attachments = (item.attachments || []).map((attachment) => ({
      ...attachment,
      ...(attachment.path ? { path: remapPath(attachment.path) } : {}),
      assets: (attachment.assets || []).map((asset) => ({
        ...asset,
        path: remapPath(asset.path),
      })),
    }));
    const notes = (item.notes || []).map((note) => ({
      ...note,
      htmlPath: remapPath(note.htmlPath),
      images: (note.images || []).map((image) => ({
        ...image,
        path: remapPath(image.path),
      })),
    }));
    const metadataPath = `papers/${logicalId}/metadata.json`;
    entries.push({
      name: metadataPath,
      text: `${JSON.stringify(item.itemJson, null, 2)}\n`,
    });

    const payloads = [];
    let noteRecordIndex = 0;
    const payloadOrdinals = new Map();
    for (const noteRef of parent.getNotes?.() || []) {
      const note = host.items.get(noteRef);
      if (!note) continue;
      const noteRecord = notes[noteRecordIndex++];
      if (!noteRecord) continue;
      const imageIdByKey = new Map();
      let imageIndex = 0;
      for (const imageRef of note.getAttachments?.() || []) {
        const image = host.items.get(imageRef);
        if (!image) continue;
        const imageId = `e${++imageIndex}`;
        if (noteRecord.images.some((record) => record.id === imageId)) {
          imageIdByKey.set(normalizeText(image.key), imageId);
        }
      }
      const blocks = await listWorkbenchEmbeddedPayloadBlocksForNote({
        noteItem: note,
        runtime,
      });
      for (const block of blocks) {
        const artifactName = workbenchPayloadArtifactName(block.payloadType);
        const sourceImageId = imageIdByKey.get(normalizeText(block.attachmentKey));
        if (!artifactName || !sourceImageId) continue;
        const ordinal = (payloadOrdinals.get(block.payloadType) || 0) + 1;
        payloadOrdinals.set(block.payloadType, ordinal);
        const extension = block.format === "json" ? "json" : "md";
        const path = `papers/${logicalId}/payloads/${artifactName}-${String(ordinal).padStart(3, "0")}.${extension}`;
        entries.push({ name: path, text: workbenchPayloadText(block) });
        payloads.push({
          id: `p${payloads.length + 1}`,
          payload_type: block.payloadType,
          note_kind: block.noteKind,
          format: block.format,
          path,
          source_note_id: noteRecord.id,
          source_image_id: sourceImageId,
          payload_hash: block.payloadHash || "",
          anchor_status: block.anchorStatus,
        });
      }
    }

    const markdown = attachments.find(
      (attachment) => attachment.kind === "markdown" && attachment.path,
    );
    const pdf = attachments.find(
      (attachment) =>
        attachment.kind === "file" &&
        attachment.path &&
        (/application\/pdf/i.test(attachment.metadata?.contentType) ||
          /\.pdf$/i.test(attachment.path)),
    );
    const preferred = markdown || pdf || null;
    if (!preferred) {
      warnings.push({ code: "primary_source_missing", paper_id: logicalId });
    }
    papers.push({
      logical_id: logicalId,
      title: normalizeText(parent.getField?.("title") || item.itemJson?.title),
      metadata_path: metadataPath,
      attachments,
      notes,
      payloads,
      primary_source: preferred
        ? {
            attachment_id: preferred.id,
            kind: preferred.kind === "markdown" ? "markdown" : "pdf",
            path: preferred.path,
            assets: preferred.assets || [],
          }
        : null,
      related_paper_ids: (item.relatedItemIds || [])
        .map((relatedId) => paperIdByItemId.get(relatedId))
        .filter(Boolean),
    });
  }

  const bibliographyExport = await exportBundleBibliography({
    host,
    items: parents,
    warnings,
  });
  const bibliography = bibliographyExport.bibliography;
  if (bibliography.status === "generated") {
    entries.push({ name: "references.bib", text: bibliographyExport.content });
  }
  entries.push({ name: "index.md", text: renderLiteratureProductIndex(papers) });
  entries.push({ name: "README.md", text: renderLiteratureProductReadme() });
  const measured = await host.archive.measureEntries(entries);
  const manifest = {
    schema_id: LITERATURE_PRODUCT_SCHEMA,
    schema_version: LITERATURE_PRODUCT_SCHEMA_VERSION,
    created_at: new Date().toISOString(),
    source: {
      zotero_version: normalizeText(globalThis.Zotero?.version),
      addon_version: normalizeText(host.addon?.getConfig?.()?.addonVersion),
    },
    bibliography,
    papers,
    files: measured.files,
    warnings,
  };
  return { manifest, entries, warnings };
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
  const built = await buildLiteratureProduct({
    host: args.host,
    parents,
    runtime: args.runtime,
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
    kind: "literature_product_export",
    status: "completed",
    schemaId: LITERATURE_PRODUCT_SCHEMA,
    itemCount: built.manifest.papers.length,
    warnings: built.manifest.warnings,
    ...(output ? { resourceOutputs: [output] } : {}),
  };
}

export async function importLiteratureBundleArchive(args) {
  const { host, archive, manifest } = args;
  const target = args.target || resolveLiteratureBundleImportTarget(host);
  const { view, libraryID } = target;
  const warnings = [...(manifest.warnings || [])];
  if (typeof host.resources?.materializeFile !== "function") {
    throw new Error("Literature Product import requires resources.materializeFile");
  }
  if (typeof host.researchBundles?.importPapers !== "function") {
    throw new Error("Literature Product import requires researchBundles.importPapers");
  }
  const collectionRef = view.currentCollection?.ref;
  const collectionRefs =
    Number(collectionRef?.libraryId) === libraryID && normalizeText(collectionRef?.key)
      ? [{ libraryId: libraryID, key: normalizeText(collectionRef.key) }]
      : [];
  const papers = [];
  for (const itemRecord of manifest.items) {
    const attachments = [];
    for (const attachmentRecord of itemRecord.attachments || []) {
      if (attachmentRecord.kind === "skipped") continue;
      if (attachmentRecord.kind === "url") {
        attachments.push({
          attachmentId: attachmentRecord.id,
          source: { kind: "linked_url", url: attachmentRecord.metadata.url },
          metadata: {
            title: attachmentRecord.metadata?.title,
            contentType: attachmentRecord.metadata?.contentType,
          },
        });
        continue;
      }
      const main = await host.resources.materializeFile({
        slotId: "research-import-files",
        sourcePath: archive.resolvePath(attachmentRecord.path),
        displayName: attachmentRecord.path.split("/").pop(),
        contentType: attachmentRecord.metadata?.contentType,
      });
      const companions = [];
      for (const asset of attachmentRecord.kind === "markdown"
        ? attachmentRecord.assets || []
        : []) {
        const resource = await host.resources.materializeFile({
          slotId: "research-import-files",
          sourcePath: archive.resolvePath(asset.path),
          displayName: asset.path.split("/").pop(),
          contentType: asset.contentType || "application/octet-stream",
        });
        companions.push({
          resourceRef: resource.ref,
          targetRelativePath: asset.relativePath,
        });
      }
      attachments.push({
        attachmentId: attachmentRecord.id,
        source: {
          kind: "stored_file",
          main: {
            resourceRef: main.ref,
            targetFilename: attachmentRecord.path.split("/").pop(),
          },
          companions,
        },
        metadata: {
          title: attachmentRecord.metadata?.title,
          contentType: attachmentRecord.metadata?.contentType,
          charset: attachmentRecord.metadata?.charset,
          originalUrl: attachmentRecord.metadata?.url,
        },
      });
    }
    const notes = [];
    for (const noteRecord of itemRecord.notes || []) {
      const portableHtml = await archive.readText(noteRecord.htmlPath);
      const embeddedImages = [];
      for (const imageRecord of noteRecord.images || []) {
        const resource = await host.resources.materializeFile({
          slotId: "research-import-files",
          sourcePath: archive.resolvePath(imageRecord.path),
          displayName: imageRecord.path.split("/").pop(),
          contentType: imageRecord.metadata?.contentType || "image/png",
        });
        embeddedImages.push({
          slot: imageRecord.id,
          resourceRef: resource.ref,
          altText: imageRecord.metadata?.title || imageRecord.id,
        });
      }
      notes.push({
        noteId: noteRecord.id,
        content: {
          format: "html",
          value: bindPortableNoteImageSlots(portableHtml),
          embeddedImages,
        },
        tags: [],
        payloads: [],
      });
    }
    papers.push({
      graphId: itemRecord.id,
      target: { kind: "create" },
      item: portableResearchItem(itemRecord.itemJson),
      collectionRefs,
      notes,
      attachments,
      relatedGraphIds: itemRecord.relatedItemIds || [],
      relatedExistingRefs: [],
    });
  }

  const imported = await host.researchBundles.importPapers({
    operationId: researchImportOperationId(),
    libraryId: libraryID,
    papers,
  });
  const importedItems = imported.papers
    .filter((paper) => paper.outcome === "committed" || paper.outcome === "reused")
    .map((paper) => ({
      bundleItemId: paper.graphId,
      itemRef: paper.itemRef,
      ...(host.items?.getByLibraryAndKey
        ? (() => {
            const item = host.items.getByLibraryAndKey(
              paper.itemRef.libraryId,
              paper.itemRef.key,
            );
            return item
              ? { itemId: item.id, itemKey: item.key }
              : { itemKey: paper.itemRef.key };
          })()
        : { itemKey: paper.itemRef.key }),
    }));
  const failedItems = imported.papers
    .filter((paper) => paper.outcome !== "committed" && paper.outcome !== "reused")
    .map((paper) => ({
      bundleItemId: paper.graphId,
      code: "parent_import_failed",
      ...(paper.attemptId ? { attemptId: paper.attemptId } : {}),
    }));

  return {
    kind: "literature_bundle_import",
    status: failedItems.length || warnings.length ? "partial" : "completed",
    importedItems,
    failedItems,
    warnings,
    importResult: imported,
  };
}

export async function importLiteratureProductArchive(args) {
  const items = [];
  for (const paper of args.manifest.papers || []) {
    items.push({
      id: paper.logical_id,
      itemJson: JSON.parse(await args.archive.readText(paper.metadata_path)),
      relatedItemIds: paper.related_paper_ids || [],
      attachments: paper.attachments || [],
      notes: paper.notes || [],
    });
  }
  return importLiteratureBundleArchive({
    ...args,
    manifest: {
      warnings: args.manifest.warnings || [],
      items,
    },
  });
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
        : payloadType === "literature-score-json"
          ? "literature-score"
    : "conversation-note";
}

function portableResearchItem(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    throw new Error("research product metadata must be an object");
  }
  const itemType = normalizeText(metadata.itemType);
  if (!itemType) throw new Error("research product itemType is missing");
  const excluded = new Set([
    "itemType",
    "creators",
    "tags",
    "collections",
    "relations",
    "key",
    "version",
    "libraryID",
    "dateAdded",
    "dateModified",
    "uri",
  ]);
  const fields = {};
  for (const [field, value] of Object.entries(metadata)) {
    if (excluded.has(field) || value === null || value === undefined) continue;
    if (["string", "number", "boolean"].includes(typeof value)) {
      fields[field] = String(value);
    }
  }
  const creators = (Array.isArray(metadata.creators) ? metadata.creators : [])
    .map((creator) => ({
      ...(normalizeText(creator?.firstName) ? { firstName: normalizeText(creator.firstName) } : {}),
      ...(normalizeText(creator?.lastName) ? { lastName: normalizeText(creator.lastName) } : {}),
      ...(normalizeText(creator?.name) ? { name: normalizeText(creator.name) } : {}),
      ...(normalizeText(creator?.creatorType) ? { creatorType: normalizeText(creator.creatorType) } : {}),
    }));
  const tags = (Array.isArray(metadata.tags) ? metadata.tags : [])
    .map((tag) => normalizeText(typeof tag === "string" ? tag : tag?.tag))
    .filter(Boolean);
  return {
    schema: "zotero-agents.portable-regular-item.v1",
    itemType,
    fields,
    creators,
    tags,
  };
}

function researchImportOperationId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `research-product-import:${uuid || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`;
}

function researchPayloadValue(payloadType, content) {
  return payloadType === "digest-markdown" || payloadType === "conversation-note-markdown"
    ? content
    : JSON.parse(content);
}

function researchPayloadSummary(payloadType, payload, content) {
  return {
    payloadType,
    noteKind: productPayloadNoteKind(payloadType),
    version: normalizeText(payload?.version) || "1",
    format: payload?.format === "json" ? "json" : "markdown",
    encoding: "utf-8",
    estimatedBytes: new TextEncoder().encode(content).byteLength,
    source: { kind: "inline" },
    state: "available",
    issues: [],
  };
}

export async function importResearchProductArchive(args) {
  const { host, archive, manifest } = args;
  const target = args.target || resolveLiteratureBundleImportTarget(host);
  const { view, libraryID } = target;
  const warnings = [...(manifest.warnings || [])];
  if (typeof host.resources?.materializeFile !== "function") {
    throw new Error("Research Product import requires resources.materializeFile");
  }
  if (typeof host.researchBundles?.importPapers !== "function") {
    throw new Error("Research Product import requires researchBundles.importPapers");
  }
  const collectionRef = view.currentCollection?.ref;
  const collectionRefs =
    Number(collectionRef?.libraryId) === libraryID && normalizeText(collectionRef?.key)
      ? [{ libraryId: libraryID, key: normalizeText(collectionRef.key) }]
      : [];
  const papers = [];
  for (const paper of manifest.papers) {
    const metadata = JSON.parse(await archive.readText(paper.metadata_path));
    const attachments = [];
    if (paper.source?.path) {
      const isMarkdown = paper.source.kind === "markdown" || /\.md$/i.test(paper.source.path);
      const main = await host.resources.materializeFile({
        slotId: "research-import-files",
        sourcePath: archive.resolvePath(paper.source.path),
        displayName: paper.source.path.split("/").pop(),
        contentType: isMarkdown ? "text/markdown" : "application/pdf",
      });
      const companions = [];
      for (const asset of isMarkdown ? paper.source.assets || [] : []) {
        const materialized = await host.resources.materializeFile({
          slotId: "research-import-files",
          sourcePath: archive.resolvePath(asset.path),
          displayName: asset.path.split("/").pop(),
          contentType: normalizeText(asset.content_type) || "application/octet-stream",
        });
        companions.push({
          resourceRef: materialized.ref,
          targetRelativePath: asset.source_relative_path || asset.relativePath,
        });
      }
      attachments.push({
        attachmentId: "research-source",
        source: {
          kind: "stored_file",
          main: {
            resourceRef: main.ref,
            targetFilename: paper.source.path.split("/").pop(),
          },
          companions,
        },
        metadata: {
          title: "Research source",
          contentType: isMarkdown ? "text/markdown" : "application/pdf",
        },
      });
    }
    const notes = [];
    for (let index = 0; index < (paper.payloads || []).length; index += 1) {
      const payload = paper.payloads[index];
      const content = await archive.readText(payload.path);
      const noteKind = productPayloadNoteKind(payload.payload_type);
      notes.push({
        noteId: `${noteKind}-${String(index + 1).padStart(3, "0")}`,
        content: {
          format: "html",
          value: `<div data-zs-note-kind="${noteKind}"></div>`,
        },
        tags: [],
        payloads: [{
          summary: researchPayloadSummary(payload.payload_type, payload, content),
          value: researchPayloadValue(payload.payload_type, content),
        }],
      });
    }
    papers.push({
      graphId: paper.logical_id,
      target: { kind: "create" },
      item: portableResearchItem(metadata),
      collectionRefs,
      notes,
      attachments,
      relatedGraphIds: paper.related_paper_ids || [],
      relatedExistingRefs: [],
    });
  }
  const imported = await host.researchBundles.importPapers({
    operationId: researchImportOperationId(),
    libraryId: libraryID,
    papers,
  });
  const importedItems = imported.papers
    .filter((paper) => paper.outcome === "committed" || paper.outcome === "reused")
    .map((paper) => ({ bundleItemId: paper.graphId, itemRef: paper.itemRef }));
  const failedItems = imported.papers
    .filter((paper) => paper.outcome !== "committed" && paper.outcome !== "reused")
    .map((paper) => ({
      bundleItemId: paper.graphId,
      code: paper.outcome,
      ...(paper.attemptId ? { attemptId: paper.attemptId } : {}),
      ...(paper.reason ? { reason: paper.reason } : {}),
    }));
  return {
    kind: "literature_bundle_import",
    status: imported.outcome === "complete" && !warnings.length ? "completed" : "partial",
    importedItems,
    failedItems,
    warnings,
    importResult: imported,
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
        manifest =
          raw?.schema_id === RESEARCH_PRODUCT_SCHEMA
            ? validateResearchProductManifest(raw, archive.entries)
            : raw?.schema_id === LITERATURE_PRODUCT_SCHEMA
              ? validateLiteratureProductManifest(raw, archive.entries)
              : validateLiteratureBundleManifest(raw, archive.entries);
      } catch (error) {
        return literatureBundleValidationFailure(args.host, "manifest", error);
      }
      try {
        if (manifest?.schema_id === RESEARCH_PRODUCT_SCHEMA) {
          await verifyResearchProductFiles(manifest, archive);
        } else if (manifest?.schema_id === LITERATURE_PRODUCT_SCHEMA) {
          await verifyLiteratureProductFiles(manifest, archive);
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
          : manifest?.schema_id === LITERATURE_PRODUCT_SCHEMA
            ? await importLiteratureProductArchive(importArgs)
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
