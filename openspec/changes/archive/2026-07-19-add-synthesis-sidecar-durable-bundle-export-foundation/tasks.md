## 1. Shared Durable Contract

- [x] 1.1 Add Core 214 contract fixtures for exact v1/v2 shapes, all 23 entity kinds, safe identities, duplicate rejection, hashes, counts, limits, deterministic ordering and the four-MiB boundary
- [x] 1.2 Add the environment-neutral durable bundle DTOs, entity/path/bundle registry and mechanically derived limits to `synthesis-contracts`
- [x] 1.3 Implement strict manifest, bundle and envelope parsing plus normalized v1/v2 source verification with structured diagnostics
- [x] 1.4 Implement deterministic v2-only envelope, bundle, chunk and manifest encoding with canonical production-compatible bytes and hashes
- [x] 1.5 Export the new contract surface and pass package TypeScript plus the contract-focused Core 214 tests

## 2. Stable Repository And Canonical Capture

- [x] 2.1 Extend Core 146 and Core 214 with transactional complete-corpus capture, empty-owner, Topic allowlist/path/hash and superseded-basis cases
- [x] 2.2 Add repository DTOs and one transactionally captured durable corpus/basis method reusing existing row and domain-limit SSOTs
- [x] 2.3 Add the Node Topic canonical-current capture adapter using registry/store inspection and post-read identity verification
- [x] 2.4 Recapture repository and canonical bases after file reads and fail the whole capture on missing, damaged or superseded facts

## 3. Private Durable Export Application

- [x] 3.1 Extend Core 214 with source/sink, bundle-before-manifest, partial failure, single-active admission, stop and shutdown-drain tests
- [x] 3.2 Add `SynthesisDurableBundleSource`, `SynthesisDurableBundleSink`, build/read result and summary contracts
- [x] 3.3 Implement `buildExport` and `readAndVerify` over stable capture and the shared codec without an apply receipt
- [x] 3.4 Implement single-active leases, `stopAdmission` and shutdown drain, then export the private application factory

## 4. Composition, Packaging And Production Compatibility

- [x] 4.1 Extend Core 168 and Core 193 with private capability, construction-after-recovery, close ordering and runtime/XPI inventory assertions
- [x] 4.2 Add the Node source/sink composition adapter and construct/close the durable export application in `apps/synthesis-service/src/server.ts`
- [x] 4.3 Update package exports, runtime/XPI inventories, migration inventory and fingerprints for the shared foundation
- [x] 4.4 Extend Core 158 compatibility fixtures for exact valid v2 paths/text/hash, legacy fallback and unchanged preview/apply results
- [x] 4.5 Delegate production `durableSync.ts` contract, canonicalization, chunking and read/verify behavior to the shared implementation while preserving public DTOs and progress
- [x] 4.6 Run Core 159 and Core 184 to confirm WebDAV, HEAD/ETag, retry/conflict and Host export-port behavior remains unchanged

## 5. Documentation And Verification

- [x] 5.1 Update README, persistence, runtime, WebDAV and Stage 1 WS5 current-state documentation for the private durable export foundation and its exclusions
- [x] 5.2 Run package/service/root TypeScript, Synthesis boundaries/invariants, Prettier, ESLint, help-doc and focused Core suites
- [x] 5.3 Run production build, runtime/XPI fail-closed inventory checks, `git diff --check`, and strict OpenSpec validation
