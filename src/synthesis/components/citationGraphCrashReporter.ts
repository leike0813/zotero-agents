type CitationGraphCrashJournalBridge = {
  recordCitationGraphCrashJournalPhase?: (
    stage: string,
    details?: Record<string, unknown>,
  ) => unknown;
};

/**
 * Forwards a graph lifecycle phase to the crash journal.
 *
 * The recorder on the plugin side owns the decision to keep it, because the
 * journal has to stay available to a System E2E run, and that run is a
 * production build with debug mode off. Gating here on the build mode would
 * leave the close-lifecycle case reading an empty journal.
 */
export function reportCitationGraphCrashJournalPhase(
  stage: string,
  details: Record<string, unknown> = {},
) {
  const bridge = (
    window as Window & {
      __zoteroSkillsSynthesisWorkbenchBridge?: CitationGraphCrashJournalBridge;
    }
  ).__zoteroSkillsSynthesisWorkbenchBridge;
  void bridge?.recordCitationGraphCrashJournalPhase?.(stage, details);
}
