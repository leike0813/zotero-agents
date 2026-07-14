import {
  loadAcpRuntimeSemanticTrace,
  type AcpRuntimeSemanticTraceDocument,
  type AcpRuntimeTraceSourceKind,
} from "./acpRuntimeSemanticTrace";
import {
  runAcpRuntimeReplayMatrix,
  saveAcpRuntimeReplayMatrix,
  projectAcpRuntimeReplaySurfaceSummaries,
  type AcpRuntimeR2InputPort,
  type AcpRuntimeReplayCadence,
  type AcpRuntimeReplayCancellationSignal,
  type AcpRuntimeReplayCurrentRun,
  type AcpRuntimeReplayMatrix,
  type AcpRuntimeReplayProfileRecord,
  type AcpRuntimeReplayProfilerPort,
  type AcpRuntimeReplayTarget,
  type AcpRuntimeReplaySurfaceSummary,
  type AcpRuntimeReplayWorkspacePort,
} from "./acpRuntimeReplayProfiler";
import { createAcpRuntimeReplayTarget } from "./acpRuntimeReplayTargets";
import {
  createAcpRuntimeR2ProductionNoopPort,
  createAcpRuntimeReplayProductionProfilerPort,
  createAcpRuntimeReplayProductionWorkspacePort,
} from "./acpRuntimeReplayProductionPorts";
import {
  deriveAcpRuntimeReplaySampleName,
  normalizeAcpRuntimeReplayPhase,
  type AcpRuntimeReplayPhaseValidation,
} from "./acpRuntimeReplayIdentity";

export type AcpRuntimeReplayTraceMetadata = {
  schema: string;
  sourceKind: AcpRuntimeTraceSourceKind;
  digest: string;
  createdAt: string;
  eventCount: number;
  contentBytes: number;
  completion: "complete" | "incomplete";
  sampleName: string;
};

export type AcpRuntimeReplayControllerView = {
  state:
    | "idle"
    | "running"
    | "canceling"
    | "complete"
    | "incomplete"
    | "canceled"
    | "failed";
  tracePath: string;
  traceValidation: "empty" | "unvalidated" | "validating" | "ready" | "invalid";
  traceMetadata?: AcpRuntimeReplayTraceMetadata;
  phase: string;
  phaseValidation: "empty" | "ready" | "invalid";
  phaseErrorCode?: Exclude<
    AcpRuntimeReplayPhaseValidation,
    { valid: true }
  >["errorCode"];
  cadence: AcpRuntimeReplayCadence;
  progress: {
    completed: number;
    total: 9;
    surface?: AcpRuntimeReplayProfileRecord["surface"];
    role?: AcpRuntimeReplayProfileRecord["role"];
    runIndex?: number;
  };
  currentRun?: AcpRuntimeReplayCurrentRun;
  records: readonly AcpRuntimeReplayProfileRecord[];
  surfaceSummaries: readonly AcpRuntimeReplaySurfaceSummary[];
  warnings: readonly string[];
  matrix?: AcpRuntimeReplayMatrix;
  resultFolder?: string;
  jsonPath?: string;
  markdownPath?: string;
  error?: string;
};

type ControllerRuntime = {
  createTarget: (args: {
    sourceKind: AcpRuntimeTraceSourceKind;
    syntheticRootId: string;
  }) => Promise<AcpRuntimeReplayTarget>;
  workspace: AcpRuntimeReplayWorkspacePort;
  profiler: AcpRuntimeReplayProfilerPort;
  r2Port: AcpRuntimeR2InputPort;
  saveMatrix: typeof saveAcpRuntimeReplayMatrix;
};

type ViewChange = (
  view: AcpRuntimeReplayControllerView,
) => Promise<void> | void;

let view: AcpRuntimeReplayControllerView = {
  state: "idle",
  tracePath: "",
  traceValidation: "empty",
  phase: "",
  phaseValidation: "empty",
  cadence: "recorded",
  progress: { completed: 0, total: 9 },
  records: [],
  surfaceSummaries: projectAcpRuntimeReplaySurfaceSummaries([]),
  warnings: [],
};
type AcpRuntimeReplayCancellationController = {
  readonly signal: AcpRuntimeReplayCancellationSignal;
  abort: () => void;
};

let activeCancellationController:
  | AcpRuntimeReplayCancellationController
  | undefined;
let activeCompletion: Promise<void> | undefined;
let runtimeOverride: Partial<ControllerRuntime> | undefined;

function createAcpRuntimeReplayCancellationController(): AcpRuntimeReplayCancellationController {
  let aborted = false;
  const listeners = new Set<() => void>();
  const signal: AcpRuntimeReplayCancellationSignal = {
    get aborted() {
      return aborted;
    },
    addEventListener(_type, listener) {
      if (aborted) {
        listener();
        return;
      }
      listeners.add(listener);
    },
    removeEventListener(_type, listener) {
      listeners.delete(listener);
    },
  };
  return {
    signal,
    abort() {
      if (aborted) return;
      aborted = true;
      const pending = Array.from(listeners);
      listeners.clear();
      for (const listener of pending) listener();
    },
  };
}

function runtime(): ControllerRuntime {
  return {
    createTarget: createAcpRuntimeReplayTarget,
    workspace: createAcpRuntimeReplayProductionWorkspacePort(),
    profiler: createAcpRuntimeReplayProductionProfilerPort(),
    r2Port: createAcpRuntimeR2ProductionNoopPort(),
    saveMatrix: saveAcpRuntimeReplayMatrix,
    ...(runtimeOverride || {}),
  };
}

export function getAcpRuntimeReplayControllerView() {
  return {
    ...view,
    ...(view.traceMetadata ? { traceMetadata: { ...view.traceMetadata } } : {}),
    progress: { ...view.progress },
    ...(view.currentRun ? { currentRun: { ...view.currentRun } } : {}),
    records: [...view.records],
    surfaceSummaries: view.surfaceSummaries.map((summary) => ({
      ...summary,
      records: [...summary.records],
    })),
    warnings: [...view.warnings],
  };
}

async function notifyViewChange(onViewChange?: ViewChange) {
  if (onViewChange) await onViewChange(getAcpRuntimeReplayControllerView());
}

function traceMetadata(
  trace: AcpRuntimeSemanticTraceDocument,
  tracePath: string,
): AcpRuntimeReplayTraceMetadata {
  return {
    schema: trace.header.schema,
    sourceKind: trace.header.sourceKind,
    digest: trace.digest,
    createdAt: trace.header.createdAt,
    eventCount: trace.footer.eventCount,
    contentBytes: trace.footer.contentBytes,
    completion: trace.footer.completion,
    sampleName: deriveAcpRuntimeReplaySampleName(tracePath),
  };
}

async function loadCompleteTrace(tracePath: string) {
  const trace = await loadAcpRuntimeSemanticTrace(tracePath);
  if (trace.footer.completion !== "complete") {
    throw new Error("Incomplete ACP semantic traces cannot be replayed");
  }
  return trace;
}

export function setAcpRuntimeReplayDraft(args: {
  tracePath?: string;
  phase?: string;
  cadence?: AcpRuntimeReplayCadence;
}) {
  if (view.state === "running" || view.state === "canceling") {
    throw new Error("ACP replay draft cannot change while replay is running");
  }
  const tracePath =
    args.tracePath === undefined
      ? view.tracePath
      : String(args.tracePath || "").trim();
  const pathChanged = tracePath !== view.tracePath;
  const phaseValidation = normalizeAcpRuntimeReplayPhase(
    args.phase === undefined ? view.phase : args.phase,
  );
  view = {
    ...view,
    tracePath,
    phase: phaseValidation.value,
    phaseValidation: phaseValidation.valid
      ? "ready"
      : phaseValidation.errorCode === "required"
        ? "empty"
        : "invalid",
    phaseErrorCode: phaseValidation.valid
      ? undefined
      : phaseValidation.errorCode,
    cadence: args.cadence || view.cadence,
    ...(pathChanged
      ? {
          traceValidation: tracePath
            ? ("unvalidated" as const)
            : ("empty" as const),
          traceMetadata: undefined,
          error: undefined,
        }
      : {}),
  };
  return getAcpRuntimeReplayControllerView();
}

export async function preflightAcpRuntimeReplayTrace(args: {
  tracePath: string;
  onViewChange?: ViewChange;
}) {
  if (view.state === "running" || view.state === "canceling") {
    throw new Error("ACP replay trace cannot change while replay is running");
  }
  const tracePath = String(args.tracePath || "").trim();
  view = {
    ...view,
    tracePath,
    traceValidation: tracePath ? "validating" : "empty",
    traceMetadata: undefined,
    error: tracePath
      ? undefined
      : "A complete local ACP trace path is required",
  };
  await notifyViewChange(args.onViewChange);
  if (!tracePath) return getAcpRuntimeReplayControllerView();
  try {
    const trace = await loadCompleteTrace(tracePath);
    view = {
      ...view,
      traceValidation: "ready",
      traceMetadata: traceMetadata(trace, tracePath),
      error: undefined,
    };
  } catch (error) {
    view = {
      ...view,
      traceValidation: "invalid",
      traceMetadata: undefined,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  await notifyViewChange(args.onViewChange);
  return getAcpRuntimeReplayControllerView();
}

export async function startAcpRuntimeReplayController(args: {
  tracePath: string;
  phase: string;
  cadence: AcpRuntimeReplayCadence;
  environment: AcpRuntimeReplayMatrix["environment"];
  root?: string;
  onViewChange?: ViewChange;
}) {
  if (view.state === "running" || view.state === "canceling") {
    throw new Error("ACP replay profiler is already running");
  }
  const tracePath = String(args.tracePath || "").trim();
  const phaseValidation = normalizeAcpRuntimeReplayPhase(args.phase);
  if (!phaseValidation.valid) {
    view = {
      ...view,
      state: "failed",
      tracePath,
      phase: phaseValidation.value,
      phaseValidation: "invalid",
      phaseErrorCode: phaseValidation.errorCode,
      error: `ACP replay stage is invalid: ${phaseValidation.errorCode}`,
    };
    await notifyViewChange(args.onViewChange);
    return getAcpRuntimeReplayControllerView();
  }
  const controller = createAcpRuntimeReplayCancellationController();
  let resolveCompletion: (() => void) | undefined;
  const completion = new Promise<void>((resolve) => {
    resolveCompletion = resolve;
  });
  activeCancellationController = controller;
  activeCompletion = completion;
  view = {
    state: "running",
    tracePath,
    traceValidation: tracePath ? "validating" : "empty",
    phase: phaseValidation.value,
    phaseValidation: "ready",
    cadence: args.cadence,
    progress: { completed: 0, total: 9 },
    records: [],
    surfaceSummaries: projectAcpRuntimeReplaySurfaceSummaries([]),
    warnings: [],
  };
  try {
    await notifyViewChange(args.onViewChange);
    const trace = await loadCompleteTrace(tracePath);
    view = {
      ...view,
      traceValidation: "ready",
      traceMetadata: traceMetadata(trace, tracePath),
    };
    const currentRuntime = runtime();
    const matrix = await runAcpRuntimeReplayMatrix({
      trace,
      sampleName: deriveAcpRuntimeReplaySampleName(tracePath),
      cadence: args.cadence,
      replayConfig: { phase: phaseValidation.value },
      environment: args.environment,
      createTarget: currentRuntime.createTarget,
      workspace: currentRuntime.workspace,
      profiler: currentRuntime.profiler,
      r2Port: currentRuntime.r2Port,
      signal: controller.signal,
      onRecordStart: async (currentRun) => {
        view = { ...view, currentRun };
        await notifyViewChange(args.onViewChange);
      },
      onRecord: async (record, completed) => {
        const records = [...view.records, record];
        view = {
          ...view,
          currentRun: undefined,
          progress: {
            completed,
            total: 9,
            surface: record.surface,
            role: record.role,
            runIndex: record.runIndex,
          },
          records,
          surfaceSummaries: projectAcpRuntimeReplaySurfaceSummaries(records),
          warnings: [...view.warnings, ...record.replay.warnings],
        };
        await notifyViewChange(args.onViewChange);
      },
    });
    const saved = await currentRuntime.saveMatrix({
      matrix,
      root: args.root,
    });
    view = {
      ...view,
      state: controller.signal.aborted
        ? "canceled"
        : matrix.executionCompletion === "complete" &&
            matrix.measurementCompletion === "complete"
          ? "complete"
          : "incomplete",
      progress: { ...view.progress, completed: matrix.records.length },
      warnings: [...matrix.warnings],
      currentRun: undefined,
      records: [...matrix.records],
      surfaceSummaries: projectAcpRuntimeReplaySurfaceSummaries(matrix.records),
      matrix,
      resultFolder: saved.folder,
      jsonPath: saved.jsonPath,
      markdownPath: saved.markdownPath,
      error: undefined,
    };
  } catch (error) {
    view = {
      ...view,
      state: controller.signal.aborted ? "canceled" : "failed",
      traceValidation: view.traceMetadata ? "ready" : "invalid",
      error: error instanceof Error ? error.message : String(error),
      currentRun: undefined,
    };
  } finally {
    if (activeCancellationController === controller) {
      activeCancellationController = undefined;
    }
    try {
      await notifyViewChange(args.onViewChange);
    } finally {
      resolveCompletion?.();
      if (activeCompletion === completion) activeCompletion = undefined;
    }
  }
  return getAcpRuntimeReplayControllerView();
}

export function cancelAcpRuntimeReplayController() {
  if (view.state !== "running" && view.state !== "canceling") {
    return getAcpRuntimeReplayControllerView();
  }
  view = { ...view, state: "canceling" };
  activeCancellationController?.abort();
  return getAcpRuntimeReplayControllerView();
}

export async function shutdownAcpRuntimeReplayController() {
  activeCancellationController?.abort();
  await activeCompletion;
}

export function setAcpRuntimeReplayControllerRuntimeForTests(
  value?: Partial<ControllerRuntime>,
) {
  runtimeOverride = value;
}

export function resetAcpRuntimeReplayControllerForTests() {
  activeCancellationController?.abort();
  activeCancellationController = undefined;
  activeCompletion = undefined;
  runtimeOverride = undefined;
  view = {
    state: "idle",
    tracePath: "",
    traceValidation: "empty",
    phase: "",
    phaseValidation: "empty",
    cadence: "recorded",
    progress: { completed: 0, total: 9 },
    records: [],
    surfaceSummaries: projectAcpRuntimeReplaySurfaceSummaries([]),
    warnings: [],
  };
}
