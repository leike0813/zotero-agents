function normalizeCount(value) {
    const count = Number(value);
    return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
}
export function emptyAssistantMessageCountTriplet() {
    return { assistant: 0, thought: 0, tool: 0 };
}
export function cloneAssistantMessageCountTriplet(value) {
    return {
        assistant: normalizeCount(value?.assistant),
        thought: normalizeCount(value?.thought),
        tool: normalizeCount(value?.tool),
    };
}
export function createAssistantMessageCounts(scopeKeyRaw, completeness = "complete") {
    return {
        scopeKey: String(scopeKeyRaw || ""),
        executionKey: "",
        active: false,
        current: emptyAssistantMessageCountTriplet(),
        cumulative: emptyAssistantMessageCountTriplet(),
        revision: 0,
        completeness,
    };
}
export function normalizeAssistantMessageCounts(value, scopeKeyRaw) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return undefined;
    }
    const raw = value;
    const scopeKey = String(scopeKeyRaw || raw.scopeKey || "");
    return {
        scopeKey,
        executionKey: String(raw.executionKey || ""),
        active: raw.active === true,
        current: cloneAssistantMessageCountTriplet(raw.current),
        cumulative: cloneAssistantMessageCountTriplet(raw.cumulative),
        revision: normalizeCount(raw.revision),
        completeness: raw.completeness === "complete" ? "complete" : "unavailable",
    };
}
export function cloneAssistantMessageCounts(value) {
    return {
        ...value,
        current: cloneAssistantMessageCountTriplet(value.current),
        cumulative: cloneAssistantMessageCountTriplet(value.cumulative),
    };
}
export function beginAssistantMessageCountExecution(value, executionKey = "", options = {}) {
    if (options.promoteUnavailableToComplete === true &&
        value.completeness === "unavailable") {
        value.completeness = "complete";
        value.cumulative = emptyAssistantMessageCountTriplet();
    }
    value.executionKey = executionKey;
    value.active = true;
    value.current = emptyAssistantMessageCountTriplet();
    value.revision += 1;
}
export function finishAssistantMessageCountExecution(value) {
    if (!value.active) {
        return false;
    }
    value.active = false;
    value.revision += 1;
    return true;
}
export function incrementAssistantMessageCount(value, kind) {
    value.current[kind] += 1;
    value.cumulative[kind] += 1;
    value.revision += 1;
}
