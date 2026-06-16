## ADDED Requirements

### Requirement: Opt-in skill run feedback runtime option
The workflow execution runtime SHALL expose a default-off global preference named `collectSkillRunFeedbackEnabled` that controls whether skill run feedback collection is requested.

#### Scenario: Preference disabled
- **WHEN** the preference is disabled
- **THEN** SkillRunner job and sequence requests do not include `runtime_options.collect_skill_run_feedback`

#### Scenario: Preference enabled
- **WHEN** the preference is enabled
- **THEN** SkillRunner job and sequence requests include `runtime_options.collect_skill_run_feedback: true`
- **AND** existing runtime options remain preserved

### Requirement: Collect feedback only after successful apply
The workflow execution runtime SHALL attempt skill run feedback collection only after a provider job succeeded and the workflow business apply completed successfully.

#### Scenario: Apply succeeds
- **WHEN** a skill job succeeds and business apply succeeds
- **THEN** the runtime attempts to read `_skill_run_feedback.md` from the skill result subspace

#### Scenario: Non-success route
- **WHEN** a job fails, is canceled, remains pending or recoverable, or business apply fails
- **THEN** the runtime does not collect skill run feedback

#### Scenario: Feedback is unavailable
- **WHEN** the feedback sidecar is missing, empty, or unreadable
- **THEN** the runtime logs diagnostic information
- **AND** the main apply summary counters are unchanged by the feedback collection attempt
