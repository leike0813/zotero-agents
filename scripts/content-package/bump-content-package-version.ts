import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";

import semver from "semver";
import {
  parseContentPackageChannels,
  type ContentPackageChannel,
} from "./content-package-channels";
import { resolveContentPackageVersion } from "./content-package-version";

const VERSION_FILE = "content-package.version.json";
const BUMP_KINDS = new Set(["patch", "minor", "major"]);

export function resolveContentPackageVersionBump(args: {
  currentVersion: string;
  target: string;
  channel?: ContentPackageChannel;
}) {
  const current = semver.valid(args.currentVersion);
  if (!current) {
    throw new Error(
      `Current content package version is invalid: ${args.currentVersion}`,
    );
  }

  const target = args.target.trim();
  if (!BUMP_KINDS.has(target)) {
    resolveContentPackageVersion(
      { version: target, dev_version: target },
      args.channel || "stable",
    );
  }
  const next =
    args.channel === "dev" && target === "patch"
      ? semver.inc(current, "prerelease", "dev")
      : BUMP_KINDS.has(target)
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
  resolveContentPackageVersion(
    { version: next, dev_version: next },
    args.channel || "stable",
  );
  return next;
}

export async function bumpContentPackageVersion(args: {
  filePath?: string;
  target: string;
  pluginVersion?: string;
  channel?: ContentPackageChannel;
}) {
  const filePath = args.filePath || VERSION_FILE;
  const raw = await fs.readFile(filePath, "utf8");
  const descriptor = JSON.parse(raw) as Record<string, unknown>;
  const channel = args.channel || "stable";
  const currentVersion = resolveContentPackageVersion(descriptor, channel);
  const nextVersion = resolveContentPackageVersionBump({
    currentVersion,
    target: args.target,
    channel,
  });
  descriptor[channel === "dev" ? "dev_version" : "version"] = nextVersion;
  if (args.pluginVersion) {
    const requires =
      (descriptor.requires as Record<string, unknown> | undefined) ?? {};
    requires.plugin = args.pluginVersion;
    descriptor.requires = requires;
  }
  await fs.writeFile(filePath, `${JSON.stringify(descriptor, null, 2)}\n`);
  return { previousVersion: currentVersion, version: nextVersion };
}

function usage() {
  return [
    "Usage: npm run bump:content-package -- <patch|minor|major|version> [--channel stable|beta|dev]",
    "",
    "Examples:",
    "  npm run bump:content-package -- patch",
    "  npm run bump:content-package -- 0.2.0",
    "  npm run bump:content-package -- patch --channel dev",
  ].join("\n");
}

async function main() {
  const target = String(process.argv[2] || "").trim();
  if (!target || target === "--help" || target === "-h") {
    console.log(usage());
    process.exit(target ? 0 : 1);
  }
  const options = process.argv.slice(3);
  let channel: ContentPackageChannel = "stable";
  if (options.length) {
    const raw =
      options[0] === "--channel" && options.length === 2
        ? options[1]
        : options.length === 1 && options[0].startsWith("--channel=")
          ? options[0].slice("--channel=".length)
          : "";
    const selected = parseContentPackageChannels(raw);
    if (selected.length !== 1)
      throw new Error("--channel requires one channel");
    channel = selected[0];
  }
  const result = await bumpContentPackageVersion({ target, channel });
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
