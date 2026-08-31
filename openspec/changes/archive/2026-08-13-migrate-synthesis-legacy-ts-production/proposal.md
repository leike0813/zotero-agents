## Why

Representative production data created before the Rust Synthesis sidecar cannot be opened by the current runtime: it carries the exact TypeScript schema marker `2026-06-01.sidecar-cache-hard-cut`, while Rust only registers foundation v1 to v2. Startup therefore fails before Rust can assume production ownership, leaving existing user facts and canonical Topic artifacts inaccessible.

## What Changes

- Add a fail-closed, one-time migration from the exact legacy TypeScript schema to the current Rust foundation schema.
- Preserve durable user facts and externally applied receipts while invalidating rebuildable cache and readiness state.
- Adopt an existing canonical Topic tree under the Rust production identity and reconstruct current Topic state from validated legacy sources.
- Complete existing staged Tag numeric binding migration through the reverse Host after repository migration.
- Add isolated real-profile acceptance that mutates only temporary copies and proves backup, restart, locking, identity, and source immutability.

## Capabilities

### New Capabilities

- `synthesis-legacy-production-migration`: Exact legacy-schema detection, backup, fact-preserving conversion, canonical adoption, atomic publication, and failure recovery.

### Modified Capabilities

- `synthesis-production-owner-cutover`: Existing paired legacy production stores become an accepted Rust startup input while the OS lock and canonical identity remain the only ownership authority.

## Impact

- Affects the Rust repository, canonical store, production startup composition, Topic projection construction, and production-route test harness.
- Does not change public Synthesis RPCs, launch config v3, client DTOs, or the current foundation schema identity.
- Adds no runtime dependency and does not restore plugin or Node ownership, cutover receipts, admission state, owner files, or rollback pointers.
