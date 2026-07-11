export type AssistantMessageCountKind = "assistant" | "thought" | "tool";

export type AssistantMessageCountTriplet = Record<
  AssistantMessageCountKind,
  number
>;

export type AssistantMessageCountsSnapshot = {
  scopeKey: string;
  executionKey: string;
  active: boolean;
  current: AssistantMessageCountTriplet;
  cumulative: AssistantMessageCountTriplet;
  revision: number;
  completeness: "complete" | "unavailable";
};

function normalizeCount(value: unknown) {
  const count = Number(value);
  return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
}

export function emptyAssistantMessageCountTriplet(): AssistantMessageCountTriplet {
  return { assistant: 0, thought: 0, tool: 0 };
}

export function cloneAssistantMessageCountTriplet(
  value: Partial<AssistantMessageCountTriplet> | undefined,
): AssistantMessageCountTriplet {
  return {
    assistant: normalizeCount(value?.assistant),
    thought: normalizeCount(value?.thought),
    tool: normalizeCount(value?.tool),
  };
}

export function createAssistantMessageCounts(
  scopeKeyRaw: string,
  completeness: AssistantMessageCountsSnapshot["completeness"] = "complete",
): AssistantMessageCountsSnapshot {
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

export function normalizeAssistantMessageCounts(
  value: unknown,
  scopeKeyRaw: string,
): AssistantMessageCountsSnapshot | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const raw = value as Partial<AssistantMessageCountsSnapshot>;
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
export function cloneAssistantMessageCounts(
  value: AssistantMessageCountsSnapshot,
): AssistantMessageCountsSnapshot {
  return {
    ...value,
    current: cloneAssistantMessageCountTriplet(value.current),
    cumulative: cloneAssistantMessageCountTriplet(value.cumulative),
  };
}

export function beginAssistantMessageCountExecution(
  value: AssistantMessageCountsSnapshot,
  executionKey = "",
) {
  value.executionKey = executionKey;
  value.active = true;
  value.current = emptyAssistantMessageCountTriplet();
  value.revision += 1;
}

export function finishAssistantMessageCountExecution(
  value: AssistantMessageCountsSnapshot,
) {
  if (!value.active) {
    return false;
  }
  value.active = false;
  value.revision += 1;
  return true;
}

export function incrementAssistantMessageCount(
  value: AssistantMessageCountsSnapshot,
  kind: AssistantMessageCountKind,
) {
  value.current[kind] += 1;
  value.cumulative[kind] += 1;
  value.revision += 1;
}
