import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

type Channel = "stable" | "beta" | "dev";

type ContentFeedArtifact = {
  path: string;
  url?: string;
  mirrors?: string[];
  sha256: string;
  size: number;
};

type ContentFeedPackage = {
  id: string;
  version: string;
  channel: Channel;
  debug_content: boolean;
  content_api?: string;
  requires?: Record<string, unknown>;
  artifact: ContentFeedArtifact;
};

type ContentFeedDocument = {
  schema: string;
  feed_id: string;
  channel: Channel;
  debug_content: boolean;
  revision: string;
  updated_at: string;
  packages: ContentFeedPackage[];
};

type FetchLike = (
  url: string,
  init?: RequestInit,
) => Promise<Pick<Response, "ok" | "status" | "arrayBuffer" | "json" | "text">>;

const DEFAULT_CHANNELS: Channel[] = ["stable", "beta", "dev"];
const CONTENT_VERSION_FILE = "content-package.version.json";
const CONTENT_REPO = "leike0813/zotero-agents-workflows";
const CONTENT_BRANCH = "content-feed";
const GITHUB_FEED_BASE = `https://raw.githubusercontent.com/${CONTENT_REPO}/${CONTENT_BRANCH}`;
const GITEE_FEED_BASE = `https://gitee.com/${CONTENT_REPO}/raw/${CONTENT_BRANCH}`;

function normalizeSha256(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function sha256(bytes: Uint8Array) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function packageSignature(feed: ContentFeedDocument) {
  const entry = feed.packages[0];
  return JSON.stringify({
    channel: feed.channel,
    revision: feed.revision,
    id: entry?.id || "",
    version: entry?.version || "",
    debug_content: entry?.debug_content === true,
    content_api: entry?.content_api || "",
    requires: entry?.requires || {},
    sha256: normalizeSha256(entry?.artifact?.sha256 || ""),
    size: Number(entry?.artifact?.size || 0),
  });
}

function contentPackageAssetUrls(entry: ContentFeedPackage) {
  return [entry.artifact.url, ...(entry.artifact.mirrors || [])]
    .map((url) => String(url || "").trim())
    .filter(Boolean);
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

async function fetchJson<T>(fetchImpl: FetchLike, url: string): Promise<T> {
  const response = await fetchImpl(url, { cache: "no-store" } as RequestInit);
  if (!response.ok) {
    throw new Error(`GET ${url} failed: HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

async function fetchBytes(fetchImpl: FetchLike, url: string) {
  const response = await fetchImpl(url, { cache: "no-store" } as RequestInit);
  if (!response.ok) {
    throw new Error(`GET ${url} failed: HTTP ${response.status}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

async function fetchText(fetchImpl: FetchLike, url: string) {
  const response = await fetchImpl(url, { cache: "no-store" } as RequestInit);
  if (!response.ok) {
    throw new Error(`GET ${url} failed: HTTP ${response.status}`);
  }
  return response.text();
}

async function runBuildContentFeeds(args: {
  outRoot: string;
  channels: Channel[];
  generatedAt: string;
}) {
  const command = process.platform === "win32" ? "cmd.exe" : "npm";
  const npmArgs =
    process.platform === "win32"
      ? [
          "/d",
          "/s",
          "/c",
          "npm",
          "run",
          "build:content-feed",
          "--",
          "--channels",
          args.channels.join(","),
          "--out",
          args.outRoot,
        ]
      : [
          "run",
          "build:content-feed",
          "--",
          "--channels",
          args.channels.join(","),
          "--out",
          args.outRoot,
        ];
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, npmArgs, {
      stdio: "inherit",
      windowsHide: true,
      env: {
        ...process.env,
        CONTENT_PACKAGE_GENERATED_AT: args.generatedAt,
      },
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`build:content-feed failed with exit code ${code}`));
    });
  });
}

function assertSameSignature(args: {
  label: string;
  localFeed: ContentFeedDocument;
  remoteFeed: ContentFeedDocument;
}) {
  const localSignature = packageSignature(args.localFeed);
  const remoteSignature = packageSignature(args.remoteFeed);
  if (localSignature !== remoteSignature) {
    throw new Error(
      `${args.label} content feed does not match local generated package semantics`,
    );
  }
}

async function verifyReleaseAssets(args: {
  fetchImpl: FetchLike;
  feed: ContentFeedDocument;
}) {
  const entry = args.feed.packages[0];
  if (!entry) {
    throw new Error(`${args.feed.channel} feed has no package entry`);
  }
  const expectedDigest = normalizeSha256(entry.artifact.sha256);
  const expectedSize = Number(entry.artifact.size || 0);
  for (const assetUrl of contentPackageAssetUrls(entry)) {
    const bytes = await fetchBytes(args.fetchImpl, assetUrl);
    const actualDigest = sha256(bytes);
    if (actualDigest !== expectedDigest) {
      throw new Error(`${assetUrl} sha256 ${actualDigest} does not match feed`);
    }
    if (bytes.byteLength !== expectedSize) {
      throw new Error(
        `${assetUrl} size ${bytes.byteLength} does not match feed`,
      );
    }

    const checksumUrl = `${assetUrl}.sha256`;
    const checksumText = await fetchText(args.fetchImpl, checksumUrl);
    if (!checksumText.includes(expectedDigest)) {
      throw new Error(`${checksumUrl} does not include ${expectedDigest}`);
    }
  }
}

export async function verifyContentPackageRelease(args?: {
  channels?: Channel[];
  outRoot?: string;
  fetchImpl?: FetchLike;
  buildContentFeeds?: (args: {
    outRoot: string;
    channels: Channel[];
    generatedAt: string;
  }) => Promise<void>;
  githubFeedBase?: string;
  giteeFeedBase?: string;
  versionFile?: string;
  keepOutRoot?: boolean;
}) {
  const channels = args?.channels || DEFAULT_CHANNELS;
  const fetchImpl =
    args?.fetchImpl || (globalThis.fetch as unknown as FetchLike);
  if (typeof fetchImpl !== "function") {
    throw new Error("fetch is unavailable");
  }

  const descriptor = await readJsonFile<{ version?: unknown }>(
    args?.versionFile || CONTENT_VERSION_FILE,
  );
  const version = String(descriptor.version || "").trim();
  if (!version) {
    throw new Error("content-package.version.json version is required");
  }

  const outRoot =
    args?.outRoot ||
    (await fs.mkdtemp(path.join(os.tmpdir(), "zs-content-release-")));
  const shouldCleanup = !args?.outRoot && !args?.keepOutRoot;
  try {
    const remoteFeeds = new Map<
      Channel,
      { github: ContentFeedDocument; gitee: ContentFeedDocument }
    >();
    let generatedAt = "";

    for (const channel of channels) {
      const githubFeed = await fetchJson<ContentFeedDocument>(
        fetchImpl,
        `${args?.githubFeedBase || GITHUB_FEED_BASE}/${channel}/feed.json`,
      );
      const giteeFeed = await fetchJson<ContentFeedDocument>(
        fetchImpl,
        `${args?.giteeFeedBase || GITEE_FEED_BASE}/${channel}/feed.json`,
      );
      if (packageSignature(githubFeed) !== packageSignature(giteeFeed)) {
        throw new Error(`${channel} GitHub and Gitee feeds do not match`);
      }
      const remotePackage = githubFeed.packages[0];
      if (!remotePackage) {
        throw new Error(`${channel} remote feed has no package entry`);
      }
      if (remotePackage.version !== version) {
        throw new Error(
          `${channel} remote feed version ${remotePackage.version} does not match ${version}`,
        );
      }
      generatedAt ||= String(githubFeed.updated_at || "").trim();
      remoteFeeds.set(channel, { github: githubFeed, gitee: giteeFeed });
    }
    if (!generatedAt) {
      throw new Error("remote content feed updated_at is required");
    }

    await (args?.buildContentFeeds || runBuildContentFeeds)({
      outRoot,
      channels,
      generatedAt,
    });

    for (const channel of channels) {
      const localFeed = await readJsonFile<ContentFeedDocument>(
        path.join(outRoot, channel, "feed.json"),
      );
      const localPackage = localFeed.packages[0];
      if (!localPackage) {
        throw new Error(`${channel} local feed has no package entry`);
      }
      if (localPackage.version !== version) {
        throw new Error(
          `${channel} local feed version ${localPackage.version} does not match ${version}`,
        );
      }
      const remote = remoteFeeds.get(channel);
      if (!remote) {
        throw new Error(`${channel} remote feed was not loaded`);
      }
      assertSameSignature({
        label: `${channel} GitHub`,
        localFeed,
        remoteFeed: remote.github,
      });
      assertSameSignature({
        label: `${channel} Gitee`,
        localFeed,
        remoteFeed: remote.gitee,
      });
      await verifyReleaseAssets({ fetchImpl, feed: localFeed });
    }
  } finally {
    if (shouldCleanup) {
      await fs.rm(outRoot, { recursive: true, force: true });
    }
  }
}

async function main() {
  await verifyContentPackageRelease();
  console.log("[content-package] release verification passed");
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  void main().catch((error) => {
    console.error(
      error instanceof Error ? error.stack || error.message : error,
    );
    process.exit(1);
  });
}
