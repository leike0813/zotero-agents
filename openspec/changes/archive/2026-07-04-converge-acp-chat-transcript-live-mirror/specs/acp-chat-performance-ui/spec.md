## ADDED Requirements

### Requirement: ACP Chat transcript-only updates do not rebuild panel chrome

ACP Chat SHALL separate transcript rendering from non-transcript panel rendering during prompting.

#### Scenario: Transcript chunk updates only transcript region

- **GIVEN** ACP Chat is rendering a prompting conversation
- **WHEN** only transcript items or transcript revision change
- **THEN** the front-end SHALL update the transcript renderer
- **AND** it SHALL NOT rebuild the banner, toolbar, session drawer, details drawer, reply controls, or permission region.
