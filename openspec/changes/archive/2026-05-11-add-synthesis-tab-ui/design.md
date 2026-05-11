# Design: Synthesis Tab UI

## Host Boundary

The plugin owns the Synthesis UI host. The web panel is untrusted display and
interaction code: it sends actions and receives snapshots, but it does not read
Zotero APIs, local files, or canonical assets directly.

The bridge messages are:

- `synthesis:init`: initial snapshot after the web panel is loaded.
- `synthesis:snapshot`: subsequent refresh.
- `synthesis:action`: web-to-host action envelope.

The host action router accepts only known action names and normalizes payloads
before mutating host state or dispatching host commands.

## Snapshot Model

The MVP snapshot contains:

- storage / anchor status summary;
- artifacts view rows and filters;
- registry view rows and filters;
- preferences status values;
- citation graph slice with nodes, edges, selected layout preset, selected
  element, and filter state;
- localized labels.

The snapshot is DTO-only. It must not expose live Zotero item objects, file
handles, functions, or DOM references.

## View Model

The web panel has four top-level sections:

- Overview: storage, anchor, mirror, registry, graph, and preference status.
- Artifacts: list, search/filter, freshness/coverage, Markdown preview.
- Registry: table and missing-artifact/readiness filters.
- Citation Graph: read-only graph slice, search, hover/selection detail,
  citation role filter, tag/collection/year filters, and layout preset control.

Graph layout preset switching selects persisted coordinates supplied by the
host. The panel does not run full-graph D3-force simulation.

## Entry Points

The primary entry is a Zotero-hosted Synthesis workbench window/tab using the
existing browser-hosted panel pattern. The workflow menu also exposes an Open
Synthesis Workbench command. Sidebar fallback opens the same workbench rather
than embedding Synthesis into the Assistant three-panel sidebar.

## Renderer Boundary

The MVP implements a deterministic graph view model and lightweight renderer.
The renderer boundary preserves the Sigma.js integration point, but the host
contract remains independent of a specific browser renderer implementation.

## Risks

- `Zotero_Tabs.add()` remains an internal API. The MVP therefore uses the
  project’s existing dialog/web-panel host shape first and keeps the entry
  point independent from the final Zotero main-tab adapter.
- Large graphs must be sliced before reaching the web panel.
