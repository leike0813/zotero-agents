## Why

Synthesis design invariants currently live in `doc/synthesis-layer/contracts/invariants.yaml` as stable IDs with prose evidence, but the repository has no executable guard that proves every invariant is backed by a real test. This makes it easy for future design changes to add or edit invariants without adding runnable coverage.

## What Changes

- Add machine-readable `test_refs` to every Synthesis invariant.
- Add a guard test that validates invariant shape, `test_refs` reachability, marker uniqueness, reverse marker consistency, and static-only exceptions.
- Annotate existing behavior tests with invariant markers.
- Add static guard tests for architecture-style invariants that are best enforced by source inspection.
- Add a focused npm script for the invariant guard suite.

## Capabilities

### New Capabilities

- `synthesis-invariant-guardrails`: executable invariant evidence mapping and guard tests.

## Impact

This affects Synthesis contract YAML, test titles, one new guard test file, package scripts, and OpenSpec artifacts. It does not change runtime behavior.
