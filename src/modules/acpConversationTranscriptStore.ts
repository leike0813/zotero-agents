import type { AcpConversationItem } from "./acpTypes";
import {
  appendAcpSkillRunTranscriptEvent,
  readAcpSkillRunTranscriptPage,
  resolveAcpSkillRunTranscriptPaths,
  type AcpSkillRunTranscriptMetadata,
  type AcpSkillRunTranscriptPage,
} from "./acpSkillRunTranscriptStore";

export type AcpChatTranscriptMetadata = AcpSkillRunTranscriptMetadata;
export type AcpChatTranscriptPage = Omit<AcpSkillRunTranscriptPage, "items"> & {
  items: AcpConversationItem[];
};

export type AcpChatTranscriptDelta = {
  backendId: string;
  conversationId: string;
  eventSeq: number;
  transcriptRevision: number;
  op: "upsert_item" | "append_text" | "patch_item" | "delete_item";
  itemId: string;
  item?: AcpConversationItem;
  text?: string;
  patch?: Partial<AcpConversationItem>;
  createdAt: string;
  resyncRequired?: boolean;
};

type AcpChatTranscriptDeltaListener = (delta: AcpChatTranscriptDelta) => void;

const chatTranscriptDeltaListeners = new Set<AcpChatTranscriptDeltaListener>();

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

export function subscribeAcpChatTranscriptDeltas(
  listener: AcpChatTranscriptDeltaListener,
) {
  chatTranscriptDeltaListeners.add(listener);
  return () => {
    chatTranscriptDeltaListeners.delete(listener);
  };
}

export function emitAcpChatTranscriptDelta(delta: AcpChatTranscriptDelta) {
  for (const listener of chatTranscriptDeltaListeners) {
    listener({
      ...delta,
      item: delta.item ? ({ ...delta.item } as AcpConversationItem) : undefined,
      patch: delta.patch
        ? ({ ...delta.patch } as Partial<AcpConversationItem>)
        : undefined,
    });
  }
}
