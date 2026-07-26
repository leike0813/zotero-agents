import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  hostBridgeSkillGeneratedRoot,
  loadHostBridgeSurfaceDefinitions,
  resolveHostBridgeSurface,
  type HostBridgeSurfaceDefinition,
} from "./host-bridge-surface-model";

export const HOST_BRIDGE_REVIEW_INVENTORY_SCHEMA =
  "host-bridge.review-mirror-inventory.v2" as const;
export const HOST_BRIDGE_REVIEW_PROVENANCE_SCHEMA =
  "host-bridge.review-mirror.v2" as const;

export type HostBridgeReviewFile = {
  ownerSurfaceId: string;
  skillId: string | null;
  relativePath: string;
  artifactPath: string;
  sourcePath: string;
  sourceSha256: string;
  protectedStructureSha256: string;
};

export type HostBridgeReviewSurface = {
  id: string;
  kind: HostBridgeSurfaceDefinition["kind"];
  facet: string | null;
  extends: string | null;
  lineage: string[];
  directSkills: string[];
  inheritedSkills: string[];
  ownedFileCount: number;
  inheritedFileCount: number;
  effectiveFileCount: number;
};

export type HostBridgeReviewInventory = {
  schema: typeof HOST_BRIDGE_REVIEW_INVENTORY_SCHEMA;
  surfaceDefinitions: { path: string; schema: string; sha256: string };
  candidateReleaseSet: Record<string, unknown> | null;
  latestCompleteRelease: Record<string, unknown> | null;
  surfaces: HostBridgeReviewSurface[];
  files: HostBridgeReviewFile[];
};

function option(name: string) {
  const prefix = `--${name}=`;
  return (
    process.argv
      .find((value) => value.startsWith(prefix))
      ?.slice(prefix.length) || ""
  );
}

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function normalize(path: string) {
  return path.replace(/\\/g, "/");
}

function readJson(path: string): Record<string, unknown> | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

function releaseIdentity(value: Record<string, unknown> | null) {
  if (!value) return null;
  const source = value.source as Record<string, unknown> | undefined;
  return {
    schema: value.schema ?? null,
    status: value.status ?? null,
    releaseSetId: value.releaseSetId ?? null,
    payloadDigest: value.payloadDigest ?? null,
    sourceCommit: value.sourceCommit ?? source?.commit ?? null,
  };
}

function listMarkdown(root: string, current = root): string[] {
  if (!existsSync(current))
    throw new Error(`Review mirror source root is missing: ${current}`);
  return readdirSync(current, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const path = join(current, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(`Review mirror cannot contain symlinks: ${path}`);
      }
      if (entry.isDirectory()) return listMarkdown(root, path);
      return entry.isFile() && entry.name.endsWith(".md")
        ? [normalize(relative(root, path))]
        : [];
    });
}

function directRootMarkdown(root: string) {
  if (!existsSync(root))
    throw new Error(`Review mirror surface root is missing: ${root}`);
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

export function protectedMarkdownStructure(markdown: string) {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(markdown);
  return {
    fences: [
      ...markdown.matchAll(/(?:```|~~~)[^\n]*\n[\s\S]*?(?:```|~~~)/g),
    ].map((match) => match[0]),
    inlineCode: [...markdown.matchAll(/`[^`\n]+`/g)].map((match) => match[0]),
    urls: [...markdown.matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1]),
    frontmatter: {
      present: Boolean(frontmatter),
      name:
        /^name:\s*([^\r\n]+)$/m.exec(frontmatter?.[1] || "")?.[1]?.trim() || "",
    },
    headingLevels: [...markdown.matchAll(/^(#{1,6})\s+/gm)].map(
      (match) => match[1].length,
    ),
    htmlComments: [...markdown.matchAll(/<!--[\s\S]*?-->/g)].map(
      (match) => match[0],
    ),
  };
}

function structureDigest(markdown: string) {
  return sha256(JSON.stringify(protectedMarkdownStructure(markdown)));
}

function assertInside(parent: string, child: string) {
  const parentPath = `${resolve(parent)}/`;
  const childPath = resolve(child);
  if (!childPath.startsWith(parentPath)) {
    throw new Error(`Review mirror path escapes its root: ${childPath}`);
  }
}

export function buildHostBridgeReviewMirrorInventory(
  args: { root?: string } = {},
): HostBridgeReviewInventory {
  const root = resolve(args.root || process.cwd());
  const definitionsPath = join(root, "host-bridge/surfaces.json");
  const definitionsBytes = readFileSync(definitionsPath, "utf8");
  const definitions = loadHostBridgeSurfaceDefinitions(definitionsPath);
  const files: HostBridgeReviewFile[] = [];

  for (const surface of definitions.surfaces) {
    const seenSources = new Set<string>();
    for (const skill of surface.skills) {
      const generatedRoot = hostBridgeSkillGeneratedRoot(surface, skill);
      const absoluteRoot = join(root, generatedRoot);
      for (const relativePath of listMarkdown(absoluteRoot)) {
        const sourcePath = normalize(join(generatedRoot, relativePath));
        if (seenSources.has(sourcePath))
          throw new Error(`Duplicate review source: ${sourcePath}`);
        seenSources.add(sourcePath);
        const markdown = readFileSync(join(root, sourcePath), "utf8");
        files.push({
          ownerSurfaceId: surface.id,
          skillId: skill.id,
          relativePath,
          artifactPath: normalize(join(surface.id, skill.mount, relativePath)),
          sourcePath,
          sourceSha256: sha256(markdown),
          protectedStructureSha256: structureDigest(markdown),
        });
      }
    }
    for (const relativePath of directRootMarkdown(
      join(root, surface.generatedRoot),
    )) {
      const sourcePath = normalize(join(surface.generatedRoot, relativePath));
      if (seenSources.has(sourcePath)) continue;
      const markdown = readFileSync(join(root, sourcePath), "utf8");
      files.push({
        ownerSurfaceId: surface.id,
        skillId: null,
        relativePath,
        artifactPath: normalize(join(surface.id, relativePath)),
        sourcePath,
        sourceSha256: sha256(markdown),
        protectedStructureSha256: structureDigest(markdown),
      });
    }
  }
  files.sort((left, right) =>
    left.artifactPath.localeCompare(right.artifactPath),
  );
  if (new Set(files.map((entry) => entry.artifactPath)).size !== files.length) {
    throw new Error(
      "Review mirror inventory contains duplicate artifact paths",
    );
  }

  const ownedCounts = new Map(
    definitions.surfaces.map((surface) => [
      surface.id,
      files.filter((file) => file.ownerSurfaceId === surface.id).length,
    ]),
  );
  const surfaces = definitions.surfaces.map(
    (surface): HostBridgeReviewSurface => {
      const resolved = resolveHostBridgeSurface(definitions, surface.id);
      const ownedFileCount = ownedCounts.get(surface.id) || 0;
      const effectiveFileCount = resolved.lineage.reduce(
        (sum, layer) => sum + (ownedCounts.get(layer.id) || 0),
        0,
      );
      return {
        id: surface.id,
        kind: surface.kind,
        facet: surface.facet || null,
        extends: surface.extends || null,
        lineage: resolved.lineage.map((layer) => layer.id),
        directSkills: surface.skills.map((skill) => skill.id),
        inheritedSkills: resolved.skills
          .map((skill) => skill.id)
          .filter(
            (skillId) => !surface.skills.some((skill) => skill.id === skillId),
          ),
        ownedFileCount,
        inheritedFileCount: effectiveFileCount - ownedFileCount,
        effectiveFileCount,
      };
    },
  );

  return {
    schema: HOST_BRIDGE_REVIEW_INVENTORY_SCHEMA,
    surfaceDefinitions: {
      path: "host-bridge/surfaces.json",
      schema: definitions.schema,
      sha256: sha256(definitionsBytes),
    },
    candidateReleaseSet: releaseIdentity(
      readJson(join(root, "host-bridge/release-set.json")),
    ),
    latestCompleteRelease: releaseIdentity(
      readJson(join(root, "host-bridge/latest-complete-release-receipt.json")),
    ),
    surfaces,
    files,
  };
}

function sameInventory(
  left: HostBridgeReviewInventory,
  right: HostBridgeReviewInventory,
) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function prepareHostBridgeReviewMirror(args: {
  root?: string;
  stagingRoot: string;
}) {
  const root = resolve(args.root || process.cwd());
  const stagingRoot = resolve(args.stagingRoot);
  if (!args.stagingRoot)
    throw new Error("prepare requires --staging=<directory>");
  if (existsSync(stagingRoot) && readdirSync(stagingRoot).length > 0) {
    throw new Error("Review mirror staging directory must be empty");
  }
  mkdirSync(stagingRoot, { recursive: true });
  const inventory = buildHostBridgeReviewMirrorInventory({ root });
  for (const entry of inventory.files) {
    const snapshot = join(stagingRoot, "source", entry.artifactPath);
    const translated = join(stagingRoot, "translated", entry.artifactPath);
    assertInside(stagingRoot, snapshot);
    assertInside(stagingRoot, translated);
    mkdirSync(dirname(snapshot), { recursive: true });
    mkdirSync(dirname(translated), { recursive: true });
    cpSync(join(root, entry.sourcePath), snapshot);
  }
  writeFileSync(
    join(stagingRoot, "inventory.json"),
    `${JSON.stringify(inventory, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    join(stagingRoot, "summaries.template.json"),
    `${JSON.stringify({ schema: "host-bridge.review-summaries.v1", summaries: Object.fromEntries(inventory.files.map((entry) => [entry.artifactPath, ""])) }, null, 2)}\n`,
    "utf8",
  );
  return inventory;
}

function readFrozenInventory(stagingRoot: string): HostBridgeReviewInventory {
  const value = readJson(join(stagingRoot, "inventory.json"));
  if (!value || value.schema !== HOST_BRIDGE_REVIEW_INVENTORY_SCHEMA) {
    throw new Error(
      "Review mirror staging inventory is missing or unsupported",
    );
  }
  return value as unknown as HostBridgeReviewInventory;
}

function validateTranslations(
  stagingRoot: string,
  inventory: HostBridgeReviewInventory,
) {
  const translatedRoot = join(stagingRoot, "translated");
  const expected = new Set(inventory.files.map((entry) => entry.artifactPath));
  const actual = new Set(listMarkdown(translatedRoot));
  for (const path of expected)
    if (!actual.has(path))
      throw new Error(`Review mirror translation missing: ${path}`);
  for (const path of actual)
    if (!expected.has(path))
      throw new Error(`Review mirror translation is unmanaged: ${path}`);

  const summariesValue = readJson(join(stagingRoot, "summaries.json"));
  const summaries = summariesValue?.summaries as
    | Record<string, unknown>
    | undefined;
  if (
    summariesValue?.schema !== "host-bridge.review-summaries.v1" ||
    !summaries
  ) {
    throw new Error("Review mirror summaries.json is missing or unsupported");
  }
  if (
    JSON.stringify(Object.keys(summaries).sort()) !==
    JSON.stringify([...expected].sort())
  ) {
    throw new Error("Review mirror summaries do not match the exact inventory");
  }

  return inventory.files.map((entry) => {
    const sourcePath = join(stagingRoot, "source", entry.artifactPath);
    const translatedPath = join(translatedRoot, entry.artifactPath);
    if (lstatSync(translatedPath).isSymbolicLink())
      throw new Error(
        `Review mirror translation cannot be a symlink: ${entry.artifactPath}`,
      );
    const source = readFileSync(sourcePath, "utf8");
    const translated = readFileSync(translatedPath, "utf8");
    if (sha256(source) !== entry.sourceSha256)
      throw new Error(`Frozen review source is corrupt: ${entry.sourcePath}`);
    if (structureDigest(source) !== structureDigest(translated)) {
      throw new Error(
        `Protected Markdown structure changed: ${entry.artifactPath}`,
      );
    }
    const summary = summaries[entry.artifactPath];
    if (typeof summary !== "string" || !summary.trim())
      throw new Error(
        `Review mirror summary is missing: ${entry.artifactPath}`,
      );
    return {
      ...entry,
      translatedSha256: sha256(translated),
      translatedStructureSha256: structureDigest(translated),
      summary: summary.trim(),
    };
  });
}

function renderIndex(
  generatedAt: string,
  inventory: HostBridgeReviewInventory,
  files: Array<HostBridgeReviewFile & { summary: string }>,
) {
  const lines = [
    "# Host Bridge 中文审阅镜像",
    "",
    `生成时间：${generatedAt}`,
    "",
    "本目录按发布面所有权保存中文译文；继承内容只在其所有者目录出现一次。有效组成由下表的继承链和文件数表达。",
    "",
    "| 发布面 | 类型 | 继承链 | 自有文件 | 继承文件 | 有效文件 |",
    "| --- | --- | --- | ---: | ---: | ---: |",
    ...inventory.surfaces.map(
      (surface) =>
        `| \`${surface.id}\` | \`${surface.kind}\` | ${surface.lineage.map((id) => `\`${id}\``).join(" → ")} | ${surface.ownedFileCount} | ${surface.inheritedFileCount} | ${surface.effectiveFileCount} |`,
    ),
    "",
  ];
  for (const surface of inventory.surfaces) {
    lines.push(`## ${surface.id}`, "");
    for (const file of files.filter(
      (entry) => entry.ownerSurfaceId === surface.id,
    )) {
      lines.push(
        `- [${file.artifactPath}](${file.artifactPath}): ${file.summary}`,
      );
    }
    lines.push("");
  }
  return `${lines.join("\n").trim()}\n`;
}

function sourceCommit(root: string) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unavailable";
  }
}

export function finalizeHostBridgeReviewMirror(args: {
  root?: string;
  stagingRoot: string;
  targetRoot: string;
  sourceCommit?: string;
  generatedAt?: string;
}) {
  const root = resolve(args.root || process.cwd());
  const stagingRoot = resolve(args.stagingRoot);
  const targetRoot = resolve(args.targetRoot);
  if (!args.stagingRoot || !args.targetRoot)
    throw new Error("finalize requires --staging and --target");
  const frozen = readFrozenInventory(stagingRoot);
  const current = buildHostBridgeReviewMirrorInventory({ root });
  if (!sameInventory(frozen, current))
    throw new Error("Host Bridge review source changed since prepare");
  const files = validateTranslations(stagingRoot, frozen);
  const generatedAt = args.generatedAt || new Date().toISOString();
  const provenance = {
    schema: HOST_BRIDGE_REVIEW_PROVENANCE_SCHEMA,
    generatedAt,
    sourceCommit: args.sourceCommit || sourceCommit(root),
    surfaceDefinitions: frozen.surfaceDefinitions,
    candidateReleaseSet: frozen.candidateReleaseSet,
    latestCompleteRelease: frozen.latestCompleteRelease,
    fileCount: files.length,
    surfaces: frozen.surfaces,
    files: files.map(({ summary: _summary, ...file }) => file),
  };
  const translatedRoot = join(stagingRoot, "translated");
  writeFileSync(
    join(translatedRoot, "INDEX.md"),
    renderIndex(generatedAt, frozen, files),
    "utf8",
  );
  writeFileSync(
    join(translatedRoot, "PROVENANCE.json"),
    `${JSON.stringify(provenance, null, 2)}\n`,
    "utf8",
  );

  const parent = dirname(targetRoot);
  const backup = `${targetRoot}.previous-${process.pid}`;
  const next = `${targetRoot}.next-${process.pid}`;
  mkdirSync(parent, { recursive: true });
  rmSync(backup, { recursive: true, force: true });
  rmSync(next, { recursive: true, force: true });
  cpSync(translatedRoot, next, { recursive: true });
  if (existsSync(targetRoot)) renameSync(targetRoot, backup);
  try {
    renameSync(next, targetRoot);
    rmSync(backup, { recursive: true, force: true });
  } catch (error) {
    rmSync(next, { recursive: true, force: true });
    if (existsSync(backup) && !existsSync(targetRoot))
      renameSync(backup, targetRoot);
    throw error;
  }
  return provenance;
}

export function checkHostBridgeReviewMirror(args: {
  root?: string;
  targetRoot: string;
}) {
  const root = resolve(args.root || process.cwd());
  const targetRoot = resolve(args.targetRoot);
  const provenanceValue = readJson(join(targetRoot, "PROVENANCE.json"));
  if (
    !provenanceValue ||
    provenanceValue.schema !== HOST_BRIDGE_REVIEW_PROVENANCE_SCHEMA
  ) {
    throw new Error("Review mirror provenance is missing or unsupported");
  }
  const provenance = provenanceValue as Record<string, unknown> & {
    fileCount: number;
    files: Array<
      HostBridgeReviewFile & {
        translatedSha256: string;
        translatedStructureSha256: string;
      }
    >;
  };
  const current = buildHostBridgeReviewMirrorInventory({ root });
  const recordedInventory: HostBridgeReviewInventory = {
    schema: HOST_BRIDGE_REVIEW_INVENTORY_SCHEMA,
    surfaceDefinitions:
      provenance.surfaceDefinitions as HostBridgeReviewInventory["surfaceDefinitions"],
    candidateReleaseSet: provenance.candidateReleaseSet as Record<
      string,
      unknown
    > | null,
    latestCompleteRelease: provenance.latestCompleteRelease as Record<
      string,
      unknown
    > | null,
    surfaces: provenance.surfaces as HostBridgeReviewSurface[],
    files: provenance.files.map(
      ({
        translatedSha256: _translated,
        translatedStructureSha256: _structure,
        ...file
      }) => file,
    ),
  };
  if (!sameInventory(current, recordedInventory))
    throw new Error("Review mirror inventory or release identity is stale");
  const expectedMarkdown = new Set([
    "INDEX.md",
    ...current.files.map((entry) => entry.artifactPath),
  ]);
  const actualMarkdown = new Set(listMarkdown(targetRoot));
  if (
    JSON.stringify([...expectedMarkdown].sort()) !==
    JSON.stringify([...actualMarkdown].sort())
  ) {
    throw new Error("Review mirror formal Markdown set is stale or unmanaged");
  }
  if (
    provenance.fileCount !== current.files.length ||
    provenance.files.length !== current.files.length
  ) {
    throw new Error("Review mirror provenance file set is stale");
  }
  const index = readFileSync(join(targetRoot, "INDEX.md"), "utf8");
  for (const file of provenance.files) {
    const translatedPath = join(targetRoot, file.artifactPath);
    if (lstatSync(translatedPath).isSymbolicLink())
      throw new Error(
        `Review mirror translation cannot be a symlink: ${file.artifactPath}`,
      );
    const source = readFileSync(join(root, file.sourcePath), "utf8");
    const translated = readFileSync(translatedPath, "utf8");
    if (
      sha256(source) !== file.sourceSha256 ||
      sha256(translated) !== file.translatedSha256
    ) {
      throw new Error(
        `Review mirror provenance mismatch: ${file.artifactPath}`,
      );
    }
    if (
      structureDigest(source) !== file.protectedStructureSha256 ||
      structureDigest(translated) !== file.translatedStructureSha256
    ) {
      throw new Error(
        `Review mirror protected structure mismatch: ${file.artifactPath}`,
      );
    }
    const link = `](${file.artifactPath})`;
    if (index.split(link).length - 1 !== 1)
      throw new Error(
        `Review mirror index link mismatch: ${file.artifactPath}`,
      );
  }
  return provenance;
}

function isMainModule() {
  return process.argv[1]
    ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
    : false;
}

if (isMainModule()) {
  const command = process.argv[2] || "inventory";
  const result =
    command === "prepare"
      ? prepareHostBridgeReviewMirror({ stagingRoot: option("staging") })
      : command === "finalize"
        ? finalizeHostBridgeReviewMirror({
            stagingRoot: option("staging"),
            targetRoot: option("target"),
          })
        : command === "check"
          ? checkHostBridgeReviewMirror({
              targetRoot: option("target") || "artifact/host-bridge-review",
            })
          : buildHostBridgeReviewMirrorInventory();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
