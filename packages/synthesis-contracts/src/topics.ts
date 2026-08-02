import type { SynthesisJsonObject } from "./common";
import type { SynthesisDeliveryContext } from "./common";
import type {
  SynthesisTopicReportRequest,
  SynthesisTopicReportResult,
} from "./workflow";

export type SynthesisWorkflowTopicOption = {
  value: string;
  label: string;
  description: string;
  meta: SynthesisJsonObject & {
    kind: string;
  };
};

export type SynthesisWorkflowTopicOptionsRequest = {
  filter?: string;
};

export type SynthesisWorkflowTopicOptionsResult = {
  options: SynthesisWorkflowTopicOption[];
  diagnostics: Array<{
    code: string;
    message: string;
  }>;
};

export type SynthesisTopicArtifactDeleteRequest = {
  topicId: string;
};

export type SynthesisTopicDiscoveryHintRequest = {
  hintId: string;
};

export type SynthesisTopicCommandResult = SynthesisJsonObject;
export type SynthesisTopicArtifactDeleteResult =
  | {
      ok: true;
      status: "deleted";
      topicId: string;
      deletedPathId: string;
      warnings?: string[];
    }
  | {
      ok: false;
      status: "not_found";
      topicId: string;
      reason: string;
      warnings?: string[];
    };
export type SynthesisDeletedTopicArtifactsPurgeResult = {
  ok: true;
  status: "purged";
  purged_count: number;
  warnings?: string[];
};
export type SynthesisTopicQueryRequest = SynthesisJsonObject;
export type SynthesisTopicQueryResult = SynthesisJsonObject;

export interface SynthesisTopicsClient {
  list(
    request?: SynthesisTopicQueryRequest,
  ): Promise<SynthesisTopicQueryResult>;
  findByPaperRef(
    request?: SynthesisTopicQueryRequest,
  ): Promise<SynthesisTopicQueryResult>;
  getContext(
    request: SynthesisTopicQueryRequest,
    delivery?: SynthesisDeliveryContext,
  ): Promise<SynthesisTopicQueryResult>;
  resolveResolver(
    request: SynthesisTopicQueryRequest,
  ): Promise<SynthesisTopicQueryResult>;
  listWorkflowOptions(
    request?: SynthesisWorkflowTopicOptionsRequest,
  ): Promise<SynthesisWorkflowTopicOptionsResult>;
  getTopicReport(
    request: SynthesisTopicReportRequest,
  ): Promise<SynthesisTopicReportResult>;
  deleteTopicArtifact(
    request: SynthesisTopicArtifactDeleteRequest,
  ): Promise<SynthesisTopicArtifactDeleteResult>;
  purgeDeletedTopicArtifacts(): Promise<SynthesisDeletedTopicArtifactsPurgeResult>;
  rejectTopicDiscoveryHint(
    request: SynthesisTopicDiscoveryHintRequest,
  ): Promise<SynthesisTopicCommandResult>;
  restoreTopicDiscoveryHint(
    request: SynthesisTopicDiscoveryHintRequest,
  ): Promise<SynthesisTopicCommandResult>;
}
