## Why

When the Assistant Workspace sidebar is short, the fixed-height chrome regions
(shell toolbar, banner, reply zone) squeeze the conversation window first,
making the transcript hard to read. The sidebar previously had no
height-dimension responsive behavior at all — only width media queries
existed.

## What Changes

- Make the shell toolbar, banner, and reply zone collapsible across all three
  child panels (ACP Chat / ACP Skills / SkillRunner) via one shared child
  bundle.
- Trigger model is manual-first with an automatic fallback: a viewport-height
  observer derives an auto stage with hysteresis (banner at or below 620px,
  composer compaction at or below 540px, toolbar at or below 440px; each
  stage recovers 60px above its enter threshold). Clicking a region toggle
  pins a manual override; toggling back to the auto-suggested value clears
  the override and returns the region to auto mode. State is session-scoped
  and not persisted.
- Collapsed forms: toolbar becomes a slim strip with only the expand toggle;
  banner keeps only the title row (warning/danger notices and the
  new-conversation `+` action stay visible); the reply zone compacts the
  textarea to a single line and merges the runtime selectors (Mode/Model/
  Reasoning on ACP panels) and the Send button into one footer row, hiding
  the hint text and usage gauge.
- Collapse is implemented as a pure chrome presentation state: a new
  controller (`src/sidebar/assistantRegionCollapse.ts`) toggles the
  `is-region-collapsed` class on region containers and a
  `data-collapse-stage` attribute on the panel root. It does not enter any
  region signature/render key, the panel DTO, or the transcript render
  pipeline, and collapse toggles never re-render regions. Toggle buttons are
  appended to region containers outside the Preact managed mounts.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `assistant-sidebar-ui`: the shell toolbar, banner, and reply zone gain
  collapsible behavior with manual override plus height-driven auto fallback,
  governed by the region-isolation invariants.

## Impact

- Adds `src/sidebar/assistantRegionCollapse.ts` and wires it from
  `src/sidebar/assistantWorkspaceAcpChild.js` (all three panels share the
  bundle; no child HTML changes).
- Adds collapse styles to
  `addon/content/shared/assistant/assistant-panel-shared.css`; restyles but
  never replaces the reply textarea, so draft/focus/caret survive.
- Adds six localized labels (`assistant-panel-action-{collapse,expand}-
  {toolbar,banner,composer}`) to `assistantPanelLabels.ts` and all eleven
  `addon.ftl` locales.
- Adds `test/core/200-assistant-region-collapse.test.ts` covering the stage
  state machine, override rules, and region subtree identity invariants.
- Documents the behavior in
  `doc/components/assistant-sidebar-panel-ui-ssot.md` and the Assistant
  Workspace UI constraints in `AGENTS.md`.
