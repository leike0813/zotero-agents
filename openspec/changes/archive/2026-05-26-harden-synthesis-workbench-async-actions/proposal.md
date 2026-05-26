## Summary

Harden Synthesis Workbench asynchronous action UX.

The Workbench now has many commands that enqueue background work or perform
canonical mutations whose result is only visible after a later snapshot refresh.
Clicking those commands currently gives little immediate feedback and can start
duplicate in-flight operations for the same resource.

## Motivation

Synthesis now relies on background job queues for literature registry rebuilds,
citation graph layout, Git Sync, projection rebuilds, and KG review decisions.
The UI must treat these actions as asynchronous operations: the user should see
immediate feedback, repeated clicks should be blocked, and job state should be
visible without implying synchronous completion.

Without a unified action lifecycle, users can repeatedly click action buttons,
trigger concurrent duplicate service calls, and receive no clear indication that
the first click was accepted.

## Scope

- Add process-local Workbench async action state to snapshots.
- Add stable operation keys for host commands and scoped command arguments.
- Disable and mark pending buttons while the matching command is in flight.
- Add host-side single-flight execution for scoped Workbench commands.
- Show lightweight action feedback for submitting, queued/running, completed,
  and failed actions.

## Out of Scope

- Changing Synthesis service job semantics.
- Making read paths enqueue or rebuild data.
- Adding a complex toast/notification framework.
- Persisting Workbench action state to disk or Git Sync.
- Changing Git history, adding dependencies, or starting a dev server.
