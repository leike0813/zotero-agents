# Design

## Canonical Result Contract

- `resultJson` is the skill business output only.
- `responseJson` is raw provider metadata, poll state, and diagnostics only.
- `resultContext` is the workflow-facing API for result JSON and artifact
  resolution.

Apply hooks must not parse provider envelopes such as `responseJson.result`,
`responseJson.data`, or `resultJson.result.data` as business output.

## SkillRunner `/result` Normalization

SkillRunner provider and reconciler paths normalize successful `/result`
responses before workflow runtime sees them:

- `{ request_id, result: { data } }` becomes `resultJson = data`.
- Direct JSON output remains unchanged as `resultJson`.
- The raw `/result` response is retained as
  `responseJson.resultResponseJson`.

ACP results are already canonical and must not be wrapped in SkillRunner-style
envelopes.

## Bundle And Artifact Resolution

`WorkflowResultContext` remains the single bundle/local artifact abstraction:

- SkillRunner bundle result JSON resolves
  `result/<skillId>.<n>/result.json` before `result/result.json`.
- ACP `workspaceDir` and `resultJsonPath` remain valid local resolution hints.
- SkillRunner zip bytes, extracted bundle directories, and legacy marker paths
  are resolved through `readArtifactText()`.

Hooks may use `resultContext.resultJson` directly and should call
`resultContext.readArtifactText()` for artifacts.

## Sequence Output

Sequence handoff consumes `ProviderExecutionResult.resultJson`. A successful
ACP or SkillRunner step without `resultJson` is a provider contract error.
The sequence runtime must not infer business output from `responseJson`.
