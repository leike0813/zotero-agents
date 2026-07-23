# Workflow Settings Dialog UI

## Overview

The workflow settings dialog (`src/modules/workflowSettingsDialog.ts` +
`src/modules/workflowSettingsDialogModel.ts`) provides a form-based UI for
configuring workflow execution options before submission. Users can select a
backend profile, set workflow parameters, and configure provider runtime
options.

---

## Entry Point

```typescript
// src/modules/workflowSettingsDialog.ts
async function openWorkflowSettingsDialog(
  args?: { window?: Window; workflowId?: string },
): Promise<void>
```

Opens the settings dialog. The `workflowId` parameter (when provided) scopes
the dialog to a specific workflow's configuration.

---

## Render Model

`src/modules/workflowSettingsDialogModel.ts`

```typescript
type WorkflowSettingsDialogRenderModel = {
  providerId: string;
  selectedProfile: string;
  profileItems: WorkflowSettingsDialogProfileItem[];
  workflowSchemaEntries: FormSchemaEntry[];
  persistedWorkflowParams: Record<string, unknown>;
  persistedProviderOptions: Record<string, unknown>;
  runOnceWorkflowParams: Record<string, unknown>;
  runOnceProviderOptions: Record<string, unknown>;
};

type WorkflowSettingsDialogProfileItem = {
  id: string;
  label: string;
};

type FormSchemaEntry = {
  key: string;
  type: FormSchemaType;
  visibleIf?: { parameter: string; equals: boolean };
  title?: string;
  description?: string;
  enumValues?: string[];
  options?: WorkflowParameterOption[];
  allowCustom?: boolean;
  defaultValue?: unknown;
  disabled?: boolean;
};
```

| Function | Purpose |
|----------|---------|
| `buildWorkflowSettingsDialogRenderModel(args)` | Build the render model from provider info + initial state |
| `resolveProviderSchemaEntries(args)` | Resolve runtime option schema entries for a given provider |
| `collectSchemaValues(container)` | Collect form field values from the DOM |
| `buildWorkflowSettingsDialogDraft(args)` | Build persisted and run-once `WorkflowExecutionOptions` from form fields |

## Form Interaction Flow

```
openWorkflowSettingsDialog()
  → buildWorkflowSettingsDialogRenderModel({
       providerId, profileItems, initialState, workflowParameters
     })
    → returns WorkflowSettingsDialogRenderModel
  → render form UI from render model
  → user edits fields
  → collectSchemaValues(container)
    → reads DOM form field values
    → returns Record<string, unknown>
  → buildWorkflowSettingsDialogDraft({
       persistedProfile, onceProfile,
       persistedWorkflowFields, persistedProviderFields,
       onceWorkflowFields, onceProviderFields
     })
    → returns { persistent: WorkflowExecutionOptions, runOnce: WorkflowExecutionOptions }
  → save (persist or run-once depending on user choice)
```

## Form Schema Types

```typescript
type FormSchemaType = "string" | "number" | "boolean";
```

Each `FormSchemaEntry` maps to a form control:
- `"string"` with `enumValues` → `<select>` dropdown
- `"string"` without `enumValues` → `<input type="text">`
- `"number"` → `<input type="number">`
- `"boolean"` → checkbox

Conditional visibility is handled by `visibleIf`: the field is shown only when
the specified parameter equals the specified value.

## Execution-unit preview and Host queue control

The submit dialog receives ordered immutable `WorkflowExecutionUnitPreview`
rows built from the v2 plan in menu/availability mode. Each row represents one
top-level prepared unit and exposes only its safe group label and member count.
When an ACP or SkillRunner submission has more than one legal unit, the dialog shows one multi-unit region
to the left of the existing workflow/provider options. That region contains
the ordered compact unit list and, directly below it, the Maximum concurrency
control. Form edits do not recompute or replace the preview. `grouping: all`
therefore produces at most one row, while `grouping: parent` produces one row
per stable parent group.

The Maximum concurrency row uses the same bounded field-control structure as
the main form. Its label, input, and validation message stay inside a
single-column container with zero minimum width, so the native number input
cannot cross the divider into the workflow/provider options region.

While the multi-unit layout displays its three visual columns side by side,
their background extents share the height of the tallest column. The
execution-unit preview and Workflow Options card absorb the remaining vertical
space, leaving Maximum concurrency and Run Options compact at the bottom of
their columns. At the single-column breakpoint, these height and flex
constraints reset so every stacked card returns to its natural content height.

The list and Maximum concurrency control share one visibility rule: both are
hidden when zero or one legal unit exists, when preview construction fails, or
when the selected provider does not support the Host queue. In that state the
dialog keeps its existing single options region. The standalone native settings
dialog and Dashboard Workflow Options page do not expose this Host control.

Blank and `0` mean unlimited; a positive safe integer freezes the
per-submission limit. Invalid values remain in the dialog with field feedback.
Selecting Save workflow defaults persists the same normalized value through the
workflow settings domain. The value belongs to
`hostOptions.queue.maxConcurrency`, never to workflow/provider schema fields or
provider request payloads.
