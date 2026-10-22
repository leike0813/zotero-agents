# Proposal

## Why

JobQueue currently classifies SkillRunner failures and writes its run store, while runSeam also infers canonical events from generic job notifications. This splits settlement ownership and makes changing queue mechanics affect backend recovery. Related provider specifications still describe an obsolete request-ready handoff that contradicts current foreground execution.

## What Changes

- Give the local queue a typed, provider-neutral execution outcome and a settlement notification after the job result is stored.
- Consolidate SkillRunner progress, failure classification, canonical events and session effects in the existing run domain; retain workflow composition and UI wiring in runSeam.
- Preserve raw provider results, metadata names, persistence, foreground continuation, sequence apply and submission-slot behavior.
- Correct directly related stale provider requirements and component documentation to current foreground/recovery ownership.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-execution-runtime`: provider-neutral local dispatch outcomes and metadata preservation.
- `workflow-execution-seams`: one settlement owner and result availability before canonical publication.
- `provider-adapter`: request-ready recovery boundary and foreground SkillRunner execution/sequence apply.

## Impact

Changes the internal JobQueue execute callback contract and its production composition in runSeam; extends the existing SkillRunner run settlement module. Direct queue test callers and component documentation must follow the new contract. No dependencies, backend wire contracts, persistent migrations, UI changes or queue consolidation are required.
