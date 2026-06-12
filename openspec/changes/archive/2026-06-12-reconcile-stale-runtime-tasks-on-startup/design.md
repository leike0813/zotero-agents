# Design

## Runtime Domains

Synthesis runtime work remains represented by explicit Synthesis operation rows. Provider task UI remains represented by workflow task projection rows in plugin task state. Reconciliation must respect those SSOT boundaries.

## Synthesis Startup Reconcile

Synthesis in-process operations cannot continue after the plugin process exits. Startup reconciliation therefore cancels persisted `running` Synthesis operations immediately, with a diagnostic marking the operation as stale after restart. The existing time-based stale guard remains a runtime fallback.

## Provider Projection Reconcile

Provider workflow task rows are UI projections and must not override backend SSOT state.

- ACP projections are reconciled by ACP skill run records. Terminal, archived, or removed runs update/remove their workflow task rows. Recoverable non-terminal runs remain recoverable. Non-recoverable non-terminal ACP runs are failed by the ACP store because no local controller survived restart.
- SkillRunner projections with both `backendId` and `requestId` are left for backend ledger reconciliation.
- Orphan, pass-through, unknown, or unrecoverable projection rows are failed locally so they leave active UI surfaces while retaining diagnostics.

## Startup Order

Startup invokes Synthesis reconciliation and provider projection reconciliation after workflow registry loading and before UI entrypoints can render running-task surfaces. Failures are best-effort and logged without blocking plugin startup.
