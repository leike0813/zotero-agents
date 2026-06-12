# UI Readonly Test Harness

## Overview

The UI Readonly Test Harness (`src/modules/harness/`) is an isolated read-only tool for inspecting the Zotero plugin's SQLite state without connecting to a live Zotero host or ACP backend. It is designed for offline diagnostics, snapshot testing, and development-time inspection.

Design principles:

- **Read-only snapshot mode** — all database access is through snapshot copies; write operations are rejected.
- **Minimal Zotero mock** — only the subset of `Zotero.Prefs` needed for read queries is simulated; `set`/`clear` are blocked.
- **Isolated module** — currently not exposed through any public entry point; consumers import directly from individual files.
- **Functional composition** — each layer is independently usable; callers assemble the required components.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Model Layer                         │
│  dashboardReadonlyModel.ts  assistantReadonlyModel.ts│
│  synthesisReadonlyService.ts                         │
├─────────────────────────────────────────────────────┤
│              Data Access Layer                       │
│  pluginStateReadonly.ts   backendsReadonly.ts        │
│  zoteroReadonlyLibraryAdapter.ts                     │
│  synthesisWorkbenchI18nEnvelope.ts                   │
├─────────────────────────────────────────────────────┤
│              Infrastructure Layer                    │
│  sqliteReadonly.ts    prefsReadonly.ts    env.ts     │
└─────────────────────────────────────────────────────┘
```

## Infrastructure Layer

### `env.ts`

Parses a `.env`-style file to extract Zotero paths.

```typescript
// Export
export type HarnessEnv = {
  zoteroPluginDataDir?: string;
  zoteroPluginProfilePath?: string;
  zoteroPrefsPath?: string;
  values: Record<string, string>;
};

export function parseHarnessEnv(source: string): HarnessEnv
```

Recognized keys:
- `ZOTERO_PLUGIN_DATA_DIR` — plugin data directory
- `ZOTERO_PLUGIN_PROFILE_PATH` — Zotero profile path
- `ZOTERO_PREFS_PATH` — explicit path to `prefs.js`

### `prefsReadonly.ts`

Parses a Zotero `prefs.js` file and injects a read-only `Zotero.Prefs` mock into the global scope.

```typescript
// Exports
export type ReadonlyPrefsStore = {
  values: Record<string, unknown>;
  get(key: string): unknown;
};

export function parseZoteroPrefs(source: string): ReadonlyPrefsStore;
export async function readZoteroPrefsStore(prefsPath: string): Promise<ReadonlyPrefsStore>;
export function resolveZoteroPrefsPath(args: {
  explicitPrefsPath?: string;
  profilePath?: string;
}): string;
export function installReadonlyZoteroPrefs(store: ReadonlyPrefsStore): void;
```

`installReadonlyZoteroPrefs` replaces `Zotero.Prefs` globally with a mock that:
- Allows `get(key)` — returns from the parsed store.
- Blocks `set(key, value)` and `clear(key)` — no-ops in read-only mode.

### `sqliteReadonly.ts`

Creates a read-only SQLite database adapter with write protection.

```typescript
// Exports
export type ReadonlySqliteDatabase = {
  all: (sql: string, params?: SqlParams) => SqlRow[];
  get: (sql: string, params?: SqlParams) => SqlRow | null;
  close: () => void;
};

export type ReadonlySqliteAdapter = SqlAdapter & { close: () => void };

export async function createReadonlySqliteDatabase(
  dbPath: string,
): Promise<ReadonlySqliteDatabase>;
export async function createReadonlySqliteAdapter(
  dbPath: string,
): Promise<ReadonlySqliteAdapter>;
```

Protection mechanism:
1. Snapshots the source file before opening to prevent writes.
2. The `run()` method rejects any non-SELECT/WITH/PRAGMA statement.

## Data Access Layer

### `pluginStateReadonly.ts`

Queries the plugin's own SQLite tables (`plugin_task_rows`, `plugin_task_requests`, `plugin_task_contexts`) and normalizes raw rows into structured objects.

```typescript
// Exports
export type PluginStateReadonlyStore = {
  db: ReadonlySqliteDatabase;
  tableExists(table: string): boolean;
  listTaskRows(args?: { domain?: string; scope?: string; limit?: number }): PluginStateReadonlyRow[];
  listRequestRows(args?: { domain?: string; limit?: number }): PluginStateReadonlyRow[];
  listContextRows(args?: { domain?: string; limit?: number }): PluginStateReadonlyRow[];
  diagnostics(): Record<string, unknown>;
  close(): void;
};

export async function createPluginStateReadonlyStore(
  dbPath: string,
): Promise<PluginStateReadonlyStore>;
```

### `backendsReadonly.ts`

Loads the backend registry from the `backendsConfigJson` preference, using the same normalization and validation as the live `loadBackendsRegistry`.

```typescript
// Export
export async function loadBackendsRegistryReadonly(): Promise<LoadedBackends>;
```

Built-in ACP backends (from `acpBackendPresets.listBuiltinAcpBackends()`) are merged into the registry, keeping the readonly view consistent with the live backend list.

### `zoteroReadonlyLibraryAdapter.ts`

Reads directly from the Zotero SQLite database to build a read-only `SynthesisLibraryAdapter`.

```typescript
// Export
export async function createZoteroReadonlyLibraryAdapter(
  options: ZoteroReadonlyLibraryAdapterOptions,
): Promise<SynthesisLibraryAdapter & { close: () => void }>;
```

Provides the standard `SynthesisLibraryAdapter` interface (items, creators, tags, collections, notes) backed by direct SQLite queries instead of the Zotero API.

### `synthesisWorkbenchI18nEnvelope.ts`

Builds a synthetic i18n envelope by reading FTL translation files from `addon/locale/`.

```typescript
// Exports
export function resolveHarnessSynthesisLocale(localeInput?: string): SupportedSynthesisHarnessLocale;
export function buildHarnessSynthesisI18nEnvelope(
  localeInput?: string,
  options?: { rootDir?: string },
): SynthesisWorkbenchI18nEnvelope;
```

Supported locales: `en-US`, `zh-CN`, `ja-JP`, `fr-FR`. Falls back to `en-US` for unsupported locales.

## Model Layer

### `synthesisReadonlyService.ts`

Combines a read-only SQLite adapter and a Zotero library adapter into a fully initialized `SynthesisService`. Injects a minimal Zotero host mock into the global scope.

```typescript
// Exports
export type SynthesisReadonlyServiceOptions = {
  zoteroDbPath: string;
  pluginDbPath: string;
  pluginRuntimeRoot: string;
  libraryId?: number;
};

export async function createSynthesisReadonlyService(
  options: SynthesisReadonlyServiceOptions,
): Promise<...>;
```

The injected host mock prevents `Zotero.Prefs.set`/`clear` and provides the minimal runtime globals needed by `SynthesisService`.

### `dashboardReadonlyModel.ts`

Creates a read-only dashboard model for inspecting plugin database state, backend registry, and workflow manifests.

```typescript
// Exports
export type DashboardReadonlyState = {
  selectedTabKey: string;
  actionLog: HarnessActionLogEntry[];
  selectedWorkflowOptionsWorkflowId: string;
  homeWorkflowDocWorkflowId: string;
  selectedProductId: string;
  selectedProductAssetId: string;
  runtimeLogFilters: Record<string, unknown>;
  runtimeLogSelectedIdSet: Set<string>;
};

export type HarnessActionLogEntry = {
  id: string;
  ts: string;
  source: string;
  action: string;
  payload?: Record<string, unknown>;
  readonlyReason?: string;
  message: string;
};

export function filterHarnessVisibleWorkflows(workflows: LoadedHarnessWorkflow[]): LoadedHarnessWorkflow[];

export async function createDashboardReadonlyModel(
  dbPath: string,
  options?: { workflowsDir?: string; builtinWorkflowsDir?: string },
): Promise<...>;
```

The model provides a `snapshot()` method for the full dashboard state (tabs, summary, running rows, workflows, products, runtime logs). The `handleAction()` method simulates UI actions (tab switching, selection) — real host operations (run, cancel, save, open) are recorded in `actionLog` instead of executed.

### `assistantReadonlyModel.ts`

Creates a read-only assistant model for inspecting ACP conversations, ACP skill runs, and SkillRunner tasks.

```typescript
// Export
export async function createAssistantReadonlyModel(dbPath: string): Promise<...>;
```

Returns snapshots scoped to three views:
- **acpChat** — ACP conversation history and metadata.
- **acpSkills** — ACP skill run records.
- **skillrunner** — SkillRunner task records.

All operations are read-only; no backend interaction is attempted.

## Injection and Mocking Strategy

| Target | Mechanism | Source |
|--------|-----------|--------|
| `Zotero.Prefs` | `installReadonlyZoteroPrefs` replaces `Zotero.Prefs` globally | `prefsReadonly.ts` |
| Zotero host globals | Minimal Zotero mock injected during service creation | `synthesisReadonlyService.ts` |
| SQLite writes | Snapshot + statement whitelist (SELECT/WITH/PRAGMA only) | `sqliteReadonly.ts` |
| Backend registry | Same normalization + builtin merge as live path | `backendsReadonly.ts` |
| UI host operations | `actionLog` recording instead of execution | `dashboardReadonlyModel.ts` |

## Usage Example

```typescript
import { parseHarnessEnv } from "./env";
import { readZoteroPrefsStore, installReadonlyZoteroPrefs } from "./prefsReadonly";
import { createSynthesisReadonlyService } from "./synthesisReadonlyService";
import { createDashboardReadonlyModel } from "./dashboardReadonlyModel";

// 1. Parse environment for database paths
const env = parseHarnessEnv(envFileContent);

// 2. Install read-only preferences
const prefsStore = await readZoteroPrefsStore(env.zoteroPrefsPath!);
installReadonlyZoteroPrefs(prefsStore);

// 3. Create read-only synthesis service
const service = await createSynthesisReadonlyService({
  zoteroDbPath: "/path/to/zotero.sqlite",
  pluginDbPath: "/path/to/zotero-agents.db",
  pluginRuntimeRoot: "/path/to/runtime",
});

// 4. Create dashboard model for inspection
const dashboard = await createDashboardReadonlyModel("/path/to/zotero-agents.db");
const state = dashboard.snapshot();
console.log(state.summary);
```
