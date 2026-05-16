# Design: Optimize Workflow Menu Multi-Select Availability

## Decisions

- Multi-select menu opening is a lightweight UI operation and SHALL NOT call
  `executeBuildRequests`.
- Single-select keeps current precise preflight semantics so obviously invalid
  inputs remain disabled before command execution.
- No-selection keeps existing `requiresSelection` behavior.
- Provider/settings availability is still checked for multi-select entries only
  when the workflow is triggered through the normal execution path.

## Failure Behavior

If a multi-selected workflow has no valid input after submit-time filtering, the
existing preparation seam handles the skip/no-valid-input notification.
