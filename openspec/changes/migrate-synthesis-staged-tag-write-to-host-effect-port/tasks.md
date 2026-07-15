## 1. Contract and Host Adapter TDD

- [x] 1.1 Add Core 181 red tests for shared stable refs, legacy resolution, Tag effect request/result rebuilding, bounds, invalid-before-Zotero behavior, idempotency, and stable receipts.
- [x] 1.2 Implement and export shared item-ref, migration, and Tag effect contracts; refactor Related Items to reuse the item-ref SSOT.
- [x] 1.3 Add shared Zotero item-ref lookup plus migration/effect adapters without raw Host error leakage.

## 2. Stable Binding Migration and Service Effects

- [x] 2.1 Extend Core 140/175 first for stable binding normalization, legacy migration success/failure, and hard rejection of new numeric bindings.
- [x] 2.2 Implement the guarded legacy migration and stable staged-binding persistence without changing the database schema.
- [x] 2.3 Extend promotion tests first for applied/already-satisfied effects and missing/throwing/malformed-port best-effort behavior.
- [x] 2.4 Route promotion exclusively through the Host Tag effect port and inject both Host ports in default legacy composition.

## 3. Workbench and Workflow Convergence

- [x] 3.1 Update Core 125 and workflow Tag tests first for stable refs, unchanged binding counts, stage-then-promote publication, and absence of direct bound-parent writes.
- [x] 3.2 Update Workbench projection/commands and Tag Regulator state normalization to carry stable refs.
- [x] 3.3 Remove duplicate numeric binding and direct bound-parent Zotero mutation helpers from Tag Regulator.

## 4. Boundary, Documentation, and Validation

- [x] 4.1 Update Core 168/176 boundary checks for default injection, readonly omission, environment-neutral service/workflow paths, and `128 methods / 1 direct consumer`.
- [x] 4.2 Update Synthesis runtime, ownership, and boundary documentation for stable staged bindings and the Host Tag effect port.
- [x] 4.3 Run targeted Core/workflow/readonly/invariant regressions and fix change-related failures.
- [x] 4.4 Run contract/root TypeScript, service-boundary, targeted formatting/lint, `git diff --check`, production build, and strict OpenSpec validation.
- [x] 4.5 Confirm all tasks complete without committing, publishing, or archiving the change.
