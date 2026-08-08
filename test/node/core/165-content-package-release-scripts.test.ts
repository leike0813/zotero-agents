import { assert } from "chai";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import {
  bumpContentPackageVersion,
  resolveContentPackageVersionBump,
} from "../../../scripts/bump-content-package-version";
import {
  isTrackedContentSourceFile,
  normalizeContentPackageFileBytes,
  resolveContentPackageBuildChannels,
  resolveContentPackageGeneratedAt,
} from "../../../scripts/build-content-package-feed";
import { parseContentPackageChannels } from "../../../scripts/content-package-channels";
import { publishContentPackageFeeds } from "../../../scripts/publish-content-package-feeds";
import { parseGithubContentPublicationArgs } from "../../../scripts/publish-content-package-github";
import { parseGiteePublicationArgs } from "../../../scripts/sync-gitee-publication";
import {
  parseContentPackageCheckArgs,
  verifyContentPackageRelease,
} from "../../../scripts/check-content-package-release";
import {
  parseContentPackageReleaseArgs,
  prepareContentPackageRelease,
} from "../../../scripts/prepare-content-package-release";

type Feed = {
  schema: string;
  feed_id: string;
  channel: "stable" | "beta" | "dev";
  debug_content: boolean;
  revision: string;
  updated_at: string;
  packages: Array<{
    id: string;
    version: string;
    channel: "stable" | "beta" | "dev";
    debug_content: boolean;
    content_api: string;
    requires: Record<string, string>;
    artifact: {
      path: string;
      url: string;
      mirrors: string[];
      sha256: string;
      size: number;
    };
  }>;
};

function sha256(bytes: Uint8Array) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function response(value: unknown, status = 200) {
  if (value instanceof Uint8Array) {
    return new Response(value, { status });
  }
  return new Response(
    typeof value === "string" ? value : JSON.stringify(value),
    { status },
  );
}

async function expectRejects(promise: Promise<unknown>, pattern: RegExp) {
  try {
    await promise;
  } catch (error) {
    assert.match(
      error instanceof Error ? error.message : String(error),
      pattern,
    );
    return;
  }
  assert.fail("Expected promise to reject");
}

function makeFeed(args: {
  channel: "stable" | "beta" | "dev";
  version?: string;
  revision?: string;
  bytes?: Uint8Array;
}) {
  const version = args.version || "1.2.3";
  const bytes = args.bytes || new TextEncoder().encode(args.channel);
  const digest = sha256(bytes);
  const fileName = `zotero-agents-official-workflows-${version}-${args.channel}.zip`;
  return {
    feed: {
      schema: "zotero-agents.content-feed.v1",
      feed_id: `zotero-agents-official-${args.channel}`,
      channel: args.channel,
      debug_content: args.channel === "dev",
      revision: args.revision || "rev-1",
      updated_at: "2026-06-26T00:00:00.000Z",
      packages: [
        {
          id: "zotero-agents-official-workflows",
          version,
          channel: args.channel,
          debug_content: args.channel === "dev",
          content_api: "1.0.0",
          requires: { plugin: ">=0.5.0", content_api: "^1.0.0" },
          artifact: {
            path: `packages/${fileName}`,
            url: `https://github.example/releases/${fileName}`,
            mirrors: [`https://gitee.example/releases/${fileName}`],
            sha256: digest,
            size: bytes.byteLength,
          },
        },
      ],
    } satisfies Feed,
    bytes,
    digest,
    fileName,
  };
}

function githubContent(value: unknown) {
  return {
    encoding: "base64",
    content: Buffer.from(JSON.stringify(value), "utf8").toString("base64"),
  };
}

const execFileAsync = promisify(execFile);

async function git(args: string[], cwd?: string) {
  await execFileAsync("git", args, { cwd });
}

describe("content package release scripts", function () {
  let tempRoot = "";

  beforeEach(async function () {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "zs-release-scripts-"));
  });

  it("uses a stable commit timestamp for repeat builds", async function () {
    const runCommand = async () => ({
      stdout: "2026-07-18T10:41:14+00:00\n",
      stderr: "",
    });

    assert.equal(
      await resolveContentPackageGeneratedAt({ runCommand }),
      "2026-07-18T10:41:14.000Z",
    );
    assert.equal(
      await resolveContentPackageGeneratedAt({ runCommand }),
      "2026-07-18T10:41:14.000Z",
    );
  });

  it("parses the single manual Gitee publication command", function () {
    assert.deepEqual(
      parseGiteePublicationArgs([], {
        pluginVersion: "0.7.0",
        contentVersion: "0.5.0",
      }),
      { pluginVersion: "v0.7.0", contentVersion: "0.5.0" },
    );
    assert.deepEqual(
      parseGiteePublicationArgs(
        ["--plugin-version", "v0.8.0", "--content-version=0.6.0"],
        { pluginVersion: "0.7.0", contentVersion: "0.5.0" },
      ),
      { pluginVersion: "v0.8.0", contentVersion: "0.6.0" },
    );
  });

  it("requires explicit immutable GitHub content release assets", function () {
    assert.deepEqual(
      parseGithubContentPublicationArgs([
        "--repo",
        "owner/repo",
        "--tag",
        "official-workflows-v0.5.0",
        "--title",
        "Official workflows v0.5.0",
        "stable.zip",
        "stable.zip.sha256",
      ]),
      {
        repo: "owner/repo",
        tag: "official-workflows-v0.5.0",
        title: "Official workflows v0.5.0",
        notes: "",
        files: ["stable.zip", "stable.zip.sha256"],
      },
    );
  });

  afterEach(async function () {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("resolves explicit semver bump targets", function () {
    assert.equal(
      resolveContentPackageVersionBump({
        currentVersion: "1.2.3",
        target: "patch",
      }),
      "1.2.4",
    );
    assert.equal(
      resolveContentPackageVersionBump({
        currentVersion: "1.2.3",
        target: "minor",
      }),
      "1.3.0",
    );
    assert.equal(
      resolveContentPackageVersionBump({
        currentVersion: "1.2.3",
        target: "major",
      }),
      "2.0.0",
    );
    assert.equal(
      resolveContentPackageVersionBump({
        currentVersion: "1.2.3",
        target: "1.2.4",
      }),
      "1.2.4",
    );
    assert.throws(() =>
      resolveContentPackageVersionBump({
        currentVersion: "1.2.3",
        target: "1.2.3",
      }),
    );
    assert.throws(() =>
      resolveContentPackageVersionBump({
        currentVersion: "1.2.3",
        target: "not-semver",
      }),
    );
  });

  it("bumps only the content package version file", async function () {
    const filePath = path.join(tempRoot, "content-package.version.json");
    await fs.writeFile(
      filePath,
      `${JSON.stringify(
        {
          schema: "zotero-agents.content-version.v1",
          id: "zotero-agents-official-workflows",
          version: "1.2.3",
          content_api: "1.0.0",
        },
        null,
        2,
      )}\n`,
    );

    const result = await bumpContentPackageVersion({
      filePath,
      target: "minor",
    });
    const updated = JSON.parse(await fs.readFile(filePath, "utf8"));

    assert.deepEqual(result, {
      previousVersion: "1.2.3",
      version: "1.3.0",
    });
    assert.equal(updated.version, "1.3.0");
    assert.equal(updated.id, "zotero-agents-official-workflows");
  });

  it("bumps the version and sets requires.plugin when pluginVersion is provided", async function () {
    const filePath = path.join(tempRoot, "content-package.version.json");
    await fs.writeFile(
      filePath,
      `${JSON.stringify(
        {
          schema: "zotero-agents.content-version.v1",
          id: "zotero-agents-official-workflows",
          version: "1.2.3",
          content_api: "1.0.0",
          requires: {
            plugin: ">=0.5.0",
            content_api: "^1.0.0",
            zotero: ">=7 <10",
          },
        },
        null,
        2,
      )}\n`,
    );

    const result = await bumpContentPackageVersion({
      filePath,
      target: "minor",
      pluginVersion: ">=0.6.0",
    });
    const updated = JSON.parse(await fs.readFile(filePath, "utf8"));

    assert.deepEqual(result, {
      previousVersion: "1.2.3",
      version: "1.3.0",
    });
    assert.equal(updated.version, "1.3.0");
    assert.deepEqual(updated.requires, {
      plugin: ">=0.6.0",
      content_api: "^1.0.0",
      zotero: ">=7 <10",
    });
  });

  it("sets requires.plugin even when the descriptor has no requires field", async function () {
    const filePath = path.join(tempRoot, "content-package.version.json");
    await fs.writeFile(
      filePath,
      `${JSON.stringify(
        {
          schema: "zotero-agents.content-version.v1",
          id: "zotero-agents-official-workflows",
          version: "1.2.3",
          content_api: "1.0.0",
        },
        null,
        2,
      )}\n`,
    );

    await bumpContentPackageVersion({
      filePath,
      target: "patch",
      pluginVersion: ">=0.7.0",
    });
    const updated = JSON.parse(await fs.readFile(filePath, "utf8"));

    assert.equal(updated.version, "1.2.4");
    assert.deepEqual(updated.requires, { plugin: ">=0.7.0" });
  });

  it("does not touch requires when pluginVersion is not provided", async function () {
    const filePath = path.join(tempRoot, "content-package.version.json");
    await fs.writeFile(
      filePath,
      `${JSON.stringify(
        {
          schema: "zotero-agents.content-version.v1",
          id: "zotero-agents-official-workflows",
          version: "1.2.3",
          content_api: "1.0.0",
          requires: { plugin: ">=0.5.0", content_api: "^1.0.0" },
        },
        null,
        2,
      )}\n`,
    );

    await bumpContentPackageVersion({
      filePath,
      target: "patch",
    });
    const updated = JSON.parse(await fs.readFile(filePath, "utf8"));

    assert.equal(updated.version, "1.2.4");
    assert.deepEqual(updated.requires, {
      plugin: ">=0.5.0",
      content_api: "^1.0.0",
    });
  });

  it("prepares a content package version bump without publishing by default", async function () {
    const filePath = path.join(tempRoot, "content-package.version.json");
    await fs.writeFile(filePath, JSON.stringify({ version: "1.2.3" }, null, 2));

    const result = await prepareContentPackageRelease({
      target: "patch",
      versionFile: filePath,
      dispatch: false,
      runCommand: async () => {
        throw new Error("should not run external commands");
      },
    });
    const updated = JSON.parse(await fs.readFile(filePath, "utf8"));

    assert.deepEqual(result.bump, {
      previousVersion: "1.2.3",
      version: "1.2.4",
    });
    assert.equal(updated.version, "1.2.4");
    assert.isFalse(result.dispatched);
    assert.includeMembers(result.nextCommands, [
      "git add content-package.version.json",
      "npm run release:content-package -- --dispatch --watch --channels stable,beta,dev --repo leike0813/zotero-agents --ref main",
    ]);
  });

  it("prepares a content package version bump with plugin version constraint", async function () {
    const filePath = path.join(tempRoot, "content-package.version.json");
    await fs.writeFile(
      filePath,
      JSON.stringify(
        {
          version: "1.2.3",
          requires: { plugin: ">=0.5.0" },
        },
        null,
        2,
      ),
    );

    const result = await prepareContentPackageRelease({
      target: "minor",
      versionFile: filePath,
      pluginVersion: ">=0.6.0",
      dispatch: false,
      runCommand: async () => {
        throw new Error("should not run external commands");
      },
    });
    const updated = JSON.parse(await fs.readFile(filePath, "utf8"));

    assert.deepEqual(result.bump, {
      previousVersion: "1.2.3",
      version: "1.3.0",
    });
    assert.equal(updated.version, "1.3.0");
    assert.equal(updated.requires.plugin, ">=0.6.0");
    assert.isFalse(result.dispatched);
  });

  it("dispatches the content package publish workflow only from a clean tree", async function () {
    const calls: Array<{ command: string; args: string[] }> = [];
    let runListAttempts = 0;
    const releaseSetFile = path.join(tempRoot, "release-set.json");
    const receiptFile = path.join(tempRoot, "receipt.json");
    await fs.writeFile(
      releaseSetFile,
      JSON.stringify({ releaseSetId: "hbrs-ready" }),
    );
    await fs.writeFile(
      receiptFile,
      JSON.stringify({ status: "complete", releaseSetId: "hbrs-ready" }),
    );

    const result = await prepareContentPackageRelease({
      dispatch: true,
      channels: ["dev", "beta"],
      watch: true,
      repo: "owner/repo",
      ref: "release-branch",
      requestId: "content-request-1",
      hostReleaseSetFile: releaseSetFile,
      hostReceiptFile: receiptFile,
      runCommand: async (command, args) => {
        calls.push({ command, args });
        if (command === "git" && args[0] === "rev-parse") {
          return { stdout: "source-sha\n", stderr: "" };
        }
        if (command === "gh" && args[0] === "run" && args[1] === "list") {
          runListAttempts += 1;
          return {
            stdout: JSON.stringify(
              runListAttempts === 1
                ? []
                : [
                    {
                      databaseId: 123,
                      displayTitle: "Content package content-request-1",
                      event: "workflow_dispatch",
                      headBranch: "release-branch",
                      headSha: "source-sha",
                      url: "https://example.invalid/runs/123",
                    },
                  ],
            ),
            stderr: "",
          };
        }
        return { stdout: "", stderr: "" };
      },
    });

    assert.isTrue(result.dispatched);
    assert.strictEqual(result.runId, 123);
    assert.deepEqual(calls, [
      { command: "git", args: ["status", "--porcelain"] },
      { command: "git", args: ["fetch", "origin", "release-branch"] },
      {
        command: "git",
        args: ["merge-base", "--is-ancestor", "HEAD", "origin/release-branch"],
      },
      {
        command: "git",
        args: ["rev-parse", "HEAD"],
      },
      {
        command: "gh",
        args: [
          "run",
          "list",
          "--repo",
          "owner/repo",
          "--workflow",
          "publish-content-feed.yml",
          "--event",
          "workflow_dispatch",
          "--limit",
          "30",
          "--json",
          "databaseId,displayTitle,event,headBranch,headSha,url",
        ],
      },
      {
        command: "gh",
        args: [
          "workflow",
          "run",
          "publish-content-feed.yml",
          "--repo",
          "owner/repo",
          "--ref",
          "release-branch",
          "-f",
          "request_id=content-request-1",
          "-f",
          "channels=beta,dev",
        ],
      },
      {
        command: "gh",
        args: [
          "run",
          "list",
          "--repo",
          "owner/repo",
          "--workflow",
          "publish-content-feed.yml",
          "--event",
          "workflow_dispatch",
          "--limit",
          "30",
          "--json",
          "databaseId,displayTitle,event,headBranch,headSha,url",
        ],
      },
      {
        command: "gh",
        args: ["run", "watch", "123", "--repo", "owner/repo", "--exit-status"],
      },
    ]);
  });

  it("keeps the Host Bridge receipt gate in the content workflow", async function () {
    const workflow = await fs.readFile(
      ".github/workflows/publish-content-feed.yml",
      "utf8",
    );
    assert.include(workflow, "latest-complete-release-receipt.json");
    assert.include(workflow, 'test "$(jq -r .status');
    assert.include(workflow, 'test "$(jq -r .releaseSetId');
    assert.include(workflow, "channels:");
    assert.include(workflow, "cancel-in-progress: false");
    assert.include(workflow, "check:content-package-release -- --channels");
  });

  it("rejects content dispatch while the Host Bridge release is pending", async function () {
    const releaseSetFile = path.join(tempRoot, "pending-release-set.json");
    const receiptFile = path.join(tempRoot, "stale-receipt.json");
    await fs.writeFile(
      releaseSetFile,
      JSON.stringify({ releaseSetId: "hbrs-pending" }),
    );
    await fs.writeFile(
      receiptFile,
      JSON.stringify({ status: "complete", releaseSetId: "hbrs-old" }),
    );

    await expectRejects(
      prepareContentPackageRelease({
        dispatch: true,
        channels: ["stable"],
        hostReleaseSetFile: releaseSetFile,
        hostReceiptFile: receiptFile,
        runCommand: async () => ({ stdout: "", stderr: "" }),
      }),
      /Host Bridge.*hbrs-pending.*complete receipt/i,
    );
  });

  it("rejects workflow dispatch when local HEAD has not reached the remote ref", async function () {
    await expectRejects(
      prepareContentPackageRelease({
        dispatch: true,
        channels: ["stable"],
        ref: "main",
        runCommand: async (command, args) => {
          if (command === "git" && args[0] === "merge-base") {
            throw new Error("not ancestor");
          }
          return { stdout: "", stderr: "" };
        },
      }),
      /origin\/main/,
    );
  });

  it("rejects workflow dispatch when local changes are still uncommitted", async function () {
    await expectRejects(
      prepareContentPackageRelease({
        dispatch: true,
        channels: ["stable"],
        runCommand: async (command) => ({
          stdout: command === "git" ? " M content-package.version.json\n" : "",
          stderr: "",
        }),
      }),
      /[Cc]ommit and push content package changes before dispatching/,
    );
  });

  it("parses content package release helper arguments", function () {
    assert.deepInclude(
      parseContentPackageReleaseArgs([
        "minor",
        "--dispatch",
        "--channels=dev,beta,dev",
        "--watch",
        "--repo",
        "owner/repo",
        "--ref=release-branch",
      ]),
      {
        target: "minor",
        dispatch: true,
        watch: true,
        repo: "owner/repo",
        ref: "release-branch",
        channels: ["beta", "dev"],
      },
    );
  });

  it("parses --plugin-version option", function () {
    assert.deepInclude(
      parseContentPackageReleaseArgs(["patch", "--plugin-version", ">=0.6.0"]),
      {
        target: "patch",
        pluginVersion: ">=0.6.0",
      },
    );
    assert.deepInclude(
      parseContentPackageReleaseArgs(["minor", "--plugin-version=>=0.7.0"]),
      {
        target: "minor",
        pluginVersion: ">=0.7.0",
      },
    );
  });

  it("requires an explicit channel selection for dispatch only", async function () {
    await expectRejects(
      prepareContentPackageRelease({ dispatch: true }),
      /--channels is required when using --dispatch/i,
    );
    await expectRejects(
      prepareContentPackageRelease({ target: "patch", channels: ["stable"] }),
      /--channels can only be used with --dispatch/i,
    );
  });

  it("strictly normalizes content package channel selections", function () {
    assert.deepEqual(parseContentPackageChannels("dev,beta,dev"), [
      "beta",
      "dev",
    ]);
    assert.deepEqual(resolveContentPackageBuildChannels("stable"), ["stable"]);
    assert.deepEqual(resolveContentPackageBuildChannels(), ["stable", "dev"]);
    assert.throws(
      () => parseContentPackageChannels("stable,,dev"),
      /stable.*beta.*dev/i,
    );
    assert.throws(
      () => parseContentPackageChannels("stable,nightly"),
      /stable.*beta.*dev/i,
    );
  });

  it("patches selected feeds without changing other content-feed entries", async function () {
    const remote = path.join(tempRoot, "content-feed.git");
    const seed = path.join(tempRoot, "seed");
    const sourceRoot = path.join(tempRoot, "source");
    const clone = path.join(tempRoot, "clone");
    await git(["init", "--bare", remote]);
    await git(["init", seed]);
    await fs.mkdir(path.join(seed, "stable"), { recursive: true });
    await fs.mkdir(path.join(seed, "beta"), { recursive: true });
    await fs.mkdir(path.join(seed, "dev"), { recursive: true });
    await fs.writeFile(path.join(seed, "stable", "feed.json"), "stable-old\n");
    await fs.writeFile(path.join(seed, "beta", "feed.json"), "beta-old\n");
    await fs.writeFile(path.join(seed, "dev", "feed.json"), "dev-old\n");
    await fs.writeFile(path.join(seed, "README.md"), "existing readme\n");
    await git(["add", "."], seed);
    await git(["config", "user.name", "test"], seed);
    await git(["config", "user.email", "test@example.invalid"], seed);
    await git(["commit", "-m", "seed"], seed);
    await git(["branch", "-M", "content-feed"], seed);
    await git(["remote", "add", "origin", remote], seed);
    await git(["push", "origin", "content-feed"], seed);
    await fs.mkdir(path.join(sourceRoot, "stable"), { recursive: true });
    await fs.writeFile(
      path.join(sourceRoot, "stable", "feed.json"),
      "stable-new\n",
    );

    await publishContentPackageFeeds({
      channels: ["stable"],
      sourceRoot,
      remoteUrl: remote,
      repo: "owner/content-feed",
      revision: "test-revision",
      tempRoot,
    });

    await git(["clone", "--branch", "content-feed", remote, clone]);
    assert.equal(
      await fs.readFile(path.join(clone, "stable", "feed.json"), "utf8"),
      "stable-new\n",
    );
    assert.equal(
      await fs.readFile(path.join(clone, "beta", "feed.json"), "utf8"),
      "beta-old\n",
    );
    assert.equal(
      await fs.readFile(path.join(clone, "dev", "feed.json"), "utf8"),
      "dev-old\n",
    );
    assert.equal(
      await fs.readFile(path.join(clone, "README.md"), "utf8"),
      "existing readme\n",
    );
  });

  it("verifies canonical GitHub feed and release assets by default", async function () {
    const channel = "stable" as const;
    const built = makeFeed({ channel });
    await fs.mkdir(path.join(tempRoot, channel), { recursive: true });
    await fs.writeFile(
      path.join(tempRoot, channel, "feed.json"),
      JSON.stringify(built.feed),
    );
    const versionFile = path.join(tempRoot, "content-package.version.json");
    await fs.writeFile(versionFile, JSON.stringify({ version: "1.2.3" }));

    const fetchImpl = (async (url: string) => {
      if (url.includes("api.github.com")) {
        return response(githubContent(built.feed));
      }
      if (url.endsWith("/stable/feed.json")) {
        return response(built.feed);
      }
      if (url === built.feed.packages[0].artifact.url) {
        return response(built.bytes);
      }
      if (url.endsWith(".zip.sha256")) {
        return response(`${built.digest}  ${built.fileName}\n`);
      }
      return response("missing", 404);
    }) as typeof fetch;
    let buildArgs:
      | {
          generatedAt: string;
          revision: string;
        }
      | undefined;

    await verifyContentPackageRelease({
      channels: [channel],
      outRoot: tempRoot,
      versionFile,
      fetchImpl,
      buildContentFeeds: async (args) => {
        buildArgs = {
          generatedAt: args.generatedAt,
          revision: args.revision,
        };
      },
    });

    assert.deepEqual(buildArgs, {
      generatedAt: "2026-06-26T00:00:00.000Z",
      revision: "rev-1",
    });
  });

  it("reads GitHub feeds through the contents API to avoid stale raw branch cache", async function () {
    const channel = "stable" as const;
    const built = makeFeed({ channel, version: "1.2.3" });
    const stale = makeFeed({ channel, version: "1.2.2" });
    await fs.mkdir(path.join(tempRoot, channel), { recursive: true });
    await fs.writeFile(
      path.join(tempRoot, channel, "feed.json"),
      JSON.stringify(built.feed),
    );
    const versionFile = path.join(tempRoot, "content-package.version.json");
    await fs.writeFile(versionFile, JSON.stringify({ version: "1.2.3" }));

    const requestedUrls: string[] = [];
    const fetchImpl = (async (url: string) => {
      requestedUrls.push(url);
      if (
        url ===
        "https://api.github.com/repos/leike0813/zotero-agents-workflows/contents/stable/feed.json?ref=content-feed"
      ) {
        return response(githubContent(built.feed));
      }
      if (url.includes("raw.githubusercontent.com")) {
        return response(stale.feed);
      }
      if (url.endsWith("/stable/feed.json")) {
        return response(built.feed);
      }
      if (url === built.feed.packages[0].artifact.url) {
        return response(built.bytes);
      }
      if (url === built.feed.packages[0].artifact.mirrors[0]) {
        return response(built.bytes);
      }
      if (url.endsWith(".zip.sha256")) {
        return response(`${built.digest}  ${built.fileName}\n`);
      }
      return response("missing", 404);
    }) as typeof fetch;

    await verifyContentPackageRelease({
      channels: [channel],
      outRoot: tempRoot,
      versionFile,
      fetchImpl,
      buildContentFeeds: async () => {},
    });

    assert.include(
      requestedUrls,
      "https://api.github.com/repos/leike0813/zotero-agents-workflows/contents/stable/feed.json?ref=content-feed",
    );
    assert.notInclude(
      requestedUrls,
      "https://raw.githubusercontent.com/leike0813/zotero-agents-workflows/content-feed/stable/feed.json",
    );
  });

  it("keeps tracked skill files eligible while excluding local git metadata", function () {
    const trackedFiles = new Set([
      "skills_builtin/literature-analysis/SKILL.md",
      "skills_builtin/literature-analysis/assets/runner.json",
      "skills_builtin/literature-metadata-search/assets/input.schema.json",
      "skills_builtin/literature-metadata-search/assets/output.schema.json",
      "skills_builtin/literature-metadata-search/assets/runner.json",
      "skills_builtin/tag-regulator/SKILL.md",
      "skills_builtin/tag-regulator/references/tag_standard.md",
      "skills_builtin/tag-regulator/scripts/normalize_output.py",
      "skills_builtin/tag-regulator/assets/output.schema.json",
      "skills_builtin/tag-regulator/assets/runner.json",
    ]);

    assert.isTrue(
      isTrackedContentSourceFile({
        filePath: path.join(
          process.cwd(),
          "skills_builtin",
          "literature-analysis",
          "SKILL.md",
        ),
        trackedFiles,
      }),
    );
    assert.isFalse(
      isTrackedContentSourceFile({
        filePath: path.join(
          process.cwd(),
          "skills_builtin",
          "literature-analysis",
          ".git",
        ),
        trackedFiles,
      }),
    );
    assert.isTrue(
      isTrackedContentSourceFile({
        filePath: path.join(
          process.cwd(),
          "skills_builtin",
          "literature-metadata-search",
          "assets",
          "input.schema.json",
        ),
        trackedFiles,
      }),
    );
    assert.isTrue(
      isTrackedContentSourceFile({
        filePath: path.join(
          process.cwd(),
          "skills_builtin",
          "literature-metadata-search",
          "assets",
          "output.schema.json",
        ),
        trackedFiles,
      }),
    );
    assert.isTrue(
      isTrackedContentSourceFile({
        filePath: path.join(
          process.cwd(),
          "skills_builtin",
          "literature-metadata-search",
          "assets",
          "runner.json",
        ),
        trackedFiles,
      }),
    );
    for (const relativePath of [
      "SKILL.md",
      "references/tag_standard.md",
      "scripts/normalize_output.py",
      "assets/output.schema.json",
      "assets/runner.json",
    ]) {
      assert.isTrue(
        isTrackedContentSourceFile({
          filePath: path.join(
            process.cwd(),
            "skills_builtin",
            "tag-regulator",
            ...relativePath.split("/"),
          ),
          trackedFiles,
        }),
      );
    }
  });

  it("normalizes text package file line endings without rewriting binary files", function () {
    assert.deepEqual(
      Array.from(
        normalizeContentPackageFileBytes(
          new TextEncoder().encode("line 1\r\nline 2\r\n"),
        ),
      ),
      Array.from(new TextEncoder().encode("line 1\nline 2\n")),
    );

    const binary = new Uint8Array([0, 13, 10, 255]);
    assert.strictEqual(normalizeContentPackageFileBytes(binary), binary);
  });

  it("fails when the remote feed is missing", async function () {
    const channel = "stable" as const;
    const built = makeFeed({ channel });
    await fs.mkdir(path.join(tempRoot, channel), { recursive: true });
    await fs.writeFile(
      path.join(tempRoot, channel, "feed.json"),
      JSON.stringify(built.feed),
    );
    const versionFile = path.join(tempRoot, "content-package.version.json");
    await fs.writeFile(versionFile, JSON.stringify({ version: "1.2.3" }));

    await expectRejects(
      verifyContentPackageRelease({
        channels: [channel],
        outRoot: tempRoot,
        versionFile,
        fetchImpl: (async () => response("missing", 404)) as typeof fetch,
        buildContentFeeds: async () => {},
      }),
      /HTTP 404/,
    );
  });

  it("fails when remote feed package semantics drift", async function () {
    const channel = "stable" as const;
    const built = makeFeed({ channel });
    const remote = makeFeed({
      channel,
      bytes: new TextEncoder().encode("drift"),
    });
    await fs.mkdir(path.join(tempRoot, channel), { recursive: true });
    await fs.writeFile(
      path.join(tempRoot, channel, "feed.json"),
      JSON.stringify(built.feed),
    );
    const versionFile = path.join(tempRoot, "content-package.version.json");
    await fs.writeFile(versionFile, JSON.stringify({ version: "1.2.3" }));

    await expectRejects(
      verifyContentPackageRelease({
        channels: [channel],
        outRoot: tempRoot,
        versionFile,
        fetchImpl: (async (url: string) =>
          url.includes("api.github.com")
            ? response(githubContent(remote.feed))
            : url.endsWith("/stable/feed.json")
              ? response(remote.feed)
              : response("missing", 404)) as typeof fetch,
        buildContentFeeds: async () => {},
      }),
      /does not match local generated package semantics/,
    );
  });

  it("does not block canonical release verification when the Gitee mirror feed disagrees", async function () {
    const channel = "stable" as const;
    const built = makeFeed({ channel });
    const gitee = makeFeed({
      channel,
      revision: "rev-2",
    });
    await fs.mkdir(path.join(tempRoot, channel), { recursive: true });
    await fs.writeFile(
      path.join(tempRoot, channel, "feed.json"),
      JSON.stringify(built.feed),
    );
    const versionFile = path.join(tempRoot, "content-package.version.json");
    await fs.writeFile(versionFile, JSON.stringify({ version: "1.2.3" }));

    await verifyContentPackageRelease({
      channels: [channel],
      outRoot: tempRoot,
      versionFile,
      fetchImpl: (async (url: string) => {
        if (url.includes("api.github.com")) {
          return response(githubContent(built.feed));
        }
        if (url.includes("gitee")) {
          return response(gitee.feed);
        }
        if (url === built.feed.packages[0].artifact.url) {
          return response(built.bytes);
        }
        if (url.endsWith(".zip.sha256")) {
          return response(`${built.digest}  ${built.fileName}\n`);
        }
        return response(built.feed);
      }) as typeof fetch,
      buildContentFeeds: async () => {},
    });
  });

  it("can run strict mirror verification when requested", async function () {
    const channel = "stable" as const;
    const built = makeFeed({ channel });
    const gitee = makeFeed({
      channel,
      revision: "rev-2",
    });
    await fs.mkdir(path.join(tempRoot, channel), { recursive: true });
    await fs.writeFile(
      path.join(tempRoot, channel, "feed.json"),
      JSON.stringify(built.feed),
    );
    const versionFile = path.join(tempRoot, "content-package.version.json");
    await fs.writeFile(versionFile, JSON.stringify({ version: "1.2.3" }));

    await expectRejects(
      verifyContentPackageRelease({
        channels: [channel],
        outRoot: tempRoot,
        versionFile,
        checkMirror: true,
        fetchImpl: (async (url: string) => {
          if (url.includes("api.github.com")) {
            return response(githubContent(built.feed));
          }
          return url.includes("gitee")
            ? response(gitee.feed)
            : response(built.feed);
        }) as typeof fetch,
        buildContentFeeds: async () => {},
      }),
      /GitHub and Gitee feeds do not match/,
    );
  });

  it("defaults content release verification to stable and beta only", function () {
    assert.deepEqual(parseContentPackageCheckArgs([]).channels, [
      "stable",
      "beta",
    ]);
    assert.deepEqual(parseContentPackageCheckArgs(["--include-dev"]).channels, [
      "stable",
      "beta",
      "dev",
    ]);
    assert.deepEqual(
      parseContentPackageCheckArgs(["--channels", "dev,beta,dev"]).channels,
      ["beta", "dev"],
    );
    assert.throws(
      () =>
        parseContentPackageCheckArgs(["--include-dev", "--channels", "dev"]),
      /either --include-dev or --channels/i,
    );
    assert.throws(
      () => parseContentPackageCheckArgs(["--channels", "nightly"]),
      /stable.*beta.*dev/i,
    );
  });

  it("does not require public Gitee feeds for canonical verification", async function () {
    const channel = "stable" as const;
    const built = makeFeed({ channel });
    await fs.mkdir(path.join(tempRoot, channel), { recursive: true });
    await fs.writeFile(
      path.join(tempRoot, channel, "feed.json"),
      JSON.stringify(built.feed),
    );
    const versionFile = path.join(tempRoot, "content-package.version.json");
    await fs.writeFile(versionFile, JSON.stringify({ version: "1.2.3" }));

    const fetchImpl = (async (url: string) => {
      if (url.includes("api.github.com")) {
        return response(githubContent(built.feed));
      }
      if (url.includes("gitee")) {
        return response("unavailable", 503);
      }
      if (url.endsWith("/stable/feed.json")) {
        return response(built.feed);
      }
      if (url === built.feed.packages[0].artifact.url) {
        return response(built.bytes);
      }
      if (url.endsWith(".zip.sha256")) {
        return response(`${built.digest}  ${built.fileName}\n`);
      }
      return response("missing", 404);
    }) as typeof fetch;

    await verifyContentPackageRelease({
      channels: [channel],
      outRoot: tempRoot,
      versionFile,
      fetchImpl,
      buildContentFeeds: async () => {},
    });
  });
});
