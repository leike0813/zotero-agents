import { createHash } from "node:crypto";
import type {
  HostBridgeCliMapping,
  HostBridgeSurfaceCatalog,
} from "./host-bridge-surface-catalog";

export type HostBridgeAgentCommand = {
  command: string;
  argv: string[];
  summary: string;
  category: "read" | "navigation" | "write" | "maintenance" | "debug";
  danger: "none" | "review" | "high";
  approval: "none" | "zotero-ui-required";
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  pagination: "none" | "cursor" | "file";
  consumes: string[];
  returns: string[];
  retryable: boolean;
  stateChanged: boolean;
  safeNextActions: string[];
  targets: Array<{ kind: string; target: string }>;
  intents: string[];
};

export type HostBridgeAgentSurfaceDescriptor = {
  schema: "host-bridge.agent-surface.v1";
  protocol: "host-bridge.v1";
  cliSchema: "zotero-bridge.cli.v1";
  commandCatalogChecksum: string;
  commands: HostBridgeAgentCommand[];
};

const WRITE_COMMANDS = new Set([
  "workflow submit",
  "workflow agent-run",
  "workflow agent-apply",
  "run cancel",
  "run skill reply",
  "run skill connect",
  "run notification ack",
  "file upload",
  "product remove",
]);

const NAVIGATION_COMMANDS = new Set([
  "context selection open",
  "context item open",
  "context note open",
  "context collection open",
]);

const MAINTENANCE_COMMANDS = new Set([
  "synthesis cache invalidate",
  "synthesis graph refresh-metrics",
]);

const COMMAND_HANDLES: Record<
  string,
  { consumes?: string[]; returns?: string[] }
> = {
  "context selection get": { returns: ["itemRef"] },
  "context selection open": { consumes: ["itemRef"] },
  "context item open": { consumes: ["itemRef"] },
  "context note open": { consumes: ["noteRef"] },
  "context collection open": { consumes: ["collectionKey"] },
  "workflow submit": { consumes: ["itemRef"], returns: ["workflowRunId"] },
  "workflow agent-run": { consumes: ["itemRef"], returns: ["agentRunId"] },
  "workflow agent-apply": {
    consumes: ["agentRunId", "agentRequestId"],
    returns: ["applyReceipt"],
  },
  "workflow agent-apply-status": {
    consumes: ["agentRunId"],
    returns: ["applyReceipt"],
  },
  "run get": { consumes: ["workflowRunId"], returns: ["skillRunId"] },
  "run cancel": { consumes: ["workflowRunId"] },
  "run skill get": { consumes: ["skillRunId"] },
  "run skill reply": { consumes: ["skillRunId"] },
  "run skill connect": { consumes: ["skillRunId"] },
  "file upload": { returns: ["fileId"] },
  "file download": { consumes: ["fileId"] },
  "mutation item attach-file": { consumes: ["itemRef", "fileId"] },
  "product get": { consumes: ["productId"], returns: ["productId"] },
  "product download": { consumes: ["productId"], returns: ["fileId"] },
  "product remove": { consumes: ["productId"] },
};

const INTENTS: Record<string, string[]> = {
  "surface identity": ["check compatibility", "verify cli", "exact identity"],
  "surface describe": ["describe command", "command contract"],
  "surface search": ["find command", "search intent", "discover command"],
  "context current": ["current pane", "current view", "active zotero"],
  "context selection get": [
    "selected items",
    "current selection",
    "read selection",
  ],
  "library item search": ["find literature", "search library", "find item"],
  "library items list": ["list library", "inventory", "page items"],
  "workflow submit": ["host owned workflow", "submit workflow"],
  "workflow agent-run": ["agent owned workflow", "handoff workflow"],
  "workflow agent-apply": ["apply results", "write back", "apply handoff"],
  "workflow agent-apply-status": [
    "apply status",
    "apply receipt",
    "recover apply",
  ],
  "file upload": ["upload file", "create file handle"],
  "mutation item attach-file": ["attach file", "write attachment"],
};

function commandCategory(command: string): HostBridgeAgentCommand["category"] {
  if (command.startsWith("debug ")) return "debug";
  if (NAVIGATION_COMMANDS.has(command)) return "navigation";
  if (MAINTENANCE_COMMANDS.has(command)) return "maintenance";
  if (WRITE_COMMANDS.has(command) || command.startsWith("mutation ")) {
    return "write";
  }
  return "read";
}

function commandApproval(command: string, mappings: HostBridgeCliMapping[]) {
  if (
    command === "workflow agent-run" ||
    command === "file upload" ||
    NAVIGATION_COMMANDS.has(command)
  ) {
    return "none" as const;
  }
  if (
    WRITE_COMMANDS.has(command) ||
    command.startsWith("mutation ") ||
    mappings.some((mapping) => mapping.dangerous)
  ) {
    return "zotero-ui-required" as const;
  }
  return "none" as const;
}

function paginationFor(command: string, mappings: HostBridgeCliMapping[]) {
  if (
    command.includes("download") ||
    mappings.some((mapping) =>
      ["workflow_products.export", "paper_artifacts.export_filtered"].includes(
        mapping.target,
      ),
    )
  ) {
    return "file" as const;
  }
  if (
    /\b(list|snapshot|recent|events|overview|metrics|rank-|readiness)\b/.test(
      command,
    )
  ) {
    return "cursor" as const;
  }
  return "none" as const;
}

function safeNextActions(command: string, category: string) {
  if (command === "surface identity")
    return ["surface describe", "surface search"];
  if (command === "surface describe")
    return ["surface search", "surface identity"];
  if (command === "surface search")
    return ["surface describe", "surface identity"];
  if (command === "workflow agent-apply") {
    return ["workflow agent-apply-status", "surface describe"];
  }
  if (command === "workflow submit") return ["run get", "run active"];
  if (command === "workflow agent-run") {
    return ["workflow agent-apply", "workflow agent-apply-status"];
  }
  if (category === "write" || category === "maintenance") {
    return ["surface describe", "bridge status"];
  }
  return ["surface search", "bridge status"];
}

function commandSummary(command: string, mappings: HostBridgeCliMapping[]) {
  const targets = mappings.map((mapping) => mapping.target).join(", ");
  return `${command} maps to ${targets}.`;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function serializeHostBridgeAgentSurface(
  descriptor: HostBridgeAgentSurfaceDescriptor,
) {
  return `${JSON.stringify(descriptor, null, 2)}\n`;
}

export function hostBridgeAgentSurfaceChecksum(
  descriptor: HostBridgeAgentSurfaceDescriptor,
) {
  return createHash("sha256")
    .update(stableJson(descriptor.commands))
    .digest("hex");
}

export function buildHostBridgeAgentSurfaceDescriptor(
  catalog: HostBridgeSurfaceCatalog,
): HostBridgeAgentSurfaceDescriptor {
  const mappings = [...catalog.cliMappings, ...catalog.endpointMappings];
  const byCommand = new Map<string, HostBridgeCliMapping[]>();
  for (const mapping of mappings) {
    const values = byCommand.get(mapping.command) || [];
    if (!values.some((entry) => entry.target === mapping.target)) {
      values.push(mapping);
    }
    byCommand.set(mapping.command, values);
  }
  if (byCommand.has("workflow agent-apply")) {
    byCommand.set("workflow agent-apply-status", [
      {
        command: "workflow agent-apply-status",
        target: "GET /bridge/v1/workflows/agent-runs/{agentRunId}/apply",
        kind: "endpoint",
      },
    ]);
  }
  for (const command of [
    "surface identity",
    "surface describe",
    "surface search",
  ]) {
    byCommand.set(command, [
      {
        command,
        target: "embedded host-bridge.agent-surface.v1",
        kind: "service",
      },
    ]);
  }

  const commands = Array.from(byCommand.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([command, commandMappings]): HostBridgeAgentCommand => {
      const category = commandCategory(command);
      const approval = commandApproval(command, commandMappings);
      const handles = COMMAND_HANDLES[command] || {};
      return {
        command,
        argv: command.split(" "),
        summary: commandSummary(command, commandMappings),
        category,
        danger:
          commandMappings.some((mapping) => mapping.dangerous) ||
          category === "debug"
            ? "high"
            : approval === "zotero-ui-required"
              ? "review"
              : "none",
        approval,
        inputSchema: { type: "object", additionalProperties: true },
        outputSchema: { type: "object" },
        pagination: paginationFor(command, commandMappings),
        consumes: handles.consumes || [],
        returns: handles.returns || [],
        retryable: command !== "workflow agent-apply",
        stateChanged: category !== "read",
        safeNextActions: safeNextActions(command, category),
        targets: commandMappings.map((mapping) => ({
          kind: mapping.kind,
          target: mapping.target,
        })),
        intents: INTENTS[command] || [command.replace(/-/g, " ")],
      };
    });

  const descriptor = {
    schema: "host-bridge.agent-surface.v1",
    protocol: "host-bridge.v1",
    cliSchema: "zotero-bridge.cli.v1",
    commandCatalogChecksum: "",
    commands,
  } satisfies HostBridgeAgentSurfaceDescriptor;
  descriptor.commandCatalogChecksum =
    hostBridgeAgentSurfaceChecksum(descriptor);
  return descriptor;
}

export function createHostBridgeSurfaceIdentity(args: {
  version: string;
  buildFingerprint: string;
  descriptor: HostBridgeAgentSurfaceDescriptor;
}) {
  return {
    schema: "host-bridge.surface-identity.v1" as const,
    protocol: args.descriptor.protocol,
    cliSchema: args.descriptor.cliSchema,
    version: args.version,
    buildFingerprint: args.buildFingerprint,
    commandCatalogChecksum: args.descriptor.commandCatalogChecksum,
  };
}

export function searchHostBridgeAgentSurface(
  descriptor: HostBridgeAgentSurfaceDescriptor,
  intent: string,
) {
  const tokens = intent
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return descriptor.commands
    .map((command) => {
      const haystack = [command.command, command.summary, ...command.intents]
        .join(" ")
        .toLowerCase();
      const phraseMatch = haystack.includes(intent.toLowerCase()) ? 100 : 0;
      const score =
        phraseMatch + tokens.filter((token) => haystack.includes(token)).length;
      return { command, score };
    })
    .filter((entry) => entry.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.command.command.localeCompare(right.command.command),
    )
    .map((entry) => entry.command);
}
