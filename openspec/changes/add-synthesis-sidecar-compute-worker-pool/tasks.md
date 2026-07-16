## 1. Contracts and test baseline

- [x] 1.1 Extend Core 192 and shared sidecar contracts with typed compute capability classes, strict pool snapshots, compute errors, and discovery/handshake parity.
- [x] 1.2 Extend Core 183 and engine exports so direct and worker layout execution share strict request/result rebuilders and preserve bounds.
- [x] 1.3 Add Core 195 coverage for lazy spawn, one-active/two-queued backpressure, cancellation, deadlines, faults, degradation, shutdown, and control-plane responsiveness.

## 2. Worker pool and service transport

- [x] 2.1 Implement the lazy single-worker pool, fixed resource limits, bounded queue, O(1) snapshot, and strict layout operation protocol.
- [x] 2.2 Implement queued/active abort, five-second timeout, 100ms cooperative grace, worker replacement, and stable error mapping.
- [x] 2.3 Implement crash/OOM/hang/invalid-result isolation and the three-consecutive-fault restart-only degraded fuse.
- [x] 2.4 Add the worker entrypoint with strict engine DTO rebuilds and no DB, canonical, Host, Zotero, or child-process authority.
- [x] 2.5 Route authenticated compute calls through the server with disconnect cancellation while keeping health, handshake, and shutdown independent from worker progress.
- [x] 2.6 Add an internal authenticated compute client with deadline, AbortSignal composition, strict result rebuild, and no public `SynthesisClient` wiring.

## 3. Lifecycle and supervision

- [x] 3.1 Make authenticated shutdown, host lease expiry, and stdin EOF use one idempotent 500ms pool drain/terminate path.
- [x] 3.2 Extend Core 194 to verify service and supervisor stop paths leave no worker descendant and remain responsive under saturation/hang.

## 4. Build, packaging, and governance

- [x] 4.1 Compile the service worker and synthesis-engine graph with the sidecar service build.
- [x] 4.2 Extend runtime assembly, manifest, license, and fingerprint governance for worker, engine, D3 runtime files/package versions, and lockfile without adding dependencies or publishing prebuilds.
- [x] 4.3 Extend Core 193 packaging and fingerprint tests for the complete compute runtime graph.
- [x] 4.4 Update `service-api-migration.yaml` with all eight engines, the layout worker canary, `production_worker: false`, and unchanged `108 methods / 1 direct consumer` ownership.
- [x] 4.5 Extend Core 168 and service boundary guards so only designated pool/worker files may import worker threads and forbidden service authority remains unreachable.

## 5. Documentation and verification

- [x] 5.1 Update current-state Synthesis runtime, packaging, performance, README, and Stage 1 progress docs with the bounded canary topology and unchanged production kernel routing.
- [x] 5.2 Run contracts/engine/service/root TypeScript, Core 168/183/192-195, service boundary, Synthesis invariants, targeted formatting/lint, help-doc checks, production build, and `git diff --check`.
- [x] 5.3 Run strict OpenSpec validation and confirm all change tasks are complete without archiving or publishing runtime prebuilds.
