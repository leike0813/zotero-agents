import type { LoadedWorkflow } from "../workflows/types";
import { getLoadedWorkflowEntries } from "./workflowRuntime";
import {
  mergeExecutionOptions,
  parseExecutionOptionsPatch,
  type WorkflowExecutionOptions,
} from "./workflowSettingsDomain";

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function resolveLoadedWorkflowById(workflowId: string): LoadedWorkflow | null {
  const normalizedWorkflowId = String(workflowId || "").trim();
  if (!normalizedWorkflowId) {
    return null;
  }
  return (
    getLoadedWorkflowEntries().find(
      (entry) => entry.manifest.id === normalizedWorkflowId,
    ) || null
  );
}

function toWorkflowParams(value: unknown): Record<string, unknown> | null {
  if (!isObject(value)) {
    return null;
  }
  return { ...value };
}

export function applyPersistedWorkflowSettingsNormalizer(args: {
  workflowId: string;
  previous: WorkflowExecutionOptions | undefined;
  incoming: WorkflowExecutionOptions;
  merged: WorkflowExecutionOptions;
}): WorkflowExecutionOptions {
  const workflow = resolveLoadedWorkflowById(args.workflowId);
  const hook = workflow?.hooks?.normalizeSettings;
  if (!workflow || typeof hook !== "function") {
    return args.merged;
  }
  const normalized = hook({
    phase: "persisted",
    workflowId: workflow.manifest.id,
    manifest: workflow.manifest,
    previous: args.previous || {},
    incoming: args.incoming,
    merged: args.merged,
  });
  return mergeExecutionOptions(
    args.merged,
    parseExecutionOptionsPatch(normalized),
  );
}

export function applyExecutionWorkflowParamsNormalizer(args: {
  workflow: LoadedWorkflow;
  rawWorkflowParams: Record<string, unknown>;
  normalizedWorkflowParams: Record<string, unknown>;
}): Record<string, unknown> {
  const hook = args.workflow.hooks.normalizeSettings;
  if (typeof hook !== "function") {
    return args.normalizedWorkflowParams;
  }
  const normalized = hook({
    phase: "execution",
    workflowId: args.workflow.manifest.id,
    manifest: args.workflow.manifest,
    rawWorkflowParams: args.rawWorkflowParams,
    normalizedWorkflowParams: args.normalizedWorkflowParams,
  });
  const patched = toWorkflowParams(normalized);
  if (!patched) {
    return args.normalizedWorkflowParams;
  }
  return {
    ...args.normalizedWorkflowParams,
    ...patched,
  };
}
