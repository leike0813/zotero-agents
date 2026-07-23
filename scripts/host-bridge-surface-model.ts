import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export const HOST_BRIDGE_SURFACE_DEFINITIONS_SCHEMA =
  "host-bridge.surface-definitions.v1" as const;

export type HostBridgeSurfaceKind =
  | "minimum-core"
  | "generic-agent"
  | "hosted-agent";

export interface HostBridgeSurfaceSkillDefinition {
  id: string;
  mount: string;
  source: string;
}

export interface HostBridgeSurfaceDefinition {
  id: string;
  kind: HostBridgeSurfaceKind;
  facet?: string;
  extends?: string;
  patch: number;
  sourceRoot: string;
  generatedRoot: string;
  materializedRoot: string;
  skills: HostBridgeSurfaceSkillDefinition[];
}

export interface HostBridgeSurfaceDefinitions {
  schema: typeof HOST_BRIDGE_SURFACE_DEFINITIONS_SCHEMA;
  cliRelease: string;
  surfaces: HostBridgeSurfaceDefinition[];
}

export interface ResolvedHostBridgeSurface {
  surface: HostBridgeSurfaceDefinition;
  lineage: HostBridgeSurfaceDefinition[];
  skills: HostBridgeSurfaceSkillDefinition[];
}

export interface HostBridgeSurfaceVersion {
  surface: HostBridgeSurfaceDefinition;
  cliVersion: string;
  patch: number;
  version: string;
}

export function hostBridgeSkillGeneratedRoot(
  surface: HostBridgeSurfaceDefinition,
  skill: HostBridgeSurfaceSkillDefinition,
): string {
  if (surface.kind === "minimum-core") return surface.generatedRoot;
  if (surface.kind === "generic-agent") {
    return join(surface.generatedRoot, skill.id);
  }
  return join(surface.generatedRoot, skill.mount);
}

function requireNonEmpty(
  value: unknown,
  label: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
}

export function validateHostBridgeSurfaceDefinitions(
  definitions: HostBridgeSurfaceDefinitions,
): HostBridgeSurfaceDefinitions {
  if (definitions.schema !== HOST_BRIDGE_SURFACE_DEFINITIONS_SCHEMA) {
    throw new Error(
      `Unsupported Host Bridge surface definitions schema: ${String(definitions.schema)}`,
    );
  }
  requireNonEmpty(definitions.cliRelease, "cliRelease");
  if (
    !Array.isArray(definitions.surfaces) ||
    definitions.surfaces.length !== 3
  ) {
    throw new Error(
      "Host Bridge surface definitions must declare exactly three surfaces",
    );
  }

  const byId = new Map<string, HostBridgeSurfaceDefinition>();
  for (const surface of definitions.surfaces) {
    requireNonEmpty(surface.id, "surface.id");
    if (byId.has(surface.id)) {
      throw new Error(`Duplicate Host Bridge surface id: ${surface.id}`);
    }
    if (!Number.isInteger(surface.patch) || surface.patch < 0) {
      throw new Error(
        `Surface ${surface.id} patch must be a non-negative integer`,
      );
    }
    requireNonEmpty(surface.sourceRoot, `${surface.id}.sourceRoot`);
    requireNonEmpty(surface.generatedRoot, `${surface.id}.generatedRoot`);
    requireNonEmpty(surface.materializedRoot, `${surface.id}.materializedRoot`);
    if (!Array.isArray(surface.skills) || surface.skills.length === 0) {
      throw new Error(
        `Surface ${surface.id} must declare at least one owned Skill`,
      );
    }
    const mounts = new Set<string>();
    const skillIds = new Set<string>();
    for (const skill of surface.skills) {
      requireNonEmpty(skill.id, `${surface.id}.skills.id`);
      requireNonEmpty(skill.mount, `${surface.id}.skills.mount`);
      requireNonEmpty(skill.source, `${surface.id}.skills.source`);
      if (
        skill.source === ".." ||
        skill.source.startsWith("../") ||
        skill.source.includes("/../") ||
        skill.source.includes("\\..\\")
      ) {
        throw new Error(
          `Surface ${surface.id} Skill ${skill.id} source must stay within its source root`,
        );
      }
      if (skillIds.has(skill.id)) {
        throw new Error(
          `Surface ${surface.id} declares duplicate Skill ${skill.id}`,
        );
      }
      if (mounts.has(skill.mount)) {
        throw new Error(
          `Surface ${surface.id} declares duplicate mount ${skill.mount}`,
        );
      }
      if (skill.mount !== `skills/${skill.id}`) {
        throw new Error(
          `Surface ${surface.id} Skill ${skill.id} must mount at skills/${skill.id}`,
        );
      }
      skillIds.add(skill.id);
      mounts.add(skill.mount);
    }
    byId.set(surface.id, surface);
  }

  for (const surface of definitions.surfaces) {
    if (surface.extends && !byId.has(surface.extends)) {
      throw new Error(
        `Surface ${surface.id} extends unknown surface ${surface.extends}`,
      );
    }
    const seen = new Set<string>();
    let cursor: HostBridgeSurfaceDefinition | undefined = surface;
    while (cursor) {
      if (seen.has(cursor.id)) {
        throw new Error(
          `Host Bridge surface inheritance cycle at ${cursor.id}`,
        );
      }
      seen.add(cursor.id);
      cursor = cursor.extends ? byId.get(cursor.extends) : undefined;
    }
  }

  return definitions;
}

export function loadHostBridgeSurfaceDefinitions(
  filePath = resolve(process.cwd(), "host-bridge/surfaces.json"),
): HostBridgeSurfaceDefinitions {
  const definitions = JSON.parse(
    readFileSync(filePath, "utf8"),
  ) as HostBridgeSurfaceDefinitions;
  return validateHostBridgeSurfaceDefinitions(definitions);
}

export function writeHostBridgeSurfaceDefinitions(args: {
  definitionsPath?: string;
  definitions: HostBridgeSurfaceDefinitions;
}) {
  const definitionsPath = resolve(
    args.definitionsPath || "host-bridge/surfaces.json",
  );
  validateHostBridgeSurfaceDefinitions(args.definitions);
  const temporary = `${definitionsPath}.tmp`;
  writeFileSync(
    temporary,
    `${JSON.stringify(args.definitions, null, 2)}\n`,
    "utf8",
  );
  renameSync(temporary, definitionsPath);
}

export function resolveHostBridgeSurface(
  definitions: HostBridgeSurfaceDefinitions,
  surfaceId: string,
): ResolvedHostBridgeSurface {
  validateHostBridgeSurfaceDefinitions(definitions);
  const byId = new Map(
    definitions.surfaces.map((surface) => [surface.id, surface]),
  );
  const surface = byId.get(surfaceId);
  if (!surface) {
    throw new Error(`Unknown Host Bridge surface: ${surfaceId}`);
  }

  const lineage: HostBridgeSurfaceDefinition[] = [];
  let cursor: HostBridgeSurfaceDefinition | undefined = surface;
  while (cursor) {
    lineage.unshift(cursor);
    cursor = cursor.extends ? byId.get(cursor.extends) : undefined;
  }

  const skills: HostBridgeSurfaceSkillDefinition[] = [];
  const skillIds = new Set<string>();
  const mounts = new Set<string>();
  for (const layer of lineage) {
    for (const skill of layer.skills) {
      if (skillIds.has(skill.id) || mounts.has(skill.mount)) {
        throw new Error(
          `Surface ${surfaceId} has a conflicting inherited Skill ${skill.id} at ${skill.mount}`,
        );
      }
      skillIds.add(skill.id);
      mounts.add(skill.mount);
      skills.push(skill);
    }
  }

  return { surface, lineage, skills };
}

export function formatHostBridgeSurfaceVersion(
  cliVersion: string,
  patch: number,
): string {
  const match = /^(\d+)\.(\d+)\.\d+(?:[-+].*)?$/.exec(cliVersion);
  if (!match) {
    throw new Error(`Invalid CLI version: ${cliVersion}`);
  }
  if (!Number.isInteger(patch) || patch < 0) {
    throw new Error("Surface patch must be a non-negative integer");
  }
  return `${match[1]}.${match[2]}.${patch}`;
}

function readCliVersion(definitionsPath: string, cliRelease: string) {
  const definitionsDirectory = dirname(definitionsPath);
  const releasePath = [
    join(definitionsDirectory, cliRelease),
    join(dirname(definitionsDirectory), cliRelease),
  ].find(existsSync);
  if (!releasePath) {
    throw new Error(`Host Bridge CLI release does not exist: ${cliRelease}`);
  }
  const release = JSON.parse(readFileSync(releasePath, "utf8")) as {
    version?: unknown;
  };
  const version = String(release.version || "").trim();
  if (!version) {
    throw new Error(
      `Host Bridge CLI release is missing version: ${releasePath}`,
    );
  }
  return version;
}

export function inspectHostBridgeSurfaceVersion(args: {
  definitionsPath?: string;
  surfaceId: string;
}): HostBridgeSurfaceVersion {
  const definitionsPath = resolve(
    args.definitionsPath || "host-bridge/surfaces.json",
  );
  const definitions = loadHostBridgeSurfaceDefinitions(definitionsPath);
  const surface = definitions.surfaces.find(
    (entry) => entry.id === args.surfaceId,
  );
  if (!surface) {
    throw new Error(`Unknown Host Bridge surface: ${args.surfaceId}`);
  }
  const cliVersion = readCliVersion(definitionsPath, definitions.cliRelease);
  return {
    surface,
    cliVersion,
    patch: surface.patch,
    version: formatHostBridgeSurfaceVersion(cliVersion, surface.patch),
  };
}

export function bumpHostBridgeSurfacePatch(args: {
  definitionsPath?: string;
  surfaceId: string;
  alignCli?: boolean;
}): HostBridgeSurfaceVersion {
  const definitionsPath = resolve(
    args.definitionsPath || "host-bridge/surfaces.json",
  );
  const definitions = loadHostBridgeSurfaceDefinitions(definitionsPath);
  const surface = definitions.surfaces.find(
    (entry) => entry.id === args.surfaceId,
  );
  if (!surface) {
    throw new Error(`Unknown Host Bridge surface: ${args.surfaceId}`);
  }
  surface.patch = args.alignCli ? 0 : surface.patch + 1;
  writeHostBridgeSurfaceDefinitions({ definitionsPath, definitions });
  return inspectHostBridgeSurfaceVersion({
    definitionsPath,
    surfaceId: surface.id,
  });
}
