import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join } from "node:path";
import {
  HOST_BRIDGE_AGENT_SURFACE_SCHEMA,
  HOST_BRIDGE_CLI_SCHEMA,
  HOST_BRIDGE_PROTOCOL,
  HOST_BRIDGE_SURFACE_IDENTITY_SCHEMA,
} from "../src/shared/hostBridgeAgentContract";
import type { HostBridgeHandleKind } from "../src/shared/hostBridgeAgentContract";
import type {
  HostBridgeCommandComposition,
  HostBridgeCommandOutputBoundary,
  HostBridgeResolvedCommandInputContract,
} from "./host-bridge-command-contracts";

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
  binding: "passthrough" | "overlay" | "object" | "none" | "raw";
  composition: HostBridgeCommandComposition | null;
  invocationSchema: Record<string, any>;
  arguments: HostBridgeAgentArgument[];
  argvBindings: HostBridgeArgvBinding[];
  inputSchemas: Record<string, HostBridgeResolvedCommandInputContract>;
  payloadSchema: Record<string, any>;
  resultSchema: Record<string, any>;
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
  targets: Array<{
    kind: "capability" | "endpoint" | "service";
    target: string;
  }>;
  operationalAliases: string[];
  hiddenFromIntentSearch: boolean;
};

export type HostBridgeAgentSurfaceDescriptor = {
  schema: typeof HOST_BRIDGE_AGENT_SURFACE_SCHEMA;
  protocol: typeof HOST_BRIDGE_PROTOCOL;
  cliSchema: typeof HOST_BRIDGE_CLI_SCHEMA;
  commandCatalogChecksum: string;
  globalOptions: HostBridgeAgentArgument[];
  commands: HostBridgeAgentCommand[];
};

function assertDescriptor(
  value: unknown,
): asserts value is HostBridgeAgentSurfaceDescriptor {
  const descriptor = value as Partial<HostBridgeAgentSurfaceDescriptor>;
  if (
    descriptor?.schema !== HOST_BRIDGE_AGENT_SURFACE_SCHEMA ||
    descriptor.protocol !== HOST_BRIDGE_PROTOCOL ||
    descriptor.cliSchema !== HOST_BRIDGE_CLI_SCHEMA ||
    !Array.isArray(descriptor.globalOptions) ||
    !Array.isArray(descriptor.commands) ||
    descriptor.commands.length === 0 ||
    !/^[a-f0-9]{64}$/.test(descriptor.commandCatalogChecksum || "")
  ) {
    throw new Error("Rust CLI returned an invalid Agent Surface descriptor");
  }
}

/**
 * The production CLI owns parser introspection and contract composition. Node
 * only invokes the Rust exporter so rendered Skill packages use exactly the
 * same descriptor as `zotero-bridge surface`.
 */
export function buildHostBridgeAgentSurfaceDescriptor(
  _catalog?: unknown,
  root = process.cwd(),
): HostBridgeAgentSurfaceDescriptor {
  const output = execFileSync(
    "cargo",
    [
      "run",
      "--quiet",
      "--manifest-path",
      join(root, "cli/zotero-bridge/Cargo.toml"),
      "--example",
      "export-agent-surface",
    ],
    {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const descriptor: unknown = JSON.parse(output);
  assertDescriptor(descriptor);
  return descriptor;
}

export function serializeHostBridgeAgentSurface(
  descriptor: HostBridgeAgentSurfaceDescriptor,
) {
  return `${JSON.stringify(descriptor, null, 2)}\n`;
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

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
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
