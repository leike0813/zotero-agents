## 1. TDD Coverage

- [x] 1.1 Add Node tests for ordered async append, packed range batches, worker lifecycle, and structured failures.
- [x] 1.2 Extend transcript tests for bounded UTF-8 scanning, linear rebuild semantics, stale tails, and indexed full-mirror hydration.
- [x] 1.3 Add and register a true Zotero core-lite test for packaged worker I/O, append, recovery, and page hydration.

## 2. Runtime File I/O

- [x] 2.1 Implement the shared range protocol, bounded packed worker, and generation-aware main-thread reader.
- [x] 2.2 Replace Zotero append and range fallbacks with queued chunked IOUtils append, worker reads, and bounded UTF-8 line scanning.
- [x] 2.3 Add the worker build entry and controlled shutdown integration.

## 3. Transcript Recovery

- [x] 3.1 Replace per-event immutable index cloning with one ordered mutable builder shared by append, tail recovery, and rebuild.
- [x] 3.2 Route index recovery through the byte scanner and route page/full-mirror hydration through bounded indexed reads.

## 4. Documentation and Verification

- [x] 4.1 Update runtime persistence SSOT and the R9 audit with real-host evidence and remaining Zotero 7 verification.
- [x] 4.2 Run targeted Node tests, TypeScript, worker build, strict OpenSpec validation, and Zotero core-lite verification.
