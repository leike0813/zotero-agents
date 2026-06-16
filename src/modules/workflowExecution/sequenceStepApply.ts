import type { LoadedWorkflow } from "../../workflows/types";
import { executeApplyResult } from "../../workflows/runtime";
import { ZipBundleReader } from "../../workflows/zipBundleReader";
import type { ProviderExecutionResult } from "../../providers/contracts";
import { markAcpSkillRunApplyResult } from "../acpSkillRunStore";
import { appendRuntimeLog } from "../runtimeLogManager";
import { collectSkillRunFeedbackSidecar } from "../skillRunFeedback";
import type { BundleReader } from "./bundleIO";
import {
  buildTempBundlePath,
  createDirectoryBundleReader,
  createUnavailableBundleReader,
  removeFileIfExists,
  writeBytes,
} from "./bundleIO";
import { createWorkflowResultContext } from "./resultContext";

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

async function createBundleReaderForRunResult(args: {
  result: ProviderExecutionResult;
  requestId: string;
}) {
  let bundlePath = "";
  let bundleReader: BundleReader = createUnavailableBundleReader(
    args.requestId,
  );
  if (args.result.status === "succeeded" && args.result.bundleBytes?.length) {
    bundlePath = buildTempBundlePath(args.requestId);
    await writeBytes(bundlePath, args.result.bundleBytes);
    bundleReader = new ZipBundleReader(bundlePath);
  } else if (args.result.status === "succeeded" && args.result.bundleDir) {
    bundleReader = createDirectoryBundleReader(args.result.bundleDir);
  }
  return { bundleReader, bundlePath };
}

export async function executeSequenceStepApply(args: {
  workflow: LoadedWorkflow;
  parent: Zotero.Item | number | string | null;
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
}) {
  const requestId = normalizeString(args.runResult.requestId);
  let bundlePath = "";
  try {
    const bundleResource = await createBundleReaderForRunResult({
      result: args.runResult,
      requestId: requestId || "sequence-step",
    });
    bundlePath = bundleResource.bundlePath;
    const resultContext = await createWorkflowResultContext({
      runResult: args.runResult,
      bundleReader: bundleResource.bundleReader,
      manifest: args.workflow.manifest,
    });
    const applied = await executeApplyResult({
      workflow: args.workflow,
      parent: args.parent,
      bundleReader: bundleResource.bundleReader,
      resultContext,
      request: args.request,
      runResult: args.runResult,
      sequenceStep: args.sequenceStep,
    });
    await collectSkillRunFeedbackSidecar({
      workflow: args.workflow,
      request: args.request,
      runResult: args.runResult,
      resultContext,
      bundleReader: bundleResource.bundleReader,
      jobId: args.sequenceStep.id,
      sequenceStep: args.sequenceStep,
      appendRuntimeLog,
    });
    markAcpSkillRunApplyResult({
      requestId,
      state: "succeeded",
    });
    return applied;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error || "unknown error");
    markAcpSkillRunApplyResult({
      requestId,
      state: "failed",
      error: message,
    });
    throw error;
  } finally {
    if (bundlePath) {
      await removeFileIfExists(bundlePath);
    }
  }
}
