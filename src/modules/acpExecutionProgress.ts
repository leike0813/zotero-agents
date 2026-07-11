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
  terminalCandidateChunks: string[];
};

export type AcpExecutionProgressChange = {
  countChanged: boolean;
  candidateChanged: boolean;
  segmentClosed: boolean;
};

const states = new Map<string, AcpExecutionProgressState>();

function emptyChange(): AcpExecutionProgressChange {
  return {
    countChanged: false,
    candidateChanged: false,
    segmentClosed: false,
  };
}

function createState(scopeKey: string): AcpExecutionProgressState {
  return {
    ...createAssistantMessageCounts(scopeKey),
    openSegment: null,
    terminalCandidateChunks: [],
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

function closeSegment(
  state: AcpExecutionProgressState,
  discardCandidate: boolean,
) {
  const wasOpen = state.openSegment !== null;
  state.openSegment = null;
  if (discardCandidate) {
    state.terminalCandidateChunks = [];
  }
  return wasOpen;
}

export function resetAcpExecutionProgress(scopeKeyRaw: string) {
  const scopeKey = String(scopeKeyRaw || "");
  const state = getOrCreateState(scopeKey);
  beginAssistantMessageCountExecution(state);
  state.openSegment = null;
  state.terminalCandidateChunks = [];
  states.set(scopeKey, state);
  return snapshotAcpExecutionProgress(scopeKey)!;
}

export function restoreAcpExecutionProgress(
  scopeKeyRaw: string,
  value: unknown,
) {
  const scopeKey = String(scopeKeyRaw || "");
  const restored = normalizeAssistantMessageCounts(value, scopeKey);
  const state: AcpExecutionProgressState = {
    ...(restored || createAssistantMessageCounts(scopeKey, "unavailable")),
    openSegment: null,
    terminalCandidateChunks: [],
  };
  states.set(scopeKey, state);
  return snapshotAcpExecutionProgress(scopeKey)!;
}

export function finishAcpExecutionProgress(scopeKeyRaw: string) {
  const state = states.get(String(scopeKeyRaw || ""));
  if (!state) {
    return undefined;
  }
  closeSegment(state, false);
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
            candidateChanged: false,
            segmentClosed: closeSegment(state, true),
          }
        : emptyChange();
    }
    const chunk = String(content?.text || "");
    if (!chunk) {
      return semanticKind === "assistant-thought"
        ? {
            countChanged: false,
            candidateChanged: false,
            segmentClosed: closeSegment(state, true),
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
      if (segmentKind === "assistant") {
        state.terminalCandidateChunks = [];
      } else {
        state.terminalCandidateChunks = [];
      }
    }
    if (segmentKind === "assistant") {
      state.terminalCandidateChunks.push(chunk);
    }
    return {
      countChanged,
      candidateChanged: segmentKind === "assistant",
      segmentClosed: previousSegment !== null && countChanged,
    };
  }
  if (semanticKind === "soft-side-channel") {
    return emptyChange();
  }
  if (semanticKind === "terminal-boundary") {
    return {
      countChanged: false,
      candidateChanged: false,
      segmentClosed: closeSegment(state, false),
    };
  }
  const segmentClosed = closeSegment(state, true);
  if (semanticKind === "tool-boundary") {
    incrementAssistantMessageCount(state, "tool");
    return {
      countChanged: true,
      candidateChanged: false,
      segmentClosed,
    };
  }
  return {
    countChanged: false,
    candidateChanged: false,
    segmentClosed,
  };
}

export function takeAcpExecutionProgressTerminalCandidate(scopeKeyRaw: string) {
  const state = states.get(String(scopeKeyRaw || ""));
  if (!state) {
    return "";
  }
  const candidate = state.terminalCandidateChunks.join("");
  state.terminalCandidateChunks = [];
  state.openSegment = null;
  return candidate;
}

export function discardAcpExecutionProgressCandidate(scopeKeyRaw: string) {
  const state = states.get(String(scopeKeyRaw || ""));
  if (!state) {
    return;
  }
  state.terminalCandidateChunks = [];
  state.openSegment = null;
}

export function snapshotAcpExecutionProgress(scopeKeyRaw: string) {
  const state = states.get(String(scopeKeyRaw || ""));
  return state
    ? {
        ...cloneAssistantMessageCounts(state),
        openSegment: state.openSegment,
        terminalCandidateChunks: [...state.terminalCandidateChunks],
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
