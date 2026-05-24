export type ZoteroNotePayloadKind =
  | "custom"
  | "conversation-note"
  | "digest"
  | "references"
  | "citation-analysis"
  | string;

export type ZoteroNotePayloadBlock = {
  source?: "html-payload-block" | "embedded-image-attachment";
  payloadType: string;
  noteKind: string;
  version: string;
  encoding: string;
  encodedValue: string;
  decodedText?: string;
  estimatedSize: number;
  payload?: unknown;
  markdown?: string;
  format: "markdown" | "json" | "text";
  errors?: string[];
  attachmentKey?: string;
  attachmentId?: number | string | null;
};

export type ZoteroNotePayloadDetail = ZoteroNotePayloadBlock & {
  content: string;
  offset: number;
  nextOffset: number;
  hasMore: boolean;
  totalChars: number;
  truncated: boolean;
};

const DEFAULT_PAYLOAD_CHUNK = 8000;
const MAX_PAYLOAD_CHUNK = 16000;
export const WORKBENCH_EMBEDDED_PAYLOAD_MARKER =
  "ZS_WORKBENCH_NOTE_PAYLOAD_V1:";

function getBuffer() {
  return (globalThis as unknown as { Buffer?: any }).Buffer;
}

export function encodeBase64Utf8(value: string) {
  const buffer = getBuffer();
  if (buffer) {
    return buffer.from(value, "utf8").toString("base64");
  }
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function decodeBase64Utf8(value: string) {
  const normalized = String(value || "").trim();
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized) || normalized.length % 4 === 1) {
    throw new Error("Invalid base64 payload value");
  }
  const buffer = getBuffer();
  if (buffer) {
    return buffer.from(normalized, "base64").toString("utf8");
  }
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder().decode(bytes);
}

function toUint8Array(value: unknown) {
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

function encodeAsciiBytes(value: string) {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0x7f;
  }
  return bytes;
}

function decodeAsciiBytes(bytes: Uint8Array) {
  let text = "";
  for (const byte of bytes) {
    text += String.fromCharCode(byte);
  }
  return text;
}

function indexOfBytes(haystack: Uint8Array, needle: Uint8Array) {
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

export function escapeHtml(input: unknown) {
  return String(input ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function escapeAttribute(input: unknown) {
  return escapeHtml(input)
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function decodeHtmlEntities(input: unknown) {
  return String(input ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

export function readTagAttribute(tag: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(tag || "").match(
    new RegExp(`${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"),
  );
  return decodeHtmlEntities(match?.[1] ?? match?.[2] ?? match?.[3] ?? "");
}

function renderInlineMarkdown(text: string) {
  let html = escapeHtml(text);
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_match, label, url) =>
      `<a href="${escapeAttribute(url)}">${escapeHtml(label)}</a>`,
  );
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return html;
}

function closeLists(state: { inUl: boolean; inOl: boolean }, blocks: string[]) {
  if (state.inUl) {
    blocks.push("</ul>");
    state.inUl = false;
  }
  if (state.inOl) {
    blocks.push("</ol>");
    state.inOl = false;
  }
}

export function renderMarkdownToHtml(markdown: unknown) {
  const lines = String(markdown || "").replace(/\r\n?/g, "\n").split("\n");
  const blocks: string[] = [];
  const state = {
    inCodeBlock: false,
    codeLines: [] as string[],
    inUl: false,
    inOl: false,
  };
  for (const line of lines) {
    const fenceMatch = line.match(/^```(\w+)?\s*$/);
    if (fenceMatch) {
      closeLists(state, blocks);
      if (!state.inCodeBlock) {
        state.inCodeBlock = true;
        state.codeLines = [];
      } else {
        blocks.push(`<pre><code>${escapeHtml(state.codeLines.join("\n"))}</code></pre>`);
        state.inCodeBlock = false;
        state.codeLines = [];
      }
      continue;
    }
    if (state.inCodeBlock) {
      state.codeLines.push(line);
      continue;
    }
    if (/^\s*$/.test(line)) {
      closeLists(state, blocks);
      continue;
    }
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      closeLists(state, blocks);
      const level = headingMatch[1].length;
      blocks.push(`<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`);
      continue;
    }
    const unorderedMatch = line.match(/^\s*[-*+]\s+(.+)$/);
    if (unorderedMatch) {
      if (!state.inUl) {
        closeLists(state, blocks);
        blocks.push("<ul>");
        state.inUl = true;
      }
      blocks.push(`<li>${renderInlineMarkdown(unorderedMatch[1])}</li>`);
      continue;
    }
    const orderedMatch = line.match(/^\s*\d+\.\s+(.+)$/);
    if (orderedMatch) {
      if (!state.inOl) {
        closeLists(state, blocks);
        blocks.push("<ol>");
        state.inOl = true;
      }
      blocks.push(`<li>${renderInlineMarkdown(orderedMatch[1])}</li>`);
      continue;
    }
    closeLists(state, blocks);
    blocks.push(`<p>${renderInlineMarkdown(line)}</p>`);
  }
  closeLists(state, blocks);
  if (state.inCodeBlock && state.codeLines.length > 0) {
    blocks.push(`<pre><code>${escapeHtml(state.codeLines.join("\n"))}</code></pre>`);
  }
  return blocks.join("\n");
}

export function parseNoteKind(noteHtml: unknown) {
  const html = String(noteHtml || "");
  if (/data-zs-payload=(["'])digest-markdown\1/i.test(html)) {
    return "digest";
  }
  if (/data-zs-payload=(["'])references-json\1/i.test(html)) {
    return "references";
  }
  if (/data-zs-payload=(["'])citation-analysis-json\1/i.test(html)) {
    return "citation-analysis";
  }
  if (/data-zs-payload=(["'])conversation-note-markdown\1/i.test(html)) {
    return "conversation-note";
  }
  if (/data-zs-payload=(["'])custom-markdown\1/i.test(html)) {
    return "custom";
  }
  const kindMatch = html.match(
    /data-zs-note-kind\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i,
  );
  return String(kindMatch?.[1] || kindMatch?.[2] || kindMatch?.[3] || "");
}

function decodePayloadText(encodedValue: string, encoding: string) {
  if (encoding === "base64") {
    return decodeBase64Utf8(encodedValue);
  }
  if (encoding === "plain" || encoding === "utf8") {
    return encodedValue;
  }
  throw new Error(`Unsupported payload encoding: ${encoding}`);
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function projectDecodedPayload(payloadType: string, decodedText: string) {
  if (payloadType.endsWith("-markdown")) {
    const parsed = safeJsonParse(decodedText);
    if (parsed && typeof parsed === "object" && "content" in parsed) {
      return {
        format: "markdown" as const,
        payload: parsed,
        markdown: String((parsed as { content?: unknown }).content || ""),
      };
    }
    return {
      format: "markdown" as const,
      payload: decodedText,
      markdown: decodedText,
    };
  }
  if (payloadType.endsWith("-json")) {
    return {
      format: "json" as const,
      payload: JSON.parse(decodedText),
    };
  }
  const parsed = safeJsonParse(decodedText);
  return {
    format: parsed === undefined ? ("text" as const) : ("json" as const),
    payload: parsed === undefined ? decodedText : parsed,
  };
}

export function listNotePayloadBlocks(noteHtml: unknown): ZoteroNotePayloadBlock[] {
  const html = String(noteHtml || "");
  const noteKind = parseNoteKind(html);
  const blocks: ZoteroNotePayloadBlock[] = [];
  const pattern = /<span\b[^>]*data-zs-payload\s*=\s*(?:"[^"]+"|'[^']+'|[^\s>]+)[^>]*>/gi;
  for (const match of html.matchAll(pattern)) {
    const tag = match[0];
    const payloadType = readTagAttribute(tag, "data-zs-payload");
    const version = readTagAttribute(tag, "data-zs-version") || "1";
    const encoding = (readTagAttribute(tag, "data-zs-encoding") || "base64").toLowerCase();
    const encodedValue = readTagAttribute(tag, "data-zs-value");
    const block: ZoteroNotePayloadBlock = {
      source: "html-payload-block",
      payloadType,
      noteKind,
      version,
      encoding,
      encodedValue,
      estimatedSize: 0,
      format: payloadType.endsWith("-markdown")
        ? "markdown"
        : payloadType.endsWith("-json")
          ? "json"
          : "text",
    };
    try {
      const decodedText = decodePayloadText(encodedValue, encoding);
      const projected = projectDecodedPayload(payloadType, decodedText);
      block.decodedText = decodedText;
      block.estimatedSize = decodedText.length;
      block.format = projected.format;
      block.payload = projected.payload;
      block.markdown = projected.markdown;
    } catch (error) {
      block.errors = [error instanceof Error ? error.message : String(error)];
      block.estimatedSize = encodedValue.length;
    }
    blocks.push(block);
  }
  return blocks;
}

export function parseEmbeddedNotePayloadBlock(
  bytesInput: unknown,
  attachment?: { key?: unknown; id?: unknown } | null,
): ZoteroNotePayloadBlock | null {
  const bytes = toUint8Array(bytesInput);
  const marker = encodeAsciiBytes(WORKBENCH_EMBEDDED_PAYLOAD_MARKER);
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
  const encoded = decodeAsciiBytes(bytes.slice(cursor, end));
  const block: ZoteroNotePayloadBlock = {
    source: "embedded-image-attachment",
    payloadType: "",
    noteKind: "",
    version: "1",
    encoding: "embedded-image-attachment",
    encodedValue: "",
    estimatedSize: 0,
    format: "text",
    attachmentKey: String(attachment?.key || "").trim() || undefined,
    attachmentId: (attachment?.id as number | string | undefined) || null,
  };
  try {
    const envelope = JSON.parse(decodeBase64Utf8(encoded));
    if (Number(envelope?.schemaVersion) !== 1) {
      throw new Error("unsupported workbench embedded payload schema version");
    }
    if (envelope?.kind !== "zotero-skills-workbench-note-payload") {
      throw new Error("unsupported workbench embedded payload kind");
    }
    const payloadType = String(envelope?.payloadType || "").trim();
    if (!payloadType) {
      throw new Error("workbench embedded payload type is missing");
    }
    const payload = envelope?.payload;
    const format = String(payload?.format || "").trim() || (payloadType.endsWith("-markdown")
      ? "markdown"
      : payloadType.endsWith("-json")
        ? "json"
        : "text");
    const decodedText =
      format === "markdown"
        ? String(payload?.content || "")
        : format === "json"
          ? JSON.stringify(payload || {})
          : String(payload?.content || "");
    block.payloadType = payloadType;
    block.noteKind = String(envelope?.noteKind || "").trim();
    block.format =
      format === "markdown" || format === "json" || format === "text"
        ? format
        : "text";
    block.decodedText = decodedText;
    block.estimatedSize = decodedText.length;
    block.payload = payload;
    if (block.format === "markdown") {
      block.markdown = String(payload?.content || "");
    }
  } catch (error) {
    block.errors = [error instanceof Error ? error.message : String(error)];
    block.estimatedSize = encoded.length;
  }
  return block;
}

function parseNonNegativeInteger(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
}

function parsePositiveInteger(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

export function selectNotePayloadBlock(
  noteHtml: unknown,
  payloadType?: string | null,
) {
  const blocks = listNotePayloadBlocks(noteHtml);
  if (!payloadType) {
    return blocks[0] || null;
  }
  return blocks.find((entry) => entry.payloadType === payloadType) || null;
}

export function getNotePayloadDetail(
  noteHtml: unknown,
  args: { payloadType?: string | null; offset?: unknown; maxChars?: unknown } = {},
): ZoteroNotePayloadDetail {
  const block = selectNotePayloadBlock(noteHtml, args.payloadType);
  if (!block) {
    throw new Error(
      args.payloadType
        ? `payload not found: ${args.payloadType}`
        : "note does not contain a payload block",
    );
  }
  if (block.errors?.length) {
    throw new Error(block.errors.join("; "));
  }
  const fullContent =
    block.format === "markdown"
      ? String(block.markdown || "")
      : block.format === "json"
        ? JSON.stringify(block.payload, null, 2)
        : String(block.decodedText || "");
  const maxChars = Math.min(
    MAX_PAYLOAD_CHUNK,
    Math.max(1, parsePositiveInteger(args.maxChars) || DEFAULT_PAYLOAD_CHUNK),
  );
  const offset = Math.min(fullContent.length, parseNonNegativeInteger(args.offset));
  const content = fullContent.slice(offset, offset + maxChars);
  const nextOffset = Math.min(fullContent.length, offset + content.length);
  return {
    ...block,
    content,
    offset,
    nextOffset,
    hasMore: nextOffset < fullContent.length,
    totalChars: fullContent.length,
    truncated: nextOffset < fullContent.length,
  };
}

export function renderPayloadBlock(args: {
  payloadType: string;
  payload: unknown;
  payloadFormat?: "json" | "text";
}) {
  const payloadFormat = args.payloadFormat === "text" ? "text" : "json";
  const raw =
    payloadFormat === "text"
      ? String(args.payload || "")
      : JSON.stringify(args.payload);
  return `<span data-zs-block="payload" data-zs-payload="${escapeAttribute(args.payloadType)}" data-zs-version="1" data-zs-encoding="base64" data-zs-value="${escapeAttribute(encodeBase64Utf8(raw))}"></span>`;
}

export function buildStructuredNoteContent(args: {
  noteKind: ZoteroNotePayloadKind;
  title: string;
  viewName: string;
  bodyHtml: string;
  payloadType: string;
  payload: unknown;
  payloadFormat?: "json" | "text";
}) {
  return [
    `<div data-zs-note-kind="${escapeAttribute(args.noteKind)}">`,
    `<h1>${escapeHtml(args.title)}</h1>`,
    `<div data-zs-view="${escapeAttribute(args.viewName)}">`,
    String(args.bodyHtml || ""),
    "</div>",
    renderPayloadBlock({
      payloadType: args.payloadType,
      payload: args.payload,
      payloadFormat: args.payloadFormat,
    }),
    "</div>",
  ].join("\n");
}

export function buildMarkdownBackedNoteContent(args: {
  title: string;
  markdown: string;
  noteKind?: "custom" | "conversation-note" | string;
  noteEntry?: string;
}) {
  const noteKind = args.noteKind || "custom";
  if (noteKind === "custom") {
    return {
      noteKind,
      payloadType: "custom-markdown",
      content: buildStructuredNoteContent({
        noteKind,
        title: args.title,
        viewName: "custom-html",
        bodyHtml: renderMarkdownToHtml(args.markdown),
        payloadType: "custom-markdown",
        payload: args.markdown,
        payloadFormat: "text",
      }),
    };
  }
  if (noteKind === "conversation-note") {
    const payload = {
      version: 1,
      path: args.noteEntry || "mcp/conversation-note.md",
      format: "markdown",
      content: String(args.markdown || ""),
    };
    return {
      noteKind,
      payloadType: "conversation-note-markdown",
      content: buildStructuredNoteContent({
        noteKind,
        title: args.title,
        viewName: "conversation-note-html",
        bodyHtml: renderMarkdownToHtml(args.markdown),
        payloadType: "conversation-note-markdown",
        payload,
      }),
    };
  }
  throw new Error(`Unsupported markdown note kind: ${noteKind}`);
}
