declare const __debug_mode__: boolean;

type CitationGraphCrashJournalBridge = {
  recordCitationGraphCrashJournalPhase?: (
    stage: string,
    details?: Record<string, unknown>,
  ) => unknown;
};

export function reportCitationGraphCrashJournalPhase(
  stage: string,
  details: Record<string, unknown> = {},
) {
  if (typeof __debug_mode__ === "undefined" || !__debug_mode__) return;
  const bridge = (
    window as Window & {
      __zoteroSkillsSynthesisWorkbenchBridge?: CitationGraphCrashJournalBridge;
    }
  ).__zoteroSkillsSynthesisWorkbenchBridge;
  void bridge?.recordCitationGraphCrashJournalPhase?.(stage, details);
}
