## ADDED Requirements

### Requirement: Assistant Dashboard surfaces SHALL reuse localized panel labels

Assistant Workspace, ACP Chat, ACP Skill Run, and Run Dialog surfaces SHALL reuse the shared Assistant panel labels for fixed transcript, drawer, details, reply, and action UI.

#### Scenario: Shared Assistant transcript renders controls

- **GIVEN** an Assistant panel snapshot with localized transcript labels
- **WHEN** code copy buttons, transcript status rows, tool activity rows, permission rows, or empty transcript states render
- **THEN** fixed labels MUST come from the Assistant panel labels
- **AND** transcript body, tool output, and backend messages MUST remain raw
