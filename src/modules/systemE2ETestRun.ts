/**
 * Signals that the current Zotero process is driven by the System E2E catalog.
 *
 * The catalog's own runner injects this test-only preference before the plugin
 * loads, and the catalog drives the sidecar through test-private checkpoints.
 * Those seams therefore have to follow the test run, not the build mode: the
 * release candidate is a production build, and gating the checkpoints on debug
 * mode would make calibration evidence unusable for promotion.
 */
export const SYSTEM_E2E_EVENT_URL_PREF =
  "extensions.zotero-agents.test.systemE2EEventUrl";

export function readSystemE2EEventUrl(): string {
  const runtime = globalThis as {
    Zotero?: {
      Prefs?: { get?: (key: string, global?: boolean) => unknown };
    };
  };
  return String(
    runtime.Zotero?.Prefs?.get?.(SYSTEM_E2E_EVENT_URL_PREF, true) || "",
  ).trim();
}

export function isSystemE2ETestRun(): boolean {
  return readSystemE2EEventUrl().length > 0;
}
