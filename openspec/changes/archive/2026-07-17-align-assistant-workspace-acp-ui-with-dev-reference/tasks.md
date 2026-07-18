## 1. Reference contract and v1 TDD

- [x] 1.1 Record the complete `dev@e5cda701` Chat/Skills UI contract, including disabled-control residency, live-versus-restorable connection semantics, hidden indicator values, exact banner metadata, and hint/composer separation.
- [x] 1.2 Add paired strict-schema tests for sole v1 acceptance, non-v1 and legacy permission rejection, exact regions/actions, and Chat/Skills supported-kind exhaustiveness.
- [x] 1.3 Add behavior and DOM-identity tests for toolbar, banner, transcript modes, plan, hint, permission, composer, navigation, details, empty state, and owner switching, using same-runtime-state fixtures that reject raw status leakage.
- [x] 1.4 Add a producer regression for same-label sequence skill/workflow subtitles in both owner presentation and task navigation.

## 2. Publication and producer implementation

- [x] 2.1 Atomically migrate publication/runtime/coordinator/children/profiler/replay fixtures to sole strict v1 and remove active superseded compatibility references.
- [x] 2.2 Add structured permission approval/review DTOs, shared Host-boundary classification, and exact permission action routing.
- [x] 2.3 Add lazy owner-guarded `owner-details` publication, bounded Chat/Skills details read models, and stale-response rejection.
- [x] 2.4 Complete Chat navigation/control/presentation and Skills plan/task/control/presentation projections from their domain SSOTs; restorable remote identity must not imply a live ACP connection.
- [x] 2.5 Restore the dev sequence subtitle contract without deduplicating equal skill and workflow role labels.

## 3. Shared ACP UI restoration

- [x] 3.1 Restore toolbar display/view modes, source-specific banners, bounded selectors, and resident connection/authentication/auto-approve/cancel actions whose availability is represented by disabled state.
- [x] 3.2 Restore transcript presentation, independent plan/count rendering, semantic prioritized hint and permission drawer behavior without chrome rebuilds or raw status leakage.
- [x] 3.3 Restore source-specific composer enablement, selectors, usage gauge, send/interrupt/cancel, per-owner drafts, and bounded history navigation without duplicating panel hint content in the composer footer.
- [x] 3.4 Restore keyed context drawers and bounded lazy details sections/actions while preserving owner-first/page-first and managed-region DOM identity.
- [x] 3.5 Complete `AssistantPanelLabels` and all supported Fluent locales for every restored visible label and ARIA description, including the disabled Chat default-reasoning option.

## 4. Replay, documentation, and verification

- [x] 4.1 Migrate publication harness and replay fixtures to v1 and verify complete Chat/Skills target-active lifecycle, terminal render acceptance, and bounded byte/transcript costs.
- [x] 4.2 Update current-state active specs/docs and confirm no superseded publication reference, panel/full snapshot, raw permission detail, or MCP banner projection remains.
- [x] 4.3 Run focused Node/Zotero tests, lint, build, generated-help drift, and strict OpenSpec validation; document any unavailable external-host replay gate.
- [x] 4.4 Re-run focused subtitle/UI tests, type checking, formatting, diff checks, and strict OpenSpec validation after the sequence subtitle correction.
