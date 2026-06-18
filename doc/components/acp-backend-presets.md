# ACP Backend Presets

## Overview

ACP Backend Presets are templates for quickly creating ACP backends. Each preset defines a backend id, display name, command, arguments, agent family, and optionally managed environment variables. Applying a preset populates the Backend Manager dialog fields, and the user can edit or override before saving.

Ten presets are defined in `src/modules/acpBackendPresets.ts`. One (`opencode`) is marked `builtIn: true` and is automatically injected into the backend registry at startup. The other presets are available through the Backend Manager UI's "Add Preset" dropdown menu.

Four presets are isolated-environment variants. They target agent CLIs that support a documented environment variable for moving configuration and session/state persistence into a separate root. OpenCode and Qwen Code do not have isolated variants: OpenCode only exposes partial config relocation for this purpose, and Qwen Code does not currently expose a confirmed full config/session root override.

## Type Model

```typescript
// src/modules/acpBackendPresets.ts:10-26
export type AcpBackendPresetId =
  | "opencode"
  | "codex"
  | "codex-isolated"
  | "claude-code"
  | "claude-code-isolated"
  | "gemini-cli"
  | "gemini-cli-isolated"
  | "hermes"
  | "hermes-isolated"
  | "qwen-code";

export type AcpBackendPreset = {
  id: AcpBackendPresetId;
  backendId: string;
  displayName: string;
  command: string;
  args: string[];
  agentFamily: NonNullable<BackendInstance["acp"]>["agentFamily"];
  builtIn?: boolean;
};
```

### Field Mapping: Preset → BackendInstance

| Preset field | BackendInstance field | Notes |
|-------------|----------------------|-------|
| `backendId` | `id` | Unique backend identifier (e.g. `acp-opencode`) |
| `displayName` | `displayName` | Shown in Backend Manager and dialogs |
| — | `type` | Always set to `"acp"` |
| — | `baseUrl` | Always set to `local://<backendId>` |
| — | `auth` | Always `{ kind: "none" }` |
| managed env | `env` | Only isolated presets set backend environment variables |
| `agentFamily` | `acp.agentFamily` | Must match one of the known agent families |
| `command` + `args` | (used by ACP transport) | Determines how the ACP process is launched |

## Preset Inventory

| id | backendId | displayName | agentFamily | command | args | env | builtIn |
|----|-----------|-------------|-------------|---------|------|-----|---------|
| `opencode` | `acp-opencode` | OpenCode ACP | `opencode` | `npx` | `["opencode-ai@latest", "acp"]` | — | ✅ |
| `codex` | `acp-codex` | Codex ACP | `codex` | `npx` | `["@zed-industries/codex-acp@latest"]` | — | — |
| `codex-isolated` | `acp-codex-isolated` | Codex ACP (Isolated Environment) | `codex` | `npx` | `["@zed-industries/codex-acp@latest"]` | `CODEX_HOME` | — |
| `claude-code` | `acp-claude-code` | Claude Code ACP | `claude-code` | `npx` | `["@agentclientprotocol/claude-agent-acp@latest"]` | — | — |
| `claude-code-isolated` | `acp-claude-code-isolated` | Claude Code ACP (Isolated Environment) | `claude-code` | `npx` | `["@agentclientprotocol/claude-agent-acp@latest"]` | `CLAUDE_CONFIG_DIR` | — |
| `gemini-cli` | `acp-gemini-cli` | Gemini CLI ACP | `gemini-cli` | `npx` | `["@google/gemini-cli@latest", "--experimental-acp"]` | — | — |
| `gemini-cli-isolated` | `acp-gemini-cli-isolated` | Gemini CLI ACP (Isolated Environment) | `gemini-cli` | `npx` | `["@google/gemini-cli@latest", "--experimental-acp"]` | `GEMINI_CLI_HOME` | — |
| `hermes` | `acp-hermes` | Hermes ACP | `hermes` | `hermes` | `["acp"]` | — | — |
| `hermes-isolated` | `acp-hermes-isolated` | Hermes ACP (Isolated Environment) | `hermes` | `hermes` | `["acp"]` | `HERMES_HOME` | — |
| `qwen-code` | `acp-qwen-code` | Qwen Code ACP | `qwen-code` | `npx` | `["@qwen-code/qwen-code@latest", "--acp", "--experimental-skills"]` | — | — |

## Isolated Environment Layout

Isolated presets set a single environment variable pointing under the plugin persistence root:

```text
<getRuntimePersistencePaths().dataDir>/acp-backend-environments/<backendId>
```

Backend Manager creates these managed directories only when saving a backend that still has the matching isolated preset environment value. Adding a preset and then canceling the dialog does not create directories. If the user edits the env value to a custom path, the value is saved but the plugin does not create that custom directory.

## API

```typescript
// src/modules/acpBackendPresets.ts:80-119

listAcpBackendPresets(): AcpBackendPreset[]
```
Returns a shallow copy of the preset array.

```typescript
findAcpBackendPreset(id: string): AcpBackendPreset | undefined
```
Looks up a preset by id (case-insensitive, trimmed). Returns `undefined` when no match is found.

```typescript
createAcpBackendFromPreset(presetOrId: AcpBackendPreset | string): BackendInstance
```
Converts a preset (or preset id) into a fully-formed `BackendInstance`. Sets `type = "acp"`, `baseUrl = "local://<backendId>"`, `auth = { kind: "none" }`, and maps `agentFamily` from the preset.

```typescript
listBuiltinAcpBackends(): BackendInstance[]
```
Filters presets where `builtIn === true` (currently only `opencode`) and converts each to a `BackendInstance` via `createAcpBackendFromPreset`.

## Integration Points

### Backend Registry — Auto-Injection

`src/backends/registry.ts` (line 80):

`upsertBuiltinBackends()` is called at the end of `loadBackendsRegistry()`. It iterates `listBuiltinAcpBackends()` and appends any built-in backend whose `id` is not already present in the user's backend list. If new backends were added, the updated list is persisted to preferences.

This ensures `opencode` is always available in the backend list, even if the user has never explicitly added it.

### Backend Manager UI — Preset Menu

`src/modules/backendManager.ts` (line 376):

- `createAcpPresetMenu()` builds a dropdown menu where each preset appears as a menu item, followed by a "Custom" separator item.
- When the user selects a preset, `editableRowFromAcpBackendPreset()` (line 1080) calls `createAcpBackendFromPreset()` then `normalizeRowFromBackend()` to populate the edit dialog with the preset's values.
- Duplicate `backendId` rows are detected and blocked before insertion.

### Readonly Harness — Parity

`src/modules/harness/backendsReadonly.ts` (line 108):

`mergeBuiltinBackends()` uses the same `listBuiltinAcpBackends()` injection logic as the registry, keeping the readonly view consistent with the live backend list.

## agentFamily Type Coupling

The `agentFamily` field connects presets to the backend type system:

```typescript
// src/backends/types.ts
acp?: {
  agentFamily?:
    | "codex" | "claude-code" | "opencode"
    | "gemini-cli" | "hermes" | "qwen-code"
    | "unknown";
  // ...
};
```

The six preset IDs correspond one-to-one with the known `agentFamily` values. A preset defines `agentFamily` at creation time, and the value propagates into `BackendInstance.acp.agentFamily` for use by the ACP connection adapter and runtime option caches.

The model-option folding system (`acpModelOptionFolding.ts`) is independent of presets. Folding operates on runtime-reported model options from an already-connected ACP backend; presets only control which backend process is launched.
