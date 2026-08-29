## 1. Ready-Gated Recovery TDD

- [x] 1.1 Add a runtime lifecycle regression that prepares a matching repository receipt and canonical batch, then proves current startup publishes ready without reconciling them
- [x] 1.2 Implement production Durable Bundle acquisition and typed canonical recovery so the matching crash window rolls forward before ready
- [x] 1.3 Add lifecycle cases for an uncommitted batch, an already-promoted receipt, and inconsistent durable evidence
- [x] 1.4 Complete the recovery state matrix so safe cases reconcile and inconsistent evidence returns reason-level Startup failure without discovery

## 2. Deepen The Existing Application Module

- [x] 2.1 Route live post-commit completion and startup recovery through one private path that exclusively verifies targets and clears receipts
- [x] 2.2 Require repository and canonical local ports at acquisition and remove the public phase traits, optional canonical branches, old constructors, and fake recovery test
- [x] 2.3 Remove `DurableBundleSinkPort` and make export return its value directly to the WebDAV adapter

## 3. Production And Parity Composition

- [x] 3.1 Update production composition and WebDAV use-case adaptation to the deepened interface
- [x] 3.2 Add the `parity-harness` Cargo feature and move deterministic acquisition behind it without changing parity behavior

## 4. Current-State Documentation

- [x] 4.1 Update WebDAV, persistence, sequence, and knowledge-graph documents with ready-gated roll-forward semantics
- [x] 4.2 Remove obsolete `canonical-store-changed` event language and keep WebDAV import excluded from autosync

## 5. Verification

- [x] 5.1 Validate the OpenSpec change and run focused canonical-store, application, lifecycle, and parity checks
- [x] 5.2 Run Rust formatting and clippy checks and resolve all in-scope failures
