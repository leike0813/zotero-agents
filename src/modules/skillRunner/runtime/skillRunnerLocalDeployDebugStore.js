import { isDebugModeEnabled } from "../../debugMode";
let sessionSeq = 0;
let entrySeq = 0;
let entries = [];
const listeners = new Set();
function cloneEntry(entry) {
    return {
        ...entry,
        details: typeof entry.details === "undefined"
            ? undefined
            : JSON.parse(JSON.stringify(entry.details)),
        error: typeof entry.error === "undefined"
            ? undefined
            : JSON.parse(JSON.stringify(entry.error)),
    };
}
function emitChanged() {
    const snapshot = entries.map((entry) => cloneEntry(entry));
    for (const listener of listeners) {
        listener(snapshot);
    }
}
export function resetSkillRunnerLocalDeployDebugSession(args) {
    sessionSeq += 1;
    entrySeq = 0;
    entries = [];
    if (!isDebugModeEnabled()) {
        emitChanged();
        return;
    }
    appendSkillRunnerLocalDeployDebugLog({
        level: "info",
        operation: "deploy-session",
        stage: "deploy-session-started",
        message: "started local deploy debug session",
        details: {
            sessionId: sessionSeq,
            version: String(args?.version || "").trim() || undefined,
            trigger: String(args?.trigger || "").trim() || undefined,
        },
    });
}
export function appendSkillRunnerLocalDeployDebugLog(input) {
    if (!isDebugModeEnabled()) {
        return null;
    }
    const entry = {
        id: `deploy-log-${sessionSeq}-${++entrySeq}`,
        ts: String(input.ts || new Date().toISOString()),
        level: input.level,
        operation: String(input.operation || "unknown"),
        stage: String(input.stage || input.operation || "unknown"),
        message: String(input.message || ""),
        details: typeof input.details === "undefined" ? undefined : input.details,
        error: typeof input.error === "undefined" ? undefined : input.error,
    };
    entries.push(entry);
    emitChanged();
    return cloneEntry(entry);
}
export function listSkillRunnerLocalDeployDebugLogs() {
    return entries.map((entry) => cloneEntry(entry));
}
export function subscribeSkillRunnerLocalDeployDebugLogs(listener) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
