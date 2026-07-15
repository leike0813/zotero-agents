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

export interface SynthesisMaintenanceClient {
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
