import type { SynthesisJsonObject } from "./common";
import type { SynthesisPublicMaintenanceOperation } from "./lifecycle";

export const SYNTHESIS_CONCEPT_REVIEW_ACTIONS = [
  "approve_create",
  "merge_into_existing",
  "reject",
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

export type SynthesisConceptCommandResult = SynthesisJsonObject;
export type SynthesisConceptQueryRequest = SynthesisJsonObject;
export type SynthesisConceptQueryResult = SynthesisJsonObject;

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
