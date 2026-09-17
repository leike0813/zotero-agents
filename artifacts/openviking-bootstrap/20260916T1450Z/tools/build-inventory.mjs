#!/usr/bin/env node
/**
 * Audit helper: build the full-coverage inventory for the OpenViking bootstrap audit.
 * Read-only over the repository. Writes inventory.csv + inventory-summary.md into this dir.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const files = execFileSync("git", ["ls-files", "-z"], { cwd: repo, encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const BINARY_EXT = new Set([
  "png", "jpg", "jpeg", "webp", "gif", "ico", "woff", "woff2", "ttf", "otf", "pdf", "zip", "gz",
  "wasm", "so", "dylib", "dll", "exe", "bin", "mp3", "mp4", "wav", "ogg",
]);

const EXT_LANG = {
  ts: "typescript", tsx: "typescript", mts: "typescript", cts: "typescript",
  js: "javascript", mjs: "javascript", cjs: "javascript", jsx: "javascript",
  rs: "rust", py: "python", sql: "sql", sh: "shell", bash: "shell",
  json: "json", jsonl: "jsonl", yaml: "yaml", yml: "yaml", toml: "toml",
  md: "markdown", mdx: "markdown", ftl: "fluent", html: "html", css: "css",
  j2: "jinja", liquid: "liquid", xml: "xml", svg: "svg", txt: "text",
};

function classify(path) {
  const ext = path.includes(".") ? path.split(".").pop().toLowerCase() : "";

  if (BINARY_EXT.has(ext)) return { category: "asset", module: topModule(path) };

  // Vendored reference baselines (git submodules / pinned upstream copies)
  if (/^references\//.test(path)) return { category: "external", module: "references" };

  // Generated / mirrored output committed on purpose
  if (/^addon\/content\/help-docs\//.test(path)) return { category: "generated", module: "help-docs" };
  if (/^addon\/content\/host-bridge-skills\//.test(path)) return { category: "generated", module: "host-bridge-skills" };
  if (/^addon\/content\/.*\.bundle\.js$/.test(path)) return { category: "generated", module: "addon-bundles" };
  if (/^profiles\/hermes\//.test(path)) return { category: "generated", module: "profiles-hermes" };
  if (/\.tsbuildinfo$/.test(path)) return { category: "generated", module: "tsc" };

  if (/^tests\//.test(path) || /\.test\.[a-z]+$/.test(path)) return { category: "test", module: topModule(path) };
  if (/^scripts\//.test(path)) return { category: "script", module: "scripts" };
  if (/^openspec\//.test(path)) {
    if (/^openspec\/changes\/archive\//.test(path)) return { category: "doc", module: "openspec-archive" };
    if (/^openspec\/changes\//.test(path)) return { category: "doc", module: "openspec-changes" };
    return { category: "doc", module: "openspec-specs" };
  }
  if (/^docs\//.test(path) || /^site\//.test(path)) return { category: "doc", module: topModule(path) };
  if (/^artifacts\//.test(path)) return { category: "doc", module: "artifacts" };
  if (/^addon\/locale\//.test(path)) return { category: "config", module: "addon-locale" };
  if (/^addon\//.test(path)) return { category: "asset", module: "addon" };
  if (/^contracts\//.test(path)) return { category: "contract", module: "contracts" };
  if (/^typings\//.test(path)) return { category: "contract", module: "typings" };
  if (/^(releases|\.github|\.vscode|tools|assets|feeds|profiles_src|non-existing-zotero-data)\//.test(path)) {
    return { category: "config", module: topModule(path) };
  }
  if (/^(skills_builtin|skills_src|workflows_builtin)\//.test(path)) {
    return { category: "content", module: topModule(path) };
  }
  if (/^src\//.test(path) || /^packages\//.test(path) || /^rust\//.test(path)) {
    return { category: "source", module: topModule(path) };
  }
  if (/^(package\.json|package-lock\.json|tsconfig.*\.json|eslint\.config\.mjs|zotero-plugin\.config\.ts|\.gitignore|\.gitmodules|\.prettierignore|\.env\.example|content-package\.version\.json|\.worktreeinclude|\.gitattributes)$/.test(path)) {
    return { category: "config", module: "root" };
  }
  if (/^README.*\.md$/.test(path) || /^(AGENTS|CONTEXT|LICENSE)/.test(path)) {
    return { category: "doc", module: "root" };
  }
  return { category: "other", module: topModule(path) };
}

function topModule(path) {
  const parts = path.split("/");
  if (parts[0] === "src" || parts[0] === "packages" || parts[0] === "rust" || parts[0] === "tests" ||
      parts[0] === "addon" || parts[0] === "scripts" || parts[0] === "docs" || parts[0] === "site") {
    return parts.slice(0, 2).join("/");
  }
  return parts[0];
}

function lineCount(abs) {
  try {
    const out = execFileSync("wc", ["-l", abs], { encoding: "utf8" });
    return Number(out.trim().split(/\s+/)[0]);
  } catch {
    return -1;
  }
}

const rows = [];
for (const path of files) {
  const ext = path.includes(".") ? path.split(".").pop().toLowerCase() : "";
  const { category, module } = classify(path);
  const lang = EXT_LANG[ext] ?? (ext || "none");
  const lines = BINARY_EXT.has(ext) ? 0 : lineCount(join(repo, path));
  rows.push({ path, module, category, lang, lines, status: "pending", note: "" });
}

const header = "path,module,category,lang,lines,status,note";
const csv = [header, ...rows.map(r =>
  [r.path, r.module, r.category, r.lang, r.lines, r.status, r.note]
    .map(v => (String(v).includes(",") ? `"${String(v).replace(/"/g, '""')}"` : String(v)))
    .join(","),
)].join("\n");
writeFileSync(join(here, "inventory.csv"), csv + "\n");

const byCat = new Map();
const byMod = new Map();
for (const r of rows) {
  const c = byCat.get(r.category) ?? { files: 0, lines: 0 };
  c.files++; c.lines += Math.max(0, r.lines);
  byCat.set(r.category, c);
  const m = byMod.get(r.module) ?? { files: 0, lines: 0, cat: r.category };
  m.files++; m.lines += Math.max(0, r.lines);
  byMod.set(r.module, m);
}

const fmt = (n) => n.toLocaleString("en-US");
let md = `# Inventory summary\n\nTotal tracked files: ${fmt(rows.length)}\n\n## By category\n\n| category | files | lines |\n|---|---:|---:|\n`;
for (const [k, v] of [...byCat].sort((a, b) => b[1].files - a[1].files)) {
  md += `| ${k} | ${fmt(v.files)} | ${fmt(v.lines)} |\n`;
}
md += `\n## By module (top 60 by files)\n\n| module | category | files | lines |\n|---|---|---:|---:|\n`;
for (const [k, v] of [...byMod].sort((a, b) => b[1].files - a[1].files).slice(0, 60)) {
  md += `| ${k} | ${v.cat} | ${fmt(v.files)} | ${fmt(v.lines)} |\n`;
}
writeFileSync(join(here, "inventory-summary.md"), md);
console.log(md);
