import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  buildHostBridgeSurfaceCatalog,
  validateHostBridgeSurfaceCatalog,
  type HostBridgeCapabilityCatalogEntry,
  type HostBridgeCliMapping,
  type HostBridgeSurfaceCatalog,
} from "./host-bridge-surface-catalog";
import {
  readZoteroBridgeCliRelease,
  type ZoteroBridgeCliRelease,
} from "./zotero-bridge-cli-release";

const ROOT = process.cwd();
const WRAPPER_SKILL_SOURCE = "skills_src/zotero-bridge-cli/semantic/SKILL.md";
const WRAPPER_AGENT_GUIDANCE_SOURCE =
  "skills_src/zotero-bridge-cli/semantic/references/agent-guidance.md";
const SHARED_TERMINOLOGY_SOURCE =
  "skills_src/host-bridge-shared/terminology.md";

type RenderTarget = {
  path: string;
  sourcePath?: string;
  section: string;
  render: (
    catalog: HostBridgeSurfaceCatalog,
    release: ZoteroBridgeCliRelease,
  ) => string;
};

type CopyTarget = {
  path: string;
  sourcePath: string;
};

function marker(section: string, kind: "start" | "end") {
  return `<!-- host-bridge-surface:${section}:${kind} -->`;
}

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function write(path: string, text: string) {
  const absolute = join(ROOT, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, text, "utf8");
}

function commandForSort(mapping: HostBridgeCliMapping) {
  const groupOrder = [
    "bridge",
    "library",
    "synthesis",
    "workflow",
    "run",
    "mutation",
    "file",
    "debug",
    "call",
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
    entry.responseSizing !== "unclassified"
      ? `response:${entry.responseSizing}`
      : "",
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
  return sortedMappings(catalog);
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
    "zotero-bridge bridge status",
    "zotero-bridge bridge manifest",
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

function cliReleaseGuidance(release: ZoteroBridgeCliRelease) {
  return [
    `- Expected \`zotero-bridge\` CLI version for this generated surface: \`${release.version}\`.`,
    "- Confirm with `<zotero-bridge> --version` when the loaded skill or reference path is uncertain, command help does not match this surface, or a CLI error points to command shape mismatch.",
    "- If the observed version differs from the expected version, stop using this loaded skill copy for command syntax. Prefer the workspace-injected skill and run-local shim, then inspect `<zotero-bridge> --help` or the generated reference beside that workspace copy.",
  ].join("\n");
}

function topicContextGuidance() {
  return [
    "- `synthesis topic get-context` accepts `view` values `digest`, `semantic`, `audit`, and `full` through `--input` JSON.",
    "- Omit `view` only when the flat topic context response is required.",
    "- For large `semantic` or `full` topic contexts, pass `outputPath` or `output_path` and optional `overwrite`; stdout then contains only a compact file envelope.",
    '- Example: `zotero-bridge synthesis topic get-context --input \'{"topicId":"topic-id","view":"semantic","outputPath":"runtime/topic-context.semantic.json"}\'`.',
  ].join("\n");
}

function libraryGuidance() {
  return [
    '- Use `zotero-bridge library items list --input \'{"limit":50,"collectionKey":"COLL"}\'` for bounded library pages.',
    '- Use `zotero-bridge library snapshot --input \'{"limit":200,"cursor":"0"}\'` for local metadata indexes.',
    "- Use `zotero-bridge library readiness missing-pdf|missing-markdown|missing-analysis --input '{\"limit\":100}'` before scheduling PDF retrieval, Markdown conversion, or literature-analysis work.",
    "- `library items list` accepts `collectionKey`, `tag`, `itemType`, `query`, `cursor`, and `limit` in `--input`.",
    "- `library snapshot` accepts `collectionKey`, `collectionId`, `tag`, `itemType`, `query`, `cursor`, and `limit` in `--input`.",
    "- `library readiness audit` accepts the same library filters plus `checks` and `missingOnly`; Markdown and analysis readiness reuse the Zotero Artifacts column rules.",
    "- Use `nextCursor` with `hasMore` to page library and snapshot results.",
  ].join("\n");
}

function largeResponseGuidance() {
  return [
    "- Treat `response:paged` capabilities as one-page reads. Iterate the returned cursor metadata instead of assuming one call returns the whole collection.",
    "- `synthesis graph overview` returns summary plus paged `nodes`, `edges`, `hover_only_nodes`, and `hover_only_edges`. Use `cursor`/`limit` for all sections together or section cursors such as `nodeCursor`, `edgeCursor`, `hoverNodeCursor`, and `hoverEdgeCursor`.",
    "- Use `synthesis graph get-slice`, `synthesis graph get-layout`, or `synthesis graph get-metrics` when the task needs a coherent bounded subgraph, layout, or ranked metric page instead of the entire citation graph.",
    "- `synthesis topic list`, `synthesis index library get`, graph metrics, and graph rankings are paged reads. Do not build workflows that rely on stdout containing every topic, index row, graph node, edge, or rank item in one response.",
  ].join("\n");
}

function resolverGuidance() {
  return [
    "- `synthesis resolver resolve` accepts direct resolver fields in `--input`; do not wrap them in a top-level `resolver` object.",
    "- Allowed selector fields are `tag`, `collection_key`, and `paper_refs`; at least one selector is required.",
    "- `combine` is optional and defaults to `union`; use `intersection` when every provided selector type must match.",
    "- `tag` accepts a tag string, a tag array, or an `{ and, or, not }` object. `collection_key` accepts a string or string array. `paper_refs` accepts canonical `libraryId:itemKey` refs.",
    '- Examples: `zotero-bridge synthesis resolver resolve --input \'{"tag":{"and":["object-detection"],"not":["nlp-transformer"]}}\'`; `zotero-bridge synthesis resolver resolve --input \'{"tag":"topic:vision","collection_key":["COLL_A"],"combine":"intersection"}\'`.',
    "- Unsupported fields are rejected: `resolver`, `topic_resolver`, `mode`, `query`, `include`, and `exclude`.",
  ].join("\n");
}

function workflowGuidance() {
  return [
    "- Use `workflow describe --workflow <id>` before submit when selection, workflow options, or provider profile requirements are unclear.",
    "- `workflow submit` uses `--items <JSON_OR_FILE>` for an item ref array or `--none` for no-selection workflows; do not use `--input`.",
    "- Put manifest parameter values in `--workflow-options`; put only `schema`, `backendId`, and `providerOptions` in `--provider-profile`.",
    "- Never put bearer tokens, backend auth, base URLs, or local paths in provider profile files.",
    "- Use `workflow agent-run --workflow <id> (--items <JSON_OR_FILE> | --none) --output-dir <DIR>` when the calling agent should execute the workflow itself from a downloaded handoff bundle.",
    "- `workflow agent-run` does not accept workflow options, provider profiles, or agent-engine flags, and it does not start a Host backend task; the host only prepares request context for the handoff.",
    "- `workflow agent-run` gates bundle creation only on `inputs`; `validateSelection` is returned as `applyStatus` advisory and is recalculated when apply-back is submitted.",
    "- Use `workflow agent-apply <agentRunId> --result <agentRequestId>=<bundlePath>` after finalizing a SkillRunner-compatible output bundle from the handoff output contract.",
    "- Agent-run apply-back is one-shot. Approval denial does not consume the agentRunId, but once applyResult starts the agentRunId cannot be reused.",
  ].join("\n");
}

function runGuidance() {
  return [
    "- Use `run get <workflowRunId>` for workflow-level runtime status and known skill run projections.",
    "- Use `run active` for the lightweight global active-task list; it excludes transcripts, local paths, and provider-private payloads.",
    "- Use `run cancel <workflowRunId>` for workflow-level cancellation intent; cancellation does not imply immediate terminal state.",
    "- Use `run skill get|reply|connect <skillRunId>` for explicit skill run interactions. Do not infer a skill run target from a workflow run id.",
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
    "#### Library guidance",
    "",
    libraryGuidance(),
    "",
    "#### Large response pagination",
    "",
    largeResponseGuidance(),
    "",
    "#### Resolver payloads",
    "",
    resolverGuidance(),
    "",
    "#### Workflow payloads",
    "",
    workflowGuidance(),
    "",
    "#### Runtime control payloads",
    "",
    runGuidance(),
    "",
    "#### Debug capabilities",
    "",
    capabilityTable(sortedCapabilities(catalog, (entry) => entry.debugOnly)),
    "",
    "MCP tools mirror Host Bridge capability names from the runtime registry and return structured content containing `{ capability, approval, data }`.",
  ].join("\n");
}

function renderWrapperSurface(
  catalog: HostBridgeSurfaceCatalog,
  release: ZoteroBridgeCliRelease,
) {
  const insightCommands = catalog.cliMappings
    .filter(
      (mapping) =>
        mapping.command.startsWith("synthesis graph ") ||
        mapping.command.startsWith("synthesis insight "),
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
    "### CLI release check",
    "",
    cliReleaseGuidance(release),
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
    "### Large response pagination",
    "",
    largeResponseGuidance(),
    "",
    "### Resolver payloads",
    "",
    resolverGuidance(),
    "",
    "### Workflow payloads",
    "",
    workflowGuidance(),
    "",
    "### Runtime control payloads",
    "",
    runGuidance(),
  ].join("\n");
}

function renderWrapperReference(
  catalog: HostBridgeSurfaceCatalog,
  release: ZoteroBridgeCliRelease,
) {
  return [
    "This section is generated from the Host Bridge surface catalog.",
    "",
    "### Runtime command entry",
    "",
    shimGuidance(),
    "",
    "### CLI release check",
    "",
    cliReleaseGuidance(release),
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
    "### Library guidance",
    "",
    libraryGuidance(),
    "",
    "### Large response pagination",
    "",
    largeResponseGuidance(),
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
  const topicCommandGroups = ["library", "synthesis"];
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
    sourcePath: WRAPPER_SKILL_SOURCE,
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

const COPY_TARGETS: CopyTarget[] = [
  {
    path: "skills_builtin/zotero-bridge-cli/references/agent-guidance.md",
    sourcePath: WRAPPER_AGENT_GUIDANCE_SOURCE,
  },
  {
    path: "skills_builtin/zotero-bridge-cli/references/terminology.md",
    sourcePath: SHARED_TERMINOLOGY_SOURCE,
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
  const release = readZoteroBridgeCliRelease(ROOT);
  const errors = validateHostBridgeSurfaceCatalog(catalog);
  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`[host-bridge-surface] ${error}`);
    }
    process.exit(1);
  }

  let changed = false;
  for (const target of TARGETS) {
    const source = target.sourcePath
      ? read(target.sourcePath)
      : read(target.path);
    const current = existsSync(join(ROOT, target.path))
      ? read(target.path)
      : "";
    const next = replaceSection(
      source,
      target.section,
      target.render(catalog, release),
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

  for (const target of COPY_TARGETS) {
    const current = existsSync(join(ROOT, target.path))
      ? read(target.path)
      : "";
    const next = read(target.sourcePath);
    if (next !== current) {
      changed = true;
      if (check) {
        console.error(`[host-bridge-surface] ${target.path} is out of date`);
      } else {
        write(target.path, next);
        console.log(`[host-bridge-surface] copied ${target.path}`);
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
