import { assert } from "chai";
import { h, render } from "preact";

import {
  assertRegionSubtreesPreserved,
  captureRegionSubtrees,
  createSidebarDomEnvironment,
  installSidebarDomGlobals,
  restoreSidebarDomGlobals,
  type SidebarDomEnvironment,
} from "../helpers/sidebarDomEnv";
import { labelText } from "../../src/dashboard/dashboardLabels";
import {
  AcpTraceReplayRegion,
  projectDashboardAcpTraceReplaySelection,
  type DashboardAcpTraceReplaySelection,
  type DashboardRegionLabelResolver,
} from "../../src/dashboard/components/AcpTraceReplayRegion";

function makeLabels(): Record<string, string> {
  return {
    acpTraceReplayTabTitle: "ACP Trace & Replay",
    acpTraceRecorderStepTitle: "1. ACP Trace Recorder",
    acpReplayProfilerStepTitle: "2. ACP Replay Profiler",
    acpTraceArm: "Arm Recorder",
    acpTraceFinish: "Finish Recording",
    acpTraceFinishAfterTurn: "Finish after Current Turn",
    acpTraceCancel: "Cancel Recording",
    acpTraceSave: "Save & Use for Replay",
    acpTraceOpenFolder: "Open Folder",
    acpTraceNewRecording: "New Recording",
    acpTraceBound: "Recording bound target",
    acpReplayRun: "Run Nine-Replay Matrix",
    acpReplayCancel: "Cancel Replay",
    acpReplayOpenResultFolder: "Open Result Folder",
    acpReplayBrowse: "Browse…",
    acpReplaySample: "Sample",
    acpReplayProgress: "Progress",
  };
}

function makeResolver(
  labels: Record<string, string>,
): DashboardRegionLabelResolver {
  return (key, fallback) => labelText(labels, key, fallback);
}

function makeRecorderView(overrides: Record<string, unknown> = {}) {
  return {
    state: "idle",
    sourceKind: "acp-chat-conversation",
    activeTurnCount: 0,
    activeRequestCount: 0,
    canFinish: false,
    claiming: false,
    eventCount: 0,
    contentBytes: 0,
    warnings: [],
    limits: { maxBytes: 268435456, maxEvents: 250000, maxEventBytes: 16777216 },
    ...overrides,
  };
}

function makeReplayView(overrides: Record<string, unknown> = {}) {
  return {
    state: "idle",
    tracePath: "",
    traceValidation: "empty",
    phase: "",
    phaseValidation: "empty",
    cadence: "logical",
    progress: { completed: 0, total: 9 },
    records: [],
    surfaceSummaries: [],
    warnings: [],
    ...overrides,
  };
}

function makeSelection(
  recorderOverrides: Record<string, unknown> = {},
  replayOverrides: Record<string, unknown> = {},
): DashboardAcpTraceReplaySelection {
  return projectDashboardAcpTraceReplaySelection(
    makeRecorderView(recorderOverrides),
    makeReplayView(replayOverrides),
    makeResolver(makeLabels()),
  );
}

function input(
  element: HTMLInputElement | HTMLSelectElement,
  value: string,
  eventType: "input" | "change",
) {
  element.value = value;
  element.dispatchEvent(new window.Event(eventType, { bubbles: true }));
}

describe("dashboard acp trace & replay region (AcpTraceReplayRegion)", function () {
  let environment: SidebarDomEnvironment;
  let container: HTMLElement;
  let actions: Array<{ action: string; payload: Record<string, unknown> }>;
  const onAction = (action: string, payload: Record<string, unknown>) => {
    actions.push({ action, payload });
  };

  beforeEach(function () {
    environment = createSidebarDomEnvironment();
    installSidebarDomGlobals(environment);
    container = document.createElement("div");
    document.body.appendChild(container);
    actions = [];
  });

  afterEach(function () {
    render(null, container);
    container.remove();
    restoreSidebarDomGlobals();
  });

  function renderSelection(selection: DashboardAcpTraceReplaySelection) {
    render(
      h(AcpTraceReplayRegion, {
        selection,
        onAction: onAction as never,
      }),
      container,
    );
  }

  it("renders the recorder idle surface with fields and gated buttons", function () {
    renderSelection(makeSelection());
    const recorder = container.querySelector(
      '[data-region-content="dashboard-acp-trace-recorder"]',
    )!;
    assert.ok(recorder, "recorder step exists");
    assert.equal(
      recorder.querySelector("h3.section-title")?.textContent,
      "1. ACP Trace Recorder",
    );
    assert.ok(
      recorder.querySelector(".error-banner.profiler-sensitive-warning"),
      "sensitive warning banner renders",
    );
    const source = recorder.querySelector<HTMLSelectElement>(
      "select.select-input.profiler-input",
    )!;
    assert.ok(source, "trace type select exists");
    assert.equal(source.querySelectorAll("option").length, 2);
    assert.equal(source.value, "acp-chat-conversation");
    assert.isFalse(source.disabled, "idle recorder leaves controls enabled");
    const numberInputs = recorder.querySelectorAll<HTMLInputElement>(
      ".acp-trace-advanced-fields input[type='number']",
    );
    assert.equal(numberInputs.length, 3);
    assert.equal(numberInputs[0].value, "268435456");
    assert.equal(numberInputs[1].value, "250000");
    assert.equal(numberInputs[2].value, "16777216");

    const buttons = Array.from(
      recorder.querySelectorAll<HTMLButtonElement>(
        ".profiler-toolbar-actions .btn",
      ),
    );
    assert.deepEqual(
      buttons.map((button) => button.textContent),
      ["Arm Recorder", "Open Folder"],
    );
    assert.isTrue(
      buttons[1].disabled,
      "open folder is disabled without a folder",
    );

    // Edit the uncontrolled controls in the DOM, then arm.
    source.value = "acp-workflow-execution";
    numberInputs[0].value = "1024";
    buttons[0].click();
    assert.deepEqual(actions, [
      {
        action: "acp-trace-recorder-start",
        payload: {
          sourceKind: "acp-workflow-execution",
          maxBytes: 1024,
          maxEvents: 250000,
          maxEventBytes: 16777216,
        },
      },
    ]);
  });

  it("renders recording lifecycle, binding, and finish/cancel actions", function () {
    renderSelection(
      makeSelection({
        state: "recording",
        canFinish: true,
        activeTurnCount: 2,
        activeRequestCount: 1,
        eventCount: 42,
        contentBytes: 4096,
        binding: {
          sourceKind: "acp-chat-conversation",
          backendId: "b1",
          conversationId: "c1",
          sessionId: "s1",
          attachKind: "resume",
        },
      }),
    );
    const recorder = container.querySelector(
      '[data-region-content="dashboard-acp-trace-recorder"]',
    )!;
    assert.equal(
      recorder.querySelector(".mono.profiler-saved-path")?.textContent,
      "Recording bound target; events: 42; bytes: 4096; active turns: 2; active requests: 1; completion: pending",
    );
    assert.equal(
      recorder.querySelector(".acp-trace-binding")?.textContent,
      "b1 / c1 / s1 (resume)",
    );
    const buttons = Array.from(
      recorder.querySelectorAll<HTMLButtonElement>(
        ".profiler-toolbar-actions .btn",
      ),
    );
    assert.deepEqual(
      buttons.map((button) => button.textContent),
      ["Finish after Current Turn", "Cancel Recording", "Open Folder"],
    );
    assert.isTrue(
      recorder.querySelector<HTMLSelectElement>("select.select-input")!
        .disabled,
      "non-idle recorder locks configuration controls",
    );
    buttons[0].click();
    buttons[1].click();
    assert.deepEqual(actions, [
      { action: "acp-trace-recorder-finish", payload: {} },
      { action: "acp-trace-recorder-cancel", payload: {} },
    ]);
  });

  it("renders the replay profiler: matrix slots, start gating and draft actions", async function () {
    // Preact defers state-driven re-renders to a microtask in this
    // environment; flush after each interaction before asserting.
    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
    renderSelection(
      makeSelection(
        {},
        {
          traceMetadata: {
            schema: "acp-semantic-trace/v1",
            sourceKind: "acp-chat-conversation",
            digest: "abc",
            createdAt: "2026-09-01T00:00:00.000Z",
            eventCount: 10,
            contentBytes: 2048,
            completion: "complete",
            sampleName: "sample-one",
          },
          progress: { completed: 3, total: 9 },
        },
      ),
    );
    const replay = container.querySelector(
      '[data-region-content="dashboard-acp-replay-profiler"]',
    )!;
    assert.ok(replay, "replay step exists");

    // 3 surfaces x 3 slots, all pending without records or a current run.
    const surfaces = replay.querySelectorAll(".acp-replay-matrix-surface");
    assert.equal(surfaces.length, 3);
    const slots = replay.querySelectorAll(".acp-replay-matrix-slot");
    assert.equal(slots.length, 9);
    assert.equal(slots[0].textContent, "1. warm-up · pending");
    assert.equal(slots[0].getAttribute("data-state"), "pending");

    const start = replay.querySelector<HTMLButtonElement>(
      ".profiler-toolbar-actions .btn.primary",
    )!;
    assert.isTrue(
      start.disabled,
      "start disabled while trace path and phase are empty",
    );

    const tracePath = replay.querySelector<HTMLInputElement>(
      ".profiler-trace-control input",
    )!;
    const phase = replay.querySelectorAll<HTMLInputElement>(
      ".profiler-fields input.text-input",
    )[1];
    input(tracePath, "/tmp/trace.ndjson", "input");
    input(phase, "governance round 2", "input");
    await flush();
    assert.isFalse(start.disabled, "valid trace path and phase enable start");
    assert.equal(phase.getAttribute("aria-invalid"), "false");

    // change on the trace path fires preflight; change on phase fires set-draft.
    input(tracePath, "/tmp/trace.ndjson", "change");
    input(phase, "governance round 2", "change");
    await flush();
    assert.deepEqual(actions, [
      {
        action: "acp-replay-trace-preflight",
        payload: {
          tracePath: "/tmp/trace.ndjson",
          phase: "governance round 2",
          cadence: "logical",
        },
      },
      {
        action: "acp-replay-profiler-set-draft",
        payload: { phase: "governance round 2", cadence: "logical" },
      },
    ]);

    const cadence = replay.querySelector<HTMLSelectElement>(
      ".profiler-fields select.select-input",
    )!;
    input(cadence, "burst", "change");
    await flush();
    start.click();
    assert.deepEqual(actions[2], {
      action: "acp-replay-profiler-start",
      payload: {
        tracePath: "/tmp/trace.ndjson",
        phase: "governance round 2",
        cadence: "burst",
      },
    });

    // Browse reports the current draft.
    const browse = replay.querySelector<HTMLButtonElement>(
      ".profiler-trace-control .btn",
    )!;
    browse.click();
    assert.deepEqual(actions[3], {
      action: "acp-replay-trace-browse",
      payload: { phase: "governance round 2", cadence: "burst" },
    });
  });

  it("renders the current run slot with a live elapsed timer", function () {
    renderSelection(
      makeSelection(
        {},
        {
          state: "running",
          tracePath: "/tmp/trace.ndjson",
          phase: "stage",
          phaseValidation: "ready",
          traceValidation: "ready",
          currentRun: {
            surface: "open-inactive",
            role: "formal",
            runIndex: 1,
            matrixIndex: 4,
            syntheticRootId: "root",
            startedAt: new Date(Date.now() - 1000).toISOString(),
          },
        },
      ),
    );
    const replay = container.querySelector(
      '[data-region-content="dashboard-acp-replay-profiler"]',
    )!;
    const current = replay.querySelector(".acp-replay-matrix-slot.is-current")!;
    assert.ok(current, "current slot exists");
    assert.equal(current.getAttribute("data-state"), "current");
    assert.ok(
      current.getAttribute("data-started-at"),
      "started-at attribute set",
    );
    const timer = current.querySelector(".acp-replay-slot-timer");
    assert.ok(timer, "elapsed timer rendered inside the current slot");
    assert.match(timer!.textContent || "", /^ · \d+ ms$/);
    assert.isTrue(
      replay.querySelector<HTMLInputElement>(".profiler-trace-control input")!
        .disabled,
      "running replay locks the trace controls",
    );
    const cancel = replay.querySelector<HTMLButtonElement>(
      ".profiler-toolbar-actions .btn.danger",
    )!;
    cancel.click();
    assert.deepEqual(actions, [
      { action: "acp-replay-profiler-cancel", payload: {} },
    ]);
  });

  it("renders summary cards and the evidence details", function () {
    const record = {
      surface: "closed",
      role: "formal",
      runIndex: 1,
      syntheticRootId: "root",
      completion: "complete",
      executionCompletion: "complete",
      measurementCompletion: "complete",
      acceptance: { state: "accepted", reasons: [] },
      measurement: {
        elapsedMs: 12.5,
        timing: "wall-clock",
        families: {
          transport: { state: "captured", detail: "" },
          r1: { state: "captured", detail: "" },
          r2: { state: "captured", detail: "" },
          r3: { state: "not-applicable", detail: "" },
        },
        warnings: [],
      },
      replay: {
        completion: "complete",
        projectedEvents: 1,
        consumedNoopEvents: 0,
        appliedEvents: 1,
        skippedEvents: 0,
        unknownEvents: 0,
        appliedBytes: 10,
        projectedBytes: 10,
        consumedNoopBytes: 0,
        eventKinds: {},
        schedulerLagMs: 0,
        drain: { ok: true, state: "ok" },
        warnings: [],
      },
      r2: {},
    };
    renderSelection(
      makeSelection(
        {},
        {
          tracePath: "/tmp/trace.ndjson",
          phase: "stage",
          traceMetadata: {
            schema: "acp-semantic-trace/v1",
            sourceKind: "acp-chat-conversation",
            digest: "abc",
            createdAt: "2026-09-01T00:00:00.000Z",
            eventCount: 10,
            contentBytes: 2048,
            completion: "complete",
            sampleName: "sample-one",
          },
          records: [record],
          surfaceSummaries: [
            {
              surface: "closed",
              completion: "complete",
              formalCount: 2,
              elapsedMeanMs: 12.34,
              elapsedMinMs: 10.1,
              elapsedMaxMs: 14.56,
              eventsPerSecond: 5.5,
              mibPerSecond: 0.001,
              records: [],
            },
          ],
          matrix: {
            executionCompletion: "complete",
            measurementCompletion: "incomplete",
          },
          jsonPath: "/tmp/out/matrix.json",
          markdownPath: "/tmp/out/matrix.md",
          resultFolder: "/tmp/out",
        },
      ),
    );
    const replay = container.querySelector(
      '[data-region-content="dashboard-acp-replay-profiler"]',
    )!;

    const summaryCards = replay.querySelectorAll(".acp-replay-summary-card");
    assert.equal(summaryCards.length, 1);
    assert.equal(
      summaryCards[0].querySelectorAll(".mono")[0]?.textContent,
      "complete · n=2 · 12.3 ms (10.1–14.6)",
    );
    assert.equal(
      summaryCards[0].querySelectorAll(".mono")[1]?.textContent,
      "5.5 events/s · 0.001 MiB/s",
    );

    const completedSlot = replay.querySelector(
      ".acp-replay-matrix-slot.is-complete",
    );
    assert.ok(completedSlot, "recorded slot renders as complete");

    const evidence = replay.querySelector("details.acp-trace-replay-details")!;
    assert.ok(evidence, "evidence details render");
    const terms = Array.from(evidence.querySelectorAll("dt")).map(
      (node) => node.textContent,
    );
    assert.deepEqual(terms, [
      "Schema",
      "Source",
      "Digest",
      "Created",
      "Events",
      "Bytes",
      "Completion",
      "Execution",
      "Measurement",
    ]);
    const runLine = evidence.querySelector(
      ".acp-replay-run-evidence li",
    )?.textContent;
    assert.equal(
      runLine,
      "closed / formal 2: R1 captured, R2 captured, R3 not-applicable, drain ok",
    );
    assert.ok(
      evidence
        .querySelector(".profiler-saved-path")
        ?.textContent?.includes("/tmp/out/matrix.json"),
      "saved artifact paths listed",
    );
  });

  it("keeps region subtree identity on equal re-render and isolates replay-only changes", function () {
    renderSelection(makeSelection());
    const regions = {
      recorder: container.querySelector(
        '[data-region-content="dashboard-acp-trace-recorder"]',
      )!,
      replay: container.querySelector(
        '[data-region-content="dashboard-acp-replay-profiler"]',
      )!,
    };
    const captured = captureRegionSubtrees(regions);

    // Fresh object graph with identical visible content: nothing rebuilds.
    renderSelection(makeSelection());
    assertRegionSubtreesPreserved(regions, captured);

    // A replay-only visible change must not rebuild the recorder subtree.
    renderSelection(
      makeSelection({}, { progress: { completed: 2, total: 9 } }),
    );
    assertRegionSubtreesPreserved(
      { recorder: regions.recorder },
      { recorder: captured.recorder },
    );
    assert.ok(
      regions.replay.textContent?.includes("Progress: 2/9"),
      "replay subtree reflects the updated progress",
    );
  });

  it("renders the unavailable empty state when a view is missing", function () {
    const selection = projectDashboardAcpTraceReplaySelection(
      null,
      null,
      makeResolver(makeLabels()),
    );
    renderSelection(selection);
    const empties = container.querySelectorAll(".empty");
    assert.equal(empties.length, 2);
    assert.equal(empties[0].textContent, "ACP Trace Recorder unavailable");
    assert.equal(empties[1].textContent, "ACP Replay Profiler unavailable");
    assert.equal(
      container.querySelectorAll("section.panel.profiler-capture-panel").length,
      0,
    );
  });
});
