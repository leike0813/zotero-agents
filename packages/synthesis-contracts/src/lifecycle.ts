import type { SynthesisCitationGraphApplicationMutationResult } from "./citationGraphApplication";
import type { SynthesisConceptCommandResult } from "./concepts";
import type { SynthesisTagMutationResult } from "./tags";
import type { SynthesisTopicGraphCommandResult } from "./topicGraph";
import type {
  SynthesisWebDavSyncDiagnostic,
  SynthesisWebDavSyncState,
} from "./webDavSync";

export type SynthesisStartupReconcileResult = {
  canceledCount: number;
  canceledOperationIds: string[];
};

export interface SynthesisSystemClient {
  reconcileRuntimeWorkOnStartup(): Promise<SynthesisStartupReconcileResult>;
}

export type SynthesisDatabaseResetRequest = {
  confirmationText: string;
};

export type SynthesisDatabaseResetResult = {
  ok: boolean;
  status: "confirmation_mismatch" | "reset";
  deletedRowsByTable?: Record<string, number>;
  resetAt?: string;
};

export type SynthesisPublicMaintenanceOperationStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "canceled"
  | "timed_out"
  | "not_found";

export type SynthesisReferenceRefreshReceipt = {
  actual_bytes: number | null;
  actual_json_nodes: number | null;
  affected_source_refs: string[];
  failed_paper_refs: string[];
  input_hash: string;
  limit_bytes: number | null;
  limit_json_nodes: number | null;
  ok: boolean;
  operation_id: string;
  processed_paper_refs: string[];
  reference_basis_hash: string;
  retry: boolean;
  retryable: boolean;
  status:
    | "promoted"
    | "unchanged"
    | "failed"
    | "invalid_request"
    | "repair_required"
    | "stopping";
  warnings: string[];
};

export type SynthesisReferenceMatchingReceipt = {
  fact_count: number;
  matching_hash: string;
  ok: boolean;
  operation_id: string;
  proposal_created_count: number;
  retryable: boolean;
  status:
    | "promoted"
    | "unchanged"
    | "failed"
    | "invalid_request"
    | "repair_required"
    | "stopping";
  warnings: string[];
};

export type SynthesisGenericMaintenanceReceipt = {
  schema: "synthesis.maintenance_receipt.v1";
  outcome: "completed" | "failed" | "canceled" | "timed_out";
  state_changed: boolean;
  retryable: boolean;
  diagnostics: SynthesisWebDavSyncDiagnostic[];
};

export type SynthesisPublicMaintenanceReceipt =
  | SynthesisGenericMaintenanceReceipt
  | SynthesisReferenceRefreshReceipt
  | SynthesisReferenceMatchingReceipt
  | SynthesisCitationGraphApplicationMutationResult
  | SynthesisTagMutationResult
  | SynthesisConceptCommandResult
  | SynthesisTopicGraphCommandResult
  | SynthesisWebDavSyncState;

export type SynthesisPublicMaintenanceOperation = {
  schema: "synthesis.maintenance_operation.v1";
  operation_id: string;
  status: SynthesisPublicMaintenanceOperationStatus;
  operation_type?: string;
  library_id?: number;
  scope?: {
    kind: string;
    paper_refs: string[];
  };
  phase?: string;
  phase_label?: string;
  message?: string;
  progress_mode?: "indeterminate" | "determinate";
  processed_count?: number;
  skipped_count?: number;
  failed_count?: number;
  total_count?: number;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
  updated_at?: string;
  receipt?: SynthesisPublicMaintenanceReceipt;
};

export type SynthesisPublicMaintenanceOperationRequest =
  | { operation_id: string; operationId?: never }
  | { operationId: string; operation_id?: never };

export type SynthesisPublicMaintenanceOperationControlRequest =
  | {
      action: "cancel" | "continue";
      operation_id: string;
      operationId?: never;
      retry_key?: never;
      retryKey?: never;
    }
  | {
      action: "cancel" | "continue";
      operationId: string;
      operation_id?: never;
      retry_key?: never;
      retryKey?: never;
    }
  | {
      action: "retry";
      operation_id: string;
      operationId?: never;
      retry_key: string;
      retryKey?: never;
    }
  | {
      action: "retry";
      operationId: string;
      operation_id?: never;
      retry_key: string;
      retryKey?: never;
    }
  | {
      action: "retry";
      operation_id: string;
      operationId?: never;
      retryKey: string;
      retry_key?: never;
    }
  | {
      action: "retry";
      operationId: string;
      operation_id?: never;
      retryKey: string;
      retry_key?: never;
    };

export interface SynthesisMaintenanceClient {
  getOperation(
    request: SynthesisPublicMaintenanceOperationRequest,
  ): Promise<SynthesisPublicMaintenanceOperation>;
  controlOperation(
    request: SynthesisPublicMaintenanceOperationControlRequest,
  ): Promise<SynthesisPublicMaintenanceOperation>;
  getSchemas(
    request?: Record<string, never>,
  ): Promise<SynthesisArtifactLibraryDebugSchemasResult>;
  resetDatabase(
    request: SynthesisDatabaseResetRequest,
  ): Promise<SynthesisDatabaseResetResult>;
}

export type SynthesisArtifactLibraryDebugSchemasResult = {
  schema: "synthesis-artifact-library-debug-schemas.v1";
  schemas: {
    result_bundle: "synthesis.topic_synthesis_result_bundle@1.0.0";
    canonical_metadata: "synthesis.topic_artifact_metadata@1.0.0";
    artifact_manifest: "synthesis.paper_artifact_manifest@1.0.0";
    library_index: "synthesis.library_index@1.0.0";
    debug_snapshot: "synthesis.debug-maintenance.v1";
  };
  redaction: {
    local_paths: "[redacted-path]";
    credentials: "omitted";
    host_objects: "omitted";
  };
};

export type SynthesisRelatedItemsEchoRequest = {
  libraryId: number;
  itemKey: string;
  relatedItemKey?: string;
};

export type SynthesisRelatedItemsEchoReceipt = {
  consumed: boolean;
};

export interface SynthesisNotificationsClient {
  consumeRelatedItemsSyncEcho(
    request: SynthesisRelatedItemsEchoRequest,
  ): Promise<SynthesisRelatedItemsEchoReceipt>;
}
