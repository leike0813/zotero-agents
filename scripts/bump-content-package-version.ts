import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";

import semver from "semver";

const VERSION_FILE = "content-package.version.json";
const BUMP_KINDS = new Set(["patch", "minor", "major"]);

export function resolveContentPackageVersionBump(args: {
  currentVersion: string;
  target: string;
}) {
  const current = semver.valid(args.currentVersion);
  if (!current) {
    throw new Error(
      `Current content package version is invalid: ${args.currentVersion}`,
    );
  }

  const target = args.target.trim();
  const next = BUMP_KINDS.has(target)
    ? semver.inc(current, target as semver.ReleaseType)
    : semver.valid(target);
  if (!next) {
    throw new Error(
      `Version bump must be patch, minor, major, or a valid semver version: ${args.target}`,
    );
  }
  if (semver.lte(next, current)) {
    throw new Error(
      `Target content package version ${next} must be greater than ${current}`,
    );
  }
  return next;
}

export async function bumpContentPackageVersion(args: {
  filePath?: string;
  target: string;
}) {
  const filePath = args.filePath || VERSION_FILE;
  const raw = await fs.readFile(filePath, "utf8");
  const descriptor = JSON.parse(raw) as Record<string, unknown>;
  const currentVersion = String(descriptor.version || "").trim();
  const nextVersion = resolveContentPackageVersionBump({
    currentVersion,
    target: args.target,
  });
  descriptor.version = nextVersion;
  await fs.writeFile(filePath, `${JSON.stringify(descriptor, null, 2)}\n`);
  return { previousVersion: currentVersion, version: nextVersion };
}

function usage() {
  return [
    "Usage: npm run bump:content-package -- <patch|minor|major|version>",
    "",
    "Examples:",
    "  npm run bump:content-package -- patch",
    "  npm run bump:content-package -- 0.2.0",
  ].join("\n");
}

async function main() {
  const target = String(process.argv[2] || "").trim();
  if (!target || target === "--help" || target === "-h") {
    console.log(usage());
    process.exit(target ? 0 : 1);
  }
  const result = await bumpContentPackageVersion({ target });
  console.log(
    `[content-package] version ${result.previousVersion} -> ${result.version}`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
