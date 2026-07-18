## Why

Zotero runtime currently performs transcript and audit append plus indexed
transcript range reads through synchronous XPCOM streams, while a missing or
stale transcript index rebuilds through full-file materialization and repeated
whole-index cloning. Real Zotero 9.0.4 probes reproduced a roughly 1.15 second
main-thread stall for a 1.42 MiB transcript, so these paths need an explicitly
asynchronous and linearly scaling persistence contract.

## What Changes

- Route Zotero text append through ordered, chunked `IOUtils` append without a
  synchronous or whole-file-rewrite fallback.
- Read indexed transcript ranges in a privileged worker that opens the file
  once per bounded batch and returns one packed transferable byte buffer.
- Rebuild and advance transcript indexes through bounded byte scanning and one
  mutable ordered builder instead of materializing every event and cloning the
  complete index for each event.
- Add structured runtime file I/O failures and deterministic worker shutdown.
- Preserve existing transcript JSONL, index v2, ACP Chat/Skills page APIs, and
  durability boundaries.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `runtime-persistence-governance`: Runtime append and range reads in Zotero
  must use asynchronous, main-thread-safe primitives without synchronous
  Components fallbacks.
- `acp-skill-run-file-backed-runtime-state`: Transcript index recovery must be
  byte-bounded, linear, and preserve the canonical JSONL/index contracts.
- `acp-skillrunner-compatible-runner`: Indexed page reads must use bounded
  single-open worker batches and preserve page folding semantics.

## Impact

The change affects runtime persistence, ACP transcript indexing and hydration,
plugin shutdown, the Firefox build entries, core tests, and runtime persistence
documentation. It adds no dependency and makes no public protocol or stored
format change.
