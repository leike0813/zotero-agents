export type AssistantSidebarTab = "skillrunner" | "acp-chat" | "acp-skills";

export type AssistantSidebarRenderHints = {
  streamingMode: "plain-incremental";
  finalRender: true;
  streamFlushMs: number;
};

export type AssistantSidebarSnapshot = {
  scopeKey: string;
  activeTab: AssistantSidebarTab;
  attention: {
    waitingCount: number;
  };
  panes: Record<
    AssistantSidebarTab,
    {
      active: boolean;
      full: boolean;
      revision: number;
    }
  >;
  transcript: {
    active: boolean;
    stripped: boolean;
  };
  renderHints: AssistantSidebarRenderHints;
};

export const ASSISTANT_SIDEBAR_STREAM_FLUSH_MS = 160;

export function createAssistantSidebarScopeKey(prefix = "assistant-sidebar") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function assistantSidebarRenderHints(): AssistantSidebarRenderHints {
  return {
    streamingMode: "plain-incremental",
    finalRender: true,
    streamFlushMs: ASSISTANT_SIDEBAR_STREAM_FLUSH_MS,
  };
}

export function buildAssistantSidebarSnapshot(args: {
  scopeKey: string;
  activeTab: AssistantSidebarTab;
  tab: AssistantSidebarTab;
  full: boolean;
  revision: number;
  waitingCount?: number;
}): AssistantSidebarSnapshot {
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
      "acp-chat":
        args.tab === "acp-chat"
          ? pane
          : { active: args.activeTab === "acp-chat", full: false, revision: 0 },
      "acp-skills":
        args.tab === "acp-skills"
          ? pane
          : {
              active: args.activeTab === "acp-skills",
              full: false,
              revision: 0,
            },
      skillrunner:
        args.tab === "skillrunner"
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

function cloneRecord(value: Record<string, unknown>) {
  return { ...value };
}

function stripAcpChatSnapshot(snapshot: Record<string, unknown>) {
  return {
    ...snapshot,
    items: [],
    diagnostics: [],
    stderrTail: "",
  };
}

function stripRunTranscript(run: unknown) {
  if (!run || typeof run !== "object" || Array.isArray(run)) {
    return run;
  }
  return {
    ...(run as Record<string, unknown>),
    transcriptItems: [],
    diagnostics: [],
  };
}

function stripAcpSkillRunSnapshot(snapshot: Record<string, unknown>) {
  return {
    ...snapshot,
    selectedRun: stripRunTranscript(snapshot.selectedRun),
    runs: Array.isArray(snapshot.runs)
      ? snapshot.runs.map((run) => stripRunTranscript(run))
      : snapshot.runs,
  };
}

function stripSkillRunnerSnapshot(snapshot: Record<string, unknown>) {
  const session =
    snapshot.session && typeof snapshot.session === "object"
      ? {
          ...(snapshot.session as Record<string, unknown>),
          messages: [],
        }
      : snapshot.session;
  return {
    ...snapshot,
    session,
  };
}

export function stripAssistantSidebarTranscript(args: {
  tab: AssistantSidebarTab;
  snapshot: Record<string, unknown>;
}) {
  const snapshot = cloneRecord(args.snapshot);
  if (args.tab === "acp-chat") {
    return stripAcpChatSnapshot(snapshot);
  }
  if (args.tab === "acp-skills") {
    return stripAcpSkillRunSnapshot(snapshot);
  }
  return stripSkillRunnerSnapshot(snapshot);
}

export function decorateAssistantSidebarChildSnapshot(args: {
  scopeKey: string;
  activeTab: AssistantSidebarTab;
  tab: AssistantSidebarTab;
  revision: number;
  waitingCount?: number;
  full: boolean;
  snapshot: Record<string, unknown>;
}) {
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
