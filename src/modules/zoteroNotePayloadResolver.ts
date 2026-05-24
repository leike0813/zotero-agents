import {
  listNotePayloadBlocks,
  parseEmbeddedNotePayloadBlock,
  type ZoteroNotePayloadBlock,
} from "./notePayloadCodec";
import { readRuntimeBytes } from "./runtimePersistence";

function cleanString(value: unknown) {
  return String(value || "").trim();
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
  const attachmentIds =
    typeof note?.getAttachments === "function" ? note.getAttachments() || [] : [];
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
    candidates.find((entry) => entry.source === "html-payload-block") ||
    candidates[0] ||
    null
  );
}
