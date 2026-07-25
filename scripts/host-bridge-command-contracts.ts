import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type HostBridgeCommandExample = {
  kind: "shape-only" | "executable";
  value: unknown;
  prerequisites: string[];
  description?: string;
};

export type HostBridgeCommandInputContract = {
  token: string;
  required: boolean;
  requiredWhen: string[];
  schema: Record<string, unknown>;
  examples: HostBridgeCommandExample[];
};

export type HostBridgeCommandContract = {
  inputs: Record<string, HostBridgeCommandInputContract>;
  payloadSchema: Record<string, unknown>;
  resultSchema: Record<string, unknown>;
};

export type HostBridgeCommandContractRegistry = {
  schema: "zotero-bridge.command-contracts.v1";
  commands: Record<string, HostBridgeCommandContract>;
};

export function loadHostBridgeCommandContracts(
  root = process.cwd(),
): HostBridgeCommandContractRegistry {
  const registry = JSON.parse(
    readFileSync(
      resolve(root, "schemas/host-bridge-cli-command-contracts.v1.json"),
      "utf8",
    ),
  ) as HostBridgeCommandContractRegistry;
  if (registry.schema !== "zotero-bridge.command-contracts.v1") {
    throw new Error(`unexpected command-contract schema: ${registry.schema}`);
  }
  return registry;
}
