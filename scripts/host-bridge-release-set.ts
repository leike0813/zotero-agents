import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export type HostBridgeReleaseChangePlan = {
  schema: "host-bridge.release-plan.v1";
  changedFiles: string[];
  cliBinaryInputs: boolean;
  installers: boolean;
  surfaces: {
    cliBundle: boolean;
    libraryAgent: boolean;
    librarianProfile: boolean;
  };
  generatedOnly: string[];
};

export type HostBridgeCliIdentity = {
  schema:
    | "host-bridge.surface-identity.v1"
    | "host-bridge.surface-identity.v2"
    | "host-bridge.surface-identity.v3"
    | "host-bridge.surface-identity.v5";
  protocol: string;
  cliSchema: string;
  version: string;
  buildFingerprint: string;
  commandCatalogChecksum: string;
};

export type HostBridgeReleaseSetInput = {
  sourceCommit: string;
  protocol: string;
  cliSchema: string;
  cli: {
    version: string;
    buildFingerprint: string;
    commandCatalogChecksum: string;
    binaryAggregateSha256: string;
    binariesBuildFingerprint: string;
    binaries: Array<{
      platform: string;
      binary: string;
      sha256: string;
      bytes?: number;
    }>;
  };
  surfaces: Record<
    "cliBundle" | "libraryAgent" | "librarianProfile",
    {
      version: string;
      contentDigest: string;
      repository: string;
      mutableRef?: string;
    }
  >;
};

export type HostBridgeReleaseSet = ReturnType<typeof buildHostBridgeReleaseSet>;

const GENERATED_PREFIXES = [
  "skills_builtin/zotero-bridge-cli/",
  "skills_builtin/zotero-library-agent/",
  "profiles/hermes/zotero-librarian/",
];
const GENERATED_EXACT = new Set([
  "doc/host-bridge-cli.md",
  "host-bridge/release-set.json",
  "skills_src/topic-synthesis/templates/fragments/zotero-bridge-cli.md.j2",
]);

function normalize(path: string) {
  return path.replace(/\\/g, "/").replace(/^\.\//, "").trim();
}

function uniqueSorted(paths: string[]) {
  return [...new Set(paths.map(normalize).filter(Boolean))].sort(
    (left, right) => left.localeCompare(right),
  );
}

function isGenerated(path: string) {
  return (
    GENERATED_EXACT.has(path) ||
    GENERATED_PREFIXES.some((prefix) => path.startsWith(prefix))
  );
}

const PIPELINE_ONLY_PATHS = new Set([
  ".github/workflows/release-host-bridge.yml",
  "scripts/check-zotero-bridge-cli-binary-identity.mjs",
  "scripts/dispatch-host-bridge-release.ts",
  "scripts/host-bridge-cli-release-governance.mjs",
  "scripts/host-bridge-release-plan.ts",
  "scripts/host-bridge-version-intent.ts",
  "scripts/prepare-host-bridge-release.ts",
  "scripts/render-host-bridge-release-set.ts",
  "scripts/stage-host-bridge-cli-prebuilds.ts",
  "scripts/sync-host-bridge-cli-prebuilds.ts",
]);

export function classifyHostBridgeReleaseChanges(
  changedFiles: string[],
): HostBridgeReleaseChangePlan {
  const files = uniqueSorted(changedFiles).filter((path) =>
    [
      ".github/workflows/release-host-bridge.yml",
      "package.json",
      "host-bridge/",
      "cli/zotero-bridge/",
      "skills_src/zotero-bridge-cli/",
      "skills_src/zotero-library-agent/",
      "skills_builtin/zotero-bridge-cli/",
      "skills_builtin/zotero-library-agent/",
      "profiles_src/hermes/zotero-librarian/",
      "profiles/hermes/zotero-librarian/",
      "workflows_builtin/",
      "scripts/host-bridge-",
      "scripts/render-host-bridge-",
      "scripts/materialize-host-bridge-",
      "scripts/prepare-host-bridge-",
      "scripts/publish-host-bridge-",
      "scripts/publish-zotero-library-agent-",
      "scripts/publish-zotero-librarian-",
      "scripts/build-zotero-bridge-cli.mjs",
      "scripts/package-zotero-bridge-cli.mjs",
    ].some((prefix) => path === prefix || path.startsWith(prefix)),
  );
  const sourceFiles = files.filter(
    (path) => !isGenerated(path) && !PIPELINE_ONLY_PATHS.has(path),
  );
  const cliBinaryInputs = files.some(
    (path) =>
      path.startsWith("cli/zotero-bridge/src/") ||
      path === "cli/zotero-bridge/Cargo.toml" ||
      path === "cli/zotero-bridge/Cargo.lock" ||
      path === "host-bridge/cli-build-recipe.json" ||
      path === "scripts/build-zotero-bridge-cli.mjs" ||
      path === "scripts/package-zotero-bridge-cli.mjs",
  );
  const installers = sourceFiles.some(
    (path) =>
      path.startsWith("cli/zotero-bridge/scripts/") ||
      path.includes("host-bridge-cli-installer"),
  );
  const cliBundle = sourceFiles.some(
    (path) =>
      path.startsWith("skills_src/zotero-bridge-cli/") ||
      path.startsWith("scripts/host-bridge-") ||
      path.startsWith("scripts/render-host-bridge"),
  );
  const libraryAgent = sourceFiles.some(
    (path) =>
      path.startsWith("skills_src/zotero-library-agent/") ||
      path.startsWith("skills_src/zotero-bridge-cli/"),
  );
  const librarianProfile = sourceFiles.some(
    (path) =>
      path.startsWith("profiles_src/hermes/zotero-librarian/") ||
      path.startsWith("skills_src/zotero-library-agent/") ||
      path.startsWith("skills_src/zotero-bridge-cli/") ||
      path.startsWith("workflows_builtin/") ||
      path === "scripts/render-host-bridge-surfaces.ts",
  );
  return {
    schema: "host-bridge.release-plan.v1",
    changedFiles: files,
    cliBinaryInputs,
    installers,
    surfaces: {
      cliBundle: cliBundle || cliBinaryInputs || installers,
      libraryAgent: libraryAgent || cliBinaryInputs || installers,
      librarianProfile: librarianProfile || cliBinaryInputs,
    },
    generatedOnly: files.filter(isGenerated),
  };
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function buildHostBridgeReleaseSet(input: HostBridgeReleaseSetInput) {
  const expectedPlatforms = [
    "darwin-arm64",
    "darwin-x64",
    "linux-arm",
    "linux-arm64",
    "linux-x64",
    "linux-x86",
    "win32-x64",
  ];
  const actualPlatforms = input.cli.binaries
    .map((entry) => entry.platform)
    .sort((left, right) => left.localeCompare(right));
  if (
    actualPlatforms.length !== expectedPlatforms.length ||
    actualPlatforms.some(
      (platform, index) => platform !== expectedPlatforms[index],
    ) ||
    input.cli.binaries.some(
      (entry) =>
        !entry.sha256 ||
        !Number.isInteger(entry.bytes) ||
        Number(entry.bytes) <= 0,
    )
  ) {
    throw new Error(
      "Host Bridge release set requires the exact seven-platform prebuild with byte counts",
    );
  }
  if (input.cli.binariesBuildFingerprint !== input.cli.buildFingerprint) {
    throw new Error(
      "Host Bridge release set requires a verified prebuild for the current CLI fingerprint",
    );
  }
  const cliIdentity: HostBridgeCliIdentity = {
    schema: "host-bridge.surface-identity.v5",
    protocol: input.protocol,
    cliSchema: input.cliSchema,
    version: input.cli.version,
    buildFingerprint: input.cli.buildFingerprint,
    commandCatalogChecksum: input.cli.commandCatalogChecksum,
  };
  const identityInput = {
    protocol: input.protocol,
    cliSchema: input.cliSchema,
    cli: {
      version: input.cli.version,
      buildFingerprint: input.cli.buildFingerprint,
      commandCatalogChecksum: input.cli.commandCatalogChecksum,
      binaryAggregateSha256: input.cli.binaryAggregateSha256,
      binaries: input.cli.binaries.map(
        ({ platform, binary, sha256, bytes }) => ({
          platform,
          binary,
          sha256,
          bytes,
        }),
      ),
    },
    surfaces: input.surfaces,
  };
  const payloadDigest = `sha256:${sha256(stableJson(identityInput))}`;
  const releaseSetId = `hbrs-${sha256(stableJson(identityInput)).slice(0, 24)}`;
  const surfaces = Object.fromEntries(
    Object.entries(input.surfaces).map(([name, surface]) => [
      name,
      {
        ...surface,
        immutableTag: `host-bridge/${releaseSetId}`,
        cliIdentity: { ...cliIdentity },
      },
    ]),
  ) as Record<keyof HostBridgeReleaseSetInput["surfaces"], unknown>;
  return {
    schema: "host-bridge.release-set.v3" as const,
    releaseSetId,
    status: "planned" as const,
    payloadDigest,
    source: {
      repository: "leike0813/zotero-agents",
      commit: input.sourceCommit,
    },
    protocol: input.protocol,
    cliSchema: input.cliSchema,
    cli: {
      schema: "zotero-bridge-cli-release.v1" as const,
      version: input.cli.version,
      buildFingerprint: input.cli.buildFingerprint,
      binariesBuildFingerprint: input.cli.binariesBuildFingerprint,
      commandCatalogChecksum: input.cli.commandCatalogChecksum,
      binaryAggregateSha256: input.cli.binaryAggregateSha256,
      binaries: input.cli.binaries.map(
        ({ platform, binary, sha256, bytes }) => ({
          platform,
          binary,
          sha256,
          bytes,
        }),
      ),
      identity: cliIdentity,
      prebuild: {
        verified: true as const,
        branch: "host-bridge-cli-prebuilds" as const,
        buildFingerprint: input.cli.binariesBuildFingerprint,
        binaryAggregateSha256: input.cli.binaryAggregateSha256,
      },
    },
    surfaces,
  };
}

export function verifyHostBridgeReleaseSetSurfaces(
  releaseSet: ReturnType<typeof buildHostBridgeReleaseSet>,
  manifests: Array<{
    releaseSetId: string;
    cliIdentity: HostBridgeCliIdentity;
  }>,
) {
  for (const manifest of manifests) {
    if (manifest.releaseSetId !== releaseSet.releaseSetId) {
      throw new Error("Host Bridge surface release set id mismatch");
    }
    if (
      manifest.cliIdentity.buildFingerprint !==
      releaseSet.cli.identity.buildFingerprint
    ) {
      throw new Error("Host Bridge surface CLI build fingerprint mismatch");
    }
    if (
      manifest.cliIdentity.commandCatalogChecksum !==
      releaseSet.cli.identity.commandCatalogChecksum
    ) {
      throw new Error("Host Bridge surface command catalog checksum mismatch");
    }
  }
  return true;
}

function listFiles(root: string, relativePath: string): string[] {
  const absolute = join(root, relativePath);
  if (!existsSync(absolute)) return [];
  if (statSync(absolute).isFile()) return [normalize(relativePath)];
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) =>
    listFiles(root, join(relativePath, entry.name)),
  );
}

export function contentDigest(root: string, paths: string[]) {
  const files = uniqueSorted(paths.flatMap((path) => listFiles(root, path)));
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(`${normalize(relative(root, join(root, file)))}\0`);
    hash.update(readFileSync(join(root, file)));
    hash.update("\0");
  }
  return hash.digest("hex");
}

export const HOST_BRIDGE_PUBLIC_CONTENT = {
  cliBundle: [
    "skills_builtin/zotero-bridge-cli",
    "cli/zotero-bridge/scripts",
    "cli/zotero-bridge/src/agent-surface.json",
  ],
  libraryAgent: [
    "skills_builtin/zotero-bridge-cli",
    "skills_builtin/zotero-library-agent",
    "skills_builtin/zotero-library-query",
    "skills_builtin/zotero-literature-acquisition",
    "skills_builtin/zotero-literature-analysis",
    "skills_builtin/zotero-research-synthesis",
    "skills_builtin/zotero-library-curation",
    "cli/zotero-bridge/scripts",
    "cli/zotero-bridge/src/agent-surface.json",
  ],
  librarianProfile: ["profiles/hermes/zotero-librarian"],
} as const;
