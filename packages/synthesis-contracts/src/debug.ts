import type { SynthesisJsonObject } from "./common";

export type SynthesisDebugRequest = SynthesisJsonObject;
export type SynthesisDebugResult = SynthesisJsonObject;
export type SynthesisDebugCleanInstallResetRequest = SynthesisDebugRequest & {
  confirmationText?: string;
  dryRun?: boolean;
};

export interface SynthesisDebugClient {
  snapshot(request?: SynthesisDebugRequest): Promise<SynthesisDebugResult>;
  listCache(request?: SynthesisDebugRequest): Promise<SynthesisDebugResult>;
  listOperations(
    request?: SynthesisDebugRequest,
  ): Promise<SynthesisDebugResult>;
  listProfiler(request?: SynthesisDebugRequest): Promise<SynthesisDebugResult>;
  inspectPaper(request: SynthesisDebugRequest): Promise<SynthesisDebugResult>;
  inspectTopic(request: SynthesisDebugRequest): Promise<SynthesisDebugResult>;
  diff(request?: SynthesisDebugRequest): Promise<SynthesisDebugResult>;
  cleanInstallReset(
    request?: SynthesisDebugCleanInstallResetRequest,
  ): Promise<SynthesisDebugResult>;
}
