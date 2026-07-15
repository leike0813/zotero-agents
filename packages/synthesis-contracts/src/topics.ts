import type { SynthesisJsonObject } from "./common";
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

export interface SynthesisTopicsClient {
  listWorkflowOptions(
    request?: SynthesisWorkflowTopicOptionsRequest,
  ): Promise<SynthesisWorkflowTopicOptionsResult>;
  getTopicReport(
    request: SynthesisTopicReportRequest,
  ): Promise<SynthesisTopicReportResult>;
}
