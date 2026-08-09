## Why

Interactive workflow submission opens a settings dialog asynchronously. The dialog preview is built from the selection at trigger time, but confirmed preparation currently reads the live Zotero selection again, so changing selection while the dialog is open can submit different execution units than the user saw.

## What Changes

- Capture one serialized selection-context snapshot at the start of every UI workflow trigger.
- Reuse that snapshot for both submit-dialog execution-unit preview and confirmed execution preparation.
- Prevent confirmation-time selection changes from changing the submitted input units.
- Keep confirmed execute-mode planning authoritative for settings-dependent filtering or expansion.
- Preserve existing Host Bridge, Generic HTTP, and pass-through submission contracts.

## Capabilities

### New Capabilities

### Modified Capabilities

- `workflow-settings-single-source-submit-flow`: Interactive submission selection context is captured at trigger time and shared by preview and confirmed preparation.

## Impact

- Workflow trigger orchestration and preparation-preview seams under `src/modules/`.
- Interactive workflow execution regression coverage and workflow submission SSOT documentation.
- No provider wire contract, persisted settings schema, dependency, or backend behavior changes.
