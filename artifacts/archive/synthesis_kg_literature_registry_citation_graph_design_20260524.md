# Synthesis Knowledge Graph Literature Registry and Citation Graph Design

Date: 2026-05-24

Parent design: `artifact/topic_graph_lightweight_design_20260519.md`

## Scope

Literature Registry + Citation Graph 是文献实体、reference matching 和 citation graph 的核心数据域。

本域包括：

- Paper-first registry。
- internal Work identity layer。
- reference instances。
- reference resolutions。
- BBT citeKey alias layer。
- citation contexts。
- cleanup proposals。
- incremental rematch。
- citation graph snapshots。
- background job queue。
- Index / Literature registry UI。
- Graph page and Topic Detail Graph tab data model。

本域不包括：

- Topic graph semantic relation proposals。
- Concept KB。
- Git sync remote implementation。

## Paper-First Registry

User-facing registry object is `paper`, not `work`.

```text
paper_ref = <libraryID>:<itemKey>
```

Work identity is internal and used for deduplication and reference resolution convergence. Work is not a primary UI management object.

## Reference Layer

Reference instance:

```text
local occurrence from one source paper's references.json
```

Reference resolution:

```text
best-effort mutable matching layer
```

Resolution statuses:

```text
matched
unmatched
ambiguous
stale
pending_rematch
forced_match
rejected_match
```

## Matching Operations

No N x N rebuild on each ingest.

Use inverted buckets:

```text
doi
title_signature
author_year_key
citeKey alias
unresolved / ambiguous queues
```

New Zotero item import triggers reverse rematch only for matching buckets.

BBT citeKey is an alias/export handle, not canonical ID.

## Citation Graph Snapshots

Canonical:

```text
papers
reference-instances
reference-resolutions
contexts
works
work-redirects
cleanup-proposals
```

Local projection/cache:

```text
global citation snapshot
topic-scoped citation snapshot
paper slice snapshot
graph freshness manifest
graph job queue
```

Snapshots are UI acceleration artifacts and are not Git-synced.

## Background Jobs

V1 uses single-writer execution:

```text
writer_concurrency = 1
```

Priority classes:

```text
P0 user_visible
P1 apply_followup
P2 maintenance
P3 bulk_rebuild
```

Bulk jobs must be chunked. Same-scope jobs are coalesced.

Snapshot retention:

```text
latest usable snapshot
latest failed diagnostics
current building temp snapshot
```

## Cleanup Queue

V1 actions:

```text
approve
reject
skip
```

No advanced manual override in v1.

Rejected proposal must be retained to avoid repeating known-bad suggestions.

## Index UI

Index / Registry uses unified `Literature` view instead of separate Papers and References pages.

Filters:

```text
All
Library items
Reference-only
Matched
Unmatched
Ambiguous
Needs cleanup
Stale
```

## Acceptance Criteria

- literature-digest apply creates reference instances。
- new Zotero item triggers bucket rematch。
- reference resolution can be matched/unmatched/ambiguous。
- BBT citeKey change updates alias history without breaking canonical IDs。
- Graph page reads latest usable snapshot。
- Topic Detail Graph defaults to topic neighborhood only。
- Cleanup Queue supports approve/reject/skip。

## Dependencies

- Foundation。
- Existing literature-digest artifacts。

