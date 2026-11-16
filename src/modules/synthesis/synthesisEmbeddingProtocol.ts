import {
  SynthesisClientError,
  hashSynthesisContractCanonicalJson,
  type SynthesisRetrievalConnection,
  type SynthesisEmbeddingEncodePurpose,
  type SynthesisJsonValue,
} from "../../../packages/synthesis-contracts/src";

type JsonObject = Record<string, SynthesisJsonValue>;
export type EmbeddingConnectionDraft = Pick<
  SynthesisRetrievalConnection,
  "protocol" | "baseUrl"
> &
  Partial<SynthesisRetrievalConnection>;

function invalid(reason: string): never {
  throw new SynthesisClientError(
    "invalid_request",
    "Invalid embedding configuration",
    { reason },
  );
}

function httpUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return invalid("embedding_url_invalid");
  }
  if (
    !/^https?:$/.test(url.protocol) ||
    url.username ||
    url.password ||
    url.hash ||
    value.length > 2048
  )
    invalid("embedding_url_invalid");
  for (const name of url.searchParams.keys()) {
    if (/^(key|api[-_]?key|token|access_token|authorization)$/i.test(name))
      invalid("embedding_url_contains_credential");
  }
  return url;
}

/** Resolve draft roots; saved connections keep their historical base semantics. */
export function resolveSynthesisEmbeddingEndpoints(
  connection: EmbeddingConnectionDraft,
) {
  const url = httpUrl(connection.embeddingUrl || connection.baseUrl);
  let path = url.pathname.replace(/\/+$/, "");
  if (!connection.embeddingUrl) {
    switch (connection.protocol) {
      case "openai":
      case "voyage":
        if (!path.endsWith("/embeddings"))
          path += !path ? "/v1/embeddings" : "/embeddings";
        break;
      case "ollama":
        if (!path.endsWith("/api/embed"))
          path += path.endsWith("/api") ? "/embed" : "/api/embed";
        break;
      case "tei":
        if (!path.endsWith("/embed")) path += "/embed";
        break;
      case "cohere":
        if (!path.endsWith("/embed"))
          path += path.endsWith("/v2") ? "/embed" : "/v2/embed";
        break;
      case "gemini":
        if (!path.endsWith(":batchEmbedContents")) {
          if (!path) path = "/v1beta";
          const model = String(connection.modelId || "").replace(
            /^models\//,
            "",
          );
          path += `/models/${encodeURIComponent(model)}:batchEmbedContents`;
        }
        break;
      default:
        invalid("embedding_protocol_invalid");
    }
    url.pathname = path;
  }
  const discoveryProtocol =
    connection.discovery?.protocol ??
    (connection.protocol === "voyage" ? "none" : connection.protocol);
  let discoveryUrl: string | undefined;
  if (discoveryProtocol !== "none") {
    const discovery = httpUrl(connection.discovery?.url || url.toString());
    if (!connection.discovery?.url) {
      let root = url.pathname;
      if (connection.protocol === "gemini")
        root = root.replace(/\/models\/[^/]+:batchEmbedContents$/, "");
      else if (connection.protocol === "ollama")
        root = root.replace(/\/api\/embed$/, "");
      else if (connection.protocol === "tei")
        root = root.replace(/\/embed$/, "");
      else if (connection.protocol === "cohere")
        root = root.replace(/\/v2\/embed$/, "");
      else root = root.replace(/\/embeddings$/, "");
      const suffix = {
        openai: "/models",
        ollama: "/api/tags",
        tei: "/info",
        cohere: "/v1/models",
        gemini: "/models",
      }[discoveryProtocol];
      discovery.pathname = root + suffix;
      if (discoveryProtocol === "cohere")
        discovery.searchParams.set("endpoint", "embed");
    }
    discoveryUrl = discovery.toString();
  }
  return { embeddingUrl: url.toString(), discoveryUrl, discoveryProtocol };
}

export function synthesisEmbeddingRequestUrl(
  connection: SynthesisRetrievalConnection,
) {
  if (
    connection.embeddingUrl ||
    !["openai", "ollama"].includes(connection.protocol)
  )
    return resolveSynthesisEmbeddingEndpoints(connection).embeddingUrl;
  const url = httpUrl(connection.baseUrl);
  const path = url.pathname.replace(/\/+$/, "");
  const suffix =
    connection.protocol === "openai" ? "/embeddings" : "/api/embed";
  if (!path.endsWith(suffix)) url.pathname = path + suffix;
  return url.toString();
}

function options(
  connection: SynthesisRetrievalConnection,
  purpose: SynthesisEmbeddingEncodePurpose,
): JsonObject {
  const defaults: JsonObject =
    connection.protocol === "cohere"
      ? { input_type: purpose === "query" ? "search_query" : "search_document" }
      : connection.protocol === "voyage"
        ? { input_type: purpose }
        : connection.protocol === "gemini"
          ? {
              taskType:
                purpose === "query" ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT",
            }
          : {};
  return {
    ...defaults,
    ...connection.parameters?.common,
    ...connection.parameters?.[purpose],
  };
}

export function getSynthesisEmbeddingEncodingOptionsKey(
  connection: SynthesisRetrievalConnection,
): string | undefined {
  const query = options(connection, "query");
  const document = options(connection, "document");
  return Object.keys(query).length || Object.keys(document).length
    ? hashSynthesisContractCanonicalJson({ query, document })
    : undefined;
}

export function validateSynthesisEmbeddingConnection(
  connection: SynthesisRetrievalConnection,
) {
  httpUrl(connection.baseUrl);
  resolveSynthesisEmbeddingEndpoints(connection);
  const headerName = connection.auth?.headerName;
  if (
    connection.auth?.type === "header" &&
    (!headerName ||
      !/^[!#$%&'*+.^_`|~0-9A-Za-z-]{1,128}$/.test(headerName) ||
      /^(host|content-length|content-type|connection|cookie)$/i.test(
        headerName,
      ))
  )
    invalid("embedding_auth_header_invalid");
  const parameters = connection.parameters;
  if (parameters) {
    if (new TextEncoder().encode(JSON.stringify(parameters)).length > 16_384)
      invalid("embedding_parameters_too_large");
    const check = (value: unknown, depth: number) => {
      if (depth > 8) invalid("embedding_parameters_too_deep");
      if (value && typeof value === "object") {
        for (const [key, child] of Object.entries(value)) {
          if (["__proto__", "constructor", "prototype"].includes(key))
            invalid("embedding_parameter_invalid");
          if (
            /^(authorization|api[-_]?key|access_token|token|password|secret)$/i.test(
              key,
            )
          )
            invalid("embedding_parameter_contains_credential");
          check(child, depth + 1);
        }
      }
    };
    check(parameters, 0);
    const reserved = new Set([
      "model",
      "input",
      "inputs",
      "texts",
      "content",
      "requests",
      "dimensions",
      "output_dimension",
      "outputDimensionality",
      "encoding_format",
      "embedding_types",
      "output_dtype",
      "truncate",
      "truncation",
      "auto_truncate",
    ]);
    for (const part of Object.values(parameters)) {
      if (!part || Array.isArray(part) || Object.keys(part).length > 64)
        invalid("embedding_parameters_invalid");
      for (const key of Object.keys(part))
        if (reserved.has(key)) invalid("embedding_parameter_reserved");
    }
  }
}

export function synthesisEmbeddingHeaders(
  connection: EmbeddingConnectionDraft,
  credential?: string,
) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  const auth =
    connection.auth ??
    (connection.protocol === "gemini"
      ? { type: "header", headerName: "x-goog-api-key" }
      : { type: "bearer" });
  if (credential && auth.type !== "none") {
    if (/[\r\n]/.test(credential)) invalid("embedding_credential_invalid");
    if (auth.type === "header") {
      if (
        !auth.headerName ||
        !/^[!#$%&'*+.^_`|~0-9A-Za-z-]{1,128}$/.test(auth.headerName) ||
        /^(host|content-length|content-type|connection|cookie)$/i.test(
          auth.headerName,
        )
      )
        invalid("embedding_auth_header_invalid");
      headers[auth.headerName.toLowerCase()] = credential;
    } else headers.authorization = `Bearer ${credential}`;
  }
  return headers;
}

export function synthesisEmbeddingBody(
  connection: SynthesisRetrievalConnection,
  inputs: string[],
  purpose: SynthesisEmbeddingEncodePurpose,
) {
  const extra = options(connection, purpose);
  const dimensions = connection.dimensions;
  switch (connection.protocol) {
    case "openai":
      return {
        ...extra,
        model: connection.modelId,
        input: inputs,
        encoding_format: "float",
        ...(dimensions === undefined ? {} : { dimensions }),
      };
    case "ollama":
      return {
        ...extra,
        model: connection.modelId,
        input: inputs,
        truncate: false,
        ...(dimensions === undefined ? {} : { dimensions }),
      };
    case "tei":
      return {
        ...extra,
        inputs,
        truncate: false,
        ...(dimensions === undefined ? {} : { dimensions }),
      };
    case "cohere":
      return {
        ...extra,
        model: connection.modelId,
        texts: inputs,
        embedding_types: ["float"],
        truncate: "NONE",
        ...(dimensions === undefined ? {} : { output_dimension: dimensions }),
      };
    case "voyage":
      return {
        ...extra,
        model: connection.modelId,
        input: inputs,
        truncation: false,
        output_dtype: "float",
        ...(dimensions === undefined ? {} : { output_dimension: dimensions }),
      };
    case "gemini":
      return {
        requests: inputs.map((text) => ({
          ...extra,
          model: connection.modelId.startsWith("models/")
            ? connection.modelId
            : `models/${connection.modelId}`,
          content: { parts: [{ text }] },
          ...(dimensions === undefined
            ? {}
            : { outputDimensionality: dimensions }),
        })),
      };
  }
}
