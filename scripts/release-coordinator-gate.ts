import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import semver from "semver";

export type ReleaseGateNextAction =
  | "resolve_blockers"
  | "run_host_bridge_pipeline"
  | "publish_content_package"
  | "run_local_gates"
  | "sync_main_remotes"
  | "recover_release_state"
  | "ready_to_release"
  | "audit_complete";

export type ReleaseGateBlocker = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type ReleaseGateCommandResult = {
  stdout: string;
  stderr: string;
};

export type ReleaseGateCommandRunner = (
  command: string,
  args: string[],
) => Promise<ReleaseGateCommandResult>;

export type ReleaseGateRemoteState = {
  name: "origin" | "gitee";
  main: {
    status: "synced" | "local_ahead" | "local_behind" | "diverged" | "unknown";
    ahead: number;
    behind: number;
    error?: string;
  };
  tag: {
    exists: boolean;
    status: "exists" | "missing" | "unknown";
    error?: string;
  };
};

export type ReleaseGateReport = {
  schema: "zotero-agents.release-gate.v1";
  generated_at: string;
  branch: string;
  head: string;
  package_version: string;
  target_version: string;
  changed_files: string[];
  host_bridge: {
    required: boolean;
    completed: boolean;
    matched_files: string[];
  };
  content_package: {
    candidate: boolean;
    release_verified: boolean;
    mirror_verified: boolean;
    matched_files: string[];
  };
  local_gates: {
    test_node_full_passed: boolean;
    lint_check_passed: boolean;
  };
  remotes: ReleaseGateRemoteState[];
  local_tag: {
    exists: boolean;
    status: "exists" | "missing" | "unknown";
    error?: string;
  };
  github_release: {
    exists: boolean;
    status: "exists" | "missing" | "unknown";
    error?: string;
  };
  blockers: ReleaseGateBlocker[];
  next_action: ReleaseGateNextAction;
  suggested_commands: string[];
};

export type ReleaseGateArgs = {
  targetVersion?: string;
  changedFiles?: string[];
  now?: Date;
  commandRunner?: ReleaseGateCommandRunner;
  packageJsonPath?: string;
  hostBridgeDone?: boolean;
  testNodeFullPassed?: boolean;
  lintCheckPassed?: boolean;
  contentPackageReleaseVerified?: boolean;
  contentPackageMirrorVerified?: boolean;
  repo?: string;
};

const execFileAsync = promisify(execFile);
const RELEASE_GATE_SCHEMA = "zotero-agents.release-gate.v1" as const;
const DEFAULT_REPO = "leike0813/zotero-agents";

const HOST_BRIDGE_PREFIXES = [
  "cli/zotero-bridge/",
  "skills_builtin/zotero-bridge-cli/",
  "profiles/hermes/zotero-librarian/",
] as const;

const HOST_BRIDGE_EXACT_FILES = new Set([
  "src/modules/hostBridgeCapabilityRegistry.ts",
  "src/modules/zoteroHostCapabilityBroker.ts",
  "scripts/host-bridge-surface-catalog.ts",
  "scripts/render-zotero-librarian-profile.ts",
  "scripts/check-zotero-librarian-profile.ts",
  "scripts/build-zotero-bridge-cli.mjs",
  "scripts/package-zotero-bridge-cli.mjs",
  "scripts/publish-host-bridge-cli-bundle.ps1",
  "scripts/publish-zotero-librarian-profile.ps1",
  ".github/workflows/build-zotero-bridge-cli.yml",
]);

const CONTENT_PACKAGE_PREFIXES = [
  "skills_builtin/",
  "skills_src/",
  "workflows_builtin/",
  "feeds/",
] as const;

const CONTENT_PACKAGE_EXACT_FILES = new Set([
  "content-package.version.json",
  ".github/workflows/publish-content-feed.yml",
  "scripts/build-content-package-feed.ts",
  "scripts/bump-content-package-version.ts",
  "scripts/prepare-content-package-release.ts",
  "scripts/check-content-package-release.ts",
]);

async function defaultRunCommand(command: string, args: string[]) {
  const result = await execFileAsync(command, args, { windowsHide: true });
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function normalizePath(value: string) {
  return value
    .trim()
    .replace(/\\/g, "/")
    .replace(/^"\s*|\s*"$/g, "");
}

function normalizeTargetVersion(value: string | undefined) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }
  const withoutPrefix = normalized.replace(/^v/i, "");
  return semver.valid(withoutPrefix) ? `v${withoutPrefix}` : normalized;
}

function parseLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseStatusPath(line: string) {
  const match = line.match(/^.{2}\s+(.*)$/);
  const raw = (match ? match[1] : line.replace(/^\S+\s+/, "")).trim();
  const renamed = raw.includes(" -> ") ? raw.split(" -> ").pop() || raw : raw;
  return normalizePath(renamed);
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.map(normalizePath).filter(Boolean))].sort();
}

function isHostBridgeFile(file: string) {
  const normalized = normalizePath(file);
  return (
    HOST_BRIDGE_EXACT_FILES.has(normalized) ||
    HOST_BRIDGE_PREFIXES.some((prefix) => normalized.startsWith(prefix))
  );
}

function isContentPackageCandidateFile(file: string) {
  const normalized = normalizePath(file);
  return (
    CONTENT_PACKAGE_EXACT_FILES.has(normalized) ||
    CONTENT_PACKAGE_PREFIXES.some((prefix) => normalized.startsWith(prefix))
  );
}

async function readPackageVersion(filePath: string) {
  const pkg = JSON.parse(await fs.readFile(filePath, "utf8")) as {
    version?: unknown;
  };
  return String(pkg.version || "").trim();
}

async function runOptional(
  commandRunner: ReleaseGateCommandRunner,
  command: string,
  args: string[],
) {
  try {
    return {
      ok: true as const,
      ...(await commandRunner(command, args)),
    };
  } catch (error) {
    return {
      ok: false as const,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
    };
  }
}

async function collectChangedFiles(args: {
  commandRunner: ReleaseGateCommandRunner;
  provided?: string[];
  statusOutput: string;
}) {
  if (args.provided) {
    return uniqueSorted(args.provided);
  }

  const files: string[] = parseLines(args.statusOutput).map(parseStatusPath);
  const latestTag = await runOptional(args.commandRunner, "git", [
    "describe",
    "--tags",
    "--abbrev=0",
  ]);
  if (latestTag.ok && latestTag.stdout.trim()) {
    const diff = await runOptional(args.commandRunner, "git", [
      "diff",
      "--name-only",
      `${latestTag.stdout.trim()}..HEAD`,
    ]);
    if (diff.ok) {
      files.push(...parseLines(diff.stdout).map(normalizePath));
    }
  }

  return uniqueSorted(files);
}

function parseRemoteMainState(
  result: Awaited<ReturnType<typeof runOptional>>,
): ReleaseGateRemoteState["main"] {
  if (!result.ok) {
    return {
      status: "unknown",
      ahead: 0,
      behind: 0,
      error: result.stderr,
    };
  }
  const [aheadRaw, behindRaw] = result.stdout.trim().split(/\s+/);
  const ahead = Number(aheadRaw || 0);
  const behind = Number(behindRaw || 0);
  if (ahead > 0 && behind > 0) {
    return { status: "diverged", ahead, behind };
  }
  if (ahead > 0) {
    return { status: "local_ahead", ahead, behind };
  }
  if (behind > 0) {
    return { status: "local_behind", ahead, behind };
  }
  return { status: "synced", ahead, behind };
}

function parseTagState(result: Awaited<ReturnType<typeof runOptional>>) {
  if (!result.ok) {
    return {
      exists: false,
      status: "unknown" as const,
      error: result.stderr,
    };
  }
  const exists = result.stdout.trim().length > 0;
  return {
    exists,
    status: exists ? ("exists" as const) : ("missing" as const),
  };
}

async function inspectRemote(args: {
  name: "origin" | "gitee";
  targetVersion: string;
  commandRunner: ReleaseGateCommandRunner;
}): Promise<ReleaseGateRemoteState> {
  const mainResult = await runOptional(args.commandRunner, "git", [
    "rev-list",
    "--left-right",
    "--count",
    `HEAD...${args.name}/main`,
  ]);
  const tagResult = args.targetVersion
    ? await runOptional(args.commandRunner, "git", [
        "ls-remote",
        "--tags",
        args.name,
        `refs/tags/${args.targetVersion}`,
      ])
    : {
        ok: true as const,
        stdout: "",
        stderr: "",
      };
  return {
    name: args.name,
    main: parseRemoteMainState(mainResult),
    tag: parseTagState(tagResult),
  };
}

function addBlocker(
  blockers: ReleaseGateBlocker[],
  code: string,
  message: string,
  details?: Record<string, unknown>,
) {
  blockers.push({ code, message, ...(details ? { details } : {}) });
}

function resolveNextAction(blockers: ReleaseGateBlocker[], hasTarget: boolean) {
  const codes = new Set(blockers.map((blocker) => blocker.code));
  if (codes.has("dirty_worktree") || codes.has("not_on_main")) {
    return "resolve_blockers";
  }
  if (codes.has("host_bridge_pipeline_required")) {
    return "run_host_bridge_pipeline";
  }
  if (codes.has("content_package_release_not_verified")) {
    return "publish_content_package";
  }
  if (
    codes.has("test_node_full_required") ||
    codes.has("lint_check_required")
  ) {
    return "run_local_gates";
  }
  if (
    codes.has("main_not_synced_origin") ||
    codes.has("main_not_synced_gitee") ||
    codes.has("main_sync_unknown_origin") ||
    codes.has("main_sync_unknown_gitee")
  ) {
    return "sync_main_remotes";
  }
  if (
    codes.has("target_tag_exists_local") ||
    codes.has("target_tag_exists_origin") ||
    codes.has("target_tag_exists_gitee") ||
    codes.has("github_release_exists") ||
    codes.has("target_release_state_unknown")
  ) {
    return "recover_release_state";
  }
  if (blockers.length > 0) {
    return "resolve_blockers";
  }
  return hasTarget ? "ready_to_release" : "audit_complete";
}

function suggestedCommands(args: {
  nextAction: ReleaseGateNextAction;
  targetVersion: string;
}) {
  switch (args.nextAction) {
    case "run_host_bridge_pipeline":
      return ["Use $host-bridge-release-pipeline, then rerun this gate."];
    case "publish_content_package":
      return [
        "npm run release:content-package -- <patch|minor|major|version>",
        "npm run release:content-package -- --dispatch --watch",
        "npm run check:content-package-release",
        "npm run check:content-package-mirror",
      ];
    case "run_local_gates":
      return ["npm run test:node:full", "npm run lint:check"];
    case "sync_main_remotes":
      return ["git push origin main", "git push gitee main"];
    case "recover_release_state":
      return [
        `npm exec -- tsx scripts/release-coordinator-gate.ts --target ${args.targetVersion}`,
        "Read .agents/skills/zotero-agents-release-coordinator/references/failure-recovery.md",
      ];
    case "ready_to_release":
      return [`npm run release -- ${args.targetVersion}`];
    default:
      return [];
  }
}

export async function analyzeReleaseGate(
  args: ReleaseGateArgs = {},
): Promise<ReleaseGateReport> {
  const commandRunner = args.commandRunner || defaultRunCommand;
  const now = args.now || new Date();
  const targetVersion = normalizeTargetVersion(args.targetVersion);
  const packageVersion = await readPackageVersion(
    args.packageJsonPath || "package.json",
  );

  const status = await runOptional(commandRunner, "git", [
    "status",
    "--porcelain",
  ]);
  const branch = await runOptional(commandRunner, "git", [
    "branch",
    "--show-current",
  ]);
  const head = await runOptional(commandRunner, "git", [
    "rev-parse",
    "--verify",
    "HEAD",
  ]);
  const changedFiles = await collectChangedFiles({
    commandRunner,
    provided: args.changedFiles,
    statusOutput: status.stdout,
  });

  const hostBridgeMatchedFiles = changedFiles.filter(isHostBridgeFile);
  const contentPackageMatchedFiles = changedFiles.filter(
    isContentPackageCandidateFile,
  );
  const remotes = await Promise.all(
    (["origin", "gitee"] as const).map((name) =>
      inspectRemote({ name, targetVersion, commandRunner }),
    ),
  );
  const localTag = targetVersion
    ? parseTagState(
        await runOptional(commandRunner, "git", [
          "tag",
          "--list",
          targetVersion,
        ]),
      )
    : { exists: false, status: "missing" as const };
  const githubRelease = targetVersion
    ? parseTagState(
        await runOptional(commandRunner, "gh", [
          "release",
          "view",
          targetVersion,
          "--repo",
          args.repo || DEFAULT_REPO,
        ]),
      )
    : { exists: false, status: "missing" as const };

  const blockers: ReleaseGateBlocker[] = [];
  const currentBranch = branch.ok ? branch.stdout.trim() : "";
  if (!branch.ok || currentBranch !== "main") {
    addBlocker(blockers, "not_on_main", "Release must run from main.", {
      branch: currentBranch || "unknown",
    });
  }
  if (!status.ok) {
    addBlocker(
      blockers,
      "dirty_state_unknown",
      "Git status could not be read.",
    );
  } else if (status.stdout.trim()) {
    addBlocker(
      blockers,
      "dirty_worktree",
      "Working tree has uncommitted changes.",
      { files: parseLines(status.stdout).map(parseStatusPath) },
    );
  }

  const packageSemver = semver.valid(packageVersion);
  if (targetVersion) {
    const targetSemver = semver.valid(targetVersion.replace(/^v/i, ""));
    if (!targetSemver) {
      addBlocker(
        blockers,
        "invalid_target_version",
        "Target version is not valid semver.",
        {
          targetVersion,
        },
      );
    } else if (packageSemver && semver.lte(targetSemver, packageSemver)) {
      addBlocker(
        blockers,
        "target_version_not_greater",
        "Target version must be greater than package.json version.",
        { packageVersion, targetVersion },
      );
    }
  }

  if (hostBridgeMatchedFiles.length > 0 && !args.hostBridgeDone) {
    addBlocker(
      blockers,
      "host_bridge_pipeline_required",
      "Host Bridge candidate files changed; run the Host Bridge release pipeline.",
      { files: hostBridgeMatchedFiles },
    );
  }

  if (
    contentPackageMatchedFiles.length > 0 &&
    !args.contentPackageReleaseVerified
  ) {
    addBlocker(
      blockers,
      "content_package_release_not_verified",
      "Content package candidate files changed; verify published content feeds.",
      { files: contentPackageMatchedFiles },
    );
  }

  if (!args.testNodeFullPassed) {
    addBlocker(
      blockers,
      "test_node_full_required",
      "Run npm run test:node:full before plugin release.",
    );
  }
  if (!args.lintCheckPassed) {
    addBlocker(
      blockers,
      "lint_check_required",
      "Run npm run lint:check before plugin release.",
    );
  }

  for (const remote of remotes) {
    if (remote.main.status === "unknown") {
      addBlocker(
        blockers,
        `main_sync_unknown_${remote.name}`,
        `${remote.name}/main sync state is unknown.`,
        { error: remote.main.error },
      );
    } else if (remote.main.status !== "synced") {
      addBlocker(
        blockers,
        `main_not_synced_${remote.name}`,
        `HEAD is not synced with ${remote.name}/main.`,
        remote.main,
      );
    }
    if (remote.tag.status === "unknown") {
      addBlocker(
        blockers,
        "target_release_state_unknown",
        `${remote.name} target tag state is unknown.`,
        { remote: remote.name, error: remote.tag.error },
      );
    } else if (remote.tag.exists) {
      addBlocker(
        blockers,
        `target_tag_exists_${remote.name}`,
        `${remote.name} already has the target tag.`,
        { remote: remote.name, targetVersion },
      );
    }
  }

  if (localTag.status === "unknown") {
    addBlocker(
      blockers,
      "target_release_state_unknown",
      "Local target tag state is unknown.",
      { error: localTag.error },
    );
  } else if (localTag.exists) {
    addBlocker(
      blockers,
      "target_tag_exists_local",
      "Local target tag already exists.",
      { targetVersion },
    );
  }

  if (githubRelease.status === "unknown") {
    addBlocker(
      blockers,
      "target_release_state_unknown",
      "GitHub release state is unknown.",
      { error: githubRelease.error },
    );
  } else if (githubRelease.exists) {
    addBlocker(
      blockers,
      "github_release_exists",
      "GitHub release already exists for the target.",
      { targetVersion },
    );
  }

  const nextAction = resolveNextAction(blockers, Boolean(targetVersion));
  return {
    schema: RELEASE_GATE_SCHEMA,
    generated_at: now.toISOString(),
    branch: currentBranch,
    head: head.ok ? head.stdout.trim() : "",
    package_version: packageVersion,
    target_version: targetVersion,
    changed_files: changedFiles,
    host_bridge: {
      required: hostBridgeMatchedFiles.length > 0,
      completed: args.hostBridgeDone === true,
      matched_files: hostBridgeMatchedFiles,
    },
    content_package: {
      candidate: contentPackageMatchedFiles.length > 0,
      release_verified: args.contentPackageReleaseVerified === true,
      mirror_verified: args.contentPackageMirrorVerified === true,
      matched_files: contentPackageMatchedFiles,
    },
    local_gates: {
      test_node_full_passed: args.testNodeFullPassed === true,
      lint_check_passed: args.lintCheckPassed === true,
    },
    remotes,
    local_tag: localTag,
    github_release: githubRelease,
    blockers,
    next_action: nextAction,
    suggested_commands: suggestedCommands({ nextAction, targetVersion }),
  };
}

function readOptionValue(argv: string[], index: number, name: string) {
  const entry = argv[index] || "";
  const inlinePrefix = `${name}=`;
  if (entry.startsWith(inlinePrefix)) {
    return { value: entry.slice(inlinePrefix.length), consumed: 1 };
  }
  return { value: argv[index + 1] || "", consumed: 2 };
}

export function parseReleaseGateCliArgs(argv: string[]): ReleaseGateArgs {
  const args: ReleaseGateArgs = {};
  for (let index = 0; index < argv.length; ) {
    const entry = argv[index] || "";
    if (entry === "--target" || entry.startsWith("--target=")) {
      const option = readOptionValue(argv, index, "--target");
      args.targetVersion = option.value;
      index += option.consumed;
      continue;
    }
    if (entry === "--changed-file" || entry.startsWith("--changed-file=")) {
      const option = readOptionValue(argv, index, "--changed-file");
      args.changedFiles = [...(args.changedFiles || []), option.value];
      index += option.consumed;
      continue;
    }
    if (entry === "--host-bridge-done") {
      args.hostBridgeDone = true;
      index += 1;
      continue;
    }
    if (entry === "--test-node-full-passed") {
      args.testNodeFullPassed = true;
      index += 1;
      continue;
    }
    if (entry === "--lint-check-passed") {
      args.lintCheckPassed = true;
      index += 1;
      continue;
    }
    if (entry === "--content-package-release-verified") {
      args.contentPackageReleaseVerified = true;
      index += 1;
      continue;
    }
    if (entry === "--content-package-mirror-verified") {
      args.contentPackageMirrorVerified = true;
      index += 1;
      continue;
    }
    if (entry === "--repo" || entry.startsWith("--repo=")) {
      const option = readOptionValue(argv, index, "--repo");
      args.repo = option.value || DEFAULT_REPO;
      index += option.consumed;
      continue;
    }
    throw new Error(`Unknown option: ${entry}`);
  }
  return args;
}

async function main() {
  const report = await analyzeReleaseGate(
    parseReleaseGateCliArgs(process.argv.slice(2)),
  );
  console.log(JSON.stringify(report, null, 2));
  if (report.blockers.length > 0) {
    process.exitCode = 2;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
