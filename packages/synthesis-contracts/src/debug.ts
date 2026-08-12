import { rebuildSynthesisProtocolCapabilityDto } from "./protocolSchema.js";
import type {
  SynthesisDebugCacheItem,
  SynthesisDebugDiagnostic,
  SynthesisDebugOperationItem,
  SynthesisDebugSnapshotResult,
  SynthesisDebugTopicDescriptor,
} from "./debugMaintenance.js";

export type SynthesisDebugPageRequest = {
  cursor?: string;
  limit?: number;
};

export type SynthesisDebugRowsPage<Item> = {
  rows: Item[];
  total: number;
  truncated: boolean;
  cursor: string;
  next_cursor: string;
  has_more: boolean;
  limit: number;
};

export type SynthesisDebugUnavailable = {
  status: "unavailable";
  diagnostics: SynthesisDebugDiagnostic[];
};

export type SynthesisDebugCacheListResult =
  SynthesisDebugRowsPage<SynthesisDebugCacheItem>;
export type SynthesisDebugOperationsListResult =
  SynthesisDebugRowsPage<SynthesisDebugOperationItem>;
export type SynthesisDebugTopicInspectResult = Omit<
  SynthesisDebugTopicDescriptor,
  "status" | "diagnostics"
> & {
  status: string;
  diagnostics: string[];
};

export type SynthesisDebugCleanInstallResetRequest = {
  confirmationText?: string;
  dryRun?: boolean;
};

export type SynthesisDebugCapabilityResultMap = {
  "client.debugSynthesisSnapshot": SynthesisDebugSnapshotResult;
  "client.debugSynthesisCacheList": SynthesisDebugCacheListResult;
  "client.debugSynthesisOperationsList": SynthesisDebugOperationsListResult;
  "client.debugSynthesisProfilerList": SynthesisDebugUnavailable;
  "client.debugSynthesisPaperInspect": SynthesisDebugUnavailable;
  "client.debugSynthesisTopicInspect": SynthesisDebugTopicInspectResult;
  "client.debugSynthesisDiff": SynthesisDebugUnavailable;
};

export function rebuildSynthesisDebugCapabilityResult<
  Capability extends keyof SynthesisDebugCapabilityResultMap,
>(
  capability: Capability,
  value: unknown,
): SynthesisDebugCapabilityResultMap[Capability] {
  return rebuildSynthesisProtocolCapabilityDto({
    capability,
    direction: "result",
    value,
  });
}

export interface SynthesisDebugClient {
  snapshot(
    request?: SynthesisDebugPageRequest,
  ): Promise<SynthesisDebugSnapshotResult>;
  listCache(
    request?: SynthesisDebugPageRequest,
  ): Promise<SynthesisDebugCacheListResult>;
  listOperations(
    request?: SynthesisDebugPageRequest,
  ): Promise<SynthesisDebugOperationsListResult>;
  listProfiler(
    request?: SynthesisDebugPageRequest,
  ): Promise<SynthesisDebugUnavailable>;
  inspectPaper(request: {
    paperRef: string;
  }): Promise<SynthesisDebugUnavailable>;
  inspectTopic(request: {
    topicId: string;
  }): Promise<SynthesisDebugTopicInspectResult>;
  diff(request?: SynthesisDebugPageRequest): Promise<SynthesisDebugUnavailable>;
  cleanInstallReset(
    request?: SynthesisDebugCleanInstallResetRequest,
  ): Promise<import("./lifecycle.js").SynthesisDatabaseResetResult>;
}
