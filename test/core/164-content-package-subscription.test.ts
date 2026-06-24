import { assert } from "chai";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  __contentPackageSubscriptionTestOnly,
  getOfficialContentRoot,
  getContentPackageStatus,
  getConfiguredContentFeedChannel,
  installContentPackageFromFeed,
  checkContentPackageUpdate,
} from "../../src/modules/contentPackageSubscription";
import { promptOfficialWorkflowPackageUpdateOnStartup } from "../../src/hooks";
import { createZipFromNamedFiles } from "../../src/providers/skillrunner/zipTransport";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import { setPref } from "../../src/utils/prefs";

const encoder = new TextEncoder();

function utf8(value: string) {
  return encoder.encode(value);
}

function sha256(bytes: Uint8Array) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function jsonResponse(value: unknown) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function bytesResponse(bytes: Uint8Array, status = 200) {
  return new Response(bytes, { status });
}

function makePackageZip(args?: {
  channel?: "stable" | "beta" | "dev";
  debug?: boolean;
  version?: string;
  contentApi?: string;
  requires?: Record<string, string>;
}) {
  const channel = args?.channel || "stable";
  const debug = args?.debug === true;
  const version = args?.version || "1.0.0";
  const contentApi = args?.contentApi;
  const requires = args?.requires;
  return createZipFromNamedFiles([
    {
      name: "content-package.json",
      data: utf8(
        JSON.stringify({
          schema: "zotero-agents.content-package.v1",
          id: "official-content",
          version,
          channel,
          debug_content: debug,
          ...(contentApi ? { content_api: contentApi } : {}),
          ...(requires ? { requires } : {}),
        }),
      ),
    },
    {
      name: "workflows/demo/workflow.json",
      data: utf8(
        JSON.stringify({
          id: "demo",
          label: "Demo",
          provider: "pass-through",
          hooks: { applyResult: "hooks/applyResult.js" },
        }),
      ),
    },
    {
      name: "skills/demo/SKILL.md",
      data: utf8("---\nname: demo\n---\n\n# demo\n"),
    },
  ]);
}

function makeFeed(args: {
  channel?: "stable" | "beta" | "dev";
  revision?: string;
  zip: Uint8Array;
  debug?: boolean;
  version?: string;
  contentApi?: string;
  requires?: Record<string, string>;
  artifactUrl?: string;
  artifactMirrors?: string[];
}) {
  const channel = args.channel || "stable";
  const debug = args.debug === true;
  return {
    schema: "zotero-agents.content-feed.v1",
    feed_id: "official",
    channel,
    debug_content: debug,
    revision: args.revision || "rev-1",
    updated_at: "2026-06-23T00:00:00.000Z",
    packages: [
      {
        id: "official-content",
        version: args.version || "1.0.0",
        channel,
        debug_content: debug,
        ...(args.contentApi ? { content_api: args.contentApi } : {}),
        ...(args.requires ? { requires: args.requires } : {}),
        artifact: {
          path: "packages/official-content.zip",
          ...(args.artifactUrl ? { url: args.artifactUrl } : {}),
          ...(args.artifactMirrors ? { mirrors: args.artifactMirrors } : {}),
          sha256: sha256(args.zip),
          size: args.zip.byteLength,
        },
      },
    ],
  };
}

describe("content package subscription", function () {
  let tempRoot = "";
  let previousRuntimeRoot: string | undefined;
  let previousFetch: typeof fetch | undefined;

  beforeEach(async function () {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "zs-content-sub-"));
    previousRuntimeRoot = process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    previousFetch = globalThis.fetch;
    process.env.ZOTERO_SKILLS_RUNTIME_ROOT = tempRoot;
    setPref("contentFeedChannel", "stable");
    setPref("contentStableFeedUrl", "https://primary.example/stable/feed.json");
    setPref(
      "contentStableFeedMirrorUrl",
      "https://mirror.example/stable/feed.json",
    );
    setPref("contentBetaFeedUrl", "https://primary.example/beta/feed.json");
    setPref(
      "contentBetaFeedMirrorUrl",
      "https://mirror.example/beta/feed.json",
    );
    setPref("contentDevFeedUrl", "https://primary.example/dev/feed.json");
    setPref("contentDevFeedMirrorUrl", "https://mirror.example/dev/feed.json");
    setDebugModeOverrideForTests(false);
  });

  afterEach(async function () {
    if (typeof previousRuntimeRoot === "undefined") {
      delete process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    } else {
      process.env.ZOTERO_SKILLS_RUNTIME_ROOT = previousRuntimeRoot;
    }
    globalThis.fetch = previousFetch as typeof fetch;
    setDebugModeOverrideForTests();
    if (tempRoot) {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("rejects zip entries outside managed content roots", function () {
    const zip = createZipFromNamedFiles([
      { name: "other/file.txt", data: utf8("bad") },
    ]);

    assert.throws(
      () => __contentPackageSubscriptionTestOnly.readStoredZipEntries(zip),
      /zip entry path is invalid/,
    );
  });

  it("installs a stable package and falls back to the mirror artifact", async function () {
    const zip = makePackageZip();
    const feed = makeFeed({ zip });
    globalThis.fetch = (async (url: RequestInfo | URL) => {
      const href = String(url);
      if (href.endsWith("/stable/feed.json")) {
        return jsonResponse(feed);
      }
      if (
        href === "https://primary.example/stable/packages/official-content.zip"
      ) {
        return bytesResponse(utf8("missing"), 503);
      }
      if (
        href === "https://mirror.example/stable/packages/official-content.zip"
      ) {
        return bytesResponse(zip);
      }
      return bytesResponse(utf8("not found"), 404);
    }) as typeof fetch;

    const result = await installContentPackageFromFeed({ channel: "stable" });

    assert.isTrue(result.ok);
    if (!result.ok) {
      return;
    }
    assert.equal(
      result.installed.source_url,
      "https://mirror.example/stable/packages/official-content.zip",
    );
    assert.equal(result.installed.feed_revision, "rev-1");
    assert.isTrue(
      await fs
        .stat(
          path.join(
            getOfficialContentRoot(),
            "workflows",
            "demo",
            "workflow.json",
          ),
        )
        .then(() => true)
        .catch(() => false),
    );
  });

  it("treats install state as stale when official workflow files are missing", async function () {
    const zip = makePackageZip();
    const feed = makeFeed({ zip });
    globalThis.fetch = (async (url: RequestInfo | URL) => {
      const href = String(url);
      if (href.endsWith("/stable/feed.json")) {
        return jsonResponse(feed);
      }
      if (href.endsWith("/packages/official-content.zip")) {
        return bytesResponse(zip);
      }
      return bytesResponse(utf8("not found"), 404);
    }) as typeof fetch;

    const install = await installContentPackageFromFeed({ channel: "stable" });
    assert.isTrue(install.ok);

    await fs.rm(path.join(getOfficialContentRoot(), "workflows"), {
      recursive: true,
      force: true,
    });
    const status = await getContentPackageStatus("stable");

    assert.isNull(status.installed);
    assert.equal(status.staleState?.reason, "official_workflow_root_missing");

    const check = await checkContentPackageUpdate({ channel: "stable" });
    assert.isTrue(check.ok);
    if (check.ok) {
      assert.isTrue(check.updateAvailable);
      assert.equal(check.action, "install");
      assert.isNull(check.status.installed);
    }
  });

  it("fails closed when primary and mirror feeds disagree", async function () {
    const zip = makePackageZip();
    const primaryFeed = makeFeed({ zip, revision: "rev-1" });
    const mirrorFeed = makeFeed({ zip, revision: "rev-2" });
    globalThis.fetch = (async (url: RequestInfo | URL) => {
      const href = String(url);
      if (href.includes("primary.example")) {
        return jsonResponse(primaryFeed);
      }
      if (href.includes("mirror.example")) {
        return jsonResponse(mirrorFeed);
      }
      return bytesResponse(utf8("not found"), 404);
    }) as typeof fetch;

    const result = await checkContentPackageUpdate({ channel: "stable" });

    assert.isFalse(result.ok);
    if (result.ok) {
      return;
    }
    assert.equal(result.code, "feed_mirror_mismatch");
  });

  it("accepts mirror feeds with different artifact URLs when package semantics match", async function () {
    const zip = makePackageZip({
      contentApi: "1.0.0",
      requires: { plugin: ">=0.4.0 <0.5.0", content_api: "^1.0.0" },
    });
    const primaryFeed = makeFeed({
      zip,
      contentApi: "1.0.0",
      requires: { plugin: ">=0.4.0 <0.5.0", content_api: "^1.0.0" },
      artifactUrl: "https://github.example/releases/official-content.zip",
    });
    const mirrorFeed = makeFeed({
      zip,
      contentApi: "1.0.0",
      requires: { plugin: ">=0.4.0 <0.5.0", content_api: "^1.0.0" },
      artifactUrl: "https://gitee.example/releases/official-content.zip",
    });
    globalThis.fetch = (async (url: RequestInfo | URL) => {
      const href = String(url);
      if (href.includes("primary.example")) {
        return jsonResponse(primaryFeed);
      }
      if (href.includes("mirror.example")) {
        return jsonResponse(mirrorFeed);
      }
      return bytesResponse(utf8("not found"), 404);
    }) as typeof fetch;

    const result = await checkContentPackageUpdate({ channel: "stable" });

    assert.isTrue(result.ok);
    if (!result.ok) {
      return;
    }
    assert.isTrue(result.compatible);
    assert.equal(result.action, "install");
  });

  it("rejects packages that require a newer plugin version", async function () {
    const requires = { plugin: ">=99.0.0", content_api: "^1.0.0" };
    const zip = makePackageZip({ contentApi: "1.0.0", requires });
    const feed = makeFeed({ zip, contentApi: "1.0.0", requires });
    globalThis.fetch = (async (url: RequestInfo | URL) => {
      const href = String(url);
      if (href.endsWith("/stable/feed.json")) {
        return jsonResponse(feed);
      }
      if (href.endsWith("/packages/official-content.zip")) {
        return bytesResponse(zip);
      }
      return bytesResponse(utf8("not found"), 404);
    }) as typeof fetch;

    const check = await checkContentPackageUpdate({ channel: "stable" });
    assert.isTrue(check.ok);
    if (!check.ok) {
      return;
    }
    assert.isFalse(check.compatible);
    assert.equal(check.incompatibility?.code, "plugin_version_unsupported");

    const install = await installContentPackageFromFeed({ channel: "stable" });
    assert.isFalse(install.ok);
    if (!install.ok) {
      assert.equal(install.code, "plugin_version_unsupported");
    }
  });

  it("rejects packages that require an unsupported content API", async function () {
    const requires = { plugin: ">=0.4.0 <0.5.0", content_api: "^99.0.0" };
    const zip = makePackageZip({ contentApi: "99.0.0", requires });
    const feed = makeFeed({ zip, contentApi: "99.0.0", requires });
    globalThis.fetch = (async (url: RequestInfo | URL) => {
      const href = String(url);
      if (href.endsWith("/stable/feed.json")) {
        return jsonResponse(feed);
      }
      return bytesResponse(zip);
    }) as typeof fetch;

    const install = await installContentPackageFromFeed({ channel: "stable" });
    assert.isFalse(install.ok);
    if (!install.ok) {
      assert.equal(install.code, "content_api_unsupported");
    }
  });

  it("rejects packages that require an unsupported Zotero version", async function () {
    const requires = { plugin: ">=0.4.0 <0.5.0", zotero: ">=99" };
    const zip = makePackageZip({ requires });
    const feed = makeFeed({ zip, requires });
    globalThis.fetch = (async (url: RequestInfo | URL) => {
      const href = String(url);
      if (href.endsWith("/stable/feed.json")) {
        return jsonResponse(feed);
      }
      return bytesResponse(zip);
    }) as typeof fetch;

    const install = await installContentPackageFromFeed({ channel: "stable" });
    assert.isFalse(install.ok);
    if (!install.ok) {
      assert.equal(install.code, "zotero_version_unsupported");
    }
  });

  it("allows feed-directed replacement with a lower package version", async function () {
    const zip2 = makePackageZip({ version: "2.0.0" });
    const feed2 = makeFeed({ zip: zip2, version: "2.0.0", revision: "rev-2" });
    const zip1 = makePackageZip({ version: "1.0.0" });
    const feed1 = makeFeed({ zip: zip1, version: "1.0.0", revision: "rev-3" });
    let activeFeed = feed2;
    let activeZip = zip2;
    globalThis.fetch = (async (url: RequestInfo | URL) => {
      const href = String(url);
      if (href.endsWith("/stable/feed.json")) {
        return jsonResponse(activeFeed);
      }
      if (href.endsWith("/packages/official-content.zip")) {
        return bytesResponse(activeZip);
      }
      return bytesResponse(utf8("not found"), 404);
    }) as typeof fetch;

    const first = await installContentPackageFromFeed({ channel: "stable" });
    assert.isTrue(first.ok);

    activeFeed = feed1;
    activeZip = zip1;
    const check = await checkContentPackageUpdate({ channel: "stable" });
    assert.isTrue(check.ok);
    if (check.ok) {
      assert.equal(check.action, "rollback");
      assert.isTrue(check.updateAvailable);
    }
    const rollback = await installContentPackageFromFeed({ channel: "stable" });
    assert.isTrue(rollback.ok);
    if (rollback.ok) {
      assert.equal(rollback.installed.package.version, "1.0.0");
      assert.equal(rollback.previous?.package.version, "2.0.0");
    }
  });

  it("reports no action when the installed package matches the feed", async function () {
    const zip = makePackageZip({ version: "1.0.0" });
    const feed = makeFeed({ zip, version: "1.0.0", revision: "rev-1" });
    globalThis.fetch = (async (url: RequestInfo | URL) => {
      const href = String(url);
      if (href.endsWith("/stable/feed.json")) {
        return jsonResponse(feed);
      }
      if (href.endsWith("/packages/official-content.zip")) {
        return bytesResponse(zip);
      }
      return bytesResponse(utf8("not found"), 404);
    }) as typeof fetch;

    const install = await installContentPackageFromFeed({ channel: "stable" });
    assert.isTrue(install.ok);

    const check = await checkContentPackageUpdate({ channel: "stable" });
    assert.isTrue(check.ok);
    if (check.ok) {
      assert.equal(check.action, "none");
      assert.isFalse(check.updateAvailable);
    }
  });

  it("reports replacement when the same package version has a different revision", async function () {
    const zip1 = makePackageZip({ version: "1.0.0" });
    const feed1 = makeFeed({ zip: zip1, version: "1.0.0", revision: "rev-1" });
    const zip2 = makePackageZip({
      version: "1.0.0",
      requires: { plugin: ">=0.4.0 <0.5.0" },
    });
    const feed2 = makeFeed({
      zip: zip2,
      version: "1.0.0",
      revision: "rev-2",
      requires: { plugin: ">=0.4.0 <0.5.0" },
    });
    let activeFeed = feed1;
    let activeZip = zip1;
    globalThis.fetch = (async (url: RequestInfo | URL) => {
      const href = String(url);
      if (href.endsWith("/stable/feed.json")) {
        return jsonResponse(activeFeed);
      }
      if (href.endsWith("/packages/official-content.zip")) {
        return bytesResponse(activeZip);
      }
      return bytesResponse(utf8("not found"), 404);
    }) as typeof fetch;

    const install = await installContentPackageFromFeed({ channel: "stable" });
    assert.isTrue(install.ok);

    activeFeed = feed2;
    activeZip = zip2;
    const check = await checkContentPackageUpdate({ channel: "stable" });
    assert.isTrue(check.ok);
    if (check.ok) {
      assert.equal(check.action, "replace");
      assert.isTrue(check.updateAvailable);
    }
  });

  it("uses stable as the effective channel when dev is configured outside debug mode", async function () {
    setPref("contentFeedChannel", "dev");

    assert.equal(getConfiguredContentFeedChannel(), "stable");
    assert.equal((await getContentPackageStatus()).channel, "stable");

    setDebugModeOverrideForTests(true);

    assert.equal(getConfiguredContentFeedChannel(), "dev");
    assert.equal((await getContentPackageStatus()).channel, "dev");
  });

  it("requires debug mode before installing dev content", async function () {
    const zip = makePackageZip({ channel: "dev", debug: true });
    const feed = makeFeed({ channel: "dev", zip, debug: true });
    globalThis.fetch = (async (url: RequestInfo | URL) => {
      const href = String(url);
      if (href.endsWith("/dev/feed.json")) {
        return jsonResponse(feed);
      }
      if (href.endsWith("/packages/official-content.zip")) {
        return bytesResponse(zip);
      }
      return bytesResponse(utf8("not found"), 404);
    }) as typeof fetch;

    const blocked = await installContentPackageFromFeed({ channel: "dev" });
    assert.isFalse(blocked.ok);
    if (!blocked.ok) {
      assert.equal(blocked.code, "debug_mode_required");
    }

    setDebugModeOverrideForTests(true);
    const installed = await installContentPackageFromFeed({ channel: "dev" });
    assert.isTrue(installed.ok);
  });

  it("prompts and installs official Workflow package updates on startup", async function () {
    const prompts: string[] = [];
    const alerts: string[] = [];
    let installCalls = 0;
    let afterInstallCalls = 0;
    const result = await promptOfficialWorkflowPackageUpdateOnStartup({
      win: {
        confirm: (message: string) => {
          prompts.push(message);
          return true;
        },
        alert: (message: string) => {
          alerts.push(message);
        },
      } as unknown as _ZoteroTypes.MainWindow,
      check: async () =>
        ({
          ok: true,
          status: {
            channel: "stable",
            installed: {
              feed_revision: "rev-1",
              package: {
                id: "official-content",
                version: "1.0.0",
                artifact: { sha256: "sha256:old" },
              },
            },
          },
          feed: { channel: "stable", revision: "rev-2" },
          package: {
            id: "official-content",
            version: "1.1.0",
            artifact: { sha256: "sha256:new" },
          },
          updateAvailable: true,
          compatible: true,
          selectedFeedUrl: "https://primary.example/stable/feed.json",
          failures: [],
          artifactFeedUrls: ["https://primary.example/stable/feed.json"],
        }) as any,
      install: async () => {
        installCalls += 1;
        return {
          ok: true,
          status: {} as any,
          installed: {} as any,
        };
      },
      onInstalled: () => {
        afterInstallCalls += 1;
      },
    });

    assert.isTrue(result.prompted);
    assert.isTrue(result.installed);
    assert.lengthOf(prompts, 1);
    assert.include(prompts[0], "1.0.0");
    assert.include(prompts[0], "1.1.0");
    assert.equal(installCalls, 1);
    assert.equal(afterInstallCalls, 1);
    assert.deepEqual(alerts, []);
  });

  it("does not show startup upgrade prompt before official Workflow package is installed", async function () {
    const prompts: string[] = [];
    let installCalls = 0;
    const result = await promptOfficialWorkflowPackageUpdateOnStartup({
      win: {
        confirm: (message: string) => {
          prompts.push(message);
          return true;
        },
        alert: () => {},
      } as unknown as _ZoteroTypes.MainWindow,
      check: async () =>
        ({
          ok: true,
          status: {
            channel: "stable",
            installed: null,
          },
          feed: { channel: "stable", revision: "rev-1" },
          package: {
            id: "official-content",
            version: "1.0.0",
            artifact: { sha256: "sha256:new" },
          },
          updateAvailable: true,
          compatible: true,
          selectedFeedUrl: "https://primary.example/stable/feed.json",
          failures: [],
          artifactFeedUrls: ["https://primary.example/stable/feed.json"],
        }) as any,
      install: async () => {
        installCalls += 1;
        return {
          ok: true,
          status: {} as any,
          installed: {} as any,
        };
      },
      onInstalled: () => {},
    });

    assert.isFalse(result.prompted);
    assert.isFalse(result.installed);
    assert.deepEqual(prompts, []);
    assert.equal(installCalls, 0);
  });

  it("does not install incompatible startup updates", async function () {
    const prompts: string[] = [];
    const alerts: string[] = [];
    let installCalls = 0;
    const result = await promptOfficialWorkflowPackageUpdateOnStartup({
      win: {
        confirm: (message: string) => {
          prompts.push(message);
          return true;
        },
        alert: (message: string) => {
          alerts.push(message);
        },
      } as unknown as _ZoteroTypes.MainWindow,
      check: async () =>
        ({
          ok: true,
          status: {
            channel: "stable",
            installed: {
              feed_revision: "rev-1",
              package: {
                id: "official-content",
                version: "1.0.0",
                artifact: { sha256: "sha256:old" },
              },
            },
          },
          feed: { channel: "stable", revision: "rev-2" },
          package: {
            id: "official-content",
            version: "1.1.0",
            artifact: { sha256: "sha256:new" },
          },
          updateAvailable: true,
          compatible: false,
          incompatibility: {
            code: "plugin_version_unsupported",
            requirement: ">=99.0.0",
            actual: "0.4.0",
            message: "Plugin version 0.4.0 does not satisfy >=99.0.0",
          },
          selectedFeedUrl: "https://primary.example/stable/feed.json",
          failures: [],
          artifactFeedUrls: ["https://primary.example/stable/feed.json"],
        }) as any,
      install: async () => {
        installCalls += 1;
        return {
          ok: true,
          status: {} as any,
          installed: {} as any,
        };
      },
      onInstalled: () => {},
    });

    assert.isTrue(result.prompted);
    assert.isFalse(result.installed);
    assert.deepEqual(prompts, []);
    assert.lengthOf(alerts, 1);
    assert.include(alerts[0], ">=99.0.0");
    assert.equal(installCalls, 0);
  });
});
