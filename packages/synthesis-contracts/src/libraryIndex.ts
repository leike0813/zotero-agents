import { rebuildSynthesisProtocolCapabilityDto } from "./protocolSchema.js";

export type SynthesisLibraryIndexRequest = {
  cursor?: string;
  limit?: number;
  includeTags?: boolean;
  includeCollections?: boolean;
  includeItems?: boolean;
};

export type SynthesisLibraryPaper = {
  paper_ref: string;
  library_id: number;
  item_key: string;
  title: string;
  year: string;
  item_type: string;
  creators: Array<{
    firstName: string;
    lastName: string;
    creatorType: string;
  }>;
  tags: string[];
  collections: string[];
};

export type SynthesisLibraryIndexPage<Item> = {
  items: Item[];
  cursor: string;
  nextCursor: string;
  hasMore: boolean;
  returned: number;
  total: number;
  limit: number;
};

export type SynthesisLibraryIndexResult = {
  libraryId: number;
  papers: SynthesisLibraryPaper[];
  cursor: string;
  next_cursor: string;
  has_more: boolean;
  returned: number;
  total_papers: number;
  limit: number;
  index_hash: string;
  page_hash: string;
  pagination: {
    papers: {
      cursor: string;
      nextCursor: string;
      hasMore: boolean;
      returned: number;
      total: number;
      limit: number;
    };
  };
  tags?: SynthesisLibraryIndexPage<{ tag: string; count: number }>;
  collections?: SynthesisLibraryIndexPage<{
    id: string;
    key: string;
    name: string;
    library_id: number;
    item_count: number;
  }>;
  topics?: SynthesisLibraryIndexPage<{
    topic_id: string;
    title: string;
    status: string;
    created_at?: string;
    updated_at?: string;
    current_artifact_path?: string;
  }>;
  registry?: SynthesisLibraryIndexPage<SynthesisLibraryPaper>;
};

export function rebuildSynthesisLibraryIndexResult(
  value: unknown,
): SynthesisLibraryIndexResult {
  return rebuildSynthesisProtocolCapabilityDto({
    capability: "client.getLibraryIndex",
    direction: "result",
    value,
  });
}

export interface SynthesisLibraryIndexClient {
  getPage(
    request?: SynthesisLibraryIndexRequest,
  ): Promise<SynthesisLibraryIndexResult>;
}
