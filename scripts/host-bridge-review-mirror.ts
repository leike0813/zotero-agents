import { createHash } from "node:crypto";
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
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const SURFACES = {
  "cli-wrapper": "skills_builtin/zotero-bridge-cli",
  "library-agent": "skills_builtin/zotero-library-agent",
  "librarian-profile": "profiles/hermes/zotero-librarian",
} as const;

type SurfaceName = keyof typeof SURFACES;
type InventoryEntry = {
  surface: SurfaceName;
  relativePath: string;
  sourcePath: string;
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

function listMarkdown(root: string, current = root): string[] {
  return readdirSync(current, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const path = join(current, entry.name);
      if (entry.isSymbolicLink())
        throw new Error(
          `Review mirror source cannot contain symlinks: ${path}`,
        );
      if (entry.isDirectory()) return listMarkdown(root, path);
      return entry.isFile() && entry.name.endsWith(".md")
        ? [relative(root, path).replace(/\\/g, "/")]
        : [];
    });
}

export function buildHostBridgeReviewMirrorInventory(): InventoryEntry[] {
  return (Object.entries(SURFACES) as Array<[SurfaceName, string]>).flatMap(
    ([surface, sourceRoot]) =>
      listMarkdown(join(ROOT, sourceRoot)).map((relativePath) => ({
        surface,
        relativePath,
        sourcePath: `${sourceRoot}/${relativePath}`,
      })),
  );
}

function protectedStructure(markdown: string) {
  return {
    fences: [...markdown.matchAll(/```[^\n]*\n[\s\S]*?```/g)].map(
      (match) => match[0],
    ),
    inlineCode: [...markdown.matchAll(/`[^`\n]+`/g)].map((match) => match[0]),
    urls: [...markdown.matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1]),
    frontmatterName:
      /^---\n[\s\S]*?\nname:\s*([^\n]+)[\s\S]*?\n---/m
        .exec(markdown)?.[1]
        ?.trim() || "",
  };
}

function assertInside(parent: string, child: string) {
  const parentPath = `${resolve(parent)}/`;
  const childPath = resolve(child);
  if (!childPath.startsWith(parentPath)) {
    throw new Error(`Review mirror path escapes staging root: ${childPath}`);
  }
}

function prepare(stagingRoot: string) {
  if (!stagingRoot) throw new Error("prepare requires --staging=<directory>");
  mkdirSync(stagingRoot, { recursive: true });
  const inventory = buildHostBridgeReviewMirrorInventory();
  for (const entry of inventory) {
    const source = join(ROOT, entry.sourcePath);
    const snapshot = join(
      stagingRoot,
      "source",
      entry.surface,
      entry.relativePath,
    );
    const translated = join(
      stagingRoot,
      "translated",
      entry.surface,
      entry.relativePath,
    );
    assertInside(stagingRoot, snapshot);
    assertInside(stagingRoot, translated);
    mkdirSync(dirname(snapshot), { recursive: true });
    mkdirSync(dirname(translated), { recursive: true });
    cpSync(source, snapshot);
  }
  writeFileSync(
    join(stagingRoot, "inventory.json"),
    `${JSON.stringify({ schema: "host-bridge.review-mirror-inventory.v1", inventory }, null, 2)}\n`,
    "utf8",
  );
  return inventory;
}

function validate(stagingRoot: string) {
  const inventory = buildHostBridgeReviewMirrorInventory();
  const expected = new Set(
    inventory.map((entry) => `${entry.surface}/${entry.relativePath}`),
  );
  const translatedRoot = join(stagingRoot, "translated");
  if (!existsSync(join(translatedRoot, "INDEX.md"))) {
    throw new Error("Review mirror staging is missing translated/INDEX.md");
  }
  const actual = new Set<string>();
  for (const surface of Object.keys(SURFACES) as SurfaceName[]) {
    const root = join(translatedRoot, surface);
    if (!existsSync(root))
      throw new Error(`Review mirror staging is missing ${surface}`);
    for (const relativePath of listMarkdown(root))
      actual.add(`${surface}/${relativePath}`);
  }
  for (const path of expected)
    if (!actual.has(path))
      throw new Error(`Review mirror translation missing: ${path}`);
  for (const path of actual)
    if (!expected.has(path))
      throw new Error(
        `Review mirror translation is stale or unmanaged: ${path}`,
      );

  const protectedStructureMismatches: string[] = [];
  const files = inventory.map((entry) => {
    const sourcePath = join(
      stagingRoot,
      "source",
      entry.surface,
      entry.relativePath,
    );
    const translatedPath = join(
      translatedRoot,
      entry.surface,
      entry.relativePath,
    );
    if (lstatSync(translatedPath).isSymbolicLink())
      throw new Error(
        `Review mirror translation cannot be a symlink: ${translatedPath}`,
      );
    const source = readFileSync(sourcePath, "utf8");
    const translated = readFileSync(translatedPath, "utf8");
    if (
      JSON.stringify(protectedStructure(source)) !==
      JSON.stringify(protectedStructure(translated))
    ) {
      protectedStructureMismatches.push(
        `${entry.surface}/${entry.relativePath}`,
      );
    }
    return {
      ...entry,
      sourceSha256: sha256(source),
      translatedSha256: sha256(translated),
    };
  });
  if (protectedStructureMismatches.length > 0) {
    throw new Error(
      `Protected Markdown structure changed during translation:\n${protectedStructureMismatches.join("\n")}`,
    );
  }
  return files;
}

function finalize(stagingRoot: string, targetRoot: string) {
  if (!stagingRoot || !targetRoot)
    throw new Error("finalize requires --staging and --target");
  const files = validate(stagingRoot);
  const translatedRoot = join(stagingRoot, "translated");
  const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
  }).trim();
  const provenance = {
    schema: "host-bridge.review-mirror.v1",
    generatedAt: new Date().toISOString(),
    sourceCommit,
    fileCount: files.length,
    surfaces: Object.fromEntries(
      (Object.keys(SURFACES) as SurfaceName[]).map((surface) => [
        surface,
        files.filter((file) => file.surface === surface).length,
      ]),
    ),
    files,
  };
  writeFileSync(
    join(translatedRoot, "PROVENANCE.json"),
    `${JSON.stringify(provenance, null, 2)}\n`,
    "utf8",
  );
  const target = resolve(targetRoot);
  const parent = dirname(target);
  mkdirSync(parent, { recursive: true });
  const backup = `${target}.previous-${process.pid}`;
  const next = `${target}.next-${process.pid}`;
  if (existsSync(backup)) rmSync(backup, { recursive: true, force: true });
  if (existsSync(next)) rmSync(next, { recursive: true, force: true });
  cpSync(translatedRoot, next, { recursive: true });
  if (existsSync(target)) renameSync(target, backup);
  try {
    renameSync(next, target);
    if (existsSync(backup)) rmSync(backup, { recursive: true, force: true });
  } catch (error) {
    if (existsSync(next)) rmSync(next, { recursive: true, force: true });
    if (existsSync(backup) && !existsSync(target)) renameSync(backup, target);
    throw error;
  }
  return provenance;
}

function check(targetRoot: string) {
  const provenancePath = join(targetRoot, "PROVENANCE.json");
  if (!existsSync(provenancePath))
    throw new Error("Review mirror provenance is missing");
  const provenance = JSON.parse(readFileSync(provenancePath, "utf8"));
  const inventory = buildHostBridgeReviewMirrorInventory();
  if (provenance.fileCount !== inventory.length)
    throw new Error("Review mirror inventory count is stale");
  for (const entry of provenance.files || []) {
    const source = readFileSync(join(ROOT, entry.sourcePath), "utf8");
    const translated = readFileSync(
      join(targetRoot, entry.surface, entry.relativePath),
      "utf8",
    );
    if (
      sha256(source) !== entry.sourceSha256 ||
      sha256(translated) !== entry.translatedSha256
    ) {
      throw new Error(
        `Review mirror provenance mismatch: ${entry.surface}/${entry.relativePath}`,
      );
    }
    if (
      JSON.stringify(protectedStructure(source)) !==
      JSON.stringify(protectedStructure(translated))
    ) {
      throw new Error(
        `Review mirror protected structure mismatch: ${entry.surface}/${entry.relativePath}`,
      );
    }
  }
  return provenance;
}

const command = process.argv[2] || "inventory";
const result =
  command === "prepare"
    ? prepare(option("staging"))
    : command === "finalize"
      ? finalize(option("staging"), option("target"))
      : command === "check"
        ? check(option("target") || "artifact/host-bridge-review")
        : buildHostBridgeReviewMirrorInventory();
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
