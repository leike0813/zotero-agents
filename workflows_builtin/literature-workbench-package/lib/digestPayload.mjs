import { requireHostApi } from "./runtime.mjs";
import { resolveWorkbenchEmbeddedPayloadBlock } from "./embeddedPayloadAttachments.mjs";

const WORKBENCH_EMBEDDED_PAYLOAD_MARKER = "ZS_WORKBENCH_NOTE_PAYLOAD_V1:";

function normalizeText(value) {
  return String(value || "").trim();
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
  for (const byte of bytes || []) {
    text += String.fromCharCode(byte);
  }
  return text;
}

function decodeBase64Utf8(value, runtime) {
  const text = normalizeText(value);
  if (!text) {
    return "";
  }
  if (runtime?.Buffer && typeof runtime.Buffer.from === "function") {
    return runtime.Buffer.from(text, "base64").toString("utf8");
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
  const binary = atobImpl(text);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return decodeUtf8Bytes(bytes, runtime);
}

function parseGeneratedNoteKind(noteContent) {
  const text = String(noteContent || "");
  const kindMatch = text.match(
    /data-zs-note-kind\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i,
  );
  const directKind = kindMatch
    ? normalizeText(kindMatch[1] || kindMatch[2] || kindMatch[3])
    : "";
  if (directKind === "digest" || directKind === "literature-digest" || directKind === "literature-analysis") {
    return "digest";
  }
  if (
    /<h1[^>]*>\s*Digest\s*<\/h1>/i.test(text) ||
    /<h1[^>]*>\s*Literature Digest\s*<\/h1>/i.test(text)
  ) {
    return "digest";
  }
  return "";
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

function parseEmbeddedPayloadBytes(bytes, runtime) {
  const text = decodeUtf8Bytes(bytes || new Uint8Array(), runtime);
  const markerIndex = text.indexOf(WORKBENCH_EMBEDDED_PAYLOAD_MARKER);
  if (markerIndex < 0) {
    return null;
  }
  const afterMarker = text.slice(
    markerIndex + WORKBENCH_EMBEDDED_PAYLOAD_MARKER.length,
  );
  const encodedMatch = afterMarker.match(/^\s*([A-Za-z0-9+/=]+)/);
  if (!encodedMatch) {
    return null;
  }
  const envelope = JSON.parse(decodeBase64Utf8(encodedMatch[1], runtime));
  if (Number(envelope?.schemaVersion) !== 1) {
    return null;
  }
  if (envelope?.kind !== "zotero-skills-workbench-note-payload") {
    return null;
  }
  if (normalizeText(envelope?.payloadType) !== "digest-markdown") {
    return null;
  }
  const content = String(envelope?.payload?.content || "");
  return content.trim() ? content : null;
}

async function readDigestMarkdownFromNoteAttachments(noteItem, runtime) {
  const host = requireHostApi(runtime);
  const attachmentIds =
    typeof noteItem?.getAttachments === "function"
      ? noteItem.getAttachments() || []
      : [];
  for (const attachmentRef of attachmentIds) {
    const attachment = resolveChildAttachment(runtime, attachmentRef);
    if (!attachment) {
      continue;
    }
    try {
      const filePath = normalizeText(await attachment?.getFilePathAsync?.());
      if (!filePath || typeof host.file?.readBytes !== "function") {
        continue;
      }
      const content = parseEmbeddedPayloadBytes(
        await host.file.readBytes(filePath),
        runtime,
      );
      if (content) {
        return content;
      }
    } catch {
      // Digest context is optional; ignore non-payload/unreadable attachments.
    }
  }
  return null;
}

async function readDigestMarkdownFromWorkbenchPayload(noteItem, runtime) {
  try {
    const block = await resolveWorkbenchEmbeddedPayloadBlock({
      runtime,
      noteItem,
      payloadType: "digest-markdown",
    });
    const markdown = String(
      block?.markdown || block?.payload?.content || block?.decodedText || "",
    );
    return markdown.trim() ? markdown : null;
  } catch {
    return null;
  }
}

export async function resolveDigestMarkdownForParent(parentItem, runtime) {
  const noteIds =
    typeof parentItem?.getNotes === "function"
      ? parentItem.getNotes() || []
      : [];
  for (const noteRef of noteIds) {
    let noteItem = null;
    try {
      noteItem = runtime.helpers.resolveItemRef(noteRef);
    } catch {
      noteItem = null;
    }
    if (!noteItem) {
      continue;
    }
    if (parseGeneratedNoteKind(noteItem.getNote?.() || "") !== "digest") {
      continue;
    }
    const markdown =
      (await readDigestMarkdownFromWorkbenchPayload(noteItem, runtime)) ||
      (await readDigestMarkdownFromNoteAttachments(noteItem, runtime));
    if (markdown) {
      return markdown;
    }
  }
  return null;
}

export const __tagVocabularyDigestPayloadTestOnly = {
  WORKBENCH_EMBEDDED_PAYLOAD_MARKER,
  parseGeneratedNoteKind,
  parseEmbeddedPayloadBytes,
};
