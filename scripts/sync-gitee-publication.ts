import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { config as loadEnv } from "dotenv";

import {
  CONTENT_PACKAGE_CHANNELS,
  type ContentPackageChannel,
} from "./content-package/content-package-channels";

type GitHubReleaseMetadata = {
  name?: string;
  body?: string;
  isPrerelease?: boolean;
};

type CliOptions = {
  pluginVersion: string;
  contentVersion: string;
  contentOnly: boolean;
};

type ContentFeedArtifact = {
  url?: string;
  mirrors?: string[];
  sha256?: string;
  size?: number;
};

type ContentFeedDocument = {
  channel?: string;
  packages?: Array<{ version?: string; artifact?: ContentFeedArtifact }>;
};

const PLUGIN_REPO = "leike0813/zotero-agents";
const WORKFLOW_REPO = "leike0813/zotero-agents-workflows";
const WORK_DIR = path.join(".scaffold", "gitee-release-sync");
const GITHUB_FEED_BASE = `https://api.github.com/repos/${WORKFLOW_REPO}/contents`;
const GITEE_FEED_BASE = `https://gitee.com/${WORKFLOW_REPO}/raw/content-feed`;
const FEED_FETCH_TIMEOUT_MS = 30_000;
const ASSET_FETCH_TIMEOUT_MS = 180_000;

function usage() {
  return [
    "Usage: npm run sync:gitee-release -- [options]",
    "",
    "Options:",
    "  --plugin-version <tag>      Plugin release tag. Defaults to package.json version.",
    "  --content-version <ver>     Content package version. Defaults to content-package.version.json.",
    "  --content-only              Synchronize only the content package release and feed.",
    "",
    "Reads GITEE_TOKEN from the repository .env file or process environment.",
  ].join("\n");
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

export function parseGiteePublicationArgs(
  argv: string[],
  providedDefaults?: { pluginVersion: string; contentVersion: string },
): CliOptions {
  const packageJson = providedDefaults
    ? { version: providedDefaults.pluginVersion }
    : readJsonFile<{ version?: string }>("package.json");
  const contentDescriptor = providedDefaults
    ? { version: providedDefaults.contentVersion }
    : readJsonFile<{ version?: string }>("content-package.version.json");
  const version = String(packageJson.version || "")
    .trim()
    .replace(/^v/i, "");
  const defaults: CliOptions = {
    pluginVersion: version ? `v${version}` : "",
    contentVersion: String(contentDescriptor.version || "")
      .trim()
      .replace(/^v/i, ""),
    contentOnly: false,
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
    } else if (entry === "--plugin-version") {
      defaults.pluginVersion = readValue();
    } else if (entry.startsWith("--plugin-version=")) {
      defaults.pluginVersion = entry.slice("--plugin-version=".length);
    } else if (entry === "--content-version") {
      defaults.contentVersion = readValue();
    } else if (entry.startsWith("--content-version=")) {
      defaults.contentVersion = entry.slice("--content-version=".length);
    } else if (entry === "--content-only") {
      defaults.contentOnly = true;
    } else {
      throw new Error(`Unknown option: ${entry}`);
    }
  }

  defaults.pluginVersion = defaults.pluginVersion.trim();
  defaults.contentVersion = defaults.contentVersion.trim().replace(/^v/i, "");
  // The plugin tag is irrelevant for a content-only run and may be unavailable.
  if (!defaults.contentOnly) {
    if (!defaults.pluginVersion.startsWith("v")) {
      defaults.pluginVersion = `v${defaults.pluginVersion}`;
    }
    if (!/^v\d+\.\d+\.\d+(?:[-+].+)?$/.test(defaults.pluginVersion)) {
      throw new Error("--plugin-version must be a v-prefixed semver tag");
    }
  }
  if (!/^\d+\.\d+\.\d+(?:[-+].+)?$/.test(defaults.contentVersion)) {
    throw new Error("--content-version must be semver");
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

export function giteeRemoteUrl(repo: string) {
  return `https://gitee.com/${repo}.git`;
}

// The token never reaches argv or a remote URL, so git output stays safe to print.
export function giteeGitEnv(token: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    GIT_TERMINAL_PROMPT: "0",
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "credential.helper",
    GIT_CONFIG_VALUE_0:
      "!f() { [ $1 = get ] && echo username=oauth2 && echo password=$GITEE_TOKEN; }; f",
    GITEE_TOKEN: token,
  };
}

function assertRemoteRef(args: {
  repo: string;
  ref: string;
  expectedCommit: string;
}) {
  const actual = capture("git", [
    "ls-remote",
    `https://gitee.com/${args.repo}.git`,
    args.ref,
  ])
    .trim()
    .split(/\s+/)[0];
  if (!actual || actual !== args.expectedCommit) {
    throw new Error(
      `Gitee ${args.repo} ${args.ref} does not match GitHub source`,
    );
  }
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
  replaceExisting: boolean;
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
      "--replace-existing",
      String(args.replaceExisting),
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
    "refs/heads/main:refs/remotes/origin/main",
    `refs/tags/${args.target}:refs/tags/${args.target}`,
  ]);
  run(
    "git",
    [
      "push",
      giteeRemoteUrl(PLUGIN_REPO),
      "+refs/remotes/origin/main:refs/heads/main",
      `refs/tags/${args.target}:refs/tags/${args.target}`,
    ],
    { env: giteeGitEnv(args.token) },
  );
}

async function syncPluginRelease(args: { target: string; token: string }) {
  const pluginDir = path.join(WORK_DIR, "plugin", args.target);
  const metadataDir = path.join(WORK_DIR, "plugin", "release-metadata");

  pushPluginRefsToGitee(args);
  const targetCommit = tagCommit(args.target);
  assertRemoteRef({
    repo: PLUGIN_REPO,
    ref: "refs/heads/main",
    expectedCommit: capture("git", ["rev-parse", "origin/main"]).trim(),
  });
  assertRemoteRef({
    repo: PLUGIN_REPO,
    ref: `refs/tags/${args.target}`,
    expectedCommit: capture("git", [
      "rev-parse",
      `refs/tags/${args.target}`,
    ]).trim(),
  });

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
    replaceExisting: true,
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
    replaceExisting: true,
    files: metadataFiles,
    token: args.token,
  });
}

function contentAssetBase(version: string, channel: ContentPackageChannel) {
  return `zotero-agents-official-workflows-${version}-${channel}.zip`;
}

// Only channels actually published count; a channel needs both its ZIP and checksum.
export function resolvePublishedContentAssets(
  assetNames: readonly string[],
  version: string,
): { channels: ContentPackageChannel[]; files: string[] } {
  const published = new Set(
    assetNames.map((name) => String(name || "").trim()),
  );
  const channels: ContentPackageChannel[] = [];
  const files: string[] = [];
  for (const channel of CONTENT_PACKAGE_CHANNELS) {
    const zip = contentAssetBase(version, channel);
    const checksum = `${zip}.sha256`;
    const hasZip = published.delete(zip);
    const hasChecksum = published.delete(checksum);
    if (!hasZip && !hasChecksum) {
      continue;
    }
    if (!hasZip || !hasChecksum) {
      throw new Error(
        `${WORKFLOW_REPO}@official-workflows-v${version} publishes an incomplete ${channel} pair: missing ${hasZip ? checksum : zip}`,
      );
    }
    channels.push(channel);
    files.push(zip, checksum);
  }
  const unexpected = Array.from(published);
  if (unexpected.length > 0) {
    throw new Error(
      `${WORKFLOW_REPO}@official-workflows-v${version} publishes unexpected content release assets: ${unexpected.join(", ")}`,
    );
  }
  if (channels.length === 0) {
    throw new Error(
      `No published content release assets in ${WORKFLOW_REPO}@official-workflows-v${version}`,
    );
  }
  return { channels, files };
}

function releaseAssetNames(repo: string, tag: string) {
  const raw = capture("gh", [
    "release",
    "view",
    tag,
    "--repo",
    repo,
    "--json",
    "assets",
  ]);
  const assets = (JSON.parse(raw) as { assets?: Array<{ name?: string }> })
    .assets;
  return (assets || []).map((asset) => String(asset.name || "").trim());
}

function normalizeDigest(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^sha256:/, "");
}

// The ref is the captured commit, never the moving branch name.
export function canonicalFeedUrl(channel: ContentPackageChannel, ref: string) {
  return `${GITHUB_FEED_BASE}/${channel}/feed.json?ref=${ref}`;
}

export function publicChecksumDigest(checksumText: string) {
  return normalizeDigest(
    String(checksumText || "")
      .trim()
      .split(/\s+/)[0],
  );
}

export function resolveMirrorUrls(artifact?: ContentFeedArtifact) {
  const mirrors = (artifact?.mirrors || [])
    .map((url) => String(url || "").trim())
    .filter(Boolean);
  if (mirrors.length === 0) {
    throw new Error("content feed artifact declares no mirror URLs");
  }
  const isGitee = (url: string) => {
    try {
      return new URL(url).hostname === "gitee.com";
    } catch {
      return false;
    }
  };
  if (!mirrors.some(isGitee)) {
    throw new Error(
      `content feed artifact declares no Gitee mirror URL: ${mirrors.join(", ")}`,
    );
  }
  return mirrors;
}

async function fetchOk(
  url: string,
  timeoutMs = FEED_FETCH_TIMEOUT_MS,
  init?: RequestInit,
) {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const reason =
      (error as Error)?.name === "TimeoutError"
        ? `timeout after ${timeoutMs} ms`
        : (error as Error)?.message || String(error);
    throw new Error(`GET ${url} failed: ${reason}`);
  }
  if (!response.ok) {
    throw new Error(`GET ${url} failed: HTTP ${response.status}`);
  }
  return response;
}

async function fetchCanonicalFeed(channel: ContentPackageChannel, ref: string) {
  const response = await fetchOk(canonicalFeedUrl(channel, ref), undefined, {
    headers: { Accept: "application/vnd.github+json" },
  });
  const payload = (await response.json()) as {
    encoding?: string;
    content?: string;
  };
  if (payload.encoding !== "base64" || !payload.content) {
    throw new Error(`GitHub ${channel} content feed is not base64 encoded`);
  }
  return JSON.parse(
    Buffer.from(payload.content, "base64").toString("utf8"),
  ) as ContentFeedDocument;
}

// Source bytes must match their own checksum asset and the canonical feed entry
// before anything is uploaded to the mirror.
async function verifyPublishedContentAssets(args: {
  dir: string;
  channels: readonly ContentPackageChannel[];
  version: string;
  feedCommit: string;
}) {
  for (const channel of args.channels) {
    const zipName = contentAssetBase(args.version, channel);
    const bytes = await fs.readFile(path.join(args.dir, zipName));
    const checksum = publicChecksumDigest(
      await fs.readFile(path.join(args.dir, `${zipName}.sha256`), "utf8"),
    );
    if (!/^[0-9a-f]{64}$/.test(checksum)) {
      throw new Error(`${zipName}.sha256 does not contain a sha256 digest`);
    }
    if (createHash("sha256").update(bytes).digest("hex") !== checksum) {
      throw new Error(`${zipName} does not match its checksum asset`);
    }
    const entry = (await fetchCanonicalFeed(channel, args.feedCommit))
      .packages?.[0];
    if (entry?.version !== args.version) {
      throw new Error(
        `GitHub ${channel} content feed serves ${entry?.version || "<none>"} instead of ${args.version}`,
      );
    }
    if (
      normalizeDigest(entry.artifact?.sha256) !== checksum ||
      Number(entry.artifact?.size || 0) !== bytes.byteLength
    ) {
      throw new Error(
        `${zipName} does not match the GitHub ${channel} content feed digest and size`,
      );
    }
  }
}

async function fetchMirrorText(url: string) {
  return (await fetchOk(url)).text();
}

// Public, anonymous reads: a mirror that only downloads with a token is not public.
async function verifyPublicContentAssets(args: {
  channels: readonly ContentPackageChannel[];
  version: string;
  feedCommit: string;
}) {
  for (const channel of args.channels) {
    const entry = (await fetchCanonicalFeed(channel, args.feedCommit))
      .packages?.[0];
    if (entry?.version !== args.version) {
      throw new Error(
        `GitHub ${channel} content feed serves ${entry?.version || "<none>"} instead of ${args.version}`,
      );
    }
    const artifact = entry.artifact;
    const digest = normalizeDigest(artifact?.sha256);
    const size = Number(artifact?.size || 0);
    if (!/^[0-9a-f]{64}$/.test(digest) || size <= 0) {
      throw new Error(
        `GitHub ${channel} content feed has no usable digest and size`,
      );
    }
    for (const url of resolveMirrorUrls(artifact)) {
      const bytes = new Uint8Array(
        await (await fetchOk(url, ASSET_FETCH_TIMEOUT_MS)).arrayBuffer(),
      );
      if (createHash("sha256").update(bytes).digest("hex") !== digest) {
        throw new Error(`${url} sha256 does not match the source feed`);
      }
      if (bytes.byteLength !== size) {
        throw new Error(`${url} size does not match the source feed`);
      }
      const checksum = publicChecksumDigest(
        await fetchMirrorText(`${url}.sha256`),
      );
      if (checksum !== digest) {
        throw new Error(
          `${url}.sha256 digest ${checksum} does not equal ${digest}`,
        );
      }
    }
  }
}

async function verifyPublicContentFeed(args: {
  channels: readonly ContentPackageChannel[];
  feedCommit: string;
  tag: string;
  tagCommit: string;
}) {
  for (const channel of args.channels) {
    const githubFeed = await fetchCanonicalFeed(channel, args.feedCommit);
    const giteeFeedText = await fetchMirrorText(
      `${GITEE_FEED_BASE}/${channel}/feed.json`,
    );
    const giteeFeed = JSON.parse(giteeFeedText) as ContentFeedDocument;
    if (JSON.stringify(githubFeed) !== JSON.stringify(giteeFeed)) {
      throw new Error(
        `Gitee ${channel} content feed does not match the GitHub source feed`,
      );
    }
  }
  assertRemoteRef({
    repo: WORKFLOW_REPO,
    ref: "refs/heads/content-feed",
    expectedCommit: args.feedCommit,
  });
  assertRemoteRef({
    repo: WORKFLOW_REPO,
    ref: `refs/tags/${args.tag}`,
    expectedCommit: args.tagCommit,
  });
}

function captureGithubContentRefs(tag: string) {
  const raw = capture("git", [
    "ls-remote",
    `https://github.com/${WORKFLOW_REPO}.git`,
    `refs/tags/${tag}`,
    "refs/heads/content-feed",
  ]);
  const refs = new Map<string, string>();
  for (const line of raw.split(/\r?\n/)) {
    const [commit, ref] = line.trim().split(/\s+/);
    if (commit && ref) {
      refs.set(ref, commit);
    }
  }
  const tagCommit = refs.get(`refs/tags/${tag}`);
  const feedCommit = refs.get("refs/heads/content-feed");
  if (!tagCommit || !feedCommit) {
    throw new Error(
      `GitHub ${WORKFLOW_REPO} does not publish both ${tag} and content-feed`,
    );
  }
  return { tagCommit, feedCommit };
}

// Isolated throwaway repository: no workspace ref is read or written.
async function withContentMirrorRepo<T>(
  action: (repoDir: string) => T | Promise<T>,
): Promise<T> {
  const dir = await fs.mkdtemp(
    path.join(os.tmpdir(), "zs-gitee-content-sync-"),
  );
  try {
    run("git", ["-C", dir, "init", "--quiet"]);
    run("git", [
      "-C",
      dir,
      "remote",
      "add",
      "github",
      `https://github.com/${WORKFLOW_REPO}.git`,
    ]);
    return await action(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

function pushContentRefToGitee(args: {
  dir: string;
  token: string;
  localRef: string;
  remoteRef: string;
  expectedCommit: string;
}) {
  const fetched = capture("git", [
    "-C",
    args.dir,
    "rev-parse",
    args.localRef,
  ]).trim();
  if (fetched !== args.expectedCommit) {
    throw new Error(
      `GitHub ${WORKFLOW_REPO} ${args.localRef} moved during synchronization`,
    );
  }
  // No force: an existing Gitee ref must accept an ordinary fast-forward.
  run(
    "git",
    [
      "-C",
      args.dir,
      "push",
      giteeRemoteUrl(WORKFLOW_REPO),
      `${args.localRef}:${args.remoteRef}`,
    ],
    { env: giteeGitEnv(args.token) },
  );
}

async function syncWorkflowPackage(args: {
  workflowVersion: string;
  token: string;
}) {
  const tag = `official-workflows-v${args.workflowVersion}`;
  const dir = path.join(WORK_DIR, "workflow-package", tag);
  const refs = captureGithubContentRefs(tag);
  const { channels, files: assetNames } = resolvePublishedContentAssets(
    releaseAssetNames(WORKFLOW_REPO, tag),
    args.workflowVersion,
  );

  await downloadReleaseAssets({
    repo: WORKFLOW_REPO,
    tag,
    patterns: assetNames,
    dir,
  });
  const files = await filesIn(dir, (name) => assetNames.includes(name));
  if (files.length !== assetNames.length) {
    throw new Error(
      `Downloaded ${files.length} of ${assetNames.length} content assets from ${WORKFLOW_REPO}@${tag}`,
    );
  }
  await verifyPublishedContentAssets({
    dir,
    channels,
    version: args.workflowVersion,
    feedCommit: refs.feedCommit,
  });

  await withContentMirrorRepo(async (repoDir) => {
    run("git", [
      "-C",
      repoDir,
      "fetch",
      "github",
      `+refs/tags/${tag}:refs/tags/${tag}`,
    ]);
    // The Gitee release tag must exist at the captured source commit before assets.
    pushContentRefToGitee({
      dir: repoDir,
      token: args.token,
      localRef: `refs/tags/${tag}`,
      remoteRef: `refs/tags/${tag}`,
      expectedCommit: refs.tagCommit,
    });
  });

  runGiteeReleaseSync({
    repo: WORKFLOW_REPO,
    tag,
    metadata: releaseMetadata(WORKFLOW_REPO, tag),
    target: "content-feed",
    replaceExisting: false,
    files,
    token: args.token,
  });

  await verifyPublicContentAssets({
    channels,
    version: args.workflowVersion,
    feedCommit: refs.feedCommit,
  });

  await withContentMirrorRepo(async (repoDir) => {
    run("git", [
      "-C",
      repoDir,
      "fetch",
      "github",
      "+refs/heads/content-feed:refs/heads/content-feed",
    ]);
    pushContentRefToGitee({
      dir: repoDir,
      token: args.token,
      localRef: "refs/heads/content-feed",
      remoteRef: "refs/heads/content-feed",
      expectedCommit: refs.feedCommit,
    });
  });

  await verifyPublicContentFeed({
    channels,
    feedCommit: refs.feedCommit,
    tag,
    tagCommit: refs.tagCommit,
  });
}

export function giteePublicationSteps(options: CliOptions) {
  return options.contentOnly
    ? (["content"] as const)
    : (["plugin", "content"] as const);
}

export async function syncGiteePublication(options: CliOptions) {
  requireCommand("git");
  requireCommand("gh");
  requireCommand("curl");
  const token = readGiteeToken();

  for (const step of giteePublicationSteps(options)) {
    if (step === "plugin") {
      await syncPluginRelease({ target: options.pluginVersion, token });
      console.log(
        `[gitee-sync] plugin release synced: ${PLUGIN_REPO}@${options.pluginVersion}`,
      );
      continue;
    }
    await syncWorkflowPackage({
      workflowVersion: options.contentVersion,
      token,
    });
    console.log(
      `[gitee-sync] workflow package synced: ${WORKFLOW_REPO}@official-workflows-v${options.contentVersion}`,
    );
  }
}

async function main() {
  await syncGiteePublication(parseGiteePublicationArgs(process.argv.slice(2)));
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  void main().catch((error) => {
    console.error(
      error instanceof Error ? error.stack || error.message : error,
    );
    process.exitCode = 1;
  });
}
