import type { SynthesisJsonValue } from "./common";

export const SYNTHESIS_HOST_READ_PAGE_LIMIT_DEFAULT = 50 as const;
export const SYNTHESIS_HOST_READ_PAGE_LIMIT_MAX = 100 as const;
export const SYNTHESIS_HOST_READ_REF_LIMIT_MAX = 100 as const;

export type SynthesisHostLibraryItemSummary = {
  paperRef: string;
  libraryId: number;
  itemKey: string;
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
  updatedAt?: string;
  metadataHash?: string;
};

export type SynthesisHostPageRequest = {
  libraryId: number;
  cursor?: string;
  limit?: number;
};

export type SynthesisHostPageResult = {
  cursor: string;
  nextCursor: string;
  hasMore: boolean;
  returned: number;
  limit: number;
};

export type SynthesisHostLibraryItemsPageResult = SynthesisHostPageResult & {
  items: SynthesisHostLibraryItemSummary[];
};

export type SynthesisHostLibraryItemsByRefRequest = {
  libraryId: number;
  paperRefs: string[];
};

export type SynthesisHostLibraryItemsByRefResult = {
  items: SynthesisHostLibraryItemSummary[];
  missingPaperRefs: string[];
};

export type SynthesisHostArtifactType =
  | "digest"
  | "references"
  | "citation_analysis";

export type SynthesisHostArtifactStatus =
  | "available"
  | "missing"
  | "decode_error"
  | "unsupported";

export type SynthesisHostArtifactDescriptor = {
  paperRef: string;
  artifactType: SynthesisHostArtifactType;
  payloadType: string;
  status: SynthesisHostArtifactStatus;
  locator?: string;
  payloadHash?: string;
  estimatedSize?: number;
  diagnostics: string[];
};

export type SynthesisHostArtifactScanPageRequest = SynthesisHostPageRequest & {
  paperRefs?: string[];
  artifactTypes?: SynthesisHostArtifactType[];
};

export type SynthesisHostArtifactScanPageResult = SynthesisHostPageResult & {
  artifacts: SynthesisHostArtifactDescriptor[];
};

export type SynthesisHostArtifactReadRequest = {
  locator: string;
  expectedHash: string;
};

export type SynthesisHostArtifactContent =
  | { kind: "json"; value: SynthesisJsonValue }
  | { kind: "text"; text: string; mediaType: "text/markdown" | "text/plain" };

export type SynthesisHostArtifactReadResult = {
  status: "available" | "missing" | "decode_error" | "stale";
  payloadHash?: string;
  currentHash?: string;
  content?: SynthesisHostArtifactContent;
  diagnostics: string[];
};

export interface SynthesisHostLibraryReadPort {
  listItemsPage(
    request: SynthesisHostPageRequest,
  ): Promise<SynthesisHostLibraryItemsPageResult>;
  getItemsByRef(
    request: SynthesisHostLibraryItemsByRefRequest,
  ): Promise<SynthesisHostLibraryItemsByRefResult>;
}

export interface SynthesisHostArtifactReadPort {
  scanPage(
    request: SynthesisHostArtifactScanPageRequest,
  ): Promise<SynthesisHostArtifactScanPageResult>;
  read(
    request: SynthesisHostArtifactReadRequest,
  ): Promise<SynthesisHostArtifactReadResult>;
}

export interface SynthesisHostReadPort {
  readonly library: SynthesisHostLibraryReadPort;
  readonly artifacts: SynthesisHostArtifactReadPort;
}
