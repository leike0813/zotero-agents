Implementation baseline: `4dbddc24e884921262c559428bf851db5eadf2d7`. Apply after `01-establish-workflow-host-v12-contract-foundation`.

## 1. Cross-Language Contract Tests

- [ ] 1.1 Extend `test/core/175-synthesis-client-foundation.test.ts`, `176-synthesis-client-lifecycle-consumers.test.ts`, and `177-synthesis-workflow-client.test.ts` with failing four-group/fourteen-member, no-flat-alias, invocation-late-client, and implicit-widening cases.
- [ ] 1.2 Extend `test/core/188-synthesis-tag-vocabulary-engine.test.ts`, `220-synthesis-native-client-composition.test.ts`, `229-synthesis-production-client-rust-route.test.ts`, and `233-synthesis-native-tag-surface.test.ts` with failing `applyTopicPlan`, promotion, audit-run, and acknowledgement parity cases.
- [ ] 1.3 Extend `test/workflow-tag-auditor/66-tag-compliance.test.ts` and `test/workflow-tag-regulator/65-workflow-tag-regulator-mock-e2e.test.ts` with failing complete/incomplete audit, concurrent promotion, receipt acknowledgement, and old-process receipt cases.

## 2. Canonical Contract Package

- [ ] 2.1 Add the missing Topic plan apply, staged-tag promotion, tag-audit run, writer, result, and regulation acknowledgement DTOs once in `packages/synthesis-contracts/src/**`; verify TypeScript and Rust contract parity and recursive DTO tests pass.
- [ ] 2.2 Update canonical exports and remove duplicate adapter-local declarations without changing unrelated wire identities; verify no unresolved alias or competing declaration remains.

## 3. Native Application and Repository

- [ ] 3.1 Implement `applyTopicPlan` and staged-tag promotion in `native/synthesis-sidecar/crates/synthesis-application/**`, using existing repository transactions and typed Host ports; verify process integration tests pass.
- [ ] 3.2 Implement isolated audit staging, bounded append, active basis, concurrent-run conflict, atomic promotion, cancellation, abort, crash cleanup, and telemetry inside application/repository owners; verify Rust invariant and repository tests pass.
- [ ] 3.3 Implement regulation acknowledgement as one transaction validating active audit identity, process-valid Host receipt, operation/target, and revisions; verify mismatched, failed, old-process, and confirmed unchanged cases.

## 4. Grouped TypeScript Projection

- [ ] 4.1 Refactor `src/modules/synthesisClient/workflowHostClient.ts`, `clientPortAdapter.ts`, `nativeComposition.ts`, and `defaultClient.ts` to one explicit grouped adapter that resolves the current client per invocation; verify fourteen-member conformance and native routing tests pass.
- [ ] 4.2 Keep library/tag/related/artifact/delivery reverse effects on existing typed ports and keep repositories/RPC/lease/fencing/telemetry out of Workflow types; verify import and interface governance.

## 5. Workflow Migration

- [ ] 5.1 Migrate `workflows_builtin/synthesis-layer/**` and literature-workbench Synthesis callers to grouped `workflowApply`, `topics`, and `artifacts` members; verify Synthesis workflow suites pass.
- [ ] 5.2 Migrate tag-auditor, tag-regulator, tag-bootstrapper, `lib/tagRegulatorRequest.mjs`, and related helpers to grouped tag members, `withAuditRun`, and receipt-bound acknowledgement; verify workflow tests pass.
- [ ] 5.3 Retain v11 flat projection only as a temporary adapter to the grouped implementation and defer legacy `SynthesisService` deletion; verify no duplicate behavior or premature public deletion.

## 6. Completion

- [ ] 6.1 Run canonical contract, TypeScript client, Rust application/repository, native route, Synthesis workflow, tag-auditor/regulator, and Topic tests, then `npm run test:synthesis:invariants`, Node/workflow tests, `npm run build`, lint checks, and strict OpenSpec validation; record all results.
- [ ] 6.2 Verify the final grouped shape is 4 groups/14 members and that flat aliases, raw callbacks, repositories, leases, fencing, telemetry, and unrelated client methods are absent from the candidate v12 projection.
