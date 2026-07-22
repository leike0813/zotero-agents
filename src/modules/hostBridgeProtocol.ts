import {
  HOST_BRIDGE_CLI_SCHEMA,
  type HostBridgeHandleConsumption,
  HOST_BRIDGE_PROTOCOL,
  type HostBridgeStateChange,
} from "../shared/hostBridgeAgentContract";

export const HOST_BRIDGE_PROTOCOL_VERSION = HOST_BRIDGE_PROTOCOL;
export { HOST_BRIDGE_CLI_SCHEMA };

export type HostBridgeResponse<T = unknown> =
  | {
      status: "ok";
      id?: string;
      result: T;
    }
  | {
      status: "error";
      id?: string;
      error: HostBridgeError;
    };

export type HostBridgeErrorCategory =
  | "auth"
  | "capability"
  | "config"
  | "connection"
  | "internal"
  | "not_found"
  | "permission"
  | "protocol"
  | "routing"
  | "validation"
  | "workflow";

export type HostBridgeErrorCode =
  | "bad_request"
  | "bridge_unavailable"
  | "capability_failed"
  | "capability_not_found"
  | "approval_required"
  | "backend_not_found"
  | "download_failed"
  | "file_handle_expired"
  | "file_not_found"
  | "file_unavailable"
  | "collection_not_found"
  | "context_navigation_failed"
  | "invalid_capability_input"
  | "synthesis_maintenance_idempotency_conflict"
  | "invalid_library_cursor"
  | "invalid_file_id"
  | "invalid_object_ref"
  | "invalid_request_body"
  | "invalid_skill_run_id"
  | "invalid_workflow_agent_run_request"
  | "invalid_agent_run_apply_request"
  | "agent_run_not_found"
  | "agent_run_expired"
  | "agent_run_already_consumed"
  | "agent_run_lifecycle_conflict"
  | "invalid_operation_id"
  | "operation_id_required"
  | "idempotency_conflict"
  | "operation_not_found"
  | "unknown_request"
  | "invalid_bundle"
  | "apply_not_allowed"
  | "invalid_workflow_describe_request"
  | "invalid_workflow_validate_request"
  | "invalid_workflow_input"
  | "missing_required_workflow_parameter"
  | "invalid_workflow_submit_request"
  | "invalid_provider_profile_request"
  | "invalid_provider_profile"
  | "provider_profile_backend_not_found"
  | "provider_profile_backend_unready"
  | "provider_profile_provider_unavailable"
  | "provider_profile_option_unknown"
  | "provider_profile_option_invalid"
  | "provider_profile_option_unavailable"
  | "workflow_provider_incompatible"
  | "item_not_found"
  | "internal_error"
  | "method_not_allowed"
  | "navigation_unavailable"
  | "note_not_found"
  | "not_found"
  | "permission_denied"
  | "permission_timeout"
  | "permission_ui_unavailable"
  | "permission_request_not_found"
  | "request_body_too_large"
  | "unsupported_cache_scope"
  | "upload_empty"
  | "upload_failed"
  | "upload_too_large"
  | "unauthorized"
  | "workflow_not_found"
  | "workflow_run_not_found"
  | "skill_run_not_found"
  | "skill_run_not_waiting"
  | "skill_run_not_recoverable"
  | "unsupported_interaction_backend"
  | "workflow_submit_failed"
  | "workflow_submit_requires_approval"
  | "workflow_product_not_found"
  | "workflow_product_asset_not_found"
  | "workflow_product_store_migration_incomplete"
  | "workflow_product_export_path_too_long"
  | "workflow_product_export_failed";

export type HostBridgeError = {
  code: HostBridgeErrorCode;
  message: string;
  category: HostBridgeErrorCategory;
  details?: Record<string, unknown>;
  retryable: boolean;
  stateChange: HostBridgeStateChange;
  handleConsumption: HostBridgeHandleConsumption;
  safeNextActions: string[];
  nextCommand?: string;
};

export type HostBridgeBindMode = "loopback" | "lan";

export type HostBridgeConnectionMode = "local" | "remote";

export type HostBridgeServiceStatus =
  | "idle"
  | "starting"
  | "running"
  | "error"
  | "stopped";

export type HostBridgePortMode = "random" | "pinned" | "fallback";

export type HostBridgeAdvertisedHostSource = "manual" | "auto" | "placeholder";

export type HostBridgeStatusSnapshot = {
  status: HostBridgeServiceStatus;
  protocol: typeof HOST_BRIDGE_PROTOCOL_VERSION;
  host: string;
  port: number;
  endpoint: string;
  remoteEndpoint: string;
  advertisedHost: string;
  advertisedHostSource?: HostBridgeAdvertisedHostSource;
  advertisedHostDiagnostics?: string[];
  remoteEndpointUsesPlaceholder: boolean;
  bindMode: HostBridgeBindMode;
  lanEnabled: boolean;
  portMode: HostBridgePortMode;
  pinPortEnabled: boolean;
  pinnedPort: number;
  supervised: boolean;
  restartCount: number;
  lastRecoveryReason: string;
  authRequired: true;
  tokenMasked: string;
  masterTokenConfigured: boolean;
  masterTokenMasked: string;
  masterTokenUpdatedAt: string;
  lastRequestMethod: string;
  lastResponseStatus: number;
  lastError: string;
  requestCount: number;
  updatedAt: string;
  routes?: {
    hostBridge: string;
    mcp?: string;
  };
  mcp?: {
    enabled: boolean;
    endpoint: string;
  };
};

export type HostBridgeHealth = {
  status: HostBridgeServiceStatus;
  protocol: typeof HOST_BRIDGE_PROTOCOL_VERSION;
  bindMode: HostBridgeBindMode;
  lanEnabled: boolean;
  authRequired: true;
  routes?: {
    hostBridge: string;
    mcp?: string;
  };
  mcp?: {
    enabled: boolean;
    endpoint: string;
  };
};

export type HostBridgeApprovalRequirement = "none" | "zotero-ui-required";

export type HostBridgeCapabilityCategory =
  | "citation_graph"
  | "concepts"
  | "context"
  | "debug"
  | "diagnostic"
  | "insights"
  | "library"
  | "library_index"
  | "mutation"
  | "paper_artifacts"
  | "reference_index"
  | "resolvers"
  | "schemas"
  | "topics"
  | "workflow_products";

export type HostBridgeCapabilityManifestEntry = {
  name: string;
  category: HostBridgeCapabilityCategory;
  summary: string;
  approval: HostBridgeApprovalRequirement;
  requestEffect: "read" | "state-change";
  input: {
    type: "none" | "object" | "item-ref" | "mutation-preview";
    required: boolean;
    properties?: Record<string, unknown>;
    requiredProperties?: string[];
  };
};

export type HostBridgeCallRequest = {
  capability?: unknown;
  input?: unknown;
};

export type HostBridgeCallResult = {
  capability: string;
  approval: HostBridgeApprovalRequirement | "auto-approved";
  data: unknown;
};

export type HostBridgeManifest = {
  protocol: typeof HOST_BRIDGE_PROTOCOL_VERSION;
  endpoint: {
    url: string;
    remoteUrl?: string;
    advertisedHost?: string;
    bindMode: HostBridgeBindMode;
    lanEnabled: boolean;
  };
  auth: {
    type: "bearer";
    tokenMasked: string;
    masterTokenConfigured?: boolean;
    masterTokenMasked?: string;
  };
  capabilities: HostBridgeCapabilityManifestEntry[];
  workflowControl: {
    supported: boolean;
    endpoints?: string[];
    explicitInputRequired?: boolean;
    submitRequiresApproval?: boolean;
  };
  contextControl?: {
    supported: boolean;
    endpoints?: string[];
    approvalRequired?: boolean;
  };
  fileDownloads: {
    supported: boolean;
    endpoint?: string;
    urlTemplate?: string;
    auth?: "bearer";
    supportsRemoteClients?: boolean;
    arbitraryPathAllowed?: boolean;
    approvalRequired?: boolean;
  };
  fileUploads?: {
    supported: boolean;
    endpoint?: string;
    auth?: "bearer";
    maxBytes?: number;
    arbitraryPathAllowed?: boolean;
    approvalRequired?: boolean;
  };
  routes?: {
    hostBridge: string;
    mcp?: string;
  };
  mcp?: {
    enabled: boolean;
    endpoint: string;
  };
  cli: {
    supported: true;
    schema: typeof HOST_BRIDGE_CLI_SCHEMA;
  };
};

export function hostBridgeOk<T>(result: T): HostBridgeResponse<T> {
  return {
    status: "ok",
    result,
  };
}

export function hostBridgeError(
  code: HostBridgeErrorCode,
  message: string,
  category: HostBridgeErrorCategory,
  details?: Record<string, unknown>,
  control?: Partial<
    Pick<
      HostBridgeError,
      | "retryable"
      | "stateChange"
      | "handleConsumption"
      | "safeNextActions"
      | "nextCommand"
    >
  >,
): HostBridgeResponse<never> {
  const handleConsumption =
    control?.handleConsumption ??
    (code === "agent_run_already_consumed" ? "consumed" : "unconsumed");
  const retryable =
    control?.retryable ??
    ["bridge_unavailable", "download_failed", "upload_failed"].includes(code);
  const safeNextActions =
    control?.safeNextActions ||
    (code.startsWith("agent_run_") || code === "invalid_bundle"
      ? ["workflow agent-apply-status", "surface describe workflow agent-apply"]
      : retryable
        ? ["bridge status", "retry command"]
        : ["surface describe"]);
  return {
    status: "error",
    error: {
      code,
      message,
      category,
      retryable,
      stateChange:
        control?.stateChange ??
        (handleConsumption === "consumed" ? "changed" : "unchanged"),
      handleConsumption,
      safeNextActions,
      ...(control?.nextCommand ? { nextCommand: control.nextCommand } : {}),
      ...(details ? { details } : {}),
    },
  };
}
