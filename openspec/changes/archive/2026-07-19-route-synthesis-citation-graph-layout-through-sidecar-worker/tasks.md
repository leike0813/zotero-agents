## 1. Routing contracts and tests

- [x] 1.1 Add Core 197 coverage for the sidecar-backed layout adapter, fresh ready-connection lookup, strict identity, fixed deadline, cancellation, and no wait/retry/fallback behavior.
- [x] 1.2 Extend Core 129/150/175/183 so sidecar failures preserve the previous layout, basis changes prevent promotion, direct/worker results remain equivalent, and the public graph client contract stays unchanged.
- [x] 1.3 Extend Core 168/192/194-196 for the single production worker route, restart/stale-connection handling, lifecycle cancellation, unchanged wire/pool bounds, and forbidden sidecar authority.

## 2. Internal client and engine adapter

- [x] 2.1 Extend the internal compute connection with expected service identity and validate echoed request/runtime identity before strict result rebuilding.
- [x] 2.2 Normalize caller abort, fixed deadline, network failure, identity mismatch, and invalid result into stable internal compute errors while preserving known server error codes.
- [x] 2.3 Implement a sidecar-backed `SynthesisCitationGraphLayoutEngine` that resolves a fresh ready supervisor connection per call and maps it to the authenticated compute client.

## 3. Production composition and behavior

- [x] 3.1 Inject the sidecar-backed layout engine and composition lifecycle AbortSignal in production legacy composition, removing its in-process layout construction without changing the service default or public client API.
- [x] 3.2 Verify immediate `service_not_ready`, no retry/fallback, five-second hard deadline, and late-result rejection through existing service failure and graph-basis promotion guards.
- [x] 3.3 Update migration inventory so only Citation Graph layout is `sidecar_worker` with `production_worker: true`, while the other seven engines, `108 / 1`, and `mutationEnabled: false` remain unchanged.

## 4. Packaging and governance

- [x] 4.1 Extend boundary and invariant checks so production composition cannot import/use the in-process layout engine or fallback while sidecar DB, canonical, Host, Zotero, and subprocess prohibitions remain intact.
- [x] 4.2 Extend bundle, manifest, fingerprint, license, freshness, and XPI tests for the production worker/engine route without generating or publishing platform prebuilds.
- [x] 4.3 Ensure release governance fails closed until every platform prebuild matches the current source runtime fingerprint.

## 5. Documentation and verification

- [x] 5.1 Update Synthesis runtime, supervision, packaging, performance, README, and Stage 1 progress docs with the production layout route, plugin-owned promotion, immediate readiness failure, no fallback, and separate prebuild release gate.
- [x] 5.2 Run contracts/engine/service/root TypeScript, Core 129/150/168/175/183/192-197, service boundary, Synthesis invariants, targeted Prettier/ESLint, help-doc checks, production build, and `git diff --check`.
- [x] 5.3 Run strict OpenSpec validation and complete all tasks without archiving, committing, publishing prebuilds, or touching `reference/Skill-Runner`.
