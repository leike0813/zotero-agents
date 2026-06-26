import { getPref, setPref } from "../utils/prefs";

type StreamingRenderPreferenceListener = (enabled: boolean) => void;

const listeners = new Set<StreamingRenderPreferenceListener>();

export function isAssistantStreamingRenderEnabled() {
  return getPref("assistantStreamingRenderEnabled") !== false;
}

export function setAssistantStreamingRenderEnabled(enabled: boolean) {
  const next = enabled === true;
  setPref("assistantStreamingRenderEnabled", next);
  for (const listener of listeners) {
    listener(next);
  }
  return next;
}

export function subscribeAssistantStreamingRenderPreference(
  listener: StreamingRenderPreferenceListener,
) {
  listeners.add(listener);
  listener(isAssistantStreamingRenderEnabled());
  return () => {
    listeners.delete(listener);
  };
}
