import {
  SynthesisClientError,
  assertSynthesisEmbeddingVectors,
  rebuildSynthesisEmbeddingEncodeRequest,
  type SynthesisEmbeddingEncodePurpose,
  type SynthesisEmbeddingEncodeResult,
  type SynthesisEncodingIdentity,
  type SynthesisRetrievalConnection,
} from "../../../packages/synthesis-contracts/src";
import {
  resolveNativeAbortControllerConstructor,
  waitForBoundedPromise,
  type CancellationSignal,
} from "../../utils/wait";
import {
  synthesisEmbeddingRequestUrl,
  synthesisEmbeddingHeaders,
  synthesisEmbeddingBody,
  getSynthesisEmbeddingEncodingOptionsKey,
  validateSynthesisEmbeddingConnection,
} from "./synthesisEmbeddingProtocol";
export {
  resolveSynthesisEmbeddingEndpoints,
  getSynthesisEmbeddingEncodingOptionsKey,
} from "./synthesisEmbeddingProtocol";
import {
  discoverSynthesisEmbeddingModelsWithClient,
  inspectSynthesisEmbeddingModelWithClient,
} from "./synthesisEmbeddingDiscovery";
export type {
  SynthesisEmbeddingDiscoveryResult,
  SynthesisEmbeddingModel,
} from "./synthesisEmbeddingDiscovery";
export async function discoverSynthesisEmbeddingModels(
  args: Omit<
    Parameters<typeof discoverSynthesisEmbeddingModelsWithClient>[0],
    "client"
  > & { client?: SynthesisEmbeddingHttpClient },
) {
  return discoverSynthesisEmbeddingModelsWithClient({
    ...args,
    client: args.client ?? createSynthesisEmbeddingHttpClient(),
  });
}
export async function inspectSynthesisEmbeddingModel(
  args: Omit<
    Parameters<typeof inspectSynthesisEmbeddingModelWithClient>[0],
    "client"
  > & { client?: SynthesisEmbeddingHttpClient },
) {
  return inspectSynthesisEmbeddingModelWithClient({
    ...args,
    client: args.client ?? createSynthesisEmbeddingHttpClient(),
  });
}

export type SynthesisEmbeddingHttpRequest = {
  url: string;
  method?: "GET" | "POST";
  headers: Record<string, string>;
  body: string;
  timeoutMs: number;
  signal?: CancellationSignal;
};

export type SynthesisEmbeddingHttpResponse = {
  status: number;
  text: string;
  headers?: Record<string, string>;
};

export type SynthesisEmbeddingHttpClient = {
  request(
    args: SynthesisEmbeddingHttpRequest,
  ): Promise<SynthesisEmbeddingHttpResponse>;
};

export type SynthesisEmbeddingService = {
  connection: SynthesisRetrievalConnection;
  credential?: string;
};

export type SynthesisEmbeddingProbeResult = {
  dimensions: number;
  latencyMs: number;
};

export const SYNTHESIS_EMBEDDING_SYNTHETIC_QUERY =
  "zotero-agents embedding synthetic query";
export const SYNTHESIS_EMBEDDING_SYNTHETIC_DOCUMENT =
  "zotero-agents embedding synthetic document";

/**
 * Verified qwen3-embedding instruct format. Passages carry no prefix.
 */
export const SYNTHESIS_EMBEDDING_QWEN3_QUERY_PREFIX =
  "Instruct: Given a query, retrieve relevant passages that answer the query\nQuery:";

export type SynthesisEmbeddingPreset = {
  id: string;
  name: string;
  connection: Omit<SynthesisRetrievalConnection, "id" | "name">;
};

function qwen3Preset(args: {
  id: string;
  modelId: string;
  baseUrl: string;
}): SynthesisEmbeddingPreset {
  return {
    id: args.id,
    name: `${args.modelId} (${args.baseUrl})`,
    connection: {
      protocol: "ollama",
      baseUrl: args.baseUrl,
      modelId: args.modelId,
      queryPrefix: SYNTHESIS_EMBEDDING_QWEN3_QUERY_PREFIX,
      documentPrefix: "",
    },
  };
}

/** Presets fill new forms only; no connection is activated by default. */
export const SYNTHESIS_EMBEDDING_VERIFIED_PRESETS: SynthesisEmbeddingPreset[] =
  [
    qwen3Preset({
      id: "ollama-qwen3-embedding-0.6b-local",
      modelId: "qwen3-embedding:0.6b",
      baseUrl: "http://127.0.0.1:11434",
    }),
    qwen3Preset({
      id: "ollama-qwen3-embedding-4b-local",
      modelId: "qwen3-embedding:4b",
      baseUrl: "http://127.0.0.1:11434",
    }),
  ];

export const SYNTHESIS_EMBEDDING_PRESETS: SynthesisEmbeddingPreset[] = [
  ...SYNTHESIS_EMBEDDING_VERIFIED_PRESETS,
  ...(
    [
      [
        "openai",
        "OpenAI",
        "openai",
        "https://api.openai.com/v1",
        "text-embedding-3-small",
      ],
      ["ollama", "Ollama", "ollama", "http://127.0.0.1:11434", ""],
      ["lm-studio", "LM Studio", "openai", "http://127.0.0.1:1234/v1", ""],
      ["vllm", "vLLM", "openai", "http://127.0.0.1:8000/v1", ""],
      ["xinference", "Xinference", "openai", "http://127.0.0.1:9997/v1", ""],
      ["tei", "TEI", "tei", "http://127.0.0.1:8080", ""],
      ["cohere", "Cohere", "cohere", "https://api.cohere.com/v2", "embed-v4.0"],
      [
        "voyage",
        "Voyage",
        "voyage",
        "https://api.voyageai.com/v1",
        "voyage-3.5",
      ],
      [
        "gemini",
        "Gemini",
        "gemini",
        "https://generativelanguage.googleapis.com/v1beta",
        "gemini-embedding-001",
      ],
      ["azure", "Azure OpenAI", "openai", "", ""],
      [
        "jina",
        "Jina",
        "openai",
        "https://api.jina.ai/v1",
        "jina-embeddings-v3",
      ],
    ] as const
  ).map(([id, name, protocol, baseUrl, modelId]) => ({
    id,
    name,
    connection: {
      protocol,
      baseUrl,
      modelId,
      queryPrefix: "",
      documentPrefix: "",
      auth:
        protocol === "gemini"
          ? { type: "header" as const, headerName: "x-goog-api-key" }
          : { type: "bearer" as const },
      discovery: {
        protocol: protocol === "voyage" ? ("none" as const) : protocol,
      },
      ...(id === "azure"
        ? {
            auth: { type: "header" as const, headerName: "api-key" },
            discovery: { protocol: "none" as const },
          }
        : {}),
      ...(id === "jina"
        ? {
            discovery: { protocol: "none" as const },
            parameters: {
              query: { task: "retrieval.query" },
              document: { task: "retrieval.passage" },
            },
          }
        : {}),
    },
  })),
];

const RETRY_BASE_DELAY_MS = 250;
const DOCUMENT_ATTEMPT_BUDGET = 3;
const DEFAULT_PROBE_TIMEOUT_MS = 15_000;

export function createSynthesisEmbeddingHttpClient(): SynthesisEmbeddingHttpClient {
  return {
    async request(args) {
      const fetchImpl = (globalThis as { fetch?: typeof fetch }).fetch;
      if (typeof fetchImpl !== "function") {
        throw new SynthesisClientError(
          "unavailable",
          "Embedding HTTP transport is unavailable",
        );
      }
      const AbortControllerCtor = resolveNativeAbortControllerConstructor();
      const controller = AbortControllerCtor
        ? new AbortControllerCtor()
        : undefined;
      const abort = () => controller?.abort();
      if (args.signal?.aborted) abort();
      args.signal?.addEventListener("abort", abort, { once: true });
      const timer = setTimeout(abort, Math.max(1, args.timeoutMs));
      try {
        const response = await fetchImpl(args.url, {
          method: args.method ?? "POST",
          headers: args.headers,
          ...(args.method === "GET" ? {} : { body: args.body }),
          redirect: "error",
          ...(controller ? { signal: controller.signal } : {}),
        });
        const responseHeaders: Record<string, string> = {};
        response.headers?.forEach?.((value, key) => {
          responseHeaders[String(key).toLowerCase()] = value;
        });
        return {
          status: response.status,
          text: await response.text(),
          headers: responseHeaders,
        };
      } finally {
        clearTimeout(timer);
        args.signal?.removeEventListener("abort", abort);
      }
    },
  };
}

export function isSynthesisEmbeddingConnectionCompatible(
  connection: SynthesisRetrievalConnection,
  identity: SynthesisEncodingIdentity,
) {
  return (
    connection.modelId === identity.modelId &&
    (connection.dimensions === undefined ||
      connection.dimensions === identity.dimensions) &&
    connection.queryPrefix === identity.queryPrefix &&
    connection.documentPrefix === identity.documentPrefix &&
    getSynthesisEmbeddingEncodingOptionsKey(connection) ===
      identity.encodingOptionsKey
  );
}

function embeddingEndpoint(connection: SynthesisRetrievalConnection) {
  return synthesisEmbeddingRequestUrl(connection);
}

function embeddingBody(args: {
  connection: SynthesisRetrievalConnection;
  inputs: string[];
  purpose: SynthesisEmbeddingEncodePurpose;
}): string {
  return JSON.stringify(
    synthesisEmbeddingBody(args.connection, args.inputs, args.purpose),
  );
}

function embeddingHeaders(service: SynthesisEmbeddingService) {
  return synthesisEmbeddingHeaders(service.connection, service.credential);
}

type AssociationFailure = {
  retryable: boolean;
  message: string;
  retryAfterMs?: number;
};

/**
 * Respects a service wait hint instead of a blind backoff. Seconds and
 * HTTP-date forms are supported; unparsable hints fall back to undefined.
 */
function parseRetryAfterMs(headers?: Record<string, string>) {
  const raw = headers?.["retry-after"] ?? headers?.["Retry-After"];
  if (!raw) return undefined;
  const seconds = Number(raw.trim());
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1000);
  }
  const date = Date.parse(raw);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : undefined;
}

function openAiVectors(
  text: string,
  count: number,
): number[][] | AssociationFailure {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { retryable: true, message: "Embedding response is not JSON" };
  }
  const data = (parsed as { data?: unknown })?.data;
  if (!Array.isArray(data) || data.length !== count) {
    return {
      retryable: true,
      message: "Embedding response associations are incomplete",
    };
  }
  const byIndex: number[][] = new Array(count);
  for (const entry of data) {
    const record = entry as { index?: unknown; embedding?: unknown };
    const index = record?.index;
    if (
      !Number.isInteger(index) ||
      (index as number) < 0 ||
      (index as number) >= count ||
      byIndex[index as number] !== undefined ||
      !Array.isArray(record?.embedding)
    ) {
      return {
        retryable: true,
        message: "Embedding response association is ambiguous",
      };
    }
    byIndex[index as number] = record.embedding as number[];
  }
  if (byIndex.some((vector) => vector === undefined)) {
    return {
      retryable: true,
      message: "Embedding response is missing a vector",
    };
  }
  return byIndex;
}

function ollamaVectors(
  text: string,
  count: number,
  protocol: SynthesisRetrievalConnection["protocol"] = "ollama",
): number[][] | AssociationFailure {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { retryable: true, message: "Embedding response is not JSON" };
  }
  let embeddings =
    protocol === "tei"
      ? parsed
      : (parsed as { embeddings?: unknown })?.embeddings;
  if (protocol === "cohere")
    embeddings = (embeddings as { float?: unknown })?.float;
  if (protocol === "gemini" && Array.isArray(embeddings))
    embeddings = embeddings.map(
      (entry) => (entry as { values?: unknown })?.values,
    );
  if (!Array.isArray(embeddings) || embeddings.length !== count) {
    return {
      retryable: true,
      message: "Embedding response associations are incomplete",
    };
  }
  for (const vector of embeddings) {
    if (!Array.isArray(vector)) {
      return {
        retryable: true,
        message: "Embedding response vector is malformed",
      };
    }
  }
  return embeddings as number[][];
}

function retryableStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function isFailure(
  value: number[][] | AssociationFailure,
): value is AssociationFailure {
  return !Array.isArray(value);
}

/** Retry backoff that stays inside the shared deadline and is cancelable. */
async function waitForRetry(args: {
  sleep: (ms: number) => Promise<void>;
  delayMs: number;
  signal?: CancellationSignal;
}) {
  const signal = args.signal;
  if (!signal) {
    await args.sleep(args.delayMs);
    return;
  }
  if (signal.aborted) {
    throw new SynthesisClientError(
      "timeout",
      "Embedding retry wait was canceled",
    );
  }
  await new Promise<void>((resolve, reject) => {
    const onAbort = () =>
      reject(
        new SynthesisClientError(
          "timeout",
          "Embedding retry wait was canceled",
        ),
      );
    signal.addEventListener("abort", onAbort, { once: true });
    args.sleep(args.delayMs).then(
      () => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

export type SynthesisEmbeddingProvider = {
  encode(args: {
    identity: SynthesisEncodingIdentity;
    purpose: SynthesisEmbeddingEncodePurpose;
    inputs: string[];
    deadlineAtMs: number;
    services: SynthesisEmbeddingService[];
    signal?: CancellationSignal;
  }): Promise<SynthesisEmbeddingEncodeResult>;
  probe(args: {
    connection: SynthesisRetrievalConnection;
    credential?: string;
    deadlineAtMs?: number;
    signal?: CancellationSignal;
  }): Promise<SynthesisEmbeddingProbeResult>;
};

export function createSynthesisEmbeddingProvider(options?: {
  client?: SynthesisEmbeddingHttpClient;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}): SynthesisEmbeddingProvider {
  const client = options?.client ?? createSynthesisEmbeddingHttpClient();
  const now = options?.now ?? (() => Date.now());
  const sleep =
    options?.sleep ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  async function requestVectors(args: {
    service: SynthesisEmbeddingService;
    prefixedInputs: string[];
    timeoutMs: number;
    signal?: CancellationSignal;
    purpose: SynthesisEmbeddingEncodePurpose;
  }): Promise<number[][] | AssociationFailure> {
    let response: SynthesisEmbeddingHttpResponse;
    try {
      response = await waitForBoundedPromise(
        client.request({
          url: embeddingEndpoint(args.service.connection),
          headers: embeddingHeaders(args.service),
          body: embeddingBody({
            connection: args.service.connection,
            inputs: args.prefixedInputs,
            purpose: args.purpose,
          }),
          timeoutMs: args.timeoutMs,
          signal: args.signal,
        }),
        {
          timeoutMs: args.timeoutMs,
          signal: args.signal,
          phase: "embedding_request",
        },
      );
    } catch (error) {
      if (args.signal?.aborted) {
        throw new SynthesisClientError(
          "timeout",
          "Embedding encoding was canceled",
        );
      }
      return {
        retryable: true,
        message: "embedding_request_failed",
      };
    }
    if (response.status < 200 || response.status >= 300) {
      return {
        retryable: retryableStatus(response.status),
        message: `embedding_http_${response.status}`,
        retryAfterMs: parseRetryAfterMs(response.headers),
      };
    }
    return ["openai", "voyage"].includes(args.service.connection.protocol)
      ? openAiVectors(response.text, args.prefixedInputs.length)
      : ollamaVectors(
          response.text,
          args.prefixedInputs.length,
          args.service.connection.protocol,
        );
  }

  async function encodeBatch(
    args: Parameters<SynthesisEmbeddingProvider["encode"]>[0],
  ): Promise<SynthesisEmbeddingEncodeResult> {
    const request = rebuildSynthesisEmbeddingEncodeRequest({
      identity: args.identity,
      purpose: args.purpose,
      inputs: args.inputs,
      deadlineAtMs: args.deadlineAtMs,
    });
    const services = args.services.filter((service) =>
      isSynthesisEmbeddingConnectionCompatible(
        service.connection,
        request.identity,
      ),
    );
    for (const service of services)
      validateSynthesisEmbeddingConnection(service.connection);
    if (services.length === 0) {
      throw new SynthesisClientError(
        "unavailable",
        "No compatible embedding service is configured",
        { reason: "embedding_service_unavailable" },
      );
    }
    const prefix =
      request.purpose === "query"
        ? request.identity.queryPrefix
        : request.identity.documentPrefix;
    const prefixedInputs = request.inputs.map((input) => prefix + input);
    const totalBudget =
      request.purpose === "document"
        ? DOCUMENT_ATTEMPT_BUDGET
        : services.length;
    let attempts = 0;
    let lastFailure: AssociationFailure | undefined;
    let lastError: SynthesisClientError | undefined;
    for (const service of services) {
      let retrySameService = request.purpose === "document";
      for (;;) {
        if (args.signal?.aborted) {
          throw new SynthesisClientError(
            "timeout",
            "Embedding encoding was canceled",
          );
        }
        const remaining = request.deadlineAtMs - now();
        if (remaining <= 0) {
          throw new SynthesisClientError(
            "timeout",
            "Embedding encoding exceeded its deadline",
          );
        }
        attempts += 1;
        const vectors = await requestVectors({
          service,
          prefixedInputs,
          timeoutMs: remaining,
          signal: args.signal,
          purpose: request.purpose,
        });
        if (args.signal?.aborted || now() >= request.deadlineAtMs) {
          throw new SynthesisClientError(
            "timeout",
            "Embedding encoding exceeded its operation budget",
          );
        }
        if (!isFailure(vectors)) {
          try {
            assertSynthesisEmbeddingVectors(
              vectors,
              request.identity.dimensions,
              request.inputs.length,
            );
            return { identity: request.identity, vectors };
          } catch (error) {
            // A dimension or finite-float32 failure means the service is not
            // the identity's service. Skip it and spend the remaining shared
            // budget on the next selected service instead of aborting.
            lastFailure = {
              retryable: false,
              message:
                error instanceof Error
                  ? error.message
                  : "embedding_validation_failed",
            };
            break;
          }
        }
        lastFailure = vectors;
        const budgetLeft = attempts < totalBudget;
        if (!vectors.retryable || !retrySameService || !budgetLeft) {
          break;
        }
        // One same-service retry for documents, then the next selected service:
        // at most three total attempts including fallback under one deadline.
        retrySameService = false;
        const remainingForDelay = request.deadlineAtMs - now();
        const delay = Math.min(
          vectors.retryAfterMs ?? RETRY_BASE_DELAY_MS * attempts,
          Math.max(0, remainingForDelay),
        );
        if (delay < 0 || now() >= request.deadlineAtMs) {
          break;
        }
        await waitForRetry({ sleep, delayMs: delay, signal: args.signal });
      }
      if (attempts >= totalBudget) break;
    }
    if (attempts >= totalBudget && request.purpose === "document") {
      lastError = new SynthesisClientError(
        "unavailable",
        "Embedding document batch exhausted its attempt budget",
        { reason: lastFailure?.message ?? "embedding_attempts_exhausted" },
      );
    }
    throw (
      lastError ??
      new SynthesisClientError(
        "unavailable",
        "Every compatible embedding service failed",
        { reason: lastFailure?.message ?? "embedding_service_failed" },
      )
    );
  }

  async function encode(
    args: Parameters<SynthesisEmbeddingProvider["encode"]>[0],
  ): Promise<SynthesisEmbeddingEncodeResult> {
    const request = rebuildSynthesisEmbeddingEncodeRequest({
      identity: args.identity,
      purpose: args.purpose,
      inputs: args.inputs,
      deadlineAtMs: args.deadlineAtMs,
    });
    const matching = args.services.filter((service) =>
      isSynthesisEmbeddingConnectionCompatible(
        service.connection,
        request.identity,
      ),
    );
    const batchSize = Math.min(
      256,
      ...matching.map((service) =>
        service.connection.protocol === "cohere"
          ? 96
          : service.connection.protocol === "gemini"
            ? 100
            : service.connection.protocol === "voyage"
              ? 128
              : 256,
      ),
    );
    const vectors: number[][] = [];
    for (let start = 0; start < args.inputs.length; start += batchSize) {
      const result = await encodeBatch({
        ...args,
        inputs: args.inputs.slice(start, start + batchSize),
      });
      vectors.push(...result.vectors);
    }
    return { identity: request.identity, vectors };
  }

  async function probe(
    args: Parameters<SynthesisEmbeddingProvider["probe"]>[0],
  ): Promise<SynthesisEmbeddingProbeResult> {
    validateSynthesisEmbeddingConnection(args.connection);
    const startedAt = now();
    const deadlineAtMs = args.deadlineAtMs ?? now() + DEFAULT_PROBE_TIMEOUT_MS;
    const service: SynthesisEmbeddingService = {
      connection: args.connection,
      credential: args.credential,
    };
    const vectorsFor = async (purpose: SynthesisEmbeddingEncodePurpose) => {
      const remaining = deadlineAtMs - now();
      if (remaining <= 0) {
        throw new SynthesisClientError(
          "timeout",
          "Embedding connection test exceeded its deadline",
        );
      }
      const prefix =
        purpose === "query"
          ? args.connection.queryPrefix
          : args.connection.documentPrefix;
      const input = SYNTHESIS_EMBEDDING_SYNTHETIC_QUERY;
      const vectors = await requestVectors({
        service,
        prefixedInputs: [
          prefix +
            (purpose === "query"
              ? input
              : SYNTHESIS_EMBEDDING_SYNTHETIC_DOCUMENT),
        ],
        timeoutMs: remaining,
        signal: args.signal,
        purpose,
      });
      if (args.signal?.aborted || now() >= deadlineAtMs)
        throw new SynthesisClientError(
          "timeout",
          "Embedding test exceeded its budget",
        );
      if (isFailure(vectors)) {
        throw new SynthesisClientError(
          "unavailable",
          "Embedding connection test failed",
          { reason: vectors.message },
        );
      }
      return vectors;
    };
    const queryVectors = await vectorsFor("query");
    const documentVectors = await vectorsFor("document");
    const dimensions = queryVectors[0].length;
    if (
      args.connection.dimensions !== undefined &&
      dimensions !== args.connection.dimensions
    )
      throw new SynthesisClientError(
        "unavailable",
        "Embedding dimensions do not match configuration",
      );
    for (const vector of [...queryVectors, ...documentVectors]) {
      if (vector.length !== dimensions) {
        throw new SynthesisClientError(
          "internal",
          "Embedding connection test returned inconsistent dimensions",
        );
      }
    }
    assertSynthesisEmbeddingVectors(queryVectors, dimensions);
    assertSynthesisEmbeddingVectors(documentVectors, dimensions);
    return { dimensions, latencyMs: Math.max(0, now() - startedAt) };
  }

  return { encode, probe };
}
