## 1. Contract Tests and DTO SSOT

- [x] 1.1 Add Core 201 failing tests for strict manifests, page identities, limits, idempotency, seal, lifecycle, real HTTP staging, output paging, and direct-engine oracle parity.
- [x] 1.2 Export synthesis-engine structural input/output row-page rebuilders and canonical transfer hash helpers without changing full request/result semantics or bounds.
- [x] 1.3 Add contracts-owned transfer actions, manifests, limits, snapshots, stable errors, capability catalog entries, and strict rebuilders.

## 2. Service-Owned Transfer Sessions

- [x] 2.1 Implement the Node-only transfer owner with atomic scoped staging, in-memory counters, idempotent begin/page upload, seal validation, and internal output publication.
- [x] 2.2 Implement bounded admission, two-session/global-byte backpressure, idle and absolute expiry, tombstone retirement, restart cleanup, cancel, and 500ms shutdown behavior.
- [x] 2.3 Integrate authenticated transfer dispatch and O(1) health/handshake snapshots without enqueueing or eagerly spawning the compute worker.

## 3. Internal Client and Runtime Boundary

- [x] 3.1 Extract the shared authenticated sidecar RPC transport while preserving existing compute client identity, deadline, AbortSignal, wire-limit, and error behavior.
- [x] 3.2 Add the internal transfer client with strict manifest/page reconstruction and no public SynthesisClient or Workbench route.
- [x] 3.3 Extend Core 192/194/199 coverage for capability parity, auth/errors, shutdown paths, lazy worker behavior, restart cleanup, and unchanged production graph-build routing.

## 4. Packaging, Governance, and Documentation

- [x] 4.1 Extend Core 168/183/193 and service boundary checks for DTO parity, approved Node imports, emitted bundle files, manifest/fingerprint inputs, eight-engine inventory, `108 / 1`, and `mutationEnabled: false`.
- [x] 4.2 Update `service-api-migration.yaml`, Synthesis runtime/packaging/performance/README documentation, and Stage 1 progress with the staging-only ownership boundary and deferred packed worker route.

## 5. Verification

- [x] 5.1 Run targeted Core suites, contracts/engine/service/root TypeScript, service boundary, Synthesis invariants, Prettier/ESLint, help-doc check, production build, and `git diff --check`; resolve all regressions.
- [x] 5.2 Run strict OpenSpec validation and confirm all change tasks complete without generating prebuilds, committing, archiving, or modifying `reference/Skill-Runner`.
