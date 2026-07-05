# Assistant Workspace Legacy Path Pruning

## Summary

Remove legacy compensating paths that remained after Assistant Workspace explicit
handshake stabilization. The change reduces duplicate pulses, backend refreshes,
handshake retries, and SkillRunner double actions without changing ACP Chat
read-models, transcript pagination, ACP Skills virtualization, or the
SkillRunner run state machine.

## Motivation

Recent runtime logs show the main initialization and child delivery path is now
stable, but older compensating triggers still run beside it:

- every shell post can coalesce another handshake retry while the shell is not
  ready;
- tab switches and shell load events can schedule ACP Chat backend refreshes;
- the shared ACP frontend subscription still drives generic workspace snapshot
  posts;
- SkillRunner task selection sends both drawer-close and task-select actions;
- shell/child ready can rebuild init snapshots that were already published for
  the current scope.

These paths are no longer needed and make the call chain harder to reason
about.

## Goals

- Keep Assistant Workspace initialization level-triggered and retryable.
- Remove confirmed-obsolete compensating triggers instead of hiding them with
  logging changes.
- Preserve foreground tab-switch behavior and typed panel refreshes.
- Keep all ACP Chat, ACP Skills, and SkillRunner business state semantics
  unchanged.

## Non-Goals

- No ACP Chat read-model or pagination changes.
- No ACP Skills transcript rendering changes.
- No SkillRunner runtime state-machine changes.
- No new subscription channel, session index cache, `notifyFrontend:false`
  delivery, listener `itemMode` map, or full snapshot JSON signature.
