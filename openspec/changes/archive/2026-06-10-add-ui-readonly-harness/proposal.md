# Add UI Readonly Harness

## Why

Dashboard, Synthesis Workbench, and the Assistant Sidebar are currently coupled to
the Zotero host window, which makes UI diagnosis slow and difficult outside
Zotero. Developers need a local harness that can load the original plugin UI,
read real test data, and guarantee that no host, backend, network, or database
write action is performed.

## What Changes

- Add a local `npm run harness:ui` entry point.
- Serve original `addon/content/**` pages and browser bundles outside Zotero.
- Add a harness host page that iframes the original Workspace, Dashboard,
  Synthesis Workbench, and Assistant Sidebar pages.
- Add read-only adapters for the Zotero library database and plugin state
  database.
- Add a read-only Zotero prefs adapter so backend profiles and workflow settings
  match the configured development profile.
- Scan builtin and user workflow directories for Dashboard workflow surfaces.
- Route all write-capable host commands to a visible mock action log.
- Surface diagnostics when configured database paths are missing or incompatible.

## Impact

- Development-only harness files under `addon/content/harness`,
  `src/modules/harness`, and `scripts`.
- No plugin runtime entry point change.
- No new dependencies; the harness requires Node 24+ for `node:sqlite`.
