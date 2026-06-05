export type BackendManagementAuth = {
  kind?: "none" | "basic";
  username?: string;
  password?: string;
};

export type BackendInstance = {
  id: string;
  displayName?: string;
  type: string;
  baseUrl: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  auth?: {
    kind?: "none" | "bearer";
    token?: string;
  };
  defaults?: {
    headers?: Record<string, string>;
    timeout_ms?: number;
  };
  management_auth?: BackendManagementAuth;
  acp?: {
    agentFamily?:
      | "codex"
      | "claude-code"
      | "opencode"
      | "gemini-cli"
      | "hermes"
      | "qwen-code"
      | "unknown";
    skillRoots?: string[];
    connectionTest?: {
      status?: "untested" | "passed" | "failed" | "stale";
      testedAt?: string;
      configFingerprint?: string;
      error?: string;
    };
    runtimeOptionsCache?: {
      refreshedAt?: string;
      modes?: Array<{ id: string; label: string; description?: string }>;
      currentModeId?: string;
      rawModels?: Array<{ id: string; label: string; description?: string }>;
      currentRawModelId?: string;
      displayModels?: Array<{
        id: string;
        label: string;
        description?: string;
      }>;
      currentDisplayModelId?: string;
      reasoningEfforts?: Array<{
        id: string;
        label: string;
        description?: string;
      }>;
      currentReasoningEffortId?: string;
    };
  };
};

export type LoadedBackends = {
  sourcePath: string;
  backends: BackendInstance[];
  warnings: string[];
  errors: string[];
  invalidBackends: Record<string, string>;
  fatalError?: string;
};
