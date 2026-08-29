## ADDED Requirements

### Requirement: Sidecar startup failure SHALL remain actionable in Workbench
The Synthesis Workbench SHALL retain the current production startup failure until a later startup generation succeeds. It SHALL provide retry and diagnostics actions, and SHALL deduplicate transient notifications by failure generation.

#### Scenario: Workbench opens after startup failure
- **WHEN** production sidecar startup has failed
- **THEN** Workbench displays the stable failure summary even if no previous topic surface data exists
- **AND** offers retry and diagnostics actions

#### Scenario: Retry succeeds
- **WHEN** an explicit retry starts a new generation and reaches ready
- **THEN** the persistent failure state is cleared
- **AND** normal Workbench content refreshes

#### Scenario: Task Manager inspects production failure
- **WHEN** debug mode is disabled
- **THEN** Task Manager displays the bounded safe summary
- **AND** does not display raw process tails

