## 1. State-Machine Contract

- [x] 1.1 Promote the target ACP Skills run status state machine into the SSOT
  document.
- [x] 1.2 Add `failed_retriable` as a non-terminal recoverable status.
- [x] 1.3 Define terminal absorbing statuses as `succeeded`, `failed`, and
  `canceled`.
- [x] 1.4 Remove the contradictory contract where terminal `failed` is also the
  recoverable detached state.

## 2. Store-Layer Status Governance

- [x] 2.1 Add centralized status classification helpers for terminal, active,
  recoverable, and recoverable prompt-failure cases.
- [x] 2.2 Require explicit transition reasons for production status writes and
  reject invalid transitions.
- [x] 2.3 Lazily normalize legacy recoverable `failed` records to
  `failed_retriable` during hydration/normalization.
- [x] 2.4 Route active summaries, dashboard visibility, retention, cancel, reply,
  apply result, and workflow task sync through the shared classifiers.

## 3. Orchestrator and Recovery Semantics

- [x] 3.1 Classify prompt/session failures as `failed_retriable` only when the
  session remains recoverable; otherwise write terminal `failed`.
- [x] 3.2 Restrict recovered workflow auto-continuation to `running`,
  `waiting_user`, `repairing`, and `failed_retriable`.
- [x] 3.3 Prevent terminal `failed`, `succeeded`, and `canceled` from being
  revived by reply, recovery, apply, or sequence continuation paths.
- [x] 3.4 Preserve the current non-terminal status across recoverable
  disconnect and hard-timeout paths.
- [x] 3.5 Keep final-output runs `running` while apply/sequence work remains
  pending, and write `succeeded` only after required follow-up work completes.

## 4. Cancellation and UI/Projection Behavior

- [x] 4.1 Distinguish task-level `Cancel Task` from composer current-turn
  interrupt in store and orchestrator control paths.
- [x] 4.2 Ensure task-level cancellation from live prompting settles the run as
  `canceled`.
- [x] 4.3 Preserve composer current-turn interrupt behavior as `waiting_user`
  so the user can reply and continue the run.
- [x] 4.4 Show `failed_retriable` as active/recoverable in ACP panel,
  dashboard, toolbar, and Host Bridge task summaries.
- [x] 4.5 Keep workflow task `JobState` mapping on existing states while using
  ACP summary status/liveness for failed-retriable actions.

## 5. Validation

- [x] 5.1 Cover recoverable prompt/session failure writing
  `failed_retriable`.
- [x] 5.2 Cover reconnect auto-continuation from `failed_retriable` and prevent
  continuation from terminal `failed`.
- [x] 5.3 Cover live prompting `Cancel Task` settling to `canceled`.
- [x] 5.4 Cover composer cancel/interrupt settling to `waiting_user` and later
  user reply continuation.
- [x] 5.5 Cover terminal run absorption against reply/recovery/apply revival.
- [x] 5.6 Cover lazy migration of legacy recoverable `failed` records.
- [x] 5.7 Re-run impacted ACP UI, SkillRunner-compatible runner, Host Bridge,
  sequence runtime, dashboard, toolbar, and session manager tests.
