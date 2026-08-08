## Why

Phase 2 of the Assistant Workspace refactor
(`artifact/assistant-workspace-refactor-plan-20260718.md`). The ACP child
page renders its chrome regions with four layers of hand-rolled diffing
(region signature attributes, drawer row/group/section keyed reconcile,
reply live-field patching, transcript virtualization). Phase 0 locked the
observable region-isolation behavior in subtree node-identity tests; Phase
1 single-sourced the wire contract and brought the sidebar scripts into
the esbuild/TS pipeline. This change replaces the hand-written guards with
a component framework while keeping the publication plane (coordinator,
signatures, ACK/rebase) and the wire protocol unchanged.

## What Changes

- Adopt Preact as a runtime dependency, bundled into the sidebar page
  bundles by the existing esbuild pipeline (`jsx: "automatic"`,
  `jsxImportSource: "preact"`); no new HTML script tags. Add jsdom as a
  test-only devDependency because the inline FakeDocument shim in
  `test/core/97` cannot host Preact.
- Migrate the non-transcript chrome regions of the ACP child page
  (toolbar, banner, message-counts, plan, hint, composer, context drawer,
  details drawer, permission drawer) to Preact components under
  `src/sidebar/components/*.tsx`, one region at a time. Each region keeps
  its existing DOM mount and CSS contract; props-level memoization reuses
  the field selections of today's signature functions as the equality
  boundary, and each migrated region deletes its ACP-only (`exact`)
  imperative render branch.
- Keep the transcript renderer imperative behind a component wrapper;
  only its mount/props boundary is componentized. Child reach-ins (reply
  draft capture, transcript loading/empty placeholder, view-mode
  controls) become props/ref bridges.
- Add `tsconfig.sidebar.json`: a DOM-lib typecheck program covering the
  `.tsx` components and `src/shared/`, because the root sandbox program
  is deliberately DOM-free and Preact's types reference lib DOM. The
  root program is unchanged and excludes `src/sidebar/**/*.tsx`.
- Extend the ESLint sidebar boundary to `.tsx` with a narrow Preact
  import whitelist (`preact`, `preact/hooks`, `preact/compat`,
  `@preact/signals`).
- Migrate `test/core/97` from the inline FakeDocument shim to jsdom via a
  new shared `test/helpers/sidebarDomEnv.ts`; every locked
  subtree-identity assertion keeps its element-wise by-reference
  semantics.
- The SkillRunner run-dialog path (`runDialog.js`, shared imperative
  renderer branches and guard primitives) is untouched; it converges in
  Phase 3.

## Capabilities

### New Capabilities

- `assistant-workspace-chrome-components`: ACP child chrome regions are
  Preact components with props equality boundaries; rendering is
  synchronous and failure-safe; the transcript renderer stays imperative
  behind a component wrapper.

### Modified Capabilities

- `assistant-sidebar-build-pipeline`: Sidebar bundles may contain Preact
  chrome components written as `.tsx` and compiled with the Preact JSX
  automatic runtime; the import boundary admits the Preact entry points
  and nothing else; component sources type-check under a dedicated
  DOM-lib program.
- `assistant-workspace-ui-refresh-governance`: The child-side region
  isolation mechanism is component props memoization instead of
  hand-written signature-attribute guards; every behavioral invariant
  (subtree node identity, transcript/loading/counts-only isolation,
  commit-after-success, failure retry) is preserved.

## Impact

Affected areas: `package.json` (+preact, +jsdom/@types/jsdom),
`zotero-plugin.config.ts` (jsx options on the three sidebar entries),
`tsconfig.json` (exclude `.tsx`), new `tsconfig.sidebar.json`,
`eslint.config.mjs` (boundary extension), new
`src/sidebar/components/*.tsx`, `src/sidebar/assistantWorkspaceAcpChild.js`
(render callback takeover), `src/sidebar/assistantPanelRenderer.js`
(per-region `exact` branch deletion), `test/core/97-acp-ui-smoke.test.ts`
(jsdom migration), new `test/helpers/sidebarDomEnv.ts`, new chrome
component tests, and `doc/components/` refresh. No wire-protocol,
persistence, or SkillRunner behavior changes.
