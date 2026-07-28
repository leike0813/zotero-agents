export const HOST_BRIDGE_PROTOCOL = "host-bridge.v2" as const;
export const HOST_BRIDGE_AGENT_SURFACE_SCHEMA =
  "host-bridge.agent-surface.v6" as const;
export const HOST_BRIDGE_CLI_SCHEMA = "zotero-bridge.cli.v5" as const;
export const HOST_BRIDGE_SURFACE_IDENTITY_SCHEMA =
  "host-bridge.surface-identity.v6" as const;

export type HostBridgeStateChange = "unchanged" | "changed" | "unknown";
export type HostBridgeHandleConsumption = "unconsumed" | "consumed" | "unknown";

export const HOST_BRIDGE_HANDLE_KINDS = [
  "itemRef",
  "noteRef",
  "collectionKey",
  "workflowRunId",
  "submissionId",
  "queueId",
  "skillRunId",
  "agentRunId",
  "agentRequestId",
  "permissionRequestId",
  "eventId",
  "fileId",
  "productId",
  "operationId",
  "applyReceipt",
] as const;

export type HostBridgeHandleKind = (typeof HOST_BRIDGE_HANDLE_KINDS)[number];
