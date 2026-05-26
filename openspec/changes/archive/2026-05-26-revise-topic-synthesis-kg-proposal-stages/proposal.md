## Why

The topic synthesis KG proposal additions are currently documented and emitted as optional Stage 5 sidecars with inconsistent paths, so agents can skip them and host apply receives uneven contracts. The workflow needs a gate-approved, required-form stage that produces both KG proposal sidecars without making the skill write canonical KG assets.

## What Changes

- Add a dedicated KG proposal stage after core sections and before external/statistics/report authoring.
- Normalize proposal sidecar outputs to `result/sidecars/concept-cards-proposal.json` and `result/sidecars/topic-graph-relation-proposals.json`.
- Require completed create/update result bundles to include both proposal path fields; semantic contents may be empty arrays with diagnostics.
- Keep host apply compatible with legacy proposal paths for existing run workspaces.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `synthesize-topic-workflow`: revise create/update topic synthesis stage order and final bundle sidecar requirements.
- `topic-synthesis-runtime-contract`: add a gate-approved KG proposal action and required sidecar validation.
- `topic-synthesis-structured-artifact`: clarify KG proposal sidecars remain outside the structured artifact source of truth.

## Impact

- Affects `create-topic-synthesis` and `update-topic-synthesis` skill docs, runner prompts, schemas, gate runtime, and stage runtime.
- Affects the host synthesis result bundle validator and apply-time sidecar path resolution.
- Adds targeted workflow/runtime tests; no new npm dependencies, no canonical KG write surface in skills, and no Git/history changes.
