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

export const SYSTEM_E2E_LAUNCH_FAULT_PREF =
  "extensions.zotero-agents.test.systemE2ELaunchFault";

/**
 * The pre-ready launch failure the catalog arms through its launch-failure
 * case. The repository file is owned by whichever process holds it, so a
 * runner-owned launch input is the only deterministic way to fail a launch
 * before readiness on every platform.
 *
 * The fault is honored only inside a System E2E run, so a production process
 * never inherits one, and it fails the launch input before anything is written
 * or spawned.
 */
export function isSystemE2ELaunchFaultArmed(): boolean {
  if (!isSystemE2ETestRun()) {
    return false;
  }
  const runtime = globalThis as {
    Zotero?: {
      Prefs?: { get?: (key: string, global?: boolean) => unknown };
    };
  };
  return (
    String(
      runtime.Zotero?.Prefs?.get?.(SYSTEM_E2E_LAUNCH_FAULT_PREF, true) || "",
    ).trim().length > 0
  );
}

export function setSystemE2ELaunchFault(armed: boolean): void {
  const runtime = globalThis as {
    Zotero?: {
      Prefs?: {
        set?: (key: string, value: unknown, global?: boolean) => void;
        clear?: (key: string, global?: boolean) => void;
      };
    };
  };
  if (armed) {
    runtime.Zotero?.Prefs?.set?.(SYSTEM_E2E_LAUNCH_FAULT_PREF, "1", true);
    return;
  }
  runtime.Zotero?.Prefs?.clear?.(SYSTEM_E2E_LAUNCH_FAULT_PREF, true);
}
