## 1. Reverse-Host Transport

- [x] 1.1 Extend focused TypeScript/Zotero tests for scan deadlines, partial writes, successful release, and failed abort
- [x] 1.2 Implement the shared scan/read deadline policy and Gecko endpoint release-versus-abort lifecycle
- [x] 1.3 Add Rust framing tests and read reverse-Host response bodies exactly by `Content-Length`

## 2. Native Literature Apply

- [x] 2.1 Extend production-route and Rust tests for large admitted strings, complete apply state, restart, idempotency, change classification, bounds, and rollback
- [x] 2.2 Scope production `client.*` string admission to the existing aggregate request budget
- [x] 2.3 Define and validate the strict workflow apply DTO in the canonical reference surface
- [x] 2.4 Reuse reference-refresh preparation/promotion for single-source workflow apply and stable matching
- [x] 2.5 Add bounded literature matching metadata schema/repository support and commit apply state plus receipt atomically
- [x] 2.6 Invalidate graph and related-items cache only for changed reference, binding, or role facts

## 3. Native Tag Array Contract

- [x] 3.1 Extend native Tag surface tests for empty, single-page, multi-page, ordering, and stalled-cursor behavior
- [x] 3.2 Drain the private staged-suggestion pager and return the complete deterministic public array

## 4. Documentation and Verification

- [x] 4.1 Update sidecar runtime supervision and runtime/rebuild documentation
- [x] 4.2 Run OpenSpec validation, focused Node/Zotero tests, Rust fmt/clippy/workspace tests, and contract/surface parity checks
