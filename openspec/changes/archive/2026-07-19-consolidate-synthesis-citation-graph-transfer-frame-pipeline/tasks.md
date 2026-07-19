## 1. Production-Path Tests

- [x] 1.1 Rewrite Core 201 retry, partial-output rollback, atomic commit, HTTP output round-trip, and tamper cases to use the formal attempt and canonical frame lifecycle
- [x] 1.2 Run the migrated Core 201 tests before production edits and record the expected failures caused by the missing narrow frame-only boundary

## 2. Shared Frame Pipeline

- [x] 2.1 Move `SynthesisSidecarGraphBuildTransferPageFrame` to the compute protocol and update pool, owner, executor, and worker to use the shared carrier
- [x] 2.2 Introduce `CitationGraphTransferExecutionOwner` with only execution lifecycle, manifest/status, `readInputFrame`, and descriptor-returning `stageAttemptOutputFrame` operations
- [x] 2.3 Rename the rebuilt-result artifact iterator and update worker use while preserving canonical single-page artifacts, per-page ACK, hash checks, cancellation, timeout, and fuse behavior

## 3. Remove Parallel Paths

- [x] 3.1 Remove DTO attempt input/output helpers and the `beginOutput`/`putOutputPage`/`sealOutput` protocol with all test-only call sites
- [x] 3.2 Remove unused `paginateSynthesisCitationGraphBuildRows` and `paginateSynthesisCitationGraphBuildResult` helpers and verify no removed symbols remain

## 4. Documentation

- [x] 4.1 Update large-transfer documentation to describe only the current frame-oriented execution pipeline and unchanged external/resource contracts

## 5. Verification

- [x] 5.1 Run Core 195, Core 201, and Core 218 plus engine/service TypeScript, service build, and emitted-import verification
- [x] 5.2 Run Core 202 independently three times under the 2,000-source/100,000-reference, 30-second active deadline, and 256 MiB resource profile
- [x] 5.3 Run the contract checker and confirm the fingerprint and `108 public methods / 1 direct consumer` boundary remain unchanged
- [x] 5.4 Run the complete Stage 1 Core 175-218 suite with shards `[27, 1, 16]`, targeted ESLint/Prettier, `git diff --check`, and strict OpenSpec validation
