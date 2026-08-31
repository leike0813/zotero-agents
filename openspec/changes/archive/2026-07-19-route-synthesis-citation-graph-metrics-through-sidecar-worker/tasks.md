## 1. Routing contracts and tests

- [x] 1.1 Add Core 198 coverage for the sidecar-backed metrics adapter, fresh ready-connection lookup, strict identity, fixed deadline, cancellation, and no wait/retry/fallback behavior.
- [x] 1.2 Extend Core 129/150/185 so sidecar failures preserve previous metrics, basis changes prevent promotion, direct/worker results remain equivalent, and no DB ownership spans worker waits.
- [x] 1.3 Extend Core 168/192/194-197 for two production worker routes, shared admission/failure state, capability parity, restart handling, unchanged wire bounds, and forbidden sidecar authority.

## 2. Multi-operation worker and internal client

- [x] 2.1 Add `compute.citation_graph_metrics` and a closed layout/metrics compute protocol that binds each operation to synthesis-engine request/result DTOs.
- [x] 2.2 Rebuild metrics input before enqueue and worker execution, dispatch only the fixed metrics kernel, and rebuild metrics output on the main thread.
- [x] 2.3 Refactor the internal compute client around one authenticated transport helper and add strict `computeCitationGraphMetrics` support without duplicating layout behavior.

## 3. Production composition and behavior

- [x] 3.1 Implement a sidecar-backed `SynthesisCitationGraphMetricsEngine` with fresh ready-connection lookup and the composition lifecycle AbortSignal.
- [x] 3.2 Inject the sidecar metrics engine in production legacy composition without changing public `SynthesisClient` APIs or adding an in-process fallback.
- [x] 3.3 Verify immediate `service_not_ready`, five-second hard deadline, late-result rejection, previous-metrics retention, and unchanged plugin DB/canonical/promotion ownership.

## 4. Packaging and governance

- [x] 4.1 Update migration inventory and invariant checks so layout and metrics are production workers, the other six engines stay in process, and `108 / 1` plus `mutationEnabled: false` remain unchanged.
- [x] 4.2 Extend boundary and shared-pool checks for mixed-operation backpressure, cancellation, replacement, degraded fuse, shutdown, and prohibited worker authority.
- [x] 4.3 Extend bundle, manifest, fingerprint, license, freshness, and XPI checks for the metrics-capable source runtime without generating or publishing platform prebuilds.

## 5. Documentation and verification

- [x] 5.1 Update Synthesis runtime, supervision, packaging, performance, README, and Stage 1 progress docs with the production metrics route and shared-pool topology.
- [x] 5.2 Run contracts/engine/service/root TypeScript, focused Core tests, service boundary, Synthesis invariants, targeted Prettier/ESLint, help-doc checks, production build, and `git diff --check`.
- [x] 5.3 Run strict OpenSpec validation and complete all tasks without archiving, committing, publishing prebuilds, or touching `reference/Skill-Runner`.
