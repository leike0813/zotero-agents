## 1. Regression Tests

- [x] 1.1 Extend Host Bridge CLI and ACP Chat tests for owner-neutral shared profiles and per-adapter `ZOTERO_BRIDGE_SCOPE`.
- [x] 1.2 Extend ACP Chat permission tests for FIFO overlap, exact request-ID resolution, teardown cancellation, and explicit cleared publication.
- [x] 1.3 Extend ACP Skills tests for FIFO overlap, exact request-ID resolution, and controller teardown cancellation.
- [x] 1.4 Extend shared Workspace tests for Host Bridge `zotero-write` classification and permission-only DOM identity.

## 2. Permission Domain

- [x] 2.1 Add the shared pure TypeScript permission queue and integrate it with ACP Chat lifecycle paths.
- [x] 2.2 Integrate the queue with ACP Skills while preserving stale persisted-request recovery.
- [x] 2.3 Add internal `approvalKind` production, parsing, persistence, and legacy fallback projection.

## 3. Host Bridge Scope

- [x] 3.1 Inject immutable ACP Chat scope through the adapter environment and make the shared profile owner-neutral.
- [x] 3.2 Preserve ACP Skills per-run profile behavior and verify scoped Host Bridge routing for both surfaces.

## 4. Validation

- [x] 4.1 Run focused permission, routing, publication, and UI regression tests.
- [x] 4.2 Run TypeScript, Prettier, ESLint, build, and strict OpenSpec validation.
