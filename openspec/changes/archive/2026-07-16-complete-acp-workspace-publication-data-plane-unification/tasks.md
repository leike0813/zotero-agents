## 1. Recovery and contract-first TDD

- [x] 1.1 Verify the Round1 Chat and Skills owner-first/page-first transcript behavior and forced publication drain before introducing v3 code.
- [x] 1.2 Add parameterized Chat/Skills production-adapter conformance tests for canonical fields, status invariants, null semantics, mapping exhaustiveness, boundary release, page identity, ACK, gap/rebase, and forbidden materialization.
- [x] 1.3 Add the Workspace production vocabulary guard and v3 runtime serialization validation that reject old transcript/publication fields and `undefined` wire values.

## 2. Canonical v3 read model and protocol

- [x] 2.1 Implement the v3 owner, transcript region, page request/page, shared item/mutation, region payload, publication, barrier, and acknowledgement types with unambiguous revision scopes.
- [x] 2.2 Migrate Chat and Skills full initialization/page read models to the single transcript region and shared page vocabulary, updating shared panel/sidebar models without dual fields.
- [x] 2.3 Replace Chat/Skills child transcript state and page request schemas with the same transcript region model and owner-plus-request action.

## 3. Producer-native shared publication plane

- [x] 3.1 Implement the shared transcript projection with held text, hard-boundary release, visible-row soft patch, bounded page window, append merge, and overflow state.
- [x] 3.2 Migrate Chat and Skills store event seams together to produce normalized mutations, and remove steady complete-page reads and reverse diff generation.
- [x] 3.3 Implement exhaustive paired domain mapping for transcript, counts/progress, reply/runtime-options, structural regions, and explicit not-applicable kinds.

## 4. Coordinator, Shell, receiver, and Replay

- [x] 4.1 Implement the shared coordinator with initialization single-flight, region/page revisions, terminal ACK advancement, forced rebase, exact barriers, and tracked async work.
- [x] 4.2 Implement Shell typed in-flight caching/replay and the shared browser receiver with page-scoped continuity, idempotent ACK, off-page metadata, and targeted row/text-node mutation.
- [x] 4.3 Route both child page/resync requests through the shared action and make Skills Replay turn/root/request boundaries use the production release seam.
- [x] 4.4 Make Replay sidecar drain exact publication barriers without unrelated historical pending lifecycle contamination.

## 5. Cleanup, profiling, and verification

- [x] 5.1 Delete old Workspace transcript/publication fields, compatibility paths, surface publication state machines, and complete-page diff logic; prove the production vocabulary guard is clean.
- [x] 5.2 Align profiler/replay labels and materialization counters with v3 semantics, and update profiler, parity, stall-risk, and failure-audit documentation.
- [x] 5.3 Run focused Node and Zotero suites covering 96, 97, 107, 171, 175, 179, 180, 182, 183 and the conformance suite.
- [ ] 5.4 Run `npm run lint:check`, `npm run build`, strict OpenSpec validation, and confirm no generated help-docs or unrelated user-change drift.
- [ ] 5.5 Run same-digest/cadence boundary formal Replay for both surfaces and verify transcript visibility, complete lifecycle, zero forbidden steady materialization, byte budgets, target-active overhead, and drift budgets on available Zotero 7/9 hosts.
