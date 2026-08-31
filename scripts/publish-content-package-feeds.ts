import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import {
  canonicalizeContentPackageChannels,
  parseContentPackageChannels,
  type ContentPackageChannel,
} from "./content-package-channels";

const execFileAsync = promisify(execFile);
const CONTENT_FEED_BRANCH = "content-feed";

type CommandRunner = (
  command: string,
  args: string[],
) => Promise<{ stdout: string; stderr: string }>;

export type PublishContentPackageFeedsArgs = {
  channels: readonly string[];
  sourceRoot: string;
  remoteUrl: string;
  repo: string;
  branch?: string;
  revision?: string;
  tempRoot?: string;
  runCommand?: CommandRunner;
};

function usage() {
  return [
    "Usage:",
    "  node --import tsx scripts/publish-content-package-feeds.ts --repo <owner/repo> --source <content-packages-dir> --channels <stable,beta,dev> [--revision <sha>]",
  ].join("\n");
}

function readOptionValue(argv: string[], name: string) {
  const index = argv.findIndex((entry) => entry === name);
  if (index >= 0) {
    return argv[index + 1] || "";
  }
  const prefix = `${name}=`;
  const inline = argv.find((entry) => entry.startsWith(prefix));
  return inline ? inline.slice(prefix.length) : "";
}

async function runCommand(command: string, args: string[]) {
  const result = await execFileAsync(command, args, { windowsHide: true });
  return { stdout: result.stdout || "", stderr: result.stderr || "" };
}

async function pathExists(filePath: string) {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function readme(repo: string) {
  return [
    "# Zotero Agents Official Workflow Feed",
    "",
    "Feed URLs:",
    "",
    `- stable: https://raw.githubusercontent.com/${repo}/${CONTENT_FEED_BRANCH}/stable/feed.json`,
    `- beta: https://raw.githubusercontent.com/${repo}/${CONTENT_FEED_BRANCH}/beta/feed.json`,
    `- dev: https://raw.githubusercontent.com/${repo}/${CONTENT_FEED_BRANCH}/dev/feed.json`,
    "",
  ].join("\n");
}

export async function publishContentPackageFeeds(
  args: PublishContentPackageFeedsArgs,
) {
  const channels = canonicalizeContentPackageChannels(args.channels);
  const branch = args.branch || CONTENT_FEED_BRANCH;
  const commandRunner = args.runCommand || runCommand;
  const worktree = await fs.mkdtemp(
    path.join(args.tempRoot || os.tmpdir(), "zs-content-feed-publish-"),
  );

  try {
    await commandRunner("git", ["init", worktree]);
    await commandRunner("git", [
      "-C",
      worktree,
      "remote",
      "add",
      "origin",
      args.remoteUrl,
    ]);
    const remoteBranch = await commandRunner("git", [
      "-C",
      worktree,
      "ls-remote",
      "--heads",
      "origin",
      branch,
    ]);
    if (remoteBranch.stdout.trim()) {
      await commandRunner("git", ["-C", worktree, "fetch", "origin", branch]);
      await commandRunner("git", [
        "-C",
        worktree,
        "checkout",
        "-B",
        branch,
        "FETCH_HEAD",
      ]);
    } else {
      await commandRunner("git", [
        "-C",
        worktree,
        "checkout",
        "--orphan",
        branch,
      ]);
    }

    for (const channel of channels) {
      const source = path.join(args.sourceRoot, channel, "feed.json");
      const target = path.join(worktree, channel, "feed.json");
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.copyFile(source, target);
    }
    const readmePath = path.join(worktree, "README.md");
    if (!(await pathExists(readmePath))) {
      await fs.writeFile(readmePath, readme(args.repo), "utf8");
    }

    await commandRunner("git", ["-C", worktree, "add", "-A"]);
    try {
      await commandRunner("git", [
        "-C",
        worktree,
        "diff",
        "--cached",
        "--quiet",
      ]);
      return { published: false, channels };
    } catch {
      // A non-zero exit means there is a staged feed update to publish.
    }
    await commandRunner("git", [
      "-C",
      worktree,
      "config",
      "user.name",
      "github-actions[bot]",
    ]);
    await commandRunner("git", [
      "-C",
      worktree,
      "config",
      "user.email",
      "41898282+github-actions[bot]@users.noreply.github.com",
    ]);
    await commandRunner("git", [
      "-C",
      worktree,
      "commit",
      "-m",
      `publish content feed ${args.revision || "unknown"}`,
    ]);
    await commandRunner("git", ["-C", worktree, "push", "origin", branch]);
    return { published: true, channels };
  } finally {
    await fs.rm(worktree, { recursive: true, force: true });
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const repo = readOptionValue(argv, "--repo");
  const sourceRoot = readOptionValue(argv, "--source");
  const channels = readOptionValue(argv, "--channels");
  const revision = readOptionValue(argv, "--revision");
  const token = String(process.env.RELEASE_PAT || "").trim();
  if (!repo || !sourceRoot || !channels || !token) {
    throw new Error(`${usage()}\nRELEASE_PAT is required.`);
  }
  const result = await publishContentPackageFeeds({
    channels: parseContentPackageChannels(channels),
    sourceRoot,
    repo,
    remoteUrl: `https://x-access-token:${encodeURIComponent(token)}@github.com/${repo}.git`,
    revision,
  });
  console.log(
    `[content-package] ${result.published ? "published" : "unchanged"} feeds=${result.channels.join(",")}`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  void main().catch((error) => {
    console.error(
      error instanceof Error ? error.stack || error.message : error,
    );
    process.exit(1);
  });
}
