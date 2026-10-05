import type { SynthesisHostItemRef } from "./itemRef.js";
import { SynthesisClientError } from "./common.js";
import { rebuildSynthesisProtocolDto } from "./protocolSchema.js";

export const SYNTHESIS_SEARCH_SCHEMA_ID =
  "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json";

export type SynthesisSearchSourceKind = "metadata" | "fulltext" | "analysis";
export type SynthesisSearchStatus = "completed" | "limited" | "unavailable";
export type SynthesisSearchMethod = "lexical" | "vector" | "hybrid";
export type SynthesisSearchWorkStatus =
  | "complete"
  | "not_requested"
  | "limited"
  | "unavailable";

export type SynthesisSearchRequest = {
  query: string;
  limit?: number;
  maxResults?: number;
  cursor?: string;
};

export type SynthesisLibrarySearchScope = {
  libraryIds?: number[];
  itemRefs?: SynthesisPortableItemRef[];
  collectionRef?: SynthesisPortableCollectionRef;
  tag?: string;
  itemType?: string;
};

export type SynthesisPortableItemRef = Pick<
  SynthesisHostItemRef,
  "libraryId"
> & {
  key: string;
};
export type SynthesisPortableCollectionRef = SynthesisPortableItemRef;

export type SynthesisEvidenceSearchRequest = SynthesisSearchRequest &
  SynthesisLibrarySearchScope & { sourceKinds?: SynthesisSearchSourceKind[] };
export type SynthesisTopicSearchRequest = SynthesisSearchRequest & {
  sections?: string[];
};

export type SynthesisSearchCoverage =
  | {
      kind: "library";
      sources: Record<
        SynthesisSearchSourceKind,
        { status: SynthesisSearchWorkStatus; sourcesScanned: number }
      >;
    }
  | {
      kind: "topic";
      sections: Array<{ section: string; status: SynthesisSearchWorkStatus }>;
    };

export type SynthesisSearchIssue = {
  code:
    | "source_unavailable"
    | "source_changed"
    | "source_read_failed"
    | "invalid_source"
    | "scan_budget_exhausted"
    | "passage_budget_exhausted"
    | "result_budget_exhausted"
    | "vector_unavailable";
  sourceKind: SynthesisSearchSourceKind | null;
  affectedCount: number;
};

export type SynthesisSearchResult<T> = {
  results: T[];
  status: SynthesisSearchStatus;
  method: SynthesisSearchMethod;
  coverage: SynthesisSearchCoverage;
  issues: SynthesisSearchIssue[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number | null;
};

export type SynthesisTextRange = { start: number; end: number };
export type SynthesisEvidenceSource =
  | { kind: "metadata"; field: string }
  | { kind: "fulltext"; attachmentRef: SynthesisPortableItemRef }
  | {
      kind: "analysis";
      artifactType:
        | "digest"
        | "references"
        | "citation-analysis"
        | "literature-score";
      noteRef: SynthesisPortableItemRef;
    };
export type SynthesisEvidenceLocation = {
  unit: "field" | "paragraph" | "list_item" | "table_row" | "analysis_field";
  field: string | null;
  range: SynthesisTextRange;
};
export type SynthesisEvidenceContext = {
  content: string;
  format: "text" | "markdown";
  source: SynthesisEvidenceSource;
  sourceVersion: string;
  location: SynthesisEvidenceLocation;
};
export type SynthesisEvidencePassage = SynthesisEvidenceContext & {
  itemRef: SynthesisPortableItemRef;
  context: SynthesisEvidenceContext[];
};

export type SynthesisEvidenceSearchResult =
  SynthesisSearchResult<SynthesisEvidencePassage>;
export type SynthesisTopicSearchMatch = {
  topicId: string;
  matchedSections: string[];
  matchReasons: Array<"query_terms" | "exact_phrase">;
};
export type SynthesisTopicSearchResult =
  SynthesisSearchResult<SynthesisTopicSearchMatch>;

export function rebuildSynthesisSearchRequest(
  value: unknown,
): SynthesisSearchRequest {
  const request = rebuildSynthesisProtocolDto<SynthesisSearchRequest>({
    schemaId: SYNTHESIS_SEARCH_SCHEMA_ID,
    definition: "SearchRequest",
    value,
    direction: "request",
  });
  assertPagingOrder(request);
  return request;
}

export function rebuildSynthesisSearchCoverage(
  value: unknown,
): SynthesisSearchCoverage {
  return rebuildSynthesisProtocolDto<SynthesisSearchCoverage>({
    schemaId: SYNTHESIS_SEARCH_SCHEMA_ID,
    definition: "SearchCoverage",
    value,
    direction: "result",
  });
}

export function rebuildSynthesisSearchIssue(
  value: unknown,
): SynthesisSearchIssue {
  return rebuildSynthesisProtocolDto<SynthesisSearchIssue>({
    schemaId: SYNTHESIS_SEARCH_SCHEMA_ID,
    definition: "SearchIssue",
    value,
    direction: "result",
  });
}

export function rebuildSynthesisEvidenceContext(
  value: unknown,
): SynthesisEvidenceContext {
  const context = rebuildSynthesisProtocolDto<SynthesisEvidenceContext>({
    schemaId: SYNTHESIS_SEARCH_SCHEMA_ID,
    definition: "EvidenceContext",
    value,
    direction: "result",
  });
  assertEvidenceText(context);
  return context;
}

function assertPagingOrder(request: SynthesisSearchRequest) {
  const limit = request.limit ?? 25;
  const maxResults = request.maxResults ?? 100;
  const query = request.query;
  if (
    !query.trim() ||
    query.length > 4096 ||
    (request.cursor !== undefined && request.cursor.length > 4096)
  ) {
    throw new SynthesisClientError(
      "invalid_request",
      "Search request is out of bounds",
    );
  }
  if (limit > maxResults) {
    throw new SynthesisClientError(
      "invalid_request",
      "Search limit cannot exceed maxResults",
    );
  }
}

export function rebuildSynthesisEvidenceSearchRequest(
  value: unknown,
): SynthesisEvidenceSearchRequest {
  const request = rebuildSynthesisProtocolDto<SynthesisEvidenceSearchRequest>({
    schemaId: SYNTHESIS_SEARCH_SCHEMA_ID,
    definition: "EvidenceSearchRequest",
    value,
    direction: "request",
  });
  assertPagingOrder(request);
  if (
    (request.libraryIds?.length ?? 0) > 100 ||
    (request.itemRefs?.length ?? 0) > 100 ||
    (request.sourceKinds?.length ?? 0) > 3 ||
    request.libraryIds?.some(
      (libraryId) => !Number.isSafeInteger(libraryId) || libraryId <= 0,
    ) ||
    request.itemRefs?.some((ref) => !isPortableRef(ref)) ||
    (request.collectionRef !== undefined &&
      !isPortableRef(request.collectionRef)) ||
    (request.tag !== undefined && (!request.tag || request.tag.length > 256)) ||
    (request.itemType !== undefined &&
      (!request.itemType || request.itemType.length > 64))
  ) {
    throw new SynthesisClientError(
      "invalid_request",
      "Evidence search request is out of bounds",
    );
  }
  return request;
}

function isPortableRef(value: SynthesisPortableItemRef) {
  return (
    Number.isSafeInteger(value.libraryId) &&
    value.libraryId > 0 &&
    /^[A-Za-z0-9]{1,64}$/.test(value.key)
  );
}

export function rebuildSynthesisTopicSearchRequest(
  value: unknown,
): SynthesisTopicSearchRequest {
  const request = rebuildSynthesisProtocolDto<SynthesisTopicSearchRequest>({
    schemaId: SYNTHESIS_SEARCH_SCHEMA_ID,
    definition: "TopicSearchRequest",
    value,
    direction: "request",
  });
  assertPagingOrder(request);
  return request;
}

export function rebuildSynthesisEvidenceSearchResult(
  value: unknown,
): SynthesisEvidenceSearchResult {
  const result = rebuildSynthesisProtocolDto<SynthesisEvidenceSearchResult>({
    schemaId: SYNTHESIS_SEARCH_SCHEMA_ID,
    definition: "EvidenceSearchResult",
    value,
    direction: "result",
  });
  for (const passage of result.results) {
    assertEvidenceText(passage, passage.itemRef.libraryId);
    for (const context of passage.context) {
      assertEvidenceText(context, passage.itemRef.libraryId);
    }
  }
  assertContinuation(result);
  return result;
}

export function rebuildSynthesisTopicSearchResult(
  value: unknown,
): SynthesisTopicSearchResult {
  const result = rebuildSynthesisProtocolDto<SynthesisTopicSearchResult>({
    schemaId: SYNTHESIS_SEARCH_SCHEMA_ID,
    definition: "TopicSearchResult",
    value,
    direction: "result",
  });
  if (
    new Set(result.results.map((match) => match.topicId)).size !==
    result.results.length
  ) {
    throw new SynthesisClientError(
      "internal",
      "Topic search identities must be unique",
    );
  }
  assertContinuation(result);
  return result;
}

function assertEvidenceText(
  value: SynthesisEvidenceContext,
  libraryId?: number,
) {
  if (value.content.length > 8192 || value.sourceVersion.length > 256) {
    throw new SynthesisClientError(
      "internal",
      "Search evidence text is out of bounds",
    );
  }
  assertTextRange(value.location.range, value.content.length);
  if (
    (value.source.kind === "metadata" &&
      (value.location.unit !== "field" ||
        !value.source.field.trim() ||
        !value.location.field?.trim() ||
        value.location.field !== value.source.field)) ||
    (value.source.kind === "fulltext" &&
      value.location.unit !== "paragraph" &&
      value.location.unit !== "list_item" &&
      value.location.unit !== "table_row") ||
    (value.source.kind === "analysis" &&
      value.location.unit !== "analysis_field") ||
    ((value.location.unit === "paragraph" ||
      value.location.unit === "list_item" ||
      value.location.unit === "table_row") &&
      value.location.field !== null) ||
    (value.location.unit === "field" &&
      (!value.location.field?.trim() || value.location.field.length > 128)) ||
    (value.location.unit === "analysis_field" &&
      (!value.location.field?.trim() || value.location.field.length > 128)) ||
    (libraryId !== undefined &&
      value.source.kind === "fulltext" &&
      value.source.attachmentRef.libraryId !== libraryId) ||
    (libraryId !== undefined &&
      value.source.kind === "analysis" &&
      value.source.noteRef.libraryId !== libraryId)
  ) {
    throw new SynthesisClientError(
      "internal",
      "Search evidence source and location do not match",
    );
  }
}

function assertTextRange(range: SynthesisTextRange, contentLength: number) {
  if (
    range.start >= range.end ||
    range.end > 262144 ||
    range.end - range.start !== contentLength
  ) {
    throw new SynthesisClientError(
      "internal",
      "Search evidence range is invalid",
    );
  }
}

function assertContinuation(result: SynthesisSearchResult<unknown>) {
  if (
    result.hasMore !== (result.nextCursor !== null) ||
    (result.nextCursor !== null && result.nextCursor.length > 4096)
  ) {
    throw new SynthesisClientError(
      "internal",
      "Search continuation state is invalid",
    );
  }
}
