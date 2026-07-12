import { getBaseName, sanitizeFileNameSegment } from "./path.mjs";

export const LITERATURE_BUNDLE_KIND = "zotero-agents-literature-bundle";
export const LITERATURE_BUNDLE_SCHEMA_VERSION = 1;

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

function dirnamePath(value) {
  const normalized = String(value || "").replace(/\\/g, "/");
  const index = normalized.lastIndexOf("/");
  return index < 0 ? "" : normalized.slice(0, index);
}

function joinLocalPath(base, relative) {
  const separator = String(base || "").includes("\\") ? "\\" : "/";
  const segments = `${String(base || "").replace(/[\\/]+$/, "")}/${String(relative || "")}`
    .replace(/\\/g, "/")
    .split("/");
  const output = [];
  for (const segment of segments) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      output.pop();
      continue;
    }
    output.push(segment);
  }
  const drive = String(base || "").match(/^([A-Za-z]:)/)?.[1] || "";
  const absolute = String(base || "").startsWith("/");
  if (drive) {
    if (output[0]?.toLowerCase() === drive.toLowerCase()) output.shift();
    return `${drive}${separator}${output.join(separator)}`;
  }
  return `${absolute ? separator : ""}${output.join(separator)}`;
}

function splitDestinationSuffix(value) {
  const match = String(value || "").match(/^([^?#]*)([?#].*)?$/);
  return { path: match?.[1] || "", suffix: match?.[2] || "" };
}

function localDestinationPath(destination, sourcePath) {
  const raw = normalizeText(destination).replace(/^<|>$/g, "");
  if (/^(?:https?:|data:)/i.test(raw)) return null;
  const { path, suffix } = splitDestinationSuffix(raw);
  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    // Preserve undecodable paths for the existence resolver.
  }
  if (/^file:/i.test(decoded)) {
    try {
      const url = new URL(decoded);
      let pathname = decodeURIComponent(url.pathname || "");
      if (/^\/[A-Za-z]:\//.test(pathname)) pathname = pathname.slice(1);
      return { path: pathname, suffix };
    } catch {
      return null;
    }
  }
  if (/^(?:[A-Za-z]:[\\/]|\/)/.test(decoded)) {
    return { path: decoded, suffix };
  }
  return { path: joinLocalPath(dirnamePath(sourcePath), decoded), suffix };
}

function normalizedLocalPath(value) {
  return joinLocalPath(String(value || "").replace(/\\/g, "/"), "").replace(
    /\\/g,
    "/",
  );
}

function sourceTreeRelativePath(sourcePath, candidatePath) {
  const root = normalizedLocalPath(dirnamePath(sourcePath));
  const candidate = normalizedLocalPath(candidatePath);
  const comparisonRoot = /^[A-Za-z]:\//.test(root) ? root.toLowerCase() : root;
  const comparisonCandidate = /^[A-Za-z]:\//.test(candidate)
    ? candidate.toLowerCase()
    : candidate;
  if (!comparisonRoot || comparisonCandidate === comparisonRoot) {
    return null;
  }
  if (!comparisonCandidate.startsWith(`${comparisonRoot}/`)) {
    return null;
  }
  return candidate.slice(root.length + 1);
}

function encodeMarkdownRelativePath(value) {
  return String(value || "")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export async function rewriteMarkdownLocalImages(args) {
  const source = String(args?.markdown || "");
  const resolveLocalPath = args?.resolveLocalPath;
  const preserveSourceTree =
    args?.assetPolicy?.kind === "preserve-source-tree";
  const assets = [];
  const warnings = [];
  const bySource = new Map();
  const matches = [];
  const pattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
  for (const match of source.matchAll(pattern)) {
    matches.push({ index: match.index, full: match[0], alt: match[1], destination: match[2] });
  }
  let markdown = source;
  for (const match of matches.reverse()) {
    const local = localDestinationPath(match.destination, args?.sourcePath);
    if (!local) continue;
    const sourceRelativePath = preserveSourceTree
      ? sourceTreeRelativePath(args?.sourcePath, local.path)
      : "";
    if (preserveSourceTree && !sourceRelativePath) {
      warnings.push({ code: "markdown_image_outside_source_tree", path: local.path });
      continue;
    }
    const resolved = await resolveLocalPath?.(local.path);
    if (!resolved) {
      warnings.push({ code: "markdown_image_missing", path: local.path });
      continue;
    }
    let asset = bySource.get(resolved);
    if (!asset) {
      const id = `m${assets.length + 1}`;
      const name = sanitizeFileNameSegment(getBaseName(resolved)).replace(/\s+/g, "-");
      const relativePath = preserveSourceTree
        ? normalizeEntryPath(sourceRelativePath)
        : `assets/${id}/${name}`;
      asset = { id, sourcePath: resolved, relativePath };
      bySource.set(resolved, asset);
      assets.push(asset);
    }
    const markdownPath = preserveSourceTree
      ? encodeMarkdownRelativePath(asset.relativePath)
      : asset.relativePath;
    const replacement = `![${match.alt}](${markdownPath}${local.suffix})`;
    markdown = `${markdown.slice(0, match.index)}${replacement}${markdown.slice(match.index + match.full.length)}`;
  }
  return { markdown, assets, warnings };
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

function parentIdsFromSelection(selection) {
  return (selection?.items?.parents || [])
    .map((entry) => Number(entry?.item?.id || 0))
    .filter((id) => Number.isFinite(id) && id > 0);
}

export async function exportLiteratureBundle(args) {
  const selectedTargetPath = await args.host.file.pickSaveFile({
    title: "Export Literature Bundle",
    filters: [["Literature bundle", "*.zip"]],
    suggestedName: "literature-bundle.zip",
  });
  if (!selectedTargetPath) {
    return { kind: "literature_bundle_export", status: "canceled", itemCount: 0, attachmentCount: 0, noteCount: 0, warnings: [] };
  }
  const targetPath = /\.zip$/i.test(selectedTargetPath)
    ? selectedTargetPath
    : `${selectedTargetPath}.zip`;
  const parents = parentIdsFromSelection(args.selectionContext)
    .map((id) => args.host.items.get(id))
    .filter((item) => item?.isRegularItem?.());
  if (!parents.length) throw new Error("export-literature-bundle requires at least one parent item");
  const built = await buildLiteratureBundleExport({ host: args.host, parents });
  await args.host.archive.writeZipAtomic({
    targetPath,
    entries: [
      { name: "manifest.json", text: JSON.stringify(built.manifest, null, 2) },
      ...built.entries,
    ],
  });
  return {
    kind: "literature_bundle_export",
    status: "completed",
    itemCount: built.manifest.items.length,
    attachmentCount: built.manifest.items.reduce((sum, item) => sum + item.attachments.length, 0),
    noteCount: built.manifest.items.reduce((sum, item) => sum + item.notes.length, 0),
    warnings: built.warnings,
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
  const sourcePath = await args.host.file.pickFile({
    title: "Import Literature Bundle",
    filters: [["Literature bundle", "*.zip"]],
  });
  if (!sourcePath) {
    return { kind: "literature_bundle_import", status: "canceled", importedItems: [], failedItems: [], warnings: [] };
  }
  let callbackStarted = false;
  try {
    return await args.host.archive.withExtractedZip(sourcePath, async (archive) => {
      callbackStarted = true;
      let manifest;
      try {
        manifest = validateLiteratureBundleManifest(
          JSON.parse(await archive.readText("manifest.json")),
          archive.entries,
        );
      } catch (error) {
        return literatureBundleValidationFailure(args.host, "manifest", error);
      }
      try {
        await verifyLiteratureBundleFiles(manifest, archive);
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
        return await importLiteratureBundleArchive({
          host: args.host,
          archive,
          manifest,
          target,
        });
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
