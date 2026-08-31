import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SYNTHESIS_SIDECAR_RUNTIME_RELEASE_RECEIPT_PATH,
  SYNTHESIS_SIDECAR_RUNTIME_RELEASE_SET_PATH,
  readSynthesisSidecarRuntimeReleaseSet,
} from "./synthesis-sidecar-runtime-release-set";

const STEPS = [
  "plan",
  "prebuild",
  "materialize",
  "receipt",
  "finalize",
] as const;
type Step = (typeof STEPS)[number];
type Status = "pending" | "complete" | "failed";

type Receipt = {
  schema: "synthesis-sidecar-runtime-release-receipt.v1";
  status: "in_progress" | "failed" | "complete";
  releaseSetId: string;
  sourceCommit: string;
  aggregate: string;
  workflowRun: string;
  releasePipelineRevision: string;
  updatedAt: string;
  steps: Record<Step, Status>;
  failure?: { step: Step; message: string };
};

export function createSynthesisSidecarRuntimeReleaseReceipt(args: {
  releaseSet: Awaited<ReturnType<typeof readSynthesisSidecarRuntimeReleaseSet>>;
  workflowRun: string;
  releasePipelineRevision: string;
  now?: string;
}): Receipt {
  return {
    schema: "synthesis-sidecar-runtime-release-receipt.v1",
    status: "in_progress",
    releaseSetId: args.releaseSet.releaseSetId,
    sourceCommit: args.releaseSet.sourceCommit,
    aggregate: args.releaseSet.prebuild.aggregate,
    workflowRun: args.workflowRun,
    releasePipelineRevision: args.releasePipelineRevision,
    updatedAt: args.now || new Date().toISOString(),
    steps: {
      plan: "complete",
      prebuild: "complete",
      materialize: "pending",
      receipt: "pending",
      finalize: "pending",
    },
  };
}

export function advanceSynthesisSidecarRuntimeReleaseReceipt(
  receipt: Receipt,
  step: Step,
  status: Status,
  message?: string,
): Receipt {
  if (!STEPS.includes(step)) throw new Error("Unknown sidecar release step");
  if (status === "complete" && step !== "plan") {
    const previous = STEPS[STEPS.indexOf(step) - 1]!;
    if (receipt.steps[previous] !== "complete") {
      throw new Error(`${step} requires ${previous} completion`);
    }
  }
  if (receipt.steps[step] === "complete" && status !== "complete") {
    throw new Error(`${step} cannot regress`);
  }
  const next: Receipt = {
    ...receipt,
    updatedAt: new Date().toISOString(),
    steps: { ...receipt.steps, [step]: status },
  };
  if (status === "failed") {
    next.status = "failed";
    next.failure = { step, message: message || `${step} failed` };
  } else if (STEPS.every((current) => next.steps[current] === "complete")) {
    next.status = "complete";
    delete next.failure;
  }
  return next;
}

function argument(name: string) {
  return process.argv
    .find((entry) => entry.startsWith(`--${name}=`))
    ?.slice(name.length + 3);
}

async function write(pathname: string, value: unknown) {
  const temporary = `${pathname}.tmp-${process.pid}`;
  await fs.mkdir(path.dirname(pathname), { recursive: true });
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await fs.rename(temporary, pathname);
}

async function main() {
  if (process.argv.includes("--help")) {
    process.stdout.write(
      "Usage: tsx scripts/synthesis-sidecar-runtime-release-controller.ts init --workflow-run=<url> --release-pipeline-revision=<sha256> [--receipt=<path>]\n       tsx scripts/synthesis-sidecar-runtime-release-controller.ts advance --step=<step> [--status=<status>] [--failure=<message>] [--receipt=<path>]\n",
    );
    return;
  }
  const command = process.argv[2];
  const releaseSet = await readSynthesisSidecarRuntimeReleaseSet();
  const receiptPath = path.resolve(
    argument("receipt") || SYNTHESIS_SIDECAR_RUNTIME_RELEASE_RECEIPT_PATH,
  );
  if (command === "init") {
    await write(
      receiptPath,
      createSynthesisSidecarRuntimeReleaseReceipt({
        releaseSet,
        workflowRun: String(argument("workflow-run") || "local"),
        releasePipelineRevision: String(
          argument("release-pipeline-revision") || "local",
        ),
      }),
    );
    return;
  }
  if (command !== "advance") throw new Error("Use init or advance");
  const receipt = JSON.parse(await fs.readFile(receiptPath, "utf8")) as Receipt;
  if (
    receipt.releaseSetId !== releaseSet.releaseSetId ||
    receipt.aggregate !== releaseSet.prebuild.aggregate
  ) {
    throw new Error("Receipt does not match the committed sidecar release set");
  }
  const step = String(argument("step") || "") as Step;
  const status = String(argument("status") || "complete") as Status;
  if (
    !STEPS.includes(step) ||
    !["pending", "complete", "failed"].includes(status)
  )
    throw new Error("Invalid receipt transition");
  await write(
    receiptPath,
    advanceSynthesisSidecarRuntimeReleaseReceipt(
      receipt,
      step,
      status,
      argument("failure"),
    ),
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
