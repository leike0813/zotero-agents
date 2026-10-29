import { assert } from "chai";
import {
  createLiteratureMigrationOnboardingCoordinator,
  type LiteratureMigrationOnboardingMarker,
} from "../../src/modules/literatureMigrationOnboarding";

describe("literature migration onboarding", function () {
  it("settles scan progress before showing the blocking reminder", async function () {
    const events: string[] = [];
    const coordinator = createLiteratureMigrationOnboardingCoordinator({
      addonVersion: "1.2.3",
      definitionVersion: 7,
      libraryId: 1,
      getMarker: () => null,
      setMarker: () => undefined,
      isBusy: () => false,
      subscribeToChanges: () => () => undefined,
      stopActiveScan: () => undefined,
      scan: async () => ({ ok: true, runId: "run", candidates: [{}] }),
      showProgress: () => ({
        update: () => undefined,
        close: () => events.push("progress-closed"),
      }),
      showReminder: () => events.push("reminder-shown"),
      openMigration: () => undefined,
    });

    await coordinator.check();

    assert.deepEqual(events, ["progress-closed", "reminder-shown"]);
    coordinator.shutdown();
  });

  it("checks once for a version, records success, and opens the issued run", async function () {
    let marker: LiteratureMigrationOnboardingMarker | null = null;
    let scans = 0;
    const opened: string[] = [];
    const reminders: Array<(choice: "open" | "later") => void> = [];
    const coordinator = createLiteratureMigrationOnboardingCoordinator({
      addonVersion: "1.2.3",
      definitionVersion: 7,
      libraryId: 1,
      getMarker: () => marker,
      setMarker: (value) => {
        marker = value;
      },
      isBusy: () => false,
      subscribeToChanges: () => () => undefined,
      stopActiveScan: () => undefined,
      scan: async () => {
        scans += 1;
        return {
          ok: true,
          runId: "run-issued",
          candidates: [{ candidateId: "a" }],
        };
      },
      showProgress: () => ({ update: () => undefined, close: () => undefined }),
      showReminder: (args) => {
        reminders.push(args.choose);
      },
      openMigration: (runId) => {
        opened.push(runId);
      },
    });

    await coordinator.check();
    await coordinator.check();

    assert.equal(scans, 1);
    assert.deepEqual(marker, {
      addonVersion: "1.2.3",
      definitionVersion: 7,
      libraryId: 1,
    });
    assert.lengthOf(reminders, 1);
    reminders[0]("open");
    assert.deepEqual(opened, ["run-issued"]);
    coordinator.shutdown();
  });

  it("keeps failed checks retryable and does not claim success", async function () {
    let marker: LiteratureMigrationOnboardingMarker | null = null;
    let scans = 0;
    const coordinator = createLiteratureMigrationOnboardingCoordinator({
      addonVersion: "1.2.3",
      definitionVersion: 7,
      libraryId: 1,
      getMarker: () => marker,
      setMarker: (value) => {
        marker = value;
      },
      isBusy: () => false,
      subscribeToChanges: () => () => undefined,
      stopActiveScan: () => undefined,
      scan: async () => {
        scans += 1;
        return scans === 1
          ? { ok: false, code: "scan_failed" }
          : { ok: true, runId: "run-retry", candidates: [] };
      },
      showProgress: () => ({ update: () => undefined, close: () => undefined }),
      showReminder: () => {
        throw new Error("empty scan must not remind");
      },
      openMigration: () => undefined,
    });

    await coordinator.check();
    assert.isNull(marker);
    await coordinator.check();
    assert.equal(scans, 2);
    assert.isNotNull(marker);
    coordinator.shutdown();
  });

  it("rechecks when the addon, migration definition, or personal library changes", async function () {
    const markers: LiteratureMigrationOnboardingMarker[] = [
      { addonVersion: "1.2.2", definitionVersion: 7, libraryId: 1 },
      { addonVersion: "1.2.3", definitionVersion: 6, libraryId: 1 },
      { addonVersion: "1.2.3", definitionVersion: 7, libraryId: 2 },
    ];
    for (const previousMarker of markers) {
      let scans = 0;
      const coordinator = createLiteratureMigrationOnboardingCoordinator({
        addonVersion: "1.2.3",
        definitionVersion: 7,
        libraryId: 1,
        getMarker: () => previousMarker,
        setMarker: () => undefined,
        isBusy: () => false,
        subscribeToChanges: () => () => undefined,
        stopActiveScan: () => undefined,
        scan: async () => {
          scans += 1;
          return { ok: true, runId: "run", candidates: [] };
        },
        showProgress: () => ({
          update: () => undefined,
          close: () => undefined,
        }),
        showReminder: () => undefined,
        openMigration: () => undefined,
      });

      await coordinator.check();

      assert.equal(scans, 1);
      coordinator.shutdown();
    }
  });

  it("waits for existing preview work and cancels without marking success on shutdown", async function () {
    let marker: LiteratureMigrationOnboardingMarker | null = null;
    let busy = true;
    let notifyChanged: (() => void) | undefined;
    let scans = 0;
    const coordinator = createLiteratureMigrationOnboardingCoordinator({
      addonVersion: "1.2.3",
      definitionVersion: 7,
      libraryId: 1,
      getMarker: () => marker,
      setMarker: (value) => {
        marker = value;
      },
      isBusy: () => busy,
      subscribeToChanges: (listener) => {
        notifyChanged = listener;
        return () => {
          notifyChanged = undefined;
        };
      },
      stopActiveScan: () => undefined,
      scan: async () => {
        scans += 1;
        return { ok: true, runId: "run", candidates: [] };
      },
      showProgress: () => ({ update: () => undefined, close: () => undefined }),
      showReminder: () => undefined,
      openMigration: () => undefined,
    });

    coordinator.schedule();
    await Promise.resolve();
    assert.equal(scans, 0);
    busy = false;
    notifyChanged?.();
    await coordinator.whenIdle();
    assert.equal(scans, 1);
    coordinator.shutdown();
    assert.isUndefined(notifyChanged);
  });

  it("does not stop another migration while startup is deferred for busy work", async function () {
    let stopRequests = 0;
    const coordinator = createLiteratureMigrationOnboardingCoordinator({
      addonVersion: "1.2.3",
      definitionVersion: 7,
      libraryId: 1,
      getMarker: () => null,
      setMarker: () => undefined,
      isBusy: () => true,
      subscribeToChanges: () => () => undefined,
      stopActiveScan: () => {
        stopRequests += 1;
      },
      scan: async () => ({ ok: true, runId: "run", candidates: [] }),
      showProgress: () => ({ update: () => undefined, close: () => undefined }),
      showReminder: () => undefined,
      openMigration: () => undefined,
    });

    coordinator.schedule();
    coordinator.shutdown();

    assert.equal(stopRequests, 0);
  });

  it("stops an in-flight scan and leaves its version marker unset on shutdown", async function () {
    let marker: LiteratureMigrationOnboardingMarker | null = null;
    let stopRequests = 0;
    let settleScan!: (result: {
      ok: true;
      runId: string;
      candidates: unknown[];
    }) => void;
    const coordinator = createLiteratureMigrationOnboardingCoordinator({
      addonVersion: "1.2.3",
      definitionVersion: 7,
      libraryId: 1,
      getMarker: () => marker,
      setMarker: (value) => {
        marker = value;
      },
      isBusy: () => false,
      subscribeToChanges: () => () => undefined,
      scan: () =>
        new Promise((resolve) => {
          settleScan = resolve;
        }),
      stopActiveScan: () => {
        stopRequests += 1;
      },
      showProgress: () => ({ update: () => undefined, close: () => undefined }),
      showReminder: () => undefined,
      openMigration: () => undefined,
    });

    const checking = coordinator.check();
    await Promise.resolve();
    coordinator.shutdown();
    settleScan({
      ok: true,
      runId: "stopped-run",
      candidates: [{ candidateId: "a" }],
    });
    await checking;

    assert.equal(stopRequests, 1);
    assert.isNull(marker);
  });
});
