# Harden Synthesis Layer V1 Integration

## Why

The Synthesis Layer phase changes established schemas, pure helpers, projection
builders, MCP contracts, workflow validation, UI DTOs, sync recovery, and review
input shaping. They do not yet provide the production closure where a
`synthesize-topic` result is persisted as canonical assets, mirrored to Zotero
note shards, and read back by MCP, UI, and review workflow input from the same
state.

## What Changes

- Add a plugin-side Synthesis service as the single integration entrypoint for
  topic synthesis apply, snapshot reads, mirror refresh, artifact reads, and
  review input.
- Persist validated topic synthesis results to canonical Markdown/JSON assets
  using foundation hashes, envelopes, library write locks, and CAS checks.
- Save local conflict candidates on base-hash mismatch without overwriting
  current assets or refreshing the mirror.
- Refresh Zotero anchor/note shard mirrors from canonical assets through a
  host-owned adapter contract.
- Route workflow applyResult, MCP service methods, UI snapshots, and review
  input through the same persisted service state.

## Impact

- Adds Synthesis service integration code under `src/modules/synthesis/`.
- Refactors the builtin `synthesize-topic` applyResult hook to delegate to
  `runtime.hostApi.synthesis.applyTopicSynthesisResult`.
- Adds integration tests covering storage, CAS conflict behavior, mirror shard
  refresh, UI/MCP/review reads, and hook delegation.
