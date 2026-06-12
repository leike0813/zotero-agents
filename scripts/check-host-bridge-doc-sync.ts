import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildHostBridgeSurfaceCatalog,
  validateHostBridgeSurfaceCatalog,
} from "./host-bridge-surface-catalog";

const ROOT = process.cwd();

const GENERATED_TARGETS = [
  ["doc/host-bridge-cli.md", "doc-surface"],
  ["skills_builtin/zotero-bridge-cli/SKILL.md", "wrapper-skill"],
  [
    "skills_builtin/zotero-bridge-cli/references/host-bridge-cli.md",
    "wrapper-reference",
  ],
  [
    "skills_src/topic-synthesis/templates/fragments/zotero-bridge-cli.md.j2",
    "topic-synthesis-fragment",
  ],
] as const;

const DOCS = [
  "doc/host-bridge-cli.md",
  "skills_builtin/zotero-bridge-cli/SKILL.md",
  "skills_builtin/zotero-bridge-cli/references/host-bridge-cli.md",
  "skills_src/topic-synthesis/templates/fragments/zotero-bridge-cli.md.j2",
  "openspec/specs/host-bridge-cli-interface/spec.md",
  "openspec/specs/host-bridge-cli-synthesis-subcommands/spec.md",
  "openspec/specs/host-bridge-cli-debug-commands/spec.md",
  "openspec/specs/acp-embedded-zotero-mcp-server/spec.md",
  "openspec/specs/zotero-mcp-tool-suite/spec.md",
];

const FORBIDDEN_TEXT = [
  "synthesis <subcommand>",
  "synthesis <subcommand> --input",
  "call synthesis.*",
  "synthesis.* capability",
  "synthesis.list_topics",
  "synthesis.get_topic_context",
  "synthesis.get_schemas",
  "synthesis.query_concept_kb",
  "synthesis.query_citation_graph",
  "synthesis.get_citation_graph",
  "synthesis.refresh_citation_graph_metrics",
  "synthesis.get_library_index",
  "synthesis.get_reference_sidecar_index",
  "synthesis.get_paper_artifact",
  "synthesis.read_paper_artifacts",
  "synthesis.export_filtered_paper_artifacts",
  "synthesis.resolve_topic_paper_digest",
  "synthesis.get_review_input",
  "reference_sidecar",
  "reference sidecar",
  "debug.synthesis.queue.",
  "debug.synthesis.jobs.",
  "debug.synthesis.worker.run",
  "debug.synthesis.maintenance.run",
  "zotero.get_current_view",
  "zotero.get_selected_items",
  "zotero.search_items",
];

const FORBIDDEN_REGEX: Array<[RegExp, string]> = [
  [/\bsynthesis\.(?!cache\.|diff\b|debug\b|jobs\.|maintenance\.|operations\.|paper\.|profiler\.|queue\.|snapshot\b|topic\.|worker\.|cleanInstallReset\b)/, "public synthesis.* capability namespace"],
  [/\bget-reference-sidecar-index\b/, "legacy reference sidecar CLI command"],
  [/\bget-library-index\b/, "legacy library index CLI command"],
  [/\bresolve-resolver\b/, "legacy resolver CLI command"],
];

const REMOVED_PATHS = [
  "assets/wrapper-skills/zotero-bridge-cli/SKILL.md",
  "addon/content/acp-runtime-prompts/templates/host_bridge_cli_readme.md",
  "addon/content/acp-runtime-prompts/templates/host_bridge_cli_prompt.md",
];

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function fail(message: string) {
  console.error(`[host-bridge-doc-sync] ${message}`);
  process.exitCode = 1;
}

function hasMarker(text: string, section: string, kind: "start" | "end") {
  return text.includes(`<!-- host-bridge-surface:${section}:${kind} -->`);
}

const catalog = buildHostBridgeSurfaceCatalog(ROOT);
const errors = validateHostBridgeSurfaceCatalog(catalog);
for (const error of errors) {
  fail(error);
}

const capabilities = catalog.capabilities.map((entry) => entry.name);
if (capabilities.length === 0) {
  fail("no Host Bridge capabilities parsed from registry");
}

for (const [path, section] of GENERATED_TARGETS) {
  const text = read(path);
  if (!hasMarker(text, section, "start") || !hasMarker(text, section, "end")) {
    fail(`${path} is missing generated section markers for ${section}`);
  }
}

for (const path of REMOVED_PATHS) {
  if (existsSync(join(ROOT, path))) {
    fail(`${path} should not exist after Host Bridge guidance moved to the built-in wrapper skill`);
  }
}

for (const docPath of DOCS) {
  const text = read(docPath);
  for (const forbidden of FORBIDDEN_TEXT) {
    if (text.includes(forbidden)) {
      fail(`${docPath} contains stale Host Bridge surface text: ${forbidden}`);
    }
  }
  for (const [pattern, label] of FORBIDDEN_REGEX) {
    const match = text.match(pattern);
    if (match) {
      fail(`${docPath} contains stale Host Bridge surface text (${label}): ${match[0]}`);
    }
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

const runtimePromptTemplates = read("src/modules/acpRuntimePromptTemplates.ts");
for (const removedTemplateId of [
  "host_bridge_cli_readme",
  "host_bridge_cli_prompt",
]) {
  if (runtimePromptTemplates.includes(removedTemplateId)) {
    fail(`acpRuntimePromptTemplates.ts still declares removed Host Bridge template id: ${removedTemplateId}`);
  }
}

for (const [sourcePath, forbidden] of [
  ["src/modules/acpSkillRunnerOrchestrator.ts", "hostBridgeCliPromptSnippet"],
  ["src/modules/acpSkillRunPromptBuilder.ts", "hostBridgeCliPromptSnippet"],
  ["src/modules/acpSkillRunPromptBuilder.ts", "zotero-skills-zotero-host-access"],
  ["src/modules/acpSessionManager.ts", "hostBridgeCliPromptSnippet"],
] as const) {
  if (read(sourcePath).includes(forbidden)) {
    fail(`${sourcePath} still contains removed Host Bridge prompt injection marker: ${forbidden}`);
  }
}

if (!process.exitCode) {
  console.log(
    `[host-bridge-doc-sync] ok: ${capabilities.length} capabilities checked`,
  );
}
