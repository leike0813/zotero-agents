import { readRuntimeBytes } from "../runtimePersistence";

export type DigestRepresentativeImageDto = {
  status: "available" | "unavailable";
  attachment_key?: string;
  alt?: string;
  caption?: string;
  mime_type?: string;
  data_url?: string;
  width?: number;
  height?: number;
  compressed_bytes?: number;
  source_kind?: string;
  strategy?: string;
  diagnostics: string[];
};

export type DigestRepresentativeImageDescriptor = {
  attachmentKey?: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
  compressedBytes?: number;
  sourceKind?: string;
  strategy?: string;
};

type ResolveDigestRepresentativeImageArgs = {
  libraryId?: unknown;
  noteKey?: unknown;
};

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function stripHtml(value: unknown) {
  return decodeHtmlEntities(String(value ?? "").replace(/<[^>]+>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

function readTagAttribute(tag: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i",
  );
  const match = tag.match(pattern);
  return decodeHtmlEntities(match?.[1] || match?.[2] || match?.[3] || "");
}

function parsePositiveInteger(value: unknown) {
  const number = Number(cleanString(value));
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : undefined;
}

function extractRepresentativeImageHtmlBlock(noteContent: unknown) {
  const match = String(noteContent || "").match(
    /<div\s+data-zs-block=(["'])representative-image\1[\s\S]*?<\/div>/i,
  );
  return match ? match[0] : "";
}

export function extractDigestRepresentativeImageDescriptor(
  noteContent: unknown,
): DigestRepresentativeImageDescriptor | null {
  const block = extractRepresentativeImageHtmlBlock(noteContent);
  const source = block || String(noteContent || "");
  if (!source) {
    return null;
  }
  const openingTag = source.match(/<div\b[^>]*>/i)?.[0] || "";
  const imgTag =
    source.match(
      /<img\b[^>]*\bdata-attachment-key\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)[^>]*>/i,
    )?.[0] || "";
  if (!imgTag) {
    return null;
  }
  const caption = stripHtml(
    block.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i)?.[1] ||
      source
        .slice(source.indexOf(imgTag) + imgTag.length)
        .match(/<\/p>\s*<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1] ||
      "",
  );
  const attachmentKey =
    cleanString(readTagAttribute(imgTag, "data-attachment-key")) ||
    cleanString(
      readTagAttribute(
        openingTag,
        "data-zs-representative_image_attachment_key",
      ),
    );
  const alt =
    stripHtml(readTagAttribute(imgTag, "alt")) ||
    caption ||
    "Representative image";
  return {
    attachmentKey,
    alt,
    caption,
    width: parsePositiveInteger(
      readTagAttribute(openingTag, "data-zs-representative_image_width"),
    ),
    height: parsePositiveInteger(
      readTagAttribute(openingTag, "data-zs-representative_image_height"),
    ),
    compressedBytes: parsePositiveInteger(
      readTagAttribute(
        openingTag,
        "data-zs-representative_image_compressed_bytes",
      ),
    ),
    sourceKind: cleanString(
      readTagAttribute(openingTag, "data-zs-representative_image_source_kind"),
    ),
    strategy: cleanString(
      readTagAttribute(openingTag, "data-zs-representative_image_strategy"),
    ),
  };
}

function unavailable(
  descriptor: DigestRepresentativeImageDescriptor | null,
  reason: string,
): DigestRepresentativeImageDto {
  return {
    status: "unavailable",
    ...(descriptor?.attachmentKey
      ? { attachment_key: descriptor.attachmentKey }
      : {}),
    ...(descriptor?.alt ? { alt: descriptor.alt } : {}),
    ...(descriptor?.caption ? { caption: descriptor.caption } : {}),
    ...(descriptor?.sourceKind ? { source_kind: descriptor.sourceKind } : {}),
    ...(descriptor?.strategy ? { strategy: descriptor.strategy } : {}),
    diagnostics: [reason],
  };
}

function resolveZoteroRuntime() {
  const zotero = (globalThis as { Zotero?: any }).Zotero;
  if (!zotero) {
    return null;
  }
  return zotero;
}

function normalizeLibraryId(zotero: any, value: unknown) {
  const number = Number(value);
  if (Number.isFinite(number) && number > 0) {
    return Math.floor(number);
  }
  const fallback = Number(zotero?.Libraries?.userLibraryID);
  return Number.isFinite(fallback) && fallback > 0 ? Math.floor(fallback) : 1;
}

function resolveItemByKey(zotero: any, libraryId: number, key: string) {
  try {
    return zotero?.Items?.getByLibraryAndKey?.(libraryId, key) || null;
  } catch {
    return null;
  }
}

function readNoteHtml(note: any) {
  try {
    return String(note?.getNote?.() || "");
  } catch {
    return "";
  }
}

function parentItemId(item: any) {
  const number = Number(item?.parentItemID ?? item?.parentID ?? 0);
  return Number.isFinite(number) ? Math.floor(number) : 0;
}

function itemId(item: any) {
  const number = Number(item?.id ?? 0);
  return Number.isFinite(number) ? Math.floor(number) : 0;
}

function readField(item: any, field: string) {
  try {
    return cleanString(item?.getField?.(field));
  } catch {
    return "";
  }
}

async function readAttachmentPath(item: any) {
  try {
    return cleanString(await item?.getFilePathAsync?.());
  } catch {
    return "";
  }
}

async function readBytes(filePath: string) {
  return readRuntimeBytes(filePath);
}

function bytesToBase64(bytes: Uint8Array) {
  const buffer = (globalThis as unknown as { Buffer?: any }).Buffer;
  if (buffer) {
    return buffer.from(bytes).toString("base64");
  }
  const btoaImpl = (globalThis as { btoa?: (value: string) => string }).btoa;
  if (typeof btoaImpl !== "function") {
    throw new Error("base64 encoder is unavailable");
  }
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoaImpl(binary);
}

function contentTypeForAttachment(item: any) {
  const raw =
    readField(item, "contentType") ||
    readField(item, "mimeType") ||
    cleanString(item?.contentType) ||
    cleanString(item?.mimeType) ||
    "image/jpeg";
  return /^image\//i.test(raw) ? raw : "";
}

export async function resolveDigestRepresentativeImageForUi(
  args: ResolveDigestRepresentativeImageArgs,
): Promise<DigestRepresentativeImageDto | undefined> {
  const noteKey = cleanString(args.noteKey);
  if (!noteKey) {
    return undefined;
  }
  const zotero = resolveZoteroRuntime();
  if (!zotero) {
    return undefined;
  }
  const libraryId = normalizeLibraryId(zotero, args.libraryId);
  const note = resolveItemByKey(zotero, libraryId, noteKey);
  if (!note) {
    return {
      status: "unavailable",
      diagnostics: ["digest_note_not_found"],
    };
  }
  const descriptor = extractDigestRepresentativeImageDescriptor(
    readNoteHtml(note),
  );
  if (!descriptor) {
    return undefined;
  }
  if (!descriptor.attachmentKey) {
    return unavailable(
      descriptor,
      "representative_image_attachment_key_missing",
    );
  }
  const attachment = resolveItemByKey(
    zotero,
    libraryId,
    descriptor.attachmentKey,
  );
  if (!attachment) {
    return unavailable(descriptor, "representative_image_attachment_not_found");
  }
  if (
    typeof attachment.isAttachment === "function" &&
    !attachment.isAttachment()
  ) {
    return unavailable(
      descriptor,
      "representative_image_attachment_not_attachment",
    );
  }
  if (parentItemId(attachment) !== itemId(note)) {
    return unavailable(
      descriptor,
      "representative_image_attachment_parent_mismatch",
    );
  }
  const mimeType = contentTypeForAttachment(attachment);
  if (!mimeType) {
    return unavailable(descriptor, "representative_image_attachment_not_image");
  }
  const filePath = await readAttachmentPath(attachment);
  if (!filePath) {
    return unavailable(
      descriptor,
      "representative_image_attachment_path_missing",
    );
  }
  try {
    const bytes = await readBytes(filePath);
    if (!bytes.length) {
      return unavailable(descriptor, "representative_image_attachment_empty");
    }
    const compressedBytes = descriptor.compressedBytes || bytes.length;
    return {
      status: "available",
      attachment_key: descriptor.attachmentKey,
      alt: descriptor.alt || "Representative image",
      caption: descriptor.caption || descriptor.alt || "Representative image",
      mime_type: mimeType,
      data_url: `data:${mimeType};base64,${bytesToBase64(bytes)}`,
      ...(descriptor.width ? { width: descriptor.width } : {}),
      ...(descriptor.height ? { height: descriptor.height } : {}),
      compressed_bytes: compressedBytes,
      ...(descriptor.sourceKind ? { source_kind: descriptor.sourceKind } : {}),
      ...(descriptor.strategy ? { strategy: descriptor.strategy } : {}),
      diagnostics: [],
    };
  } catch (error) {
    return unavailable(
      descriptor,
      `representative_image_read_failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
