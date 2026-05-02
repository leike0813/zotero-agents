# Fix ACP SkillRunner Result Apply And Run Panel UX

## Summary

Fix ACP SkillRunner-compatible runs so successful results can be applied by existing workflow `applyResult()` hooks, and reshape the ACP skill run UI into a SkillRunner-like run conversation panel with a run drawer.

## Motivation

ACP workflow jobs can now reach agent execution, and successful runs are applied through the shared `WorkflowResultContext` seam. The current ACP skill run panel is also a detail/log inspector rather than a run conversation UI.

## Scope

- Keep `skillrunner.job.v1`, workflow manifests, `buildRequest()`, and `applyResult()` unchanged.
- Use `WorkflowResultContext` for ACP local result JSON and artifact paths; ACP Skills does not project a proxy bundle.
- Rework ACP skill run UI to conversation-first with a run drawer.
- Make ACP backend dashboard tabs show workflow task management instead of generic log inspection for ACP skill runs.
