## 1. Baseline Tests

- [x] 1.1 Add failing boundary tests for complete service-method inventory, valid migration dispositions, and direct-consumer growth protection.
- [x] 1.2 Repair the `test:synthesis:invariants` command so it references current test files and uses a stable timeout, then confirm the corrected invariant baseline.

## 2. Migration Inventory and Fixtures

- [x] 2.1 Add the machine-readable service API migration inventory covering every returned method, consumer group, category, target capability, and disposition.
- [x] 2.2 Add a reusable boundary checker that compares the active service return object and direct-consumer set with the inventory without importing runtime code.
- [x] 2.3 Add text-based migration fixtures for schema identity, canonical Topic tree ownership, and bounded representative DTOs.
- [x] 2.4 Record the current correctness/performance/deployment baseline and the commands needed to reproduce it.

## 3. Current-State Documentation

- [x] 3.1 Reconcile the Synthesis documentation entry point and storage boundary so Topic canonical files and Zotero mirrors have unambiguous current ownership.
- [x] 3.2 Clarify current in-process runtime documentation and link the approved sidecar migration without describing the future service as already active.
- [x] 3.3 Replace the local-async-only invariant with a migration-safe single-owner invariant and attach executable evidence.

## 4. Validation

- [x] 4.1 Run the boundary tests, corrected invariant suite, targeted Synthesis tests, typecheck, and documentation checks; resolve all regressions.
- [x] 4.2 Run `openspec validate` and verify implementation completeness, requirement coverage, and design coherence for this change.
