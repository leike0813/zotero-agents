import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readZoteroBridgeCliRelease } from "./zotero-bridge-cli-release";

export const ZOTERO_LIBRARIAN_PROFILE_VERSION_SOURCE_PATH =
  "profiles_src/hermes/zotero-librarian/profile-version.json";
export const ZOTERO_LIBRARIAN_PROFILE_VERSION_SCHEMA =
  "zotero-librarian.profile.version.v1";

export type ZoteroLibrarianProfileVersionSource = {
  schema: typeof ZOTERO_LIBRARIAN_PROFILE_VERSION_SCHEMA;
  cliMajorMinor: string;
  patch: number;
};

export type ZoteroLibrarianProfileVersion = {
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
    majorMinor: `${match[1]}.${match[2]}`,
  };
}

function parseCliMajorMinor(valueRaw: unknown) {
  const value = String(valueRaw || "").trim();
  const match = /^(\d+)\.(\d+)$/.exec(value);
  if (!match) {
    throw new Error(`Invalid Profile CLI major/minor scope: ${valueRaw}`);
  }
  return `${Number(match[1])}.${Number(match[2])}`;
}

export function parseZoteroLibrarianProfileVersionSource(
  value: unknown,
): ZoteroLibrarianProfileVersionSource {
  const source = (value || {}) as Partial<ZoteroLibrarianProfileVersionSource>;
  if (source.schema !== ZOTERO_LIBRARIAN_PROFILE_VERSION_SCHEMA) {
    throw new Error(
      `${ZOTERO_LIBRARIAN_PROFILE_VERSION_SOURCE_PATH} has an unsupported schema`,
    );
  }
  if (!Number.isSafeInteger(source.patch) || (source.patch || 0) < 0) {
    throw new Error(
      `${ZOTERO_LIBRARIAN_PROFILE_VERSION_SOURCE_PATH} patch must be a non-negative integer`,
    );
  }
  return {
    schema: ZOTERO_LIBRARIAN_PROFILE_VERSION_SCHEMA,
    cliMajorMinor: parseCliMajorMinor(source.cliMajorMinor),
    patch: source.patch,
  };
}

export function resolveZoteroLibrarianProfileVersion(args: {
  cliVersion: string;
  source: ZoteroLibrarianProfileVersionSource;
}): ZoteroLibrarianProfileVersion {
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

export function bumpZoteroLibrarianProfileVersionSource(args: {
  cliVersion: string;
  source: ZoteroLibrarianProfileVersionSource;
}): ZoteroLibrarianProfileVersionSource {
  const resolved = resolveZoteroLibrarianProfileVersion(args);
  return {
    schema: ZOTERO_LIBRARIAN_PROFILE_VERSION_SCHEMA,
    cliMajorMinor: resolved.cliMajorMinor,
    patch: resolved.patch + 1,
  };
}

export function readZoteroLibrarianProfileVersionSource(root = process.cwd()) {
  return parseZoteroLibrarianProfileVersionSource(
    JSON.parse(
      readFileSync(
        resolve(root, ZOTERO_LIBRARIAN_PROFILE_VERSION_SOURCE_PATH),
        "utf8",
      ),
    ),
  );
}

export function inspectZoteroLibrarianProfileVersion(root = process.cwd()) {
  const source = readZoteroLibrarianProfileVersionSource(root);
  const cliRelease = readZoteroBridgeCliRelease(root);
  return {
    source,
    resolved: resolveZoteroLibrarianProfileVersion({
      cliVersion: cliRelease.version,
      source,
    }),
  };
}

export function writeZoteroLibrarianProfileVersionSource(args: {
  root?: string;
  source: ZoteroLibrarianProfileVersionSource;
}) {
  writeFileSync(
    resolve(
      args.root || process.cwd(),
      ZOTERO_LIBRARIAN_PROFILE_VERSION_SOURCE_PATH,
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
  const inspected = inspectZoteroLibrarianProfileVersion(root);
  if (process.argv.includes("--bump")) {
    const source = bumpZoteroLibrarianProfileVersionSource({
      cliVersion: inspected.resolved.cliVersion,
      source: inspected.source,
    });
    writeZoteroLibrarianProfileVersionSource({ root, source });
    process.stdout.write(
      `${JSON.stringify(
        {
          source,
          resolved: resolveZoteroLibrarianProfileVersion({
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
