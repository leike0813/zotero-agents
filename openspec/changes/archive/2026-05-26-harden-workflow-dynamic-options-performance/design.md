## Context

The workflow menu, dashboard, and workflow settings model all use `buildWorkflowSettingsUiDescriptor()` to decide whether a workflow is runnable or configurable. That descriptor currently resolves dynamic string options unconditionally. For `update-topic-synthesis`, the dynamic option source is `synthesis.topics` with the `updatable` filter, and the implementation resolves it by calling the full Synthesis Workbench snapshot.

After the Synthesis KG changes, the full snapshot reads multiple canonical/projection domains, including tag vocabulary, Concept KB, Topic Graph, Literature Registry, Citation Graph, Git Sync state, and projection registry state. The cost is acceptable for opening the Synthesis Workbench, but it is too broad for ordinary menu and dashboard interactions.

## Goals / Non-Goals

**Goals:**

- Keep workflow menus, dashboard summaries, and quick-run checks responsive.
- Resolve Synthesis topic options through a bounded topic-options facade instead of the full Workbench snapshot.
- Let callers opt out of dynamic option resolution when they only need descriptor metadata.
- Preserve full dynamic option rendering when a workflow settings form is actually shown.

**Non-Goals:**

- No changes to workflow manifests, skill stage order, or Synthesis canonical data contracts.
- No new background job, cache database, or dependency.
- No redesign of the dashboard or workflow settings UI.
- No removal of existing dynamic options support.

## Decisions

- Add a lightweight Synthesis topic-options facade.
  - `filter: "updatable"` can be derived from artifact index rows plus persisted artifact state and update intent logic.
  - This avoids loading Concepts, Topic Graph, Tags, Literature/Citation projections, and Git Sync state.
  - Alternative considered: keep using `getSynthesisSnapshot()` and cache the result. This still makes the first menu/dashboard interaction too expensive and couples unrelated UI to Workbench state.

- Add descriptor-level dynamic option control.
  - `buildWorkflowSettingsUiDescriptor()` accepts a lightweight option to skip dynamic option resolution.
  - Summary/availability callers pass the lightweight mode; full settings views keep dynamic resolution enabled.
  - Alternative considered: infer from call stack or workflow id. That would be brittle and harder to test.

- Keep workflow menu preflight shallow.
  - The menu can validate provider/profile availability without expanding dynamic parameter options.
  - Actual execution still resolves workflow context and validates inputs through the existing execution path.

## Risks / Trade-offs

- [Risk] A workflow summary could be shown as configurable even if its dynamic options are temporarily unavailable. → Mitigation: full settings views still resolve dynamic options and surface diagnostics before execution.
- [Risk] Updatable topic option rows may diverge from Workbench artifact rows. → Mitigation: both paths reuse the same persisted artifact index/state and `deriveTopicUpdateIntent` logic.
- [Risk] Tests could overfit private call order. → Mitigation: test observable behavior and absence of heavyweight snapshot reads for menu/dashboard paths.
