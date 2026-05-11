# Verify Synthesis Layer Zotero Runtime Smoke

## Why

Synthesis Layer v1 integration now writes canonical assets and refreshes Zotero
note shard mirrors through a service adapter. The remaining high-risk gap is
runtime verification: the adapter must behave correctly against Zotero item/note
APIs, and mirror deletion must be detectable as degraded rather than silently
treated as healthy.

## What Changes

- Add a focused Zotero runtime smoke test for canonical writes, anchor creation,
  child note shard creation/update, and default host API exposure.
- Extend the mirror adapter contract with shard listing so sync assessment can
  detect missing/deleted note shards.
- Keep the change limited to verification hardening; do not add new Synthesis
  product scope or UI functionality.

## Impact

- Adds one smoke test file under `test/core/`.
- Extends `SynthesisMirrorAdapter` with optional `listShards`.
- Updates Synthesis service snapshot assessment to use listed mirror shards when
  available.
