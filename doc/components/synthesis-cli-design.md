# Synthesis CLI Subcommand Design

## Overview

The `zotero-bridge` CLI exposes Synthesis data under the canonical
`synthesis` command group. Subgroups are organized by agent intent while still
mapping one-to-one to existing Host Bridge capability namespaces.

| CLI group | Mapped capability pattern |
| --- | --- |
| `synthesis topic` | `topics.*` |
| `synthesis graph` | `citation_graph.*` |
| `synthesis artifact` | `paper_artifacts.*` |
| `synthesis concept` | `concepts.*` |
| `synthesis schema` | `schemas.*` |
| `synthesis index library` | `library_index.*` |
| `synthesis index reference` | `reference_index.*` |
| `synthesis resolver` | `resolvers.*` |
| `synthesis insight` | `insights.*` |

Mutation-oriented literature ingest is intentionally outside this group and is
exposed as `mutation literature-ingest`.

## Design Rationale

- **Canonical grouping**: Agents can discover all research-context commands via
  `zotero-bridge synthesis --help`.
- **Capability stability**: The CLI command path changed, but Host Bridge
  capability names and payload shapes remain unchanged.
- **Scripting consistency**: Commands that accept structured input use the same
  `--input <JSON_OR_FILE>` convention.

## Input Convention

Synthesis commands that require structured parameters accept `--input`:

```text
zotero-bridge synthesis topic get-context --query '{"topicId":"abc123"}'
zotero-bridge synthesis graph get-metrics --query input.json
```

The `--input` value is either inline JSON, `-` for stdin, `@file`, or a path to
a JSON file. Omitted input is interpreted as `{}` for commands where an empty
object is valid.

## Naming Convention

Subcommand names use kebab-case to match POSIX convention:

| CLI command | Host Bridge capability |
| --- | --- |
| `synthesis topic get-context` | `topics.get_context` |
| `synthesis topic get-review-input` | `topics.get_review_input` |
| `synthesis graph query-cluster` | `citation_graph.query_cluster` |
| `synthesis graph rank-external-references` | `citation_graph.rank_external_references` |
| `synthesis insight attention-queue` | `insights.get_attention_queue` |
| `synthesis artifact export-filtered` | `paper_artifacts.export_filtered` |
| `synthesis artifact resolve-topic-digest` | `paper_artifacts.resolve_topic_digest` |

## Pagination Convention

Commands that return paginated data accept pagination fields in their JSON
input:

| Field | Type | Purpose |
| --- | --- | --- |
| `cursor` | number/string | Pagination cursor |
| `limit` | number/string | Page size, bounded by the capability |

Responses include `has_more`, `next_cursor`, `returned`, and `total` when the
underlying capability supports pagination.

## Command Tree

```text
zotero-bridge synthesis
├── topic
│   ├── list
│   ├── find-by-paper-ref
│   ├── get-context
│   ├── get-report
│   └── get-review-input
├── schema
│   └── get
├── concept
│   └── query
├── graph
│   ├── overview
│   ├── query-cluster
│   ├── get-slice
│   ├── get-layout
│   ├── get-metrics
│   ├── rank-external-references
│   ├── rank-library-papers
│   └── refresh-metrics
├── index
│   ├── library get
│   └── reference get
├── resolver
│   └── resolve
├── artifact
│   ├── manifest
│   ├── read
│   ├── export-filtered
│   └── resolve-topic-digest
└── insight
    └── attention-queue
```
