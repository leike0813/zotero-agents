# Design

## Store Ownership

ACP Skills and SkillRunner have separate physical stores:

- `plugin_acp_skill_runs`
- `plugin_acp_skill_run_events`
- `plugin_skillrunner_runs`
- `plugin_skillrunner_run_events`

The shared implementation may expose generic helpers, but callers must choose
one of the backend-specific store kinds. UI task rows and dashboard history are
derived projections, not state owners. SkillRunner runtime code must not read or
write legacy SkillRunner task request/context rows after this change.

## ACP Skills Model

ACP run state remains conversation-centric. The ACP store owns transcript,
permission, reply, connection, workspace, result, and apply state. ACP apply is
foreground-owned, and ACP store APIs reject non-ACP backend types.

## SkillRunner Model

SkillRunner run state is request-centric. A `SkillRunnerRunRecord` owns backend
identity, workflow/job identity, request payload, provider options, execution
mode, fetch type, apply retry state, result metadata, and sequence step metadata.
Records also carry a role:

- `single`: visible ordinary run
- `sequence_root`: hidden orchestration state
- `sequence_step`: visible step run

SkillRunner observation paths only publish events or snapshots into the
SkillRunner store. Terminal success is settled by the SkillRunner settlement
worker, which fetches result material, applies if needed, records apply state,
and starts the next sequence step.

## Legacy Data Reset

This change intentionally does not migrate previous local ACP/SkillRunner run
state. On first startup after the schema change, plugin state clears:

- `plugin_task_requests` for `domain=skillrunner`
- `plugin_task_contexts` for `domain=skillrunner`
- `plugin_task_contexts` for `domain=workflow-sequence`
- `plugin_task_rows` for `domain=skillrunner`
- `plugin_task_rows` for `domain=acp` and `scope=skill-runs`

The reset is protected by a v2 `plugin_meta` marker so environments that already
ran the earlier separated-store reset still clear the old compatibility rows.
New run-store data must not be deleted on later startups.

## Sequence

Sequence state belongs to the backend-specific run store:

- ACP sequence state is stored in ACP run-store payload rows and is not exposed
  as a visible ACP skill run.
- SkillRunner sequence root state is stored as a non-projectable SkillRunner
  root run, while each step is a projectable SkillRunner run.

SkillRunner step 0 starts a new workspace. Step N reuses the previous successful
SkillRunner step request id. Every step has its own backend request id and
visible projection.
