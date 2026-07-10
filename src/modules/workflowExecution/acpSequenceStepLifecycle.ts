import {
  detachAcpSkillRunControllerAfterApplyResult,
  markAcpSkillRunApplyResult,
} from "../acpSkillRunStore";

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

export async function finishAcpSequenceStep(args: {
  requestId: string;
  finalStep: boolean;
  applyResultStatus?: "succeeded" | "failed" | "skipped";
}) {
  if (args.finalStep || args.applyResultStatus === "failed") {
    return;
  }
  await settleAcpSequenceStep({
    requestId: args.requestId,
    state: "succeeded",
  });
}

export async function settleAcpSequenceStepApply(args: {
  requestId: string;
  finalStep: boolean;
  state: "succeeded" | "failed";
  error?: string;
}) {
  if (args.state === "succeeded" && !args.finalStep) {
    return;
  }
  await settleAcpSequenceStep({
    requestId: args.requestId,
    state: args.state,
    error: args.error,
  });
}
