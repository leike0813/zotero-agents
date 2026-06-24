## Why

Assistant sidebar pages currently live under `addon/content/dashboard`, and shared markdown/math vendor assets are also physically owned by the dashboard directory even though dashboard, sidebar, markdown reader, and synthesis views all consume them. This makes static ownership misleading and increases the chance that future changes accidentally couple unrelated UI surfaces.

## What Changes

- Move Assistant sidebar shell and child panel pages to `addon/content/sidebar`.
- Move Assistant panel shared renderer/model/style assets to `addon/content/shared/assistant`.
- Move bundled markdown/math/highlight vendor assets to `addon/content/shared/vendor`.
- Update runtime chrome URLs, HTML script/style references, packaged asset reads, harness references, and tests to use the new ownership paths.
- Remove the old dashboard-owned sidebar and vendor paths instead of keeping compatibility stubs.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `assistant-sidebar-ui`: Define the static resource ownership and load paths for the unified Assistant sidebar, its shared Assistant panel layer, and shared vendor assets.

## Impact

- Affected code:
  - `addon/content/sidebar/**` for Assistant workspace and sidebar panel pages.
  - `addon/content/shared/assistant/**` for shared Assistant panel rendering assets.
  - `addon/content/shared/vendor/**` for markdown, math, and highlight vendor assets.
  - `src/modules/assistantWorkspaceSidebar.ts`, `src/modules/skillRunnerRunDialog.ts`, and `src/modules/synthesisWorkbenchTab.ts` for packaged URL/path resolution.
  - dashboard, markdown-reader, synthesis, harness HTML references.
  - sidebar and markdown renderer tests that assert static paths.
- No backend protocol changes.
- No user-visible UI behavior changes are intended.
