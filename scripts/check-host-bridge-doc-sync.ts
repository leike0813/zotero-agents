import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

const REGISTRY = "src/modules/hostBridgeCapabilityRegistry.ts";
const DOCS = [
  "doc/host-bridge-cli.md",
  "addon/content/acp-runtime-prompts/templates/host_bridge_cli_readme.md",
  "assets/wrapper-skills/zotero-bridge-cli/SKILL.md",
];

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function unique(values: string[]) {
  return [...new Set(values)].sort();
}

function parseCapabilities(source: string) {
  const patterns = [
    /\bcapability\(\s*["`]([^"`]+)["`]/g,
    /\bdebugCapability\(\s*["`]([^"`]+)["`]/g,
    /\bsynthesisCapability\(\s*["`]([^"`]+)["`]/g,
  ];
  return unique(
    patterns.flatMap((pattern) =>
      [...source.matchAll(pattern)].map((match) => match[1]),
    ),
  );
}

function fail(message: string) {
  console.error(`[host-bridge-doc-sync] ${message}`);
  process.exitCode = 1;
}

const registrySource = read(REGISTRY);
const capabilities = parseCapabilities(registrySource);
const publicCapabilities = capabilities.filter(
  (name) => !name.startsWith("debug."),
);
const coreCapabilities = publicCapabilities.filter(
  (name) =>
    name.startsWith("context.") ||
    name.startsWith("library.") ||
    name.startsWith("mutation.") ||
    name === "diagnostic.get_status",
);
const synthesisCapabilities = publicCapabilities.filter((name) =>
  name.startsWith("synthesis."),
);

if (capabilities.length === 0) {
  fail(`no capabilities parsed from ${REGISTRY}`);
}

for (const docPath of DOCS) {
  const text = read(docPath);
  for (const capability of coreCapabilities) {
    if (!text.includes(capability)) {
      fail(`${docPath} is missing core capability ${capability}`);
    }
  }
}

const cliReadme = read(
  "addon/content/acp-runtime-prompts/templates/host_bridge_cli_readme.md",
);
for (const capability of synthesisCapabilities) {
  if (!cliReadme.includes(capability)) {
    fail(
      `host_bridge_cli_readme.md is missing synthesis capability ${capability}`,
    );
  }
}

const cliArgs = read("cli/zotero-bridge/src/args.rs");
const cliCommands = read("cli/zotero-bridge/src/commands.rs");
for (const capability of [
  "library.search_items",
  "library.get_item_detail",
  "library.get_item_notes",
  "library.get_note_detail",
  "library.get_item_attachments",
  "synthesis.resolve_resolver",
  "debug.acpSkillRun.reapplyResult",
]) {
  if (!cliArgs.includes(capability) && !cliCommands.includes(capability)) {
    fail(`CLI source is missing semantic mapping for ${capability}`);
  }
}

const mcpProtocol = read("src/modules/zoteroMcpProtocol.ts");
for (const marker of [
  "listHostBridgeCapabilities",
  "getHostBridgeCapability",
  "MCP tools mirror Host Bridge capability names",
]) {
  if (!mcpProtocol.includes(marker)) {
    fail(`zoteroMcpProtocol.ts is missing MCP mirror marker: ${marker}`);
  }
}

if (!process.exitCode) {
  console.log(
    `[host-bridge-doc-sync] ok: ${capabilities.length} capabilities checked`,
  );
}
