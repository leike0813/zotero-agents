import type { AcpConversationItem } from "./acpTypes";
import {
  appendAcpSkillRunTranscriptEvent,
  readAcpSkillRunTranscriptItems,
  readAcpSkillRunTranscriptPage,
  resolveAcpSkillRunTranscriptPaths,
  type AcpSkillRunTranscriptMetadata,
  type AcpSkillRunTranscriptPage,
} from "./acpSkillRunTranscriptStore";

export type AcpChatTranscriptMetadata = AcpSkillRunTranscriptMetadata;
export type AcpChatTranscriptPage = Omit<AcpSkillRunTranscriptPage, "items"> & {
  items: AcpConversationItem[];
};
export type AcpChatTranscriptFull = {
  items: AcpConversationItem[];
  eventSeq: number;
  total: number;
};

export function resolveAcpChatTranscriptPaths(conversationStorageDir?: string) {
  return resolveAcpSkillRunTranscriptPaths(conversationStorageDir);
}

export async function appendAcpChatTranscriptEvent(args: {
  conversationStorageDir?: string;
  op: "upsert_item" | "append_text" | "patch_item" | "delete_item";
  itemId: string;
  item?: AcpConversationItem;
  text?: string;
  patch?: Partial<AcpConversationItem>;
  createdAt?: string;
}): Promise<AcpChatTranscriptMetadata | null> {
  return appendAcpSkillRunTranscriptEvent({
    runtimeDir: args.conversationStorageDir,
    op: args.op,
    itemId: args.itemId,
    item: args.item as never,
    text: args.text,
    patch: args.patch as never,
    createdAt: args.createdAt,
  });
}

export async function readAcpChatTranscriptPage(args: {
  conversationStorageDir?: string;
  cursor?: number;
  limit?: number;
}): Promise<AcpChatTranscriptPage> {
  const page = await readAcpSkillRunTranscriptPage({
    runtimeDir: args.conversationStorageDir,
    cursor: args.cursor,
    limit: args.limit,
  });
  return {
    ...page,
    items: page.items as unknown as AcpConversationItem[],
  };
}

export async function readFullAcpChatTranscript(args: {
  conversationStorageDir?: string;
}): Promise<AcpChatTranscriptFull> {
  const transcript = await readAcpSkillRunTranscriptItems({
    runtimeDir: args.conversationStorageDir,
  });
  return {
    ...transcript,
    items: transcript.items as unknown as AcpConversationItem[],
  };
}
