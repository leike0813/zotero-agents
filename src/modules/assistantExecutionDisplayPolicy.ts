import { getPref, getPrefName, setPref } from "../utils/prefs";

export const ASSISTANT_EXECUTION_DISPLAY_MODES = [
  "live",
  "boundary",
  "silent",
] as const;

export type AssistantExecutionDisplayMode =
  (typeof ASSISTANT_EXECUTION_DISPLAY_MODES)[number];

export type AssistantWorkspacePublishReason =
  | "critical"
  | "boundary"
  | "live"
  | "background";

type AssistantExecutionDisplayModeListener = (
  mode: AssistantExecutionDisplayMode,
) => void;

export const ASSISTANT_WORKSPACE_LIVE_PUBLISH_MS = 160;

const listeners = new Set<AssistantExecutionDisplayModeListener>();
const preferenceName = getPrefName("assistantExecutionDisplayMode");
let preferenceObserver: symbol | undefined;
let lastKnownMode: AssistantExecutionDisplayMode | undefined;

export function isAssistantExecutionDisplayMode(
  value: unknown,
): value is AssistantExecutionDisplayMode {
  return ASSISTANT_EXECUTION_DISPLAY_MODES.includes(
    value as AssistantExecutionDisplayMode,
  );
}

export function getAssistantExecutionDisplayMode(): AssistantExecutionDisplayMode {
  const storedMode = getPref("assistantExecutionDisplayMode");
  if (isAssistantExecutionDisplayMode(storedMode)) {
    return storedMode;
  }
  return getPref("assistantStreamingRenderEnabled") === false
    ? "boundary"
    : "live";
}

function notifyAssistantExecutionDisplayMode() {
  const next = getAssistantExecutionDisplayMode();
  if (lastKnownMode === next) {
    return next;
  }
  lastKnownMode = next;
  for (const listener of listeners) {
    listener(next);
  }
  return next;
}

function ensureAssistantExecutionDisplayModeObserver() {
  if (
    preferenceObserver ||
    typeof Zotero.Prefs.registerObserver !== "function"
  ) {
    return;
  }
  preferenceObserver = Zotero.Prefs.registerObserver(
    preferenceName,
    notifyAssistantExecutionDisplayMode,
    true,
  );
}

function releaseAssistantExecutionDisplayModeObserver() {
  if (!preferenceObserver || listeners.size > 0) {
    return;
  }
  if (typeof Zotero.Prefs.unregisterObserver === "function") {
    Zotero.Prefs.unregisterObserver(preferenceObserver);
  }
  preferenceObserver = undefined;
  lastKnownMode = undefined;
}

export function setAssistantExecutionDisplayMode(
  mode: AssistantExecutionDisplayMode,
) {
  const next = isAssistantExecutionDisplayMode(mode) ? mode : "live";
  if (listeners.size > 0) {
    ensureAssistantExecutionDisplayModeObserver();
  }
  setPref("assistantExecutionDisplayMode", next);
  return notifyAssistantExecutionDisplayMode();
}

export function subscribeAssistantExecutionDisplayMode(
  listener: AssistantExecutionDisplayModeListener,
) {
  ensureAssistantExecutionDisplayModeObserver();
  listeners.add(listener);
  const current = getAssistantExecutionDisplayMode();
  lastKnownMode = current;
  listener(current);
  return () => {
    listeners.delete(listener);
    releaseAssistantExecutionDisplayModeObserver();
  };
}

export function canPublishAssistantWorkspaceLiveUpdates() {
  return getAssistantExecutionDisplayMode() === "live";
}

export function isAssistantSilentExecutionMode() {
  return getAssistantExecutionDisplayMode() === "silent";
}

export function canPublishAssistantWorkspaceUpdate(
  reason: AssistantWorkspacePublishReason,
) {
  if (reason === "critical") {
    return true;
  }
  if (reason === "background") {
    return false;
  }
  const mode = getAssistantExecutionDisplayMode();
  return mode === "live" || (mode === "boundary" && reason === "boundary");
}
