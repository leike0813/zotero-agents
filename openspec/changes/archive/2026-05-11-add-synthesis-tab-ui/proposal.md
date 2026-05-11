# Add Synthesis Tab UI

## Why

Synthesis Layer needs a first-class Zotero workbench for browsing topic
artifacts, Paper Registry status, and Unified Citation Graph slices. The UI
must use the existing browser-hosted panel pattern while keeping filesystem and
Zotero access on the plugin side.

## What Changes

- Add a Synthesis tab host using the same host/web bridge shape as Dashboard.
- Add `synthesis:init`, `synthesis:snapshot`, and `synthesis:action` messages.
- Add a snapshot model for storage status, artifacts, registry rows, graph
  slices, layout preset state, and preferences state.
- Add a static web panel for Artifacts, Registry, and Citation Graph views.
- Add actions for tab switching, filtering, layout preset selection, node/edge
  selection, and host-routed commands.
- Add menu and sidebar fallback entry points that open the Synthesis workbench.

## Out of Scope

- Disaster recovery and multi-machine conflict UX.
- Full Sigma.js renderer hardening beyond the MVP renderer boundary.
- Running full D3-force simulations in the web panel.
- Direct UI access to Zotero APIs or the filesystem.
- Review workflow integration.

## Capabilities

### New Capabilities

- `synthesis-tab-ui`: Browser-hosted Synthesis workbench with host-owned
  snapshot/action bridge.

### Modified Capabilities

None.

## Impact

- Adds UI model helpers under `src/modules/synthesis/`.
- Adds a Synthesis dialog/tab host module under `src/modules/`.
- Adds static assets under `addon/content/synthesis/`.
- Adds tests for snapshot shape, action routing, filters, and graph selection.
