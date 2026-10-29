# Design

## Context

Baseline: `e48b21245c2cf183dbb07021108ecc075e31b3ae`. The initial 72 Synthesis Node test files, 427 Rust tests and three cross-language checks pass. Four additional malformed-envelope probes fail. The native runtime owns Synthesis application/repository/canonical state; TypeScript owns client composition and Host adapters. See proposal.md for scope.

## Goals / Non-Goals

Tests must observe public behavior and real TS/Rust exchanges. The approved seams are SynthesisClient, real native HTTP/reverse Host, persistence across process restart and the existing System E2E runner. Preserve the existing staged help manifest and all domain ownership constraints. No new runner, dependency, service, public test API, database migration or release work is planned.

## Decisions

1. Validate response shape in the shared RPC client, before accessing discriminators or projecting results. Require a non-array object, boolean `ok`, a data member for success and an object with a nonempty string code for failure. Reject HTTP failure combined with `ok: true`. Keep unknown string-code fallback to `internal_error`, optional error details handling, and native `unknown` identities unchanged. This repairs all RPC consumers without client-specific wrappers or protocol version changes.
2. Record each confirmed bug with source, trigger, expected/actual outcome and executable regression. Investigative hypotheses do not count as findings. Apply one red/green slice at a time; independently review cross-module fixes.
3. Inventory behavior from the production manifest, protocol registry, current specifications and state machines. Map each applicable scenario to real assertions and execution evidence in behavior-coverage.md. Operation presence, schema validation, invalid-request-only fixtures and skipped tests do not prove valid business behavior. Every applicable row must pass before claiming 100%; record gaps explicitly.
4. Reuse native route/corpus tests, existing Rust process integration and System E2E catalog. Add missing cases at the lowest seam that preserves the risk. Do not duplicate a lifecycle test in Rust just because TS already drives the real process. Include valid mutations and readback, failure isolation, pagination basis, transfer corruption, deadlines, cancellation, replay and restart where applicable.
5. Export the existing native-suite membership predicate for the shard runner so inclusion and exclusion share one roster. Keep current file selection and command behavior unchanged.
6. Run current-source local sidecar integration before serial Linux System E2E on 7.0.32, 9.0.6 and 10.0.2, using the existing isolated fixture runner. Formal compatibility-matrix versions remain unchanged. Extend existing Windows/macOS CI only where required by the new tests; unexecuted hosts remain explicit.
7. Canonical Rust numbers use IEEE-754 parsing with the existing serde_json `float_roundtrip` feature and ECMAScript decimal/exponent thresholds. Retain the page serialization fast path only when its numbers have identical bytes. Preserve all JSON own keys through TypeScript normalization, including `__proto__`.
8. Expose the Library Index partition cursors already consumed by the native implementation through its closed DTO/schema. Derive all Index library identities from the launch-bound application scope. Recheck reverse-Host revision after asynchronous reads before publishing any page or continuation.
9. ACP transport termination cancels pending permissions independently so the receive loop can drain and report its existing terminal diagnostics. Do not discard final buffered responses by racing connection shutdown.
10. Extract SkillRunner releases into a unique sibling staging directory, validate before promotion, and retain the previous install in a sibling backup until promotion succeeds. Restore it on promotion failure; preserve and report the backup if restoration fails. Choose temporary artifact retention by the actual install outcome for every return path.
11. Keep canonical-store v1 numeric bytes and hashes stable while correcting the wire representation. Both formats share the same recursive serializer; only numeric formatting differs. Existing manifests must remain readable without rewriting files or silently changing their basis. Verify old float bytes and declared hashes through the bounded and ordinary readers.
12. Correct Tag audit enum field projections at their Rust owner; keep existing snake_case aliases when reading durable conflict receipts. Construct default Topic Graph provenance using the existing EvidenceRecord field rather than broadening the schema. Exercise both through successful public mutations, readback and restart.
13. Index Topic inventory consumes all domain pages within the existing collection limit, projects optional lifecycle status, and merges graph-only planned nodes in stable ID order. The existing Topic list drops raw lifecycle status, so the adapter reads canonical content again to recover it; this bounded extra I/O is retained instead of expanding the public Topic DTO. A future inventory-specific application projection can eliminate duplicate reads if measured latency warrants it.
14. Reject a surface payload for another library before updating the controller's accepted request ID or surface cache. The same admission rule applies to visible and hidden surfaces; existing same-library off-screen caching remains available.
15. Fix newly exposed nonempty domain DTO mismatches at their owners: project repository records into worker input contracts, shape Topic views/report to their existing public schemas, omit absent optional WebDAV conflict hashes, and include the required severity on Reference partial-batch diagnostics. Do not weaken validation or bypass the typed client to make a test pass.
16. Topic audit triage projects actual stored judgments; missing triage must not acquire a map key that causes the update workflow to skip a paper. Reference detail and manual-target adapters preserve the current public DTO fields rather than leaking repository records or changing the client schema. Verify these boundaries with nonempty typed-client reads and exact target facts.
17. Preserve Tag worker validation warnings in the native compute adapter using the existing warning DTO and repository records. Reuse the established warning identity derived from code, tag and message; keep read-only validation free of persistence effects and saved warning content observable through the public snapshot.
18. Resolve alias reviews from the private stored audit target, validating alias identity, owner and normalized text against the current snapshot before the existing atomic replacement. Keep/remove affects only that alias and the owning concept/senses; malformed, missing or mismatched targets leave facts unchanged. Strip the private target from public review projection instead of expanding its closed schema.
19. Keep diagnostic event capture local to each Rust test thread so parallel tests cannot consume another test's terminal events. This isolation is test-only; production logging and the process-wide diagnostic switch remain unchanged. Use real-process tests to count events emitted across runtime threads.

## Risks / Trade-offs

- Broad behavior claims can conceal gaps: retain per-behavior provenance and separate runtime, contract and System E2E evidence; never manufacture a 100% result from a capability count.
- Fault injection can replace the code carrying the risk: inject only external transport/Host faults and assert through the public production path.
- Live library or credential leakage: use synthetic fixtures and isolated test data; redact diagnostics and never mutate source profiles.
- Expensive tests can be duplicated: run targeted regressions first and full suites once the final changes settle; repeat only affected checks after repairs.

## Migration Plan

No storage migration is expected. Library Index requests gain optional partition cursors; existing requests retain their behavior. Keep fixes in their owning modules, update consumers and docs, validate the change, and leave it uncommitted and unarchived for review.
