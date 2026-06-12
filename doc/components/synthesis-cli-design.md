# Synthesis CLI Subcommand Design

## Overview

The `zotero-bridge` CLI exposes Synthesis data through a set of independent
top-level subcommands, each mapping to a Host Bridge capability. This document
describes the design rationale and conventions.

---

## Design Rationale: Why Independent Commands

The CLI does not use a single `synthesis <subcommand>` grouping. Instead, each
Synthesis domain is its own top-level command:

| Command | Mapped Capability Pattern |
|---------|--------------------------|
| `topics` | `topics.*` |
| `citation-graph` | `citation_graph.*` |
| `paper-artifacts` | `paper_artifacts.*` |
| `concepts` | `concepts.*` |
| `schemas` | `schemas.*` |
| `library-index` | `library_index.*` |
| `resolvers` | `resolvers.*` |
| `reference-index` | `reference_index.*` |
| `insights` | `insights.*` |
| `literature` | `mutation.execute` (literature.ingest) |

Rationale:

- **Discoverability** — `zotero-bridge topics --help` shows topic-specific
  subcommands without mixing in citation-graph or paper-artifact options.
- **Consistency** — Each domain command mirrors its Host Bridge capability
  namespace: `topics list` → `topics.list`, `citation-graph get-metrics` →
  `citation_graph.get_metrics`.
- **Composability** — Each command accepts `--input <JSON_OR_FILE>`, allowing
  uniform scripting patterns across domains.

---

## Input Convention

All synthesis commands accept the `--input` parameter:

```
zotero-bridge topics get-context --input '{"topicId":"abc123"}'
zotero-bridge citation-graph get-metrics --input input.json
```

The `--input` value is either:
- An inline JSON string (`'{"key":"val"}'`)
- A file path to a JSON file (`./input.json`)

This `JSON_OR_FILE` pattern is shared across all semantic commands (topics,
citation-graph, paper-artifacts, call, etc.).

---

## Naming Convention: kebab-case

Subcommand names use kebab-case to match POSIX convention:

| CLI subcommand | Host Bridge capability |
|---------------|----------------------|
| `get-context` | `topics.get_context` |
| `get-review-input` | `topics.get_review_input` |
| `query-cluster` | `citation_graph.query_cluster` |
| `rank-external-references` | `citation_graph.rank_external_references` |
| `get-attention-queue` | `insights.get_attention_queue` |
| `export-filtered` | `paper_artifacts.export_filtered` |
| `resolve-topic-digest` | `paper_artifacts.resolve_topic_digest` |

Dots (`.`) in capability names are replaced with hyphens (`-`) in CLI
subcommand names.

---

## Pagination Convention

Commands that return paginated data accept:

| Parameter | Type | Purpose |
|-----------|------|---------|
| `--cursor` | number/string | Pagination cursor |
| `--limit` | number/string | Page size (domain-specific bounds) |

Responses include `has_more`, `next_cursor`, `returned`, and `total` when
applicable.

---

## Command Tree

```
zotero-bridge
├── topics
│   ├── list
│   ├── get-context
│   ├── get-report
│   └── get-review-input
├── schemas
│   └── get
├── concepts
│   └── query
├── citation-graph
│   ├── overview
│   ├── query-cluster
│   ├── get-slice
│   ├── get-metrics
│   ├── rank-external-references
│   ├── rank-library-papers
│   └── refresh-metrics
├── library-index
│   └── get
├── resolvers
│   └── resolve
├── reference-index
│   └── get
├── paper-artifacts
│   ├── manifest
│   ├── read
│   ├── export-filtered
│   └── resolve-topic-digest
├── insights
│   └── attention-queue
└── literature
    └── ingest
```
