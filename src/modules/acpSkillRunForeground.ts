import type { BackendInstance } from "../backends/types";
import { openAssistantWorkspaceSidebar } from "./assistantWorkspaceSidebar";
import {
  selectAcpSkillRun,
  upsertAcpSkillRun,
} from "./acpSkillRunStore";
import { resolveSkillRunnerExecutionModeFromRequest } from "./skillRunnerExecutionMode";

export type AcpSkillRunForegroundDeps = {
  upsertAcpSkillRun: typeof upsertAcpSkillRun;
  selectAcpSkillRun: typeof selectAcpSkillRun;
  openAssistantWorkspaceSidebar: typeof openAssistantWorkspaceSidebar;
};

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeSequenceStepIndex(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.floor(parsed) : undefined;
}

function resolveBackendLabel(backend: BackendInstance) {
  return (
    normalizeString(
      (backend as { label?: unknown; name?: unknown; displayName?: unknown })
        .label,
    ) ||
    normalizeString((backend as { name?: unknown }).name) ||
    normalizeString((backend as { displayName?: unknown }).displayName) ||
    undefined
  );
}

const defaultDeps: AcpSkillRunForegroundDeps = {
  upsertAcpSkillRun,
  selectAcpSkillRun,
  openAssistantWorkspaceSidebar,
};

export function requestAcpSkillRunForeground(args: {
  requestId: string;
  backend: BackendInstance;
  request?: unknown;
  workflowId?: string;
  workflowLabel?: string;
  jobId?: string;
  runId?: string;
  sequenceStepId?: string;
  sequenceStepIndex?: unknown;
  taskName?: string;
  skillId?: string;
  deps?: Partial<AcpSkillRunForegroundDeps>;
}) {
  const requestId = normalizeString(args.requestId);
  if (!requestId) {
    return;
  }
  const deps = {
    ...defaultDeps,
    ...(args.deps || {}),
  };
  const requestSkillId = isRecord(args.request)
    ? normalizeString(args.request.skill_id)
    : "";
  deps.upsertAcpSkillRun({
    requestId,
    status: "running",
    backendId: args.backend.id,
    backendType: args.backend.type,
    backendLabel: resolveBackendLabel(args.backend),
    workflowId: normalizeString(args.workflowId) || undefined,
    workflowLabel: normalizeString(args.workflowLabel) || undefined,
    jobId: normalizeString(args.jobId) || undefined,
    runId: normalizeString(args.runId) || undefined,
    sequenceStepId: normalizeString(args.sequenceStepId) || undefined,
    sequenceStepIndex: normalizeSequenceStepIndex(args.sequenceStepIndex),
    taskName: normalizeString(args.taskName) || undefined,
    skillId: normalizeString(args.skillId) || requestSkillId || undefined,
    requestPayload: args.request,
  });
  deps.selectAcpSkillRun(requestId);
  if (
    resolveSkillRunnerExecutionModeFromRequest(args.request, "auto") ===
    "interactive"
  ) {
    void deps.openAssistantWorkspaceSidebar({
      tab: "acp-skills",
      backend: args.backend,
      requestId,
    });
  }
}
