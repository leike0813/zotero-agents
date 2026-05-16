## Why

Task Dashboard and Synthesis Workbench are currently opened through separate
entry points and use different host shapes. Users need a single Zotero tab
workspace that keeps Dashboard and Synthesis discoverable while preserving the
existing host-owned bridge boundaries.

## What Changes

- Add a Zotero tab based workspace entry point with a global shell.
- Keep Dashboard and Synthesis as host-owned tools instead of merging their
  runtime logic into one large renderer.
- Rework Synthesis Workbench navigation into Home, Topics, Graph, and Index.
- Replace the old overview status grid with library insight cards and top topic
  cards.
- Add topic metrics to the Synthesis snapshot so cards can show paper count,
  summary, update time, and completion.
- Keep Markdown reading as a main-view immersive page.

## Impact

- Affected specs: synthesis-tab-ui
- Affected code:
  - `src/modules/workspaceTab.ts`
  - `src/workspaceApp.ts`
  - `addon/content/workspace/index.html`
  - `src/modules/synthesis/uiModel.ts`
  - `src/modules/synthesis/service.ts`
  - `src/synthesisWorkbenchApp.ts`
  - `addon/content/synthesis/styles.css`
  - `zotero-plugin.config.ts`
