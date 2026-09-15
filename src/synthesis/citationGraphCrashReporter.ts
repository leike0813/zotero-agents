declare const __debug_mode__: boolean;

export function reportCitationGraphCrashJournalPhase(
  stage: string,
  details: Record<string, unknown> = {},
) {
  if (
    typeof __debug_mode__ === "undefined" ||
    !__debug_mode__ ||
    !window.parent ||
    window.parent === window
  )
    return;
  window.parent.postMessage(
    { type: "synthesis:crash-journal", stage, details },
    "*",
  );
}
