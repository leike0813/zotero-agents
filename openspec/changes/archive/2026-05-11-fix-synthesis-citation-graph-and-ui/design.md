# Design

## Citation Graph Identity

Reference identity is deterministic and ordered:

1. Better BibTeX citekey / reference-matching `citekey`
2. DOI
3. arXiv id
4. URL
5. title + year + first author
6. normalized raw text hash

Library paper aliases include all identities that can be derived from Zotero
metadata, including citation key fields and Extra. Reference nodes use the same
identity functions, so references matched by citekey or bibliographic identity
promote to the library paper node.

References with no title, no raw text, and no identifier are ignored and counted
in diagnostics. Raw fallback nodes are classified as `unresolved_reference`, but
they are keyed by normalized raw hash and therefore merge across papers.

## Snapshot And Layout

`queryCitationGraph()` writes the graph snapshot and all three D3-force layout
presets. `getSynthesisSnapshot()` reads those persisted assets when present and
returns coordinates for the selected preset. If no graph snapshot exists, the UI
receives an empty graph plus diagnostics explaining that rebuild is required.

## Workbench Graph UI

The Workbench frontend is bundled with esbuild so it can import Sigma.js and
Graphology. The chrome page loads the built bundle. The Graph view uses Sigma as
the primary renderer and keeps SVG only as a non-primary fallback for test or
unsupported environments.

Filtering is host-owned state. The browser applies rendering-focused Sigma
state such as hover highlighting and camera focus, while persistent graph facts
remain plugin-owned.
