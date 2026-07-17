## Context

`library.list_items`, `library.sync_snapshot`, and `library.readiness_audit` currently call `Zotero.Items.getAll()` for every page, then repeat filtering, text materialization, sorting, and offset slicing in JavaScript. `library.search_items` performs a second full-library scan. Multi-page consumers such as `collection-collector` therefore multiply full-library work on Zotero's JavaScript main thread.

The public surfaces already expose bounded pages and string-shaped `nextCursor` values, but the input schemas still admit numbers and the cursor is interpreted as an offset. The change must preserve the broker DTOs and total-match semantics while using APIs available in Zotero 7 and 9, avoiding Node-only runtime dependencies, and keeping current uncommitted file-transfer work intact.

## Goals / Non-Goals

**Goals:**

- Make each library page query database-bounded and hydrate no more than the requested page plus the keyset lookahead.
- Give all four library query capabilities one predicate, normalization, text-match, count, hydration, and cursor implementation.
- Bind opaque cursors to normalized criteria and return a stable structured error for invalid reuse.
- Preserve item DTOs, current-condition total counts, readiness evaluation, and collection-collector apply behavior.
- Prove the behavior in Node seams and a real Zotero host without fixed timing assertions.

**Non-Goals:**

- Persist cursors across database rewrites or make cursors a durable data format.
- Add a Node SQLite production fallback, cache full-library results, or change Zotero's item store format.
- Preserve non-zero numeric offset pagination.
- Install Zotero 7 or new project dependencies, publish releases, or modify unrelated R6/file-transfer work.

## Decisions

### One shared query service owns normalization and pagination

Add `zoteroLibraryPageQuery.ts` as the single source of truth for criteria normalization, SQL predicates, total count, page IDs, cursor encoding/validation, and ordered page hydration. Broker capabilities supply normalized inputs and map hydrated items into their existing DTOs; they do not maintain parallel filters or scans.

This is preferred over separately optimizing each broker method because separate predicates would drift across list, snapshot, readiness, and search surfaces.

### Parameterized SQLite keyset queries bound page work

The service builds one predicate over top-level, non-deleted regular items and optional library, collection, tag, item type, and text criteria. The page query appends `itemID > ? ORDER BY itemID ASC LIMIT ?` and asks for `limit + 1` IDs; the count query reuses the same predicate without the keyset position. Only the first `limit` IDs are passed to array-form `Zotero.Items.getAsync()`, and the hydrated objects are reordered to match SQL IDs.

Item IDs are the stable monotonic key available in Zotero's schema. Keyset pagination avoids re-sorting prior rows and gives defined behavior when earlier rows are inserted or deleted between pages. New rows with a larger ID can appear on a later page; rows deleted before retrieval disappear without shifting already-consumed rows into duplicates.

### Text matching is field-based and escapes LIKE wildcards

Text criteria match independently against title, creators, date, publication title, abstract, tags, or item key using SQLite `LIKE ... ESCAPE` with `COLLATE NOCASE`. `%`, `_`, and the escape character are escaped before binding. SQL `EXISTS` clauses cover creators and tags, so matching does not depend on concatenating field strings and cannot accidentally match across field boundaries.

### Versioned cursors are opaque and criteria-bound

The v1 cursor is base64url JSON containing `{version: 1, criteriaHash, afterItemId}`. A canonical serialization of normalized criteria produces `criteriaHash`; cursor parsing validates structure, version, positive integer keyset position, and exact criteria hash. The first page accepts only an absent cursor or string `"0"`. Any malformed cursor, unsupported version, criteria mismatch, or non-zero numeric legacy value raises `invalid_library_cursor`.

The broker's snapshot identifier uses the criteria hash and keyset position directly, not the complete cursor, so it remains compact without making the cursor a persisted identifier.

### Runtime dependencies are injected only through a narrow adapter seam

Production defaults call `Zotero.DB.queryAsync()` and array-form `Zotero.Items.getAsync()` directly. Node tests pass an explicit query/hydration adapter; production code contains no `Items.getAll()` fallback and no embedded Node database implementation.

### Transport mappings preserve one non-retryable error

Host Bridge and MCP schemas admit only string cursors. The query service exposes a typed cursor error with code `invalid_library_cursor`; Host Bridge and MCP map it without retry advice and without silently restarting at the first page.

## Risks / Trade-offs

- [Zotero 7 and 9 SQL schema details differ] → Use only long-lived `items`, `itemData`, `itemDataValues`, `fields`, `creators`, `itemCreators`, `tags`, `itemTags`, `collections`, and `collectionItems` relationships and verify in the available Zotero 9 host; record Zotero 7 host verification as pending.
- [A count query remains O(number of matching rows)] → Keep count as a separate database aggregate because `totalScanned` is an existing contract, while eliminating JS object hydration and sorting for non-page rows.
- [Concurrent inserts/deletes change a live traversal] → Document ordinary keyset behavior and test no-duplicate progression; cursors are short-lived read handles, not snapshot transactions.
- [Search results change from concatenated-string accidents] → Specify field-local matching explicitly and cover wildcard literals and all supported fields.
- [Cursor hashing or base64 APIs vary in Zotero] → Reuse repository runtime-safe encoding/hash helpers or implement a small deterministic runtime-neutral encoder with Node tests and Zotero-host verification.

## Migration Plan

1. Add failing query-service, broker, Host Bridge/MCP, collector, and real-host tests.
2. Implement the shared service and migrate all four broker calls.
3. Tighten schemas and transport error mapping, then update collector pagination.
4. Update current-state specs, docs, semantic sources, and generated Host Bridge surfaces.
5. Run focused Node tests, TypeScript, strict OpenSpec validation, renderer/check gates, and Zotero 9 core-lite validation.

Rollback removes the shared service and restores the prior broker implementation as one code change; no persisted data migration is involved. Non-zero numeric cursors intentionally have no compatibility path.

## Open Questions

None. The cursor compatibility, query-field semantics, cache behavior, and Zotero 7 verification boundary are fixed by the approved plan.
