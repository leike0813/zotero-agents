import type { CompatibilityE2ELane } from "../zotero-compatibility-fixture";

export type WeeklyAttemptResult = {
  verdict: "passed" | "failed" | "aborted" | "incomplete" | "indeterminate";
  runId: string;
  profileIdentity: string;
  manifestReference: string;
};

export type WeeklyAttemptContext = {
  attempt: 1 | 2;
  scope: "complete-cell";
  predecessorRunId?: string;
};

export async function runWeeklyRetryPolicy(
  lane: CompatibilityE2ELane,
  runAttempt: (context: WeeklyAttemptContext) => Promise<WeeklyAttemptResult>,
) {
  const first = await runAttempt({ attempt: 1, scope: "complete-cell" });
  if (lane !== "weekly" || first.verdict === "passed") {
    return {
      attempts: [first],
      classification: first.verdict === "passed" ? "passed" : "failed",
      workflowPassed: first.verdict === "passed",
    } as const;
  }

  const second = await runAttempt({
    attempt: 2,
    scope: "complete-cell",
    predecessorRunId: first.runId,
  });
  for (const field of [
    "runId",
    "profileIdentity",
    "manifestReference",
  ] as const) {
    if (second[field] === first[field]) {
      throw new Error(`weekly_successor_identity_reused:${field}`);
    }
  }
  return {
    attempts: [first, second],
    classification: second.verdict === "passed" ? "intermittent" : "persistent",
    workflowPassed: false,
  } as const;
}
