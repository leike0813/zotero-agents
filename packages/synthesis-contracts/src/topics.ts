import type { SynthesisJsonObject } from "./common";

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
}
