## 1. Ownership and contracts

- [x] 1.1 Re-home generic observability design and requirements from the R9a retirement change while preserving Advanced Matching implementation work.
- [x] 1.2 Add strict TypeScript v2 trace-context/event rebuilders and positive/negative cross-language corpus cases.
- [x] 1.3 Add Rust v2 serialization/parsing parity and update the cross-language checker.

## 2. Host observation planes

- [x] 2.1 Add manifest-driven business audit with mutation start/terminal, read failure, semantic non-success, and one-incident ownership.
- [x] 2.2 Replace v1 diagnostic modules with a debug-gated causal trace API and bounded incremental trace store.
- [x] 2.3 Route native client, RPC/control/compute/workbench/transfer, owner, supervisor, and reverse-Host boundaries through the shared observation entry points.

## 3. Rust boundaries

- [x] 3.1 Replace v1 diagnostics with the debug-only v2 span builder and request trace context.
- [x] 3.2 Cover server early returns, response writes, reverse-Host, worker queue/cancel/timeout/crash/replacement/fuse, and transfer attempts/terminals.
- [x] 3.3 Remove Matching/Citation Graph duplicate event shapes in favor of generic spans and allowlisted facts.

## 4. Debug UI and production isolation

- [x] 4.1 Replace the flat sidecar event table and startup snapshot with a causal trace snapshot plus incremental patches.
- [x] 4.2 Preserve unchanged trace rows, selected details, and scroll position; add sanitized trace copy feedback.
- [x] 4.3 Extend release-elision checks for trace context, NDJSON parsing, tails, stores, subscriptions, and UI patches.

## 5. Documentation and verification

- [x] 5.1 Update sidecar runtime supervision and Workbench UI documents.
- [x] 5.2 Run focused Core/UI and Rust tests plus contract, cross-language, elision, type, lint, format, and production-build gates.
- [x] 5.3 Run one real subprocess/worker/reverse-Host Advanced Matching observation trace without treating Matching repair as completion.
