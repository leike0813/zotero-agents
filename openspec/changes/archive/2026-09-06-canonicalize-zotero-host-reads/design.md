## Context

See proposal.md for scope. Both implementation and cumulative surface governance use baseline `4fb76b73f3ec9744e905c39e45d0b86ac03b34ed`. Existing item queries use parameterized SQL, `itemID ASC`, `limit + 1`, page-only hydration, and a non-expiring `{ version, criteriaHash, afterItemId }` cursor. The documented ordinary-cursor TTL is drift. Child readers and collection listing still materialize arrays; payload discovery reads note HTML and attachment files before identifying candidates.

## Goals / Non-Goals

**Goals:** source bounds, one process Host slice owner, explicit cancellation, whole-page failure, complete consumer migration, and Saved Search discovery across approved projections.

**Non-Goals:** exact selection, current-view reduction, mutation authority redesign, Managed Note schemas, navigation changes, persistent payload indexes, new dependencies, compatibility envelopes, commits or publication.

## Decisions

### Pages and source identity

Reuse the existing query module and domain DTOs. Ordinary page defaults/maxima are 25/100. Items retain itemID order; collections and Saved Searches use native identity order; child notes/attachments use child identity order; annotations use native sortIndex with identity as a tie-breaker. Cursors bind domain, normalized criteria, source identity and position, and required content basis. Ordinary live library lists do not promise snapshot consistency or gain a TTL. Reject malformed, unsupported, foreign-query and invalid-position cursors with structured safe errors; content-bound continuations fail on basis changes rather than restarting. Source runtime/DB/hydration errors must become canonical typed errors.

Saved Search summaries carry portable ref and display name. The explicit CLI command is `library saved-searches list`, with library-id, limit and cursor controls. Collections retain their existing projection scope. V12 gains one library callable (23 top-level / 21 modules / 88 callables).

### Payload candidate scans

Use a bounded HTML source and bounded attachment candidate pages, preserving all discovered candidates and their existing list order. The page reports payloads, returned, scanned, nextCursor, hasMore, and total:null; an empty page can have continuation. No exact-total scan, persistent index or candidate dedupe. Single-type lookup scans the bounded source until ambiguity is resolved; it cannot select the first page and claim uniqueness. Payload encoded input and decoded output each have a 1 MiB hard cap; note HTML source reads have a 1 MiB UTF-8 cap. Check source size before whole-file allocation and decoded expansion during decoding. Existing write bounds and note text windows remain independent.

Every target read failure fails its page; non-payload data remains an ordinary nonmatch. No partial page or warning substitute. Source candidate checks must not swallow a failed target as a nonmatch.

### Native gate and cancellation

One module-level FIFO in the Broker owns native entry across all instances. A bounded SQL/native query, page hydration and native field-to-detached-DTO extraction occupy a slice. Callbacks, network waits, files/preparation, pure JSON processing, coverage hashing, approval and receipt persistence are outside it. Existing mutations retain semantics while native effects use the same admission boundary. Do not recursively acquire the gate from an admitted slice.

Check the trusted signal before enqueue/entry, between bounded items, and after awaited Host work. Remove canceled waiters without native entry. A canceled/timed-out native operation retains its slot until actual settle. Long loops yield after 100 items or 50 ms, whichever occurs first. Preserve traversal delivered evidence and snapshot 30-minute TTL, 500/1000 public batches and 1M cap; a public batch can comprise multiple native slices. Counts alone cannot establish fixed snapshot basis. Interrupted or changed-basis capture cannot publish completion evidence. Translator logical cancellation suppresses late results without inventing a physical abort API.

### Transport and consumers

HostBridgeCapabilityContext carries optional WorkflowCallControl as trusted context, never semantic JSON. Canonical handlers forward it directly. Attachment locality maps only the current detached page using the existing shared file projection. MCP admits nine concurrent tool requests, rejects the tenth with JSON-RPC -32001 / zotero_mcp_inflight_limit, and keeps timed-out inflight admissions until handler settle. Retain 45-second watchdog, circuits, listener recovery and diagnostic bypass; remove pending queue, queue timeout, positions and wait metrics.

Workflow/ACP/Synthesis/package consumers use only pages and controls; no array/page unions or array fallback. Complete consumers follow hasMore/nextCursor even for empty pages. Existing callback-scoped traversal/snapshot interfaces remain their own complete-consumption abstraction.

### Deletion ownership

| Inventory | This change | Remaining owner |
| --- | --- | --- |
| DEL-01 | Ordinary library members/casts/fallbacks in legacy Bridge projection | Narrow context-only projection until selection change |
| DEL-02 | Legacy list/item/note/payload/attachment read helpers after all result consumers move | Current/selected helpers: selection; open helpers: navigation; mutation-only primitives: writes |
| DEL-05 | Zotero ordinary read repagination and collection full enumeration | Context pages: selection; non-Zotero pagination retained |
| DEL-16 | Whole-tool MCP FIFO, pending/wait/position semantics and corresponding assertions | Transport admission, watchdog and circuits retained |

Only old ordinary-read array/offset instructions, obsolete ordinary-cursor TTL claims, and MCP whole-tool queue instructions in these entries are authorized for semantic replacement. Preserve all unrelated surface instructions in place. Record per-file baseline substantive lines and normalized prose characters before source edits, then map each replacement to its current owner and require unmapped/downgraded/unauthorized-dropped/intra-package-duplicate counts of zero. Do not reset the baseline between changes.

## Risks / Trade-offs

- Large/corrupt source content becomes an explicit resource/read error rather than an apparently complete partial result.
- Unknown payload total requires consumers to obey continuation rather than array length.
- Native operations cannot always be physically canceled; logical cancellation does not release a still-running native slice.
- Shared files are changed by later issue #39 work; synchronize only this change's requirements, preserving unrelated contracts and the separately active Synthesis change.
- Three fixed Zotero schemas share the required source columns; runtime compatibility still requires the repository matrix and cannot be inferred from Node mocks.

## Migration Plan

Implement vertical behavior slices at the approved Broker, Bridge/MCP, Workflow and CLI seams, extending existing tests red-before-green. Update canonical DTOs, source reads, callers, executable schemas and deletions in the same change. Render governed content only after semantic review, refresh the official review mirror, and record each actual verification command/result. Verify/sync/archive only after tasks and evidence are complete. No release set preparation or remote publication occurs in this change.
