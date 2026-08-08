import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { bumpContentPackageVersion } from "./bump-content-package-version";
import {
  type CommandRunner,
  createGithubWorkflowRequestId,
  dispatchAndResolveGithubWorkflowRun,
  watchGithubWorkflowRun,
} from "./github-workflow-run";
import {
  canonicalizeContentPackageChannels,
  parseContentPackageChannels,
  type ContentPackageChannel,
} from "./content-package-channels";

type RunCommand = CommandRunner;

export type ContentPackageReleaseArgs = {
  target?: string;
  versionFile?: string;
  pluginVersion?: string;
  dispatch?: boolean;
  watch?: boolean;
  repo?: string;
  ref?: string;
  channels?: ContentPackageChannel[];
  runCommand?: RunCommand;
  requestId?: string;
  hostReleaseSetFile?: string;
  hostReceiptFile?: string;
};

export type ContentPackageReleaseResult = {
  bump?: {
    previousVersion: string;
    version: string;
  };
  dispatched: boolean;
  runId?: number;
  runUrl?: string;
  nextCommands: string[];
};

const DEFAULT_REPO = "leike0813/zotero-agents";
const DEFAULT_REF = "main";
const DEFAULT_VERSION_FILE = "content-package.version.json";
const WORKFLOW_FILE = "publish-content-feed.yml";

const execFileAsync = promisify(execFile);

function usage() {
  return [
    "Usage:",
    "  npm run release:content-package -- <patch|minor|major|version> [--plugin-version <range>]",
    "  npm run release:content-package -- --dispatch --channels <stable,beta,dev> [--watch] [--ref main]",
    "",
    "Examples:",
    "  npm run release:content-package -- patch",
    '  npm run release:content-package -- patch --plugin-version ">=0.6.0"',
    "  npm run release:content-package -- --dispatch --channels stable,beta,dev --watch",
  ].join("\n");
}

function readOptionValue(args: string[], index: number, name: string) {
  const entry = args[index] || "";
  const inlinePrefix = `${name}=`;
  if (entry.startsWith(inlinePrefix)) {
    return { value: entry.slice(inlinePrefix.length), consumed: 1 };
  }
  return { value: args[index + 1] || "", consumed: 2 };
}

export function parseContentPackageReleaseArgs(
  argv: string[],
): ContentPackageReleaseArgs {
  const parsed: ContentPackageReleaseArgs = {
    versionFile: DEFAULT_VERSION_FILE,
    dispatch: false,
    watch: false,
    repo: DEFAULT_REPO,
    ref: DEFAULT_REF,
  };

  for (let index = 0; index < argv.length; ) {
    const entry = String(argv[index] || "").trim();
    if (!entry) {
      index += 1;
      continue;
    }
    if (entry === "--dispatch") {
      parsed.dispatch = true;
      index += 1;
      continue;
    }
    if (entry === "--watch") {
      parsed.watch = true;
      index += 1;
      continue;
    }
    if (entry === "--channels" || entry.startsWith("--channels=")) {
      const option = readOptionValue(argv, index, "--channels");
      parsed.channels = parseContentPackageChannels(option.value);
      index += option.consumed;
      continue;
    }
    if (entry === "--repo" || entry.startsWith("--repo=")) {
      const option = readOptionValue(argv, index, "--repo");
      parsed.repo = option.value || DEFAULT_REPO;
      index += option.consumed;
      continue;
    }
    if (entry === "--ref" || entry.startsWith("--ref=")) {
      const option = readOptionValue(argv, index, "--ref");
      parsed.ref = option.value || DEFAULT_REF;
      index += option.consumed;
      continue;
    }
    if (entry === "--plugin-version" || entry.startsWith("--plugin-version=")) {
      const option = readOptionValue(argv, index, "--plugin-version");
      parsed.pluginVersion = option.value || undefined;
      index += option.consumed;
      continue;
    }
    if (entry === "--version-file" || entry.startsWith("--version-file=")) {
      const option = readOptionValue(argv, index, "--version-file");
      parsed.versionFile = option.value || DEFAULT_VERSION_FILE;
      index += option.consumed;
      continue;
    }
    if (entry === "--help" || entry === "-h") {
      throw new Error(usage());
    }
    if (entry.startsWith("-")) {
      throw new Error(`Unknown option: ${entry}\n\n${usage()}`);
    }
    if (parsed.target) {
      throw new Error(`Unexpected extra target: ${entry}\n\n${usage()}`);
    }
    parsed.target = entry;
    index += 1;
  }

  return parsed;
}

async function runCommand(command: string, args: string[]) {
  const result = await execFileAsync(command, args, {
    windowsHide: true,
  });
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

async function assertCleanWorkingTree(commandRunner: RunCommand) {
  const status = await commandRunner("git", ["status", "--porcelain"]);
  if (status.stdout.trim()) {
    throw new Error(
      [
        "Refusing to dispatch content package publishing with uncommitted changes.",
        "Commit and push content package changes before dispatching, so GitHub Actions can build the same revision.",
      ].join(" "),
    );
  }
}

async function assertRemoteRefContainsHead(args: {
  commandRunner: RunCommand;
  ref: string;
}) {
  await args.commandRunner("git", ["fetch", "origin", args.ref]);
  try {
    await args.commandRunner("git", [
      "merge-base",
      "--is-ancestor",
      "HEAD",
      `origin/${args.ref}`,
    ]);
  } catch {
    throw new Error(
      `Refusing to dispatch before local HEAD is available on origin/${args.ref}. Push or merge the content package changes first.`,
    );
  }
}

function nextCommands(args: { repo: string; ref: string }) {
  return [
    `git add ${DEFAULT_VERSION_FILE}`,
    'git commit -m "chore: bump content package version"',
    `git push origin ${args.ref}`,
    `npm run release:content-package -- --dispatch --watch --channels stable,beta,dev --repo ${args.repo} --ref ${args.ref}`,
  ];
}

async function assertHostBridgeReleaseComplete(args: {
  releaseSetFile: string;
  receiptFile: string;
}) {
  const releaseSet = JSON.parse(await readFile(args.releaseSetFile, "utf8"));
  let receipt: Record<string, unknown> = {};
  try {
    receipt = JSON.parse(await readFile(args.receiptFile, "utf8"));
  } catch {
    // Missing receipt is handled by the common mismatch error below.
  }
  if (
    receipt.status !== "complete" ||
    receipt.releaseSetId !== releaseSet.releaseSetId
  ) {
    throw new Error(
      `Host Bridge ${releaseSet.releaseSetId} has no matching complete receipt; finish that publication before dispatching content packages.`,
    );
  }
}

export async function prepareContentPackageRelease(
  args: ContentPackageReleaseArgs,
): Promise<ContentPackageReleaseResult> {
  const commandRunner = args.runCommand || runCommand;
  const repo = args.repo || DEFAULT_REPO;
  const ref = args.ref || DEFAULT_REF;
  const result: ContentPackageReleaseResult = {
    dispatched: false,
    nextCommands: nextCommands({ repo, ref }),
  };

  if (args.target && args.dispatch) {
    throw new Error(
      [
        "Do not combine a version bump target with --dispatch.",
        "Run the bump first, commit and push it, then run --dispatch.",
      ].join(" "),
    );
  }
  if (!args.dispatch && args.channels) {
    throw new Error("--channels can only be used with --dispatch.");
  }

  if (args.target) {
    result.bump = await bumpContentPackageVersion({
      filePath: args.versionFile || DEFAULT_VERSION_FILE,
      target: args.target,
      pluginVersion: args.pluginVersion,
    });
  }

  if (args.dispatch) {
    const channels = args.channels
      ? canonicalizeContentPackageChannels(args.channels)
      : [];
    if (channels.length === 0) {
      throw new Error("--channels is required when using --dispatch.");
    }
    await assertCleanWorkingTree(commandRunner);
    await assertRemoteRefContainsHead({ commandRunner, ref });
    await assertHostBridgeReleaseComplete({
      releaseSetFile: args.hostReleaseSetFile || "host-bridge/release-set.json",
      receiptFile:
        args.hostReceiptFile ||
        "host-bridge/latest-complete-release-receipt.json",
    });
    const requestId =
      args.requestId || createGithubWorkflowRequestId("content");
    const selected = await dispatchAndResolveGithubWorkflowRun({
      workflow: WORKFLOW_FILE,
      repo,
      ref,
      inputs: { request_id: requestId, channels: channels.join(",") },
      expectedDisplayTitle: `Content package ${requestId}`,
      resolveExpectedHeadSha: async () =>
        (await commandRunner("git", ["rev-parse", "HEAD"])).stdout.trim(),
      commandRunner,
    });
    result.dispatched = true;
    result.runId = selected.databaseId;
    result.runUrl = selected.url;
    if (args.watch) {
      await watchGithubWorkflowRun({
        repo,
        runId: selected.databaseId,
        commandRunner,
      });
    }
  }

  if (!args.target && !args.dispatch) {
    throw new Error(usage());
  }

  return result;
}

function formatResult(result: ContentPackageReleaseResult) {
  const lines: string[] = [];
  if (result.bump) {
    lines.push(
      `[content-package] version ${result.bump.previousVersion} -> ${result.bump.version}`,
    );
  }
  if (result.dispatched) {
    lines.push(
      `[content-package] dispatched ${WORKFLOW_FILE} run ${result.runId}`,
    );
  }
  if (result.nextCommands.length > 0 && !result.dispatched) {
    lines.push("[content-package] next steps:");
    lines.push(...result.nextCommands.map((command) => `  ${command}`));
  }
  return lines.join("\n");
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage());
    return;
  }
  const args = parseContentPackageReleaseArgs(process.argv.slice(2));
  const result = await prepareContentPackageRelease(args);
  console.log(formatResult(result));
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
