## Context

The Assistant Workspace chrome regions are independent Preact components
isolated by signature-equality memoization, and the project constraints forbid
letting non-region state leak into region render keys or triggering
non-transcript region rebuilds from unrelated updates. A collapse feature must
therefore not become new props flowing through `projectAssistantWorkspacePanel`.

## Decision

Collapse is modeled as pure chrome presentation state owned by a dedicated
controller (`src/sidebar/assistantRegionCollapse.ts`) inside the child panel
runtime:

- The controller toggles `is-region-collapsed` on the region container
  elements and `data-collapse-stage` on the panel root. Collapsed forms are
  expressed entirely in CSS; no Preact component re-renders and no signature
  selection changes. This mirrors the existing container-level `hidden`
  toggling used for the context/details drawers.
- Toggle buttons are created imperatively and appended to the region
  containers, outside the Preact managed mounts, so the three child HTML
  files stay untouched and Preact diffs never disturb the buttons.
- The reply textarea is restyled, never replaced, which keeps the two-tier
  reply signature design intact: drafts, focus, and caret survive collapse
  transitions with zero extra handling.

## Trigger Model

Manual-first with automatic fallback:

- `resolveAutoStage(height, previousStage)` maps viewport height to stages
  0-3 with enter/exit thresholds (620/680, 540/600, 440/500). Deepening is
  immediate; recovery requires crossing the exit threshold, giving a 60px
  hysteresis band that prevents flapping around a threshold.
- Each region holds `override ∈ {true, false, null}`; the effective state is
  `override ?? autoCollapsed(stage)`. Regions auto-collapse in order of
  usefulness at small heights: banner (stage 1), composer (stage 2), toolbar
  (stage 3).
- Click semantics (`nextOverride`): flip the effective state; if the flipped
  value equals the auto suggestion, store `null` instead, so toggling back is
  also the "return to auto" gesture and no extra UI is needed.
- State lives only in the controller (session-scoped), consistent with the
  existing drawer collapse states.

## Alternatives Considered

- Collapse state inside each region's signature selection (allowed by the
  constraints, as the permission drawer does): rejected because it would
  re-render regions on every toggle and complicate the reply textarea's
  value-preservation design for no functional gain.
- Pure CSS `matchMedia` height queries: rejected because they cannot express
  manual override or hysteresis, and the thresholds must apply per child
  iframe rather than per shell window.

## Risks

- The auto thresholds are initial heuristics and may need tuning after real
  use; they are centralized in `COLLAPSE_STAGE_RULES`.
