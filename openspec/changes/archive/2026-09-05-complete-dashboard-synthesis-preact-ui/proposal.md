# Dashboard / Synthesis Workbench Preact UI Migration

## Why

Dashboard and Synthesis Workbench rely on large imperative page renderers without clear component or lifecycle boundaries. Dashboard rebuilds its page on ordinary snapshots and compensates with class-coupled log/trace fast paths and scroll restoration; its workflow form is duplicated in a child window. Workbench has useful shell/chrome/surface read models, but implements them inside one roughly 16,565-line entry with whole-DOM reverse-text localization and intertwined hosted/offline modes.

Migrate both complete pages to the architecture already used by Assistant Workspace: static region containers, independently memoized Preact roots, shared portable wire contracts and explicitly owned imperative islands. Preserve existing user actions, host refresh governance and high-frequency interactions.

## What Changes

- Move Dashboard, Backend Manager and Workflow Settings from handwritten `addon/content/dashboard/*.js` into TypeScript/TSX under `src/dashboard`, retaining packaged script paths.
- Split Dashboard into TabBar, Home, WorkflowOptions, Products, Backend, RuntimeLogs, SynthesisSidecar, SkillrunnerAudit and AcpTraceReplay regions; reuse one workflow form and one parameterized backend renderer.
- Extract shared region equality and managed-mount helpers from the Assistant Workspace pattern, preserving sidebar imports and region-specific selectors.
- Establish concrete shared Dashboard/Workbench snapshots, action payload maps and message envelopes, with necessary host type/label adaptations and unchanged wire semantics.
- Replace the Workbench monolith with controllers, projections and Shell/Chrome, Home, Topics, Concepts, Graph, Registry, Tags, Review Center and Reader components under `src/synthesis`.
- Preserve bounded log/trace rows, persistent Sigma surfaces, matching graph-page accumulation, interaction-only updates, camera state and Markdown/timeline islands.
- Own focus, expansion, scrolling, drafts, listeners and timers at component/page boundaries; window Topics and Registry rows without new dependencies.
- Resolve localization during projection/rendering, use the shared Markdown sanitize profile and retain existing stylesheets/theme tokens.
- Separate hosted Workbench, standalone graph and standalone topic entries; regenerate deep-reading templates without bundling the full hosted Workbench.
- Migrate source-dependent tests, add component/bootstrap/DOM-identity/browser regressions, retain surface parity and diagnostics elision, and document the full architecture.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-workbench-ui`: complete region-based page architecture, persistent graph interactions, bounded lists, render-time localization and independent offline exports.
- `task-runtime-ui`: complete Dashboard and child-window migration, shared contracts/forms, region identity and lifecycle ownership.
- `synthesis-tab-ui`: align standalone topic boot with its independent export entry while preserving all offline reader and graph behavior.
- `synthesis-workbench-surface-refresh`: update Index content within its existing container, preserving region-scoped refresh semantics and container identity.
- `synthesis-workbench`: express standalone graph host isolation as behavior rather than a retired initialization option.

## Impact

Page sources, HTML skeletons, shared contracts/helpers, type-only host adaptations, export resources, esbuild/TypeScript configuration, ESLint boundaries, localization assets/governance, generated templates, tests and architecture documentation. Implementation is commit `54b096a2`, relative to parent `4fb76b73f3ec9744e905c39e45d0b86ac03b34ed`.

Host snapshot/action/message semantics and dirty/scope refresh governance remain unchanged. Backend business behavior, `packages/synthesis-*`, native sidecar, Host Bridge, `src/workspaceApp.ts`, new dependencies and broad CSS reorganization are outside scope. Wildcard `postMessage` origin hardening is a separate change.

The archive identifier is retained for traceability. This change describes the entire migration; implementation differences and acceptance limitations are recorded in `design.md` and `verification.md`.
