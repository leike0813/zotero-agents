## 1. Contract Evidence

- [x] 1.1 Add failing differential fixtures for all nineteen owned Tag operations and their public vocabulary, stage, audit, import, policy, and export DTOs
- [x] 1.2 Add preview/apply conflict, Host effect/receipt, partial failure, restart, payload-bound, and deadline fixtures

## 2. Vocabulary and Policy Surface

- [x] 2.1 Implement load/save/validate/update/delete/rebuild and regulator-export semantics over durable vocabulary state
- [x] 2.2 Implement durable builtin-policy initialization/status and audit replace/clear semantics

## 3. Staging and Import Surface

- [x] 3.1 Implement staged suggestion list/create/update/promote/discard/clear with stable basis and result DTOs
- [x] 3.2 Implement import preview/apply bound by preview digest and current vocabulary basis

## 4. Host Effects and Recovery

- [x] 4.1 Implement preconditioned reverse-Host Tag effects with durable intent and typed receipts
- [x] 4.2 Reconcile post-effect transport failure and restart idempotently without duplicate Zotero mutations

## 5. Domain Gate

- [x] 5.1 Pass the nineteen-operation differential corpus, focused Rust/Core/Stage-1 tests, format/clippy, and cross-language checks
- [x] 5.2 Promote only proven Tag capabilities to the ready roster without opening the global mutation gate
