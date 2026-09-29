# Tasks

## 1. Gateway failure contract

- [x] 1.1 Add a failing public Gateway test for bounded structured executor failure facts and payload-free receipts; run the targeted test.
- [x] 1.2 Extend the generic Gateway execution/result contract and pass the targeted Gateway tests.

## 2. Native catalog vertical slice

- [x] 2.1 Add failing shared tests for the one descriptor, strict empty input, admission, dual identity, DTO, and safe errors; register the Node shard and run the new suite.
- [x] 2.2 Implement the broker-bound catalog and pass the shared Node/Gateway suite.
- [x] 2.3 Add and pass the real Zotero lite current-view canary; update the Pi handoff with actual C12 behavior and remaining work.

## 3. Integrated acceptance

- [x] 3.1 Pass relevant Node shards and full Node suite, real Zotero core, lint, build, and strict OpenSpec validation; record exact evidence in `verification.md`.
- [x] 3.2 Complete official OpenSpec verification, sync both delta specs into main specs, and archive the fully checked change.
