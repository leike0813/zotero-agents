## Context

`src/modules/synthesis/referenceMatcher.ts` contains environment-neutral normalization, indexed binding, clustered canonical dedupe, evaluation, and fingerprint code, but imports application hashing and exports a `Map`/`Set` index that cannot cross a worker boundary. Production `runAdvancedReferenceMatchingNow` builds one library index, writes binding facts and proposals while iterating, then computes and writes canonical redirects and merge proposals. A failure in the second pass can therefore leave a partially promoted operation.

The existing `packages/synthesis-engine` boundary already hosts graph build, metrics, and layout kernels. Reference matching is the next Stage 1 WS3 kernel and must preserve the current precision-first policy without mixing algorithm tuning into the extraction.

## Goals / Non-Goals

**Goals:**

- Establish one injectable matcher engine with separate binding and canonical-dedupe compute contracts.
- Define strict, versioned, bounded JSON-safe DTOs and canonical result rebuilding.
- Build the library matcher index once per binding operation while keeping `Map`/`Set` state private to the engine.
- Keep Host/repository reads and all durable decisions outside engine compute.
- Promote both matcher passes atomically only when their captured basis remains current.
- Preserve current matcher output, proposal/fact semantics, progress counters, and harness results.

**Non-Goals:**

- Matcher threshold, policy, danger-pair, eligibility, or representative-selection tuning.
- Public client/service changes, database migrations, proposal UI changes, or lightweight sidecar matching changes.
- Production workers, process supervision, resumable slices, or sidecar topology.
- Transactional refactoring of manual accept/reject/reopen/delete/retarget actions.

## Decisions

### Use one engine with two strict methods

`packages/synthesis-engine/src/referenceMatcher.ts` will export `SynthesisReferenceMatcherEngine` with:

- `matchBindings(request)` for one library paper snapshot and the current unbound canonical representatives;
- `dedupeCanonicals(request)` for effective unbound canonical records after excluding accepted binding targets.

The methods have independent request/result DTOs because their inputs, phases, and budgets differ. They share normalization and hashing primitives inside the engine. `ReferenceMatcherIndex` remains implementation-private and never crosses the serialized boundary.

Both requests use contract version `synthesis-reference-matcher.v1`. Binding declares `reference-binding.v1` plus the current policy id; dedupe declares `canonical-cluster-dedupe.v1`. Canonical DTOs use camelCase only. Rebuilders discard unknown fields, normalize stable ordering, and reject non-plain JSON, non-finite numbers, control-character identifiers, duplicates, invalid enum values, dangling candidates/actions, missing or extra input identities, and oversized strings or collections.

Production hard limits are 25,000 library papers, 750,000 binding inputs, and 750,000 dedupe canonicals. Per-row limits are 64 authors, 32 identifiers, 16 title candidates, three suggested candidates, and 4,096 characters per string. Cluster defaults remain 30 records per block and 3,000 candidate pairs. Rebuilders accept implementation-only test bounds; bounds are not serialized into DTOs.

### Preserve algorithm and hash semantics

Normalization, identifier extraction, title variants, author/year evidence, candidate ranking, guarded fuzzy matching, eligibility filtering, block generation, edge classification, clusters, representatives, actions, fixture evaluation, and matcher fingerprinting move without policy changes.

Canonical JSON and SHA-256 move to an environment-neutral engine utility. Existing foundation hashing delegates to the shared utility so action ids, edge ids, fixture fingerprints, basis hashes, and other application hashes remain byte-for-byte stable.

### Keep application facts and materialization outside the engine

The application adapter owns:

- bounded Host library reads;
- active raw/canonical/redirect/binding capture and effective-id resolution;
- representative raw-reference selection and canonical title-candidate aggregation;
- application source/basis hashes and proposal/fact record ids;
- rejected-proposal preservation and user decisions;
- progress rows, graph cache invalidation/refresh, and related-items sync.

The engine returns evidence and actions only. It cannot access repository records, timestamps, transactions, Host locators, Zotero objects, canonical files, operation rows, or user decisions.

### Compute both passes before one conditional promotion

The service reads bounded Host metadata outside the library write lock. Under a short lock it captures all repository facts needed for binding and dedupe and computes an application-owned basis hash. It then runs both engine methods outside the lock and strictly rebuilds both results.

Before durable writes, the service reacquires the lock and rebuilds the same relevant basis. A mismatch fails with `reference_matching_basis_superseded`. When unchanged, one repository transaction applies automatic accepted bindings, accepted redirects, bounded proposals, rejected-proposal preservation, graph-stale state, and operation completion facts.

An engine throw, checkpoint cancellation, contract failure, malformed result, oversize request/result, superseded basis, or transaction failure produces no matcher durable writes. Existing bindings, redirects, proposals, and rejected decisions remain unchanged. Post-commit graph refresh and related-items sync retain their existing independent failure semantics.

### Use non-serialized checkpoints and a test worker canary

Binding checkpoints use `start`, `index`, `references`, and `complete`; dedupe checkpoints use `start`, `records`, `blocks`, `pairs`, `clusters`, and `complete`. The deterministic implementations invoke the callback at least every 256 processed records or pairs. A throwing callback aborts without returning a partial result. `AbortSignal` and functions never enter DTOs.

A Node-only test fixture structured-clones canonical requests, computes both methods, and returns rebuilt results. Production composition continues to use the in-process implementation.

## Risks / Trade-offs

- [Atomic promotion increases transient memory] → Keep requests and results hard-bounded and avoid retaining repository records in engine DTOs.
- [750,000-row binding request is large] → Establish process-safe bounds and checkpoints now; resumable slicing and worker scheduling remain a later WS3/WS4 change.
- [Hash extraction affects unrelated application hashes] → Characterize existing hashes before delegation and require exact parity.
- [Static guards depend on old function names] → Replace source-name checks with engine/adapter boundary checks while retaining lightweight-path behavioral tests.
- [Harness imports drift from production] → Route production, realtime harness, and gold-fixture evaluation through the same engine implementation.

## Migration Plan

1. Add failing strict-contract, parity, worker, cancellation, basis, and atomicity tests.
2. Add shared canonical JSON/SHA utilities and implement matcher DTOs, rebuilders, algorithms, checkpoints, and in-process engine.
3. Add the application adapter and inject the engine through service composition.
4. Replace incremental matcher writes with capture/compute/conditional atomic promotion.
5. Migrate harnesses and tests, delete the plugin matcher module, update documentation, and run focused plus production validation.

Rollback is code-only because no schema or public contract changes are introduced.

## Open Questions

None.
