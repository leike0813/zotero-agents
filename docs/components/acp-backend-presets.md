# ACP Backend Presets

## Purpose

ACP backend presets are templates for creating local ACP backend profiles in Backend Manager. A preset defines its launch form, agent family, optional default environment variables, and optional isolated-environment rules. Selecting a preset creates an ordinary editable ACP profile; presets never rewrite existing saved profiles.

## Source Model

`src/modules/acp/chat/acpBackendPresets.ts` is the single source of truth:

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

| Preset   | Environment variable      | Value                                |
| -------- | ------------------------- | ------------------------------------ |
| OpenCode | `OPENCODE_CONFIG_CONTENT` | `{"permission":{"question":"deny"}}` |
| Kilo     | `KILO_CONFIG_CONTENT`     | `{"permission":{"question":"deny"}}` |

## Preset Inventory

| id                 | Bare command                            | Supports npx | Supports isolation                                         |
| ------------------ | --------------------------------------- | ------------ | ---------------------------------------------------------- |
| `opencode`         | `opencode acp`                          | Yes          | `OPENCODE_CONFIG_DIR`                                      |
| `codex`            | `codex-acp`                             | Yes          | `CODEX_HOME`                                               |
| `claude-code`      | `claude-agent-acp`                      | Yes          | `CLAUDE_CONFIG_DIR`                                        |
| `gemini-cli`       | `gemini --acp`                          | Yes          | `GEMINI_CLI_HOME`                                          |
| `hermes`           | `hermes acp`                            | No           | `HERMES_HOME`                                              |
| `qwen-code`        | `qwen --acp`                            | Yes          | `QWEN_HOME`                                                |
| `github-copilot`   | `copilot --acp --stdio`                 | Yes          | `COPILOT_HOME`                                             |
| `qoder-cli`        | `qoder --acp`                           | Yes          | `QODER_CONFIG_DIR`                                         |
| `cursor-agent-acp` | `cursor-agent-acp`                      | Yes          | `--session-dir`                                            |
| `deepagents`       | `deepagents-acp`                        | Yes          | No                                                         |
| `auggie`           | `auggie --acp`                          | Yes          | No                                                         |
| `kilo`             | `kilo acp`                              | Yes          | XDG config, data, and cache roots                          |
| `cline`            | `cline --acp`                           | Yes          | `CLINE_DIR`                                                |
| `codebuddy`        | `codebuddy --acp`                       | Yes          | `CODEBUDDY_CONFIG_DIR`                                     |
| `grok`             | `grok agent stdio`                      | Yes          | `GROK_HOME`                                                |
| `cursor`           | `agent acp`                             | No           | `CURSOR_CONFIG_DIR`                                        |
| `kimi-code`        | `kimi acp`                              | Yes          | `KIMI_CODE_HOME`                                           |
| `minimax-code`     | `mcode acp`                             | Yes          | `MINIMAX_DATA_DIR`                                         |
| `mistral-vibe`     | `vibe-acp`                              | No           | `VIBE_HOME`                                                |
| `openhands`        | `openhands acp`                         | No           | `OPENHANDS_PERSISTENCE_DIR`, `OPENHANDS_CONVERSATIONS_DIR` |
| `deepseek-harness` | `dsh --profile acp`                     | Yes          | `DSH_HOME`                                                 |
| `factory-droid`    | `droid exec --output-format acp-daemon` | Yes          | No                                                         |
| `goose`            | `goose acp`                             | No           | `GOOSE_PATH_ROOT`                                          |
| `junie`            | `junie --acp=true`                      | No           | `JUNIE_HOME`                                               |
| `kiro-cli`         | `kiro-cli acp`                          | No           | No                                                         |
| `pi-acp`           | `pi-acp`                                | Yes          | `PI_CODING_AGENT_DIR`                                      |
| `amp-acp`          | `amp-acp`                               | Yes          | `AMP_ACP_STATE_DIR`                                        |
| `oh-my-pi`         | `omp acp`                               | No           | No                                                         |

When npx is selected, the profile command is `npx` and the preset's package and npx arguments are used. The profile id and display name receive the `(npm)` suffix. When isolation is selected for a supported preset, its profile id and display name receive the `(Isolated)` suffix.

`defaultUseNpx` is enabled for Codex, Claude Code, Factory Droid, Pi ACP, and Amp ACP. Every other preset defaults to its installed CLI. Factory Droid also carries the ACP registry's `DROID_DISABLE_AUTO_UPDATE=true` and `FACTORY_DROID_AUTO_UPDATE_ENABLED=false` default environment. MiniMax Code ships several executables, so it omits `npxPackage` and expresses its npm launch through `npxArgs: ["--package", "@minimax-ai/code@latest", "mcode", "acp"]`, which the existing builders and npx cache parser already handle.

## Installation Prerequisites

Disabling npx launches the preset's named executable, which must already be installed (for example `gemini`, `copilot`, `opencode`, or `kimi`). Presets without an npx option always use the installed CLI: Hermes, native Cursor (`agent`), Mistral Vibe, OpenHands, Goose, Junie, Kiro CLI, and Oh My Pi. Pi ACP and Amp ACP are adapters that additionally require the underlying Pi and Amp CLIs. Oh My Pi is Bun-based. npx-default presets require Node.js and npm, and the package is materialized into the managed cache on first use. Native Cursor isolation is distinct from the `cursor-agent-acp` adapter's `--session-dir` rule.

## Bounded Isolation Scope

Project configuration and inherited credential environment variables remain available to the agent. These options relocate declared storage paths rather than creating an operating-system sandbox.

Isolation only relocates the declared filesystem roots. Amp ACP (`AMP_ACP_STATE_DIR`) relocates adapter thread and session state only; Amp configuration and credentials remain independently configured. Native Cursor (`CURSOR_CONFIG_DIR`) relocates the Cursor configuration directory. Copilot's own cache and Goose's keyring remain outside the injected paths. Kilo XDG isolation covers the observed core state paths but does not prove every subcommand or plugin avoids global directories. Oh My Pi is Bun-based, exposes no isolation option, and is offered only as an installed command.

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

## Sources

Catalog metadata was refreshed against the agent-harness-wiki release published 2026-10-04T07:33:08.446Z (`web-v1-3abb002ae0cdc2d55a4303aac0a8c9760182063d`) together with the upstream documents and npm manifests below.

| Agent                                                      | Primary source                                                                                                                                                                                                     |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Gemini CLI                                                 | https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/acp-mode.md                                                                                                                                         |
| Qwen Code                                                  | https://github.com/QwenLM/qwen-code/blob/main/packages/cli/src/config/config.ts (deprecated `--experimental-skills`) and https://github.com/QwenLM/qwen-code/blob/main/docs/users/configuration/settings.md (home) |
| Qoder CLI                                                  | https://docs.qoder.com/cli/acp and https://docs.qoder.com/cli/installation.md                                                                                                                                      |
| GitHub Copilot                                             | https://docs.github.com/en/copilot/reference/copilot-cli-reference/acp-server and https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference.md                                   |
| Cline                                                      | https://docs.cline.bot/usage/acp and https://github.com/cline/cline/blob/main/sdk/packages/shared/src/storage/paths.ts                                                                                             |
| CodeBuddy                                                  | https://cnb.cool/codebuddy/codebuddy-code                                                                                                                                                                          |
| Cursor native ACP                                          | https://cursor.com/docs/cli/acp.md and https://cursor.com/docs/cli/reference/configuration.md                                                                                                                      |
| Cursor Agent ACP adapter (`@blowmage/cursor-agent-acp`)    | https://github.com/blowmage/cursor-agent-acp-npm                                                                                                                                                                   |
| Kimi Code Node CLI (`@moonshot-ai/kimi-code`)              | https://github.com/MoonshotAI/kimi-code                                                                                                                                                                            |
| MiniMax Code (`@minimax-ai/code`, multi-binary)            | https://github.com/MiniMax-AI/MiniMax-Code                                                                                                                                                                         |
| Mistral Vibe                                               | https://github.com/mistralai/mistral-vibe                                                                                                                                                                          |
| OpenHands CLI                                              | https://github.com/OpenHands/OpenHands-CLI                                                                                                                                                                         |
| DeepSeek Harness (`@deepseek-ai/dsh`, `dsh --profile acp`) | https://github.com/deepseek-ai/deepseek-harness/blob/da00f7f5358f2949383b35c14f548bc20187d80c/apps/cli/README.md                                                                                                   |
| Factory Droid command and env                              | https://github.com/agentclientprotocol/registry/blob/main/factory-droid/agent.json                                                                                                                                 |
| Goose                                                      | https://github.com/block/goose                                                                                                                                                                                     |
| Junie                                                      | https://github.com/agentclientprotocol/registry/blob/main/junie/agent.json and https://junie.jetbrains.com/docs/environment-variables.html                                                                         |
| Kiro CLI                                                   | https://kiro.dev/docs/cli/acp.md                                                                                                                                                                                   |
| Pi ACP adapter (`pi-acp`)                                  | https://github.com/svkozak/pi-acp                                                                                                                                                                                  |
| Pi coding agent (`PI_CODING_AGENT_DIR`)                    | https://github.com/earendil-works/pi/blob/83692682f095528f8b71652ddacff7075e36e893/packages/coding-agent/docs/configuration.md                                                                                     |
| Amp ACP adapter (`amp-acp`)                                | https://github.com/tao12345666333/amp-acp                                                                                                                                                                          |
| Amp                                                        | https://ampcode.com/manual                                                                                                                                                                                         |
| Grok Build (`grok agent stdio`, `GROK_HOME`)               | https://github.com/xai-org/grok-build                                                                                                                                                                              |
| Oh My Pi                                                   | https://github.com/can1357/oh-my-pi                                                                                                                                                                                |
