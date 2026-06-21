# Support SkillRunner Interactive Auto Reply Observer

## Problem

SkillRunner interactive jobs can be submitted with `interactive_auto_reply`.
When enabled, the backend may leave `waiting_user` without a user reply from
the plugin. The current foreground model intentionally detaches at
`waiting_user`, so the plugin can keep showing a waiting task while the backend
has already resumed or reached terminal state.

## Goal

Add a default-off observer for the auto-reply case only:

- keep normal `waiting_user` detach behavior unchanged;
- hide and ignore the option unless a hard-coded feature switch is enabled;
- observe only `waiting_user` runs that explicitly enabled auto reply;
- hand resumed runs back to foreground continuation;
- make user reply robust when it races backend auto reply.

## Non-Goals

- Do not revive normal reconciler polling.
- Do not fetch result/bundle or apply from the observer.
- Do not change the SkillRunner backend API or workflow schema.
- Do not apply the behavior to `waiting_auth`.
