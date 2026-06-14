import { execSync } from "child_process";
import fs from "fs/promises";
import path from "path";

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
const entry = path.join(
  repoRoot,
  "src",
  "shared",
  "citationGraphStandalone.ts",
);
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
  await fs.copyFile(cssEntry, cssOut);
  const jsBytes = (await fs.stat(jsOut)).size;
  const cssBytes = (await fs.stat(cssOut)).size;
  const total = jsBytes + cssBytes;
  if (!quiet) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          js_path: path.relative(repoRoot, jsOut).replace(/\\/g, "/"),
          css_path: path.relative(repoRoot, cssOut).replace(/\\/g, "/"),
          js_bytes: jsBytes,
          css_bytes: cssBytes,
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
