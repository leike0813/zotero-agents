Implementation baseline: `4dbddc24e884921262c559428bf851db5eadf2d7`. Apply after contract foundation; reuse live-read serializers without making live pagination a snapshot source.

## 1. Governed Baseline and Tests

- [x] 1.1 Before semantic source edits, run `npx tsx scripts/host-bridge-semantic-review-context.ts`, resolve affected surfaces from `host-bridge/surfaces.json`, record materialized file metrics against the fixed baseline, and record the approved semantic deletion inventory as empty.
- [x] 1.2 Add failing Broker and Workflow tests for process-scoped session identity, fixed basis, 30-minute TTL, one-million-item cap, 500/1,000 batch bounds, cursor binding, callback cancellation, restart invalidation, and completion evidence.
- [x] 1.3 Add failing Host Bridge/CLI/Hermes tests for remote cursor projection, staged generations, complete promotion, absent-row deletion, interrupted refresh, and prior-index preservation.

## 2. Canonical Snapshot Contract and Broker Owner

- [x] 2.1 Add snapshot DTOs once under `packages/synthesis-contracts/src/**` where cross-language identity is required and import them from TypeScript/Rust adapters; verify canonical contract parity tests pass without duplicate declarations.
- [x] 2.2 Implement the bounded process-local snapshot registry and capture/read/terminal lifecycle in `src/modules/zoteroHostCapabilityBroker.ts`; verify foreign, expired, mismatched, over-limit, canceled, and restarted sessions cannot produce completion evidence.
- [x] 2.3 Add the callback-scoped internal adapter for eventual `library.withItemSnapshot` in `src/workflows/hostApi.ts` without activating v12; verify serial callback and terminal-result tests pass.

## 3. Remote Projection and Transactional Refresh

- [x] 3.1 Update `src/modules/hostBridgeCapabilityRegistry.ts`, `src/modules/zoteroMcpProtocol.ts`, and `cli/zotero-bridge/**` with strict-JSON opaque snapshot/cursor projection; verify no local path, native handle, registry record, or unrelated v12 member is exposed.
- [x] 3.2 Update `src/modules/synthesis/libraryAdapter.ts` and `src/modules/synthesisClient/**` to consume the snapshot owner while keeping Zotero semantics in the TypeScript Host adapter; verify native client routing tests pass.
- [x] 3.3 Implement staging-generation and atomic promotion in `native/synthesis-sidecar/crates/synthesis-application/**`, `synthesis-repository/**`, and Hermes source under `profiles_src/hermes/zotero-librarian/**`; verify incomplete refreshes preserve the prior generation and complete empty snapshots may promote empty state.

## 4. Agent-Facing Semantic Review

- [x] 4.1 Review minimum-core, Generic, and Hermes semantic sources resolved by the surface manifest; add snapshot guidance at matching operational thickness without deleting, compressing, merging, reordering, or thinning any baseline instruction.
- [x] 4.2 Run the package gate with `--baseline-ref 4dbddc24e884921262c559428bf851db5eadf2d7` and verify substantive instruction lines do not fall, normalized prose stays at least 95%, every baseline reference remains reachable, and every depth warning is explicitly accepted or expanded.
- [x] 4.3 Complete the semantic-review return contract with unmapped=0, downgraded=0, unauthorized dropped=0, intra-package duplicate=0, all three surfaces aligned, and no blocker; invoke the governed renderer/checks only after this review and never edit generated targets directly.

## 5. Completion

- [x] 5.1 Run focused Broker, Host Bridge, MCP, CLI, Hermes, Synthesis contract/application/repository, and process integration tests, then `npm run test:node:core`, `npm run test:synthesis:invariants`, `npm run build`, Host Bridge surface checks, and strict OpenSpec validation; record all results.
- [x] 5.2 Verify no incremental cursor, tombstone feed, cross-process resume, pagination-cache correctness dependency, unrelated Host Bridge exposure, release dispatch, or Zotero user-library migration entered the diff.
