# Surface SkillRunner Pre-Request Runs

## Summary

Make SkillRunner jobs visible as soon as local dispatch starts, before the
backend returns a `request_id`. The pre-ready run is a local UX/audit record:
it can be selected in the SkillRunner panel and shown with the normal layout,
but it cannot perform backend-bound actions until a backend request is assigned.

## Problem

SkillRunner provider dispatch currently becomes visible only after the frontend
has a backend `request_id` and the run reaches request-ready. During create and
upload, users see a toast but no task row. If create/upload stalls or fails, the
failure can look like the task disappeared.

## Goals

- Write a local SkillRunner run record when dispatch starts.
- Keep the same visible task identity when `request_id` is later assigned.
- Keep pre-ready rows selectable in the SkillRunner panel.
- Gate all backend-bound controls, streams, session sync, cancel, reply, auth,
  pending and history requests behind a non-empty `request_id`.
- Record create/upload failures and timeouts as visible local failed records.

## Non-Goals

- Do not change the SkillRunner backend protocol.
- Do not recover orphan backend jobs when the frontend never received
  `request_id`.
- Do not change ACP Skills persistence or foreground apply behavior.
