# ACP Backend Presets

## Purpose

ACP backend presets are templates for creating local ACP backend profiles in Backend Manager. A preset defines its launch form, agent family, optional default environment variables, and optional isolated-environment rules. Selecting a preset creates an ordinary editable ACP profile; presets never rewrite existing saved profiles.

## Source Model

`src/modules/acpBackendPresets.ts` is the single source of truth:

```typescript
export type AcpBackendPreset = {
  id: AcpBackendPresetId;
  displayName: string;
  bareCommand: string;
  bareArgs: string[];
  npxPackage?: string;
  npxArgs?: string[];
  defaultEnv?: Record<string, string>;
  defaultUseNpx: boolean;
  supportsNpx: boolean;
  agentFamily: NonNullable<BackendInstance["acp"]>["agentFamily"];
  isolation?: AcpBackendPresetIsolation;
};
```

`defaultEnv` is static configuration injected into every profile created from the preset. `isolation` describes path-based environment variables or command arguments that are added only when the user selects **Isolated environment**. The generated `BackendInstance.env` merges both sets without changing the preset's command or arguments.

OpenCode and Kilo define a static permission configuration:

| Preset | Environment variable | Value |
|--------|----------------------|-------|
| OpenCode | `OPENCODE_CONFIG_CONTENT` | `{"permission":{"question":"deny"}}` |
| Kilo | `KILO_CONFIG_CONTENT` | `{"permission":{"question":"deny"}}` |

## Preset Inventory

| id | Bare command | Supports npx | Supports isolation |
|----|--------------|--------------|--------------------|
| `opencode` | `opencode acp` | Yes | `OPENCODE_CONFIG_DIR` |
| `codex` | `codex-acp` | Yes | `CODEX_HOME` |
| `claude-code` | `claude-agent-acp` | Yes | `CLAUDE_CONFIG_DIR` |
| `gemini-cli` | `gemini --experimental-acp` | Yes | `GEMINI_CLI_HOME` |
| `hermes` | `hermes acp` | No | `HERMES_HOME` |
| `qwen-code` | `qwen --acp --experimental-skills` | Yes | No |
| `github-copilot` | `copilot --acp --stdio` | Yes | No |
| `qoder-cli` | `qodercli --acp` | Yes | `QODER_CONFIG_DIR` |
| `cursor-agent-acp` | `cursor-agent-acp` | Yes | `--session-dir` |
| `deepagents` | `deepagents-acp` | Yes | No |
| `auggie` | `auggie --acp` | Yes | No |
| `kilo` | `kilo acp` | Yes | XDG config, data, and cache roots |
| `cline` | `cline --acp` | Yes | No |
| `codebuddy` | `codebuddy --acp` | Yes | No |
| `grok` | `grok agent stdio` | Yes | No |

When npx is selected, the profile command is `npx` and the preset's package and npx arguments are used. The profile id and display name receive the `(npm)` suffix. When isolation is selected for a supported preset, its profile id and display name receive the `(Isolated)` suffix.

## Backend Manager Integration

Backend Manager serializes the current preset data, including `defaultEnv`, into the dashboard snapshot. The dashboard uses this data to display the same environment-variable preview that the host creates through `createAcpBackendFromPresetOptions()`. The host remains authoritative when the user confirms the preset and returns the editable profile row.

For isolated profiles, managed roots are under:

```text
<getRuntimePersistencePaths().dataDir>/acp-backend-environments/<backendId>
```

The plugin creates only managed path values that still match the corresponding isolation rule. Static inline configuration values are never treated as directories.
