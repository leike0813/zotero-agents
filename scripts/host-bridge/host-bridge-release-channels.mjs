import { readFileSync } from "node:fs";
import { join } from "node:path";
import semver from "semver";

export const HOST_BRIDGE_VERSIONS_PATH = "releases/host-bridge/versions.json";

/** @typedef {"stable" | "dev"} HostBridgeChannel */

/** @returns {HostBridgeChannel} */
export function resolveHostBridgeChannel(value = "stable") {
  if (value !== "stable" && value !== "dev") {
    throw new Error(`Unsupported Host Bridge channel: ${value}`);
  }
  return value;
}

/** @returns {HostBridgeChannel} */
export function hostBridgeChannelForVersion(version) {
  const parsed = semver.parse(version);
  if (!parsed || parsed.version !== version || parsed.build.length) {
    throw new Error(`Invalid Host Bridge CLI version: ${version}`);
  }
  if (!parsed.prerelease.length) return "stable";
  if (
    parsed.prerelease.length === 2 &&
    parsed.prerelease[0] === "dev" &&
    typeof parsed.prerelease[1] === "number"
  ) return "dev";
  throw new Error(`Host Bridge dev version must be X.Y.Z-dev.N: ${version}`);
}

export function hostBridgeReleasePaths(channel = "stable") {
  const root = `releases/host-bridge/${resolveHostBridgeChannel(channel)}`;
  return {
    releaseSet: `${root}/release-set.json`,
    receipt: `${root}/latest-complete-release-receipt.json`,
  };
}

export function hostBridgePublicationTargets(channel = "stable") {
  const dev = resolveHostBridgeChannel(channel) === "dev";
  return {
    ref: dev ? "dev" : "main",
    cliBundle: dev
      ? "host-bridge/zotero-bridge-cli-bundle-dev"
      : "host-bridge/zotero-bridge-cli-bundle",
    libraryAgent: dev ? "dev" : "main",
    librarianProfile: dev ? "dev" : "main",
  };
}

export function readHostBridgeVersions(root = process.cwd()) {
  const versions = JSON.parse(readFileSync(join(root, HOST_BRIDGE_VERSIONS_PATH), "utf8"));
  if (hostBridgeChannelForVersion(versions.version) !== "stable" ||
      hostBridgeChannelForVersion(versions.dev_version) !== "dev") {
    throw new Error("Host Bridge counters must contain stable version and dev_version");
  }
  return versions;
}

export function resolveHostBridgeCliVersion(versions, channel = "stable") {
  const selected = resolveHostBridgeChannel(channel);
  const version = versions[selected === "dev" ? "dev_version" : "version"];
  if (hostBridgeChannelForVersion(version) !== selected) {
    throw new Error(`Host Bridge ${selected} counter has the wrong version: ${version}`);
  }
  return selected === "dev" && !semver.gt(version, versions.version)
    ? `${semver.inc(versions.version, "patch")}-dev.0`
    : version;
}

export function assertHostBridgePublicationScope(channel, ref, releaseSet) {
  const selected = resolveHostBridgeChannel(channel);
  const targets = hostBridgePublicationTargets(selected);
  if (ref !== targets.ref) {
    throw new Error(`Host Bridge ${selected} publication must use ref ${targets.ref}`);
  }
  if (releaseSet.channel !== selected || hostBridgeChannelForVersion(releaseSet.cli.version) !== selected) {
    throw new Error("Host Bridge release-set channel does not match publication channel");
  }
  for (const name of ["cliBundle", "libraryAgent", "librarianProfile"]) {
    const surface = releaseSet.surfaces[name];
    if (surface.mutableRef !== targets[name] || hostBridgeChannelForVersion(surface.version) !== selected) {
      throw new Error(`Host Bridge ${name} version or mutable ref crosses release channels`);
    }
    if (selected === "dev" && (
      semver.prerelease(surface.version).join(".") !== semver.prerelease(releaseSet.cli.version).join(".") ||
      semver.major(surface.version) !== semver.major(releaseSet.cli.version) ||
      semver.minor(surface.version) !== semver.minor(releaseSet.cli.version)
    )) {
      throw new Error(`Host Bridge ${name} prerelease identity differs from the CLI`);
    }
  }
  return targets;
}
