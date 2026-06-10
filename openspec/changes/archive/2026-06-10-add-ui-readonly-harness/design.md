# Design

## Architecture

The harness runs as a Node HTTP server. The server reads `.env`, locates
`ZOTERO_PLUGIN_DATA_DIR`, opens:

- `<dataDir>/zotero.sqlite`
- `<dataDir>/zotero-agents/state/zotero-agents.db`

Both databases are opened read-only through `node:sqlite`.

The server also reads the configured Zotero profile `prefs.js` from
`ZOTERO_PLUGIN_PROFILE_PATH` or `ZOTERO_PREFS_PATH`. It installs a read-only
`Zotero.Prefs` adapter for original plugin modules that resolve backend
profiles, workflow settings, and workflow directory paths. Preference writes are
blocked.

The browser host page is intentionally thin. It creates iframes for the original
plugin pages and implements only the same bridge/message contracts used by the
Zotero host:

- `workspace:action`
- `dashboard:action`
- `synthesis:action`
- `assistant-workspace:*`

## Read Model

Synthesis uses the original `createSynthesisService`,
`createSynthesisRepository`, `buildSynthesisUiSnapshot`, and
`applySynthesisUiAction` code. The harness swaps in:

- a read-only SQLite `SqlAdapter`
- a read-only Zotero library adapter

Dashboard uses a read-only model that inspects plugin state tables when present
and otherwise reports schema diagnostics. It reads backend profiles through the
same backend registry code used by the plugin and scans builtin/user workflow
directories with the original workflow loader. It does not submit tasks or call
any backend.

## Write Prevention

The read-only SQLite adapter rejects mutating statements. Repository schema
initialization statements that are safe and idempotent in Zotero are converted
to no-ops so the original repository can be instantiated without writing.

The prefs adapter rejects `Zotero.Prefs.set` and `Zotero.Prefs.clear`.
Workflow scanning avoids the registry startup path that writes status files; it
loads manifests directly for the Dashboard read model.

All UI host commands that could write, launch host APIs, copy to the clipboard,
or call external backends are logged as mock/no-op warnings and the current
snapshot is refreshed.

## Development Live Reload

The harness server watches `src/**` and `addon/content/**` while it is running.
Changes under `src/**` rebuild only the in-memory browser bundles used by the
harness; they do not run `zotero-plugin build` or modify the plugin package.
Changes under `addon/content/**` are served directly from disk and trigger a
browser reload. Server and adapter code changes still require restarting
`npm run harness:ui`.
