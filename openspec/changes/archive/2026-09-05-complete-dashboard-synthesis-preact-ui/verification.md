# UI migration acceptance

The working tree includes the preceding agent's migration and this completion
pass. No commit or release was created. Host action/message semantics and
native production code remain unchanged.

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
