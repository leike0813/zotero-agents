import type { SequenceStepLifecycleAdapter } from "./sequenceRuntime";
import {
  detachAcpSkillRunControllerAfterApplyResult,
  markAcpSkillRunApplyResult,
} from "../acpSkillRunActions";

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

async function settleAcpSequenceStep(args: {
  requestId: string;
  state: "succeeded" | "failed";
  error?: string;
}) {
  const requestId = normalizeString(args.requestId);
  if (!requestId) {
    return;
  }
  markAcpSkillRunApplyResult({
    requestId,
    state: args.state,
    error: args.error,
  });
  await detachAcpSkillRunControllerAfterApplyResult({
    requestId,
    state: args.state,
  });
}

export const acpSequenceStepLifecycle: SequenceStepLifecycleAdapter = {
  async settleStep(args) {
    const stepOwnsFinalApply = args.finalStep && !!args.step.apply_result;
    if (args.finalStep && !stepOwnsFinalApply) {
      return;
    }
    const applyResult = args.state.steps[args.stepIndex]?.applyResult;
    const failed = args.applyResultStatus === "failed";
    await settleAcpSequenceStep({
      requestId: args.requestId,
      state: failed ? "failed" : "succeeded",
      error: failed ? applyResult?.error : undefined,
    });
  },
};
