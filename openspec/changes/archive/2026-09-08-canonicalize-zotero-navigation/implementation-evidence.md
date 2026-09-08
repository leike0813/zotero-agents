# Navigation implementation evidence

## Baseline

- Implementation baseline: `b7a4c9536640d4c4947488ba26b0b42f059df34a`.
- Zotero references: 7.0.32 (`188c54c186fbbaa6889145986d43ba64160a44fa`), 9.0.6 (`7132587c2d6d56725debe64908733a8140bc6be3`), and 10.0.1 (`36749bd0bd4fdac9ee46c16f7aa7bed094a0851f`).
- Existing user-owned diff: `addon/content/help-docs/manifest.json`, one line changed; binary patch digest `128c5229fc6e18564c78a4548e86153cd7b7db9dfe7823f478ae27bae0e2eda1`.
- Materialized package file counts before implementation: CLI 138, Generic coordinator 6, query 4, acquisition 4, analysis 4, synthesis 4, curation 4.
- Baseline package gate: `check-host-bridge-skill-packages.ts --baseline-ref b7a4c9536640d4c4947488ba26b0b42f059df34a ...` passed its relative checks and reported 27 existing command-card instruction-depth advisories. These are accepted as generated-card depth warnings and must remain explicitly dispositioned after rendering.
- Approved deletion inventory: DEL-09 (Workflow Host navigation), DEL-10 (four `/context/*/open` routes), DEL-11 (four legacy CLI open commands and their generated cards). No other semantic deletion is authorized.

## Native audit

All three fixed references contain `ZoteroPane.viewItems`, `Zotero.FileHandlers.open`, `Zotero.Reader.open`, `Zotero.Reader.getByTabID`, Reader `navigate`, and `Zotero_Tabs` selection/focus seams. Zotero 7/9 primarily expose single-row collection-tree state; Zotero 10 also exposes multi-row rows and selection. The implementation therefore feature-detects public row/selection methods and normalizes only public row facts.

Reader behavior that cannot prove captured-window ownership or exact location acceptance is reported as `unsupported_operation` with `details.reason = location_unsupported`; no global/different-window or location-free fallback is allowed. Runtime evidence must cover library root, collection, Saved Search, regular item, PDF attachment, annotation, existing Reader tab, and cold Reader open on all three versions.

## Verification record

Completed checks:

- `openspec validate canonicalize-zotero-navigation --type change --strict` — passed.
- `npx tsc --noEmit` — passed.
- `npm run build` — passed after correcting the Reader annotation error taxonomy.
- `cargo test --manifest-path cli/zotero-bridge/Cargo.toml --quiet` — passed (124 unit/integration tests and 14 contract tests).
- Broker canonical navigation and selection tests — passed; Host Bridge regression
  coverage now asserts all removed `/context/*/open` routes return 404.
- Host Bridge registry/MCP mirror tests — passed (2 focused registry/mirror cases).
- `git diff --check` — passed.
- `npm run test:node:core:full` — completed with the repository's existing
  failures only; the removed-route regression passes.
- `npm run test:zotero:core:full` — the entrypoint now builds and launches after
  removing the Node-only attachment-mutation test import; the unfiltered suite
  still reaches the repository's existing selection-context fixture failure.
- `npm run test:zotero:ui` — two existing ACP Workspace publication timeout
  failures; no navigation failure.
- `npm run test:zotero:compatibility:plan` — passed (plan generation only).
- `npm run check:host-bridge-content` — passed with no render diff.
- `npm run check:host-bridge-doc-sync -- --baseline-ref b7a4c9536640d4c4947488ba26b0b42f059df34a` — passed; unmapped/downgraded/unauthorized-dropped/intra-package-duplicate counts are all zero, with 27 pre-existing advisory depth warnings retained.
- `npm run check:host-bridge-review-mirror` — currently stale after the navigation contract refresh; Chinese translation/finalization is intentionally delegated to another agent.

## Legacy cleanup and governed-surface review

- Removed the unused Broker `openLegacyZotero*` exports, the obsolete internal
  `openZotero*` helpers, and the unreachable Host Bridge context-open handlers.
  A production-only search finds no legacy helper, navigation member, or old
  context-open route outside the intentional 404 regression assertions.
- Removed the four legacy context-open entries from the executable CLI contract
  and deleted the loader-side filter. The rendered source-controlled surfaces
  remain unchanged after regeneration.
- `npm run render:host-bridge-content` — passed with no changes;
  `npm run check:host-bridge-content` — passed;
  `npm run check:host-bridge-review-mirror` — pending delegated translation/finalization; the checker correctly reports stale mirror after regenerated navigation cards.
- Baseline-relative package inspection reports 32 advisory depth warnings
  (27 pre-existing and 5 caused by the new navigation cards); all four parity
  counters are zero. CLI cards report 135/135 coverage, 165,363 substantive
  lines, and 1,774,623 normalized prose characters.
- `npx tsx scripts/host-bridge-semantic-review-context.ts` completed with
  `reviewRequired: true`, no automated warnings; manual review disposition is
  recorded here as preserving all non-navigation guidance and limiting semantic
  deletion to DEL-09/10/11.

## Runtime suite availability

- Added `test/core/188-zotero-navigation.zotero.test.ts` and wired it into the
  full Zotero core and compatibility probe suites. It exercises focus, library,
  collection, Saved Search, reveal, item open, Reader page/EPUB dispatch, native
  capability reporting, and cleanup; unsupported native seams are asserted as
  stable fail-closed outcomes.
- Local Linux compatibility runs passed for Zotero 7.0.32, 9.0.6, and 10.0.1
  with `ZOTERO_TEST_GREP='canonical navigation in Zotero runtime'`, using the
  full-core entrypoint. Each receipt observed the requested version and recorded
  one passing navigation test with no errors. The suite creates a real PDF
  attachment and annotation, exercises cold/existing Reader dispatch, and cleans
  its items, collection, and Saved Search. Cross-platform Windows/macOS matrix
  cells were not run.
- The full-core entrypoint no longer imports the Node-only
  `test/core/12-handlers.test.ts`; a Node regression test covers this boundary.
  The navigation suite also records the Zotero-version API adaptation for
  attachment items and passes against all three local runtimes.

The semantic review context was generated and flagged the normal manual review requirement; no automated unmapped or duplicate findings were reported. Local Linux Zotero 7/9/10 navigation runs passed; the Windows/macOS matrix was not run. The routine Zotero core run still has the two pre-existing fixture/managed-note failures documented in the handoff; the Node full core and Rust suites completed independently.
