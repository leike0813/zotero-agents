# UI Readonly Test Harness

## Overview

The UI Readonly Test Harness (`src/modules/harness/`) is an isolated read-only tool for inspecting the Zotero plugin's SQLite state without connecting to a live Zotero host or ACP backend. It is designed for offline diagnostics, snapshot testing, and development-time inspection.

Design principles:

- **Read-only snapshot mode** — all database access is through snapshot copies; write operations are rejected.
- **Minimal Zotero mock** — only the subset of `Zotero.Prefs` needed for read queries is simulated; `set`/`clear` are blocked.
- **Served locally** — `npm run harness:ui` loads the real plugin pages against this model layer (see "Serving the Harness"); tests import the modules directly.
- **Functional composition** — each layer is independently usable; callers assemble the required components.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Model Layer                         │
│  dashboardReadonlyModel.ts                          │
│  assistantReadonlyPublication.ts                     │
│  synthesisReadonlyClient.ts                          │
├─────────────────────────────────────────────────────┤
│              Data Access Layer                       │
│  pluginStateReadonly.ts   backendsReadonly.ts        │
│  skillRunnerReadonlyProjection.ts                    │
│  zoteroReadonlyLibraryAdapter.ts                     │
│  synthesisReadonlyPort.ts                            │
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

Queries the plugin's own SQLite tables and normalizes raw rows into structured objects.
Generic ACP/task surfaces still read `plugin_task_rows`, `plugin_task_requests`, and `plugin_task_contexts`.
SkillRunner lifecycle surfaces read `plugin_skillrunner_runs` as the local run-store SSOT; legacy SkillRunner rows in `plugin_task_rows` are not used to reconstruct lifecycle state.

```typescript
// Exports
export type PluginStateReadonlyStore = {
  db: ReadonlySqliteDatabase;
  tableExists(table: string): boolean;
  listTaskRows(args?: { domain?: string; scope?: string; limit?: number }): PluginStateReadonlyRow[];
  listRequestRows(args?: { domain?: string; limit?: number }): PluginStateReadonlyRow[];
  listContextRows(args?: { domain?: string; limit?: number }): PluginStateReadonlyRow[];
  listSkillRunnerRunRows(args?: { backendId?: string; requestId?: string; limit?: number }): PluginRunStoreReadonlyRow[];
  listSkillRunnerSequenceStateRows(args?: { backendId?: string; limit?: number }): PluginRunStoreReadonlyRow[];
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

Reads directly from the Zotero SQLite database to build the read-only host read port used by the Synthesis readonly client.

```typescript
// Export
export async function createZoteroReadonlyHostReadPort(args: {
  dbPath: string;
  libraryId: number;
}): Promise<...>;
```

Provides host read facts (items, creators, tags, collections, notes) backed by direct SQLite queries instead of the Zotero API.

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

Supported locales: `en-US`, `zh-CN`, `zh-TW`, `ja-JP`, `fr-FR`, `de`, `es-ES`, `pt-BR`, `ko-KR`, `it-IT`, `ru-RU`. Falls back to `en-US` for unsupported locales.

## Model Layer

### `synthesisReadonlyClient.ts`

Composes a read-only SQLite snapshot, a bounded readonly Synthesis port, and the Zotero host read port into a grouped Synthesis client over `createSynthesisClientFromPort`. Injects a minimal Zotero host mock into the global scope (`Prefs.set`/`clear` throw).

```typescript
// Exports
export type SynthesisReadonlyClientOptions = {
  zoteroDbPath: string;
  pluginDbPath: string;
  synthesisDbPath?: string;
  pluginRuntimeRoot: string;
  libraryId?: number;
};

export async function createSynthesisReadonlyClient(
  options: SynthesisReadonlyClientOptions,
): Promise<...>;
```

Synthesis data is read from the isolated `synthesisDbPath` when provided, otherwise from `pluginDbPath`; no production service/repository owner, canonical writer, or native mutation client is constructed (enforced by the static boundary tests in `test/ui/156`).

### `synthesisReadonlyPort.ts`

Bounded readonly fake `SynthesisClientPort` (`createSynthesisReadonlyPort`) serving home/topics/index/review/graph/tags/concepts/reader surfaces from the snapshot database; mutation commands are rejected with an explicit unavailable result.

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

### `assistantReadonlyPublication.ts`

Publishes the Assistant Workspace through the real publication plane
(`AssistantWorkspacePublicationRuntime` + `AssistantWorkspacePublicationCoordinator`),
sourced entirely from the readonly plugin-state store.

```typescript
// Export
export async function createAssistantReadonlyPublicationSession(args: {
  pluginDbPath: string;
  workflowsDir?: string;
  builtinWorkflowsDir?: string;
}): Promise<...>;
```

The session holds one runtime + coordinator channel per surface
(`acp-chat`, `acp-skills`, `skillrunner`), each backed by a readonly
`AssistantWorkspacePublicationAdapter` that mirrors the corresponding
production surface adapter but reads from the readonly store:

- **acp-chat** — ACP conversation history and metadata.
- **acp-skills** — ACP skill run records.
- **skillrunner** — SkillRunner v3 run-store projections (`runKey` identity,
  `requestId` as backend correlation only).

`bootstrap()` re-creates the channels with a fresh `scopeKey`, initializes
every source (`cause: "initialization"`), and returns the init payload
(`scopeKey`, surface configuration, surface labels) plus the queued
publications. `handleMessage({type, payload})` routes the shell wire
protocol: publication acks go to the owning runtime, owner-selection actions
re-initialize the affected source (`cause: "owner-switch"`),
`load-transcript-page` is served through `requestTranscriptPage`, and every
other write-capable registry action is returned as a mock action (recorded
by the harness server, never executed). `diagnostics()` and `close()` mirror
the other harness models.

The served harness page (`scripts/ui-harness-serve.ts` +
`addon/content/harness/harness-host.js`) runs the production sidebar shell
and child bundles against these endpoints, so the harness exercises the same
publication protocol as the live plugin.

## Injection and Mocking Strategy

| Target | Mechanism | Source |
|--------|-----------|--------|
| `Zotero.Prefs` | `installReadonlyZoteroPrefs` replaces `Zotero.Prefs` globally | `prefsReadonly.ts` |
| Zotero host globals | Minimal Zotero mock injected during client creation | `synthesisReadonlyClient.ts` |
| SQLite writes | Snapshot + statement whitelist (SELECT/WITH/PRAGMA only) | `sqliteReadonly.ts` |
| Backend registry | Same normalization + builtin merge as live path | `backendsReadonly.ts` |
| UI host operations | `actionLog` recording instead of execution | `dashboardReadonlyModel.ts` |
| Assistant write actions | Mock-action log entries returned by the session, never executed | `assistantReadonlyPublication.ts` |

## Serving the Harness

`npm run harness:ui` starts `scripts/ui-harness-serve.ts` on
`http://127.0.0.1:5177/` (override with `HARNESS_UI_PORT`). Paths come from
`.env` (`ZOTERO_PLUGIN_DATA_DIR`, optional profile/prefs overrides);
`--check` builds everything, prints component readiness as JSON, and exits.

The server holds the workspace, Dashboard, Synthesis, Assistant Workspace,
ACP child and prototype workspace bundles in memory and rebuilds them on source
changes. Dashboard uses `src/dashboard/dashboardApp.ts` with JSX/Preact and
Firefox 115 options; `/content/dashboard/app.js` serves that in-memory bundle,
including on a clean checkout. The production sidebar entries
`src/sidebar/assistantWorkspaceApp.js` and `src/sidebar/acpChildApp.js`
use the plugin's JSX/Preact options and are served at
`/content/sidebar/assistant-workspace.bundle.js` and
`/content/sidebar/acp-child.bundle.js`. The harness page
(`addon/content/harness/harness-host.js`) therefore runs the real Assistant
Workspace shell and child panels. Live reload is delivered over
`/api/harness/live` (SSE): bundle rebuilds and content changes reload the
page, build failures surface as console warnings.

Assistant traffic uses two endpoints: `GET/POST
/api/harness/assistant/bootstrap` (INIT payload plus the initial
publications) and `POST /api/harness/assistant/message` (ready, registry
actions, ACKs, transcript page requests; returns new publications and an
optional mock-action log entry). Dashboard and Synthesis keep their own
action endpoints. Write classification is shared: `readonlyReasonForAction`
maps each blocked action to a reason (`clipboard`, `host-api`,
`backend-submit`, `db-write`, `readonly`) for the action log.

The locale control covers the plugin's eleven locales; the selection is
stored in `localStorage`, mirrored into the page URL, and forwarded to the
server as the `x-zs-harness-locale` header for Synthesis i18n envelopes.

## Usage Example

```typescript
import { parseHarnessEnv } from "./env";
import { readZoteroPrefsStore, installReadonlyZoteroPrefs } from "./prefsReadonly";
import { createSynthesisReadonlyClient } from "./synthesisReadonlyClient";
import { createDashboardReadonlyModel } from "./dashboardReadonlyModel";

// 1. Parse environment for database paths
const env = parseHarnessEnv(envFileContent);

// 2. Install read-only preferences
const prefsStore = await readZoteroPrefsStore(env.zoteroPrefsPath!);
installReadonlyZoteroPrefs(prefsStore);

// 3. Create the read-only Synthesis client
const synthesis = await createSynthesisReadonlyClient({
  zoteroDbPath: "/path/to/zotero.sqlite",
  pluginDbPath: "/path/to/zotero-agents.db",
  synthesisDbPath: "/path/to/synthesis.db",
  pluginRuntimeRoot: "/path/to/runtime",
});

// 4. Create dashboard model for inspection
const dashboard = await createDashboardReadonlyModel("/path/to/zotero-agents.db");
const state = dashboard.snapshot();
console.log(state.summary);
```
