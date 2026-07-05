## MODIFIED Requirements

### Requirement: ACP runner SHALL repair invalid SkillRunner-compatible output without repeating candidate payloads

When an ACP Skills run output fails validation and repair rounds remain, the runner SHALL send a repair prompt on the same ACP session. The repair prompt SHALL include validation errors and the active output contract instructions. The repair prompt SHALL NOT include the previous candidate payload.

#### Scenario: Invalid output starts repair

- **GIVEN** an ACP Skills run produces invalid final output
- **AND** repair rounds remain
- **WHEN** the runner builds the repair prompt
- **THEN** the prompt SHALL include the validation errors
- **AND** the prompt SHALL include the output contract details when available
- **AND** the prompt SHALL NOT include a `Previous candidate` section
- **AND** the prompt SHALL NOT repeat the candidate JSON payload.
