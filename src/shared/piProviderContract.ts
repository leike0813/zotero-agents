export type PiModelKnowledge = "known" | "unsupported" | "unknown";
export type PiModelCostRates = {
  /** USD per million tokens; absent rates remain unknown. */
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
};
export type PiModelCost = PiModelCostRates & {
  tiers?: (PiModelCostRates & { inputTokensAbove: number })[];
};
export type PiModelInputLimits = {
  maxRequestBytes?: number;
  images?: {
    maxPerMessage?: number;
    maxPerRequest?: number;
    resize?: {
      maxWidth?: number;
      maxHeight?: number;
      maxBytes?: number;
      jpegQuality?: number;
    };
  };
};
export type PiModelCompat = Record<
  string,
  boolean | number | string | readonly string[] | Record<string, unknown>
>;
export type PiModelMetadata = {
  type?: "chat";
  availability?: "available" | "unsupported" | "retired" | "missing";
  knowledge?: {
    context: PiModelKnowledge;
    output: PiModelKnowledge;
    input: PiModelKnowledge;
    tools: PiModelKnowledge;
    reasoning: PiModelKnowledge;
  };
  thinkingLevelMap?: Partial<Record<PiReasoningLevel, string | null>>;
  cost?: PiModelCost;
  promptCache?: { short?: number; long?: number };
  inputLimits?: PiModelInputLimits;
  compat?: PiModelCompat;
  samplingParams?: Record<string, number>;
  provenance?: {
    source: "official" | "overlay" | "discovered" | "retained";
    revision: string;
    schemaVersion: number;
    minimumPiVersion?: string;
  };
  declaredFields?: readonly string[];
  authVariants?: readonly PiAuthVariant[];
};
export type PiCatalogSourceState = {
  source: "seed" | "current" | "previous";
  revision: string;
  schemaVersion: number;
  runtimeVersion: string;
  status: "idle" | "checking" | "offline" | "failed";
  error?:
    | "network"
    | "timeout"
    | "canceled"
    | "too_large"
    | "incompatible"
    | "invalid"
    | "persistence"
    | "closed";
  checkedAt?: string;
  updatedAt?: string;
  autoUpdate: boolean;
  canRestore: boolean;
  overlayStatus: "none" | "cached" | "refreshed" | "failed";
  accounts?: Record<
    string,
    {
      checkedAt?: string;
      status: "idle" | "checking" | "failed";
      error?: string;
    }
  >;
};
export type PiOfficialCatalogSnapshot = {
  revision: string;
  schemaVersion: number;
  minimumPiVersion?: string;
  models: PiCatalogModel[];
};
export type PiCatalogModel = PiModelMetadata & {
  provider: string;
  id: string;
  name: string;
  api: string;
  baseUrl: string;
  contextWindow: number;
  maxTokens: number;
  input: readonly string[];
  supportsTools: boolean;
  reasoning: readonly string[];
  source: "bundled" | "official" | "overlay" | "discovered" | "retained";
  credentialRef?: string;
};
export type PiCatalog = {
  revision: string;
  models: PiCatalogModel[];
  overlayStatus: "none" | "cached" | "refreshed";
  state?: PiCatalogSourceState;
};
export type PiCredentialMaterial =
  | { kind: "api-key"; secret: string }
  | { kind: "mcp-secret"; secret: string }
  | { kind: "web-secret"; secret: string }
  | {
      kind: "chatgpt";
      access: string;
      refresh: string;
      expiresAt: number;
      idToken: string;
      issuer: string;
      subject: string;
      clientId: string;
      scope: string[];
    };
export type PiCredentialMetadata = {
  id: string;
  label: string;
  kind: PiCredentialMaterial["kind"];
  namespace: "model-provider" | "mcp-source" | "web-source";
  masked: string;
  updatedAt: string;
};
export type PiReasoningLevel =
  | "off"
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | "max";
export type PiAuthVariant = "none" | "api-key" | "chatgpt";

/**
 * Every API this project can execute against. A connection's target is one of
 * these; a hosted provider this build has no adapter for is refused as a reason
 * rather than routed somewhere an SDK happens to exist.
 */
export type PiExecutionApi =
  | "openai-responses"
  | "openai-completions"
  | "anthropic-messages"
  | "google-generative-ai";

/**
 * Wire-facing name for the executed API set. A connection's target is one of
 * these, so a form that narrowed it to the two OpenAI dialects would refuse the
 * Anthropic and Google connections this build does execute.
 */
export type PiApiDialect = PiExecutionApi;

/**
 * The public execution capability this project owns, in one place because both
 * the configuration owner and the executor answer the same question and may not
 * answer it differently.
 *
 * A provider absent here has no default execution API. Several catalog
 * providers publish models and parameters this build cannot execute; an SDK
 * count is not an adapter, so those are a reported reason rather than a guess.
 */
export const PI_PROVIDER_EXECUTION_APIS: Readonly<
  Record<string, PiExecutionApi>
> = {
  openai: "openai-responses",
  anthropic: "anthropic-messages",
  google: "google-generative-ai",
};

/**
 * The authentication variants that can run against each executed API. The
 * executor applies exactly these rules at dispatch, so a projected capability
 * never promises an authentication the executor would refuse.
 */
export const PI_API_AUTH_VARIANTS: Readonly<
  Record<PiExecutionApi, readonly PiAuthVariant[]>
> = {
  "openai-responses": ["api-key", "chatgpt"],
  "openai-completions": ["api-key", "none"],
  "anthropic-messages": ["api-key"],
  "google-generative-ai": ["api-key"],
};

/**
 * A saved model connection. A connection owns the provider parameters, the
 * authentication identity and the target it was accepted with; it never owns a
 * model. Cards reference it, so one key or registration serves many models.
 */
export type PiProviderConnection = {
  id: string;
  label: string;
  provider: string;
  authVariant: PiAuthVariant;
  credentialRef?: string;
  enabled: boolean;
  baseUrl?: string;
  api?: PiExecutionApi;
  requiresLocalNetwork?: boolean;
  /** Origin accepted when saving this local connection; turn permission remains scoped to its caller. */
  localNetworkApprovedOrigin?: string;
  /** Saved connection whose original target could not be established; new turns are blocked until a target is accepted. */
  repairRequired?: boolean;
  /** The target this connection was accepted with; a directory never redirects it. */
  binding?: {
    revision: number;
    api: PiExecutionApi;
    baseUrl: string;
  };
};
/**
 * A model configuration card. It owns the model, its reasoning level and the
 * target-specific description admitted for exactly this connection target; the
 * target and authentication itself stay on the connection.
 */
export type PiModelConfiguration = {
  id: string;
  connectionId: string;
  modelId: string;
  enabled: boolean;
  reasoning?: PiReasoningLevel;
  /** Bumped when the admitted description for this card changes. */
  binding?: {
    revision: number;
    model?: PiCatalogModel;
  };
};
export type PiSelection = {
  /** Identity of a model configuration card, never of a connection. */
  configurationId: string;
  /**
   * An explicit turn-level model override within the card's own connection. A
   * saved default never sets it; only a user acting on this turn may, and the
   * model has to belong to that connection.
   */
  modelId?: string;
  reasoning?: PiReasoningLevel;
};
export type PiProviderDefaults = {
  global?: PiSelection;
  conversation?: PiSelection;
  skillRun?: PiSelection;
  auxiliary?: PiSelection;
};
export type PiProviderConfigurationState = {
  version: 2;
  connections: PiProviderConnection[];
  /** Model configuration cards; every entry references one connection. */
  configurations: PiModelConfiguration[];
  defaults: PiProviderDefaults;
  overlayPath: string;
};
/**
 * Why a referenced card can or cannot run. A retained default keeps its
 * reference together with the reason it is currently unusable, so an edit
 * never silently drops what the user chose.
 */
export type PiModelAvailability =
  | { usable: true }
  | { usable: false; reason: string };
/**
 * What an explicit removal actually removes. Unrelated connections, other
 * owners sharing a credential and existing history are never swept.
 */
export type PiConnectionRemoval = {
  removedModelConfigurationIds: string[];
  clearedDefaultKeys: string[];
  /** Credentials whose last reference this removal removed and which were therefore released. */
  releasedCredentialIds: string[];
  /** Credentials that keep serving other connections, MCP sources or Web sources. */
  retainedCredentialIds: string[];
};
export type PiModelSelectionSnapshot = Readonly<{
  connectionId: string;
  connectionLabel: string;
  /** Identity of the model configuration card this turn runs. */
  configurationId: string;
  provider: string;
  modelId: string;
  authVariant: PiAuthVariant;
  credentialRef?: string;
  api: PiExecutionApi;
  baseUrl: string;
  reasoning: PiReasoningLevel;
  catalogRevision: string;
  adapterVersion: string;
  runtimeVersion: string;
  requiresLocalNetwork: boolean;
  /** Target revision of the connection. */
  bindingRevision?: number;
  /** Description revision of this card within the connection target. */
  modelBindingRevision?: number;
  selectionId?: string;
  metadata?: Readonly<PiModelMetadata>;
  policy: Readonly<
    PiModelMetadata & {
      contextWindow: number;
      maxTokens: number;
      input: readonly string[];
      supportsTools: boolean;
    }
  >;
}>;
