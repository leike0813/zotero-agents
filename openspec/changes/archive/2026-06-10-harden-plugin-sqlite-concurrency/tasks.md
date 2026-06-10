## 1. OpenSpec Artifacts

- [x] 1.1 Add proposal, design, delta spec, and implementation tasks for guarded runtime SQLite access.

## 2. Implementation

- [x] 2.1 Add an internal guarded Zotero SQLite helper with per-path connection caching, busy timeout setup, busy classification, bounded retry, and nested transaction depth tracking.
- [x] 2.2 Update `pluginStateStore` to use the guarded helper for Zotero mozStorage statement execution and transactions.
- [x] 2.3 Update the Synthesis repository Zotero adapter to use the same guarded helper.
- [x] 2.4 Ensure test reset paths clear guarded helper state.

## 3. Tests

- [x] 3.1 Cover transient and persistent busy handling for plugin state store writes and transactions.
- [x] 3.2 Cover shared connection reuse and nested guarded transactions.
- [x] 3.3 Cover transient busy handling for Synthesis repository writes.
- [x] 3.4 Run targeted core tests and then `npm run test:node:core` if targeted tests pass.
