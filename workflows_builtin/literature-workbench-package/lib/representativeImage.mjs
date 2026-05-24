import {
  decodeHtmlEntities,
  escapeAttribute,
  escapeHtml,
  readTagAttribute,
} from "./htmlCodec.mjs";
import { requireHostApi } from "./runtime.mjs";

const REPRESENTATIVE_IMAGE_MARKDOWN_BLOCK_RE =
  /\n?<!--\s*zs:representative-image:v1\s+({[\s\S]*?})\s*-->\s*\n?!\[[^\]]*]\([^)]+\)\s*\n?<!--\s*\/zs:representative-image\s*-->\s*/i;
export const REPRESENTATIVE_IMAGE_EXPORT_FILE_NAME = "representative_image.jpg";

function isObjectLike(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeMarkdownAlt(value) {
  return normalizeText(value)
    .replace(/[\r\n]+/g, " ")
    .replace(/]/g, "\\]")
    .trim();
}

function normalizeLocator(value) {
  if (!isObjectLike(value)) {
    return null;
  }
  const status = normalizeText(value.status || "selected").toLowerCase();
  if (!status || status === "none" || status === "skipped") {
    return {
      status: "none",
    };
  }
  return {
    status: "selected",
    source_kind: normalizeText(value.source_kind),
    label: normalizeText(value.label),
    caption_quote: normalizeText(value.caption_quote),
    section_hint: normalizeText(value.section_hint),
    page_hint: normalizeText(value.page_hint),
    markdown_src_hint: normalizeText(value.markdown_src_hint),
    selection_reason: normalizeText(value.selection_reason),
    confidence: normalizeText(value.confidence),
  };
}

export function extractRepresentativeImageLocator(result) {
  if (!isObjectLike(result)) {
    return null;
  }
  return normalizeLocator(
    result.representative_image ||
      result.data?.representative_image ||
      result.result?.representative_image,
  );
}

function skipped(reason, locator, details = {}) {
  return {
    status: "skipped",
    reason,
    locator: locator || null,
    ...details,
  };
}

function shortDiagnosticText(value, maxLength = 500) {
  const text = normalizeText(value);
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}...`;
}

function extensionOf(targetPath) {
  const match = normalizeText(targetPath).match(/\.([A-Za-z0-9]+)(?:[?#].*)?$/);
  return match ? match[1].toLowerCase() : "";
}

function isMarkdownPath(targetPath) {
  return /^(md|markdown|mdown|mkd)$/i.test(extensionOf(targetPath));
}

function isPdfPath(targetPath) {
  return extensionOf(targetPath) === "pdf";
}

function dirname(targetPath) {
  const text = normalizeText(targetPath);
  const index = Math.max(text.lastIndexOf("/"), text.lastIndexOf("\\"));
  if (index < 0) {
    return "";
  }
  if (index === 2 && /^[A-Za-z]:/.test(text)) {
    return text.slice(0, 3);
  }
  return text.slice(0, index);
}

function preferredPathSeparator(baseDir) {
  return String(baseDir || "").includes("\\") ? "\\" : "/";
}

function relativePathParts(rawRef) {
  const rel = normalizeText(rawRef).replace(/^<|>$/g, "");
  if (!rel || /^[a-z][a-z0-9+.-]*:/i.test(rel) || /^[\\/]/.test(rel)) {
    return [];
  }
  const parts = rel.split(/[\\/]+/).filter(Boolean);
  if (parts.some((part) => part === "." || part === "..")) {
    return [];
  }
  return parts;
}

function isUnsafeRelativeImageRef(rawRef) {
  return relativePathParts(rawRef).length === 0;
}

function joinRelative(baseDir, relativePath) {
  const parts = relativePathParts(relativePath);
  if (parts.length === 0) {
    return "";
  }
  const normalizedBase = normalizeText(baseDir).replace(/[\\/]+$/g, "");
  const separator = preferredPathSeparator(baseDir);
  return normalizedBase
    ? `${normalizedBase}${separator}${parts.join(separator)}`
    : parts.join(separator);
}

function stripMarkdownUrlDecoration(raw) {
  const text = normalizeText(raw);
  if (!text) {
    return "";
  }
  const withoutTitle = text.match(/^(\S+)(?:\s+["'][\s\S]*["'])?$/);
  return normalizeText(withoutTitle ? withoutTitle[1] : text)
    .replace(/^<|>$/g, "")
    .trim();
}

function stripHtmlTags(value) {
  return decodeHtmlEntities(String(value || "").replace(/<[^>]+>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

function extractRepresentativeImageHtmlBlock(noteContent) {
  const match = String(noteContent || "").match(
    /<div\s+data-zs-block=(["'])representative-image\1[\s\S]*?<\/div>/i,
  );
  return match ? match[0] : "";
}

export function extractRepresentativeImageExportDescriptor(noteContent) {
  const block = extractRepresentativeImageHtmlBlock(noteContent);
  const source = block || String(noteContent || "");
  const openingTagMatch = source.match(/<div\b[^>]*>/i);
  const imgTagMatch = source.match(
    /<img\b[^>]*\bdata-attachment-key\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)[^>]*>/i,
  );
  if (!imgTagMatch) {
    return null;
  }
  const attachmentKey =
    normalizeText(
      readTagAttribute(imgTagMatch?.[0] || "", "data-attachment-key"),
    ) ||
    normalizeText(
      readTagAttribute(
        openingTagMatch?.[0] || "",
        "data-zs-representative_image_attachment_key",
      ),
    );
  if (!attachmentKey) {
    return null;
  }
  const captionMatch = block.match(
    /<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i,
  ) || source.slice(imgTagMatch.index || 0).match(
    /<\/p>\s*<p\b[^>]*>([\s\S]*?)<\/p>/i,
  );
  const alt =
    stripHtmlTags(readTagAttribute(imgTagMatch?.[0] || "", "alt")) ||
    stripHtmlTags(captionMatch?.[1] || "") ||
    "Representative image";
  return {
    attachmentKey,
    alt,
  };
}

export function renderRepresentativeImageMarkdownExportBlock(args) {
  const src = normalizeText(args?.src) || REPRESENTATIVE_IMAGE_EXPORT_FILE_NAME;
  const alt = normalizeMarkdownAlt(args?.alt) || "Representative image";
  const metadata = JSON.stringify({ src, alt });
  return [
    `<!-- zs:representative-image:v1 ${metadata} -->`,
    `![${alt}](${src})`,
    "<!-- /zs:representative-image -->",
  ].join("\n");
}

export function parseRepresentativeImageMarkdownExportBlock(markdown) {
  const text = String(markdown || "");
  const match = text.match(REPRESENTATIVE_IMAGE_MARKDOWN_BLOCK_RE);
  if (!match) {
    return {
      markdown: text,
      image: null,
    };
  }
  let image = null;
  let invalidReason = "";
  try {
    const parsed = JSON.parse(match[1]);
    image = {
      src: normalizeText(parsed?.src),
      alt: normalizeText(parsed?.alt) || "Representative image",
    };
  } catch (error) {
    invalidReason = "representative_image_marker_invalid";
  }
  const cleaned = text
    .replace(REPRESENTATIVE_IMAGE_MARKDOWN_BLOCK_RE, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
  return {
    markdown: cleaned,
    image,
    invalidReason,
  };
}

export function insertRepresentativeImageMarkdownExportBlock(markdown, args) {
  const parsed = parseRepresentativeImageMarkdownExportBlock(markdown);
  const text = String(parsed.markdown || "");
  const block = renderRepresentativeImageMarkdownExportBlock(args);
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const headingIndex = lines.findIndex((line) => /^#\s+\S/.test(line));
  if (headingIndex < 0) {
    return `${block}\n\n${text}`.trimEnd();
  }
  const next = [
    ...lines.slice(0, headingIndex + 1),
    "",
    block,
    "",
    ...lines.slice(headingIndex + 1),
  ];
  return next
    .join("\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trimEnd();
}

export async function resolveRepresentativeImageMarkdownImportCandidate(args) {
  const parsed = parseRepresentativeImageMarkdownExportBlock(args?.markdown);
  if (!parsed.image) {
    return {
      markdown: parsed.markdown,
      representativeImage: parsed.invalidReason
        ? {
            status: "skipped",
            reason: parsed.invalidReason,
          }
        : null,
    };
  }
  const src = normalizeText(parsed.image.src);
  const alt = normalizeText(parsed.image.alt) || "Representative image";
  if (isUnsafeRelativeImageRef(src)) {
    return {
      markdown: parsed.markdown,
      representativeImage: {
        status: "skipped",
        reason: "unsafe_representative_image_src",
        src,
        alt,
      },
    };
  }
  const hostApi = requireHostApi(args?.runtime);
  const imagePath = joinRelative(dirname(args?.digestPath), src);
  const exists =
    !imagePath || typeof hostApi.file?.exists !== "function"
      ? !!imagePath
      : await hostApi.file.exists(imagePath);
  if (!exists) {
    return {
      markdown: parsed.markdown,
      representativeImage: {
        status: "skipped",
        reason: "representative_image_file_not_found",
        src,
        alt,
        imagePath,
      },
    };
  }
  return {
    markdown: parsed.markdown,
    representativeImage: {
      status: "selected",
      sourcePath: imagePath,
      src,
      alt,
      mode: "auto",
    },
  };
}

function collectMarkdownImageRefs(markdown) {
  const refs = [];
  const lines = String(markdown || "")
    .replace(/\r\n?/g, "\n")
    .split("\n");
  const markdownImageRe = /!\[[^\]]*]\(([^)]+)\)/g;
  const htmlImageRe = /<img\b[^>]*\bsrc=(["'])(.*?)\1[^>]*>/gi;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    markdownImageRe.lastIndex = 0;
    htmlImageRe.lastIndex = 0;
    let match = markdownImageRe.exec(line);
    while (match) {
      refs.push({
        src: stripMarkdownUrlDecoration(match[1]),
        line: index,
      });
      match = markdownImageRe.exec(line);
    }
    match = htmlImageRe.exec(line);
    while (match) {
      refs.push({
        src: stripMarkdownUrlDecoration(match[2]),
        line: index,
      });
      match = htmlImageRe.exec(line);
    }
  }
  return refs;
}

function findLinesContaining(markdown, needle) {
  const normalizedNeedle = normalizeText(needle).toLowerCase();
  if (!normalizedNeedle) {
    return [];
  }
  const matches = [];
  const lines = String(markdown || "")
    .replace(/\r\n?/g, "\n")
    .split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const haystack = lines[index].toLowerCase();
    if (haystack.includes(normalizedNeedle)) {
      matches.push(index);
    }
  }
  return matches;
}

function findLocatorMatch(markdown, locator) {
  if (normalizeText(locator.caption_quote)) {
    const lines = findLinesContaining(markdown, locator.caption_quote);
    if (lines.length === 1) {
      return {
        status: "matched",
        line: lines[0],
        source: "caption_quote",
      };
    }
    return {
      status: "failed",
      reason:
        lines.length > 1
          ? "ambiguous_markdown_caption_locator"
          : "caption_locator_not_found",
      source: "caption_quote",
    };
  }

  if (normalizeText(locator.label)) {
    const lines = findLinesContaining(markdown, locator.label);
    if (lines.length === 1) {
      return {
        status: "matched",
        line: lines[0],
        source: "label",
      };
    }
    return {
      status: "failed",
      reason:
        lines.length > 1
          ? "ambiguous_markdown_label_locator"
          : "label_locator_not_found",
      source: "label",
    };
  }

  return {
    status: "missing",
    reason: "markdown_locator_missing",
  };
}

async function resolveExistingRelativeImagePath(hostApi, sourcePath, rawRef) {
  const imagePath = joinRelative(dirname(sourcePath), rawRef);
  if (!imagePath) {
    return "";
  }
  if (typeof hostApi.file?.exists === "function") {
    const exists = await hostApi.file.exists(imagePath);
    return exists ? imagePath : "";
  }
  return imagePath;
}

async function resolveMarkdownRepresentativeImage(args) {
  const hostApi = requireHostApi(args.runtime);
  const sourcePath = args.sourcePath;
  const locator = args.locator;
  let markdown = "";
  try {
    markdown = await hostApi.file.readText(sourcePath);
  } catch (error) {
    return skipped("markdown_source_unreadable", locator, {
      warning: String(error?.message || error || "markdown source unreadable"),
    });
  }

  if (locator.markdown_src_hint) {
    if (isUnsafeRelativeImageRef(locator.markdown_src_hint)) {
      return skipped("unsafe_markdown_image_path", locator);
    }
    const hintedPath = joinRelative(
      dirname(sourcePath),
      locator.markdown_src_hint,
    );
    const hinted = await resolveExistingRelativeImagePath(
      hostApi,
      sourcePath,
      locator.markdown_src_hint,
    );
    if (!hinted) {
      return skipped("markdown_src_hint_not_resolved", locator, {
        imagePath: hintedPath,
      });
    }
    return {
      status: "resolved",
      imagePath: hinted,
      strategy: "markdown_src_hint",
    };
  }

  const refs = collectMarkdownImageRefs(markdown);
  if (refs.length === 0) {
    return skipped("markdown_image_ref_not_found", locator);
  }
  const locatorMatch = findLocatorMatch(markdown, locator);
  if (locatorMatch.status === "failed") {
    return skipped(locatorMatch.reason, locator);
  }
  if (locatorMatch.status === "missing" && refs.length !== 1) {
    return skipped(locatorMatch.reason, locator);
  }
  const candidates =
    locatorMatch.status === "matched"
      ? refs
          .map((ref) => ({
            ...ref,
            distance: Math.abs(ref.line - locatorMatch.line),
          }))
          .filter((ref) => ref.distance <= 12)
          .sort((a, b) => a.distance - b.distance || a.line - b.line)
      : refs.map((ref) => ({ ...ref, distance: 0 }));

  const resolvedCandidates = [];
  for (const candidate of candidates) {
    const resolved = await resolveExistingRelativeImagePath(
      hostApi,
      sourcePath,
      candidate.src,
    );
    if (resolved) {
      resolvedCandidates.push({
        ...candidate,
        imagePath: resolved,
      });
    }
  }
  if (resolvedCandidates.length === 0) {
    return skipped("markdown_image_ref_not_resolved", locator);
  }
  if (locatorMatch.status === "missing") {
    return {
      status: "resolved",
      imagePath: resolvedCandidates[0].imagePath,
      strategy: "only_markdown_image",
    };
  }
  if (locatorMatch.source === "label" && resolvedCandidates.length !== 1) {
    return skipped("ambiguous_markdown_label_locator", locator);
  }
  const nearestDistance = resolvedCandidates[0].distance;
  const nearest = resolvedCandidates.filter(
    (candidate) => candidate.distance === nearestDistance,
  );
  if (nearest.length !== 1) {
    return skipped(
      locatorMatch.source === "caption_quote"
        ? "ambiguous_markdown_caption_locator"
        : "ambiguous_markdown_label_locator",
      locator,
    );
  }
  return {
    status: "resolved",
    imagePath: nearest[0].imagePath,
    strategy:
      locatorMatch.source === "caption_quote" ? "near_caption" : "near_label",
  };
}

function renderRepresentativeImageBlock(args) {
  const locator = args.locator || {};
  const caption =
    locator.caption_quote ||
    locator.label ||
    locator.selection_reason ||
    "Representative image";
  const width = String(args.prepared?.width || "").trim();
  const height = String(args.prepared?.height || "").trim();
  const imageAttrs = [
    `data-attachment-key="${escapeAttribute(args.attachmentKey)}"`,
    `alt="${escapeAttribute(locator.label || "Representative image")}"`,
    width ? `width="${escapeAttribute(width)}"` : "",
    height ? `height="${escapeAttribute(height)}"` : "",
  ].filter(Boolean);
  return [
    `<p><img ${imageAttrs.join(" ")}></p>`,
    caption ? `<p>${escapeHtml(caption)}</p>` : "",
  ].filter(Boolean).join("\n");
}

function renderRepresentativeImageDiagnosticSpan(result) {
  const locator = result?.locator || {};
  const attrs = [
    ["status", result?.status],
    ["reason", result?.reason],
    ["warning", result?.warning],
    ["source_kind", locator.source_kind],
    ["label", locator.label],
    ["page_hint", locator.page_hint],
    ["markdown_src_hint", locator.markdown_src_hint],
    ["strategy", result?.strategy],
    ["source_path", result?.sourcePath],
    ["image_path", result?.imagePath],
  ];
  return [
    '<span data-zs-block="representative-image-diagnostic" data-zs-version="1"',
    ...attrs.map(
      ([name, value]) =>
        ` data-zs-representative_image_${name}="${escapeAttribute(shortDiagnosticText(value))}"`,
    ),
    ' hidden="hidden"></span>',
  ].join("");
}

export function renderRepresentativeImageDiagnosticBlock(result) {
  return "";
}

function withRepresentativeImageDiagnostic(result) {
  if (
    result?.status &&
    result.status !== "none" &&
    result.status !== "embedded"
  ) {
    return {
      ...result,
      diagnosticBlock: renderRepresentativeImageDiagnosticBlock(result),
    };
  }
  return result;
}

export function extractExistingRepresentativeImageKeys(noteContent) {
  const keys = [];
  const blockMatches = String(noteContent || "").matchAll(
    /<div\s+data-zs-block=(["'])representative-image\1[\s\S]*?<\/div>/gi,
  );
  for (const blockMatch of blockMatches) {
    const block = blockMatch[0];
    for (const keyMatch of block.matchAll(
      /data-attachment-key=(["'])([^"']+)\1/gi,
    )) {
      const key = normalizeText(keyMatch[2]);
      if (key) {
        keys.push(key);
      }
    }
    for (const keyMatch of block.matchAll(
      /data-zs-representative_image_attachment_key=(["'])([^"']+)\1/gi,
    )) {
      const key = normalizeText(keyMatch[2]);
      if (key) {
        keys.push(key);
      }
    }
  }
  const html = String(noteContent || "");
  for (const keyMatch of html.matchAll(
    /<img\b[^>]*data-attachment-key=(["'])([^"']+)\1[^>]*>/gi,
  )) {
    const key = normalizeText(keyMatch[2]);
    if (key) {
      keys.push(key);
    }
  }
  return Array.from(new Set(keys));
}

export async function cleanupRepresentativeImageAttachments(args) {
  const hostApi = requireHostApi(args.runtime);
  const note = args.digestNote;
  for (const key of args.keys || []) {
    try {
      const attachment = hostApi.items?.getByLibraryAndKey?.(
        note.libraryID,
        key,
      );
      if (!attachment || attachment.parentID !== note.id) {
        continue;
      }
      await hostApi.attachments.remove(attachment);
    } catch {
      // Best-effort cleanup only.
    }
  }
}

async function resolveRepresentativeImage(args) {
  const sourcePath = normalizeText(args.sourcePaths?.[0]);
  if (!sourcePath) {
    return skipped("source_attachment_path_missing", args.locator);
  }
  if (isMarkdownPath(sourcePath)) {
    const resolved = await resolveMarkdownRepresentativeImage({
      runtime: args.runtime,
      sourcePath,
      locator: args.locator,
    });
    return {
      ...resolved,
      sourcePath,
    };
  }
  if (isPdfPath(sourcePath)) {
    return skipped("pdf_resolution_best_effort_unavailable", args.locator, {
      sourcePath,
    });
  }
  return skipped("unsupported_source_attachment_type", args.locator, {
    sourcePath,
  });
}

export async function prepareRepresentativeImageForDigestNote(args) {
  const locator = args.locator;
  if (!locator || locator.status === "none") {
    return {
      status: "none",
      locator: locator || null,
    };
  }
  const digestNote = args.digestNote;
  if (!digestNote || typeof digestNote.getNote !== "function") {
    return withRepresentativeImageDiagnostic(
      skipped("digest_note_missing", locator),
    );
  }

  try {
    const resolved = await resolveRepresentativeImage({
      runtime: args.runtime,
      sourcePaths: args.sourcePaths,
      locator,
    });
    if (resolved.status !== "resolved") {
      return withRepresentativeImageDiagnostic(resolved);
    }

    return prepareResolvedRepresentativeImageForDigestNote({
      runtime: args.runtime,
      digestNote,
      locator,
      imagePath: resolved.imagePath,
      sourcePath: resolved.sourcePath,
      strategy: resolved.strategy,
      previousNoteContent: args.previousNoteContent,
    });
  } catch (error) {
    return withRepresentativeImageDiagnostic(
      skipped("representative_image_best_effort_failed", locator, {
        warning: String(
          error?.message || error || "representative image failed",
        ),
      }),
    );
  }
}

export async function prepareResolvedRepresentativeImageForDigestNote(args) {
  const locator = args.locator || {
    status: "selected",
    source_kind: "imported_digest_markdown",
    label: "Representative image",
  };
  const digestNote = args.digestNote;
  if (!digestNote || typeof digestNote.getNote !== "function") {
    return withRepresentativeImageDiagnostic(
      skipped("digest_note_missing", locator),
    );
  }

  try {
    const imagePath = normalizeText(args.imagePath);
    if (!imagePath) {
      return withRepresentativeImageDiagnostic(
        skipped("representative_image_source_missing", locator),
      );
    }
    const hostApi = requireHostApi(args.runtime);
    if (
      typeof hostApi.images?.prepareForNoteEmbedding !== "function" ||
      typeof hostApi.notes?.importEmbeddedImage !== "function"
    ) {
      return withRepresentativeImageDiagnostic(
        skipped("host_image_api_unavailable", locator),
      );
    }

    const prepared = await hostApi.images.prepareForNoteEmbedding(imagePath, {
      maxLongEdge: 720,
      targetBytes: 180 * 1024,
      hardMaxBytes: 320 * 1024,
      initialQuality: 0.82,
      minQuality: 0.7,
      sourceKind: locator.source_kind,
    });
    const imported = await hostApi.notes.importEmbeddedImage(
      digestNote,
      prepared,
    );
    const attachmentKey = normalizeText(imported?.attachmentKey);
    if (!attachmentKey) {
      return withRepresentativeImageDiagnostic(
        skipped("embedded_image_attachment_key_missing", locator),
      );
    }

    const previousContent =
      typeof args.previousNoteContent === "string"
        ? args.previousNoteContent
        : String(digestNote.getNote?.() || "");
    const previousKeys =
      extractExistingRepresentativeImageKeys(previousContent);
    const htmlBlock = renderRepresentativeImageBlock({
      attachmentKey,
      locator,
      prepared,
      strategy: args.strategy,
    });

    return {
      status: "embedded",
      locator,
      strategy: args.strategy,
      imagePath,
      sourcePath: args.sourcePath,
      attachmentKey,
      width: prepared.width,
      height: prepared.height,
      compressedBytes: prepared.compressedBytes,
      originalBytes: prepared.originalBytes,
      htmlBlock,
      previousAttachmentKeys: previousKeys.filter(
        (key) => key !== attachmentKey,
      ),
    };
  } catch (error) {
    return withRepresentativeImageDiagnostic(
      skipped("representative_image_best_effort_failed", locator, {
        warning: String(
          error?.message || error || "representative image failed",
        ),
      }),
    );
  }
}
