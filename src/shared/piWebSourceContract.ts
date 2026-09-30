// Shared contract between the Built-in Agent settings UI and the C11 Brokered
// Web domain owner. This file holds only DTOs, the canonical curated source
// catalog, and the service seam; it performs no network or preference access.

export type PiWebSourceKind =
  | "exa-mcp"
  | "tavily-mcp"
  | "brave-mcp"
  | "brave-http"
  | "searxng"
  | "perplexity"
  | "openai-native"
  | "anthropic-native";

// Saved array order is the aggregate web_search priority. Only Exa is enabled
// by default; every other source is explicit user opt-in.
export type PiWebSource = {
  id: string;
  kind: PiWebSourceKind;
  label: string;
  enabled: boolean;
  credentialId?: string;
  modelConfigurationId?: string;
  // Explicit compatible search model; overrides the bound model
  // configuration's modelId. The domain owner validates it against its
  // server-side search whitelist.
  searchModelId?: string;
  endpoint?: string;
  executable?: string;
  args?: string[];
  localNetworkApprovedOrigin?: string;
  codeExecutionApproved?: boolean;
  reviewedToolDigest?: string;
};

export type PiWebSourceTestResult = {
  sourceId: string;
  requestId: string;
  status: "available" | "unavailable" | "failed";
  code?: string;
  toolDigest?: string;
};

// The C11 domain owner (src/modules/piBrokeredWebTools.ts) implements this seam.
// listSources/saveSources are synchronous; testSource performs one explicit
// user-triggered probe and reports safe evidence only.
export type PiBrokeredWebToolsService = {
  listSources(): PiWebSource[];
  saveSources(sources: PiWebSource[]): PiWebSource[];
  testSource(
    id: string,
    requestId: string,
    signal?: AbortSignal,
  ): Promise<PiWebSourceTestResult>;
};

type PiCuratedWebSource = {
  kind: PiWebSourceKind;
  label: string;
  enabledByDefault: boolean;
};

export const PI_WEB_SOURCE_CATALOG: Record<string, PiCuratedWebSource> = {
  exa: { kind: "exa-mcp", label: "Exa", enabledByDefault: true },
  tavily: { kind: "tavily-mcp", label: "Tavily", enabledByDefault: false },
  "brave-mcp": {
    kind: "brave-mcp",
    label: "Brave (MCP)",
    enabledByDefault: false,
  },
  "brave-http": {
    kind: "brave-http",
    label: "Brave Search API",
    enabledByDefault: false,
  },
  searxng: { kind: "searxng", label: "SearXNG", enabledByDefault: false },
  perplexity: {
    kind: "perplexity",
    label: "Perplexity",
    enabledByDefault: false,
  },
  "openai-native": {
    kind: "openai-native",
    label: "OpenAI Web Search",
    enabledByDefault: false,
  },
  "anthropic-native": {
    kind: "anthropic-native",
    label: "Anthropic Web Search",
    enabledByDefault: false,
  },
};

export const PI_WEB_SOURCE_IDS = Object.keys(PI_WEB_SOURCE_CATALOG);

// Sources that may bill the user. Enabling one is the user's billing consent;
// UI warns and receipts keep only provider-reported usage.
export const PI_WEB_SOURCE_BILLABLE = new Set<PiWebSourceKind>([
  "tavily-mcp",
  "brave-mcp",
  "brave-http",
  "perplexity",
  "openai-native",
  "anthropic-native",
]);

export const BRAVE_MCP_PACKAGE_VERSION = "2.1.4";
// Project-reviewed hosted descriptor, 2026-09-30. Drift requires an explicit test/review.
export const EXA_SEARCH_TOOL_DIGEST =
  "sha256:ac8ab22bff2e6ce45d282a0a0ae8fc65b48a7b63e849805c31cbda59b3f7eb8e";

export function defaultPiWebSources(): PiWebSource[] {
  return PI_WEB_SOURCE_IDS.map((id) => {
    const entry = PI_WEB_SOURCE_CATALOG[id];
    return {
      id,
      kind: entry.kind,
      label: entry.label,
      enabled: entry.enabledByDefault,
    };
  });
}
