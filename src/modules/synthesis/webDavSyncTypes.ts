export type SynthesisWebDavSyncConfigStatus =
  | "disabled"
  | "incomplete"
  | "configured"
  | "invalid";

export type SynthesisWebDavSyncDiagnostic = {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  details?: unknown;
};

export type SynthesisWebDavSyncConnectionTestResult = {
  ok: boolean;
  tested_at: string;
  config_status: SynthesisWebDavSyncConfigStatus;
  diagnostics: SynthesisWebDavSyncDiagnostic[];
};
