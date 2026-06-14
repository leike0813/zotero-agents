# Change: Export Topic Details Standalone HTML

## Why

Topic Details currently offers a `Copy Summary` action that only copies a short
text summary. Users need a portable, high-fidelity artifact they can open
outside Zotero while preserving the Topic Details reading experience, embedded
paper digests, concept overlays, and a topic-scoped citation graph.

## What Changes

- Replace the Topic Details `Copy Summary` action with `Export Topic HTML`.
- Generate a self-contained `.html` file through a save dialog.
- Maintain the generated standalone HTML as a fixed topic-level asset under the
  topic's current persistent directory; exporting copies that asset to the
  user-selected path and only rebuilds it when missing or stale.
- Embed the current topic detail, localized UI messages, concepts overlay data,
  available paper digest artifacts, and a readonly topic citation subgraph.
- Add a standalone Synthesis export boot mode that reuses the real Workbench UI
  renderer without requiring Zotero, host postMessage, or Synthesis storage.

## Impact

This change does not modify topic artifact schema, the main Workbench snapshot
contract, workflow contracts, digest resolver contracts, graph cache storage, or
canonical Synthesis data. The export envelope is internal to the generated HTML.
