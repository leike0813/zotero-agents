import type { BackendInstance } from "../backends/types";
import type {
  RequestPermissionOutcome,
  SessionNotification,
} from "./acpProtocol";
import type {
  AcpDiagnosticsEntry,
  AcpPendingPermissionRequest,
} from "./acpTypes";
import type {
  AcpRuntimeReplayApplyContext,
  AcpRuntimeReplayTarget,
} from "./acpRuntimeReplayProfiler";
import type {
  AcpRuntimeTraceOwner,
  AcpRuntimeTraceSourceKind,
} from "./acpRuntimeSemanticTrace";
import {
  connectAcpConversation,
  deleteActiveAcpConversation,
  disconnectAcpConversation,
  flushPendingChatTranscriptWrites,
  getActiveAcpChatOwner,
  refreshAcpConversationBackends,
  registerAcpConnectionAdapterFactory,
  resolveAcpConversationPermission,
  setActiveAcpBackend,
  setActiveAcpConversation,
  unregisterAcpConnectionAdapterFactory,
} from "./acpSessionManager";
import {
  createAcpSyntheticConnectionAdapter,
  type AcpSyntheticConnectionAdapter,
} from "./acpSyntheticConnectionAdapter";
import {
  applySyntheticAcpSkillRunReplayPermission,
  cleanupSyntheticAcpSkillRunReplay,
  completeAcpSkillRunTranscriptTurnBoundary,
  flushAcpSkillRunRuntimeFileWrites,
  getSelectedAcpSkillRunRequestId,
  prepareSyntheticAcpSkillRunReplay,
  recordAcpSkillRunSessionUpdate,
  selectAcpSkillRun,
  upsertAcpSkillRun,
} from "./acpSkillRunStore";
import { createAcpRuntimeReplayOwnerIdentity } from "./acpRuntimeReplayIdentity";

function pendingPermission(payload: unknown): AcpPendingPermissionRequest {
  const request = payload as AcpPendingPermissionRequest;
  return {
    ...request,
    options: Array.isArray(request?.options) ? request.options : [],
    resolve: (_outcome: RequestPermissionOutcome) => undefined,
  } as AcpPendingPermissionRequest;
}

function mappedSessionNotification(
  context: AcpRuntimeReplayApplyContext,
): SessionNotification {
  const notification = context.event.payload as SessionNotification;
  return {
    ...notification,
    sessionId: context.owner.sessionId || notification.sessionId,
    update: { ...notification.update },
  };
}

type SyntheticChatLeaseState = {
  token: number;
  backendId: string;
  conversationId: string;
  previous: { backendId: string; conversationId: string };
};

let syntheticChatLeaseNonce = 0;
let activeSyntheticChatLease: SyntheticChatLeaseState | undefined;

export async function createAcpChatRuntimeReplayTarget(args: {
  syntheticRootId: string;
}): Promise<AcpRuntimeReplayTarget> {
  const identity = createAcpRuntimeReplayOwnerIdentity(args.syntheticRootId);
  const { backendId, conversationId, sessionId } = identity.chat;
  const backend: BackendInstance = {
    id: backendId,
    type: "acp",
    displayName: backendId,
    baseUrl: "",
  };
  let adapter: AcpSyntheticConnectionAdapter | undefined;
  let activated = false;
  let prepared = false;
  let cleaned = false;
  let leaseToken: number | undefined;

  registerAcpConnectionAdapterFactory({
    backend,
    conversationId,
    factory: async () => {
      adapter = createAcpSyntheticConnectionAdapter({
        backendId,
        conversationId,
        sessionId,
      });
      return adapter;
    },
  });

  await connectAcpConversation({ backendId, conversationId });
  if (!adapter) {
    throw new Error("Synthetic ACP Chat adapter was not created");
  }
  prepared = true;

  const ensureSyntheticSession = async () => {
    if (!adapter) {
      throw new Error("Synthetic ACP Chat adapter is unavailable");
    }
    return adapter;
  };

  return {
    sourceKind: "acp-chat-conversation",
    syntheticRootId: args.syntheticRootId,
    activate: async () => {
      if (activated) return;
      const previous = activeSyntheticChatLease?.previous || {
        backendId: getActiveAcpChatOwner().backendId,
        conversationId: getActiveAcpChatOwner().conversationId,
      };
      await setActiveAcpBackend({ backendId });
      await setActiveAcpConversation({ backendId, conversationId });
      await connectAcpConversation({ backendId, conversationId });
      if (!adapter) {
        throw new Error("Synthetic ACP Chat adapter was not created");
      }
      syntheticChatLeaseNonce += 1;
      leaseToken = syntheticChatLeaseNonce;
      activeSyntheticChatLease = {
        token: leaseToken,
        backendId,
        conversationId,
        previous,
      };
      prepared = true;
      activated = true;
    },
    apply: async (context) => {
      const currentAdapter = await ensureSyntheticSession();
      switch (context.event.kind) {
        case "root-start":
        case "root-end":
        case "turn-end":
        case "connection-close":
          return "consumed-noop";
        case "diagnostic":
          currentAdapter.emitDiagnostic(
            context.event.payload as AcpDiagnosticsEntry,
          );
          return "applied";
        case "turn-start": {
          const payload = context.event.payload as { message?: unknown };
          currentAdapter.emitSessionNotification({
            sessionId,
            update: {
              sessionUpdate: "user_message_chunk",
              content: {
                type: "text",
                text: String(payload?.message || ""),
              },
            },
          });
          return "applied";
        }
        case "session-notification": {
          currentAdapter.emitSessionNotification(
            mappedSessionNotification(context),
          );
          return "applied";
        }
        case "permission-request":
          currentAdapter.emitPermissionRequest(
            pendingPermission(context.event.payload),
          );
          return "applied";
        case "permission-outcome": {
          const outcome = (context.event.payload || {
            outcome: "cancelled",
          }) as RequestPermissionOutcome;
          await resolveAcpConversationPermission({
            backendId,
            conversationId,
            outcome: outcome.outcome === "selected" ? "selected" : "cancelled",
            optionId: outcome.outcome === "selected" ? outcome.optionId : "",
          });
          return "applied";
        }
        case "terminal":
          await resolveAcpConversationPermission({
            backendId,
            conversationId,
            outcome: "cancelled",
          });
          return "applied";
        case "request-start":
        case "request-end":
          return "unknown";
      }
    },
    drain: async () => {
      await flushPendingChatTranscriptWrites();
      return { ok: true };
    },
    cleanup: async () => {
      if (cleaned) return;
      cleaned = true;
      let firstError: unknown;
      const ownsLease =
        activated &&
        leaseToken !== undefined &&
        activeSyntheticChatLease?.token === leaseToken;
      const previousOwner = activeSyntheticChatLease?.previous;
      try {
        if (prepared) {
          await disconnectAcpConversation({ backendId, conversationId });
        }
      } catch (error) {
        firstError = error;
      }
      try {
        if (prepared) {
          await deleteActiveAcpConversation({ backendId, conversationId });
        }
      } catch (error) {
        firstError ||= error;
      }
      unregisterAcpConnectionAdapterFactory(backendId, conversationId);
      if (ownsLease) {
        activeSyntheticChatLease = undefined;
        try {
          if (previousOwner?.backendId) {
            await setActiveAcpBackend({ backendId: previousOwner.backendId });
            if (previousOwner.conversationId) {
              await setActiveAcpConversation({
                backendId: previousOwner.backendId,
                conversationId: previousOwner.conversationId,
              });
            }
          } else {
            await refreshAcpConversationBackends();
          }
        } catch (error) {
          firstError ||= error;
        }
      }
      if (firstError) throw firstError;
    },
  };
}

export async function createAcpWorkflowRuntimeReplayTarget(args: {
  syntheticRootId: string;
}): Promise<AcpRuntimeReplayTarget> {
  const identity = createAcpRuntimeReplayOwnerIdentity(args.syntheticRootId);
  const requestIds = new Set<string>();
  let previousRequestId: string | undefined;
  let activated = false;
  let cleaned = false;
  const ensureRequest = (owner: AcpRuntimeTraceOwner) => {
    const requestId = identity.workflow.requestId;
    if (!requestIds.has(requestId)) {
      prepareSyntheticAcpSkillRunReplay({
        requestId,
        workflowId: owner.workflowId,
        workflowRunId: owner.workflowRunId,
        jobId: owner.jobId,
        stageId: owner.stageId,
      });
      requestIds.add(requestId);
    }
    return requestId;
  };
  return {
    sourceKind: "acp-workflow-execution",
    syntheticRootId: args.syntheticRootId,
    activate: async () => {
      if (activated) return;
      previousRequestId = getSelectedAcpSkillRunRequestId();
      prepareSyntheticAcpSkillRunReplay({
        requestId: identity.workflow.requestId,
      });
      requestIds.add(identity.workflow.requestId);
      await selectAcpSkillRun(identity.workflow.requestId);
      activated = true;
    },
    apply: async (context) => {
      switch (context.event.kind) {
        case "root-start":
        case "turn-start":
        case "turn-end":
        case "diagnostic":
        case "connection-close":
          return "consumed-noop";
        case "root-end":
          completeAcpSkillRunTranscriptTurnBoundary(
            identity.workflow.requestId,
          );
          return "consumed-noop";
        case "request-start": {
          const requestId = ensureRequest(context.owner);
          completeAcpSkillRunTranscriptTurnBoundary(requestId);
          return "applied";
        }
        case "session-notification":
          recordAcpSkillRunSessionUpdate(
            ensureRequest(context.owner),
            mappedSessionNotification(context),
          );
          return "applied";
        case "permission-request":
          applySyntheticAcpSkillRunReplayPermission({
            requestId: ensureRequest(context.owner),
            request: pendingPermission(context.event.payload),
          });
          return "applied";
        case "permission-outcome":
          applySyntheticAcpSkillRunReplayPermission({
            requestId: ensureRequest(context.owner),
            request: null,
          });
          return "applied";
        case "request-end":
        case "terminal": {
          const requestId = ensureRequest(context.owner);
          completeAcpSkillRunTranscriptTurnBoundary(requestId);
          const status = String(
            (context.event.payload as { status?: unknown })?.status || "",
          );
          const terminalStatus =
            status === "canceled"
              ? "canceled"
              : status === "failed"
                ? "failed"
                : "succeeded";
          upsertAcpSkillRun({
            requestId,
            status: terminalStatus,
            statusReason:
              terminalStatus === "succeeded"
                ? "validation_succeeded"
                : terminalStatus === "canceled"
                  ? "cancel_task"
                  : "prompt_failed_terminal",
            activePrompt: false,
            pendingPermission: null,
          });
          return "applied";
        }
      }
    },
    drain: async () => {
      await flushAcpSkillRunRuntimeFileWrites();
      return { ok: true };
    },
    cleanup: async () => {
      if (cleaned) return;
      cleaned = true;
      let firstError: unknown;
      try {
        if (
          activated &&
          getSelectedAcpSkillRunRequestId() === identity.workflow.requestId
        ) {
          await selectAcpSkillRun(previousRequestId || "");
        }
      } catch (error) {
        firstError = error;
      }
      try {
        await cleanupSyntheticAcpSkillRunReplay(Array.from(requestIds));
      } catch (error) {
        firstError ||= error;
      }
      if (firstError) throw firstError;
    },
  };
}

export async function createAcpRuntimeReplayTarget(args: {
  sourceKind: AcpRuntimeTraceSourceKind;
  syntheticRootId: string;
}) {
  return args.sourceKind === "acp-chat-conversation"
    ? createAcpChatRuntimeReplayTarget(args)
    : createAcpWorkflowRuntimeReplayTarget(args);
}
