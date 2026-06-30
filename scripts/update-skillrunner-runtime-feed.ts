import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import semver from "semver";

type RuntimeFeedMatch = {
  plugin: string;
  skillrunner: string;
};

type RuntimeFeedDocument = {
  schema: "zotero-agents.skillrunner-runtime-feed.v1";
  revision: string;
  updated_at: string;
  matches: RuntimeFeedMatch[];
};

const FEED_SCHEMA = "zotero-agents.skillrunner-runtime-feed.v1" as const;
const DEFAULT_OUT = "feeds/skillrunner-runtime/feed.json";

function argValue(name: string) {
  const prefix = `${name}=`;
  const inline = process.argv.find((entry) => entry.startsWith(prefix));
  if (inline) {
    return inline.slice(prefix.length);
  }
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || "" : "";
}

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function normalizeSkillRunnerVersion(value: string) {
  const normalized = normalizeString(value);
  const withoutPrefix = normalized.replace(/^v/i, "");
  if (!normalized || !semver.valid(withoutPrefix)) {
    throw new Error(`--skillrunner must be a v-prefixed semver tag: ${value}`);
  }
  return `v${withoutPrefix}`;
}

function normalizePluginRange(value: string) {
  const normalized = normalizeString(value);
  if (!normalized || !semver.validRange(normalized)) {
    throw new Error(`--plugin must be a valid semver range: ${value}`);
  }
  return normalized;
}

function buildRevision(date: Date) {
  return date
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z")
    .replace(/[-:]/g, "")
    .replace("T", "-")
    .replace("Z", "");
}

function normalizeFeed(raw: unknown): RuntimeFeedDocument {
  const feed = raw as Partial<RuntimeFeedDocument> | undefined;
  if (!feed || feed.schema !== FEED_SCHEMA) {
    throw new Error("existing runtime feed schema is invalid");
  }
  const matches = Array.isArray(feed.matches)
    ? feed.matches.map((entry) => ({
        plugin: normalizePluginRange(entry.plugin),
        skillrunner: normalizeSkillRunnerVersion(entry.skillrunner),
      }))
    : [];
  return {
    schema: FEED_SCHEMA,
    revision: normalizeString(feed.revision),
    updated_at: normalizeString(feed.updated_at),
    matches,
  };
}

async function readFeed(filePath: string): Promise<RuntimeFeedDocument> {
  try {
    return normalizeFeed(JSON.parse(await fs.readFile(filePath, "utf8")));
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") {
      return {
        schema: FEED_SCHEMA,
        revision: "",
        updated_at: "",
        matches: [],
      };
    }
    throw error;
  }
}

export async function updateSkillRunnerRuntimeFeed(args: {
  outPath: string;
  pluginRange: string;
  skillRunnerVersion: string;
  now?: Date;
}) {
  const plugin = normalizePluginRange(args.pluginRange);
  const skillrunner = normalizeSkillRunnerVersion(args.skillRunnerVersion);
  const feed = await readFeed(args.outPath);
  const existingIndex = feed.matches.findIndex(
    (entry) => entry.plugin === plugin,
  );
  if (existingIndex >= 0) {
    feed.matches[existingIndex] = {
      plugin,
      skillrunner,
    };
  } else {
    feed.matches.push({
      plugin,
      skillrunner,
    });
  }
  feed.matches.sort((left, right) => left.plugin.localeCompare(right.plugin));
  const now = args.now || new Date();
  feed.updated_at = now.toISOString();
  feed.revision = buildRevision(now);
  await fs.mkdir(path.dirname(args.outPath), { recursive: true });
  await fs.writeFile(
    args.outPath,
    `${JSON.stringify(feed, null, 2)}\n`,
    "utf8",
  );
  return feed;
}

async function main() {
  const pluginRange = argValue("--plugin");
  const skillRunnerVersion = argValue("--skillrunner");
  const outPath = argValue("--out") || DEFAULT_OUT;
  if (!pluginRange || !skillRunnerVersion) {
    throw new Error(
      'Usage: tsx scripts/update-skillrunner-runtime-feed.ts --plugin ">=0.5.0 <0.6.0" --skillrunner v0.7.3 [--out path]',
    );
  }
  const feed = await updateSkillRunnerRuntimeFeed({
    outPath,
    pluginRange,
    skillRunnerVersion,
  });
  console.log(
    `[skillrunner-runtime-feed] updated ${outPath}: revision=${feed.revision} matches=${feed.matches.length}`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
