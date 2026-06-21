# enforce-skillrunner-runkey-ssot

## Summary

Make `SkillRunnerRunStore.runKey` the only identity used by SkillRunner UI and host action paths.

## Motivation

Recent sidebar/dashboard governance introduced UI-side identity derivation from `requestId`, `localRunId`, `taskId`, and sequence metadata. That created ambiguous focus behavior when sequence runs reuse step ids or local job ids across workflow runs. The run store already owns the stable run identity, so UI surfaces should consume that identity directly instead of recreating it.

## Scope

- SkillRunner run store projections expose `runKey`.
- SkillRunner sidebar panel, run dialog, dashboard jump, submit focus, open, and archive actions use `runKey`.
- Old UI identity fallback paths are removed.

## Non-Goals

- No migration or compatibility for old SkillRunner rows without `runKey`.
- No SkillRunner or ACP backend protocol changes.
- No restoration of unbounded history or full payload reads.
