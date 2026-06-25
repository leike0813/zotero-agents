# Design

## Status Axes

Each workflow run has three user-facing status axes:

- `status` / `mainStatus`: the user-visible final status used for success/failure, grouping, summaries, and sequence continuation.
- `backendStatus`: the backend execution fact.
- `applyStatus`: the workflow apply fact.

Main status is derived as:

- `failed` when backend failed or required apply failed.
- `canceled` when backend canceled.
- `succeeded` only when backend succeeded and apply is `succeeded`, `skipped`, or `not_required`.
- otherwise the active/waiting backend status.

## Stores

ACP Skills and SkillRunner both keep `status` as main status. Backend terminal state is recorded separately in `backendStatus`. Apply state remains provider-specific in storage but is projected as a common card field.

## Cards

ACP Skills and SkillRunner cards render:

- main status as a prominent colored badge.
- backend and apply axes as compact label + LED rows.
- archive actions using the shared Material Symbols icon subset.

Failed tasks remain visible until archived/removed. Backend disabled or unreachable visibility rules are outside this change.
