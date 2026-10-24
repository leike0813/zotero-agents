# Tasks

## 1. Archive safety and memory

- [x] 1.1 Add native factory/queue/failure/cancellation regressions, implement asynchronous atomic archive publication, and pass archive facade tests.
- [x] 1.2 Replace ZIP numeric arrays, validate ZIP32 bounds, and pass the 32 MiB constrained-heap and independent ZIP-content tests.

## 2. Scoped workflow progress

- [x] 2.1 Add progress DTOs, callback isolation and createProgress facade; pass Host manifest/type and notification lifecycle tests.
- [x] 2.2 Report materializer/archive work and bind notification cleanup to leaf scope; verify owner isolation, observer failures and cancellation.
- [x] 2.3 Document the additive API, observation semantics and lifecycle in workflow documentation and specs.

## 3. Literature export integration

- [x] 3.1 Remove discarded snapshot measurement, use materialized bytes, add localized stage progress and diagnostics; pass full/source-only interactive/non-interactive export tests.
- [x] 3.2 Update export README and locale resources; validate localization and unchanged request/product contracts.

## 4. Integrated verification

- [x] 4.1 Run focused suites, TypeScript, changed-file lint/format checks and OpenSpec validation; record results.
- [x] 4.2 Run build preflight and isolated existing Zotero E2E runner with synthetic exports, compare timings/memory and verify UI responsiveness; document any unavailable validation explicitly.

Task 4.2: preflight ran; current dev Content Package differs from the published feed.
Build and real Zotero E2E remain blocked by the repository's publication-freshness
requirement. No release/commit/push is authorized. Node memory measurements and
all available verification are recorded in [verification.md](verification.md).
