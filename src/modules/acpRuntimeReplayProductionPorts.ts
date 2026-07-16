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
import { createAcpRuntimeReplayOwnerIdentity } from "./acpRuntimeReplayIdentity";
import { getAssistantExecutionDisplayMode } from "./assistantExecutionDisplayPolicy";
import type { AcpRuntimeTraceOwner } from "./acpRuntimeSemanticTrace";
import {
  closeAssistantWorkspaceSidebar,
  forceAssistantWorkspaceDiagnosticsPublication,
  getAssistantWorkspaceReplayState,
  inspectAssistantWorkspaceDiagnosticsPublication,
  inspectAssistantWorkspaceReplayPostSnapshotTimer,
  openAssistantWorkspaceSidebar,
  type AssistantWorkspaceDiagnosticsPublicationOptions,
} from "./assistantWorkspaceSidebar";
import {
  drainAcpRuntimeReplayPublication,
  waitAcpRuntimeReplayWorkspaceReadiness,
} from "./acpRuntimeReplayPublicationSidecar";
import {
  getAcpFrontendSnapshot,
  inspectSyntheticAcpChatReplayTimers,
} from "./acpSessionManager";
import {
  getSelectedAcpSkillRunRequestId,
  inspectSyntheticAcpSkillRunReplayTimers,
} from "./acpSkillRunStore";

export function createAcpRuntimeReplayProductionLogicalTimePort(args: {
  surface: "closed" | "open-inactive" | "target-active";
  sourceKind: "acp-chat-conversation" | "acp-workflow-execution";
  syntheticRootId: string;
  signal?: { readonly aborted: boolean };
}): AcpRuntimeReplayLogicalRunPort {
  const identity = createAcpRuntimeReplayOwnerIdentity(args.syntheticRootId);
  const requestIds = new Set<string>();
  if (args.sourceKind === "acp-workflow-execution") {
    requestIds.add(identity.workflow.requestId);
  }
  const baselineTokens = new Set<ReturnType<typeof setTimeout>>();
  const baselineWarnings: string[] = [];

  const inspectOwnedTimers = () => {
    const inspections =
      args.sourceKind === "acp-chat-conversation"
        ? [
            inspectSyntheticAcpChatReplayTimers({
              backendId: identity.chat.backendId,
              conversationId: identity.chat.conversationId,
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
                  backendId: identity.chat.backendId,
                  conversationId: identity.chat.conversationId,
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
        displayMode: getAssistantExecutionDisplayMode(),
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
  const drainTab = (
    options: Omit<AssistantWorkspaceDiagnosticsPublicationOptions, "tab"> & {
      tab: "acp-chat" | "acp-skills";
      signal?: Parameters<typeof drainAcpRuntimeReplayPublication>[0]["signal"];
    },
  ) => {
    const { signal, ...publicationOptions } = options;
    return drainAcpRuntimeReplayPublication({
      tab: publicationOptions.tab,
      signal,
      inspect: () =>
        inspectAssistantWorkspaceDiagnosticsPublication(publicationOptions),
      forcePublish: () =>
        forceAssistantWorkspaceDiagnosticsPublication(publicationOptions),
    });
  };
  const drainSurface = (args: {
    surface: "closed" | "open-inactive" | "target-active";
    sourceKind: "acp-chat-conversation" | "acp-workflow-execution";
    syntheticRootId: string;
    signal?: Parameters<typeof drainAcpRuntimeReplayPublication>[0]["signal"];
    phase: "prepare" | "profile";
  }) => {
    const identity = createAcpRuntimeReplayOwnerIdentity(args.syntheticRootId);
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
    return drainTab({
      tab,
      signal: args.signal,
      ...(targetActive && args.sourceKind === "acp-chat-conversation"
        ? {
            expectedChatOwner: {
              backendId: identity.chat.backendId,
              conversationId: identity.chat.conversationId,
            },
          }
        : {}),
      ...(targetActive && args.sourceKind === "acp-workflow-execution"
        ? { expectedSkillRequestId: identity.workflow.requestId }
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
        const opened = await openAssistantWorkspaceSidebar({ tab: "acp-chat" });
        if (!opened) return { ok: false, detail: "workspace-open-failed" };
      } else {
        const requestId =
          createAcpRuntimeReplayOwnerIdentity(syntheticRootId).workflow
            .requestId;
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
      const opened = await openAssistantWorkspaceSidebar({
        tab: snapshot.tab,
        target: snapshot.target,
        requestId:
          snapshot.tab === "acp-skills" ? snapshot.skillRequestId : undefined,
      });
      if (!opened) throw new Error("workspace-restore-open-failed");
      const restoreTab = snapshot.tab || "acp-chat";
      const drained =
        restoreTab === "skillrunner"
          ? await waitAcpRuntimeReplayWorkspaceReadiness({
              tab: restoreTab,
              inspect: () =>
                inspectAssistantWorkspaceDiagnosticsPublication({
                  tab: restoreTab,
                }),
            })
          : await drainTab({
              tab: restoreTab,
              ...(restoreTab === "acp-chat" &&
              snapshot.chatBackendId &&
              snapshot.chatConversationId
                ? {
                    expectedChatOwner: {
                      backendId: snapshot.chatBackendId,
                      conversationId: snapshot.chatConversationId,
                    },
                  }
                : {}),
              ...(restoreTab === "acp-skills" && snapshot.skillRequestId
                ? { expectedSkillRequestId: snapshot.skillRequestId }
                : {}),
            });
      if (!drained.ok) {
        throw new Error(drained.detail || "workspace-restore-drain-failed");
      }
    },
  };
}
