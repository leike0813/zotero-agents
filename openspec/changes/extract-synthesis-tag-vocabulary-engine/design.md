## Context

`src/modules/synthesis/tagVocabulary.ts` currently owns both deterministic TagVocab computation and application concerns. Pure entry/protocol normalization, validation, active-tag selection, and search-index construction sit beside SQLite mapping, transactions, canonical manifests, import compatibility, staged suggestions, Host effects, projection registry writes, and WebDAV autosync.

The existing `packages/synthesis-engine` boundary already hosts graph and Reference Matcher kernels. Tag Vocabulary validation/index is the next Stage 1 WS3 kernel, but unlike graph computation its validation is synchronously reused inside canonical repository transactions. Moving that validation outside the transaction would introduce a stale-basis window and expand this extraction into a mutation-concurrency redesign.

## Goals / Non-Goals

**Goals:**

- Extract one strict, bounded, environment-neutral engine for TagVocab v1 validation and index construction.
- Make the engine the single semantic source used by save, import, canonical entry mutation, snapshot validation, and projection rebuild paths.
- Preserve warning codes, severity, ordering, active tags, search rows, persisted shapes, hashes, and public behavior.
- Prove process portability with strict DTO rebuilding, checkpoints, and a test-only worker.
- Keep failed or malformed index computation from advancing projection registry state.

**Non-Goals:**

- Moving canonical mutation validation outside repository transactions.
- Changing import merge rules, staged suggestion semantics, Host Tag effects, WebDAV autosync, manifests, database schema, or Client APIs.
- Activating production workers, a worker pool, the Node sidecar, or remote execution.
- Tuning TagVocab rules, warning messages, or Workbench behavior.

## Decisions

### Use one synchronous engine with validation and index methods

`SynthesisTagVocabularyEngine` exposes synchronous `validate(request)` and `buildIndex(request)` methods. The request/result contracts are versioned, canonical camelCase, JSON-safe, and strictly rebuilt at the boundary. Both methods share the same canonical request rebuilding and validation primitives.

Alternative: expose free functions only. Rejected because composition needs an injectable seam for failure, malformed-result, and future process-boundary tests.

### Keep transaction validation synchronous and in-process

Canonical save/update/delete paths invoke the configured engine while the existing repository transaction is active. Hard input bounds keep the work finite. This preserves atomic validation without adding a capture/compute/recapture protocol.

Alternative: await an asynchronous engine outside the lock and revalidate a basis before commit. Rejected for this change because it changes mutation concurrency, transaction ownership, and failure behavior beyond a pure-kernel extraction.

### Bound every cross-process collection

The engine accepts at most 25,000 entries, 50,000 global aliases, 10,000 abbreviations, 256 protocol facets, and 256 aliases or abbreviations per entry. Strings are capped at 4,096 code units and tag length remains governed by the protocol's existing 120-character default. Checkpoints occur at deterministic phases and every 256 processed rows.

### Keep application-owned fields outside the engine

The engine does not compute canonical manifest hashes, timestamps, repository records, transaction receipts, projection registry state, diagnostics persistence, import actions, or Host effects. The application adapter supplies `sourceManifestHash` and `rebuiltAt` for index construction and maps canonical engine results back to the existing snake_case domain shapes.

### Rebuild engine results before application use

The adapter strictly rebuilds validation and index results, rejects unknown or malformed basis fields, duplicate tags/search rows, non-deterministic ordering, and invalid diagnostics, and uses the rebuilt result as the only value eligible for persistence or projection promotion.

### Keep the worker canary test-only

A Node worker fixture receives a structured-cloned request and returns the canonical validation/index results. Production plugin imports remain free of Node, Zotero, repository, foundation, runtime, and filesystem dependencies.

## Risks / Trade-offs

- [Validation still runs inside repository transactions] → Enforce hard bounds and synchronous checkpoints now; asynchronous two-phase mutation is a separate topology change.
- [Normalization drift changes manifests or warnings] → Characterize current results and require exact warning/index parity before deleting the old helpers.
- [Strict rebuilding rejects previously tolerated internal values] → Apply strict rebuilding only at the new engine seam while retaining application import compatibility before projection.
- [Engine injection is bypassed by secondary compositions] → Give `createSynthesisTagVocabularyService` one default engine and explicitly thread the configured engine through the main service composition.
- [Node dependencies leak into the plugin] → Keep the worker fixture under tests and add package/import guards.

## Migration Plan

1. Add failing strict-contract, parity, bounds, cancellation, worker, and failure-preservation tests.
2. Add the Tag Vocabulary engine and canonical DTO rebuilders.
3. Add the application adapter and inject the engine into Tag Vocabulary service composition.
4. Replace application validation/index helpers and delete the duplicated pure algorithms.
5. Update current-state docs and run focused plus production validation.

Rollback is code-only because no schema, public contract, or persisted format changes.

## Open Questions

None.
