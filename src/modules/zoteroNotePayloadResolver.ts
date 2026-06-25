import {
  listNotePayloadBlocks,
  parseEmbeddedNotePayloadBlock,
  type ZoteroNotePayloadBlock,
} from "./notePayloadCodec";
import { readRuntimeBytes } from "./runtimePersistence";

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function readTagAttribute(tag: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(tag || "").match(
    new RegExp(`${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"),
  );
  return String(match?.[1] || match?.[2] || match?.[3] || "").trim();
}

function collectPayloadAnchors(noteHtml: string) {
  const anchors = new Map<string, string>();
  const pattern =
    /<img\b[^>]*\bdata-zs-payload-anchor\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)[^>]*>/gi;
  for (const match of noteHtml.matchAll(pattern)) {
    const tag = match[0];
    const payloadType = readTagAttribute(tag, "data-zs-payload-anchor");
    const attachmentKey = readTagAttribute(tag, "data-attachment-key");
    if (payloadType) {
      anchors.set(payloadType, attachmentKey);
    }
  }
  return anchors;
}

function resolveZotero() {
  return (globalThis as { Zotero?: any }).Zotero || null;
}

function resolveChildAttachment(ref: unknown) {
  const zotero = resolveZotero();
  try {
    return zotero?.Items?.get?.(Number(ref)) || null;
  } catch {
    return null;
  }
}

async function readBytes(path: string) {
  return readRuntimeBytes(path);
}

async function readAttachmentBytes(attachment: any) {
  const path = cleanString(await attachment?.getFilePathAsync?.());
  if (!path) {
    throw new Error("embedded payload attachment path is missing");
  }
  return readBytes(path);
}

export async function listNotePayloadBlocksForItem(
  note: Zotero.Item,
): Promise<ZoteroNotePayloadBlock[]> {
  const html = String(note?.getNote?.() || "");
  const blocks = listNotePayloadBlocks(html);
  const anchors = collectPayloadAnchors(html);
  const attachmentIds =
    typeof note?.getAttachments === "function"
      ? note.getAttachments() || []
      : [];
  for (const attachmentRef of attachmentIds) {
    const attachment = resolveChildAttachment(attachmentRef);
    if (!attachment) {
      continue;
    }
    try {
      const parsed = parseEmbeddedNotePayloadBlock(
        await readAttachmentBytes(attachment),
        {
          key: attachment.key,
          id: attachment.id,
        },
      );
      if (parsed) {
        const expectedKey = parsed.payloadType
          ? anchors.get(parsed.payloadType)
          : "";
        parsed.anchorStatus = expectedKey
          ? expectedKey === cleanString(attachment.key)
            ? "present"
            : "stale"
          : "missing";
        blocks.push(parsed);
      }
    } catch {
      // Non-payload embedded images and unreadable optional attachments do not
      // invalidate legacy HTML payload discovery.
    }
  }
  return blocks;
}

export function selectPreferredNotePayloadBlock(
  blocks: ZoteroNotePayloadBlock[],
  payloadType?: string | null,
) {
  const candidates = payloadType
    ? blocks.filter((entry) => entry.payloadType === payloadType)
    : blocks;
  return (
    candidates.find(
      (entry) =>
        entry.source === "embedded-image-attachment" &&
        entry.payloadStorageVersion === 2,
    ) ||
    candidates.find((entry) => entry.source === "embedded-image-attachment") ||
    candidates.find((entry) => entry.source === "html-payload-block") ||
    candidates[0] ||
    null
  );
}
