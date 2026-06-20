# Design

## Foreground Single Jobs

For `skillrunner.job.v1`, the SkillRunner provider no longer stops at
`request-ready`. It submits or uploads, records the projectable run, polls
`GET /v1/jobs/{request_id}` until waiting or terminal state, and fetches
`/result` or `/bundle` on terminal success. Terminal failure and cancellation
return local terminal provider results.

`poll.timeout_ms` is a plugin-side foreground wait boundary for active queued
or running waits. It is not passed to the backend and does not apply after the
backend enters `waiting_user` or `waiting_auth`.

## Waiting Detach And Continuation

Interactive waiting is a real detach boundary. When polling observes
`waiting_user` or `waiting_auth`, execution returns a foreground-owned
deferred result with waiting metadata. The user reply or auth import endpoint
starts foreground continuation from the stored run record. Continuation polls
until the next waiting or terminal state, applies terminal success in the
foreground, and writes failed/canceled terminal outcomes locally.

## Foreground Sequences

For `skillrunner.sequence.v1`, the host runs the step loop in the foreground.
Each step is submitted as a normal `skillrunner.job.v1` request, polled to
waiting or terminal state, fetched on success, and used to build sequence
handoff for downstream steps. Step apply hooks and the root final apply update
the matching run record apply state to `running`, `succeeded`, `failed`, or
`skipped`.

Waiting detaches the whole sequence at the pending step. Reply/auth
continuation resumes from that step using stored sequence state. Step failure
or cancellation terminates the sequence without running downstream steps.

## Reconciler Downgrade

The reconciler is now a recovery coordinator. It does not own poll, fetch, or
apply. It runs one-shot recovery sweeps at:

- plugin startup,
- backend health recovery from flagged/unreachable to healthy,
- managed local runtime successful post-up reconciliation.

Recovery sweeps inspect the SkillRunner run store and either hand recoverable
runs to foreground continuation or locally fail unrecoverable runs. Waiting
runs are restored as waiting projections and are not polled until the user
replies or imports auth. Missing-context active tasks fail locally because no
safe apply context exists. Recovery never writes `apply.skipped`, fetches
result/bundle payloads, or executes apply hooks. Backend recovery sweeps are
deduped per backend while an earlier backend-healthy sweep is still in flight.

Backend health tracking is initialized from configured SkillRunner backends
without requiring an existing run-store record. Tracking a configured backend
does not mark it reachable; reachability is true only after a real successful
SkillRunner request, management request, model-cache refresh, or managed local
runtime up event. Unknown or unconfirmed health is not a submission block:
only an explicit tracked recovery flag hides a backend from submit-time
settings. Saving backend settings registers current SkillRunner backends and
prunes removed ones so newly added profiles become usable without restart.

## Hard Foreground Model Cleanup

Normal foreground execution does not call reconciler registration APIs. The
old settlement API is removed and replaced by an explicitly named recovery
context entrypoint used only by startup, backend recovery, and request-ready
post-failure recovery.

`request_ready` is no longer a visible lifecycle state. It is stored only as a
submit phase. Run status and task projections use backend/local execution
states; request-ready without a backend status projects as `running`.

SkillRunner run records use a new schema version and old payloads are ignored.
The run record no longer persists reconciler backoff fields, state event
recovery data, or embedded sequence state snapshots. Sequence state is stored
as a dedicated sequence-state envelope, and interactive sequence waiting is
named `waiting_interaction`.

## Dead Code And Defensive Cleanup

The dead-code cleanup removed unreachable wrapper exports and the unused
registration mode branch before the final recovery handoff redesign. The
current model has no recovery-owned settlement branch.

Foreground progress projection uses one shared SkillRunner mapping helper for
run seam, foreground continuation, and recovery continuation. `request-ready`
continues to map to lifecycle `running` and submit phase `request_ready`;
sequence waiting/terminal progress continues to use backend status.

`request_ready` is defensively remapped if it reaches run-state update APIs:
status and lifecycle are written as `running`, while submit phase is preserved
as `request_ready`. The run dialog does not expose `request_ready` as a status
label.

The apply seam treats local job success and provider result status as separate
signals. A `succeeded` queue job with a non-`succeeded` provider result does not
enter terminal apply: deferred results remain pending, failed/canceled results
produce terminal outcomes, and other explicit statuses fail with a structured
runtime log.

## Recovery Handoff Cleanup

The follow-up owner handoff redesign removes the recovery-owned settlement
path. `SkillRunnerTaskReconciler` no longer persists long-lived contexts or
runs interval job polling. Startup, backend-healthy, and managed-local-up
boundaries run one best-effort sweep. Recoverable records are handed to
foreground continuation with per-request in-flight de-duplication; terminal
success is applied by the same foreground path as normal execution.

Records without enough request/backend/workflow/sequence context are failed
locally. Runs whose apply state is already `running` or `failed` are treated as
ambiguous after a crash and failed instead of retried, preventing duplicate
Zotero writes. The legacy deferred workflow completion tracker is removed;
SkillRunner recovery no longer has a prompt/deferred-completion settlement path.

## Reachability State Machine

SkillRunner backend availability is no longer expressed through a reconcile
flag. Each configured SkillRunner backend has a persistent `enabled` switch and
a runtime reachability state: `disabled`, `unknown`, `probing`, `reachable`, or
`unreachable`. Submit dialogs and task/run visibility use only
`enabled && reachable`.

The reachability coordinator owns backend probes. It starts by treating enabled
SkillRunner backends as unavailable, schedules an immediate idle-only probe,
and then continues low-frequency due probes with capped backoff. Successful
probes and any successful active SkillRunner connection both update
`lastReachableAt`. Health-lane probes are skipped rather than counted as
failures while the backend already has active/queued work or physical debt.

If a due probe observes that the backend has had no successful reachable event
for six hours, the coordinator writes `enabled:false` to the backend
configuration, marks the runtime health state `disabled`, stops probing that
backend, and emits a sticky runtime toast. Re-enabling a backend from Backend
Manager debounces and schedules an immediate idle probe.

Recovery is triggered by the reachability transition from unavailable to
reachable. Startup recovery and backend-recovered recovery are therefore the
same path: an enabled backend first proves reachable, then the recovery
coordinator performs one backend-filtered foreground handoff sweep. Recovery
does not poll jobs, fetch results, or apply.
