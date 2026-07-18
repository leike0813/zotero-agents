import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readZoteroBridgeCliRelease } from "./zotero-bridge-cli-release";

export const ZOTERO_LIBRARY_AGENT_BUNDLE_VERSION_SOURCE_PATH =
  "skills_src/zotero-library-agent/bundle-version.json";
export const ZOTERO_LIBRARY_AGENT_BUNDLE_VERSION_SCHEMA =
  "zotero-library-agent.bundle.version.v1";

export type ZoteroLibraryAgentBundleVersionSource = {
  schema: typeof ZOTERO_LIBRARY_AGENT_BUNDLE_VERSION_SCHEMA;
  cliMajorMinor: string;
  patch: number;
};

export type ZoteroLibraryAgentBundleVersion = {
  cliMajorMinor: string;
  cliVersion: string;
  patch: number;
  version: string;
};

function parseCliVersion(valueRaw: string) {
  const value = String(valueRaw || "").trim();
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+][0-9A-Za-z.-]+)?$/.exec(value);
  if (!match) {
    throw new Error(`Unsupported zotero-bridge CLI version: ${valueRaw}`);
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    majorMinor: `${Number(match[1])}.${Number(match[2])}`,
  };
}

function parseCliMajorMinor(valueRaw: unknown) {
  const value = String(valueRaw || "").trim();
  const match = /^(\d+)\.(\d+)$/.exec(value);
  if (!match) {
    throw new Error(`Invalid bundle CLI major/minor scope: ${valueRaw}`);
  }
  return `${Number(match[1])}.${Number(match[2])}`;
}

export function parseZoteroLibraryAgentBundleVersionSource(
  value: unknown,
): ZoteroLibraryAgentBundleVersionSource {
  const source = (value ||
    {}) as Partial<ZoteroLibraryAgentBundleVersionSource>;
  if (source.schema !== ZOTERO_LIBRARY_AGENT_BUNDLE_VERSION_SCHEMA) {
    throw new Error(
      `${ZOTERO_LIBRARY_AGENT_BUNDLE_VERSION_SOURCE_PATH} has an unsupported schema`,
    );
  }
  if (!Number.isSafeInteger(source.patch) || Number(source.patch) < 0) {
    throw new Error(
      `${ZOTERO_LIBRARY_AGENT_BUNDLE_VERSION_SOURCE_PATH} patch must be a non-negative integer`,
    );
  }
  return {
    schema: ZOTERO_LIBRARY_AGENT_BUNDLE_VERSION_SCHEMA,
    cliMajorMinor: parseCliMajorMinor(source.cliMajorMinor),
    patch: Number(source.patch),
  };
}

export function resolveZoteroLibraryAgentBundleVersion(args: {
  cliVersion: string;
  source: ZoteroLibraryAgentBundleVersionSource;
}): ZoteroLibraryAgentBundleVersion {
  const cli = parseCliVersion(args.cliVersion);
  const patch =
    args.source.cliMajorMinor === cli.majorMinor ? args.source.patch : 0;
  return {
    cliMajorMinor: cli.majorMinor,
    cliVersion: String(args.cliVersion).trim(),
    patch,
    version: `${cli.major}.${cli.minor}.${patch}`,
  };
}

export function bumpZoteroLibraryAgentBundleVersionSource(args: {
  cliVersion: string;
  source: ZoteroLibraryAgentBundleVersionSource;
}): ZoteroLibraryAgentBundleVersionSource {
  const resolved = resolveZoteroLibraryAgentBundleVersion(args);
  return {
    schema: ZOTERO_LIBRARY_AGENT_BUNDLE_VERSION_SCHEMA,
    cliMajorMinor: resolved.cliMajorMinor,
    patch: resolved.patch + 1,
  };
}

export function readZoteroLibraryAgentBundleVersionSource(
  root = process.cwd(),
) {
  return parseZoteroLibraryAgentBundleVersionSource(
    JSON.parse(
      readFileSync(
        resolve(root, ZOTERO_LIBRARY_AGENT_BUNDLE_VERSION_SOURCE_PATH),
        "utf8",
      ),
    ),
  );
}

export function inspectZoteroLibraryAgentBundleVersion(root = process.cwd()) {
  const source = readZoteroLibraryAgentBundleVersionSource(root);
  const cliRelease = readZoteroBridgeCliRelease(root);
  return {
    source,
    resolved: resolveZoteroLibraryAgentBundleVersion({
      cliVersion: cliRelease.version,
      source,
    }),
  };
}

export function writeZoteroLibraryAgentBundleVersionSource(args: {
  root?: string;
  source: ZoteroLibraryAgentBundleVersionSource;
}) {
  writeFileSync(
    resolve(
      args.root || process.cwd(),
      ZOTERO_LIBRARY_AGENT_BUNDLE_VERSION_SOURCE_PATH,
    ),
    `${JSON.stringify(args.source, null, 2)}\n`,
    "utf8",
  );
}

function isMainModule() {
  return process.argv[1]
    ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
    : false;
}

if (isMainModule()) {
  const root = process.cwd();
  const inspected = inspectZoteroLibraryAgentBundleVersion(root);
  if (process.argv.includes("--bump") || process.argv.includes("--align-cli")) {
    const source = process.argv.includes("--align-cli")
      ? {
          schema: ZOTERO_LIBRARY_AGENT_BUNDLE_VERSION_SCHEMA,
          cliMajorMinor: inspected.resolved.cliMajorMinor,
          patch: 0,
        }
      : bumpZoteroLibraryAgentBundleVersionSource({
          cliVersion: inspected.resolved.cliVersion,
          source: inspected.source,
        });
    writeZoteroLibraryAgentBundleVersionSource({ root, source });
    process.stdout.write(
      `${JSON.stringify(
        {
          source,
          resolved: resolveZoteroLibraryAgentBundleVersion({
            cliVersion: inspected.resolved.cliVersion,
            source,
          }),
        },
        null,
        2,
      )}\n`,
    );
  } else {
    process.stdout.write(`${JSON.stringify(inspected, null, 2)}\n`);
  }
}
