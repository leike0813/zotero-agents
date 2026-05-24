import { requireHostApi } from "./runtime.mjs";

export const WORKBENCH_EMBEDDED_PAYLOAD_MARKER =
  "ZS_WORKBENCH_NOTE_PAYLOAD_V1:";

const PAYLOAD_IMAGE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

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

function encodeUtf8Bytes(text, runtime) {
  const value = String(text || "");
  const Encoder =
    runtime?.TextEncoder ||
    (typeof globalThis?.TextEncoder === "function"
      ? globalThis.TextEncoder
      : null);
  if (Encoder) {
    return new Encoder().encode(value);
  }
  if (runtime?.Buffer && typeof runtime.Buffer.from === "function") {
    return new Uint8Array(runtime.Buffer.from(value, "utf8"));
  }
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0xff;
  }
  return bytes;
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

function encodeBase64Utf8(text, runtime) {
  const value = String(text || "");
  if (runtime?.Buffer && typeof runtime.Buffer.from === "function") {
    return runtime.Buffer.from(value, "utf8").toString("base64");
  }
  const bytes = encodeUtf8Bytes(value, runtime);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const btoaImpl =
    typeof runtime?.btoa === "function"
      ? runtime.btoa
      : typeof globalThis?.btoa === "function"
        ? globalThis.btoa.bind(globalThis)
        : null;
  if (!btoaImpl) {
    throw new Error("base64 encoder unavailable");
  }
  return btoaImpl(binary);
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

function decodeBase64Bytes(text, runtime) {
  const raw = normalizeText(text);
  if (runtime?.Buffer && typeof runtime.Buffer.from === "function") {
    return new Uint8Array(runtime.Buffer.from(raw, "base64"));
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
  return bytes;
}

function concatBytes(left, right) {
  const output = new Uint8Array(left.length + right.length);
  output.set(left, 0);
  output.set(right, left.length);
  return output;
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

function buildPayloadImageBytes(envelope, runtime) {
  const imageBytes = decodeBase64Bytes(PAYLOAD_IMAGE_BASE64, runtime);
  const encodedPayload = encodeBase64Utf8(JSON.stringify(envelope), runtime);
  const suffix = encodeUtf8Bytes(
    `\n${WORKBENCH_EMBEDDED_PAYLOAD_MARKER}${encodedPayload}\n`,
    runtime,
  );
  return concatBytes(imageBytes, suffix);
}

export function parseWorkbenchEmbeddedPayloadBytes(value, runtime) {
  const bytes = toUint8Array(value);
  const marker = encodeUtf8Bytes(WORKBENCH_EMBEDDED_PAYLOAD_MARKER, runtime);
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
  if (Number(envelope?.schemaVersion) !== 1) {
    throw new Error("unsupported workbench embedded payload schema version");
  }
  if (envelope?.kind !== "zotero-skills-workbench-note-payload") {
    throw new Error("unsupported workbench embedded payload kind");
  }
  const payloadType = normalizeText(envelope?.payloadType);
  if (!payloadType) {
    throw new Error("workbench embedded payload type is missing");
  }
  return {
    marker: WORKBENCH_EMBEDDED_PAYLOAD_MARKER,
    schemaVersion: 1,
    noteKind: normalizeText(envelope?.noteKind),
    payloadType,
    payload: envelope?.payload,
    envelope,
  };
}

function projectPayloadBlock(parsed, attachment) {
  const payload = parsed?.payload;
  const payloadType = normalizeText(parsed?.payloadType);
  const format =
    normalizeText(payload?.format) ||
    (payloadType.endsWith("-markdown")
      ? "markdown"
      : payloadType.endsWith("-json")
        ? "json"
        : "text");
  const decodedText =
    format === "markdown"
      ? String(payload?.content || "")
      : format === "json"
        ? JSON.stringify(payload || {})
        : String(payload?.content || payload || "");
  return {
    source: "embedded-image-attachment",
    payloadType,
    noteKind: normalizeText(parsed?.noteKind),
    version: "1",
    encoding: "embedded-image-attachment",
    encodedValue: "",
    decodedText,
    estimatedSize: decodedText.length,
    payload,
    markdown: format === "markdown" ? String(payload?.content || "") : undefined,
    format,
    attachmentKey: normalizeText(attachment?.key),
    attachmentId: attachment?.id || null,
  };
}

async function readAttachmentBytes(runtime, attachment) {
  const host = requireHostApi(runtime);
  const filePath = normalizeText(await attachment?.getFilePathAsync?.());
  if (!filePath) {
    throw new Error("embedded payload attachment path is missing");
  }
  if (typeof host.file?.readBytes !== "function") {
    throw new Error("host file.readBytes is unavailable");
  }
  return host.file.readBytes(filePath);
}

function resolveChildAttachment(runtime, ref) {
  try {
    if (runtime?.helpers?.resolveItemRef) {
      return runtime.helpers.resolveItemRef(ref);
    }
  } catch {
    return null;
  }
  try {
    return globalThis?.Zotero?.Items?.get?.(Number(ref)) || null;
  } catch {
    return null;
  }
}

export async function listWorkbenchEmbeddedPayloadBlocksForNote(args) {
  const runtime = args?.runtime;
  const note = args?.noteItem || args?.note;
  const attachmentIds =
    typeof note?.getAttachments === "function" ? note.getAttachments() || [] : [];
  const blocks = [];
  for (const attachmentRef of attachmentIds) {
    const attachment = resolveChildAttachment(runtime, attachmentRef);
    if (!attachment) {
      continue;
    }
    try {
      const bytes = await readAttachmentBytes(runtime, attachment);
      const parsed = parseWorkbenchEmbeddedPayloadBytes(bytes, runtime);
      if (parsed) {
        blocks.push(projectPayloadBlock(parsed, attachment));
      }
    } catch {
      // Ignore non-payload images and unreadable optional payload candidates here.
    }
  }
  return blocks;
}

export async function resolveWorkbenchEmbeddedPayloadBlock(args) {
  const payloadType = normalizeText(args?.payloadType);
  const blocks = await listWorkbenchEmbeddedPayloadBlocksForNote(args);
  if (!payloadType) {
    return blocks[0] || null;
  }
  return blocks.find((entry) => entry.payloadType === payloadType) || null;
}

export async function attachWorkbenchPayloadToNote(args) {
  const runtime = args?.runtime;
  const host = requireHostApi(runtime);
  const note = args?.note;
  const payloadType = normalizeText(args?.payloadType);
  const noteKind = normalizeText(args?.noteKind);
  if (!note || typeof note.getNote !== "function") {
    throw new Error("workbench payload note is missing");
  }
  if (!payloadType) {
    throw new Error("workbench payload type is missing");
  }
  if (typeof host.notes?.importEmbeddedImage !== "function") {
    throw new Error("host notes.importEmbeddedImage is unavailable");
  }
  const previous = (await listWorkbenchEmbeddedPayloadBlocksForNote({
    runtime,
    noteItem: note,
  })).filter((entry) => entry.payloadType === payloadType);
  const envelope = {
    schemaVersion: 1,
    kind: "zotero-skills-workbench-note-payload",
    createdAt: new Date().toISOString(),
    noteId: note.id || null,
    noteKey: normalizeText(note.key),
    parentId: note.parentID || note.parentItemID || null,
    noteKind,
    payloadType,
    payload: args?.payload,
  };
  const bytes = buildPayloadImageBytes(envelope, runtime);
  const imported = await host.notes.importEmbeddedImage(note, {
    bytes,
    mimeType: "image/png",
    width: 1,
    height: 1,
    originalBytes: bytes.length,
    compressedBytes: bytes.length,
    fileName: `zs-workbench-payload-${payloadType}.png`,
    diagnostics: {
      workbenchPayload: true,
      marker: WORKBENCH_EMBEDDED_PAYLOAD_MARKER,
      payloadType,
    },
  });
  const attachmentKey = normalizeText(imported?.attachmentKey);
  for (const old of previous) {
    if (!old.attachmentKey || old.attachmentKey === attachmentKey) {
      continue;
    }
    try {
      const attachment = host.items?.getByLibraryAndKey?.(
        note.libraryID,
        old.attachmentKey,
      );
      if (attachment && attachment.parentID === note.id) {
        await host.attachments?.remove?.(attachment);
      }
    } catch {
      // Best-effort cleanup only.
    }
  }
  return {
    status: "attached",
    payloadType,
    noteKind,
    attachmentKey,
    bytes: bytes.length,
  };
}
