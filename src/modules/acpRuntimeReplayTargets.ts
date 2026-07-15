import type {
  RequestPermissionOutcome,
  SessionNotification,
} from "./acpProtocol";
import type { AcpPendingPermissionRequest } from "./acpTypes";
import type {
  AcpRuntimeReplayApplyContext,
  AcpRuntimeReplayTarget,
} from "./acpRuntimeReplayProfiler";
import type {
  AcpRuntimeTraceOwner,
  AcpRuntimeTraceSourceKind,
} from "./acpRuntimeSemanticTrace";
import {
  applySyntheticAcpChatReplayPermission,
  applySyntheticAcpChatReplayPrompt,
  applySyntheticAcpChatReplaySessionUpdate,
  activateSyntheticAcpChatReplay,
  cleanupSyntheticAcpChatReplay,
  drainSyntheticAcpChatReplay,
  prepareSyntheticAcpChatReplay,
} from "./acpSessionManager";
import type { SyntheticAcpChatReplayActivationLease } from "./acpSessionManager";
import {
  applySyntheticAcpSkillRunReplayPermission,
  cleanupSyntheticAcpSkillRunReplay,
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

function workflowRequestId(owner: AcpRuntimeTraceOwner) {
  return owner.requestId || `${owner.rootId}-request`;
}

export async function createAcpChatRuntimeReplayTarget(args: {
  syntheticRootId: string;
}): Promise<AcpRuntimeReplayTarget> {
  const identity = createAcpRuntimeReplayOwnerIdentity(args.syntheticRootId);
  const { backendId, conversationId } = identity.chat;
  let activationLease: SyntheticAcpChatReplayActivationLease | undefined;
  let cleaned = false;
  prepareSyntheticAcpChatReplay({ backendId, conversationId });
  return {
    sourceKind: "acp-chat-conversation",
    syntheticRootId: args.syntheticRootId,
    activate: async () => {
      activationLease ||= await activateSyntheticAcpChatReplay({
        backendId,
        conversationId,
      });
    },
    apply: async (context) => {
      switch (context.event.kind) {
        case "root-start":
        case "root-end":
        case "turn-end":
        case "diagnostic":
        case "connection-close":
          return "consumed-noop";
        case "turn-start": {
          const payload = context.event.payload as { message?: unknown };
          applySyntheticAcpChatReplayPrompt({
            backendId,
            conversationId,
            message: String(payload?.message || ""),
          });
          return "applied";
        }
        case "session-notification": {
          const event = mappedSessionNotification(context);
          prepareSyntheticAcpChatReplay({
            backendId,
            conversationId,
            sessionId: event.sessionId,
          });
          applySyntheticAcpChatReplaySessionUpdate({
            backendId,
            conversationId,
            event,
          });
          return "applied";
        }
        case "permission-request":
          applySyntheticAcpChatReplayPermission({
            backendId,
            conversationId,
            request: pendingPermission(context.event.payload),
          });
          return "applied";
        case "permission-outcome":
        case "terminal":
          applySyntheticAcpChatReplayPermission({
            backendId,
            conversationId,
            request: null,
          });
          return "applied";
        case "request-start":
        case "request-end":
          return "unknown";
      }
    },
    drain: async () => {
      await drainSyntheticAcpChatReplay({ backendId, conversationId });
      return { ok: true };
    },
    cleanup: async () => {
      if (cleaned) return;
      cleaned = true;
      let firstError: unknown;
      try {
        await activationLease?.release();
      } catch (error) {
        firstError = error;
      }
      try {
        await cleanupSyntheticAcpChatReplay({ backendId, conversationId });
      } catch (error) {
        firstError ||= error;
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
    const requestId = workflowRequestId(owner);
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
        case "root-end":
        case "turn-start":
        case "turn-end":
        case "diagnostic":
        case "connection-close":
          return "consumed-noop";
        case "request-start":
          ensureRequest(context.owner);
          return "applied";
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
