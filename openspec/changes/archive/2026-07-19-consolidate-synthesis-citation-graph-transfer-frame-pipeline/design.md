## Context

Citation Graph Build already transfers bounded canonical page artifacts through a worker, acknowledges pages individually, verifies hashes, and commits attempt output atomically. However, the page-frame carrier is defined beside the pool rather than in the compute protocol, the owner exposes both frame and DTO convenience paths, and a separate begin/put/seal output protocol is retained only for tests. Core 201 therefore verifies some lifecycle guarantees through APIs that production execution does not call.

The consolidation spans the compute protocol, transfer owner, pool, executor, worker, tests, and large-transfer documentation. It must preserve the frozen HTTP and canonical-artifact contracts, the 30-second active deadline, and the worker resource envelope.

## Goals / Non-Goals

**Goals:**

- Establish one shared canonical page-frame carrier for the service/worker boundary.
- Make a narrow execution-owner interface the only worker-output validation and atomic staging authority.
- Make lifecycle tests exercise the same attempt/frame path as production.
- Remove unused alternate protocols and paginators so each transfer concept has one implementation.
- Preserve resource, deadline, ACK, cancellation, fuse, canonical bytes/hash, and external HTTP behavior.

**Non-Goals:**

- Introducing Rust Metrics or changing production runtime ownership or routing.
- Changing wire DTOs, transfer envelopes, error codes, session states, canonical serialization, or hashes.
- Changing the worker count, memory limit, normal transfer profile, or active deadline.
- Archiving or modifying the completed R1 change.

## Decisions

### Define the page-frame carrier in the compute protocol

`SynthesisSidecarGraphBuildTransferPageFrame` will live in `computeProtocol.ts`, which already owns the transferable page artifact and descriptor vocabulary. Pool, owner, executor, and worker will import that type rather than defining a service-local duplicate.

Keeping a pool-local definition was rejected because it makes a cross-boundary protocol type appear to be a scheduling implementation detail. Introducing a second carrier was rejected because the canonical artifact already contains the required bytes, hash, and descriptor.

### Give execution a dedicated owner interface

The executor will depend on `CitationGraphTransferExecutionOwner`, containing only input-frame reads, strictly validated output-frame staging, attempt queue/start/commit/fail transitions, and the manifest/status operations required for execution. `stageAttemptOutputFrame` will return only the descriptor produced after strict validation.

Depending on the complete HTTP owner was rejected because it exposes unrelated session and DTO helpers to execution. Retaining DTO adapters on the execution interface was rejected because tests can then bypass the production frame boundary.

### Validate and stage each output frame only in the owner

The owner will validate the worker frame against the sealed attempt manifest and canonical artifact rules before atomically writing it to attempt staging. The executor will acknowledge a page only after this method succeeds, and only a committed attempt becomes readable. Failure will discard attempt staging while retaining sealed input unless the session itself is canceled.

Duplicating validation in the pool or executor was rejected because it would split authority and allow the persistence boundary to drift from validation.

### Name the worker iterator for rebuilt canonical artifacts

The worker-facing iterator will be named `iterateRebuiltSynthesisCitationGraphBuildResultPageArtifacts`. Its input is the engine-normalized result; it emits the existing canonical single-page artifacts in deterministic order. The rename makes the normalization precondition explicit without adding another rebuild or pagination layer.

### Delete parallel and unused paths

DTO attempt-output writing, DTO attempt-input reading, `beginOutput`/`putOutputPage`/`sealOutput`, and the unused legacy row/result paginators will be removed together with their test-only call sites. No deprecated wrapper will be retained because the repository call graph contains no production consumer and these APIs have no external compatibility contract.

## Risks / Trade-offs

- [A hidden internal consumer imports a removed helper] → Run repository-wide symbol searches, TypeScript checks, emitted-import checks, and the full blocking Stage 1 suite.
- [Moving the carrier creates runtime imports or a cycle] → Use type-only imports where appropriate and verify the service build plus emitted module imports.
- [Tests accidentally weaken lifecycle coverage during migration] → Rewrite Core 201 before production changes and preserve retry, rollback, atomic commit, HTTP round-trip, and tamper cases through formal attempts.
- [Large-transfer performance regresses] → Run Core 202 independently three times under the existing profile, deadline, and memory limit.
- [Canonical output drifts] → Reuse Core 218 and the contract checker; verify the contract fingerprint remains unchanged.
