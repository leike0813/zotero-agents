export const HOST_BRIDGE_PROTOCOL_VERSION = "host-bridge.v1";

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
  | "invalid_file_id"
  | "invalid_object_ref"
  | "invalid_request_body"
  | "invalid_skill_run_id"
  | "invalid_workflow_agent_run_request"
  | "invalid_workflow_describe_request"
  | "invalid_workflow_input"
  | "missing_required_workflow_parameter"
  | "invalid_workflow_submit_request"
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
  | "workflow_submit_requires_approval";

export type HostBridgeError = {
  code: HostBridgeErrorCode;
  message: string;
  category: HostBridgeErrorCategory;
  details?: Record<string, unknown>;
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
  | "topics";

export type HostBridgeCapabilityManifestEntry = {
  name: string;
  category: HostBridgeCapabilityCategory;
  summary: string;
  approval: HostBridgeApprovalRequirement;
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
    schema: "zotero-bridge.cli.v1";
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
): HostBridgeResponse<never> {
  return {
    status: "error",
    error: {
      code,
      message,
      category,
      ...(details ? { details } : {}),
    },
  };
}
