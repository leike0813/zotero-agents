import { safeText } from "./regionEquality";

// Reply history store, ported verbatim from the module-level store in
// src/sidebar/assistantPanelRenderer.js. History lives outside React state on
// purpose: it is scoped by panel kind + context + action and must survive
// region rebuilds and owner switches exactly like the imperative renderer.

type ReplyHistoryState = {
  entries: string[];
  cursor: number | null;
  draft: string;
};

const replyHistoryByKey = new Map<string, ReplyHistoryState>();
const replyHistoryLimit = 50;

type ReplyHistoryPanel = {
  kind?: unknown;
  context?: unknown;
  reply?: unknown;
};

function recordOf(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

export function replyHistoryKey(panel: ReplyHistoryPanel): string {
  const reply = recordOf(recordOf(panel).reply);
  return [
    safeText(recordOf(panel).kind) || "assistant",
    safeText(recordOf(recordOf(panel).context).id) || "global",
    safeText(reply.action || "reply"),
  ].join("|");
}

function replyHistoryState(key: string): ReplyHistoryState {
  const normalized = safeText(key) || "assistant|global|reply";
  let state = replyHistoryByKey.get(normalized);
  if (!state) {
    state = { entries: [], cursor: null, draft: "" };
    replyHistoryByKey.set(normalized, state);
  }
  return state;
}

export function rememberReplyHistory(key: string, value: unknown) {
  const text = safeText(value);
  if (!text) return;
  const state = replyHistoryState(key);
  const entries = state.entries;
  if (entries[entries.length - 1] !== text) {
    entries.push(text);
    while (entries.length > replyHistoryLimit) entries.shift();
  }
  state.cursor = null;
  state.draft = "";
}

export function resetReplyHistoryNavigation(key: string) {
  const state = replyHistoryState(key);
  state.cursor = null;
  state.draft = "";
}

function setTextareaValueAndCaret(input: HTMLTextAreaElement, value: unknown) {
  input.value = String(value == null ? "" : value);
  if (typeof input.setSelectionRange === "function") {
    const end = input.value.length;
    input.setSelectionRange(end, end);
  }
}

function isCollapsedTextareaSelection(input: HTMLTextAreaElement) {
  return (
    typeof input.selectionStart === "number" &&
    typeof input.selectionEnd === "number" &&
    input.selectionStart === input.selectionEnd
  );
}

function isCaretOnFirstTextareaLine(input: HTMLTextAreaElement) {
  const caret = Number(input.selectionStart || 0);
  return (
    String(input.value || "").lastIndexOf("\n", Math.max(0, caret - 1)) < 0
  );
}

function isCaretOnLastTextareaLine(input: HTMLTextAreaElement) {
  const caret = Number(input.selectionStart || 0);
  return String(input.value || "").indexOf("\n", caret) < 0;
}

export function navigateReplyHistory(
  key: string,
  input: HTMLTextAreaElement,
  direction: number,
): boolean {
  const state = replyHistoryState(key);
  if (!state.entries.length) return false;
  if (state.cursor === null) {
    state.draft = input.value;
    state.cursor = state.entries.length;
  }
  const nextCursor = state.cursor + direction;
  if (nextCursor < 0) return false;
  if (nextCursor >= state.entries.length) {
    setTextareaValueAndCaret(input, state.draft);
    state.cursor = null;
    state.draft = "";
    return true;
  }
  state.cursor = nextCursor;
  setTextareaValueAndCaret(input, state.entries[nextCursor]);
  return true;
}

export function shouldHandleReplyHistoryKey(
  event: KeyboardEvent,
  input: HTMLTextAreaElement,
): boolean {
  return (
    !input.disabled &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    isCollapsedTextareaSelection(input)
  );
}
