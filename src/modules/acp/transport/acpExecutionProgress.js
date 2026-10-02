import { classifyAcpTranscriptSemanticUpdate } from "./acpTranscriptBoundary";
import { beginAssistantMessageCountExecution, cloneAssistantMessageCounts, createAssistantMessageCounts, finishAssistantMessageCountExecution, incrementAssistantMessageCount, normalizeAssistantMessageCounts, } from "../../assistant/publication/assistantMessageCounts";
const states = new Map();
function emptyChange() {
    return {
        countChanged: false,
        segmentClosed: false,
    };
}
function createState(scopeKey) {
    return {
        ...createAssistantMessageCounts(scopeKey),
        openSegment: null,
    };
}
function getOrCreateState(scopeKeyRaw) {
    const scopeKey = String(scopeKeyRaw || "");
    let state = states.get(scopeKey);
    if (!state) {
        state = createState(scopeKey);
        states.set(scopeKey, state);
    }
    return state;
}
function closeSegment(state) {
    const wasOpen = state.openSegment !== null;
    state.openSegment = null;
    return wasOpen;
}
export function resetAcpExecutionProgress(scopeKeyRaw, options = {}) {
    const scopeKey = String(scopeKeyRaw || "");
    const state = getOrCreateState(scopeKey);
    beginAssistantMessageCountExecution(state, "", options);
    state.openSegment = null;
    states.set(scopeKey, state);
    return snapshotAcpExecutionProgress(scopeKey);
}
export function restoreAcpExecutionProgress(scopeKeyRaw, value, options = {}) {
    const scopeKey = String(scopeKeyRaw || "");
    const restored = normalizeAssistantMessageCounts(value, scopeKey);
    const state = {
        ...(restored ||
            createAssistantMessageCounts(scopeKey, options.missingCompleteness || "unavailable")),
        openSegment: null,
    };
    states.set(scopeKey, state);
    return snapshotAcpExecutionProgress(scopeKey);
}
export function finishAcpExecutionProgress(scopeKeyRaw) {
    const state = states.get(String(scopeKeyRaw || ""));
    if (!state) {
        return undefined;
    }
    closeSegment(state);
    finishAssistantMessageCountExecution(state);
    return snapshotAcpExecutionProgress(state.scopeKey);
}
export function updateAcpExecutionProgress(scopeKeyRaw, update) {
    const state = getOrCreateState(scopeKeyRaw);
    const semanticKind = classifyAcpTranscriptSemanticUpdate(update.sessionUpdate);
    if (semanticKind === "assistant-message" ||
        semanticKind === "assistant-thought") {
        const content = update.content;
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
        const segmentKind = semanticKind === "assistant-message" ? "assistant" : "thought";
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
export function snapshotAcpExecutionProgress(scopeKeyRaw) {
    const state = states.get(String(scopeKeyRaw || ""));
    return state
        ? {
            ...cloneAssistantMessageCounts(state),
            openSegment: state.openSegment,
        }
        : undefined;
}
export function snapshotAcpMessageCounts(scopeKeyRaw) {
    const state = states.get(String(scopeKeyRaw || ""));
    return state ? cloneAssistantMessageCounts(state) : undefined;
}
export function releaseAcpExecutionProgress(scopeKeyRaw) {
    states.delete(String(scopeKeyRaw || ""));
}
export function resetAllAcpExecutionProgressForTests() {
    states.clear();
}
