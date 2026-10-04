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
};

/**
 * Identity of one saved source as an explicit test executed it. Testing binds
 * to this, so a result can only describe the target, authentication and model
 * it actually ran against.
 */
export type PiWebSourceTestConnection = {
  connectionId: string;
  provider: string;
  authVariant: string;
  credentialRef?: string;
  baseUrl?: string;
  api?: string;
  /** Target revision the connection was accepted with. */
  bindingRevision?: number;
};

export type PiWebSourceTestBinding = {
  sourceId: string;
  kind: PiWebSourceKind;
  /**
   * Enablement, saved order and label are deliberately absent. Editing them
   * keeps applicable evidence; changing a target, authentication or model
   * produces a different identity and invalidates it.
   */
  identity: string;
  /** Applicable billing must be disclosed before the test is dispatched. */
  billable: boolean;
  credentialRevision: string | null;
  modelConfigurationId?: string;
  modelId?: string;
  endpoint?: string;
  /** A native source also identifies the connection that owns its target and
   * authentication, so changing that connection invalidates its evidence. */
  connection?: PiWebSourceTestConnection;
};

/**
 * What an explicit test needs to know about one saved source: the identity
 * evidence binds to, the permissions it runs under and what it still lacks. A
 * source with anything in the missing list is not testable yet.
 */
export type PiWebSourceTestDescriptor = PiWebSourceTestBinding & {
  label: string;
  credentialId?: string;
  localNetworkApprovedOrigin?: string;
  codeExecutionApproved: boolean;
  /** Stable codes naming what the saved source still needs. */
  missing: string[];
};

export type PiWebSourceTestResult = {
  sourceId: string;
  requestId: string;
  status: "available" | "unavailable" | "failed";
  code?: string;
  /** Captured when the test was dispatched, so a late result cannot certify a
   * binding that changed while it ran. */
  binding?: PiWebSourceTestBinding;
  /** Curated MCP descriptor evidence of the executed call. It is never a
   * dispatch gate and never a user-maintained review value. */
  toolDigest?: string;
};

// The C11 domain owner (src/modules/piBrokeredWebTools.ts) implements this seam.
// listSources/saveSources are synchronous; testSource executes exactly one
// saved source, enabled or not, and reports safe evidence only.
export type PiBrokeredWebToolsService = {
  listSources(): PiWebSource[];
  saveSources(sources: PiWebSource[]): PiWebSource[];
  /** Complete synchronous fact about one saved source: identity, permissions
   * and what it still needs. Settings pages read this instead of recomputing
   * it, so an unconfigured source is never presented as ready. */
  describeSavedSource(id: string): PiWebSourceTestDescriptor | null;
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

export function piWebSourceTestBinding(input: {
  source: PiWebSource;
  credentialRevision: string | null;
  modelId?: string;
  connection?: PiWebSourceTestConnection;
}): PiWebSourceTestBinding {
  const { source, credentialRevision, modelId, connection } = input;
  return {
    sourceId: source.id,
    kind: source.kind,
    identity: JSON.stringify([
      source.id,
      source.kind,
      source.credentialId ?? null,
      source.modelConfigurationId ?? null,
      source.searchModelId ?? null,
      modelId ?? null,
      connection
        ? [
            connection.connectionId,
            connection.provider,
            connection.authVariant,
            connection.credentialRef ?? null,
            connection.baseUrl ?? null,
            connection.api ?? null,
            connection.bindingRevision ?? null,
          ]
        : null,
      source.endpoint ?? null,
      source.executable ?? null,
      source.args ?? null,
      source.localNetworkApprovedOrigin ?? null,
      source.codeExecutionApproved ?? null,
      credentialRevision,
    ]),
    billable: PI_WEB_SOURCE_BILLABLE.has(source.kind),
    credentialRevision,
    ...(source.modelConfigurationId
      ? { modelConfigurationId: source.modelConfigurationId }
      : {}),
    ...(modelId ? { modelId } : {}),
    ...(source.endpoint ? { endpoint: source.endpoint } : {}),
    ...(connection ? { connection } : {}),
  };
}

/** Whether a stored test result still describes the source as it is now. */
export function piWebSourceTestEvidenceApplies(
  previous: PiWebSourceTestResult | null | undefined,
  current: PiWebSourceTestBinding | null | undefined,
): boolean {
  if (!previous || !current || !previous.binding) return false;
  return (
    previous.status === "available" &&
    previous.binding.identity === current.identity
  );
}

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
