import type { SynthesisJsonObject } from "./common";

export const SYNTHESIS_WORKBENCH_SURFACES = [
  "home",
  "topics",
  "index",
  "review",
  "graph",
  "tags",
  "concepts",
  "reader",
] as const;

export type SynthesisWorkbenchSurfaceName =
  (typeof SYNTHESIS_WORKBENCH_SURFACES)[number];

export type SynthesisWorkbenchReadState = SynthesisJsonObject;
export type SynthesisWorkbenchProjection = SynthesisJsonObject;

export type SynthesisWorkbenchChromeReadRequest = {
  state: SynthesisWorkbenchReadState;
};

export type SynthesisWorkbenchSurfaceReadRequest = {
  surface: SynthesisWorkbenchSurfaceName;
  state: SynthesisWorkbenchReadState;
};

export type SynthesisWorkbenchTopicDetailReadRequest = {
  topicId: string;
};

export type SynthesisWorkbenchTopicDetailResult = SynthesisJsonObject & {
  ok: boolean;
  status: string;
  topicId: string;
  title: string;
  source_papers: SynthesisJsonObject[];
};

export type SynthesisWorkbenchPaperDigestReadRequest = {
  topicId?: string;
  paperRef?: string;
  digestRef?: SynthesisJsonObject;
  includeRepresentativeImage?: boolean;
};

export type SynthesisWorkbenchPaperDigestResult = SynthesisJsonObject & {
  ok: boolean;
  status: "available" | "unavailable";
  paper_ref: string;
  digest_markdown: string;
  recorded_hash: string;
  current_hash: string;
  source_changed: boolean;
  diagnostics: string[];
  note_key?: string;
  note_title?: string;
  representative_image?: SynthesisJsonObject;
};

export interface SynthesisWorkbenchClient {
  readChrome(
    request: SynthesisWorkbenchChromeReadRequest,
  ): Promise<SynthesisWorkbenchProjection>;
  readSurface(
    request: SynthesisWorkbenchSurfaceReadRequest,
  ): Promise<SynthesisWorkbenchProjection>;
  readTopicDetail(
    request: SynthesisWorkbenchTopicDetailReadRequest,
  ): Promise<SynthesisWorkbenchTopicDetailResult>;
  readPaperDigest(
    request: SynthesisWorkbenchPaperDigestReadRequest,
  ): Promise<SynthesisWorkbenchPaperDigestResult>;
}
