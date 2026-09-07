import { getBaseName, sanitizeFileNameSegment } from "./path.mjs";
import { RESEARCH_PRODUCT_SCHEMA } from "./researchBundle.mjs";
import {
  workbenchPayloadArtifactName,
  workbenchPayloadText,
  parseWorkbenchEmbeddedPayloadBytes,
} from "./embeddedPayloadAttachments.mjs";
import { exportBundleBibliography } from "./bundleBibliography.mjs";
import { rewriteMarkdownLocalImages } from "./markdownLocalImages.mjs";
import { portableItemRef } from "./runtime.mjs";
import {
  previewLegacyArtifactSetForImport,
  stripLegacyArtifactMarkupForImport,
} from "../import-notes/hooks/applyResult.mjs";
import {
  parseImportedCitationArtifact,
  parseImportedReferencesArtifact,
  parseImportedScoreArtifact,
} from "./importSchemas.mjs";

export { rewriteMarkdownLocalImages };

export const LITERATURE_BUNDLE_KIND = "zotero-agents-literature-bundle";
export const LITERATURE_BUNDLE_SCHEMA_VERSION = 1;
export const LITERATURE_PRODUCT_SCHEMA = "literature_bundle.product";
export const LITERATURE_PRODUCT_SCHEMA_VERSION = "1.0.0";
export const LITERATURE_BUNDLE_SOURCE_ONLY_KIND =
  "zotero-agents-literature-bundle-source-only";
export const LITERATURE_EXPORT_MODES = new Set([
  "selection",
  "collection",
  "library",
]);
const LIST_PAGE_LIMIT = 100;
const LIST_PAGE_GUARD = 10000;

function toManifestFileIntegrity(files) {
  return Object.fromEntries(
    Object.entries(files || {}).map(([path, integrity]) => [
      path,
      { size: integrity?.sizeBytes ?? 0, sha256: integrity?.sha256 || "" },
    ]),
  );
}

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
    const keyMatch = tag.match(
      /\bdata-attachment-key\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i,
    );
    const key = normalizeText(keyMatch?.[1] || keyMatch?.[2] || keyMatch?.[3]);
    if (!key) return tag;
    const ref = attachmentRefs?.get?.(key);
    if (!ref) {
      unresolvedKeys.push(key);
      return "";
    }
    return tag.replace(
      new RegExp(
        `\\s*data-attachment-key\\s*=\\s*(?:"${escapeRegex(key)}"|'${escapeRegex(key)}'|${escapeRegex(key)})`,
        "i",
      ),
      ` data-zb-attachment-ref="${ref}"`,
    );
  });
  return { html: portableHtml, unresolvedKeys };
}

export function restorePortableNoteHtml(html, attachmentKeys) {
  return String(html || "").replace(/<img\b[^>]*>/gi, (tag) => {
    const refMatch = tag.match(
      /\bdata-zb-attachment-ref\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i,
    );
    const ref = normalizeText(refMatch?.[1] || refMatch?.[2] || refMatch?.[3]);
    if (!ref) return tag;
    const key = attachmentKeys?.get?.(ref);
    if (!key) return "";
    return tag.replace(
      new RegExp(
        `\\s*data-zb-attachment-ref\\s*=\\s*(?:"${escapeRegex(ref)}"|'${escapeRegex(ref)}'|${escapeRegex(ref)})`,
        "i",
      ),
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
    if (!itemId || itemIds.has(itemId))
      throw new Error("duplicate or missing bundle item id");
    itemIds.add(itemId);
    if (!normalizeText(item?.itemJson?.itemType))
      throw new Error(`item ${itemId} itemType is missing`);
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
      if (!itemIds.has(normalizeText(relatedId)))
        throw new Error("unresolved related item ref");
    }
  }
}

export function validateLiteratureBundleManifest(value, archiveEntries) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("bundle manifest must be an object");
  if (value.kind !== LITERATURE_BUNDLE_KIND)
    throw new Error("unsupported literature bundle kind");
  if (Number(value.schemaVersion) !== LITERATURE_BUNDLE_SCHEMA_VERSION)
    throw new Error("unsupported literature bundle schema version");
  if (
    !Array.isArray(value.items) ||
    !value.files ||
    typeof value.files !== "object"
  )
    throw new Error("bundle manifest items/files are missing");
  ensureUniqueIds(value);
  const declared = Object.keys(value.files).map(normalizeEntryPath).sort();
  if (new Set(declared).size !== declared.length)
    throw new Error("duplicate declared file path");
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
    if (!declaredSet.has(path))
      throw new Error(`unresolved manifest file ref: ${path}`);
  }
  const actual = (archiveEntries || [])
    .map(normalizeEntryPath)
    .filter((path) => path !== "manifest.json")
    .sort();
  if (JSON.stringify(declared) !== JSON.stringify(actual))
    throw new Error("declared file closure does not match archive entries");
  return value;
}

export async function verifyLiteratureBundleFiles(manifest, archive) {
  if (typeof archive?.measureEntries !== "function") {
    throw new Error("extracted archive integrity measurement is unavailable");
  }
  const measured = await archive.measureEntries(
    Object.keys(manifest.files || {}),
  );
  for (const [path, expected] of Object.entries(manifest.files || {})) {
    const actual = measured?.files?.[path];
    if (
      actual?.sizeBytes !== expected.size ||
      actual?.sha256 !== expected.sha256
    ) {
      throw new Error(`bundle file integrity mismatch: ${path}`);
    }
  }
}

export function validateResearchProductManifest(value, archiveEntries) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("research product manifest must be an object");
  }
  if (
    value.schema_id !== RESEARCH_PRODUCT_SCHEMA ||
    String(value.schema_version) !== "2.0.0"
  ) {
    throw new Error("unsupported research product schema");
  }
  if (
    !Array.isArray(value.papers) ||
    !value.files ||
    typeof value.files !== "object"
  ) {
    throw new Error("research product papers/files are missing");
  }
  const declared = Object.keys(value.files).map(normalizeEntryPath).sort();
  if (new Set(declared).size !== declared.length)
    throw new Error("duplicate declared file path");
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
  const declaredSet = new Set(declared);
  const referenced = ["README.md", "index.md"];
  if (value.bibliography?.path) referenced.push(value.bibliography.path);
  for (const topic of value.topics || [])
    if (topic?.report_path) referenced.push(topic.report_path);
  for (const paper of value.papers) {
    if (!paper?.metadata_path)
      throw new Error("research product paper metadata is missing");
    referenced.push(paper.metadata_path);
    if (paper.source?.path) referenced.push(paper.source.path);
    for (const asset of paper.source?.assets || [])
      if (asset?.path) referenced.push(asset.path);
    for (const payload of paper.payloads || []) {
      if (
        !workbenchPayloadArtifactName(payload?.payload_type)
      ) {
        throw new Error("unsupported research product payload type");
      }
      if (payload?.path) referenced.push(payload.path);
    }
  }
  for (const path of referenced.map(normalizeEntryPath)) {
    if (!declaredSet.has(path))
      throw new Error(`unresolved research product file ref: ${path}`);
  }
  const actual = (archiveEntries || [])
    .map(normalizeEntryPath)
    .filter((path) => path !== "manifest.json")
    .sort();
  if (JSON.stringify(declared) !== JSON.stringify(actual))
    throw new Error(
      "research product file closure does not match archive entries",
    );
  return value;
}

export async function verifyResearchProductFiles(manifest, archive) {
  if (typeof archive?.measureEntries !== "function")
    throw new Error("extracted archive integrity measurement is unavailable");
  const measured = await archive.measureEntries(
    Object.keys(manifest.files || {}),
  );
  for (const [path, expected] of Object.entries(manifest.files || {})) {
    const actual = measured?.files?.[path];
    if (
      actual?.sizeBytes !== expected.size ||
      actual?.sha256 !== expected.sha256
    ) {
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
          throw new Error(
            "literature product attachment asset ownership mismatch",
          );
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
        throw new Error(
          "unresolved literature product primary source attachment",
        );
      }
      if (
        normalizeEntryPath(paper.primary_source.path) !==
        normalizeEntryPath(attachment.path)
      ) {
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
      if (
        !noteImages.has(noteId) ||
        (payload?.source_image_id !== null && !noteImages.get(noteId).has(imageId))
      ) {
        throw new Error("unresolved literature product payload source");
      }
      if (
        !payload?.path ||
        !["markdown", "json", "text"].includes(
          normalizeText(payload?.format),
        ) ||
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
  if (
    !Array.isArray(value.papers) ||
    !value.files ||
    typeof value.files !== "object"
  ) {
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
    throw new Error(
      "literature product file closure does not match archive entries",
    );
  }
  return value;
}

export async function verifyLiteratureProductFiles(manifest, archive) {
  if (typeof archive?.measureEntries !== "function") {
    throw new Error("extracted archive integrity measurement is unavailable");
  }
  const measured = await archive.measureEntries(
    Object.keys(manifest.files || {}),
  );
  for (const [path, expected] of Object.entries(manifest.files || {})) {
    const actual = measured?.files?.[path];
    if (
      actual?.sizeBytes !== expected.size ||
      actual?.sha256 !== expected.sha256
    ) {
      throw new Error(`literature product file integrity mismatch: ${path}`);
    }
  }
}

const MANAGED_ARTIFACT_PAYLOAD_TYPES = {
  custom: "custom-markdown",
  "conversation-note": "conversation-note-markdown",
  digest: "digest-markdown",
  references: "references-json",
  "citation-analysis": "citation-analysis-json",
  "literature-score": "literature-score-json",
};

function managedArtifactPayloadBlock(note) {
  const artifact = note?.managedArtifact;
  const payloadType = MANAGED_ARTIFACT_PAYLOAD_TYPES[artifact?.noteKind];
  if (!payloadType || artifact?.payload === undefined) return null;
  return {
    summary: canonicalBundlePayloadSummary(payloadType, artifact.payload),
    value: artifact.payload,
  };
}

export async function buildLiteratureBundleExport(args) {
  const { host, parents } = args;
  const materialized = await host.researchBundles.materializePapers({
    paperRefs: parents.map(portableItemRef),
    missingFilePolicy: "record_missing",
  });
  const warnings = [...(materialized.issues || [])];
  const payloadEntries = [];
  const itemRecords = [];
  const itemIdByRef = new Map(
    materialized.papers.map((paper, index) => [
      `${paper.source.ref.libraryId}:${paper.source.ref.key}`,
      `i${index + 1}`,
    ]),
  );

  for (const paper of materialized.papers) {
    const itemId = itemIdByRef.get(
      `${paper.source.ref.libraryId}:${paper.source.ref.key}`,
    );
    const attachmentRecords = [];
    const noteRecords = [];
    for (let index = 0; index < paper.attachments.length; index += 1) {
      const attachment = paper.attachments[index];
      const id = `a${index + 1}`;
      const metadata = attachment.metadata;
      if (attachment.file.state === "not_applicable" && metadata.url) {
        attachmentRecords.push({ id, kind: "url", metadata });
        continue;
      }
      if (attachment.file.state !== "available") {
        warnings.push({ code: "attachment_file_missing", itemId, childId: id });
        attachmentRecords.push({
          id,
          kind: "skipped",
          metadata,
          warningCode: "attachment_file_missing",
        });
        continue;
      }
      const resourcePath = (
        await host.resources.get(attachment.file.resourceRef)
      ).path;
      const metadataSourcePath =
        metadata.file?.state === "available" ? metadata.file.path : "";
      const sourcePath =
        metadataSourcePath && (await host.file.exists(metadataSourcePath))
          ? metadataSourcePath
          : resourcePath;
      const baseName = sanitizeFileNameSegment(
        getBaseName(sourcePath) || `${id}.bin`,
      );
      const basePath = `items/${itemId}/attachments/${id}`;
      const isMarkdown =
        /(?:markdown|text\/plain)/i.test(metadata.contentType) ||
        /\.md$/i.test(baseName);
      if (isMarkdown) {
        const original = await host.file.readText(resourcePath);
        const rewritten = await rewriteMarkdownLocalImages({
          markdown: original,
          sourcePath,
          resolveLocalPath: async (candidate) =>
            (await host.file.exists(candidate)) ? candidate : null,
        });
        warnings.push(
          ...rewritten.warnings.map((warning) => ({
            ...warning,
            itemId,
            childId: id,
          })),
        );
        const path = `${basePath}/${baseName}`;
        payloadEntries.push({
          name: path,
          content: { kind: "text", text: rewritten.markdown },
        });
        const assets = rewritten.assets.map((asset) => {
          const assetPath = `${basePath}/${asset.relativePath}`;
          payloadEntries.push({
            name: assetPath,
            content: { kind: "file", sourcePath: asset.sourcePath },
          });
          return {
            id: asset.id,
            path: assetPath,
            relativePath: asset.relativePath,
          };
        });
        attachmentRecords.push({
          id,
          kind: "markdown",
          metadata,
          path,
          assets,
        });
      } else {
        const path = `${basePath}/${baseName}`;
        payloadEntries.push({
          name: path,
          content: { kind: "file", sourcePath },
        });
        attachmentRecords.push({ id, kind: "file", metadata, path });
      }
    }

    for (let index = 0; index < paper.notes.length; index += 1) {
      const note = paper.notes[index];
      const id = `n${index + 1}`;
      const imageRecords = [];
      const imageIdBySlot = new Map();
      let portableHtml = note.content.value;
      for (
        let imageIndex = 0;
        imageIndex < note.content.embeddedImages.length;
        imageIndex += 1
      ) {
        const image = note.content.embeddedImages[imageIndex];
        const imageId = `e${imageIndex + 1}`;
        const resource = await host.resources.get(image.resourceRef);
        const path = `items/${itemId}/notes/${id}/images/${imageId}/${sanitizeFileNameSegment(resource.displayName || `${imageId}.bin`)}`;
        const sourcePath = resource.path;
        payloadEntries.push({
          name: path,
          content: { kind: "file", sourcePath },
        });
        portableHtml = portableHtml.replace(
          new RegExp(
            `data-zotero-agents-image-slot=(["'])${escapeRegex(image.slot)}\\1`,
            "i",
          ),
          `data-zb-attachment-ref="${imageId}"`,
        );
        imageIdBySlot.set(image.slot, imageId);
        imageRecords.push({
          id: imageId,
          path,
          metadata: { title: image.altText, contentType: image.mimeType },
        });
      }
      const portable = makePortableNoteHtml(portableHtml, new Map());
      portableHtml = portable.html;
      warnings.push(
        ...portable.unresolvedKeys.map(() => ({
          code: "note_image_missing",
          itemId,
          childId: id,
        })),
      );
      const htmlPath = `items/${itemId}/notes/${id}/note.html`;
      payloadEntries.push({
        name: htmlPath,
        content: { kind: "text", text: portableHtml },
      });
      const payloadBlocks = [...(note.payloads || [])];
      const managedBlock = managedArtifactPayloadBlock(note);
      if (
        managedBlock &&
        !payloadBlocks.some(
          (block) =>
            block.summary?.payloadType === managedBlock.summary.payloadType,
        )
      ) {
        payloadBlocks.push(managedBlock);
      }
      const payloads = payloadBlocks.map((block) => {
        const source = block.summary.source;
        const sourceSlot =
          source.kind === "embedded_attachment"
            ? `${source.attachmentRef.libraryId}:${source.attachmentRef.key}`
            : "";
        return {
          ...block,
          sourceImageId: imageIdBySlot.get(sourceSlot) || null,
        };
      });
      const payloadImageIds = new Set(
        payloads.map((block) => block.sourceImageId).filter(Boolean),
      );
      noteRecords.push({
        id,
        htmlPath,
        tags: note.tags,
        ...(note.managedArtifact ? { managedArtifact: note.managedArtifact } : {}),
        images: imageRecords.map((image) => ({
          ...image,
          ...(payloadImageIds.has(image.id)
            ? { preserveSourceBytes: true }
            : {}),
        })),
        payloads,
      });
    }

    const relatedItemIds = paper.relatedRefs
      .map((ref) => itemIdByRef.get(`${ref.libraryId}:${ref.key}`))
      .filter(Boolean);
    itemRecords.push({
      id: itemId,
      itemJson: {
        itemType: paper.item.itemType,
        ...paper.item.fields,
        creators: paper.item.creators,
        tags: paper.item.tags,
      },
      relatedItemIds,
      attachments: attachmentRecords,
      notes: noteRecords,
    });
  }

  const measured = await host.archive.measureEntries({
    entries: payloadEntries,
  });
  const manifest = {
    kind: LITERATURE_BUNDLE_KIND,
    schemaVersion: LITERATURE_BUNDLE_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    source: {
      zoteroVersion: normalizeText(host.environment.getInfo().zoteroVersion),
      addonVersion: normalizeText(host.addon?.getConfig?.()?.addonVersion),
    },
    warnings,
    items: itemRecords,
    files: toManifestFileIntegrity(measured.files),
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
  for (const entry of snapshot.entries) {
    const itemId = /^items\/([^/]+)\//.exec(entry.name)?.[1];
    const logicalId = paperIdByItemId.get(itemId);
    if (!logicalId)
      throw new Error(
        `unresolved literature snapshot entry owner: ${entry.name}`,
      );
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
    const notes = (item.notes || []).map(
      ({ payloads: _payloads, managedArtifact: _managedArtifact, ...note }) => ({
        ...note,
        htmlPath: remapPath(note.htmlPath),
        images: (note.images || []).map((image) => ({
          ...image,
          path: remapPath(image.path),
        })),
      }),
    );
    const metadataPath = `papers/${logicalId}/metadata.json`;
    entries.push({
      name: metadataPath,
      content: {
        kind: "text",
        text: `${JSON.stringify(item.itemJson, null, 2)}\n`,
      },
    });

    const payloads = [];
    const payloadOrdinals = new Map();
    for (let noteIndex = 0; noteIndex < notes.length; noteIndex += 1) {
      const noteRecord = notes[noteIndex];
      const sourceNote = item.notes[noteIndex];
      const notePayloadBlocks = [...(sourceNote.payloads || [])];
      const managedBlock = managedArtifactPayloadBlock(sourceNote);
      if (
        managedBlock &&
        !notePayloadBlocks.some(
          (block) =>
            block.summary?.payloadType === managedBlock.summary.payloadType,
        )
      ) {
        notePayloadBlocks.push(managedBlock);
      }
      for (const block of notePayloadBlocks) {
        const payloadType = block.summary.payloadType;
        const artifactName = workbenchPayloadArtifactName(payloadType);
        if (!artifactName) continue;
        const ordinal = (payloadOrdinals.get(payloadType) || 0) + 1;
        payloadOrdinals.set(payloadType, ordinal);
        const extension = block.summary.format === "json" ? "json" : "md";
        const managed = sourceNote.managedArtifact;
        const semanticPayload = managed?.payload;
        const projection = managed && managed.noteKind === block.summary.noteKind
          ? typeof semanticPayload?.markdown === "string"
            ? semanticPayload.markdown
            : `${JSON.stringify(semanticPayload, null, 2)}\n`
          : workbenchPayloadText({ format: block.summary.format, payload: block.value, markdown: typeof block.value === "string" ? block.value : "" });
        const path = `papers/${logicalId}/payloads/${artifactName}-${String(ordinal).padStart(3, "0")}.${extension}`;
        entries.push({
          name: path,
          content: {
            kind: "text",
            text: projection,
          },
        });
        payloads.push({
          id: `p${payloads.length + 1}`,
          payload_type: payloadType,
          note_kind: block.summary.noteKind,
          format: block.summary.format,
          path,
          source_note_id: noteRecord.id,
          source_image_id: block.sourceImageId || null,
          payload_hash: "",
          anchor_status: block.sourceImageId
            ? block.summary.state === "stale"
              ? "stale"
              : block.summary.state === "available"
                ? "present"
                : "missing"
            : "present",
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
      title: normalizeText(parent.title || item.itemJson?.title),
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
    itemRefs: parents.map(portableItemRef),
    warnings,
  });
  const bibliography = bibliographyExport.bibliography;
  if (bibliography.status === "generated") {
    entries.push({
      name: "references.bib",
      content: { kind: "text", text: bibliographyExport.content },
    });
  }
  entries.push({
    name: "index.md",
    content: { kind: "text", text: renderLiteratureProductIndex(papers) },
  });
  entries.push({
    name: "README.md",
    content: { kind: "text", text: renderLiteratureProductReadme() },
  });
  const measured = await host.archive.measureEntries({ entries });
  const manifest = {
    schema_id: LITERATURE_PRODUCT_SCHEMA,
    schema_version: LITERATURE_PRODUCT_SCHEMA_VERSION,
    created_at: new Date().toISOString(),
    source: {
      zotero_version: normalizeText(host.environment.getInfo().zoteroVersion),
      addon_version: normalizeText(host.addon?.getConfig?.()?.addonVersion),
    },
    bibliography,
    papers,
    files: toManifestFileIntegrity(measured.files),
    warnings,
  };
  return { manifest, entries, warnings };
}

export async function buildLiteratureBundleSourceOnlyExport(args) {
  const { host, parents } = args;
  const materialized = await host.researchBundles.materializePapers({
    paperRefs: parents.map(portableItemRef),
    missingFilePolicy: "record_missing",
  });
  const warnings = [...(materialized.issues || [])];
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
    const paper = materialized.papers[index];
    const bundleLocalId = `i${index + 1}`;
    const rawTitle = normalizeText(parent.title || paper?.item?.fields?.title);
    const titleBase = rawTitle
      ? sanitizeFileNameSegment(rawTitle)
      : bundleLocalId;
    let chosenAttachment = null;
    for (const attachment of paper?.attachments || []) {
      if (attachment.file.state !== "available") continue;
      const metadata = attachment.metadata;
      const sourcePath = (await host.resources.get(attachment.file.resourceRef))
        .path;
      const baseName = getBaseName(sourcePath);
      const isMarkdown =
        /(?:markdown|text\/plain)/i.test(metadata.contentType) ||
        /\.md$/i.test(baseName);
      if (isMarkdown) {
        chosenAttachment = { sourcePath, isMarkdown: true };
        break;
      }
      const isPdf =
        /application\/pdf/i.test(metadata.contentType) ||
        /\.pdf$/i.test(baseName);
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
      payloadEntries.push({ name: entryPath, content: { kind: "text", text } });
    } else {
      payloadEntries.push({
        name: entryPath,
        content: { kind: "file", sourcePath: chosenAttachment.sourcePath },
      });
    }
    itemRecords.push({ id: bundleLocalId, path: entryPath });
  }

  const measured = await host.archive.measureEntries({
    entries: payloadEntries,
  });
  const manifest = {
    kind: LITERATURE_BUNDLE_SOURCE_ONLY_KIND,
    createdAt: new Date().toISOString(),
    source: {
      zoteroVersion: normalizeText(host.environment.getInfo().zoteroVersion),
      addonVersion: normalizeText(host.addon?.getConfig?.()?.addonVersion),
    },
    warnings,
    items: itemRecords,
    files: toManifestFileIntegrity(measured.files),
  };
  return { manifest, entries: payloadEntries, warnings };
}

function parentRefsFromSelection(selection) {
  const seen = new Set();
  const refs = [];
  for (const item of Array.isArray(selection?.items) ? selection.items : []) {
    if (item?.kind !== "parent" || !item.ref) continue;
    try {
      const ref = portableItemRef(item.ref);
      const identity = `${ref.libraryId}:${ref.key}`;
      if (!seen.has(identity)) {
        seen.add(identity);
        refs.push(ref);
      }
    } catch {
      // The planner has already validated refs; skip malformed debug input.
    }
  }
  return refs;
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
  return item?.kind === "regular" && item.parentRef === null;
}

async function listTopLevelRegularParents(host, args) {
  const byRef = new Map();
  let cursor;
  for (let pageIndex = 0; pageIndex < LIST_PAGE_GUARD; pageIndex += 1) {
    const input = { libraryId: args.libraryId, limit: LIST_PAGE_LIMIT };
    if (args.collectionKey) {
      input.collectionRef = {
        libraryId: args.libraryId,
        key: args.collectionKey,
      };
    }
    if (cursor !== undefined) input.cursor = cursor;
    const page = await host.library.listItems(input);
    for (const summary of page.items) {
      if (!isTopLevelRegularSummary(summary)) continue;
      const paperRef = `${summary.ref.libraryId}:${summary.ref.key}`;
      if (byRef.has(paperRef)) continue;
      const detail = await host.library.getItemDetail(summary.ref);
      if (detail.kind === "regular") byRef.set(paperRef, detail.item);
    }
    if (page?.hasMore !== true) {
      return [...byRef.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([, item]) => item);
    }
    const nextCursor = normalizeText(page?.nextCursor);
    if (!nextCursor || nextCursor === cursor) {
      throw exportValidationError(
        "invalid_pagination",
        "Literature export received hasMore without a new cursor",
      );
    }
    cursor = nextCursor;
  }
  throw exportValidationError(
    "pagination_guard_exceeded",
    "Literature export exceeded the library pagination guard",
  );
}

export async function resolveLiteratureBundleParents(args) {
  const host = args.host;
  const mode = normalizeText(args.mode) || "selection";
  if (!LITERATURE_EXPORT_MODES.has(mode)) {
    throw exportValidationError(
      "invalid_export_mode",
      `Unsupported literature export mode: ${mode}`,
    );
  }
  if (mode === "selection") {
    const seen = new Set();
    const parents = [];
    for (const itemRef of parentRefsFromSelection(args.selectionContext)) {
      const detail = await host.library.getItemDetail(itemRef);
      const ref = `${itemRef.libraryId}:${itemRef.key}`;
      if (detail.kind === "regular" && !seen.has(ref)) {
        seen.add(ref);
        parents.push(detail.item);
      }
    }
    if (!parents.length) {
      throw exportValidationError(
        "selection_required",
        "Selection mode requires at least one top-level regular Zotero item",
      );
    }
    return parents;
  }
  if (mode === "collection") {
    const target = normalizeText(args.targetCollection);
    const match = /^([1-9][0-9]*):([A-Za-z0-9]+)$/.exec(target);
    if (!match) {
      throw exportValidationError(
        "target_collection_required",
        "Collection mode requires targetCollection as libraryId:collectionKey",
      );
    }
    const parents = await listTopLevelRegularParents(host, {
      libraryId: Number(match[1]),
      collectionKey: match[2],
    });
    if (!parents.length) {
      throw exportValidationError(
        "collection_empty",
        "The target collection has no top-level regular items",
      );
    }
    return parents;
  }
  const view = host.context.getCurrentView() || {};
  const libraryId = Number(view.libraryId ?? view.libraryID ?? 0);
  if (!libraryId) {
    throw exportValidationError(
      "library_unavailable",
      "The current Zotero library is unavailable",
    );
  }
  const parents = await listTopLevelRegularParents(host, { libraryId });
  if (!parents.length) {
    throw exportValidationError(
      "library_empty",
      "The current library has no top-level regular items",
    );
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
  const remoteOutput = args.host.interactionMode === "non_interactive";
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
        filters: [{ label: "Literature bundle", extensions: ["zip"] }],
        suggestedName: "literature-bundle.zip",
      });
  if (!selectedTargetPath) {
    return {
      kind: "literature_bundle_export",
      status: "canceled",
      itemCount: 0,
      attachmentCount: 0,
      noteCount: 0,
      warnings: [],
    };
  }
  const targetPath = remoteOutput
    ? selectedTargetPath
    : /\.zip$/i.test(selectedTargetPath)
      ? selectedTargetPath
      : `${selectedTargetPath}.zip`;
  if (args.sourceOnly) {
    const built = await buildLiteratureBundleSourceOnlyExport({
      host: args.host,
      parents,
    });
    await args.host.archive.writeZipAtomic({
      targetPath,
      entries: [
        {
          name: "manifest.json",
          content: {
            kind: "text",
            text: JSON.stringify(built.manifest, null, 2),
          },
        },
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
      {
        name: "manifest.json",
        content: {
          kind: "text",
          text: JSON.stringify(built.manifest, null, 2),
        },
      },
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

const LEGACY_BUNDLE_PAYLOAD_TYPES = new Set([
  "references-json",
  "citation-analysis-json",
]);
const CANONICAL_BUNDLE_PAYLOAD_TYPES = new Set(
  Object.values(MANAGED_ARTIFACT_PAYLOAD_TYPES),
);

function archiveSourcePath(archive, path) {
  return typeof archive?.resolvePath === "function"
    ? archive.resolvePath(path)
    : path;
}

function bundlePayloadType(value) {
  const row = value && typeof value === "object" ? value : null;
  const summary = row?.summary && typeof row.summary === "object"
    ? row.summary
    : row;
  return normalizeText(
    summary?.payloadType || row?.payload_type || row?.payloadType,
  );
}

function bundlePayloadValue(value) {
  const row = value && typeof value === "object" ? value : null;
  if (row && Object.prototype.hasOwnProperty.call(row, "value")) {
    return { found: true, value: row.value };
  }
  if (row && Object.prototype.hasOwnProperty.call(row, "payload")) {
    return { found: true, value: row.payload };
  }
  return { found: false, value: undefined };
}

function bundlePayloadStorageVersion(value) {
  const row = value && typeof value === "object" ? value : null;
  const summary = row?.summary && typeof row.summary === "object"
    ? row.summary
    : row;
  return Number(
    row?.payloadStorageVersion ||
      row?.payload_storage_version ||
      summary?.payloadStorageVersion ||
      summary?.payload_storage_version ||
      0,
  );
}

function bundlePayloadFormat(value, payloadType) {
  const row = value && typeof value === "object" ? value : null;
  const summary = row?.summary && typeof row.summary === "object"
    ? row.summary
    : row;
  return summary?.format === "markdown" || payloadType.endsWith("-markdown")
    ? "markdown"
    : "json";
}

function extractBundlePayloadMarkers(html) {
  const inlineEntries = [];
  const canonicalInlineTypes = new Set();
  const anchorTypes = new Map();
  const canonicalAnchorTypes = new Map();
  const source = String(html || "");
  const inlinePattern =
    /<span\b[^>]*data-zs-payload\s*=\s*(["']?)([^\s"'>]+)\1[^>]*>/giu;
  for (const match of source.matchAll(inlinePattern)) {
    const payloadType = normalizeText(match[2]);
    if (CANONICAL_BUNDLE_PAYLOAD_TYPES.has(payloadType)) {
      canonicalInlineTypes.add(payloadType);
    }
    if (LEGACY_BUNDLE_PAYLOAD_TYPES.has(payloadType)) {
      inlineEntries.push({ payloadType, tag: match[0] });
    }
  }
  const anchorPattern =
    /<img\b[^>]*data-zs-payload-anchor\s*=\s*(["']?)([^\s"'>]+)\1[^>]*>/giu;
  for (const match of source.matchAll(anchorPattern)) {
    const payloadType = normalizeText(match[2]);
    const tag = match[0];
    const keyMatch = tag.match(
      /\bdata-attachment-key\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/iu,
    );
    const attachmentKey = normalizeText(
      keyMatch?.[1] || keyMatch?.[2] || keyMatch?.[3],
    );
    if (CANONICAL_BUNDLE_PAYLOAD_TYPES.has(payloadType)) {
      canonicalAnchorTypes.set(payloadType, attachmentKey);
    }
    if (LEGACY_BUNDLE_PAYLOAD_TYPES.has(payloadType)) {
      anchorTypes.set(payloadType, attachmentKey);
    }
  }
  return {
    inlineEntries,
    canonicalInlineTypes,
    anchorTypes,
    canonicalAnchorTypes,
  };
}

function isCanonicalBundlePayload(payloadType, value) {
  try {
    if (
      payloadType === "custom-markdown" ||
      payloadType === "digest-markdown"
    ) {
      return typeof value === "string" && Boolean(value.trim());
    }
    if (payloadType === "conversation-note-markdown") {
      if (typeof value === "string") return Boolean(value.trim());
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return false;
      }
      const keys = Object.keys(value).sort();
      return (
        keys.length === 4 &&
        keys[0] === "content" &&
        keys[1] === "format" &&
        keys[2] === "path" &&
        keys[3] === "version" &&
        value.version === 1 &&
        value.format === "markdown" &&
        typeof value.path === "string" &&
        Boolean(value.path.trim()) &&
        typeof value.content === "string" &&
        Boolean(value.content.trim())
      );
    }
    if (payloadType === "references-json") {
      parseImportedReferencesArtifact(value);
      return true;
    }
    if (payloadType === "citation-analysis-json") {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return false;
      }
      const { referencesBasis: _referencesBasis, ...canonical } = value;
      if (
        _referencesBasis !== undefined &&
        typeof _referencesBasis !== "string"
      ) {
        return false;
      }
      parseImportedCitationArtifact(canonical);
      return true;
    }
    if (payloadType === "literature-score-json") {
      parseImportedScoreArtifact(value);
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

function canonicalBundlePayloadSummary(payloadType, value) {
  const noteKindByPayloadType = {
    "custom-markdown": "custom",
    "conversation-note-markdown": "conversation-note",
    "digest-markdown": "digest",
    "references-json": "references",
    "citation-analysis-json": "citation-analysis",
    "literature-score-json": "literature-score",
  };
  const format = payloadType.endsWith("-markdown") ? "markdown" : "json";
  const content =
    format === "markdown"
      ? typeof value === "string"
        ? value
        : typeof value?.content === "string"
          ? value.content
          : typeof value?.markdown === "string"
            ? value.markdown
            : String(value || "")
      : String(JSON.stringify(value) || "");
  return {
    payloadType,
    noteKind: noteKindByPayloadType[payloadType] || "custom",
    version: "1",
    format,
    encoding: "utf-8",
    estimatedBytes: new TextEncoder().encode(content).byteLength,
    source: { kind: "inline" },
    state: "available",
    issues: [],
  };
}

function decodeBundlePayloadText(text, payloadType, block) {
  if (bundlePayloadFormat(block, payloadType) === "markdown") {
    return String(text || "");
  }
  return JSON.parse(String(text || "null"));
}

async function readBundlePayloadBlock(archive, block) {
  const payloadType = bundlePayloadType(block);
  if (!payloadType) return null;
  const sourceImageId = normalizeText(
    block?.sourceImageId || block?.source_image_id,
  );
  const direct = bundlePayloadValue(block);
  if (direct.found) {
    return {
      payloadType,
      value: direct.value,
      storageVersion: bundlePayloadStorageVersion(block),
      ...(sourceImageId ? { sourceImageId } : {}),
    };
  }
  const path = normalizeText(block?.path);
  if (!path || typeof archive?.readText !== "function") {
    return { payloadType, error: "legacy payload value is missing" };
  }
  try {
    const text = await archive.readText(path);
    return {
      payloadType,
      value: decodeBundlePayloadText(text, payloadType, block),
      storageVersion: bundlePayloadStorageVersion(block),
      ...(sourceImageId ? { sourceImageId } : {}),
    };
  } catch (error) {
    return {
      payloadType,
      error: normalizeText(error?.message || error) || "legacy payload cannot be read",
      storageVersion: bundlePayloadStorageVersion(block),
      ...(sourceImageId ? { sourceImageId } : {}),
    };
  }
}

function unwrapEmbeddedBundlePayload(value) {
  const row = value && typeof value === "object" ? value : null;
  if (
    row &&
    (row.format === "json" || row.format === "markdown") &&
    Object.prototype.hasOwnProperty.call(row, "payload")
  ) {
    return row.payload;
  }
  return value;
}

async function readBundleNoteFacts({ archive, noteRecord, runtime }) {
  const readErrors = [];
  let html = "";
  try {
    html = await archive.readText(noteRecord.htmlPath);
  } catch (error) {
    readErrors.push(
      normalizeText(error?.message || error) ||
        `note HTML cannot be read: ${noteRecord.id}`,
    );
  }
  const markers = extractBundlePayloadMarkers(html);
  const noteImageIds = new Set(
    (noteRecord.images || []).map((imageRecord) => normalizeText(imageRecord.id)),
  );
  const payloadImageIds = new Set();
  for (const imageRecord of noteRecord.images || []) {
    const imageId = normalizeText(imageRecord.id);
    for (const attachmentKey of markers.anchorTypes.values()) {
      if (attachmentKey && attachmentKey === imageId) {
        payloadImageIds.add(imageId);
      }
    }
  }
  const filePayloads = [];
  const canonicalPayloads = [];
  const blockPayloads = [];
  for (const block of noteRecord.payloads || []) {
    const payload = await readBundlePayloadBlock(archive, block);
    if (payload) blockPayloads.push(payload);
  }
  const legacyPayloadTypes = new Set();
  for (const payload of blockPayloads) {
    if (!CANONICAL_BUNDLE_PAYLOAD_TYPES.has(payload.payloadType)) continue;
    if (payload.error) {
      if (LEGACY_BUNDLE_PAYLOAD_TYPES.has(payload.payloadType)) {
        legacyPayloadTypes.add(payload.payloadType);
      }
      readErrors.push("payload_read_failed");
      continue;
    }
    const canonical = isCanonicalBundlePayload(
      payload.payloadType,
      payload.value,
    );
    if (payload.storageVersion === 1 || !canonical) {
      if (LEGACY_BUNDLE_PAYLOAD_TYPES.has(payload.payloadType)) {
        legacyPayloadTypes.add(payload.payloadType);
        filePayloads.push({
          payloadType: payload.payloadType,
          value: payload.value,
          ...(payload.storageVersion
            ? { payloadStorageVersion: payload.storageVersion }
            : {}),
        });
      } else {
        readErrors.push(
          payload.storageVersion === 1
            ? "legacy_artifact_requires_migration"
            : "invalid_artifact",
        );
      }
      continue;
    }
    const sourceImageId = normalizeText(payload.sourceImageId);
    const anchorImageId = normalizeText(
      markers.canonicalAnchorTypes.get(payload.payloadType),
    );
    const hasSourceImage =
      Boolean(sourceImageId && noteImageIds.has(sourceImageId)) ||
      Boolean(anchorImageId && noteImageIds.has(anchorImageId));
    if (
      !markers.canonicalInlineTypes.has(payload.payloadType) &&
      !hasSourceImage
    ) {
      readErrors.push("canonical_payload_source_missing");
      continue;
    }
    canonicalPayloads.push({
      summary: canonicalBundlePayloadSummary(
        payload.payloadType,
        payload.value,
      ),
      value: payload.value,
      ...(sourceImageId ? { sourceImageId } : {}),
    });
  }
  const canonicalPayloadTypes = new Set(
    canonicalPayloads.map((payload) => payload.summary.payloadType),
  );
  for (const inlineEntry of markers.inlineEntries) {
    if (canonicalPayloadTypes.has(inlineEntry.payloadType)) continue;
    // The private converter is the only owner allowed to decode legacy HTML.
    // Keeping the raw note content here also preserves its evidence order and
    // lets malformed values fail closed in that seam.
    legacyPayloadTypes.add(inlineEntry.payloadType);
  }
  const decoderRuntime = {
    ...(runtime?.TextDecoder ? { TextDecoder: runtime.TextDecoder } : {}),
    ...(runtime?.Buffer ? { Buffer: runtime.Buffer } : {}),
  };
  for (const imageRecord of noteRecord.images || []) {
    const imageId = normalizeText(imageRecord.id);
    const markerPayloadType = [...markers.canonicalAnchorTypes.entries()].find(
      ([, attachmentKey]) => attachmentKey && attachmentKey === imageId,
    )?.[0];
    if (!markerPayloadType && !imageRecord.preserveSourceBytes) continue;
    if (typeof archive?.readBytes !== "function") {
      if (markerPayloadType) {
        if (LEGACY_BUNDLE_PAYLOAD_TYPES.has(markerPayloadType)) {
          legacyPayloadTypes.add(markerPayloadType);
          readErrors.push(`legacy payload image cannot be read: ${imageId}`);
        } else {
          readErrors.push("canonical_payload_source_unreadable");
        }
      }
      continue;
    }
    try {
      const parsed = parseWorkbenchEmbeddedPayloadBytes(
        await archive.readBytes(archiveSourcePath(archive, imageRecord.path)),
        decoderRuntime,
      );
      if (!parsed || !CANONICAL_BUNDLE_PAYLOAD_TYPES.has(parsed.payloadType)) {
        if (markerPayloadType) {
          if (LEGACY_BUNDLE_PAYLOAD_TYPES.has(markerPayloadType)) {
            legacyPayloadTypes.add(markerPayloadType);
            readErrors.push(`legacy payload image is unreadable: ${imageId}`);
          } else {
            readErrors.push("canonical_payload_source_unreadable");
          }
        }
        continue;
      }
      if (
        parsed.payloadStorageVersion === 1 ||
        parsed.sourceStorage === "embedded-image-attachment-v1"
      ) {
        if (LEGACY_BUNDLE_PAYLOAD_TYPES.has(parsed.payloadType)) {
          legacyPayloadTypes.add(parsed.payloadType);
          filePayloads.push({
            payloadType: parsed.payloadType,
            value: unwrapEmbeddedBundlePayload(parsed.payload),
            payloadStorageVersion: 1,
          });
        } else {
          readErrors.push("legacy_artifact_requires_migration");
        }
      } else {
        const value = unwrapEmbeddedBundlePayload(parsed.payload);
        if (!isCanonicalBundlePayload(parsed.payloadType, value)) {
          readErrors.push("invalid_artifact");
          continue;
        }
        canonicalPayloads.push({
          summary: canonicalBundlePayloadSummary(parsed.payloadType, value),
          value,
          sourceImageId: imageId,
        });
      }
    } catch (error) {
      if (markerPayloadType) {
        if (LEGACY_BUNDLE_PAYLOAD_TYPES.has(markerPayloadType)) {
          legacyPayloadTypes.add(markerPayloadType);
          readErrors.push(
            normalizeText(error?.message || error) ||
              `legacy payload image is damaged: ${imageId}`,
          );
        } else {
          readErrors.push("canonical_payload_source_unreadable");
        }
      }
    }
  }
  const uniqueCanonicalPayloads = [];
  for (const payload of canonicalPayloads) {
    if (
      uniqueCanonicalPayloads.some(
        (candidate) =>
          candidate.summary.payloadType === payload.summary.payloadType &&
          JSON.stringify(candidate.value) === JSON.stringify(payload.value),
      )
    ) {
      continue;
    }
    uniqueCanonicalPayloads.push(payload);
  }
  for (const payloadType of markers.canonicalInlineTypes) {
    if (
      !LEGACY_BUNDLE_PAYLOAD_TYPES.has(payloadType) &&
      !uniqueCanonicalPayloads.some(
        (payload) => payload.summary.payloadType === payloadType,
      )
    ) {
      readErrors.push("canonical_payload_source_missing");
    }
  }
  for (const [payloadType, attachmentKey] of markers.canonicalAnchorTypes) {
    if (attachmentKey && !noteImageIds.has(attachmentKey)) {
      readErrors.push("canonical_payload_source_missing");
    }
    if (
      !attachmentKey &&
      !uniqueCanonicalPayloads.some(
        (payload) => payload.summary.payloadType === payloadType,
      )
    ) {
      readErrors.push("canonical_payload_source_missing");
    }
  }
  return {
    noteId: normalizeText(noteRecord.id),
    html,
    noteRecord,
    legacyPayloadTypes,
    payloadImageIds,
    filePayloads,
    canonicalPayloads: uniqueCanonicalPayloads,
    readErrors,
    legacy: legacyPayloadTypes.size > 0 || readErrors.length > 0,
  };
}

async function readBundleItemNoteFacts({ archive, itemRecord, runtime }) {
  const facts = [];
  for (const noteRecord of itemRecord.notes || []) {
    facts.push(await readBundleNoteFacts({ archive, noteRecord, runtime }));
  }
  return facts;
}

function bundleMigrationError(reason, details = {}) {
  const error = new Error(
    `Legacy literature bundle artifacts require explicit conversion: ${reason}`,
  );
  error.code = "legacy_artifact_requires_migration";
  error.structuredResult = {
    kind: "literature_bundle_import",
    status: "migration_required",
    importedItems: [],
    failedItems: [],
    warnings: [
      {
        code: "legacy_artifact_requires_migration",
        reason,
        ...(details.itemIds ? { itemIds: details.itemIds } : {}),
      },
    ],
  };
  return error;
}

function createBundleHtmlElement(doc, tag) {
  return typeof doc?.createElementNS === "function"
    ? doc.createElementNS("http://www.w3.org/1999/xhtml", tag)
    : doc.createElement(tag);
}

function renderBundleMigrationPreview({ doc, root, candidates, previews }) {
  while (root.firstChild) root.removeChild(root.firstChild);
  const panel = createBundleHtmlElement(doc, "div");
  panel.style.display = "flex";
  panel.style.flexDirection = "column";
  panel.style.gap = "8px";
  panel.style.padding = "8px";
  const title = createBundleHtmlElement(doc, "h3");
  title.textContent = "Review legacy literature artifacts";
  title.style.margin = "0";
  panel.appendChild(title);
  const description = createBundleHtmlElement(doc, "p");
  description.textContent =
    "Confirm to import the verified legacy evidence as canonical References and Citation notes.";
  description.style.margin = "0";
  panel.appendChild(description);
  for (const candidate of candidates) {
    const preview = previews.get(candidate.itemId);
    const row = createBundleHtmlElement(doc, "div");
    row.style.border = "1px solid #d8d8dd";
    row.style.borderRadius = "6px";
    row.style.padding = "6px";
    row.textContent = [
      `Item ${candidate.itemId}`,
      `notes=${candidate.noteFacts.length}`,
      `payloads=${candidate.filePayloads.length}`,
      `status=${String(preview?.classification || "blocked")}`,
      `verified=${Number(preview?.verifiedCount || 0)}`,
      `unresolved=${Number(preview?.unresolvedCount || 0)}`,
      `recovered=${Number(preview?.recoveredCount || 0)}`,
      `dropped=${Number(preview?.droppedCount || 0)}`,
      ...(preview?.reasonCodes?.length
        ? [`reasons=${preview.reasonCodes.slice(0, 4).join(",")}`]
        : []),
    ].join(" | ");
    panel.appendChild(row);
  }
  root.appendChild(panel);
}

async function confirmLegacyBundleConversion({ host, candidates }) {
  if (typeof host.editor?.openSession !== "function") {
    throw bundleMigrationError("interactive conversion review is unavailable", {
      itemIds: candidates.map((candidate) => candidate.itemId),
    });
  }
  const previews = new Map();
  const editorResult = await host.editor.openSession({
    title: "Review legacy literature bundle conversion",
    initialState: {},
    context: {
      candidates: candidates.map((candidate) => ({
        itemId: candidate.itemId,
        noteCount: candidate.noteFacts.length,
        payloadCount: candidate.filePayloads.length,
      })),
    },
    labels: { save: "Confirm conversion", cancel: "Cancel" },
    renderer: {
      render({ doc, root, host: editorHost }) {
        previews.clear();
        for (const candidate of candidates) {
          try {
            previews.set(
              candidate.itemId,
              previewLegacyArtifactSetForImport({
                host: editorHost,
                parentRef: candidate.parentRef,
                noteContents: candidate.noteFacts
                  .filter((fact) => fact.legacy)
                  .map((fact) => fact.html),
                legacyNoteRefs: candidate.legacyNoteRefs,
                filePayloads: candidate.filePayloads,
                readErrors: candidate.readErrors,
              }),
            );
          } catch (error) {
            previews.set(candidate.itemId, {
              classification: "blocked",
              reasonCodes: ["converter_unavailable"],
              diagnostics: [normalizeText(error?.message || error)],
              verifiedCount: 0,
              unresolvedCount: 0,
              recoveredCount: 0,
              droppedCount: 0,
              payload: { references: null, citation: null },
            });
          }
        }
        renderBundleMigrationPreview({ doc, root, candidates, previews });
      },
      serialize: () => ({ confirmed: true }),
    },
    layout: { width: 760, height: 520, minWidth: 640, minHeight: 360 },
  });
  if (!editorResult?.saved) {
    throw bundleMigrationError("conversion was canceled", {
      itemIds: candidates.map((candidate) => candidate.itemId),
    });
  }
  const blocked = candidates.filter((candidate) => {
    const preview = previews.get(candidate.itemId);
    return (
      !preview ||
      preview.classification === "blocked" ||
      !preview.payload?.references?.references?.length
    );
  });
  if (blocked.length) {
    throw bundleMigrationError("conversion preview is blocked", {
      itemIds: blocked.map((candidate) => candidate.itemId),
    });
  }
  return new Map(
    candidates.map((candidate) => [candidate.itemId, previews.get(candidate.itemId)]),
  );
}

function addConvertedBundlePayloads({ notes, noteFacts, preview }) {
  const payloads = [
    ["references-json", preview.payload.references],
    ["citation-analysis-json", preview.payload.citation],
  ].filter(([, value]) => value !== null && value !== undefined);
  const usedNoteIds = new Set();
  const noteIds = new Set(notes.map((note) => note.noteId));
  for (const [payloadType, value] of payloads) {
    const matchingFact = noteFacts.find(
      (fact) =>
        fact.legacyPayloadTypes.has(payloadType),
    );
    if (!matchingFact) {
      throw bundleMigrationError(
        `converted ${payloadType} has no source note`,
      );
    }
    const fact = matchingFact;
    let note = notes.find((entry) => entry.noteId === fact.noteId);
    if (!note) {
      throw bundleMigrationError(`source note is missing: ${fact.noteId}`);
    }
    if (usedNoteIds.has(fact.noteId)) {
      const baseId = `${note.noteId}-${payloadType.replace(/-json$/iu, "")}`;
      let noteId = baseId;
      let ordinal = 2;
      while (noteIds.has(noteId)) noteId = `${baseId}-${ordinal++}`;
      note = {
        ...note,
        noteId,
        payloads: [],
        content: {
          format: "html",
          value: "",
          embeddedImages: [],
        },
        tags: [],
      };
      notes.push(note);
      noteIds.add(noteId);
    }
    note.payloads.push({
      summary: canonicalBundlePayloadSummary(payloadType, value),
      value,
    });
    usedNoteIds.add(fact.noteId);
  }
}

export async function importLiteratureBundleArchive(args) {
  const { host, archive, manifest } = args;
  const target = args.target || resolveLiteratureBundleImportTarget(host);
  const { view, libraryID } = target;
  const warnings = [...(manifest.warnings || [])];
  if (typeof host.resources?.materializeFile !== "function") {
    throw new Error(
      "Literature Product import requires resources.materializeFile",
    );
  }
  if (typeof host.researchBundles?.importPapers !== "function") {
    throw new Error(
      "Literature Product import requires researchBundles.importPapers",
    );
  }
  const collectionRef = view.currentCollection?.ref;
  const collectionRefs =
    Number(collectionRef?.libraryId) === libraryID &&
    normalizeText(collectionRef?.key)
      ? [{ libraryId: libraryID, key: normalizeText(collectionRef.key) }]
      : [];
  const noteFactsByItem = new Map();
  const legacyCandidates = [];
  for (const itemRecord of manifest.items) {
    const noteFacts = await readBundleItemNoteFacts({
      archive,
      itemRecord,
      runtime: args.runtime,
    });
    noteFactsByItem.set(itemRecord.id, noteFacts);
    const legacyFacts = noteFacts.filter((fact) => fact.legacy);
    if (!legacyFacts.length) continue;
    legacyCandidates.push({
      itemId: itemRecord.id,
      parentRef: { libraryId: libraryID, key: itemRecord.id },
      noteFacts: legacyFacts,
      legacyNoteRefs: legacyFacts.map((fact) => ({
        libraryId: libraryID,
        key: fact.noteId,
      })),
      filePayloads: legacyFacts.flatMap((fact) =>
        fact.filePayloads.map((payload) => ({
          ...payload,
          sourceRef: { libraryId: libraryID, key: fact.noteId },
        })),
      ),
      readErrors: legacyFacts.flatMap((fact) => fact.readErrors),
    });
  }
  const legacyConversions = legacyCandidates.length
    ? await confirmLegacyBundleConversion({
        host,
        candidates: legacyCandidates,
      })
    : new Map();
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
        sourcePath: archiveSourcePath(archive, attachmentRecord.path),
        displayName: attachmentRecord.path.split("/").pop(),
        contentType: attachmentRecord.metadata?.contentType,
      });
      const companions = [];
      for (const asset of attachmentRecord.kind === "markdown"
        ? attachmentRecord.assets || []
        : []) {
        const resource = await host.resources.materializeFile({
          slotId: "research-import-files",
          sourcePath: archiveSourcePath(archive, asset.path),
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
    const noteFacts = noteFactsByItem.get(itemRecord.id) || [];
    for (const fact of noteFacts) {
      const noteRecord = fact.noteRecord;
      const legacyConversion = legacyConversions.get(itemRecord.id);
      const isLegacyFact = Boolean(legacyConversion && fact.legacy);
      const portableHtml = isLegacyFact
        ? stripLegacyArtifactMarkupForImport(fact.html)
        : fact.html;
      const embeddedImages = [];
      for (const imageRecord of noteRecord.images || []) {
        if (isLegacyFact && fact.payloadImageIds.has(imageRecord.id)) {
          continue;
        }
        const resource = await host.resources.materializeFile({
          slotId: "research-import-files",
          sourcePath: archiveSourcePath(archive, imageRecord.path),
          displayName: imageRecord.path.split("/").pop(),
          contentType: imageRecord.metadata?.contentType || "image/png",
        });
        embeddedImages.push({
          slot: imageRecord.id,
          resourceRef: resource.ref,
          altText: imageRecord.metadata?.title || imageRecord.id,
          ...(imageRecord.preserveSourceBytes
            ? { preserveSourceBytes: true }
            : {}),
        });
      }
      notes.push({
        noteId: noteRecord.id,
        content: {
          format: "html",
          value: bindPortableNoteImageSlots(portableHtml),
          embeddedImages,
        },
        tags: noteRecord.tags || [],
        payloads: isLegacyFact ? [] : fact.canonicalPayloads,
      });
    }
    const legacyConversion = legacyConversions.get(itemRecord.id);
    if (legacyConversion) {
      addConvertedBundlePayloads({
        notes,
        noteFacts,
        preview: legacyConversion,
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
    .filter(
      (paper) => paper.outcome === "committed" || paper.outcome === "reused",
    )
    .map((paper) => ({
      bundleItemId: paper.graphId,
      itemRef: paper.itemRef,
    }));
  const failedItems = imported.papers
    .filter(
      (paper) => paper.outcome !== "committed" && paper.outcome !== "reused",
    )
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
    const payloadImages = new Set(
      (paper.payloads || []).map(
        (payload) => `${payload.source_note_id}:${payload.source_image_id}`,
      ),
    );
    const payloadsByNote = new Map();
    for (const payload of paper.payloads || []) {
      const content = await args.archive.readText(payload.path);
      const entries = payloadsByNote.get(payload.source_note_id) || [];
      entries.push({
        summary: researchPayloadSummary(payload.payload_type, payload, content),
        value: researchPayloadValue(payload.payload_type, content),
        ...(normalizeText(payload.source_image_id)
          ? { sourceImageId: normalizeText(payload.source_image_id) }
          : {}),
      });
      payloadsByNote.set(payload.source_note_id, entries);
    }
    items.push({
      id: paper.logical_id,
      itemJson: JSON.parse(await args.archive.readText(paper.metadata_path)),
      relatedItemIds: paper.related_paper_ids || [],
      attachments: paper.attachments || [],
      notes: (paper.notes || []).map((note) => ({
        ...note,
        payloads: payloadsByNote.get(note.id) || [],
        images: (note.images || []).map((image) => ({
          ...image,
          ...(payloadImages.has(`${note.id}:${image.id}`)
            ? { preserveSourceBytes: true }
            : {}),
        })),
      })),
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

function productPayloadNoteKind(payloadType) {
  const kind = workbenchPayloadArtifactName(payloadType);
  if (!kind) throw new Error("Unsupported managed payload type");
  return kind === "conversation" ? "conversation-note" : kind;
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
  const creators = (
    Array.isArray(metadata.creators) ? metadata.creators : []
  ).map((creator) => ({
    ...(normalizeText(creator?.firstName)
      ? { firstName: normalizeText(creator.firstName) }
      : {}),
    ...(normalizeText(creator?.lastName)
      ? { lastName: normalizeText(creator.lastName) }
      : {}),
    ...(normalizeText(creator?.name)
      ? { name: normalizeText(creator.name) }
      : {}),
    ...(normalizeText(creator?.creatorType)
      ? { creatorType: normalizeText(creator.creatorType) }
      : {}),
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
  if (
    payloadType === "digest-markdown" ||
    payloadType === "custom-markdown"
  ) {
    return content;
  }
  if (payloadType === "conversation-note-markdown") {
    return {
      version: 1,
      path: "mcp/conversation-note.md",
      format: "markdown",
      content,
    };
  }
  return JSON.parse(content);
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
    throw new Error(
      "Research Product import requires resources.materializeFile",
    );
  }
  if (typeof host.researchBundles?.importPapers !== "function") {
    throw new Error(
      "Research Product import requires researchBundles.importPapers",
    );
  }
  const collectionRef = view.currentCollection?.ref;
  const collectionRefs =
    Number(collectionRef?.libraryId) === libraryID &&
    normalizeText(collectionRef?.key)
      ? [{ libraryId: libraryID, key: normalizeText(collectionRef.key) }]
      : [];
  const papers = [];
  for (const paper of manifest.papers) {
    const metadata = JSON.parse(await archive.readText(paper.metadata_path));
    const attachments = [];
    if (paper.source?.path) {
      const isMarkdown =
        paper.source.kind === "markdown" || /\.md$/i.test(paper.source.path);
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
          contentType:
            normalizeText(asset.content_type) || "application/octet-stream",
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
        payloads: [
          {
            summary: researchPayloadSummary(
              payload.payload_type,
              payload,
              content,
            ),
            value: researchPayloadValue(payload.payload_type, content),
          },
        ],
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
    .filter(
      (paper) => paper.outcome === "committed" || paper.outcome === "reused",
    )
    .map((paper) => ({ bundleItemId: paper.graphId, itemRef: paper.itemRef }));
  const failedItems = imported.papers
    .filter(
      (paper) => paper.outcome !== "committed" && paper.outcome !== "reused",
    )
    .map((paper) => ({
      bundleItemId: paper.graphId,
      code: paper.outcome,
      ...(paper.attemptId ? { attemptId: paper.attemptId } : {}),
      ...(paper.reason ? { reason: paper.reason } : {}),
    }));
  return {
    kind: "literature_bundle_import",
    status:
      imported.outcome === "complete" && !warnings.length
        ? "completed"
        : "partial",
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
      operation: args.operation,
      stage: args.stage,
      message: args.message || "literature bundle import failed",
      details: {
        workflowId: "import-literature-bundle",
        component: "literature-bundle",
        ...(args.details || {}),
        errorMessage: normalizeText(args.error?.message || args.error),
      },
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
  const failure = new Error(
    `Literature bundle import failed during ${stage}: ${reason}`,
  );
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
      filters: [{ label: "Literature bundle", extensions: ["zip"] }],
    }));
  if (!sourcePath) {
    return {
      kind: "literature_bundle_import",
      status: "canceled",
      importedItems: [],
      failedItems: [],
      warnings: [],
    };
  }
  let callbackStarted = false;
  try {
    return await args.host.archive.withExtractedZip(
      { sourcePath },
      { signal: args.runtime?.signal },
      async (archive) => {
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
          return literatureBundleValidationFailure(
            args.host,
            "manifest",
            error,
          );
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
          return literatureBundleValidationFailure(
            args.host,
            "integrity",
            error,
          );
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
          if (error?.code === "legacy_artifact_requires_migration") {
            throw error;
          }
          return throwLiteratureBundleImportFailure(
            args.host,
            "materialization",
            error,
          );
        }
      },
    );
  } catch (error) {
    if (error?.structuredResult) {
      throw error;
    }
    if (!callbackStarted) {
      return literatureBundleValidationFailure(
        args.host,
        "archive_open",
        error,
      );
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
    (status === "partial" && noItemsImported) ||
    (status === "completed" && noItemsImported);
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
