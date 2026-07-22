import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

export type HostBridgeCapabilityCatalogEntry = {
  name: string;
  category: string;
  summary: string;
  inputType: string;
  inputRequired: boolean;
  inputProperties: Record<string, unknown>;
  inputRequiredProperties: string[];
  approval: "none" | "zotero-ui-required";
  public: boolean;
  debugOnly: boolean;
  dangerous: boolean;
  cacheView: boolean;
  rawOnly: boolean;
  mcpMirror: boolean;
  responseSizing:
    | "paged"
    | "limit-bounded"
    | "selector-bounded"
    | "file-output"
    | "bounded-diagnostic"
    | "unclassified";
  cliCommands: string[];
};

export type HostBridgeCliMapping = {
  command: string;
  target: string;
  kind: "capability" | "endpoint" | "service";
  approval?: "none" | "zotero-ui-required";
  dangerous?: boolean;
  cacheView?: boolean;
};

export type HostBridgeCliInventoryArgument = {
  id: string;
  long: string | null;
  short: string | null;
  index: number | null;
  position: number | null;
  required: boolean;
  takesValue: boolean;
  global: boolean;
  help: string | null;
  valueNames: string[];
};

export type HostBridgeCliInventoryEntry = {
  command: string;
  argv: string[];
  about: string;
  arguments: HostBridgeCliInventoryArgument[];
};

export type HostBridgeSurfaceCatalog = {
  capabilities: HostBridgeCapabilityCatalogEntry[];
  globalArguments: HostBridgeCliInventoryArgument[];
  commandInventory: HostBridgeCliInventoryEntry[];
  cliMappings: HostBridgeCliMapping[];
  endpointMappings: HostBridgeCliMapping[];
};

const REGISTRY = "src/modules/hostBridgeCapabilityRegistry.ts";
const CLI_MANIFEST = "cli/zotero-bridge/Cargo.toml";

const NO_APPROVAL_CAPABILITIES = new Set([
  "context.get_current_view",
  "context.get_selected_items",
  "library.search_items",
  "library.list_items",
  "library.sync_snapshot",
  "library.readiness_audit",
  "library.get_item_detail",
  "library.get_item_notes",
  "library.get_note_detail",
  "library.list_note_payloads",
  "library.get_note_payload",
  "library.get_item_attachments",
  "library.list_annotations",
  "library.export_annotations",
  "workflow_products.list",
  "workflow_products.get",
  "workflow_products.read_asset",
  "workflow_products.export",
  "mutation.preview",
  "diagnostic.get_status",
  "synthesis.operation.get",
]);

const DANGEROUS_CAPABILITIES = new Set([
  "debug.synthesis.cleanInstallReset",
  "debug.zotero.eval",
  "citation_graph.refresh_metrics",
  "citation_graph.update",
  "reference_sidecar.refresh",
]);

const ALLOWED_DANGEROUS_SEMANTIC_CLI = new Set([
  "debug.synthesis.cleanInstallReset",
  "citation_graph.refresh_metrics",
  "citation_graph.update",
  "reference_sidecar.refresh",
]);

const CACHE_VIEW_CAPABILITIES = new Set([
  "citation_graph.get_overview",
  "citation_graph.get_slice",
  "citation_graph.get_layout",
  "citation_graph.get_metrics",
  "citation_graph.query_cluster",
  "citation_graph.rank_external_references",
  "citation_graph.rank_library_papers",
  "library_index.get",
  "reference_index.get",
]);

const RAW_ONLY_CAPABILITIES = new Set([
  "diagnostic.get_status",
  "debug.zotero.eval",
  "workflow_products.read_asset",
]);

const RESPONSE_SIZING = new Map<
  string,
  HostBridgeCapabilityCatalogEntry["responseSizing"]
>([
  ["library.search_items", "limit-bounded"],
  ["library.list_items", "paged"],
  ["library.sync_snapshot", "paged"],
  ["library.readiness_audit", "paged"],
  ["library.get_item_detail", "selector-bounded"],
  ["library.get_item_notes", "paged"],
  ["library.get_note_detail", "paged"],
  ["library.list_note_payloads", "selector-bounded"],
  ["library.get_note_payload", "paged"],
  ["library.get_item_attachments", "selector-bounded"],
  ["library.list_annotations", "selector-bounded"],
  ["library.export_annotations", "selector-bounded"],
  ["workflow_products.list", "paged"],
  ["workflow_products.get", "selector-bounded"],
  ["workflow_products.read_asset", "file-output"],
  ["workflow_products.export", "file-output"],
  ["topics.list", "paged"],
  ["topics.find_by_paper_ref", "selector-bounded"],
  ["topics.get_context", "file-output"],
  ["topics.get_report", "selector-bounded"],
  ["topics.get_review_input", "limit-bounded"],
  ["schemas.get", "bounded-diagnostic"],
  ["concepts.query", "limit-bounded"],
  ["citation_graph.get_overview", "paged"],
  ["citation_graph.query_cluster", "limit-bounded"],
  ["citation_graph.get_slice", "limit-bounded"],
  ["citation_graph.get_layout", "limit-bounded"],
  ["citation_graph.get_metrics", "paged"],
  ["citation_graph.rank_external_references", "paged"],
  ["citation_graph.rank_library_papers", "paged"],
  ["library_index.get", "paged"],
  ["reference_index.get", "paged"],
  ["resolvers.resolve", "paged"],
  ["paper_artifacts.get_manifest", "selector-bounded"],
  ["paper_artifacts.read", "selector-bounded"],
  ["paper_artifacts.export_filtered", "file-output"],
  ["paper_artifacts.resolve_topic_digest", "selector-bounded"],
  ["insights.get_attention_queue", "limit-bounded"],
]);

const HIGH_CARDINALITY_READ_CAPABILITIES = new Set([
  "library.list_items",
  "library.sync_snapshot",
  "library.readiness_audit",
  "workflow_products.list",
  "topics.list",
  "citation_graph.get_overview",
  "citation_graph.query_cluster",
  "citation_graph.get_metrics",
  "citation_graph.rank_external_references",
  "citation_graph.rank_library_papers",
  "library_index.get",
  "reference_index.get",
  "resolvers.resolve",
  "insights.get_attention_queue",
]);

function read(root: string, path: string) {
  return readFileSync(join(root, path), "utf8");
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function normalizeSummary(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function kebabCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase();
}

function approvalForCapability(name: string): "none" | "zotero-ui-required" {
  if (DANGEROUS_CAPABILITIES.has(name)) {
    return "zotero-ui-required";
  }
  if (
    name.startsWith("debug.") ||
    name.startsWith("citation_graph.") ||
    name.startsWith("concepts.") ||
    name.startsWith("insights.") ||
    name.startsWith("library_index.") ||
    name.startsWith("paper_artifacts.") ||
    name.startsWith("reference_index.") ||
    name.startsWith("resolvers.") ||
    name.startsWith("schemas.") ||
    name.startsWith("topics.")
  ) {
    return "none";
  }
  if (NO_APPROVAL_CAPABILITIES.has(name)) {
    return "none";
  }
  return "zotero-ui-required";
}

function literalValue(node: ts.Expression): unknown {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isArrayLiteralExpression(node))
    return node.elements.map((element) =>
      literalValue(element as ts.Expression),
    );
  if (ts.isObjectLiteralExpression(node)) {
    const value: Record<string, unknown> = {};
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const name = property.name.getText().replace(/^['"]|['"]$/g, "");
      value[name] = literalValue(property.initializer);
    }
    return value;
  }
  return undefined;
}

function parseCapabilities(source: string) {
  const entries: Array<{
    name: string;
    category: string;
    summary: string;
    inputType: string;
    inputRequired: boolean;
    inputProperties: Record<string, unknown>;
    inputRequiredProperties: string[];
  }> = [];
  const file = ts.createSourceFile(
    REGISTRY,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const kind = node.expression.text;
      if (
        ["capability", "debugCapability", "synthesisCapability"].includes(kind)
      ) {
        const args = node.arguments;
        const name = args[0] && literalValue(args[0]);
        const category =
          kind === "debugCapability"
            ? "debug"
            : args[1] && literalValue(args[1]);
        const summaryIndex = kind === "debugCapability" ? 1 : 2;
        const summary = args[summaryIndex] && literalValue(args[summaryIndex]);
        const inputIndex =
          kind === "capability" ? 3 : kind === "synthesisCapability" ? 4 : -1;
        const input =
          inputIndex >= 0 && args[inputIndex]
            ? (literalValue(args[inputIndex]) as Record<string, unknown>)
            : { type: "object", required: false };
        if (
          typeof name === "string" &&
          typeof category === "string" &&
          typeof summary === "string"
        ) {
          entries.push({
            name,
            category,
            summary: normalizeSummary(summary),
            inputType: String(input?.type || "object"),
            inputRequired: input?.required === true,
            inputProperties:
              input?.properties && typeof input.properties === "object"
                ? (input.properties as Record<string, unknown>)
                : {},
            inputRequiredProperties: Array.isArray(input?.requiredProperties)
              ? input.requiredProperties.map(String)
              : [],
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);

  return unique(entries.map((entry) => entry.name))
    .map((name) => entries.find((entry) => entry.name === name)!)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function parseDomainMappings(source: string): HostBridgeCliMapping[] {
  const mappings: HostBridgeCliMapping[] = [];
  for (const functionMatch of source.matchAll(
    /fn\s+([a-z_]+)_capability\([^)]*\)\s*->\s*&'static str\s*\{([\s\S]*?)\n\}/g,
  )) {
    const commandGroup = kebabCase(functionMatch[1]);
    if (commandGroup === "debug-synthesis") {
      continue;
    }
    for (const mappingMatch of functionMatch[2].matchAll(
      /[A-Za-z]+Command::([A-Za-z0-9_]+)\(_\)\s*=>\s*(?:\{\s*)?"([^"]+)"/g,
    )) {
      mappings.push({
        command: `${commandGroup} ${kebabCase(mappingMatch[1])}`,
        target: mappingMatch[2],
        kind: "capability",
        dangerous: DANGEROUS_CAPABILITIES.has(mappingMatch[2]),
        cacheView: CACHE_VIEW_CAPABILITIES.has(mappingMatch[2]),
      });
    }
  }
  return mappings.sort((left, right) =>
    left.command.localeCompare(right.command),
  );
}

function debugCliMappings(): HostBridgeCliMapping[] {
  return [
    ["debug status", "debug.status"],
    ["debug persistence", "debug.persistence.snapshot"],
    ["debug tasks", "debug.tasks.snapshot"],
    ["debug acp-skill-run reapply-result", "debug.acpSkillRun.reapplyResult"],
    ["debug synthesis snapshot", "debug.synthesis.snapshot"],
    ["debug synthesis diff", "debug.synthesis.diff"],
    ["debug synthesis inspect-paper", "debug.synthesis.paper.inspect"],
    ["debug synthesis inspect-topic", "debug.synthesis.topic.inspect"],
    ["debug synthesis operations", "debug.synthesis.operations.list"],
    ["debug synthesis profiler", "debug.synthesis.profiler.list"],
    ["debug synthesis cache", "debug.synthesis.cache.list"],
    [
      "debug synthesis clean-install-reset",
      "debug.synthesis.cleanInstallReset",
    ],
  ].map(([command, target]) => ({
    command,
    target,
    kind: "capability" as const,
    dangerous: DANGEROUS_CAPABILITIES.has(target),
  }));
}

export function loadHostBridgeCliInventory(root = process.cwd()): {
  globalArguments: HostBridgeCliInventoryArgument[];
  commands: HostBridgeCliInventoryEntry[];
} {
  const output = execFileSync(
    "cargo",
    [
      "run",
      "--quiet",
      "--manifest-path",
      join(root, CLI_MANIFEST),
      "--example",
      "export-command-inventory",
    ],
    { cwd: root, encoding: "utf8" },
  );
  const parsed = JSON.parse(output) as {
    schema: string;
    globalArguments: HostBridgeCliInventoryArgument[];
    commands: HostBridgeCliInventoryEntry[];
  };
  if (parsed.schema !== "zotero-bridge.command-inventory.v1") {
    throw new Error(`unexpected CLI inventory schema: ${parsed.schema}`);
  }
  return {
    globalArguments: parsed.globalArguments || [],
    commands: parsed.commands,
  };
}

function coreCliMappings(): HostBridgeCliMapping[] {
  return [
    ["context current", "context.get_current_view"],
    ["context selection get", "context.get_selected_items"],
    ["library items list", "library.list_items"],
    ["library snapshot", "library.sync_snapshot"],
    ["library readiness audit", "library.readiness_audit"],
    ["library readiness missing-pdf", "library.readiness_audit"],
    ["library readiness missing-markdown", "library.readiness_audit"],
    ["library readiness missing-analysis", "library.readiness_audit"],
    ["library item search", "library.search_items"],
    ["library item get", "library.get_item_detail"],
    ["library item notes", "library.get_item_notes"],
    ["library item attachments", "library.get_item_attachments"],
    ["library annotation list", "library.list_annotations"],
    ["library annotation export", "library.export_annotations"],
    ["library note get", "library.get_note_detail"],
    ["library note payloads", "library.list_note_payloads"],
    ["library note payload", "library.get_note_payload"],
    ["product list", "workflow_products.list"],
    ["product get", "workflow_products.get"],
    ["product download", "workflow_products.export"],
    ["product remove", "workflow_products.remove"],
    ["mutation preview", "mutation.preview"],
    ["mutation apply", "mutation.execute"],
    ["mutation literature-ingest", "mutation.execute"],
    ["mutation tag add", "mutation.execute"],
    ["mutation tag remove", "mutation.execute"],
    ["mutation collection create", "mutation.execute"],
    ["mutation collection add-items", "mutation.execute"],
    ["mutation collection remove-items", "mutation.execute"],
    ["mutation item update", "mutation.execute"],
    ["mutation item attach-file", "mutation.execute"],
    ["mutation note create", "mutation.execute"],
    ["mutation note update", "mutation.execute"],
    ["mutation note upsert-payload", "mutation.execute"],
  ].map(([command, target]) => ({
    command,
    target,
    kind: "capability" as const,
    dangerous: DANGEROUS_CAPABILITIES.has(target),
  }));
}

function synthesisCliMappings(): HostBridgeCliMapping[] {
  return [
    ["synthesis topic list", "topics.list"],
    ["synthesis topic find-by-paper-ref", "topics.find_by_paper_ref"],
    ["synthesis topic get-context", "topics.get_context"],
    ["synthesis topic get-report", "topics.get_report"],
    ["synthesis topic get-review-input", "topics.get_review_input"],
    ["synthesis schema get", "schemas.get"],
    ["synthesis concept query", "concepts.query"],
    ["synthesis graph overview", "citation_graph.get_overview"],
    ["synthesis graph query-cluster", "citation_graph.query_cluster"],
    ["synthesis graph get-slice", "citation_graph.get_slice"],
    ["synthesis graph get-layout", "citation_graph.get_layout"],
    ["synthesis graph get-metrics", "citation_graph.get_metrics"],
    [
      "synthesis graph rank-external-references",
      "citation_graph.rank_external_references",
    ],
    [
      "synthesis graph rank-library-papers",
      "citation_graph.rank_library_papers",
    ],
    ["synthesis graph refresh-metrics", "citation_graph.refresh_metrics"],
    ["synthesis graph update", "citation_graph.update"],
    ["synthesis cache refresh-reference-sidecar", "reference_sidecar.refresh"],
    ["synthesis cache status", "synthesis.operation.get"],
    ["synthesis index library get", "library_index.get"],
    ["synthesis index reference get", "reference_index.get"],
    ["synthesis resolver resolve", "resolvers.resolve"],
    ["synthesis artifact manifest", "paper_artifacts.get_manifest"],
    ["synthesis artifact read", "paper_artifacts.read"],
    ["synthesis artifact export-filtered", "paper_artifacts.export_filtered"],
    [
      "synthesis artifact resolve-topic-digest",
      "paper_artifacts.resolve_topic_digest",
    ],
    ["synthesis insight attention-queue", "insights.get_attention_queue"],
  ].map(([command, target]) => ({
    command,
    target,
    kind: "capability" as const,
    dangerous: DANGEROUS_CAPABILITIES.has(target),
    cacheView: CACHE_VIEW_CAPABILITIES.has(target),
  }));
}

function endpointMappings(): HostBridgeCliMapping[] {
  const mappings: Array<
    readonly [
      command: string,
      target: string,
      approval?: HostBridgeCliMapping["approval"],
    ]
  > = [
    ["bridge status", "GET /bridge/v1/health"],
    ["bridge manifest", "GET /bridge/v1/manifest"],
    ["bridge profile inspect", "GET /bridge/v1/diagnostics/profile"],
    ["bridge profile diagnose", "GET /bridge/v1/diagnostics/profile/diagnose"],
    ["bridge backend list", "GET /bridge/v1/diagnostics/backends"],
    [
      "bridge backend status",
      "GET /bridge/v1/diagnostics/backends/{backendId}",
    ],
    ["context current", "GET /bridge/v1/context/current"],
    ["context selection get", "GET /bridge/v1/context/selection"],
    ["context selection open", "POST /bridge/v1/context/selection/open"],
    ["context item open", "POST /bridge/v1/context/items/open"],
    ["context collection open", "POST /bridge/v1/context/collections/open"],
    ["context note open", "POST /bridge/v1/context/notes/open"],
    ["workflow list", "GET /bridge/v1/workflows"],
    ["workflow describe", "POST /bridge/v1/workflows/describe"],
    ["workflow validate", "POST /bridge/v1/workflows/validate"],
    ["workflow requirements", "POST /bridge/v1/workflows/requirements"],
    [
      "workflow submit",
      "POST /bridge/v1/workflows/submit",
      "zotero-ui-required",
    ],
    ["workflow agent-run", "POST /bridge/v1/workflows/agent-run"],
    [
      "workflow agent-apply",
      "POST /bridge/v1/workflows/agent-runs/{agentRunId}/apply",
    ],
    [
      "workflow agent-apply-status",
      "GET /bridge/v1/workflows/agent-runs/{agentRunId}/apply",
    ],
    ["run get", "GET /bridge/v1/workflows/runs/{workflowRunId}"],
    [
      "run cancel",
      "POST /bridge/v1/workflows/runs/{workflowRunId}/cancel",
      "zotero-ui-required",
    ],
    ["run list", "GET /bridge/v1/tasks"],
    ["run active", "GET /bridge/v1/tasks/active"],
    ["run recent", "GET /bridge/v1/tasks/recent"],
    ["run workflow recent", "GET /bridge/v1/workflows/runs"],
    ["run permission pending", "GET /bridge/v1/permissions/pending"],
    ["run permission get", "GET /bridge/v1/permissions/{permissionRequestId}"],
    ["run skill get", "GET /bridge/v1/skill-runs/{skillRunId}"],
    ["run skill reply", "POST /bridge/v1/skill-runs/{skillRunId}/reply"],
    ["run skill connect", "POST /bridge/v1/skill-runs/{skillRunId}/connect"],
    ["run skill recent", "GET /bridge/v1/skill-runs/recent"],
    ["run skill events", "GET /bridge/v1/skill-runs/{skillRunId}/events"],
    ["run notification list", "GET /bridge/v1/notifications"],
    ["run notification wait", "GET /bridge/v1/notifications"],
    ["run notification ack", "POST /bridge/v1/notifications/ack"],
    ["workflow profile list", "GET /bridge/v1/workflows/provider-profiles"],
    [
      "workflow profile describe",
      "POST /bridge/v1/workflows/provider-profiles/describe",
    ],
    [
      "workflow profile validate",
      "POST /bridge/v1/workflows/provider-profiles/validate",
    ],
    ["synthesis cache status", "GET /bridge/v1/synthesis/cache/status"],
    [
      "synthesis cache invalidate",
      "POST /bridge/v1/synthesis/cache/invalidate",
      "zotero-ui-required",
    ],
    ["synthesis index status", "GET /bridge/v1/synthesis/index/status"],
    ["file download", "GET /bridge/v1/files/{fileId}"],
    ["file upload", "POST /bridge/v1/files/upload"],
  ];
  return mappings.map(([command, target, approval]) => ({
    command,
    target,
    kind: "endpoint" as const,
    ...(approval ? { approval } : {}),
  }));
}

export function buildHostBridgeSurfaceCatalog(
  root = process.cwd(),
): HostBridgeSurfaceCatalog {
  const registrySource = read(root, REGISTRY);
  const cliMappings = [
    ...coreCliMappings(),
    ...synthesisCliMappings(),
    ...debugCliMappings(),
    {
      command: "call",
      target: "POST /bridge/v1/call",
      kind: "service" as const,
    },
  ];
  const cliByCapability = new Map<string, string[]>();
  for (const mapping of cliMappings) {
    if (mapping.kind !== "capability") {
      continue;
    }
    const commands = cliByCapability.get(mapping.target) || [];
    commands.push(mapping.command);
    cliByCapability.set(mapping.target, commands);
  }

  const capabilities = parseCapabilities(registrySource).map((entry) => {
    const dangerous = DANGEROUS_CAPABILITIES.has(entry.name);
    const debugOnly = entry.category === "debug";
    return {
      ...entry,
      approval: approvalForCapability(entry.name),
      public: !debugOnly,
      debugOnly,
      dangerous,
      cacheView: CACHE_VIEW_CAPABILITIES.has(entry.name),
      rawOnly: RAW_ONLY_CAPABILITIES.has(entry.name),
      mcpMirror: true,
      responseSizing: RESPONSE_SIZING.get(entry.name) || "unclassified",
      cliCommands: (cliByCapability.get(entry.name) || []).sort(),
    };
  });

  const cliInventory = loadHostBridgeCliInventory(root);
  return {
    capabilities,
    globalArguments: cliInventory.globalArguments,
    commandInventory: cliInventory.commands,
    cliMappings,
    endpointMappings: endpointMappings(),
  };
}

export function validateHostBridgeSurfaceCatalog(
  catalog: HostBridgeSurfaceCatalog,
) {
  const errors: string[] = [];
  const capabilities = new Set(catalog.capabilities.map((entry) => entry.name));

  for (const mapping of catalog.cliMappings) {
    if (mapping.kind === "capability" && !capabilities.has(mapping.target)) {
      errors.push(
        `CLI command "${mapping.command}" maps missing capability ${mapping.target}`,
      );
    }
    if (
      mapping.kind === "capability" &&
      DANGEROUS_CAPABILITIES.has(mapping.target) &&
      !ALLOWED_DANGEROUS_SEMANTIC_CLI.has(mapping.target)
    ) {
      errors.push(
        `dangerous capability ${mapping.target} must not be exposed by semantic CLI command "${mapping.command}"`,
      );
    }
  }

  for (const capability of catalog.capabilities) {
    if (!capability.public) {
      continue;
    }
    if (!capability.rawOnly && capability.cliCommands.length === 0) {
      errors.push(
        `public capability ${capability.name} must have semantic CLI mapping or raw-only classification`,
      );
    }
    if (
      HIGH_CARDINALITY_READ_CAPABILITIES.has(capability.name) &&
      capability.responseSizing === "unclassified"
    ) {
      errors.push(
        `high-cardinality read capability ${capability.name} must declare response sizing`,
      );
    }
  }

  return errors;
}
