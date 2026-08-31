import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  SYNTHESIS_SIDECAR_RUNTIME_TARGETS,
  synthesisSidecarRuntimeTargetBundlePath,
} from "../packages/synthesis-contracts/src/sidecarRuntimeBundle";
import {
  assertSynthesisSidecarRuntimePrebuildResultIdentity,
  rebuildSynthesisSidecarRuntimePrebuildResult,
} from "../packages/synthesis-contracts/src/sidecarRuntimeRelease";
import { checkSynthesisSidecarRuntimeFreshness } from "./check-synthesis-sidecar-runtime-freshness";
import {
  type CommandRunner,
  createGithubWorkflowRequestId,
  dispatchAndResolveGithubWorkflowRun,
  downloadGithubWorkflowArtifact,
  viewGithubWorkflowRun,
  watchGithubWorkflowRun,
} from "./github-workflow-run";
import { resolveSynthesisSidecarVerification } from "./resolve-synthesis-sidecar-verification";
import { syncSynthesisSidecarRuntimePrebuilds } from "./sync-synthesis-sidecar-runtime-prebuilds";
import { computeSynthesisSidecarRuntimeIdentities } from "./synthesis-sidecar-runtime-release-governance";

const execFileAsync = promisify(execFile);
const WORKFLOW = "prebuild-synthesis-sidecar-runtime.yml";
const RESULT_ARTIFACT = "synthesis-sidecar-runtime-prebuild-result";
const RESULT_FILE = "prebuild-result.json";
const DEFAULT_REPO = "leike0813/zotero-agents";

async function runCommand(command: string, args: string[]) {
  const result = await execFileAsync(command, args, { windowsHide: true });
  return { stdout: result.stdout || "", stderr: result.stderr || "" };
}

function fullSha(value: string, label: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(normalized)) {
    throw new Error(`${label} must be a full 40-character commit SHA`);
  }
  return normalized;
}

function dirtyPaths(status: string) {
  return status
    .split(/\r?\n/)
    .filter(Boolean)
    .flatMap((line) => line.slice(3).split(" -> "))
    .filter(Boolean);
}

const bundleRoots = SYNTHESIS_SIDECAR_RUNTIME_TARGETS.map((target) =>
  path.posix.join("addon/bin", synthesisSidecarRuntimeTargetBundlePath(target)),
);

function overlappingBundlePaths(paths: readonly string[]) {
  return paths.filter((file) =>
    bundleRoots.some((root) => file === root || file.startsWith(`${root}/`)),
  );
}

export function assertSynthesisSidecarBundleReplacement(args: {
  dirtyPaths: readonly string[];
  overwriteDirtyBundles?: boolean;
}) {
  const overlaps = overlappingBundlePaths(args.dirtyPaths);
  if (overlaps.length > 0 && !args.overwriteDirtyBundles) {
    throw new Error(
      `Refusing to replace dirty Synthesis sidecar bundles: ${overlaps.join(", ")}`,
    );
  }
  return overlaps;
}

export async function assertSynthesisSidecarPrebuildSourceState(args: {
  ref: string;
  sourceSha: string;
  commandRunner?: CommandRunner;
}) {
  const run = args.commandRunner || runCommand;
  const branch = (await run("git", ["branch", "--show-current"])).stdout.trim();
  if (!branch)
    throw new Error("Synthesis sidecar prebuild requires an attached branch");
  const head = fullSha(
    (await run("git", ["rev-parse", "HEAD"])).stdout,
    "HEAD",
  );
  const sourceSha = fullSha(args.sourceSha, "Requested source SHA");
  if (head !== sourceSha) {
    throw new Error("Requested source SHA must equal the current HEAD");
  }
  const ref = args.ref.trim();
  if (!ref) throw new Error("Synthesis sidecar prebuild ref is required");
  await run("git", ["check-ref-format", "--branch", ref]);
  const upstream = (
    await run("git", [
      "rev-parse",
      "--abbrev-ref",
      "--symbolic-full-name",
      "@{upstream}",
    ])
  ).stdout.trim();
  const separator = upstream.indexOf("/");
  if (separator < 1) {
    throw new Error("Synthesis sidecar prebuild requires an upstream remote");
  }
  const remote = upstream.slice(0, separator);
  await run("git", [
    "fetch",
    remote,
    `refs/heads/${ref}:refs/remotes/${remote}/${ref}`,
  ]);
  const remoteSha = fullSha(
    (await run("git", ["rev-parse", `refs/remotes/${remote}/${ref}`])).stdout,
    "Remote ref",
  );
  if (remoteSha !== head) {
    throw new Error("Requested ref must resolve to the current pushed HEAD");
  }
  const status = (await run("git", ["status", "--porcelain=v1"])).stdout;
  return {
    branch,
    upstream,
    remote,
    ref,
    sourceSha,
    dirtyPaths: dirtyPaths(status),
  };
}

function requestIdFromTitle(title: string) {
  const prefix = "Synthesis sidecar prebuild ";
  if (!title.startsWith(prefix) || !title.slice(prefix.length).trim()) {
    throw new Error("Workflow run title is not a Synthesis sidecar prebuild");
  }
  return title.slice(prefix.length).trim();
}

export async function dispatchSynthesisSidecarPrebuild(args: {
  repo: string;
  ref: string;
  sourceSha: string;
  resumeRunId?: number;
  overwriteDirtyBundles?: boolean;
  artifactRoot?: string;
  commandRunner?: CommandRunner;
  syncPrebuilds?: typeof syncSynthesisSidecarRuntimePrebuilds;
  checkFreshness?: typeof checkSynthesisSidecarRuntimeFreshness;
  resolveVerification?: typeof resolveSynthesisSidecarVerification;
}) {
  const runCommand = args.commandRunner || runCommandDefault;
  const source = await assertSynthesisSidecarPrebuildSourceState({
    ref: args.ref,
    sourceSha: args.sourceSha,
    commandRunner: runCommand,
  });
  let run;
  let requestId: string;
  if (args.resumeRunId) {
    run = await viewGithubWorkflowRun({
      repo: args.repo,
      runId: args.resumeRunId,
      expectedWorkflow: WORKFLOW,
      expectedRef: source.ref,
      expectedHeadSha: source.sourceSha,
      commandRunner: runCommand,
    });
    requestId = requestIdFromTitle(run.displayTitle);
  } else {
    requestId = createGithubWorkflowRequestId("ssdp");
    run = await dispatchAndResolveGithubWorkflowRun({
      workflow: WORKFLOW,
      repo: args.repo,
      ref: source.ref,
      inputs: { source_sha: source.sourceSha, request_id: requestId },
      expectedDisplayTitle: `Synthesis sidecar prebuild ${requestId}`,
      expectedHeadSha: source.sourceSha,
      commandRunner: runCommand,
    });
  }
  try {
    await watchGithubWorkflowRun({
      repo: args.repo,
      runId: run.databaseId,
      commandRunner: runCommand,
    });
  } catch (error) {
    throw new Error(
      `Synthesis sidecar prebuild run ${run.databaseId} failed; resume with --resume-run-id=${run.databaseId}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const artifactRoot = path.resolve(
    args.artifactRoot ||
      path.join(
        ".scaffold",
        "synthesis-sidecar-prebuild-results",
        String(run.databaseId),
      ),
  );
  await fs.rm(artifactRoot, { recursive: true, force: true });
  await fs.mkdir(artifactRoot, { recursive: true });
  await downloadGithubWorkflowArtifact({
    repo: args.repo,
    runId: run.databaseId,
    artifact: RESULT_ARTIFACT,
    directory: artifactRoot,
    commandRunner: runCommand,
  });
  const result = rebuildSynthesisSidecarRuntimePrebuildResult(
    JSON.parse(await fs.readFile(path.join(artifactRoot, RESULT_FILE), "utf8")),
  );
  assertSynthesisSidecarRuntimePrebuildResultIdentity(result, {
    repository: args.repo,
    workflow: WORKFLOW,
    runId: run.databaseId,
    requestId,
    sourceSha: source.sourceSha,
  });
  const currentStatus = dirtyPaths(
    (await runCommand("git", ["status", "--porcelain=v1"])).stdout,
  );
  assertSynthesisSidecarBundleReplacement({
    dirtyPaths: currentStatus,
    overwriteDirtyBundles: args.overwriteDirtyBundles,
  });
  const sync = await (
    args.syncPrebuilds || syncSynthesisSidecarRuntimePrebuilds
  )({
    aggregate: result.aggregate,
    storeRoot: await fetchExactPrebuildStore({
      repo: args.repo,
      commit: result.prebuildCommit,
      commandRunner: runCommand,
      artifactRoot,
    }),
    result,
    expected: {
      repository: args.repo,
      runId: run.databaseId,
      requestId,
      sourceSha: source.sourceSha,
    },
  });
  const freshness = await (
    args.checkFreshness || checkSynthesisSidecarRuntimeFreshness
  )();
  if (!freshness.ok) {
    throw new Error(
      `Synthesis sidecar freshness failed: ${JSON.stringify(freshness.diagnostics)}`,
    );
  }
  let releaseVerification: Record<string, unknown>;
  try {
    const identities = await computeSynthesisSidecarRuntimeIdentities();
    const resolution = await (
      args.resolveVerification || resolveSynthesisSidecarVerification
    )({
      repository: args.repo,
      sourceSha: source.sourceSha,
      sourceFingerprint: result.sourceFingerprint,
      buildFingerprint: result.buildFingerprint,
      verificationFingerprint: identities.verificationFingerprint,
      verificationPipelineRevision: identities.verificationPipelineRevision,
    });
    releaseVerification = resolution.receipt
      ? { status: "eligible", runId: resolution.receipt.runId }
      : { status: "blocked", diagnostics: resolution.diagnostics };
  } catch (error) {
    releaseVerification = {
      status: "unavailable",
      message: error instanceof Error ? error.message : String(error),
    };
  }
  return Object.freeze({
    schema: "synthesis-sidecar-development-prebuild-operation.v1" as const,
    status: "complete" as const,
    repository: args.repo,
    ref: source.ref,
    sourceSha: source.sourceSha,
    requestId,
    runId: run.databaseId,
    runUrl: run.url,
    aggregate: result.aggregate,
    prebuildCommit: result.prebuildCommit,
    dirtyPaths: source.dirtyPaths,
    sync,
    freshness,
    releaseVerification,
  });
}

const runCommandDefault = runCommand;

async function fetchExactPrebuildStore(args: {
  repo: string;
  commit: string;
  artifactRoot: string;
  commandRunner: CommandRunner;
}) {
  const store = path.join(args.artifactRoot, "prebuild-store");
  await fs.rm(store, { recursive: true, force: true });
  await fs.mkdir(store, { recursive: true });
  await args.commandRunner("git", ["-C", store, "init"]);
  await args.commandRunner("git", [
    "-C",
    store,
    "remote",
    "add",
    "origin",
    `https://github.com/${args.repo}.git`,
  ]);
  await args.commandRunner("git", [
    "-C",
    store,
    "fetch",
    "--depth=1",
    "origin",
    args.commit,
  ]);
  await args.commandRunner("git", [
    "-C",
    store,
    "checkout",
    "--detach",
    "FETCH_HEAD",
  ]);
  const actual = fullSha(
    (await args.commandRunner("git", ["-C", store, "rev-parse", "HEAD"]))
      .stdout,
    "Fetched prebuild commit",
  );
  if (actual !== args.commit)
    throw new Error("Fetched prebuild commit mismatch");
  return store;
}

export function parseSynthesisSidecarPrebuildArgs(argv: string[]) {
  const values = new Map<string, string>();
  const flags = new Set<string>();
  const supported = new Set([
    "--repo",
    "--ref",
    "--source-sha",
    "--resume-run-id",
    "--overwrite-dirty-bundles",
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index];
    const separator = entry.indexOf("=");
    const name = separator >= 0 ? entry.slice(0, separator) : entry;
    if (!supported.has(name))
      throw new Error(`Unsupported prebuild argument: ${entry}`);
    if (name === "--overwrite-dirty-bundles") {
      flags.add(name);
      continue;
    }
    const value = separator >= 0 ? entry.slice(separator + 1) : argv[++index];
    if (!value || value.startsWith("--"))
      throw new Error(`${name} requires a value`);
    values.set(name, value.trim());
  }
  const resume = values.get("--resume-run-id");
  const resumeRunId = resume ? Number(resume) : undefined;
  if (
    resume &&
    (!Number.isSafeInteger(resumeRunId) || Number(resumeRunId) < 1)
  ) {
    throw new Error("--resume-run-id must be a positive integer");
  }
  return {
    repo: values.get("--repo"),
    ref: values.get("--ref"),
    sourceSha: values.get("--source-sha"),
    resumeRunId,
    overwriteDirtyBundles: flags.has("--overwrite-dirty-bundles"),
  };
}

function help() {
  process.stdout.write(
    "Usage: npm run prebuild:synthesis-sidecar:dispatch -- [--repo=<owner/name>] [--ref=<branch>] [--source-sha=<sha>] [--resume-run-id=<id>] [--overwrite-dirty-bundles]\n",
  );
}

async function main() {
  if (process.argv.includes("--help")) return help();
  const branch = (
    await runCommand("git", ["branch", "--show-current"])
  ).stdout.trim();
  const head = (await runCommand("git", ["rev-parse", "HEAD"])).stdout.trim();
  const parsed = parseSynthesisSidecarPrebuildArgs(process.argv.slice(2));
  const result = await dispatchSynthesisSidecarPrebuild({
    repo: parsed.repo || process.env.GITHUB_REPOSITORY || DEFAULT_REPO,
    ref: parsed.ref || branch,
    sourceSha: parsed.sourceSha || head,
    resumeRunId: parsed.resumeRunId,
    overwriteDirtyBundles: parsed.overwriteDirtyBundles,
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
