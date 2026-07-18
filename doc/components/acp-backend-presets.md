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

## Managed npx Launch Cache

All ACP profiles ultimately enter the same adapter-to-transport launch boundary. A direct `npx` command, or an `npx` executable immediately after the `--` separator of an `uv` wrapper, uses a plugin-owned cache unless the backend profile environment explicitly defines `NPM_CONFIG_CACHE` (case-insensitive). Values inherited from the Zotero host process are defaults, not explicit backend configuration, and are replaced by the managed cache overlay.

The managed location is:

```text
<getRuntimePersistencePaths().cacheDir>/acp-npx/<opaque-cache-key>/generation-N
```

The opaque key is derived only from normalized backend id, npx executable identity, and package specification. It does not encode credentials, arbitrary arguments, environment values, or the complete command line. Launches with the same key hold a single-flight lease through ACP `initialize`, so concurrent first-use package materialization cannot modify the same generation simultaneously.

If a managed launch fails with the narrow npm `_npx` rename conflict class (`ENOTEMPTY` or `EEXIST` together with rename context), the adapter closes the failed physical attempt, atomically selects a fresh generation, and retries initialize once. The failed generation is not deleted on the launch path; its files remain ordinary plugin cache content governed by runtime cache cleanup. Authentication, protocol, model, network, and unrelated npm failures are never retried by this policy.

An `NPM_CONFIG_CACHE` or `npm_config_cache` value explicitly configured on the backend profile remains authoritative. The plugin does not override, rotate, clean, or delete that cache, and failures retain the transport stderr and exit diagnostics.

## Backend Manager Integration

Backend Manager serializes the current preset data, including `defaultEnv`, into the dashboard snapshot. The dashboard uses this data to display the same environment-variable preview that the host creates through `createAcpBackendFromPresetOptions()`. The host remains authoritative when the user confirms the preset and returns the editable profile row.

For isolated profiles, managed roots are under:

```text
<getRuntimePersistencePaths().dataDir>/acp-backend-environments/<backendId>
```

The plugin creates only managed path values that still match the corresponding isolation rule. Static inline configuration values are never treated as directories.
