# Proposal

## Why

The Phase 1 catalog is not a release guard until exact compatibility cells can run reproducibly and their budgets are calibrated from real evidence. Promotion must follow measured clean runs rather than making newly landed workflow YAML blocking by assumption.

## What Changes

- Extend the existing compatibility planner and worker with the `e2e` domain and execution-cell identity; do not create another matrix runner.
- Repair behavioral worker membership so it consumes the authoritative suite directories instead of deleted aggregate `suite.test.ts` files.
- Wire Zotero 10/Linux `SL+PM` for pull requests, all Phase 1 families on Zotero 7/9/10 Linux for main, and all families on Zotero 7/9/10 Linux and Windows for release; retain macOS as non-blocking formal-XPI evidence.
- Add non-gating weekly release-equivalent health, Zotero 10/Linux stress, and manual Zotero 10/Linux private large-gold paths.
- Start every prospective blocking E2E cell non-blocking, collect three clean independent workflow rounds, and require human-reviewed explicit promotion per cell.
- Add the sole automatic rerun to weekly orchestration: rerun the complete failed cell once with a fresh profile and linked run identity while retaining the first failure and failed workflow verdict.
- Keep blocking PR, main, and release cells retry-free; block Windows release promotion while `CG-02` is failing or lacks trustworthy evidence.
- Start only after `03-implement-phase1-system-e2e-catalog` is implemented, verified, synchronized, and archived.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `zotero-cross-platform-compatibility-fixture`: Add E2E execution cells, immutable runtime identities, directory-based suite consumption, per-cell calibration evidence, and the fixed compatibility matrix.
- `test-suite-gating-strategy`: Define non-blocking calibration, explicit cell promotion, retry-free blocking lanes, and the diagnostic-only weekly rerun.

## Impact

- Changes compatibility planner, worker, receipt, CI, release, and scheduled workflow wiring plus their existing contract tests.
- Reuses one prebuilt plugin and current-source sidecar identity per workflow/cell; compatibility workers do not rebuild or replace those artifacts.
- Adds no product runtime behavior, dependencies, publication action, or macOS blocking System E2E lane.
