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
  ): Promise<SynthesisTopicCommandResult>;
  purgeDeletedTopicArtifacts(): Promise<SynthesisTopicCommandResult>;
  rejectTopicDiscoveryHint(
    request: SynthesisTopicDiscoveryHintRequest,
  ): Promise<SynthesisTopicCommandResult>;
  restoreTopicDiscoveryHint(
    request: SynthesisTopicDiscoveryHintRequest,
  ): Promise<SynthesisTopicCommandResult>;
}
