import { SynthesisClientError, type SynthesisJsonValue } from "./common.js";
import type { SynthesisPublicMaintenanceOperation } from "./lifecycle.js";
import { rebuildSynthesisProtocolDto } from "./protocolSchema.js";
import type {
  SynthesisEvidenceLocation,
  SynthesisEvidenceSource,
  SynthesisSearchStatus,
  SynthesisSearchIssue,
  SynthesisSearchSourceKind,
  SynthesisPortableItemRef,
} from "./search.js";

export const SYNTHESIS_RETRIEVAL_SCHEMA_ID =
  "https://zotero-agents.local/synthesis/sidecar-protocol/v1/retrieval.schema.json";

export const SYNTHESIS_RETRIEVAL_DEFAULT_LIMIT = 25;
export const SYNTHESIS_RETRIEVAL_MAX_RESULTS = 100;

export type SynthesisSemanticEvidenceSearchRequest =
  | {
      query: string;
      target?: "paper";
      libraryIds?: number[];
      collectionRef?: SynthesisPortableItemRef;
      itemRefs?: SynthesisPortableItemRef[];
      sourceKinds?: SynthesisSearchSourceKind[];
      limit?: number;
    }
  | {
      query: string;
      target: "topic";
      topicIds?: string[];
      sections?: string[];
      limit?: number;
    };

export type SynthesisSemanticEvidenceRef = {
  publication: string;
  identity: string;
  fragmentId: string;
  sourceVersion: string;
};

export type SynthesisSemanticEvidenceContextRequest = {
  evidenceRef: SynthesisSemanticEvidenceRef;
};

export type SynthesisSemanticEvidencePassage = {
  evidenceRef: SynthesisSemanticEvidenceRef;
  content: string;
  format: "text" | "markdown";
  title?: string;
  sourceVersion: string;
  score?: number;
  match?: boolean;
} & (
  | {
      itemRef: SynthesisPortableItemRef;
      source: SynthesisEvidenceSource;
      location: SynthesisEvidenceLocation;
    }
  | {
      topicId: string;
      source: { kind: "topic"; section: string };
      location: {
        unit: "topic_section";
        field: string;
        range: SynthesisEvidenceLocation["range"];
      };
    }
);

export type SynthesisSemanticEvidenceSearchResult = {
  status: SynthesisSearchStatus;
  method: "vector" | null;
  results: SynthesisSemanticEvidencePassage[];
  coverage: {
    vector: "complete" | "limited" | "unavailable";
    sourceKinds?: Array<SynthesisSearchSourceKind | "topic">;
  };
  issues: string[];
};

export type SynthesisSemanticEvidenceContextResult =
  SynthesisSemanticEvidenceSearchResult;

export function rebuildSynthesisSemanticEvidenceSearchRequest(
  value: unknown,
): SynthesisSemanticEvidenceSearchRequest {
  return rebuildRetrievalDto("SemanticEvidenceSearchRequest", value);
}

export function rebuildSynthesisSemanticEvidenceContextRequest(
  value: unknown,
): SynthesisSemanticEvidenceContextRequest {
  return rebuildRetrievalDto("SemanticEvidenceContextRequest", value);
}

export function rebuildSynthesisSemanticEvidenceSearchResult(
  value: unknown,
): SynthesisSemanticEvidenceSearchResult {
  return rebuildSemanticEvidenceResult("SemanticEvidenceSearchResult", value);
}

export function rebuildSynthesisSemanticEvidenceContextResult(
  value: unknown,
): SynthesisSemanticEvidenceContextResult {
  return rebuildSemanticEvidenceResult("SemanticEvidenceContextResult", value);
}

function rebuildSemanticEvidenceResult(definition: string, value: unknown) {
  const result = rebuildRetrievalDto<SynthesisSemanticEvidenceSearchResult>(
    definition,
    value,
    "result",
  );
  if (
    result.results.some(
      ({ evidenceRef, sourceVersion, content, location }) =>
        evidenceRef.sourceVersion !== sourceVersion ||
        content.length !== location.range.end - location.range.start,
    )
  ) {
    throw new SynthesisClientError(
      "internal",
      "Invalid semantic evidence provenance",
    );
  }
  return result;
}

type ExplorerSourceKind = SynthesisSearchSourceKind | "topic";
type ExplorerStatus = "ready" | "failed" | "missing" | "suspended";
export type SynthesisRetrievalExplorerRequest =
  | {
      operation: "search";
      query: string;
      target: "paper" | "topic";
      limit?: number;
    }
  | {
      operation: "browse";
      publication?: string;
      cursor?: string;
      libraryId?: number;
      sourceKind?: ExplorerSourceKind;
      status?: ExplorerStatus;
      limit?: number;
    }
  | {
      operation: "fragments";
      publication: string;
      identity: string;
      cursor?: string;
      limit?: number;
    };

export type SynthesisRetrievalExplorerResult = {
  operation: SynthesisRetrievalExplorerRequest["operation"];
  publication: string;
  rows: Array<{
    identity: string;
    title: string;
    itemRef?: SynthesisPortableItemRef;
    topicId?: string;
    section?: string;
    sourceKind?: ExplorerSourceKind;
    status?: ExplorerStatus;
    sourceCount?: number;
    fragmentCount?: number;
    score?: number;
    preview?: string;
    start?: number;
    end?: number;
  }>;
  nextCursor: string | null;
  limited: boolean;
  issues: string[];
};

export function rebuildSynthesisRetrievalExplorerRequest(
  value: unknown,
): SynthesisRetrievalExplorerRequest {
  return rebuildRetrievalDto("RetrievalExplorerRequest", value);
}

export function rebuildSynthesisRetrievalExplorerResult(
  value: unknown,
): SynthesisRetrievalExplorerResult {
  return rebuildRetrievalDto("RetrievalExplorerResult", value, "result");
}

/** Encoding identity binds vectors to a model, actual dimension, prefixes and Host options. */
export type SynthesisEncodingIdentity = {
  modelId: string;
  dimensions: number;
  queryPrefix: string;
  documentPrefix: string;
  encodingOptionsKey?: string;
};

export type SynthesisRetrievalProtocol =
  | "openai"
  | "ollama"
  | "tei"
  | "cohere"
  | "voyage"
  | "gemini";

export type SynthesisEmbeddingDiscoveryProtocol =
  | "openai"
  | "ollama"
  | "tei"
  | "cohere"
  | "gemini"
  | "none";

/** Nonsecret connection configuration. Credentials are keyed separately. */
export type SynthesisRetrievalConnection = {
  id: string;
  name: string;
  protocol: SynthesisRetrievalProtocol;
  baseUrl: string;
  modelId: string;
  queryPrefix: string;
  documentPrefix: string;
  dimensions?: number;
  embeddingUrl?: string;
  discovery?: {
    protocol: SynthesisEmbeddingDiscoveryProtocol;
    url?: string;
  };
  auth?: {
    type: "none" | "bearer" | "header";
    headerName?: string;
  };
  parameters?: {
    common?: Record<string, SynthesisJsonValue>;
    query?: Record<string, SynthesisJsonValue>;
    document?: Record<string, SynthesisJsonValue>;
  };
};

export type SynthesisRetrievalScope = {
  libraryIds: number[];
  sourceKinds: SynthesisSearchSourceKind[];
  includeTopics: boolean;
};

export type SynthesisRetrievalStatus = "missing" | "ready" | "paused";

export type SynthesisRetrievalProgress = {
  completedGroups: number;
  totalGroups: number;
  completedFragments: number;
  failedGroups: number;
  missingGroups: number;
};

export type SynthesisRetrievalState = {
  maintenance?: SynthesisPublicMaintenanceOperation | null;
  enabled: boolean;
  status: SynthesisRetrievalStatus;
  activeIdentity: SynthesisEncodingIdentity | null;
  pendingIdentity: SynthesisEncodingIdentity | null;
  activeScope: SynthesisRetrievalScope | null;
  pendingScope: SynthesisRetrievalScope | null;
  publication: string | null;
  progress: SynthesisRetrievalProgress;
  updatedAt: string | null;
  issues: SynthesisSearchIssue[];
};

export type SynthesisRetrievalMaintenanceRequest = {
  identity: SynthesisEncodingIdentity;
  scope: SynthesisRetrievalScope;
};

export type SynthesisEmbeddingDescribeRequest = Record<string, never>;

export type SynthesisEmbeddingDescribeResult = {
  enabled: boolean;
  identity: SynthesisEncodingIdentity | null;
};

export type SynthesisEmbeddingEncodePurpose = "query" | "document";

export type SynthesisEmbeddingEncodeRequest = {
  identity: SynthesisEncodingIdentity;
  purpose: SynthesisEmbeddingEncodePurpose;
  inputs: string[];
  deadlineAtMs: number;
};

export type SynthesisEmbeddingEncodeResult = {
  identity: SynthesisEncodingIdentity;
  vectors: number[][];
};

export type SynthesisPaperSimilarityMaterialKind =
  | "metadata"
  | "generated"
  | "weak";

export type SynthesisPaperSimilarityRequest = {
  paperRef: SynthesisPortableItemRef;
  limit?: number;
};

export type SynthesisPaperSimilarityResultItem = {
  paperRef: SynthesisPortableItemRef;
  title: string;
  excerpt: string;
  materialKind: SynthesisPaperSimilarityMaterialKind;
};

export type SynthesisPaperSimilarityResult = {
  status: "completed" | "limited" | "unavailable";
  materialKind: SynthesisPaperSimilarityMaterialKind;
  results: SynthesisPaperSimilarityResultItem[];
  issues: SynthesisSearchIssue[];
};

export type SynthesisRetrievalInvalidateRequest = {
  paperRefs: SynthesisPortableItemRef[];
};

function rebuildRetrievalDto<T>(
  definition: string,
  value: unknown,
  direction: "request" | "result" = "request",
): T {
  return rebuildSynthesisProtocolDto<T>({
    schemaId: SYNTHESIS_RETRIEVAL_SCHEMA_ID,
    definition,
    value,
    direction,
  });
}

export function rebuildSynthesisEncodingIdentity(
  value: unknown,
): SynthesisEncodingIdentity {
  return rebuildRetrievalDto("EncodingIdentity", value);
}

export function rebuildSynthesisRetrievalConnection(
  value: unknown,
): SynthesisRetrievalConnection {
  return rebuildRetrievalDto("RetrievalConnection", value);
}

export function rebuildSynthesisRetrievalScope(
  value: unknown,
): SynthesisRetrievalScope {
  return rebuildRetrievalDto("RetrievalScope", value);
}

export function rebuildSynthesisRetrievalState(
  value: unknown,
): SynthesisRetrievalState {
  return rebuildRetrievalDto("RetrievalState", value, "result");
}

export function rebuildSynthesisRetrievalMaintenanceRequest(
  value: unknown,
): SynthesisRetrievalMaintenanceRequest {
  return rebuildRetrievalDto("RetrievalMaintenanceRequest", value);
}

export function rebuildSynthesisEmbeddingDescribeRequest(
  value: unknown,
): SynthesisEmbeddingDescribeRequest {
  return rebuildRetrievalDto("EmbeddingDescribeRequest", value);
}

export function rebuildSynthesisEmbeddingDescribeResult(
  value: unknown,
): SynthesisEmbeddingDescribeResult {
  return rebuildRetrievalDto("EmbeddingDescribeResult", value, "result");
}

export function rebuildSynthesisEmbeddingEncodeRequest(
  value: unknown,
): SynthesisEmbeddingEncodeRequest {
  return rebuildRetrievalDto("EmbeddingEncodeRequest", value);
}

/**
 * Validates one response atomically: every vector must be finite, nonzero and
 * exactly the identity dimension. `expectedCount`, when supplied, additionally
 * binds the response vectors to their request inputs one-to-one.
 */
export function assertSynthesisEmbeddingVectors(
  vectors: number[][],
  dimensions: number,
  expectedCount?: number,
) {
  if (
    vectors.length === 0 ||
    (expectedCount !== undefined && vectors.length !== expectedCount)
  ) {
    throw new SynthesisClientError(
      "internal",
      "Embedding response vector count does not match its inputs",
    );
  }
  for (const vector of vectors) {
    if (vector.length !== dimensions) {
      throw new SynthesisClientError(
        "internal",
        "Embedding response vector dimension does not match its identity",
      );
    }
    let norm = 0;
    for (const component of vector) {
      // Every component must survive a float32 round trip: values that would
      // become float32 infinity are rejected before they can reach storage.
      const value = Math.fround(component);
      if (!Number.isFinite(value)) {
        throw new SynthesisClientError(
          "internal",
          "Embedding response vector contains a value that is not a finite float32",
        );
      }
      norm += value * value;
    }
    if (norm === 0) {
      throw new SynthesisClientError(
        "internal",
        "Embedding response vector has zero norm",
      );
    }
  }
}

export function rebuildSynthesisEmbeddingEncodeResult(
  value: unknown,
  expectedCount?: number,
): SynthesisEmbeddingEncodeResult {
  const result = rebuildRetrievalDto<SynthesisEmbeddingEncodeResult>(
    "EmbeddingEncodeResult",
    value,
    "result",
  );
  assertSynthesisEmbeddingVectors(
    result.vectors,
    result.identity.dimensions,
    expectedCount,
  );
  return result;
}

export function rebuildSynthesisPaperSimilarityRequest(
  value: unknown,
): SynthesisPaperSimilarityRequest {
  return rebuildRetrievalDto("PaperSimilarityRequest", value);
}

export function rebuildSynthesisPaperSimilarityResult(
  value: unknown,
): SynthesisPaperSimilarityResult {
  return rebuildRetrievalDto("PaperSimilarityResult", value, "result");
}

export function rebuildSynthesisRetrievalInvalidateRequest(
  value: unknown,
): SynthesisRetrievalInvalidateRequest {
  return rebuildRetrievalDto("RetrievalInvalidateRequest", value);
}
