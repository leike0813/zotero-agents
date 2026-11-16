import { SynthesisClientError } from "../../../packages/synthesis-contracts/src";
import {
  waitForBoundedPromise,
  type CancellationSignal,
} from "../../utils/wait";
import {
  resolveSynthesisEmbeddingEndpoints,
  synthesisEmbeddingHeaders,
  type EmbeddingConnectionDraft,
} from "./synthesisEmbeddingProtocol";
import type { SynthesisEmbeddingHttpClient } from "./synthesisEmbeddingProvider";

export type SynthesisEmbeddingModel = {
  id: string;
  name?: string;
  embedding: "supported" | "unsupported" | "unknown";
  dimensions?: number;
};
export type SynthesisEmbeddingDiscoveryResult = {
  status: "ok" | "unsupported" | "failed";
  models: SynthesisEmbeddingModel[];
  partial: boolean;
  diagnostics: { code: string }[];
};

export async function inspectSynthesisEmbeddingModelWithClient(args: {
  connection: EmbeddingConnectionDraft;
  credential?: string;
  client: SynthesisEmbeddingHttpClient;
  signal?: CancellationSignal;
}): Promise<SynthesisEmbeddingModel> {
  const model: SynthesisEmbeddingModel = {
    id: args.connection.modelId || "",
    embedding: "unknown",
  };
  if (args.connection.protocol !== "ollama" || !model.id) return model;
  const endpoints = resolveSynthesisEmbeddingEndpoints(args.connection);
  const url = new URL(endpoints.discoveryUrl || endpoints.embeddingUrl);
  url.pathname = url.pathname.replace(/\/api\/(tags|embed)$/, "/api/show");
  try {
    const response = await waitForBoundedPromise(
      args.client.request({
        url: url.toString(),
        method: "POST",
        body: JSON.stringify({ model: model.id }),
        headers: synthesisEmbeddingHeaders(args.connection, args.credential),
        timeoutMs: 15_000,
        signal: args.signal,
      }),
      {
        timeoutMs: 15_000,
        signal: args.signal,
        phase: "embedding_model_inspect",
      },
    );
    if (
      args.signal?.aborted ||
      response.status < 200 ||
      response.status >= 300 ||
      response.text.length > 2 * 1024 * 1024
    )
      return model;
    const data = JSON.parse(response.text);
    if (Array.isArray(data?.capabilities))
      model.embedding = data.capabilities.includes("embedding")
        ? "supported"
        : "unsupported";
    const dimensions = Object.entries(data?.model_info ?? {}).find(([key]) =>
      key.endsWith(".embedding_length"),
    )?.[1];
    if (
      typeof dimensions === "number" &&
      Number.isInteger(dimensions) &&
      dimensions > 0 &&
      dimensions <= 16384
    )
      model.dimensions = dimensions;
    return model;
  } catch {
    return model;
  }
}

export async function discoverSynthesisEmbeddingModelsWithClient(args: {
  connection: EmbeddingConnectionDraft;
  credential?: string;
  client: SynthesisEmbeddingHttpClient;
  signal?: CancellationSignal;
  deadlineAtMs?: number;
}): Promise<SynthesisEmbeddingDiscoveryResult> {
  const models: SynthesisEmbeddingModel[] = [];
  const seen = new Set<string>();
  const pages = new Set<string>();
  let partial = false;
  const deadline = Math.min(args.deadlineAtMs ?? Infinity, Date.now() + 15_000);
  try {
    const endpoints = resolveSynthesisEmbeddingEndpoints(args.connection);
    const protocol = endpoints.discoveryProtocol;
    if (!endpoints.discoveryUrl || protocol === "none")
      return {
        status: "unsupported",
        models,
        partial,
        diagnostics: [{ code: "embedding_discovery_unsupported" }],
      };
    let url = endpoints.discoveryUrl;
    for (let page = 0; page < 20; page++) {
      if (args.signal?.aborted || Date.now() >= deadline)
        throw new SynthesisClientError(
          "timeout",
          "Embedding discovery canceled",
        );
      if (pages.has(url)) {
        partial = true;
        break;
      }
      pages.add(url);
      const response = await waitForBoundedPromise(
        args.client.request({
          url,
          method: "GET",
          headers: synthesisEmbeddingHeaders(args.connection, args.credential),
          body: "",
          timeoutMs: deadline - Date.now(),
          signal: args.signal,
        }),
        {
          timeoutMs: deadline - Date.now(),
          signal: args.signal,
          phase: "embedding_discovery",
        },
      );
      if (args.signal?.aborted || Date.now() >= deadline)
        throw new SynthesisClientError(
          "timeout",
          "Embedding discovery canceled",
        );
      if (response.status < 200 || response.status >= 300)
        return {
          status: "failed",
          models,
          partial: models.length > 0,
          diagnostics: [{ code: `embedding_http_${response.status}` }],
        };
      if (new TextEncoder().encode(response.text).length > 2 * 1024 * 1024)
        throw new Error("embedding_discovery_response_too_large");
      const data = JSON.parse(response.text);
      const rows =
        protocol === "tei"
          ? [data]
          : protocol === "openai"
            ? data?.data
            : data?.models;
      if (!Array.isArray(rows))
        throw new Error("embedding_discovery_response_invalid");
      for (const row of rows) {
        const id =
          protocol === "tei"
            ? row?.model_id
            : protocol === "ollama"
              ? row?.name
              : protocol === "openai"
                ? row?.id
                : row?.name;
        if (
          typeof id !== "string" ||
          !id ||
          id.length > 512 ||
          Array.from(id).some(
            (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
          )
        )
          continue;
        if (seen.has(id)) continue;
        if (models.length >= 1000) {
          partial = true;
          break;
        }
        seen.add(id);
        const capabilities =
          protocol === "gemini"
            ? row?.supportedGenerationMethods
            : row?.capabilities;
        const embedding =
          protocol === "tei" || protocol === "cohere"
            ? "supported"
            : Array.isArray(capabilities)
              ? capabilities.some(
                  (value: unknown) =>
                    value === "embedding" ||
                    value === "embedContent" ||
                    value === "batchEmbedContents",
                )
                ? "supported"
                : "unsupported"
              : "unknown";
        const dimensions = Number(row?.embedding_dimension ?? row?.dimensions);
        models.push({
          id,
          ...(typeof row?.displayName === "string"
            ? { name: row.displayName }
            : {}),
          embedding,
          ...(Number.isInteger(dimensions) &&
          dimensions > 0 &&
          dimensions <= 16384
            ? { dimensions }
            : {}),
        });
      }
      const token =
        protocol === "gemini"
          ? data.nextPageToken
          : protocol === "cohere"
            ? data.next_page_token
            : undefined;
      if (!token || partial) break;
      if (typeof token !== "string" || token.length > 2048)
        throw new Error("embedding_discovery_response_invalid");
      const next = new URL(endpoints.discoveryUrl);
      next.searchParams.set(
        protocol === "gemini" ? "pageToken" : "page_token",
        token,
      );
      url = next.toString();
      if (page === 19) partial = true;
    }
    return {
      status: "ok",
      models,
      partial,
      diagnostics: partial ? [{ code: "embedding_discovery_partial" }] : [],
    };
  } catch (error) {
    const reason =
      error instanceof SynthesisClientError ? error.details?.reason : undefined;
    return {
      status: "failed",
      models,
      partial: models.length > 0,
      diagnostics: [
        {
          code: args.signal?.aborted
            ? "embedding_discovery_canceled"
            : Date.now() >= deadline
              ? "embedding_discovery_timeout"
              : typeof reason === "string"
                ? reason
                : "embedding_discovery_failed",
        },
      ],
    };
  }
}
