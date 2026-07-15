import type { SynthesisJsonObject, SynthesisJsonValue } from "./common";

export type SynthesisWorkflowItemSnapshot = {
  libraryId: number;
  itemKey: string;
  paperRef: string;
  itemType: string;
  title: string;
  year: string;
  date: string;
  creators: string[];
  tags: string[];
  collections: string[];
  doi: string;
  arxiv: string;
  isbn: string;
  url: string;
  citekey: string;
  dateAdded: string;
};

export type SynthesisLiteratureDigestApplyRequest =
  SynthesisWorkflowItemSnapshot & {
    digest?: SynthesisJsonObject;
    references?: SynthesisJsonObject;
    citationAnalysis?: SynthesisJsonObject;
    literatureMatchingMetadata?: SynthesisJsonValue;
    matchedReferences?: SynthesisJsonValue;
    source?: SynthesisJsonValue;
  };

export type SynthesisMaterializedAsset = {
  id: string;
  mediaType: "application/json" | "text/markdown" | "text/plain";
  text: string;
};

export type SynthesisTopicApplyRequest = {
  bundle: SynthesisJsonObject;
  assets: SynthesisMaterializedAsset[];
};

export type SynthesisTopicApplyResult = SynthesisJsonObject;

export interface SynthesisWorkflowApplyClient {
  applyLiteratureDigestSidecar(
    request: SynthesisLiteratureDigestApplyRequest,
  ): Promise<SynthesisJsonObject>;
  applyTopicSynthesisResult(
    request: SynthesisTopicApplyRequest,
  ): Promise<SynthesisTopicApplyResult>;
}

export type SynthesisTopicReportRequest = {
  topicId: string;
};

export type SynthesisTopicReportResult = SynthesisJsonObject & {
  ok: boolean;
  status: string;
  topic_id: string;
  markdown: string;
  diagnostics: string[];
};

export type SynthesisPaperArtifactsRequest = {
  paper_refs: string[];
  artifact_types?: string[];
};

export type SynthesisPaperArtifactsResult = SynthesisJsonObject & {
  artifacts: SynthesisJsonObject[];
  diagnostics: string[];
  total: number;
};

export interface SynthesisArtifactsClient {
  readPaperArtifacts(
    request: SynthesisPaperArtifactsRequest,
  ): Promise<SynthesisPaperArtifactsResult>;
}
