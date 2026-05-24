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
  | "download_failed"
  | "file_handle_expired"
  | "file_not_found"
  | "file_unavailable"
  | "invalid_capability_input"
  | "invalid_file_id"
  | "invalid_workflow_input"
  | "internal_error"
  | "method_not_allowed"
  | "not_found"
  | "permission_denied"
  | "permission_timeout"
  | "permission_ui_unavailable"
  | "request_body_too_large"
  | "unauthorized"
  | "workflow_not_found"
  | "workflow_run_not_found"
  | "workflow_submit_failed"
  | "workflow_submit_requires_approval";

export type HostBridgeError = {
  code: HostBridgeErrorCode;
  message: string;
  category: HostBridgeErrorCategory;
  details?: Record<string, unknown>;
};

export type HostBridgeBindMode = "loopback" | "lan";

export type HostBridgeServiceStatus =
  | "idle"
  | "starting"
  | "running"
  | "error"
  | "stopped";

export type HostBridgePortMode = "random" | "pinned" | "fallback";

export type HostBridgeStatusSnapshot = {
  status: HostBridgeServiceStatus;
  protocol: typeof HOST_BRIDGE_PROTOCOL_VERSION;
  host: string;
  port: number;
  endpoint: string;
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
  lastRequestMethod: string;
  lastResponseStatus: number;
  lastError: string;
  requestCount: number;
  updatedAt: string;
};

export type HostBridgeHealth = {
  status: HostBridgeServiceStatus;
  protocol: typeof HOST_BRIDGE_PROTOCOL_VERSION;
  bindMode: HostBridgeBindMode;
  lanEnabled: boolean;
  authRequired: true;
};

export type HostBridgeApprovalRequirement = "none" | "zotero-ui-required";

export type HostBridgeCapabilityCategory =
  | "context"
  | "diagnostic"
  | "library"
  | "mutation"
  | "synthesis";

export type HostBridgeCapabilityManifestEntry = {
  name: string;
  category: HostBridgeCapabilityCategory;
  summary: string;
  approval: HostBridgeApprovalRequirement;
  input: {
    type: "none" | "object" | "item-ref" | "mutation-preview";
    required: boolean;
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
    bindMode: HostBridgeBindMode;
    lanEnabled: boolean;
  };
  auth: {
    type: "bearer";
    tokenMasked: string;
  };
  capabilities: HostBridgeCapabilityManifestEntry[];
  workflowControl: {
    supported: boolean;
    endpoints?: string[];
    explicitInputRequired?: boolean;
    submitRequiresApproval?: boolean;
  };
  fileDownloads: {
    supported: boolean;
    endpoint?: string;
    arbitraryPathAllowed?: boolean;
    approvalRequired?: boolean;
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
