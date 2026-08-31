## Context

The interactive trigger currently opens the settings gate before the preparation seam. The preview seam and preparation seam can each fall back to `ZoteroPane.getSelectedItems()`, so an asynchronous selection change creates two different planning inputs. Existing Host Bridge submission already passes an explicit selection override and remains outside this UI change.

## Goals / Non-Goals

**Goals:**

- Establish one trigger-owned, serialized selection-context snapshot for every UI workflow execution.
- Keep preview and confirmed preparation on the same raw context while preserving the existing availability/execute planning split.
- Keep the public trigger entrypoint stable and avoid exposing selection data in the settings dialog payload.

**Non-Goals:**

- Reusing the availability preview plan as the confirmed execution plan.
- Changing parameter-dependent selection filters, provider protocols, settings persistence, or Host Bridge behavior.

## Decisions

### 1. Capture the context at the execution entrypoint

`executeWorkflowFromCurrentSelection()` will synchronously copy the selected item array at entry, then build one serialized selection context before any settings-gate or backend await. Both the copied item array and serialized context are passed internally to preview and preparation: the item array preserves the existing no-selection gate without consulting the live window, while the serialized context is the planning SSOT. This covers the workflow menu and Synthesis workbench callers without changing their APIs.

### 2. Add an explicit context override to both preparation seams

`buildWorkflowExecutionUnitPreview()` and `runWorkflowPreparationSeam()` will accept an optional `selectionContextOverride`. It takes precedence for planning, while the same trigger-time `selectedItemsOverride` is used for the existing no-selection gate. Both overrides take precedence over the live window selection; when supplied, neither seam may consult `ZoteroPane.getSelectedItems()`.

### 3. Keep confirmed planning authoritative

The preview continues to call availability/menu-mode planning only. After confirmation, preparation reruns execute-mode planning with confirmed settings against the captured context. This preserves parameter-dependent filtering and preflight expansion semantics.

### 4. Fail closed on snapshot errors

A failed trigger-time context build is surfaced through the existing workflow trigger failure feedback and runtime logging, then the trigger returns without opening or confirming a submission. Falling back to a newer live selection would violate the snapshot contract and is therefore disallowed.

## Risks / Trade-offs

- [Risk] Building the full context before opening the settings dialog can delay dialog appearance for large selections. → [Mitigation] It replaces the context build already performed by configurable preview/preparation rather than adding a second full build, and avoids duplicate serialized reads.
- [Risk] A context DTO could be mutated by future planner code. → [Mitigation] Treat the captured DTO as read-only at the seam boundary and keep prepared unit contexts immutable through the existing planner freeze behavior.
- [Risk] Execute-mode settings can still change the final unit count relative to the advisory preview. → [Mitigation] Document and test this as intentional; only the raw selection input is fixed by this change.
