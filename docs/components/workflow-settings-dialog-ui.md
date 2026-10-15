# Workflow Settings Dialog UI

The workflow submit window is owned by
`src/modules/workflow/settings/workflowSettingsWebDialog.ts`. Its content page
boots `src/dashboard/workflowSettingsDialogApp.ts` and renders
`WorkflowSettingsDialogRegion`; Dashboard Workflow Options renders
`WorkflowOptionsRegion`. Both reuse the field renderer and the host descriptor
from `workflowSettings.ts`.

## Input and submission

The descriptor exposes compatible backend profiles, workflow/provider/run
schemas, explicit values, display defaults, catalog diagnostics, and Host queue
state. `workflowSettingsDialogModel.ts` holds layout and change-origin helpers.

Controls edit a complete local draft. Confirmation flushes pending text/number
input before sending `confirm` to the host; an empty optional number carries a
deletion marker. The host reconciles pending provider changes and calls
`resolveWorkflowSettingsSubmission`, which merges deletion markers before
validating explicit provider values. It returns a settings snapshot independently
from runtime normalization. Dashboard's debounced save uses the same path.

The host returns confirmed settings and the save-defaults choice, or keeps the
window open with validation feedback. The trigger owns persistence when requested
and freezes one snapshot for the batch. Run-only options remain transient.
Public fields and message shapes are defined in `dashboardWireContract.ts`.

## Projection and refresh

ACP unset selectors display their valid current catalog entry, or model/mode's
first entry if current is absent, without forming an override. Explicit invalid
values remain editable and fail validation. SkillRunner declared defaults are
displayed by schema projection; legal empty model defaults and false boolean
values retain their normal meaning.

An explicit provider switch chooses its first cached model. Source/rebased
reconciliation protects that selection before the page receives its echo while
preserving newer input. Descriptor replies apply only to the draft that issued
them. Backend-specific selections are remembered per workflow for the form
lifetime and restored only while still valid.

Opening the form and changing selectors read cached catalogs. A manual refresh
uses the complete backend catalog, with one active probe, a total 60-second
budget, cancellation on replacement or close, and stale response isolation.
Missing reasoning metadata disables that control without blocking a submission
that leaves reasoning unspecified.

## Execution preview and Host queue

The preview is built once from the trigger-time immutable selection in
availability mode. It does not run provider preflight, build requests, execute
providers, or apply results. Form edits leave the preview unchanged; confirmed
execution planning remains authoritative.

ACP/SkillRunner submissions with multiple legal units show an ordered compact
unit list and Maximum concurrency below it. Both are hidden for zero or one
unit, preview failure, or unsupported providers. Dashboard does not expose this
control and preserves saved Host options when editing other fields.

Blank and zero mean unlimited; a positive safe integer freezes the submitted
limit. Invalid values remain in the window with field feedback. The setting
belongs to `hostOptions.queue.maxConcurrency`, separately from workflow/provider
parameters and provider request payloads.

See [the settings SSOT](workflow-settings-single-source-submit-flow-ssot.md) for
the complete persistence and execution contract.
