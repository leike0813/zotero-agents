## SkillRunner Sequence Model

SkillRunner sequence remains plugin-orchestrated. The backend receives only ordinary SkillRunner job requests. The plugin launches one backend request per step, records each request independently, and uses SkillRunner workspace reuse to share state across steps.

Step workspace intent:

- Step 0 starts a new backend workspace and MUST NOT carry a reusable `request_id`.
- Step N>0 reuses the last successful step request with `runtime_options.workspace = { "mode": "reuse", "request_id": "<previous request_id>" }`.
- `ZOTERO_BRIDGE_SCOPE` frontend routing identifiers are not workspace handles.

## Result Normalization

The upgraded SkillRunner backend writes step outputs into ACP-compatible workspace subspaces:

- `result/<skillId>.<n>/result.json`
- legacy fallback: `result/result.json`

The SkillRunner client must normalize terminal bundle results into the standard provider result shape before sequence handoff or apply:

- `resultJson`
- `resultJsonPath`
- `workspaceDir` when exposed by backend state
- `responseJson` remains the backend job snapshot

If no valid result JSON is found for a succeeded bundle run, the sequence step must fail with a structured local error instead of using the poll snapshot as handoff output.

## Apply Ownership

Sequence step apply is provider-neutral. ACP store status updates belong only to ACP skill runs. SkillRunner step apply updates SkillRunner task/runtime projections and sequence state, not ACP run records.

The foreground sequence path and recovered/reconciled path must pass the same data shape into `executeSequenceStepApply`: step output as `runResult.resultJson`, backend/run metadata, and `sequence.workflow_run_id/final_step_id/steps`.

## Task Projection

SkillRunner sequence step rows are user-visible tasks. The outer sequence run is orchestration state only and must not collapse multiple backend requests into one row.

Task projection stores step metadata:

- `skillId`
- `sequenceStepId`
- `sequenceStepIndex`
- `workflowRunId`
- backend `requestId`

Dashboard and run workspace labels should display the step skill name/skill id instead of opaque generated job ids.
