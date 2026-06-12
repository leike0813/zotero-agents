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
