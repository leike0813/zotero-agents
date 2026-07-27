## 1. Contract and Test Baseline

- [x] 1.1 Add language-neutral production owner, mutation admission, capability fingerprint, cutover receipt, and reverse-Host positive/negative corpus cases
- [ ] 1.2 Complete the default-client, runtime, Workflow, Workbench, Host Bridge/MCP, and boundary evidence in `complete-synthesis-native-production-activation`
- [x] 1.3 Add production-copy cutover integration fixtures for backup, owner conflict, preflight failure, recovery, and post-admission crash

## 2. Native Production RPC

- [x] 2.1 Establish one closed grouped `SynthesisClient` operation inventory and TypeScript/Rust completeness fingerprint
- [ ] 2.2 Complete strict public DTO semantics and typed dispatch through the seven operation-surface changes tracked in section 7
  - Current ready subset: 30 operations backed by Rust repository/application or bounded reverse-Host ports.
  - `operation-ownership.json` assigns all 95 operations exactly once; mutation activation and native default-client acquisition stay closed until every surface and final activation gate passes.
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
- [x] 5.2 Switch default-client acquisition, invalidation, and shutdown to the native production composition
- [x] 5.3 Add static guards proving production consumers cannot construct legacy composition or directly open production DB/canonical roots

## 6. Documentation and Verification

- [x] 6.1 Update active Synthesis architecture, persistence, supervision, and migration documentation to the truthful R9a current state and R9b boundary
- [ ] 6.2 Pass the release-quality verification suite owned by `complete-synthesis-native-production-activation`
- [x] 6.3 Record R8 five-platform remote, signing/XPI, and real-machine evidence as pending external acceptance without claiming complete R9 or Stage 1

## 7. Decomposed R9a Delivery

- [ ] 7.1 Complete `complete-synthesis-native-topic-workbench-surface`
- [ ] 7.2 Complete `complete-synthesis-native-citation-graph-surface`
- [ ] 7.3 Complete `complete-synthesis-native-reference-canonical-surface`
- [ ] 7.4 Complete `complete-synthesis-native-tag-surface`
- [ ] 7.5 Complete `complete-synthesis-native-concept-topic-graph-surface`
- [x] 7.6 Complete `complete-synthesis-native-artifact-library-debug-surface`
- [ ] 7.7 Complete `complete-synthesis-native-webdav-maintenance-surface`
- [ ] 7.8 Complete `complete-synthesis-native-production-activation` after 7.1–7.7
