## 1. Index and Report delivery

- [x] 1.1 Add Broker and host-read regressions for codec resource limits, implement public `resource_limited` normalization, and verify the targeted tests pass.
- [x] 1.2 Add the coordinated Synthesis asset-revision regression, version the page/style/bundle URLs, and verify first-open Report behavior in the existing browser harness.

## 2. Migration domain and lifecycle

- [x] 2.1 Add a historical auxiliary-payload regression, recognize and preserve `literature-matching-metadata-json`, advance definition version 4, and verify converter/apply tests pass.
- [x] 2.2 Add bounded scan progress and cancellation checkpoints through the existing host/service snapshot seam and verify monotonic progress and Stop behavior.
- [x] 2.3 Add process-local candidate dispositions, concrete issue/options, runtime-owned resolution, basis revalidation, and target-only cleanup; verify duplicate, linkage, approval, skip, stale, and cleanup cases.
- [x] 2.4 Filter the complete migration plan before 25-row pagination and verify search, classification, reason, disposition, counts, and cursors.

## 3. Dashboard migration UI

- [x] 3.1 Extend the Dashboard wire contract, actions, snapshot, and projection with progress, filters, dispositions, and bounded issue details; verify strict JSON projection tests.
- [x] 3.2 Rebuild Migrations Region with a real progress bar, Review-style filters, scrollable paged results, and a keyboard-accessible detail drawer with issue decisions, approval, and skip; verify UI and browser interaction tests.
- [x] 3.3 Add localized labels to every locale and verify localization governance and TypeScript localization typings.

## 4. Documentation and verification

- [x] 4.1 Update the three main specifications and migration/workbench component documentation, then validate the OpenSpec change strictly.
- [x] 4.2 Run targeted node tests, `npm run build`, and `npm run lint:check`; record any environment-only real-device acceptance that remains.
