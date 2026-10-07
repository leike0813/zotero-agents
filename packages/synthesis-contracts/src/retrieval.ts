import { SynthesisClientError } from "./common.js";
import { rebuildSynthesisProtocolDto } from "./protocolSchema.js";
import type {
  SynthesisSearchIssue,
  SynthesisSearchSourceKind,
  SynthesisPortableItemRef,
} from "./search.js";

export const SYNTHESIS_RETRIEVAL_SCHEMA_ID =
  "https://zotero-agents.local/synthesis/sidecar-protocol/v1/retrieval.schema.json";

export const SYNTHESIS_RETRIEVAL_DEFAULT_LIMIT = 25;
export const SYNTHESIS_RETRIEVAL_MAX_RESULTS = 100;

/** Encoding identity binds vectors to a model, actual dimension and pair of prefixes. */
export type SynthesisEncodingIdentity = {
  modelId: string;
  dimensions: number;
  queryPrefix: string;
  documentPrefix: string;
};

export type SynthesisRetrievalProtocol = "openai" | "ollama";

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
