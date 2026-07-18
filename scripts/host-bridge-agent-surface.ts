import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  HostBridgeCliInventoryEntry,
  HostBridgeCliMapping,
  HostBridgeSurfaceCatalog,
} from "./host-bridge-surface-catalog";

export type HostBridgeAgentGuidance = {
  family: string;
  domain: string;
  operation: string;
  purpose: string;
  commandSpecific: true;
  intents: string[];
  useWhen: string[];
  avoidWhen: string[];
  distinguishFrom: string[];
  preconditions: string[];
  evidence: string[];
  failureChecks: string[];
  followups: string[];
  example: string;
};

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
  handle: string;
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

export type HostBridgeAgentCommand = {
  command: string;
  argv: string[];
  summary: string;
  category: "read" | "navigation" | "write" | "maintenance" | "debug";
  danger: "none" | "review" | "high";
  invocationSchema: Record<string, unknown>;
  argvBindings: HostBridgeArgvBinding[];
  payloadSchema: Record<string, unknown>;
  resultSchema: Record<string, unknown>;
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
  intents: string[];
  guidance: HostBridgeAgentGuidance;
  hiddenFromIntentSearch: boolean;
};

export type HostBridgeAgentSurfaceDescriptor = {
  schema: "host-bridge.agent-surface.v2";
  protocol: "host-bridge.v1";
  cliSchema: "zotero-bridge.cli.v2";
  commandCatalogChecksum: string;
  commands: HostBridgeAgentCommand[];
};

type GuidanceSource = {
  schema: "host-bridge.semantic-guidance.v2";
  families: Record<string, Omit<HostBridgeAgentGuidance, "family">>;
  commands: Record<
    string,
    Partial<Omit<HostBridgeAgentGuidance, "family" | "domain">>
  >;
  journeys: Array<{
    id: string;
    intent: string;
    commands: string[];
    evidence: string[];
  }>;
};

const GUIDANCE_SOURCE = "skills_src/host-bridge-shared/semantic/manifest.json";

const NAVIGATION_COMMANDS = new Set([
  "context selection open",
  "context item open",
  "context note open",
  "context collection open",
]);

const MAINTENANCE_COMMANDS = new Set([
  "synthesis cache invalidate",
  "synthesis graph refresh-metrics",
  "debug acp-skill-run reapply-result",
  "debug synthesis clean-install-reset",
]);

const STATE_CHANGING_COMMANDS = new Set([
  ...NAVIGATION_COMMANDS,
  ...MAINTENANCE_COMMANDS,
  "workflow submit",
  "workflow agent-run",
  "workflow agent-apply",
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
  handle: string,
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
  handle: string,
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
    produceHandle("workflowRunId"),
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
      condition: "Required to read persisted apply status; the read does not consume it.",
    }),
    produceHandle("applyReceipt"),
  ],
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

const CURSOR_ENDPOINTS = new Set([
  "library items list",
  "library snapshot",
  "library readiness audit",
  "library readiness missing-pdf",
  "library readiness missing-markdown",
  "library readiness missing-analysis",
  "product list",
  "run list",
  "run recent",
  "run workflow recent",
  "run skill recent",
  "run skill events",
  "run notification list",
  "run notification wait",
]);

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function readGuidance(root: string): GuidanceSource {
  const manifest = JSON.parse(
    readFileSync(join(root, GUIDANCE_SOURCE), "utf8"),
  ) as {
    schema: GuidanceSource["schema"];
    domains: string[];
    journeys: GuidanceSource["journeys"];
  };
  if (manifest.schema !== "host-bridge.semantic-guidance.v2") {
    throw new Error(`unexpected guidance schema: ${manifest.schema}`);
  }
  const families: GuidanceSource["families"] = {};
  const commands: GuidanceSource["commands"] = {};
  for (const file of manifest.domains) {
    const domain = JSON.parse(
      readFileSync(
        join(root, "skills_src/host-bridge-shared/semantic", file),
        "utf8",
      ),
    ) as {
      schema: string;
      families: GuidanceSource["families"];
      commands: GuidanceSource["commands"];
    };
    if (domain.schema !== "host-bridge.semantic-domain.v2") {
      throw new Error(`unexpected semantic domain schema in ${file}`);
    }
    for (const [family, guidance] of Object.entries(domain.families)) {
      if (families[family])
        throw new Error(`duplicate guidance family ${family}`);
      families[family] = guidance;
    }
    for (const [command, guidance] of Object.entries(domain.commands)) {
      if (commands[command])
        throw new Error(`duplicate command guidance ${command}`);
      commands[command] = guidance;
    }
  }
  return {
    schema: manifest.schema,
    families,
    commands,
    journeys: manifest.journeys,
  };
}

function commandFamily(command: string) {
  return command.split(" ")[0] || command;
}

function exampleValue(name: string) {
  if (name.includes("query") || name.includes("input")) return "'{}'";
  if (name.includes("selection")) return "'[]'";
  if (name.includes("output") || name.includes("path") || name === "file")
    return "'./output'";
  if (name === "command") return "'surface identity'";
  if (name === "intent") return "'inspect current selection'";
  return `'${name.replace(/_/g, "-")}'`;
}

function commandExample(inventory: HostBridgeCliInventoryEntry) {
  const argumentsText = inventory.arguments
    .filter((argument) => argument.required)
    .map((argument) => {
      const name = argument.long || argument.id;
      if (argument.position) return exampleValue(name);
      const option = argument.long
        ? `--${argument.long}`
        : argument.short
          ? `-${argument.short}`
          : undefined;
      if (!option) {
        throw new Error(`argument ${argument.id} has no argv binding`);
      }
      if (!argument.takesValue) return option;
      return `${option} ${exampleValue(name)}`;
    })
    .join(" ");
  return `zotero-bridge ${inventory.command}${argumentsText ? ` ${argumentsText}` : ""}`;
}

function effectiveGuidance(
  command: string,
  source: GuidanceSource,
  inventory: HostBridgeCliInventoryEntry,
  siblingCommands: string[],
): HostBridgeAgentGuidance {
  const family = commandFamily(command);
  const defaults = source.families[family];
  if (!defaults) throw new Error(`missing guidance family for ${command}`);
  const override = source.commands[command] || {};
  const guidance = {
    family,
    domain: defaults.domain,
    operation:
      override.operation ||
      defaults.operation ||
      command.split(" ").slice(0, 2).join(" "),
    purpose:
      override.purpose ||
      defaults.purpose ||
      inventory.about ||
      `Run ${command}`,
    commandSpecific: true as const,
    intents: unique([...(defaults.intents || []), ...(override.intents || [])]),
    useWhen: unique([
      `Use ${command} when the required operation is: ${inventory.about || command}.`,
      ...(defaults.useWhen || []),
      ...(override.useWhen || []),
    ]),
    avoidWhen: unique([
      `Do not use ${command} when the task needs a different sibling result, control plane, or freshness guarantee.`,
      ...(defaults.avoidWhen || []),
      ...(override.avoidWhen || []),
    ]),
    distinguishFrom: unique([
      ...(siblingCommands.filter((entry) => entry !== command).length
        ? siblingCommands
            .filter((entry) => entry !== command)
            .slice(0, 4)
            .map(
              (entry) =>
                `${entry}: choose it only when its narrower result matches the task.`,
            )
        : [
            "No semantic sibling exists; use surface search before falling back to a raw capability call.",
          ]),
      ...(defaults.distinguishFrom || []),
      ...(override.distinguishFrom || []),
    ]),
    preconditions: unique([
      command.startsWith("surface ")
        ? "No Zotero connection is required."
        : "Verify the exact CLI identity and a reachable Host Bridge before relying on live results.",
      ...(defaults.preconditions || []),
      ...(override.preconditions || []),
    ]),
    evidence: unique([
      `The structured ${command} result and the exact invocation inputs used to obtain it.`,
      ...(defaults.evidence || []),
      ...(override.evidence || []),
    ]),
    failureChecks: unique([
      "Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.",
      ...(defaults.failureChecks || []),
      ...(override.failureChecks || []),
    ]),
    followups: unique([
      ...(defaults.followups || []),
      ...(override.followups || []),
    ]),
    example: override.example || commandExample(inventory),
  };
  for (const field of [
    "intents",
    "useWhen",
    "avoidWhen",
    "distinguishFrom",
    "preconditions",
    "evidence",
    "failureChecks",
    "followups",
  ] as const) {
    if (guidance[field].length === 0) {
      throw new Error(`effective guidance for ${command} has no ${field}`);
    }
  }
  return guidance;
}

function invocationSchema(inventory: HostBridgeCliInventoryEntry) {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const argument of inventory.arguments) {
    const name = argument.long || argument.id;
    properties[name] = {
      type: argument.takesValue ? "string" : "boolean",
      ...(argument.help ? { description: argument.help } : {}),
      ...(argument.position ? { position: argument.position } : {}),
    };
    if (argument.required) required.push(name);
  }
  return {
    type: "object",
    properties,
    required,
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

const DECODED_PAYLOAD_FIELDS: Record<string, Record<string, unknown>> = {
  "library item search": {
    text: { type: "string" },
    limit: { type: "integer", minimum: 1, maximum: 100 },
  },
  "library items list": {
    collectionKey: { type: "string" },
    tag: { type: "string" },
    itemType: { type: "string" },
    query: { type: "string" },
    cursor: { type: ["string", "null"] },
    limit: { type: "integer", minimum: 1, maximum: 200 },
  },
  "library snapshot": {
    collectionKey: { type: "string" },
    collectionId: { type: ["integer", "string"] },
    tag: { type: "string" },
    itemType: { type: "string" },
    query: { type: "string" },
    cursor: { type: ["string", "null"] },
    limit: { type: "integer", minimum: 1, maximum: 200 },
  },
  "synthesis resolver resolve": {
    tag: { type: ["string", "array", "object"] },
    collection_key: { type: ["string", "array"] },
    paper_refs: { type: "array", items: { type: "string" } },
    combine: { enum: ["union", "intersection"], default: "union" },
  },
  "synthesis topic get-context": {
    topicId: { type: "string" },
    view: { enum: ["digest", "semantic", "audit", "full"] },
    outputPath: { type: "string" },
    output_path: { type: "string" },
    overwrite: { type: "boolean" },
  },
};

function payloadSchema(
  inventory: HostBridgeCliInventoryEntry,
  capabilities: HostBridgeSurfaceCatalog["capabilities"],
) {
  const decoded = DECODED_PAYLOAD_FIELDS[inventory.command];
  const backendProperties = Object.assign(
    {},
    ...capabilities.map((capability) => capability.inputProperties),
  ) as Record<string, unknown>;
  const structured = Object.keys(backendProperties).length
    ? backendProperties
    : decoded;
  if (structured) {
    return {
      type: "object",
      properties: structured,
      required: unique(
        capabilities.flatMap(
          (capability) => capability.inputRequiredProperties,
        ),
      ),
      additionalProperties: false,
    };
  }
  const properties = Object.fromEntries(
    inventory.arguments
      .filter((argument) => argument.takesValue)
      .map((argument) => [
        (argument.long || argument.id).replace(/-/g, "_"),
        { type: "string", description: argument.help || undefined },
      ]),
  );
  return {
    type: "object",
    properties,
    required: [],
    additionalProperties: false,
  };
}

function collectionField(command: string) {
  if (command === "product list") return "products";
  if (command.includes("notification")) return "events";
  if (command.includes("permission pending")) return "permissions";
  if (command.includes("workflow recent")) return "runs";
  if (command.includes("skill recent")) return "skillRuns";
  if (command.includes("skill events")) return "events";
  if (command.includes("topic list")) return "topics";
  if (command.includes("graph")) return "graph";
  if (command.includes("index")) return "entries";
  return "items";
}

function resultSchema(
  command: string,
  mappings: HostBridgeCliMapping[],
  pagination: HostBridgeAgentCommand["pagination"],
  handles: { consumes?: string[]; returns?: string[] },
) {
  const properties: Record<string, unknown> = {
    result: {
      type: "object",
      description: `Stable result from ${mappings.map((entry) => entry.target).join(", ")}.`,
    },
  };
  for (const handle of handles.returns || []) {
    properties[handle] = { type: "string" };
  }
  if (pagination === "cursor") {
    properties[collectionField(command)] = { type: "array" };
    properties.nextCursor = { type: ["string", "number", "null"] };
    properties.hasMore = { type: "boolean" };
  }
  if (pagination === "file") {
    properties.file = {
      type: "object",
      properties: {
        fileId: { type: "string" },
        path: { type: "string" },
        checksum: { type: "string" },
        bytes: { type: "integer" },
      },
      additionalProperties: true,
    };
    properties.delivery = {
      type: "object",
      description:
        "Local-file or registered remote-file delivery instructions. Follow mode instead of substituting a path for a fileId.",
      properties: {
        mode: { enum: ["local", "bridge-download", "bundle"] },
        path: { type: "string" },
        files: { type: "array", items: { type: "object" } },
        bundle: {
          type: "object",
          properties: {
            fileId: { type: "string" },
            displayName: { type: "string" },
            contentType: { type: "string" },
            size: { type: "integer" },
          },
          additionalProperties: true,
        },
        downloadCommand: { type: "string" },
        unpackHint: { type: "string" },
      },
      additionalProperties: false,
    };
  }
  return {
    type: "object",
    properties,
    additionalProperties: false,
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
        description: "Reads state without changing Host-owned data.",
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
  return [
    {
      kind,
      stateChanged: true,
      description: `May change ${kind.replace(/-/g, " ")} state.`,
    },
  ];
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
          "Inspect the structured error; do not enter the Host-owned run plane.",
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
          : "Inspect stateChanged and handleConsumed before repeating the operation.",
      nextCommand: command.startsWith("surface ")
        ? "surface identity"
        : "surface describe",
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

function paginationFor(command: string, catalog: HostBridgeSurfaceCatalog) {
  const mappings = [...catalog.cliMappings, ...catalog.endpointMappings].filter(
    (mapping) => mapping.command === command,
  );
  const capabilities = mappings
    .map((mapping) =>
      catalog.capabilities.find((entry) => entry.name === mapping.target),
    )
    .filter(Boolean);
  if (
    command.includes("download") ||
    capabilities.some((entry) => entry?.responseSizing === "file-output")
  )
    return "file" as const;
  if (
    CURSOR_ENDPOINTS.has(command) ||
    capabilities.some((entry) => entry?.responseSizing === "paged")
  )
    return "cursor" as const;
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
    .update(serializeStable(descriptor.commands))
    .digest("hex");
}

export function buildHostBridgeAgentSurfaceDescriptor(
  catalog: HostBridgeSurfaceCatalog,
  root = process.cwd(),
): HostBridgeAgentSurfaceDescriptor {
  const guidanceSource = readGuidance(root);
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
  ]) {
    byCommand.set(command, [
      {
        command,
        target: "embedded host-bridge.agent-surface.v2",
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
        mappings.some(
          (mapping) => mapping.approval === "zotero-ui-required",
        ) ||
        capabilities.some((entry) => entry?.approval === "zotero-ui-required")
          ? "zotero-ui-required"
          : "none";
      const category = categoryFor(inventory.command);
      const family = commandFamily(inventory.command);
      const siblingCommands = catalog.commandInventory
        .filter((entry) => commandFamily(entry.command) === family)
        .map((entry) => entry.command);
      const guidance = effectiveGuidance(
        inventory.command,
        guidanceSource,
        inventory,
        siblingCommands,
      );
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
      const pagination = paginationFor(inventory.command, catalog);
      const effects = effectsFor(inventory.command, category);
      const stateChanged = effects.some((effect) => effect.stateChanged);
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
        argvBindings: argvBindings(inventory),
        payloadSchema: payloadSchema(inventory, capabilities),
        resultSchema: resultSchema(
          inventory.command,
          mappings,
          pagination,
          handles,
        ),
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
                ? "Zotero UI approval for the described Host-owned effect."
                : "No Host Bridge UI approval; provider runtimes may still request their own permission.",
        },
        handleTransitions,
        recovery: recoveryFor(inventory.command, category, handles),
        targets: mappings.map((mapping) => ({
          kind: mapping.kind,
          target: mapping.target,
        })),
        intents: guidance.intents,
        guidance,
        hiddenFromIntentSearch:
          inventory.command.startsWith("debug ") ||
          inventory.command === "call",
      };
    },
  );

  for (const journey of guidanceSource.journeys) {
    for (const command of journey.commands) {
      if (!inventoryCommands.has(command))
        throw new Error(
          `guidance journey ${journey.id} names missing command ${command}`,
        );
    }
  }

  for (const command of Object.keys(guidanceSource.commands)) {
    if (!inventoryCommands.has(command)) {
      throw new Error(`orphan command guidance ${command}`);
    }
  }
  const descriptorByCommand = new Map(
    commands.map((command) => [command.command, command]),
  );
  for (const command of commands) {
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

  const descriptor = {
    schema: "host-bridge.agent-surface.v2",
    protocol: "host-bridge.v1",
    cliSchema: "zotero-bridge.cli.v2",
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
    schema: "host-bridge.surface-identity.v2" as const,
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
  const normalized = intent.trim().toLowerCase();
  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);
  const limit = Math.max(1, Math.min(options.limit || 10, 100));
  return descriptor.commands
    .filter(
      (command) => options.includeDebug || !command.hiddenFromIntentSearch,
    )
    .map((command) => {
      const fields = [
        command.command,
        command.summary,
        ...command.intents,
        ...command.guidance.useWhen,
      ];
      const phraseFields = fields.filter((field) =>
        field.toLowerCase().includes(normalized),
      );
      const tokenMatches = tokens.filter((token) =>
        fields.some((field) => field.toLowerCase().includes(token)),
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
