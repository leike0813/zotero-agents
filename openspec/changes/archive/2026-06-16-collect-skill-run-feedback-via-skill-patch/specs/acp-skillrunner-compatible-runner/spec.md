## ADDED Requirements

### Requirement: Run-local feedback patch
ACP/SkillRunner-compatible materialization SHALL inject a run-local feedback patch when `runtime_options.collect_skill_run_feedback` is true.

#### Scenario: Feedback collection disabled
- **WHEN** the runtime option is absent or false
- **THEN** the materialized skill does not include the feedback patch

#### Scenario: Feedback collection enabled
- **WHEN** the runtime option is true
- **THEN** the materialized skill includes instructions to write `_skill_run_feedback.md` in the same result subspace as `result.json`
- **AND** the source skill package remains unchanged

### Requirement: Feedback sidecar convention
ACP and SkillRunner-compatible runs SHALL treat `result/<skillId>.<n>/_skill_run_feedback.md` as a default sidecar convention.

#### Scenario: Skill completes successfully
- **WHEN** the original skill task completes according to its normal successful flow
- **THEN** the agent may write free-form Markdown feedback to `_skill_run_feedback.md`
- **AND** the file is not declared in the output schema or result JSON

#### Scenario: Skill does not complete successfully
- **WHEN** the skill task fails, is canceled, or requires pending user continuation
- **THEN** the agent does not create the feedback sidecar
