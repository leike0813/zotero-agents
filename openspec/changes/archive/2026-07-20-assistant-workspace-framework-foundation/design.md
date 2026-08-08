# Design: Assistant Workspace Framework Foundation

## Context

Phase 2 of the refactor plan, executed on the long-lived
`dev-assistant-ui` branch after Phase 0/1 landed on `main`. The ACP child
page (`src/sidebar/assistantWorkspaceAcpChild.js`) renders chrome through
`renderAssistantPanelSnapshot` (`src/sidebar/assistantPanelRenderer.js`),
which dispatches nine managed regions through attribute-based signature
guards (`renderManagedRegionIfChanged`). The ACP surfaces consume an
`exact` panel projection (`assistantPanelModel.js`, `exact: true`) that is
already the natural props source for components; the SkillRunner
run-dialog consumes the same renderer through the non-exact normalizer
path, so shared imperative code must survive this phase.

Two constraints shape every decision below:

- Rendering is speculative: the child's controller renders against a
  staged snapshot and commits only on success, acknowledging
  render-failed otherwise. Component rendering must stay synchronous and
  props-driven.
- Phase 0 tests lock region isolation as element-wise subtree node
  identity. Equal region input must produce zero DOM mutations in that
  region's subtree.

## Decisions

### D1. Preact via npm, bundled by esbuild

`preact` is a runtime dependency; esbuild bundles it into the existing
page bundles (`jsx: "automatic"`, `jsxImportSource: "preact"`). No new
script tags; vendor libraries (katex/markdown-it/texmath) stay static
ahead of the bundle. jsdom is a test-only devDependency and never
enters the plugin artifact. `@preact/signals` was evaluated at the end of
the phase and deliberately not installed: every chrome region updates
through owner-scoped publications (props memoization absorbs them), the
composer's local state (reply history, switch pending markers) is handled
by module stores and imperative attribute mirrors, and the streaming
transcript path stays imperative — no region needed fine-grained
signal subscriptions.

### D2. Components as `.tsx`, self-contained, typed under a DOM-lib program

New components live in `src/sidebar/components/*.tsx` and import only
Preact entry points, `src/shared/**`, and each other. They never import
the legacy `.js` modules; the view-model arrives as props from the child
(`.js` → `.tsx` imports are resolved by esbuild/tsx, not tsc).

`allowJs` on the root program was tried and rejected: it drags every
legacy `.js` into the program and collides with the sandbox lib (the root
config is deliberately DOM-free, and Preact's types pull in
`/// <reference lib="dom" />`). Instead, `tsconfig.sidebar.json` extends
the sandbox base with `lib: ["ESNext", "DOM", "DOM.Iterable"]` and covers
only `src/sidebar/**/*.ts(x)` + `src/shared/**/*.ts` — the type environment
now matches the browser runtime environment of these files. The root
program excludes `src/sidebar/components` (and any
`src/sidebar/**/*.tsx`) and is otherwise unchanged;
`npm run build` runs both `tsc --noEmit` programs.

The root `tsconfig.json` cannot carry the `jsx` options either:
`jsxImportSource: "preact"` resolves Preact's types even with no `.tsx`
in the program and re-imports the DOM lib. Every `.tsx` component
therefore opens with the esbuild pragmas `/** @jsxRuntime automatic */`
and `/** @jsxImportSource preact */` so the production build (esbuild
options), the sidebar tsc program, and tsx test runs all pick the Preact
automatic runtime deterministically.

### D3. Per-region Preact roots on the existing mounts

Each region migration replaces its `renderManagedRegionIfChanged` call
with `render(h(RegionX, regionProps), mount)`, reusing the existing
`managedMount` primitive so the DOM structure and CSS contract are
byte-identical. Unmigrated regions keep their old guards. A single-root
design with imperative wrappers was rejected: effect-based rendering
escapes the controller's synchronous try/catch and would break the
speculative render / render-failed ACK semantics.

### D4. Memo equality reuses the signature field selections

`memo(RegionX, areEqual)` equality compares exactly the fields today's
region signature functions select (user-visible content + open/collapsed
state). The pure signature/equality functions are extracted into a
TypeScript module shared by the old renderer (until its `exact` branch
dies) and the new components, so the boundary cannot drift during
migration. Equal props → memo skip → zero subtree DOM ops, which is
exactly what the Phase 0 tests assert.

### D5. Region-specific handling

- Composer: Preact reuses the `<textarea>` node across diffs, preserving
  focus/selection naturally; the structure/live-field split becomes memo
  plus in-component updates; the child's `captureReplyDraft` querySelector
  becomes a ref/callback bridge.
- Context/details drawer open state stays a child-side container class
  toggle (it is outside the signature today); permission drawer open is
  inside its signature and becomes a component prop.
- The context drawer's three-level keyed reconcile becomes keyed lists
  (`key={taskKey}`) with memoized row components; live-field updates
  (updatedAt/is-active) become ordinary props diffing.
- Transcript: a wrapper component owns the container; full renders and
  the loading/empty/failed placeholder arrive as props; incremental
  mutation effects and pagination stay imperative calls from the child on
  the container (the streaming path is deliberately imperative). The
  child's direct transcript DOM writes (`showTranscriptState`) move
  inside the wrapper.
- Static chrome (view-mode buttons, conversation overlay menu,
  empty/main containers) joins the component tree, removing the child's
  querySelector coupling; `document.title` stays a child side effect.

### D6. Region-by-region order, risk ascending

message-counts → toolbar → banner → plan → hint → composer → permission
drawer → details drawer → context drawer → transcript wrapper + static
chrome. Each step: component test first (jsdom), implement, take over at
the child's render seam, keep 97 green, delete that region's ACP-only
`exact` imperative branch. Every step is independently revertible.

### D7. Test infrastructure: jsdom replaces the FakeDocument shim

`test/helpers/sidebarDomEnv.ts` provides a JSDOM environment installer
(globals + rAF shim) and subtree helpers that walk real `childNodes`
including Text nodes. `test/core/97` migrates to it with zero assertion
weakening (same its, element-wise by-reference identity). Failure
injection (`failNextInsertBefore`) is preserved by monkey-patching the
target container. This lands and goes green before any component work.

### D8. SkillRunner is out of scope

`runDialog.js`, `chatThinkingCore.js`, the SkillRunner panel-model
branch, and the shared guard primitives (`managedMount`,
`renderManagedRegionIfChanged`, legacy signature functions) are
untouched. Only provably ACP-only `exact` code is deleted, region by
region; the final sweep removes the renderer's `exact` dispatch.

### D9. No spec-semantic or AGENTS.md changes piggybacked

Behavioral invariants in `assistant-workspace-ui-refresh-governance` keep
their scenarios verbatim; only mechanism wording moves from "signature
attribute guard" to "component props memoization". AGENTS.md hard
constraints are rewritten at final merge time per branch governance.

## Risks

- jsdom migration churn in 97 is isolated in Step 0 and must be green
  before component work starts.
- Memo equality drift (missing a visible field → stale region) is
  prevented by D4's shared field selections plus the subtree-identity
  tests.
- A render throw inside a component must still reach the controller's
  failure recovery; Preact `render()` is synchronous, and the failure
  recovery test in 97 is kept (now injecting the failure through a
  patched container).
- Bundle size grows by ~4 kB (Preact) — acceptable against the deleted
  hand-rolled diff code.
