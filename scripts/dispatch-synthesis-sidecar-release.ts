import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { promisify } from "node:util";
import {
  createGithubWorkflowRequestId,
  dispatchAndResolveGithubWorkflowRun,
  type CommandRunner,
} from "./github-workflow-run";
import { readSynthesisSidecarRuntimeReleaseSet } from "./synthesis-sidecar-runtime-release-set";

const execFileAsync = promisify(execFile);
const WORKFLOW = "release-synthesis-sidecar.yml";

async function commandRunner(command: string, args: string[]) {
  const result = await execFileAsync(command, args, { windowsHide: true });
  return { stdout: result.stdout || "", stderr: result.stderr || "" };
}

export async function dispatchSynthesisSidecarRelease(args: {
  releaseSetId: string;
  repo: string;
  requestId?: string;
  commandRunner?: CommandRunner;
}) {
  const run = args.commandRunner || commandRunner;
  const releaseSet = await readSynthesisSidecarRuntimeReleaseSet();
  if (releaseSet.releaseSetId !== args.releaseSetId)
    throw new Error(
      "Requested release set does not match the committed sidecar release set",
    );
  const branch = await run("git", ["branch", "--show-current"]);
  const status = await run("git", ["status", "--porcelain"]);
  const head = await run("git", ["rev-parse", "HEAD"]);
  if (branch.stdout.trim() !== "main" || status.stdout.trim())
    throw new Error("Sidecar release dispatch requires clean main");
  if (head.stdout.trim() !== releaseSet.sourceCommit)
    throw new Error(
      "Release set must be committed at the dispatched main HEAD",
    );
  await run("git", ["fetch", "origin", "main"]);
  const remote = await run("git", ["rev-parse", "origin/main"]);
  if (remote.stdout.trim() !== releaseSet.sourceCommit)
    throw new Error(
      "Push the prepared release set to origin/main before dispatching",
    );
  const requestId = args.requestId || createGithubWorkflowRequestId("ssr");
  const selected = await dispatchAndResolveGithubWorkflowRun({
    workflow: WORKFLOW,
    repo: args.repo,
    ref: "main",
    inputs: {
      release_set_id: releaseSet.releaseSetId,
      source_sha: releaseSet.sourceCommit,
      request_id: requestId,
    },
    expectedDisplayTitle: `Synthesis sidecar ${releaseSet.releaseSetId} (${requestId})`,
    expectedHeadSha: releaseSet.sourceCommit,
    commandRunner: run,
  });
  return {
    schema: "synthesis-sidecar-runtime-dispatch-result.v1",
    releaseSetId: releaseSet.releaseSetId,
    sourceSha: releaseSet.sourceCommit,
    aggregate: releaseSet.prebuild.aggregate,
    requestId,
    runId: selected.databaseId,
    runUrl: selected.url,
  };
}

async function main() {
  const value = (name: string) =>
    process.argv
      .find((entry) => entry.startsWith(`--${name}=`))
      ?.slice(name.length + 3) || "";
  const releaseSetId = value("release-set-id");
  const repo = value("repo");
  if (!releaseSetId || !repo)
    throw new Error("--release-set-id and --repo are required");
  process.stdout.write(
    `${JSON.stringify(await dispatchSynthesisSidecarRelease({ releaseSetId, repo, requestId: value("request-id") || undefined }), null, 2)}\n`,
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
