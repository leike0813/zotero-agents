# Design: Topic Synthesis Workflow Sequence Switch

## Workflow Contract

Both topic synthesis workflows declare `request.kind =
"skillrunner.sequence.v1"` and provide three ordered steps. The first step owns
workspace creation, while core and finalize use `workspace: "reuse-workflow"` so
all steps share the same SQLite DB, runtime views, handoffs, sidecars, and final
candidate.

The workflow result contract points at the final step by setting
`result.final_step_id = "finalize"`. Existing `result.fetch` and final artifact
expectations remain compatible with the apply hook.

## Update Prepare Gap

`update-topic-synthesis-prepare` must advance through the same prepare shape as
create: runtime setup, topic context, resolver/workset, and paper triage. The
runtime therefore needs both the stage list and the payload dispatch branch for
`stage_10_update_topic_context`.

The Stage 10 submit implementation stores only contract-level facts:
topic id/definition, current hashes, section hashes, recommended update, update
assessment, and normalized operation. It does not infer a full patch plan or
rewrite downstream synthesis semantics.

## Hook Removal

The old update `buildRequest` hook pre-read Host topic context and constructed a
legacy `skillrunner.job.v1` request. Keeping that hook would bypass the
declarative sequence compiler, so the workflow removes the build hook and the
builtin manifest stops packaging it.

