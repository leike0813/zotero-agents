import semver from "semver";
import { hostBridgeChannelForVersion } from "./host-bridge-release-channels.mjs";

export function resolveExactCliReleaseIntent(current: string, target: string) {
  const channel = hostBridgeChannelForVersion(current);
  if (hostBridgeChannelForVersion(target) !== channel) {
    throw new Error(
      "Exact CLI target must stay in the selected release channel",
    );
  }
  if (target === current) return "auto" as const;
  const patch =
    channel === "dev"
      ? semver.inc(current, "prerelease", "dev")
      : semver.inc(current, "patch");
  if (target === patch) return "patch" as const;
  const minor = `${semver.inc(current, "minor")}${channel === "dev" ? "-dev.0" : ""}`;
  if (target === minor) return "minor" as const;
  throw new Error(
    `Exact CLI version must be ${current}, its next patch, or its next minor: ${target}`,
  );
}
