import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";
import semver from "semver";

import {
  parseContentPackageChannels,
  type ContentPackageChannel,
} from "./content-package-channels";

export function resolveContentPackageVersion(
  descriptor: { version?: unknown; dev_version?: unknown },
  channel: ContentPackageChannel,
  override?: string,
) {
  const field = channel === "dev" ? "dev_version" : "version";
  const version = String(override || descriptor[field] || "").trim();
  const parsed = semver.parse(version);
  const valid =
    parsed &&
    (channel === "dev"
      ? parsed.version === version &&
        !parsed.build.length &&
        parsed.prerelease.length === 2 &&
        parsed.prerelease[0] === "dev" &&
        typeof parsed.prerelease[1] === "number"
      : true);
  if (!valid) {
    throw new Error(
      `${field} must be ${channel === "dev" ? "X.Y.Z-dev.N" : "valid SemVer"}: ${version || "<missing>"}`,
    );
  }
  return version;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  void (async () => {
    const channels = parseContentPackageChannels(process.argv[2] || "");
    if (channels.includes("dev") && channels.length > 1) {
      throw new Error("Publication channels must share one version line");
    }
    const descriptor = JSON.parse(
      await fs.readFile("content-package.version.json", "utf8"),
    );
    console.log(
      resolveContentPackageVersion(
        descriptor,
        channels[0],
        process.env.CONTENT_PACKAGE_VERSION,
      ),
    );
  })().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
