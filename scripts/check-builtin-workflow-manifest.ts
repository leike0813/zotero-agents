import fs from "fs/promises";
import path from "path";

type BuiltinManifest = {
  version: number;
  files: string[];
};

const UNSHIPPED_BUILTIN_PATH_PREFIXES = [];

function normalizeRelativePath(input: string) {
  return String(input || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/");
}

async function collectBuiltinFiles(
  rootDir: string,
  relativeDir = "",
): Promise<string[]> {
  const dirPath = path.join(rootDir, relativeDir);
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const relativePath = normalizeRelativePath(
      path.posix.join(relativeDir.replace(/\\/g, "/"), entry.name),
    );
    if (entry.isDirectory()) {
      files.push(...(await collectBuiltinFiles(rootDir, relativePath)));
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    if (relativePath === "manifest.json") {
      continue;
    }
    files.push(relativePath);
  }
  return files;
}

async function main() {
  const projectRoot = process.cwd();
  const builtinRoot = path.join(projectRoot, "workflows_builtin");
  const manifestPath = path.join(builtinRoot, "manifest.json");

  const rawManifest = await fs.readFile(manifestPath, "utf8");
  const manifest = JSON.parse(rawManifest) as Partial<BuiltinManifest>;

  if (
    typeof manifest.version !== "number" ||
    !Number.isFinite(manifest.version) ||
    manifest.version <= 0
  ) {
    throw new Error("workflows_builtin/manifest.json: invalid version");
  }

  const manifestFiles = Array.isArray(manifest.files)
    ? manifest.files
        .map((entry) => normalizeRelativePath(String(entry || "")))
        .filter(Boolean)
    : [];
  if (!manifestFiles.length) {
    throw new Error("workflows_builtin/manifest.json: files is empty");
  }

  const manifestFileSet = new Set(manifestFiles);
  const actualFiles = (await collectBuiltinFiles(builtinRoot))
    .map((entry) => normalizeRelativePath(entry))
    .filter(Boolean);
  const actualFileSet = new Set(actualFiles);

  const missingOnDisk = manifestFiles.filter(
    (entry) => !actualFileSet.has(entry),
  );
  const missingInManifest = actualFiles.filter(
    (entry) =>
      !manifestFileSet.has(entry) &&
      !UNSHIPPED_BUILTIN_PATH_PREFIXES.some((prefix) =>
        entry.startsWith(prefix),
      ),
  );

  if (missingOnDisk.length || missingInManifest.length) {
    const chunks: string[] = ["[builtin-manifest-check] failed"];
    if (missingOnDisk.length) {
      chunks.push("missing on disk:");
      for (const file of missingOnDisk) {
        chunks.push(`  - ${file}`);
      }
    }
    if (missingInManifest.length) {
      chunks.push("missing in manifest:");
      for (const file of missingInManifest) {
        chunks.push(`  - ${file}`);
      }
    }
    throw new Error(chunks.join("\n"));
  }

  console.log(
    `[builtin-manifest-check] ok (version=${manifest.version}, files=${manifestFiles.length})`,
  );
}

void main().catch((error) => {
  console.error(String(error?.stack || error));
  process.exit(1);
});
