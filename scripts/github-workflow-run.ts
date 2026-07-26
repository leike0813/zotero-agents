import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type CommandResult = {
  stdout: string;
  stderr: string;
};

export type CommandRunner = (
  command: string,
  args: string[],
) => Promise<CommandResult>;

export type GithubWorkflowRun = {
  databaseId: number;
  displayTitle: string;
  event?: string;
  headBranch?: string;
  headSha: string;
  url: string;
  workflowPath?: string;
};

async function runCommand(command: string, args: string[]) {
  const result = await execFileAsync(command, args, { windowsHide: true });
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function parseWorkflowRuns(text: string): GithubWorkflowRun[] {
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    throw new Error("GitHub workflow run list did not return an array");
  }
  return parsed.map((entry) => ({
    databaseId: Number(entry.databaseId),
    displayTitle: String(entry.displayTitle || ""),
    event: String(entry.event || ""),
    headBranch: String(entry.headBranch || ""),
    headSha: String(entry.headSha || ""),
    url: String(entry.url || ""),
  }));
}

export function createGithubWorkflowRequestId(prefix: string) {
  return `${prefix}-${randomUUID()}`;
}

export function selectGithubWorkflowRun(
  runs: GithubWorkflowRun[],
  expected: {
    displayTitle: string;
    headSha: string;
    headBranch?: string;
    excludedRunIds?: ReadonlySet<number>;
  },
) {
  const matches = runs.filter(
    (run) =>
      run.displayTitle === expected.displayTitle &&
      run.headSha === expected.headSha &&
      (!expected.headBranch || run.headBranch === expected.headBranch) &&
      !expected.excludedRunIds?.has(run.databaseId),
  );
  if (matches.length > 1) {
    throw new Error(
      `Multiple workflow runs match ${expected.displayTitle} at ${expected.headSha}`,
    );
  }
  return matches[0];
}

export function buildGithubWorkflowDispatchArgs(args: {
  workflow: string;
  repo: string;
  ref: string;
  inputs: Record<string, string>;
}) {
  const result = [
    "workflow",
    "run",
    args.workflow,
    "--repo",
    args.repo,
    "--ref",
    args.ref,
  ];
  for (const [name, value] of Object.entries(args.inputs)) {
    result.push("-f", `${name}=${value}`);
  }
  return result;
}

export function buildGithubWorkflowRunListArgs(args: {
  workflow: string;
  repo: string;
}) {
  return [
    "run",
    "list",
    "--repo",
    args.repo,
    "--workflow",
    args.workflow,
    "--event",
    "workflow_dispatch",
    "--limit",
    "30",
    "--json",
    "databaseId,displayTitle,event,headBranch,headSha,url",
  ];
}

async function listGithubWorkflowRuns(args: {
  workflow: string;
  repo: string;
  commandRunner: CommandRunner;
}) {
  const response = await args.commandRunner(
    "gh",
    buildGithubWorkflowRunListArgs({
      workflow: args.workflow,
      repo: args.repo,
    }),
  );
  return parseWorkflowRuns(response.stdout);
}

export async function resolveGithubWorkflowRun(args: {
  workflow: string;
  repo: string;
  expectedDisplayTitle: string;
  expectedHeadSha: string;
  expectedHeadBranch?: string;
  excludedRunIds?: ReadonlySet<number>;
  requestId: string;
  commandRunner?: CommandRunner;
  maxAttempts?: number;
  pollIntervalMs?: number;
}) {
  const commandRunner = args.commandRunner || runCommand;
  const maxAttempts = args.maxAttempts ?? 15;
  const pollIntervalMs = args.pollIntervalMs ?? 2_000;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const selected = selectGithubWorkflowRun(
      await listGithubWorkflowRuns({
        workflow: args.workflow,
        repo: args.repo,
        commandRunner,
      }),
      {
        displayTitle: args.expectedDisplayTitle,
        headSha: args.expectedHeadSha,
        headBranch: args.expectedHeadBranch,
        excludedRunIds: args.excludedRunIds,
      },
    );
    if (selected) return selected;
    if (attempt + 1 < maxAttempts && pollIntervalMs > 0) {
      await delay(pollIntervalMs);
    }
  }
  throw new Error(
    `Unable to resolve workflow run for request ${args.requestId}`,
  );
}

export async function dispatchAndResolveGithubWorkflowRun(args: {
  workflow: string;
  repo: string;
  ref: string;
  inputs: Record<string, string>;
  expectedDisplayTitle: string;
  expectedHeadSha?: string;
  resolveExpectedHeadSha?: () => Promise<string>;
  commandRunner?: CommandRunner;
  maxAttempts?: number;
  pollIntervalMs?: number;
}) {
  const commandRunner = args.commandRunner || runCommand;
  const requestId = String(args.inputs.request_id || "").trim();
  if (!requestId) {
    throw new Error("GitHub workflow dispatch requires request_id");
  }
  const expectedHeadSha =
    args.expectedHeadSha || (await args.resolveExpectedHeadSha?.()) || "";
  if (!expectedHeadSha) {
    throw new Error("GitHub workflow run resolution requires a head SHA");
  }
  const existingRuns = await listGithubWorkflowRuns({
    workflow: args.workflow,
    repo: args.repo,
    commandRunner,
  });
  const excludedRunIds = new Set(
    existingRuns
      .filter(
        (run) =>
          run.displayTitle === args.expectedDisplayTitle &&
          run.headSha === expectedHeadSha &&
          run.headBranch === args.ref,
      )
      .map((run) => run.databaseId),
  );
  await commandRunner(
    "gh",
    buildGithubWorkflowDispatchArgs({
      workflow: args.workflow,
      repo: args.repo,
      ref: args.ref,
      inputs: args.inputs,
    }),
  );
  return resolveGithubWorkflowRun({
    workflow: args.workflow,
    repo: args.repo,
    expectedDisplayTitle: args.expectedDisplayTitle,
    expectedHeadSha,
    expectedHeadBranch: args.ref,
    excludedRunIds,
    requestId,
    commandRunner,
    maxAttempts: args.maxAttempts,
    pollIntervalMs: args.pollIntervalMs,
  });
}

export async function viewGithubWorkflowRun(args: {
  repo: string;
  runId: number;
  expectedWorkflow: string;
  expectedRef: string;
  expectedHeadSha: string;
  commandRunner?: CommandRunner;
}) {
  const commandRunner = args.commandRunner || runCommand;
  const response = await commandRunner("gh", [
    "api",
    `repos/${args.repo}/actions/runs/${args.runId}`,
    "--method",
    "GET",
  ]);
  const parsed = JSON.parse(response.stdout);
  const run: GithubWorkflowRun = {
    databaseId: Number(parsed.id),
    displayTitle: String(parsed.display_title || ""),
    event: String(parsed.event || ""),
    headBranch: String(parsed.head_branch || ""),
    headSha: String(parsed.head_sha || ""),
    url: String(parsed.html_url || ""),
    workflowPath: String(parsed.path || ""),
  };
  const expectedWorkflowPath = args.expectedWorkflow.startsWith(
    ".github/workflows/",
  )
    ? args.expectedWorkflow
    : `.github/workflows/${args.expectedWorkflow}`;
  const matchesWorkflowPath =
    run.workflowPath === expectedWorkflowPath ||
    run.workflowPath?.startsWith(`${expectedWorkflowPath}@`);
  if (
    !Number.isSafeInteger(run.databaseId) ||
    run.databaseId !== args.runId ||
    !run.displayTitle ||
    run.event !== "workflow_dispatch" ||
    run.headBranch !== args.expectedRef ||
    run.headSha !== args.expectedHeadSha ||
    !run.url ||
    !matchesWorkflowPath
  ) {
    throw new Error(
      `GitHub workflow run ${args.runId} does not match workflow ${expectedWorkflowPath}, ref ${args.expectedRef}, and source ${args.expectedHeadSha}`,
    );
  }
  return run;
}

export async function watchGithubWorkflowRun(args: {
  repo: string;
  runId: number;
  commandRunner?: CommandRunner;
}) {
  const commandRunner = args.commandRunner || runCommand;
  await commandRunner("gh", [
    "run",
    "watch",
    String(args.runId),
    "--repo",
    args.repo,
    "--exit-status",
  ]);
}

export async function downloadGithubWorkflowArtifact(args: {
  repo: string;
  runId: number;
  artifact: string;
  directory: string;
  commandRunner?: CommandRunner;
}) {
  const commandRunner = args.commandRunner || runCommand;
  await commandRunner("gh", [
    "run",
    "download",
    String(args.runId),
    "--repo",
    args.repo,
    "--name",
    args.artifact,
    "--dir",
    args.directory,
  ]);
}
