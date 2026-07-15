import type { SynthesisJsonObject } from "./common";

export type SynthesisLibraryIndexRequest = SynthesisJsonObject;
export type SynthesisLibraryIndexResult = SynthesisJsonObject;

export interface SynthesisLibraryIndexClient {
  getPage(
    request?: SynthesisLibraryIndexRequest,
  ): Promise<SynthesisLibraryIndexResult>;
}
