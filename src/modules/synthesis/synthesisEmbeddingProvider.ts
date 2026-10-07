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
  type CancellationSignal,
} from "../../utils/wait";

export type SynthesisEmbeddingHttpRequest = {
  url: string;
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
    qwen3Preset({
      id: "ollama-qwen3-embedding-0.6b-remote",
      modelId: "qwen3-embedding:0.6b",
      baseUrl: "http://192.168.13.11:11434",
    }),
    qwen3Preset({
      id: "ollama-qwen3-embedding-4b-remote",
      modelId: "qwen3-embedding:4b",
      baseUrl: "http://192.168.13.11:11434",
    }),
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
          method: "POST",
          headers: args.headers,
          body: args.body,
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

function compatible(
  connection: SynthesisRetrievalConnection,
  identity: SynthesisEncodingIdentity,
) {
  return (
    connection.modelId === identity.modelId &&
    (connection.dimensions === undefined ||
      connection.dimensions === identity.dimensions) &&
    connection.queryPrefix === identity.queryPrefix &&
    connection.documentPrefix === identity.documentPrefix
  );
}

function embeddingEndpoint(connection: SynthesisRetrievalConnection) {
  const base = connection.baseUrl.replace(/\/+$/, "");
  return connection.protocol === "openai"
    ? `${base}/embeddings`
    : `${base}/api/embed`;
}

function embeddingBody(args: {
  connection: SynthesisRetrievalConnection;
  inputs: string[];
}): string {
  if (args.connection.protocol === "openai") {
    return JSON.stringify({
      model: args.connection.modelId,
      input: args.inputs,
      ...(args.connection.dimensions === undefined
        ? {}
        : { dimensions: args.connection.dimensions }),
    });
  }
  return JSON.stringify({
    model: args.connection.modelId,
    input: args.inputs,
    truncate: false,
    ...(args.connection.dimensions === undefined
      ? {}
      : { dimensions: args.connection.dimensions }),
  });
}

function embeddingHeaders(service: SynthesisEmbeddingService) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  const credential = String(service.credential || "").trim();
  if (credential && service.connection.protocol === "openai") {
    headers.authorization = `Bearer ${credential}`;
  }
  return headers;
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
): number[][] | AssociationFailure {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { retryable: true, message: "Embedding response is not JSON" };
  }
  const embeddings = (parsed as { embeddings?: unknown })?.embeddings;
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
  }): Promise<number[][] | AssociationFailure> {
    let response: SynthesisEmbeddingHttpResponse;
    try {
      response = await client.request({
        url: embeddingEndpoint(args.service.connection),
        headers: embeddingHeaders(args.service),
        body: embeddingBody({
          connection: args.service.connection,
          inputs: args.prefixedInputs,
        }),
        timeoutMs: args.timeoutMs,
        signal: args.signal,
      });
    } catch (error) {
      if (args.signal?.aborted) {
        throw new SynthesisClientError(
          "timeout",
          "Embedding encoding was canceled",
        );
      }
      return {
        retryable: true,
        message:
          error instanceof Error ? error.message : "embedding_request_failed",
      };
    }
    if (response.status < 200 || response.status >= 300) {
      return {
        retryable: retryableStatus(response.status),
        message: `embedding_http_${response.status}`,
        retryAfterMs: parseRetryAfterMs(response.headers),
      };
    }
    return args.service.connection.protocol === "openai"
      ? openAiVectors(response.text, args.prefixedInputs.length)
      : ollamaVectors(response.text, args.prefixedInputs.length);
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
    const services = args.services.filter((service) =>
      compatible(service.connection, request.identity),
    );
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

  async function probe(
    args: Parameters<SynthesisEmbeddingProvider["probe"]>[0],
  ): Promise<SynthesisEmbeddingProbeResult> {
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
      });
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
