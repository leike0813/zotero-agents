import {
  cancelAcpSkillRunPermissionQueue,
  getAcpSkillRunRecord,
  getAcpSkillRunRecoveryHandler,
  runtimeCatalogForRun,
  upsertAcpSkillRun,
  type AcpSkillRunController,
  type AcpSkillRunRecord,
  type AcpSkillRunRecoveryState,
} from "./acpSkillRunStore";
import { workflowSubmissionQueue } from "../jobQueue/workflowSubmissionQueue";
import { waitForPromiseSettlement } from "../utils/wait";
import { appendRuntimeLog } from "./runtimeLogManager";
import {
  parseAcpEffortFromModelText,
  resolveAcpRawModelIdForSelection,
  type AcpSelectableOption,
} from "./acpModelOptionFolding";
import { flushAcpSkillRunRuntimeFileWrites } from "./acpSkillRunPersistence";
import { hydrateAcpSkillRunTranscriptMirror } from "./acpSkillRunTranscriptMirror";
import {
  registerAcpSkillRunController,
  unregisterAcpSkillRunController,
  unregisterAcpSkillRunSetupController,
} from "./acpSkillRunControllerRegistry";
import { updateAcpSkillRunRuntimeSelection } from "./acpSkillRunRuntimeCatalog";
import {
  acpSkillRunApplyResultControllerDetachPromises as applyResultControllerDetachPromises,
  acpSkillRunControllerPurposes as controllerPurposes,
  acpSkillRunControllers as controllers,
  acpSkillRunSetupControllers as setupControllers,
  normalizeString,
  nowIso,
} from "./acpSkillRunState";
import {
  isEligibleForPostTerminalAcpSkillRunConversation,
  isTerminalAcpSkillRunStatus,
} from "./acpSkillRunStatus";

const ACP_SKILL_RUN_SHUTDOWN_DETACH_TIMEOUT_MS = 2_000;
const ACP_SKILL_RUN_SHUTDOWN_FLUSH_TIMEOUT_MS = 750;

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error || "unknown");
}

async function waitForAcpSkillRunShutdownTask(
  task: Promise<unknown>,
  timeoutMs = ACP_SKILL_RUN_SHUTDOWN_DETACH_TIMEOUT_MS,
) {
  if (timeoutMs <= 0) {
    return { timedOut: true as const };
  }
  const result = await waitForPromiseSettlement(task, {
    phase: "acp-skill-run-cleanup",
    timeoutMs,
  });
  if (result.status === "timed-out") {
    return { timedOut: true as const };
  }
  if (result.status === "rejected") {
    return { timedOut: false as const, error: result.error };
  }
  return { timedOut: false as const };
}

async function flushAcpSkillRunRuntimeFileWritesDuringShutdown() {
  const result = await waitForAcpSkillRunShutdownTask(
    flushAcpSkillRunRuntimeFileWrites(),
    ACP_SKILL_RUN_SHUTDOWN_FLUSH_TIMEOUT_MS,
  );
  const flushError = "error" in result ? result.error : null;
  if (!result.timedOut && !flushError) {
    return;
  }
  appendRuntimeLog({
    level: "warn",
    scope: "system",
    component: "acp-skill-run-store",
    operation: "shutdown-runtime-file-flush",
    stage: result.timedOut
      ? "runtime-file-flush-timeout"
      : "runtime-file-flush-error",
    message: result.timedOut
      ? "ACP skill run runtime file flush timed out during shutdown."
      : "ACP skill run runtime file flush failed during shutdown.",
    details: {
      timeoutMs: result.timedOut
        ? ACP_SKILL_RUN_SHUTDOWN_FLUSH_TIMEOUT_MS
        : undefined,
      error: flushError ? errorText(flushError) : undefined,
    },
  });
}

function getAcpSkillRunSlotCoordinator(requestId: string) {
  const submissionUnitId = getAcpSkillRunRecord(requestId)?.submissionUnitId;
  return submissionUnitId
    ? workflowSubmissionQueue.getSlotCoordinator(submissionUnitId)
    : null;
}

export async function cancelAcpSkillRun(requestIdRaw: string) {
  const requestId = normalizeString(requestIdRaw);
  if (!requestId) {
    throw new Error("requestId is required");
  }
  getAcpSkillRunSlotCoordinator(requestId)?.cancelPendingResumption();
  cancelAcpSkillRunPermissionQueue(
    requestId,
    "run_cancelled_with_pending_permission",
  );
  const controller = controllers.get(requestId);
  const setupController = setupControllers.get(requestId);
  const existing = getAcpSkillRunRecord(requestId);
  if (!existing) {
    throw new Error("No ACP skill run record is available for cancellation.");
  }
  if (isTerminalAcpSkillRunStatus(existing.status)) {
    return;
  }
  upsertAcpSkillRun({
    requestId,
    status: "canceled",
    statusReason: "cancel_task",
    activePrompt: false,
    conversationState: "ended",
    conversationRecoveryState: "unavailable",
    connectionActionState: "idle",
    removedAt: nowIso(),
    event: {
      stage: "canceled",
      message: "ACP skill run cancellation requested.",
      level: "warn",
    },
  });
  const cleanupTask = setupController?.cancel() || controller?.cancel();
  if (!cleanupTask) {
    return;
  }
  const cleanup = await waitForAcpSkillRunShutdownTask(cleanupTask);
  if (controller) {
    unregisterAcpSkillRunController(requestId, controller);
  }
  if (!cleanup.timedOut && !("error" in cleanup)) {
    return;
  }
  upsertAcpSkillRun({
    requestId,
    event: {
      stage: cleanup.timedOut
        ? "cancel-cleanup-timeout"
        : "cancel-cleanup-error",
      message: cleanup.timedOut
        ? "ACP skill run cleanup exceeded the local detach timeout."
        : "ACP skill run cleanup failed after terminal cancellation.",
      level: "warn",
      details: {
        timeoutMs: cleanup.timedOut
          ? ACP_SKILL_RUN_SHUTDOWN_DETACH_TIMEOUT_MS
          : undefined,
        error:
          "error" in cleanup && cleanup.error
            ? errorText(cleanup.error)
            : undefined,
      },
    },
  });
}

export async function interruptAcpSkillRunCurrentTurn(requestIdRaw: string) {
  const requestId = normalizeString(requestIdRaw);
  if (!requestId) {
    throw new Error("requestId is required");
  }
  const existing = getAcpSkillRunRecord(requestId);
  if (
    existing &&
    isTerminalAcpSkillRunStatus(existing.status) &&
    controllerPurposes.get(requestId) !== "post-terminal-conversation"
  ) {
    throw new Error("Terminal ACP skill runs cannot be interrupted.");
  }
  if (existing && !isAcpSkillRunPromptActive(existing)) {
    upsertAcpSkillRun({
      requestId,
      event: {
        stage: "interrupt-ignored",
        message:
          "ACP skill run current turn interruption ignored because no active prompt turn exists.",
        level: "warn",
        details: {
          activePrompt: existing.activePrompt === true,
          replyState: existing.replyState,
          conversationRecoveryState: existing.conversationRecoveryState,
        },
      },
    });
    return;
  }
  const controller = controllers.get(requestId);
  if (!controller) {
    throw new Error(
      "No active ACP skill run controller is available for interruption.",
    );
  }
  if (controller.interruptTurn) {
    await controller.interruptTurn();
  } else {
    await controller.cancel();
  }
}

export function archiveAcpSkillRun(requestIdRaw: string) {
  const requestId = normalizeString(requestIdRaw);
  if (!requestId) {
    throw new Error("requestId is required");
  }
  const existing = getAcpSkillRunRecord(requestId);
  if (!existing) {
    throw new Error("No ACP skill run record is available for archive.");
  }
  if (
    existing.status !== "succeeded" &&
    existing.status !== "failed" &&
    existing.status !== "canceled"
  ) {
    throw new Error("Only terminal ACP skill runs can be archived.");
  }
  if (
    controllers.has(requestId) ||
    existing.activePrompt ||
    existing.replyState === "submitted" ||
    existing.replyState === "accepted" ||
    existing.connectionActionState === "connecting" ||
    existing.connectionActionState === "disconnecting" ||
    existing.conversationRecoveryState === "connecting" ||
    existing.conversationRecoveryState === "connected"
  ) {
    throw new Error(
      "Disconnect the ACP skill run conversation before archiving it.",
    );
  }
  const archivedAt = nowIso();
  upsertAcpSkillRun({
    requestId,
    archivedAt,
    removedAt: archivedAt,
    event: {
      stage: "archived",
      message: "ACP skill run archived from the panel.",
      level: "info",
    },
  });
}

export async function replyAcpSkillRun(args: {
  requestId: string;
  message?: string;
  displayMessage?: string;
  promptMessage?: string;
}) {
  const requestId = normalizeString(args.requestId);
  const displayMessage = String(
    args.displayMessage ?? args.message ?? args.promptMessage ?? "",
  ).trim();
  const promptMessage = String(
    args.promptMessage ?? args.message ?? args.displayMessage ?? "",
  ).trim();
  if (!requestId) {
    throw new Error("requestId is required");
  }
  if (!displayMessage || !promptMessage) {
    throw new Error("reply message is required");
  }
  const existing = getAcpSkillRunRecord(requestId);
  if (!existing) {
    throw new Error("No ACP skill run record is available for reply.");
  }
  const terminalConversation =
    isEligibleForPostTerminalAcpSkillRunConversation(existing);
  if (isTerminalAcpSkillRunStatus(existing.status) && !terminalConversation) {
    throw new Error("Terminal ACP skill run conversation is not recoverable.");
  }
  if (
    !terminalConversation &&
    existing.status !== "waiting_user" &&
    existing.status !== "failed_retriable"
  ) {
    throw new Error(
      "ACP skill run replies are only accepted for waiting or recoverable failed runs.",
    );
  }
  if (
    terminalConversation &&
    (!controllers.has(requestId) ||
      controllerPurposes.get(requestId) !== "post-terminal-conversation")
  ) {
    throw new Error(
      "Connect the terminal ACP skill run conversation before replying.",
    );
  }
  upsertAcpSkillRun({
    requestId,
    replyState: "submitted",
    replyError: "",
    conversationError: "",
    lastRecoveryError: "",
    error: terminalConversation ? existing.error : "",
    event: {
      stage: "reply-submitted",
      message: "User reply submitted.",
      level: "info",
    },
  });
  const slot = terminalConversation
    ? null
    : getAcpSkillRunSlotCoordinator(requestId);
  if (slot && !(await slot.ensureSlot("user-reply"))) {
    const detail = "ACP skill reply admission was canceled before send.";
    upsertAcpSkillRun({
      requestId,
      replyState: "rejected",
      replyError: detail,
      event: {
        stage: "reply-rejected",
        message: detail,
        level: "error",
      },
    });
    throw new Error(detail);
  }
  let controller = controllers.get(requestId);
  const recoveryHandler = getAcpSkillRunRecoveryHandler();
  if (
    !terminalConversation &&
    !controller?.reply &&
    !controller?.replyRequest &&
    recoveryHandler
  ) {
    try {
      await recoveryHandler({ requestId, reason: "reply" });
      controller = controllers.get(requestId);
    } catch (error) {
      const detail =
        error instanceof Error
          ? error.message
          : String(error || "unknown error");
      upsertAcpSkillRun({
        requestId,
        replyState: "rejected",
        replyError: detail,
        conversationRecoveryState: "failed",
        lastRecoveryError: detail,
        event: {
          stage: "reply-rejected",
          message: `Reply failed during session recovery: ${detail}`,
          level: "error",
        },
      });
      throw error;
    }
  }
  if (!controller?.reply && !controller?.replyRequest) {
    upsertAcpSkillRun({
      requestId,
      conversationState: "closed",
      conversationRecoveryState: "available",
      conversationError: "No active ACP conversation controller is available.",
      replyState: "rejected",
      replyError: "No active ACP conversation controller is available.",
      event: {
        stage: "reply-unavailable",
        message:
          "Reply failed because no active ACP conversation controller was available.",
        level: "error",
      },
    });
    throw new Error("No active ACP conversation controller is available.");
  }
  await hydrateAcpSkillRunTranscriptMirror(requestId);
  upsertAcpSkillRun({
    requestId,
    replyState: "accepted",
    conversationState: "active",
    conversationRecoveryState: "connected",
    replyError: "",
    conversationError: "",
    lastRecoveryError: "",
    error: terminalConversation ? existing.error : "",
    event: {
      stage: "reply-accepted",
      message: "User reply accepted by ACP skill run controller.",
      level: "info",
    },
  });
  try {
    if (controller.replyRequest) {
      await controller.replyRequest({ displayMessage, promptMessage });
    } else {
      await controller.reply?.(promptMessage);
    }
    upsertAcpSkillRun({
      requestId,
      replyState: "idle",
    });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : String(error || "unknown error");
    upsertAcpSkillRun({
      requestId,
      replyState: "rejected",
      replyError: detail,
      conversationError: terminalConversation ? detail : undefined,
      event: {
        stage: "reply-rejected",
        message: detail,
        level: "error",
      },
    });
    throw error;
  }
}

export function isAcpSkillRunPromptActive(
  run: Pick<AcpSkillRunRecord, "activePrompt" | "replyState">,
) {
  return (
    run.activePrompt === true ||
    run.replyState === "submitted" ||
    run.replyState === "accepted"
  );
}

export function canEditAcpSkillRunModelConfiguration(
  run: Pick<AcpSkillRunRecord, "status" | "activePrompt" | "replyState">,
) {
  return (
    !isAcpSkillRunPromptActive(run) &&
    (run.status === "waiting_user" || run.status === "failed_retriable")
  );
}

function requireRuntimeController(
  requestId: string,
  operation: "setMode" | "setModel",
) {
  const controller = controllers.get(requestId);
  if (!controller || typeof controller[operation] !== "function") {
    throw new Error(
      "No active ACP skill run controller is available for runtime option changes.",
    );
  }
  return controller as AcpSkillRunController &
    Required<Pick<AcpSkillRunController, typeof operation>>;
}

function resolveEffortIdFromRawModel(
  rawModelId: string,
  modelOptions: AcpSelectableOption[],
  fallback: string,
) {
  const option = modelOptions.find((entry) => entry.id === rawModelId);
  const parsed =
    parseAcpEffortFromModelText(option?.id || rawModelId) ||
    parseAcpEffortFromModelText(option?.label || "");
  return normalizeString(parsed?.effortId) || fallback;
}

export async function setAcpSkillRunMode(args: {
  requestId: string;
  modeId: string;
}) {
  const requestId = normalizeString(args.requestId);
  const modeId = normalizeString(args.modeId);
  if (!requestId || !modeId) {
    return;
  }
  const run = getAcpSkillRunRecord(requestId);
  const sessionId = normalizeString(run?.sessionId);
  if (!run || !sessionId) {
    throw new Error(
      "No active ACP skill run session is available for mode changes.",
    );
  }
  const runtimeCatalog = runtimeCatalogForRun(run);
  if (!runtimeCatalog.modeOptions.some((entry) => entry.id === modeId)) {
    throw new Error("ACP skill run mode is not available for this session.");
  }
  const controller = requireRuntimeController(requestId, "setMode");
  await controller.setMode({ sessionId, modeId });
  updateAcpSkillRunRuntimeSelection({
    requestId,
    selection: { modeId },
    event: {
      stage: "runtime-mode-updated",
      message: "ACP skill run mode updated.",
      level: "info",
      details: { modeId },
    },
  });
}

export async function setAcpSkillRunModel(args: {
  requestId: string;
  modelId: string;
}) {
  const requestId = normalizeString(args.requestId);
  const modelId = normalizeString(args.modelId);
  if (!requestId || !modelId) {
    return;
  }
  const run = getAcpSkillRunRecord(requestId);
  const sessionId = normalizeString(run?.sessionId);
  if (!run || !sessionId) {
    throw new Error(
      "No active ACP skill run session is available for model changes.",
    );
  }
  if (!canEditAcpSkillRunModelConfiguration(run)) {
    throw new Error(
      "Cannot change ACP skill run model while model configuration is frozen.",
    );
  }
  const runtimeCatalog = runtimeCatalogForRun(run);
  const displayModelOptions = runtimeCatalog.displayModelOptions.length
    ? runtimeCatalog.displayModelOptions
    : runtimeCatalog.modelOptions;
  if (!displayModelOptions.some((entry) => entry.id === modelId)) {
    throw new Error("ACP skill run model is not available for this session.");
  }
  const rawModelId = resolveAcpRawModelIdForSelection({
    modelOptions: runtimeCatalog.modelOptions,
    displayModelId: modelId,
    effortId: normalizeString(run.acpReasoningEffort),
    currentRawModelId: run.acpRawModelId,
  });
  if (!runtimeCatalog.modelOptions.some((entry) => entry.id === rawModelId)) {
    throw new Error("ACP skill run model is not available for this session.");
  }
  const controller = requireRuntimeController(requestId, "setModel");
  await controller.setModel({ sessionId, modelId: rawModelId });
  const effortId =
    runtimeCatalog.reasoningSource === "model-derived"
      ? resolveEffortIdFromRawModel(
          rawModelId,
          runtimeCatalog.modelOptions,
          normalizeString(run.acpReasoningEffort),
        )
      : normalizeString(run.acpReasoningEffort);
  updateAcpSkillRunRuntimeSelection({
    requestId,
    selection: {
      modelId,
      rawModelId,
      ...(effortId ? { reasoningEffort: effortId } : {}),
    },
    event: {
      stage: "runtime-model-updated",
      message: "ACP skill run model updated.",
      level: "info",
      details: { modelId, rawModelId, reasoningEffort: effortId },
    },
  });
}

export async function setAcpSkillRunReasoningEffort(args: {
  requestId: string;
  effortId: string;
}) {
  const requestId = normalizeString(args.requestId);
  const effortId = normalizeString(args.effortId);
  if (!requestId || !effortId) {
    return;
  }
  const run = getAcpSkillRunRecord(requestId);
  const sessionId = normalizeString(run?.sessionId);
  if (!run || !sessionId) {
    throw new Error(
      "No active ACP skill run session is available for reasoning changes.",
    );
  }
  if (!canEditAcpSkillRunModelConfiguration(run)) {
    throw new Error(
      "Cannot change ACP skill run reasoning effort while model configuration is frozen.",
    );
  }
  const runtimeCatalog = runtimeCatalogForRun(run);
  if (
    !runtimeCatalog.reasoningEffortOptions.some(
      (entry) => entry.id === effortId,
    )
  ) {
    throw new Error(
      "ACP skill run reasoning effort is not available for this session.",
    );
  }
  const displayModelId =
    normalizeString(run.acpModelId) || normalizeString(run.acpRawModelId);
  const rawModelId = displayModelId
    ? resolveAcpRawModelIdForSelection({
        modelOptions: runtimeCatalog.modelOptions,
        displayModelId,
        effortId,
        currentRawModelId: run.acpRawModelId,
      })
    : "";
  if (
    runtimeCatalog.reasoningSource === "model-derived" &&
    !runtimeCatalog.modelOptions.some((entry) => entry.id === rawModelId)
  ) {
    throw new Error("ACP skill run model is not available for this session.");
  }
  const controller = requireRuntimeController(requestId, "setModel");
  if (runtimeCatalog.reasoningSource === "explicit") {
    const applied = await controller.setConfigOption?.({
      sessionId,
      category: "thought_level",
      value: effortId,
    });
    if (applied !== true) {
      throw new Error(
        "ACP skill run reasoning configuration is not available for this session.",
      );
    }
  } else if (runtimeCatalog.reasoningSource === "model-derived" && rawModelId) {
    await controller.setModel({ sessionId, modelId: rawModelId });
  } else {
    throw new Error(
      "No ACP skill run model is available for reasoning changes.",
    );
  }
  updateAcpSkillRunRuntimeSelection({
    requestId,
    selection: {
      modelId: displayModelId,
      ...(rawModelId ? { rawModelId } : {}),
      reasoningEffort: effortId,
    },
    event: {
      stage: "runtime-reasoning-updated",
      message: "ACP skill run reasoning effort updated.",
      level: "info",
      details: {
        modelId: displayModelId,
        rawModelId,
        reasoningEffort: effortId,
      },
    },
  });
}

export async function connectAcpSkillRun(requestIdRaw: string) {
  const requestId = normalizeString(requestIdRaw);
  if (!requestId) {
    throw new Error("requestId is required");
  }
  const existing = getAcpSkillRunRecord(requestId);
  if (!existing) {
    throw new Error("No ACP skill run record is available for connection.");
  }
  const terminalConversation =
    isEligibleForPostTerminalAcpSkillRunConversation(existing);
  if (isTerminalAcpSkillRunStatus(existing.status) && !terminalConversation) {
    throw new Error("Terminal ACP skill run conversation is not recoverable.");
  }
  if (controllers.has(requestId)) {
    if (
      isTerminalAcpSkillRunStatus(existing.status) &&
      controllerPurposes.get(requestId) !== "post-terminal-conversation"
    ) {
      throw new Error(
        "Wait for the workflow controller to detach, then Connect the terminal conversation.",
      );
    }
    upsertAcpSkillRun({
      requestId,
      conversationRecoveryState: "connected",
      connectionActionState: "idle",
      event: {
        stage: "connect-already-active",
        message: "ACP skill run conversation is already connected.",
        level: "info",
      },
    });
    return;
  }
  const recoveryHandler = getAcpSkillRunRecoveryHandler();
  if (!recoveryHandler) {
    const message = "No ACP skill run recovery handler is available.";
    upsertAcpSkillRun({
      requestId,
      conversationRecoveryState: "failed",
      connectionActionState: "idle",
      lastRecoveryError: message,
      event: {
        stage: "connect-unavailable",
        message,
        level: "error",
      },
    });
    throw new Error(message);
  }
  upsertAcpSkillRun({
    requestId,
    connectionActionState: "connecting",
    conversationRecoveryState: "connecting",
    event: {
      stage: "connect-requested",
      message: "ACP skill run session recovery requested.",
      level: "info",
    },
  });
  try {
    const slot = terminalConversation
      ? null
      : getAcpSkillRunSlotCoordinator(requestId);
    if (slot && !(await slot.ensureSlot("retry"))) {
      throw new Error("ACP skill recovery admission was canceled.");
    }
    await recoveryHandler({ requestId, reason: "connect" });
    const recovered = getAcpSkillRunRecord(requestId);
    if (
      recovered &&
      isTerminalAcpSkillRunStatus(recovered.status) &&
      !controllers.has(requestId)
    ) {
      return;
    }
    if (
      !controllers.has(requestId) &&
      recovered?.conversationState === "closed" &&
      recovered?.conversationRecoveryState === "available"
    ) {
      upsertAcpSkillRun({
        requestId,
        connectionActionState: "idle",
      });
      return;
    }
    upsertAcpSkillRun({
      requestId,
      connectionActionState: "idle",
      conversationRecoveryState: "connected",
      event: {
        stage: "connect-succeeded",
        message: "ACP skill run session recovered.",
        level: "info",
      },
    });
  } catch (error) {
    const current = getAcpSkillRunRecord(requestId);
    if (current && isTerminalAcpSkillRunStatus(current.status)) {
      return;
    }
    const detail =
      error instanceof Error ? error.message : String(error || "unknown error");
    upsertAcpSkillRun({
      requestId,
      connectionActionState: "idle",
      conversationRecoveryState: "failed",
      lastRecoveryError: detail,
      event: {
        stage: "connect-failed",
        message: detail,
        level: "error",
      },
    });
    throw error;
  }
}

export async function disconnectAcpSkillRun(requestIdRaw: string) {
  const requestId = normalizeString(requestIdRaw);
  if (!requestId) {
    throw new Error("requestId is required");
  }
  const controller = controllers.get(requestId);
  let disconnectError: unknown = null;
  upsertAcpSkillRun({
    requestId,
    connectionActionState: "disconnecting",
    event: {
      stage: "disconnect-requested",
      message: "ACP skill run local connection detach requested.",
      level: "info",
    },
  });
  try {
    if (controller?.disconnect) {
      const result = await waitForAcpSkillRunShutdownTask(
        controller.disconnect(),
      );
      if (result.timedOut) {
        disconnectError = new Error(
          `ACP skill run disconnect timed out after ${ACP_SKILL_RUN_SHUTDOWN_DETACH_TIMEOUT_MS} ms`,
        );
      } else if ("error" in result) {
        disconnectError = result.error;
      }
    }
  } catch (error) {
    disconnectError = error;
  } finally {
    const currentController = controllers.get(requestId);
    if (controller) {
      if (currentController === controller) {
        unregisterAcpSkillRunController(requestId, controller);
      }
    } else if (!currentController) {
      registerAcpSkillRunController(requestId, null);
    }
  }
  const disconnectErrorMessage = normalizeString(
    disconnectError instanceof Error
      ? disconnectError.message
      : disconnectError,
  );
  upsertAcpSkillRun({
    requestId,
    activePrompt: false,
    connectionActionState: "idle",
    conversationState: "closed",
    conversationRecoveryState: "available",
    event: {
      stage: disconnectError ? "disconnect-detach-error" : "disconnected",
      message: disconnectError
        ? "ACP skill run local controller detach did not complete cleanly; remote session remains recoverable."
        : "ACP skill run local connection detached; remote session remains recoverable.",
      level: disconnectError ? "warn" : "info",
      details: disconnectError
        ? {
            error: disconnectErrorMessage || "unknown error",
          }
        : undefined,
    },
  });
}

export async function endAcpSkillRunSession(requestIdRaw: string) {
  const requestId = normalizeString(requestIdRaw);
  if (!requestId) {
    throw new Error("requestId is required");
  }
  const controller = controllers.get(requestId);
  if (controller?.endSession) {
    await controller.endSession();
  }
  upsertAcpSkillRun({
    requestId,
    activePrompt: false,
    conversationState: "ended",
    conversationRecoveryState: "unavailable",
    connectionActionState: "idle",
    event: {
      stage: "conversation-ended",
      message: "ACP skill run conversation ended.",
      level: "info",
    },
  });
}

function applyResultTerminalRecoveryState(
  requestId: string,
  state: "succeeded" | "failed",
): AcpSkillRunRecoveryState {
  const record = getAcpSkillRunRecord(requestId);
  if (record?.conversationState === "ended") {
    return "unavailable";
  }
  if (state === "succeeded") {
    return "available";
  }
  return normalizeString(record?.sessionId) ? "available" : "unavailable";
}

function finalizeAcpSkillRunApplyResultControllerDetach(args: {
  requestId: string;
  state: "succeeded" | "failed";
  stage: "apply-result-detached" | "apply-result-detach-error";
  level: "info" | "warn";
  error?: unknown;
}) {
  const errorMessage = normalizeString(
    args.error instanceof Error ? args.error.message : args.error,
  );
  upsertAcpSkillRun({
    requestId: args.requestId,
    activePrompt: false,
    conversationState: "closed",
    conversationRecoveryState: applyResultTerminalRecoveryState(
      args.requestId,
      args.state,
    ),
    connectionActionState: "idle",
    event: {
      stage: args.stage,
      message:
        args.stage === "apply-result-detach-error"
          ? "ACP skill run controller detach after workflow apply did not complete cleanly."
          : "ACP skill run controller detached after workflow apply settled.",
      level: args.level,
      details: errorMessage ? { error: errorMessage } : undefined,
    },
  });
}

async function performAcpSkillRunControllerDetachAfterApplyResult(args: {
  requestId: string;
  state: "succeeded" | "failed";
}) {
  const requestId = normalizeString(args.requestId);
  if (!requestId || !getAcpSkillRunRecord(requestId)) {
    return;
  }
  const controller = controllers.get(requestId);
  upsertAcpSkillRun({
    requestId,
    event: {
      stage: "apply-result-detach-started",
      message: "ACP skill run controller detach after workflow apply started.",
      level: "info",
      details: { controllerPresent: Boolean(controller) },
    },
  });
  registerAcpSkillRunController(requestId, null);
  if (!controller?.disconnect) {
    finalizeAcpSkillRunApplyResultControllerDetach({
      requestId,
      state: args.state,
      stage: "apply-result-detached",
      level: "info",
    });
    return;
  }
  try {
    await controller.disconnect();
    finalizeAcpSkillRunApplyResultControllerDetach({
      requestId,
      state: args.state,
      stage: "apply-result-detached",
      level: "info",
    });
  } catch (error) {
    finalizeAcpSkillRunApplyResultControllerDetach({
      requestId,
      state: args.state,
      stage: "apply-result-detach-error",
      level: "warn",
      error,
    });
  }
}

export async function detachAcpSkillRunControllerAfterApplyResult(args: {
  requestId: string;
  state: "succeeded" | "failed";
}) {
  const requestId = normalizeString(args.requestId);
  if (!requestId) {
    return;
  }
  const existing = applyResultControllerDetachPromises.get(requestId);
  if (existing) {
    await existing;
    return;
  }
  const task = performAcpSkillRunControllerDetachAfterApplyResult({
    requestId,
    state: args.state,
  });
  applyResultControllerDetachPromises.set(requestId, task);
  try {
    await task;
  } finally {
    if (applyResultControllerDetachPromises.get(requestId) === task) {
      applyResultControllerDetachPromises.delete(requestId);
    }
  }
}

export function markAcpSkillRunApplyResult(args: {
  requestId?: string;
  state: "pending" | "succeeded" | "failed";
  error?: string;
}) {
  const requestId = normalizeString(args.requestId);
  if (!requestId) {
    return;
  }
  const existing = getAcpSkillRunRecord(requestId);
  if (!existing) {
    return;
  }
  const backendStatus =
    existing.backendStatus ||
    (isTerminalAcpSkillRunStatus(existing.status)
      ? existing.status
      : "succeeded");
  const terminal = isTerminalAcpSkillRunStatus(existing.status);
  const nextStatus =
    args.state === "failed"
      ? "failed"
      : terminal
        ? undefined
        : args.state === "succeeded"
          ? "succeeded"
          : undefined;
  upsertAcpSkillRun({
    requestId,
    status: nextStatus,
    statusReason:
      nextStatus === "failed"
        ? "apply_failed"
        : nextStatus === "succeeded"
          ? "apply_succeeded"
          : undefined,
    backendStatus,
    applyResultState: args.state,
    appliedAt: args.state === "succeeded" ? nowIso() : undefined,
    error: args.state === "failed" ? normalizeString(args.error) : undefined,
    event: {
      stage:
        args.state === "succeeded"
          ? "apply-succeeded"
          : args.state === "failed"
            ? "apply-failed"
            : "apply-pending",
      message:
        args.state === "succeeded"
          ? "Workflow applyResult succeeded."
          : args.state === "failed"
            ? `Workflow applyResult failed: ${normalizeString(args.error) || "unknown error"}`
            : "Workflow applyResult pending.",
      level: args.state === "failed" ? "error" : "info",
    },
  });
}

export async function shutdownAcpSkillRunConversations() {
  const setupEntries = Array.from(setupControllers.entries());
  await Promise.allSettled(
    setupEntries.map(async ([requestId, controller]) => {
      await controller.cancel().catch(() => undefined);
      unregisterAcpSkillRunSetupController(requestId, controller);
    }),
  );
  const entries = Array.from(controllers.entries());
  await Promise.allSettled(
    entries.map(async ([requestId, controller]) => {
      let timedOut = false;
      let disconnectError: unknown = null;
      try {
        if (controller.disconnect) {
          const result = await waitForAcpSkillRunShutdownTask(
            controller.disconnect(),
          );
          timedOut = result.timedOut;
          disconnectError = "error" in result ? result.error : null;
        }
      } catch (error) {
        disconnectError = error;
      }
      registerAcpSkillRunController(requestId, null);
      upsertAcpSkillRun({
        requestId,
        activePrompt: false,
        conversationState: "closed",
        conversationRecoveryState: "available",
        connectionActionState: "idle",
        event: {
          stage: timedOut
            ? "conversation-detach-timeout"
            : disconnectError
              ? "conversation-detach-error"
              : "conversation-detached",
          message:
            timedOut || disconnectError
              ? "ACP skill run local controller detach did not complete cleanly during shutdown; remote session remains recoverable."
              : "ACP skill run local controller detached during shutdown; remote session remains recoverable.",
          level: timedOut || disconnectError ? "warn" : "info",
          details:
            timedOut || disconnectError
              ? {
                  timeoutMs: timedOut
                    ? ACP_SKILL_RUN_SHUTDOWN_DETACH_TIMEOUT_MS
                    : undefined,
                  error: disconnectError
                    ? String(
                        (disconnectError as Error)?.message || disconnectError,
                      )
                    : undefined,
                }
              : undefined,
        },
      });
    }),
  );
  await flushAcpSkillRunRuntimeFileWritesDuringShutdown();
}
