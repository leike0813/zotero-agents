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

export const HOST_BRIDGE_PLUGIN_SKILL_BUNDLE_IDENTITY_CHANGED =
  "host_bridge_plugin_skill_bundle_identity_changed" as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function parseHostBridgePluginSkillBundleIdentity(
  value: unknown,
): HostBridgePluginSkillBundleIdentity | undefined {
  if (!isRecord(value) || !isRecord(value.cli)) return undefined;
  const version = String(value.cli.version || "").trim();
  const buildFingerprint = String(value.cli.buildFingerprint || "").trim();
  const commandCatalogChecksum = String(
    value.cli.commandCatalogChecksum || "",
  ).trim();
  const aggregateSha256 = String(value.aggregateSha256 || "").trim();
  if (
    !version ||
    !buildFingerprint ||
    !/^[a-f0-9]{64}$/.test(commandCatalogChecksum) ||
    !/^[a-f0-9]{64}$/.test(aggregateSha256)
  ) {
    return undefined;
  }
  return {
    cli: { version, buildFingerprint, commandCatalogChecksum },
    aggregateSha256,
  };
}

export function hostBridgePluginSkillBundleIdentitiesMatch(
  persisted: HostBridgePluginSkillBundleIdentity | undefined,
  current: HostBridgePluginSkillBundleIdentity | undefined,
) {
  if (!persisted || !current) return persisted === current;
  return (
    persisted.aggregateSha256 === current.aggregateSha256 &&
    persisted.cli.version === current.cli.version &&
    persisted.cli.buildFingerprint === current.cli.buildFingerprint &&
    persisted.cli.commandCatalogChecksum === current.cli.commandCatalogChecksum
  );
}

export class HostBridgePluginSkillBundleIdentityChangedError extends Error {
  readonly code = HOST_BRIDGE_PLUGIN_SKILL_BUNDLE_IDENTITY_CHANGED;

  constructor() {
    super(HOST_BRIDGE_PLUGIN_SKILL_BUNDLE_IDENTITY_CHANGED);
    this.name = "HostBridgePluginSkillBundleIdentityChangedError";
  }
}

export function assertHostBridgePluginSkillBundleIdentityCurrent(
  persisted: HostBridgePluginSkillBundleIdentity | undefined,
  current: HostBridgePluginSkillBundleIdentity | undefined,
) {
  if (!hostBridgePluginSkillBundleIdentitiesMatch(persisted, current)) {
    throw new HostBridgePluginSkillBundleIdentityChangedError();
  }
}

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
