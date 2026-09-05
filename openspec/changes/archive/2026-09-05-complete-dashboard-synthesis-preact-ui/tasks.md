# Complete Migration Work Breakdown

Baseline: `4fb76b73` → `54b096a2`. Checked implementation tasks describe delivered work. Checked verification tasks mean checks were run and outcomes recorded, not that every acceptance gate passed. Runtime and repository-wide exceptions remain explicit below and in `verification.md`.

## A1. Dashboard foundation

- [x] A1.1 Extract shared region equality primitives; preserve sidebar re-exports and selectors.
- [x] A1.2 Add page-neutral managed-region mount helpers based on Assistant Workspace.
- [x] A1.3 Extract Dashboard snapshot/action/envelope DTOs and concrete product/settings/trace shapes; adapt host aliases.
- [x] A1.4 Switch Dashboard to a TypeScript/Preact esbuild entry with unchanged output path; add page tsconfig/import boundaries.

## A2. Dashboard page components

- [x] A2.1 Implement static skeleton, bootstrap/controller, panel projection and production/test renderer factory.
- [x] A2.2 Implement TabBar and Home workflow/summary/running-task/document views.
- [x] A2.3 Implement shared WorkflowOptions fields, conditional visibility, validation and debounced drafts.
- [x] A2.4 Implement Products/feedback/tree/preview interactions and shared backend task rendering.
- [x] A2.5 Preserve bounded runtime-log rows, filters, selection, identity and scrolling.
- [x] A2.6 Preserve Sidecar trace reconciliation, stable detail, filtering and copy feedback.
- [x] A2.7 Implement SkillRunner audit and ACP recorder/replay with owned timer cleanup.
- [x] A2.8 Reuse clipboard/toast helpers, inject visible labels and replace global restoration with component/page-owned state.

## A3. Dashboard child windows

- [x] A3.1 Migrate Backend Manager to typed Preact with matching HTML/build entry.
- [x] A3.2 Migrate Workflow Settings to typed Preact using the same form engine as Dashboard.
- [x] A3.3 Share child-window envelopes and dispose listeners/timers/trees on close.

## A4. Dashboard regression and governance

- [x] A4.1 Reuse jsdom helpers; test regions, bootstrap, equivalent-snapshot identity and disposal.
- [x] A4.2 Exercise host routing, Products scrolling/expansion and Sidecar browser behavior; migrate deleted-page source assertions.
- [x] A4.3 Update localization watchlists and diagnostic release-elision for the new sources.

## A5. Dashboard delivery and acceptance

- [x] A5.1 Retire three handwritten scripts and build the replacements at existing packaged paths.
- [x] A5.2 Run Dashboard/host type checks, component/host/browser suites, localization and lint; record actual results.
- [x] A5.3 Record Zotero dialog/embedded-tab smoke availability; retain unavailable runtime acceptance as unverified.

## B1. Workbench foundation and entry boundaries

- [x] B1.1 Extract shared snapshot/surface/message DTOs and typed action transport; adapt host type references.
- [x] B1.2 Add page TypeScript/import boundaries and Preact build configuration; reduce the old entry to hosted bootstrap.
- [x] B1.3 Separate graph/topic export entries and select their packaged/deep-reading resources without importing the full hosted renderer.

## B2. Complete Workbench page migration

- [x] B2.1 Implement static containers, controller, panel/surface projections and independent memoized roots.
- [x] B2.2 Implement Shell/Chrome and Home, Topics, Concepts, Graph, Registry, Tags, Review Center and Reader with existing actions/loading/error states.
- [x] B2.3 Preserve persistent Sigma/camera/hover/selection, graph-page accumulation and stale-owner/generation rejection.
- [x] B2.4 Preserve canonical/review pending state, Reader sections/evidence/digests and shared Markdown/timeline islands.
- [x] B2.5 Implement measured bounded Topics/Registry windows with ID selection and focused-row retention.
- [x] B2.6 Resolve i18n at projection/render time; retire whole-DOM reverse translation and page-local sanitizer.
- [x] B2.7 Own resources and remaining local state at component/page boundaries; retire full-page state restoration.
- [x] B2.8 Retire the old monolith and connect hosted/Harness/offline composition with independent export layout/navigation.

## B3. Workbench regression and parity

- [x] B3.1 Test bootstrap/navigation, equivalent-snapshot isolation, graph identity/generation/paging and distant list scrolling.
- [x] B3.2 Migrate deleted-page source assertions to behavior tests while retaining relevant host/package regression coverage.
- [x] B3.3 Run seven surface parity checks without relaxed semantics and verify diagnostic release elision.
- [x] B3.4 Exercise standalone reports/graph/navigation and embedded WebGL; fix and rerun export-root layout regression.

## B4. Full migration delivery and acceptance

- [x] B4.1 Build all page/host targets and regenerate/synchronize graph JS/CSS/i18n template copies.
- [x] B4.2 Execute full core, targeted regressions, lint and localization; record initial failures, reruns and external prerequisites.
- [x] B4.3 Record Workbench/runtime and DETR fixture availability; preserve unavailable checks as unverified acceptance.
- [x] B4.4 Document source ownership, protocol constraints, rendering stability, build composition and migration risks; validate OpenSpec artifacts.

## Retrospective documentation correction (2026-09-05)

These tasks concern the archived documentation only; they do not represent new implementation or runtime acceptance.

- [x] D1 Audit related specifications and record changed versus unchanged contracts with implementation/test references in verification.md.
- [x] D2 Preserve the complete A1–A5/B1–B4 migration description and align proposal/design with five affected capabilities.
- [x] D3 Add complete modified-requirement deltas for hosted/offline boot and localization, standalone graph host isolation and scoped Index rendering, preserving all existing scenarios.
- [x] D4 Manually synchronize all five capability deltas to main specs without reopening or re-archiving the change.
- [x] D5 Validate five main specs and the archived change; check scenario preservation, delta consistency, artifact scope, formatting and whitespace; record fresh results separately from historical tests.

## Outstanding runtime acceptance conditions

Zotero Dashboard dialog/embedded tab and Workbench smoke have no recorded runtime pass. DETR desktop/mobile fixture checks remain pending. Full core and repository-wide formatting are not green for the reasons in `verification.md`. Archive status and checked evidence-recording tasks do not waive these original acceptance conditions.
