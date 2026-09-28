import { build } from "esbuild";
import { piProviderEnvGuardPlugin } from "../zotero-plugin.config";

const result = await build({
  entryPoints: ["src/modules/piMcpRuntimeOwner.ts"],
  bundle: true,
  platform: "browser",
  target: "firefox115",
  format: "iife",
  write: false,
  metafile: true,
  logLevel: "silent",
});
const inputs = Object.keys(result.metafile.inputs).map((path) =>
  path.replace(/\\/g, "/"),
);
if (!inputs.some((path) => path.includes("/@modelcontextprotocol/client/")))
  throw new Error("MCP v2 client missing from browser bundle");
if (
  inputs.some(
    (path) =>
      path.includes("/@modelcontextprotocol/sdk/") ||
      path.endsWith("/@modelcontextprotocol/client/dist/stdio.mjs"),
  )
)
  throw new Error("Node MCP SDK reached browser bundle");
const bytes = result.outputFiles.reduce(
  (sum, file) => sum + file.contents.byteLength,
  0,
);
if (bytes > 3 * 1024 * 1024)
  throw new Error(`MCP browser bundle exceeded 3 MiB (${bytes})`);
process.stdout.write(
  `Pi MCP browser bundle: ${bytes} bytes; no Node MCP SDK\n`,
);

const plugin = await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "browser",
  target: "firefox115",
  format: "iife",
  plugins: [piProviderEnvGuardPlugin],
  write: false,
  metafile: true,
  logLevel: "silent",
});
if (
  Object.keys(plugin.metafile.inputs).some((path) =>
    path.replace(/\\/g, "/").includes("/@modelcontextprotocol/sdk/"),
  )
)
  throw new Error("Legacy MCP SDK reached plugin browser bundle");
process.stdout.write("Plugin browser bundle: no legacy MCP SDK\n");
