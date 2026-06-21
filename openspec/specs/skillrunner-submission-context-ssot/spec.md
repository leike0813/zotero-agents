# skillrunner-submission-context-ssot Specification

## Purpose
Defines the contract for SkillRunner submission context, ensuring all projectable tasks carry complete UI and execution metadata without requiring UI-side completion.

## Requirements

### Requirement: SkillRunner submissions MUST carry complete UI context

Every projectable SkillRunner task/run submission SHALL carry the UI and execution context needed by later host surfaces without requiring UI-side metadata completion.

The context SHALL include identity inputs for `runKey`, backend metadata, workflow metadata, task label, `skillId`, `skillName` when known, request payload, execution mode, and sequence step metadata when applicable.

The context SHALL also preserve provider options that affect execution and display projections, including the derived `engine` value and the root input identity used to associate sequence steps with the original submitted unit.

#### Scenario: Single job carries skill display metadata

- **WHEN** a SkillRunner single job is submitted
- **THEN** its task/run projection SHALL include `skillId`
- **AND** it SHALL include `skillName` when the prepared workflow resolved one.

#### Scenario: Sequence initial step carries skill display metadata

- **WHEN** a SkillRunner sequence step starts during the initial sequence execution
- **THEN** its task/run projection SHALL include the step `skillId`
- **AND** it SHALL include the step `skillName` when the prepared workflow resolved one.

#### Scenario: Sequence continuation step carries equivalent metadata

- **GIVEN** a SkillRunner sequence run is resumed by continuation
- **WHEN** a downstream sequence step is submitted
- **THEN** its task/run projection SHALL carry the same context shape as an initial sequence step
- **AND** the step `skillName` SHALL come from persisted sequence submission context.
- **AND** provider options, derived `engine`, execution mode, and input identity SHALL NOT be dropped by the continuation path.

### Requirement: Sequence state MUST persist continuation metadata

SkillRunner sequence state SHALL persist step display metadata needed by continuation.

Continuation SHALL NOT rescan the skill registry or infer display names from `skillId`.

#### Scenario: Continuation emits persisted step skillName

- **GIVEN** sequence state contains a step `skillName`
- **WHEN** `continueSkillRunnerSequence()` emits a step progress event
- **THEN** the event SHALL include `sequenceStepSkillName`.

### Requirement: UI surfaces MUST NOT complete missing SkillRunner metadata

SkillRunner UI surfaces SHALL consume task/run projection metadata as-is and SHALL NOT scan the skill registry to fill missing `skillName`.

#### Scenario: Panel consumes projection skillName

- **WHEN** the SkillRunner panel renders a task banner
- **THEN** the subtitle SHALL use the projection `skillName` when present
- **AND** the panel SHALL NOT perform a registry scan to repair missing task metadata.
