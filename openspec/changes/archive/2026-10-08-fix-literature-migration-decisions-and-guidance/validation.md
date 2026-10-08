# Validation

## Regression and integration checks

- Migration service, cooperative converter, onboarding, additive receipt schema,
  Dashboard region and browser suites: **80 passing**. Coverage includes atomic
  repeated failure, stop rollback, ownership release, cross-page group choices,
  individual overrides/reset, exclusions, durable evidence, and responsive
  large-artifact conversion.
- Literature bundle, Dashboard integration and panel scroll ownership suites:
  **44 passing**. Existing import behavior remains covered; migration checks
  include exact-run navigation, searched full-group decisions, and final consent.
- Startup hooks and canonical artifact contract suites: **18 passing**.
- Root, Dashboard, Sidebar and Synthesis TypeScript checks passed.
- Localization governance, generated help-document freshness, focused ESLint,
  Prettier for changed files, `git diff --check`, and strict OpenSpec validation
  passed.

## Private library read-only replay

The local library was read only through its database and embedded payloads.
No migration write was performed against the source. Only these aggregate
facts are retained; no titles, authors, text, portable refs or source paths are
included in the record or committed fixtures.

- 268 parent sets, 536 embedded payloads, zero read errors.
- Initial classification: 102 ready, 99 requiring review, 67 blocked.
- The old duplicate-merge decision failed after partial issue mutation; retry
  operated on a different subset, reproducing the reported intermittent behavior.
- Current group decisions completed: keep unresolved (154), keep ambiguous
  unresolved (34), merge duplicates (66).
- Final classification and automatic inclusion: 266 ready/included, 2 blocked.
  One blocked set exceeds the Citation summary schema limit; the other has
  unsupported Citation-only input. Group decisions preserve these blocked sets.

## Zotero acceptance

Acceptance uses `npm run test:zotero:e2e`, a fresh copy under `.scaffold/test`,
Zotero 10.0.2 on Windows x64, and a sidecar built from the current local source.
The new full-runner case checks grouped review, canonical writes, durable
decision evidence and the existing Suite Health Gate. The automated profile
preloads the current successful-check marker so the startup reminder does not
interrupt unrelated cases; the onboarding coordinator suite separately verifies
first activation, upgrades, reminder choices, progress and shutdown behavior.
The acceptance staging copy retains the Zotero database and storage but starts
with fresh plugin state. Source plugin state is neither changed nor copied into
this migration-only fixture. This prevents unrelated content-update prompts
and a full debug snapshot of the old Synthesis repository from dominating the
Suite Health Gate. Its real operation checks and normal deadlines are retained.
An earlier run with copied plugin state failed the health probe and reached the
migration case timeout; it is not counted as a successful acceptance.
The final acceptance completed successfully with `npm run test:zotero:e2e`
and `ZOTERO_TEST_GREP='System E2E runner foundation|Literature migration full E2E'`:

- Run ID: `b3ffb4c2-af82-4747-b872-d45044909ac6`.
- Manifest: `artifacts/test-diagnostics/system-e2e/b3ffb4c2-af82-4747-b872-d45044909ac6/run-manifest.json`.
- Plugin 0.9.0, migration definition 7, Zotero 10.0.2, Windows x64.
- Current-source sidecar bundle:
  `ce378dd6f531f53b8716c2c303244e854376c92458e8b25d583eef4415d2f274`.
- Build fingerprint:
  `f72a4d6502e87af6895870c860be89288fda1bb1a00068057f4c2364ebf37fc6`.
- **2 selected, 2 passed, 0 failed, 0 skipped, 0 incomplete**; runner exit 0.
- 268 candidate sets; 266 eligible/applied receipts, 2 skipped, 0 failed.
- All problem-group decisions succeeded; the final review and results page
  transitions completed.
- Broker readiness independently read two distinct representative parents,
  including the largest eligible mention set. Four canonical References/Citation
  artifacts became readable. Existing note identities may be reused, so note
  count growth is not a migration invariant.
- Final health: host responsive, plugin responsive, sidecar ready; zero
  undeclared operations, zero extra managed processes, no residual owned state.
- Migration case duration: 587.906 seconds; scan about 225 seconds, group
  decisions about 93 seconds, and apply about 268 seconds. Large-group decisions
  remained cooperative; automated converter tests separately verify heartbeat
  and stop behavior.

The original library was never used for writes. The acceptance does not claim
to validate unrelated historical Synthesis plugin state; the copied-state
health timeout remains outside this migration change. The change is left active
for review, with no commit, archive or release performed.
