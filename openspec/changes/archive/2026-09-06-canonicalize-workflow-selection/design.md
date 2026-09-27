## Context

See proposal.md. Implementation baseline: `4e1cb8ace4aaf0dbd4c3ccf677365cf1ac90ad46`. Cumulative governed baseline: `4fb76b73f3ec9744e905c39e45d0b86ac03b34ed`. The archived read change supplies bounded pages, portable refs and the process Host gate. Selection still has raw-object builders, promotion and transport repagination.

## Goals / Non-Goals

Deliver exact selection and one locked ordered input per trigger across every applicable consumer. Reuse existing owners and canonical attachment descriptors; do not add a Host callable, persistent selection snapshot, generic compatibility projection, dependency, or the artifact/navigation/write changes.

## Decisions

### Exact pages and current view

`getSelectedItems(request?, control?)` returns `items/returned/total/hasMore/nextCursor`, with a 25 default and 100 maximum. Each page obtains the current ordered exact refs; an opaque cursor binds their digest and after-index. Only page items are hydrated. Remove the 10,000 snapshot cap. Selection content/order changes fail `basis_mismatch` and discard the whole acquisition, without retry. Reuse control, FIFO and canonical errors. No TTL, cache, owner handle or persistence.

Current view remains synchronous. Canonicalize existing `libraryIds/selectedSources`, including ordered multi-row sources and portable Saved Search identity; omit the selected-item array. Keep scalar library/current collection conditions and distinguish unavailable context from empty selection.

### Locked input and named policies

SelectionContext owns a single ordered array of canonical facts, not parents/children/attachments/notes trees. Use strict refs and canonical library reads for topology, metadata, attachment and note facts. Trigger acquisition completes once before the settings dialog; preview and preparation share the locked input. Explicit and durable refs bypass live UI acquisition. Do not reconstruct raw Zotero objects or install a temporary rich-shape projection.

Keep Input Planning v2 count checks, compatibility, filter phases, grouping and immutable prepared units. Promotion/deduplication belong only to the existing named task selectors. Literature source retains parent/direct precedence, Markdown preference, earliest PDF stem match and earliest Markdown/PDF fallback. Add canonical attachment `createdAt`; preserve filename and input-order ties and existing Markdown recognition. MinerU direct PDF stays exact; a parent expands all PDFs. Metadata, notes, digest-image, bundle and tag policies retain the guide's section 6.1 behavior. Existing generated-note classification reads canonical note/payload facts; Managed Note redesign is outside this change.

The final local source adapter reads `library.getItemDetail(ref)` and its attachment file descriptor. Only an available descriptor supplies provider upload paths. Paths and numeric IDs do not enter selection/task DTOs. Existing input materialization and upload mapping remain the owners.

### Remote and durable inputs

Keep the items/none selection discriminator and accept only complete `{libraryId,key}` refs. Remove id/string/key-only inputs and user-library guessing. Durable complete refs remain usable; records without complete refs are retained but cannot execute. Do not persist UI basis or migrate a record by sampling current UI. Existing run/approval/result ownership remains intact.

### Deletions and surface ownership

Approved DEL-01/02/05 selection subset: legacy context projection/casts/fallbacks, legacy current/selected exports after their callers migrate, and context repagination. DEL-06/07: raw selection tree/schema, rich serializers, duplicated acquisition, production live fallback, numeric/legacy selection fields and source-path aliases; unused sourceSelection asset and unused referencesNote selection helpers. Preserve unrelated referencesNote parsing and runtime functions.

Debug migrator's selection moves here; its manifest/entrance deletion belongs to the artifact change. Navigation endpoints and effects remain owned by the navigation change, but any shared current-view result uses the small canonical projection. Retain unrelated non-Zotero paging, mutation DSL, reference writers and all notification/run/attention/catalog/maintenance/receipt/cron and Input Planning v2 guidance.

Before guidance edits record affected materialized metrics. Only selection snapshot/promotion/old refs/rich-context/repagination semantic units may be replaced. Review and render source-owned guidance; no hand-editing generated packages. Require four selection closure counters and four semantic parity counters to reach zero against the fixed baselines.

## Risks / Trade-offs

- Changing selection during acquisition fails explicitly rather than silently picking a new scope.
- Old incomplete durable refs become non-executable; retain their records and errors.
- File availability can change after planning; final materialization fails through existing source errors.
- Shared requirements must preserve already synchronized read semantics and later-change ownership.

## Migration Plan

Use the approved Broker, Workflow, Bridge/MCP/CLI and task behavior seams red-before-green. Migrate type, producer, direct/result consumers and deletion together. Run focused suites, TypeScript/build/lint, CLI and relevant native compatibility checks. Record unrun boundaries honestly. Complete official semantic review/render/mirror and OpenSpec verify/sync/archive without commit or release.
