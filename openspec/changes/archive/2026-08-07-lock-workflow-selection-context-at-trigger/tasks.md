## 1. Regression Coverage

- [x] 1.1 Add seam tests proving an explicit selection-context override is used by preview and confirmed preparation even when the window selection differs.
- [x] 1.2 Add trigger-level coverage proving the selection snapshot is captured once before the settings gate, is not reread by the preview path, and fails closed on capture errors.

## 2. Trigger Snapshot Implementation

- [x] 2.1 Capture the selected item array at `executeWorkflowFromCurrentSelection()` entry and build one serialized selection context before asynchronous settings/backend work.
- [x] 2.2 Pass the captured context to both execution-unit preview and confirmed preparation without changing the public UI trigger callers.
- [x] 2.3 Fail closed through existing workflow feedback and runtime logging when trigger-time context construction fails.

## 3. Preparation Seams

- [x] 3.1 Add `selectionContextOverride` precedence to preview and preparation while preserving existing `selectedItemsOverride` callers.
- [x] 3.2 Keep availability preview advisory and rerun confirmed execute-mode planning against the captured context and confirmed settings.

## 4. Documentation and Verification

- [x] 4.1 Update workflow submit-flow SSOT sequence and invariants with trigger-time selection ownership.
- [x] 4.2 Validate the OpenSpec change and run focused workflow execution/settings tests, TypeScript checking, and targeted lint/format checks.
