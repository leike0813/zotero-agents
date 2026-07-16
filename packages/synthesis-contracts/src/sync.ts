import type { SynthesisJsonObject } from "./common";

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

export type SynthesisSyncCommandResult = SynthesisJsonObject;

export interface SynthesisSyncTransportClient {
  runNow(): Promise<SynthesisSyncCommandResult>;
  pause(): Promise<SynthesisSyncCommandResult>;
  resume(): Promise<SynthesisSyncCommandResult>;
  retry(): Promise<SynthesisSyncCommandResult>;
  resolveConflict(
    request: SynthesisSyncConflictResolutionRequest,
  ): Promise<SynthesisSyncCommandResult>;
}

export interface SynthesisSyncClient {
  readonly webDav: SynthesisSyncTransportClient;
}
