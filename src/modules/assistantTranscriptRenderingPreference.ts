import { getPref, setPref } from "../utils/prefs";

export function isAssistantTranscriptPaginationVirtualizationEnabled() {
  return (
    getPref("assistantTranscriptPaginationVirtualizationEnabled") !== false
  );
}

export function setAssistantTranscriptPaginationVirtualizationEnabled(
  enabled: boolean,
) {
  const next = enabled === true;
  setPref("assistantTranscriptPaginationVirtualizationEnabled", next);
  return isAssistantTranscriptPaginationVirtualizationEnabled();
}
