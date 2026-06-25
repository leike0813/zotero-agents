import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import {
  compileSkillJsonSchema,
  type AcpSkillSchemaKey,
  validateRunnerManifestShape,
  validateSkillSchemaAnnotations,
} from "../../../src/modules/acpSkillSchemaAssets";

const THIS_FILE = fileURLToPath(import.meta.url);
const SUITE_ROOT = path.resolve(path.dirname(THIS_FILE), "..");
const REPO_ROOT = path.resolve(SUITE_ROOT, "..", "..");
const SKILL_ID = "literature-deep-reading";
const GENERATED_NOTICE =
  "<!-- 本文件由 skills_src/literature-deep-reading 生成，请勿手工修改。 -->";

async function readText(...parts: string[]) {
  return fs.readFile(path.join(...parts), "utf8");
}

async function readJson(...parts: string[]) {
  return JSON.parse(await readText(...parts)) as Record<string, unknown>;
}

async function writeText(filePath: string, content: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

function assertNoRenderContractErrors(label: string, errors: string[]): void {
  if (errors.length > 0) {
    throw new Error(
      `${label} violates Skill Runner render precondition:\n${errors.join("\n")}`,
    );
  }
}

function validateSchemaAssetBeforeRender(
  schemaKey: AcpSkillSchemaKey,
  schema: Record<string, unknown>,
): void {
  assertNoRenderContractErrors(`${SKILL_ID} ${schemaKey} schema`, [
    ...compileSkillJsonSchema({ schema, schemaKey }),
    ...validateSkillSchemaAnnotations({ schema, schemaKey }),
  ]);
}

async function validateSourceAssetsBeforeRender() {
  const runner = await readJson(SUITE_ROOT, "assets", "runner.json");
  assertNoRenderContractErrors(
    `${SKILL_ID} runner manifest`,
    validateRunnerManifestShape({
      runnerJson: runner,
      skillDirName: SKILL_ID,
      skillFrontmatterName: SKILL_ID,
    }),
  );
  for (const schemaKey of [
    "input",
    "parameter",
    "output",
  ] satisfies AcpSkillSchemaKey[]) {
    validateSchemaAssetBeforeRender(
      schemaKey,
      await readJson(SUITE_ROOT, "assets", `${schemaKey}.schema.json`),
    );
  }
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
  await copyTextFile(
    path.join(REPO_ROOT, "addon", "content", "shared", "markdown-renderer.js"),
    path.join(targetRoot, "renderer", "templates", "markdown-renderer.js"),
  );
  await copyTextFile(
    path.join(REPO_ROOT, "addon", "content", "shared", "markdown-renderer.css"),
    path.join(targetRoot, "renderer", "templates", "markdown-renderer.css"),
  );
}

export async function renderLiteratureDeepReadingSkill(options?: {
  outRoot?: string;
}) {
  await validateSourceAssetsBeforeRender();
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
