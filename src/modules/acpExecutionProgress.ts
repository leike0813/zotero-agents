import { classifyAcpTranscriptSemanticUpdate } from "./acpTranscriptBoundary";
import {
  beginAssistantMessageCountExecution,
  cloneAssistantMessageCounts,
  createAssistantMessageCounts,
  finishAssistantMessageCountExecution,
  incrementAssistantMessageCount,
  normalizeAssistantMessageCounts,
  type AssistantMessageCountKind,
  type AssistantMessageCountsSnapshot,
} from "./assistantMessageCounts";

export type AcpExecutionProgressState = AssistantMessageCountsSnapshot & {
  openSegment: Exclude<AssistantMessageCountKind, "tool"> | null;
};

export type AcpExecutionProgressChange = {
  countChanged: boolean;
  segmentClosed: boolean;
};

export type AcpExecutionProgressResetOptions = {
  promoteUnavailableToComplete?: boolean;
};

export type AcpExecutionProgressRestoreOptions = {
  missingCompleteness?: AssistantMessageCountsSnapshot["completeness"];
};

const states = new Map<string, AcpExecutionProgressState>();

function emptyChange(): AcpExecutionProgressChange {
  return {
    countChanged: false,
    segmentClosed: false,
  };
}

function createState(scopeKey: string): AcpExecutionProgressState {
  return {
    ...createAssistantMessageCounts(scopeKey),
    openSegment: null,
  };
}

function getOrCreateState(scopeKeyRaw: string) {
  const scopeKey = String(scopeKeyRaw || "");
  let state = states.get(scopeKey);
  if (!state) {
    state = createState(scopeKey);
    states.set(scopeKey, state);
  }
  return state;
}

function closeSegment(state: AcpExecutionProgressState) {
  const wasOpen = state.openSegment !== null;
  state.openSegment = null;
  return wasOpen;
}

export function resetAcpExecutionProgress(
  scopeKeyRaw: string,
  options: AcpExecutionProgressResetOptions = {},
) {
  const scopeKey = String(scopeKeyRaw || "");
  const state = getOrCreateState(scopeKey);
  beginAssistantMessageCountExecution(state, "", options);
  state.openSegment = null;
  states.set(scopeKey, state);
  return snapshotAcpExecutionProgress(scopeKey)!;
}

export function restoreAcpExecutionProgress(
  scopeKeyRaw: string,
  value: unknown,
  options: AcpExecutionProgressRestoreOptions = {},
) {
  const scopeKey = String(scopeKeyRaw || "");
  const restored = normalizeAssistantMessageCounts(value, scopeKey);
  const state: AcpExecutionProgressState = {
    ...(restored ||
      createAssistantMessageCounts(
        scopeKey,
        options.missingCompleteness || "unavailable",
      )),
    openSegment: null,
  };
  states.set(scopeKey, state);
  return snapshotAcpExecutionProgress(scopeKey)!;
}

export function finishAcpExecutionProgress(scopeKeyRaw: string) {
  const state = states.get(String(scopeKeyRaw || ""));
  if (!state) {
    return undefined;
  }
  closeSegment(state);
  finishAssistantMessageCountExecution(state);
  return snapshotAcpExecutionProgress(state.scopeKey);
}

export function updateAcpExecutionProgress(
  scopeKeyRaw: string,
  update: { sessionUpdate?: unknown; content?: unknown },
): AcpExecutionProgressChange {
  const state = getOrCreateState(scopeKeyRaw);
  const semanticKind = classifyAcpTranscriptSemanticUpdate(
    update.sessionUpdate,
  );
  if (
    semanticKind === "assistant-message" ||
    semanticKind === "assistant-thought"
  ) {
    const content = update.content as
      | { type?: unknown; text?: unknown }
      | undefined;
    if (String(content?.type || "") !== "text") {
      return semanticKind === "assistant-thought"
        ? {
            countChanged: false,
            segmentClosed: closeSegment(state),
          }
        : emptyChange();
    }
    const chunk = String(content?.text || "");
    if (!chunk) {
      return semanticKind === "assistant-thought"
        ? {
            countChanged: false,
            segmentClosed: closeSegment(state),
          }
        : emptyChange();
    }
    const segmentKind =
      semanticKind === "assistant-message" ? "assistant" : "thought";
    const previousSegment = state.openSegment;
    const countChanged = previousSegment !== segmentKind;
    if (countChanged) {
      state.openSegment = segmentKind;
      incrementAssistantMessageCount(state, segmentKind);
    }
    return {
      countChanged,
      segmentClosed: previousSegment !== null && countChanged,
    };
  }
  if (semanticKind === "soft-side-channel") {
    return emptyChange();
  }
  if (semanticKind === "terminal-boundary") {
    return {
      countChanged: false,
      segmentClosed: closeSegment(state),
    };
  }
  const segmentClosed = closeSegment(state);
  if (semanticKind === "tool-boundary") {
    incrementAssistantMessageCount(state, "tool");
    return {
      countChanged: true,
      segmentClosed,
    };
  }
  return {
    countChanged: false,
    segmentClosed,
  };
}

export function snapshotAcpExecutionProgress(scopeKeyRaw: string) {
  const state = states.get(String(scopeKeyRaw || ""));
  return state
    ? {
        ...cloneAssistantMessageCounts(state),
        openSegment: state.openSegment,
      }
    : undefined;
}

export function snapshotAcpMessageCounts(scopeKeyRaw: string) {
  const state = states.get(String(scopeKeyRaw || ""));
  return state ? cloneAssistantMessageCounts(state) : undefined;
}

export function releaseAcpExecutionProgress(scopeKeyRaw: string) {
  states.delete(String(scopeKeyRaw || ""));
}

export function resetAllAcpExecutionProgressForTests() {
  states.clear();
}
