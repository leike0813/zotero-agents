## 1. Regression Evidence

- [x] 1.1 Make the direct production-route harness use unique request IDs by default while allowing an explicit replay identity
- [x] 1.2 Add a real-process request replay regression that proves one receipt, worker, lifecycle, and Host-effect chain before and after terminalization
- [x] 1.3 Add a real restart regression with more than 1,000 non-terminal public receipts plus terminal distractors and generic running work
- [x] 1.4 Run the new cases against the fixed baseline and record their expected failures before implementation

## 2. Durable Replay Ownership

- [x] 2.1 Derive public maintenance operation IDs from request ID, capability, and canonical source hash without acceptance time
- [x] 2.2 Return the stored row and first-insert flag atomically, preserving retry-successor replay semantics
- [x] 2.3 Publish accepted lifecycle and spawn maintenance work only for the first durable insert; fail closed on a conflicting stored basis

## 3. Restart Reconciliation

- [x] 3.1 Add basis filtering and stable operation-ID keyset pagination to bounded repository operation reads
- [x] 3.2 Remove lifecycle mutation from repository open and preserve all rows for explicit runtime reconciliation
- [x] 3.3 Classify every public pending/running receipt and generic running row through the explicit paged startup boundary without touching terminals

## 4. Documentation and Verification

- [x] 4.1 Sync the approved delta requirements to main OpenSpec and update current runtime documentation
- [x] 4.2 Append fourth-stage baseline, TDD evidence, patch identity, validation results, remaining blockers, and non-release scope to the premerge audit
- [x] 4.3 Run Rust format, Clippy, workspace tests and build; focused Node real-process tests; service, contract, capability, surface, OpenSpec, Prettier, and diff gates
