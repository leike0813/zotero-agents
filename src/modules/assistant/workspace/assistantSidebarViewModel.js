export const ASSISTANT_SIDEBAR_STREAM_FLUSH_MS = 160;
export function createAssistantSidebarScopeKey(prefix = "assistant-sidebar") {
    return `${prefix}-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
}
export function assistantSidebarRenderHints() {
    return {
        streamingMode: "plain-incremental",
        finalRender: true,
        streamFlushMs: ASSISTANT_SIDEBAR_STREAM_FLUSH_MS,
    };
}
export function buildAssistantSidebarSnapshot(args) {
    const pane = {
        active: args.full,
        full: args.full,
        revision: args.revision,
    };
    return {
        scopeKey: args.scopeKey,
        activeTab: args.activeTab,
        attention: {
            waitingCount: Math.max(0, Math.floor(Number(args.waitingCount || 0))),
        },
        panes: {
            "acp-chat": args.tab === "acp-chat"
                ? pane
                : { active: args.activeTab === "acp-chat", full: false, revision: 0 },
            "acp-skills": args.tab === "acp-skills"
                ? pane
                : {
                    active: args.activeTab === "acp-skills",
                    full: false,
                    revision: 0,
                },
            skillrunner: args.tab === "skillrunner"
                ? pane
                : {
                    active: args.activeTab === "skillrunner",
                    full: false,
                    revision: 0,
                },
        },
        transcript: {
            active: args.full,
            stripped: !args.full,
        },
        renderHints: assistantSidebarRenderHints(),
    };
}
function cloneRecord(value) {
    return { ...value };
}
function stripAcpChatSnapshot(snapshot) {
    return {
        ...snapshot,
        items: [],
        diagnostics: [],
        stderrTail: "",
        transcriptRegion: undefined,
        transcriptRevision: undefined,
        transcriptEventSeq: undefined,
        transcriptItemCount: undefined,
    };
}
function stripRunTranscript(run) {
    if (!run || typeof run !== "object" || Array.isArray(run)) {
        return run;
    }
    return {
        ...run,
        transcriptItems: [],
        diagnostics: [],
    };
}
function stripAcpSkillRunSnapshot(snapshot) {
    return {
        ...snapshot,
        selectedRun: stripRunTranscript(snapshot.selectedRun),
        runs: Array.isArray(snapshot.runs)
            ? snapshot.runs.map((run) => stripRunTranscript(run))
            : snapshot.runs,
    };
}
function stripSkillRunnerSnapshot(snapshot) {
    const session = snapshot.session && typeof snapshot.session === "object"
        ? {
            ...snapshot.session,
            messages: [],
        }
        : snapshot.session;
    return {
        ...snapshot,
        session,
    };
}
export function stripAssistantSidebarTranscript(args) {
    const snapshot = cloneRecord(args.snapshot);
    if (args.tab === "acp-chat") {
        return stripAcpChatSnapshot(snapshot);
    }
    if (args.tab === "acp-skills") {
        return stripAcpSkillRunSnapshot(snapshot);
    }
    return stripSkillRunnerSnapshot(snapshot);
}
export function decorateAssistantSidebarChildSnapshot(args) {
    const payload = args.full
        ? cloneRecord(args.snapshot)
        : stripAssistantSidebarTranscript({
            tab: args.tab,
            snapshot: args.snapshot,
        });
    const sidebar = buildAssistantSidebarSnapshot(args);
    return {
        ...payload,
        sidebar,
        renderHints: sidebar.renderHints,
    };
}
