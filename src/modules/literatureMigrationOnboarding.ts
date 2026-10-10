export type LiteratureMigrationOnboardingMarker = {
  addonVersion: string;
  definitionVersion: number;
  libraryId: number;
};

export type LiteratureMigrationOnboardingProgress = {
  phase: "scanning" | "converting";
  completed: number;
  total: number | null;
  candidateCount: number;
};

type OnboardingScanResult =
  | { ok: true; runId: string; candidates: unknown[] }
  | { ok: false; code?: string };

export type LiteratureMigrationOnboardingDependencies = {
  addonVersion: string;
  definitionVersion: number;
  libraryId: number;
  getMarker: () => LiteratureMigrationOnboardingMarker | null;
  setMarker: (marker: LiteratureMigrationOnboardingMarker) => void;
  isBusy: () => boolean;
  subscribeToChanges: (listener: () => void) => () => void;
  scan: (args: {
    libraryId: number;
    onProgress: (progress: LiteratureMigrationOnboardingProgress) => void;
  }) => Promise<OnboardingScanResult>;
  stopActiveScan: () => void;
  showProgress: () => {
    update: (progress: LiteratureMigrationOnboardingProgress) => void;
    close: () => void;
  };
  showReminder: (args: { choose: (choice: "open" | "later") => void }) => void;
  openMigration: (runId: string) => void;
};

function matchesMarker(
  marker: LiteratureMigrationOnboardingMarker | null,
  expected: LiteratureMigrationOnboardingMarker,
) {
  return (
    marker?.addonVersion === expected.addonVersion &&
    marker.definitionVersion === expected.definitionVersion &&
    marker.libraryId === expected.libraryId
  );
}

export function createLiteratureMigrationOnboardingCoordinator(
  dependencies: LiteratureMigrationOnboardingDependencies,
) {
  const expectedMarker: LiteratureMigrationOnboardingMarker = {
    addonVersion: dependencies.addonVersion.trim(),
    definitionVersion: dependencies.definitionVersion,
    libraryId: dependencies.libraryId,
  };
  let stopped = false;
  let checking: Promise<void> | null = null;
  let unsubscribe: (() => void) | null = null;
  let progress: ReturnType<typeof dependencies.showProgress> | null = null;
  let ownsActiveScan = false;

  function closeProgress() {
    progress?.close();
    progress = null;
  }

  function waitForMigrationToSettle() {
    if (unsubscribe || stopped) return;
    unsubscribe = dependencies.subscribeToChanges(() => {
      if (stopped || dependencies.isBusy()) return;
      unsubscribe?.();
      unsubscribe = null;
      schedule();
    });
  }

  async function performCheck() {
    if (stopped || matchesMarker(dependencies.getMarker(), expectedMarker)) {
      return;
    }
    if (dependencies.isBusy()) {
      waitForMigrationToSettle();
      return;
    }

    progress = dependencies.showProgress();
    try {
      ownsActiveScan = true;
      const result = await dependencies.scan({
        libraryId: expectedMarker.libraryId,
        onProgress: (value) => progress?.update(value),
      });
      ownsActiveScan = false;
      if (!result.ok || stopped) return;

      closeProgress();
      if (result.candidates.length > 0) {
        dependencies.showReminder({
          choose: (choice) => {
            if (choice === "open" && !stopped) {
              dependencies.openMigration(result.runId);
            }
          },
        });
      }
      if (!stopped) dependencies.setMarker(expectedMarker);
    } catch {
      // Failed checks remain retryable at the next startup.
    } finally {
      ownsActiveScan = false;
      closeProgress();
    }
  }

  function schedule() {
    if (stopped || checking) return;
    checking = performCheck().finally(() => {
      checking = null;
    });
  }

  function check() {
    if (!checking && !stopped) {
      checking = performCheck().finally(() => {
        checking = null;
      });
    }
    return checking || Promise.resolve();
  }

  function shutdown() {
    stopped = true;
    unsubscribe?.();
    unsubscribe = null;
    if (ownsActiveScan) dependencies.stopActiveScan();
    closeProgress();
  }

  return {
    check,
    schedule,
    shutdown,
    whenIdle: () => checking || Promise.resolve(),
  };
}
