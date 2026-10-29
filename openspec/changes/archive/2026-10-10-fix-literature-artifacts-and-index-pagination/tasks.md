## 1. Migration

- [x] 1.1 Fix empty-source/basis and summary conversion with red-to-green 264/276 regressions; retain synchronous/asynchronous/import parity and existing limits.
- [x] 1.2 Preserve bounded validation/receipt evidence, advance definition to 8, and update migration documentation; verify diagnostic and receipt regressions.

## 2. Columns

- [x] 2.1 Implement successful-state retention, bounded retries, ordinary/UI-only refresh separation and stale-request protection; verify 48 regressions.

## 3. Index

- [x] 3.1 Preserve Host total through TypeScript/Rust DTOs and schema/corpus; verify cross-language and Host paging tests.
- [x] 3.2 Implement basis-bound 100-parent window navigation, first-window caching and failure recovery; verify 125/121 and Rust paging regressions including 274 sources.
- [x] 3.3 Project/render current-window navigation, source totals and filter scope with stable regions/anchors; verify 257 and page/action tests and update UI documentation/AGENTS.md.

## 4. Integration

- [x] 4.1 Run relevant Node/Rust tests, OpenSpec validation, contract checks, type/lint checks and local sidecar/plugin builds; record results and any environment limitations.
