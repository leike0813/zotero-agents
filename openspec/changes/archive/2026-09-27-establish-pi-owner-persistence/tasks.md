# Tasks

## Contract and red tests

- [x] Add OpenSpec contract and shared browser-safe tests for owner isolation, append order, idempotency, indexed pages, and rebuild; demonstrate the missing C02 implementation fails.
- [x] Add Node fault tests for projection failure, torn tail, middle corruption, and explicit repair; admit the test to the runtime persistence shard and Zotero core-lite runner.

## Implementation

- [x] Extend runtime paths and existing plugin SQLite schema with the Pi owner location and one registry table.
- [x] Implement canonical JSONL, strict validation, serialized append, bounded indexed pages, integrity inspection, and explicit repair.
- [x] Implement distinct owner records, projection status and rebuild from canonical logs.

## Verification

- [x] Pass the focused Node shard and real Zotero Pi persistence test; run lint, build, and strict OpenSpec validation.
- [x] Verify implementation against the change, sync the spec, archive the change, and update the living handoff with actual evidence.
