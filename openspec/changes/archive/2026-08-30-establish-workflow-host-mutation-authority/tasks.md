Implementation baseline: `4dbddc24e884921262c559428bf851db5eadf2d7`. Apply after `01-establish-workflow-host-v12-contract-foundation`.

## 1. Mutation Lifecycle Tests

- [x] 1.1 Extend `test/core/102-zotero-host-broker-capability-api.test.ts` with failing cases for reservation, identical replay, digest conflict, in-progress behavior, revision CAS, committed/unchanged receipts, failed/canceled/unknown/repair attempts, and restart invalidation.
- [x] 1.2 Add failing table-driven preview tests for `item.changeType`, permanent `item.remove`, and `collection.remove`, including complete plans, observations, 15-minute token expiry, caller scope, fresh-read drift, restart, equivalent reissue, and hard-limit rejection.
- [x] 1.3 Extend stored attachment, note image/payload, and status-tag tests with failing prevalidation, staging, post-create rollback, cleanup-secondary, receipt, and structured partial-outcome cases.

## 2. Canonical Contract and Registry

- [x] 2.1 Add the eleven execute requests/results, three preview requests/plans, receipt/change/version, attempt/recovery, specialized mutation, and token DTOs to `src/workflows/types.ts`; verify exhaustive maps have no open string fallback or duplicate declaration.
- [x] 2.2 Implement canonical request/plan/effect normalization and bounded process-local reservation/result registry in `src/modules/zoteroHostCapabilityBroker.ts`; verify identical operations execute once and conflicting digests fail before writes.
- [x] 2.3 Implement actual-delta collection, final-state verification, receipt issuance, primary/secondary failure ordering, bounded retention, and restart invalidation; verify accepted operations never lose attempt evidence through a thrown-only path.

## 3. Preview and Generic Operations

- [x] 3.1 Implement the read-only preview pipeline and caller-scoped token validation for the three destructive operations, sharing normalization with execute; verify no preview performs a write or returns a truncated plan.
- [x] 3.2 Route the eleven canonical item/relation/collection operations through admission, revisions, handlers as private primitives, compensation, and verification; verify operation-specific result and receipt tests pass.
- [x] 3.3 Keep v11 handler-shaped aliases functional only through temporary adapters and do not expose new v12 operations publicly yet; verify production version/member conformance remains v11.

## 4. Notes Images and Attachments

- [x] 4.1 Route note create/update/remove and payload upsert through the canonical authority, updating `src/workflows/hostApi.ts` adapters and note owner modules; verify revision, payload-health, embedded-image, unknown, and repair tests pass.
- [x] 4.2 Deepen `src/workflows/workflowStoredAttachmentImport.ts` so source and all companions validate and stage before attachment creation; verify unsafe, unreadable, collision, and unavailable failures create no Zotero attachment.
- [x] 4.3 Route attachment create/update/replace/move/remove through the authority and preserve primary failure during post-create cleanup; verify `test/core/90-workflow-stored-attachment-import.test.ts` and attachment locality/result tests pass.

## 5. Status Tags and Internal Primitives

- [x] 5.1 Route `statusTags.transition` through canonical admission/finalization, remove open warning results, and migrate MinerU, metadata curator, deep reading, search ingest, and literature analysis to structured envelopes; verify their partial-result tests pass.
- [x] 5.2 Refactor `src/handlers/index.ts` and Broker composition so handlers remain explicit internal primitives and cannot be spread or inferred into Workflow Host; verify governance catches a test-only handler widening.
- [x] 5.3 Remove duplicate mutation registries, revision helpers, result envelopes, and shallow tests only after owner-interface coverage passes; verify there is one SSOT for each rule.

## 6. Completion

- [x] 6.1 Run focused Broker, preview, note, payload, image, attachment, tag, and affected workflow tests, then `npm run test:node:core`, `npm run test:node:workflow`, relevant Zotero suites, `npm run build`, lint checks, and strict OpenSpec validation; record all results.
- [x] 6.2 Verify no durable ledger, restart replay, restore operation, symmetric relation operation, generic warning bag, raw handler exposure, or premature v11 removal entered the diff.

### Validation record (2026-08-30)

- Focused Broker, preview, note, payload, image, attachment, status-tag, and affected workflow suites: 167 passing, 14 pending. The focused MCP/Host Bridge v11 compatibility rerun after moving the test harness to `legacyMutations` added 73 passing.
- `npm run test:node:workflow`: 250 passing, 25 pending.
- `npm run test:node:core`: 3093 passing, 64 pending, 40 failing on the first full run. Seven mutation compatibility failures were fixed and passed in the 73-test focused rerun; the isolated Host Bridge command-reference timeout also passed. The remaining failures are outside this change: fixed-snapshot consumer/surface drift, a cross-language corpus count drift, and unavailable prebuilt Synthesis sidecar routes.
- `npm run test:zotero:core`: test build passed, but the local runner could not connect to Zotero after its retry budget (`ECONNREFUSED 127.0.0.1:38719`), so no Zotero-runtime result was available.
- `npm run build`: passed, including help docs, Synthesis package checks, plugin production build, and both TypeScript configurations.
- `npm run lint:check`, `npx tsc --noEmit --pretty false`, and `git diff --check`: passed.
- `openspec validate 05-establish-workflow-host-mutation-authority --strict`: passed.
