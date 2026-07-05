# Assistant Workspace Refresh Source Cleanup

## Summary

Remove the final duplicate refresh sources left after the explicit Assistant
Workspace handshake cleanup. Shell frame `load` is no longer a publishing
boundary, and streaming render preference changes are refreshed from one source
per host instead of from both the child action handler and preference listener.

## Motivation

Recent call-chain logs are behaviorally stable but still noisy. Two paths are
now redundant:

- shell frame `load` records lifecycle state but still publishes a full init
  pulse;
- local streaming-render toggle actions can cause an immediate panel repost
  while the global preference listener also schedules another refresh.

Keeping both makes the workspace harder to reason about and obscures future
regressions.

## Goals

- Keep shell initialization level-triggered through explicit handshake only.
- Keep local streaming-render toggles to one current-tab refresh.
- Preserve external streaming preference changes for the active workspace tab.
- Avoid changing ACP Chat read-model, pagination, ACP Skills virtualization, or
  SkillRunner runtime behavior.

## Non-Goals

- No new subscription channel or delivery model.
- No ACP Chat backend refresh changes beyond not publishing on shell load.
- No session index cache, listener item-mode map, `notifyFrontend:false`, or
  full snapshot JSON signature.
