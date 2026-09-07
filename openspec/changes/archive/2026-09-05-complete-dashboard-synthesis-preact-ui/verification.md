# UI migration acceptance

This report covers the complete migration delivered by `54b096a2`, relative to
`4fb76b73f3ec9744e905c39e45d0b86ac03b34ed`: 171 changed files, 55,706 insertions
and 27,675 deletions, including generated assets and tests. Host action/message
semantics and native production code remain unchanged.

The results below were recorded during migration implementation and its final
verification. They are historical evidence, not fresh executions from this
documentation rewrite. The archive identifier is retained; proposal, design and
tasks now cover Phase A1–A5 and B1–B4 from the original migration plan.

## Original plan coverage

| Phase | Delivery and evidence |
| --- | --- |
| A1 | Shared signatures/mounts/wire contracts, sidebar re-exports, Dashboard build/type/import boundaries |
| A2 | All Dashboard regions, shared backend/form helpers, bounded logs/trace and local lifecycle ownership |
| A3 | Backend Manager and Workflow Settings Preact entries at existing resource paths |
| A4 | Tests241–251, host/browser regression, localization watchlists and diagnostics elision |
| A5 | Build/type/localization and relevant regression passed; full lint and Zotero smoke have documented exceptions |
| B1 | Shared Workbench contracts, thin hosted bootstrap, separate topic/graph export composition |
| B2 | Complete surfaces/projections, persistent graph, Reader/Markdown, render-time i18n and measured windows |
| B3 | Tests252–260, migrated page assertions, graph/browser identity and seven parity checks |
| B4 | Built entries and synchronized templates; full-core/fixture/runtime exceptions remain below |

Known differences from literal plan wording: the hosted entry bootstraps rather
than only re-exporting; graph-only output belongs to the deep-reading builder;
open JSON/unknown boundary fields and defensive narrowers remain; controller
and components share state by ownership; meaningful host source-extraction
assertions remain. None of those is evidence that every weak type, imperative
operation or source-based test was eliminated.

## Documentation revision scope

The full-migration proposal, design, tasks and expanded delta specifications are
a retrospective correction to this archive. With explicit user authorization,
the expanded delta requirements were manually merged into the existing
`task-runtime-ui` and `synthesis-workbench-ui` main specs: six requirements added
to each, with the previously synchronized requirements and all existing
scenarios preserved. The follow-up specification audit also aligns one existing
requirement in `synthesis-workbench` (standalone graph host isolation), three in
`synthesis-tab-ui` (hosted/offline boot and localization), and one in
`synthesis-workbench-surface-refresh` (update within the existing Index container).
Their complete modified-requirement deltas preserve every existing scenario,
including all three offline-export scenarios and both scoped-refresh scenarios. This simulates main-spec synchronization without reopening
or re-archiving the change. No implementation checks were rerun and no commit or
Git history rewrite was performed for this documentation edit.

## Specification impact audit

Audit reference: implementation `54b096a2` against parent
`4fb76b73f3ec9744e905c39e45d0b86ac03b34ed`. Specification names below resolve to
`openspec/specs/<name>/spec.md`; implementation and test paths are repository
relative at that implementation commit. Requirement names identify stable
semantic locations; line ranges are only supplementary. This is a documentation
impact assessment, not a new execution of the cited regression suites or a claim
that every specification in the repository was exhaustively reviewed.

### Changed and manually synchronized

| Specification | Requirement scope and decision | Implementation / evidence location |
| --- | --- | --- |
| `task-runtime-ui` | Existing refresh-state requirement plus six migration requirements: typed entries, region isolation, portable contracts, shared forms/backend presentation, bounded rows/lifecycle and render-time labels. Retain the completed full-migration delta. | `src/dashboard/`, `src/shared/dashboardWireContract.ts`; tests241–251 |
| `synthesis-workbench-ui` | Existing interaction/windowing/offline requirements plus six migration requirements. Retain architecture ownership here. | `src/synthesis/`, `src/shared/synthesisWorkbenchWireContract.ts`; tests252–260 |
| `synthesis-tab-ui` | Hosted entry, host-provided localization and standalone export requirements: distinguish Zotero tab boot/host messages from independent export boot/embedded messages; retain all existing interactions. | `src/synthesis/standaloneTopicApp.ts`, `zotero-plugin.config.ts`; `test/ui/157-literature-deep-reading-detr-visual` |
| `synthesis-workbench-surface-refresh` | `Surface refresh is scoped to one area`: update Index content inside its existing container; retain unrelated-surface isolation and chrome-only behavior. | `src/synthesis/synthesisWorkbenchChromeRenderer.ts`; `test/core/125-synthesis-tab-ui`, tests252–260 |

The follow-up Synthesis audit also found the literal `readonly: true` initializer
in `synthesis-workbench`; its modified delta now describes standalone graph mode
and retains local selection detail and Host-action isolation. This expands the
initial four-capability plan to five based on a confirmed obsolete option.

The `synthesis-workbench` modification affects only `Citation graph visual rules SHALL be reusable`; its implementation references are `src/synthesis/standaloneGraphApp.ts` and the shared Graph component. DB-first snapshot and operational chrome requirements remain untouched.

### Related contracts retained without edits

These specifications already constrain the required behavior. Copying page
entry paths, Preact roots or signature implementation into them would duplicate
the two UI architecture specifications rather than repair a contract.

| Specification | Reviewed requirement or scenario scope; reason to retain | Implementation / regression reference |
| --- | --- | --- |
| `backend-manager-ui` | Managed profile isolation, ACP/HTTP presets and SkillRunner management through Dashboard; routing and save behavior remain unchanged. | `src/dashboard/backendManagerApp.ts`, Backend Manager components; Dashboard regression |
| `workflow-settings-dialog-model` | Field descriptors, Host options, preview and layout separation; the new renderer consumes the existing model. | Workflow Settings component; settings host/model regression |
| `workflow-settings-dialog-model-split` | Dedicated render model, centralized serialization and active-control preservation; shared form implementation conforms to these rules. | `src/dashboard/components/WorkflowSettingsDialogRegion.tsx`, `WorkflowOptionsRegion.tsx`; settings regression |
| `workflow-settings-single-source-submit-flow` | Submit gate, debounced Dashboard editing, immutable submit snapshot and preview; no submission semantics change. | Same shared form components; `test/core/49-workflow-settings-domain` |
| `workflow-settings-per-workflow-page` | Per-workflow page and Preferences/Dashboard entry routing; no route change. | Dashboard host routing regression |
| `workflow-product-storage` | Product/feedback display, filtering/export and persistence; UI migration does not change storage ownership. | Products region; `test/core/135-workflow-product-storage` |
| `runtime-log-pipeline` | Filtering, detail, bounded summary reads and persistence budgets; page windowing does not change log data contracts. | RuntimeLogs region; log/host regression |
| `log-viewer-window` | Dashboard runtime-log entry, filtering, refresh and diagnostic export; existing user behavior remains authoritative. | RuntimeLogs region; Dashboard log regression |
| `synthesis-sidecar-debug-observability` | Actionable correlated detail, copy feedback, bounded causal traces and production elision; existing requirements already cover the migrated region. | `test/core/246-dashboard-synthesis-sidecar`, release-elision script |
| `debug-diagnostics-production-isolation` | Real plugin/Dashboard artifact checks and disabled-source zero output; contract is independent of the old script location. | `scripts/check-runtime-diagnostics-release-elision.ts`; `test/node/core/97-runtime-diagnostics-release-elision` |
| `markdown-rendering` | `Shared Markdown Rendering Core` already includes Dashboard README/Synthesis documents and unsafe HTML removal. | Shared Markdown renderer and Reader region; offline reader regression |
| `plugin-localization-governance` | Workbench, Dashboard-family and standalone labels, locale parity and raw runtime content; source-directory scanning implements the existing coverage obligation. | `scripts/check-localization-governance.ts` scans `src/dashboard` and `src/synthesis` |
| `plugin-ui-rendering-stability` | Live interaction state and persistent WebGL resource identity already cover chrome, tab switching, topology and resize behavior. | Graph region; `test/core/ui-render-stability-contract` |
| `assistant-workspace-chrome-components` | Region props equality and imperative transcript ownership remain unchanged after helper extraction. | `src/shared/regionEquality.ts`, sidebar re-exports and existing component regression |
| `assistant-sidebar-build-pipeline` | Sidebar esbuild, DOM typing and pure import boundaries remain sidebar-owned; extending their scope to other pages is unnecessary. | `zotero-plugin.config.ts`, `tsconfig.sidebar.json`, `eslint.config.mjs` |
| `zotero-skills-visual-theme` | Shared theme, token aliases, icons and cross-surface alignment remain in force. | Existing page CSS and `addon/content/shared/` assets |
| `ui-readonly-harness` | Original UI reuse, mocked writes, localization and surface protocol remain applicable; hosted Workbench still builds through its thin wrapper. No new fresh-worktree Dashboard load pass is claimed by this audit. | `scripts/ui-harness-serve.ts`, `test/ui/156-ui-readonly-harness` |
| `synthesis-workbench-ui-client-consumer` | Client-owned reads/conversion and stale-read/region identity remain host/client contracts; portable page DTO extraction does not move those owners. | `src/modules/synthesisWorkbenchTab.ts`, `src/modules/synthesis/uiModel.ts`; host test125 |
| `synthesis-sidecar-workbench-chrome-read-model` | Bounded operational DTOs, authenticated canary and control-plane ownership are outside the page migration. | Existing sidecar/client contract; no new runtime validation in this audit |

Build ownership was checked separately: Dashboard and both child windows use
their typed entries; the hosted Workbench keeps its thin wrapper; the independent
graph entry is built by `scripts/build-literature-deep-reading-graph-renderer.ts`
into the existing template asset. It need not also be an addon entry in the
plugin build configuration. Remaining source extraction in host test125 targets
host/UI-model semantics, not deleted page renderer functions. Browser test157
exercises built hosted/offline code. These observations do not substitute for
the runtime acceptance still listed below.

### Fresh documentation checks

Executed for the documentation revision on 2026-09-05:

| Check | Result |
| --- | --- |
| `openspec validate archive/2026-09-05-complete-dashboard-synthesis-preact-ui --type change --strict --no-interactive` | Passed using the existing archive path. The active-change short name does not resolve archived deltas and initially reported no deltas; no archive operation was run. |
| `openspec validate <capability> --type spec --strict --no-interactive`, for each of the five changed capabilities | Passed. The two newly aligned main specs initially had placeholder Purpose warnings; their Purpose text now describes the existing capability. The existing Workbench long-requirement informational note remains. |
| Delta/main requirement comparison and prior scenario comparison against `HEAD` | Passed: all five deltas match their main requirements, no duplicate requirements or main-spec delta headers, and no prior requirements/scenarios removed. Scenario bodies in the three newly aligned specs differ only in the approved hosted/offline boot, localization, graph-mode and container wording. |
| Proposal capability list versus delta directories | Passed: exactly five matching capabilities. Design, tasks and this report describe the same scope. |
| Scoped `node_modules/.bin/prettier --check` over the nine archive Markdown files and five main specs | Passed. |
| `git diff --check` and `git diff --cached --check` | Passed. Existing staged changes were preserved; this revision does not stage or commit files. |

Purpose corrections are main-spec documentation repairs, not additional delta
requirements. No build, component/browser test, native test or Zotero smoke was
rerun for this documentation-only revision. Historical evidence and outstanding
runtime acceptance below remain unchanged.

## Implementation evidence

- Dashboard and both management dialogs build from `src/dashboard`; page-owned
  timers/listeners and product/feedback scroll ownership are disposed locally.
- Dashboard snapshot fields use concrete shared DTOs. Product, workflow-settings
  and Sidecar trace host types reuse the same portable definitions through
  type-only aliases. Synthesis transport senders use the shared action/payload
  mapping; arbitrary business JSON remains confined to its declared fields.
- Hosted Synthesis uses real surface projections and independent Preact roots.
  Graph remains mounted across tab changes, with vendor injection and isolated
  camera/interaction updates. Reader uses the shared synthesis Markdown profile.
- Topics and Registry use measured viewport windows. Tests exercise 800 Registry
  rows with a mounted-row ceiling of 32 and preserve the focused row identity.
- Standalone graph/topic entries build independently. Browser tests open the
  topic entry, read a Markdown report, switch into Graph, and return to Overview.
- Independent entries set their own root layout classes. A browser regression
  proves the topic reader occupies the available width; the complete deep-reading
  HTML test also checks the embedded graph viewport. Generated JS, CSS and i18n
  templates are synchronized between `skills_src` and `skills_builtin`.
- Graph and Registry detail labels resolve message keys at render time. English,
  Simplified Chinese and Traditional Chinese additions are supplied; other locale
  files currently use English for these newly extracted labels.
- Architecture ownership is documented in `doc/synthesis-layer/workbench-ui.md`,
  `doc/components/task-manager-dialog.md`, `doc/ui-rendering-stability-contract.md`
  and project `AGENTS.md`.

## Checks

| Check | Result |
| --- | --- |
| `npm run build` | Passed: package build and host/sidebar/dashboard/synthesis TypeScript checks |
| `eslint .` | Passed after correcting the page sibling import boundary |
| `npm run lint:check` | Not green: repository-wide Prettier reports 16 existing files outside this migration; changed UI files pass their scoped check |
| `npm run check:localization-governance` | Passed; scans the actual page directories |
| Seven `check:synthesis-*-surface-parity` scripts | Passed, no parity semantics relaxed |
| `npm run check:runtime-diagnostics-release-elision` | Passed; disabled diagnostic modules retain zero bytes |
| Dashboard components, host routes, logs and product/trace browser regression | 207 passed |
| Synthesis components, host test125, render stability, diagnostics and Harness/browser regression | 236 passed; 2 DETR fixture tests pending |
| Final shared-contract regression: Dashboard components, Workbench scaffold and Dashboard host tests60/62/64 | 155 passed |
| Final typed Synthesis sender, Graph/Reader and browser regression | 58 passed; 2 DETR fixture tests pending |
| Product storage, workflow settings and Sidecar regression after shared type extraction | 53 passed |
| Complete deep-reading HTML generation and embedded graph browser check | 1 passed after fixing independent-entry layout |
| `openspec validate complete-dashboard-synthesis-preact-ui --strict` | Passed |

`npm run test:node:core` completed with 3435 passing, 66 pending and 31 failing.
The run identified an independent export layout regression and overlapped the
graph-page accumulation test update. Both UI cases passed targeted reruns after
the fixes; the complete Synthesis regression above also passed.
The other 29 failures comprise 28 native production-route checks without a built
sidecar executable and one stale exact fingerprint assertion in test218.
The fingerprint mismatch reproduces independently; its registry/schema/corpus
inputs and expected fingerprint were not changed by this UI work.

## Unverified acceptance

- Full core is not green: native production-route prerequisites and the existing
  fingerprint assertion remain outside this page migration.
- Repository-wide Prettier also reports existing unrelated Harness, Host Bridge,
  workflow and broker files. Modified UI sources are checked separately.
- No running Zotero process was available. Dashboard dialog/workspace-tab and
  Workbench smoke checks inside Zotero remain unverified.
- The DETR sample HTML fixture is absent, so its desktop/mobile visual checks
  remain pending. The fixture-independent WebGL and offline-export tests ran.

## Reproduction

All Mocha commands use the installed `tsx` and
`--require test/setup/zotero-mock.ts --timeout 90000 --exit`.

- Dashboard: `test/core/241` through `251`, host tests `57`, `77`, `78`, `79`,
  `95`, and UI tests `46`, `49`, `50`, `157-synthesis-sidecar-dashboard`.
- Synthesis: `test/core/252` through `260`, `125-synthesis-tab-ui`,
  `ui-render-stability-contract`, `test/node/core/97-runtime-diagnostics-release-elision`,
  `test/ui/156-ui-readonly-harness`, and
  `test/ui/157-literature-deep-reading-detr-visual`.
- Complete export: `test/core/157-literature-deep-reading-bootstrap.test.ts`
  with `--grep 'submits final review and renders a self-contained'`.
- Final contract pass: Dashboard tests `241` through `251`, Workbench `252`,
  and Dashboard host tests `60`, `62`, `64`; final Synthesis boundary pass:
  `252`, `256`, `260`, and browser test `157-literature-deep-reading-detr-visual`.
- Shared type extraction: `test/core/135-workflow-product-storage`,
  `49-workflow-settings-domain`, and `246-dashboard-synthesis-sidecar`.
- Assets: `tsx scripts/build-literature-deep-reading-graph-renderer.ts`, followed
  by synchronizing its changed templates into the built-in copy. The skill
  materializer's default whole-directory replacement is unnecessary for this UI
  change.
