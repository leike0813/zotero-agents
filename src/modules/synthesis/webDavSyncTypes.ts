import type { SynthesisWebDavSyncDiagnostic } from "../../../packages/synthesis-contracts/src/webDavSync";
import type { SynthesisHostWebDavSyncConfigStatus } from "../../../packages/synthesis-contracts/src/webDavSyncPort";

export type SynthesisWebDavSyncConfigStatus =
  SynthesisHostWebDavSyncConfigStatus;
export type { SynthesisWebDavSyncDiagnostic };

export type SynthesisWebDavSyncConnectionTestResult = {
  ok: boolean;
  tested_at: string;
  config_status: SynthesisWebDavSyncConfigStatus;
  diagnostics: SynthesisWebDavSyncDiagnostic[];
};
