## 1. Durable Sync State

- [x] 1.1 Add sync effect/provenance schema and repository APIs.
- [x] 1.2 Implement add/revoke related-items sync worker from matched library edges.
- [x] 1.3 Route Zotero related-items echoes through durable attempts/effects.
- [x] 1.4 Add startup recovery for pending attempts.

## 2. Verification

- [x] 2.1 Add tests for crash window recovery after Zotero add.
- [x] 2.2 Add tests for echo loop suppression.
- [x] 2.3 Add tests proving user-created and pre-existing relations are not removed.
- [x] 2.4 Run focused tests and `openspec validate implement-synthesis-related-items-sync-outbox --strict`.
