# Tasks

## 1. Skill rendering boundary

- [x] 1.1 Extend the existing Python tests with synthetic persisted state and the public finalize_outputs CLI; observe the matching-metadata regression before fixing the schema, then verify readable full artifacts and matching stdout/result mirror.
- [x] 1.2 Promote the matching-metadata artifact schema to its root without weakening constraints; verify parameterized invalid payload rejection and existing Citation/score rendering behavior.

## 2. Catalog and protocol acceptance

- [x] 2.1 Extend the existing native workflow test with fresh and rebuilt public catalogs; demonstrate red/green artifact validation and preserve real sidecar apply, canonical artifacts, managed notes and reopen idempotency.
- [x] 2.2 Run relevant literature/workbench regressions and synthesis contract checks; record current commands, results, scope and delivery limitations in verification.md and validate the OpenSpec change strictly.

## Workflow follow-up

- With separate authorization, push the recorded Skill/parent commits and deliver a new Content Package patch through the existing governed workflow.
- Verify the delivered content in an isolated installation with an empty catalog before updating local content. Do not modify failed runs or historical acceptance receipts.
