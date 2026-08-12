## 1. Protocol Registry and Failing Gates

- [x] 1.1 Add the versioned 119-capability and 15-worker-operation registry with common recursive DTO primitives and explicit opaque leaves
- [x] 1.2 Add completeness, orphan-reference, recursive-closure, and unauthorized-generic checks to the cross-language and production-capability gates
- [x] 1.3 Add positive corpus documents and generated nested negative cases that fail against the current generic protocol

## 2. Production Client DTOs

- [x] 2.1 Replace the production `SynthesisClientPort` unknown/legacy bridge with a concrete operation request/result map
- [x] 2.2 Close Topic/Workbench and Citation request/result families and remove their Rust manual default reconstruction
- [ ] 2.3 Close Reference and Tag request/result families and remove their Rust manual default reconstruction
- [ ] 2.4 Close Concept/Topic Graph, Artifact/Debug, and WebDAV/Maintenance request/result families and remove their Rust manual default reconstruction

## 3. Reverse-Host DTOs

- [x] 3.1 Add concrete request/result schema mappings for all 14 reverse-Host capabilities
- [x] 3.2 Replace TypeScript payload assertions and Rust `Value` domain ports with strict capability-specific DTO rebuilders
- [x] 3.3 Add nested positive/negative route coverage without changing the existing Host-backed business chains

## 4. Transfer and Worker DTOs

- [x] 4.1 Define direction/target/capability-discriminated transfer manifest, header, page, row, and locator DTOs
- [x] 4.2 Make `rootSha256` mandatory across Rust producers, TypeScript consumers, mocks, and fixtures
- [x] 4.3 Define concrete run header, sections, rows, frames, and results for all 15 deterministic worker operations
- [ ] 4.4 Remove generic worker `Map`/`Value` domain boundaries and add TS/Rust corpus parity

## 5. System, Lifecycle, and Cleanup

- [ ] 5.1 Define capability-discriminated request/result unions for the nine non-client forward capabilities and close error/diagnostic/trace DTOs
- [ ] 5.2 Align lifecycle and bundle contracts with launch v3, discovery v2, production discovery v5, health, handshake, and shutdown
- [ ] 5.3 Delete the superseded cross-language contract set and every unauthorized production generic DTO escape hatch
- [x] 5.4 Update Synthesis documentation, audit follow-up, and dependent removal-change prerequisites

## 6. Verification

- [x] 6.1 Pass TypeScript contract, production roster, cross-language, runtime, worker-transfer, and seven surface gates
- [x] 6.2 Pass Rust format, Clippy, workspace tests, build, and focused real-process route tests
- [x] 6.3 Pass strict OpenSpec validation, scoped Prettier, and diff whitespace checks; record 119/119, 15/15, and zero escape counts
