import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const WORKFLOW = "release-host-bridge.yml";
const DEFAULT_REPO = "leike0813/zotero-agents";

type CommandRunner = (
  command: string,
  args: string[],
) => Promise<{ stdout: string; stderr: string }>;

function argValue(name: string) {
  const inline = process.argv.find((entry) => entry.startsWith(`${name}=`));
  const index = process.argv.indexOf(name);
  return (
    inline?.slice(name.length + 1) ||
    (index >= 0 ? process.argv[index + 1] : "")
  ).trim();
}

async function runCommand(command: string, args: string[]) {
  const result = await execFileAsync(command, args, { windowsHide: true });
  return { stdout: result.stdout || "", stderr: result.stderr || "" };
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function selectDispatchedHostBridgeRun(
  runs: Array<{
    databaseId: number;
    displayTitle: string;
    headSha: string;
    url: string;
  }>,
  args: { releaseSetId: string; requestId: string; sourceSha: string },
) {
  const title = `Host Bridge ${args.releaseSetId} (${args.requestId})`;
  return runs.find(
    (run) => run.displayTitle === title && run.headSha === args.sourceSha,
  );
}

async function assertDispatchPreconditions(args: {
  commandRunner: CommandRunner;
  sourceSha: string;
}) {
  const branch = await args.commandRunner("git", ["branch", "--show-current"]);
  if (branch.stdout.trim() !== "main") {
    throw new Error("Host Bridge publication must be dispatched from main");
  }
  const status = await args.commandRunner("git", ["status", "--porcelain"]);
  if (status.stdout.trim()) {
    throw new Error("Commit Host Bridge preparation before dispatching");
  }
  await args.commandRunner("git", ["fetch", "origin", "main"]);
  const remote = await args.commandRunner("git", ["rev-parse", "origin/main"]);
  if (remote.stdout.trim() !== args.sourceSha) {
    throw new Error(
      "Push the exact prepared HEAD to origin/main before dispatching",
    );
  }
}

async function runLocalGates(
  commandRunner: CommandRunner,
  prebuildRequired: boolean,
  releaseSetSourceCommit: string,
) {
  const checks: Array<[string, string[]]> = [
    ["npm", ["run", "lint:check"]],
    ["npm", ["run", "check:host-bridge-doc-sync"]],
    ["npm", ["run", "check:host-bridge-content"]],
    ["npm", ["run", "check:zotero-library-agent-bundle"]],
    ["npm", ["run", "check:zotero-librarian-profile"]],
    [
      "npx",
      [
        "tsx",
        "scripts/render-host-bridge-release-set.ts",
        "--check",
        `--source-commit=${releaseSetSourceCommit}`,
      ],
    ],
    [
      "npx",
      [
        "tsx",
        "node_modules/mocha/bin/mocha",
        "test/core/108-host-bridge-workflow-control.test.ts",
        "test/core/139-host-bridge-cli-packaging.test.ts",
        "test/core/165-zotero-librarian-profile.test.ts",
        "test/core/167-host-bridge-semantic-review-skill.test.ts",
        "test/core/168-host-bridge-release-coordinator.test.ts",
        "test/core/169-host-bridge-agent-surface.test.ts",
        "--require",
        "test/setup/zotero-mock.ts",
      ],
    ],
  ];
  if (!prebuildRequired) {
    checks.splice(3, 0, [
      "npm",
      ["run", "check:host-bridge-cli-prebuild-freshness"],
    ]);
  }
  for (const [command, commandArgs] of checks) {
    await commandRunner(command, commandArgs);
  }
}

export async function dispatchHostBridgeRelease(args: {
  releaseSetId: string;
  repo?: string;
  ref?: string;
  requestId?: string;
  watch?: boolean;
  commandRunner?: CommandRunner;
  runLocalChecks?: boolean;
}) {
  const commandRunner = args.commandRunner || runCommand;
  const releaseSet = JSON.parse(
    await readFile("host-bridge/release-set.json", "utf8"),
  );
  if (releaseSet.releaseSetId !== args.releaseSetId) {
    throw new Error(
      `Requested ${args.releaseSetId} does not match committed ${releaseSet.releaseSetId}`,
    );
  }
  const head = await commandRunner("git", ["rev-parse", "HEAD"]);
  const sourceSha = head.stdout.trim();
  await assertDispatchPreconditions({
    commandRunner,
    sourceSha,
  });
  if (args.runLocalChecks !== false) {
    await runLocalGates(
      commandRunner,
      Boolean(releaseSet.cli?.prebuildRequired),
      String(releaseSet.source?.commit || ""),
    );
  }
  const repo = args.repo || DEFAULT_REPO;
  const ref = args.ref || "main";
  const requestId = args.requestId || `hbr-${randomUUID()}`;
  await commandRunner("gh", [
    "workflow",
    "run",
    WORKFLOW,
    "--repo",
    repo,
    "--ref",
    ref,
    "-f",
    `release_set_id=${args.releaseSetId}`,
    "-f",
    `source_sha=${sourceSha}`,
    "-f",
    `request_id=${requestId}`,
  ]);

  let selected: ReturnType<typeof selectDispatchedHostBridgeRun> = undefined;
  for (let attempt = 0; attempt < 15 && !selected; attempt += 1) {
    const runs = await commandRunner("gh", [
      "run",
      "list",
      "--repo",
      repo,
      "--workflow",
      WORKFLOW,
      "--event",
      "workflow_dispatch",
      "--limit",
      "30",
      "--json",
      "databaseId,displayTitle,headSha,url",
    ]);
    selected = selectDispatchedHostBridgeRun(JSON.parse(runs.stdout), {
      releaseSetId: args.releaseSetId,
      requestId,
      sourceSha,
    });
    if (!selected && attempt < 14) await delay(2_000);
  }
  if (!selected) {
    throw new Error(`Unable to resolve workflow run for request ${requestId}`);
  }
  if (args.watch) {
    await commandRunner("gh", [
      "run",
      "watch",
      String(selected.databaseId),
      "--repo",
      repo,
      "--exit-status",
    ]);
    await commandRunner("git", ["fetch", "origin", "main"]);
    await commandRunner("git", ["merge", "--ff-only", "origin/main"]);
  }
  const finalizedHead = args.watch
    ? (await commandRunner("git", ["rev-parse", "HEAD"])).stdout.trim()
    : sourceSha;
  return {
    schema: "host-bridge.dispatch-result.v1",
    releaseSetId: args.releaseSetId,
    requestId,
    sourceSha,
    runId: selected.databaseId,
    runUrl: selected.url,
    finalizedSourceSha: finalizedHead,
  };
}

async function main() {
  const releaseSetId = argValue("--release-set-id");
  if (!releaseSetId) throw new Error("--release-set-id is required");
  const result = await dispatchHostBridgeRelease({
    releaseSetId,
    repo: argValue("--repo") || undefined,
    ref: argValue("--ref") || undefined,
    requestId: argValue("--request-id") || undefined,
    watch: process.argv.includes("--watch"),
  });
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
