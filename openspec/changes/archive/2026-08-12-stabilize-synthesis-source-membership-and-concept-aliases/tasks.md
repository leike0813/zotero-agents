## 1. Lock regression behavior

- [x] 1.1 Extend split-runtime tests for candidate resolution, effective membership, manifest outcomes, and persisted triage.
- [x] 1.2 Extend integration/repository tests for accepted and basis-sensitive screened-out lifecycle behavior.
- [x] 1.3 Extend Concept KB tests for order-independent preflight, canonical-label-only merge, and alias audit actions.
- [x] 1.4 Extend UI/renderer tests for full-update discovery intent and alias audit controls.

## 2. Implement source membership

- [x] 2.1 Resolve bounded discovery candidates independently and materialize Stage 30's combined triage workset.
- [x] 2.2 Derive the effective source set from base resolver membership plus accepted candidate levels and persist membership diagnostics.
- [x] 2.3 Persist discovery basis/outcome data and commit exact hint outcomes only after successful apply.
- [x] 2.4 Route discovery-driven topic actions through `update_full`.

## 3. Implement strict alias handling

- [x] 3.1 Tighten Stage 50 guidance and schema and require Concept KB query context.
- [x] 3.2 Preflight the complete proposal batch against an immutable canonical snapshot.
- [x] 3.3 Restrict automatic merging to a unique exact canonical label and route conflicts to review with zero writes.
- [x] 3.4 Add deterministic alias audit plus keep/remove review actions with synchronized record updates.
- [x] 3.5 Expose alias audit state and actions in Workbench UI and localization.

## 4. Synchronize surfaces and documentation

- [x] 4.1 Render builtin topic-synthesis skill packages from canonical sources and verify byte parity.
- [x] 4.2 Update Synthesis source-membership and concept documentation.
- [x] 4.3 Confirm the specifications capture the durable constraints; no additional `AGENTS.md` rule is required.

## 5. Validate

- [x] 5.1 Run strict OpenSpec validation.
- [x] 5.2 Run focused runtime, service, repository, Concept KB, UI, and renderer tests.
- [x] 5.3 Run main/sidebar TypeScript checks and lint check.
