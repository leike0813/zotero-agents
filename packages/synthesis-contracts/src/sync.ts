import type { SynthesisPublicMaintenanceOperation } from "./lifecycle";
import type { SynthesisWebDavSyncState } from "./webDavSync";

export const SYNTHESIS_SYNC_CONFLICT_RESOLUTION_ACTIONS = [
  "keep_local",
  "use_remote",
  "save_remote_copy",
  "mark_needs_attention",
  "clear_after_manual_edit",
  "skip",
  "resolved",
] as const;

export type SynthesisSyncConflictResolutionAction =
  (typeof SYNTHESIS_SYNC_CONFLICT_RESOLUTION_ACTIONS)[number];

export type SynthesisSyncConflictResolutionRequest = {
  action: SynthesisSyncConflictResolutionAction;
};

export type SynthesisSyncCommandResult = SynthesisWebDavSyncState;

export interface SynthesisSyncTransportClient {
  runNow(): Promise<SynthesisPublicMaintenanceOperation>;
  pause(): Promise<SynthesisSyncCommandResult>;
  resume(): Promise<SynthesisSyncCommandResult>;
  retry(): Promise<SynthesisPublicMaintenanceOperation>;
  resolveConflict(
    request: SynthesisSyncConflictResolutionRequest,
  ): Promise<SynthesisSyncCommandResult>;
}

export interface SynthesisSyncClient {
  readonly webDav: SynthesisSyncTransportClient;
}
