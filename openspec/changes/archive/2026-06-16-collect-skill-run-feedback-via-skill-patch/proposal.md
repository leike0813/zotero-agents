# Change: Collect Skill Run Feedback via Skill Patch

## Summary
Add an opt-in skill run feedback collection flow. When the global preference is enabled, workflow requests send `runtime_options.collect_skill_run_feedback: true`, ACP/SkillRunner-compatible skill materialization injects a temporary feedback instruction patch, and successful apply collects `_skill_run_feedback.md` from the run workspace into a dedicated Skill Feedback product area.

## Motivation
Skill authors need low-friction, run-scoped feedback from agents after successful skill execution. The feedback must survive outside session context, must not alter skill source packages or output schemas, and must remain separated from normal workflow products so it can be reviewed and exported for future skill improvements.

## Scope
- Add a default-off global preference named `collectSkillRunFeedbackEnabled`.
- Send `runtime_options.collect_skill_run_feedback` for SkillRunner job/sequence requests and ACP-compatible skill runs.
- Inject a run-local skill patch only when feedback collection is enabled.
- Collect `_skill_run_feedback.md` only after successful workflow/job execution and successful business apply.
- Store feedback as workflow product records with `kind: "skill_run_feedback"`.
- Add Dashboard UI for Skill Feedback filtering, multi-select, preview, and export.

## Out of Scope
- Collecting feedback for failed, canceled, pending, recoverable, or apply-failed runs.
- Declaring `_skill_run_feedback.md` in workflow output schemas or result JSON.
- Modifying source skill packages.
- Requiring a fixed JSON feedback format.
