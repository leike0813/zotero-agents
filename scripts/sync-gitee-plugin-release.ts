import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

import { config as loadEnv } from "dotenv";

type GitHubReleaseMetadata = {
  name?: string;
  body?: string;
  isPrerelease?: boolean;
};

type CliOptions = {
  target: string;
  workflowVersion: string;
  skipWorkflows: boolean;
};

const PLUGIN_REPO = "leike0813/zotero-agents";
const WORKFLOW_REPO = "leike0813/zotero-agents-workflows";
const WORK_DIR = path.join(".scaffold", "gitee-release-sync");

function usage() {
  return [
    "Usage: tsx scripts/sync-gitee-plugin-release.ts [--target vX.Y.Z] [options]",
    "",
    "Options:",
    "  --target <tag>              Plugin release tag. Defaults to package.json version.",
    "  --workflow-version <ver>    Official workflow package version. Defaults to content-package.version.json.",
    "  --skip-workflows            Only sync the plugin release.",
    "",
    "Reads GITEE_TOKEN from the repository .env file or process environment.",
  ].join("\n");
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function parseArgs(argv: string[]): CliOptions {
  const packageJson = readJsonFile<{ version?: string }>("package.json");
  const version = String(packageJson.version || "").trim();
  const defaults: CliOptions = {
    target: version ? `v${version}` : "",
    workflowVersion: "",
    skipWorkflows: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index] || "";
    const readValue = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${entry} requires a value`);
      }
      index += 1;
      return value;
    };

    if (entry === "--help" || entry === "-h") {
      console.log(usage());
      process.exit(0);
    } else if (entry === "--target") {
      defaults.target = readValue();
    } else if (entry.startsWith("--target=")) {
      defaults.target = entry.slice("--target=".length);
    } else if (entry === "--workflow-version") {
      defaults.workflowVersion = readValue();
    } else if (entry.startsWith("--workflow-version=")) {
      defaults.workflowVersion = entry.slice("--workflow-version=".length);
    } else if (entry === "--skip-workflows") {
      defaults.skipWorkflows = true;
    } else {
      throw new Error(`Unknown option: ${entry}`);
    }
  }

  defaults.target = defaults.target.trim();
  if (!/^v\d+\.\d+\.\d+(?:[-+].+)?$/.test(defaults.target)) {
    throw new Error("--target must be a v-prefixed semver tag");
  }
  return defaults;
}

function run(
  command: string,
  args: string[],
  options?: { env?: NodeJS.ProcessEnv },
) {
  const result = spawnSync(command, args, {
    env: options?.env || process.env,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} exited ${result.status}`);
  }
}

function capture(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `${command} exited ${result.status}: ${result.stderr || result.stdout}`,
    );
  }
  return String(result.stdout || "");
}

function requireCommand(command: string) {
  const result = spawnSync(command, ["--version"], {
    stdio: "ignore",
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`Missing required command: ${command}`);
  }
}

function readGiteeToken() {
  loadEnv({ path: path.resolve(".env"), override: true });
  const token = String(process.env.GITEE_TOKEN || "").trim();
  if (!token) {
    throw new Error("GITEE_TOKEN is required in .env or process environment");
  }
  return token;
}

function giteeUrl(repo: string, token: string) {
  return `https://oauth2:${encodeURIComponent(token)}@gitee.com/${repo}.git`;
}

async function cleanDir(dir: string) {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
}

function releaseMetadata(repo: string, tag: string): GitHubReleaseMetadata {
  const raw = capture("gh", [
    "release",
    "view",
    tag,
    "--repo",
    repo,
    "--json",
    "name,body,isPrerelease",
  ]);
  return JSON.parse(raw) as GitHubReleaseMetadata;
}

function tagCommit(tag: string) {
  return capture("git", ["rev-list", "-n", "1", tag]).trim();
}

async function filesIn(dir: string, predicate: (fileName: string) => boolean) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await filesIn(fullPath, predicate)));
    } else if (entry.isFile() && predicate(entry.name)) {
      files.push(fullPath);
    }
  }
  return files.sort();
}

async function downloadReleaseAssets(args: {
  repo: string;
  tag: string;
  patterns: string[];
  dir: string;
}) {
  await cleanDir(args.dir);
  const ghArgs = [
    "release",
    "download",
    args.tag,
    "--repo",
    args.repo,
    "--dir",
    args.dir,
  ];
  for (const pattern of args.patterns) {
    ghArgs.push("--pattern", pattern);
  }
  run("gh", ghArgs);
}

function runGiteeReleaseSync(args: {
  repo: string;
  tag: string;
  metadata: GitHubReleaseMetadata;
  target: string;
  files: string[];
  token: string;
}) {
  run(
    process.execPath,
    [
      "--import",
      "tsx",
      "scripts/sync-gitee-release.ts",
      "--repo",
      args.repo,
      "--tag",
      args.tag,
      "--name",
      args.metadata.name || args.tag,
      "--body",
      args.metadata.body || "",
      "--prerelease",
      String(args.metadata.isPrerelease === true),
      "--target",
      args.target,
      ...args.files,
    ],
    { env: { ...process.env, GITEE_TOKEN: args.token } },
  );
}

function pushPluginRefsToGitee(args: { target: string; token: string }) {
  run("git", [
    "fetch",
    "--force",
    "origin",
    `refs/tags/${args.target}:refs/tags/${args.target}`,
  ]);
  run("git", [
    "push",
    giteeUrl(PLUGIN_REPO, args.token),
    "HEAD:refs/heads/main",
    `refs/tags/${args.target}:refs/tags/${args.target}`,
  ]);
}

async function syncPluginRelease(args: { target: string; token: string }) {
  const pluginDir = path.join(WORK_DIR, "plugin", args.target);
  const metadataDir = path.join(WORK_DIR, "plugin", "release-metadata");

  pushPluginRefsToGitee(args);
  const targetCommit = tagCommit(args.target);

  await downloadReleaseAssets({
    repo: PLUGIN_REPO,
    tag: args.target,
    patterns: ["*.xpi"],
    dir: pluginDir,
  });
  const xpiFiles = await filesIn(pluginDir, (name) => name.endsWith(".xpi"));
  if (!xpiFiles.length) {
    throw new Error(`No XPI assets found in ${PLUGIN_REPO}@${args.target}`);
  }
  runGiteeReleaseSync({
    repo: PLUGIN_REPO,
    tag: args.target,
    metadata: releaseMetadata(PLUGIN_REPO, args.target),
    target: targetCommit,
    files: xpiFiles,
    token: args.token,
  });

  await downloadReleaseAssets({
    repo: PLUGIN_REPO,
    tag: "release",
    patterns: ["update.json", "update-beta.json"],
    dir: metadataDir,
  });
  const metadataFiles = await filesIn(metadataDir, (name) =>
    /^update(?:-beta)?\.json$/.test(name),
  );
  if (!metadataFiles.length) {
    throw new Error(
      `No update metadata assets found in ${PLUGIN_REPO}@release`,
    );
  }
  runGiteeReleaseSync({
    repo: PLUGIN_REPO,
    tag: "release",
    metadata: releaseMetadata(PLUGIN_REPO, "release"),
    target: targetCommit,
    files: metadataFiles,
    token: args.token,
  });
}

function readWorkflowVersion(explicit: string) {
  if (explicit.trim()) {
    return explicit.trim().replace(/^v/i, "");
  }
  if (!existsSync("content-package.version.json")) {
    throw new Error("content-package.version.json is missing");
  }
  const versionFile = readJsonFile<{ version?: string }>(
    "content-package.version.json",
  );
  const version = String(versionFile.version || "").trim();
  if (!version) {
    throw new Error("content-package.version.json does not contain version");
  }
  return version;
}

function pushWorkflowFeedBranchToGitee(args: { token: string }) {
  const dir = path.join(WORK_DIR, "workflow-content-feed");
  return cleanDir(dir).then(() => {
    run("git", ["-C", dir, "init"]);
    run("git", [
      "-C",
      dir,
      "remote",
      "add",
      "github",
      `https://github.com/${WORKFLOW_REPO}.git`,
    ]);
    run("git", ["-C", dir, "fetch", "github", "content-feed"]);
    run("git", ["-C", dir, "checkout", "-B", "content-feed", "FETCH_HEAD"]);
    run("git", [
      "-C",
      dir,
      "push",
      giteeUrl(WORKFLOW_REPO, args.token),
      "+HEAD:refs/heads/content-feed",
    ]);
  });
}

async function syncWorkflowPackage(args: {
  workflowVersion: string;
  token: string;
}) {
  const tag = `official-workflows-v${args.workflowVersion}`;
  const dir = path.join(WORK_DIR, "workflow-package", tag);
  await downloadReleaseAssets({
    repo: WORKFLOW_REPO,
    tag,
    patterns: ["*.zip", "*.zip.sha256"],
    dir,
  });
  const files = await filesIn(
    dir,
    (name) => name.endsWith(".zip") || name.endsWith(".zip.sha256"),
  );
  if (!files.length) {
    throw new Error(
      `No workflow package assets found in ${WORKFLOW_REPO}@${tag}`,
    );
  }
  runGiteeReleaseSync({
    repo: WORKFLOW_REPO,
    tag,
    metadata: releaseMetadata(WORKFLOW_REPO, tag),
    target: "content-feed",
    files,
    token: args.token,
  });
  await pushWorkflowFeedBranchToGitee({ token: args.token });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  requireCommand("git");
  requireCommand("gh");
  const token = readGiteeToken();

  await syncPluginRelease({ target: options.target, token });
  console.log(
    `[gitee-sync] plugin release synced: ${PLUGIN_REPO}@${options.target}`,
  );

  if (options.skipWorkflows) {
    return;
  }

  try {
    const workflowVersion = readWorkflowVersion(options.workflowVersion);
    await syncWorkflowPackage({ workflowVersion, token });
    console.log(
      `[gitee-sync] workflow package synced: ${WORKFLOW_REPO}@official-workflows-v${workflowVersion}`,
    );
  } catch (error) {
    console.warn(
      `[gitee-sync] workflow package sync skipped: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
