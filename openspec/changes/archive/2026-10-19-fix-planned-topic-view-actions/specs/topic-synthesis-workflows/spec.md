## ADDED Requirements

### Requirement: Planned-topic selectors SHALL preserve their filter

Workflow settings SHALL request active planned options for the planned-topic selector and updatable materialized options for the update selector. Empty or failed planned-option reads SHALL NOT fall back to materialized topics.

#### Scenario: Planned mode is enabled

- **WHEN** a user enables Use Planned Topic in the creation submission window
- **THEN** the selector contains active planned topics only
- **AND** materialized and stale topics are excluded

### Requirement: Workbench launches SHALL preserve the selected topic

Creating from a planned topic SHALL open the submission window with Use Planned Topic enabled and the exact planned identifier selected. Updating SHALL prefill the exact materialized identifier. Launch validation SHALL use current workflow eligibility rather than membership in the first artifact page. Opening or canceling the submission window SHALL NOT execute the workflow.

#### Scenario: Create is activated for a planned topic

- **WHEN** the selected identifier remains an active planned option
- **THEN** the creation form opens with `usePlannedTopic: true` and that `plannedTopicId`

#### Scenario: Selected target is no longer eligible

- **WHEN** the selected target is absent from the current corresponding workflow options
- **THEN** launch reports the unavailable target without substituting another identifier

#### Scenario: Materialized target is outside the first artifact page

- **WHEN** the selected target belongs to current updatable workflow options
- **THEN** its update submission window can open even if the first artifact page does not contain it
