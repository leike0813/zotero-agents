# Design: Skill Run Feedback Collection

## Runtime Option
The plugin owns a global preference `collectSkillRunFeedbackEnabled`, defaulting to `false`. Request preparation treats the preference as opt-in:

- When disabled, the plugin omits `runtime_options.collect_skill_run_feedback`.
- When enabled, the plugin sets `runtime_options.collect_skill_run_feedback: true`.
- Existing runtime options such as `execution_mode`, `workflow_workspace`, and `zotero_host_access` remain intact.

The option is injected at the shared SkillRunner job/sequence request preparation boundary. ACP-compatible execution keeps the same option when SkillRunner requests are adapted to `acp.skill.run.v1`.

## Skill Patch
ACP/SkillRunner-compatible materialization gains a feedback patch template. The patch is inserted only into the materialized skill for the current run and never into the source package.

The patch instructs the agent to write free-form Markdown to `_skill_run_feedback.md` in the same result directory as `result.json`, and only after the original skill task completed successfully. The file is a default sidecar convention, not an output schema field.

## Collection
Collection runs after provider success and successful business apply. It is best-effort:

- ACP reads from the run workspace regardless of fetch type.
- SkillRunner reads from the run workspace first and falls back to the bundle entry using the same result-subspace convention.
- Missing, empty, or unreadable feedback is logged diagnostically and does not affect apply counters.

The collector registers a workflow product with `kind: "skill_run_feedback"` and one unmodified Markdown asset. Host audit metadata includes workflow, backend, request/run/job, skill, source path, collection time, content hash, and apply success status.

## UI
Dashboard Products gains a Skill Feedback subsection. Normal workflow products exclude feedback records. The Skill Feedback subsection supports:

- filtering by skill,
- checkbox multi-select,
- Markdown preview,
- exporting selected feedback as one aggregate Markdown document with host audit headers.
