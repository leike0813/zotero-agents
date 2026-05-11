# Synthesis Citation Graph Design

## Overview

Unified Citation Graph is a deterministic projection. It is built by plugin-side
code from Zotero metadata, structured references, reference matching outputs, and
existing citation analysis role annotations. No LLM is used for graph facts.

This change implements the core graph builder and layout snapshot generator. UI
rendering and MCP query tools are later phases.

## Graph Model

Nodes:

- `library_paper`
- `external_reference`
- `unresolved_reference`

Edges:

- Direction is always `citing paper -> cited target`.
- Repeated citations from the same source to the same target are aggregated into
  one edge.
- Edge records `mention_count`, source references, `primary_role`, `aux_roles`,
  and role evidence.

## Provisional Reference Keys

Key priority:

```text
normalized DOI
  -> normalized arXiv id
  -> normalized URL
  -> normalized title + year + first author
```

All four are deterministic strong keys in v1. If an external or unresolved
reference later matches a library paper by the same provisional key, it is
promoted to the library paper node. The old provisional key is retained as an
alias and promotion diagnostics are recorded.

Duplicate library papers sharing one provisional key are allowed but diagnosed.
The canonical paper is chosen by:

```text
has DOI
  -> has attachment
  -> earliest dateAdded
  -> lexicographically smaller itemKey
```

## Role Selection

Citation role labels come only from existing citation analysis. The builder does
not reinterpret text. For an aggregated edge:

```text
highest evidence count
  -> configured role priority
  -> lexicographic role label
```

No role becomes `unspecified`.

## Layout Snapshots

Layout is a derived snapshot tied to `graph_hash` and preset. The UI should load
coordinates rather than run full-graph simulation by default.

Presets:

- `compact`
- `balanced`
- `expanded`

The layout generator sorts nodes and edges, initializes coordinates from
SHA-256-derived values, runs fixed D3-force iterations, and rounds coordinates
to a fixed precision.
