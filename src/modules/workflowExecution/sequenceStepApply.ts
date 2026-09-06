import type {
  LoadedWorkflow,
  WorkflowRuntimeContext,
} from "../../workflows/types";
import { executeApplyResult } from "../../workflows/runtime";
import type { ProviderExecutionResult } from "../../providers/contracts";
import { appendRuntimeLog } from "../runtimeLogManager";
import { collectSkillRunFeedbackSidecar } from "../skillRunFeedback";
import { openRunResultBundleReader } from "./bundleIO";
import { createWorkflowResultContext } from "./resultContext";

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

export async function executeSequenceStepApply(args: {
  workflow: LoadedWorkflow;
  parent:
    | import("../../workflows/types").PortableItemRef
    | Zotero.Item
    | number
    | string
    | null;
  request: unknown;
  runResult: Extract<ProviderExecutionResult, { status: "succeeded" }> &
    Record<string, unknown>;
  sequenceStep: {
    id: string;
    index: number;
    workflowId: string;
    skillId: string;
    finalStep: boolean;
    phase: "sequence-step";
  };
  runtime?: Partial<WorkflowRuntimeContext>;
}) {
  const requestId = normalizeString(args.runResult.requestId);
  let bundleResource:
    | Awaited<ReturnType<typeof openRunResultBundleReader>>
    | undefined;
  try {
    bundleResource = await openRunResultBundleReader({
      result: args.runResult,
      requestId: requestId || "sequence-step",
    });
    const bundleReader = bundleResource.bundleReader;
    const resultContext = await createWorkflowResultContext({
      runResult: args.runResult,
      bundleReader,
      manifest: args.workflow.manifest,
    });
    const applied = await executeApplyResult({
      workflow: args.workflow,
      parent: args.parent,
      bundleReader,
      resultContext,
      request: args.request,
      runResult: args.runResult,
      sequenceStep: args.sequenceStep,
      runtime: args.runtime,
    });
    await collectSkillRunFeedbackSidecar({
      workflow: args.workflow,
      request: args.request,
      runResult: args.runResult,
      resultContext,
      bundleReader,
      jobId: args.sequenceStep.id,
      sequenceStep: args.sequenceStep,
      appendRuntimeLog,
    });
    return applied;
  } finally {
    await bundleResource?.dispose();
  }
}
