## 1. Contract and Test Baseline

- [x] 1.1 Add language-neutral production owner, mutation admission, capability fingerprint, cutover receipt, and reverse-Host positive/negative corpus cases
- [ ] 1.2 Extend default-client, runtime, workflow, Host Bridge/MCP, and boundary tests to require one native production route and zero legacy fallback
- [ ] 1.3 Add production-copy cutover integration fixtures for backup, owner conflict, preflight failure, recovery, and post-admission crash

## 2. Native Production RPC

- [x] 2.1 Establish one closed grouped `SynthesisClient` operation inventory and TypeScript/Rust completeness fingerprint
- [ ] 2.2 Implement strict native request/result envelopes, bounds, error mapping, and dispatch over existing typed Rust application ports
  - Current ready subset: `client.listTopics`; the remaining declared operations return `service_not_ready`, and native default-client acquisition stays closed until the ready subset equals all 95 operations.
- [x] 2.3 Extend health/handshake with owner mode, capability fingerprint, cutover receipt identity, and gated mutation admission

## 3. Reverse Host Boundary

- [x] 3.1 Implement the plugin-owned authenticated reverse-Host endpoint and lifecycle-scoped credentials
- [x] 3.2 Route declared paged reads, export/WebDAV delivery, and preconditioned Host effects through strict typed adapters
- [x] 3.3 Reject stale instances, unknown operations, oversized/expired requests, permission failures, and disconnected Host state without side effects

## 4. Production Owner Cutover

- [x] 4.1 Implement the generation-scoped automatic-upgrade cutover state machine and durable phase receipt
- [x] 4.2 Drain legacy work, close its writer, create and verify DB/WAL/canonical backups, and run native production-copy preflight
- [x] 4.3 Acquire the exclusive production owner lock, open/migrate Rust production roots, persist the owner receipt, and run critical read/worker smoke
- [x] 4.4 Implement pre-admission reversal/restore and post-admission Rust-only repair semantics with no automatic legacy fallback

## 5. Production Client Switch

- [x] 5.1 Implement the native grouped client composition while preserving all public methods, DTOs, delivery context, and stable errors
- [ ] 5.2 Switch default-client acquisition, invalidation, and shutdown to the native production composition
- [ ] 5.3 Add static guards proving production consumers cannot construct legacy composition or directly open production DB/canonical roots

## 6. Documentation and Verification

- [x] 6.1 Update active Synthesis architecture, persistence, supervision, and migration documentation to the truthful R9a current state and R9b boundary
- [ ] 6.2 Pass OpenSpec strict validation, contract/boundary checks, relevant Core and Stage-1 tests, TypeScript checks, Rust fmt/clippy/tests, and production build
- [x] 6.3 Record R8 five-platform remote, signing/XPI, and real-machine evidence as pending external acceptance without claiming complete R9 or Stage 1
