import type { SynthesisHostRepresentativeImageReadResult } from "../../../packages/synthesis-contracts/src/index";

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

export function projectDigestRepresentativeImageForUi(
  result: SynthesisHostRepresentativeImageReadResult,
): DigestRepresentativeImageDto | undefined {
  if (result.status === "absent") {
    return undefined;
  }
  if (result.status === "unavailable") {
    return {
      status: "unavailable",
      ...(result.attachmentKey ? { attachment_key: result.attachmentKey } : {}),
      ...(result.alt ? { alt: result.alt } : {}),
      ...(result.caption ? { caption: result.caption } : {}),
      ...(result.sourceKind ? { source_kind: result.sourceKind } : {}),
      ...(result.strategy ? { strategy: result.strategy } : {}),
      diagnostics: [...result.diagnostics],
    };
  }
  return {
    status: "available",
    attachment_key: result.attachmentKey,
    alt: result.alt,
    caption: result.caption,
    mime_type: result.mimeType,
    data_url: `data:${result.mimeType};base64,${result.contentBase64}`,
    ...(result.width ? { width: result.width } : {}),
    ...(result.height ? { height: result.height } : {}),
    compressed_bytes: result.compressedBytes,
    ...(result.sourceKind ? { source_kind: result.sourceKind } : {}),
    ...(result.strategy ? { strategy: result.strategy } : {}),
    diagnostics: [...result.diagnostics],
  };
}
