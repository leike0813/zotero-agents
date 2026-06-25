# Change: Govern SkillRunner Request-Ready Settlement

## Why

The connection governor and UI stream pool prevent SkillRunner runs from
exhausting frontend/backend connections, but the run lifecycle still needs a
clear ownership boundary. Recent failures show that provider dispatch,
reconciler settlement, deferred apply, sequence continuation, and UI projection
can still disagree about whether a SkillRunner run is ready, terminal, applying,
or recoverable.

The unstable cases share one root problem: post-upload SkillRunner work is
sometimes treated as foreground provider work, sometimes as recoverable context,
and sometimes as UI task state. That makes pre-ready failures hard to audit,
terminal result/apply failures easy to hide, and sequence continuation vulnerable
to apply state.

## What Changes

- Make `request-ready` the first visible SkillRunner run-store projection point.
- Make the SkillRunner provider submit-only: create/upload until
  `request-ready`, then return deferred without polling or fetching result data.
- Make the SkillRunner reconciler the only owner of terminal polling,
  result/bundle fetch, normalization, apply, retry, and sequence continuation.
- Split run state from apply state so terminal runs with pending/running/failed
  deferred apply remain visible.
- Continue SkillRunner sequence steps from execution/result/handoff projection,
  not from apply success.
- Treat host-side parse, bundle, apply hook, Host Bridge, and store failures as
  visible failed or retryable apply states instead of silent hangs.
- Keep ACP Skills foreground apply semantics separate and prevent SkillRunner
  request ids from writing ACP run records.

## Impact

- `provider-adapter`: SkillRunner dispatch becomes request-ready deferred and
  stops doing foreground terminal work.
- `workflow-execution-seams`: SkillRunner request-ready jobs are registered for
  reconciler-owned settlement; ACP foreground apply remains unchanged.
- `task-dashboard-skillrunner-observe`: observation and deferred apply indicators
  read SkillRunner run-store projections.
- `task-runtime-ui`: terminal/apply state remains visible and consistent across
  Dashboard, popover, and RunDialog.
