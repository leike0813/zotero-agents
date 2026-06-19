## ADDED Requirements

### Requirement: SkillRunner sequence completion MUST be root-owned

Workflow completion for SkillRunner sequence runs SHALL be tracked by sequence
root identity rather than by any individual step request id.

#### Scenario: non-final step does not emit workflow summary

- **WHEN** a non-final SkillRunner sequence step reaches terminal success
- **THEN** the deferred workflow completion tracker SHALL NOT emit the workflow
  finish summary for the root workflow
- **AND** it SHALL wait for the root sequence to reach `completed`, `failed`, or
  `canceled`

#### Scenario: root terminal emits exactly one summary

- **WHEN** the SkillRunner sequence root reaches `completed`, `failed`, or
  `canceled`
- **THEN** workflow completion SHALL settle using the root sequence id
- **AND** the workflow summary SHALL be emitted at most once

### Requirement: SkillRunner sequence continuation MUST not wait for side-effect apply

SkillRunner sequence step continuation SHALL depend on execution result and
handoff projection, not on Zotero/host-side apply success.

#### Scenario: next step starts before apply finishes

- **WHEN** a SkillRunner sequence step reaches terminal success
- **AND** result normalization and required handoff projection succeed
- **THEN** the next step SHALL be submitted without awaiting side-effect apply
- **AND** the completed step's apply SHALL settle independently as
  `pending`, `running`, `succeeded`, `failed`, or `skipped`

#### Scenario: apply failure does not cancel already valid continuation

- **WHEN** a completed SkillRunner sequence step's side-effect apply fails
- **AND** the next step did not require a failed handoff projection
- **THEN** the apply failure SHALL update only that step's apply state and
  diagnostics
- **AND** the sequence continuation SHALL remain valid
