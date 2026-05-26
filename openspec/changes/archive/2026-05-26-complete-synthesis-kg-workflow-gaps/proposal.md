## Summary

Close the remaining Synthesis KG workflow gaps that are still runtime-visible after the previous phase work: Tag Vocabulary import wizard, Topic Graph relation review queue, Concept Review candidate selection, non-blocking read-only Literature/MCP registry access, and Git Sync credential-bearing remote URL rejection.

This change intentionally does not archive or sync the active OpenSpec changes into main specs.

## Motivation

The core canonical services are present, but several user-facing or safety-critical loops are still incomplete:

- Tag import preview exists, but the Workbench cannot persist preview state or apply an explicit import action.
- Topic Graph can accept/reject existing suggested edges, but low-confidence relation proposals do not enter a review queue.
- Concept Review merge uses the first candidate implicitly in the UI.
- `getPaperRegistry()` can synchronously rebuild missing projections from a read-only path.
- Git Sync token storage is encrypted, but credential-bearing remote URLs are not rejected before Git config writes.

## Scope

- Add Workbench and service wiring for tag import preview/apply.
- Add Topic Graph review items for low-confidence relation proposals and review actions.
- Require explicit Concept Review merge target selection in the UI.
- Make read-only paper registry access non-blocking when projections are missing or stale.
- Reject Git remote URLs that embed credentials.

## Out of Scope

- Archiving existing OpenSpec changes or syncing their delta specs to main specs.
- SQLite/FTS/BM25 projection backend implementation.
- Complex graph editor, batch review, semantic merge, hosted sync, or new external write APIs.
