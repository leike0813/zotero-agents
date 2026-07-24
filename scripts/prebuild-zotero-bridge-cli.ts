import { execFile } from "node:child_process";
import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import {
  type CommandRunner,
  createGithubWorkflowRequestId,
  dispatchAndResolveGithubWorkflowRun,
  downloadGithubWorkflowArtifact,
  viewGithubWorkflowRun,
  watchGithubWorkflowRun,
} from "./github-workflow-run";
import { getHostBridgeCliReleaseStatus } from "./host-bridge-cli-release-governance.mjs";
import { checkHostBridgeCliPrebuildFreshness } from "./check-host-bridge-cli-prebuild-freshness.mjs";
import {
  assertPrebuildResultIdentity,
  readPrebuildResultText,
  syncHostBridgeCliPrebuilds,
} from "./sync-host-bridge-cli-prebuilds";

const execFileAsync = promisify(execFile);
const WORKFLOW = "build-host-bridge-cli-prebuilds.yml";
const RESULT_ARTIFACT = "host-bridge-cli-prebuild-result";
const RESULT_FILE = "host-bridge-cli-prebuild-result.json";
const DEFAULT_REPO = "leike0813/zotero-agents";

type PrebuildCliIdentity = {
  repo: string;
  ref: string;
  sourceSha: string;
};

export function parsePrebuildCliArgs(
  argv: string[],
  defaults: PrebuildCliIdentity,
) {
  const values = new Map<string, string>();
  const supported = new Set([
    "--repo",
    "--ref",
    "--source-sha",
    "--resume-run-id",
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const equalsIndex = argument.indexOf("=");
    const name = equalsIndex >= 0 ? argument.slice(0, equalsIndex) : argument;
    if (!supported.has(name)) {
      throw new Error(`Unsupported prebuild argument: ${argument}`);
    }
    const value =
      equalsIndex >= 0 ? argument.slice(equalsIndex + 1) : argv[index + 1];
    if (!value || (equalsIndex < 0 && value.startsWith("--"))) {
      throw new Error(`${name} requires a value`);
    }
    values.set(name, value.trim());
    if (equalsIndex < 0) index += 1;
  }
  const resumeValue = values.get("--resume-run-id") || "";
  const resumeRunId = resumeValue ? Number(resumeValue) : undefined;
  if (
    resumeValue &&
    (!Number.isSafeInteger(resumeRunId) || Number(resumeRunId) <= 0)
  ) {
    throw new Error("--resume-run-id must be a positive integer");
  }
  return {
    repo: values.get("--repo") || defaults.repo,
    ref: values.get("--ref") || defaults.ref,
    sourceSha: values.get("--source-sha") || defaults.sourceSha,
    resumeRunId,
  };
}

async function runCommand(command: string, args: string[]) {
  const result = await execFileAsync(command, args, { windowsHide: true });
  return { stdout: result.stdout || "", stderr: result.stderr || "" };
}

function requireFullSha(value: string, label: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(normalized)) {
    throw new Error(`${label} must be a full 40-character commit SHA`);
  }
  return normalized;
}

export function assertLockedHostBridgeCliIdentity(status: {
  currentVersion: string;
  manifestVersion: string;
  fingerprint: string;
  manifestFingerprint: string;
}) {
  if (
    status.currentVersion !== status.manifestVersion ||
    status.fingerprint !== status.manifestFingerprint
  ) {
    throw new Error(
      "Lock the Host Bridge CLI version identity and build fingerprint before dispatching prebuilds",
    );
  }
}

export async function assertPrebuildSourceState(args: {
  ref: string;
  sourceSha: string;
  commandRunner?: CommandRunner;
}) {
  const commandRunner = args.commandRunner || runCommand;
  const branch = (
    await commandRunner("git", ["branch", "--show-current"])
  ).stdout.trim();
  if (!branch) {
    throw new Error("Host Bridge CLI prebuild requires an attached branch");
  }
  const status = (
    await commandRunner("git", ["status", "--porcelain"])
  ).stdout.trim();
  if (status) {
    throw new Error("Host Bridge CLI prebuild requires a clean worktree");
  }
  const head = requireFullSha(
    (await commandRunner("git", ["rev-parse", "HEAD"])).stdout,
    "HEAD",
  );
  const sourceSha = requireFullSha(args.sourceSha, "Requested source SHA");
  if (sourceSha !== head) {
    throw new Error("Requested source SHA must equal the current HEAD");
  }

  let upstream = "";
  try {
    upstream = (
      await commandRunner("git", [
        "rev-parse",
        "--abbrev-ref",
        "--symbolic-full-name",
        "@{upstream}",
      ])
    ).stdout.trim();
  } catch {
    throw new Error("Host Bridge CLI prebuild requires an upstream branch");
  }
  if (!upstream || !upstream.includes("/")) {
    throw new Error("Host Bridge CLI prebuild requires an upstream branch");
  }
  const separator = upstream.indexOf("/");
  const remote = upstream.slice(0, separator);
  const upstreamBranch = upstream.slice(separator + 1);
  await commandRunner("git", [
    "fetch",
    remote,
    `refs/heads/${upstreamBranch}:refs/remotes/${upstream}`,
  ]);
  const upstreamSha = requireFullSha(
    (await commandRunner("git", ["rev-parse", "@{upstream}"])).stdout,
    "Upstream tip",
  );
  const remoteSha = requireFullSha(
    (await commandRunner("git", ["rev-parse", `refs/remotes/${upstream}`]))
      .stdout,
    "Remote branch tip",
  );
  if (head !== upstreamSha || head !== remoteSha) {
    throw new Error(
      "Host Bridge CLI prebuild requires HEAD to equal its pushed upstream tip",
    );
  }
  const ref = args.ref.trim();
  if (!ref) throw new Error("Host Bridge CLI prebuild ref is required");
  await commandRunner("git", ["check-ref-format", "--branch", ref]);
  if (ref !== upstreamBranch) {
    await commandRunner("git", [
      "fetch",
      remote,
      `refs/heads/${ref}:refs/remotes/${remote}/${ref}`,
    ]);
  }
  const remoteRefSha = requireFullSha(
    (await commandRunner("git", ["rev-parse", `refs/remotes/${remote}/${ref}`]))
      .stdout,
    "Requested remote ref",
  );
  if (remoteRefSha !== head) {
    throw new Error("Requested ref must resolve to the current pushed HEAD");
  }
  if (ref !== branch) {
    const refSha = requireFullSha(
      (await commandRunner("git", ["rev-parse", "--verify", `${ref}^{commit}`]))
        .stdout,
      "Requested ref",
    );
    if (refSha !== head) {
      throw new Error("Requested ref must resolve to the current pushed HEAD");
    }
  }
  return {
    branch,
    upstream,
    remote,
    ref,
    sourceSha,
  };
}

function requestIdFromRunTitle(displayTitle: string) {
  const prefix = "Host Bridge CLI prebuild ";
  if (!displayTitle.startsWith(prefix)) {
    throw new Error("Workflow run title is not a Host Bridge CLI prebuild");
  }
  const requestId = displayTitle.slice(prefix.length).trim();
  if (!requestId) {
    throw new Error("Workflow run title is missing its request id");
  }
  return requestId;
}

export async function prebuildZoteroBridgeCli(args: {
  repo: string;
  ref: string;
  sourceSha: string;
  resumeRunId?: number;
  commandRunner?: CommandRunner;
  artifactRoot?: string;
  getReleaseStatus?: () => Promise<{
    currentVersion: string;
    manifestVersion: string;
    fingerprint: string;
    manifestFingerprint: string;
  }>;
  syncPrebuilds?: (
    args: Parameters<typeof syncHostBridgeCliPrebuilds>[0],
  ) => Promise<unknown>;
  checkFreshness?: () => Promise<{
    ok: boolean;
    code?: string;
    message?: string;
    [key: string]: unknown;
  }>;
}) {
  const commandRunner = args.commandRunner || runCommand;
  const source = await assertPrebuildSourceState({
    ref: args.ref,
    sourceSha: args.sourceSha,
    commandRunner,
  });
  const releaseStatus = await (
    args.getReleaseStatus || getHostBridgeCliReleaseStatus
  )();
  assertLockedHostBridgeCliIdentity(releaseStatus);

  let run;
  let requestId: string;
  if (args.resumeRunId) {
    run = await viewGithubWorkflowRun({
      repo: args.repo,
      runId: args.resumeRunId,
      expectedWorkflow: WORKFLOW,
      expectedRef: source.ref,
      expectedHeadSha: source.sourceSha,
      commandRunner,
    });
    requestId = requestIdFromRunTitle(run.displayTitle);
  } else {
    requestId = createGithubWorkflowRequestId("hbcp");
    run = await dispatchAndResolveGithubWorkflowRun({
      workflow: WORKFLOW,
      repo: args.repo,
      ref: source.ref,
      inputs: {
        source_sha: source.sourceSha,
        request_id: requestId,
      },
      expectedDisplayTitle: `Host Bridge CLI prebuild ${requestId}`,
      expectedHeadSha: source.sourceSha,
      commandRunner,
    });
  }

  try {
    await watchGithubWorkflowRun({
      repo: args.repo,
      runId: run.databaseId,
      commandRunner,
    });
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error);
    throw new Error(
      [
        `Host Bridge CLI prebuild run ${run.databaseId} could not be observed: ${cause}`,
        `Request: ${requestId}`,
        `Run: ${run.url}`,
        "Resume with:",
        `npm run prebuild:zotero-bridge-cli -- --repo ${args.repo} --ref ${source.ref} --source-sha ${source.sourceSha} --resume-run-id ${run.databaseId}`,
      ].join("\n"),
    );
  }
  const artifactDirectory = path.resolve(
    args.artifactRoot ||
      path.join(
        ".scaffold",
        "host-bridge-cli-prebuild-results",
        String(run.databaseId),
      ),
  );
  await rm(artifactDirectory, { recursive: true, force: true });
  await mkdir(artifactDirectory, { recursive: true });
  await downloadGithubWorkflowArtifact({
    repo: args.repo,
    runId: run.databaseId,
    artifact: RESULT_ARTIFACT,
    directory: artifactDirectory,
    commandRunner,
  });
  const resultFile = path.join(artifactDirectory, RESULT_FILE);
  const result = readPrebuildResultText(await readFile(resultFile, "utf8"));
  assertPrebuildResultIdentity(result, {
    repository: args.repo,
    workflow: WORKFLOW,
    runId: run.databaseId,
    requestId,
    sourceSha: source.sourceSha,
    ref: source.ref,
    cliVersion: releaseStatus.currentVersion,
    buildFingerprint: releaseStatus.fingerprint,
  });

  const syncResult = await (args.syncPrebuilds || syncHostBridgeCliPrebuilds)({
    repo: args.repo,
    branch: result.prebuildBranch,
    identity: result,
  });
  const freshness = await (
    args.checkFreshness || checkHostBridgeCliPrebuildFreshness
  )();
  if (!freshness.ok) {
    throw new Error(
      `Host Bridge CLI prebuild freshness failed: ${freshness.code}: ${freshness.message}`,
    );
  }
  return {
    ok: true,
    runId: run.databaseId,
    runUrl: run.url,
    requestId,
    sourceSha: source.sourceSha,
    ref: source.ref,
    identity: result,
    sync: syncResult,
    freshness,
  };
}

async function main() {
  const commandRunner = runCommand;
  const currentBranch = (
    await commandRunner("git", ["branch", "--show-current"])
  ).stdout.trim();
  const currentHead = (
    await commandRunner("git", ["rev-parse", "HEAD"])
  ).stdout.trim();
  const cliArgs = parsePrebuildCliArgs(process.argv.slice(2), {
    repo: process.env.GITHUB_REPOSITORY || DEFAULT_REPO,
    ref: currentBranch,
    sourceSha: currentHead,
  });
  console.log(
    JSON.stringify(
      await prebuildZoteroBridgeCli({
        ...cliArgs,
        commandRunner,
      }),
      null,
      2,
    ),
  );
}

const invokedModule = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedModule) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
