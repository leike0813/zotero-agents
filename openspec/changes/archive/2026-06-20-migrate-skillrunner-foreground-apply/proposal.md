# Migrate SkillRunner Foreground Apply

## Problem

SkillRunner reconciler settlement grew from a recovery safeguard into a normal
execution owner. That creates competing poll/apply paths with the foreground
workflow runner, which can produce duplicate apply attempts, stale
missing-context toasts, and extra `/v1/jobs/{request_id}` traffic while a
foreground provider or continuation already owns the run.

## Goal

Make normal SkillRunner execution foreground-owned:

- `skillrunner.job.v1` polls and fetches terminal output in the foreground.
- interactive `waiting_user` and `waiting_auth` detach immediately and resume
  through foreground reply/auth continuation.
- `skillrunner.sequence.v1` runs a frontend step loop and records step/root
  apply state in `SkillRunnerRunStore`.
- the recovery coordinator is retained only for startup/backend/local-runtime
  one-shot handoff into foreground continuation.
- obsolete reconcile-owned normal-path data is removed without compatibility
  migration; local SkillRunner run-store data may be reset.

## Non-Goals

- Do not change the SkillRunner backend API, wire protocol, or workflow schema.
- Do not remove one-shot recovery coordination.
- Do not make waiting states subject to `poll.timeout_ms`.
- Do not preserve old SkillRunner run payload schema compatibility.
