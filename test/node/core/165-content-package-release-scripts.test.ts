import { assert } from "chai";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  bumpContentPackageVersion,
  resolveContentPackageVersionBump,
} from "../../../scripts/bump-content-package-version";
import { isTrackedContentSourceFile } from "../../../scripts/build-content-package-feed";
import { verifyContentPackageRelease } from "../../../scripts/check-content-package-release";
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

describe("content package release scripts", function () {
  let tempRoot = "";

  beforeEach(async function () {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "zs-release-scripts-"));
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
      "gh workflow run publish-content-feed.yml --repo leike0813/zotero-agents --ref main",
    ]);
  });

  it("dispatches the content package publish workflow only from a clean tree", async function () {
    const calls: Array<{ command: string; args: string[] }> = [];

    const result = await prepareContentPackageRelease({
      dispatch: true,
      watch: true,
      repo: "owner/repo",
      ref: "release-branch",
      runCommand: async (command, args) => {
        calls.push({ command, args });
        return { stdout: "", stderr: "" };
      },
    });

    assert.isTrue(result.dispatched);
    assert.deepEqual(calls, [
      { command: "git", args: ["status", "--porcelain"] },
      { command: "git", args: ["fetch", "origin", "release-branch"] },
      {
        command: "git",
        args: ["merge-base", "--is-ancestor", "HEAD", "origin/release-branch"],
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
        ],
      },
      { command: "gh", args: ["run", "watch", "--repo", "owner/repo"] },
    ]);
  });

  it("rejects workflow dispatch when local HEAD has not reached the remote ref", async function () {
    await expectRejects(
      prepareContentPackageRelease({
        dispatch: true,
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
      },
    );
  });

  it("verifies matching GitHub and Gitee feeds and release assets", async function () {
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

  it("keeps submodule tracked files eligible while excluding local git metadata", function () {
    const trackedFiles = new Set([
      "skills_builtin/literature-analysis/SKILL.md",
      "skills_builtin/literature-analysis/assets/runner.json",
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
          url.endsWith("/stable/feed.json")
            ? response(remote.feed)
            : response("missing", 404)) as typeof fetch,
        buildContentFeeds: async () => {},
      }),
      /does not match local generated package semantics/,
    );
  });

  it("fails when GitHub and Gitee feeds disagree", async function () {
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
        fetchImpl: (async (url: string) =>
          url.includes("gitee")
            ? response(gitee.feed)
            : response(built.feed)) as typeof fetch,
        buildContentFeeds: async () => {},
      }),
      /GitHub and Gitee feeds do not match/,
    );
  });

  it("verifies public Gitee feeds without requiring a token", async function () {
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
  });
});
