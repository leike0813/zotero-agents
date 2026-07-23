import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import {
  hostBridgeSkillGeneratedRoot,
  loadHostBridgeSurfaceDefinitions,
  resolveHostBridgeSurface,
  type HostBridgeSurfaceDefinition,
} from "./host-bridge-surface-model";

type ReleaseSet = {
  schema: "host-bridge.release-set.v1" | "host-bridge.release-set.v2";
  releaseSetId: string;
  source: { commit: string };
  cli: {
    identity: Record<string, unknown>;
    binaries: Array<{
      platform: string;
      binary: string;
      sha256: string;
      bytes?: number;
    }>;
  };
  surfaces: Record<
    "cliBundle" | "libraryAgent" | "librarianProfile",
    Record<string, unknown>
  >;
};

const ROOT = process.cwd();

function arg(name: string) {
  const prefix = `--${name}=`;
  return process.argv
    .find((entry) => entry.startsWith(prefix))
    ?.slice(prefix.length);
}

function readJson(path: string) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function copy(source: string, target: string) {
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true, force: true });
}

function resetDirectory(path: string) {
  const resolved = resolve(path);
  const root = resolve(ROOT);
  if (resolved === root || resolved === dirname(root) || resolved === "/") {
    throw new Error(
      `Refusing to clear broad materialization path: ${resolved}`,
    );
  }
  rmSync(resolved, { recursive: true, force: true });
  mkdirSync(resolved, { recursive: true });
}

function commonManifest(
  releaseSet: ReleaseSet,
  surfaceName: keyof ReleaseSet["surfaces"],
) {
  return {
    schema: "host-bridge.surface-release.v2",
    releaseSetId: releaseSet.releaseSetId,
    releaseSet,
    surface: {
      name: surfaceName,
      ...releaseSet.surfaces[surfaceName],
    },
    sourceCommit: releaseSet.source.commit,
    cliIdentity: releaseSet.cli.identity,
  };
}

function copyBinaries(
  root: string,
  releaseSet: ReleaseSet,
  targetRoot: string,
) {
  for (const entry of releaseSet.cli.binaries) {
    const source = join(root, "addon/bin", entry.platform, entry.binary);
    const checksum = `${source}.sha256`;
    if (!existsSync(source) || !existsSync(checksum)) {
      throw new Error(`Missing CLI prebuild for ${entry.platform}`);
    }
    copy(source, join(targetRoot, entry.platform, entry.binary));
    copy(checksum, join(targetRoot, entry.platform, `${entry.binary}.sha256`));
  }
}

function writeManifest(path: string, value: unknown) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function copyResolvedSkills(args: {
  root: string;
  definitions: ReturnType<typeof loadHostBridgeSurfaceDefinitions>;
  surfaceId: string;
  targetRoot: string;
}) {
  const resolved = resolveHostBridgeSurface(args.definitions, args.surfaceId);
  const owners = new Map<string, HostBridgeSurfaceDefinition>();
  for (const layer of resolved.lineage) {
    for (const skill of layer.skills) owners.set(skill.id, layer);
  }
  for (const skill of resolved.skills) {
    const owner = owners.get(skill.id);
    if (!owner)
      throw new Error(`Missing owner for Host Bridge Skill ${skill.id}`);
    copy(
      join(args.root, hostBridgeSkillGeneratedRoot(owner, skill)),
      join(args.targetRoot, skill.mount),
    );
  }
}

export function materializeHostBridgeSurfaces(args: {
  root?: string;
  outputRoot: string;
  releaseSet?: ReleaseSet;
}) {
  const root = args.root || ROOT;
  const releaseSet =
    args.releaseSet ||
    (readJson(join(root, "host-bridge/release-set.json")) as ReleaseSet);
  if (
    releaseSet.schema !== "host-bridge.release-set.v1" &&
    releaseSet.schema !== "host-bridge.release-set.v2"
  ) {
    throw new Error("Host Bridge release set schema mismatch");
  }
  const outputRoot = resolve(args.outputRoot);
  const definitions = loadHostBridgeSurfaceDefinitions(
    join(root, "host-bridge/surfaces.json"),
  );
  resetDirectory(outputRoot);
  const cliBundle = join(outputRoot, "cli-bundle");
  const libraryAgent = join(outputRoot, "library-agent");
  const librarianProfile = join(outputRoot, "librarian-profile");
  for (const path of [cliBundle, libraryAgent, librarianProfile])
    mkdirSync(path);

  copyResolvedSkills({
    root,
    definitions,
    surfaceId: "zotero-bridge-cli",
    targetRoot: cliBundle,
  });
  copy(
    join(root, "skills_src/zotero-bridge-cli/README.md"),
    join(cliBundle, "README.md"),
  );
  copy(
    join(root, "cli/zotero-bridge/scripts/install.ps1"),
    join(cliBundle, "install.ps1"),
  );
  copy(
    join(root, "cli/zotero-bridge/scripts/install.sh"),
    join(cliBundle, "install.sh"),
  );
  copy(
    join(root, "cli/zotero-bridge/release.json"),
    join(cliBundle, "cli-release.json"),
  );
  copyBinaries(root, releaseSet, join(cliBundle, "bin"));
  writeManifest(
    join(cliBundle, "manifest.json"),
    commonManifest(releaseSet, "cliBundle"),
  );

  copyResolvedSkills({
    root,
    definitions,
    surfaceId: "zotero-library-agent",
    targetRoot: libraryAgent,
  });
  writeFileSync(
    join(libraryAgent, "README.md"),
    "# Zotero Library Agent\n\nResearch-task Skills for Zotero through the bundled Zotero Bridge CLI.\n",
    "utf8",
  );
  copy(
    join(root, "cli/zotero-bridge/scripts/install.ps1"),
    join(libraryAgent, "install.ps1"),
  );
  copy(
    join(root, "cli/zotero-bridge/scripts/install.sh"),
    join(libraryAgent, "install.sh"),
  );
  copy(
    join(root, "cli/zotero-bridge/release.json"),
    join(libraryAgent, "cli-release.json"),
  );
  copyBinaries(root, releaseSet, join(libraryAgent, "bin"));
  writeManifest(
    join(libraryAgent, "manifest.json"),
    commonManifest(releaseSet, "libraryAgent"),
  );

  for (const entry of readdirSync(
    join(root, "profiles/hermes/zotero-librarian"),
  )) {
    copy(
      join(root, "profiles/hermes/zotero-librarian", entry),
      join(librarianProfile, entry),
    );
  }
  copyBinaries(
    root,
    releaseSet,
    join(librarianProfile, "assets/zotero-bridge/bin"),
  );
  copy(
    join(root, "cli/zotero-bridge/release.json"),
    join(librarianProfile, "cli-release.json"),
  );
  writeManifest(
    join(librarianProfile, "manifest.json"),
    commonManifest(releaseSet, "librarianProfile"),
  );

  return {
    schema: "host-bridge.materialization.v1" as const,
    releaseSetId: releaseSet.releaseSetId,
    outputRoot,
    surfaces: [
      { name: "cliBundle", path: cliBundle },
      { name: "libraryAgent", path: libraryAgent },
      { name: "librarianProfile", path: librarianProfile },
    ],
  };
}

function stagingReleaseSet(root: string): ReleaseSet {
  const cli = readJson(join(root, "cli/zotero-bridge/release.json")) as {
    version?: string;
    buildFingerprint?: string;
    binaries?: ReleaseSet["cli"]["binaries"];
  };
  if (!Array.isArray(cli.binaries)) {
    throw new Error(
      "CLI release must declare binaries before staging Host Bridge payloads",
    );
  }
  return {
    schema: "host-bridge.release-set.v2",
    releaseSetId: "staging",
    source: { commit: "staging" },
    cli: {
      identity: {
        version: cli.version || "",
        buildFingerprint: cli.buildFingerprint || "",
      },
      binaries: cli.binaries,
    },
    surfaces: {
      cliBundle: {},
      libraryAgent: {},
      librarianProfile: {},
    },
  };
}

function sortedFiles(root: string, path = ""): string[] {
  const absolute = join(root, path);
  if (statSync(absolute).isFile()) return [path];
  return readdirSync(absolute, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => sortedFiles(root, join(path, entry.name)));
}

function digestDirectory(root: string) {
  const hash = createHash("sha256");
  for (const path of sortedFiles(root)) {
    hash.update(`${path.replace(/\\/g, "/")}\0`);
    hash.update(readFileSync(join(root, path)));
    hash.update("\0");
  }
  return hash.digest("hex");
}

/** Hash the exact materialized payload bytes, excluding release envelopes. */
export function stagedHostBridgePayloadDigests(root = ROOT) {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "host-bridge-payload-"));
  try {
    const staged = materializeHostBridgeSurfaces({
      root,
      outputRoot: join(temporaryRoot, "payloads"),
      releaseSet: stagingReleaseSet(root),
    });
    const digests = Object.fromEntries(
      staged.surfaces.map((surface) => {
        rmSync(join(surface.path, "manifest.json"), { force: true });
        return [surface.name, digestDirectory(surface.path)];
      }),
    ) as Record<"cliBundle" | "libraryAgent" | "librarianProfile", string>;
    return digests;
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

const outputRoot = arg("output-root");
if (outputRoot) {
  process.stdout.write(
    `${JSON.stringify(materializeHostBridgeSurfaces({ outputRoot }), null, 2)}\n`,
  );
}
