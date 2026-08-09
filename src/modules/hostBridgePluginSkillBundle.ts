import surfaceDefinitions from "../../host-bridge/surfaces.json";
import cliRelease from "../../cli/zotero-bridge/release.json";
import { joinPath } from "../utils/path";
import { sha256Hex } from "../utils/sha256";
import {
  HOST_BRIDGE_PLUGIN_SKILL_BUNDLE_SCHEMA,
  hostBridgePluginSkillBundleDigestPayload,
  isSafeHostBridgePluginSkillBundlePath,
  type HostBridgePluginSkillBundleIdentity,
  type HostBridgePluginSkillBundleManifest,
} from "../shared/hostBridgePluginSkillBundleContract";
import { readPackagedBinaryAsset } from "./packagedAssetResolver";
import {
  ensureRuntimeDirectory,
  getRuntimePersistencePaths,
  moveRuntimePath,
  readRuntimeTextFile,
  removeRuntimePath,
  runtimePathExists,
  writeRuntimeBytes,
  writeRuntimeTextFile,
} from "./runtimePersistence";

const PACKAGED_BUNDLE_ROOT = "content/host-bridge-skills";
const PACKAGED_BUNDLE_MANIFEST = `${PACKAGED_BUNDLE_ROOT}/manifest.json`;
const MATERIALIZATION_RECEIPT_SCHEMA =
  "host-bridge.plugin-skill-bundle-materialization.v1" as const;

type AssetReadResult = Awaited<ReturnType<typeof readPackagedBinaryAsset>>;

type MaterializationDependencies = {
  readAsset: (relativePath: string) => Promise<AssetReadResult>;
  ensureDirectory: typeof ensureRuntimeDirectory;
  writeBytes: typeof writeRuntimeBytes;
  writeText: typeof writeRuntimeTextFile;
  readText: typeof readRuntimeTextFile;
  pathExists: typeof runtimePathExists;
  movePath: typeof moveRuntimePath;
  removePath: typeof removeRuntimePath;
  now: () => number;
};

export type HostBridgePluginSkillBundleMaterialization = {
  ok: true;
  root: string;
  manifest: HostBridgePluginSkillBundleManifest;
  identity: HostBridgePluginSkillBundleIdentity;
  reservedSkillIds: string[];
  reused: boolean;
};

export type HostBridgePluginSkillBundleFailure = {
  ok: false;
  root: string;
  code: "host_bridge_plugin_skill_bundle_invalid";
  error: string;
};

let latestMaterialization:
  | HostBridgePluginSkillBundleMaterialization
  | HostBridgePluginSkillBundleFailure
  | undefined;

function expectedSurfaceClosure() {
  const minimum = surfaceDefinitions.surfaces.find(
    (surface) => surface.kind === "minimum-core",
  );
  const generic = surfaceDefinitions.surfaces.find(
    (surface) => surface.kind === "generic-agent",
  );
  if (!minimum || !generic || generic.extends !== minimum.id) {
    throw new Error("compiled Host Bridge surface closure is invalid");
  }
  return {
    minimum,
    generic,
    skills: [...minimum.skills, ...generic.skills],
  };
}

function surfaceVersion(patch: number) {
  const match = /^(\d+)\.(\d+)\./.exec(cliRelease.version);
  if (!match) throw new Error("compiled Host Bridge CLI version is invalid");
  return `${match[1]}.${match[2]}.${patch}`;
}

function parseManifest(bytes: Uint8Array) {
  try {
    return JSON.parse(
      new TextDecoder("utf-8").decode(bytes),
    ) as HostBridgePluginSkillBundleManifest;
  } catch {
    throw new Error("Host Bridge plugin Skill bundle manifest is invalid JSON");
  }
}

async function requireSha256(bytes: Uint8Array) {
  const digest = await sha256Hex(bytes);
  if (!digest) throw new Error("SHA-256 runtime is unavailable");
  return digest;
}

async function validateManifest(manifest: HostBridgePluginSkillBundleManifest) {
  const closure = expectedSurfaceClosure();
  if (manifest.schema !== HOST_BRIDGE_PLUGIN_SKILL_BUNDLE_SCHEMA) {
    throw new Error("Host Bridge plugin Skill bundle schema mismatch");
  }
  if (
    manifest.cli?.version !== cliRelease.version ||
    manifest.cli?.buildFingerprint !== cliRelease.buildFingerprint ||
    !/^[a-f0-9]{64}$/.test(manifest.cli?.commandCatalogChecksum || "")
  ) {
    throw new Error("Host Bridge plugin Skill bundle CLI identity mismatch");
  }
  const expectedSurfaces = [
    {
      id: closure.minimum.id,
      kind: "minimum-core",
      version: surfaceVersion(closure.minimum.patch),
    },
    {
      id: closure.generic.id,
      kind: "generic-agent",
      version: surfaceVersion(closure.generic.patch),
    },
  ];
  if (JSON.stringify(manifest.surfaces) !== JSON.stringify(expectedSurfaces)) {
    throw new Error(
      "Host Bridge plugin Skill bundle surface identity mismatch",
    );
  }
  const expectedSkillIds = closure.skills.map((skill) => skill.id);
  if (
    JSON.stringify(manifest.skills?.map((skill) => skill.id)) !==
    JSON.stringify(expectedSkillIds)
  ) {
    throw new Error("Host Bridge plugin Skill bundle closure mismatch");
  }
  const versions = new Map([
    [closure.minimum.id, surfaceVersion(closure.minimum.patch)],
    [closure.generic.id, surfaceVersion(closure.generic.patch)],
  ]);
  for (const skill of manifest.skills) {
    const owner = closure.minimum.skills.some((entry) => entry.id === skill.id)
      ? closure.minimum.id
      : closure.generic.id;
    if (
      skill.mount !== `skills/${skill.id}` ||
      skill.runnerVersion !== versions.get(owner)
    ) {
      throw new Error(
        `Host Bridge plugin Skill contract mismatch: ${skill.id}`,
      );
    }
  }
  const paths = new Set<string>();
  const skillIds = new Set(expectedSkillIds);
  for (const file of manifest.files || []) {
    if (
      !isSafeHostBridgePluginSkillBundlePath(file.path) ||
      paths.has(file.path) ||
      !skillIds.has(file.path.split("/")[0] || "") ||
      !Number.isSafeInteger(file.bytes) ||
      file.bytes < 0 ||
      !/^[a-f0-9]{64}$/.test(file.sha256 || "")
    ) {
      throw new Error(`Unsafe Host Bridge plugin Skill file: ${file.path}`);
    }
    paths.add(file.path);
  }
  for (const skillId of expectedSkillIds) {
    for (const required of ["SKILL.md", "assets/runner.json"]) {
      if (!paths.has(`${skillId}/${required}`)) {
        throw new Error(
          `Host Bridge plugin Skill file is missing: ${skillId}/${required}`,
        );
      }
    }
  }
  const { aggregateSha256: _aggregateSha256, ...withoutDigest } = manifest;
  const aggregate = await requireSha256(
    new TextEncoder().encode(
      hostBridgePluginSkillBundleDigestPayload(withoutDigest),
    ),
  );
  if (aggregate !== manifest.aggregateSha256) {
    throw new Error("Host Bridge plugin Skill bundle aggregate mismatch");
  }
  return expectedSkillIds;
}

function bundleRoot(runtimeRoot?: string) {
  const root = runtimeRoot || getRuntimePersistencePaths().root;
  return joinPath(root, "content", "xpi", "host-bridge-skills");
}

function identity(manifest: HostBridgePluginSkillBundleManifest) {
  return {
    cli: manifest.cli,
    aggregateSha256: manifest.aggregateSha256,
  };
}

function compactError(error: unknown) {
  return error instanceof Error
    ? error.message
    : String(error || "unknown error");
}

export function getHostBridgePluginSkillBundleRoot(runtimeRoot?: string) {
  return bundleRoot(runtimeRoot);
}

export function getReservedHostBridgePluginSkillIds() {
  return expectedSurfaceClosure().skills.map((skill) => skill.id);
}

export function getLatestHostBridgePluginSkillBundleMaterialization() {
  return latestMaterialization;
}

export function getCurrentHostBridgePluginSkillBundleIdentity() {
  return latestMaterialization?.ok ? latestMaterialization.identity : undefined;
}

export function clearHostBridgePluginSkillBundleMaterializationForTests() {
  latestMaterialization = undefined;
}

export async function materializeHostBridgePluginSkillBundle(
  args: {
    runtimeRoot?: string;
    dependencies?: Partial<MaterializationDependencies>;
  } = {},
): Promise<
  | HostBridgePluginSkillBundleMaterialization
  | HostBridgePluginSkillBundleFailure
> {
  const root = bundleRoot(args.runtimeRoot);
  const receiptPath = `${root}.receipt.json`;
  const deps: MaterializationDependencies = {
    readAsset: readPackagedBinaryAsset,
    ensureDirectory: ensureRuntimeDirectory,
    writeBytes: writeRuntimeBytes,
    writeText: writeRuntimeTextFile,
    readText: readRuntimeTextFile,
    pathExists: runtimePathExists,
    movePath: moveRuntimePath,
    removePath: removeRuntimePath,
    now: Date.now,
    ...args.dependencies,
  };
  let staging = "";
  let backup = "";
  let backedUp = false;
  let promoted = false;
  try {
    const manifestRead = await deps.readAsset(PACKAGED_BUNDLE_MANIFEST);
    if (!manifestRead.ok) {
      throw new Error(
        "packaged Host Bridge plugin Skill manifest is unavailable",
      );
    }
    const manifest = parseManifest(manifestRead.bytes);
    const reservedSkillIds = await validateManifest(manifest);
    let existingReceipt: {
      schema?: string;
      aggregateSha256?: string;
    } | null = null;
    try {
      existingReceipt = JSON.parse(
        (await deps.readText(receiptPath)) || "null",
      );
    } catch {
      existingReceipt = null;
    }
    if (
      existingReceipt?.schema === MATERIALIZATION_RECEIPT_SCHEMA &&
      existingReceipt.aggregateSha256 === manifest.aggregateSha256 &&
      (await deps.pathExists(root))
    ) {
      latestMaterialization = {
        ok: true,
        root,
        manifest,
        identity: identity(manifest),
        reservedSkillIds,
        reused: true,
      };
      return latestMaterialization;
    }

    const suffix = `${deps.now()}-${manifest.aggregateSha256.slice(0, 12)}`;
    staging = `${root}.staging-${suffix}`;
    backup = `${root}.previous-${suffix}`;
    await deps.removePath(staging).catch(() => undefined);
    await deps.removePath(backup).catch(() => undefined);
    await deps.ensureDirectory(staging);
    for (const file of manifest.files) {
      const read = await deps.readAsset(`${PACKAGED_BUNDLE_ROOT}/${file.path}`);
      if (!read.ok) {
        throw new Error(
          `packaged Host Bridge plugin Skill file is unavailable: ${file.path}`,
        );
      }
      if (
        read.bytes.byteLength !== file.bytes ||
        (await requireSha256(read.bytes)) !== file.sha256
      ) {
        throw new Error(
          `packaged Host Bridge plugin Skill digest mismatch: ${file.path}`,
        );
      }
      await deps.writeBytes(joinPath(staging, file.path), read.bytes, {
        overwrite: false,
      });
    }
    await deps.writeBytes(
      joinPath(staging, "manifest.json"),
      manifestRead.bytes,
      {
        overwrite: false,
      },
    );
    if (await deps.pathExists(root)) {
      await deps.movePath({ sourcePath: root, targetPath: backup });
      backedUp = true;
    }
    await deps.movePath({ sourcePath: staging, targetPath: root });
    promoted = true;
    await deps.writeText(
      receiptPath,
      `${JSON.stringify({
        schema: MATERIALIZATION_RECEIPT_SCHEMA,
        aggregateSha256: manifest.aggregateSha256,
      })}\n`,
    );
    if (backedUp) await deps.removePath(backup).catch(() => undefined);
    latestMaterialization = {
      ok: true,
      root,
      manifest,
      identity: identity(manifest),
      reservedSkillIds,
      reused: false,
    };
    return latestMaterialization;
  } catch (error) {
    if (staging) await deps.removePath(staging).catch(() => undefined);
    if (backedUp && !promoted) {
      await deps.removePath(root).catch(() => undefined);
      await deps
        .movePath({ sourcePath: backup, targetPath: root })
        .catch(() => undefined);
    }
    latestMaterialization = {
      ok: false,
      root,
      code: "host_bridge_plugin_skill_bundle_invalid",
      error: compactError(error),
    };
    return latestMaterialization;
  }
}

export const hostBridgePluginSkillBundleInternalsForTests = {
  expectedSurfaceClosure,
  validateManifest,
  PACKAGED_BUNDLE_ROOT,
  PACKAGED_BUNDLE_MANIFEST,
};
