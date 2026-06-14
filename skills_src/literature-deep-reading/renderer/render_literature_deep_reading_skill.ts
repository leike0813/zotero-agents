import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const THIS_FILE = fileURLToPath(import.meta.url);
const SUITE_ROOT = path.resolve(path.dirname(THIS_FILE), "..");
const REPO_ROOT = path.resolve(SUITE_ROOT, "..", "..");
const SKILL_ID = "literature-deep-reading";
const GENERATED_NOTICE =
  "<!-- 本文件由 skills_src/literature-deep-reading 生成，请勿手工修改。 -->";

async function readText(...parts: string[]) {
  return fs.readFile(path.join(...parts), "utf8");
}

async function writeText(filePath: string, content: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

async function copyTextFile(sourcePath: string, targetPath: string) {
  await writeText(targetPath, await fs.readFile(sourcePath, "utf8"));
}

async function copyDirectory(sourceRoot: string, targetRoot: string) {
  const entries = await fs.readdir(sourceRoot, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(sourceRoot, entry.name);
    const targetPath = path.join(targetRoot, entry.name);
    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath);
    } else if (entry.isFile()) {
      await copyTextFile(sourcePath, targetPath);
    }
  }
}

async function renderSkillMd(targetRoot: string) {
  const template = await readText(SUITE_ROOT, "templates", "SKILL.md");
  let rendered = template.trimEnd();
  if (rendered.startsWith("---\n")) {
    const end = rendered.indexOf("\n---", 4);
    if (end >= 0) {
      const frontmatterEnd = end + "\n---".length;
      rendered = `${rendered.slice(0, frontmatterEnd)}\n\n${GENERATED_NOTICE}${rendered.slice(frontmatterEnd)}`;
    }
  } else {
    rendered = `${GENERATED_NOTICE}\n${rendered}`;
  }
  await writeText(path.join(targetRoot, "SKILL.md"), `${rendered}\n`);
}

async function renderAssets(targetRoot: string) {
  const assetNames = [
    "input.schema.json",
    "parameter.schema.json",
    "output.schema.json",
    "runner.json",
  ];
  for (const assetName of assetNames) {
    await copyTextFile(
      path.join(SUITE_ROOT, "assets", assetName),
      path.join(targetRoot, "assets", assetName),
    );
  }
  await copyDirectory(
    path.join(SUITE_ROOT, "assets", "schemas"),
    path.join(targetRoot, "assets", "schemas"),
  );
}

async function renderScripts(targetRoot: string) {
  await copyTextFile(
    path.join(SUITE_ROOT, "runtime", "deep_reading_runtime.py"),
    path.join(targetRoot, "scripts", "deep_reading_runtime.py"),
  );
}

async function renderRendererTemplates(targetRoot: string) {
  await copyDirectory(
    path.join(SUITE_ROOT, "renderer", "templates"),
    path.join(targetRoot, "renderer", "templates"),
  );
}

export async function renderLiteratureDeepReadingSkill(options?: {
  outRoot?: string;
}) {
  execSync("npx tsx scripts/build-literature-deep-reading-graph-renderer.ts", {
    cwd: REPO_ROOT,
    env: { ...process.env, LDR_GRAPH_BUILD_QUIET: "1" },
    stdio: "inherit",
  });
  const outRoot = options?.outRoot || path.join(REPO_ROOT, "skills_builtin");
  const targetRoot = path.join(outRoot, SKILL_ID);
  await fs.rm(targetRoot, { recursive: true, force: true });
  await renderSkillMd(targetRoot);
  await renderAssets(targetRoot);
  await renderScripts(targetRoot);
  await renderRendererTemplates(targetRoot);
  return targetRoot;
}

if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  await renderLiteratureDeepReadingSkill();
}
