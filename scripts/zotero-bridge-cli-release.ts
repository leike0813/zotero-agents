import { readFileSync } from "node:fs";
import { join } from "node:path";

export type ZoteroBridgeCliRelease = {
  schema: string;
  version: string;
  buildFingerprint: string;
  binariesBuildFingerprint: string;
  binaryAggregateSha256: string;
};

export const ZOTERO_BRIDGE_CLI_RELEASE_PATH = "cli/zotero-bridge/release.json";

export function readZoteroBridgeCliRelease(
  root: string,
): ZoteroBridgeCliRelease {
  const release = JSON.parse(
    readFileSync(join(root, ZOTERO_BRIDGE_CLI_RELEASE_PATH), "utf8"),
  ) as Partial<ZoteroBridgeCliRelease>;
  const version = String(release.version || "");
  if (!version) {
    throw new Error(
      `${ZOTERO_BRIDGE_CLI_RELEASE_PATH} is missing zotero-bridge version`,
    );
  }
  return {
    schema: String(release.schema || ""),
    version,
    buildFingerprint: String(release.buildFingerprint || ""),
    binariesBuildFingerprint: String(
      release.binariesBuildFingerprint || "",
    ),
    binaryAggregateSha256: String(release.binaryAggregateSha256 || ""),
  };
}
