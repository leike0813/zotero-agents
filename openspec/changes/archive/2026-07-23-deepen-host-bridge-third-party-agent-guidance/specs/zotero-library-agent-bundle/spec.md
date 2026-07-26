## ADDED Requirements

### Requirement: Generic Skills SHALL translate natural-language research requests
Each Generic Skill SHALL independently define the user utterances it handles, the information it must clarify or may default, the bounded execution path, authority stops, live evidence requirements, and the user-facing completion or recovery response.

#### Scenario: User gives an underspecified research request
- **WHEN** a request omits scope, freshness, evidence depth, deliverable, or requested state change
- **THEN** the selected Skill asks only material questions, discloses safe defaults, and does not cross a write or submission boundary without explicit authority

#### Scenario: User gives a multi-stage request
- **WHEN** one request combines acquisition, analysis, synthesis, or curation
- **THEN** the coordinator presents ordered stages with each stage's owner, input evidence, output evidence, and new authority boundary

### Requirement: Generic references SHALL demonstrate complete task decisions
Each Generic task reference SHALL provide coherent decision guidance and representative end-to-end traces without becoming a prerequisite for the ordinary path or repeating the normative Skill contract.

#### Scenario: Agent encounters a complex branch
- **WHEN** a task has ambiguity, asymmetric evidence, partial completion, or a recoverable failure
- **THEN** the optional playbook shows the path from user utterance through clarification, routing, validation, authority, evidence, result, and user response

### Requirement: Generic results SHALL use one discoverable Runner-validated Schema
All six Generic Skills SHALL return a business payload conforming to `zotero-library-task.result.v1`, SHALL expose the shared Schema in their assets, and SHALL explain its required fields, status meanings, nested evidence, artifact, and diagnostic shapes in the executable Skill contract.

#### Scenario: Agent completes a Generic task
- **WHEN** the Agent emits its final business result
- **THEN** the Runner strips its transport marker and validates the remaining payload against the materialized `assets/output.schema.json`

#### Scenario: Agent needs to construct a result without project context
- **WHEN** an Agent reads only the selected `SKILL.md`
- **THEN** it can construct a minimal valid completed, canceled, or failed result and can discover the full Schema and task-specific examples

#### Scenario: Agent mixes transport and business fields
- **WHEN** the business payload contains `__SKILL_DONE__`, Markdown framing, or unknown fields
- **THEN** the instructions prohibit that shape and runtime Schema validation rejects the invalid business object
