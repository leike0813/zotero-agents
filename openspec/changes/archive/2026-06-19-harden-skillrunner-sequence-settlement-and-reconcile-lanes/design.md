# Design: SkillRunner Sequence Settlement And Reconcile Lanes

## Connection Lane Model

SkillRunner frontend HTTP work uses a governed per-backend lane model:

- `submit`: `/v1/jobs` create and upload/init work.
- `settlement`: terminal `/result` and `/bundle` fetches.
- `reconcile`: `/v1/jobs/{request_id}` state polling and terminal
  double-confirm checks.
- `foreground-query`: selected-run short UI queries.
- `foreground-stream`: bounded UI chat streams.
- `background`: non-critical history/gap sync.
- `maintenance`: low-frequency management work.
- `health`: `/v1/system/ping`.

The default active connection budget is six per backend. This matches the
current Gecko default per-server persistent connection count that Zotero does
not raise for this plugin.

Lane priority is:

`submit > settlement > reconcile > foreground-query > foreground-stream >
background > maintenance > health`.

`background`, `maintenance`, and `health` must leave at least two slots for
critical lanes. If a critical lane cannot start because the backend cap is full,
the governor may evict the least-recently focused warm foreground stream. It
must not evict the currently selected run stream when another evictable warm
stream exists.

## Reconcile And Health Separation

Health probes are backend-level hints. They can gate non-critical background
observe and backend-level UI affordances, but they are not a precondition for
active run terminal settlement.

For an already registered active SkillRunner run, the reconciler attempts direct
`reconcile` lane polling even if the backend health registry is flagged. A
successful direct state poll clears the backend health failure flag. A failed or
queued health probe must not count as a run failure and must not starve submit,
settlement, or reconcile work.

`promptReconcileRequests()` is a fire-and-forget enqueue signal. It must not
block submit or UI paths behind a long-running global reconcile flush.

## Sequence Identity

SkillRunner sequence root and step identities are distinct:

- root sequence id: workflow-level completion key
- root job id: local queue/orchestration identity
- step id/index/skill id: per-step identity
- step request id: backend request identity

Every projectable sequence step run record persists:

- `workflowRunId`
- `sequenceStepId`
- `sequenceStepIndex`
- `sequenceJobId`
- `sequenceStepSkillId`

Restored reconciler contexts must preserve those fields so later continuation
uses the same local task identity after restart or delayed settlement.

## Sequence Settlement

For a terminal successful SkillRunner sequence step, the reconciler performs:

1. Fetch result or bundle in the `settlement` lane.
2. Normalize `responseJson.data` and namespaced
   `result/<skillId>.<n>/result.json`.
3. Write result/handoff projection for the step.
4. Continue the next step if the result/handoff contract allows it.
5. Enqueue side-effect apply for the completed step.

Step apply is intentionally not awaited before continuation. Apply failure only
updates the completed step's apply state and diagnostics. The sequence stops
only when execution fails, cancellation occurs, a required handoff cannot be
projected, or the root sequence reaches an explicit terminal state.

## Workflow Completion

SkillRunner sequence workflow completion is keyed by the root sequence id. A
non-final step request settling terminal must not emit the workflow summary.

The workflow summary is emitted once after the sequence root reaches
`completed`, `failed`, or `canceled`. This keeps success toast, database terminal
state, and dashboard/popover projection aligned to the same root fact.
