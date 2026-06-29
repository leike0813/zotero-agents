import { readFileSync } from "node:fs";
import { join } from "node:path";

export type HostBridgeCapabilityCatalogEntry = {
  name: string;
  category: string;
  summary: string;
  inputType: string;
  inputRequired: boolean;
  approval: "none" | "zotero-ui-required";
  public: boolean;
  debugOnly: boolean;
  dangerous: boolean;
  cacheView: boolean;
  rawOnly: boolean;
  mcpMirror: boolean;
  cliCommands: string[];
};

export type HostBridgeCliMapping = {
  command: string;
  target: string;
  kind: "capability" | "endpoint" | "service";
  dangerous?: boolean;
  cacheView?: boolean;
};

export type HostBridgeSurfaceCatalog = {
  capabilities: HostBridgeCapabilityCatalogEntry[];
  cliMappings: HostBridgeCliMapping[];
  endpointMappings: HostBridgeCliMapping[];
};

const REGISTRY = "src/modules/hostBridgeCapabilityRegistry.ts";
const CLI_COMMANDS = "cli/zotero-bridge/src/commands.rs";

const NO_APPROVAL_CAPABILITIES = new Set([
  "context.get_current_view",
  "context.get_selected_items",
  "library.search_items",
  "library.list_items",
  "library.sync_snapshot",
  "library.get_item_detail",
  "library.get_item_notes",
  "library.get_note_detail",
  "library.list_note_payloads",
  "library.get_note_payload",
  "library.get_item_attachments",
  "mutation.preview",
  "diagnostic.get_status",
]);

const DANGEROUS_CAPABILITIES = new Set([
  "debug.synthesis.cleanInstallReset",
  "debug.zotero.eval",
  "citation_graph.refresh_metrics",
]);

const ALLOWED_DANGEROUS_SEMANTIC_CLI = new Set([
  "debug.synthesis.cleanInstallReset",
  "citation_graph.refresh_metrics",
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
  "context.get_current_view",
  "context.get_selected_items",
  "mutation.preview",
  "mutation.execute",
  "diagnostic.get_status",
  "debug.zotero.eval",
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

function parseCapabilities(source: string) {
  const entries: Array<{
    name: string;
    category: string;
    summary: string;
    inputType: string;
    inputRequired: boolean;
  }> = [];

  for (const match of source.matchAll(
    /\bcapability\(\s*["`]([^"`]+)["`]\s*,\s*["`]([^"`]+)["`]\s*,\s*["`]([^"`]+)["`]\s*,([\s\S]*?)\n\s{2}\),/g,
  )) {
    const input = match[4].match(
      /\{\s*type:\s*["`]([^"`]+)["`]\s*,\s*required:\s*(true|false)/,
    );
    if (!input) {
      continue;
    }
    entries.push({
      name: match[1],
      category: match[2],
      summary: normalizeSummary(match[3]),
      inputType: input[1],
      inputRequired: input[2] === "true",
    });
  }

  for (const match of source.matchAll(
    /\bdebugCapability\(\s*["`]([^"`]+)["`]\s*,\s*["`]([^"`]+)["`]/g,
  )) {
    entries.push({
      name: match[1],
      category: "debug",
      summary: normalizeSummary(match[2]),
      inputType: "object",
      inputRequired: false,
    });
  }

  for (const match of source.matchAll(
    /\bsynthesisCapability\(\s*["`]([^"`]+)["`]\s*,\s*["`]([^"`]+)["`]\s*,\s*["`]([^"`]+)["`]/g,
  )) {
    entries.push({
      name: match[1],
      category: match[2],
      summary: normalizeSummary(match[3]),
      inputType: "object",
      inputRequired: false,
    });
  }

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

function parseDebugMappings(source: string): HostBridgeCliMapping[] {
  const mappings: HostBridgeCliMapping[] = [
    ["debug status", "debug.status"],
    ["debug persistence", "debug.persistence.snapshot"],
    ["debug tasks", "debug.tasks.snapshot"],
    ["debug acp-skill-run reapply-result", "debug.acpSkillRun.reapplyResult"],
  ].map(([command, target]) => ({
    command,
    target,
    kind: "capability" as const,
    dangerous: DANGEROUS_CAPABILITIES.has(target),
  }));

  for (const match of source.matchAll(
    /DebugSynthesisCommand::([A-Za-z0-9_]+)\(input\)\s*=>\s*Ok\(\("([^"]+)"/g,
  )) {
    mappings.push({
      command: `debug synthesis ${kebabCase(match[1])}`,
      target: match[2],
      kind: "capability",
      dangerous: DANGEROUS_CAPABILITIES.has(match[2]),
    });
  }

  return mappings.sort((left, right) =>
    left.command.localeCompare(right.command),
  );
}

function coreCliMappings(): HostBridgeCliMapping[] {
  return [
    ["library list", "library.list_items"],
    ["library snapshot", "library.sync_snapshot"],
    ["item search", "library.search_items"],
    ["item get", "library.get_item_detail"],
    ["item notes", "library.get_item_notes"],
    ["item attachments", "library.get_item_attachments"],
    ["note get", "library.get_note_detail"],
    ["note payloads", "library.list_note_payloads"],
    ["note payload", "library.get_note_payload"],
    ["literature ingest", "mutation.execute"],
  ].map(([command, target]) => ({
    command,
    target,
    kind: "capability" as const,
    dangerous: DANGEROUS_CAPABILITIES.has(target),
  }));
}

function endpointMappings(): HostBridgeCliMapping[] {
  return [
    ["status", "GET /bridge/v1/health"],
    ["manifest", "GET /bridge/v1/manifest"],
    ["workflow list", "GET /bridge/v1/workflows"],
    ["workflow describe", "POST /bridge/v1/workflows/describe"],
    ["workflow submit", "POST /bridge/v1/workflows/submit"],
    ["workflow agent-run", "POST /bridge/v1/workflows/agent-run"],
    ["workflow run", "GET /bridge/v1/workflows/runs/{runId}"],
    ["task list", "GET /bridge/v1/tasks"],
    ["file download", "GET /bridge/v1/files/{fileId}"],
  ].map(([command, target]) => ({
    command,
    target,
    kind: "endpoint" as const,
  }));
}

export function buildHostBridgeSurfaceCatalog(
  root = process.cwd(),
): HostBridgeSurfaceCatalog {
  const registrySource = read(root, REGISTRY);
  const cliCommandsSource = read(root, CLI_COMMANDS);
  const cliMappings = [
    ...coreCliMappings(),
    ...parseDomainMappings(cliCommandsSource),
    ...parseDebugMappings(cliCommandsSource),
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
      cliCommands: (cliByCapability.get(entry.name) || []).sort(),
    };
  });

  return {
    capabilities,
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
  }

  return errors;
}
