# Tasks

## 1. Restore the strategy and vocabulary baseline

- [x] 1.1 Add the `system-e2e-strategy` capability as the semantic source for the risk catalog, family and case catalogs, ownership labels, regression admission, quarantine, and promotion rules, and verify `openspec validate 01-establish-system-e2e-runner-foundation --strict` accepts the delta
- [x] 1.2 Add the `e2e` domain and the System E2E identity rules to the `test-taxonomy-domain-grouping` delta, and verify the delta modifies the existing requirements with their full text instead of replacing their detail
- [x] 1.3 Restore the agreed `System End-to-End Test` and `Contract Integration Test` definitions in `CONTEXT.md` and verify both terms appear in the language section with their boundary conditions
- [x] 1.4 Record the confirmed Phase 1 fifteen-case catalog plus `CG-02` and the Phase 2 fourteen-case catalog in the strategy specification and verify each case has one stable ID, one trigger, at most one principal fault, and one terminal verdict

## 2. Establish Committed Seed identity and validation

- [x] 2.1 Write contract tests for fixture identity (`schemaVersion`, `fixtureId`, `fixtureRevision`), shape-versus-content advancement, registry lookup, and retirement eligibility, and verify they fail before the fixture module exists
- [x] 2.2 Implement the portable fixture identity, active registry, and validation entry point, and verify the contract tests pass
- [x] 2.3 Add the committed synthetic de-identified seed data and the minimum synthetic attachment assets, and verify materialization declares the same structural facts across repeated runs
- [x] 2.4 Write and pass a privacy validation check over the committed seed and registry, and verify no databases, WAL files, profiles, absolute paths, identifying facts, or content-derived hashes are present
- [x] 2.5 Wire Committed Seed validation and materialization into the existing `test:init` path and verify a failing seed blocks the invocation before any Zotero test executes
- [x] 2.6 Preserve the existing Private Gold Source copy, quiescence assumption, ephemeral-state stripping, and Gold Structure Contract validation, and verify a selected gold lane with a missing source fails while an unselected gold lane is skipped

## 3. Add the runner-owned Run Manifest

- [x] 3.1 Write contract tests for manifest terminalization (`complete`, `aborted`, `incomplete`), run identity and lineage fields, invocation-level failure when the manifest cannot be persisted, and scenario failure when required public, typed, lifecycle, cleanup, or health evidence is missing, and verify they fail first
- [x] 3.2 Implement the run identity and manifest writer in the outer runner, and verify the terminalization and missing-evidence contract tests pass
- [x] 3.3 Extend the existing diagnostic-bridge and reporter event path to feed manifest family and scenario events, and verify an emitted event is reflected in the manifest without copying log text
- [x] 3.4 Implement the artifact-reference classification with `withheld` entries and stable reason codes, and verify sensitive values, host-local paths, profile identities, and private-format content are absent from every manifest entry
- [x] 3.5 Verify an interrupted invocation preserves completed family results, failure phase, stable abort code, last known cleanup and health states, rerun lineage, and already available sanitized artifact references

## 4. Add the shared-profile family lifecycle

- [x] 4.1 Write contract tests for the family lifecycle transitions, namespace and owned-state declarations, optional carry-over within one family, cross-family carry-over rejection, family cleanup, and the post-initialization and post-family Suite Health Gate, and verify they fail first
- [x] 4.2 Implement the declarative family declaration and the runner-enforced transitions, and verify the lifecycle contract tests pass
- [x] 4.3 Implement the Suite Health Gate checks for host and plugin responsiveness, expected current-source sidecar identity readiness, absence of undeclared operations and managed processes, and cleaned owned state, and verify a deliberate leak fails the gate
- [x] 4.4 Implement fail-closed abort for baseline setup, cleanup, health-gate, process-restart, and runner or transport failure, and verify an indeterminate cleanup or health result aborts the invocation while an ordinary assertion failure still runs that family's cleanup and gate
- [x] 4.5 Reuse the existing copied-profile, sidecar staging, Mock SkillRunner lifecycle, test selection, and temporary-data cleanup instead of introducing parallel infrastructure, and verify one invocation materializes exactly one Suite Baseline

## 5. Prove the foundation on a real host

- [x] 5.1 Verify `npm run test:zotero:e2e` and `npm run test:zotero:e2e:stress` remain usable with unchanged entry points after the runner changes
- [x] 5.2 Run one real Zotero 10/Linux Committed Seed invocation and verify baseline setup, shared-profile execution, family cleanup, Suite Health Gate, and a persisted sanitized Run Manifest with a trustworthy terminal state
- [x] 5.3 Verify no second runner, runtime scenario registry, global production fault service, aggregate import suite, or file or title allowlist was introduced by scanning the runner, configuration, and suite directories
- [x] 5.4 Verify no product runtime behavior, dependency, publication action, or new blocking CI lane changed by reviewing the final diff and the generated gate plan

## 6. Keep the catalogs, documentation, and drift current

- [x] 6.1 Update `docs/dev/zotero-e2e.md` with the Suite Baseline, Committed Seed, family lifecycle, health gate, manifest, and abort contract, and verify the described commands match `package.json`
- [x] 6.2 Update the affected testing documentation and OpenSpec testing specifications for the `e2e` domain and the strategy source of truth, and verify no remaining text describes the old per-test-only E2E model
- [x] 6.3 Record the R9 and Stage-1 boundary as `SL-01`, `SL-02`, and `SL-03` as shared implementation and evidence producers with all other R9 gates remaining owned by `complete-synthesis-r9-stage1-acceptance`, and verify the strategy text and that change do not conflict
- [x] 6.4 Verify the documentation states that the five-change program is strictly serial and that `300-lisongtao-gold` and `276-dashboard-synthesis-close` keep their current locations and commands

## 7. Verify the change

- [x] 7.1 Run the type check, lint, formatting, and diff checks for the changed runner, fixture, and documentation files and verify they pass
- [x] 7.2 Run the affected Node contract tests and verify they pass without asserting prose, private call order, or raw local paths
- [x] 7.3 Run `openspec validate 01-establish-system-e2e-runner-foundation --strict` and verify every artifact validates with no requirement or scenario format error
