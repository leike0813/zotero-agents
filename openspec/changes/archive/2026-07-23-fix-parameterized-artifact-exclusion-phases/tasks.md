## 1. Lock the phase contract with focused tests

- [x] 1.1 Extend `test/workflow-literature-translator/160-workflow-literature-translator.test.ts` first with table-driven cases proving that an artifact for parameter value A does not exclude the unit in menu mode, does exclude it in execute mode when A is confirmed, and does not exclude it when value B is confirmed.
- [x] 1.2 Extend `test/ui/40-gui-preferences-menu-scan.test.ts` first to prove a parameter-dependent existing artifact cannot disable the workflow menu before settings confirmation.
- [x] 1.3 Extend the existing selection-validator/schema tests first to preserve parameter-independent `artifact-exists` behavior and reject a parameterized target that omits its required `parameter` declaration.
- [x] 1.4 Add or extend debug-probe coverage only if its existing menu-mode fixture does not already exercise the shared availability contract; avoid duplicating the evaluator cases.

## 2. Implement phase-aware artifact exclusion

- [x] 2.1 Refine the `WorkflowValidateSelectionSpec` rule union in `src/workflows/types.ts` and the matching definition in `src/schemas/workflow.schema.json` so target kinds that need a parameter require an explicit non-empty `parameter`, while static targets retain their existing shape.
- [x] 2.2 Update `src/workflows/workflowSelectionValidation.ts` to carry the full typed artifact rule, ignore rules with `parameter` in menu mode, and preserve manifest order for all applicable rules in execute mode.
- [x] 2.3 Resolve parameterized target paths from `executionOptions.workflowParams[rule.parameter]`; remove implicit parameter-name and workflow-id inference while preserving existing path normalization and static target resolution.
- [x] 2.4 Preserve total/valid/skipped statistics, mixed-unit continuation, and the existing all-skipped `NO_VALID_INPUT_UNITS` outcome before any request construction.
- [x] 2.5 Update `doc/components/workflow-execution-seams.md` or the existing selection-validation component documentation with the current-state menu-versus-execute contract and manifest-owned parameter dependency.

## 3. Verify the isolated fix

- [x] 3.1 Run the focused translator, menu, selection-validator, schema, and debug-probe tests and make them pass without adding queue or dialog-preview dependencies.
- [x] 3.2 Run `npx tsc --noEmit`, targeted ESLint/Prettier checks for changed files, `npm run check:builtin-workflow-manifest`, and the smallest relevant Node UI/workflow suites.
- [x] 3.3 Run `openspec validate fix-parameterized-artifact-exclusion-phases --strict` and review the diff for concrete parameter-value assumptions, workflow-id branches, provider changes, or persistence changes.
