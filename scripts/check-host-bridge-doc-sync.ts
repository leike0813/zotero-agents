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

const ZOTERO_LIBRARIAN_GENERATED_TARGETS = [
  [
    "profiles/hermes/zotero-librarian/skills/zotero-librarian/references/host-bridge.md",
    "zotero-librarian:host-bridge",
  ],
  [
    "profiles/hermes/zotero-librarian/skills/zotero-librarian/references/workflows.md",
    "zotero-librarian:workflow-catalog",
  ],
] as const;

const DOCS = [
  "doc/host-bridge-cli.md",
  "skills_builtin/zotero-bridge-cli/SKILL.md",
  "skills_builtin/zotero-bridge-cli/references/host-bridge-cli.md",
  "profiles/hermes/zotero-librarian/skills/zotero-librarian/references/host-bridge.md",
  "profiles/hermes/zotero-librarian/skills/zotero-librarian/references/workflows.md",
  "skills_src/topic-synthesis/templates/fragments/zotero-bridge-cli.md.j2",
  "openspec/specs/host-bridge-cli-interface/spec.md",
  "openspec/specs/host-bridge-cli-synthesis-subcommands/spec.md",
  "openspec/specs/host-bridge-cli-debug-commands/spec.md",
  "openspec/specs/acp-embedded-zotero-mcp-server/spec.md",
  "openspec/specs/zotero-mcp-tool-suite/spec.md",
];

const CANONICAL_CLI_DOCS = [
  "doc/host-bridge-cli.md",
  "skills_builtin/zotero-bridge-cli/SKILL.md",
  "skills_builtin/zotero-bridge-cli/references/host-bridge-cli.md",
  "skills_builtin/zotero-bridge-cli/references/agent-guidance.md",
  "profiles/hermes/zotero-librarian/skills/zotero-librarian/references/host-bridge.md",
  "skills_src/topic-synthesis/templates/fragments/zotero-bridge-cli.md.j2",
];

const CURRENT_STATE_ONLY_DOCS = [
  "skills_src/zotero-bridge-cli/semantic/SKILL.md",
  "skills_src/zotero-bridge-cli/semantic/references/agent-guidance.md",
  "skills_builtin/zotero-bridge-cli/SKILL.md",
  "skills_builtin/zotero-bridge-cli/references/host-bridge-cli.md",
  "skills_builtin/zotero-bridge-cli/references/agent-guidance.md",
  "skills_builtin/zotero-bridge-cli/references/terminology.md",
  "profiles_src/hermes/zotero-librarian/SOUL.md",
  "profiles_src/hermes/zotero-librarian/skills/zotero-librarian/SKILL.md",
  "profiles_src/hermes/zotero-librarian/skills/zotero-librarian/references/operating-principles.md",
  "profiles_src/hermes/zotero-librarian/skills/zotero-librarian/references/workflow-execution-policy.md",
  "profiles_src/hermes/zotero-librarian/skills/zotero-librarian/references/common-tasks.md",
  "profiles_src/hermes/zotero-librarian/skills/zotero-workflow-agent-runner/SKILL.md",
  "profiles_src/hermes/zotero-librarian/skills/zotero-workflow-agent-runner/references/agent-run-playbook.md",
  "skills_src/host-bridge-shared/terminology.md",
  "profiles/hermes/zotero-librarian/SOUL.md",
  "profiles/hermes/zotero-librarian/skills/zotero-librarian/SKILL.md",
  "profiles/hermes/zotero-librarian/skills/zotero-librarian/references/host-bridge.md",
  "profiles/hermes/zotero-librarian/skills/zotero-librarian/references/operating-principles.md",
  "profiles/hermes/zotero-librarian/skills/zotero-librarian/references/terminology.md",
  "profiles/hermes/zotero-librarian/skills/zotero-librarian/references/workflow-execution-policy.md",
  "profiles/hermes/zotero-librarian/skills/zotero-librarian/references/common-tasks.md",
  "profiles/hermes/zotero-librarian/skills/zotero-workflow-agent-runner/SKILL.md",
  "profiles/hermes/zotero-librarian/skills/zotero-workflow-agent-runner/references/agent-run-playbook.md",
  ".agents/skills/host-bridge-semantic-surface-review/SKILL.md",
  ".agents/skills/host-bridge-semantic-surface-review/references/surface-map.md",
  ".agents/skills/host-bridge-semantic-surface-review/references/review-playbook.md",
  ".agents/skills/host-bridge-semantic-surface-review/references/nested-call-contract.md",
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
  [
    /\bsynthesis\.(?!cache\.|diff\b|debug\b|jobs\.|maintenance\.|operations\.|paper\.|profiler\.|queue\.|snapshot\b|topic\.|worker\.|cleanInstallReset\b)/,
    "public synthesis.* capability namespace",
  ],
  [/\bget-reference-sidecar-index\b/, "legacy reference sidecar CLI command"],
  [/\bget-library-index\b/, "legacy library index CLI command"],
  [/\bresolve-resolver\b/, "legacy resolver CLI command"],
];

const LEGACY_CLI_REGEX: Array<[RegExp, string]> = [
  [/\bzotero-bridge status\b/, "legacy bridge status command"],
  [/\bzotero-bridge manifest\b/, "legacy bridge manifest command"],
  [/\bzotero-bridge library list\b/, "legacy library list command"],
  [/\bzotero-bridge item\b/, "legacy item command group"],
  [/\bzotero-bridge note\b/, "legacy note command group"],
  [/\bzotero-bridge topics\b/, "legacy topics command group"],
  [/\bzotero-bridge schemas\b/, "legacy schemas command group"],
  [/\bzotero-bridge concepts\b/, "legacy concepts command group"],
  [/\bzotero-bridge citation-graph\b/, "legacy citation graph command group"],
  [/\bzotero-bridge library-index\b/, "legacy library index command group"],
  [/\bzotero-bridge resolvers\b/, "legacy resolvers command group"],
  [/\bzotero-bridge reference-index\b/, "legacy reference index command group"],
  [/\bzotero-bridge paper-artifacts\b/, "legacy paper artifacts command group"],
  [/\bzotero-bridge insights\b/, "legacy insights command group"],
  [/\bzotero-bridge literature\b/, "legacy literature command group"],
  [/\bzotero-bridge workflow run\b/, "legacy workflow run command"],
  [/\bzotero-bridge workflow cancel\b/, "legacy workflow cancel command"],
  [/\bzotero-bridge task\b/, "legacy task command group"],
  [/\bzotero-bridge skill-run\b/, "legacy skill-run command group"],
  [
    /`topics (list|get-context|get-report|get-review-input)`/,
    "legacy topics command fragment",
  ],
  [/`schemas get`/, "legacy schemas command fragment"],
  [/`concepts query`/, "legacy concepts command fragment"],
  [/`citation-graph [^`]+`/, "legacy citation graph command fragment"],
  [/`library-index get`/, "legacy library index command fragment"],
  [/`resolvers resolve`/, "legacy resolvers command fragment"],
  [/`reference-index get`/, "legacy reference index command fragment"],
  [/`paper-artifacts [^`]+`/, "legacy paper artifacts command fragment"],
  [/`insights attention-queue`/, "legacy insights command fragment"],
  [/`literature ingest`/, "legacy literature command fragment"],
  [/`workflow run`/, "legacy workflow run command fragment"],
  [/`task list`/, "legacy task list command fragment"],
];

const HISTORICAL_PROTOCOL_REGEX: Array<[RegExp, string]> = [
  [/\blegacy\b/i, "historical protocol wording"],
  [/\bdeprecated\b/i, "deprecation wording"],
  [/\bold command\b/i, "old command wording"],
  [/\bprevious version\b/i, "previous-version wording"],
  [/\bpreviously\b/i, "previous-state wording"],
  [/\bcompatibility note\b/i, "compatibility-note wording"],
  [/\bcompat(?:ibility)?\s+(?:alias|layer|mode)\b/i, "compatibility wording"],
  [/\bbackward(?:s)?\b/i, "backward-compatibility wording"],
  [/\bmigrat(?:e|ed|ion|ing)\s+(?:from|to|path)\b/i, "migration wording"],
  [/旧命令|旧版|兼容旧|历史协议|向后兼容|迁移/, "historical protocol wording"],
];

const REMOVED_PATHS = [
  "assets/wrapper-skills/zotero-bridge-cli/SKILL.md",
  "addon/content/acp-runtime-prompts/templates/host_bridge_cli_readme.md",
  "addon/content/acp-runtime-prompts/templates/host_bridge_cli_prompt.md",
];

const RESOLVER_CONTRACT_PATHS = [
  "doc/host-bridge-cli.md",
  "skills_builtin/zotero-bridge-cli/SKILL.md",
  "skills_builtin/zotero-bridge-cli/references/host-bridge-cli.md",
  "skills_src/topic-synthesis/contracts/payload-schemas/stage-10-update-topic-context.schema.json",
  "skills_src/topic-synthesis/contracts/payload-schemas/stage-20-resolver-and-workset.schema.json",
  "skills_src/topic-synthesis/contracts/stage-guidance.yaml",
  "skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py",
  "skills_builtin/create-topic-synthesis-prepare/SKILL.md",
  "skills_builtin/create-topic-synthesis-prepare/assets/schemas/stage-20-resolver-and-workset.schema.json",
  "skills_builtin/create-topic-synthesis-prepare/scripts/topic_synthesis_db.py",
  "skills_builtin/update-topic-synthesis-prepare/SKILL.md",
  "skills_builtin/update-topic-synthesis-prepare/assets/schemas/stage-10-update-topic-context.schema.json",
  "skills_builtin/update-topic-synthesis-prepare/scripts/topic_synthesis_db.py",
  "src/modules/zoteroMcpProtocol.ts",
  "cli/zotero-bridge/src/args.rs",
] as const;

const FORBIDDEN_RESOLVER_CONTRACT_TEXT = [
  "top-level resolver field",
  "top-level `resolver` field",
  'top-level `"resolver"` field',
  '"mode": "tag_query"',
  '"mode":"tag_query"',
  '"mode": "mixed"',
  '"mode":"mixed"',
  'mode: "tag_query"',
  'mode: "mixed"',
  '{"resolver": payload["resolver"]}',
  '{"resolver": payload["resolver"]}',
] as const;

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

function hasLiteralMarker(text: string, marker: string, kind: "start" | "end") {
  return text.includes(`<!-- ${marker}:${kind} -->`);
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

for (const [path, marker] of ZOTERO_LIBRARIAN_GENERATED_TARGETS) {
  const text = read(path);
  if (
    !hasLiteralMarker(text, marker, "start") ||
    !hasLiteralMarker(text, marker, "end")
  ) {
    fail(`${path} is missing generated section markers for ${marker}`);
  }
}

for (const path of REMOVED_PATHS) {
  if (existsSync(join(ROOT, path))) {
    fail(
      `${path} should not exist after Host Bridge guidance moved to the built-in wrapper skill`,
    );
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
      fail(
        `${docPath} contains stale Host Bridge surface text (${label}): ${match[0]}`,
      );
    }
  }
}

for (const docPath of CANONICAL_CLI_DOCS) {
  const text = read(docPath);
  for (const [pattern, label] of LEGACY_CLI_REGEX) {
    const match = text.match(pattern);
    if (match) {
      fail(
        `${docPath} contains stale generated CLI text (${label}): ${match[0]}`,
      );
    }
  }
}

for (const docPath of CURRENT_STATE_ONLY_DOCS) {
  const text = read(docPath);
  for (const [pattern, label] of HISTORICAL_PROTOCOL_REGEX) {
    const match = text.match(pattern);
    if (match) {
      fail(
        `${docPath} contains non-current-state skill/profile text (${label}): ${match[0]}`,
      );
    }
  }
}

const sharedTerminology = read("skills_src/host-bridge-shared/terminology.md");
for (const generatedTerminology of [
  "skills_builtin/zotero-bridge-cli/references/terminology.md",
  "profiles/hermes/zotero-librarian/skills/zotero-librarian/references/terminology.md",
]) {
  if (read(generatedTerminology) !== sharedTerminology) {
    fail(
      `${generatedTerminology} is not rendered from shared terminology source`,
    );
  }
}

const zoteroLibrarianHostBridge = read(
  "profiles/hermes/zotero-librarian/skills/zotero-librarian/references/host-bridge.md",
);
for (const required of [
  "library.sync_snapshot",
  "library.readiness_audit",
  "zotero-bridge library snapshot",
  "zotero-bridge library items list",
  "zotero-bridge library readiness missing-analysis",
  "zotero-bridge run active",
  "zotero-bridge workflow agent-apply",
]) {
  if (!zoteroLibrarianHostBridge.includes(required)) {
    fail(`zotero-librarian Host Bridge reference missing ${required}`);
  }
}

const wrapperSkill = read("skills_builtin/zotero-bridge-cli/SKILL.md");
for (const required of [
  "references/agent-guidance.md",
  "references/terminology.md",
  "workflow agent-apply",
  "agentRunId",
  "agentRequestId",
]) {
  if (!wrapperSkill.includes(required)) {
    fail(
      `zotero-bridge wrapper skill missing semantic guidance marker: ${required}`,
    );
  }
}

const librarianSkill = read(
  "profiles/hermes/zotero-librarian/skills/zotero-librarian/SKILL.md",
);
for (const required of [
  "references/operating-principles.md",
  "references/terminology.md",
  "workflow agent-apply",
  "agentRunId",
]) {
  if (!librarianSkill.includes(required)) {
    fail(
      `zotero-librarian skill missing semantic guidance marker: ${required}`,
    );
  }
}

for (const sourcePath of RESOLVER_CONTRACT_PATHS) {
  const text = read(sourcePath);
  for (const forbidden of FORBIDDEN_RESOLVER_CONTRACT_TEXT) {
    if (text.includes(forbidden)) {
      fail(`${sourcePath} contains stale resolver contract text: ${forbidden}`);
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
    fail(
      `acpRuntimePromptTemplates.ts still declares removed Host Bridge template id: ${removedTemplateId}`,
    );
  }
}

for (const [sourcePath, forbidden] of [
  ["src/modules/acpSkillRunnerOrchestrator.ts", "hostBridgeCliPromptSnippet"],
  ["src/modules/acpSkillRunPromptBuilder.ts", "hostBridgeCliPromptSnippet"],
  [
    "src/modules/acpSkillRunPromptBuilder.ts",
    "zotero-skills-zotero-host-access",
  ],
  ["src/modules/acpSessionManager.ts", "hostBridgeCliPromptSnippet"],
] as const) {
  if (read(sourcePath).includes(forbidden)) {
    fail(
      `${sourcePath} still contains removed Host Bridge prompt injection marker: ${forbidden}`,
    );
  }
}

if (!process.exitCode) {
  console.log(
    `[host-bridge-doc-sync] ok: ${capabilities.length} capabilities checked`,
  );
}
