/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { memo } from "preact/compat";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";

import { equalBySignature } from "../../shared/regionEquality";
import type {
  DashboardActionHandler,
  DashboardHostActionName,
} from "../../shared/dashboardWireContract";

// ACP Trace & Replay surface of the dashboard page: the semantic trace
// recorder (source/limits configuration, arm/finish/cancel/save/open-folder/
// reset lifecycle, warnings) and the replay profiler (trace path
// browse/preflight, phase/cadence drafts, 3x3 live matrix slots with elapsed
// timers, per-surface summary cards, evidence details).
//
// Action names and payload shapes mirror the legacy implementation
// (addon/content/dashboard/app.js renderAcpTraceRecorder/renderAcpReplayProfiler,
// :2968-3551) and the host handler in src/modules/taskManagerDialog.ts:
//   acp-trace-recorder-start        { sourceKind, maxBytes, maxEvents, maxEventBytes }
//   acp-trace-recorder-finish       {}
//   acp-trace-recorder-cancel       {}
//   acp-trace-recorder-save         {}
//   acp-trace-recorder-open-folder  {}
//   acp-trace-recorder-reset        {}
//   acp-replay-trace-browse         { phase, cadence }
//   acp-replay-trace-preflight      { tracePath, phase, cadence }
//   acp-replay-profiler-set-draft   { phase, cadence }
//   acp-replay-profiler-start       { tracePath, phase, cadence }
//   acp-replay-profiler-cancel      {}
//   acp-replay-profiler-open-folder {}
//
// The wire slots snapshot.acpTraceRecorderView / acpReplayProfilerView stay
// `unknown` page-side; the projectors below narrow them into the selection
// DTOs the component renders. Display strings resolve through the injected
// label resolver (the import boundary forbids importing ../dashboardLabels,
// so the panel model binds labelText and passes it in).

export type DashboardRegionLabelResolver = (
  key: string,
  fallback?: string,
) => string;

export type DashboardAcpTraceReplayAction = Extract<
  DashboardHostActionName,
  | "acp-trace-recorder-start"
  | "acp-trace-recorder-finish"
  | "acp-trace-recorder-cancel"
  | "acp-trace-recorder-save"
  | "acp-trace-recorder-open-folder"
  | "acp-trace-recorder-reset"
  | "acp-replay-trace-browse"
  | "acp-replay-trace-preflight"
  | "acp-replay-profiler-set-draft"
  | "acp-replay-profiler-start"
  | "acp-replay-profiler-cancel"
  | "acp-replay-profiler-open-folder"
>;

export type DashboardAcpTraceSourceKind =
  | "acp-chat-conversation"
  | "acp-workflow-execution";

type DashboardAcpReplayCadence = "recorded" | "logical" | "burst";

function normalizeTraceSourceKind(value: string): DashboardAcpTraceSourceKind {
  return value === "acp-workflow-execution"
    ? "acp-workflow-execution"
    : "acp-chat-conversation";
}

function normalizeReplayCadence(value: string): DashboardAcpReplayCadence {
  return value === "recorded" || value === "burst" ? value : "logical";
}

export type DashboardAcpTraceRecorderLimitField = {
  key: "maxBytes" | "maxEvents" | "maxEventBytes";
  label: string;
  value: string;
};

export type DashboardAcpTraceRecorderButton = {
  kind: "arm" | "finish" | "cancel" | "save" | "open-folder" | "reset";
  label: string;
  className: string;
  disabled: boolean;
};

export type DashboardAcpTraceRecorderSelection = {
  available: boolean;
  unavailableText: string;
  stepTitle: string;
  sensitiveWarning: string;
  traceTypeLabel: string;
  sourceOptions: Array<{ value: DashboardAcpTraceSourceKind; label: string }>;
  sourceKind: string;
  locked: boolean;
  advancedLimitsLabel: string;
  limitFields: DashboardAcpTraceRecorderLimitField[];
  lifecycleText: string;
  bindingText: string;
  noticeText: string;
  buttons: DashboardAcpTraceRecorderButton[];
  warningLines: string[];
  savedPathText: string;
};

export type DashboardAcpReplaySlotState =
  | "current"
  | "complete"
  | "warning"
  | "incomplete"
  | "pending";

export type DashboardAcpReplayMatrixSlot = {
  surface: string;
  runIndex: number;
  label: string;
  state: DashboardAcpReplaySlotState;
  // Raw view.currentRun.startedAt; "" unless the slot is the current run.
  startedAt: string;
};

export type DashboardAcpReplayMatrixSurface = {
  surface: string;
  slots: DashboardAcpReplayMatrixSlot[];
};

export type DashboardAcpReplaySummaryCard = {
  surface: string;
  line1: string;
  line2: string;
};

export type DashboardAcpReplayEvidenceEntry = {
  term: string;
  value: string;
};

export type DashboardAcpReplayProfilerSelection = {
  available: boolean;
  unavailableText: string;
  stepTitle: string;
  tracePlaceholder: string;
  phasePlaceholder: string;
  cadenceOptions: Array<{ value: string; label: string }>;
  browseLabel: string;
  completeTraceLabel: string;
  phaseLabel: string;
  cadenceLabel: string;
  sampleText: string;
  progressText: string;
  runLabel: string;
  cancelLabel: string;
  openResultFolderLabel: string;
  phaseInvalidText: string;
  evidenceDetailsLabel: string;
  tracePath: string;
  phase: string;
  cadence: string;
  running: boolean;
  canceling: boolean;
  hasResultFolder: boolean;
  showPhaseInvalid: boolean;
  errorText: string;
  matrixSurfaces: DashboardAcpReplayMatrixSurface[];
  summaryCards: DashboardAcpReplaySummaryCard[];
  metadataEntries: DashboardAcpReplayEvidenceEntry[];
  matrixEntries: DashboardAcpReplayEvidenceEntry[];
  evidenceWarnings: string[];
  evidenceSavedPaths: string;
  recordLines: string[];
  showEvidence: boolean;
};

export type DashboardAcpTraceReplaySelection = {
  pageTitle: string;
  recorder: DashboardAcpTraceRecorderSelection;
  replay: DashboardAcpReplayProfilerSelection;
};

// ---------------------------------------------------------------------------
// Projection (unknown wire view -> selection)
// ---------------------------------------------------------------------------

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asText(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  return value == null ? fallback : String(value);
}

function asNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const REPLAY_SURFACES = ["closed", "open-inactive", "target-active"];
const REPLAY_SLOT_ROLES = ["warm-up", "formal", "formal"];
const REPLAY_CADENCE_VALUES = ["recorded", "logical", "burst"] as const;

export function projectDashboardAcpTraceRecorderSelection(
  recorderView: unknown,
  resolveLabel: DashboardRegionLabelResolver,
): DashboardAcpTraceRecorderSelection {
  const view = asRecord(recorderView);
  const unavailableText = resolveLabel(
    "acpTraceRecorderUnavailable",
    "ACP Trace Recorder unavailable",
  );
  const base: DashboardAcpTraceRecorderSelection = {
    available: view !== null,
    unavailableText,
    stepTitle: resolveLabel(
      "acpTraceRecorderStepTitle",
      "1. ACP Trace Recorder",
    ),
    sensitiveWarning: resolveLabel(
      "acpTraceSensitiveWarning",
      "Trace files contain complete prompts, assistant text, tool arguments, and outputs. They remain local and may contain sensitive data.",
    ),
    traceTypeLabel: resolveLabel("acpTraceType", "Trace type"),
    sourceOptions: [
      {
        value: "acp-chat-conversation",
        label: resolveLabel("acpTraceChatSource", "ACP Chat conversation"),
      },
      {
        value: "acp-workflow-execution",
        label: resolveLabel("acpTraceWorkflowSource", "ACP Workflow execution"),
      },
    ],
    sourceKind: "acp-chat-conversation",
    locked: false,
    advancedLimitsLabel: resolveLabel(
      "acpTraceAdvancedLimits",
      "Advanced capture limits",
    ),
    limitFields: [],
    lifecycleText: "",
    bindingText: "",
    noticeText: "",
    buttons: [],
    warningLines: [],
    savedPathText: "",
  };
  if (!view) return base;

  const state = asText(view.state, "idle");
  const sourceKind: DashboardAcpTraceSourceKind =
    view.sourceKind === "acp-workflow-execution"
      ? "acp-workflow-execution"
      : "acp-chat-conversation";
  const limits = asRecord(view.limits);
  const activeTurnCount = asNumber(view.activeTurnCount);
  const activeRequestCount = asNumber(view.activeRequestCount);
  const completion = asText(view.completion);

  const lifecycleLabel =
    state === "armed"
      ? view.claiming === true
        ? resolveLabel("acpTraceConnecting", "Connecting")
        : resolveLabel(
            "acpTraceWaitingExplicitConnection",
            "Waiting for an explicit connection",
          )
      : state === "recording"
        ? resolveLabel("acpTraceBound", "Recording bound target")
        : state === "stopping"
          ? resolveLabel(
              "acpTraceStopping",
              "Waiting for active work to finish",
            )
          : state;

  const binding = asRecord(view.binding);
  let bindingText = "";
  if (binding) {
    bindingText =
      binding.sourceKind === "acp-chat-conversation"
        ? `${asText(binding.backendId)} / ${asText(binding.conversationId)} / ${asText(binding.sessionId)} (${asText(binding.attachKind)})`
        : `${asText(binding.workflowId, "workflow") || "workflow"} / ${asText(binding.workflowRunId)}`;
  }

  const notice = asRecord(view.notice);
  const noticeText =
    notice && notice.code === "session-replaced"
      ? `${resolveLabel("acpTraceSessionReplaced", "A replacement remote session is not being recorded.")} ${asText(notice.sessionId)}`
      : "";

  const buttons: DashboardAcpTraceRecorderButton[] = [];
  if (state === "idle") {
    buttons.push({
      kind: "arm",
      label: resolveLabel("acpTraceArm", "Arm Recorder"),
      className: "btn primary",
      disabled: false,
    });
  }
  if (state === "recording" && view.canFinish === true) {
    buttons.push({
      kind: "finish",
      label:
        activeTurnCount > 0 || activeRequestCount > 0
          ? resolveLabel("acpTraceFinishAfterTurn", "Finish after Current Turn")
          : resolveLabel("acpTraceFinish", "Finish Recording"),
      className: "btn danger",
      disabled: false,
    });
  }
  if (state === "armed" || state === "recording" || state === "stopping") {
    buttons.push({
      kind: "cancel",
      label: resolveLabel("acpTraceCancel", "Cancel Recording"),
      className: "btn",
      disabled: false,
    });
  }
  if (state === "frozen" && completion === "complete") {
    buttons.push({
      kind: "save",
      label: resolveLabel("acpTraceSave", "Save & Use for Replay"),
      className: "btn primary",
      disabled: false,
    });
  }
  buttons.push({
    kind: "open-folder",
    label: resolveLabel("acpTraceOpenFolder", "Open Folder"),
    className: "btn",
    disabled: !asText(view.folder),
  });
  if (
    state === "saved" ||
    (state === "frozen" && completion === "incomplete")
  ) {
    buttons.push({
      kind: "reset",
      label: resolveLabel("acpTraceNewRecording", "New Recording"),
      className: "btn",
      disabled: false,
    });
  }

  const warnings = Array.isArray(view.warnings) ? view.warnings : [];
  const savedPath = asText(view.savedPath) || asText(view.partialPath);

  return {
    ...base,
    sourceKind,
    locked: state !== "idle",
    limitFields: [
      {
        key: "maxBytes",
        label: resolveLabel("acpTraceMaxBytes", "Maximum bytes"),
        value: String(asNumber(limits?.maxBytes, 268435456) || 268435456),
      },
      {
        key: "maxEvents",
        label: resolveLabel("acpTraceMaxEvents", "Maximum events"),
        value: String(asNumber(limits?.maxEvents, 250000) || 250000),
      },
      {
        key: "maxEventBytes",
        label: resolveLabel("acpTraceMaxEventBytes", "Maximum bytes per event"),
        value: String(asNumber(limits?.maxEventBytes, 16777216) || 16777216),
      },
    ],
    lifecycleText: `${lifecycleLabel}; events: ${asNumber(view.eventCount)}; bytes: ${asNumber(view.contentBytes)}; active turns: ${activeTurnCount}; active requests: ${activeRequestCount}; completion: ${completion || "pending"}`,
    bindingText,
    noticeText,
    buttons,
    warningLines: warnings.map((warning) => {
      const entry = asRecord(warning);
      const code = asText(entry?.code);
      const detail = asText(entry?.detail);
      return `${code}${detail ? `: ${detail}` : ""}`;
    }),
    savedPathText: savedPath,
  };
}

export function projectDashboardAcpReplayProfilerSelection(
  replayView: unknown,
  resolveLabel: DashboardRegionLabelResolver,
): DashboardAcpReplayProfilerSelection {
  const view = asRecord(replayView);
  const unavailableText = resolveLabel(
    "acpReplayProfilerUnavailable",
    "ACP Replay Profiler unavailable",
  );
  const base: DashboardAcpReplayProfilerSelection = {
    available: view !== null,
    unavailableText,
    stepTitle: resolveLabel(
      "acpReplayProfilerStepTitle",
      "2. ACP Replay Profiler",
    ),
    tracePlaceholder: resolveLabel(
      "acpReplayProfilerTracePlaceholder",
      "Local complete .ndjson trace path",
    ),
    phasePlaceholder: resolveLabel(
      "acpReplayPhasePlaceholder",
      "e.g. governance round 2",
    ),
    cadenceOptions: REPLAY_CADENCE_VALUES.map((value) => ({
      value,
      label:
        value === "recorded"
          ? resolveLabel("acpReplayCadenceRecorded", "Recorded time")
          : value === "logical"
            ? resolveLabel("acpReplayCadenceLogical", "Logical time")
            : resolveLabel("acpReplayCadenceBurst", "Burst"),
    })),
    browseLabel: resolveLabel("acpReplayBrowse", "Browse…"),
    completeTraceLabel: resolveLabel(
      "acpReplayCompleteTrace",
      "Complete local trace",
    ),
    phaseLabel: resolveLabel("acpReplayPhase", "Phase"),
    cadenceLabel: resolveLabel("acpReplayCadence", "Cadence"),
    sampleText: "",
    progressText: "",
    runLabel: resolveLabel("acpReplayRun", "Run Nine-Replay Matrix"),
    cancelLabel: resolveLabel("acpReplayCancel", "Cancel Replay"),
    openResultFolderLabel: resolveLabel(
      "acpReplayOpenResultFolder",
      "Open Result Folder",
    ),
    phaseInvalidText: resolveLabel(
      "acpReplayPhaseInvalid",
      "Enter a valid stage (1–80 characters).",
    ),
    evidenceDetailsLabel: resolveLabel(
      "acpReplayEvidenceDetails",
      "Trace and run evidence",
    ),
    tracePath: "",
    phase: "",
    cadence: "logical",
    running: false,
    canceling: false,
    hasResultFolder: false,
    showPhaseInvalid: false,
    errorText: "",
    matrixSurfaces: [],
    summaryCards: [],
    metadataEntries: [],
    matrixEntries: [],
    evidenceWarnings: [],
    evidenceSavedPaths: "",
    recordLines: [],
    showEvidence: false,
  };
  if (!view) return base;

  const state = asText(view.state, "idle");
  const running = state === "running" || state === "canceling";
  const traceMetadata = asRecord(view.traceMetadata);
  const progress = asRecord(view.progress);
  const currentRun = asRecord(view.currentRun);
  const records = Array.isArray(view.records) ? view.records : [];
  const surfaceSummaries = Array.isArray(view.surfaceSummaries)
    ? view.surfaceSummaries
    : [];
  const matrix = asRecord(view.matrix);
  const cadenceCandidate = asText(view.cadence, "logical");
  const cadence = normalizeReplayCadence(cadenceCandidate);

  const matrixSurfaces: DashboardAcpReplayMatrixSurface[] = REPLAY_SURFACES.map(
    (surface) => ({
      surface,
      slots: REPLAY_SLOT_ROLES.map((role, runIndex) => {
        const record = records
          .map((entry) => asRecord(entry))
          .find(
            (entry) =>
              entry &&
              asText(entry.surface) === surface &&
              asNumber(entry.runIndex, -1) === runIndex,
          );
        const isCurrent =
          currentRun !== null &&
          asText(currentRun.surface) === surface &&
          asNumber(currentRun.runIndex, -1) === runIndex;
        let slotState: DashboardAcpReplaySlotState = "pending";
        if (isCurrent) {
          slotState = "current";
        } else if (record) {
          const measured =
            asText(record.executionCompletion) === "complete" &&
            asText(record.measurementCompletion) === "complete";
          if (measured) {
            const replay = asRecord(record.replay);
            const replayWarnings = Array.isArray(replay?.warnings)
              ? replay.warnings
              : [];
            slotState = replayWarnings.length > 0 ? "warning" : "complete";
          } else {
            slotState = "incomplete";
          }
        }
        return {
          surface,
          runIndex,
          label: `${runIndex + 1}. ${role} · ${slotState}`,
          state: slotState,
          startedAt:
            isCurrent && currentRun ? asText(currentRun.startedAt) : "",
        };
      }),
    }),
  );

  const summaryCards: DashboardAcpReplaySummaryCard[] = surfaceSummaries.some(
    (entry) => asNumber(asRecord(entry)?.formalCount) > 0,
  )
    ? surfaceSummaries.map((entry) => {
        const summary = asRecord(entry) || {};
        return {
          surface: asText(summary.surface),
          line1: `${asText(summary.completion)} · n=${asNumber(summary.formalCount)} · ${asNumber(summary.elapsedMeanMs).toFixed(1)} ms (${asNumber(summary.elapsedMinMs).toFixed(1)}–${asNumber(summary.elapsedMaxMs).toFixed(1)})`,
          line2: `${asNumber(summary.eventsPerSecond).toFixed(1)} events/s · ${asNumber(summary.mibPerSecond).toFixed(3)} MiB/s`,
        };
      })
    : [];

  const metadataEntries: DashboardAcpReplayEvidenceEntry[] = traceMetadata
    ? [
        { term: "Schema", value: asText(traceMetadata.schema) },
        { term: "Source", value: asText(traceMetadata.sourceKind) },
        { term: "Digest", value: asText(traceMetadata.digest) },
        { term: "Created", value: asText(traceMetadata.createdAt) },
        { term: "Events", value: String(asNumber(traceMetadata.eventCount)) },
        {
          term: "Bytes",
          value: String(asNumber(traceMetadata.contentBytes)),
        },
        { term: "Completion", value: asText(traceMetadata.completion) },
      ]
    : [];
  const matrixEntries: DashboardAcpReplayEvidenceEntry[] = matrix
    ? [
        {
          term: "Execution",
          value: asText(matrix.executionCompletion, "incomplete"),
        },
        {
          term: "Measurement",
          value: asText(matrix.measurementCompletion, "incomplete"),
        },
      ]
    : [];

  const warnings = Array.isArray(view.warnings)
    ? view.warnings.map((warning) => asText(warning))
    : [];
  const evidenceSavedPaths = [asText(view.jsonPath), asText(view.markdownPath)]
    .filter(Boolean)
    .join("\n");
  const recordLines = records.map((entry) => {
    const record = asRecord(entry) || {};
    const measurement = asRecord(record.measurement);
    const families = asRecord(measurement?.families);
    const familyState = (key: string) =>
      asText(asRecord(families?.[key])?.state);
    const replay = asRecord(record.replay);
    const drain = asRecord(replay?.drain);
    const drainState =
      asText(drain?.state) || (drain?.ok === true ? "ok" : "failed");
    const failure = asRecord(record.failure);
    const failureText = failure
      ? `, failure ${asText(failure.phase)}: ${asText(failure.detail)}`
      : "";
    return `${asText(record.surface)} / ${asText(record.role)} ${asNumber(record.runIndex) + 1}: R1 ${familyState("r1")}, R2 ${familyState("r2")}, R3 ${familyState("r3")}, drain ${drainState}${failureText}`;
  });

  return {
    ...base,
    sampleText: `${resolveLabel("acpReplaySample", "Sample")}: ${asText(traceMetadata?.sampleName) || "—"}`,
    progressText: `${resolveLabel("acpReplayProgress", "Progress")}: ${asNumber(progress?.completed)}/9`,
    tracePath: asText(view.tracePath),
    phase: asText(view.phase),
    cadence,
    running,
    canceling: state === "canceling",
    hasResultFolder: Boolean(asText(view.resultFolder)),
    showPhaseInvalid:
      view.phaseValidation === "invalid" ||
      Boolean(asText(view.phaseErrorCode)),
    errorText: asText(view.error),
    matrixSurfaces,
    summaryCards,
    metadataEntries,
    matrixEntries,
    evidenceWarnings: warnings,
    evidenceSavedPaths,
    recordLines,
    showEvidence: Boolean(
      traceMetadata ||
      matrix ||
      warnings.length ||
      evidenceSavedPaths ||
      recordLines.length,
    ),
  };
}

export function projectDashboardAcpTraceReplaySelection(
  recorderView: unknown,
  replayView: unknown,
  resolveLabel: DashboardRegionLabelResolver,
): DashboardAcpTraceReplaySelection {
  return {
    pageTitle: resolveLabel("acpTraceReplayTabTitle", "ACP Trace & Replay"),
    recorder: projectDashboardAcpTraceRecorderSelection(
      recorderView,
      resolveLabel,
    ),
    replay: projectDashboardAcpReplayProfilerSelection(
      replayView,
      resolveLabel,
    ),
  };
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

type RegionActionHandler =
  DashboardActionHandler<DashboardAcpTraceReplayAction>;

// Live elapsed timer inside the current matrix slot. Replaces the legacy
// 250 ms setInterval + isConnected self-check (app.js:3432-3441) with a
// component-scoped interval whose cleanup runs on unmount.
function SlotElapsedTimer(props: { startedAt: string }) {
  const startedAtMs = Date.parse(props.startedAt);
  const [elapsedMs, setElapsedMs] = useState(() =>
    Number.isFinite(startedAtMs) ? Math.max(0, Date.now() - startedAtMs) : 0,
  );
  useEffect(() => {
    if (!Number.isFinite(startedAtMs)) return;
    const update = () => setElapsedMs(Math.max(0, Date.now() - startedAtMs));
    update();
    const id = window.setInterval(update, 250);
    return () => window.clearInterval(id);
  }, [startedAtMs]);
  return <span class="acp-replay-slot-timer">{` · ${elapsedMs} ms`}</span>;
}

const AcpTraceRecorderSection = memo(
  function AcpTraceRecorderSection(props: {
    selection: DashboardAcpTraceRecorderSelection;
    onAction: RegionActionHandler;
  }) {
    const { selection, onAction } = props;
    const sourceRef = useRef<HTMLSelectElement | null>(null);
    const limitRefs = useRef<Partial<Record<string, HTMLInputElement | null>>>(
      {},
    );

    // The recorder controls are uncontrolled (user edits stay in the DOM
    // until Arm reads them, as in the legacy implementation); these effects
    // only re-seed the DOM when the host view itself changes.
    useLayoutEffect(() => {
      const select = sourceRef.current;
      if (select && select.value !== selection.sourceKind) {
        select.value = selection.sourceKind;
      }
    }, [selection.sourceKind]);
    useLayoutEffect(() => {
      for (const field of selection.limitFields) {
        const input = limitRefs.current[field.key];
        if (input && input.value !== field.value) {
          input.value = field.value;
        }
      }
    }, [selection.limitFields]);

    if (!selection.available) {
      return <div class="empty">{selection.unavailableText}</div>;
    }

    const handleButton = (button: DashboardAcpTraceRecorderButton) => {
      if (button.disabled) return;
      switch (button.kind) {
        case "arm":
          onAction("acp-trace-recorder-start", {
            sourceKind: normalizeTraceSourceKind(
              sourceRef.current?.value || selection.sourceKind,
            ),
            maxBytes: Number(limitRefs.current.maxBytes?.value),
            maxEvents: Number(limitRefs.current.maxEvents?.value),
            maxEventBytes: Number(limitRefs.current.maxEventBytes?.value),
          });
          return;
        case "finish":
          onAction("acp-trace-recorder-finish", {});
          return;
        case "cancel":
          onAction("acp-trace-recorder-cancel", {});
          return;
        case "save":
          onAction("acp-trace-recorder-save", {});
          return;
        case "open-folder":
          onAction("acp-trace-recorder-open-folder", {});
          return;
        case "reset":
          onAction("acp-trace-recorder-reset", {});
          return;
      }
    };

    return (
      <>
        <h3 class="section-title">{selection.stepTitle}</h3>
        <div class="error-banner profiler-sensitive-warning">
          {selection.sensitiveWarning}
        </div>
        <section class="panel profiler-capture-panel">
          <div class="profiler-fields">
            <label class="profiler-field">
              <span class="profiler-field-label">
                {selection.traceTypeLabel}
              </span>
              <select
                class="select-input profiler-input"
                disabled={selection.locked}
                ref={sourceRef}
              >
                {selection.sourceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <details class="acp-trace-replay-details">
            <summary class="acp-trace-replay-details-summary">
              {selection.advancedLimitsLabel}
            </summary>
            <div class="profiler-fields acp-trace-advanced-fields">
              {selection.limitFields.map((field) => (
                <label class="profiler-field" key={field.key}>
                  <span class="profiler-field-label">{field.label}</span>
                  <input
                    class="text-input profiler-input"
                    type="number"
                    defaultValue={field.value}
                    disabled={selection.locked}
                    ref={(el) => {
                      limitRefs.current[field.key] = el;
                    }}
                  />
                </label>
              ))}
            </div>
          </details>
          <div class="mono profiler-saved-path">{selection.lifecycleText}</div>
          {selection.bindingText ? (
            <div class="mono profiler-saved-path acp-trace-binding">
              {selection.bindingText}
            </div>
          ) : null}
          {selection.noticeText ? (
            <div class="error-banner profiler-sensitive-warning acp-trace-notice">
              {selection.noticeText}
            </div>
          ) : null}
          <div class="toolbar-actions profiler-toolbar-actions">
            {selection.buttons.map((button) => (
              <button
                key={button.kind}
                class={button.className}
                disabled={button.disabled}
                onClick={() => handleButton(button)}
              >
                {button.label}
              </button>
            ))}
          </div>
        </section>
        {selection.warningLines.length > 0 ? (
          <ul class="profiler-warning-list">
            {selection.warningLines.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>
        ) : null}
        {selection.savedPathText ? (
          <div class="mono profiler-saved-path">{selection.savedPathText}</div>
        ) : null}
      </>
    );
  },
  (prev, next) =>
    prev.onAction === next.onAction &&
    equalBySignature(prev.selection, next.selection),
);

type ReplayDraft = {
  tracePath: string;
  phase: string;
  cadence: DashboardAcpReplayCadence;
};

// Legacy stage validation rejects C0/DEL control characters
// (app.js syncReplayStartAvailability); a code-point scan avoids a control
// character class in a regex literal.
function hasPhaseControlChar(text: string): boolean {
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

const AcpReplayProfilerSection = memo(
  function AcpReplayProfilerSection(props: {
    selection: DashboardAcpReplayProfilerSelection;
    onAction: RegionActionHandler;
  }) {
    const { selection, onAction } = props;
    const [draft, setDraft] = useState<ReplayDraft>({
      tracePath: selection.tracePath,
      phase: selection.phase,
      cadence: normalizeReplayCadence(selection.cadence),
    });
    const [seed, setSeed] = useState<ReplayDraft>({
      tracePath: selection.tracePath,
      phase: selection.phase,
      cadence: normalizeReplayCadence(selection.cadence),
    });
    const tracePathRef = useRef<HTMLInputElement | null>(null);
    const phaseInputRef = useRef<HTMLInputElement | null>(null);
    const draftRef = useRef(draft);
    draftRef.current = draft;
    // preact/compat maps onChange on text inputs to input-time notifications,
    // but the legacy contract commits preflight/set-draft on the native
    // change event (blur-commit / Enter), not on every keystroke. These two
    // commit channels therefore use native listeners on the input refs.
    useLayoutEffect(() => {
      const traceInput = tracePathRef.current;
      const phaseInput = phaseInputRef.current;
      const commitTracePath = () => {
        if (!traceInput) return;
        const value = traceInput.value;
        setDraft((current) => ({ ...current, tracePath: value }));
        onAction("acp-replay-trace-preflight", {
          tracePath: value,
          phase: draftRef.current.phase,
          cadence: draftRef.current.cadence,
        });
      };
      const commitPhase = () => {
        if (!phaseInput) return;
        const value = phaseInput.value;
        setDraft((current) => ({ ...current, phase: value }));
        onAction("acp-replay-profiler-set-draft", {
          phase: value,
          cadence: draftRef.current.cadence,
        });
      };
      traceInput?.addEventListener("change", commitTracePath);
      phaseInput?.addEventListener("change", commitPhase);
      return () => {
        traceInput?.removeEventListener("change", commitTracePath);
        phaseInput?.removeEventListener("change", commitPhase);
      };
    }, [onAction]);
    // Re-seed the local draft when the host view changes the draft fields
    // (browse picker result, save-and-use-for-replay preflight echo). Local
    // typing only diverges from the seed between input and change events.
    if (
      seed.tracePath !== selection.tracePath ||
      seed.phase !== selection.phase ||
      seed.cadence !== selection.cadence
    ) {
      const nextSeed = {
        tracePath: selection.tracePath,
        phase: selection.phase,
        cadence: normalizeReplayCadence(selection.cadence),
      };
      setSeed(nextSeed);
      setDraft(nextSeed);
    }

    if (!selection.available) {
      return <div class="empty">{selection.unavailableText}</div>;
    }

    const stage = draft.phase.trim();
    const stageValid =
      stage.length > 0 &&
      Array.from(stage).length <= 80 &&
      !hasPhaseControlChar(stage);
    const startDisabled =
      selection.running || !draft.tracePath.trim() || !stageValid;

    const updateDraft = (patch: Partial<ReplayDraft>) => {
      setDraft((current) => ({ ...current, ...patch }));
    };

    const sendPreflight = (tracePath: string) => {
      onAction("acp-replay-trace-preflight", {
        tracePath,
        phase: draft.phase,
        cadence: draft.cadence,
      });
    };

    return (
      <>
        <h3 class="section-title">{selection.stepTitle}</h3>
        <section class="panel profiler-capture-panel">
          <div class="profiler-fields">
            <label class="profiler-field">
              <span class="profiler-field-label">
                {selection.completeTraceLabel}
              </span>
              <div class="profiler-trace-control">
                <input
                  class="text-input profiler-input"
                  placeholder={selection.tracePlaceholder}
                  value={draft.tracePath}
                  disabled={selection.running}
                  ref={tracePathRef}
                  onInput={(event) => {
                    updateDraft({
                      tracePath: (event.currentTarget as HTMLInputElement)
                        .value,
                    });
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    sendPreflight(
                      (event.currentTarget as HTMLInputElement).value,
                    );
                  }}
                />
                <button
                  class="btn"
                  disabled={selection.running}
                  onClick={() =>
                    onAction("acp-replay-trace-browse", {
                      phase: draft.phase,
                      cadence: draft.cadence,
                    })
                  }
                >
                  {selection.browseLabel}
                </button>
              </div>
            </label>
            <label class="profiler-field">
              <span class="profiler-field-label">{selection.phaseLabel}</span>
              <input
                class="text-input profiler-input"
                maxLength={80}
                placeholder={selection.phasePlaceholder}
                value={draft.phase}
                aria-invalid={stageValid ? "false" : "true"}
                disabled={selection.running}
                ref={phaseInputRef}
                onInput={(event) => {
                  updateDraft({
                    phase: (event.currentTarget as HTMLInputElement).value,
                  });
                }}
              />
            </label>
            <label class="profiler-field">
              <span class="profiler-field-label">{selection.cadenceLabel}</span>
              <select
                class="select-input profiler-input"
                value={draft.cadence}
                disabled={selection.running}
                onChange={(event) => {
                  updateDraft({
                    cadence: normalizeReplayCadence(
                      (event.currentTarget as HTMLSelectElement).value,
                    ),
                  });
                }}
              >
                {selection.cadenceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div class="acp-replay-identity">
            <span class="acp-replay-sample-name">{selection.sampleText}</span>
            <span class="mono">{selection.progressText}</span>
          </div>
          <div class="toolbar-actions profiler-toolbar-actions">
            <button
              class="btn primary"
              disabled={startDisabled}
              onClick={() => {
                if (startDisabled) return;
                onAction("acp-replay-profiler-start", {
                  tracePath: draft.tracePath,
                  phase: draft.phase,
                  cadence: draft.cadence,
                });
              }}
            >
              {selection.runLabel}
            </button>
            {selection.running ? (
              <button
                class="btn danger"
                disabled={selection.canceling}
                onClick={() => onAction("acp-replay-profiler-cancel", {})}
              >
                {selection.cancelLabel}
              </button>
            ) : null}
            <button
              class="btn"
              disabled={!selection.hasResultFolder}
              onClick={() => onAction("acp-replay-profiler-open-folder", {})}
            >
              {selection.openResultFolderLabel}
            </button>
          </div>
        </section>
        {selection.showPhaseInvalid ? (
          <div class="error-banner">{selection.phaseInvalidText}</div>
        ) : null}
        <div class="acp-replay-matrix-grid">
          {selection.matrixSurfaces.map((group) => (
            <section class="acp-replay-matrix-surface" key={group.surface}>
              <h4 class="acp-replay-matrix-title">{group.surface}</h4>
              {group.slots.map((slot) => (
                <div
                  key={slot.runIndex}
                  class={`acp-replay-matrix-slot is-${slot.state}`}
                  data-state={slot.state}
                  data-started-at={slot.startedAt || undefined}
                >
                  {slot.label}
                  {slot.startedAt ? (
                    <SlotElapsedTimer startedAt={slot.startedAt} />
                  ) : null}
                </div>
              ))}
            </section>
          ))}
        </div>
        {selection.summaryCards.length > 0 ? (
          <div class="acp-replay-summary-grid">
            {selection.summaryCards.map((card) => (
              <section class="panel acp-replay-summary-card" key={card.surface}>
                <h4 class="acp-replay-matrix-title">{card.surface}</h4>
                <div class="mono">{card.line1}</div>
                <div class="mono">{card.line2}</div>
              </section>
            ))}
          </div>
        ) : null}
        {selection.errorText ? (
          <div class="error-banner">{selection.errorText}</div>
        ) : null}
        {selection.showEvidence ? (
          <details class="acp-trace-replay-details">
            <summary class="acp-trace-replay-details-summary">
              {selection.evidenceDetailsLabel}
            </summary>
            {selection.metadataEntries.length > 0 ? (
              <dl class="profiler-trace-summary">
                {selection.metadataEntries.map((entry) => (
                  <>
                    <dt>{entry.term}</dt>
                    <dd class="mono">{entry.value}</dd>
                  </>
                ))}
              </dl>
            ) : null}
            {selection.matrixEntries.length > 0 ? (
              <dl class="profiler-trace-summary">
                {selection.matrixEntries.map((entry) => (
                  <>
                    <dt>{entry.term}</dt>
                    <dd class="mono">{entry.value}</dd>
                  </>
                ))}
              </dl>
            ) : null}
            {selection.evidenceWarnings.length > 0 ? (
              <ul class="profiler-warning-list">
                {selection.evidenceWarnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            ) : null}
            {selection.evidenceSavedPaths ? (
              <div class="mono profiler-saved-path">
                {selection.evidenceSavedPaths}
              </div>
            ) : null}
            {selection.recordLines.length > 0 ? (
              <ul class="profiler-warning-list acp-replay-run-evidence">
                {selection.recordLines.map((line, index) => (
                  <li class="mono" key={index}>
                    {line}
                  </li>
                ))}
              </ul>
            ) : null}
          </details>
        ) : null}
      </>
    );
  },
  (prev, next) =>
    prev.onAction === next.onAction &&
    equalBySignature(prev.selection, next.selection),
);

export const AcpTraceReplayRegion = memo(
  function AcpTraceReplayRegion(props: {
    selection: DashboardAcpTraceReplaySelection;
    onAction: RegionActionHandler;
  }) {
    const { selection, onAction } = props;
    return (
      <div
        class="dashboard-acp-trace-replay"
        data-region-content="dashboard-acp-trace-replay"
      >
        <h2 class="page-title">{selection.pageTitle}</h2>
        <div class="acp-trace-replay-workflow">
          <section
            class="panel acp-trace-replay-step"
            data-region-content="dashboard-acp-trace-recorder"
          >
            <AcpTraceRecorderSection
              selection={selection.recorder}
              onAction={onAction}
            />
          </section>
          <section
            class="panel acp-trace-replay-step"
            data-region-content="dashboard-acp-replay-profiler"
          >
            <AcpReplayProfilerSection
              selection={selection.replay}
              onAction={onAction}
            />
          </section>
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.onAction === next.onAction &&
    equalBySignature(prev.selection, next.selection),
);
