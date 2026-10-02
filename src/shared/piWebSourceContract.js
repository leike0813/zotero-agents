// Shared contract between the Built-in Agent settings UI and the C11 Brokered
// Web domain owner. This file holds only DTOs, the canonical curated source
// catalog, and the service seam; it performs no network or preference access.
export const PI_WEB_SOURCE_CATALOG = {
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
export const PI_WEB_SOURCE_BILLABLE = new Set([
    "tavily-mcp",
    "brave-mcp",
    "brave-http",
    "perplexity",
    "openai-native",
    "anthropic-native",
]);
export const BRAVE_MCP_PACKAGE_VERSION = "2.1.4";
// Project-reviewed hosted descriptor, 2026-09-30. Drift requires an explicit test/review.
export const EXA_SEARCH_TOOL_DIGEST = "sha256:ac8ab22bff2e6ce45d282a0a0ae8fc65b48a7b63e849805c31cbda59b3f7eb8e";
export function defaultPiWebSources() {
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
