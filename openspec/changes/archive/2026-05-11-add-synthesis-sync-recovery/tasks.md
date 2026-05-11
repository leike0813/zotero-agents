# Tasks

## 1. OpenSpec Contracts

- [x] Add proposal, design, tasks, and delta specs for sync recovery.
- [x] Validate the change status with OpenSpec.

## 2. Recovery Model Tests

- [x] Add tests for missing root with valid shards requiring confirmation.
- [x] Add tests for canonical assets taking precedence over stale mirrors.
- [x] Add tests for degraded mirror diagnostics.
- [x] Add tests for local index corruption rebuild planning.
- [x] Add tests for startup hash-check preference gating.
- [x] Add tests for conflict candidate sorting and clear/retry actions.

## 3. Recovery Model Implementation

- [x] Add sync recovery types and assessment helpers.
- [x] Add mirror manifest validation against decoded shard summaries.
- [x] Add disaster recovery planning from shards.
- [x] Add divergent canonical version planning.
- [x] Add conflict candidate normalization helpers.
- [x] Add startup check preference gate.

## 4. UI Snapshot Integration

- [x] Extend Synthesis UI snapshot with sync diagnostics.
- [x] Extend Synthesis UI snapshot with local conflict candidate summaries.
- [x] Render degraded sync and conflict summaries in the Synthesis Overview.

## 5. Verification

- [x] Run targeted sync recovery and UI model tests.
- [x] Run `npx tsc --noEmit`.
