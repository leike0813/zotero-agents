export type PiCatalogModel = {
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
  source: "bundled" | "overlay" | "discovered";
  credentialRef?: string;
};
export type PiCatalog = {
  revision: string;
  models: PiCatalogModel[];
  overlayStatus: "none" | "cached" | "refreshed";
};
export type PiCredentialMaterial =
  | { kind: "api-key"; secret: string }
  | { kind: "mcp-secret"; secret: string }
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
  namespace: "model-provider" | "mcp-source";
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
  policy: Readonly<{
    contextWindow: number;
    maxTokens: number;
    input: readonly string[];
    supportsTools: boolean;
  }>;
}>;
