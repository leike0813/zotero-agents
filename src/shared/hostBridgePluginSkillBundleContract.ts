export const HOST_BRIDGE_PLUGIN_SKILL_BUNDLE_SCHEMA =
  "host-bridge.plugin-skill-bundle.v1" as const;

export interface HostBridgePluginSkillBundleFile {
  path: string;
  bytes: number;
  sha256: string;
}

export interface HostBridgePluginSkillBundleManifest {
  schema: typeof HOST_BRIDGE_PLUGIN_SKILL_BUNDLE_SCHEMA;
  cli: {
    version: string;
    buildFingerprint: string;
    commandCatalogChecksum: string;
  };
  surfaces: Array<{
    id: string;
    kind: "minimum-core" | "generic-agent";
    version: string;
  }>;
  skills: Array<{
    id: string;
    mount: string;
    runnerVersion: string;
  }>;
  files: HostBridgePluginSkillBundleFile[];
  aggregateSha256: string;
}

export type HostBridgePluginSkillBundleIdentity = Pick<
  HostBridgePluginSkillBundleManifest,
  "cli" | "aggregateSha256"
>;

export function isSafeHostBridgePluginSkillBundlePath(path: string) {
  return (
    path.length > 0 &&
    !path.includes("\\") &&
    !path.includes("\0") &&
    !path.startsWith("/") &&
    !path.endsWith("/") &&
    !path.split("/").some((part) => !part || part === "." || part === "..")
  );
}

export function hostBridgePluginSkillBundleDigestPayload(
  manifest: Omit<HostBridgePluginSkillBundleManifest, "aggregateSha256">,
) {
  return JSON.stringify({
    schema: manifest.schema,
    cli: manifest.cli,
    surfaces: manifest.surfaces,
    skills: manifest.skills,
    files: manifest.files,
  });
}
