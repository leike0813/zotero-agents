import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import {
  rebuildSynthesisSidecarVerificationResult,
  type SynthesisSidecarVerificationResult,
} from "../packages/synthesis-contracts/src/sidecarRuntimeRelease";

const execFileAsync = promisify(execFile);
const WORKFLOW = "verify-synthesis-sidecar.yml";
const ARTIFACT = "synthesis-sidecar-verification-result";
const MAX_RUN_PAGES = 10;

export type SynthesisSidecarVerificationRun = Readonly<{
  runId: number;
  sourceSha: string;
  event: "push" | "workflow_dispatch";
}>;

export type SynthesisSidecarVerificationDiagnostic = Readonly<{
  code:
    | "artifact_unavailable"
    | "receipt_invalid"
    | "run_metadata_mismatch"
    | "identity_mismatch";
  runId: number | null;
}>;

function requiredFlag(name: string, args: string[]) {
  const prefix = `--${name}=`;
  const value = args
    .find((entry) => entry.startsWith(prefix))
    ?.slice(prefix.length);
  if (!value?.trim()) throw new Error(`Missing required --${name}=...`);
  return value.trim();
}

function hex(label: string, value: string, length: 40 | 64) {
  if (!new RegExp(`^[a-f0-9]{${length}}$`).test(value)) {
    throw new Error(`${label} must be ${length}-character lowercase hex`);
  }
  return value;
}

export function selectTrustedSynthesisSidecarVerification(args: {
  candidates: readonly Readonly<{
    value: unknown;
    run: SynthesisSidecarVerificationRun;
  }>[];
  repository: string;
  sourceSha: string;
  sourceFingerprint: string;
  buildFingerprint: string;
  verificationFingerprint: string;
  verificationPipelineRevision: string;
}) {
  const diagnostics: SynthesisSidecarVerificationDiagnostic[] = [];
  const matches: SynthesisSidecarVerificationResult[] = [];
  for (const candidate of args.candidates) {
    let receipt: SynthesisSidecarVerificationResult;
    try {
      receipt = rebuildSynthesisSidecarVerificationResult(candidate.value);
    } catch {
      diagnostics.push({ code: "receipt_invalid", runId: candidate.run.runId });
      continue;
    }
    if (
      receipt.runId !== candidate.run.runId ||
      receipt.sourceSha !== candidate.run.sourceSha ||
      receipt.event !== candidate.run.event
    ) {
      diagnostics.push({
        code: "run_metadata_mismatch",
        runId: candidate.run.runId,
      });
      continue;
    }
    if (
      receipt.repository !== args.repository ||
      receipt.sourceFingerprint !== args.sourceFingerprint ||
      receipt.buildFingerprint !== args.buildFingerprint ||
      receipt.verificationFingerprint !== args.verificationFingerprint ||
      receipt.verificationPipelineRevision !== args.verificationPipelineRevision
    ) {
      diagnostics.push({
        code: "identity_mismatch",
        runId: candidate.run.runId,
      });
      continue;
    }
    matches.push(receipt);
  }
  matches.sort((left, right) => {
    const leftExact = left.sourceSha === args.sourceSha ? 1 : 0;
    const rightExact = right.sourceSha === args.sourceSha ? 1 : 0;
    return rightExact - leftExact || right.runId - left.runId;
  });
  return Object.freeze({ receipt: matches[0] || null, diagnostics });
}

export async function revalidateSynthesisSidecarVerificationReceipt(args: {
  repository: string;
  value: unknown;
}) {
  const receipt = rebuildSynthesisSidecarVerificationResult(args.value);
  const { stdout } = await execFileAsync("gh", [
    "api",
    `repos/${args.repository}/actions/runs/${receipt.runId}`,
  ]);
  const run = JSON.parse(stdout) as {
    id?: number;
    conclusion?: string | null;
    event?: string;
    head_sha?: string;
    path?: string;
  };
  if (
    run.conclusion !== "success" ||
    typeof run.path !== "string" ||
    !run.path.startsWith(`.github/workflows/${WORKFLOW}@`)
  ) {
    throw new Error(
      "Verification run is not a successful trusted workflow run",
    );
  }
  const selected = selectTrustedSynthesisSidecarVerification({
    candidates: [
      {
        value: receipt,
        run: {
          runId: Number(run.id),
          sourceSha: String(run.head_sha),
          event: run.event as "push" | "workflow_dispatch",
        },
      },
    ],
    repository: args.repository,
    sourceSha: receipt.sourceSha,
    sourceFingerprint: receipt.sourceFingerprint,
    buildFingerprint: receipt.buildFingerprint,
    verificationFingerprint: receipt.verificationFingerprint,
    verificationPipelineRevision: receipt.verificationPipelineRevision,
  });
  if (!selected.receipt) {
    throw new Error(
      `Verification run metadata mismatch: ${JSON.stringify(selected.diagnostics)}`,
    );
  }
  return selected.receipt;
}

async function recentRuns(repository: string) {
  const runs: SynthesisSidecarVerificationRun[] = [];
  for (let page = 1; page <= MAX_RUN_PAGES; page += 1) {
    const { stdout } = await execFileAsync("gh", [
      "api",
      `repos/${repository}/actions/workflows/${WORKFLOW}/runs`,
      "--method",
      "GET",
      "-F",
      "per_page=100",
      "-F",
      `page=${page}`,
    ]);
    const parsed = JSON.parse(stdout) as {
      workflow_runs?: Array<{
        id: number;
        conclusion: string | null;
        event: string;
        head_sha: string;
      }>;
    };
    if (!Array.isArray(parsed.workflow_runs)) {
      throw new Error("Verification workflow query returned no workflow_runs");
    }
    for (const run of parsed.workflow_runs) {
      if (
        run.conclusion === "success" &&
        (run.event === "push" || run.event === "workflow_dispatch")
      ) {
        runs.push({
          runId: run.id,
          sourceSha: run.head_sha,
          event: run.event,
        });
      }
    }
    if (parsed.workflow_runs.length < 100) break;
  }
  return runs;
}

export async function resolveSynthesisSidecarVerification(args: {
  repository: string;
  sourceSha: string;
  sourceFingerprint: string;
  buildFingerprint: string;
  verificationFingerprint: string;
  verificationPipelineRevision: string;
}) {
  const normalized = {
    repository: args.repository.trim(),
    sourceSha: hex("sourceSha", args.sourceSha, 40),
    sourceFingerprint: hex("sourceFingerprint", args.sourceFingerprint, 64),
    buildFingerprint: hex("buildFingerprint", args.buildFingerprint, 64),
    verificationFingerprint: hex(
      "verificationFingerprint",
      args.verificationFingerprint,
      64,
    ),
    verificationPipelineRevision: hex(
      "verificationPipelineRevision",
      args.verificationPipelineRevision,
      64,
    ),
  };
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "synthesis-sidecar-verification-"),
  );
  const diagnostics: SynthesisSidecarVerificationDiagnostic[] = [];
  try {
    const runs = (await recentRuns(normalized.repository)).sort(
      (left, right) => {
        const leftExact = left.sourceSha === normalized.sourceSha ? 1 : 0;
        const rightExact = right.sourceSha === normalized.sourceSha ? 1 : 0;
        return rightExact - leftExact || right.runId - left.runId;
      },
    );
    for (const run of runs) {
      const output = path.join(root, String(run.runId));
      try {
        await execFileAsync("gh", [
          "run",
          "download",
          String(run.runId),
          "--repo",
          normalized.repository,
          "--name",
          ARTIFACT,
          "--dir",
          output,
        ]);
      } catch {
        diagnostics.push({ code: "artifact_unavailable", runId: run.runId });
        continue;
      }
      let value: unknown;
      try {
        value = JSON.parse(
          await fs.readFile(
            path.join(output, "verification-result.json"),
            "utf8",
          ),
        );
      } catch {
        diagnostics.push({ code: "receipt_invalid", runId: run.runId });
        continue;
      }
      const selected = selectTrustedSynthesisSidecarVerification({
        candidates: [
          {
            value,
            run,
          },
        ],
        ...normalized,
      });
      diagnostics.push(...selected.diagnostics);
      if (selected.receipt) {
        return Object.freeze({
          schema: "synthesis-sidecar-verification-resolution.v1" as const,
          status: "matched" as const,
          receipt: selected.receipt,
          diagnostics: Object.freeze(diagnostics),
        });
      }
    }
    return Object.freeze({
      schema: "synthesis-sidecar-verification-resolution.v1" as const,
      status: "not_found" as const,
      receipt: null,
      diagnostics: Object.freeze(diagnostics),
    });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

function help() {
  process.stdout.write(
    "Usage: tsx scripts/resolve-synthesis-sidecar-verification.ts --repo=<owner/name> --source-sha=<sha> --source-fingerprint=<sha256> --build-fingerprint=<sha256> --verification-fingerprint=<sha256> --verification-pipeline-revision=<sha256> --output=<path>\n       tsx scripts/resolve-synthesis-sidecar-verification.ts --repo=<owner/name> --receipt=<path>\n",
  );
}

async function main() {
  if (process.argv.includes("--help")) return help();
  const args = process.argv.slice(2);
  const receiptPath = args
    .find((entry) => entry.startsWith("--receipt="))
    ?.slice("--receipt=".length);
  if (receiptPath) {
    const receipt = await revalidateSynthesisSidecarVerificationReceipt({
      repository: requiredFlag("repo", args),
      value: JSON.parse(await fs.readFile(path.resolve(receiptPath), "utf8")),
    });
    process.stdout.write(`${JSON.stringify(receipt)}\n`);
    return;
  }
  const resolution = await resolveSynthesisSidecarVerification({
    repository: requiredFlag("repo", args),
    sourceSha: requiredFlag("source-sha", args),
    sourceFingerprint: requiredFlag("source-fingerprint", args),
    buildFingerprint: requiredFlag("build-fingerprint", args),
    verificationFingerprint: requiredFlag("verification-fingerprint", args),
    verificationPipelineRevision: requiredFlag(
      "verification-pipeline-revision",
      args,
    ),
  });
  if (!resolution.receipt) {
    throw new Error(JSON.stringify(resolution));
  }
  const output = requiredFlag("output", args);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(
    output,
    `${JSON.stringify(resolution.receipt, null, 2)}\n`,
  );
  process.stdout.write(`${JSON.stringify(resolution)}\n`);
}

const invoked = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (import.meta.url === invoked) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
