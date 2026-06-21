# enforce-skillrunner-submission-context-ssot

## Summary

Make SkillRunner submission context the single source of truth for task/run metadata across single jobs, sequence initial steps, and sequence continuation steps.

## Motivation

The SkillRunner panel currently depends on task/run projections carrying display and execution metadata. Single jobs and initial sequence steps carry `skillName`, but continuation-created sequence steps are built through a separate job construction path and can miss fields that the UI expects. That creates divergent banner labels, focus behavior, and task projections for conceptually identical SkillRunner runs.

## Scope

- SkillRunner submission-time task/run metadata for single jobs and sequence steps.
- Sequence state persistence of step display metadata needed by later continuation.
- Shared host-side construction of SkillRunner `JobRecord`/`JobRecordMeta` for sequence steps.
- Tests that assert equivalent metadata across initial and continuation submission paths.

## Non-Goals

- No migration or compatibility pass for old SkillRunner records or in-flight sequence state.
- No SkillRunner or ACP backend protocol changes.
- No UI-side registry fallback or full history/payload read restoration.
