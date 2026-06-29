import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildHostBridgeSurfaceCatalog,
  validateHostBridgeSurfaceCatalog,
  type HostBridgeCapabilityCatalogEntry,
  type HostBridgeCliMapping,
  type HostBridgeSurfaceCatalog,
} from "./host-bridge-surface-catalog";

const ROOT = process.cwd();

type RenderTarget = {
  path: string;
  section: string;
  render: (catalog: HostBridgeSurfaceCatalog) => string;
};

function marker(section: string, kind: "start" | "end") {
  return `<!-- host-bridge-surface:${section}:${kind} -->`;
}

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function write(path: string, text: string) {
  writeFileSync(join(ROOT, path), text, "utf8");
}

function commandForSort(mapping: HostBridgeCliMapping) {
  const groupOrder = [
    "status",
    "manifest",
    "library",
    "item",
    "note",
    "topics",
    "schemas",
    "concepts",
    "citation-graph",
    "library-index",
    "resolvers",
    "reference-index",
    "paper-artifacts",
    "insights",
    "literature",
    "workflow",
    "task",
    "file",
    "debug",
  ];
  const group = mapping.command.split(" ")[0] || "";
  const groupIndex = groupOrder.indexOf(group);
  return `${String(groupIndex < 0 ? 99 : groupIndex).padStart(2, "0")}:${mapping.command}`;
}

function sortedMappings(catalog: HostBridgeSurfaceCatalog) {
  return [...catalog.endpointMappings, ...catalog.cliMappings].sort(
    (left, right) => commandForSort(left).localeCompare(commandForSort(right)),
  );
}

function sortedCapabilities(
  catalog: HostBridgeSurfaceCatalog,
  predicate: (entry: HostBridgeCapabilityCatalogEntry) => boolean,
) {
  const categoryOrder = [
    "context",
    "library",
    "topics",
    "schemas",
    "concepts",
    "citation_graph",
    "library_index",
    "resolvers",
    "reference_index",
    "paper_artifacts",
    "insights",
    "mutation",
    "diagnostic",
    "debug",
  ];
  return catalog.capabilities.filter(predicate).sort((left, right) => {
    const categoryDelta =
      categoryOrder.indexOf(left.category) -
      categoryOrder.indexOf(right.category);
    return categoryDelta || left.name.localeCompare(right.name);
  });
}

function flags(entry: HostBridgeCapabilityCatalogEntry) {
  return [
    entry.cacheView ? "cache-view" : "",
    entry.debugOnly ? "debug-only" : "",
    entry.dangerous ? "dangerous" : "",
    entry.rawOnly ? "raw-only" : "",
    entry.mcpMirror ? "mcp-mirror" : "",
  ]
    .filter(Boolean)
    .join(", ");
}

function table(headers: string[], rows: string[][]) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

function capabilityTable(entries: HostBridgeCapabilityCatalogEntry[]) {
  return table(
    ["Capability", "Category", "Approval", "Input", "CLI exposure", "Flags"],
    entries.map((entry) => [
      `\`${entry.name}\``,
      entry.category,
      `\`${entry.approval}\``,
      `\`${entry.inputType}${entry.inputRequired ? " required" : ""}\``,
      entry.cliCommands.length
        ? entry.cliCommands.map((command) => `\`${command}\``).join(", ")
        : entry.rawOnly
          ? "`raw call only`"
          : "",
      flags(entry) || "-",
    ]),
  );
}

function mappingTable(mappings: HostBridgeCliMapping[]) {
  return table(
    ["CLI command", "Target", "Kind", "Flags"],
    mappings.map((mapping) => [
      `\`${mapping.command}\``,
      `\`${mapping.target}\``,
      mapping.kind,
      [
        mapping.cacheView ? "cache-view" : "",
        mapping.dangerous ? "dangerous" : "",
      ]
        .filter(Boolean)
        .join(", ") || "-",
    ]),
  );
}

function commandBlock(mappings: HostBridgeCliMapping[]) {
  return [
    "```text",
    ...mappings.map((mapping) => `zotero-bridge ${mapping.command}`),
    "```",
  ].join("\n");
}

function semanticCliMappings(catalog: HostBridgeSurfaceCatalog) {
  return sortedMappings(catalog).filter(
    (mapping) => mapping.command !== "status" && mapping.command !== "manifest",
  );
}

function discoveryCommandBlock(catalog: HostBridgeSurfaceCatalog) {
  const groups = Array.from(
    new Set(
      semanticCliMappings(catalog)
        .map((mapping) => mapping.command.split(" ")[0] || "")
        .filter((group) => group && group !== "debug"),
    ),
  );
  return [
    "```text",
    "zotero-bridge status",
    "zotero-bridge manifest",
    "zotero-bridge --help",
    ...groups.map((group) => `zotero-bridge ${group} --help`),
    "```",
  ].join("\n");
}

function semanticFamilySummary(catalog: HostBridgeSurfaceCatalog) {
  const groups = new Map<string, string[]>();
  for (const mapping of semanticCliMappings(catalog)) {
    const [group, ...rest] = mapping.command.split(" ");
    if (!group || group === "debug") {
      continue;
    }
    const subcommand = rest.join(" ");
    const values = groups.get(group) || [];
    if (subcommand && !values.includes(subcommand)) {
      values.push(subcommand);
    }
    groups.set(group, values);
  }
  return Array.from(groups.entries())
    .map(([group, subcommands]) =>
      subcommands.length ? `${group} (${subcommands.join(", ")})` : group,
    )
    .join("; ");
}

function shimGuidance() {
  return [
    "- Prefer the run-local shim when it exists: Windows `.\\.zotero-bridge\\bin\\zotero-bridge.cmd`; POSIX `./.zotero-bridge/bin/zotero-bridge`.",
    "- When skill instructions show `<zotero-bridge>`, replace it with the run-local shim for the current OS; use PATH command `zotero-bridge` only when the shim is absent.",
    "- Keep `ZOTERO_BRIDGE_PROFILE` and `ZOTERO_BRIDGE_TOKEN` from the injected environment; never print token values.",
  ].join("\n");
}

function topicContextGuidance() {
  return [
    "- `topics get-context` accepts `view` values `digest`, `semantic`, `audit`, and `full` through `--input` JSON.",
    "- Omit `view` only when a legacy flat topic context response is required.",
    "- For large `semantic` or `full` topic contexts, pass `outputPath` or `output_path` and optional `overwrite`; stdout then contains only a compact file envelope.",
    '- Example: `zotero-bridge topics get-context --input \'{"topicId":"topic-id","view":"semantic","outputPath":"runtime/topic-context.semantic.json"}\'`.',
  ].join("\n");
}

function resolverGuidance() {
  return [
    "- `resolvers resolve` accepts direct resolver fields in `--input`; do not wrap them in a top-level `resolver` object.",
    "- Allowed selector fields are `tag`, `collection_key`, and `paper_refs`; at least one selector is required.",
    "- `combine` is optional and defaults to `union`; use `intersection` when every provided selector type must match.",
    "- `tag` accepts a tag string, a tag array, or an `{ and, or, not }` object. `collection_key` accepts a string or string array. `paper_refs` accepts canonical `libraryId:itemKey` refs.",
    '- Examples: `zotero-bridge resolvers resolve --input \'{"tag":{"and":["object-detection"],"not":["nlp-transformer"]}}\'`; `zotero-bridge resolvers resolve --input \'{"tag":"topic:vision","collection_key":["COLL_A"],"combine":"intersection"}\'`.',
    "- Legacy fields are rejected: `resolver`, `topic_resolver`, `mode`, `query`, `include`, and `exclude`.",
  ].join("\n");
}

function workflowGuidance() {
  return [
    "- Use `workflow describe --workflow <id>` before submit when selection, workflow options, or provider profile requirements are unclear.",
    "- `workflow submit` uses `--items <JSON_OR_FILE>` for an item ref array or `--none` for no-selection workflows; do not use legacy `--input`.",
    "- Put manifest parameter values in `--workflow-options`; put only `schema`, `backendId`, and `providerOptions` in `--provider-profile`.",
    "- Never put bearer tokens, backend auth, base URLs, or local paths in provider profile files.",
    "- Use `workflow agent-run --workflow <id> (--items <JSON_OR_FILE> | --none) --output-dir <DIR>` when the calling agent should execute the workflow itself from a downloaded handoff bundle.",
    "- `workflow agent-run` is read-only: it does not accept workflow options, provider profiles, or agent-engine flags, and it does not start a Host backend task.",
    "- `workflow agent-run` gates bundle creation only on `inputs`; `validateSelection` is returned as `applyStatus` advisory and may disable future host-side apply without blocking self-owned execution.",
  ].join("\n");
}

function renderDocSurface(catalog: HostBridgeSurfaceCatalog) {
  return [
    "This section is generated from the Host Bridge capability registry and Rust CLI mappings. Edit the registry or CLI source, then run `npm run render:host-bridge-surface`.",
    "",
    "#### Public capabilities",
    "",
    capabilityTable(sortedCapabilities(catalog, (entry) => entry.public)),
    "",
    "#### CLI mappings",
    "",
    mappingTable(sortedMappings(catalog)),
    "",
    "#### Resolver payloads",
    "",
    resolverGuidance(),
    "",
    "#### Workflow payloads",
    "",
    workflowGuidance(),
    "",
    "#### Debug capabilities",
    "",
    capabilityTable(sortedCapabilities(catalog, (entry) => entry.debugOnly)),
    "",
    "MCP tools mirror Host Bridge capability names from the runtime registry and return structured content containing `{ capability, approval, data }`.",
  ].join("\n");
}

function renderWrapperSurface(catalog: HostBridgeSurfaceCatalog) {
  const insightCommands = catalog.cliMappings
    .filter(
      (mapping) =>
        mapping.command.startsWith("citation-graph ") ||
        mapping.command.startsWith("insights "),
    )
    .sort((left, right) => left.command.localeCompare(right.command))
    .map((mapping) => mapping.command)
    .join(", ");
  return [
    "This section is generated from the Host Bridge surface catalog.",
    "",
    "### Runtime command entry",
    "",
    shimGuidance(),
    "",
    "### Command families",
    "",
    `- Prefer semantic CLI command families: ${semanticFamilySummary(catalog)}.`,
    `- Current graph/insight commands: ${insightCommands}.`,
    "- Use raw `call <capability>` only for raw-only capabilities or explicit diagnostics.",
    "- MCP is not the default fallback; MCP tools mirror Host Bridge capability names when explicitly used.",
    "- Full generated reference: `references/host-bridge-cli.md`.",
    "",
    "### Topic context payloads",
    "",
    topicContextGuidance(),
    "",
    "### Resolver payloads",
    "",
    resolverGuidance(),
    "",
    "### Workflow payloads",
    "",
    workflowGuidance(),
  ].join("\n");
}

function renderWrapperReference(catalog: HostBridgeSurfaceCatalog) {
  return [
    "This section is generated from the Host Bridge surface catalog.",
    "",
    "### Runtime command entry",
    "",
    shimGuidance(),
    "",
    "### Discovery commands",
    "",
    discoveryCommandBlock(catalog),
    "",
    "### Semantic mappings",
    "",
    mappingTable(
      sortedMappings(catalog).filter(
        (mapping) =>
          mapping.kind !== "capability" || !mapping.target.startsWith("debug."),
      ),
    ),
    "",
    "### Topic context payloads",
    "",
    topicContextGuidance(),
    "",
    "### Resolver payloads",
    "",
    resolverGuidance(),
    "",
    "### Workflow payloads",
    "",
    workflowGuidance(),
    "",
    "### Raw-only and debug capabilities",
    "",
    capabilityTable(
      sortedCapabilities(
        catalog,
        (entry) => entry.rawOnly || entry.debugOnly || entry.dangerous,
      ),
    ),
  ].join("\n");
}

function renderTopicSynthesisFragment(catalog: HostBridgeSurfaceCatalog) {
  const topicCommandGroups = [
    "library",
    "topics",
    "library-index",
    "resolvers",
    "reference-index",
    "citation-graph",
    "paper-artifacts",
    "insights",
  ];
  const topicCommands = catalog.cliMappings
    .filter((mapping) =>
      topicCommandGroups.includes(mapping.command.split(" ")[0] || ""),
    )
    .sort((left, right) => left.command.localeCompare(right.command))
    .map((mapping) => `\`${mapping.command}\``)
    .join(", ");
  return [
    "Host Bridge CLI 使用说明由内置 `zotero-bridge-cli` wrapper skill 维护。",
    `当前 topic synthesis 相关命令族摘要：${topicCommands}。`,
    "使用 Host Bridge 能力前，先读取该 wrapper skill 及其 `references/host-bridge-cli.md` 生成映射参考。",
    "不要绕过 Host Bridge 直接读取 Zotero DB/storage；除非用户明确要求 MCP 诊断，否则不要切换到 MCP。",
  ].join("\n");
}

const TARGETS: RenderTarget[] = [
  {
    path: "doc/host-bridge-cli.md",
    section: "doc-surface",
    render: renderDocSurface,
  },
  {
    path: "skills_builtin/zotero-bridge-cli/SKILL.md",
    section: "wrapper-skill",
    render: renderWrapperSurface,
  },
  {
    path: "skills_builtin/zotero-bridge-cli/references/host-bridge-cli.md",
    section: "wrapper-reference",
    render: renderWrapperReference,
  },
  {
    path: "skills_src/topic-synthesis/templates/fragments/zotero-bridge-cli.md.j2",
    section: "topic-synthesis-fragment",
    render: renderTopicSynthesisFragment,
  },
];

function replaceSection(text: string, section: string, replacement: string) {
  const start = marker(section, "start");
  const end = marker(section, "end");
  const startIndex = text.indexOf(start);
  const endIndex = text.indexOf(end);
  if (startIndex < 0 || endIndex < 0 || endIndex < startIndex) {
    throw new Error(`missing generated section markers for ${section}`);
  }
  return `${text.slice(0, startIndex + start.length)}\n${replacement.trim()}\n${text.slice(endIndex)}`;
}

function main() {
  const check = process.argv.includes("--check");
  const catalog = buildHostBridgeSurfaceCatalog(ROOT);
  const errors = validateHostBridgeSurfaceCatalog(catalog);
  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`[host-bridge-surface] ${error}`);
    }
    process.exit(1);
  }

  let changed = false;
  for (const target of TARGETS) {
    const current = read(target.path);
    const next = replaceSection(
      current,
      target.section,
      target.render(catalog),
    );
    if (next !== current) {
      changed = true;
      if (check) {
        console.error(`[host-bridge-surface] ${target.path} is out of date`);
      } else {
        write(target.path, next);
        console.log(`[host-bridge-surface] rendered ${target.path}`);
      }
    }
  }

  if (check && changed) {
    process.exit(1);
  }
  if (!changed) {
    console.log("[host-bridge-surface] ok");
  }
}

main();
