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
      kind: "openai-codex";
      access: string;
      refresh: string;
      expiresAt: number;
      accountId: string;
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
export type PiAuthVariant = "none" | "api-key" | "openai-codex";
export type PiApiDialect = "openai-responses" | "openai-completions";
export type PiProviderConfiguration = {
  id: string;
  label: string;
  provider: string;
  modelId: string;
  authVariant: PiAuthVariant;
  credentialRef?: string;
  enabled: boolean;
  baseUrl?: string;
  api?: PiApiDialect;
  reasoning?: PiReasoningLevel;
  requiresLocalNetwork?: boolean;
  /** Saved connection whose original target could not be established; new turns are blocked until a target is accepted. */
  repairRequired?: boolean;
  binding?: {
    revision: number;
    api: string;
    baseUrl: string;
    model?: PiCatalogModel;
  };
};
export type PiSelection = {
  configurationId: string;
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
  version: 1;
  configurations: PiProviderConfiguration[];
  defaults: PiProviderDefaults;
  overlayPath: string;
};
export type PiModelSelectionSnapshot = Readonly<{
  configurationId: string;
  configurationLabel: string;
  provider: string;
  modelId: string;
  authVariant: PiAuthVariant;
  credentialRef?: string;
  api: string;
  baseUrl: string;
  reasoning: PiReasoningLevel;
  catalogRevision: string;
  adapterVersion: string;
  runtimeVersion: string;
  requiresLocalNetwork: boolean;
  bindingRevision?: number;
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
