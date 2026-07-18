## 1. Resource-boundary tests

- [x] 1.1 Add failing runtime file-transfer tests for bounded chunks, digest parity, and ordered single-worker attachment registration.
- [x] 1.2 Extend Host Bridge download tests for source truncation, same-size mutation, and file-backed response parity.
- [x] 1.3 Update tests that consume the internal download DTO so they no longer depend on a complete `bytes` field.

## 2. Streaming implementation

- [x] 2.1 Add the cross-runtime bounded file-transfer module and incremental SHA-256 accumulator.
- [x] 2.2 Migrate file registration and attachment capability mapping to bounded file-backed sources.
- [x] 2.3 Migrate Host Bridge binary responses to asynchronous file-source delivery without whole-file body buffers.

## 3. Host compatibility and documentation

- [x] 3.1 Add and run a real Zotero runtime transfer fixture covering event-loop progress, digest, delivery, and cleanup on the available Zotero 9.0.4 host; record Zotero 7 as unavailable locally.
- [x] 3.2 Update the R6 audit with the implemented data flow, resource invariants, and validation evidence.

## 4. Verification

- [x] 4.1 Run targeted Node and CLI tests, TypeScript checks, formatting/lint checks, and the plugin build.
- [x] 4.2 Validate the OpenSpec change strictly and record any unavailable host-version verification explicitly.

Verification note: Zotero 9.0.4 host coverage passed. No Zotero 7 executable is installed in the current environment, so Zotero 7 host execution remains pending; the cross-version compatibility/static gate passed.
