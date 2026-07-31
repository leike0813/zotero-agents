## 1. Host queue contracts and behavior

- [x] 1.1 Extend existing Host queue tests for idempotent yield, priority resumption, independent submissions, shutdown/cancel races, and apply reacquisition.
- [x] 1.2 Separate unit settlement from slot ownership and expose the typed slot coordinator.
- [x] 1.3 Freeze safe provider/model metadata and stable non-numeric submission symbols.

## 2. Execution and continuation integration

- [x] 2.1 Extend execution-seam tests for waiting-state yield and apply-before-reacquire behavior.
- [x] 2.2 Map ACP/SkillRunner waiting and recoverable states to normalized slot reasons and guard Host apply.
- [x] 2.3 Gate replies, authorization, recovery, and retry callbacks through priority admission while keeping cancel unblocked.

## 3. Task drawer lineage presentation

- [x] 3.1 Extend existing ACP Skills, SkillRunner, and DOM identity tests for symbols, fallbacks, tooltip/ARIA parity, terminal hiding, and row-only refresh.
- [x] 3.2 Carry submission display identity through queued and runtime task projections without persisting credentials.
- [x] 3.3 Render the shared title-prefix symbol and localized tooltip/ARIA semantics using row-local signatures.

## 4. Documentation and verification

- [x] 4.1 Update queue, execution-seam, Assistant Workspace, and SkillRunner current-state SSOT documentation.
- [x] 4.2 Run focused core/UI tests, TypeScript, target lint/format, SSOT/localization checks, build, and strict OpenSpec validation.
