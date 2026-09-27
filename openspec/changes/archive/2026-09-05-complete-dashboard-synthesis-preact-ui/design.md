## Context

Migration baseline is `4fb76b73f3ec9744e905c39e45d0b86ac03b34ed`; implementation is `54b096a2`. The original audit reported Dashboard's 5,143-line IIFE, 1,279-line Backend Manager and 1,155-line Workflow Settings scripts, and Workbench's roughly 16,565-line entry. These are pre-migration audit figures, not current source sizes.

Dashboard's ordinary full rebuild required class-coupled log/trace fast paths and manual scroll restoration. Workbench already separated shell/chrome/surface read models and retained Sigma, but mixed rendering, mutable state and hosted/offline branches in one file. The architectural reference is Assistant Workspace's independent Preact roots, stable signatures, portable contracts and imperative transcript island.

## Goals / Non-Goals

**Goals:** Migrate both complete pages and Dashboard child windows, retain all surfaces/actions/loading/error states, isolate high-frequency updates, preserve interaction identity, bound list DOM, establish typed wire ownership, remove whole-page reverse translation and separate offline entries.

**Non-Goals:** Host protocol or backend business changes, native/Host Bridge work, protocol-level pagination, wildcard-origin hardening, unrelated Workspace changes, new dependencies, CSS-in-JS or wholesale stylesheet reorganization. Host type aliases, label injection and export-resource selection are necessary adaptations.

## Decisions

- Shared wire contracts own concrete portable DTOs and action payload mappings. Reuse package DTOs through shared imports. Host normalization stays in its existing owner; components receive concrete data rather than duplicating boundary decoding.
- Replace handwritten page construction with independently mounted components. Shell, chrome, surface, graph and reader state use their own signatures; graph pages never enter chrome signatures.
- Merge accepted graph pages into current owner state before rendering. Preserve Sigma and camera for matching owner/basis; interaction updates do not rebuild topology. Dispose timers, observers and listeners with their owning region/page.
- Use measured rows, viewport overscan and spacers for Topics/Registry. Keep selection by ID and retain keyboard focus; offscreen rows leave the DOM. Incremental append-to-all is not bounded windowing.
- Keep hosted, graph-only and topic-export entries separate. Export entries import only needed components and shared projection/action logic, never the hosted full renderer. Inject installed graph vendors through props. Keep current external asset names and adjust only topic export's packaged resource selection.
- Localize at render time and use the shared synthesis Markdown profile. Retain bounded content-specific Markdown enrichment, not whole-page reverse translation.
- Port behavior assertions away from old-source extraction. Test actual bootstrap, message delivery, DOM identity and browser interactions; static corpus parity alone is not UI evidence.

## Risks / Trade-offs

- Component migration may lose old actions or local interaction state → exercise all surfaces through the actual assembly before entry replacement.
- Tests include environment and fragile text failures → fix helpers/behavior assertions without weakening stable behaviors.
- Real Zotero availability is environmental → report runtime acceptance separately and never mark unavailable checks passed.

## Migration Plan

Phase A1 shared foundation/contracts/build boundaries → A2 Dashboard components → A3 child windows → A4 regression/governance → A5 Dashboard acceptance; then B1 Workbench contracts/entries → B2 complete surfaces/islands/windowing/i18n → B3 regression/parity → B4 build/export/runtime acceptance. Retire old implementations in the same delivery as the replacements; no dual production renderer or rollout flag.

## Shared Rendering Foundation

`src/shared/regionEquality.ts` owns `safeText`, `stableRegionSignature` and `equalBySignature`; sidebar retains re-exports and panel-specific selectors. `src/shared/preactRegionMount.ts` supplies page-neutral managed children and region markers. Each page retains its own projection and mount factory rather than introducing a generic application framework.

HTML provides `data-role` containers, with page assembly able to adopt/repair the skeleton. Each managed region has its own Preact root and render-ready props. Equality includes only that region's visible data and interaction state. Production and tests share the renderer factory.

## Phase A Architecture: Dashboard and Child Windows

`dashboardApp.ts` owns bootstrap, message application, page-local dispatch and disposal. `dashboardPanelModel.ts` projects snapshots/UI state; `dashboardChromeRenderer.ts` mounts regions.

| Region | Responsibility |
| --- | --- |
| TabBar / Home | Navigation, workflow/summary cards, running tasks and workflow documents |
| WorkflowOptions | Field types, conditional visibility, custom choices, numeric validation and debounced drafts |
| Products | Product/feedback selection, file tree expansion, preview and scrolling |
| Backend | Shared generic HTTP, SkillRunner and ACP task rendering/actions |
| RuntimeLogs | Filters, 300-row bound, stable row identity, selection and scrolling |
| SynthesisSidecar | Trace ranking/filtering, `data-trace-id` reconciliation and stable detail |
| SkillrunnerAudit | Read-only connection metrics/events and copy feedback |
| AcpTraceReplay | Recorder, replay matrix and owned 250 ms update timer |

Backend Manager and Workflow Settings have independent TypeScript entries. The settings dialog uses the same WorkflowOptions form engine as Dashboard. Clipboard/toast helpers are reused. Page close removes listeners, timers and managed trees; late snapshots cannot mutate disposed pages.

Component state preserves drafts, expansion and controls. Small page-owned maps remain where state must survive region unmounts, including per-backend scroll positions. The migration removes the class-coupled global restoration system; it does not eliminate every explicit scroll assignment or move every controller state field into a hook.

## Phase B Architecture: Workbench

The old `src/synthesisWorkbenchApp.ts` becomes a thin hosted bootstrap with graph vendor injection. The controller under `src/synthesis` handles init/snapshot/chrome/surface/graph-page, surface errors, artifact, topic-detail and digest messages. Panel, surface and export projections produce component selections.

Shell/Chrome manage navigation, status, jobs and Sidecar indicators. Home retains insights/sync; Topics retains grid/list/topic relationships; Concepts retains concept views; Registry retains index/canonical revisions/review drawer; Tags retains vocabulary/staged/import; Review Center retains its decision flows; Reader retains eight sections, evidence, reports and digests. Loading/error placeholders remain real UI states, not substitutes for business surfaces.

Nonvisible payloads update their owner cache without repainting unrelated visible content. Stale request IDs/generations cannot replace newer state. Registry and Review Center share pending review state. Graph owns persistent Sigma/camera lifecycle; accepted matching-basis pages merge by row ID, changed owners replace the window, and hover/selection updates avoid topology rebuilds. Chrome updates and tab visibility changes retain the graph container.

Topics/Registry use measured viewport windows, overscan and spacers. Offscreen rows leave the DOM, selection uses business IDs, and focused-row retention does not accumulate every visited row. Filtering covers the supplied collection; host pagination remains unchanged.

## Contracts, Localization and Styles

Shared wire contracts own snapshots, actions and envelopes. Host product/settings/trace types alias the shared portable definitions; privileged state and normalization remain host-owned. Workbench reuses existing package DTOs through shared imports. Typed transport uses the action/payload mapping.

The original plan's instruction to eliminate weak page records means concrete DTOs for known shapes. Open workflow parameters, command arguments, metadata, diagnostics and defensive boundary decoding still require unknown/JSON records; zero textual occurrences of `Record<string, unknown>` is not claimed.

Dashboard consumes injected labels; Workbench resolves message keys in projection/rendering. Whole-page `localizeWorkbenchDom` and reverse text matching are retired. Markdown uses the existing shared synthesis sanitize profile and timeline remains a bounded imperative island. Existing CSS/theme/icons/vendor assets are retained. New English/Chinese labels and other-language fallbacks are documented in verification.

## Build and Entry Ownership

| Entry | Consumer |
| --- | --- |
| `src/dashboard/dashboardApp.ts` | Existing built `dashboard/app.js` |
| `src/dashboard/backendManagerApp.ts` | Existing Backend Manager script path |
| `src/dashboard/workflowSettingsDialogApp.ts` | Existing Workflow Settings script path |
| `src/synthesisWorkbenchApp.ts` | Existing hosted `synthesis/app.bundle.js` |
| `src/synthesis/standaloneTopicApp.ts` | Packaged `synthesis/topic-export.bundle.js` |
| `src/synthesis/standaloneGraphApp.ts` | Deep-reading `citation-graph-synthesis-app.js` templates |

esbuild uses automatic JSX/Preact; dedicated tsconfigs and ESLint boundaries keep privileged modules out of page bundles. Harness uses the migrated entries. Offline entries import only needed graph/reader modules and local interaction code, set their own layout classes, and do not import the full hosted renderer. Source/built-in graph templates are synchronized.

## Specification Ownership

`task-runtime-ui` and `synthesis-workbench-ui` own the migration's page architecture. Existing requirements in three other capabilities need narrow alignment: `synthesis-tab-ui` distinguishes hosted tab entry and localization from standalone topic boot and embedded messages; `synthesis-workbench-surface-refresh` describes Index updates within a persistent container; `synthesis-workbench` describes standalone graph host isolation without a retired initialization option. Their existing offline interaction, host isolation and scoped-refresh scenarios remain in force.

Other related capabilities retain their business and data contracts. Shared form implementation, region signatures and entry paths are not duplicated into Backend Manager, workflow settings, logging or client specifications. The requirement-level impact assessment and supporting implementation/test locations are recorded in `verification.md`.

## Regression and Acceptance Evidence

Reuse `sidebarDomEnv`, host tests and package tests. Cover equivalent-snapshot identity, focus/scroll retention, bootstrap messages, disposal, camera/hover/paging, distant list scrolling and standalone browser behavior. Migrate assertions tied to deleted page functions; preserve meaningful host-specific assertions. Parity checks are supplementary and do not replace UI evidence.

Build/type checks, localization, lint, relevant Node/browser suites, seven parity checks and diagnostic elision are recorded in `verification.md`. Full-core failures and targeted reruns are reported separately. Zotero Dashboard dialog/embedded-tab, Workbench and offline/skill smoke are distinct evidence. Missing runtimes/fixtures cannot count as passes; archive status does not imply all original acceptance gates passed.
