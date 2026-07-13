import { createAcpNdJsonMessageStream } from "./acpMessageStream";
import {
  disableAcpRuntimePerformanceProfiler,
  enableAcpRuntimePerformanceProfiler,
  finishAcpRuntimeProfile,
  snapshotAcpRuntimeProfiles,
  startAcpRuntimeProfile,
} from "./acpRuntimePerformanceProfiler";
import { setAcpRuntimeReplayProfileContext } from "./acpRuntimeReplayProfileContext";
import type {
  AcpRuntimeR2InputPort,
  AcpRuntimeReplayProfilerPort,
  AcpRuntimeReplayWorkspacePort,
} from "./acpRuntimeReplayProfiler";
import {
  closeAssistantWorkspaceSidebar,
  drainAssistantWorkspaceReplayPublication,
  getAssistantWorkspaceReplayState,
  openAssistantWorkspaceSidebar,
} from "./assistantWorkspaceSidebar";
import {
  getAcpFrontendSnapshot,
  setActiveAcpConversation,
} from "./acpSessionManager";
import {
  getSelectedAcpSkillRunRequestId,
  prepareSyntheticAcpSkillRunReplay,
  selectAcpSkillRun,
} from "./acpSkillRunStore";

export function createAcpRuntimeReplayProductionProfilerPort(): AcpRuntimeReplayProfilerPort {
  let activeRequestId = "";
  return {
    start: async ({ surface, sourceKind, syntheticRootId }) => {
      disableAcpRuntimePerformanceProfiler();
      if (!enableAcpRuntimePerformanceProfiler()) {
        throw new Error("ACP runtime performance profiler is unavailable");
      }
      activeRequestId = syntheticRootId;
      setAcpRuntimeReplayProfileContext({
        requestId: syntheticRootId,
        sourceKind,
        surface,
      });
      const zoteroMajorRaw = Number.parseInt(String(Zotero.version || "0"), 10);
      startAcpRuntimeProfile({
        requestId: syntheticRootId,
        displayMode: "live",
        transport: "unknown",
        zoteroMajor:
          zoteroMajorRaw === 7 || zoteroMajorRaw === 9
            ? zoteroMajorRaw
            : "unknown",
      });
    },
    finish: async () => {
      if (activeRequestId) finishAcpRuntimeProfile(activeRequestId);
      const snapshot = snapshotAcpRuntimeProfiles();
      const profile = snapshot?.completed.find(
        (entry) => entry.requestId === activeRequestId,
      );
      activeRequestId = "";
      setAcpRuntimeReplayProfileContext();
      disableAcpRuntimePerformanceProfiler();
      return profile;
    },
  };
}

export function createAcpRuntimeR2ProductionNoopPort(): AcpRuntimeR2InputPort {
  const fragmentsByRequest = new Map<string, Uint8Array[]>();
  return {
    consumeFragment: async ({ requestId, fragment, final }) => {
      fragmentsByRequest.set(requestId, [
        ...(fragmentsByRequest.get(requestId) || []),
        fragment,
      ]);
      if (!final) return;
      const fragments = fragmentsByRequest.get(requestId) || [];
      fragmentsByRequest.delete(requestId);
      let index = 0;
      const input = {
        getReader() {
          return {
            async read() {
              if (index >= fragments.length) return { done: true };
              const value = fragments[index];
              index += 1;
              return { done: false, value };
            },
            releaseLock() {
              return;
            },
          };
        },
      };
      const output = {
        getWriter() {
          return {
            async write(_value: Uint8Array) {
              return;
            },
            releaseLock() {
              return;
            },
          };
        },
      };
      const stream = createAcpNdJsonMessageStream(output, input);
      const reader = stream.readable.getReader();
      const parsed = await reader.read();
      reader.releaseLock();
      const message = parsed.value as { method?: unknown } | undefined;
      if (parsed.done || message?.method !== "health") {
        throw new Error("R2 synthetic health input did not parse");
      }
      const terminal = await stream.readable.getReader().read();
      if (!terminal.done) {
        throw new Error("R2 synthetic input produced unexpected messages");
      }
    },
  };
}

export function createAcpRuntimeReplayProductionWorkspacePort(): AcpRuntimeReplayWorkspacePort {
  return {
    snapshot: async () => {
      const workspace = getAssistantWorkspaceReplayState();
      const chat = getAcpFrontendSnapshot({ itemMode: "structural" });
      return {
        ...workspace,
        chatBackendId: chat.activeBackendId,
        chatConversationId: chat.activeConversationId,
        skillRequestId: getSelectedAcpSkillRunRequestId(),
      };
    },
    prepare: async ({ surface, sourceKind, syntheticRootId }) => {
      if (surface === "closed") {
        closeAssistantWorkspaceSidebar();
        return { ok: true };
      }
      if (surface === "open-inactive") {
        await openAssistantWorkspaceSidebar({
          tab:
            sourceKind === "acp-chat-conversation" ? "acp-skills" : "acp-chat",
        });
        return drainAssistantWorkspaceReplayPublication();
      }
      if (sourceKind === "acp-chat-conversation") {
        await setActiveAcpConversation({
          backendId: "acp-replay",
          conversationId: `${syntheticRootId}-conversation`,
        });
        await openAssistantWorkspaceSidebar({ tab: "acp-chat" });
      } else {
        const requestId = `${syntheticRootId}-request`;
        prepareSyntheticAcpSkillRunReplay({ requestId });
        await selectAcpSkillRun(requestId);
        await openAssistantWorkspaceSidebar({
          tab: "acp-skills",
          requestId,
        });
      }
      return drainAssistantWorkspaceReplayPublication();
    },
    restore: async (snapshotRaw) => {
      const snapshot = snapshotRaw as {
        open?: boolean;
        tab?: "skillrunner" | "acp-chat" | "acp-skills";
        target?: "library" | "reader";
        chatBackendId?: string;
        chatConversationId?: string;
        skillRequestId?: string;
      };
      if (!snapshot.open) {
        closeAssistantWorkspaceSidebar();
        return;
      }
      if (
        snapshot.tab === "acp-chat" &&
        snapshot.chatBackendId &&
        snapshot.chatConversationId
      ) {
        await setActiveAcpConversation({
          backendId: snapshot.chatBackendId,
          conversationId: snapshot.chatConversationId,
        });
      } else if (snapshot.tab === "acp-skills" && snapshot.skillRequestId) {
        await selectAcpSkillRun(snapshot.skillRequestId);
      }
      await openAssistantWorkspaceSidebar({
        tab: snapshot.tab,
        target: snapshot.target,
        requestId:
          snapshot.tab === "acp-skills" ? snapshot.skillRequestId : undefined,
      });
      await drainAssistantWorkspaceReplayPublication();
    },
  };
}
