import { getPref, setPref } from "../utils/prefs";
import {
  defaultPiWebSources,
  piWebSourceTestBinding,
  PI_WEB_SOURCE_CATALOG,
  BRAVE_MCP_PACKAGE_VERSION,
  type PiWebSource,
  type PiWebSourceTestBinding,
  type PiWebSourceTestConnection,
  type PiWebSourceTestDescriptor,
  type PiWebSourceTestResult,
} from "../shared/piWebSourceContract";
import type {
  PiAuthVariant,
  PiModelConfiguration,
  PiProviderConnection,
  PiProviderConfigurationState,
  PiModelSelectionSnapshot,
} from "../shared/piProviderContract";
import { normalizeContext } from "@earendil-works/pi-ai";
import { loadPiProviderConfigurationState } from "./piProviderConfiguration";
import {
  getPiCredentialIdentityRevision,
  listPiCredentials,
  readPiCredential,
} from "./piCredentialStore";
import { sha256PrefixedHex } from "../utils/sha256";
import {
  requestPiBrokeredWebOperation,
  type PiBrokeredWebOperation,
  type PiBrokeredWebHttpResponse,
} from "./piBrokeredWebHttp";
import { classifyPiOutboundUrl } from "./piOutboundNetworkPolicy";
import type { PiCredentialMaterial } from "../shared/piProviderContract";
import type {
  PiGatewayToolDefinition,
  PiGatewayExecution,
} from "./piToolGateway";
import type { PiGatewayEffect } from "../shared/piToolGatewayContract";
import type { JsonValue } from "../workflows/types";
import {
  assertPiChatGPTInferenceAllowed,
  pausePiChatGPTInference,
  resolvePiChatGPTAccess,
} from "./piChatGPTAuth";
import { type PiChatGPTCompletedResponse } from "./piChatGPTProvider";
import { createPiProviderSource } from "./piProviderExecution";
import type { PiMcpConnection } from "./piMcpToolSources";
import { loadPiMcpToolSourceModule } from "./piMcpRuntimeOwner";
import type { PiMcpSource } from "../shared/piMcpSourceContract";
import { resolveNativeAbortControllerConstructor } from "../utils/wait";
import { readRuntimeTextFile } from "./runtimePersistence";
import Ajv from "ajv";

const OUTPUT_BYTES = 50 * 1024;
// Leave space for the Gateway envelope in the model's serialized tool result.
const DTO_BYTES = OUTPUT_BYTES - 2048;
function boundedSearch(result: PiWebSearchResult): PiWebSearchResult {
  result.query = bounded(result.query, 8192).text;
  while (new TextEncoder().encode(JSON.stringify(result.query)).length > 8192) {
    result.query = bounded(
      result.query,
      Math.floor(new TextEncoder().encode(result.query).length / 2),
    ).text;
    result.truncated = true;
  }
  while (new TextEncoder().encode(JSON.stringify(result)).length > DTO_BYTES) {
    result.truncated = true;
    if (result.resultKind === "raw_results" && result.results.length > 1)
      result.results.pop();
    else if (
      result.resultKind === "grounded_answer" &&
      result.actualQueries?.length
    )
      result.actualQueries.pop();
    else if (result.resultKind === "grounded_answer" && result.citations.length)
      result.citations.pop();
    else {
      const text =
        result.resultKind === "grounded_answer"
          ? result.answer
          : result.results[0].snippet;
      if (!text) fail("web_output_too_large", true);
      const size = new TextEncoder().encode(JSON.stringify(result)).length;
      if (result.resultKind === "grounded_answer")
        result.answer = bounded(
          result.answer,
          Math.max(
            0,
            new TextEncoder().encode(result.answer).length -
              (size - DTO_BYTES) -
              16,
          ),
        ).text;
      else
        result.results[0].snippet = bounded(
          result.results[0].snippet,
          Math.max(
            0,
            new TextEncoder().encode(result.results[0].snippet).length -
              (size - DTO_BYTES) -
              16,
          ),
        ).text;
    }
  }
  if (result.resultKind === "grounded_answer" && !result.citations.length)
    result.sourceEvidence = "unavailable";
  return result;
}
function bounded(text: string, limit = OUTPUT_BYTES) {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length <= limit) return { text, truncated: false };
  let end = limit;
  while (end > 0 && (bytes[end] & 0xc0) === 0x80) end--;
  return {
    text: new TextDecoder().decode(bytes.subarray(0, end)),
    truncated: true,
  };
}
export type PiWebFetchResult = {
  contentTrust: "external_untrusted";
  requestedUrl: string;
  finalUrl: string;
  contentType: string;
  title?: string;
  text: string;
  truncated: boolean;
};
export type PiWebSearchResult = {
  contentTrust: "external_untrusted";
  query: string;
  source: { id: string; kind: PiWebSource["kind"] };
  truncated: boolean;
} & (
  | {
      resultKind: "raw_results";
      results: {
        url: string;
        title: string;
        snippet: string;
        publishedAt?: string;
      }[];
    }
  | {
      resultKind: "grounded_answer";
      answer: string;
      citations: { url: string; title: string }[];
      actualQueries?: string[];
      sourceEvidence: "provided" | "unavailable";
    }
);
export type PiWebAttempt = {
  phase: "started" | "terminal";
  attemptId: string;
  sourceId: string;
  sourceKind: string;
  chainDigest: string;
  at: string;
  status?: "completed" | "failed";
  code?: string;
  modelId?: string;
  usage?: Record<string, number>;
};
type Options = {
  request?: (
    input: PiBrokeredWebOperation,
  ) => Promise<PiBrokeredWebHttpResponse>;
  parseHtml?: (html: string) => Document;
  readPackage?: (path: string) => Promise<string>;
  credential?: (
    id: string,
    namespace: "web-source" | "model-provider",
  ) => Promise<PiCredentialMaterial | null>;
  credentialRevision?: typeof getPiCredentialIdentityRevision;
  chatGPTAccess?: typeof resolvePiChatGPTAccess;
  chatGPTAuth?: {
    resolvePiChatGPTAccess?: typeof resolvePiChatGPTAccess;
    assertPiChatGPTInferenceAllowed?: typeof assertPiChatGPTInferenceAllowed;
    pausePiChatGPTInference?: typeof pausePiChatGPTInference;
  };
  resolveChatGPTSelection?: (
    target: PiWebNativeTarget,
    modelId: string,
  ) => Promise<PiModelSelectionSnapshot>;
  openMcp?: (
    source: PiMcpSource,
    values: Record<string, string>,
  ) => Promise<PiMcpConnection>;
  inspect?: (
    url: string,
  ) => Promise<{ origin: string; location: "public" | "private" | "loopback" }>;
};

class WebFailure extends Error {
  constructor(
    readonly code: string,
    readonly stop = false,
    readonly uncertain = false,
  ) {
    super(code);
  }
}
function fail(code: string, stop = false, uncertain = false): never {
  throw new WebFailure(code, stop, uncertain);
}
const object = (raw: unknown): Record<string, any> => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    fail("web_contract_invalid", true);
  return raw as Record<string, any>;
};
function safeUrl(raw: unknown): string {
  if (typeof raw !== "string") fail("web_contract_invalid", true);
  if (new TextEncoder().encode(raw).length > 8192)
    fail("web_contract_invalid", true);
  try {
    const url = new URL(raw);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      fail("web_contract_invalid", true);
    return url.href;
  } catch {
    fail("web_contract_invalid", true);
  }
}
function normalizeRaw(
  raw: unknown,
  query: string,
  source: PiWebSource,
  max: number,
): PiWebSearchResult {
  if (!Array.isArray(raw)) fail("web_contract_invalid", true);
  const records = raw.slice(0, max).map((row) => {
    const r = object(row);
    if (typeof r.title !== "string") fail("web_contract_invalid", true);
    const snippet =
      r.snippet ??
      r.content ??
      r.description ??
      r.text ??
      (Array.isArray(r.highlights) ? r.highlights.join("\n") : "");
    if (typeof snippet !== "string") fail("web_contract_invalid", true);
    return {
      url: safeUrl(r.url),
      title: bounded(r.title, 1024).text,
      snippet: bounded(snippet, 3500).text,
      ...(typeof (r.publishedAt ?? r.publishedDate) === "string"
        ? { publishedAt: bounded(r.publishedAt ?? r.publishedDate, 128).text }
        : {}),
    };
  });
  if (!records.length) fail("no_results");
  return {
    contentTrust: "external_untrusted",
    query,
    source: { id: source.id, kind: source.kind },
    resultKind: "raw_results",
    results: records,
    truncated:
      raw.length > max ||
      raw
        .slice(0, max)
        .some(
          (r) =>
            new TextEncoder().encode(
              r.snippet ?? r.content ?? r.description ?? r.text ?? "",
            ).length > 3500,
        ),
  };
}
function usageOf(raw: unknown): Record<string, number> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const values: Record<string, number> = {};
  for (const key of [
    "input_tokens",
    "output_tokens",
    "total_tokens",
    "num_search_queries",
  ]) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0)
      values[key] = value;
  }
  const searches = (raw as Record<string, any>).server_tool_use
    ?.web_search_requests;
  if (Number.isSafeInteger(searches) && searches >= 0)
    values.web_search_requests = searches;
  return Object.keys(values).length ? values : undefined;
}
function parseJsonResponse(
  response: PiBrokeredWebHttpResponse,
): Record<string, any> {
  if (response.status < 200 || response.status >= 300)
    fail(response.status === 429 ? "source_rate_limited" : "source_http_error");
  const text = new TextDecoder().decode(response.body);
  try {
    return object(JSON.parse(text));
  } catch (error) {
    if (error instanceof WebFailure) throw error;
    fail("web_contract_invalid", true);
  }
}
function grounded(
  data: Record<string, any>,
  query: string,
  source: PiWebSource,
  max: number,
  stopOnMissingEvidence = false,
): PiWebSearchResult {
  const anthropic = source.kind === "anthropic-native";
  const parts = anthropic ? data.content : data.output;
  if (!Array.isArray(parts)) fail("web_contract_invalid", true);
  const calls = parts.filter((p) =>
    anthropic
      ? p.type === "server_tool_use" && p.name === "web_search"
      : p.type === "web_search_call" && p.status === "completed",
  );
  if (
    anthropic &&
    parts.some(
      (p) =>
        p.type === "web_search_tool_result" &&
        calls.some((c) => c.id === p.tool_use_id) &&
        p.content?.type === "web_search_tool_result_error",
    )
  )
    fail("source_tool_error");
  if (
    !calls.length ||
    (anthropic &&
      !parts.some(
        (p) =>
          p.type === "web_search_tool_result" &&
          calls.some((c) => c.id === p.tool_use_id) &&
          Array.isArray(p.content),
      ))
  )
    fail("search_not_performed", stopOnMissingEvidence);
  if (anthropic && !["end_turn", "stop_sequence"].includes(data.stop_reason))
    fail("source_failed");
  if (!anthropic && data.status !== "completed") fail("source_failed");
  const texts = anthropic
    ? parts.filter((p) => p.type === "text")
    : parts
        .filter((p) => p.type === "message")
        .flatMap((p) =>
          Array.isArray(p.content)
            ? p.content.filter((c: any) => c.type === "output_text")
            : [],
        );
  if (texts.some((p) => typeof p.text !== "string"))
    fail("web_contract_invalid", true);
  const answer = bounded(texts.map((p) => p.text).join("\n"), 35 * 1024);
  if (!answer.text) fail("no_results");
  const citations: { url: string; title: string }[] = [];
  for (const part of texts)
    for (const citation of part.annotations ?? part.citations ?? []) {
      if (
        citation.type === "url_citation" ||
        citation.type === "web_search_result_location"
      )
        citations.push({
          url: safeUrl(citation.url),
          title: bounded(String(citation.title || ""), 1024).text,
        });
    }
  const queries = calls
    .flatMap((c) =>
      anthropic
        ? typeof c.input?.query === "string"
          ? [c.input.query]
          : []
        : Array.isArray(c.action?.queries)
          ? c.action.queries
          : typeof c.action?.query === "string"
            ? [c.action.query]
            : [],
    )
    .filter((q) => typeof q === "string")
    .slice(0, 10)
    .map((q) => bounded(q, 1024).text);
  const retained = citations.slice(0, max);
  if (stopOnMissingEvidence && !retained.length)
    fail("search_citations_missing", true);
  return {
    contentTrust: "external_untrusted",
    query,
    source: { id: source.id, kind: source.kind },
    resultKind: "grounded_answer",
    answer: answer.text,
    citations: retained,
    ...(queries.length ? { actualQueries: queries } : {}),
    sourceEvidence: retained.length ? "provided" : "unavailable",
    truncated: answer.truncated || retained.length < citations.length,
  };
}
function mcpRaw(raw: unknown, query: string, source: PiWebSource, max: number) {
  const data = object(raw);
  if (data.isError) fail("source_tool_error");
  if (data.structuredContent) {
    const structured = object(data.structuredContent);
    return normalizeRaw(
      structured.results ?? structured.web?.results,
      query,
      source,
      max,
    );
  }
  if (!Array.isArray(data.content) || data.content.length > 100)
    fail("web_contract_invalid", true);
  const text = data.content
    .filter((p: any) => p.type === "text" && typeof p.text === "string")
    .map((p: any) => p.text)
    .join("\n");
  if (new TextEncoder().encode(text).length > 1024 * 1024)
    fail("web_contract_invalid", true);
  if (!text) fail("web_contract_invalid", true);
  if (source.kind === "brave-mcp") {
    if (text.trim() === "No web results found") fail("no_results");
    try {
      return normalizeRaw(
        data.content
          .filter((p: any) => p.type === "text")
          .map((p: any) => JSON.parse(p.text)),
        query,
        source,
        max,
      );
    } catch (error) {
      if (error instanceof WebFailure) throw error;
      fail("web_contract_invalid", true);
    }
  }
  try {
    const json = JSON.parse(text);
    return normalizeRaw(
      Array.isArray(json) ? json : (json.results ?? json.web?.results),
      query,
      source,
      max,
    );
  } catch (error) {
    if (error instanceof WebFailure) throw error;
  }
  if (source.kind !== "exa-mcp") fail("web_contract_invalid", true);
  if (/^No search results found\./.test(text)) fail("no_results");
  const records = text.split(/\n\n---\n\n/).map((block) => {
    const title = block.match(/^Title: (.*)$/m)?.[1];
    const url = block.match(/^URL: (.*)$/m)?.[1];
    if (!title || !url) fail("web_contract_invalid", true);
    const publishedAt = block.match(/^Published: (.*)$/m)?.[1];
    const snippet = block
      .split(/\n(?:Highlights:\n|Text: )/)
      .slice(1)
      .join("\n");
    return {
      title,
      url,
      snippet,
      ...(publishedAt && publishedAt !== "N/A" ? { publishedAt } : {}),
    };
  });
  return normalizeRaw(records, query, source, max);
}

function readableHtml(document: Document, base: string) {
  const title = document.querySelector("title")?.textContent?.trim();
  document
    .querySelectorAll(
      "script,style,noscript,iframe,object,embed,template,form,input,button,select,textarea,svg,canvas,nav,header,footer",
    )
    .forEach((n: Element) => n.remove());
  const read = (node: Node | null): string => {
    if (!node) return "";
    if (node.nodeType === 3) return node.textContent || "";
    if (node.nodeType !== 1) return "";
    const element = node as Element;
    const text = Array.from(element.childNodes).map(read).join("");
    if (element.tagName === "BR") return "\n";
    if (element.tagName === "A") {
      try {
        const url = new URL(element.getAttribute("href") || "", base);
        if (
          ["http:", "https:"].includes(url.protocol) &&
          !url.username &&
          !url.password
        )
          return `${text} (${url.href})`;
      } catch {
        /* unusable link remains text */
      }
    }
    if (element.tagName === "LI") return `\n- ${text.trim()}\n`;
    return /^(P|DIV|SECTION|ARTICLE|MAIN|BLOCKQUOTE|PRE|H[1-6]|UL|OL|TR)$/.test(
      element.tagName,
    )
      ? `\n${text}\n`
      : text;
  };
  return {
    title,
    text: read(document.body)
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n\s*\n/g, "\n\n")
      .trim(),
  };
}

const KINDS = Object.values(PI_WEB_SOURCE_CATALOG).map((s) => s.kind);
const OPENAI_SEARCH_MODEL = /^(?:gpt-(?:4(?:[.]1|o)|[5-9])|o[34])(?:[.-]|$)/;
const ANTHROPIC_SEARCH_MODEL =
  /^claude-(?:(?:sonnet|opus|haiku)-4|3[.-]7-sonnet|3[.-]5-haiku)(?:[.-]|$)/;
/**
 * Server-side search whitelist. A ChatGPT registration runs the models its
 * catalog admits, so only explicit API-key connections are checked here.
 */
function searchModelAllowed(
  kind: PiWebSource["kind"],
  modelId: string,
  chatGPT = false,
): boolean {
  if (chatGPT) return true;
  if (kind === "openai-native") return OPENAI_SEARCH_MODEL.test(modelId);
  if (kind === "anthropic-native") return ANTHROPIC_SEARCH_MODEL.test(modelId);
  return true;
}
const FIELDS = new Set([
  "id",
  "kind",
  "label",
  "enabled",
  "credentialId",
  "modelConfigurationId",
  "searchModelId",
  "endpoint",
  "executable",
  "args",
  "localNetworkApprovedOrigin",
  "codeExecutionApproved",
]);
/**
 * The exact model card a native source runs, together with the connection that
 * owns its target and authentication. A source references one card and never
 * borrows the active selection.
 */
export type PiWebNativeTarget = {
  configurationId: string;
  connectionId: string;
  provider: string;
  modelId: string;
  authVariant: PiAuthVariant;
  credentialRef?: string;
  baseUrl?: string;
  api?: string;
  enabled: boolean;
  connection?: PiWebSourceTestConnection;
};
export type PiWebFrozenSource = {
  source: Readonly<PiWebSource>;
  native?: Readonly<PiWebNativeTarget>;
  chatGPTSelection?: PiModelSelectionSnapshot | null;
  credentialRevision: string | null;
};
export type PiWebTurn = {
  readonly digest: string;
  readonly sources: readonly PiWebFrozenSource[];
};

function normalizeSources(value: unknown): PiWebSource[] {
  if (!Array.isArray(value) || value.length > 32)
    throw new Error("web_source_invalid");
  const seen = new Set<string>();
  return value.map((raw) => {
    if (
      !raw ||
      typeof raw !== "object" ||
      Object.keys(raw).some((key) => !FIELDS.has(key))
    )
      throw new Error("web_source_invalid");
    if (
      !/^[\w.-]{1,128}$/.test(raw.id) ||
      seen.has(raw.id) ||
      !KINDS.includes(raw.kind) ||
      typeof raw.enabled !== "boolean" ||
      typeof raw.label !== "string" ||
      !raw.label.trim() ||
      raw.label.length > 128
    )
      throw new Error("web_source_invalid");
    for (const field of ["credentialId", "modelConfigurationId"])
      if (
        raw[field] !== undefined &&
        (typeof raw[field] !== "string" || !/^[\w.-]{1,128}$/.test(raw[field]))
      )
        throw new Error("web_source_invalid");
    for (const field of ["searchModelId", "executable"])
      if (
        raw[field] !== undefined &&
        (typeof raw[field] !== "string" || raw[field].length > 4096)
      )
        throw new Error("web_source_invalid");
    if (
      raw.args !== undefined &&
      (!Array.isArray(raw.args) ||
        raw.args.length > 32 ||
        raw.args.some(
          (arg: unknown) => typeof arg !== "string" || arg.length > 4096,
        ))
    )
      throw new Error("web_source_invalid");
    if (
      raw.codeExecutionApproved !== undefined &&
      typeof raw.codeExecutionApproved !== "boolean"
    )
      throw new Error("web_source_invalid");
    if (raw.endpoint !== undefined) {
      if (raw.kind !== "searxng" || typeof raw.endpoint !== "string")
        throw new Error("web_source_invalid");
      const facts = classifyPiOutboundUrl(raw.endpoint);
      if (new URL(facts.url).search) throw new Error("web_source_invalid");
      if (
        facts.scheme === "http:" &&
        facts.location !== "loopback" &&
        raw.credentialId
      )
        throw new Error("web_cleartext_credential_denied");
      raw = { ...raw, endpoint: facts.url };
    }
    if (
      raw.localNetworkApprovedOrigin !== undefined &&
      (typeof raw.localNetworkApprovedOrigin !== "string" ||
        !raw.endpoint ||
        new URL(raw.endpoint).origin !== raw.localNetworkApprovedOrigin)
    )
      throw new Error("web_source_invalid");
    seen.add(raw.id);
    return JSON.parse(JSON.stringify(raw));
  });
}

export function createPiBrokeredWebTools(options: Options = {}) {
  const request = options.request || requestPiBrokeredWebOperation;
  const revision =
    options.credentialRevision || getPiCredentialIdentityRevision;
  const resolveChatGPTSelection =
    options.resolveChatGPTSelection ||
    (async (target: PiWebNativeTarget, modelId: string) => {
      const [{ loadPiModelCatalog }, { resolvePiModelSelection }] =
        await Promise.all([
          import("./piModelCatalog"),
          import("./piProviderConfiguration"),
        ]);
      return resolvePiModelSelection({
        kind: "conversation",
        catalog: await loadPiModelCatalog(),
        credentials: listPiCredentials(),
        explicit: { configurationId: target.configurationId, modelId },
      });
    });
  const credential =
    options.credential ||
    (async (id, namespace) => {
      const read = await readPiCredential(id, namespace);
      return read.ok ? read.material : null;
    });
  const send = async (
    operation: PiBrokeredWebOperation,
  ): Promise<PiBrokeredWebHttpResponse> => {
    try {
      return await request(operation);
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (operation.signal?.aborted || code === "pi_network_aborted")
        fail("canceled", true, true);
      if (/^pi_network_/.test(code))
        fail(code, true, /timeout|failed/.test(code));
      fail("outcome_unknown", true, true);
    }
  };
  function listSources(): PiWebSource[] {
    const raw = String(getPref("piWebSourcesJson") || "");
    return raw ? normalizeSources(JSON.parse(raw)) : defaultPiWebSources();
  }
  function saveSources(sources: PiWebSource[]) {
    const normalized = normalizeSources(sources);
    setPref("piWebSourcesJson", JSON.stringify(normalized));
    return normalized;
  }
  async function withinBudget<T>(
    signal: AbortSignal,
    run: (boundedSignal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    const Controller = resolveNativeAbortControllerConstructor();
    if (!Controller) fail("source_unavailable");
    const controller = new Controller();
    let timeout = false;
    const stop = () => controller.abort();
    const timer = setTimeout(() => {
      timeout = true;
      stop();
    }, 120_000);
    signal.addEventListener("abort", stop, { once: true });
    try {
      if (signal.aborted) fail("canceled", true);
      return await run(controller.signal);
    } catch (error) {
      if (timeout) fail("web_timeout", true, true);
      throw error;
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", stop);
    }
  }
  async function freezeForTurn(
    model?: PiModelSelectionSnapshot,
  ): Promise<PiWebTurn> {
    let enabled: PiWebSource[] = [];
    try {
      enabled = listSources().filter((source) => source.enabled);
    } catch {
      /* Damaged optional sources contribute no search capability. */
    }
    const sources = await Promise.all(
      enabled.map((source) => freezeSource(source)),
    );
    const match = sources.findIndex(
      (s) =>
        ["openai-native", "anthropic-native"].includes(s.source.kind) &&
        s.source.modelConfigurationId === model?.configurationId,
    );
    if (match > 0) sources.unshift(...sources.splice(match, 1));
    const digest = await sha256PrefixedHex(
      new TextEncoder().encode(JSON.stringify(sources)),
    );
    if (!digest) throw new Error("web_identity_unavailable");
    return Object.freeze({ digest, sources: Object.freeze(sources) });
  }
  function providerState(): PiProviderConfigurationState | undefined {
    try {
      return loadPiProviderConfigurationState();
    } catch {
      /* Other sources remain available when model settings cannot load. */
      return undefined;
    }
  }
  /**
   * The model card a native source names, resolved together with the
   * connection that owns its target and authentication. The card's own model
   * and the source's explicit search model decide the effective model; the
   * active selection is never consulted.
   */
  function nativeTarget(
    state: PiProviderConfigurationState | undefined,
    source: PiWebSource,
  ): PiWebNativeTarget | undefined {
    if (
      !state ||
      !["openai-native", "anthropic-native"].includes(source.kind) ||
      !source.modelConfigurationId
    )
      return undefined;
    const configuration: PiModelConfiguration | undefined =
      state.configurations.find(
        (entry) => entry.id === source.modelConfigurationId,
      );
    const connection: PiProviderConnection | undefined = state.connections.find(
      (entry) => entry.id === configuration?.connectionId,
    );
    if (!configuration || !connection) return undefined;
    return {
      configurationId: configuration.id,
      connectionId: connection.id,
      provider: connection.provider,
      modelId: source.searchModelId || configuration.modelId,
      authVariant: connection.authVariant,
      ...(connection.credentialRef
        ? { credentialRef: connection.credentialRef }
        : {}),
      ...(connection.baseUrl ? { baseUrl: connection.baseUrl } : {}),
      ...(connection.api ? { api: connection.api } : {}),
      enabled: configuration.enabled && connection.enabled,
      connection: {
        connectionId: connection.id,
        provider: connection.provider,
        authVariant: connection.authVariant,
        ...(connection.credentialRef
          ? { credentialRef: connection.credentialRef }
          : {}),
        ...(connection.baseUrl ? { baseUrl: connection.baseUrl } : {}),
        ...(connection.api ? { api: connection.api } : {}),
        ...(connection.binding
          ? { bindingRevision: connection.binding.revision }
          : {}),
      },
    };
  }
  /**
   * One saved source frozen with its target, authentication and credential
   * identity. Turn freezing and explicit source testing share this single
   * resolution path, so a test can never be admitted by weaker rules than a
   * turn.
   */
  async function freezeSource(source: PiWebSource): Promise<PiWebFrozenSource> {
    const frozen = resolveFrozenSource(source);
    const native = frozen.native;
    let chatGPTSelection: PiModelSelectionSnapshot | null | undefined;
    if (source.kind === "openai-native" && native?.authVariant === "chatgpt") {
      try {
        chatGPTSelection = await resolveChatGPTSelection(
          native,
          native.modelId,
        );
      } catch {
        chatGPTSelection = null;
      }
    }
    return Object.freeze({
      ...frozen,
      ...(native?.authVariant === "chatgpt"
        ? { chatGPTSelection: chatGPTSelection ?? null }
        : {}),
    });
  }
  /** The saved source with its target, authentication and credential
   * identity, resolved without contacting any service. */
  function resolveFrozenSource(source: PiWebSource): PiWebFrozenSource {
    const native = nativeTarget(providerState(), source);
    if (source.args) Object.freeze(source.args);
    return Object.freeze({
      source: Object.freeze(source),
      ...(native ? { native: Object.freeze(native) } : {}),
      credentialRevision: revision(
        native?.credentialRef || source.credentialId || "",
        native ? "model-provider" : "web-source",
      ),
    });
  }
  function testBindingOf(frozen: PiWebFrozenSource): PiWebSourceTestBinding {
    return piWebSourceTestBinding({
      source: frozen.source,
      credentialRevision: frozen.credentialRevision,
      ...(frozen.native ? { modelId: frozen.native.modelId } : {}),
      ...(frozen.native?.connection
        ? { connection: frozen.native.connection }
        : {}),
    });
  }
  /**
   * What a saved source still needs before an explicit test can run it. The
   * settings page reads this instead of deciding readiness from the fields it
   * happens to display, so an incomplete source is never shown as ready.
   */
  function missingOf(
    source: PiWebSource,
    native: PiWebNativeTarget | undefined,
  ): string[] {
    const missing: string[] = [];
    if (native) {
      if (!native.connection) missing.push("connection");
      if (!native.credentialRef) missing.push("credential");
      if (native.authVariant === "none") missing.push("authentication");
      if (!native.enabled) missing.push("disabled_connection");
      if (
        !(source.kind === "openai-native"
          ? native.provider === "openai"
          : native.provider === "anthropic")
      )
        missing.push("provider");
      if (
        !searchModelAllowed(
          source.kind,
          native.modelId,
          native.authVariant === "chatgpt",
        )
      )
        missing.push("search_model");
      return missing;
    }
    if (
      ["tavily-mcp", "brave-mcp", "brave-http", "perplexity"].includes(
        source.kind,
      ) &&
      !source.credentialId
    )
      missing.push("credential");
    if (source.kind === "searxng" && !source.endpoint) missing.push("endpoint");
    if (source.kind === "brave-mcp") {
      if (!source.codeExecutionApproved) missing.push("code_execution");
      if (!source.executable) missing.push("executable");
      if (!source.args?.length) missing.push("arguments");
    }
    return missing;
  }
  function describeSavedSourceSync(
    id: string,
  ): PiWebSourceTestDescriptor | null {
    try {
      const source = listSources().find((s) => s.id === id);
      if (!source) return null;
      const frozen = resolveFrozenSource(source);
      const native = frozen.native;
      const binding = testBindingOf(frozen);
      return {
        ...binding,
        label: source.label,
        ...(native?.credentialRef
          ? { credentialId: native.credentialRef }
          : source.credentialId
            ? { credentialId: source.credentialId }
            : {}),
        ...(source.localNetworkApprovedOrigin
          ? { localNetworkApprovedOrigin: source.localNetworkApprovedOrigin }
          : {}),
        codeExecutionApproved: source.codeExecutionApproved === true,
        missing: missingOf(source, native),
      };
    } catch {
      return null;
    }
  }
  async function fetchPage(
    input: { url: string },
    signal: AbortSignal,
    localNetworkApprovedOrigin?: string,
  ): Promise<PiWebFetchResult> {
    const response = await request({
      kind: "fetch",
      url: input.url,
      signal,
      ...(localNetworkApprovedOrigin ? { localNetworkApprovedOrigin } : {}),
    });
    if (response.status < 200 || response.status >= 300) fail("web_http_error");
    const contentType = (response.headers["content-type"] || "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    const decoded = new TextDecoder().decode(response.body);
    let text = decoded,
      title: string | undefined;
    if (
      contentType === "text/html" ||
      contentType === "application/xhtml+xml"
    ) {
      const document = options.parseHtml
        ? options.parseHtml(decoded)
        : new DOMParser().parseFromString(decoded, "text/html");
      ({ text, title } = readableHtml(document, response.finalUrl));
    } else if (
      contentType !== "text/plain" &&
      contentType !== "application/json" &&
      !contentType.endsWith("+json")
    )
      fail("web_content_type_unsupported", true);
    else if (contentType.includes("json")) {
      try {
        text = JSON.stringify(JSON.parse(decoded), null, 2);
      } catch {
        fail("web_contract_invalid", true);
      }
    }
    const result: PiWebFetchResult = {
      contentTrust: "external_untrusted",
      requestedUrl: response.requestedUrl,
      finalUrl: response.finalUrl,
      contentType,
      ...(title ? { title: bounded(title, 1024).text } : {}),
      ...bounded(text),
    };
    while (
      new TextEncoder().encode(JSON.stringify(result)).length > DTO_BYTES
    ) {
      if (!result.text) fail("web_output_too_large", true);
      result.truncated = true;
      result.text = bounded(
        result.text,
        Math.floor(new TextEncoder().encode(result.text).length / 2),
      ).text;
    }
    return result;
  }
  async function sourceSearch(
    frozen: PiWebFrozenSource,
    query: string,
    max: number,
    signal: AbortSignal,
  ): Promise<{
    result: PiWebSearchResult;
    usage?: Record<string, number>;
    toolDigest?: string;
  }> {
    const source = frozen.source;
    if (source.kind.endsWith("-mcp")) {
      let secret: string | undefined;
      if (source.kind !== "exa-mcp") {
        if (
          !source.credentialId ||
          revision(source.credentialId, "web-source") !==
            frozen.credentialRevision
        )
          fail("source_unavailable");
        const material = await credential(source.credentialId, "web-source");
        if (material?.kind !== "web-secret") fail("source_unavailable");
        secret = material.secret;
        if (
          revision(source.credentialId, "web-source") !==
          frozen.credentialRevision
        )
          fail("source_unavailable");
      }
      if (source.kind === "brave-mcp") {
        if (
          !source.codeExecutionApproved ||
          !source.executable ||
          !source.args?.length
        )
          fail("source_unavailable");
        const entry = source.args[0].replace(/\\/g, "/");
        if (
          !/^(?:\/|[A-Za-z]:\/)/.test(entry) ||
          !entry.endsWith("/dist/index.js")
        )
          fail("source_unavailable");
        let manifest: Record<string, any>;
        try {
          manifest = object(
            JSON.parse(
              await (options.readPackage || readRuntimeTextFile)(
                entry.slice(0, -"dist/index.js".length) + "package.json",
              ),
            ),
          );
        } catch {
          fail("source_unavailable");
        }
        if (
          manifest.name !== "@brave/brave-search-mcp-server" ||
          manifest.version !== BRAVE_MCP_PACKAGE_VERSION
        )
          fail("source_unavailable");
      }
      const name =
        source.kind === "exa-mcp"
          ? "web_search_exa"
          : source.kind === "tavily-mcp"
            ? "tavily-search"
            : "brave_web_search";
      const slot =
        source.kind === "brave-mcp" ? "BRAVE_API_KEY" : "Authorization";
      const mcp: PiMcpSource = {
        id: source.id,
        label: source.label,
        transport: source.kind === "brave-mcp" ? "stdio" : "http",
        ...(source.kind === "brave-mcp"
          ? { executable: source.executable, argv: source.args }
          : {
              url:
                source.kind === "exa-mcp"
                  ? "https://mcp.exa.ai/mcp"
                  : "https://mcp.tavily.com/mcp/",
            }),
        enabled: true,
        credentialSlots: secret ? { [slot]: source.credentialId! } : {},
        authentication:
          slot === "Authorization"
            ? { kind: "bearer", field: "Authorization" }
            : { kind: "none" },
      };
      let client: PiMcpConnection;
      if (signal.aborted) fail("canceled", true);
      try {
        client = await (options.openMcp
          ? options.openMcp(mcp, secret ? { [slot]: secret } : {})
          : (await loadPiMcpToolSourceModule()).openPiMcpSource(
              mcp,
              () => {},
              secret ? { [slot]: secret } : {},
              signal,
            ));
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        if (signal.aborted) fail("canceled", true);
        if (/denied|approval_required/.test(code)) fail("policy_denied", true);
        fail("source_unavailable");
      }
      const close = () => {
        void client.close().catch(() => {});
      };
      signal.addEventListener("abort", close, { once: true });
      if (signal.aborted) {
        close();
        signal.removeEventListener("abort", close);
        fail("canceled", true);
      }
      try {
        const listed = await client.listTools(undefined, { timeout: 20_000 });
        if (
          !Array.isArray(listed.tools) ||
          listed.tools.length > 512 ||
          new TextEncoder().encode(JSON.stringify(listed.tools)).length >
            1024 * 1024
        )
          fail("web_contract_invalid", true);
        const tool = listed.tools.find((t) => t.name === name);
        if (!tool) fail("source_unavailable");
        const schema = object(tool.inputSchema);
        if (
          schema.type !== "object" ||
          schema.properties?.query?.type !== "string" ||
          !schema.required?.includes("query")
        )
          fail("web_contract_invalid", true);
        const args =
          source.kind === "exa-mcp"
            ? { query, objective: bounded(query, 4096).text, numResults: max }
            : source.kind === "tavily-mcp"
              ? { query, max_results: max }
              : { query, count: max, result_filter: ["web"] };
        try {
          if (
            !new Ajv({ strict: false, validateFormats: false }).compile(
              tool.inputSchema,
            )(args)
          )
            fail("web_contract_invalid", true);
        } catch {
          fail("web_contract_invalid", true);
        }
        const toolDigest = await sha256PrefixedHex(
          new TextEncoder().encode(
            JSON.stringify([
              tool.name,
              tool.description || "",
              tool.inputSchema,
            ]),
          ),
        );
        if (!toolDigest) fail("web_contract_invalid", true);
        let raw: unknown;
        try {
          raw = await client.callTool(
            { name, arguments: args },
            { signal, timeout: 120000, toolDefinition: tool },
          );
        } catch (error) {
          const code = error instanceof Error ? error.message : "";
          if (signal.aborted) fail("canceled", true, true);
          if (/denied|approval_required/.test(code))
            fail("policy_denied", true);
          fail("outcome_unknown", true, true);
        }
        return { result: mcpRaw(raw, query, source, max), toolDigest };
      } finally {
        signal.removeEventListener("abort", close);
        await client.close().catch(() => {});
      }
    }
    if (["openai-native", "anthropic-native"].includes(source.kind)) {
      const config = frozen.native;
      const openai = source.kind === "openai-native";
      const chatGPT = openai && config?.authVariant === "chatgpt";
      const expected = openai ? ["openai"] : ["anthropic"];
      if (
        !config?.enabled ||
        !expected.includes(config.provider) ||
        !config.credentialRef ||
        config.authVariant === "none"
      )
        fail("source_unavailable");
      const origin = config.baseUrl
        ? new URL(config.baseUrl).origin
        : openai
          ? "https://api.openai.com"
          : "https://api.anthropic.com";
      if (
        ![
          openai ? "https://api.openai.com" : "https://api.anthropic.com",
        ].includes(origin)
      )
        fail("source_unavailable");
      if (
        chatGPT &&
        ((config.baseUrl !== undefined &&
          config.baseUrl !== "https://api.openai.com/v1") ||
          (config.api !== undefined && config.api !== "openai-responses"))
      )
        fail("source_unavailable");
      if (
        revision(config.credentialRef, "model-provider") !==
        frozen.credentialRevision
      )
        fail("source_unavailable");
      const material = await credential(config.credentialRef, "model-provider");
      if (!material) fail("source_unavailable");
      if (
        (chatGPT && material.kind !== "chatgpt") ||
        (!chatGPT && material.kind !== "api-key")
      )
        fail("source_unavailable");
      if (
        revision(config.credentialRef, "model-provider") !==
        frozen.credentialRevision
      )
        fail("source_unavailable");
      const model = config.modelId;
      if (!searchModelAllowed(source.kind, model, chatGPT))
        fail("source_unavailable");
      if (chatGPT) {
        const selection = frozen.chatGPTSelection;
        if (
          !selection ||
          selection.configurationId !== config.configurationId ||
          selection.provider !== "openai" ||
          selection.api !== "openai-responses" ||
          selection.baseUrl !== "https://api.openai.com/v1" ||
          selection.authVariant !== "chatgpt" ||
          selection.credentialRef !== config.credentialRef ||
          selection.modelId !== model ||
          selection.policy.contextWindow <= 0 ||
          selection.policy.maxTokens < 0 ||
          !selection.policy.input.includes("text") ||
          !selection.metadata?.authVariants?.includes("chatgpt") ||
          ["retired", "unsupported"].includes(
            selection.metadata.availability || "",
          )
        )
          fail("source_unavailable", true);
        if (
          revision(config.credentialRef, "model-provider") !==
          frozen.credentialRevision
        )
          fail("source_unavailable", true);
        try {
          await (
            options.chatGPTAuth?.assertPiChatGPTInferenceAllowed ||
            assertPiChatGPTInferenceAllowed
          )(
            config.credentialRef,
            signal,
            undefined,
            frozen.credentialRevision || undefined,
          );
        } catch (error) {
          const code =
            typeof error === "object" && error && "code" in error
              ? String((error as { code?: unknown }).code)
              : "";
          if (code === "quota_paused" || code === "probe_active")
            fail("source_quota_paused", true);
          fail(signal.aborted ? "canceled" : "source_auth_failed", true);
        }

        let terminal: import("./piRuntime").PiProviderTerminal | undefined;
        let completed: PiChatGPTCompletedResponse | undefined;
        const prepared = createPiProviderSource(selection, {
          chatGPTAuth: {
            resolvePiChatGPTAccess:
              options.chatGPTAuth?.resolvePiChatGPTAccess ||
              options.chatGPTAccess ||
              resolvePiChatGPTAccess,
            ...(options.chatGPTAuth?.assertPiChatGPTInferenceAllowed
              ? {
                  assertPiChatGPTInferenceAllowed:
                    options.chatGPTAuth.assertPiChatGPTInferenceAllowed,
                }
              : {}),
            ...(options.chatGPTAuth?.pausePiChatGPTInference
              ? {
                  pausePiChatGPTInference:
                    options.chatGPTAuth.pausePiChatGPTInference,
                }
              : {}),
          },
          forceChatGPTWebSearch: true,
          disableChatGPTRetries: true,
          onChatGPTCompletedResponse: (response) => {
            completed = response;
          },
          fetch: async (input, init) => {
            let outgoing: Request;
            try {
              outgoing = new Request(input, init);
            } catch {
              fail("web_contract_invalid", true);
            }
            if (
              outgoing.url !== "https://api.openai.com/v1/responses" ||
              outgoing.method !== "POST"
            )
              fail("source_unavailable", true);
            const authorization = outgoing.headers.get("authorization");
            if (!authorization) fail("source_auth_failed", true);
            const response = await send({
              kind: "openai",
              url: outgoing.url,
              headers: {
                Authorization: authorization,
                "Content-Type": "application/json",
                Accept: "text/event-stream",
              },
              body: await outgoing.text(),
              signal: outgoing.signal,
            });
            return new Response(response.body, {
              status: response.status,
              headers: response.headers,
            });
          },
        });
        const events = await prepared.source({
          sessionId: `web-search:${source.id}`,
          turnId: `web-search:${source.id}`,
          invocationId: `web-search:${source.id}:invocation:0`,
          model: prepared.model,
          context: normalizeContext({
            messages: [{ role: "user", content: query, timestamp: 0 }],
          }),
          signal,
          onProviderTerminal: (value) => {
            terminal = value;
          },
        });
        let providerFailure: string | undefined;
        for await (const event of events) {
          if (event.type === "error")
            providerFailure = event.error.errorMessage;
          if (signal.aborted) break;
        }
        if (signal.aborted) fail("canceled", true, true);
        if (
          providerFailure === "provider_plan_quota_exceeded" ||
          (terminal?.status === "failed" &&
            terminal.code === "provider_plan_quota_exceeded")
        )
          fail("source_quota_paused", true);
        if (providerFailure) fail("source_failed", true, true);
        if (terminal?.status !== "completed" || !completed)
          fail(
            terminal?.status === "failed" && terminal.code
              ? terminal.code
              : "source_failed",
            true,
            true,
          );
        const result = grounded(
          { status: "completed", output: completed.output },
          query,
          source,
          max,
          true,
        );
        if (result.resultKind !== "grounded_answer")
          fail("source_failed", true);
        return {
          result,
          ...(completed.usage
            ? {
                usage: {
                  ...(completed.usage.inputTokens !== undefined
                    ? { input_tokens: completed.usage.inputTokens }
                    : {}),
                  ...(completed.usage.outputTokens !== undefined
                    ? { output_tokens: completed.usage.outputTokens }
                    : {}),
                  ...(completed.usage.totalTokens !== undefined
                    ? { total_tokens: completed.usage.totalTokens }
                    : {}),
                },
              }
            : {}),
        };
      }

      if (config.authVariant !== "api-key" || material.kind !== "api-key")
        fail("source_unavailable");
      const operation: PiBrokeredWebOperation = openai
        ? {
            kind: "openai",
            url: "https://api.openai.com/v1/responses",
            headers: {
              Authorization: `Bearer ${material.secret}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              input: query,
              tools: [{ type: "web_search" }],
              tool_choice: { type: "web_search" },
              store: false,
              stream: false,
              max_output_tokens: 4096,
            }),
          }
        : {
            kind: "anthropic",
            url: "https://api.anthropic.com/v1/messages",
            headers: {
              "x-api-key": material.secret,
              "anthropic-version": "2023-06-01",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              max_tokens: 4096,
              messages: [{ role: "user", content: query }],
              tools: [
                {
                  type: "web_search_20250305",
                  name: "web_search",
                  max_uses: 5,
                },
              ],
              tool_choice: { type: "tool", name: "web_search" },
              stream: false,
            }),
          };
      const data = parseJsonResponse(await send({ ...operation, signal }));
      return {
        result: grounded(data, query, source, max),
        usage: usageOf(data.usage),
      };
    }
    if (!source.credentialId && source.kind !== "searxng")
      fail("source_unavailable");
    if (
      source.credentialId &&
      revision(source.credentialId, "web-source") !== frozen.credentialRevision
    )
      fail("source_unavailable");
    const material = source.credentialId
      ? await credential(source.credentialId, "web-source")
      : null;
    if (source.credentialId && (!material || material.kind !== "web-secret"))
      fail("source_unavailable");
    if (
      source.credentialId &&
      revision(source.credentialId, "web-source") !== frozen.credentialRevision
    )
      fail("source_unavailable");
    const secret =
      material && material.kind === "web-secret" ? material.secret : undefined;
    let operation: PiBrokeredWebOperation;
    if (source.kind === "brave-http") {
      const url = new URL("https://api.search.brave.com/res/v1/web/search");
      url.searchParams.set("q", query);
      url.searchParams.set("count", String(max));
      operation = {
        kind: "brave",
        url: url.href,
        headers: { "X-Subscription-Token": secret! },
      };
    } else if (source.kind === "perplexity")
      operation = {
        kind: "perplexity",
        url: "https://api.perplexity.ai/search",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, max_results: max }),
      };
    else if (source.kind === "searxng") {
      if (!source.endpoint) fail("source_unavailable");
      const url = new URL(source.endpoint);
      url.searchParams.set("q", query);
      url.searchParams.set("format", "json");
      operation = {
        kind: "searxng",
        url: url.href,
        ...(secret ? { headers: { Authorization: secret } } : {}),
        localNetworkApprovedOrigin: source.localNetworkApprovedOrigin,
      };
    } else fail("source_unavailable");
    const data = parseJsonResponse(await send({ ...operation, signal }));
    return {
      result: normalizeRaw(
        source.kind === "brave-http" ? data.web?.results : data.results,
        query,
        source,
        max,
      ),
    };
  }
  async function searchChain(
    turn: PiWebTurn,
    input: { query: string; maxResults?: number },
    signal: AbortSignal,
    record: (attempt: PiWebAttempt) => Promise<void>,
  ): Promise<PiWebSearchResult> {
    const max = input.maxResults ?? 5;
    if (
      typeof input.query !== "string" ||
      !input.query.trim() ||
      new TextEncoder().encode(input.query).length > 8192 ||
      !Number.isInteger(max) ||
      max < 1 ||
      max > 10
    )
      fail("invalid_request", true);
    for (const source of turn.sources) {
      if (signal.aborted) fail("canceled", true);
      const base = {
        attemptId: `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
        sourceId: source.source.id,
        sourceKind: source.source.kind,
        chainDigest: turn.digest,
      };
      try {
        await record({
          ...base,
          phase: "started",
          at: new Date().toISOString(),
        });
      } catch {
        fail("evidence_failed", true);
      }
      let result: Awaited<ReturnType<typeof sourceSearch>> | undefined,
        error: WebFailure | undefined;
      try {
        result = await untilCanceled(signal, () =>
          sourceSearch(source, input.query, max, signal),
        );
      } catch (cause) {
        error =
          cause instanceof WebFailure
            ? cause
            : new WebFailure("web_contract_invalid", true);
      }
      try {
        await record({
          ...base,
          phase: "terminal",
          at: new Date().toISOString(),
          status: result ? "completed" : "failed",
          ...(error ? { code: error.code } : {}),
          ...(source.native ? { modelId: source.native.modelId } : {}),
          ...(result?.usage ? { usage: result.usage } : {}),
        });
      } catch {
        fail("receipt_failed", true, true);
      }
      if (error?.stop) throw error;
      if (result) return boundedSearch(result.result);
    }
    fail("search_unavailable");
  }
  function untilCanceled<T>(
    signal: AbortSignal,
    run: () => Promise<T>,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const stop = () => {
        signal.removeEventListener("abort", stop);
        reject(new WebFailure("canceled", true, true));
      };
      signal.addEventListener("abort", stop, { once: true });
      if (signal.aborted) {
        signal.removeEventListener("abort", stop);
        stop();
        return;
      }
      Promise.resolve()
        .then(run)
        .then(resolve, reject)
        .finally(() => signal.removeEventListener("abort", stop));
    });
  }
  async function search(
    turn: PiWebTurn,
    input: { query: string; maxResults?: number },
    signal: AbortSignal,
    record: (attempt: PiWebAttempt) => Promise<void>,
  ) {
    return withinBudget(signal, (boundedSignal) =>
      searchChain(turn, input, boundedSignal, record),
    );
  }
  async function testSource(
    id: string,
    requestId: string,
    signal?: AbortSignal,
  ): Promise<PiWebSourceTestResult> {
    const Controller = resolveNativeAbortControllerConstructor();
    if (!signal) {
      if (!Controller)
        return {
          sourceId: id,
          requestId,
          status: "unavailable" as const,
          code: "source_unavailable",
        };
      signal = new Controller().signal;
    }
    const saved = () => {
      try {
        return listSources().find((s) => s.id === id) || null;
      } catch {
        return null;
      }
    };
    const source = saved();
    if (!source)
      return {
        sourceId: id,
        requestId,
        status: "unavailable" as const,
        code: "source_unavailable",
      };
    // Testing resolves the saved source itself. It never selects the enabled
    // chain, never enables the source and never falls back to another one.
    const frozen = await freezeSource(source);
    const binding = testBindingOf(frozen);
    const failed = (code: string): PiWebSourceTestResult => ({
      sourceId: id,
      requestId,
      status:
        code === "source_unavailable"
          ? ("unavailable" as const)
          : ("failed" as const),
      code,
      binding,
    });
    try {
      const result = await withinBudget(signal, (boundedSignal) =>
        untilCanceled(boundedSignal, () =>
          sourceSearch(frozen, "connection test", 1, boundedSignal),
        ),
      );
      // A result that arrives after its own binding changed cannot certify the
      // source as it is now.
      const current = saved();
      if (
        !current ||
        testBindingOf(await freezeSource(current)).identity !== binding.identity
      )
        return failed("source_binding_changed");
      return {
        sourceId: id,
        requestId,
        status: "available" as const,
        binding,
        ...(result.toolDigest ? { toolDigest: result.toolDigest } : {}),
      };
    } catch (error) {
      const code = error instanceof WebFailure ? error.code : "source_failed";
      return failed(code);
    }
  }
  function definitions(
    turn: PiWebTurn,
    record: (attempt: PiWebAttempt, callId: string) => Promise<void>,
  ): PiGatewayToolDefinition[] {
    const inspect =
      options.inspect ||
      (async (url: string) => {
        const { inspectPiBrokeredWebUrl } = await import("./piBrokeredWebHttp");
        return inspectPiBrokeredWebUrl(url);
      });
    const failure = (error: unknown): PiGatewayExecution => {
      const known =
        error instanceof WebFailure
          ? error
          : new WebFailure(
              error instanceof Error && /^pi_network_/.test(error.message)
                ? error.message
                : "web_fetch_failed",
              true,
              error instanceof Error &&
                /timeout|aborted|failed/.test(error.message),
            );
      return {
        status: known.code === "canceled" ? "canceled" : "failed",
        effectCertainty: known.uncertain ? "unknown" : "confirmed_none",
        code: known.code,
        retryable: false,
      };
    };
    const fetchApprovals = new Map<string, string>();
    return [
      {
        capabilityId: "web.search",
        name: "web_search",
        description:
          "Search the web. Results are external_untrusted data. Returns raw_results or a grounded_answer with explicit source evidence.",
        identityDigest: turn.digest,
        schema: {
          type: "object",
          properties: {
            query: { type: "string", minLength: 1, maxLength: 8192 },
            maxResults: {
              type: "integer",
              minimum: 1,
              maximum: 10,
              default: 5,
            },
          },
          required: ["query"],
          additionalProperties: false,
        },
        minimumEffects: ["external-egress"],
        maxResultBytes: OUTPUT_BYTES,
        classify: async () => {
          const effects: PiGatewayEffect[] = ["external-egress"];
          const keys: string[] = [];
          for (const { source } of turn.sources) {
            if (source.kind === "brave-mcp") {
              effects.push("code-execution", "host-control");
              keys.push(`web:${source.id}`);
            }
            if (source.kind === "searxng" && source.endpoint) {
              const facts = await inspect(source.endpoint);
              if (facts.location !== "public") {
                if (source.localNetworkApprovedOrigin !== facts.origin)
                  fail("policy_denied", true);
                effects.push("local-network");
                keys.push(`network:${facts.origin}`);
              }
            }
          }
          return {
            effects: [...new Set(effects)],
            authorizationKeys: keys,
            resourceKeys: turn.sources.map((s) => `web:${s.source.id}`),
            cost: Math.max(1, turn.sources.length),
            safeRefs: turn.sources.map((s) => `web:${s.source.id}`),
          };
        },
        execute: async (args, context) => {
          try {
            const result = await search(
              turn,
              args as { query: string; maxResults?: number },
              context.signal,
              (a) => record(a, context.callId || ""),
            );
            return {
              status: "completed",
              effectCertainty: "confirmed_complete",
              value: result as unknown as JsonValue,
            };
          } catch (error) {
            return failure(error);
          }
        },
      },
      {
        capabilityId: "web.fetch",
        name: "web_fetch",
        description:
          "Read one anonymous webpage as external_untrusted text. Supports HTML, text and JSON; no cookies or credentials.",
        schema: {
          type: "object",
          properties: {
            url: { type: "string", minLength: 1, maxLength: 8192 },
          },
          required: ["url"],
          additionalProperties: false,
        },
        minimumEffects: ["external-egress"],
        maxResultBytes: OUTPUT_BYTES,
        classify: async (args) => {
          const url = (args as { url: string }).url;
          const facts = await inspect(url);
          if (facts.location !== "public")
            fetchApprovals.set(url, facts.origin);
          return {
            effects: [
              "external-egress",
              ...(facts.location !== "public"
                ? ["local-network" as const]
                : []),
            ],
            authorizationKeys:
              facts.location !== "public" ? [`network:${facts.origin}`] : [],
            resourceKeys: [`network:${facts.origin}`],
            cost: 1,
          };
        },
        execute: async (args, context) => {
          const url = (args as { url: string }).url;
          const approval = fetchApprovals.get(url);
          fetchApprovals.delete(url);
          try {
            return {
              status: "completed",
              effectCertainty: "confirmed_complete",
              value: (await fetchPage(
                args as { url: string },
                context.signal,
                approval,
              )) as unknown as JsonValue,
            };
          } catch (error) {
            return failure(error);
          }
        },
      },
    ];
  }
  return {
    listSources,
    saveSources,
    freezeForTurn,
    fetch: fetchPage,
    search,
    testSource,
    describeSavedSource: describeSavedSourceSync,
    definitions,
  };
}

let service: ReturnType<typeof createPiBrokeredWebTools> | undefined;
export function getPiBrokeredWebTools() {
  return (service ||= createPiBrokeredWebTools());
}
