import { escapeAttribute } from "./htmlCodec.mjs";
import {
  portableItemRef,
  requireHostApi,
} from "./runtime.mjs";

function normalizeText(value) {
  return String(value || "").trim();
}

export function extractMarkedEmbeddedImageKeys(noteContent, args = {}) {
  const markerAttribute = normalizeText(args.markerAttribute);
  const markerValue = normalizeText(args.markerValue);
  const altSentinel = normalizeText(args.altSentinel);
  if (!markerAttribute && !altSentinel) {
    return [];
  }
  const keys = [];
  for (const match of String(noteContent || "").matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const marked =
      markerAttribute &&
      new RegExp(
        `${markerAttribute}\\s*=\\s*(?:"${escapeRegExp(markerValue)}"|'${escapeRegExp(markerValue)}'|${escapeRegExp(markerValue)}(?:\\s|>))`,
        "i",
      ).test(tag);
    const sentinel =
      altSentinel &&
      new RegExp(
        `(?:alt|title)\\s*=\\s*(?:"${escapeRegExp(altSentinel)}"|'${escapeRegExp(altSentinel)}')`,
        "i",
      ).test(tag);
    if (!marked && !sentinel) {
      continue;
    }
    const key = normalizeText(
      tag.match(/data-attachment-key\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i)?.slice(1).find(Boolean),
    );
    if (key) {
      keys.push(key);
    }
  }
  return Array.from(new Set(keys));
}

export function renderMarkedEmbeddedImage(args) {
  return `<img data-attachment-key="${escapeAttribute(args.attachmentKey)}" ${escapeAttribute(args.markerAttribute)}="${escapeAttribute(args.markerValue)}" alt="${escapeAttribute(args.alt)}" title="${escapeAttribute(args.title || args.alt)}">`;
}

export async function cleanupOwnedEmbeddedImages(args) {
  const hostApi = requireHostApi(args.runtime);
  const noteRef = portableItemRef(args.note);
  const attachments = await hostApi.library.getItemAttachments(noteRef);
  for (const key of Array.from(new Set(args.keys || []))) {
    try {
      const attachment = attachments.find((entry) => entry.ref.key === key);
      if (!attachment) continue;
      await hostApi.attachments.remove({
        operationId: `note-image:remove:${noteRef.libraryId}:${noteRef.key}:${key}`,
        attachmentRef: attachment.ref,
        disposition: "trash",
      });
    } catch {
      // Derived-image cleanup is best effort.
    }
  }
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
