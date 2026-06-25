# govern-dashboard-ui-workbench-style

## Summary

Govern Dashboard UI refresh and rendering with a workbench-style contract: host snapshots expose stable chrome and selected-surface signatures, noisy background events do not redraw unchanged active surfaces, and the browser renderer keeps a stable shell while updating only the selected surface.

## Motivation

Dashboard currently receives frequent task, ACP run, backend-health, and periodic refreshes. The browser renderer largely rebuilds the whole page for each snapshot, so views such as Products and Skill Feedback can flicker or lose local UI state while unrelated tasks are running. Synthesis Workbench already uses surface-level dirty state and signatures to avoid this class of churn; Dashboard needs the same boundary.

## Modified Capabilities

- `task-runtime-ui`

## Non-Goals

- Do not change workflow execution, ACP, SkillRunner, or product storage semantics.
- Do not introduce a frontend framework.
- Do not merge Dashboard and Synthesis Workbench codebases.
- Do not move host-owned tab routing into browser local storage.
