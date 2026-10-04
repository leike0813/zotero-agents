// Build-only, throwaway UI asset. Never imported by the plugin build.
import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../../", import.meta.url));
const source = "src/dashboard/prototypes/builtinAgentSettings.prototype";
const output = path.join(
  root,
  "artifacts/pi-agent-runtime/settings-prototype/index.html",
);
// Reuse the project's pure normalizer at build time; the UI receives data only.
const normalizerBundle = await build({
  entryPoints: [path.join(root, "src/modules/piModelCatalogData.ts")],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const { normalizePiOfficialCatalog } = await import(
  `data:text/javascript;base64,${Buffer.from(normalizerBundle.outputFiles[0].text).toString("base64")}`
);
const seed = JSON.parse(
  await readFile(path.join(root, "src/config/piModelCatalogSeed.json"), "utf8"),
);
const catalog = normalizePiOfficialCatalog(seed, {
  revision: "prototype-offline-seed",
  source: "bundled",
}).models.map((model) => ({
  provider: model.provider,
  id: model.id,
  name: model.name,
  api: model.api,
  baseUrl: model.baseUrl,
  availability: model.availability,
  reasoning: model.reasoning,
  contextWindow: model.contextWindow,
  maxTokens: model.maxTokens,
  requiresServiceParameters: /\{[^}]+\}|%7B.*?%7D/i.test(model.baseUrl),
  canConfigure:
    model.availability === "available" &&
    model.contextWindow > 0 &&
    model.maxTokens > 0 &&
    model.input.includes("text"),
}));
const bundle = await build({
  entryPoints: [path.join(root, `${source}.tsx`)],
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  target: "es2020",
  jsx: "automatic",
  jsxImportSource: "preact",
  define: { __PI_PROTOTYPE_CATALOG__: JSON.stringify(catalog) },
});
const styles = await Promise.all(
  [
    "addon/content/shared/theme.css",
    "addon/content/shared/page-chrome.css",
    `${source}.css`,
  ].map((file) => readFile(path.join(root, file), "utf8")),
);
await mkdir(path.dirname(output), { recursive: true });
await writeFile(
  output,
  `<!doctype html>
<!-- THROWAWAY PROTOTYPE: virtual accounts, memory only, no production runtime imports. -->
<html lang="zh-CN" data-zs-theme="light"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'">
<title>Zotero Agent 配置 · 交互原型</title>
<style>${styles.join("\n")}</style></head>
<body><div id="prototype-root"></div>
<script>${bundle.outputFiles[0].text.replaceAll("</script", "<\\/script")}</script>
</body></html>\n`,
  "utf8",
);
console.log(output);
