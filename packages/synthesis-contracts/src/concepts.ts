import type { SynthesisPublicMaintenanceOperation } from "./lifecycle";
import { rebuildSynthesisProtocolCapabilityDto } from "./protocolSchema.js";

export const SYNTHESIS_CONCEPT_REVIEW_ACTIONS = [
  "approve_create",
  "merge_into_existing",
  "reject",
  "keep_alias",
  "remove_alias",
] as const;

export type SynthesisConceptReviewAction =
  (typeof SYNTHESIS_CONCEPT_REVIEW_ACTIONS)[number];

export type SynthesisConceptDisplayFields = {
  short_definition?: string;
  definition?: string;
  usage_note?: string;
  editorial_note?: string;
};

export type SynthesisConceptDisplayTextUpdateRequest = {
  conceptId: string;
  fields: SynthesisConceptDisplayFields;
};

export type SynthesisConceptReviewActionRequest = {
  reviewId: string;
  action: SynthesisConceptReviewAction;
  targetConceptId?: string;
};

export type SynthesisConceptDeleteRequest = {
  conceptIds: string[];
};

export type SynthesisConceptDiagnostic = {
  code: string;
  severity: "warning" | "error";
};

export type SynthesisConceptCommandResult = {
  status:
    | "committed"
    | "unchanged"
    | "not_found"
    | "basis_mismatch"
    | "concept_kb_busy"
    | "invalid_request"
    | "worker_failed"
    | "stopping";
  manifestHash: string | null;
  revision: number;
  changedConceptIds: string[];
  reviewIds: string[];
  diagnostics: SynthesisConceptDiagnostic[];
};

export type SynthesisConceptQueryRequest = {
  labels?: string[];
  aliases?: string[];
  label?: string;
  query?: string;
  limit?: number;
};

export type SynthesisConceptQueryMatch = {
  aliasMatches: Array<{ aliasId: string; conceptId: string }>;
  ambiguous: boolean;
  exactConceptIds: string[];
  label: string;
  senseIds: string[];
};

export type SynthesisConceptQueryResult = {
  ok: true;
  labels: string[];
  matches: SynthesisConceptQueryMatch[];
  truncated: boolean;
  limits: { limit: number; maxLimit: 100; total: number };
  diagnostics: Array<{
    code: string;
    details?: { requested: number };
  }>;
};

export type SynthesisConceptCapabilityResultMap = {
  "client.queryConceptKb": SynthesisConceptQueryResult;
  "client.rebuildConceptKbIndex": SynthesisPublicMaintenanceOperation;
  "client.updateConceptDisplayText": SynthesisConceptCommandResult;
  "client.applyConceptReviewAction": SynthesisConceptCommandResult;
  "client.deleteConceptEntries": SynthesisConceptCommandResult;
};

export function rebuildSynthesisConceptCapabilityResult<
  Capability extends keyof SynthesisConceptCapabilityResultMap,
>(
  capability: Capability,
  value: unknown,
): SynthesisConceptCapabilityResultMap[Capability] {
  return rebuildSynthesisProtocolCapabilityDto({
    capability,
    direction: "result",
    value,
  });
}

export interface SynthesisConceptsClient {
  query(
    request?: SynthesisConceptQueryRequest,
  ): Promise<SynthesisConceptQueryResult>;
  rebuildConceptKbIndex(): Promise<SynthesisPublicMaintenanceOperation>;
  updateConceptDisplayText(
    request: SynthesisConceptDisplayTextUpdateRequest,
  ): Promise<SynthesisConceptCommandResult>;
  applyConceptReviewAction(
    request: SynthesisConceptReviewActionRequest,
  ): Promise<SynthesisConceptCommandResult>;
  deleteConceptEntries(
    request: SynthesisConceptDeleteRequest,
  ): Promise<SynthesisConceptCommandResult>;
}
