import { execFileSync } from "node:child_process";
import { join } from "node:path";
import {
  loadHostBridgeCapabilityContracts,
  loadHostBridgeCommandContracts,
} from "./host-bridge-command-contracts";

export type HostBridgeCapabilityCatalogEntry = {
  name: string;
  category: string;
  summary: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  requestEffect: "read" | "state-change";
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
  longHelp: string | null;
  env: string | null;
  aliases: string[];
  defaultValues: string[];
  valueNames: string[];
  possibleValues: string[];
  conflictsWith: string[];
  repeatable: boolean;
  numArgs: string | null;
};

export type HostBridgeCliInventoryEntry = {
  command: string;
  argv: string[];
  about: string;
  arguments: HostBridgeCliInventoryArgument[];
  argumentGroups: Array<{
    id: string;
    arguments: string[];
    required: boolean;
  }>;
};

export type HostBridgeSurfaceCatalog = {
  capabilities: HostBridgeCapabilityCatalogEntry[];
  globalArguments: HostBridgeCliInventoryArgument[];
  commandInventory: HostBridgeCliInventoryEntry[];
  cliMappings: HostBridgeCliMapping[];
  endpointMappings: HostBridgeCliMapping[];
};

type CapabilityContractEntry = {
  category: string;
  summary: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  effect: "read" | "state-change";
  approval: "none" | "zotero-ui-required";
  exposure: Omit<
    HostBridgeCapabilityCatalogEntry,
    | "name"
    | "category"
    | "summary"
    | "inputSchema"
    | "outputSchema"
    | "requestEffect"
    | "approval"
    | "cliCommands"
  >;
};

type CommandTarget =
  | { kind: "local" }
  | {
      kind: "capability";
      capability: string;
      method: "POST";
      path: string;
    }
  | { kind: "dynamic-capability"; method: "POST"; path: string }
  | { kind: "endpoint"; method: "GET" | "POST"; path: string };

type CommandContractEntry = {
  target: CommandTarget;
  auxiliaryTargets?: CommandTarget[];
  approval: "none" | "zotero-ui-required" | "contract-selected";
  effect: "read" | "state-change" | "contract-selected";
};

const CLI_MANIFEST = "cli/zotero-bridge/Cargo.toml";

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

export function buildHostBridgeSurfaceCatalog(
  root = process.cwd(),
): HostBridgeSurfaceCatalog {
  const capabilityContract = loadHostBridgeCapabilityContracts(root) as {
    schema: string;
    capabilities: Record<string, CapabilityContractEntry>;
  };
  const commandContract = loadHostBridgeCommandContracts(root) as {
    schema: string;
    commands: Record<string, CommandContractEntry>;
  };

  const cliMappings: HostBridgeCliMapping[] = [];
  const endpointMappings: HostBridgeCliMapping[] = [];
  const cliByCapability = new Map<string, string[]>();
  for (const [command, entry] of Object.entries(commandContract.commands)) {
    for (const target of [entry.target, ...(entry.auxiliaryTargets || [])]) {
      if (target.kind === "capability") {
        const capability = capabilityContract.capabilities[target.capability];
        const mapping: HostBridgeCliMapping = {
          command,
          target: target.capability,
          kind: "capability",
          approval:
            entry.approval === "contract-selected"
              ? capability?.approval
              : entry.approval,
          dangerous: capability?.exposure.dangerous === true,
          cacheView: capability?.exposure.cacheView === true,
        };
        cliMappings.push(mapping);
        const commands = cliByCapability.get(mapping.target) || [];
        commands.push(command);
        cliByCapability.set(mapping.target, commands);
      } else if (target.kind === "dynamic-capability") {
        cliMappings.push({
          command,
          target: `${target.method} ${target.path}`,
          kind: "service",
        });
      } else if (target.kind === "endpoint") {
        endpointMappings.push({
          command,
          target: `${target.method} ${target.path}`,
          kind: "endpoint",
          ...(entry.approval === "none" ||
          entry.approval === "zotero-ui-required"
            ? { approval: entry.approval }
            : {}),
        });
      }
    }
  }

  const capabilities = Object.entries(capabilityContract.capabilities)
    .map(([name, entry]) => ({
      name,
      category: entry.category,
      summary: entry.summary,
      inputSchema: entry.inputSchema,
      outputSchema: entry.outputSchema,
      requestEffect: entry.effect,
      approval: entry.approval,
      ...entry.exposure,
      cliCommands: (cliByCapability.get(name) || []).sort(),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
  const cliInventory = loadHostBridgeCliInventory(root);
  return {
    capabilities,
    globalArguments: cliInventory.globalArguments,
    commandInventory: cliInventory.commands,
    cliMappings: cliMappings.sort((left, right) =>
      left.command.localeCompare(right.command),
    ),
    endpointMappings: endpointMappings.sort((left, right) =>
      left.command.localeCompare(right.command),
    ),
  };
}

export function validateHostBridgeSurfaceCatalog(
  catalog: HostBridgeSurfaceCatalog,
) {
  const errors: string[] = [];
  const capabilities = new Set(catalog.capabilities.map((entry) => entry.name));
  const inventory = new Set(
    catalog.commandInventory.map((entry) => entry.command),
  );
  const mapped = new Set(
    [...catalog.cliMappings, ...catalog.endpointMappings].map(
      (entry) => entry.command,
    ),
  );

  for (const mapping of catalog.cliMappings) {
    if (mapping.kind === "capability" && !capabilities.has(mapping.target)) {
      errors.push(
        `CLI command "${mapping.command}" maps missing capability ${mapping.target}`,
      );
    }
  }
  for (const mapping of [...catalog.cliMappings, ...catalog.endpointMappings]) {
    if (!inventory.has(mapping.command)) {
      errors.push(
        `command contract maps missing CLI leaf "${mapping.command}"`,
      );
    }
  }
  for (const command of inventory) {
    if (
      !mapped.has(command) &&
      ![
        "surface describe",
        "surface identity",
        "surface search",
        "workflow agent-bundle inspect",
        "workflow agent-result validate",
      ].includes(command)
    ) {
      errors.push(`remote CLI leaf "${command}" has no executable target`);
    }
  }
  for (const capability of catalog.capabilities) {
    if (
      capability.public &&
      !capability.rawOnly &&
      capability.cliCommands.length === 0
    ) {
      errors.push(
        `public capability ${capability.name} must have semantic CLI mapping or raw-only classification`,
      );
    }
  }
  return errors;
}
