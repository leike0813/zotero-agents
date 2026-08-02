import type { SynthesisJsonObject, SynthesisJsonValue } from "./common";

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
  receipt?: SynthesisJsonValue;
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
  getSchemas(request?: SynthesisJsonObject): Promise<SynthesisJsonObject>;
  resetDatabase(
    request: SynthesisDatabaseResetRequest,
  ): Promise<SynthesisDatabaseResetResult>;
}

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
