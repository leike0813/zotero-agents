import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildHostBridgeAgentSurfaceDescriptor,
  serializeHostBridgeAgentSurface,
} from "./host-bridge-agent-surface";
import {
  buildHostBridgeSurfaceCatalog,
  type HostBridgeCapabilityCatalogEntry,
  type HostBridgeCliMapping,
  type HostBridgeSurfaceCatalog,
} from "./host-bridge-surface-catalog";
import {
  inspectHostBridgeSurfaceVersion,
  loadHostBridgeSurfaceDefinitions,
  resolveHostBridgeSurface,
  type HostBridgeSurfaceDefinition,
  type HostBridgeSurfaceSkillDefinition,
} from "./host-bridge-surface-model";
import {
  loadBuiltinWorkflowCatalog,
  renderBuiltinWorkflowCatalog,
} from "./host-bridge-workflow-catalog";

type ContentMap = Map<string, string>;
type RenderMode = "content" | "release";

function read(root: string, path: string) {
  return readFileSync(join(root, path), "utf8");
}

function listFiles(root: string, path: string): string[] {
  const absolute = join(root, path);
  if (!existsSync(absolute)) return [];
  if (statSync(absolute).isFile()) return [path];
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) =>
    listFiles(root, join(path, entry.name)),
  );
}

function copyTree(
  result: ContentMap,
  root: string,
  source: string,
  target = "",
  filter: (path: string) => boolean = () => true,
) {
  for (const file of listFiles(root, source)) {
    const local = relative(source, file).replace(/\\/g, "/");
    if (filter(local)) result.set(join(target, local), read(root, file));
  }
}

function merge(target: ContentMap, source: ContentMap, prefix = "") {
  for (const [path, content] of source) target.set(join(prefix, path), content);
}

function replaceVersion(source: string, version: string) {
  return source.replaceAll("__HOST_BRIDGE_SURFACE_VERSION__", version);
}

function frontmatterField(source: string, field: string) {
  const match = new RegExp(`^${field}:\\s*(.+?)\\s*$`, "m").exec(source);
  return match?.[1]?.replace(/^['"]|['"]$/g, "") || "";
}

export const COMMAND_REFERENCE_PARTITIONS = [
  {
    path: "references/commands/connection-and-context.md",
    title: "Connection and context",
    roots: ["surface", "bridge", "context"],
    catalogTitle:
      "Connect, inspect the current selection, or discover capabilities",
    taskSummary:
      "Use this family to establish the live Zotero connection, inspect what the user is referring to in the UI, and discover the current command contract.",
    cues: [
      "this item, these papers, the current collection, or what is selected",
      "can Zotero do this, which command exists, or what input does it need",
      "connection, profile, endpoint, authentication, or bridge availability",
    ],
  },
  {
    path: "references/commands/library.md",
    title: "Library",
    roots: ["library"],
    catalogTitle: "Find, inspect, page through, or export library content",
    taskSummary:
      "Use this family for current Zotero items, collections, notes, attachments, readiness, snapshots, and bounded exports.",
    cues: [
      "what is in my library, collection, or current research set",
      "find papers about a topic, inspect one item, or list its children",
      "read notes, attachments, annotations, readiness, or a paged snapshot",
    ],
  },
  {
    path: "references/commands/mutation.md",
    title: "Mutation",
    roots: ["mutation"],
    catalogTitle: "Preview and apply an explicit Zotero data change",
    taskSummary:
      "Use this family only after the target identity and desired state are concrete and the current request authorizes a reviewed mutation.",
    cues: [
      "change metadata, tags, collections, notes, links, or attachments",
      "preview a write, apply an approved payload, or inspect mutation status",
      "merge, delete, relink, or overwrite a known Zotero object",
    ],
  },
  {
    path: "references/commands/files-products-and-operations.md",
    title: "Files, Products, and operations",
    roots: ["file", "product", "operation"],
    catalogTitle: "Move bytes, inspect Products, or follow durable operations",
    taskSummary:
      "Use this family when a Zotero object or workflow result names a file, Product, asset, or long-running operation that must be transferred or verified.",
    cues: [
      "upload or download a file without confusing a path and file handle",
      "inspect a Product or retrieve one of its declared assets",
      "resume or verify an operation using its durable receipt",
    ],
  },
  {
    path: "references/commands/workflow.md",
    title: "Workflow",
    roots: ["workflow"],
    catalogTitle: "Discover, validate, submit, or apply a workflow",
    taskSummary:
      "Use this family to inspect the live workflow contract, validate selection and provider inputs, submit supported execution, or apply agent-owned results.",
    cues: [
      "use an installed workflow for analysis, acquisition, synthesis, or curation",
      "check workflow options, provider profile, selection, or readiness",
      "submit, inspect artifacts, or apply an agent-owned result",
    ],
  },
  {
    path: "references/commands/run.md",
    title: "Run",
    roots: ["run"],
    catalogTitle: "Monitor, interact with, or cancel a workflow run",
    taskSummary:
      "Use this family after a workflow has returned a typed run handle and the task needs current status, prompts, notifications, results, or cancellation.",
    cues: [
      "what is this workflow doing, did it finish, or what does it need",
      "answer a run prompt, acknowledge a notification, or cancel a run",
      "inspect terminal result evidence without treating termination as output proof",
    ],
  },
  {
    path: "references/commands/synthesis.md",
    title: "Synthesis",
    roots: ["synthesis"],
    catalogTitle:
      "Inspect or maintain Synthesis topics, indexes, graphs, and artifacts",
    taskSummary:
      "Use this family for the plugin's derived research structures, including topic context, sidecar indexes, citation graphs, resolver state, attention queues, and exports.",
    cues: [
      "topic context, synthesis report, graph relation, metric, or evidence gap",
      "index status, resolver candidates, freshness, or maintenance receipts",
      "export or inspect a synthesis artifact without confusing it with live library truth",
    ],
  },
  {
    path: "references/commands/diagnostics.md",
    title: "Diagnostics",
    roots: ["debug", "call"],
    catalogTitle: "Diagnose the bridge or make an advanced raw call",
    taskSummary:
      "Use this family only when the semantic command surface cannot diagnose the problem or an exact low-level capability call is explicitly required.",
    cues: [
      "collect a bounded diagnostic report for an unavailable or inconsistent surface",
      "inspect raw capability behavior while preserving the normal authority boundary",
      "avoid using diagnostics as a shortcut around semantic validation",
    ],
  },
] as const;

const COMMAND_CATALOG_MARKER = "<!-- host-bridge-command-catalog:entries -->";
const COMMAND_CATALOG_PATH = "references/command-catalog.md";

function prettyJson(value: unknown) {
  const serialized = JSON.stringify(value, null, 2);
  const multiline =
    serialized === "{}" ? "{\n}" : serialized === "[]" ? "[\n]" : serialized;
  return ["```json", multiline, "```"].join("\n");
}

function tableCell(value: unknown) {
  const text = Array.isArray(value) ? value.join(", ") : String(value ?? "");
  return text.replaceAll("|", "\\|").replaceAll("\n", " ") || "—";
}

function markdownTable(headers: string[], rows: string[][]) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

function commandForDocSort(mapping: HostBridgeCliMapping) {
  const groupOrder = [
    "bridge",
    "library",
    "synthesis",
    "workflow",
    "run",
    "mutation",
    "file",
    "product",
    "operation",
    "debug",
    "call",
    "context",
  ];
  const group = mapping.command.split(" ")[0] || "";
  const groupIndex = groupOrder.indexOf(group);
  return `${String(groupIndex < 0 ? 99 : groupIndex).padStart(2, "0")}:${mapping.command}`;
}

function sortedDocMappings(catalog: HostBridgeSurfaceCatalog) {
  return [...catalog.endpointMappings, ...catalog.cliMappings].sort(
    (left, right) =>
      commandForDocSort(left).localeCompare(commandForDocSort(right)),
  );
}

function sortedDocCapabilities(
  catalog: HostBridgeSurfaceCatalog,
  predicate: (entry: HostBridgeCapabilityCatalogEntry) => boolean,
) {
  const categoryOrder = [
    "workflow_products",
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

function capabilityFlags(entry: HostBridgeCapabilityCatalogEntry) {
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

function capabilityInputSummary(entry: HostBridgeCapabilityCatalogEntry) {
  const schema = entry.inputSchema;
  const type = Array.isArray(schema.type)
    ? schema.type.join(" | ")
    : String(schema.type || "object");
  const required = Array.isArray(schema.required) && schema.required.length > 0;
  return `${type}${required ? " required" : ""}`;
}

function capabilityTable(entries: HostBridgeCapabilityCatalogEntry[]) {
  return markdownTable(
    ["Capability", "Category", "Approval", "Input", "CLI exposure", "Flags"],
    entries.map((entry) => [
      `\`${entry.name}\``,
      entry.category,
      `\`${entry.approval}\``,
      `\`${capabilityInputSummary(entry)}\``,
      entry.cliCommands.length
        ? entry.cliCommands.map((command) => `\`${command}\``).join(", ")
        : entry.rawOnly
          ? "`raw call only`"
          : "",
      capabilityFlags(entry) || "-",
    ]),
  );
}

function capabilityCategoryTable(catalog: HostBridgeSurfaceCatalog) {
  const categories = new Map<string, string[]>();
  for (const capability of catalog.capabilities) {
    const names = categories.get(capability.category) || [];
    names.push(capability.name);
    categories.set(capability.category, names);
  }
  return markdownTable(
    ["Category", "Count", "Capabilities"],
    [...categories.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([category, names]) => [
        `\`${category}\``,
        String(names.length),
        names
          .sort()
          .map((name) => `\`${name}\``)
          .join(", "),
      ]),
  );
}

function mappingTable(mappings: HostBridgeCliMapping[]) {
  return markdownTable(
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

function capabilityInputFields(
  catalog: HostBridgeSurfaceCatalog,
  capability: string,
) {
  const entry = catalog.capabilities.find(
    (candidate) => candidate.name === capability,
  );
  const properties = entry?.inputSchema.properties;
  if (
    !properties ||
    typeof properties !== "object" ||
    Array.isArray(properties)
  )
    return [];
  return Object.keys(properties);
}

function libraryDocGuidance(catalog: HostBridgeSurfaceCatalog) {
  const searchFields = capabilityInputFields(catalog, "library.search_items");
  if (!searchFields.includes("query") || searchFields.includes("text")) {
    throw new Error(
      "library.search_items documentation requires canonical query without legacy text",
    );
  }
  const listFields = capabilityInputFields(catalog, "library.list_items");
  const snapshotFields = capabilityInputFields(
    catalog,
    "library.sync_snapshot",
  );
  const readinessFields = capabilityInputFields(
    catalog,
    "library.readiness_audit",
  );
  return [
    "- Use inline JSON with `--query` by default. Use stdin, `@file`, or a bare JSON file path only when that source is intentional.",
    '- Use `zotero-bridge library item search --query \'{"query":"graph","limit":10}\'` for finite candidate discovery.',
    '- Use `zotero-bridge library items list --query \'{"limit":50,"collectionKey":"COLL"}\'` for bounded library inventory pages.',
    "- Use `zotero-bridge library snapshot --query '{\"limit\":200}'` for the first local metadata index page.",
    "- Use `zotero-bridge library readiness missing-pdf|missing-markdown|missing-analysis --query '{\"limit\":100}'` before scheduling PDF retrieval, Markdown conversion, or literature-analysis work.",
    `- \`library item search\` accepts ${searchFields.map((field) => `\`${field}\``).join(", ")} in \`--query\`.`,
    `- \`library items list\` accepts ${listFields.map((field) => `\`${field}\``).join(", ")} in \`--query\`.`,
    `- \`library snapshot\` accepts ${snapshotFields.map((field) => `\`${field}\``).join(", ")} in \`--query\`.`,
    `- \`library readiness audit\` accepts ${readinessFields.map((field) => `\`${field}\``).join(", ")} in \`--query\`; Markdown and analysis readiness reuse the Zotero Artifacts column rules.`,
    "- Omit `cursor` on the first library, snapshot, or readiness page. When `hasMore` is true, pass the exact returned opaque `nextCursor`; never construct or increment a cursor.",
  ].join("\n");
}

function largeResponseDocGuidance() {
  return [
    "- Treat `response:paged` capabilities as one-page reads. Iterate the returned cursor metadata instead of assuming one call returns the whole collection.",
    "- `synthesis graph overview` returns summary plus paged `nodes`, `edges`, `hover_only_nodes`, and `hover_only_edges`. Use `cursor`/`limit` for all sections together or section cursors such as `nodeCursor`, `edgeCursor`, `hoverNodeCursor`, and `hoverEdgeCursor`.",
    "- Use `synthesis graph get-slice`, `synthesis graph get-layout`, or `synthesis graph get-metrics` when the task needs a coherent bounded subgraph, layout, or ranked metric page instead of the entire citation graph.",
    "- `synthesis topic list`, `synthesis index library get`, graph metrics, and graph rankings are paged reads. Do not build workflows that rely on stdout containing every topic, index row, graph node, edge, or rank item in one response.",
  ].join("\n");
}

function resolverDocGuidance() {
  return [
    "- `synthesis resolver resolve` accepts direct resolver fields in `--query`; do not wrap them in a top-level `resolver` object.",
    "- Allowed selector fields are `tag`, `collection_key`, and `paper_refs`; at least one selector is required.",
    "- `combine` is optional and defaults to `union`; use `intersection` when every provided selector type must match.",
    "- `tag` accepts a tag string, a tag array, or an `{ and, or, not }` object. `collection_key` accepts a string or string array. `paper_refs` accepts canonical `libraryId:itemKey` refs.",
    '- Examples: `zotero-bridge synthesis resolver resolve --query \'{"tag":{"and":["object-detection"],"not":["nlp-transformer"]}}\'`; `zotero-bridge synthesis resolver resolve --query \'{"tag":"topic:vision","collection_key":["COLL_A"],"combine":"intersection"}\'`.',
    "- Unsupported fields are rejected: `resolver`, `topic_resolver`, `mode`, `query`, `include`, and `exclude`.",
  ].join("\n");
}

function workflowDocGuidance() {
  return [
    "- Use `workflow describe --workflow <id>` or `workflow requirements --workflow <id>` before submit when selection, workflow options, or provider profile requirements are unclear.",
    "- `workflow submit` and `workflow validate` use `--selection <JSON_OR_FILE>` for an item ref array or `--none` for no-selection workflows.",
    "- Put manifest parameter values in `--workflow-options`; put only `schema`, `backendId`, and `providerOptions` in `--provider-profile`.",
    "- Never put bearer tokens, backend auth, base URLs, or local paths in provider profile files.",
    "- Use `workflow agent-run --workflow <id> (--selection <JSON_OR_FILE> | --none) --output-dir <DIR>` when the calling agent should execute the workflow itself from a downloaded handoff bundle.",
    "- `workflow agent-run` does not accept workflow options, provider profiles, or agent-engine flags, and it does not start a Host backend task; the host only prepares request context for the handoff.",
    "- `workflow agent-run` gates bundle creation only on `inputs`; `validateSelection` is returned as `applyStatus` advisory and is recalculated when apply-back is submitted.",
    "- Use `workflow agent-apply <agentRunId> --result <agentRequestId>=<bundlePath>` after finalizing a SkillRunner-compatible output bundle from the handoff output contract.",
    "- Agent-run apply-back is one-shot. Approval denial does not consume the agentRunId, but once applyResult starts the agentRunId cannot be reused.",
  ].join("\n");
}

function runDocGuidance() {
  return [
    "- Use `run get <workflowRunId>` for workflow-level runtime status and known skill run projections.",
    "- Use `run active` for the lightweight global active-task list; it excludes transcripts, local paths, and provider-private payloads.",
    "- Use `run cancel <workflowRunId>` for workflow-level cancellation intent; cancellation does not imply immediate terminal state.",
    "- Use `run skill get|reply|connect <skillRunId>` for explicit skill run interactions. Do not infer a skill run target from a workflow run id.",
  ].join("\n");
}

function renderDocSurface(catalog: HostBridgeSurfaceCatalog) {
  return [
    "This section is generated from the executable Host Bridge capability and CLI command contracts plus the Rust CLI runtime descriptor. Edit those sources, then run `npm run render:host-bridge-content`.",
    "",
    "#### Public capabilities",
    "",
    capabilityTable(sortedDocCapabilities(catalog, (entry) => entry.public)),
    "",
    "#### CLI mappings",
    "",
    mappingTable(sortedDocMappings(catalog)),
    "",
    "#### Library guidance",
    "",
    libraryDocGuidance(catalog),
    "",
    "#### Large response pagination",
    "",
    largeResponseDocGuidance(),
    "",
    "#### Resolver payloads",
    "",
    resolverDocGuidance(),
    "",
    "#### Workflow payloads",
    "",
    workflowDocGuidance(),
    "",
    "#### Runtime control payloads",
    "",
    runDocGuidance(),
    "",
    "#### Debug capabilities",
    "",
    capabilityTable(sortedDocCapabilities(catalog, (entry) => entry.debugOnly)),
    "",
    "MCP tools mirror Host Bridge capability names from the executable contract and return structured content containing `{ capability, approval, data }`.",
  ].join("\n");
}

function replaceGeneratedSection(
  source: string,
  section: string,
  replacement: string,
) {
  const start = `<!-- host-bridge-surface:${section}:start -->`;
  const end = `<!-- host-bridge-surface:${section}:end -->`;
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end);
  if (startIndex < 0 || endIndex < 0 || endIndex < startIndex) {
    throw new Error(`Missing generated section markers for ${section}`);
  }
  return `${source.slice(0, startIndex + start.length)}\n${replacement.trim()}\n${source.slice(endIndex)}`;
}

function commandReferencePaths(
  descriptor: ReturnType<typeof buildHostBridgeAgentSurfaceDescriptor>,
) {
  const rootCounts = new Map<string, number>();
  for (const command of descriptor.commands) {
    const root = command.argv[0];
    rootCounts.set(root, (rootCounts.get(root) || 0) + 1);
  }
  return new Map(
    descriptor.commands.map((command) => {
      const tokens = command.argv;
      const local =
        tokens.length === 1 || rootCounts.get(tokens[0]) === 1
          ? join("commands", tokens[0], "index.md")
          : join("commands", ...tokens) + ".md";
      return [command.command, `references/${local.replace(/\\/g, "/")}`];
    }),
  );
}

function parameterTable(
  arguments_: ReturnType<
    typeof buildHostBridgeAgentSurfaceDescriptor
  >["globalOptions"],
  requiredWhen: Record<string, string[]> = {},
) {
  return [
    "| Token | Id | Kind | Required | Conditional requirement | Values / arity | Repeatable | Environment | Conflicts | Help |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...arguments_.map((argument) =>
      [
        argument.token,
        argument.id,
        argument.kind,
        argument.required ? "yes" : "no",
        (requiredWhen[argument.id] || []).join("; "),
        [
          argument.valueNames.join(" / "),
          argument.possibleValues.length
            ? `values: ${argument.possibleValues.join(", ")}`
            : "",
          argument.numArgs ? `numArgs: ${argument.numArgs}` : "",
          argument.defaultValues.length
            ? `default: ${argument.defaultValues.join(", ")}`
            : "",
        ]
          .filter(Boolean)
          .join("; "),
        argument.repeatable ? "yes" : "no",
        argument.env || "",
        argument.conflictsWith.join(", "),
        argument.longHelp || argument.help,
      ]
        .map(tableCell)
        .join(" | ")
        .replace(/^/, "| ")
        .replace(/$/, " |"),
    ),
  ].join("\n");
}

function usageToken(
  argument: ReturnType<
    typeof buildHostBridgeAgentSurfaceDescriptor
  >["commands"][number]["arguments"][number],
) {
  const value = argument.takesValue
    ? ` <${argument.valueNames.join("|") || "VALUE"}>`
    : "";
  const token = `${argument.token}${value}`;
  return argument.required ? token : `[${token}]`;
}

function renderCommandCard(args: {
  descriptor: ReturnType<typeof buildHostBridgeAgentSurfaceDescriptor>;
  command: ReturnType<
    typeof buildHostBridgeAgentSurfaceDescriptor
  >["commands"][number];
}) {
  const requiredWhen = Object.fromEntries(
    Object.entries(args.command.inputSchemas).map(([id, input]) => [
      id,
      input.requiredWhen,
    ]),
  );
  const usage = [
    "zotero-bridge",
    args.command.command,
    ...args.descriptor.globalOptions.map(usageToken),
    ...args.command.arguments.map(usageToken),
  ].join(" ");
  const inputSections = Object.entries(args.command.inputSchemas).flatMap(
    ([id, input]) => [
      `### \`${input.token}\` (${id})`,
      "",
      `Required: \`${input.required}\`${input.requiredWhen.length ? `; condition: ${input.requiredWhen.join("; ")}` : ""}.`,
      "",
      prettyJson(input.schema),
      "",
    ],
  );
  const schemaGuidance = inputSections.length
    ? "Use `--schema` to inspect raw structured-input schemas without loading a profile or connecting to Zotero."
    : "This leaf has no structured JSON input. `--schema` returns `command_input_schema_unavailable`; use command help or `surface describe` to inspect the invocation contract.";
  const examples = Object.entries(args.command.inputSchemas).flatMap(
    ([id, input]) =>
      input.examples.flatMap((example) => [
        `### ${id}: ${example.kind}`,
        "",
        example.description ||
          `Governed ${example.kind} example for ${input.token}.`,
        "",
        "```console",
        `zotero-bridge ${args.command.command} ${input.token} '${JSON.stringify(example.value)}'`,
        "```",
        "",
        ...(example.prerequisites.length
          ? [
              "Prerequisites:",
              "",
              ...example.prerequisites.map((entry) => `- ${entry}`),
              "",
            ]
          : []),
      ]),
  );
  return [
    `# \`zotero-bridge ${args.command.command}\``,
    "",
    args.command.summary,
    "",
    "## Usage",
    "",
    "```console",
    usage,
    "```",
    "",
    `The global options may appear before or after the leaf command. ${schemaGuidance}`,
    "",
    "## Global parameters",
    "",
    parameterTable(args.descriptor.globalOptions),
    "",
    "## Local options and positionals",
    "",
    args.command.arguments.length
      ? parameterTable(args.command.arguments, requiredWhen)
      : "This command has no local parameters.",
    "",
    "## Invocation schema",
    "",
    prettyJson(args.command.invocationSchema),
    "",
    "## Structured input schemas",
    "",
    ...(inputSections.length
      ? inputSections
      : ["This command has no structured JSON input parameter.", ""]),
    "## Composed payload schema",
    "",
    prettyJson(args.command.payloadSchema),
    "",
    "## Payload composition",
    "",
    args.command.composition
      ? "The executable command contract owns the base source, fixed values, field mappings, and closed transforms shown below. Command handlers only provide values under the referenced Clap argument IDs."
      : "This command has no separate field-mapping program. Its binding mode is executable directly: passthrough uses the sole structured source, while `none` and `raw` retain their declared closed behavior.",
    "",
    args.command.composition
      ? prettyJson(args.command.composition)
      : "`composition`: `null`.",
    "",
    "## Result schema",
    "",
    prettyJson(args.command.resultSchema),
    "",
    "## Examples",
    "",
    ...(examples.length
      ? examples
      : [
          "No structured-input example applies. Build argv from the parameter tables and confirm the command with `surface describe` before execution.",
          "",
        ]),
    "## Complete command descriptor",
    "",
    "This closed descriptor is the machine-readable command contract returned by `surface describe`; it is included here so the card remains independently auditable without loading another command reference.",
    "",
    prettyJson(args.command),
    "",
    "## Parameter failure and recovery contract",
    "",
    "Parameter failures are returned as one JSON error envelope. Inspect `error.code`, then require `error.details.schema` to be `host-bridge.argument-error.v1` before using the structured boundary fields. Preserve the canonical command, sanitized inputs, and any already-returned typed handles; never include the complete raw payload in evidence.",
    "",
    "- `argv` reports a missing, unknown, conflicting, or invalid CLI argument. Rebuild argv from this card's parameter tables or the active command help.",
    "- `json_source` reports an unreadable stdin or file source. Correct that source without moving the value to a different binding.",
    "- `json_syntax` reports invalid JSON with safe line and column context. Repair syntax before interpreting domain fields.",
    ...(inputSections.length
      ? [
          "- `command_input` reports schema violations for a structured input. Inspect the bounded `violations`, then run this exact leaf with `--schema` and correct the declared field or type; do not invent an alias.",
        ]
      : [
          "- This leaf has no structured JSON input, so `command_input` is not an expected invocation boundary. Use `surface describe` for its scalar and positional contract.",
        ]),
    "- `payload_contract` means the CLI's composed capability payload violates the executable contract before network I/O. Treat this as an implementation fault; do not bypass the semantic command with raw transport.",
    "- `command_result` means a Host response or local result failed its executable result schema. Do not accept or report it as successful evidence.",
    "- Violation arrays are redacted, deterministically ordered, and capped at eight. When `truncated` is true, correct the reported violations and validate again rather than requesting secret or complete payload disclosure.",
    "",
    "## Operational contract",
    "",
    `- Canonical argv path: ${args.command.argv.map((token) => `\`${token}\``).join(" ")}.`,
    `- Output boundary: \`${args.command.outputBoundary.strategy}\`; governed details: ${JSON.stringify(args.command.outputBoundary)}.`,
    `- Pagination: \`${args.command.pagination}\`.`,
    `- Category: \`${args.command.category}\`; danger: \`${args.command.danger}\`.`,
    `- Structured binding mode: \`${args.command.binding}\`.`,
    `- Intent visibility: \`${args.command.hiddenFromIntentSearch ? "hidden" : "visible"}\`.`,
    `- Operational aliases: ${args.command.operationalAliases.map((alias) => `\`${alias}\``).join(", ") || "none"}.`,
    "",
    "### Effects",
    "",
    prettyJson(args.command.effects),
    "",
    "### Approval",
    "",
    prettyJson(args.command.approvalContract),
    "",
    "### Handle transitions",
    "",
    prettyJson(args.command.handleTransitions),
    "",
    "### Recovery",
    "",
    prettyJson(args.command.recovery),
    "",
    "### Targets",
    "",
    prettyJson(args.command.targets),
    "",
  ].join("\n");
}

function partitionCommands(
  descriptor: ReturnType<typeof buildHostBridgeAgentSurfaceDescriptor>,
) {
  const ownerByRoot = new Map<
    string,
    (typeof COMMAND_REFERENCE_PARTITIONS)[number]
  >();
  for (const partition of COMMAND_REFERENCE_PARTITIONS) {
    for (const root of partition.roots) {
      const previous = ownerByRoot.get(root);
      if (previous) {
        throw new Error(
          `Command root ${root} belongs to both ${previous.path} and ${partition.path}`,
        );
      }
      ownerByRoot.set(root, partition);
    }
  }

  const commandsByPath = new Map<
    string,
    ReturnType<typeof buildHostBridgeAgentSurfaceDescriptor>["commands"]
  >();
  const seenCommands = new Set<string>();
  for (const command of descriptor.commands) {
    const root = command.command.trim().split(/\s+/)[0] || "";
    const partition = ownerByRoot.get(root);
    if (!partition) {
      throw new Error(
        `No command reference partition owns ${command.command} (root ${root || "<empty>"})`,
      );
    }
    if (seenCommands.has(command.command)) {
      throw new Error(`Duplicate canonical command ${command.command}`);
    }
    seenCommands.add(command.command);
    const commands = commandsByPath.get(partition.path) || [];
    commands.push(command);
    commandsByPath.set(partition.path, commands);
  }

  if (seenCommands.size !== descriptor.commands.length) {
    throw new Error(
      `Command reference coverage mismatch: ${seenCommands.size}/${descriptor.commands.length}`,
    );
  }
  return commandsByPath;
}

function renderCommandReferences(
  content: ContentMap,
  descriptor: ReturnType<typeof buildHostBridgeAgentSurfaceDescriptor>,
) {
  for (const path of [...content.keys()]) {
    if (path.startsWith("references/commands/")) content.delete(path);
  }
  const paths = commandReferencePaths(descriptor);
  const seen = new Set<string>();
  for (const command of descriptor.commands) {
    const path = paths.get(command.command);
    if (!path || seen.has(path)) {
      throw new Error(
        `Command reference path must be unique for ${command.command}: ${path || "<missing>"}`,
      );
    }
    seen.add(path);
    content.set(
      path,
      `${renderCommandCard({ descriptor, command }).trimEnd()}\n`,
    );
  }
  if (seen.size !== descriptor.commands.length) {
    throw new Error(
      `Command reference coverage mismatch: ${seen.size}/${descriptor.commands.length}`,
    );
  }
  return paths;
}

function renderCommandCatalog(
  template: string,
  commandsByPath: ReturnType<typeof partitionCommands>,
  referencePaths: Map<string, string>,
) {
  if (template.split(COMMAND_CATALOG_MARKER).length !== 2) {
    throw new Error(
      "Command catalog template must contain exactly one entry marker",
    );
  }
  const sections = COMMAND_REFERENCE_PARTITIONS.flatMap((partition) => {
    const commands = commandsByPath.get(partition.path) || [];
    return [
      `## ${partition.catalogTitle}`,
      "",
      partition.taskSummary,
      "",
      "Natural-language cues:",
      "",
      ...partition.cues.map((cue) => `- ${cue}.`),
      "",
      `Select one command below, then read its linked command card. Each card contains the exact argv, schemas, examples, effects, approval, handles, and recovery contract.`,
      "",
      "| Canonical command | Purpose | Command card |",
      "| --- | --- | --- |",
      ...commands.map((command) => {
        const path = referencePaths.get(command.command);
        if (!path)
          throw new Error(`Missing command card for ${command.command}`);
        const relativePath = path.replace(/^references\//, "");
        return `| \`zotero-bridge ${command.command}\` | ${command.summary.replaceAll("|", "\\|")} | [Open card](${relativePath}) |`;
      }),
      "",
      "Selection check:",
      "",
      "- Match the user's requested outcome, object type, freshness, and state-change boundary to this family.",
      "- If several commands remain plausible, use `zotero-bridge surface search --intent <plain-language intent>` to narrow the candidates.",
      "- Confirm the selected command with `zotero-bridge surface describe '<canonical command>'` before constructing the invocation.",
      "- Read the linked detailed reference before execution; the compact index is not an argv or approval contract.",
      "",
    ];
  });
  return `${template.replace(COMMAND_CATALOG_MARKER, sections.join("\n")).trimEnd()}\n`;
}

function coreSkillContent(args: {
  root: string;
  surface: HostBridgeSurfaceDefinition;
  skill: HostBridgeSurfaceSkillDefinition;
  version: string;
  descriptor: ReturnType<typeof buildHostBridgeAgentSurfaceDescriptor>;
}) {
  const content: ContentMap = new Map();
  const sourceRoot = args.surface.sourceRoot;
  copyTree(
    content,
    args.root,
    join(sourceRoot, args.skill.source),
    "",
    (path) => path === "SKILL.md" || path.startsWith("references/"),
  );
  const commandsByPath = partitionCommands(args.descriptor);
  const referencePaths = renderCommandReferences(content, args.descriptor);
  const commandCatalogTemplate = content.get(COMMAND_CATALOG_PATH);
  if (!commandCatalogTemplate) {
    throw new Error(
      `Missing minimum-core command catalog template: ${COMMAND_CATALOG_PATH}`,
    );
  }
  content.set(
    COMMAND_CATALOG_PATH,
    renderCommandCatalog(
      commandCatalogTemplate,
      commandsByPath,
      referencePaths,
    ),
  );
  content.set(
    "assets/runner.json",
    replaceVersion(
      read(args.root, join(sourceRoot, "runner.json")),
      args.version,
    ),
  );
  content.set(
    "assets/output.schema.json",
    read(args.root, join(sourceRoot, "output.schema.json")),
  );
  content.set(
    "assets/profile.template.json",
    read(args.root, join(sourceRoot, "profile.template.json")),
  );
  content.set(
    "assets/agent-surface.json",
    serializeHostBridgeAgentSurface(args.descriptor),
  );
  return content;
}

function genericSkillContent(args: {
  root: string;
  surface: HostBridgeSurfaceDefinition;
  skill: HostBridgeSurfaceSkillDefinition;
  version: string;
}) {
  const content: ContentMap = new Map();
  const sourceRoot = args.surface.sourceRoot;
  const source = join(sourceRoot, args.skill.source);
  copyTree(
    content,
    args.root,
    source,
    "",
    (path) =>
      path === "SKILL.md" ||
      path.startsWith("references/") ||
      path.startsWith("agents/"),
  );
  if (args.skill.id === "zotero-library-agent") {
    const catalogPath = "references/workflow-catalog.md";
    const catalogTemplate = content.get(catalogPath);
    if (!catalogTemplate) {
      throw new Error(
        `Missing built-in workflow catalog template: ${catalogPath}`,
      );
    }
    content.set(
      catalogPath,
      renderBuiltinWorkflowCatalog(
        catalogTemplate,
        loadBuiltinWorkflowCatalog(args.root),
      ),
    );
  }
  const skillText = content.get("SKILL.md");
  if (!skillText) throw new Error(`Missing Skill source: ${source}/SKILL.md`);
  const runnerPath = join(source, "runner.json");
  const runner = existsSync(join(args.root, runnerPath))
    ? read(args.root, runnerPath)
    : read(args.root, join(sourceRoot, "shared/task-runner.template.json"))
        .replaceAll("__SKILL_ID__", args.skill.id)
        .replaceAll("__SKILL_NAME__", frontmatterField(skillText, "name"))
        .replaceAll(
          "__DESCRIPTION__",
          frontmatterField(skillText, "description"),
        );
  const parsed = JSON.parse(runner) as Record<string, unknown>;
  parsed.version = args.version;
  delete parsed.schema;
  content.set("assets/runner.json", `${JSON.stringify(parsed, null, 2)}\n`);
  content.set(
    "assets/output.schema.json",
    read(args.root, join(sourceRoot, "shared/output.schema.json")),
  );
  return content;
}

function hostedSkillContent(args: {
  root: string;
  surface: HostBridgeSurfaceDefinition;
  skill: HostBridgeSurfaceSkillDefinition;
}) {
  const content: ContentMap = new Map();
  copyTree(
    content,
    args.root,
    join(args.surface.sourceRoot, args.skill.source),
    "",
    (path) => path === "SKILL.md" || path.startsWith("references/"),
  );
  if (!content.has("SKILL.md")) {
    throw new Error(
      `Missing hosted Skill source: ${args.surface.sourceRoot}/${args.skill.source}/SKILL.md`,
    );
  }
  return content;
}

function profileDistribution(version: string) {
  return [
    "schema: hermes.profile.distribution.v1",
    "name: zotero-librarian",
    "title: Zotero Librarian",
    `version: ${version}`,
    "summary: Hermes profile for maintaining a Zotero literature library through zotero-bridge.",
    "entrypoint: SOUL.md",
    "repository: https://github.com/leike0813/zotero-librarian-profile",
    "sourceRepository: https://github.com/leike0813/zotero-agents",
    "state:",
    '  defaultDir: "$HERMES_HOME/zotero-librarian"',
    "  overrideEnv: ZOTERO_LIBRARIAN_STATE_DIR",
    "  activeProfileEnv: ZOTERO_BRIDGE_PROFILE",
    "  workspaceLayout: connection-profile-v1",
    '  explicitWorkspace: "$BASE/workspaces/<sha256>"',
    '  defaultWorkspace: "$BASE/state.sqlite"',
    "assets:",
    "  zoteroBridgeBinaries: assets/zotero-bridge/bin",
    "skills:",
    "  - skills/zotero-librarian",
    "cron:",
    "  - cron/index-refresh.yaml",
    "  - cron/workflow-catalog-refresh.yaml",
    "  - cron/run-monitor.yaml",
    "  - cron/notification-sync.yaml",
    "  - cron/workflow-status-triage.yaml",
    "  - cron/library-hygiene.yaml",
    "  - cron/attention-queue.yaml",
    "",
  ].join("\n");
}

function profileContent(args: {
  root: string;
  surface: HostBridgeSurfaceDefinition;
  version: string;
  ownSkill: ContentMap;
  inheritedSkills: Array<{ mount: string; content: ContentMap }>;
}) {
  const content: ContentMap = new Map();
  copyTree(
    content,
    args.root,
    args.surface.sourceRoot,
    "",
    (path) =>
      !path.startsWith("skills/") &&
      path !== "profile-version.json" &&
      !path.includes("__pycache__/") &&
      !path.endsWith(".pyc"),
  );
  content.set("distribution.yaml", profileDistribution(args.version));
  content.set(
    ".gitignore",
    [
      "state.sqlite",
      "*.sqlite",
      "workspaces/",
      "runs/",
      "logs/",
      ".zotero-bridge/",
      "",
    ].join("\n"),
  );
  merge(content, args.ownSkill, "skills/zotero-librarian");
  for (const inherited of args.inheritedSkills) {
    merge(content, inherited.content, inherited.mount);
  }
  return content;
}

function applyContent(args: {
  root: string;
  outputRoot: string;
  targetRoot: string;
  content: ContentMap;
  check: boolean;
  prune?: boolean;
}) {
  const changes: string[] = [];
  for (const [path, value] of args.content) {
    const target = join(args.targetRoot, path);
    const absolute = join(args.outputRoot, target);
    const current = existsSync(absolute) ? readFileSync(absolute, "utf8") : "";
    if (current === value) continue;
    changes.push(target);
    if (!args.check) {
      mkdirSync(dirname(absolute), { recursive: true });
      writeFileSync(absolute, value, "utf8");
    }
  }
  if (args.prune) {
    for (const existing of listFiles(args.outputRoot, args.targetRoot)) {
      const local = relative(args.targetRoot, existing);
      if (args.content.has(local)) continue;
      changes.push(existing);
      if (!args.check) rmSync(join(args.outputRoot, existing));
    }
    if (!args.check)
      removeEmptyDirectories(join(args.outputRoot, args.targetRoot));
  }
  return changes;
}

function removeEmptyDirectories(path: string) {
  if (!existsSync(path) || statSync(path).isFile()) return;
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (entry.isDirectory()) removeEmptyDirectories(join(path, entry.name));
  }
  if (readdirSync(path).length === 0) rmSync(path, { recursive: true });
}

export function renderHostBridgeSurfaces(
  args: {
    root?: string;
    outputRoot?: string;
    check?: boolean;
    mode?: RenderMode;
  } = {},
) {
  const root = args.root || process.cwd();
  const outputRoot = args.outputRoot || root;
  const check = args.check === true;
  const definitions = loadHostBridgeSurfaceDefinitions(
    join(root, "host-bridge/surfaces.json"),
  );
  const minimum = resolveHostBridgeSurface(
    definitions,
    "zotero-bridge-cli",
  ).surface;
  const generic = resolveHostBridgeSurface(
    definitions,
    "zotero-library-agent",
  ).surface;
  const hermes = resolveHostBridgeSurface(
    definitions,
    "zotero-librarian",
  ).surface;
  const minimumVersion = inspectHostBridgeSurfaceVersion({
    definitionsPath: join(root, "host-bridge/surfaces.json"),
    surfaceId: minimum.id,
  }).version;
  const genericVersion = inspectHostBridgeSurfaceVersion({
    definitionsPath: join(root, "host-bridge/surfaces.json"),
    surfaceId: generic.id,
  }).version;
  const hermesVersion = inspectHostBridgeSurfaceVersion({
    definitionsPath: join(root, "host-bridge/surfaces.json"),
    surfaceId: hermes.id,
  }).version;

  const catalog = buildHostBridgeSurfaceCatalog(root);
  const descriptor = buildHostBridgeAgentSurfaceDescriptor(catalog, root);
  const core = coreSkillContent({
    root,
    surface: minimum,
    skill: minimum.skills[0],
    version: minimumVersion,
    descriptor,
  });
  const genericSkills = generic.skills.map((skill) => ({
    skill,
    content: genericSkillContent({
      root,
      surface: generic,
      skill,
      version: genericVersion,
    }),
  }));
  const ownLibrarian = hostedSkillContent({
    root,
    surface: hermes,
    skill: hermes.skills[0],
  });
  const docPath = "doc/host-bridge-cli.md";
  const docContent = replaceGeneratedSection(
    read(root, docPath),
    "doc-surface",
    renderDocSurface(catalog),
  );
  const capabilityDocPath = "doc/components/host-bridge-capability-registry.md";
  const capabilityDocContent = replaceGeneratedSection(
    read(root, capabilityDocPath),
    "capability-categories",
    capabilityCategoryTable(catalog),
  );
  const changes = [
    ...applyContent({
      root,
      outputRoot,
      targetRoot: "",
      content: new Map([
        [docPath, docContent],
        [capabilityDocPath, capabilityDocContent],
      ]),
      check,
    }),
    ...applyContent({
      root,
      outputRoot,
      targetRoot: minimum.generatedRoot,
      content: core,
      check,
      prune: true,
    }),
    ...genericSkills.flatMap(({ skill, content }) =>
      applyContent({
        root,
        outputRoot,
        targetRoot: join(generic.generatedRoot, skill.id),
        content,
        check,
        prune: true,
      }),
    ),
    ...applyContent({
      root,
      outputRoot,
      targetRoot: hermes.generatedRoot,
      content: profileContent({
        root,
        surface: hermes,
        version: hermesVersion,
        ownSkill: ownLibrarian,
        inheritedSkills: [
          { mount: minimum.skills[0].mount, content: core },
          ...genericSkills.map(({ skill, content }) => ({
            mount: skill.mount,
            content,
          })),
        ],
      }),
      check,
      prune: true,
    }),
  ];
  if (check && changes.length) {
    throw new Error(
      `Host Bridge generated surfaces are stale:\n${changes.map((path) => `- ${path}`).join("\n")}`,
    );
  }
  return { schema: "host-bridge.surface-render.v1", changes };
}

function isMainModule() {
  return process.argv[1]
    ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
    : false;
}

if (isMainModule()) {
  const outputIndex = process.argv.indexOf("--output-root");
  const result = renderHostBridgeSurfaces({
    outputRoot:
      outputIndex >= 0 ? process.argv[outputIndex + 1] : process.cwd(),
    check: process.argv.includes("--check"),
    mode: process.argv.includes("--content-only") ? "content" : "release",
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
