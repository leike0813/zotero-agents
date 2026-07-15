import { createAcpNdJsonMessageStream } from "./acpMessageStream";
import {
  disableAcpRuntimePerformanceProfiler,
  enableAcpRuntimePerformanceProfiler,
  finishAcpRuntimeProfile,
  incrementAcpRuntimeMetric,
  observeAcpRuntimeDuration,
  observeAcpRuntimeGauge,
  readAcpRuntimePerformanceClockMs,
  registerAcpRuntimeProfileAlias,
  snapshotAcpRuntimeProfiles,
  startAcpRuntimeProfile,
} from "./acpRuntimePerformanceProfiler";
import { setAcpRuntimeReplayProfileContext } from "./acpRuntimeReplayProfileContext";
import type {
  AcpRuntimeR2InputPort,
  AcpRuntimeReplayLogicalRunPort,
  AcpRuntimeReplayProfilerPort,
  AcpRuntimeReplayWorkspacePort,
} from "./acpRuntimeReplayProfiler";
import { createAcpRuntimeReplayLogicalTime } from "./acpRuntimeReplayLogicalTime";
import type { AcpRuntimeTraceOwner } from "./acpRuntimeSemanticTrace";
import {
  closeAssistantWorkspaceSidebar,
  drainAssistantWorkspaceReplayPublication,
  getAssistantWorkspaceReplayState,
  inspectAssistantWorkspaceReplayPostSnapshotTimer,
  openAssistantWorkspaceSidebar,
} from "./assistantWorkspaceSidebar";
import {
  getAcpFrontendSnapshot,
  inspectSyntheticAcpChatReplayTimers,
  setActiveAcpConversation,
} from "./acpSessionManager";
import {
  getSelectedAcpSkillRunRequestId,
  inspectSyntheticAcpSkillRunReplayTimers,
  prepareSyntheticAcpSkillRunReplay,
  selectAcpSkillRun,
} from "./acpSkillRunStore";

export function createAcpRuntimeReplayProductionLogicalTimePort(args: {
  surface: "closed" | "open-inactive" | "target-active";
  sourceKind: "acp-chat-conversation" | "acp-workflow-execution";
  syntheticRootId: string;
  signal?: { readonly aborted: boolean };
}): AcpRuntimeReplayLogicalRunPort {
  const requestIds = new Set<string>();
  if (args.sourceKind === "acp-workflow-execution") {
    requestIds.add(`${args.syntheticRootId}-request`);
  }
  const baselineTokens = new Set<ReturnType<typeof setTimeout>>();
  const baselineWarnings: string[] = [];

  const inspectOwnedTimers = () => {
    const inspections =
      args.sourceKind === "acp-chat-conversation"
        ? [
            inspectSyntheticAcpChatReplayTimers({
              backendId: "acp-replay",
              conversationId: `${args.syntheticRootId}-conversation`,
            }),
          ]
        : [
            inspectSyntheticAcpSkillRunReplayTimers({
              requestIds: [...requestIds],
            }),
          ];
    if (args.surface === "target-active") {
      inspections.push(
        inspectAssistantWorkspaceReplayPostSnapshotTimer({
          expectedTab:
            args.sourceKind === "acp-chat-conversation"
              ? "acp-chat"
              : "acp-skills",
          ...(args.sourceKind === "acp-chat-conversation"
            ? {
                expectedChatOwner: {
                  backendId: "acp-replay",
                  conversationId: `${args.syntheticRootId}-conversation`,
                },
              }
            : { expectedSkillRequestIds: [...requestIds] }),
        }),
      );
    }
    return {
      timers: inspections.flatMap((entry) => entry.timers),
      warnings: inspections.flatMap((entry) => entry.warnings),
    };
  };

  const baseline = inspectOwnedTimers();
  for (const timer of baseline.timers) {
    baselineTokens.add(timer.nativeToken);
    baselineWarnings.push(
      `logical-timer-contamination:baseline:${timer.domain}`,
    );
  }
  baselineWarnings.push(...baseline.warnings);

  const logical = createAcpRuntimeReplayLogicalTime({
    signal: args.signal,
    inspect: () => {
      const inspection = inspectOwnedTimers();
      const currentTokens = new Set(
        inspection.timers.map((entry) => entry.nativeToken),
      );
      for (const token of [...baselineTokens]) {
        if (!currentTokens.has(token)) baselineTokens.delete(token);
      }
      return {
        timers: inspection.timers.filter(
          (entry) => !baselineTokens.has(entry.nativeToken),
        ),
        warnings: [...baselineWarnings, ...inspection.warnings],
      };
    },
  });

  return {
    ...logical,
    registerOwner: (owner: AcpRuntimeTraceOwner) => {
      if (owner.requestId) requestIds.add(owner.requestId);
    },
  };
}

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
      if (sourceKind === "acp-chat-conversation") {
        registerAcpRuntimeProfileAlias(
          syntheticRootId,
          `acp-replay\n${syntheticRootId}-conversation`,
        );
      }
    },
    registerOwner: (owner) => {
      for (const alias of [owner.requestId, owner.conversationId]) {
        if (activeRequestId && alias) {
          registerAcpRuntimeProfileAlias(activeRequestId, alias);
        }
      }
    },
    recordSemanticEvent: ({
      event,
      disposition,
      durationMs,
      bytes,
      transcriptBoundary,
    }) => {
      if (!activeRequestId) return;
      const labels = {
        semanticKind: event.kind,
        disposition,
      } as const;
      incrementAcpRuntimeMetric(activeRequestId, "semantic_event", labels);
      incrementAcpRuntimeMetric(
        activeRequestId,
        "semantic_event_bytes",
        labels,
        bytes,
      );
      observeAcpRuntimeDuration(
        activeRequestId,
        "semantic_event_duration",
        labels,
        durationMs,
      );
      if (event.kind === "session-notification") {
        incrementAcpRuntimeMetric(activeRequestId, "session_update", {
          updateClass:
            transcriptBoundary === "text-continuation"
              ? "assistant-message"
              : transcriptBoundary === "soft-side-channel"
                ? "tool-update"
                : "other",
        });
      }
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
  const startedAtByRequest = new Map<string, number>();
  return {
    consumeFragment: async ({
      requestId,
      fragment,
      final,
      profileRequestId,
    }) => {
      if (!fragmentsByRequest.has(requestId)) {
        startedAtByRequest.set(requestId, readAcpRuntimePerformanceClockMs());
      }
      fragmentsByRequest.set(requestId, [
        ...(fragmentsByRequest.get(requestId) || []),
        fragment,
      ]);
      incrementAcpRuntimeMetric(profileRequestId, "host_input_fragment", {
        operationClass: "other",
      });
      incrementAcpRuntimeMetric(
        profileRequestId,
        "host_input_bytes",
        { operationClass: "other" },
        fragment.byteLength,
      );
      observeAcpRuntimeGauge(
        profileRequestId,
        "host_request_inflight",
        { operationClass: "other" },
        fragmentsByRequest.size,
      );
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
      let responseBytes = 0;
      const output = {
        getWriter() {
          return {
            async write(value: Uint8Array) {
              responseBytes += value.byteLength;
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
      const writer = stream.writable.getWriter();
      await writer.write({
        jsonrpc: "2.0",
        id: requestId,
        result: { ok: true },
      });
      writer.releaseLock();
      incrementAcpRuntimeMetric(
        profileRequestId,
        "host_response_bytes",
        { operationClass: "other" },
        responseBytes,
      );
      const durationMs =
        readAcpRuntimePerformanceClockMs() -
        (startedAtByRequest.get(requestId) ||
          readAcpRuntimePerformanceClockMs());
      observeAcpRuntimeDuration(
        profileRequestId,
        "host_input_duration",
        { operationClass: "other" },
        durationMs,
      );
      observeAcpRuntimeDuration(
        profileRequestId,
        "host_request_duration",
        { operationClass: "other" },
        durationMs,
      );
      startedAtByRequest.delete(requestId);
      observeAcpRuntimeGauge(
        profileRequestId,
        "host_request_inflight",
        { operationClass: "other" },
        fragmentsByRequest.size,
      );
      return { responseBytes };
    },
  };
}

export function createAcpRuntimeReplayProductionWorkspacePort(): AcpRuntimeReplayWorkspacePort {
  const drainSurface = (args: {
    surface: "closed" | "open-inactive" | "target-active";
    sourceKind: "acp-chat-conversation" | "acp-workflow-execution";
    syntheticRootId: string;
    signal?: Parameters<
      typeof drainAssistantWorkspaceReplayPublication
    >[0]["signal"];
    phase: "prepare" | "profile";
  }) => {
    if (args.surface === "closed") {
      return Promise.resolve({
        ok: true,
        publication: "not-applicable" as const,
      });
    }
    if (args.surface === "open-inactive" && args.phase === "profile") {
      return Promise.resolve({
        ok: true,
        publication: "expected-zero" as const,
      });
    }
    const targetActive = args.surface === "target-active";
    const tab = targetActive
      ? args.sourceKind === "acp-chat-conversation"
        ? ("acp-chat" as const)
        : ("acp-skills" as const)
      : args.sourceKind === "acp-chat-conversation"
        ? ("acp-skills" as const)
        : ("acp-chat" as const);
    return drainAssistantWorkspaceReplayPublication({
      tab,
      signal: args.signal,
      ...(targetActive && args.sourceKind === "acp-chat-conversation"
        ? {
            expectedChatOwner: {
              backendId: "acp-replay",
              conversationId: `${args.syntheticRootId}-conversation`,
            },
          }
        : {}),
      ...(targetActive && args.sourceKind === "acp-workflow-execution"
        ? { expectedSkillRequestId: `${args.syntheticRootId}-request` }
        : {}),
    }).then((result) => ({
      ...result,
      publication: "acknowledged" as const,
    }));
  };
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
    prepare: async ({ surface, sourceKind, syntheticRootId, signal }) => {
      if (surface === "closed") {
        closeAssistantWorkspaceSidebar();
        return { ok: true };
      }
      if (surface === "open-inactive") {
        const opened = await openAssistantWorkspaceSidebar({
          tab:
            sourceKind === "acp-chat-conversation" ? "acp-skills" : "acp-chat",
        });
        if (!opened) return { ok: false, detail: "workspace-open-failed" };
        return drainSurface({
          surface,
          sourceKind,
          syntheticRootId,
          signal,
          phase: "prepare",
        });
      }
      if (sourceKind === "acp-chat-conversation") {
        await setActiveAcpConversation({
          backendId: "acp-replay",
          conversationId: `${syntheticRootId}-conversation`,
        });
        const opened = await openAssistantWorkspaceSidebar({ tab: "acp-chat" });
        if (!opened) return { ok: false, detail: "workspace-open-failed" };
      } else {
        const requestId = `${syntheticRootId}-request`;
        prepareSyntheticAcpSkillRunReplay({ requestId });
        await selectAcpSkillRun(requestId);
        const opened = await openAssistantWorkspaceSidebar({
          tab: "acp-skills",
          requestId,
        });
        if (!opened) return { ok: false, detail: "workspace-open-failed" };
      }
      return drainSurface({
        surface,
        sourceKind,
        syntheticRootId,
        signal,
        phase: "prepare",
      });
    },
    drain: (args) => drainSurface({ ...args, phase: "profile" }),
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
      const opened = await openAssistantWorkspaceSidebar({
        tab: snapshot.tab,
        target: snapshot.target,
        requestId:
          snapshot.tab === "acp-skills" ? snapshot.skillRequestId : undefined,
      });
      if (!opened) throw new Error("workspace-restore-open-failed");
      const drained = await drainAssistantWorkspaceReplayPublication({
        tab: snapshot.tab || "acp-chat",
        ...(snapshot.tab === "acp-chat" &&
        snapshot.chatBackendId &&
        snapshot.chatConversationId
          ? {
              expectedChatOwner: {
                backendId: snapshot.chatBackendId,
                conversationId: snapshot.chatConversationId,
              },
            }
          : {}),
        ...(snapshot.tab === "acp-skills" && snapshot.skillRequestId
          ? { expectedSkillRequestId: snapshot.skillRequestId }
          : {}),
      });
      if (!drained.ok) {
        throw new Error(drained.detail || "workspace-restore-drain-failed");
      }
    },
  };
}
