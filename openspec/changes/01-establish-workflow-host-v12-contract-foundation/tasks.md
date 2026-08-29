Implementation baseline: `4dbddc24e884921262c559428bf851db5eadf2d7`.

## 1. Contract Characterization

- [ ] 1.1 Extend `test/core/102-zotero-host-broker-capability-api.test.ts` with failing table-driven cases for portable refs, strict-JSON rejection, bounded safe details, and complete fail-closed Broker doubles; verify failures are limited to missing foundation behavior.
- [ ] 1.2 Extend `test/node/core/187-workflow-host-contract-governance.test.ts` with failing recursive exactness, variant-shape, duplicate-declaration, unresolved-alias, and implicit-Broker-widening cases; verify the active production identity remains v11.

## 2. Shared Contract Owner

- [ ] 2.1 Add `src/workflows/workflowHostErrorContract.ts` with the eleven code union, exact details mapping, retryability policy, bounded sanitizers, strict-JSON validation, and safe factories; verify the new focused error-contract cases pass without importing runtime owners.
- [ ] 2.2 Refactor shared definitions in `src/workflows/types.ts` so `JsonValue`, portable refs, trusted in-process exceptions, `WorkflowCallControl`, canonical creator/shared DTO identities, and error data have one reachable declaration; verify TypeScript reports no duplicate or unresolved public aliases.

## 3. Broker Conformance

- [ ] 3.1 Update `src/modules/zoteroHostCapabilityBroker.ts` so public refs are portable and `ZoteroHostCapabilityError` conforms to the shared contract while preserving Broker SSOT; verify Broker tests reject raw objects and native causes.
- [ ] 3.2 Replace partial Broker test doubles with complete fail-closed adapters in the existing test helpers; verify an unconfigured capability cannot reach the real Zotero runtime or be hidden by `as any`.

## 4. Candidate V12 Identity

- [ ] 4.1 Extend `src/workflows/workflowHostContract.ts` with side-effect-free recursive candidate-manifest inspection and bidirectional exactness helpers without changing `WORKFLOW_HOST_API_VERSION`; verify both candidate variants are checked recursively.
- [ ] 4.2 Add governance that a new Broker member cannot enter a Workflow projection through whole-domain assignment, spread, proxy, or catalog; verify the dedicated drift cases fail on an intentionally widened test projection.

## 5. Completion

- [ ] 5.1 Run the focused Broker/contract files, `npm run test:node:core`, TypeScript/build checks, and `openspec validate 01-establish-workflow-host-v12-contract-foundation --strict --no-interactive`; record pass/fail/not-run evidence and resolve every task-scoped failure.
- [ ] 5.2 Inspect the diff for copied error/ref/JSON unions, runtime imports in the neutral module, partial v12 publication, or unrelated edits; verify all counts are zero and baseline-bound scope is preserved.
