Implementation baseline: `4dbddc24e884921262c559428bf851db5eadf2d7`. Apply after `01-establish-workflow-host-v12-contract-foundation`.

## 1. Cross-Language Contract Tests

- [x] 1.1 Extend `test/core/175-synthesis-client-foundation.test.ts`, `176-synthesis-client-lifecycle-consumers.test.ts`, and `177-synthesis-workflow-client.test.ts` with failing four-group/fourteen-member, no-flat-alias, invocation-late-client, and implicit-widening cases.
- [x] 1.2 Extend the canonical contract, native composition, reverse Host, production-route, and Rust repository/application tests with failing `applyTopicPlan`, promotion, audit-run, and acknowledgement parity cases.
- [x] 1.4 Extend `test/core/102-zotero-host-broker-capability-api.test.ts` with failing traversal-only tag-digest cases proving each delivered digest and the completion coverage digest come from the same complete Host read.

## 2. Canonical Contract Package

- [x] 2.1 Add the missing Topic plan apply, staged-tag promotion, strict-JSON tag-audit/native-handshake, result, and regulation acknowledgement DTOs once in `packages/synthesis-contracts/src/**`; keep the trusted writer/callback and raw Host receipt wrapper in Workflow types, and verify TypeScript/Rust parity and recursive DTO tests pass.
- [x] 2.2 Update canonical exports and remove duplicate adapter-local declarations without changing unrelated wire identities; verify no unresolved alias or competing declaration remains.
- [x] 2.3 Add `LibraryTraversalItemDto` and Broker-owned `tagDigest` serialization only to `library.traverseItems`; keep ordinary item summaries unchanged and verify workflows do not implement tag hashing.

## 3. Native Application and Repository

- [x] 3.1 Harden existing `applyTopicPlan` to the closed request/result/receipt contract and reuse existing staged-tag promotion, repository transactions, and typed Host ports; verify process integration tests pass without creating a second promotion owner.
- [ ] 3.2 Implement v4 audit storage/migration, isolated staging, bounded append, active basis, concurrent-run conflict, atomic promotion, cancellation, abort, crash cleanup, and telemetry inside application/repository owners; verify migration, Rust invariant, and repository tests pass.
  - 注：除 operation telemetry（ADR §9.12 `TagAuditOperationSummaryDto`）外其余子项已完成；telemetry 未实现，留待后续 Synthesis operation/history 专项 contract 切片。
- [x] 3.3 Implement prepare/commit regulation acknowledgement with a process-valid pinned Host receipt, fresh Broker evidence, and native snapshot/revision/vocabulary CAS; verify mismatched, failed, old-process, newer-snapshot, and confirmed unchanged cases.

## 4. Grouped TypeScript Projection

- [x] 4.1 Refactor `src/modules/synthesisClient/workflowHostClient.ts`, `clientPortAdapter.ts`, `nativeComposition.ts`, and `defaultClient.ts` to one explicit grouped adapter that resolves the current client, Host verifier, and trusted audit identity per invocation; route canonical large payloads through the transfer plane and verify fourteen-member conformance and native routing tests pass.
- [x] 4.2 Keep library/tag/related/artifact/delivery reverse effects on existing typed ports; keep repositories/RPC/lease/fencing/telemetry and undeclared callbacks out of Workflow types while retaining only the declared trusted `withAuditRun` writer/callback; verify import and interface governance.

## 5. Activation Boundary

- [x] 5.1 Retain the active v11 flat projection as an adapter: delegate its eleven equivalent methods to the grouped implementation and keep `getTopicPlanningContext`, `replaceTagAuditRecords`, and `clearTagAuditRecord` as narrow invocation-late legacy passthroughs; defer caller migration and flat-name removal to `harden-workflow-host-api-v12` and verify no duplicate owner or premature deletion.

## 6. Completion

- [x] 6.1 Run canonical contract, TypeScript client, Rust application/repository, native route, Synthesis workflow, tag-auditor/regulator, and Topic tests, then `npm run test:synthesis:invariants`, Node/workflow tests, `npm run build`, lint checks, and strict OpenSpec validation; record all results.
- [x] 6.2 Verify the final grouped shape is 4 groups/14 members and that flat aliases, undeclared callbacks, repositories, leases, fencing, telemetry, and unrelated client methods are absent from the candidate v12 projection; scope flat-name governance to the candidate rather than the private full client or retained v11 transport.

## Validation record

- Canonical parity: 129 protocol capabilities, 104 production operations, and 25 Tag operations; all parity checks passed.
- TypeScript and real-route regression: 192 passed, with the isolated legacy production-owner migration fixture intentionally pending.
- Workflow Tag audit/regulation regression: 41 passed. Synthesis invariant suite: 9 passed.
- Rust library regression: application 93 passed, repository 60 passed, sidecar 85 passed. Workspace Clippy passed with warnings denied.
- `npm run build`, TypeScript checks, Prettier, ESLint, Rust formatting, diff whitespace, and strict OpenSpec validation passed.
