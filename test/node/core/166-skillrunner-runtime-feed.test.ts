import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { config } from "../../../package.json";
import {
  BUILTIN_SKILLRUNNER_RUNTIME_VERSION,
  resolveSkillRunnerRuntimeVersion,
  selectSkillRunnerRuntimeVersionFromFeed,
  SKILLRUNNER_RUNTIME_FEED_SCHEMA,
  type SkillRunnerRuntimeFeedDocument,
} from "../../../src/modules/skillRunnerRuntimeFeed";
import { updateSkillRunnerRuntimeFeed } from "../../../scripts/update-skillrunner-runtime-feed";

const feedUrlPrefKey = `${config.prefsPrefix}.skillRunnerRuntimeFeedUrl`;
const fallbackFeedUrlPrefKey = `${config.prefsPrefix}.skillRunnerRuntimeFeedFallbackUrl`;
const feedCachePrefKey = `${config.prefsPrefix}.skillRunnerRuntimeFeedCacheJson`;
const versionPrefKey = `${config.prefsPrefix}.skillRunnerLocalRuntimeVersion`;

function feed(args?: {
  revision?: string;
  matches?: Array<{ plugin: string; skillrunner: string }>;
}): SkillRunnerRuntimeFeedDocument {
  return {
    schema: SKILLRUNNER_RUNTIME_FEED_SCHEMA,
    revision: args?.revision || "test-feed",
    updated_at: "2026-06-30T00:00:00Z",
    matches: args?.matches || [
      {
        plugin: ">=0.5.0 <0.6.0",
        skillrunner: "v0.7.3",
      },
    ],
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

describe("skillrunner runtime feed", function () {
  let prevFeedUrl: unknown;
  let prevFallbackFeedUrl: unknown;
  let prevFeedCache: unknown;
  let prevVersion: unknown;
  let prevFetch: unknown;

  beforeEach(function () {
    prevFeedUrl = Zotero.Prefs.get(feedUrlPrefKey, true);
    prevFallbackFeedUrl = Zotero.Prefs.get(fallbackFeedUrlPrefKey, true);
    prevFeedCache = Zotero.Prefs.get(feedCachePrefKey, true);
    prevVersion = Zotero.Prefs.get(versionPrefKey, true);
    prevFetch = (globalThis as { fetch?: unknown }).fetch;
    Zotero.Prefs.set(
      feedUrlPrefKey,
      "https://example.invalid/primary.json",
      true,
    );
    Zotero.Prefs.set(
      fallbackFeedUrlPrefKey,
      "https://example.invalid/fallback.json",
      true,
    );
    Zotero.Prefs.clear(feedCachePrefKey, true);
    Zotero.Prefs.clear(versionPrefKey, true);
  });

  afterEach(function () {
    if (typeof prevFeedUrl === "undefined") {
      Zotero.Prefs.clear(feedUrlPrefKey, true);
    } else {
      Zotero.Prefs.set(feedUrlPrefKey, prevFeedUrl, true);
    }
    if (typeof prevFallbackFeedUrl === "undefined") {
      Zotero.Prefs.clear(fallbackFeedUrlPrefKey, true);
    } else {
      Zotero.Prefs.set(fallbackFeedUrlPrefKey, prevFallbackFeedUrl, true);
    }
    if (typeof prevFeedCache === "undefined") {
      Zotero.Prefs.clear(feedCachePrefKey, true);
    } else {
      Zotero.Prefs.set(feedCachePrefKey, prevFeedCache, true);
    }
    if (typeof prevVersion === "undefined") {
      Zotero.Prefs.clear(versionPrefKey, true);
    } else {
      Zotero.Prefs.set(versionPrefKey, prevVersion, true);
    }
    if (typeof prevFetch === "undefined") {
      delete (globalThis as { fetch?: unknown }).fetch;
    } else {
      (globalThis as { fetch?: unknown }).fetch = prevFetch;
    }
  });

  it("selects a skillrunner version by plugin semver range", function () {
    assert.equal(
      selectSkillRunnerRuntimeVersionFromFeed({
        feed: feed(),
        pluginVersion: "0.5.4",
      }),
      "v0.7.3",
    );
  });

  it("uses primary feed when available", async function () {
    const requested: string[] = [];
    const fetchImpl = async (url: string) => {
      requested.push(url);
      return jsonResponse(feed({ revision: "primary" }));
    };

    const resolved = await resolveSkillRunnerRuntimeVersion({
      pluginVersion: "0.5.4",
      fetchImpl,
    });

    assert.equal(resolved.version, "v0.7.3");
    assert.equal(resolved.source, "primary");
    assert.deepEqual(requested, ["https://example.invalid/primary.json"]);
  });

  it("uses fallback feed when primary fails", async function () {
    const requested: string[] = [];
    const fetchImpl = async (url: string) => {
      requested.push(url);
      if (url.includes("primary")) {
        return jsonResponse({ error: "nope" }, 503);
      }
      return jsonResponse(
        feed({
          revision: "fallback",
          matches: [{ plugin: ">=0.5.0 <0.6.0", skillrunner: "v0.7.4" }],
        }),
      );
    };

    const resolved = await resolveSkillRunnerRuntimeVersion({
      pluginVersion: "0.5.4",
      fetchImpl,
    });

    assert.equal(resolved.version, "v0.7.4");
    assert.equal(resolved.source, "fallback");
    assert.deepEqual(requested, [
      "https://example.invalid/primary.json",
      "https://example.invalid/fallback.json",
    ]);
  });

  it("uses cached feed when remote feeds fail", async function () {
    Zotero.Prefs.set(
      feedCachePrefKey,
      JSON.stringify({
        schema: "zotero-agents.skillrunner-runtime-feed-cache.v1",
        fetched_at: "2026-06-30T00:00:00Z",
        source_url: "https://example.invalid/cached.json",
        feed: feed({
          revision: "cached",
          matches: [{ plugin: ">=0.5.0 <0.6.0", skillrunner: "v0.7.5" }],
        }),
      }),
      true,
    );
    const fetchImpl = async () => jsonResponse({ error: "nope" }, 503);

    const resolved = await resolveSkillRunnerRuntimeVersion({
      pluginVersion: "0.5.4",
      fetchImpl,
    });

    assert.equal(resolved.version, "v0.7.5");
    assert.equal(resolved.source, "cache");
  });

  it("uses embedded fallback when remote and cache are unavailable", async function () {
    const fetchImpl = async () => jsonResponse({ error: "nope" }, 503);

    const resolved = await resolveSkillRunnerRuntimeVersion({
      pluginVersion: "0.5.4",
      fetchImpl,
    });

    assert.equal(resolved.version, BUILTIN_SKILLRUNNER_RUNTIME_VERSION);
    assert.equal(resolved.source, "builtin");
  });

  it("uses hidden explicit override before remote feeds", async function () {
    const fetchImpl = async () => {
      throw new Error("should not fetch");
    };

    const resolved = await resolveSkillRunnerRuntimeVersion({
      explicitVersion: "v0.8.0",
      pluginVersion: "0.5.4",
      fetchImpl,
    });

    assert.equal(resolved.version, "v0.8.0");
    assert.equal(resolved.source, "override");
  });
});

describe("update skillrunner runtime feed script", function () {
  it("adds and replaces plugin range entries with stable JSON output", async function () {
    const tmp = await fs.mkdtemp(
      path.join(os.tmpdir(), "skillrunner-runtime-feed-"),
    );
    const outPath = path.join(tmp, "feed.json");

    await updateSkillRunnerRuntimeFeed({
      outPath,
      pluginRange: ">=0.5.0 <0.6.0",
      skillRunnerVersion: "v0.7.3",
      now: new Date("2026-06-30T00:00:00Z"),
    });
    await updateSkillRunnerRuntimeFeed({
      outPath,
      pluginRange: ">=0.5.0 <0.6.0",
      skillRunnerVersion: "v0.7.4",
      now: new Date("2026-06-30T00:01:00Z"),
    });
    await updateSkillRunnerRuntimeFeed({
      outPath,
      pluginRange: ">=0.6.0 <0.7.0",
      skillRunnerVersion: "v0.8.0",
      now: new Date("2026-06-30T00:02:00Z"),
    });

    const parsed = JSON.parse(await fs.readFile(outPath, "utf8")) as {
      matches: Array<{ plugin: string; skillrunner: string }>;
    };
    assert.deepEqual(parsed.matches, [
      { plugin: ">=0.5.0 <0.6.0", skillrunner: "v0.7.4" },
      { plugin: ">=0.6.0 <0.7.0", skillrunner: "v0.8.0" },
    ]);
  });
});
