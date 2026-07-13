import { loadAcpRuntimeSemanticTrace } from "./acpRuntimeSemanticTrace";
import {
  runAcpRuntimeReplayMatrix,
  saveAcpRuntimeReplayMatrix,
  type AcpRuntimeReplayCadence,
  type AcpRuntimeReplayMatrix,
} from "./acpRuntimeReplayProfiler";
import { createAcpRuntimeReplayTarget } from "./acpRuntimeReplayTargets";
import {
  createAcpRuntimeR2ProductionNoopPort,
  createAcpRuntimeReplayProductionProfilerPort,
  createAcpRuntimeReplayProductionWorkspacePort,
} from "./acpRuntimeReplayProductionPorts";

export type AcpRuntimeReplayControllerView = {
  state: "idle" | "running" | "complete" | "incomplete" | "failed";
  tracePath: string;
  phase: "before-governance" | "after-governance";
  cadence: AcpRuntimeReplayCadence;
  progress: { completed: number; total: 9 };
  warnings: readonly string[];
  matrix?: AcpRuntimeReplayMatrix;
  resultFolder?: string;
  jsonPath?: string;
  markdownPath?: string;
  error?: string;
};

let view: AcpRuntimeReplayControllerView = {
  state: "idle",
  tracePath: "",
  phase: "before-governance",
  cadence: "recorded",
  progress: { completed: 0, total: 9 },
  warnings: [],
};

export function getAcpRuntimeReplayControllerView() {
  return {
    ...view,
    progress: { ...view.progress },
    warnings: [...view.warnings],
  };
}

export async function startAcpRuntimeReplayController(args: {
  tracePath: string;
  phase: "before-governance" | "after-governance";
  cadence: AcpRuntimeReplayCadence;
  environment: AcpRuntimeReplayMatrix["environment"];
  root?: string;
}) {
  if (view.state === "running") {
    throw new Error("ACP replay profiler is already running");
  }
  const tracePath = String(args.tracePath || "").trim();
  if (!tracePath)
    throw new Error("A complete local ACP trace path is required");
  view = {
    state: "running",
    tracePath,
    phase: args.phase,
    cadence: args.cadence,
    progress: { completed: 0, total: 9 },
    warnings: [],
  };
  try {
    const trace = await loadAcpRuntimeSemanticTrace(tracePath);
    const matrix = await runAcpRuntimeReplayMatrix({
      trace,
      cadence: args.cadence,
      replayConfig: { phase: args.phase },
      environment: args.environment,
      createTarget: createAcpRuntimeReplayTarget,
      workspace: createAcpRuntimeReplayProductionWorkspacePort(),
      profiler: createAcpRuntimeReplayProductionProfilerPort(),
      r2Port: createAcpRuntimeR2ProductionNoopPort(),
    });
    const saved = await saveAcpRuntimeReplayMatrix({
      matrix,
      root: args.root,
    });
    view = {
      ...view,
      state: matrix.completion === "complete" ? "complete" : "incomplete",
      progress: { completed: matrix.records.length, total: 9 },
      warnings: [...matrix.warnings],
      matrix,
      resultFolder: saved.folder,
      jsonPath: saved.jsonPath,
      markdownPath: saved.markdownPath,
    };
  } catch (error) {
    view = {
      ...view,
      state: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
    throw error;
  }
  return getAcpRuntimeReplayControllerView();
}

export function resetAcpRuntimeReplayControllerForTests() {
  view = {
    state: "idle",
    tracePath: "",
    phase: "before-governance",
    cadence: "recorded",
    progress: { completed: 0, total: 9 },
    warnings: [],
  };
}
