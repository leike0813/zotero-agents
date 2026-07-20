## 1. Foundation

- [x] 1.1 Add `preact` (dependencies) and `jsdom` + `@types/jsdom` (devDependencies); defer `@preact/signals` until a concrete consumer exists.
- [x] 1.2 Add `jsx: "automatic"` / `jsxImportSource: "preact"` to the three sidebar esbuild entries in `zotero-plugin.config.ts`.
- [x] 1.3 Add `tsconfig.sidebar.json` (DOM-lib program for `src/sidebar/**/*.tsx` + `src/shared/**/*.ts`), exclude `.tsx` from the root `tsconfig.json`, and wire the second `tsc --noEmit` into `npm run build`.
- [x] 1.4 Extend the ESLint sidebar boundary to `*.{js,tsx}` with the Preact-only import whitelist; split the base `no-unused-vars` rule off `.tsx`.
- [x] 1.5 Add `test/helpers/sidebarDomEnv.ts` (JSDOM installer + subtree helpers over real childNodes) and migrate `test/core/97` off the inline FakeDocument with zero assertion weakening; green before any component work.

## 2. Chrome Region Migrations (each: component test first → component → child takeover → 97 green → delete the region's `exact` branch)

- [x] 2.1 message-counts (`renderAssistantMessageCounts`).
- [x] 2.2 toolbar (`renderToolbar`).
- [x] 2.3 banner (`renderAssistantBanner`).
- [x] 2.4 plan (`renderAssistantPlan`).
- [x] 2.5 hint / interaction (`renderAssistantHint`).
- [x] 2.6 composer / reply (`renderAssistantReply` + live fields + draft ref bridge + runtime options).
- [x] 2.7 permission drawer (`renderPermissionRequestDrawer`, open as prop).
- [x] 2.8 details drawer (`renderDetailsDrawer`).
- [x] 2.9 context drawer (workspace task drawer; three-level keyed reconcile → keyed lists).

## 3. Transcript Wrapper And Static Chrome

- [x] 3.1 `<TranscriptRegion>` wrapper: container ownership, full render + loading/empty/failed as props, incremental effects stay imperative on the container ref.
- [x] 3.2 Absorb view-mode buttons, conversation overlay menu, and empty/main containers into the component tree; remove the child's querySelector reach-ins.

## 4. Final Sweep And Documentation

- [x] 4.1 Simplify the child render callback to pure component rendering; delete the renderer's `exact` dispatch and all dead `exact` branches; extract shared region equality functions to TypeScript.
- [x] 4.2 Refresh `doc/components/` pages that describe the signature-guard implementation.
- [x] 4.3 Evaluate `@preact/signals`; install only if a concrete consumer landed, otherwise record the decision in `design.md`.

## 5. Verification

- [x] 5.1 `openspec validate 2026-07-20-assistant-workspace-framework-foundation --strict`.
- [x] 5.2 `npm run build` (help-docs + scaffold + both `tsc --noEmit` programs).
- [x] 5.3 Focused suites green: 97 / 184 / 190 / 191 + new chrome component tests (192) + SkillRunner-adjacent 71/84 (167 passing), plus `npm run test:node:core`.
- [x] 5.4 `npm run lint:check`, `npm run check:localization-governance`, `npm run check:help-docs`, `npm run check:ssot-invariants`.
- [x] 5.5 `npm run test:lite` Zotero mock harness smoke (41 passed; three page bundles load in host with Preact inside); manual Zotero 7/9 smoke recorded as a manual item.
