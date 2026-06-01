## Why

Registry rebuild is foundational. A failed or suspicious rebuild must not replace
the active Registry basis, and Graph workers must be able to distinguish their
basis from newer Registry facts.

## What Changes

- Add Registry run/basis metadata.
- Stage full rebuild candidate facts before promotion.
- Validate candidate identity, binding, redirect, reference, and diagnostics
  integrity before promotion.
- Preserve last-known-good basis and expose explicit rollback.
- Supersede old Registry/Graph work when a new basis is promoted.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `synthesis-literature-registry-citation-graph`: Registry full rebuild becomes
  staged and validation gated.

## Impact

Affected implementation includes repository metadata, full Registry rebuild
service paths, validation report APIs, rollback/debug APIs, and rebuild tests.
