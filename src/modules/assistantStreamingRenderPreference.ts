import { getPref, getPrefName, setPref } from "../utils/prefs";

type StreamingRenderPreferenceListener = (enabled: boolean) => void;

const listeners = new Set<StreamingRenderPreferenceListener>();
const preferenceName = getPrefName("assistantStreamingRenderEnabled");
let preferenceObserver: symbol | undefined;
let lastKnownEnabled: boolean | undefined;

export function isAssistantStreamingRenderEnabled() {
  return getPref("assistantStreamingRenderEnabled") !== false;
}

function notifyAssistantStreamingRenderPreference() {
  const next = isAssistantStreamingRenderEnabled();
  if (lastKnownEnabled === next) {
    return next;
  }
  lastKnownEnabled = next;
  for (const listener of listeners) {
    listener(next);
  }
  return next;
}

function ensureAssistantStreamingRenderPreferenceObserver() {
  if (preferenceObserver) {
    return;
  }
  if (typeof Zotero.Prefs.registerObserver !== "function") {
    return;
  }
  preferenceObserver = Zotero.Prefs.registerObserver(
    preferenceName,
    () => notifyAssistantStreamingRenderPreference(),
    true,
  );
}

function releaseAssistantStreamingRenderPreferenceObserver() {
  if (!preferenceObserver || listeners.size > 0) {
    return;
  }
  if (typeof Zotero.Prefs.unregisterObserver === "function") {
    Zotero.Prefs.unregisterObserver(preferenceObserver);
  }
  preferenceObserver = undefined;
  lastKnownEnabled = undefined;
}

export function setAssistantStreamingRenderEnabled(enabled: boolean) {
  const next = enabled === true;
  if (listeners.size > 0) {
    ensureAssistantStreamingRenderPreferenceObserver();
  }
  setPref("assistantStreamingRenderEnabled", next);
  return notifyAssistantStreamingRenderPreference();
}

export function subscribeAssistantStreamingRenderPreference(
  listener: StreamingRenderPreferenceListener,
) {
  ensureAssistantStreamingRenderPreferenceObserver();
  listeners.add(listener);
  const current = isAssistantStreamingRenderEnabled();
  lastKnownEnabled = current;
  listener(current);
  return () => {
    listeners.delete(listener);
    releaseAssistantStreamingRenderPreferenceObserver();
  };
}
