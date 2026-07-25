import { createHash } from "node:crypto";
import {
  HOST_BRIDGE_AGENT_SURFACE_SCHEMA,
  HOST_BRIDGE_CLI_SCHEMA,
  HOST_BRIDGE_HANDLE_KINDS,
  HOST_BRIDGE_PROTOCOL,
  HOST_BRIDGE_SURFACE_IDENTITY_SCHEMA,
} from "../src/shared/hostBridgeAgentContract";
import type { HostBridgeHandleKind } from "../src/shared/hostBridgeAgentContract";
import {
  loadHostBridgeCommandContracts,
  type HostBridgeCommandInputContract,
  type HostBridgeCommandOutputBoundary,
} from "./host-bridge-command-contracts";
import type {
  HostBridgeCliInventoryEntry,
  HostBridgeCliMapping,
  HostBridgeSurfaceCatalog,
} from "./host-bridge-surface-catalog";

export type HostBridgeAgentEffect = {
  kind:
    | "none"
    | "ui-navigation"
    | "ephemeral-file"
    | "workflow-control"
    | "zotero-library"
    | "product-store"
    | "cache-maintenance"
    | "graph-metrics-maintenance"
    | "debug-repair";
  stateChanged: boolean;
  description: string;
};

export type HostBridgeAgentHandleTransition = {
  handle: HostBridgeHandleKind;
  direction: "consume" | "produce";
  required: boolean;
  condition: string;
  lifetime: "caller-owned" | "response" | "short-lived" | "one-shot";
};

export type HostBridgeAgentRecovery = {
  when: string;
  stateCheck: "none" | "command-result" | "caller-held-handle";
  requiresHandles: string[];
  action: string;
  nextCommand?: string;
};

export type HostBridgeArgvBinding = {
  property: string;
  kind: "option" | "positional";
  token: string;
  position?: number;
  shortToken?: string;
  takesValue: boolean;
  required: boolean;
  valueNames: string[];
};

export type HostBridgeAgentArgument = {
  id: string;
  kind: "option" | "positional";
  token: string;
  position?: number;
  shortToken?: string;
  takesValue: boolean;
  required: boolean;
  global: boolean;
  help: string;
  longHelp?: string;
  valueNames: string[];
  possibleValues: string[];
  conflictsWith: string[];
  repeatable: boolean;
  numArgs?: string;
  env?: string;
  aliases: string[];
  defaultValues: string[];
};

export type HostBridgeAgentCommand = {
  command: string;
  argv: string[];
  summary: string;
  category: "read" | "navigation" | "write" | "maintenance" | "debug";
  danger: "none" | "review" | "high";
  invocationSchema: Record<string, unknown>;
  arguments: HostBridgeAgentArgument[];
  argvBindings: HostBridgeArgvBinding[];
  inputSchemas: Record<string, HostBridgeCommandInputContract>;
  payloadSchema: Record<string, unknown>;
  resultSchema: Record<string, unknown>;
  outputBoundary: HostBridgeCommandOutputBoundary;
  pagination: "none" | "cursor" | "file";
  effects: HostBridgeAgentEffect[];
  approvalContract: {
    kind: "none" | "zotero-ui-required" | "conditional";
    timing: "none" | "before-command" | "during-execution" | "apply-back";
    scope: string;
  };
  handleTransitions: HostBridgeAgentHandleTransition[];
  recovery: HostBridgeAgentRecovery[];
  targets: Array<{ kind: string; target: string }>;
  operationalAliases: string[];
  hiddenFromIntentSearch: boolean;
};

export type HostBridgeAgentSurfaceDescriptor = {
  schema: "host-bridge.agent-surface.v5";
  protocol: "host-bridge.v1";
  cliSchema: "zotero-bridge.cli.v4";
  commandCatalogChecksum: string;
  globalOptions: HostBridgeAgentArgument[];
  commands: HostBridgeAgentCommand[];
};

const NAVIGATION_COMMANDS = new Set([
  "context selection open",
  "context item open",
  "context note open",
  "context collection open",
]);

const MAINTENANCE_COMMANDS = new Set([
  "synthesis cache invalidate",
  "synthesis cache refresh-reference-sidecar",
  "synthesis graph update",
  "synthesis graph refresh-metrics",
  "debug acp-skill-run reapply-result",
  "debug synthesis clean-install-reset",
]);

const STATE_CHANGING_COMMANDS = new Set([
  ...NAVIGATION_COMMANDS,
  ...MAINTENANCE_COMMANDS,
  "workflow submit",
  "workflow queue cancel",
  "workflow agent-run",
  "workflow agent-apply",
  "workflow agent-renew",
  "workflow agent-abandon",
  "run cancel",
  "run skill reply",
  "run skill connect",
  "run notification ack",
  "file upload",
  "product remove",
  "mutation apply",
  "mutation literature-ingest",
  "mutation tag add",
  "mutation tag remove",
  "mutation collection create",
  "mutation collection add-items",
  "mutation collection remove-items",
  "mutation item update",
  "mutation item attach-file",
  "mutation note create",
  "mutation note update",
  "mutation note upsert-payload",
]);

function consumeHandle(
  handle: HostBridgeHandleKind,
  options: Partial<
    Pick<HostBridgeAgentHandleTransition, "required" | "condition" | "lifetime">
  > = {},
): HostBridgeAgentHandleTransition {
  return {
    handle,
    direction: "consume",
    required: options.required ?? true,
    condition: options.condition || "Required by the command invocation.",
    lifetime: options.lifetime || "caller-owned",
  };
}

function produceHandle(
  handle: HostBridgeHandleKind,
  lifetime: HostBridgeAgentHandleTransition["lifetime"] = "response",
): HostBridgeAgentHandleTransition {
  return {
    handle,
    direction: "produce",
    required: false,
    condition: "Returned when the corresponding operation succeeds.",
    lifetime,
  };
}

const OPTIONAL_SELECTION_HANDLE = {
  required: false,
  condition:
    "Required only for an explicit --selection input; --none carries no itemRef.",
} as const;

const COMMAND_HANDLE_TRANSITIONS: Record<
  string,
  HostBridgeAgentHandleTransition[]
> = {
  "context selection get": [produceHandle("itemRef")],
  "context selection open": [consumeHandle("itemRef")],
  "context item open": [consumeHandle("itemRef")],
  "context note open": [consumeHandle("noteRef")],
  "context collection open": [consumeHandle("collectionKey")],
  "workflow submit": [
    consumeHandle("itemRef", OPTIONAL_SELECTION_HANDLE),
    {
      ...produceHandle("workflowRunId"),
      condition: "Returned when direct admission starts workflow jobs.",
    },
    {
      ...produceHandle("submissionId"),
      condition:
        "Returned when ACP or SkillRunner units enter the Zotero-managed Host queue.",
    },
  ],
  "workflow queue list": [
    produceHandle("queueId"),
    produceHandle("submissionId"),
  ],
  "workflow queue cancel": [
    consumeHandle("queueId", {
      condition:
        "Required to cancel one unit that is still pending in the native Host queue.",
    }),
  ],
  "workflow submission get": [
    consumeHandle("submissionId", {
      condition:
        "Required to inspect one active pending/admitted Host submission.",
    }),
  ],
  "workflow agent-run": [
    consumeHandle("itemRef", OPTIONAL_SELECTION_HANDLE),
    produceHandle("agentRunId", "one-shot"),
    produceHandle("agentRequestId"),
    produceHandle("fileId", "short-lived"),
  ],
  "workflow agent-apply": [
    consumeHandle("agentRunId", { lifetime: "one-shot" }),
    consumeHandle("agentRequestId"),
    produceHandle("applyReceipt"),
  ],
  "workflow agent-apply-status": [
    consumeHandle("agentRunId", {
      condition:
        "Required to read persisted apply status; the read does not consume it.",
    }),
    produceHandle("applyReceipt"),
  ],
  "workflow agent-renew": [consumeHandle("agentRunId")],
  "workflow agent-abandon": [
    consumeHandle("agentRunId", { lifetime: "one-shot" }),
  ],
  "operation get": [consumeHandle("operationId")],
  "run get": [consumeHandle("workflowRunId"), produceHandle("skillRunId")],
  "run cancel": [consumeHandle("workflowRunId")],
  "run permission get": [consumeHandle("permissionRequestId")],
  "run skill get": [consumeHandle("skillRunId")],
  "run skill reply": [consumeHandle("skillRunId")],
  "run skill connect": [consumeHandle("skillRunId")],
  "run notification ack": [consumeHandle("eventId")],
  "file upload": [produceHandle("fileId", "short-lived")],
  "file download": [consumeHandle("fileId")],
  "mutation item attach-file": [
    consumeHandle("itemRef"),
    consumeHandle("fileId"),
  ],
  "product get": [consumeHandle("productId"), produceHandle("productId")],
  "product download": [
    consumeHandle("productId"),
    produceHandle("fileId", "short-lived"),
  ],
  "product remove": [consumeHandle("productId")],
};

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function invocationSchema(inventory: HostBridgeCliInventoryEntry) {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  const propertyById = new Map<string, string>();
  for (const argument of inventory.arguments) {
    const name = argument.long || argument.id;
    propertyById.set(argument.id, name);
    properties[name] = {
      type: argument.repeatable
        ? "array"
        : argument.takesValue
          ? "string"
          : "boolean",
      ...(argument.repeatable
        ? { items: { type: argument.takesValue ? "string" : "boolean" } }
        : {}),
      ...(argument.help ? { description: argument.help } : {}),
      ...(argument.position ? { position: argument.position } : {}),
    };
    if (argument.required) required.push(name);
  }
  const allOf: Record<string, unknown>[] = [];
  const conflictPairs = new Set<string>();
  for (const argument of inventory.arguments) {
    const left = propertyById.get(argument.id);
    if (!left) continue;
    for (const conflictId of argument.conflictsWith || []) {
      const right = propertyById.get(conflictId);
      if (!right) continue;
      const pair = [left, right].sort().join("\n");
      if (conflictPairs.has(pair)) continue;
      conflictPairs.add(pair);
      allOf.push({ not: { required: [left, right] } });
    }
  }
  for (const group of inventory.argumentGroups || []) {
    const members = group.arguments
      .map((id) => propertyById.get(id))
      .filter((value): value is string => !!value);
    if (group.required && members.length > 0) {
      allOf.push({ oneOf: members.map((member) => ({ required: [member] })) });
    }
  }
  return {
    type: "object",
    properties,
    required,
    ...(allOf.length ? { allOf } : {}),
    additionalProperties: false,
  };
}

function argvBindings(
  inventory: HostBridgeCliInventoryEntry,
): HostBridgeArgvBinding[] {
  return inventory.arguments.map((argument) => {
    const property = argument.long || argument.id;
    if (argument.position) {
      return {
        property,
        kind: "positional",
        token: argument.valueNames[0] || argument.id.toUpperCase(),
        position: argument.position,
        takesValue: argument.takesValue,
        required: argument.required,
        valueNames: argument.valueNames,
      };
    }
    const token = argument.long
      ? `--${argument.long}`
      : argument.short
        ? `-${argument.short}`
        : undefined;
    if (!token) {
      throw new Error(`argument ${argument.id} has no argv binding`);
    }
    return {
      property,
      kind: "option",
      token,
      ...(argument.short && argument.long
        ? { shortToken: `-${argument.short}` }
        : {}),
      takesValue: argument.takesValue,
      required: argument.required,
      valueNames: argument.valueNames,
    };
  });
}

function agentArgument(
  argument: HostBridgeCliInventoryEntry["arguments"][number],
): HostBridgeAgentArgument {
  const positional = Boolean(argument.position);
  const token = positional
    ? argument.valueNames[0] || argument.id.toUpperCase()
    : argument.long
      ? `--${argument.long}`
      : argument.short
        ? `-${argument.short}`
        : argument.id;
  return {
    id: argument.id,
    kind: positional ? "positional" : "option",
    token,
    ...(argument.position ? { position: argument.position } : {}),
    ...(argument.short && argument.long
      ? { shortToken: `-${argument.short}` }
      : {}),
    takesValue: argument.takesValue,
    required: argument.required,
    global: argument.global,
    help: argument.help?.trim() || argument.id,
    ...(argument.longHelp?.trim()
      ? { longHelp: argument.longHelp.trim() }
      : {}),
    valueNames: argument.valueNames,
    possibleValues: argument.possibleValues,
    conflictsWith: argument.conflictsWith,
    repeatable: argument.repeatable,
    ...(argument.numArgs ? { numArgs: argument.numArgs } : {}),
    ...(argument.env ? { env: argument.env } : {}),
    aliases: argument.aliases,
    defaultValues: argument.defaultValues,
  };
}

function effectsFor(
  command: string,
  category: HostBridgeAgentCommand["category"],
): HostBridgeAgentEffect[] {
  if (!STATE_CHANGING_COMMANDS.has(command)) {
    return [
      {
        kind: "none",
        stateChanged: false,
        description: "Reads state without changing Zotero-managed data.",
      },
    ];
  }
  const kind: HostBridgeAgentEffect["kind"] = NAVIGATION_COMMANDS.has(command)
    ? "ui-navigation"
    : command.startsWith("file ")
      ? "ephemeral-file"
      : command.startsWith("workflow ") || command.startsWith("run ")
        ? "workflow-control"
        : command.startsWith("product ")
          ? "product-store"
          : command.includes("refresh-metrics")
            ? "graph-metrics-maintenance"
            : command.includes("cache")
              ? "cache-maintenance"
              : command.startsWith("debug ")
                ? "debug-repair"
                : "zotero-library";
  const effects: HostBridgeAgentEffect[] = [
    {
      kind,
      stateChanged: true,
      description: `May change ${kind.replace(/-/g, " ")} state.`,
    },
  ];
  if (command === "workflow agent-apply") {
    effects.push({
      kind: "zotero-library",
      stateChanged: true,
      description: "May apply finalized Agent results to the Zotero library.",
    });
  }
  return effects;
}

function recoveryFor(
  command: string,
  category: HostBridgeAgentCommand["category"],
  handles: { consumes?: string[]; returns?: string[] },
): HostBridgeAgentRecovery[] {
  if (command === "workflow agent-run") {
    return [
      {
        when: "Handoff preparation fails or its response is uncertain.",
        stateCheck: "command-result",
        requiresHandles: [],
        action:
          "Inspect the structured error; do not enter the Zotero-managed run plane.",
        nextCommand: "workflow describe",
      },
    ];
  }
  if (command === "workflow agent-apply") {
    return [
      {
        when: "Apply-back fails after preflight or may have partially written results.",
        stateCheck: "caller-held-handle",
        requiresHandles: ["agentRunId"],
        action:
          "Read the persisted per-request apply receipt before retrying any result.",
        nextCommand: "workflow agent-apply-status",
      },
    ];
  }
  if (command === "workflow submit") {
    return [
      {
        when: "The response reports host-queue admission or queued progress is uncertain.",
        stateCheck: "caller-held-handle",
        requiresHandles: ["submissionId"],
        action:
          "Inspect the active native submission without inventing a workflow run id.",
        nextCommand: "workflow submission get",
      },
      {
        when: "The response reports direct admission and run progress is uncertain.",
        stateCheck: "caller-held-handle",
        requiresHandles: ["workflowRunId"],
        action:
          "Inspect the returned workflow run before repeating submission.",
        nextCommand: "run get",
      },
    ];
  }
  if (command === "workflow queue cancel") {
    return [
      {
        when: "Cancellation fails or races with admission.",
        stateCheck: "caller-held-handle",
        requiresHandles: ["queueId"],
        action:
          "List the native queue again. Absence means the unit was admitted, canceled, or settled; inspect its submission and tasks before taking further action.",
        nextCommand: "workflow queue list",
      },
    ];
  }
  const produced = handles.returns || [];
  return [
    {
      when:
        category === "read"
          ? "The read fails or returns incomplete evidence."
          : "The operation fails or completion is uncertain.",
      stateCheck: produced.length ? "command-result" : "none",
      requiresHandles: [],
      action:
        category === "read"
          ? "Inspect the error and retry only when retryable is true."
          : "Inspect stateChange and handleConsumption before repeating the operation.",
      ...(command.startsWith("surface ")
        ? {}
        : { nextCommand: "surface describe" }),
    },
  ];
}

function categoryFor(command: string): HostBridgeAgentCommand["category"] {
  if (MAINTENANCE_COMMANDS.has(command)) return "maintenance";
  if (command.startsWith("debug ") || command === "call") return "debug";
  if (NAVIGATION_COMMANDS.has(command)) return "navigation";
  if (STATE_CHANGING_COMMANDS.has(command)) return "write";
  return "read";
}

function paginationFor(boundary: HostBridgeCommandOutputBoundary) {
  if (boundary.strategy === "cursor" || boundary.strategy === "offset") {
    return "cursor" as const;
  }
  if (boundary.strategy === "file") return "file" as const;
  return "none" as const;
}

function serializeStable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(serializeStable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${serializeStable(entry)}`)
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
    .update(
      serializeStable({
        globalOptions: descriptor.globalOptions,
        commands: descriptor.commands,
      }),
    )
    .digest("hex");
}

function operationalAliases(inventory: HostBridgeCliInventoryEntry) {
  return unique([
    inventory.command,
    ...inventory.argv,
    ...inventory.arguments.flatMap((argument) => [
      argument.id,
      argument.long || "",
      argument.short || "",
      ...argument.valueNames,
    ]),
  ]);
}

export function buildHostBridgeAgentSurfaceDescriptor(
  catalog: HostBridgeSurfaceCatalog,
  _root = process.cwd(),
): HostBridgeAgentSurfaceDescriptor {
  const registry = loadHostBridgeCommandContracts();
  const byCommand = new Map<string, HostBridgeCliMapping[]>();
  for (const mapping of [...catalog.cliMappings, ...catalog.endpointMappings]) {
    const entries = byCommand.get(mapping.command) || [];
    if (
      !entries.some(
        (entry) =>
          entry.kind === mapping.kind && entry.target === mapping.target,
      )
    )
      entries.push(mapping);
    byCommand.set(mapping.command, entries);
  }
  for (const command of [
    "surface identity",
    "surface describe",
    "surface search",
    "workflow agent-bundle inspect",
    "workflow agent-result validate",
  ]) {
    byCommand.set(command, [
      {
        command,
        target: "embedded host-bridge.agent-surface.v5",
        kind: "service",
      },
    ]);
  }

  const inventoryCommands = new Set(
    catalog.commandInventory.map((entry) => entry.command),
  );
  const boundCommands = new Set(byCommand.keys());
  const missing = [...inventoryCommands].filter(
    (command) => !boundCommands.has(command),
  );
  const orphan = [...boundCommands].filter(
    (command) => !inventoryCommands.has(command),
  );
  if (missing.length || orphan.length) {
    throw new Error(
      `Agent Surface binding mismatch; missing=[${missing.join(", ")}], orphan=[${orphan.join(", ")}]`,
    );
  }

  const contractCommands = new Set(Object.keys(registry.commands));
  const missingContracts = [...inventoryCommands].filter(
    (command) => !contractCommands.has(command),
  );
  const orphanContracts = [...contractCommands].filter(
    (command) => !inventoryCommands.has(command),
  );
  if (missingContracts.length || orphanContracts.length) {
    throw new Error(
      `Command-contract mismatch; missing=[${missingContracts.join(", ")}], orphan=[${orphanContracts.join(", ")}]`,
    );
  }

  const commands = catalog.commandInventory.map(
    (inventory): HostBridgeAgentCommand => {
      const mappings = byCommand.get(inventory.command)!;
      const capabilities = mappings
        .map((mapping) =>
          catalog.capabilities.find((entry) => entry.name === mapping.target),
        )
        .filter(
          (entry): entry is HostBridgeSurfaceCatalog["capabilities"][number] =>
            Boolean(entry),
        );
      const approval =
        mappings.some((mapping) => mapping.approval === "zotero-ui-required") ||
        capabilities.some((entry) => entry?.approval === "zotero-ui-required")
          ? "zotero-ui-required"
          : "none";
      const category = categoryFor(inventory.command);
      const handleTransitions =
        COMMAND_HANDLE_TRANSITIONS[inventory.command] || [];
      const handles = {
        consumes: handleTransitions
          .filter((transition) => transition.direction === "consume")
          .map((transition) => transition.handle),
        returns: handleTransitions
          .filter((transition) => transition.direction === "produce")
          .map((transition) => transition.handle),
      };
      const effects = effectsFor(inventory.command, category);
      const stateChanged = effects.some((effect) => effect.stateChanged);
      const contract = registry.commands[inventory.command];
      const pagination = paginationFor(contract.outputBoundary);
      for (const [argumentId, input] of Object.entries(contract.inputs)) {
        const argument = inventory.arguments.find(
          (candidate) => candidate.id === argumentId,
        );
        if (!argument) {
          throw new Error(
            `${inventory.command} contract names missing argument ${argumentId}`,
          );
        }
        const token = argument.long ? `--${argument.long}` : argument.id;
        if (input.token !== token || input.required !== argument.required) {
          throw new Error(
            `${inventory.command} contract metadata differs for ${argumentId}`,
          );
        }
      }
      return {
        command: inventory.command,
        argv: inventory.argv,
        summary: inventory.about || `${inventory.command} command`,
        category,
        danger: mappings.some((mapping) => mapping.dangerous)
          ? "high"
          : approval === "zotero-ui-required" || stateChanged
            ? "review"
            : "none",
        invocationSchema: invocationSchema(inventory),
        arguments: inventory.arguments.map(agentArgument),
        argvBindings: argvBindings(inventory),
        inputSchemas: contract.inputs,
        payloadSchema: contract.payloadSchema,
        resultSchema: contract.resultSchema,
        outputBoundary: contract.outputBoundary,
        pagination,
        effects,
        approvalContract: {
          kind:
            inventory.command === "workflow agent-apply"
              ? "conditional"
              : approval,
          timing:
            inventory.command === "workflow agent-apply"
              ? "apply-back"
              : approval === "zotero-ui-required"
                ? "before-command"
                : "none",
          scope:
            inventory.command === "workflow agent-apply"
              ? "Each result request is preflighted before any approval or handle consumption."
              : approval === "zotero-ui-required"
                ? "Zotero UI approval for the described Zotero-managed effect."
                : "No Zotero UI approval; provider runtimes may still request their own permission.",
        },
        handleTransitions,
        recovery: recoveryFor(inventory.command, category, handles),
        targets: mappings.map((mapping) => ({
          kind: mapping.kind,
          target: mapping.target,
        })),
        operationalAliases: operationalAliases(inventory),
        hiddenFromIntentSearch:
          inventory.command.startsWith("debug ") ||
          inventory.command === "call",
      };
    },
  );

  const descriptorByCommand = new Map(
    commands.map((command) => [command.command, command]),
  );
  for (const command of commands) {
    for (const transition of command.handleTransitions) {
      if (!HOST_BRIDGE_HANDLE_KINDS.includes(transition.handle)) {
        throw new Error(
          `${command.command} names unsupported handle ${transition.handle}`,
        );
      }
    }
    const produced = new Set(
      command.handleTransitions
        .filter((transition) => transition.direction === "produce")
        .map((transition) => transition.handle),
    );
    for (const recovery of command.recovery) {
      if (
        recovery.nextCommand &&
        !descriptorByCommand.has(recovery.nextCommand)
      ) {
        throw new Error(
          `${command.command} recovery names missing command ${recovery.nextCommand}`,
        );
      }
      if (
        recovery.stateCheck !== "caller-held-handle" &&
        recovery.requiresHandles.some((handle) => !produced.has(handle))
      ) {
        throw new Error(
          `${command.command} recovery requires an unavailable produced handle`,
        );
      }
    }
  }

  const globalOptions = catalog.globalArguments
    .map(agentArgument)
    .sort((left, right) => left.token.localeCompare(right.token));
  const descriptor = {
    schema: HOST_BRIDGE_AGENT_SURFACE_SCHEMA,
    protocol: HOST_BRIDGE_PROTOCOL,
    cliSchema: HOST_BRIDGE_CLI_SCHEMA,
    commandCatalogChecksum: "",
    globalOptions,
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
    schema: HOST_BRIDGE_SURFACE_IDENTITY_SCHEMA,
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
  options: { limit?: number; includeDebug?: boolean } = {},
) {
  const normalized = intent.trim().normalize("NFKC").toLowerCase();
  const tokens = normalized.match(/[\p{L}\p{N}]+/gu) || [];
  const limit = Math.max(1, Math.min(options.limit || 10, 100));
  return descriptor.commands
    .filter(
      (command) => options.includeDebug || !command.hiddenFromIntentSearch,
    )
    .map((command) => {
      const fields = [
        command.command,
        command.summary,
        ...command.operationalAliases,
      ];
      const phraseFields = fields.filter((field) =>
        field.normalize("NFKC").toLowerCase().includes(normalized),
      );
      const tokenMatches = tokens.filter((token) =>
        fields.some((field) =>
          field.normalize("NFKC").toLowerCase().includes(token),
        ),
      );
      const score = (phraseFields.length ? 100 : 0) + tokenMatches.length;
      const matchReasons = unique([
        ...(phraseFields.length ? [`phrase:${normalized}`] : []),
        ...tokenMatches.map((token) => `token:${token}`),
      ]);
      return { command, score, matchReasons };
    })
    .filter((entry) => entry.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.command.command.localeCompare(right.command.command),
    )
    .slice(0, limit)
    .map(({ command, matchReasons }) => ({ command, matchReasons }));
}
