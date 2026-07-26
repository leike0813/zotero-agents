## Why

Parameterized `artifact-exists` exclusions currently run during menu
availability checks using persisted or default workflow settings. A matching
artifact can therefore disable a configurable workflow before the user can open
its submission dialog and choose a different parameter value, even though the
same exclusion is still useful after the user confirms the submission.

## What Changes

- Treat an `artifact-exists` rule with `parameter` as an execution-dependent
  exclusion: menu and diagnostic availability ignore it, while execute-mode
  selection validation applies it using the confirmed workflow parameters.
- Preserve existing availability and execute behavior for parameter-independent
  `artifact-exists` rules.
- Make `rule.parameter` the actual parameter-name source for artifact target
  resolution instead of retaining a target-specific hard-coded parameter name.
- **BREAKING**: Require artifact target kinds whose path depends on a workflow
  parameter to declare that parameter explicitly; ambiguous manifests no longer
  receive an implicit parameter-name fallback.
- Keep matching execution units in the existing skipped accounting and prevent
  request construction/provider submission for them.
- Add focused, parameter-value-agnostic regression coverage for availability,
  matching-parameter skip, non-matching-parameter execution, and static-rule
  parity.
- Do not add dialog refresh, queue management, backend protocol, workflow-id
  branching, or provider-specific behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-execution-runtime`: Distinguishes availability validation from
  confirmed execution for parameter-dependent artifact exclusions and makes
  manifest parameter declarations authoritative.

## Impact

- `src/workflows/workflowSelectionValidation.ts`
- `src/workflows/types.ts` and `src/schemas/workflow.schema.json`
- Existing workflow menu/diagnostic callers of `evaluateWorkflowSelection()`
- Focused menu, selection-runtime, schema, and workflow regression tests
- No persistence, queue, provider request, Dashboard, or Assistant Workspace
  changes
