# Design

## Context

Implementation prerequisite: read [`artifacts/e2e-wayfinder/system-e2e-implementation-handoff.md`](../../../artifacts/e2e-wayfinder/system-e2e-implementation-handoff.md) before applying this change. It is the self-contained source for the Wayfinder decisions and replaces issue-tracker lookup.

See `proposal.md` for motivation. The current E2E path is three cooperating pieces and nothing else:
`zotero-plugin.config.ts` resolves the `e2e` domain to `tests/zotero/e2e/full`, stages the
current-source sidecar in the `test:prebuild` hook, and optionally copies a gold profile/data pair in
the `test:init` hook; `scripts/run-zotero-test-with-mock.ts` owns the outer process, the Mock
SkillRunner lifecycle, the test data directory, and cleanup; `tests/zotero/setup.test.ts` installs the
diagnostic bridge, leak probe, and performance probe, and `tests/zotero/diagnosticBridge.ts` emits
failure context through the patched reporter.

The gaps this change must close are structural, not behavioral: no committed deterministic seed exists
for the non-gold path, no family-level lifecycle exists, no run-level verdict survives host
termination, and fixture identity has no contract. The existing test data directory is a per-process
temporary path owned by the wrapper, which is the natural place for a run identity to live precisely
because it is outside Zotero.

## Goals / Non-Goals

**Goals:**

- Give every E2E invocation one copied profile, one Suite Baseline, and one trustworthy terminal
  Run Manifest that survives host or sidecar death.
- Give Scenario Families one declarative lifecycle: namespace, owned state, optional carry-over,
  cleanup, and health gate, enforced fail-closed.
- Give fixtures one portable identity and validation contract, with a committed synthetic seed for the
  default path and a governed read-only gold path for opt-in lanes.
- Keep this the only runner, and keep every existing entry point usable.

**Non-Goals:**

- Implementing any Phase 1 or Phase 2 Scenario Case, or fixing the sidecar recovery defect.
- Adding fault-control seams, a scenario registry, a second runner, or a CI matrix.
- Changing product runtime behavior, publication, or dependency surface.

## Decisions

### 1. Put the run contract in the wrapper, not in Zotero

The manifest, run identity, fixture staging, and family verdicts belong to
`scripts/run-zotero-test-with-mock.ts`, which already survives Zotero termination and already owns the
temporary test data directory. Zotero-side code reports events outward through the existing diagnostic
bridge; the wrapper alone decides the terminal state.

Alternative: let an in-Zotero module write the manifest. Rejected because a host crash, the exact
failure class this change exists to expose, would erase the verdict.

### 2. Derive the Suite Baseline from the existing staging hooks

The Suite Baseline is not a new artifact type: it is the copied profile plus the committed seed plus
the already-built plugin and currently staged current-source sidecar. The `test:init` and
`test:prebuild` hooks gain seed materialization for the default path; the gold path keeps its current
behavior of copying a quiescent source and stripping machine-bound state. One invocation materializes
exactly once, and no family may re-materialize.

Alternative: rebuild the baseline between families. Rejected because the shared-profile contamination
risk is the point of the family contract, and resetting between families would hide it.

### 3. Model the family lifecycle as declared data plus runner-enforced transitions

A family declaration is small and declarative: stable ID, module ownership label, namespace, owned
state, optional carry-over set, and cleanup action. The runner owns the transitions
`initialized → family-start → family-cases → family-cleanup → health-gate → family-end` and aborts the
invocation on an indeterminate cleanup or health result. Enforcement is failure-based rather than
introspective: the health gate checks that no undeclared operation or managed process remains and that
the family's owned state is gone.

Alternative: per-family bespoke setup and teardown code. Rejected because undeclared persistent mutation
would become undetectable, and because the existing per-test teardown in `diagnosticBridge.ts` already
proves shared teardown can be centralized.

### 4. Keep the Run Manifest an index and re-derive only what is missing

The manifest records identity, family and case verdicts, typed-evidence descriptors, lifecycle
checkpoints, cleanup and health results, and artifact references. Existing specialized diagnostics
(reporter output, failure context, leak and performance digests, sidecar traces) stay where they are and
are referenced by workspace-relative path after a sanitization classification, or recorded as
`withheld` with a reason code.

Alternative: embed receipts and log tails in the manifest. Rejected because it duplicates evidence,
enlarges the privacy surface, and contradicts the agreed sanitized-index contract.

### 5. Give the fixture three independent identity fields and one registry

`schemaVersion`, `fixtureId`, and `fixtureRevision` are independent so that a shape change and an
observable-content change are distinguishable in a manifest. The active registry is minimal: it maps
fixture IDs to their current schema and revision and the lanes that reference them, and it is the only
place a revision can be retired from. Validation runs before a Committed Seed invocation starts, and
materialization is validated by declared structural facts rather than content hashes.

Alternative: hash the seed content. Rejected because it is not required for determinism and would put a
content-derived identity on the privacy boundary.

### 6. Record the catalogs as specification text, not as machine-readable data

The risk catalog, family labels, case IDs, and promotion rules live in the `system-e2e-strategy` spec
because the requirement is traceability and reviewability by a maintainer and an agent, not runtime
dispatch. Case selection stays with the runner; test membership stays with the directory entries in
`zotero-plugin.config.ts`.

Alternative: a JSON catalog loaded at runtime. Rejected because it would create a second fact source for
membership and a parallel artifact to keep in sync with the specs and directories.

### 7. Keep the R9 boundary as an explicit consumer relationship

`SL-01`, `SL-02`, and `SL-03` are implemented once and emit both verdicts when bound to the immutable
R9 candidate. Everything else in the R9 change keeps its own evidence ownership. A manifest is offered
to the R9 evaluator only when candidate identity and environment match.

Alternative: merge the R9 acceptance gates into this framework. Rejected because the R9 envelope,
prebuild, XPI, install and migration, lifecycle fuse, lock, and seven-surface matrix are a different
completion authority with different identities.

## Risks / Trade-offs

- **Runner-side change destabilizes the existing E2E command** → keep `npm run test:zotero:e2e` and
  `npm run test:zotero:e2e:stress` entry points unchanged and prove the new contracts at the
  contract level before wiring the real invocation.
- **A manifest that records verdicts can drift from the real run** → terminal state is written only from
  observed events, and missing required evidence fails the scenario instead of being inferred.
- **Seed growth leaks private data** → accept only deterministic synthetic structure and run fixture
  privacy validation before publication.
- **Family contract is unproven until real scenarios exist** → this change proves transitions with the
  initialization and health-gate path plus a real Zotero 10/Linux invocation, and Change 3 completes
  the catalog.
- **Health gates become heavy and slow** → keep the common gate minimal: responsiveness, expected
  sidecar identity readiness, no undeclared operation or managed process, and cleaned owned state.

## Migration Plan

1. Add the strategy specification and taxonomy delta; restore the `CONTEXT.md` definitions and update
   `docs/dev/zotero-e2e.md` and the testing documentation.
2. Add the fixture identity, registry, and Committed Seed with validation, then wire seed
   materialization into the existing `test:init` path.
3. Add the runner-owned manifest, run identity, and artifact-reference classification; drive it from
   the existing diagnostic-bridge event path.
4. Add the family lifecycle declarations, cleanup, Suite Health Gate, and fail-closed abort with
   contract tests for each transition and terminal state.
5. Run one real Zotero 10/Linux Committed Seed invocation and confirm baseline setup, shared-profile
   execution, cleanup, health gate, and a persisted sanitized manifest.

Rollback reverts the runner, fixture, and documentation changes together; the existing suite remains
runnable at every step because the new contracts are additive until the family lifecycle is enabled.

## Open Questions

None. Concrete manifest serialization and filenames, seed file layout, retention periods, and the
family declaration file format are implementation choices that do not change the specs, the approach,
or the task breakdown.
