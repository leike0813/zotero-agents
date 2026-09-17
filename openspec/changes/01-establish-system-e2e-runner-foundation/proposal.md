# Proposal

## Why

The repository already runs a real Zotero E2E path, but it exposes no shared execution, fixture, or
evidence contract: the current suite copies whatever profile the scaffold left behind, each test
owns its own state and cleanup, and a finished invocation leaves no trustworthy run-level verdict.
Without that foundation, the fifteen Phase 1 and fourteen Phase 2 cross-process risks cannot produce
comparable evidence, and a compatibility cell can never be calibrated or promoted honestly.

## What Changes

- Add one version-controlled strategy specification, `system-e2e-strategy`, as the semantic source for
  the risk catalog, Scenario Families, Scenario Cases, module ownership labels, regression admission,
  quarantine, and promotion rules. Test directories remain the execution-membership source; no
  parallel JSON scenario registry is introduced.
- Extend the existing `scripts/run-zotero-test-with-mock.ts` and `zotero-plugin.config.ts` E2E path so
  one invocation materializes one fresh Committed Seed and one Suite Baseline, reusing the current
  copied-profile, current-source sidecar staging, Mock SkillRunner lifecycle, test selection, and
  temporary-data cleanup. `tests/zotero/e2e/full` and `npm run test:zotero:e2e` remain the only
  runner; no second runner is created.
- Add the minimum runner-owned family lifecycle for serial execution in one profile: Family Namespace,
  Owned State, optional Carry-over Set, family cleanup, post-initialization and post-family Suite
  Health Gate, and fail-closed abort.
- Add the runner-owned, sanitized Run Manifest outside Zotero, reusing the patched reporter and
  diagnostic bridge as the event path and referencing existing specialized diagnostics instead of
  copying logs or receipts into it.
- Add the portable Committed Seed identity and validation contract (`schemaVersion`, `fixtureId`,
  `fixtureRevision`) with a minimal active fixture registry, and keep Private Gold Source optional,
  read-only, and governed by its de-identified Gold Structure Contract.
- Record the full confirmed catalogs in the strategy specification: the six Phase 1 families with
  fifteen cases plus the separate `CG-02` Windows close-lifecycle regression, and the four Phase 2
  families with fourteen cases.
- Keep `300-lisongtao-gold` and `276-dashboard-synthesis-close` in their current locations and
  commands; their results may be indexed by the manifest, but similarity does not relabel either as a
  catalog case.
- Restore the agreed `System End-to-End Test` and `Contract Integration Test` definitions in
  `CONTEXT.md`, and update `docs/dev/zotero-e2e.md` and the affected OpenSpec testing specifications.
- Keep the five-change program strictly serial: each successor starts only after its predecessor is
  implemented, verified, synchronized/archived.

## Capabilities

### New Capabilities

- `system-e2e-strategy`: the project-wide System E2E strategy — risk catalog and priority gates,
  Scenario Family/Case identity and catalog, runner foundation contracts (single runner, Suite
  Baseline, Committed Seed, family lifecycle, Suite Health Gate, Run Manifest), module ownership
  labels, regression admission, quarantine, calibration and promotion, and the boundary against
  lower-layer evidence and the separate R9/Stage-1 acceptance change.

### Modified Capabilities

- `test-taxonomy-domain-grouping`: the `e2e` domain joins the standard domains, and its naming and
  ownership rules distinguish a stable Scenario Family/Case identity from primary domain and runtime
  affinity classification.

## Impact

- Runner and configuration: `scripts/run-zotero-test-with-mock.ts`, `zotero-plugin.config.ts`,
  `tests/zotero/e2e/full`, plus new runner-owned manifest, fixture, and family-lifecycle modules.
- Fixtures: a new committed, synthetic, de-identified Committed Seed under `tests/fixtures/` with a
  portable identity and validation path; no databases, profiles, WAL files, identifying data, private
  content hashes, or machine-bound state are committed.
- Documentation: `docs/dev/zotero-e2e.md`, the testing documentation, and `CONTEXT.md`.
- Specifications: `system-e2e-strategy` (new) and `test-taxonomy-domain-grouping` (delta); later
  changes modify `zotero-cross-platform-compatibility-fixture` and `test-suite-gating-strategy`.
- No product runtime behavior, dependency, publication action, or new blocking CI lane is introduced
  here; the existing `npm run test:zotero:e2e` and `npm run test:zotero:e2e:stress` entry points stay
  usable.
