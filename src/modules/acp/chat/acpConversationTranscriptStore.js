import { appendAcpSkillRunTranscriptEvent, enqueueAcpSkillRunTranscriptEvents, flushAcpSkillRunTranscriptWrites, readAcpSkillRunTranscriptItems, readAcpSkillRunTranscriptPage, resolveAcpSkillRunTranscriptPaths, } from "../skillRun/acpSkillRunTranscriptStore";
export function resolveAcpChatTranscriptPaths(conversationStorageDir) {
    return resolveAcpSkillRunTranscriptPaths(conversationStorageDir);
}
export async function appendAcpChatTranscriptEvent(args) {
    return appendAcpSkillRunTranscriptEvent({
        runtimeDir: args.conversationStorageDir,
        op: args.op,
        itemId: args.itemId,
        item: args.item,
        text: args.text,
        patch: args.patch,
        createdAt: args.createdAt,
    });
}
export function enqueueAcpChatTranscriptEvent(args) {
    enqueueAcpSkillRunTranscriptEvents({
        runtimeDir: args.conversationStorageDir,
        events: [
            {
                op: args.op,
                itemId: args.itemId,
                item: args.item,
                text: args.text,
                patch: args.patch,
                createdAt: args.createdAt,
            },
        ],
    });
}
export function flushAcpChatTranscriptWrites(conversationStorageDir) {
    return flushAcpSkillRunTranscriptWrites(conversationStorageDir);
}
export async function readAcpChatTranscriptPage(args) {
    const page = await readAcpSkillRunTranscriptPage({
        runtimeDir: args.conversationStorageDir,
        cursor: args.cursor,
        limit: args.limit,
    });
    return {
        ...page,
        items: page.items,
    };
}
export async function readFullAcpChatTranscript(args) {
    const transcript = await readAcpSkillRunTranscriptItems({
        runtimeDir: args.conversationStorageDir,
    });
    return {
        ...transcript,
        items: transcript.items,
    };
}
