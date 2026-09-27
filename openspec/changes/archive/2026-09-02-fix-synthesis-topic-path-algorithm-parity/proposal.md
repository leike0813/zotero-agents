## Why

The TypeScript and Rust Synthesis canonical Topic path helpers disagree for Topic IDs that cannot produce an ASCII slug. TypeScript currently uses `slice(7, 16)`, which emits a 9-character hash directory, while Rust derives 16 characters; existing profiles therefore fail startup with `canonical_legacy_topic_sources_mismatch` even though their snapshots are valid.

## What Changes

- Correct the TypeScript canonical fallback to emit the same 16 hexadecimal characters as Rust.
- Add a read-only compatibility path for historical 9-character TypeScript directories.
- Keep new promotions and projections on the 16-character canonical path.
- Preserve historical snapshot bytes and fail closed for invalid or ambiguous current data.
- Add shared path identity vectors and real native startup coverage for an existing 9-character snapshot.

## Capabilities

### New Capabilities

- `synthesis-topic-path-identity`: Defines canonical Topic path derivation and safe compatibility reads for historical TypeScript directories.

### Modified Capabilities

None.

## Impact

- TypeScript canonical Topic contract and Topic application path IDs.
- Rust canonical store reads, capture, archive, and legacy production preflight.
- Cross-language contract fixtures and native process migration tests.
- Synthesis persistence documentation.
- No dependency, database schema, wire protocol, release, or prebuild changes.
