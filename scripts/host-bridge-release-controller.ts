import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const STEPS = [
  "plan",
  "prebuild",
  "materialize",
  "publish",
  "verify",
  "mutablePointers",
  "finalize",
] as const;
const SURFACES = ["cliBundle", "libraryAgent", "librarianProfile"] as const;

type Step = (typeof STEPS)[number];
type Surface = (typeof SURFACES)[number];
type StepStatus = "pending" | "complete" | "failed";
type SurfaceStatus = "pending" | "published" | "verified" | "failed";

export type HostBridgeReleaseReceiptV2 = {
  schema: "host-bridge.release-receipt.v2";
  status: "in_progress" | "partial" | "complete" | "failed";
  releaseSetId: string;
  sourceCommit: string;
  workflowRun: string;
  pipelineRevision: string;
  updatedAt: string;
  payloadDigest: string;
  prebuild: {
    branch: "host-bridge-cli-prebuilds";
    commit: string;
    verified: true;
  };
  steps: Record<Step, StepStatus>;
  surfaces: Record<
    Surface,
    { status: SurfaceStatus; commit?: string; contentDigest?: string }
  >;
  failure?: { step: Step; message: string };
};

type ReleaseSetV2 = {
  schema: "host-bridge.release-set.v2";
  releaseSetId: string;
  payloadDigest: string;
  source: { commit: string };
  surfaces: Record<Surface, { contentDigest: string }>;
};

export function createHostBridgeReleaseReceipt(args: {
  releaseSet: ReleaseSetV2;
  sourceCommit: string;
  workflowRun: string;
  pipelineRevision: string;
  prebuildCommit: string;
  now?: string;
}): HostBridgeReleaseReceiptV2 {
  if (args.releaseSet.schema !== "host-bridge.release-set.v2") {
    throw new Error("Release receipt v2 requires a release set v2");
  }
  if (args.releaseSet.source.commit !== args.sourceCommit) {
    throw new Error(
      "Release receipt source commit does not match the release set",
    );
  }
  return {
    schema: "host-bridge.release-receipt.v2",
    status: "partial",
    releaseSetId: args.releaseSet.releaseSetId,
    sourceCommit: args.sourceCommit,
    workflowRun: args.workflowRun,
    pipelineRevision: args.pipelineRevision,
    updatedAt: args.now || new Date().toISOString(),
    payloadDigest: args.releaseSet.payloadDigest,
    prebuild: {
      branch: "host-bridge-cli-prebuilds",
      commit: args.prebuildCommit,
      verified: true,
    },
    steps: {
      plan: "complete",
      prebuild: "complete",
      materialize: "complete",
      publish: "pending",
      verify: "pending",
      mutablePointers: "pending",
      finalize: "pending",
    },
    surfaces: Object.fromEntries(
      SURFACES.map((surface) => [
        surface,
        {
          status: "pending",
          contentDigest: args.releaseSet.surfaces[surface].contentDigest,
        },
      ]),
    ) as HostBridgeReleaseReceiptV2["surfaces"],
  };
}

export function advanceHostBridgeReleaseReceipt(
  receipt: HostBridgeReleaseReceiptV2,
  event: {
    step: Step;
    status: StepStatus;
    surfaces?: Partial<HostBridgeReleaseReceiptV2["surfaces"]>;
    failureMessage?: string;
    now?: string;
  },
): HostBridgeReleaseReceiptV2 {
  for (const [surface, update] of Object.entries(event.surfaces || {}) as Array<
    [Surface, HostBridgeReleaseReceiptV2["surfaces"][Surface]]
  >) {
    const current = receipt.surfaces[surface];
    if (!current) {
      throw new Error(`Unknown release surface: ${surface}`);
    }
    if (update.contentDigest !== current.contentDigest) {
      throw new Error(`${surface} content digest does not match the receipt`);
    }
    if (
      (update.status === "published" || update.status === "verified") &&
      !update.commit
    ) {
      throw new Error(`${surface} ${update.status} status requires a commit`);
    }
    if (current.commit && update.commit && current.commit !== update.commit) {
      throw new Error(`${surface} commit does not match the recorded fact`);
    }
    if (current.status === "verified" && update.status !== "verified") {
      throw new Error(`${surface} cannot regress from verified`);
    }
  }
  const next: HostBridgeReleaseReceiptV2 = {
    ...receipt,
    updatedAt: event.now || new Date().toISOString(),
    steps: { ...receipt.steps, [event.step]: event.status },
    surfaces: { ...receipt.surfaces, ...(event.surfaces || {}) },
  };
  if (event.status === "failed") {
    next.status = "failed";
    next.failure = {
      step: event.step,
      message: event.failureMessage || `${event.step} failed`,
    };
    return next;
  }
  if (
    event.step === "publish" &&
    event.status === "complete" &&
    !SURFACES.every(
      (surface) =>
        ["published", "verified"].includes(next.surfaces[surface].status) &&
        Boolean(next.surfaces[surface].commit),
    )
  ) {
    throw new Error("Publish completion requires all immutable surface facts");
  }
  if (
    event.step === "verify" &&
    event.status === "complete" &&
    !SURFACES.every(
      (surface) =>
        next.surfaces[surface].status === "verified" &&
        Boolean(next.surfaces[surface].commit),
    )
  ) {
    throw new Error("Verify completion requires all three verified surfaces");
  }
  if (
    event.step === "mutablePointers" &&
    event.status === "complete" &&
    next.steps.verify !== "complete"
  ) {
    throw new Error("Mutable pointers require immutable verification");
  }
  if (
    event.step === "finalize" &&
    event.status === "complete" &&
    next.steps.mutablePointers !== "complete"
  ) {
    throw new Error("Source finalize requires mutable pointer completion");
  }
  const complete = STEPS.every((step) => next.steps[step] === "complete");
  if (complete) {
    if (
      !SURFACES.every(
        (surface) =>
          next.surfaces[surface].status === "verified" &&
          !!next.surfaces[surface].commit &&
          next.surfaces[surface].contentDigest ===
            receipt.surfaces[surface].contentDigest,
      )
    ) {
      throw new Error(
        "A complete release receipt requires three verified surfaces",
      );
    }
    next.status = "complete";
    delete next.failure;
  } else if (next.status !== "failed") {
    next.status = "partial";
  }
  return next;
}

function option(name: string) {
  const prefix = `--${name}=`;
  return (
    process.argv
      .find((value) => value.startsWith(prefix))
      ?.slice(prefix.length) || ""
  );
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(path), "utf8")) as T;
}

function writeJsonAtomic(path: string, value: unknown) {
  const target = resolve(path);
  const temporary = `${target}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, target);
}

function surfaceUpdates(releaseSet: ReleaseSetV2, status: SurfaceStatus) {
  const selected = option("surface") as Surface;
  if (selected && !SURFACES.includes(selected)) {
    throw new Error(`Unknown release surface: ${selected}`);
  }
  return Object.fromEntries(
    (selected ? [selected] : SURFACES).map((surface) => {
      const commit = option(`${surface}-commit`);
      return [
        surface,
        {
          status,
          ...(commit ? { commit } : {}),
          contentDigest: releaseSet.surfaces[surface].contentDigest,
        },
      ];
    }),
  ) as HostBridgeReleaseReceiptV2["surfaces"];
}

if (resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  const receiptPath = option("receipt") || "release-receipt.json";
  const releaseSetPath =
    option("release-set") || "host-bridge/release-set.json";
  const releaseSet = readJson<ReleaseSetV2>(releaseSetPath);
  if (command === "init") {
    writeJsonAtomic(
      receiptPath,
      createHostBridgeReleaseReceipt({
        releaseSet,
        sourceCommit: option("source-commit"),
        workflowRun: option("workflow-run"),
        pipelineRevision: option("pipeline-revision"),
        prebuildCommit: option("prebuild-commit"),
      }),
    );
  } else if (command === "advance") {
    const receipt = readJson<HostBridgeReleaseReceiptV2>(receiptPath);
    const step = option("step") as Step;
    const status = (option("status") || "complete") as StepStatus;
    if (
      !STEPS.includes(step) ||
      !["pending", "complete", "failed"].includes(status)
    ) {
      throw new Error("advance requires a valid --step and --status");
    }
    const surfaceStatus = option("surface-status") as SurfaceStatus;
    writeJsonAtomic(
      receiptPath,
      advanceHostBridgeReleaseReceipt(receipt, {
        step,
        status,
        ...(surfaceStatus
          ? { surfaces: surfaceUpdates(releaseSet, surfaceStatus) }
          : {}),
        ...(option("failure") ? { failureMessage: option("failure") } : {}),
      }),
    );
  } else {
    throw new Error("Use init or advance");
  }
}
