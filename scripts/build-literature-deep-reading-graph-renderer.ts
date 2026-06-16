import { execSync } from "child_process";
import fs from "fs/promises";
import path from "path";

import { buildHarnessSynthesisI18nEnvelope } from "../src/modules/harness/synthesisWorkbenchI18nEnvelope";

const repoRoot = process.cwd();
const outDir = path.join(
  repoRoot,
  "skills_src",
  "literature-deep-reading",
  "renderer",
  "templates",
);
const jsOut = path.join(outDir, "citation-graph-standalone.js");
const cssOut = path.join(outDir, "citation-graph-standalone.css");
const synthesisAppOut = path.join(outDir, "citation-graph-synthesis-app.js");
const synthesisCssOut = path.join(outDir, "citation-graph-synthesis.css");
const synthesisThemeOut = path.join(outDir, "citation-graph-synthesis-theme.js");
const synthesisI18nOut = path.join(outDir, "citation-graph-synthesis-i18n.json");
const entry = path.join(
  repoRoot,
  "src",
  "shared",
  "citationGraphStandalone.ts",
);
const synthesisEntry = path.join(repoRoot, "src", "synthesisWorkbenchApp.ts");
const cssEntry = path.join(
  repoRoot,
  "src",
  "shared",
  "citationGraphStandalone.css",
);
const quiet = process.env.LDR_GRAPH_BUILD_QUIET === "1";

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const esbuildBin = path.join(
    repoRoot,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "esbuild.cmd" : "esbuild",
  );
  const command = [
    `"${esbuildBin}"`,
    `"${entry}"`,
    "--bundle",
    "--minify",
    "--format=iife",
    "--target=es2020",
    "--global-name=ZoteroSkillsCitationGraphBundle",
    `"--outfile=${jsOut}"`,
  ].join(" ");
  execSync(command, { cwd: repoRoot, stdio: quiet ? "pipe" : "inherit" });
  const synthesisCommand = [
    `"${esbuildBin}"`,
    `"${synthesisEntry}"`,
    "--bundle",
    "--minify",
    "--format=iife",
    "--target=es2020",
    `"--outfile=${synthesisAppOut}"`,
  ].join(" ");
  execSync(synthesisCommand, {
    cwd: repoRoot,
    stdio: quiet ? "pipe" : "inherit",
  });
  await fs.copyFile(cssEntry, cssOut);
  await fs.copyFile(
    path.join(repoRoot, "addon", "content", "shared", "theme.js"),
    synthesisThemeOut,
  );
  const synthesisCssParts = await Promise.all([
    fs.readFile(
      path.join(repoRoot, "addon", "content", "shared", "theme.css"),
      "utf8",
    ),
    fs.readFile(
      path.join(
        repoRoot,
        "addon",
        "content",
        "dashboard",
        "vendor",
        "katex",
        "katex.min.css",
      ),
      "utf8",
    ),
    fs.readFile(
      path.join(repoRoot, "addon", "content", "synthesis", "styles.css"),
      "utf8",
    ),
  ]);
  await fs.writeFile(
    synthesisCssOut,
    `${synthesisCssParts.join("\n\n")}\n`,
    "utf8",
  );
  const synthesisI18n = Object.fromEntries(
    ["en-US", "zh-CN", "fr-FR", "ja-JP"].map((locale) => [
      locale,
      buildHarnessSynthesisI18nEnvelope(locale, { rootDir: repoRoot }),
    ]),
  );
  await fs.writeFile(
    synthesisI18nOut,
    `${JSON.stringify(synthesisI18n, null, 2)}\n`,
    "utf8",
  );
  const jsBytes = (await fs.stat(jsOut)).size;
  const cssBytes = (await fs.stat(cssOut)).size;
  const synthesisAppBytes = (await fs.stat(synthesisAppOut)).size;
  const synthesisCssBytes = (await fs.stat(synthesisCssOut)).size;
  const synthesisThemeBytes = (await fs.stat(synthesisThemeOut)).size;
  const synthesisI18nBytes = (await fs.stat(synthesisI18nOut)).size;
  const total = jsBytes + cssBytes;
  if (!quiet) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          js_path: path.relative(repoRoot, jsOut).replace(/\\/g, "/"),
          css_path: path.relative(repoRoot, cssOut).replace(/\\/g, "/"),
          synthesis_app_path: path
            .relative(repoRoot, synthesisAppOut)
            .replace(/\\/g, "/"),
          synthesis_css_path: path
            .relative(repoRoot, synthesisCssOut)
            .replace(/\\/g, "/"),
          synthesis_theme_path: path
            .relative(repoRoot, synthesisThemeOut)
            .replace(/\\/g, "/"),
          synthesis_i18n_path: path
            .relative(repoRoot, synthesisI18nOut)
            .replace(/\\/g, "/"),
          js_bytes: jsBytes,
          css_bytes: cssBytes,
          synthesis_app_bytes: synthesisAppBytes,
          synthesis_css_bytes: synthesisCssBytes,
          synthesis_theme_bytes: synthesisThemeBytes,
          synthesis_i18n_bytes: synthesisI18nBytes,
          total_bytes: total,
          over_one_mb: total > 1024 * 1024,
        },
        null,
        2,
      ),
    );
  }
  if (total > 1024 * 1024) {
    throw new Error(`citation graph standalone bundle exceeds 1MB: ${total}`);
  }
}

await main();
