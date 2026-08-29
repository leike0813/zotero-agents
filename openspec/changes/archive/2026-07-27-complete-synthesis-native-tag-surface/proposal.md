## Why

The nineteen Tag operations span vocabulary validation, import preview/apply, staged suggestions, audit records, builtin policy, promotion, and Zotero tag effects. They need one typed mutation model and cannot be validated by handler-name completeness.

## What Changes

- Implement the nineteen Tag operations assigned by the R9a operation-ownership matrix.
- Preserve vocabulary, staged-suggestion, import, audit, builtin-policy, and regulator-export DTOs.
- Use Rust durable owners for vocabulary/staging state and declared preconditioned reverse-Host ports for Zotero tag effects.
- Add differential, CAS, import-preview/apply, partial Host failure, restart, bounds, and deadline fixtures before ready-roster admission.

## Capabilities

### New Capabilities

- `synthesis-native-tag-surface`: Complete native Tag vocabulary, staging, audit, import, and Host-effect semantics.

### Modified Capabilities

None.

## Impact

This change affects Tag compatibility/application ports, repository state, staged binding and reverse-Host adapters, and focused Rust/Core/Stage-1 tests. It does not enable the global mutation gate.
