# Tasks

## 1. OpenSpec

- [x] Create change artifacts for `remove-legacy-synthesize-topic-assets`.

## 2. Hook Migration

- [x] Add `workflows_builtin/synthesis-layer/hooks/applyTopicSynthesisResult.mjs`.
- [x] Update create/update workflows to reference the neutral hook.
- [x] Update builtin workflow manifest to publish the neutral hook.

## 3. Legacy Removal

- [x] Remove legacy `workflows_builtin/synthesis-layer/synthesize-topic`.
- [x] Remove legacy `skills_builtin/synthesize-topic`.
- [x] Remove deprecated `skills_builtin/topic-synthesis-runtime`.
- [x] Update Workbench routing away from `synthesize-topic`.

## 4. Tests and Specs

- [x] Update workflow, Workbench, and integration tests.
- [x] Update active specs away from the legacy single workflow contract.

## 5. Verification

- [x] Run synthesis workflow contract tests.
- [x] Run synthesis tab UI tests.
- [x] Run synthesis applyResult integration tests.
- [x] Run `npm run build`.
- [x] Run `openspec validate remove-legacy-synthesize-topic-assets --strict`.
