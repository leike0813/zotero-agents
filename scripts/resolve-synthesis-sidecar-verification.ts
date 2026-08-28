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
  receipts: readonly unknown[];
  repository: string;
  sourceSha: string;
  verificationFingerprint: string;
  pipelineRevision: string;
}): SynthesisSidecarVerificationResult | null {
  const matches = args.receipts
    .flatMap((value) => {
      try {
        return [rebuildSynthesisSidecarVerificationResult(value)];
      } catch {
        return [];
      }
    })
    .filter(
      (receipt) =>
        receipt.repository === args.repository &&
        receipt.verificationFingerprint === args.verificationFingerprint &&
        receipt.pipelineRevision === args.pipelineRevision,
    )
    .sort((left, right) => {
      const leftExact = left.sourceSha === args.sourceSha ? 1 : 0;
      const rightExact = right.sourceSha === args.sourceSha ? 1 : 0;
      return rightExact - leftExact || right.runId - left.runId;
    });
  return matches[0] || null;
}

async function recentRuns(repository: string) {
  const { stdout } = await execFileAsync("gh", [
    "api",
    `repos/${repository}/actions/workflows/${WORKFLOW}/runs`,
    "--method",
    "GET",
    "-F",
    "per_page=100",
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
  return parsed.workflow_runs
    .filter(
      (run) =>
        run.conclusion === "success" &&
        (run.event === "push" || run.event === "workflow_dispatch"),
    )
    .map((run) => ({ runId: run.id, sourceSha: run.head_sha }));
}

async function findMatchingReceipt(args: {
  repository: string;
  runs: readonly Readonly<{ runId: number; sourceSha: string }>[];
  sourceSha: string;
  verificationFingerprint: string;
  pipelineRevision: string;
}) {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "synthesis-sidecar-verification-"),
  );
  try {
    const runs = [...args.runs].sort((left, right) => {
      const leftExact = left.sourceSha === args.sourceSha ? 1 : 0;
      const rightExact = right.sourceSha === args.sourceSha ? 1 : 0;
      return rightExact - leftExact;
    });
    for (const { runId } of runs) {
      const output = path.join(root, String(runId));
      try {
        await execFileAsync("gh", [
          "run",
          "download",
          String(runId),
          "--repo",
          args.repository,
          "--name",
          ARTIFACT,
          "--dir",
          output,
        ]);
        const receipt = selectTrustedSynthesisSidecarVerification({
          receipts: [
            JSON.parse(
              await fs.readFile(
                path.join(output, "verification-result.json"),
                "utf8",
              ),
            ),
          ],
          repository: args.repository,
          sourceSha: args.sourceSha,
          verificationFingerprint: args.verificationFingerprint,
          pipelineRevision: args.pipelineRevision,
        });
        if (receipt) return receipt;
      } catch {
        // A successful historical run may predate verification receipts.
      }
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
  return null;
}

export async function resolveSynthesisSidecarVerification(args: {
  repository: string;
  sourceSha: string;
  verificationFingerprint: string;
  pipelineRevision: string;
}) {
  const normalized = {
    repository: args.repository.trim(),
    sourceSha: hex("sourceSha", args.sourceSha, 40),
    verificationFingerprint: hex(
      "verificationFingerprint",
      args.verificationFingerprint,
      64,
    ),
    pipelineRevision: hex("pipelineRevision", args.pipelineRevision, 64),
  };
  const receipt = await findMatchingReceipt({
    ...normalized,
    runs: await recentRuns(normalized.repository),
  });
  if (!receipt) {
    throw new Error(
      "No trusted successful Synthesis sidecar verification receipt matches the current verification and pipeline identities",
    );
  }
  return receipt;
}

async function main() {
  const args = process.argv.slice(2);
  const receipt = await resolveSynthesisSidecarVerification({
    repository: requiredFlag("repo", args),
    sourceSha: requiredFlag("source-sha", args),
    verificationFingerprint: requiredFlag("verification-fingerprint", args),
    pipelineRevision: requiredFlag("pipeline-revision", args),
  });
  const output = requiredFlag("output", args);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(receipt, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(receipt)}\n`);
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
