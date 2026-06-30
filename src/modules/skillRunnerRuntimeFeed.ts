import semver from "semver";
import pkg from "../../package.json";
import { getPref, setPref } from "../utils/prefs";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export const SKILLRUNNER_RUNTIME_FEED_SCHEMA =
  "zotero-agents.skillrunner-runtime-feed.v1";
const SKILLRUNNER_RUNTIME_FEED_CACHE_SCHEMA =
  "zotero-agents.skillrunner-runtime-feed-cache.v1";

export const DEFAULT_SKILLRUNNER_RUNTIME_FEED_URL =
  "https://raw.githubusercontent.com/leike0813/zotero-agents/main/feeds/skillrunner-runtime/feed.json";
export const DEFAULT_SKILLRUNNER_RUNTIME_FEED_FALLBACK_URL =
  "https://gitee.com/leike0813/zotero-agents/raw/main/feeds/skillrunner-runtime/feed.json";

export const BUILTIN_SKILLRUNNER_RUNTIME_VERSION = "v0.7.2";

export type SkillRunnerRuntimeFeedMatch = {
  plugin: string;
  skillrunner: string;
};

export type SkillRunnerRuntimeFeedDocument = {
  schema: typeof SKILLRUNNER_RUNTIME_FEED_SCHEMA;
  revision: string;
  updated_at: string;
  matches: SkillRunnerRuntimeFeedMatch[];
};

type SkillRunnerRuntimeFeedCache = {
  schema: typeof SKILLRUNNER_RUNTIME_FEED_CACHE_SCHEMA;
  fetched_at: string;
  source_url: string;
  feed: SkillRunnerRuntimeFeedDocument;
};

export type SkillRunnerRuntimeVersionSource =
  | "override"
  | "primary"
  | "fallback"
  | "cache"
  | "builtin";

export type SkillRunnerRuntimeVersionResolution = {
  version: string;
  source: SkillRunnerRuntimeVersionSource;
  feedUrl?: string;
  revision?: string;
  failures: Array<{ source: string; url?: string; reason: string }>;
};

export const BUILTIN_SKILLRUNNER_RUNTIME_FEED: SkillRunnerRuntimeFeedDocument =
  {
    schema: SKILLRUNNER_RUNTIME_FEED_SCHEMA,
    revision: "builtin-0.5.x",
    updated_at: "2026-06-30T00:00:00Z",
    matches: [
      {
        plugin: ">=0.5.0 <0.6.0",
        skillrunner: BUILTIN_SKILLRUNNER_RUNTIME_VERSION,
      },
    ],
  };

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function normalizePluginVersion(value: unknown) {
  const raw = normalizeString(value);
  return semver.valid(raw) || semver.valid(raw.replace(/^v/i, "")) || "";
}

function compactError(error: unknown) {
  return error instanceof Error
    ? error.message
    : normalizeString(error) || "unknown error";
}

function getRuntimeFetch(args?: { fetchImpl?: FetchLike }) {
  const runtime = globalThis as { fetch?: FetchLike };
  return args?.fetchImpl || runtime.fetch;
}

function configuredFeedUrl(prefKey: "skillRunnerRuntimeFeedUrl") {
  return (
    normalizeString(getPref(prefKey)) || DEFAULT_SKILLRUNNER_RUNTIME_FEED_URL
  );
}

function configuredFallbackFeedUrl(
  prefKey: "skillRunnerRuntimeFeedFallbackUrl",
) {
  return (
    normalizeString(getPref(prefKey)) ||
    DEFAULT_SKILLRUNNER_RUNTIME_FEED_FALLBACK_URL
  );
}

export function normalizeSkillRunnerRuntimeFeedDocument(
  raw: unknown,
): SkillRunnerRuntimeFeedDocument {
  const feed = raw as Partial<SkillRunnerRuntimeFeedDocument> | undefined;
  if (!feed || feed.schema !== SKILLRUNNER_RUNTIME_FEED_SCHEMA) {
    throw new Error("skillrunner runtime feed schema is invalid");
  }
  const revision = normalizeString(feed.revision);
  const updatedAt = normalizeString(feed.updated_at);
  if (!revision) {
    throw new Error("skillrunner runtime feed revision is missing");
  }
  if (!updatedAt) {
    throw new Error("skillrunner runtime feed updated_at is missing");
  }
  const matches = Array.isArray(feed.matches)
    ? feed.matches
        .map((entry) => ({
          plugin: normalizeString(entry?.plugin),
          skillrunner: normalizeString(entry?.skillrunner),
        }))
        .filter((entry) => entry.plugin && entry.skillrunner)
    : [];
  if (matches.length === 0) {
    throw new Error("skillrunner runtime feed matches is empty");
  }
  return {
    schema: SKILLRUNNER_RUNTIME_FEED_SCHEMA,
    revision,
    updated_at: updatedAt,
    matches,
  };
}

export function selectSkillRunnerRuntimeVersionFromFeed(args: {
  feed: SkillRunnerRuntimeFeedDocument;
  pluginVersion?: string;
}) {
  const pluginVersion = normalizePluginVersion(
    args.pluginVersion || pkg.version,
  );
  if (!pluginVersion) {
    return "";
  }
  for (const entry of args.feed.matches) {
    if (
      semver.validRange(entry.plugin) &&
      semver.satisfies(pluginVersion, entry.plugin, { includePrerelease: true })
    ) {
      return entry.skillrunner;
    }
  }
  return "";
}

function readCachedRuntimeFeed() {
  const raw = normalizeString(getPref("skillRunnerRuntimeFeedCacheJson"));
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<SkillRunnerRuntimeFeedCache>;
    if (parsed.schema !== SKILLRUNNER_RUNTIME_FEED_CACHE_SCHEMA) {
      return null;
    }
    return {
      schema: SKILLRUNNER_RUNTIME_FEED_CACHE_SCHEMA,
      fetched_at: normalizeString(parsed.fetched_at),
      source_url: normalizeString(parsed.source_url),
      feed: normalizeSkillRunnerRuntimeFeedDocument(parsed.feed),
    } as SkillRunnerRuntimeFeedCache;
  } catch {
    return null;
  }
}

function writeCachedRuntimeFeed(args: {
  sourceUrl: string;
  feed: SkillRunnerRuntimeFeedDocument;
}) {
  const cache: SkillRunnerRuntimeFeedCache = {
    schema: SKILLRUNNER_RUNTIME_FEED_CACHE_SCHEMA,
    fetched_at: new Date().toISOString(),
    source_url: args.sourceUrl,
    feed: args.feed,
  };
  setPref("skillRunnerRuntimeFeedCacheJson", JSON.stringify(cache));
}

async function fetchRuntimeFeed(args: { url: string; fetchImpl: FetchLike }) {
  const response = await args.fetchImpl(args.url, {
    method: "GET",
  });
  if (!response.ok) {
    throw new Error(`runtime feed request failed: ${response.status}`);
  }
  return normalizeSkillRunnerRuntimeFeedDocument(await response.json());
}

export async function resolveSkillRunnerRuntimeVersion(args?: {
  explicitVersion?: string;
  pluginVersion?: string;
  fetchImpl?: FetchLike;
}): Promise<SkillRunnerRuntimeVersionResolution> {
  const explicitVersion = normalizeString(args?.explicitVersion);
  if (explicitVersion) {
    return {
      version: explicitVersion,
      source: "override",
      failures: [],
    };
  }

  const failures: SkillRunnerRuntimeVersionResolution["failures"] = [];
  const fetchImpl = getRuntimeFetch(args);
  const sources = [
    {
      source: "primary" as const,
      url: configuredFeedUrl("skillRunnerRuntimeFeedUrl"),
    },
    {
      source: "fallback" as const,
      url: configuredFallbackFeedUrl("skillRunnerRuntimeFeedFallbackUrl"),
    },
  ];

  if (fetchImpl) {
    for (const source of sources) {
      try {
        const feed = await fetchRuntimeFeed({
          url: source.url,
          fetchImpl,
        });
        const version = selectSkillRunnerRuntimeVersionFromFeed({
          feed,
          pluginVersion: args?.pluginVersion,
        });
        if (!version) {
          failures.push({
            source: source.source,
            url: source.url,
            reason: "no matching plugin version range",
          });
          continue;
        }
        writeCachedRuntimeFeed({
          sourceUrl: source.url,
          feed,
        });
        return {
          version,
          source: source.source,
          feedUrl: source.url,
          revision: feed.revision,
          failures,
        };
      } catch (error) {
        failures.push({
          source: source.source,
          url: source.url,
          reason: compactError(error),
        });
      }
    }
  } else {
    failures.push({
      source: "remote",
      reason: "fetch is unavailable",
    });
  }

  const cached = readCachedRuntimeFeed();
  if (cached) {
    const version = selectSkillRunnerRuntimeVersionFromFeed({
      feed: cached.feed,
      pluginVersion: args?.pluginVersion,
    });
    if (version) {
      return {
        version,
        source: "cache",
        feedUrl: cached.source_url,
        revision: cached.feed.revision,
        failures,
      };
    }
    failures.push({
      source: "cache",
      url: cached.source_url,
      reason: "no matching plugin version range",
    });
  }

  const builtinVersion = selectSkillRunnerRuntimeVersionFromFeed({
    feed: BUILTIN_SKILLRUNNER_RUNTIME_FEED,
    pluginVersion: args?.pluginVersion,
  });
  return {
    version: builtinVersion || BUILTIN_SKILLRUNNER_RUNTIME_VERSION,
    source: "builtin",
    revision: BUILTIN_SKILLRUNNER_RUNTIME_FEED.revision,
    failures,
  };
}
